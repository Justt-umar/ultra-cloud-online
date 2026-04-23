import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Connection
export const connect = (credentials) => api.post('/connect', credentials);
export const disconnect = () => api.post('/disconnect');
export const getStatus = () => api.get('/status');

// Files
export const listFiles = (prefix = '') => api.get('/files', { params: { prefix } });
export const uploadFiles = (prefix, files, onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/files/upload', formData, {
    params: { prefix },
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};
export const downloadFile = (key) =>
  api.get('/files/download', { params: { key }, responseType: 'blob' });
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

export default api;
