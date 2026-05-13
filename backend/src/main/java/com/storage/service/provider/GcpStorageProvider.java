package com.storage.service.provider;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.storage.*;
import com.google.cloud.storage.Storage;
import com.storage.dto.FileItem;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Google Cloud Storage implementation of StorageProvider.
 *
 * Free tier: 5 GB in US regions, always free.
 *
 * Credentials mapping:
 * - credentialsJson → Service Account JSON (full contents)
 * - projectId       → GCP project ID
 * - bucket          → GCS bucket name
 */
public class GcpStorageProvider implements StorageProvider {

    private Storage storage;
    private String bucket;
    private String projectId;
    private boolean connected = false;

    // HMAC mode: delegate to an internal S3-compatible provider
    private AwsStorageProvider hmacDelegate;

    @Override
    public void connect(Map<String, String> credentials) {
        disconnect();

        String credentialsJson = credentials.get("credentialsJson");
        String accessKeyId = credentials.get("accessKeyId");
        String bucketName = credentials.get("bucket");

        // ── Mode 1: HMAC Keys (S3-compatible) ──
        // Used when org policy blocks Service Account JSON key creation
        if (accessKeyId != null && !accessKeyId.isBlank()) {
            hmacDelegate = new AwsStorageProvider() {
                @Override
                protected URI getEndpointOverride(String regionStr) {
                    return URI.create("https://storage.googleapis.com");
                }

                @Override
                public String getProviderName() { return "gcp"; }

                @Override
                public String getProviderDisplayName() { return "Google Cloud (HMAC)"; }
            };

            // GCP S3-compatible API uses "auto" or "us-east-1" as the signing region
            credentials.put("region", "auto");
            hmacDelegate.connect(credentials);

            this.bucket = bucketName;
            this.projectId = credentials.get("projectId");
            this.connected = true;
            return;
        }

        // ── Mode 2: Native Service Account JSON ──
        if (credentialsJson == null || credentialsJson.isBlank()) {
            throw new IllegalArgumentException("Either HMAC access keys or GCP service account JSON is required");
        }
        if (bucketName == null || bucketName.isBlank()) {
            throw new IllegalArgumentException("Bucket name is required");
        }

        try {
            GoogleCredentials googleCreds = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))
            );

            StorageOptions.Builder optionsBuilder = StorageOptions.newBuilder()
                    .setCredentials(googleCreds);

            String project = credentials.get("projectId");
            if (project != null && !project.isBlank()) {
                optionsBuilder.setProjectId(project);
            }

            this.storage = optionsBuilder.build().getService();

            // Validate connection — check if bucket exists
            Bucket gcsBucket = storage.get(bucketName);
            if (gcsBucket == null) {
                throw new IllegalArgumentException("Bucket '" + bucketName + "' does not exist or is not accessible");
            }

            this.bucket = bucketName;
            this.projectId = project;
            this.connected = true;

        } catch (IOException e) {
            throw new RuntimeException("Failed to parse GCP credentials: " + e.getMessage(), e);
        }
    }

    @Override
    public void disconnect() {
        if (hmacDelegate != null) {
            hmacDelegate.disconnect();
            hmacDelegate = null;
        }
        try {
            if (storage != null) {
                storage.close();
            }
        } catch (Exception e) {
            // Ignore close errors
        }
        storage = null;
        bucket = null;
        projectId = null;
        connected = false;
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public String getContainerName() {
        return bucket;
    }

    @Override
    public String getProviderName() {
        return "gcp";
    }

    @Override
    public String getProviderDisplayName() {
        return hmacDelegate != null ? "Google Cloud (HMAC)" : "Google Cloud";
    }

    // ─── File Operations ───────────────────
    // In HMAC mode, all operations are delegated to the S3-compatible provider

    @Override
    public List<FileItem> listObjects(String prefix) {
        if (hmacDelegate != null) return hmacDelegate.listObjects(prefix);
        if (prefix == null) prefix = "";

        List<FileItem> items = new ArrayList<>();
        Set<String> addedFolders = new HashSet<>();

        Storage.BlobListOption[] options = prefix.isEmpty()
                ? new Storage.BlobListOption[]{
                    Storage.BlobListOption.delimiter("/")
                  }
                : new Storage.BlobListOption[]{
                    Storage.BlobListOption.prefix(prefix),
                    Storage.BlobListOption.delimiter("/")
                  };

        com.google.api.gax.paging.Page<Blob> blobs = storage.list(bucket, options);

        for (Blob blob : blobs.iterateAll()) {
            String blobName = blob.getName();

            if (blobName.endsWith("/") && !blobName.equals(prefix)) {
                // Virtual directory
                if (!addedFolders.contains(blobName)) {
                    addedFolders.add(blobName);
                    String folderName = extractName(blobName, true);
                    items.add(new FileItem(folderName, blobName, 0, "", true, "folder"));
                }
            } else if (!blobName.equals(prefix)) {
                // Regular file
                String fileName = extractName(blobName, false);
                String contentType = blob.getContentType() != null
                        ? blob.getContentType()
                        : guessContentType(fileName);
                long size = blob.getSize() != null ? blob.getSize() : 0;
                String lastModified = blob.getUpdateTimeOffsetDateTime() != null
                        ? formatDate(blob.getUpdateTimeOffsetDateTime().toInstant())
                        : "";

                items.add(new FileItem(fileName, blobName, size, lastModified, false, contentType));
            }
        }

        return items;
    }

    @Override
    public void uploadFile(String prefix, MultipartFile file) throws IOException {
        if (hmacDelegate != null) { hmacDelegate.uploadFile(prefix, file); return; }
        String key = (prefix != null ? prefix : "") + file.getOriginalFilename();

        BlobId blobId = BlobId.of(bucket, key);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();

        storage.create(blobInfo, file.getBytes());
    }

    @Override
    public InputStream downloadFile(String key) {
        if (hmacDelegate != null) return hmacDelegate.downloadFile(key);
        Blob blob = storage.get(BlobId.of(bucket, key));
        if (blob == null) {
            throw new RuntimeException("Object not found: " + key);
        }
        byte[] content = blob.getContent();
        return new ByteArrayInputStream(content);
    }

    @Override
    public String getContentType(String key) {
        if (hmacDelegate != null) return hmacDelegate.getContentType(key);
        Blob blob = storage.get(BlobId.of(bucket, key));
        if (blob == null) return "application/octet-stream";
        return blob.getContentType() != null ? blob.getContentType() : "application/octet-stream";
    }

    @Override
    public long getContentLength(String key) {
        if (hmacDelegate != null) return hmacDelegate.getContentLength(key);
        Blob blob = storage.get(BlobId.of(bucket, key));
        if (blob == null) return 0;
        return blob.getSize() != null ? blob.getSize() : 0;
    }

    @Override
    public void deleteObject(String key) {
        if (hmacDelegate != null) { hmacDelegate.deleteObject(key); return; }
        if (key.endsWith("/")) {
            deleteFolderContents(key);
        }
        storage.delete(BlobId.of(bucket, key));
    }

    private void deleteFolderContents(String prefix) {
        com.google.api.gax.paging.Page<Blob> blobs = storage.list(bucket,
                Storage.BlobListOption.prefix(prefix));

        for (Blob blob : blobs.iterateAll()) {
            storage.delete(blob.getBlobId());
        }
    }

    @Override
    public void deleteObjects(List<String> keys) {
        if (hmacDelegate != null) { hmacDelegate.deleteObjects(keys); return; }
        for (String key : keys) {
            deleteObject(key);
        }
    }

    @Override
    public void createFolder(String path) {
        if (hmacDelegate != null) { hmacDelegate.createFolder(path); return; }
        String folderKey = path.endsWith("/") ? path : path + "/";

        BlobId blobId = BlobId.of(bucket, folderKey);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType("application/x-directory")
                .build();

        storage.create(blobInfo, new byte[0]);
    }

    @Override
    public void renameObject(String oldKey, String newKey) {
        if (hmacDelegate != null) { hmacDelegate.renameObject(oldKey, newKey); return; }
        if (oldKey.endsWith("/")) {
            renameFolderContents(oldKey, newKey);
        } else {
            // Copy to new key
            BlobId source = BlobId.of(bucket, oldKey);
            BlobId target = BlobId.of(bucket, newKey);

            Storage.CopyRequest copyRequest = Storage.CopyRequest.newBuilder()
                    .setSource(source)
                    .setTarget(target)
                    .build();

            storage.copy(copyRequest);
            storage.delete(source);
        }
    }

    private void renameFolderContents(String oldPrefix, String newPrefix) {
        String normalizedNewPrefix = newPrefix.endsWith("/") ? newPrefix : newPrefix + "/";

        com.google.api.gax.paging.Page<Blob> blobs = storage.list(bucket,
                Storage.BlobListOption.prefix(oldPrefix));

        for (Blob blob : blobs.iterateAll()) {
            String newKey = normalizedNewPrefix + blob.getName().substring(oldPrefix.length());

            BlobId source = blob.getBlobId();
            BlobId target = BlobId.of(bucket, newKey);

            Storage.CopyRequest copyRequest = Storage.CopyRequest.newBuilder()
                    .setSource(source)
                    .setTarget(target)
                    .build();

            storage.copy(copyRequest);
        }

        deleteFolderContents(oldPrefix);
    }

    @Override
    public String generatePresignedUrl(String key, long durationMinutes) {
        if (hmacDelegate != null) return hmacDelegate.generatePresignedUrl(key, durationMinutes);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucket, key)).build();

        // Generate signed URL — requires the credentials to be ServiceAccountCredentials
        java.net.URL signedUrl = storage.signUrl(
                blobInfo,
                durationMinutes,
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature()
        );

        return signedUrl.toString();
    }

    // ─── Helpers ───────────────────────────

    private String extractName(String key, boolean isFolder) {
        if (isFolder) {
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
}
