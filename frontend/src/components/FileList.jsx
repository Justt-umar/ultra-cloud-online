import { useState } from 'react';
import {
  Folder,
  FileText,
  Image,
  Film,
  Music,
  FileCode,
  File,
  Download,
  Trash2,
  Share2,
  Eye,
  Pencil,
  FolderOpen,
} from 'lucide-react';

function getFileIcon(item) {
  if (item.isFolder) return <Folder className="file-icon folder" size={20} />;

  const ct = item.contentType || '';
  const name = item.name?.toLowerCase() || '';

  if (ct.startsWith('image/')) return <Image className="file-icon image" size={20} />;
  if (ct.startsWith('video/')) return <Film className="file-icon file" size={20} />;
  if (ct.startsWith('audio/')) return <Music className="file-icon file" size={20} />;
  if (ct.includes('pdf')) return <FileText className="file-icon pdf" size={20} />;
  if (ct.includes('json') || ct.includes('javascript') || ct.includes('css') || ct.includes('html') ||
      name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.ts') || name.endsWith('.py') ||
      name.endsWith('.java') || name.endsWith('.go') || name.endsWith('.rs'))
    return <FileCode className="file-icon code" size={20} />;
  if (ct.startsWith('text/')) return <FileText className="file-icon file" size={20} />;

  return <File className="file-icon file" size={20} />;
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FileList({
  files,
  selectedKeys,
  onToggleSelect,
  onToggleAll,
  onNavigateFolder,
  onDownload,
  onDelete,
  onShare,
  onPreview,
  onRename,
  loading,
}) {
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const allSelected = files.length > 0 && selectedKeys.size === files.length;

  const handleStartRename = (item) => {
    setRenamingKey(item.key);
    setRenameValue(item.name);
  };

  const handleFinishRename = (item) => {
    if (renameValue.trim() && renameValue !== item.name) {
      const prefix = item.key.substring(0, item.key.lastIndexOf(item.name));
      const newKey = prefix + renameValue + (item.isFolder ? '/' : '');
      onRename(item.key, newKey);
    }
    setRenamingKey(null);
  };

  const handleRenameKeyDown = (e, item) => {
    if (e.key === 'Enter') handleFinishRename(item);
    if (e.key === 'Escape') setRenamingKey(null);
  };

  if (loading) {
    return (
      <div className="file-list-container">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading files...</span>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-list-container">
        <div className="empty-state">
          <FolderOpen size={48} />
          <h3>This folder is empty</h3>
          <p>Upload files or create a folder to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <div className="file-list-header">
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onToggleAll()}
            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          />
        </div>
        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>
      <div className="file-list">
        {files.map((item) => (
          <div
            key={item.key}
            className={`file-item ${selectedKeys.has(item.key) ? 'selected' : ''}`}
            onDoubleClick={() => item.isFolder && onNavigateFolder(item.key)}
          >
            <div className="file-item-checkbox">
              <input
                type="checkbox"
                checked={selectedKeys.has(item.key)}
                onChange={() => onToggleSelect(item.key)}
              />
            </div>
            <div className="file-item-name" onClick={() => item.isFolder && onNavigateFolder(item.key)}>
              {getFileIcon(item)}
              {renamingKey === item.key ? (
                <input
                  className="rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleFinishRename(item)}
                  onKeyDown={(e) => handleRenameKeyDown(e, item)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`file-name-text ${item.isFolder ? 'folder-name' : ''}`}>
                  {item.name}
                </span>
              )}
            </div>
            <div className="file-size">{item.isFolder ? '—' : formatSize(item.size)}</div>
            <div className="file-date">{item.lastModified || '—'}</div>
            <div className="file-actions">
              {!item.isFolder && (
                <button
                  className="file-action-btn"
                  onClick={(e) => { e.stopPropagation(); onPreview(item); }}
                  title="Preview"
                >
                  <Eye size={15} />
                </button>
              )}
              {!item.isFolder && (
                <button
                  className="file-action-btn"
                  onClick={(e) => { e.stopPropagation(); onDownload(item.key); }}
                  title="Download"
                >
                  <Download size={15} />
                </button>
              )}
              <button
                className="file-action-btn"
                onClick={(e) => { e.stopPropagation(); handleStartRename(item); }}
                title="Rename"
              >
                <Pencil size={15} />
              </button>
              {!item.isFolder && (
                <button
                  className="file-action-btn"
                  onClick={(e) => { e.stopPropagation(); onShare(item); }}
                  title="Share"
                >
                  <Share2 size={15} />
                </button>
              )}
              <button
                className="file-action-btn delete"
                onClick={(e) => { e.stopPropagation(); onDelete([item.key]); }}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
