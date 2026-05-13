package com.storage.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Webhook notification service.
 * Sends HTTP POST notifications to configured URLs when file operations occur.
 * Supports Slack, Discord, and generic webhook endpoints.
 */
@Service
public class WebhookService {

    /** Registered webhooks: id → config */
    private final Map<String, WebhookConfig> webhooks = new ConcurrentHashMap<>();

    /** Background executor for async webhook delivery */
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    /** HTTP client for sending webhook requests */
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Register a new webhook.
     */
    public String addWebhook(String url, String name, String type) {
        String id = java.util.UUID.randomUUID().toString().substring(0, 8);
        webhooks.put(id, new WebhookConfig(id, url, name, type != null ? type : "generic", true));
        return id;
    }

    /** Remove a webhook by ID. */
    public void removeWebhook(String id) {
        webhooks.remove(id);
    }

    /** Toggle webhook enabled/disabled. */
    public void toggleWebhook(String id, boolean enabled) {
        WebhookConfig config = webhooks.get(id);
        if (config != null) {
            webhooks.put(id, new WebhookConfig(config.id, config.url, config.name, config.type, enabled));
        }
    }

    /** Get all registered webhooks. */
    public List<WebhookConfig> getWebhooks() {
        return new ArrayList<>(webhooks.values());
    }

    /**
     * Fire a webhook notification for a storage event.
     * Runs asynchronously so it doesn't block the main request.
     */
    public void notify(String action, String details, String provider, String bucket) {
        for (WebhookConfig config : webhooks.values()) {
            if (!config.enabled) continue;

            executor.submit(() -> {
                try {
                    String payload = buildPayload(config.type, action, details, provider, bucket);

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(config.url))
                            .header("Content-Type", "application/json")
                            .timeout(Duration.ofSeconds(10))
                            .POST(HttpRequest.BodyPublishers.ofString(payload))
                            .build();

                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                } catch (Exception e) {
                    // Silently ignore webhook failures — don't break the main flow
                    System.err.println("Webhook delivery failed for " + config.name + ": " + e.getMessage());
                }
            });
        }
    }

    /**
     * Build the JSON payload based on webhook type (Slack, Discord, or generic).
     */
    private String buildPayload(String type, String action, String details, String provider, String bucket) {
        String timestamp = Instant.now().toString();

        return switch (type.toLowerCase()) {
            case "slack" -> String.format("""
                    {
                      "text": "☁️ *Ultra Cloud* — %s",
                      "blocks": [
                        {
                          "type": "section",
                          "text": {
                            "type": "mrkdwn",
                            "text": "☁️ *Ultra Cloud Notification*\\n*Action:* %s\\n*Details:* %s\\n*Provider:* %s\\n*Bucket:* %s\\n*Time:* %s"
                          }
                        }
                      ]
                    }
                    """, action, action, escapeJson(details), provider, bucket, timestamp);

            case "discord" -> String.format("""
                    {
                      "embeds": [{
                        "title": "☁️ Ultra Cloud — %s",
                        "color": 16744192,
                        "fields": [
                          { "name": "Action", "value": "%s", "inline": true },
                          { "name": "Provider", "value": "%s", "inline": true },
                          { "name": "Bucket", "value": "%s", "inline": true },
                          { "name": "Details", "value": "%s" }
                        ],
                        "timestamp": "%s"
                      }]
                    }
                    """, action, action, provider, bucket, escapeJson(details), timestamp);

            default -> String.format("""
                    {
                      "event": "%s",
                      "details": "%s",
                      "provider": "%s",
                      "bucket": "%s",
                      "timestamp": "%s",
                      "source": "ultra-cloud-online"
                    }
                    """, action, escapeJson(details), provider, bucket, timestamp);
        };
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }

    /** Webhook configuration record. */
    public record WebhookConfig(String id, String url, String name, String type, boolean enabled) {}
}
