# Ultra Cloud — Complete Beginner's Guide (Part 4: Every React Component Explained)

*← [Part 3: Frontend Core](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part3_frontend_core.md)*

---

## Chapter 27: CredentialsForm.jsx — The Login Screen

This is the first thing users see. It has two main features: the login form and saved credentials management.

### Saved Credentials System (localStorage)

```jsx
const STORAGE_KEY = 'ultracloud_saved_credentials';

function getSavedCredentials() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}
```

**localStorage** is browser storage that persists between page reloads and browser restarts. It stores key-value pairs as strings. `JSON.parse()` converts the string back into a JavaScript array.

When the user checks "Save credentials" and connects successfully:
```jsx
if (rememberMe) {
  saveCredential(form);  // Saves to localStorage
}
```

The saved credentials appear as a dropdown at the top of the form. Clicking one auto-fills all fields. The delete button removes individual saved profiles.

### Form State

```jsx
const [form, setForm] = useState({
  accessKeyId: '',
  secretAccessKey: '',
  region: 'us-east-1',
  bucket: '',
});
```

All four form fields are stored in ONE state object. When you type in any input, `handleChange` updates just that field:

```jsx
const handleChange = (e) => {
  setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
};
```

- `e.target.name` = which field was changed (e.g., `"bucket"`)
- `e.target.value` = the new value (e.g., `"my-photos"`)
- `...prev` = spread all existing values, then overwrite the one that changed

### Form Submission

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();  // Stop the form from doing a traditional page reload
  setLoading(true);
  await onConnect(form); // Call the parent's connect function
  setLoading(false);
};
```

`e.preventDefault()` is critical — without it, the browser would reload the page (traditional HTML form behavior), losing all React state.

---

## Chapter 28: Header.jsx — Navigation Bar

```jsx
<span className={`status-dot ${connected ? 'connected' : ''}`} />
```

The **template literal** `` `status-dot ${...}` `` creates a CSS class string. When connected is `true`, the dot gets class `"status-dot connected"`, which triggers the green pulsing animation in CSS.

The disconnect button calls `onDisconnect` (a function passed from App.jsx via props):
```jsx
<button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
```

---

## Chapter 29: FileExplorer.jsx — The Orchestrator

This is the **brain** of the application. It manages 11 pieces of state and 10+ event handlers. Let me explain its state:

```jsx
const [currentPath, setCurrentPath] = useState('');     // Current folder (e.g., "photos/2024/")
const [files, setFiles] = useState([]);                 // Array of FileItem objects from backend
const [loading, setLoading] = useState(false);          // Show spinner while loading?
const [selectedKeys, setSelectedKeys] = useState(new Set()); // Which files are checked
const [searchQuery, setSearchQuery] = useState('');     // Search box text
const [typeFilter, setTypeFilter] = useState('all');    // Filter dropdown value
const [showDropzone, setShowDropzone] = useState(false);// Show upload area?
const [uploads, setUploads] = useState([]);             // Upload progress tracking
const [showCreateFolder, setShowCreateFolder] = useState(false); // Show folder modal?
const [previewFile, setPreviewFile] = useState(null);   // File being previewed (or null)
const [shareFile, setShareFile] = useState(null);       // File being shared (or null)
```

### Data Flow: How File Listing Works

1. `currentPath` changes (user clicked a folder)
2. `useEffect` detects the change and calls `fetchFiles()`
3. `fetchFiles()` calls `api.listFiles(currentPath)` → sends `GET /api/files?prefix=photos/`
4. Backend queries S3 and returns an array of `FileItem` objects
5. `setFiles(res.data.data)` stores them in state
6. React re-renders `FileList` with the new data

### Selection System (Set data structure)

```jsx
const [selectedKeys, setSelectedKeys] = useState(new Set());
```

A **Set** is a collection of unique values. Perfect for tracking which files are selected:
- `selectedKeys.has("photos/cat.jpg")` → is this file selected?
- `selectedKeys.add("photos/cat.jpg")` → select it
- `selectedKeys.delete("photos/cat.jpg")` → deselect it
- `selectedKeys.size` → how many selected?

### Download Handler — Creating a Browser Download

```jsx
const handleDownload = useCallback(async (key) => {
  const res = await api.downloadFile(key);           // Get file bytes as Blob
  const url = window.URL.createObjectURL(new Blob([res.data])); // Create temp URL
  const a = document.createElement('a');             // Create invisible <a> tag
  a.href = url;                                      // Point it to the blob
  a.download = key.split('/').pop();                 // Set filename
  document.body.appendChild(a);                      // Add to page
  a.click();                                         // Trigger click = start download
  a.remove();                                        // Clean up
  window.URL.revokeObjectURL(url);                   // Free memory
}, [addToast]);
```

This is a standard browser trick. Since the file comes from the backend API (not a direct S3 URL), we create a temporary URL from the blob data and trigger a download programmatically.

---

## Chapter 30: Breadcrumb.jsx — Path Navigation

Given path `"photos/2024/vacation/"`, it renders:

```
Root  >  photos  >  2024  >  vacation
```

Each segment is clickable. Clicking "photos" navigates to `"photos/"`. The logic:

```jsx
const parts = path ? path.split('/').filter(Boolean) : [];
// "photos/2024/vacation/" → ["photos", "2024", "vacation"]
```

`filter(Boolean)` removes empty strings (the split creates one from the trailing `/`).

---

## Chapter 31: DropZone.jsx — Drag and Drop Upload

The HTML5 Drag and Drop API uses four events:

```jsx
onDragEnter  → A file entered the zone (show blue border)
onDragOver   → A file is hovering over the zone (prevent default = allow drop)
onDragLeave  → A file left the zone (hide blue border)
onDrop       → A file was released (process the files)
```

The `dragCounter` ref is important: DragEnter fires for EVERY child element, so without counting, the visual feedback would flicker. We increment on enter, decrement on leave, and only deactivate when counter reaches 0.

---

## Chapter 32: FileList.jsx — The File Table

### File Type Icons

```jsx
function getFileIcon(item) {
  if (item.isFolder) return <Folder className="file-icon folder" />;
  if (ct.startsWith('image/')) return <Image className="file-icon image" />;
  if (ct.includes('pdf')) return <FileText className="file-icon pdf" />;
  // ...
}
```

Each file type gets a different icon (from `lucide-react`) and a different CSS color class.

### Inline Rename

When you click the pencil icon, the filename text transforms into an input field:

```jsx
{renamingKey === item.key ? (
  <input className="rename-input" value={renameValue}
    onChange={(e) => setRenameValue(e.target.value)}
    onBlur={() => handleFinishRename(item)}     // Save when clicking away
    onKeyDown={(e) => handleRenameKeyDown(e)}   // Save on Enter, cancel on Escape
    autoFocus />
) : (
  <span className="file-name-text">{item.name}</span>
)}
```

- Press **Enter** → saves the new name (calls API)
- Press **Escape** → cancels without saving
- Click elsewhere (**blur**) → saves

### File Size Formatter

```jsx
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}
// 245000 → "239.3 KB"
// 1073741824 → "1.0 GB"
```

---

## Chapter 33: Modals (CreateFolder, Preview, Share)

### Modal Pattern

All modals follow the same structure:

```jsx
<div className="modal-overlay" onClick={onClose}>     {/* Dark backdrop */}
  <div className="modal" onClick={e => e.stopPropagation()}>  {/* Card */}
    <div className="modal-header">...</div>
    <div className="modal-body">...</div>
    <div className="modal-footer">...</div>
  </div>
</div>
```

**`e.stopPropagation()`** prevents clicking inside the modal from closing it. Without this, clicking a form field would bubble up to the overlay and trigger `onClose`.

### PreviewModal — Content Type Detection

```jsx
const isImage = contentType.startsWith('image/');  // image/jpeg, image/png
const isPdf = contentType.includes('pdf');          // application/pdf
const isText = contentType.startsWith('text/');     // text/plain, text/html
```

Based on the file type, it renders different elements:
- **Images**: `<img src={blobUrl} />` — native image display
- **PDFs**: `<iframe src={blobUrl} />` — browser's built-in PDF viewer
- **Text**: `<pre>{textContent}</pre>` — plain monospaced text
- **Other**: "Preview not available" message with download button

### ShareModal — Duration Picker

```jsx
const durations = [
  { label: '1 Hour', minutes: 60 },
  { label: '1 Week', minutes: 10080 },
];
```

The user picks a duration, clicks "Generate", the backend creates a pre-signed URL with that expiration, and the URL is displayed with a copy button.

---

## Chapter 34: Toast.jsx — Notification System

Toast notifications are the small popups that appear in the top-right corner:

- ✅ Green = success ("File uploaded!")
- ❌ Red = error ("Upload failed")
- ⚠️ Yellow = warning ("Select one file")
- ℹ️ Blue = info ("Disconnected")

They auto-dismiss after 4 seconds (set in ToastContext) and slide in from the right (CSS animation `toastIn`).

---

*← [Part 3: Frontend Core](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part3_frontend_core.md) | [Part 5: CSS & Design →](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part5_css_and_design.md)*
