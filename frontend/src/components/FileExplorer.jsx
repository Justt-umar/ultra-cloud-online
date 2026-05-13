import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';
import { encryptFile, decryptBlob, isEncryptedFile, getOriginalFilename } from '../services/crypto';
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
import VersionHistoryModal from './VersionHistoryModal';

// Upload files one-at-a-time for per-file progress and cancel support
async function uploadFilesSequentially(files, prefix, encryption, callbacks) {
  const { onFileStart, onFileProgress, onFileComplete, onFileError, shouldCancel, shouldPause } = callbacks;

  for (let i = 0; i < files.length; i++) {
    // Check cancellation
    if (shouldCancel()) return false;

    // Wait if paused
    while (shouldPause()) {
      await new Promise(r => setTimeout(r, 200));
      if (shouldCancel()) return false;
    }

    let file = files[i];
    onFileStart(i);

    // Encrypt if enabled
    if (encryption?.enabled && encryption?.passphrase) {
      try {
        file = await encryptFile(file, encryption.passphrase);
      } catch {
        onFileError(i, 'Encryption failed');
        continue;
      }
    }

    try {
      await api.uploadFiles(prefix, [file], (progressEvent) => {
        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onFileProgress(i, pct);
      });
      onFileComplete(i);
    } catch (err) {
      onFileError(i, err.response?.data?.message || err.message);
    }
  }
  return true;
}

export default function FileExplorer({ encryption }) {
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
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [versionFile, setVersionFile] = useState(null);

  // Refs for upload control
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

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
    setFocusedIndex(null);
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

  // ─── Keyboard Shortcuts ───────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+U → Upload
      if (ctrl && e.key === 'u') {
        e.preventDefault();
        setShowDropzone(prev => !prev);
        return;
      }

      // Ctrl+N → New folder
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        setShowCreateFolder(true);
        return;
      }

      // Delete or Backspace → Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKeys.size > 0) {
        e.preventDefault();
        setKeysToDelete([...selectedKeys]);
        return;
      }

      // Ctrl+A → Select all
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedKeys(new Set(filteredFiles.map(f => f.key)));
        return;
      }

      // Escape → Clear selection or close dropzone
      if (e.key === 'Escape') {
        if (showDropzone) { setShowDropzone(false); return; }
        if (selectedKeys.size > 0) { setSelectedKeys(new Set()); setFocusedIndex(null); return; }
      }

      // Arrow keys → Navigate file list
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev == null ? 0 : Math.min(prev + 1, filteredFiles.length - 1);
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev == null ? 0 : Math.max(prev - 1, 0);
          return next;
        });
        return;
      }

      // Space → Toggle selection of focused item
      if (e.key === ' ' && focusedIndex != null && filteredFiles[focusedIndex]) {
        e.preventDefault();
        const key = filteredFiles[focusedIndex].key;
        setSelectedKeys(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
        return;
      }

      // Enter → Open focused folder or preview file
      if (e.key === 'Enter' && focusedIndex != null && filteredFiles[focusedIndex]) {
        e.preventDefault();
        const item = filteredFiles[focusedIndex];
        if (item.isFolder) {
          setCurrentPath(item.key);
        } else {
          handlePreview(item);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredFiles, selectedKeys, focusedIndex, showDropzone]);

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

  // Upload (sequential, per-file progress, with cancel/pause)
  const handleUploadFiles = useCallback(async (fileList) => {
    cancelRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);

    const uploadItems = fileList.map((f) => ({
      name: f.name, size: f.size, progress: 0, error: null,
    }));
    setUploads(uploadItems);
    setShowDropzone(false);

    const completed = await uploadFilesSequentially(fileList, currentPath, encryption, {
      onFileStart: (i) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 5 } : u));
      },
      onFileProgress: (i, pct) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u));
      },
      onFileComplete: (i) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: 100 } : u));
      },
      onFileError: (i, msg) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, error: msg, progress: 100 } : u));
      },
      shouldCancel: () => cancelRef.current,
      shouldPause: () => pauseRef.current,
    });

    if (completed) {
      const successCount = uploadItems.length;
      addToast(
        `${successCount} file(s) uploaded${encryption?.enabled ? ' (encrypted)' : ''}`,
        'success'
      );
    } else {
      addToast('Upload cancelled', 'warning');
    }

    fetchFiles();
  }, [currentPath, fetchFiles, addToast, encryption]);

  const handleCancelUpload = useCallback(() => {
    cancelRef.current = true;
    setUploads([]);
  }, []);

  const handlePauseUpload = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  const handleResumeUpload = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  // Download (with optional decryption)
  const handleDownload = useCallback(async (key) => {
    try {
      const res = await api.downloadFile(key);
      let blob = new Blob([res.data]);
      let fileName = key.split('/').pop();

      if (isEncryptedFile(fileName) && encryption?.passphrase) {
        try {
          addToast('Decrypting file...', 'info');
          blob = await decryptBlob(blob, encryption.passphrase);
          fileName = getOriginalFilename(fileName);
        } catch {
          addToast('Decryption failed — downloading encrypted file', 'warning');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Download started', 'success');
    } catch (err) {
      addToast('Download failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [addToast, encryption]);

  // Zip download
  const handleZipDownload = useCallback(async (keys) => {
    try {
      addToast('Preparing ZIP archive...', 'info');
      const res = await api.downloadZip(keys);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ultra-cloud-download.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('ZIP download started', 'success');
    } catch (err) {
      addToast('ZIP download failed: ' + (err.response?.data?.message || err.message), 'error');
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

  // Preview (with optional decryption)
  const handlePreview = useCallback(async (file) => {
    try {
      const res = await api.previewFile(file.key);
      let blob = new Blob([res.data], { type: file.contentType });
      let contentType = file.contentType;

      if (isEncryptedFile(file.name) && encryption?.passphrase) {
        try {
          blob = await decryptBlob(blob, encryption.passphrase, contentType);
        } catch {
          addToast('Cannot preview — decryption failed', 'warning');
          return;
        }
      }

      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      addToast('Preview failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [addToast, encryption]);

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

  const handleBulkZip = useCallback(() => {
    const fileKeys = [...selectedKeys].filter((key) => {
      const item = files.find((f) => f.key === key);
      return item && !item.isFolder;
    });
    if (fileKeys.length > 0) {
      handleZipDownload(fileKeys);
    } else {
      addToast('Select files to download as ZIP', 'warning');
    }
  }, [selectedKeys, files, handleZipDownload, addToast]);

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

      {encryption?.enabled && (
        <div className="encryption-banner">
          <span>🔒 Encryption active — files will be encrypted before upload</span>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="shortcuts-hint">
        <kbd>↑↓</kbd> Navigate &nbsp; <kbd>Space</kbd> Select &nbsp; <kbd>⌘U</kbd> Upload &nbsp; <kbd>⌘N</kbd> New Folder &nbsp; <kbd>Del</kbd> Delete
      </div>

      {showDropzone && <DropZone onFilesSelected={handleUploadFiles} />}

      {selectedKeys.size > 0 && (
        <BulkOperationsBar
          count={selectedKeys.size}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={handleBulkDelete}
          onBulkShare={handleBulkShare}
          onBulkZip={handleBulkZip}
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
        onVersionHistory={(file) => setVersionFile(file)}
        loading={loading}
        focusedIndex={focusedIndex}
      />

      <UploadProgress
        uploads={uploads}
        onClose={() => setUploads([])}
        onCancel={handleCancelUpload}
        onPause={handlePauseUpload}
        onResume={handleResumeUpload}
        isPaused={isPaused}
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

      {versionFile && (
        <VersionHistoryModal
          file={versionFile}
          onClose={() => setVersionFile(null)}
          onRestored={fetchFiles}
        />
      )}
    </div>
  );
}
