import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function PreviewModal({ file, previewUrl, onClose, onDownload }) {
  const [textContent, setTextContent] = useState('');
  const contentType = file?.contentType || '';

  useEffect(() => {
    if (previewUrl && (contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml') || contentType.includes('javascript') || contentType.includes('css'))) {
      fetch(previewUrl)
        .then((res) => res.text())
        .then(setTextContent)
        .catch(() => setTextContent('Unable to load preview'));
    }
  }, [previewUrl, contentType]);

  const isImage = contentType.startsWith('image/');
  const isPdf = contentType.includes('pdf');
  const isText = contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml') || contentType.includes('javascript') || contentType.includes('css');

  return (
    <div className="preview-overlay">
      <div className="preview-header">
        <h3>{file?.name || 'Preview'}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onDownload(file.key)}>
            <Download size={14} />
            Download
          </button>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="preview-content">
        {isImage && (
          <img src={previewUrl} alt={file.name} />
        )}
        {isPdf && (
          <iframe src={previewUrl} title={file.name} />
        )}
        {isText && (
          <pre>{textContent || 'Loading...'}</pre>
        )}
        {!isImage && !isPdf && !isText && (
          <div className="empty-state">
            <h3>Preview not available</h3>
            <p>This file type cannot be previewed in the browser.</p>
            <button className="btn btn-primary" onClick={() => onDownload(file.key)} style={{ marginTop: '16px' }}>
              <Download size={16} />
              Download Instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
