import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';
import Breadcrumb from './Breadcrumb';
import SearchFilterBar from './SearchFilterBar';
import DropZone from './DropZone';
import FileList from './FileList';
import BulkOperationsBar from './BulkOperationsBar';
import UploadProgress from './UploadProgress';
import CreateFolderModal from './CreateFolderModal';
import PreviewModal from './PreviewModal';
import ShareModal from './ShareModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function FileExplorer() {
  const { addToast } = useToast();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDropzone, setShowDropzone] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [shareFile, setShareFile] = useState(null);
  const [keysToDelete, setKeysToDelete] = useState(null);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listFiles(currentPath);
      setFiles(res.data.data || []);
    } catch (err) {
      addToast('Failed to load files: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPath, addToast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Clear selection on path change
  useEffect(() => {
    setSelectedKeys(new Set());
    setSearchQuery('');
    setTypeFilter('all');
  }, [currentPath]);

  // Filter files client-side for search
  const filteredFiles = useMemo(() => {
    return files.filter((item) => {
      const matchesQuery = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'folder' && item.isFolder) ||
        (typeFilter === 'image' && item.contentType?.startsWith('image/')) ||
        (typeFilter === 'video' && item.contentType?.startsWith('video/')) ||
        (typeFilter === 'audio' && item.contentType?.startsWith('audio/')) ||
        (typeFilter === 'document' && (item.contentType?.includes('pdf') || item.contentType?.includes('text') || item.contentType?.includes('document')));
      return matchesQuery && matchesType;
    });
  }, [files, searchQuery, typeFilter]);

  // Selection handlers
  const handleToggleSelect = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (selectedKeys.size === filteredFiles.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredFiles.map((f) => f.key)));
    }
  }, [selectedKeys, filteredFiles]);

  // Navigation
  const handleNavigateFolder = useCallback((key) => {
    setCurrentPath(key);
  }, []);

  // Upload
  const handleUploadFiles = useCallback(async (fileList) => {
    const uploadItems = fileList.map((f) => ({ name: f.name, size: f.size, progress: 0 }));
    setUploads(uploadItems);
    setShowDropzone(false);

    try {
      await api.uploadFiles(currentPath, fileList, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploads((prev) => prev.map((u) => ({ ...u, progress: pct })));
      });
      setUploads((prev) => prev.map((u) => ({ ...u, progress: 100 })));
      addToast(`${fileList.length} file(s) uploaded successfully`, 'success');
      fetchFiles();
    } catch (err) {
      addToast('Upload failed: ' + (err.response?.data?.message || err.message), 'error');
      setUploads([]);
    }
  }, [currentPath, fetchFiles, addToast]);

  // Download
  const handleDownload = useCallback(async (key) => {
    try {
      const res = await api.downloadFile(key);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = key.split('/').pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Download started', 'success');
    } catch (err) {
      addToast('Download failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [addToast]);

  // Delete
  const handleDelete = useCallback((keys) => {
    setKeysToDelete(keys);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!keysToDelete) return;
    try {
      await api.deleteFiles(keysToDelete);
      addToast(`${keysToDelete.length} item(s) deleted`, 'success');
      setSelectedKeys(new Set());
      fetchFiles();
    } catch (err) {
      addToast('Delete failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setKeysToDelete(null);
    }
  }, [keysToDelete, fetchFiles, addToast]);

  // Create folder
  const handleCreateFolder = useCallback(async (path) => {
    try {
      await api.createFolder(path);
      addToast('Folder created successfully', 'success');
      fetchFiles();
    } catch (err) {
      addToast('Failed to create folder: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [fetchFiles, addToast]);

  // Rename
  const handleRename = useCallback(async (oldKey, newKey) => {
    try {
      await api.renameFile(oldKey, newKey);
      addToast('Renamed successfully', 'success');
      fetchFiles();
    } catch (err) {
      addToast('Rename failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [fetchFiles, addToast]);

  // Preview
  const handlePreview = useCallback(async (file) => {
    try {
      const res = await api.previewFile(file.key);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: file.contentType }));
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      addToast('Preview failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [addToast]);

  const closePreview = useCallback(() => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl('');
  }, [previewUrl]);

  // Share
  const handleShare = useCallback(async (key, durationMinutes) => {
    try {
      const res = await api.shareFile(key, durationMinutes);
      const url = res.data.data.url;
      addToast('Share link generated', 'success');
      return url;
    } catch (err) {
      addToast('Share failed: ' + (err.response?.data?.message || err.message), 'error');
      return '';
    }
  }, [addToast]);

  // Bulk operations
  const handleBulkDownload = useCallback(() => {
    selectedKeys.forEach((key) => {
      const item = files.find((f) => f.key === key);
      if (item && !item.isFolder) handleDownload(key);
    });
  }, [selectedKeys, files, handleDownload]);

  const handleBulkDelete = useCallback(() => {
    handleDelete([...selectedKeys]);
  }, [selectedKeys, handleDelete]);

  const handleBulkShare = useCallback(() => {
    const fileKeys = [...selectedKeys].filter((key) => {
      const item = files.find((f) => f.key === key);
      return item && !item.isFolder;
    });
    if (fileKeys.length === 1) {
      const item = files.find((f) => f.key === fileKeys[0]);
      setShareFile(item);
    } else {
      addToast('Select exactly one file to share', 'warning');
    }
  }, [selectedKeys, files, addToast]);

  return (
    <div className="file-explorer">
      <Breadcrumb
        path={currentPath}
        onNavigate={setCurrentPath}
        onCreateFolder={() => setShowCreateFolder(true)}
        onUploadClick={() => setShowDropzone((prev) => !prev)}
      />

      <SearchFilterBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {showDropzone && <DropZone onFilesSelected={handleUploadFiles} />}

      {selectedKeys.size > 0 && (
        <BulkOperationsBar
          count={selectedKeys.size}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={handleBulkDelete}
          onBulkShare={handleBulkShare}
          onClear={() => setSelectedKeys(new Set())}
        />
      )}

      <FileList
        files={filteredFiles}
        selectedKeys={selectedKeys}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
        onNavigateFolder={handleNavigateFolder}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onShare={(file) => setShareFile(file)}
        onPreview={handlePreview}
        onRename={handleRename}
        loading={loading}
      />

      <UploadProgress
        uploads={uploads}
        onClose={() => setUploads([])}
      />

      {showCreateFolder && (
        <CreateFolderModal
          currentPath={currentPath}
          onClose={() => setShowCreateFolder(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          previewUrl={previewUrl}
          onClose={closePreview}
          onDownload={handleDownload}
        />
      )}

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShare={handleShare}
        />
      )}

      {keysToDelete && (
        <DeleteConfirmModal
          count={keysToDelete.length}
          onClose={() => setKeysToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
