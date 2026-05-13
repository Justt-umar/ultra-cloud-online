import { X, Pause, Play, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadProgress({ uploads, onClose, onCancel, onPause, onResume, isPaused }) {
  if (!uploads || uploads.length === 0) return null;

  const allComplete = uploads.every((u) => u.progress >= 100);
  const hasErrors = uploads.some((u) => u.error);

  return (
    <div className="upload-progress-panel">
      <div className="upload-progress-header">
        <h4>
          {allComplete
            ? `✅ ${uploads.length} upload${uploads.length !== 1 ? 's' : ''} complete`
            : `Uploading ${uploads.filter(u => u.progress < 100).length} of ${uploads.length} file${uploads.length !== 1 ? 's' : ''}...`}
        </h4>
        <div className="upload-progress-actions">
          {!allComplete && onPause && (
            <button
              className="modal-close"
              onClick={isPaused ? onResume : onPause}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          )}
          {!allComplete && onCancel && (
            <button className="modal-close" onClick={onCancel} title="Cancel">
              <X size={16} />
            </button>
          )}
          {allComplete && (
            <button className="modal-close" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="upload-progress-list">
        {uploads.map((upload, index) => (
          <div key={index} className={`upload-item ${upload.error ? 'upload-error' : ''}`}>
            <div className="upload-item-name">
              {upload.progress >= 100 && !upload.error && (
                <CheckCircle size={12} style={{ color: 'var(--success)', marginRight: 4, flexShrink: 0 }} />
              )}
              {upload.error && (
                <AlertCircle size={12} style={{ color: 'var(--error)', marginRight: 4, flexShrink: 0 }} />
              )}
              {upload.name}
            </div>
            <div className="upload-item-bar">
              <div
                className={`upload-item-bar-fill ${upload.progress >= 100 ? 'complete' : ''} ${upload.error ? 'error' : ''}`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            <div className="upload-item-info">
              <span>
                {upload.error
                  ? 'Failed'
                  : upload.progress >= 100
                    ? 'Complete'
                    : `${upload.progress}%`}
              </span>
              <span>{formatSize(upload.size)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}
