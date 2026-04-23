import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

export default function CreateFolderModal({ currentPath, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const fullPath = (currentPath || '') + name.trim();
      await onCreate(fullPath);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><FolderPlus size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Create New Folder</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="folderName">Folder Name</label>
              <input
                id="folderName"
                type="text"
                placeholder="my-new-folder"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            {currentPath && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Will be created at: <code style={{ color: 'var(--accent-primary)' }}>{currentPath}{name || '...'}/</code>
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
