package com.storage.service.provider;

import com.storage.dto.FileItem;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Unified interface for all cloud storage providers.
 * Each provider (AWS S3, Azure Blob, GCP Cloud Storage, Backblaze B2)
 * implements this interface to provide a consistent file management API.
 */
public interface StorageProvider {

    /**
     * Connect to the cloud storage using provider-specific credentials.
     */
    void connect(Map<String, String> credentials);

    /** Disconnect and release all resources. */
    void disconnect();

    /** @return true if currently connected and authenticated. */
    boolean isConnected();

    /** @return the bucket/container name. */
    String getContainerName();

    /** @return provider identifier: "aws", "azure", "gcp", "backblaze". */
    String getProviderName();

    /** @return human-readable provider display name. */
    String getProviderDisplayName();

    // ──────────────────────────────
    // File Operations
    // ──────────────────────────────

    /** List objects at a given prefix (directory browsing). */
    List<FileItem> listObjects(String prefix);

    /** Upload a file to the given prefix path. */
    void uploadFile(String prefix, MultipartFile file) throws IOException;

    /**
     * Upload a raw InputStream to the given key.
     * Used for cross-provider file transfer.
     */
    default void uploadStream(String key, InputStream data, long contentLength, String contentType) throws IOException {
        throw new UnsupportedOperationException("Stream upload not supported by " + getProviderName());
    }

    /** Download a file and return its InputStream. */
    InputStream downloadFile(String key);

    /** Get the content type of an object. */
    String getContentType(String key);

    /** Get the content length (size in bytes) of an object. */
    long getContentLength(String key);

    /** Delete a single object (or folder recursively). */
    void deleteObject(String key);

    /** Delete multiple objects. */
    void deleteObjects(List<String> keys);

    /** Create a folder (zero-byte marker object). */
    void createFolder(String path);

    /** Rename an object (copy + delete). */
    void renameObject(String oldKey, String newKey);

    /**
     * Generate a pre-signed/SAS URL for temporary public access.
     */
    String generatePresignedUrl(String key, long durationMinutes);

    // ──────────────────────────────
    // Versioning (optional)
    // ──────────────────────────────

    /**
     * List all versions of a specific object.
     * Returns empty list if versioning is not supported or enabled.
     */
    default List<Map<String, Object>> listVersions(String key) {
        return Collections.emptyList();
    }

    /**
     * Restore a specific version of an object (copy the version to become the latest).
     */
    default void restoreVersion(String key, String versionId) {
        throw new UnsupportedOperationException("Versioning not supported by " + getProviderName());
    }
}
