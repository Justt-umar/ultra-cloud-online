import { Search } from 'lucide-react';

export default function SearchFilterBar({ query, onQueryChange, typeFilter, onTypeChange }) {
  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <Search size={18} />
        <input
          className="search-input"
          type="text"
          placeholder="Search files and folders..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <select
        className="filter-select"
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="all">All Types</option>
        <option value="folder">Folders</option>
        <option value="image">Images</option>
        <option value="video">Videos</option>
        <option value="audio">Audio</option>
        <option value="document">Documents</option>
      </select>
    </div>
  );
}
