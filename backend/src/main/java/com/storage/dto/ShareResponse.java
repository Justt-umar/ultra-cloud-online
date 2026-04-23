package com.storage.dto;

public record ShareResponse(
        String url,
        long expiresInMinutes
) {}
