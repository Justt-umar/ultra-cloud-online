package com.storage.service.provider;

import com.storage.dto.FileItem;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AWS S3 implementation of StorageProvider.
 * Refactored from the original S3Service + S3SessionManager.
 */
public class AwsStorageProvider implements StorageProvider {

    protected S3Client s3Client;
    protected S3Presigner s3Presigner;
    protected String bucket;
    protected String region;
    protected boolean connected = false;

    @Override
    public void connect(Map<String, String> credentials) {
        disconnect();

        String accessKeyId = credentials.get("accessKeyId");
        String secretAccessKey = credentials.get("secretAccessKey");
        String regionStr = credentials.getOrDefault("region", "us-east-1");
        String bucketName = credentials.get("bucket");

        if (accessKeyId == null || accessKeyId.isBlank()) {
            throw new IllegalArgumentException("Access Key ID is required");
        }
        if (secretAccessKey == null || secretAccessKey.isBlank()) {
            throw new IllegalArgumentException("Secret Access Key is required");
        }
        if (bucketName == null || bucketName.isBlank()) {
            throw new IllegalArgumentException("Bucket name is required");
        }

        Region awsRegion = Region.of(regionStr);
        AwsBasicCredentials awsCreds = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(awsCreds);

        S3ClientBuilder clientBuilder = S3Client.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider);

        S3Presigner.Builder presignerBuilder = S3Presigner.builder()
                .region(awsRegion)
                .credentialsProvider(credentialsProvider);

        // Allow subclasses (e.g., Backblaze) to customize the endpoint
        URI endpointOverride = getEndpointOverride(regionStr);
        if (endpointOverride != null) {
            clientBuilder.endpointOverride(endpointOverride);
            presignerBuilder.endpointOverride(endpointOverride);
        }

        this.s3Client = clientBuilder.build();
        this.s3Presigner = presignerBuilder.build();

        // Validate connection
        this.s3Client.headBucket(b -> b.bucket(bucketName));

        this.bucket = bucketName;
        this.region = regionStr;
        this.connected = true;
    }

    /**
     * Override in subclasses to provide a custom S3-compatible endpoint.
     * Returns null for standard AWS S3.
     */
    protected URI getEndpointOverride(String regionStr) {
        return null;
    }

    @Override
    public void disconnect() {
        if (s3Client != null) {
            s3Client.close();
            s3Client = null;
        }
        if (s3Presigner != null) {
            s3Presigner.close();
            s3Presigner = null;
        }
        bucket = null;
        region = null;
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
        return "aws";
    }

    @Override
    public String getProviderDisplayName() {
        return "AWS S3";
    }

    // ─── File Operations ───────────────────

    @Override
    public List<FileItem> listObjects(String prefix) {
        if (prefix == null) prefix = "";

        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(prefix)
                .delimiter("/")
                .build();

        ListObjectsV2Response response = s3Client.listObjectsV2(request);
        List<FileItem> items = new ArrayList<>();

        // Add folders (common prefixes)
        if (response.commonPrefixes() != null) {
            for (CommonPrefix cp : response.commonPrefixes()) {
                String folderPath = cp.prefix();
                String folderName = extractName(folderPath, true);
                items.add(new FileItem(folderName, folderPath, 0, "", true, "folder"));
            }
        }

        // Add files
        if (response.contents() != null) {
            for (S3Object obj : response.contents()) {
                if (obj.key().equals(prefix)) continue;

                String fileName = extractName(obj.key(), false);
                String contentType = guessContentType(fileName);
                String lastModified = formatDate(obj.lastModified());

                items.add(new FileItem(fileName, obj.key(), obj.size(), lastModified, false, contentType));
            }
        }

        return items;
    }

    @Override
    public void uploadFile(String prefix, MultipartFile file) throws IOException {
        String key = (prefix != null ? prefix : "") + file.getOriginalFilename();

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(file.getBytes()));
    }

    @Override
    public InputStream downloadFile(String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        return s3Client.getObject(getRequest);
    }

    @Override
    public String getContentType(String key) {
        HeadObjectResponse head = s3Client.headObject(b -> b.bucket(bucket).key(key));
        return head.contentType() != null ? head.contentType() : "application/octet-stream";
    }

    @Override
    public long getContentLength(String key) {
        HeadObjectResponse head = s3Client.headObject(b -> b.bucket(bucket).key(key));
        return head.contentLength();
    }

    @Override
    public void deleteObject(String key) {
        if (key.endsWith("/")) {
            deleteFolderContents(key);
        }

        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        s3Client.deleteObject(deleteRequest);
    }

    private void deleteFolderContents(String prefix) {
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(prefix)
                .build();

        ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);

        if (response.contents() != null && !response.contents().isEmpty()) {
            List<ObjectIdentifier> objectIds = response.contents().stream()
                    .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                    .collect(Collectors.toList());

            DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(objectIds).build())
                    .build();

            s3Client.deleteObjects(deleteRequest);
        }
    }

    @Override
    public void deleteObjects(List<String> keys) {
        for (String key : keys) {
            deleteObject(key);
        }
    }

    @Override
    public void createFolder(String path) {
        String folderKey = path.endsWith("/") ? path : path + "/";

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(folderKey)
                .contentType("application/x-directory")
                .build();

        s3Client.putObject(putRequest, RequestBody.empty());
    }

    @Override
    public void renameObject(String oldKey, String newKey) {
        if (oldKey.endsWith("/")) {
            renameFolderContents(oldKey, newKey);
        } else {
            CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .sourceBucket(bucket)
                    .sourceKey(oldKey)
                    .destinationBucket(bucket)
                    .destinationKey(newKey)
                    .build();

            s3Client.copyObject(copyRequest);
            deleteObject(oldKey);
        }
    }

    private void renameFolderContents(String oldPrefix, String newPrefix) {
        String normalizedNewPrefix = newPrefix.endsWith("/") ? newPrefix : newPrefix + "/";

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(oldPrefix)
                .build();

        ListObjectsV2Response response = s3Client.listObjectsV2(listRequest);

        if (response.contents() != null) {
            for (S3Object obj : response.contents()) {
                String newKey = normalizedNewPrefix + obj.key().substring(oldPrefix.length());

                CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                        .sourceBucket(bucket)
                        .sourceKey(obj.key())
                        .destinationBucket(bucket)
                        .destinationKey(newKey)
                        .build();

                s3Client.copyObject(copyRequest);
            }
        }

        deleteFolderContents(oldPrefix);
    }

    @Override
    public String generatePresignedUrl(String key, long durationMinutes) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(durationMinutes))
                .getObjectRequest(b -> b.bucket(bucket).key(key))
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    @Override
    public void uploadStream(String key, InputStream data, long contentLength, String contentType) throws IOException {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();

        s3Client.putObject(putRequest, RequestBody.fromInputStream(data, contentLength));
    }

    @Override
    public List<Map<String, Object>> listVersions(String key) {
        List<Map<String, Object>> versions = new ArrayList<>();

        try {
            ListObjectVersionsRequest request = ListObjectVersionsRequest.builder()
                    .bucket(bucket)
                    .prefix(key)
                    .build();

            ListObjectVersionsResponse response = s3Client.listObjectVersions(request);

            for (ObjectVersion v : response.versions()) {
                if (!v.key().equals(key)) continue;

                Map<String, Object> vInfo = new java.util.LinkedHashMap<>();
                vInfo.put("versionId", v.versionId());
                vInfo.put("key", v.key());
                vInfo.put("size", v.size());
                vInfo.put("lastModified", formatDate(v.lastModified()));
                vInfo.put("isLatest", v.isLatest());
                vInfo.put("etag", v.eTag());
                versions.add(vInfo);
            }
        } catch (Exception e) {
            // Versioning may not be enabled — return empty
        }

        return versions;
    }

    @Override
    public void restoreVersion(String key, String versionId) {
        // Copy the old version to become the latest
        CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                .sourceBucket(bucket)
                .sourceKey(key)
                .sourceVersionId(versionId)
                .destinationBucket(bucket)
                .destinationKey(key)
                .build();

        s3Client.copyObject(copyRequest);
    }

    // ─── Helpers ───────────────────────────

    protected String extractName(String key, boolean isFolder) {
        if (isFolder) {
            String withoutTrailingSlash = key.endsWith("/") ? key.substring(0, key.length() - 1) : key;
            int lastSlash = withoutTrailingSlash.lastIndexOf('/');
            return lastSlash >= 0 ? withoutTrailingSlash.substring(lastSlash + 1) : withoutTrailingSlash;
        } else {
            int lastSlash = key.lastIndexOf('/');
            return lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
        }
    }

    protected String guessContentType(String fileName) {
        String type = URLConnection.guessContentTypeFromName(fileName);
        return type != null ? type : "application/octet-stream";
    }

    protected String formatDate(Instant instant) {
        if (instant == null) return "";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(instant);
    }
}

