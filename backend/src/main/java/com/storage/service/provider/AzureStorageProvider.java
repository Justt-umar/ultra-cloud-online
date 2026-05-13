package com.storage.service.provider;

import com.azure.storage.blob.*;
import com.azure.storage.blob.models.*;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.storage.dto.FileItem;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Azure Blob Storage implementation of StorageProvider.
 *
 * Free tier: 5 GB LRS, 20K read / 10K write operations/month (12 months).
 *
 * Credentials mapping:
 * - connectionString → Azure Storage connection string
 * - containerName    → Blob container name (equivalent to S3 bucket)
 */
public class AzureStorageProvider implements StorageProvider {

    private BlobServiceClient blobServiceClient;
    private BlobContainerClient containerClient;
    private String containerName;
    private boolean connected = false;

    @Override
    public void connect(Map<String, String> credentials) {
        disconnect();

        String connectionString = credentials.get("connectionString");
        String container = credentials.get("containerName");

        if (connectionString == null || connectionString.isBlank()) {
            throw new IllegalArgumentException("Azure connection string is required");
        }
        if (container == null || container.isBlank()) {
            throw new IllegalArgumentException("Container name is required");
        }

        this.blobServiceClient = new BlobServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();

        this.containerClient = blobServiceClient.getBlobContainerClient(container);

        // Validate connection — check if container exists
        if (!containerClient.exists()) {
            throw new IllegalArgumentException("Container '" + container + "' does not exist");
        }

        this.containerName = container;
        this.connected = true;
    }

    @Override
    public void disconnect() {
        blobServiceClient = null;
        containerClient = null;
        containerName = null;
        connected = false;
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public String getContainerName() {
        return containerName;
    }

    @Override
    public String getProviderName() {
        return "azure";
    }

    @Override
    public String getProviderDisplayName() {
        return "Azure Blob";
    }

    // ─── File Operations ───────────────────

    @Override
    public List<FileItem> listObjects(String prefix) {
        if (prefix == null) prefix = "";

        List<FileItem> items = new ArrayList<>();
        Set<String> addedFolders = new HashSet<>();

        // Use listBlobsByHierarchy for delimiter-based listing (like S3)
        ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);

        for (BlobItem blob : containerClient.listBlobsByHierarchy("/", options, null)) {
            if (blob.isPrefix() != null && blob.isPrefix()) {
                // This is a virtual directory (folder)
                String folderPath = blob.getName();
                if (!addedFolders.contains(folderPath)) {
                    addedFolders.add(folderPath);
                    String folderName = extractName(folderPath, true);
                    items.add(new FileItem(folderName, folderPath, 0, "", true, "folder"));
                }
            } else {
                // This is a blob (file)
                String blobName = blob.getName();
                if (blobName.equals(prefix)) continue;

                String fileName = extractName(blobName, false);
                String contentType = guessContentType(fileName);
                long size = blob.getProperties() != null && blob.getProperties().getContentLength() != null
                        ? blob.getProperties().getContentLength() : 0;
                String lastModified = blob.getProperties() != null && blob.getProperties().getLastModified() != null
                        ? formatDate(blob.getProperties().getLastModified()) : "";

                items.add(new FileItem(fileName, blobName, size, lastModified, false, contentType));
            }
        }

        return items;
    }

    @Override
    public void uploadFile(String prefix, MultipartFile file) throws IOException {
        String key = (prefix != null ? prefix : "") + file.getOriginalFilename();

        BlobClient blobClient = containerClient.getBlobClient(key);
        BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());

        blobClient.upload(new ByteArrayInputStream(file.getBytes()), file.getSize(), true);
        blobClient.setHttpHeaders(headers);
    }

    @Override
    public InputStream downloadFile(String key) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        return blobClient.openInputStream();
    }

    @Override
    public String getContentType(String key) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        BlobProperties props = blobClient.getProperties();
        return props.getContentType() != null ? props.getContentType() : "application/octet-stream";
    }

    @Override
    public long getContentLength(String key) {
        BlobClient blobClient = containerClient.getBlobClient(key);
        BlobProperties props = blobClient.getProperties();
        return props.getBlobSize();
    }

    @Override
    public void deleteObject(String key) {
        if (key.endsWith("/")) {
            deleteFolderContents(key);
        } else {
            BlobClient blobClient = containerClient.getBlobClient(key);
            if (blobClient.exists()) {
                blobClient.delete();
            }
        }
    }

    private void deleteFolderContents(String prefix) {
        ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);
        for (BlobItem blob : containerClient.listBlobs(options, null)) {
            containerClient.getBlobClient(blob.getName()).delete();
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

        BlobClient blobClient = containerClient.getBlobClient(folderKey);
        blobClient.upload(new ByteArrayInputStream(new byte[0]), 0, true);
    }

    @Override
    public void renameObject(String oldKey, String newKey) {
        if (oldKey.endsWith("/")) {
            renameFolderContents(oldKey, newKey);
        } else {
            BlobClient sourceBlob = containerClient.getBlobClient(oldKey);
            BlobClient destBlob = containerClient.getBlobClient(newKey);

            // Copy using beginCopy
            String sourceUrl = sourceBlob.getBlobUrl();
            destBlob.copyFromUrl(sourceUrl);

            // Delete original
            sourceBlob.delete();
        }
    }

    private void renameFolderContents(String oldPrefix, String newPrefix) {
        String normalizedNewPrefix = newPrefix.endsWith("/") ? newPrefix : newPrefix + "/";

        ListBlobsOptions options = new ListBlobsOptions().setPrefix(oldPrefix);
        for (BlobItem blob : containerClient.listBlobs(options, null)) {
            String newKey = normalizedNewPrefix + blob.getName().substring(oldPrefix.length());

            BlobClient sourceBlob = containerClient.getBlobClient(blob.getName());
            BlobClient destBlob = containerClient.getBlobClient(newKey);

            destBlob.copyFromUrl(sourceBlob.getBlobUrl());
        }

        deleteFolderContents(oldPrefix);
    }

    @Override
    public String generatePresignedUrl(String key, long durationMinutes) {
        BlobClient blobClient = containerClient.getBlobClient(key);

        BlobSasPermission permissions = new BlobSasPermission().setReadPermission(true);

        BlobServiceSasSignatureValues values = new BlobServiceSasSignatureValues(
                OffsetDateTime.now().plusMinutes(durationMinutes),
                permissions
        );

        String sasToken = blobClient.generateSas(values);
        return blobClient.getBlobUrl() + "?" + sasToken;
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

    private String formatDate(OffsetDateTime dateTime) {
        if (dateTime == null) return "";
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault())
                .format(dateTime);
    }
}
