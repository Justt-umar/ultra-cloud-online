<div align="center">

<img src="https://img.shields.io/badge/Ultra%20Cloud-Online-ff6b00?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="Ultra Cloud Online" />

# ☁️ Ultra Cloud Online

**A full-stack, self-hosted cloud storage manager — bring your own AWS S3 bucket and manage your files from a beautiful, modern web interface.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-23-ED8B00?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![AWS SDK](https://img.shields.io/badge/AWS%20SDK-v2-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com/sdk-for-java/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](#) · [Report Bug](https://github.com/Justt-umar/ultra-cloud-online/issues) · [Request Feature](https://github.com/Justt-umar/ultra-cloud-online/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
- [AWS S3 Setup](#-aws-s3-setup)
- [API Reference](#-api-reference)
- [Docker Deployment](#-docker-deployment)
- [Cloud Deployment](#-cloud-deployment)
- [How It Works](#-how-it-works)
- [Security Model](#-security-model)
- [Responsive Design](#-responsive-design)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🌟 Overview

**Ultra Cloud Online** is a production-ready, full-stack web application that lets you manage files in any AWS S3 bucket through a polished, browser-based interface. There is no database, no user accounts, and no vendor lock-in — simply provide your AWS credentials at runtime, and you get a full-featured file manager directly connected to your bucket.

The application is architected as a **secure server-side proxy**: your AWS credentials are never exposed to the browser. All S3 operations flow through the Spring Boot backend, which holds the authenticated session in memory for the lifetime of the connection.

### Why Ultra Cloud Online?

| Problem | Solution |
|---|---|
| AWS Console is complex and overwhelming | Clean, minimal UI focused purely on file management |
| Credentials exposed if talking to S3 directly from the browser | Backend proxy keeps credentials server-side only |
| No good mobile-friendly S3 managers | Fully responsive design for desktop, tablet, and mobile |
| Third-party tools require account creation | Zero accounts needed — just your own AWS credentials |

---

## ✨ Features

### 🗂 File Management
- **Browse** files and folders with hierarchical directory navigation
- **Upload** files up to **500 MB** per file (configurable), with multiple file selection support
- **Download** files directly through the browser with correct `Content-Disposition` headers
- **Delete** individual files or folders (folders are recursively deleted including all nested content)
- **Rename** files and folders (implemented as copy-to-new-key + delete-old-key under the hood)
- **Create folders** (represented as zero-byte S3 objects with a trailing `/`)
- **Drag-and-drop** file upload with a dedicated drop zone

### 🔍 Search & Filter
- **Real-time search** — filter files by name as you type
- **Type filter** — filter by: All, Images, Videos, Audio, Documents, Folders
- Results are filtered server-side using the S3 prefix query, then refined client-side

### 👁 Preview
- **In-browser file preview** for images, PDFs, videos, audio, and plain text/code files
- Preview served through the backend proxy, preserving correct MIME types

### 🔗 Sharing
- **Generate pre-signed URLs** that grant temporary public access to any file
- Choose expiry duration: **15 minutes, 1 hour, 24 hours, or 7 days**
- One-click copy-to-clipboard for the generated URL

### ✅ Bulk Operations
- **Select multiple** files and folders using checkboxes
- **Select all** with a single header checkbox
- **Bulk delete** selected items in one action

### 🎨 UI & UX
- **Dark theme** with a premium glassmorphism aesthetic
- **Toast notifications** for every operation (success, error, info)
- **Upload progress panel** — real-time per-file progress tracking
- **Breadcrumb navigation** — always shows your current path with clickable segments
- **Fully responsive** — adapts gracefully from 4K desktops down to mobile phones
- **Keyboard shortcuts** — Escape to cancel rename, Enter to confirm
- **Inline renaming** — click the rename button and edit directly in the file row

### 🔐 Connection Management
- Connect to any S3-compatible bucket at runtime (no server restart required)
- Disconnect button cleanly closes the SDK client and wipes credentials from memory
- **Remember Me** — optionally save credentials to `localStorage` for convenience
- Connection status indicator in the header

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **React** | 19 | UI component framework |
| **Vite** | 8 | Build tool and dev server |
| **Axios** | 1.x | HTTP client for API calls |
| **Lucide React** | 1.x | Icon library |
| **Vanilla CSS** | — | Styling (no CSS framework) |

### Backend
| Technology | Version | Role |
|---|---|---|
| **Java** | 23 | Runtime language |
| **Spring Boot** | 3.4.4 | Application framework |
| **Spring Web MVC** | — | REST API layer |
| **Spring Validation** | — | Request validation (`@Valid`) |
| **AWS SDK for Java v2** | 2.31.9 | S3 client and pre-signer |
| **AWS S3 Transfer Manager** | — | High-throughput multipart transfers |
| **Lombok** | — | Boilerplate reduction |
| **Maven** | 3.9 | Build and dependency management |

### Infrastructure
| Technology | Role |
|---|---|
| **Docker** | Multi-stage containerized backend build |
| **eclipse-temurin:23-jre** | Minimal production JRE image |
| **Render / Railway** | Backend hosting (PaaS) |
| **Vercel / Netlify** | Frontend static hosting |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React + Vite Frontend                  │    │
│  │                                                     │    │
│  │   CredentialsForm ──┐                               │    │
│  │   FileExplorer ─────┤── axios ──► REST API calls    │    │
│  │   FileList ─────────┤                               │    │
│  │   Modals ───────────┘                               │    │
│  └─────────────────────────┬───────────────────────────┘    │
└────────────────────────────│────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               Spring Boot Backend (Java 23)                  │
│                                                              │
│  S3Controller (/api/**)                                      │
│       │                                                      │
│       ├── S3SessionManager  (holds S3Client + S3Presigner)   │
│       │        └── validates connection, manages lifecycle   │
│       │                                                      │
│       └── S3Service  (all S3 operations)                    │
│                └── listObjects, upload, download, delete,    │
│                    rename, createFolder, presignUrl, search  │
└─────────────────────────────┬───────────────────────────────┘
                              │ AWS SDK v2 (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS S3 Bucket                           │
│                    (user-provided)                           │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **No database** — S3 is the only data store. The backend is entirely stateless except for the in-memory session.
- **No frontend-to-S3 direct calls** — eliminates CORS complexity and credential exposure.
- **Session-per-server** — one active S3 session at a time (suitable for personal/team use).
- **Pre-signed URLs** — share files without exposing your credentials; AWS signs the URL directly.

---

## 📁 Project Structure

```
ultra-cloud-online/
│
├── frontend/                          # React + Vite SPA
│   ├── public/                        # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── Breadcrumb.jsx         # Clickable path navigation
│   │   │   ├── BulkOperationsBar.jsx  # Bulk select/delete toolbar
│   │   │   ├── CorsInstructions.jsx   # In-app CORS setup guide
│   │   │   ├── CreateFolderModal.jsx  # New folder dialog
│   │   │   ├── CredentialsForm.jsx    # AWS credentials login form
│   │   │   ├── DeleteConfirmModal.jsx # Delete confirmation dialog
│   │   │   ├── DropZone.jsx           # Drag-and-drop upload area
│   │   │   ├── FileExplorer.jsx       # Main file browser (root component)
│   │   │   ├── FileList.jsx           # Table of files and folders
│   │   │   ├── Footer.jsx             # Page footer
│   │   │   ├── Header.jsx             # Top nav with connection status
│   │   │   ├── PreviewModal.jsx       # In-browser file preview
│   │   │   ├── SearchFilterBar.jsx    # Search input + type filter dropdown
│   │   │   ├── ShareModal.jsx         # Pre-signed URL generator
│   │   │   ├── Toast.jsx              # Toast notification renderer
│   │   │   └── UploadProgress.jsx     # Per-file upload progress panel
│   │   ├── context/
│   │   │   └── ToastContext.jsx       # Global toast state management
│   │   ├── services/
│   │   │   └── api.js                 # Axios API client (all backend calls)
│   │   ├── App.jsx                    # Root app component + routing logic
│   │   ├── index.css                  # Global styles + design system tokens
│   │   └── main.jsx                  # React DOM entry point
│   ├── index.html                     # HTML shell
│   ├── vite.config.js                 # Vite configuration
│   └── package.json                   # Frontend dependencies
│
├── backend/                           # Spring Boot REST API
│   ├── src/main/java/com/storage/
│   │   ├── StorageApplication.java    # Spring Boot entry point
│   │   ├── config/
│   │   │   └── WebConfig.java         # CORS configuration
│   │   ├── controller/
│   │   │   └── S3Controller.java      # All REST endpoints (/api/**)
│   │   ├── dto/
│   │   │   ├── ApiResponse.java       # Standard response wrapper
│   │   │   ├── ConnectRequest.java    # POST /api/connect body
│   │   │   ├── FileItem.java          # File/folder representation
│   │   │   ├── RenameRequest.java     # PUT /api/files/rename body
│   │   │   ├── ShareRequest.java      # POST /api/files/share body
│   │   │   └── ShareResponse.java     # Share URL + expiry response
│   │   └── service/
│   │       ├── S3Service.java         # Core S3 business logic
│   │       └── S3SessionManager.java  # S3Client lifecycle management
│   ├── src/main/resources/
│   │   └── application.properties     # Server config (port, file limits)
│   ├── Dockerfile                     # Multi-stage Docker build
│   └── pom.xml                        # Maven dependencies
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Java JDK | 23 | `java --version` |
| Maven | 3.9+ | `mvn --version` |
| Git | any | `git --version` |

You also need an **AWS account** with an S3 bucket and an IAM user with appropriate permissions (see [AWS S3 Setup](#-aws-s3-setup)).

---

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/Justt-umar/ultra-cloud-online.git
cd ultra-cloud-online
```

#### 2. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The Spring Boot server starts on **`http://localhost:8080`**.

> **First-time users:** Maven will download all dependencies (~200 MB). This only happens once.

#### 3. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on **`http://localhost:5173`**.

#### 4. Open in Browser

Navigate to `http://localhost:5173`. Enter your AWS credentials in the login form to connect.

---

### Environment Variables

The backend requires **no environment variables** for local development — credentials are supplied at runtime through the UI.

For production deployments, you may optionally configure the following in `application.properties` or as environment variables:

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Port the Spring Boot server listens on |
| `SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE` | `500MB` | Maximum single file upload size |
| `SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE` | `500MB` | Maximum total request size |

---

## 🪣 AWS S3 Setup

### Step 1: Create an S3 Bucket

1. Sign in to [AWS Console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Choose a unique bucket name and region
4. **Uncheck** "Block all public access" only if you plan to use public URLs (otherwise leave blocked)
5. Click **Create bucket**

### Step 2: Create an IAM User

1. Go to **IAM → Users → Create user**
2. Name it (e.g., `ultra-cloud-user`)
3. Select **"Attach policies directly"**
4. Attach the following custom policy (or `AmazonS3FullAccess` for simplicity):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:CopyObject",
        "s3:HeadObject",
        "s3:HeadBucket",
        "s3:GetObjectAttributes"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

5. Go to **Security credentials → Create access key**
6. Choose **"Application running outside AWS"**
7. Save the **Access Key ID** and **Secret Access Key** — you will not see the secret again

### Step 3: Configure CORS on the Bucket (only if accessing the bucket directly)

Since Ultra Cloud Online uses a **backend proxy**, no bucket-level CORS is strictly required. However, if you ever access the bucket directly from the browser, add this CORS policy under **Bucket → Permissions → CORS**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"]
  }
]
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`. The backend returns a standard `ApiResponse` wrapper:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### Connection

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/connect` | Connect to an S3 bucket |
| `POST` | `/api/disconnect` | Disconnect and clear credentials |
| `GET` | `/api/status` | Check current connection state |

**`POST /api/connect` — Request Body:**
```json
{
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-east-1",
  "bucket": "my-bucket-name"
}
```

---

### File Operations

| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| `GET` | `/api/files` | `prefix` | List files/folders at a path |
| `POST` | `/api/files/upload` | `prefix` | Upload one or more files |
| `GET` | `/api/files/download` | `key` | Download a file |
| `GET` | `/api/files/preview` | `key` | Preview a file (inline, correct MIME) |
| `DELETE` | `/api/files` | — | Delete one or more files (body: `["key1","key2"]`) |
| `POST` | `/api/files/folder` | — | Create a new folder |
| `PUT` | `/api/files/rename` | — | Rename a file or folder |
| `POST` | `/api/files/share` | — | Generate a pre-signed download URL |
| `GET` | `/api/files/search` | `prefix`, `query`, `type` | Search files by name and type |

**`PUT /api/files/rename` — Request Body:**
```json
{
  "oldKey": "folder/old-name.jpg",
  "newKey": "folder/new-name.jpg"
}
```

**`POST /api/files/share` — Request Body:**
```json
{
  "key": "folder/document.pdf",
  "durationMinutes": 60
}
```

**`POST /api/files/share` — Response:**
```json
{
  "success": true,
  "message": "Share URL generated",
  "data": {
    "url": "https://bucket.s3.amazonaws.com/document.pdf?X-Amz-Signature=...",
    "durationMinutes": 60
  }
}
```

---

## 🐳 Docker Deployment

The backend includes a **multi-stage Dockerfile** that produces a minimal production image:

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-23 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:23-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Build and Run

```bash
# Build the image
cd backend
docker build -t ultra-cloud-backend .

# Run the container
docker run -p 8080:8080 ultra-cloud-backend
```

The container exposes port `8080`. Map it to any host port you prefer.

---

## ☁️ Cloud Deployment

### Backend — Render (Recommended)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repository
4. Set the following:
   - **Root directory:** `backend`
   - **Build command:** `mvn clean package -DskipTests`
   - **Start command:** `java -jar target/*.jar`
   - **Environment:** `Java`
5. Deploy

### Backend — Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Select the repository, set **Root directory** to `backend`
3. Railway auto-detects the Dockerfile and builds it

### Frontend — Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add an environment variable:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
5. Deploy

### Frontend — Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Set **Base directory** to `frontend`, **Build command** to `npm run build`, **Publish directory** to `dist`
3. Add the `VITE_API_URL` environment variable
4. Deploy

> **CORS Note:** When deploying, ensure your backend's `WebConfig.java` includes your frontend's production domain in `allowedOriginPatterns`. The current config already allows `*.vercel.app` and `*.up.railway.app`.

---

## 🔬 How It Works

### Credential Flow

```
User enters credentials in UI
        │
        ▼
POST /api/connect
        │
        ▼
S3SessionManager.connect()
  ├── Creates AwsBasicCredentials (in-memory only)
  ├── Builds S3Client (AWS SDK v2)
  ├── Builds S3Presigner
  └── Validates by calling headBucket() — fails fast if credentials are wrong
        │
        ▼
Connected ✓ — session held in server memory
```

### File Listing (Directory Browsing)

The backend calls `ListObjectsV2` with:
- `prefix` = current folder path (e.g., `photos/vacation/`)
- `delimiter` = `/`

This causes S3 to return:
- **CommonPrefixes** → sub-folders (everything up to the next `/`)
- **Contents** → files at this exact level only

This creates the illusion of a real folder hierarchy even though S3 is a flat key-value store.

### Rename Operation

S3 has no native rename. The service implements it as:
1. **`CopyObject`** — copies the object to the new key
2. **`DeleteObject`** — deletes the original key

For folders, all objects under the old prefix are individually copied to the new prefix before the old prefix is deleted.

### Pre-signed URLs

Pre-signed URLs are generated by the **AWS S3 Presigner** (not the main S3Client). The URL contains a cryptographic signature that grants temporary read access to a specific object without requiring AWS credentials. The URL expires after the chosen duration.

---

## 🔐 Security Model

| Concern | How It's Handled |
|---|---|
| AWS credentials in browser | ❌ Never sent to browser — backend proxy only |
| Credentials at rest | ❌ Never persisted to disk by default; `Remember Me` uses `localStorage` (browser only) |
| CORS | Configured via Spring `WebMvcConfigurer` to allowlist specific origins only |
| File upload size | Capped at 500 MB by Spring's multipart config (configurable) |
| Input validation | `@Valid` + Jakarta Validation on all request bodies |
| Pre-signed URL expiry | Enforced by AWS — URLs become invalid after the specified duration |

> ⚠️ **Important:** This application maintains a **single global S3 session** on the server. It is designed for **personal or small-team use**. For multi-user deployments, each user should run their own backend instance.

---

## 📱 Responsive Design

The UI is fully responsive across all screen sizes:

| Breakpoint | Layout |
|---|---|
| **Desktop** (`> 768px`) | 5-column grid table: Checkbox \| Name \| Size \| Modified \| Actions |
| **Mobile** (`≤ 768px`) | Flex rows: Checkbox + [Name stacked above Size • Modified] + Actions |
| **Small Mobile** (`≤ 640px`) | Bulk bar stacks vertically; header condensed; tap-friendly 28px action buttons |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'feat: add amazing feature'`
4. Push to your fork: `git push origin feature/amazing-feature`
5. Open a **Pull Request** against `main`

### Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add multi-bucket support
fix: resolve mobile action button overflow
docs: update API reference
refactor: extract S3 error handler
```

### Reporting Issues

Please use [GitHub Issues](https://github.com/Justt-umar/ultra-cloud-online/issues) to report bugs. Include:
- Browser and OS version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

---

## 👨‍💻 Author

<div align="center">

**Umar Khan**

*Designed & Developed with ❤️*

[![GitHub](https://img.shields.io/badge/GitHub-Justt--umar-181717?style=flat-square&logo=github)](https://github.com/Justt-umar)

</div>

---

<div align="center">

© 2026 Ultra Cloud Online · Built with React, Spring Boot & AWS SDK v2

</div>
