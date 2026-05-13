<div align="center">

<img src="https://img.shields.io/badge/Ultra%20Cloud-Online-ff6b00?style=for-the-badge&logo=icloud&logoColor=white" alt="Ultra Cloud Online" />

# ☁️ Ultra Cloud Online

**Enterprise-grade, multi-cloud storage manager — connect AWS S3, Azure Blob, GCP Cloud Storage, and Backblaze B2 simultaneously and manage all your files from one beautiful interface.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-23-ED8B00?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-Supported-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com/s3/)
[![Azure Blob](https://img.shields.io/badge/Azure%20Blob-Supported-0078D4?style=flat-square&logo=microsoftazure)](https://azure.microsoft.com/en-us/products/storage/blobs)
[![GCP Storage](https://img.shields.io/badge/GCP%20Storage-Supported-4285F4?style=flat-square&logo=googlecloud)](https://cloud.google.com/storage)
[![Backblaze B2](https://img.shields.io/badge/Backblaze%20B2-Supported-E21E29?style=flat-square&logo=backblaze)](https://www.backblaze.com/b2/cloud-storage.html)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[🌐 Live Demo](https://ultra-cloud-online.onrender.com) · [🐛 Report Bug](https://github.com/Justt-umar/ultra-cloud-online/issues) · [💡 Request Feature](https://github.com/Justt-umar/ultra-cloud-online/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Supported Cloud Providers](#-supported-cloud-providers)
- [API Reference](#-api-reference)
- [Docker Deployment](#-docker-deployment)
- [Cloud Deployment](#-cloud-deployment)
- [Security Model](#-security-model)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🌟 Overview

**Ultra Cloud Online** is a production-ready, full-stack web application that lets you manage files across **four major cloud storage providers** through a polished, browser-based interface. There is no database, no user accounts, and no vendor lock-in — simply select your cloud provider, enter your credentials at runtime, and get a full-featured file manager connected directly to your bucket.

### Why Ultra Cloud Online?

| Problem | Solution |
|---|---|
| Cloud consoles are complex and overwhelming | Clean, minimal UI focused purely on file management |
| Locked into one cloud provider | Switch between AWS, Azure, GCP, and Backblaze freely |
| Can't manage multiple clouds at once | Multi-session tabbed interface for simultaneous connections |
| Credentials exposed in browser-to-cloud calls | Backend proxy keeps credentials server-side only |
| No good mobile-friendly cloud storage managers | Fully responsive PWA — installable on any device |
| Third-party tools require account creation | Zero accounts needed — just your own cloud credentials |

### Supported Providers

| Provider | Free Tier | Storage |
|---|---|---|
| ☁️ **AWS S3** | 5 GB, 12 months | Standard S3 buckets |
| 🔷 **Azure Blob Storage** | 5 GB LRS, 12 months | Blob containers |
| 🔵 **Google Cloud Storage** | 5 GB in US regions, always free | GCS buckets (JSON + HMAC) |
| 🔴 **Backblaze B2** | **10 GB + 1 GB/day downloads, always free** | B2 buckets |

---

## ✨ Features

### 🗂 Core File Management
- **Browse** files and folders with hierarchical directory navigation
- **Upload** files up to **500 MB** with drag-and-drop support and real-time progress tracking
- **Download** files with correct `Content-Disposition` headers
- **Delete** files or entire folders (recursive deletion of nested content)
- **Rename** files and folders (copy-to-new-key + delete-old under the hood)
- **Create folders** as virtual directory markers
- **Bulk operations** — multi-select with checkboxes, select all, bulk delete

### 🔍 Search & Filter
- **Real-time search** — filter files by name as you type
- **Type filters** — filter by: All, Images, Videos, Audio, Documents, Folders
- Server-side prefix queries with client-side refinement

### 👁 File Preview
- **In-browser preview** for images, PDFs, videos, audio, and text/code files
- Served through backend proxy with correct MIME types

### 🔗 Sharing & Pre-signed URLs
- **Generate temporary public URLs** for any file
- Configurable expiry: **15 minutes, 1 hour, 24 hours, or 7 days**
- One-click copy-to-clipboard

### 🔄 Multi-Session / Multi-Cloud Tabs
- **Connect to multiple buckets simultaneously** — even across different providers
- Tabbed session interface with per-tab connection state
- Switch between AWS, Azure, GCP, and Backblaze sessions instantly

### 📊 Storage Analytics Dashboard
- **Visual charts** showing storage usage breakdown by file type
- Top 10 largest files analysis
- Total file count and storage metrics
- Powered by Recharts with animated, interactive charts

### 📜 File Versioning & History
- View **version history** for files in versioning-enabled buckets
- Restore previous file versions
- Native S3/GCS versioning support

### 🔐 Client-Side Encryption (AES-256)
- **Encrypt files before upload** using AES-256 in the browser
- Decrypt on download — your cloud provider never sees plaintext
- Zero-knowledge architecture for sensitive files

### 🔔 Webhook Notifications
- Configure webhook URLs for file operation events
- Real-time notifications on upload, delete, rename, and folder creation
- Event filtering by operation type

### 📝 Audit Logging
- Complete **audit trail** of all storage operations
- Timestamped logs with operation type, file key, and status
- Exportable audit history

### 🎨 UI & UX
- **Dark/Light theme toggle** with smooth transitions
- **Premium glassmorphism** dark theme aesthetic
- **Toast notifications** for every operation (success, error, info)
- **Upload progress panel** — real-time per-file tracking
- **Breadcrumb navigation** — clickable path segments
- **Fully responsive** — 4K desktops to mobile phones
- **Keyboard shortcuts** — Escape to cancel, Enter to confirm
- **Inline renaming** — edit directly in the file row
- **Image thumbnails** — visual previews for image files

### 📱 Progressive Web App (PWA)
- **Installable** on desktop and mobile devices
- Service worker for offline caching
- App manifest with custom icons
- Native-like experience when installed

### 🔑 Credential Management
- **Test credentials** — one-click injection from `.env` for development
- **Protected fields** — masked display with 🔒 badge when using test mode
- **Remember Me** — optionally save credentials to `localStorage`
- **Per-provider setup guides** with step-by-step instructions and free-tier info
- **GCP dual-auth** — supports both Service Account JSON and HMAC keys (S3-compatible)

### 📱 Mobile & Android
- **Capacitor integration** for native Android builds
- Responsive design optimized for touch interactions
- Tap-friendly action buttons (28px minimum)

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **React** | 19 | UI component framework |
| **Vite** | 8 | Build tool and dev server |
| **Axios** | 1.x | HTTP client for API calls |
| **Recharts** | 2.x | Analytics dashboard charts |
| **Lucide React** | 1.x | Icon library |
| **Capacitor** | 7.x | Native mobile builds |
| **Vanilla CSS** | — | Custom design system (no framework) |

### Backend
| Technology | Version | Role |
|---|---|---|
| **Java** | 23 | Runtime language |
| **Spring Boot** | 3.4.4 | Application framework |
| **Spring Web MVC** | — | REST API layer |
| **Spring Validation** | — | Request validation (`@Valid`) |
| **AWS SDK for Java v2** | 2.31.9 | S3 + Backblaze B2 client |
| **Azure Storage Blob SDK** | 12.29.1 | Azure Blob client |
| **Google Cloud Storage SDK** | 2.45.0 | GCS client (native + HMAC) |
| **Lombok** | — | Boilerplate reduction |
| **Maven** | 3.9 | Build and dependency management |

### Infrastructure
| Technology | Role |
|---|---|
| **Docker** | Multi-stage containerized backend build |
| **Render** | Backend + Frontend hosting (PaaS) |
| **PWA / Service Worker** | Offline caching and installability |
| **Capacitor** | Android native wrapper |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                            Browser                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                React + Vite Frontend (PWA)               │    │
│  │                                                          │    │
│  │   SessionTabBar ────► Multi-session management           │    │
│  │   CredentialsForm ──► Provider auth (4 providers)        │    │
│  │   FileExplorer ─────► File operations & navigation       │    │
│  │   AnalyticsDashboard► Storage charts & metrics           │    │
│  │   SettingsPanel ────► Themes, encryption, webhooks       │    │
│  │   crypto.js ────────► AES-256 client-side encryption     │    │
│  └──────────────────────────┬───────────────────────────────┘    │
└─────────────────────────────│───────────────────────────────────┘
                              │ HTTPS (REST API)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Spring Boot Backend (Java 23)                         │
│                                                                    │
│  StorageController (/api/**)                                      │
│       │                                                            │
│       ├── StorageSessionManager (multi-session state)             │
│       │        └── StorageProviderFactory                         │
│       │              ├── AwsStorageProvider (AWS SDK v2)          │
│       │              ├── AzureStorageProvider (Azure SDK)         │
│       │              ├── GcpStorageProvider (GCS + HMAC fallback) │
│       │              └── BackblazeStorageProvider (S3-compat)     │
│       │                                                            │
│       ├── StorageService (unified CRUD operations)                │
│       ├── AuditService (operation logging)                        │
│       └── WebhookService (event notifications)                    │
└──────────────┬──────────┬──────────┬──────────┬───────────────────┘
               │          │          │          │
        AWS SDK v2    Azure SDK   GCP SDK   AWS SDK v2
               │          │          │      (B2 endpoint)
               ▼          ▼          ▼          ▼
         ┌─────────┐┌──────────┐┌─────────┐┌──────────┐
         │ AWS S3  ││  Azure   ││  GCP    ││Backblaze │
         │ Bucket  ││  Blob    ││ Storage ││   B2     │
         └─────────┘└──────────┘└─────────┘└──────────┘
```

### Key Design Decisions

- **Strategy Pattern** — each cloud provider implements a `StorageProvider` interface, selected at connect time
- **HMAC Delegation** — GCP provider supports dual-mode auth: native JSON keys or S3-compatible HMAC keys
- **No database** — cloud storage is the only data store; backend is stateless except for in-memory sessions
- **No frontend-to-cloud direct calls** — eliminates CORS complexity and credential exposure
- **Multi-session architecture** — connect to multiple buckets/providers simultaneously via tabbed UI
- **Backblaze B2** reuses the AWS SDK (S3-compatible API) — zero extra code needed

---

## 📁 Project Structure

```
ultra-cloud-online/
│
├── frontend/                              # React + Vite SPA (PWA)
│   ├── public/
│   │   ├── icons/                        # PWA icons (192px, 512px, SVG)
│   │   ├── manifest.json                 # PWA manifest
│   │   └── sw.js                         # Service worker
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticsDashboard.jsx    # Storage usage charts (Recharts)
│   │   │   ├── Breadcrumb.jsx            # Clickable path navigation
│   │   │   ├── BulkOperationsBar.jsx     # Multi-select toolbar
│   │   │   ├── CorsInstructions.jsx      # Per-provider setup guides
│   │   │   ├── CreateFolderModal.jsx     # New folder dialog
│   │   │   ├── CredentialsForm.jsx       # Multi-provider auth form + test mode
│   │   │   ├── DeleteConfirmModal.jsx    # Delete confirmation
│   │   │   ├── DropZone.jsx              # Drag-and-drop upload area
│   │   │   ├── FileExplorer.jsx          # Main file browser (root)
│   │   │   ├── FileList.jsx              # File/folder table with thumbnails
│   │   │   ├── Header.jsx                # Top nav + connection status
│   │   │   ├── PreviewModal.jsx          # In-browser file preview
│   │   │   ├── SearchFilterBar.jsx       # Search + type filter
│   │   │   ├── SessionTabBar.jsx         # Multi-session tab management
│   │   │   ├── SettingsPanel.jsx         # Theme, encryption, webhooks, audit
│   │   │   ├── ShareModal.jsx            # Pre-signed URL generator
│   │   │   ├── Toast.jsx                 # Toast notification renderer
│   │   │   ├── UploadProgress.jsx        # Per-file upload progress
│   │   │   └── VersionHistoryModal.jsx   # File version history viewer
│   │   ├── services/
│   │   │   ├── api.js                    # Axios API client
│   │   │   └── crypto.js                 # AES-256 encryption/decryption
│   │   ├── context/
│   │   │   └── ToastContext.jsx          # Global toast state
│   │   ├── App.jsx                       # Root component
│   │   ├── index.css                     # Design system (2900+ lines)
│   │   └── main.jsx                      # Entry point
│   ├── android/                          # Capacitor Android project
│   ├── capacitor.config.json             # Mobile build config
│   └── package.json
│
├── backend/                               # Spring Boot REST API
│   ├── src/main/java/com/storage/
│   │   ├── StorageApplication.java       # Spring Boot entry point
│   │   ├── config/
│   │   │   └── WebConfig.java            # CORS configuration
│   │   ├── controller/
│   │   │   └── StorageController.java    # All REST endpoints (/api/**)
│   │   ├── dto/
│   │   │   ├── ApiResponse.java          # Standard response wrapper
│   │   │   ├── AuditLog.java             # Audit log entry DTO
│   │   │   ├── ConnectRequest.java       # POST /api/connect body
│   │   │   ├── FileItem.java             # File/folder representation
│   │   │   ├── RenameRequest.java        # PUT /api/files/rename body
│   │   │   ├── ShareRequest.java         # POST /api/files/share body
│   │   │   └── ShareResponse.java        # Share URL response
│   │   └── service/
│   │       ├── AuditService.java         # Operation audit logging
│   │       ├── StorageService.java       # Unified CRUD operations
│   │       ├── StorageSessionManager.java # Multi-session lifecycle
│   │       ├── WebhookService.java       # Event webhook dispatcher
│   │       └── provider/
│   │           ├── StorageProvider.java       # Provider interface
│   │           ├── StorageProviderFactory.java # Factory pattern
│   │           ├── AwsStorageProvider.java     # AWS S3
│   │           ├── AzureStorageProvider.java   # Azure Blob
│   │           ├── GcpStorageProvider.java     # GCP (JSON + HMAC)
│   │           └── BackblazeStorageProvider.java # Backblaze B2
│   ├── Dockerfile                        # Multi-stage Docker build
│   └── pom.xml                           # Maven dependencies
│
├── .gitignore                            # Protects .env secrets
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Java JDK | 23 | `java --version` |
| Maven | 3.9+ | `mvn --version` |

### Local Development

```bash
# 1. Clone
git clone https://github.com/Justt-umar/ultra-cloud-online.git
cd ultra-cloud-online

# 2. Start Backend
cd backend
mvn spring-boot:run
# → http://localhost:8080

# 3. Start Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Environment Variables (Optional — for Test Mode)

Create `frontend/.env` for one-click test credential injection:

```env
# AWS S3
VITE_TEST_AWS_ACCESS_KEY=your-access-key
VITE_TEST_AWS_SECRET_KEY=your-secret-key
VITE_TEST_AWS_REGION=us-east-1
VITE_TEST_AWS_BUCKET=your-bucket

# Azure Blob Storage
VITE_TEST_AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
VITE_TEST_AZURE_CONTAINER=your-container

# GCP Cloud Storage (HMAC mode)
VITE_TEST_GCP_HMAC_ACCESS_KEY=GOOG3B...
VITE_TEST_GCP_HMAC_SECRET_KEY=your-hmac-secret
VITE_TEST_GCP_PROJECT_ID=your-project-id
VITE_TEST_GCP_BUCKET=your-bucket

# Backblaze B2
VITE_TEST_B2_ACCESS_KEY=your-key-id
VITE_TEST_B2_SECRET_KEY=your-app-key
VITE_TEST_B2_REGION=us-east-005
VITE_TEST_B2_BUCKET=your-bucket
```

> ⚠️ Never commit `.env` files — they are gitignored by default.

---

## ☁️ Provider Setup Guides

### AWS S3

1. [AWS Console](https://console.aws.amazon.com/s3/) → **Create bucket**
2. **IAM** → Users → Create user → Attach `AmazonS3FullAccess`
3. Security credentials → **Create access key** → Copy both keys
4. Enter in Ultra Cloud: Access Key ID, Secret Key, Region, Bucket name

### Azure Blob Storage

1. [Azure Portal](https://portal.azure.com) → **Storage accounts** → Create
2. Choose LRS redundancy (cheapest), Standard performance
3. Create a **Container** under Data storage
4. **Access keys** → Copy the Connection String
5. Enter in Ultra Cloud: Connection String, Container name

### Google Cloud Storage

1. [GCP Console](https://console.cloud.google.com) → **Cloud Storage** → Create bucket
2. **Option A (JSON):** IAM → Service Accounts → Create → Download JSON key
3. **Option B (HMAC):** Cloud Storage → Settings → Interoperability → Create HMAC key
4. Enter in Ultra Cloud: Choose auth mode, paste credentials, bucket name

### Backblaze B2

1. [Backblaze](https://www.backblaze.com/sign-up/cloud-storage) → Create free account (no credit card)
2. **B2 Cloud Storage** → Buckets → Create bucket (note the region from endpoint)
3. **App Keys** → Add New Application Key → Copy keyID and applicationKey
4. Enter in Ultra Cloud: Key ID, App Key, Region, Bucket name

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Standard response format:

```json
{ "success": true, "message": "...", "data": { ... } }
```

### Connection
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/connect` | Connect to a storage provider |
| `POST` | `/api/disconnect` | Disconnect and clear credentials |
| `GET` | `/api/status` | Check connection state |

### File Operations
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/files?prefix=` | List files/folders at path |
| `POST` | `/api/files/upload?prefix=` | Upload files |
| `GET` | `/api/files/download?key=` | Download a file |
| `GET` | `/api/files/preview?key=` | Preview a file (inline) |
| `DELETE` | `/api/files` | Delete files (body: `["key1","key2"]`) |
| `POST` | `/api/files/folder` | Create a folder |
| `PUT` | `/api/files/rename` | Rename file/folder |
| `POST` | `/api/files/share` | Generate pre-signed URL |
| `GET` | `/api/files/search` | Search by name and type |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | List all active sessions |
| `POST` | `/api/sessions/{id}/activate` | Switch active session |
| `DELETE` | `/api/sessions/{id}` | Close a session |

---

## 🐳 Docker Deployment

```bash
# Build
cd backend
docker build -t ultra-cloud-backend .

# Run
docker run -p 8080:8080 ultra-cloud-backend
```

---

## ☁️ Cloud Deployment (Render)

The app is deployed on **Render** as a single full-stack service:

1. Push code to GitHub
2. [Render](https://render.com) → **New → Web Service** → Connect repo
3. Configure:
   - **Root directory:** `backend`
   - **Build command:** `mvn clean package -DskipTests`
   - **Start command:** `java -jar target/*.jar`
4. Deploy → Your app is live!

---

## 🔐 Security Model

| Concern | How It's Handled |
|---|---|
| Cloud credentials in browser | ❌ Never — backend proxy only |
| Credentials at rest | ❌ Never persisted to disk; optional `localStorage` for convenience |
| Client-side encryption | ✅ AES-256 encryption before upload |
| CORS | Allowlisted origins via Spring `WebMvcConfigurer` |
| File upload size | Capped at 500 MB (configurable) |
| Input validation | `@Valid` + Jakarta Validation on all request bodies |
| Pre-signed URL expiry | Enforced by provider — URLs auto-expire |
| Test credentials | Protected with masking and read-only fields |

---

## 📱 Responsive Design

| Breakpoint | Layout |
|---|---|
| **Desktop** (`> 768px`) | Full table: Checkbox \| Name \| Size \| Modified \| Actions |
| **Tablet** (`≤ 768px`) | Condensed flex rows with stacked metadata |
| **Mobile** (`≤ 640px`) | Touch-optimized with 28px action buttons |

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

---

## 👨‍💻 Author

<div align="center">

**Umar Khan**

*Designed & Developed with ❤️*

[![GitHub](https://img.shields.io/badge/GitHub-Justt--umar-181717?style=flat-square&logo=github)](https://github.com/Justt-umar)

</div>

---

<div align="center">

© 2026 Ultra Cloud Online · Built with React 19, Spring Boot 3.4, and Multi-Cloud SDKs

**AWS S3 · Azure Blob · Google Cloud Storage · Backblaze B2**

</div>
