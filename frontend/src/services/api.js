import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Connection
export const connect = (credentials) => api.post('/connect', credentials);
export const disconnect = (sessionId) =>
  api.post('/disconnect', null, { params: sessionId ? { sessionId } : {} });
export const getStatus = () => api.get('/status');

// Sessions
export const listSessions = () => api.get('/sessions');
export const activateSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/activate`);

// Files
export const listFiles = (prefix = '', sessionId = null) =>
  api.get('/files', { params: { prefix, ...(sessionId ? { sessionId } : {}) } });
export const uploadFiles = (prefix, files, onProgress, sessionId = null) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/files/upload', formData, {
    params: { prefix, ...(sessionId ? { sessionId } : {}) },
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};
export const downloadFile = (key, sessionId = null) =>
  api.get('/files/download', { params: { key, ...(sessionId ? { sessionId } : {}) }, responseType: 'blob' });
export const deleteFiles = (keys) => api.delete('/files', { data: keys });
export const createFolder = (path) => api.post('/files/folder', { path });
export const renameFile = (oldKey, newKey) =>
  api.put('/files/rename', { oldKey, newKey });
export const previewFile = (key) =>
  api.get('/files/preview', { params: { key }, responseType: 'blob' });
export const shareFile = (key, durationMinutes) =>
  api.post('/files/share', { key, durationMinutes });
export const searchFiles = (prefix, query, type) =>
  api.get('/files/search', { params: { prefix, query, type } });
export const downloadZip = (keys) =>
  api.post('/files/download-zip', keys, { responseType: 'blob' });
export const getThumbnail = (key) =>
  api.get('/files/thumbnail', { params: { key }, responseType: 'blob' });

// Cross-provider transfer
export const transferFile = (sourceSessionId, sourceKey, destSessionId, destPrefix = '') =>
  api.post('/files/transfer', { sourceSessionId, sourceKey, destSessionId, destPrefix });

// Versioning
export const listVersions = (key) =>
  api.get('/files/versions', { params: { key } });
export const restoreVersion = (key, versionId) =>
  api.post('/files/versions/restore', { key, versionId });

// Analytics
export const getAnalytics = () => api.get('/analytics');

// Audit Logs
export const getAuditLogs = (limit = 100) =>
  api.get('/audit', { params: { limit } });
export const exportAuditLogs = () =>
  api.get('/audit/export', { responseType: 'blob' });
export const clearAuditLogs = () => api.delete('/audit');

// Webhooks
export const getWebhooks = () => api.get('/webhooks');
export const addWebhook = (url, name, type) =>
  api.post('/webhooks', { url, name, type });
export const removeWebhook = (id) => api.delete(`/webhooks/${id}`);
export const toggleWebhook = (id, enabled) =>
  api.put(`/webhooks/${id}/toggle`, { enabled });

export default api;
