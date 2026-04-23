# Ultra Cloud — Complete Beginner's Guide (Part 3: React & Frontend Core)

*← [Part 2: Backend](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part2_backend.md)*

---

## Chapter 17: What Is React?

**React** is a JavaScript library (created by Facebook/Meta) for building user interfaces. Instead of writing HTML and manipulating it with raw JavaScript, you write **components** — small, reusable pieces that describe what the UI should look like.

### Why Not Just Plain HTML + JavaScript?

With plain HTML/JS, when data changes, you manually find and update every element:

```javascript
// Plain JS — PAIN
document.getElementById('status').textContent = 'Connected';
document.getElementById('status').classList.add('green');
document.getElementById('loginForm').style.display = 'none';
document.getElementById('fileExplorer').style.display = 'block';
```

With React, you describe WHAT the UI should look like based on current data, and React automatically updates the right parts:

```jsx
// React — NICE
{connected ? <FileExplorer /> : <CredentialsForm />}
```

When `connected` changes from `false` to `true`, React automatically removes the form and renders the file explorer. You don't manually touch the DOM.

---

## Chapter 18: What Is JSX?

JSX looks like HTML inside JavaScript:

```jsx
function Header() {
  return (
    <header className="app-header">
      <span className="header-title">Ultra Cloud</span>
    </header>
  );
}
```

**JSX is NOT HTML.** It gets compiled into JavaScript function calls by the build tool (Vite). The above becomes:

```javascript
React.createElement('header', { className: 'app-header' },
  React.createElement('span', { className: 'header-title' }, 'Ultra Cloud')
);
```

Key differences from HTML:
- `class` → `className` (because `class` is a reserved word in JavaScript)
- `for` → `htmlFor`
- Self-closing tags are required: `<input />` not `<input>`
- JavaScript expressions go inside `{}`: `<span>{user.name}</span>`

---

## Chapter 19: Components = Functions

A React component is just a **JavaScript function that returns JSX**:

```jsx
// This IS a component
function Header({ connected, bucket }) {
  return (
    <header>
      <span>Ultra Cloud</span>
      <span>{connected ? `Connected to ${bucket}` : 'Disconnected'}</span>
    </header>
  );
}

// Using the component
<Header connected={true} bucket="my-files" />
```

### Props = Input Parameters

The `{ connected, bucket }` in the function signature are **props** (properties). They're values passed from the parent component, like function arguments. Props are **read-only** — a component can't modify its own props.

```jsx
// Parent passes props:
<Header connected={true} bucket="my-photos" onDisconnect={handleDisconnect} />

// Child receives them:
function Header({ connected, bucket, onDisconnect }) {
  // 'connected' is true
  // 'bucket' is "my-photos"  
  // 'onDisconnect' is a function to call when the user clicks Disconnect
}
```

---

## Chapter 20: React Hooks — useState

**Hooks** are special functions that let components have memory and side effects. The most important is `useState`:

```jsx
const [connected, setConnected] = useState(false);
```

- `connected` — the current value (starts as `false`)
- `setConnected` — a function to UPDATE the value
- When you call `setConnected(true)`, React re-renders the component with the new value

**Real example from our App.jsx:**

```jsx
const [connected, setConnected] = useState(false);
const [bucket, setBucket] = useState('');
const [loading, setLoading] = useState(true);
```

Three pieces of state:
- `connected` — are we connected to S3? (boolean)
- `bucket` — which bucket are we connected to? (string)
- `loading` — are we still checking the initial status? (boolean)

### Important Rule: Never Modify State Directly

```javascript
// ❌ WRONG — React won't detect the change
connected = true;

// ✅ RIGHT — React detects this and re-renders
setConnected(true);
```

---

## Chapter 21: React Hooks — useEffect

`useEffect` runs code **after the component renders**. It's for side effects — things that happen outside of React's rendering: API calls, timers, DOM manipulation.

```jsx
useEffect(() => {
  // This code runs after the component first appears on screen
  api.getStatus()
    .then((res) => {
      setConnected(res.data.connected);
      setBucket(res.data.bucket || '');
    })
    .catch(() => setConnected(false))
    .finally(() => setLoading(false));
}, []);  // ← The empty array [] means "run ONCE on mount"
```

The **dependency array** `[]` controls when the effect re-runs:
- `[]` (empty) = run once when component mounts
- `[currentPath]` = run again whenever `currentPath` changes
- No array at all = run after EVERY render (usually bad!)

**In our FileExplorer:**
```jsx
useEffect(() => {
  fetchFiles();
}, [fetchFiles]);
```
This calls `fetchFiles()` whenever the `fetchFiles` function identity changes (which happens when `currentPath` changes, because `fetchFiles` depends on `currentPath`).

---

## Chapter 22: useCallback and useMemo

### useCallback — Memoize a Function

```jsx
const handleDelete = useCallback(async (keys) => {
  await api.deleteFiles(keys);
  fetchFiles(); // refresh the file list
}, [fetchFiles, addToast]);
```

`useCallback` wraps a function and says "only create a new version of this function if `fetchFiles` or `addToast` change." This prevents unnecessary re-renders of child components.

**Why it matters**: Without `useCallback`, every time `FileExplorer` re-renders, `handleDelete` would be a brand-new function object. `FileList` would receive a "new" `onDelete` prop and re-render unnecessarily.

### useMemo — Memoize a Computed Value

```jsx
const filteredFiles = useMemo(() => {
  return files.filter((item) => {
    const matchesQuery = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery && matchesType;
  });
}, [files, searchQuery, typeFilter]);
```

`useMemo` caches the result of an expensive computation. The filter only re-runs when `files`, `searchQuery`, or `typeFilter` change — not on every render.

---

## Chapter 23: React Context — Global State

Sometimes data needs to be shared across many distant components. Passing props through 5 levels of nesting is painful ("prop drilling"). **Context** solves this.

### Our ToastContext:

```jsx
// Create Context
const ToastContext = createContext();

// Provider wraps the entire app
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((message, type) => {
    setToasts(prev => [...prev, { id: ++toastId, message, type }]);
    setTimeout(() => removeToast(id), 4000); // Auto-dismiss after 4 seconds
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// Any component anywhere can use:
const { addToast } = useToast();
addToast('File uploaded!', 'success');
```

The Provider is placed at the root of the app in `App.jsx`. Every component inside it can call `useToast()` to show notifications.

---

## Chapter 24: Vite — The Build Tool

**Vite** (pronounced "veet", French for "fast") does two things:

1. **Development mode** (`npm run dev`): Starts a lightning-fast dev server on port 5173 with hot module replacement — when you save a file, the browser instantly updates without a full page reload.

2. **Production build** (`npm run build`): Bundles all your JS, CSS, and assets into optimized files for deployment.

Vite replaces older tools like Webpack. It's faster because it uses native ES modules in the browser during development.

---

## Chapter 25: api.js — The HTTP Client

This file is the **bridge** between React and Spring Boot. It uses **Axios**, an HTTP library:

```jsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,
});
```

- `baseURL` — Every request URL is relative to this. `api.get('/files')` actually calls `http://localhost:8080/api/files`.
- `withCredentials: true` — Send cookies (needed for CORS).

Each API function is a one-liner:

```jsx
export const listFiles = (prefix = '') => 
  api.get('/files', { params: { prefix } });
// This calls: GET http://localhost:8080/api/files?prefix=photos/
```

**Upload** is special because files aren't JSON — they use `FormData`:

```jsx
export const uploadFiles = (prefix, files, onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/files/upload', formData, {
    params: { prefix },
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,  // Callback for progress bar updates
  });
};
```

---

## Chapter 26: App.jsx — The Root Component

```jsx
export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
```

`App` wraps everything in `ToastProvider` so all components can show notifications.

```jsx
function AppContent() {
  const [connected, setConnected] = useState(false);
  const [bucket, setBucket] = useState('');
  const [loading, setLoading] = useState(true);

  // On mount: check if already connected
  useEffect(() => {
    api.getStatus().then(res => {
      setConnected(res.data.connected);
    }).finally(() => setLoading(false));
  }, []);
```

When the app first loads, it asks the backend "am I already connected?" via `GET /api/status`. During this check, the app shows a spinner.

### The Core Render Logic:

```jsx
return (
  <>
    <Header connected={connected} bucket={bucket} onDisconnect={handleDisconnect} />
    {connected ? <FileExplorer /> : <CredentialsForm onConnect={handleConnect} />}
    <Toast />
    <Footer />
  </>
);
```

This single line is the heart of the app:
```jsx
{connected ? <FileExplorer /> : <CredentialsForm onConnect={handleConnect} />}
```

- If `connected` is `true` → show the file explorer
- If `connected` is `false` → show the login form

When the user clicks "Connect" and it succeeds, `setConnected(true)` is called, React re-renders, and the login form disappears and the file explorer appears.

`<>` and `</>` are **Fragments** — invisible wrappers that let you return multiple elements without adding an extra `<div>`.

---

*← [Part 2: Backend](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part2_backend.md) | [Part 4: Components →](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part4_frontend_components.md)*
