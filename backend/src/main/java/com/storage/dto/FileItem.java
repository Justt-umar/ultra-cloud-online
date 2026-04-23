package com.storage.dto;

public record FileItem(
        String name,
        String key,
        long size,
        String lastModified,
        boolean isFolder,
        String contentType
) {}
