import { useState, useEffect } from 'react';
import { X, History, RotateCcw, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function VersionHistoryModal({ file, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await api.listVersions(file.key);
        setVersions(res.data.data || []);
      } catch {
        setVersions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchVersions();
  }, [file.key]);

  const handleRestore = async (versionId) => {
    setRestoring(versionId);
    try {
      await api.restoreVersion(file.key, versionId);
      addToast('Version restored successfully', 'success');
      if (onRestored) onRestored();
      onClose();
    } catch (err) {
      addToast('Restore failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="version-modal" onClick={e => e.stopPropagation()}>
        <div className="version-header">
          <h3><History size={18} style={{ marginRight: 8 }} />Version History</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="version-file-info">
          <strong>{file.name}</strong>
          <span className="version-file-key">{file.key}</span>
        </div>

        <div className="version-list">
          {loading ? (
            <div className="audit-empty">
              <div className="spinner" style={{ width: 20, height: 20 }} />
              <span>Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="audit-empty">
              <History size={32} />
              <span>No version history available</span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Versioning must be enabled on the bucket to see file history.
                This feature works with AWS S3 and GCP Cloud Storage.
              </p>
            </div>
          ) : (
            versions.map((v, i) => (
              <div key={v.versionId || i} className={`version-item ${v.isLatest ? 'latest' : ''}`}>
                <div className="version-info">
                  <div className="version-id">
                    {v.isLatest && <CheckCircle size={13} style={{ color: 'var(--success)', marginRight: 4 }} />}
                    <code>{v.versionId?.substring(0, 16) || 'N/A'}...</code>
                    {v.isLatest && <span className="version-latest-badge">Latest</span>}
                  </div>
                  <div className="version-meta">
                    <Clock size={11} /> {v.lastModified} · {formatSize(v.size)}
                  </div>
                </div>
                {!v.isLatest && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleRestore(v.versionId)}
                    disabled={restoring === v.versionId}
                  >
                    <RotateCcw size={13} />
                    {restoring === v.versionId ? 'Restoring...' : 'Restore'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
