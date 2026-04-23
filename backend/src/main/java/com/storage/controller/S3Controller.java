package com.storage.controller;

import com.storage.dto.*;
import com.storage.service.S3Service;
import com.storage.service.S3SessionManager;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class S3Controller {

    private final S3SessionManager sessionManager;
    private final S3Service s3Service;

    public S3Controller(S3SessionManager sessionManager, S3Service s3Service) {
        this.sessionManager = sessionManager;
        this.s3Service = s3Service;
    }

    // ========================
    // Connection Management
    // ========================

    @PostMapping("/connect")
    public ResponseEntity<ApiResponse> connect(@Valid @RequestBody ConnectRequest request) {
        try {
            sessionManager.connect(
                    request.accessKeyId(),
                    request.secretAccessKey(),
                    request.region(),
                    request.bucket()
            );
            return ResponseEntity.ok(ApiResponse.success("Connected to S3 successfully",
                    Map.of("bucket", request.bucket(), "region", request.region())));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to connect: " + e.getMessage()));
        }
    }

    @PostMapping("/disconnect")
    public ResponseEntity<ApiResponse> disconnect() {
        sessionManager.disconnect();
        return ResponseEntity.ok(ApiResponse.success("Disconnected from S3"));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> statusMap = Map.of(
                "connected", sessionManager.isConnected(),
                "bucket", sessionManager.isConnected() ? sessionManager.getBucket() : "",
                "region", sessionManager.isConnected() ? sessionManager.getRegion() : ""
        );
        return ResponseEntity.ok(statusMap);
    }

    // ========================
    // File Operations
    // ========================

    @GetMapping("/files")
    public ResponseEntity<ApiResponse> listFiles(@RequestParam(defaultValue = "") String prefix) {
        try {
            List<FileItem> items = s3Service.listObjects(prefix);
            return ResponseEntity.ok(ApiResponse.success("Files listed successfully", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to list files: " + e.getMessage()));
        }
    }

    @PostMapping("/files/upload")
    public ResponseEntity<ApiResponse> uploadFiles(
            @RequestParam(defaultValue = "") String prefix,
            @RequestParam("files") List<MultipartFile> files) {
        try {
            int uploaded = 0;
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    s3Service.uploadFile(prefix, file);
                    uploaded++;
                }
            }
            return ResponseEntity.ok(ApiResponse.success(
                    uploaded + " file(s) uploaded successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/download")
    public ResponseEntity<InputStreamResource> downloadFile(@RequestParam String key) {
        try {
            ResponseInputStream<GetObjectResponse> s3Object = s3Service.downloadFile(key);
            GetObjectResponse metadata = s3Object.response();

            String fileName = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            metadata.contentType() != null ? metadata.contentType() : "application/octet-stream"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(metadata.contentLength()))
                    .body(new InputStreamResource(s3Object));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/files")
    public ResponseEntity<ApiResponse> deleteFiles(@RequestBody List<String> keys) {
        try {
            s3Service.deleteObjects(keys);
            return ResponseEntity.ok(ApiResponse.success(
                    keys.size() + " item(s) deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Delete failed: " + e.getMessage()));
        }
    }

    @PostMapping("/files/folder")
    public ResponseEntity<ApiResponse> createFolder(@RequestBody Map<String, String> body) {
        try {
            String path = body.get("path");
            if (path == null || path.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Folder path is required"));
            }
            s3Service.createFolder(path);
            return ResponseEntity.ok(ApiResponse.success("Folder created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create folder: " + e.getMessage()));
        }
    }

    @PutMapping("/files/rename")
    public ResponseEntity<ApiResponse> renameFile(@Valid @RequestBody RenameRequest request) {
        try {
            s3Service.renameObject(request.oldKey(), request.newKey());
            return ResponseEntity.ok(ApiResponse.success("Renamed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Rename failed: " + e.getMessage()));
        }
    }

    @GetMapping("/files/preview")
    public ResponseEntity<InputStreamResource> previewFile(@RequestParam String key) {
        try {
            HeadObjectResponse metadata = s3Service.getObjectMetadata(key);
            ResponseInputStream<GetObjectResponse> s3Object = s3Service.downloadFile(key);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            metadata.contentType() != null ? metadata.contentType() : "application/octet-stream"))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(metadata.contentLength()))
                    .body(new InputStreamResource(s3Object));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/files/share")
    public ResponseEntity<ApiResponse> shareFile(@Valid @RequestBody ShareRequest request) {
        try {
            String url = s3Service.generatePresignedUrl(request.key(), request.durationMinutes());
            ShareResponse response = new ShareResponse(url, request.durationMinutes());
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
            List<FileItem> items = s3Service.searchObjects(prefix, query, type);
            return ResponseEntity.ok(ApiResponse.success("Search results", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Search failed: " + e.getMessage()));
        }
    }
}
