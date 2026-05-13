package com.storage.service;

import com.storage.dto.AuditLog;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory audit trail service.
 * Logs all storage operations with timestamps, provider info, and status.
 * Supports exporting logs as CSV.
 */
@Service
public class AuditService {

    private static final int MAX_LOGS = 1000;
    private final CopyOnWriteArrayList<AuditLog> logs = new CopyOnWriteArrayList<>();

    /**
     * Record a new audit event.
     */
    public void log(String action, String details, String provider, String bucket, String status) {
        AuditLog entry = AuditLog.of(action, details, provider, bucket, status);
        logs.add(entry);

        // Evict oldest entries if over limit
        while (logs.size() > MAX_LOGS) {
            logs.remove(0);
        }
    }

    /** Convenience: log a successful operation */
    public void logSuccess(String action, String details, String provider, String bucket) {
        log(action, details, provider, bucket, "SUCCESS");
    }

    /** Convenience: log a failed operation */
    public void logFailure(String action, String details, String provider, String bucket) {
        log(action, details, provider, bucket, "FAILURE");
    }

    /**
     * Get all audit logs, most recent first.
     */
    public List<AuditLog> getLogs() {
        List<AuditLog> reversed = new ArrayList<>(logs);
        Collections.reverse(reversed);
        return reversed;
    }

    /**
     * Get the last N audit logs, most recent first.
     */
    public List<AuditLog> getLogs(int limit) {
        List<AuditLog> all = getLogs();
        return all.subList(0, Math.min(limit, all.size()));
    }

    /**
     * Clear all audit logs.
     */
    public void clearLogs() {
        logs.clear();
    }

    /**
     * Export all logs as CSV string.
     */
    public String exportCsv() {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.systemDefault());

        StringBuilder csv = new StringBuilder();
        csv.append("ID,Timestamp,Action,Details,Provider,Bucket,Status\n");

        for (AuditLog entry : logs) {
            csv.append(escapeCsv(entry.id())).append(",");
            csv.append(fmt.format(entry.timestamp())).append(",");
            csv.append(escapeCsv(entry.action())).append(",");
            csv.append(escapeCsv(entry.details())).append(",");
            csv.append(escapeCsv(entry.provider())).append(",");
            csv.append(escapeCsv(entry.bucket())).append(",");
            csv.append(entry.status()).append("\n");
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
