package com.storage.service;

import com.storage.dto.FileItem;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class S3Service {

    private final S3SessionManager sessionManager;

    public S3Service(S3SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * List objects at a given prefix (directory browsing).
     */
    public List<FileItem> listObjects(String prefix) {
        if (prefix == null) prefix = "";

        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(sessionManager.getBucket())
                .prefix(prefix)
                .delimiter("/")
                .build();

        ListObjectsV2Response response = sessionManager.getClient().listObjectsV2(request);
        List<FileItem> items = new ArrayList<>();

        // Add folders (common prefixes)
        if (response.commonPrefixes() != null) {
            for (CommonPrefix cp : response.commonPrefixes()) {
                String folderPath = cp.prefix();
                String folderName = extractName(folderPath, true);
                items.add(new FileItem(
                        folderName,
                        folderPath,
                        0,
                        "",
                        true,
                        "folder"
                ));
            }
        }

        // Add files
        if (response.contents() != null) {
            for (S3Object obj : response.contents()) {
                // Skip the prefix itself (directory marker)
                if (obj.key().equals(prefix)) continue;

                String fileName = extractName(obj.key(), false);
                String contentType = guessContentType(fileName);
                String lastModified = formatDate(obj.lastModified());

                items.add(new FileItem(
                        fileName,
                        obj.key(),
                        obj.size(),
                        lastModified,
                        false,
                        contentType
                ));
            }
        }

        return items;
    }

    /**
     * Upload a file to S3.
     */
    public void uploadFile(String prefix, MultipartFile file) throws IOException {
        String key = (prefix != null ? prefix : "") + file.getOriginalFilename();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(sessionManager.getBucket())
                .key(key)
                .contentType(file.getContentType())
                .build();

        sessionManager.getClient().putObject(putRequest,
                RequestBody.fromBytes(file.getBytes()));
    }

    /**
     * Download a file from S3.
     */
    public ResponseInputStream<GetObjectResponse> downloadFile(String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(sessionManager.getBucket())
                .key(key)
                .build();

        return sessionManager.getClient().getObject(getRequest);
    }

    /**
     * Delete a single object.
     */
    public void deleteObject(String key) {
        // Check if it's a folder — need to delete all contents
        if (key.endsWith("/")) {
            deleteFolderContents(key);
        }

        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(sessionManager.getBucket())
                .key(key)
                .build();

        sessionManager.getClient().deleteObject(deleteRequest);
    }

    /**
     * Recursively delete all objects under a folder prefix.
     */
    private void deleteFolderContents(String prefix) {
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(sessionManager.getBucket())
                .prefix(prefix)
                .build();

        ListObjectsV2Response response = sessionManager.getClient().listObjectsV2(listRequest);

        if (response.contents() != null && !response.contents().isEmpty()) {
            List<ObjectIdentifier> objectIds = response.contents().stream()
                    .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                    .collect(Collectors.toList());

            DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                    .bucket(sessionManager.getBucket())
                    .delete(Delete.builder().objects(objectIds).build())
                    .build();

            sessionManager.getClient().deleteObjects(deleteRequest);
        }
    }

    /**
     * Bulk delete multiple objects.
     */
    public void deleteObjects(List<String> keys) {
        for (String key : keys) {
            deleteObject(key);
        }
    }

    /**
     * Create a folder (zero-byte object with trailing /).
     */
    public void createFolder(String path) {
        String folderKey = path.endsWith("/") ? path : path + "/";

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(sessionManager.getBucket())
                .key(folderKey)
                .contentType("application/x-directory")
                .build();

        sessionManager.getClient().putObject(putRequest, RequestBody.empty());
    }

    /**
     * Rename an object (copy to new key + delete old).
     */
    public void renameObject(String oldKey, String newKey) {
        if (oldKey.endsWith("/")) {
            // Rename folder: copy all contents then delete old
            renameFolderContents(oldKey, newKey);
        } else {
            // Rename file: simple copy + delete
            CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .sourceBucket(sessionManager.getBucket())
                    .sourceKey(oldKey)
                    .destinationBucket(sessionManager.getBucket())
                    .destinationKey(newKey)
                    .build();

            sessionManager.getClient().copyObject(copyRequest);
            deleteObject(oldKey);
        }
    }

    /**
     * Rename folder by copying all contents to new prefix.
     */
    private void renameFolderContents(String oldPrefix, String newPrefix) {
        String normalizedNewPrefix = newPrefix.endsWith("/") ? newPrefix : newPrefix + "/";

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(sessionManager.getBucket())
                .prefix(oldPrefix)
                .build();

        ListObjectsV2Response response = sessionManager.getClient().listObjectsV2(listRequest);

        if (response.contents() != null) {
            for (S3Object obj : response.contents()) {
                String newKey = normalizedNewPrefix + obj.key().substring(oldPrefix.length());

                CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                        .sourceBucket(sessionManager.getBucket())
                        .sourceKey(obj.key())
                        .destinationBucket(sessionManager.getBucket())
                        .destinationKey(newKey)
                        .build();

                sessionManager.getClient().copyObject(copyRequest);
            }
        }

        // Delete old folder and its contents
        deleteFolderContents(oldPrefix);
    }

    /**
     * Generate a pre-signed URL for downloading a file.
     */
    public String generatePresignedUrl(String key, long durationMinutes) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(durationMinutes))
                .getObjectRequest(b -> b.bucket(sessionManager.getBucket()).key(key))
                .build();

        PresignedGetObjectRequest presignedRequest = sessionManager.getPresigner().presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    /**
     * Get object metadata for preview.
     */
    public HeadObjectResponse getObjectMetadata(String key) {
        HeadObjectRequest headRequest = HeadObjectRequest.builder()
                .bucket(sessionManager.getBucket())
                .key(key)
                .build();

        return sessionManager.getClient().headObject(headRequest);
    }

    /**
     * Search/filter objects under a prefix.
     */
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

    // --- Helper methods ---

    private String extractName(String key, boolean isFolder) {
        if (isFolder) {
            // Remove trailing slash, then get last segment
            String withoutTrailingSlash = key.endsWith("/") ? key.substring(0, key.length() - 1) : key;
            int lastSlash = withoutTrailingSlash.lastIndexOf('/');
            return lastSlash >= 0 ? withoutTrailingSlash.substring(lastSlash + 1) : withoutTrailingSlash;
        } else {
            int lastSlash = key.lastIndexOf('/');
            return lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
        }
    }

    private String guessContentType(String fileName) {
        String type = URLConnection.guessContentTypeFromName(fileName);
        return type != null ? type : "application/octet-stream";
    }

    private String formatDate(Instant instant) {
        if (instant == null) return "";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
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
