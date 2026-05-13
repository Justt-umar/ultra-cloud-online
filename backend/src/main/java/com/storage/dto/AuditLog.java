package com.storage.dto;

import java.time.Instant;

/**
 * Represents a single audit log entry for tracking all storage operations.
 */
public record AuditLog(
        String id,
        Instant timestamp,
        String action,
        String details,
        String provider,
        String bucket,
        String status
) {
    public static AuditLog of(String action, String details, String provider, String bucket, String status) {
        return new AuditLog(
                java.util.UUID.randomUUID().toString().substring(0, 8),
                Instant.now(),
                action,
                details,
                provider,
                bucket,
                status
        );
    }
}
