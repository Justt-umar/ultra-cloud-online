package com.storage.service;

import com.storage.service.provider.StorageProvider;
import com.storage.service.provider.StorageProviderFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Multi-session storage manager.
 * Supports multiple simultaneous cloud storage connections,
 * each identified by a unique session ID.
 */
@Component
public class StorageSessionManager {

    /** All active sessions: sessionId → provider */
    private final Map<String, StorageProvider> sessions = new ConcurrentHashMap<>();

    /** The "default" session ID for backward compatibility */
    private String activeSessionId = null;

    /**
     * Connect a new session. Returns a generated session ID.
     */
    public synchronized String connect(String providerType, Map<String, String> credentials) {
        String sessionId = UUID.randomUUID().toString().substring(0, 8);

        StorageProvider provider = StorageProviderFactory.create(providerType);
        provider.connect(credentials);
        sessions.put(sessionId, provider);

        // Set as active if it's the first session
        if (activeSessionId == null) {
            activeSessionId = sessionId;
        }

        return sessionId;
    }

    /**
     * Connect with a specific provider type string (backward-compatible).
     * Sets the new session as the active one.
     */
    public synchronized void connect(String providerType, Map<String, String> credentials, boolean setActive) {
        String id = connect(providerType, credentials);
        if (setActive) {
            activeSessionId = id;
        }
    }

    /** Disconnect a specific session. */
    public synchronized void disconnect(String sessionId) {
        StorageProvider provider = sessions.remove(sessionId);
        if (provider != null) {
            provider.disconnect();
        }
        if (sessionId.equals(activeSessionId)) {
            activeSessionId = sessions.isEmpty() ? null : sessions.keySet().iterator().next();
        }
    }

    /** Disconnect the active session (backward-compatible). */
    public synchronized void disconnect() {
        if (activeSessionId != null) {
            disconnect(activeSessionId);
        }
    }

    /** Set the active session. */
    public void setActiveSession(String sessionId) {
        if (!sessions.containsKey(sessionId)) {
            throw new IllegalArgumentException("Session not found: " + sessionId);
        }
        this.activeSessionId = sessionId;
    }

    /** Get a provider by session ID. */
    public StorageProvider getProvider(String sessionId) {
        StorageProvider provider = sessions.get(sessionId);
        if (provider == null || !provider.isConnected()) {
            throw new IllegalStateException("Session not connected: " + sessionId);
        }
        return provider;
    }

    /** Get the active provider (backward-compatible). */
    public StorageProvider getProvider() {
        if (activeSessionId == null) {
            throw new IllegalStateException("Not connected to any cloud storage.");
        }
        return getProvider(activeSessionId);
    }

    /** @return true if ANY session is connected. */
    public boolean isConnected() {
        return activeSessionId != null && sessions.containsKey(activeSessionId);
    }

    public boolean isConnected(String sessionId) {
        StorageProvider p = sessions.get(sessionId);
        return p != null && p.isConnected();
    }

    public String getContainerName() {
        return isConnected() ? getProvider().getContainerName() : "";
    }

    public String getContainerName(String sessionId) {
        return isConnected(sessionId) ? getProvider(sessionId).getContainerName() : "";
    }

    public String getProviderName() {
        return isConnected() ? getProvider().getProviderName() : "";
    }

    public String getProviderName(String sessionId) {
        return isConnected(sessionId) ? getProvider(sessionId).getProviderName() : "";
    }

    public String getProviderDisplayName() {
        return isConnected() ? getProvider().getProviderDisplayName() : "";
    }

    public String getProviderDisplayName(String sessionId) {
        return isConnected(sessionId) ? getProvider(sessionId).getProviderDisplayName() : "";
    }

    public String getActiveSessionId() {
        return activeSessionId;
    }

    /**
     * Get info about all active sessions.
     */
    public List<Map<String, Object>> listSessions() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map.Entry<String, StorageProvider> entry : sessions.entrySet()) {
            String id = entry.getKey();
            StorageProvider p = entry.getValue();
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("sessionId", id);
            info.put("provider", p.getProviderName());
            info.put("providerDisplayName", p.getProviderDisplayName());
            info.put("bucket", p.getContainerName());
            info.put("connected", p.isConnected());
            info.put("active", id.equals(activeSessionId));
            list.add(info);
        }
        return list;
    }

    public int getSessionCount() {
        return sessions.size();
    }
}
