package com.storage.service.provider;

import java.net.URI;

/**
 * Backblaze B2 implementation of StorageProvider.
 * Backblaze B2 is fully S3-compatible, so this extends AwsStorageProvider
 * and only overrides the endpoint URL.
 *
 * Free tier: 10 GB storage, 1 GB/day downloads — always free.
 *
 * Credentials mapping:
 * - Application Key ID  → accessKeyId
 * - Application Key     → secretAccessKey
 * - Region              → region (e.g., "us-west-004")
 * - Bucket Name         → bucket
 */
public class BackblazeStorageProvider extends AwsStorageProvider {

    @Override
    public String getProviderName() {
        return "backblaze";
    }

    @Override
    public String getProviderDisplayName() {
        return "Backblaze B2";
    }

    /**
     * Override the endpoint to point to Backblaze's S3-compatible API.
     * Endpoint format: https://s3.{region}.backblazeb2.com
     */
    @Override
    protected URI getEndpointOverride(String regionStr) {
        return URI.create("https://s3." + regionStr + ".backblazeb2.com");
    }
}
