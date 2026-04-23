# Ultra Cloud — Complete Beginner's Guide (Part 6: AWS S3 & Running the Project)

*← [Part 5: CSS & Design](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part5_css_and_design.md)*

---

## Chapter 46: What Is AWS S3?

**Amazon S3** (Simple Storage Service) is a cloud storage service. Think of it as a massive hard drive on the internet. You can store any file — images, videos, documents, backups — and access them from anywhere.

### S3 Terminology

| Term | Meaning | Real-World Analogy |
|------|---------|-------------------|
| **Bucket** | A top-level container for files | A storage locker |
| **Object** | A single file stored in S3 | A box inside the locker |
| **Key** | The full path to a file | The label on the box (`photos/2024/cat.jpg`) |
| **Prefix** | A path filter (like a folder path) | A shelf in the locker (`photos/2024/`) |
| **Region** | The geographic location of your data | Which warehouse the locker is in (`us-east-1` = Virginia, `ap-south-1` = Mumbai) |

### S3 Has No Real Folders!

This is **critical** to understand. S3 is a **flat key-value store**. Every object has a unique key (string) and a value (the file bytes). There are no actual directories.

When you see "folders" in Ultra Cloud, it's an illusion:

```
photos/           ← This is a zero-byte object with key "photos/"
photos/cat.jpg    ← This is an object with key "photos/cat.jpg"
photos/dog.jpg    ← This is an object with key "photos/dog.jpg"
```

The "photos/" folder is either:
1. A zero-byte object with the key `photos/` (created explicitly), OR
2. Just a common prefix shared by multiple objects

When we list objects with `prefix=photos/` and `delimiter=/`, S3 returns objects that start with `photos/` but groups nested paths into "common prefixes" — this simulates folder behavior.

### Content Types (MIME Types)

Every file has a **content type** that tells the browser what it is:

| Extension | Content Type | Category |
|-----------|-------------|----------|
| `.jpg`, `.png` | `image/jpeg`, `image/png` | Image |
| `.mp4` | `video/mp4` | Video |
| `.mp3` | `audio/mpeg` | Audio |
| `.pdf` | `application/pdf` | Document |
| `.txt` | `text/plain` | Text |
| `.html` | `text/html` | Web page |
| Unknown | `application/octet-stream` | Binary |

Our backend guesses the content type from the filename using Java's `URLConnection.guessContentTypeFromName()`.

---

## Chapter 47: AWS SDK v2 for Java

The **AWS SDK** (Software Development Kit) is a Java library that lets you talk to AWS services. In our project, we use two key classes:

### S3Client — For All S3 Operations

```java
S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(StaticCredentialsProvider.create(credentials))
    .build();
```

This creates a client that can call S3 methods like:
- `listObjectsV2()` — list files
- `putObject()` — upload
- `getObject()` — download
- `deleteObject()` — delete
- `copyObject()` — copy (used for rename)
- `headBucket()` — check if bucket exists
- `headObject()` — get file metadata without downloading

### S3Presigner — For Share URLs

```java
S3Presigner.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(StaticCredentialsProvider.create(credentials))
    .build();
```

The presigner generates **pre-signed URLs** — special URLs with embedded authentication that expire after a set time. Anyone with the URL can download the file without needing AWS credentials.

---

## Chapter 48: AWS Credentials (IAM)

To access S3, you need:
1. **Access Key ID** — Like a username (starts with `AKIA...`)
2. **Secret Access Key** — Like a password (long random string)

These come from **IAM** (Identity and Access Management) in the AWS Console. You create an IAM user, attach an S3 access policy, and generate an access key pair.

### Required Permissions

The IAM user needs these S3 permissions:
- `s3:ListBucket` — to list files in a bucket
- `s3:GetObject` — to download files
- `s3:PutObject` — to upload files
- `s3:DeleteObject` — to delete files
- `s3:GetBucketLocation` — to verify the bucket region

---

## Chapter 49: CORS for S3 Buckets

**CORS** on the S3 bucket itself is needed if the frontend ever directly accesses S3 (we don't in our architecture, but it's good practice). The CORS config looks like:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

This tells S3: "Accept requests from any origin, with any headers, using any HTTP method." In our project, the `CorsInstructions.jsx` component displays this JSON for the user to copy-paste into their S3 bucket settings.

---

## Chapter 50: Pre-Signed URLs Deep Dive

When you share a file in Ultra Cloud, the backend creates a URL like:

```
https://my-bucket.s3.amazonaws.com/photos/cat.jpg
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIA.../20240115/us-east-1/s3/aws4_request
  &X-Amz-Date=20240115T120000Z
  &X-Amz-Expires=3600
  &X-Amz-Signature=abc123def456...
```

The URL contains:
- The file location (`photos/cat.jpg`)
- The credentials (access key ID, not the secret)
- The expiration time (`X-Amz-Expires=3600` = 1 hour)
- A cryptographic signature proving the URL was generated by someone with the secret key

Anyone can use this URL to download the file — no AWS account needed. After the expiration, the URL stops working. This is how you temporarily share private files.

---

## Chapter 51: How to Run the Project

### Prerequisites
- **Java 23** — install via `brew install java` (macOS)
- **Maven 3.9+** — install via `brew install maven`
- **Node.js 18+** — install via `brew install node`
- **An AWS account** with an S3 bucket and IAM credentials

### Step 1: Start the Backend

```bash
cd /Users/umarkhan/Desktop/Unlimited_Storage/backend
mvn spring-boot:run
```

This will:
1. Download all Java dependencies (first time only)
2. Compile all `.java` files
3. Start an embedded Tomcat server on port 8080
4. Print "Started StorageApplication" when ready

### Step 2: Start the Frontend

```bash
cd /Users/umarkhan/Desktop/Unlimited_Storage/frontend
npm install    # First time only — downloads React, Axios, etc.
npm run dev    # Starts Vite dev server
```

This will print: `Local: http://localhost:5173/`

### Step 3: Open the App

Go to `http://localhost:5173` in your browser. Enter your AWS credentials and click Connect.

---

## Chapter 52: Common Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "CORS error" in console | Backend not configured for frontend origin | Check `WebConfig.java` allows your frontend URL |
| "Connection refused" | Backend not running | Start it with `mvn spring-boot:run` |
| "Access Denied" from AWS | Wrong credentials or insufficient permissions | Check IAM user has S3 permissions |
| "Bucket not found" | Typo in bucket name or wrong region | Verify bucket name and region in AWS Console |
| Large file upload fails | Spring Boot default limit too low | Check `application.properties` max-file-size |
| Frontend shows blank page | JavaScript error | Open browser DevTools (F12) → Console tab |

---

## Chapter 53: Glossary of All Technical Terms

| Term | Definition |
|------|-----------|
| **API** | Application Programming Interface — a set of rules for software communication |
| **Axios** | A JavaScript HTTP client library for making API requests |
| **Blob** | Binary Large Object — raw binary data (like a file in memory) |
| **Component** | A reusable piece of UI in React (a function that returns JSX) |
| **CORS** | Cross-Origin Resource Sharing — browser security mechanism for cross-domain requests |
| **CSS Variable** | A reusable value defined with `--name` and used with `var(--name)` |
| **DTO** | Data Transfer Object — a simple class that carries data between layers |
| **FormData** | A JavaScript API for encoding files for HTTP upload |
| **Hook** | A special React function (`useState`, `useEffect`, etc.) that adds features to components |
| **HTTP** | HyperText Transfer Protocol — the language of web communication |
| **IAM** | Identity and Access Management — AWS service for user/permission management |
| **JSX** | JavaScript XML — syntax that looks like HTML but compiles to JavaScript |
| **JSON** | JavaScript Object Notation — text format for structured data |
| **localStorage** | Browser API that stores key-value pairs persistently |
| **Maven** | Java build tool that manages dependencies, compilation, and packaging |
| **MIME type** | A label describing a file's type (e.g., `image/jpeg`) |
| **Pre-signed URL** | A temporary, authenticated URL for accessing private S3 objects |
| **Props** | Read-only inputs passed from a parent component to a child component |
| **REST** | Representational State Transfer — architectural pattern for web APIs |
| **S3** | Simple Storage Service — Amazon's cloud object storage |
| **SDK** | Software Development Kit — a library for accessing a service's features |
| **Spring Boot** | Java framework for building web applications with minimal configuration |
| **State** | Data that changes over time and triggers UI updates when changed |
| **Vite** | A fast JavaScript build tool and dev server |

---

## 🎉 Congratulations!

If you read all 6 parts, you now understand:
- ✅ How the entire architecture works (frontend ↔ backend ↔ AWS)
- ✅ Every Java class in the backend and what it does
- ✅ Every React component in the frontend and how it works
- ✅ All 1400+ lines of CSS and the design decisions behind them
- ✅ AWS S3's key concepts and how the SDK interacts with it
- ✅ How to run, troubleshoot, and extend the project

---

## All Parts

1. [Overview & Architecture](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part1_overview.md)
2. [Backend Deep Dive](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part2_backend.md)
3. [React & Frontend Core](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part3_frontend_core.md)
4. [Every Component Explained](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part4_frontend_components.md)
5. [CSS Design System](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part5_css_and_design.md)
6. [AWS S3 & Running the Project](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part6_aws_s3.md) *(this file)*
