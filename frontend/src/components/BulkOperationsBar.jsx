import { Download, Trash2, Share2, Archive } from 'lucide-react';

export default function BulkOperationsBar({ count, onBulkDownload, onBulkDelete, onBulkShare, onBulkZip, onClear }) {
  return (
    <div className="bulk-bar">
      <span className="bulk-bar-info">
        {count} item{count !== 1 ? 's' : ''} selected
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          style={{ marginLeft: '8px' }}
        >
          Clear
        </button>
      </span>
      <div className="bulk-bar-actions">
        <button className="btn btn-secondary btn-sm" onClick={onBulkDownload}>
          <Download size={14} />
          Download
        </button>
        {count > 1 && (
          <button className="btn btn-secondary btn-sm" onClick={onBulkZip}>
            <Archive size={14} />
            Download ZIP
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onBulkShare}>
          <Share2 size={14} />
          Share
        </button>
        <button className="btn btn-danger btn-sm" onClick={onBulkDelete}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}
