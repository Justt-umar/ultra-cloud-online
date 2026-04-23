package com.storage.dto;

import jakarta.validation.constraints.NotBlank;

public record ConnectRequest(
        @NotBlank(message = "Access Key ID is required")
        String accessKeyId,

        @NotBlank(message = "Secret Access Key is required")
        String secretAccessKey,

        String region,

        @NotBlank(message = "Bucket name is required")
        String bucket
) {
    public ConnectRequest {
        if (region == null || region.isBlank()) {
            region = "us-east-1";
        }
    }
}
