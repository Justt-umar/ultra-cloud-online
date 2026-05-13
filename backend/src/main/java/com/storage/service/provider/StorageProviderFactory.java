package com.storage.service.provider;

/**
 * Factory for creating StorageProvider instances based on provider type string.
 */
public class StorageProviderFactory {

    private StorageProviderFactory() {
        // Utility class
    }

    /**
     * Create a new StorageProvider instance for the given provider type.
     *
     * @param providerType "aws", "azure", "gcp", or "backblaze"
     * @return a new, unconnected StorageProvider instance
     * @throws IllegalArgumentException if the provider type is unknown
     */
    public static StorageProvider create(String providerType) {
        if (providerType == null) {
            providerType = "aws";
        }

        return switch (providerType.toLowerCase().trim()) {
            case "aws" -> new AwsStorageProvider();
            case "azure" -> new AzureStorageProvider();
            case "gcp" -> new GcpStorageProvider();
            case "backblaze" -> new BackblazeStorageProvider();
            default -> throw new IllegalArgumentException(
                    "Unknown storage provider: " + providerType
                            + ". Supported providers: aws, azure, gcp, backblaze"
            );
        };
    }
}
