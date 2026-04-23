import { useState } from 'react';
import { X, Share2, Copy, Check, Clock } from 'lucide-react';

const durations = [
  { label: '1 Hour', minutes: 60 },
  { label: '6 Hours', minutes: 360 },
  { label: '1 Day', minutes: 1440 },
  { label: '3 Days', minutes: 4320 },
  { label: '1 Week', minutes: 10080 },
];

export default function ShareModal({ file, onClose, onShare }) {
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const url = await onShare(file.key, selectedDuration);
      setShareUrl(url);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Share2 size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Share File</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Generate a temporary pre-signed URL for:
          </p>
          <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {file?.name}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Link expiration:</span>
          </div>

          <div className="share-duration-controls">
            {durations.map((d) => (
              <button
                key={d.minutes}
                className={`duration-btn ${selectedDuration === d.minutes ? 'active' : ''}`}
                onClick={() => setSelectedDuration(d.minutes)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {!shareUrl && (
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? 'Generating...' : 'Generate Share Link'}
            </button>
          )}

          {shareUrl && (
            <div className="share-url-container">
              <div style={{ marginBottom: '10px', wordBreak: 'break-all' }}>{shareUrl}</div>
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy URL</>}
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
