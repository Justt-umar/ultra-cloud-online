package com.storage.service;

import com.storage.dto.FileItem;
import com.storage.service.provider.StorageProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Unified storage service that delegates all operations to the active StorageProvider.
 * Supports session-scoped operations for multi-session architecture.
 */
@Service
public class StorageService {

    private final StorageSessionManager sessionManager;

    public StorageService(StorageSessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    // ─── Default session methods (backward-compatible) ───────

    public List<FileItem> listObjects(String prefix) {
        return sessionManager.getProvider().listObjects(prefix != null ? prefix : "");
    }

    public void uploadFile(String prefix, MultipartFile file) throws IOException {
        sessionManager.getProvider().uploadFile(prefix, file);
    }

    public InputStream downloadFile(String key) {
        return sessionManager.getProvider().downloadFile(key);
    }

    public String getContentType(String key) {
        return sessionManager.getProvider().getContentType(key);
    }

    public long getContentLength(String key) {
        return sessionManager.getProvider().getContentLength(key);
    }

    public void deleteObject(String key) {
        sessionManager.getProvider().deleteObject(key);
    }

    public void deleteObjects(List<String> keys) {
        sessionManager.getProvider().deleteObjects(keys);
    }

    public void createFolder(String path) {
        sessionManager.getProvider().createFolder(path);
    }

    public void renameObject(String oldKey, String newKey) {
        sessionManager.getProvider().renameObject(oldKey, newKey);
    }

    public String generatePresignedUrl(String key, long durationMinutes) {
        return sessionManager.getProvider().generatePresignedUrl(key, durationMinutes);
    }

    // ─── Session-scoped methods ───────

    public List<FileItem> listObjects(String sessionId, String prefix) {
        return sessionManager.getProvider(sessionId).listObjects(prefix != null ? prefix : "");
    }

    public void uploadFile(String sessionId, String prefix, MultipartFile file) throws IOException {
        sessionManager.getProvider(sessionId).uploadFile(prefix, file);
    }

    public InputStream downloadFile(String sessionId, String key) {
        return sessionManager.getProvider(sessionId).downloadFile(key);
    }

    public String getContentType(String sessionId, String key) {
        return sessionManager.getProvider(sessionId).getContentType(key);
    }

    public long getContentLength(String sessionId, String key) {
        return sessionManager.getProvider(sessionId).getContentLength(key);
    }

    /**
     * Transfer a file from one session to another (cross-provider copy).
     */
    public void transferFile(String sourceSessionId, String sourceKey,
                             String destSessionId, String destPrefix) throws IOException {
        StorageProvider source = sessionManager.getProvider(sourceSessionId);
        StorageProvider dest = sessionManager.getProvider(destSessionId);

        String contentType = source.getContentType(sourceKey);
        long contentLength = source.getContentLength(sourceKey);

        try (InputStream is = source.downloadFile(sourceKey)) {
            String fileName = sourceKey.contains("/")
                    ? sourceKey.substring(sourceKey.lastIndexOf('/') + 1)
                    : sourceKey;

            String destKey = (destPrefix != null && !destPrefix.isEmpty())
                    ? destPrefix + fileName
                    : fileName;

            // Upload to destination using the raw stream
            dest.uploadStream(destKey, is, contentLength, contentType);
        }
    }

    // ─── Search ───────

    public List<FileItem> searchObjects(String prefix, String query, String typeFilter) {
        List<FileItem> allItems = listObjects(prefix != null ? prefix : "");

        return allItems.stream()
                .filter(item -> {
                    boolean matchesQuery = query == null || query.isBlank()
                            || item.name().toLowerCase().contains(query.toLowerCase());

                    boolean matchesType = typeFilter == null || typeFilter.isBlank()
                            || typeFilter.equals("all")
                            || matchesFileType(item, typeFilter);

                    return matchesQuery && matchesType;
                })
                .collect(Collectors.toList());
    }

    // ─── Analytics ───────

    /**
     * Compute storage analytics from the current file listing.
     * Recursively lists ALL objects to get full storage stats.
     */
    public Map<String, Object> getAnalytics() {
        List<FileItem> allFiles = listAllRecursive("");

        long totalSize = 0;
        int totalFiles = 0;
        int totalFolders = 0;
        Map<String, Long> typeDistribution = new LinkedHashMap<>();
        Map<String, Integer> typeCount = new LinkedHashMap<>();
        List<Map<String, Object>> largestFiles = new ArrayList<>();

        for (FileItem item : allFiles) {
            if (item.isFolder()) {
                totalFolders++;
                continue;
            }

            totalFiles++;
            totalSize += item.size();

            // Categorize by extension
            String category = categorizeFile(item);
            typeDistribution.merge(category, item.size(), Long::sum);
            typeCount.merge(category, 1, Integer::sum);

            // Track for largest files
            Map<String, Object> fileInfo = new LinkedHashMap<>();
            fileInfo.put("name", item.name());
            fileInfo.put("key", item.key());
            fileInfo.put("size", item.size());
            fileInfo.put("type", category);
            largestFiles.add(fileInfo);
        }

        // Sort largest files and take top 10
        largestFiles.sort((a, b) -> Long.compare((long) b.get("size"), (long) a.get("size")));
        if (largestFiles.size() > 10) {
            largestFiles = largestFiles.subList(0, 10);
        }

        // Build distribution chart data
        List<Map<String, Object>> distribution = new ArrayList<>();
        for (Map.Entry<String, Long> entry : typeDistribution.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", entry.getKey());
            item.put("size", entry.getValue());
            item.put("count", typeCount.getOrDefault(entry.getKey(), 0));
            distribution.add(item);
        }

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("totalSize", totalSize);
        analytics.put("totalFiles", totalFiles);
        analytics.put("totalFolders", totalFolders);
        analytics.put("distribution", distribution);
        analytics.put("largestFiles", largestFiles);
        analytics.put("provider", sessionManager.getProviderDisplayName());
        analytics.put("bucket", sessionManager.getContainerName());

        return analytics;
    }

    /**
     * Recursively list all objects in the bucket.
     */
    private List<FileItem> listAllRecursive(String prefix) {
        List<FileItem> result = new ArrayList<>();
        List<FileItem> items = sessionManager.getProvider().listObjects(prefix);

        for (FileItem item : items) {
            result.add(item);
            if (item.isFolder()) {
                result.addAll(listAllRecursive(item.key()));
            }
        }

        return result;
    }

    private String categorizeFile(FileItem item) {
        String ct = item.contentType() != null ? item.contentType().toLowerCase() : "";
        String name = item.name() != null ? item.name().toLowerCase() : "";

        if (ct.startsWith("image/")) return "Images";
        if (ct.startsWith("video/")) return "Videos";
        if (ct.startsWith("audio/")) return "Audio";
        if (ct.contains("pdf")) return "Documents";
        if (ct.contains("text") || ct.contains("document") || ct.contains("spreadsheet")) return "Documents";
        if (ct.contains("json") || ct.contains("javascript") || ct.contains("css") || ct.contains("html")) return "Code";
        if (name.endsWith(".zip") || name.endsWith(".gz") || name.endsWith(".tar") || name.endsWith(".rar")) return "Archives";
        return "Other";
    }

    private boolean matchesFileType(FileItem item, String typeFilter) {
        if (item.isFolder()) return typeFilter.equals("folder");

        return switch (typeFilter.toLowerCase()) {
            case "image" -> item.contentType().startsWith("image/");
            case "video" -> item.contentType().startsWith("video/");
            case "audio" -> item.contentType().startsWith("audio/");
            case "document" -> item.contentType().contains("pdf")
                    || item.contentType().contains("document")
                    || item.contentType().contains("text");
            case "folder" -> item.isFolder();
            default -> true;
        };
    }
}
