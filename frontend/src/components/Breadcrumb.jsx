import { ChevronRight, Home, FolderPlus, Upload } from 'lucide-react';

export default function Breadcrumb({ path, onNavigate, onCreateFolder, onUploadClick }) {
  const parts = path ? path.split('/').filter(Boolean) : [];

  const handleClick = (index) => {
    if (index === -1) {
      onNavigate('');
    } else {
      const newPath = parts.slice(0, index + 1).join('/') + '/';
      onNavigate(newPath);
    }
  };

  return (
    <div className="breadcrumb-bar">
      <nav className="breadcrumb-nav">
        <span
          className={`breadcrumb-item ${parts.length === 0 ? 'active' : ''}`}
          onClick={() => handleClick(-1)}
        >
          <Home size={16} />
          Root
        </span>
        {parts.map((part, index) => (
          <span key={index} style={{ display: 'contents' }}>
            <ChevronRight className="breadcrumb-separator" size={14} />
            <span
              className={`breadcrumb-item ${index === parts.length - 1 ? 'active' : ''}`}
              onClick={() => handleClick(index)}
            >
              {part}
            </span>
          </span>
        ))}
      </nav>
      <div className="breadcrumb-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCreateFolder}>
          <FolderPlus size={16} />
          New Folder
        </button>
        <button className="btn btn-primary btn-sm" onClick={onUploadClick}>
          <Upload size={16} />
          Upload
        </button>
      </div>
    </div>
  );
}
