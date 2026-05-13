package com.storage.controller;

import com.storage.dto.*;
import com.storage.service.AuditService;
import com.storage.service.StorageService;
import com.storage.service.StorageSessionManager;
import com.storage.service.WebhookService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Unified REST controller for all cloud storage operations.
 * Supports multi-session, cross-provider transfer, versioning, and analytics.
 */
@RestController
@RequestMapping("/api")
public class StorageController {

    private final StorageSessionManager sessionManager;
    private final StorageService storageService;
    private final AuditService auditService;
    private final WebhookService webhookService;

    public StorageController(
            StorageSessionManager sessionManager,
            StorageService storageService,
            AuditService auditService,
            WebhookService webhookService) {
        this.sessionManager = sessionManager;
        this.storageService = storageService;
        this.auditService = auditService;
        this.webhookService = webhookService;
    }

    // ========================
    // Connection / Sessions
    // ========================

    @PostMapping("/connect")
    public ResponseEntity<ApiResponse> connect(@Valid @RequestBody ConnectRequest request) {
        try {
            Map<String, String> credentials = new HashMap<>();
            credentials.put("accessKeyId", request.accessKeyId());
            credentials.put("secretAccessKey", request.secretAccessKey());
            credentials.put("region", request.region());
            credentials.put("bucket", request.bucket());
            credentials.put("connectionString", request.connectionString());
            credentials.put("containerName", request.containerName());
            credentials.put("projectId", request.projectId());
            credentials.put("credentialsJson", request.credentialsJson());

            String sessionId = sessionManager.connect(request.provider(), credentials);

            String containerName = sessionManager.getContainerName(sessionId);
            String providerDisplay = sessionManager.getProviderDisplayName(sessionId);

            auditService.logSuccess("CONNECT", "Connected to " + containerName,
                    sessionManager.getProviderName(sessionId), containerName);
            webhookService.notify("CONNECT", "Connected to " + containerName,
                    providerDisplay, containerName);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("sessionId", sessionId);
            responseData.put("bucket", containerName);
            responseData.put("provider", sessionManager.getProviderName(sessionId));
            responseData.put("providerDisplayName", providerDisplay);

            return ResponseEntity.ok(ApiResponse.success(
                    "Connected to " + providerDisplay + " successfully", responseData));
        } catch (Exception e) {
            auditService.logFailure("CONNECT", e.getMessage(),
                    request.provider(), request.bucket());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to connect: " + e.getMessage()));
        }
    }

    @PostMapping("/disconnect")
    public ResponseEntity<ApiResponse> disconnect(
            @RequestParam(required = false) String sessionId) {
        String provider = sessionId != null
                ? sessionManager.getProviderName(sessionId)
                : sessionManager.getProviderName();
        String bucket = sessionId != null
                ? sessionManager.getContainerName(sessionId)
                : sessionManager.getContainerName();

        if (sessionId != null) {
            sessionManager.disconnect(sessionId);
        } else {
            sessionManager.disconnect();
        }

        auditService.logSuccess("DISCONNECT", "Disconnected", provider, bucket);
        webhookService.notify("DISCONNECT", "Disconnected from " + bucket, provider, bucket);

        return ResponseEntity.ok(ApiResponse.success("Disconnected from cloud storage"));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> statusMap = new HashMap<>();
        statusMap.put("connected", sessionManager.isConnected());
        statusMap.put("bucket", sessionManager.getContainerName());
        statusMap.put("provider", sessionManager.getProviderName());
        statusMap.put("providerDisplayName", sessionManager.getProviderDisplayName());
        statusMap.put("activeSessionId", sessionManager.getActiveSessionId());
        statusMap.put("sessionCount", sessionManager.getSessionCount());
        return ResponseEntity.ok(statusMap);
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse> listSessions() {
        return ResponseEntity.ok(ApiResponse.success("Sessions listed",
                sessionManager.listSessions()));
    }

    @PostMapping("/sessions/{sessionId}/activate")
    public ResponseEntity<ApiResponse> activateSession(@PathVariable String sessionId) {
        try {
            sessionManager.setActiveSession(sessionId);
            return ResponseEntity.ok(ApiResponse.success("Session activated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ========================
    // File Operations
    // ========================

    @GetMapping("/files")
    public ResponseEntity<ApiResponse> listFiles(
            @RequestParam(defaultValue = "") String prefix,
            @RequestParam(required = false) String sessionId) {
        try {
            List<FileItem> items = sessionId != null
                    ? storageService.listObjects(sessionId, prefix)
                    : storageService.listObjects(prefix);
            return ResponseEntity.ok(ApiResponse.success("Files listed successfully", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to list files: " + e.getMessage()));
        }
    }

    @PostMapping("/files/upload")
    public ResponseEntity<ApiResponse> uploadFiles(
            @RequestParam(defaultValue = "") String prefix,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(required = false) String sessionId) {
        try {
            int uploaded = 0;
            StringBuilder names = new StringBuilder();
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    if (sessionId != null) {
                        storageService.uploadFile(sessionId, prefix, file);
                    } else {
                        storageService.uploadFile(prefix, file);
                    }
                    uploaded++;
                    if (names.length() > 0) names.append(", ");
                    names.append(file.getOriginalFilename());
                }
            }

            auditService.logSuccess("UPLOAD", uploaded + " file(s): " + names,
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            webhookService.notify("UPLOAD", uploaded + " file(s) uploaded: " + names,
                    sessionManager.getProviderDisplayName(), sessionManager.getContainerName());

            return ResponseEntity.ok(ApiResponse.success(
                    uploaded + " file(s) uploaded successfully"));
        } catch (Exception e) {
            auditService.logFailure("UPLOAD", e.getMessage(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/download")
    public ResponseEntity<InputStreamResource> downloadFile(
            @RequestParam String key,
            @RequestParam(required = false) String sessionId) {
        try {
            String contentType = sessionId != null
                    ? storageService.getContentType(sessionId, key)
                    : storageService.getContentType(key);
            long contentLength = sessionId != null
                    ? storageService.getContentLength(sessionId, key)
                    : storageService.getContentLength(key);
            InputStream inputStream = sessionId != null
                    ? storageService.downloadFile(sessionId, key)
                    : storageService.downloadFile(key);

            String fileName = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;

            auditService.logSuccess("DOWNLOAD", fileName,
                    sessionManager.getProviderName(), sessionManager.getContainerName());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength))
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            auditService.logFailure("DOWNLOAD", key + " — " + e.getMessage(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/files")
    public ResponseEntity<ApiResponse> deleteFiles(@RequestBody List<String> keys) {
        try {
            storageService.deleteObjects(keys);
            auditService.logSuccess("DELETE", keys.size() + " item(s)",
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            webhookService.notify("DELETE", keys.size() + " item(s) deleted",
                    sessionManager.getProviderDisplayName(), sessionManager.getContainerName());
            return ResponseEntity.ok(ApiResponse.success(keys.size() + " item(s) deleted successfully"));
        } catch (Exception e) {
            auditService.logFailure("DELETE", e.getMessage(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Delete failed: " + e.getMessage()));
        }
    }

    @PostMapping("/files/folder")
    public ResponseEntity<ApiResponse> createFolder(@RequestBody Map<String, String> body) {
        try {
            String path = body.get("path");
            if (path == null || path.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Folder path is required"));
            }
            storageService.createFolder(path);
            auditService.logSuccess("CREATE_FOLDER", path,
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.ok(ApiResponse.success("Folder created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create folder: " + e.getMessage()));
        }
    }

    @PutMapping("/files/rename")
    public ResponseEntity<ApiResponse> renameFile(@Valid @RequestBody RenameRequest request) {
        try {
            storageService.renameObject(request.oldKey(), request.newKey());
            auditService.logSuccess("RENAME", request.oldKey() + " → " + request.newKey(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.ok(ApiResponse.success("Renamed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Rename failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/preview")
    public ResponseEntity<InputStreamResource> previewFile(@RequestParam String key) {
        try {
            String contentType = storageService.getContentType(key);
            long contentLength = storageService.getContentLength(key);
            InputStream inputStream = storageService.downloadFile(key);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength))
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/files/share")
    public ResponseEntity<ApiResponse> shareFile(@Valid @RequestBody ShareRequest request) {
        try {
            String url = storageService.generatePresignedUrl(request.key(), request.durationMinutes());
            ShareResponse response = new ShareResponse(url, request.durationMinutes());
            auditService.logSuccess("SHARE", request.key(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
            return ResponseEntity.ok(ApiResponse.success("Share URL generated", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to generate share URL: " + e.getMessage()));
        }
    }

    @GetMapping("/files/search")
    public ResponseEntity<ApiResponse> searchFiles(
            @RequestParam(defaultValue = "") String prefix,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "all") String type) {
        try {
            List<FileItem> items = storageService.searchObjects(prefix, query, type);
            return ResponseEntity.ok(ApiResponse.success("Search results", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Search failed: " + e.getMessage()));
        }
    }

    // ========================
    // Zip Download
    // ========================

    @PostMapping("/files/download-zip")
    public void downloadZip(@RequestBody List<String> keys, HttpServletResponse response) {
        try {
            response.setContentType("application/zip");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"ultra-cloud-download.zip\"");

            try (OutputStream out = response.getOutputStream();
                 ZipOutputStream zipOut = new ZipOutputStream(out)) {

                for (String key : keys) {
                    try {
                        String fileName = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
                        if (fileName.isEmpty() || key.endsWith("/")) continue;
                        zipOut.putNextEntry(new ZipEntry(fileName));
                        try (InputStream is = storageService.downloadFile(key)) {
                            is.transferTo(zipOut);
                        }
                        zipOut.closeEntry();
                    } catch (Exception e) { /* skip */ }
                }
            }

            auditService.logSuccess("ZIP_DOWNLOAD", keys.size() + " files",
                    sessionManager.getProviderName(), sessionManager.getContainerName());
        } catch (Exception e) {
            auditService.logFailure("ZIP_DOWNLOAD", e.getMessage(),
                    sessionManager.getProviderName(), sessionManager.getContainerName());
        }
    }

    // ========================
    // Thumbnails
    // ========================

    @GetMapping("/files/thumbnail")
    public ResponseEntity<InputStreamResource> thumbnail(@RequestParam String key) {
        try {
            String contentType = storageService.getContentType(key);
            if (!contentType.startsWith("image/")) return ResponseEntity.badRequest().build();
            long contentLength = storageService.getContentLength(key);
            InputStream inputStream = storageService.downloadFile(key);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ========================
    // Cross-Provider Transfer
    // ========================

    @PostMapping("/files/transfer")
    public ResponseEntity<ApiResponse> transferFile(@RequestBody Map<String, String> body) {
        try {
            String sourceSession = body.get("sourceSessionId");
            String sourceKey = body.get("sourceKey");
            String destSession = body.get("destSessionId");
            String destPrefix = body.getOrDefault("destPrefix", "");

            if (sourceSession == null || sourceKey == null || destSession == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("sourceSessionId, sourceKey, and destSessionId are required"));
            }

            storageService.transferFile(sourceSession, sourceKey, destSession, destPrefix);

            String fileName = sourceKey.contains("/")
                    ? sourceKey.substring(sourceKey.lastIndexOf('/') + 1) : sourceKey;

            auditService.logSuccess("TRANSFER",
                    fileName + " → " + sessionManager.getProviderDisplayName(destSession),
                    sessionManager.getProviderName(sourceSession),
                    sessionManager.getContainerName(sourceSession));
            webhookService.notify("TRANSFER",
                    "File transferred: " + fileName,
                    sessionManager.getProviderDisplayName(sourceSession),
                    sessionManager.getContainerName(sourceSession));

            return ResponseEntity.ok(ApiResponse.success("File transferred successfully"));
        } catch (Exception e) {
            auditService.logFailure("TRANSFER", e.getMessage(), "", "");
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Transfer failed: " + e.getMessage()));
        }
    }

    // ========================
    // File Versioning
    // ========================

    @GetMapping("/files/versions")
    public ResponseEntity<ApiResponse> listVersions(@RequestParam String key) {
        try {
            var versions = sessionManager.getProvider().listVersions(key);
            return ResponseEntity.ok(ApiResponse.success("Versions listed", versions));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to list versions: " + e.getMessage()));
        }
    }

    @PostMapping("/files/versions/restore")
    public ResponseEntity<ApiResponse> restoreVersion(@RequestBody Map<String, String> body) {
        try {
            String key = body.get("key");
            String versionId = body.get("versionId");

            if (key == null || versionId == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("key and versionId are required"));
            }

            sessionManager.getProvider().restoreVersion(key, versionId);

            auditService.logSuccess("RESTORE_VERSION", key + " → " + versionId,
                    sessionManager.getProviderName(), sessionManager.getContainerName());

            return ResponseEntity.ok(ApiResponse.success("Version restored successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Restore failed: " + e.getMessage()));
        }
    }

    // ========================
    // Storage Analytics
    // ========================

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse> getAnalytics() {
        try {
            Map<String, Object> analytics = storageService.getAnalytics();
            return ResponseEntity.ok(ApiResponse.success("Analytics computed", analytics));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Analytics failed: " + e.getMessage()));
        }
    }

    // ========================
    // Audit Logs
    // ========================

    @GetMapping("/audit")
    public ResponseEntity<ApiResponse> getAuditLogs(@RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", auditService.getLogs(limit)));
    }

    @GetMapping("/audit/export")
    public ResponseEntity<String> exportAuditLogs() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ultra-cloud-audit.csv\"")
                .body(auditService.exportCsv());
    }

    @DeleteMapping("/audit")
    public ResponseEntity<ApiResponse> clearAuditLogs() {
        auditService.clearLogs();
        return ResponseEntity.ok(ApiResponse.success("Audit logs cleared"));
    }

    // ========================
    // Webhooks
    // ========================

    @GetMapping("/webhooks")
    public ResponseEntity<ApiResponse> getWebhooks() {
        return ResponseEntity.ok(ApiResponse.success("Webhooks listed", webhookService.getWebhooks()));
    }

    @PostMapping("/webhooks")
    public ResponseEntity<ApiResponse> addWebhook(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        String name = body.getOrDefault("name", "Webhook");
        String type = body.getOrDefault("type", "generic");
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Webhook URL is required"));
        }
        String id = webhookService.addWebhook(url, name, type);
        return ResponseEntity.ok(ApiResponse.success("Webhook added", Map.of("id", id)));
    }

    @DeleteMapping("/webhooks/{id}")
    public ResponseEntity<ApiResponse> removeWebhook(@PathVariable String id) {
        webhookService.removeWebhook(id);
        return ResponseEntity.ok(ApiResponse.success("Webhook removed"));
    }

    @PutMapping("/webhooks/{id}/toggle")
    public ResponseEntity<ApiResponse> toggleWebhook(
            @PathVariable String id, @RequestBody Map<String, Boolean> body) {
        boolean enabled = body.getOrDefault("enabled", true);
        webhookService.toggleWebhook(id, enabled);
        return ResponseEntity.ok(ApiResponse.success(enabled ? "Webhook enabled" : "Webhook disabled"));
    }
}
