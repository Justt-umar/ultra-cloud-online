package com.storage.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Connect request supporting multiple cloud storage providers.
 *
 * Required fields vary by provider:
 * - AWS S3:      provider, accessKeyId, secretAccessKey, region, bucket
 * - Azure:       provider, connectionString, containerName
 * - GCP:         provider, credentialsJson, bucket (optional: projectId)
 * - Backblaze:   provider, accessKeyId, secretAccessKey, region, bucket
 */
public record ConnectRequest(
        String provider,

        // AWS / Backblaze fields
        String accessKeyId,
        String secretAccessKey,
        String region,

        // Shared: bucket (AWS, GCP, Backblaze) / containerName (Azure)
        String bucket,

        // Azure fields
        String connectionString,
        String containerName,

        // GCP fields
        String projectId,
        String credentialsJson
) {
    public ConnectRequest {
        // Default provider to AWS for backward compatibility
        if (provider == null || provider.isBlank()) {
            provider = "aws";
        }
        // Default region for AWS/Backblaze
        if (region == null || region.isBlank()) {
            region = "us-east-1";
        }
    }
}
