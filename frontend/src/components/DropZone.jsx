import { useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

export default function DropZone({ onFilesSelected }) {
  const [active, setActive] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFilesSelected(files);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone ${active ? 'active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <UploadCloud className="dropzone-icon" size={40} />
      <h3>Drop files here to upload</h3>
      <p>
        or <span className="browse-link">browse files</span> from your computer
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  );
}
