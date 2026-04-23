import { X } from 'lucide-react';

export default function UploadProgress({ uploads, onClose }) {
  if (!uploads || uploads.length === 0) return null;

  const allComplete = uploads.every((u) => u.progress >= 100);

  return (
    <div className="upload-progress-panel">
      <div className="upload-progress-header">
        <h4>
          {allComplete
            ? `${uploads.length} upload${uploads.length !== 1 ? 's' : ''} complete`
            : `Uploading ${uploads.length} file${uploads.length !== 1 ? 's' : ''}...`}
        </h4>
        {allComplete && (
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="upload-progress-list">
        {uploads.map((upload, index) => (
          <div key={index} className="upload-item">
            <div className="upload-item-name">{upload.name}</div>
            <div className="upload-item-bar">
              <div
                className={`upload-item-bar-fill ${upload.progress >= 100 ? 'complete' : ''}`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            <div className="upload-item-info">
              <span>{upload.progress >= 100 ? 'Complete' : `${upload.progress}%`}</span>
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
