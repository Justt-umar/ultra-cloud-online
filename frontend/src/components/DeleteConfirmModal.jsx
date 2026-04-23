import { X, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmModal({ count, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: '#ef4444' }}>
            <AlertTriangle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Delete Items
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Are you sure you want to delete {count} item(s)?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onConfirm}
            style={{ 
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
