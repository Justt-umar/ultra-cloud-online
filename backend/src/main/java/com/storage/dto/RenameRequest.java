package com.storage.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameRequest(
        @NotBlank(message = "Old key is required")
        String oldKey,

        @NotBlank(message = "New key is required")
        String newKey
) {}
