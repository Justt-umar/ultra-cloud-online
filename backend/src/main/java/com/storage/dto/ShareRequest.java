package com.storage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ShareRequest(
        @NotBlank(message = "File key is required")
        String key,

        @Positive(message = "Duration must be positive")
        long durationMinutes
) {
    public ShareRequest {
        if (durationMinutes <= 0) {
            durationMinutes = 60; // default 1 hour
        }
    }
}
