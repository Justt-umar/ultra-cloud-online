# Ultra Cloud — Complete Beginner's Guide (Part 2: Backend Deep Dive)

*← [Part 1: Overview](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part1_overview.md)*

---

## Chapter 6: What Is Spring Boot?

**Spring Boot** is a Java framework that makes it easy to create web servers. Without it, you'd need hundreds of lines of boilerplate code just to start accepting HTTP requests. Spring Boot handles all of that for you.

Think of it this way:
- **Java** = the language (like English)
- **Spring** = a giant library of tools (like a toolkit)
- **Spring Boot** = an opinionated setup that picks the best tools for you (like a pre-built toolkit with the most common tools already selected and configured)

### What Does "Framework" Mean?

A framework gives you structure. Instead of you calling library functions, the framework calls YOUR code. You write small pieces (controllers, services), and Spring Boot wires them together and runs them for you.

---

## Chapter 7: Maven & pom.xml — The Build System

### What Is Maven?

Maven is a **build tool** for Java — it does three things:
1. **Downloads libraries** (dependencies) from the internet
2. **Compiles** your `.java` files into `.class` files the JVM can run
3. **Packages** everything into a runnable `.jar` file

### [pom.xml](file:///Users/umarkhan/Desktop/Unlimited_Storage/backend/pom.xml) — Line by Line

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.4</version>
</parent>
```
**What this means**: "This project inherits from Spring Boot 3.4.4." The parent POM defines default configurations, plugin versions, and dependency versions so you don't have to specify them all yourself.

```xml
<properties>
    <java.version>23</java.version>
    <aws.sdk.version>2.31.9</aws.sdk.version>
</properties>
```
**What this means**: Variables you can reuse. `${java.version}` = 23, `${aws.sdk.version}` = 2.31.9.

### Dependencies (Libraries We Need)

| Dependency | What It Does |
|-----------|-----------|
| `spring-boot-starter-web` | Adds Tomcat web server + Spring MVC for REST APIs |
| `spring-boot-starter-validation` | Adds `@NotBlank`, `@Valid` annotations for input validation |
| `software.amazon.awssdk:s3` | AWS SDK — the Java library to talk to Amazon S3 |
| `software.amazon.awssdk:s3-transfer-manager` | High-level upload/download with progress support |
| `lombok` | Reduces boilerplate (auto-generates getters/setters) |
| `spring-boot-starter-test` | JUnit + Mockito for unit testing |

---

## Chapter 8: application.properties

```properties
server.port=8080
spring.servlet.multipart.max-file-size=500MB
spring.servlet.multipart.max-request-size=500MB
```

- **`server.port=8080`**: The backend listens on port 8080. Frontend sends requests here.
- **`max-file-size=500MB`**: Without this, Spring Boot rejects uploads larger than 1MB (the default). We set it to 500MB so you can upload large files.

---

## Chapter 9: StorageApplication.java — The Entry Point

```java
@SpringBootApplication
public class StorageApplication {
    public static void main(String[] args) {
        SpringApplication.run(StorageApplication.class, args);
    }
}
```

This is the **entire file**. Here's what each part does:

- `@SpringBootApplication` — A mega-annotation that combines three things:
  - `@Configuration` — "This class contains Spring config"
  - `@EnableAutoConfiguration` — "Auto-configure everything based on my dependencies"
  - `@ComponentScan` — "Scan all packages under `com.storage` for classes with annotations like `@Controller`, `@Service`, etc."

- `SpringApplication.run(...)` — Starts the embedded Tomcat web server, initializes all components, and begins listening for HTTP requests on port 8080.

When you run `mvn spring-boot:run`, this `main()` method is called.

---

## Chapter 10: Understanding Annotations

Annotations are the `@Something` markers above classes/methods in Java. Spring Boot uses them heavily:

| Annotation | Meaning |
|-----------|---------|
| `@RestController` | "This class handles HTTP requests and returns JSON" |
| `@RequestMapping("/api")` | "All URLs in this class start with `/api`" |
| `@GetMapping("/files")` | "Handle GET requests to `/api/files`" |
| `@PostMapping("/connect")` | "Handle POST requests to `/api/connect`" |
| `@PutMapping("/files/rename")` | "Handle PUT requests to `/api/files/rename`" |
| `@DeleteMapping("/files")` | "Handle DELETE requests to `/api/files`" |
| `@RequestParam` | "Read a value from the URL query string" |
| `@RequestBody` | "Read the JSON body of the HTTP request" |
| `@Valid` | "Validate the input (check @NotBlank etc.)" |
| `@Service` | "This class contains business logic" |
| `@Component` | "This is a managed Spring component (create an instance for me)" |
| `@Configuration` | "This class configures Spring settings" |

---

## Chapter 11: Dependency Injection (DI)

This is THE most important Spring concept. Look at this constructor:

```java
public S3Controller(S3SessionManager sessionManager, S3Service s3Service) {
    this.sessionManager = sessionManager;
    this.s3Service = s3Service;
}
```

You never write `new S3Service()` anywhere. Spring **automatically creates** one instance of `S3Service`, one of `S3SessionManager`, and **injects** (passes) them into the controller's constructor.

**Why?** Because if S3Service needed S3SessionManager, and the Controller needed both, manually creating all of them correctly would be error-prone. Spring handles it all — it's like a robot assistant that builds and connects all the parts for you.

---

## Chapter 12: DTOs (Data Transfer Objects)

DTOs are simple data containers — they hold data that moves between frontend and backend. In Java 16+, we use **Records**:

```java
public record FileItem(
    String name,        // "photo.jpg"
    String key,         // "pictures/photo.jpg" (full S3 path)
    long size,          // 245000 (bytes)
    String lastModified, // "2024-01-15 10:30:00"
    boolean isFolder,   // false
    String contentType  // "image/jpeg"
) {}
```

A `record` automatically generates: constructor, getters (`.name()`, `.key()`, etc.), `equals()`, `hashCode()`, and `toString()`. No boilerplate.

### ConnectRequest — What the login form sends:
```java
public record ConnectRequest(
    @NotBlank String accessKeyId,      // AWS access key
    @NotBlank String secretAccessKey,  // AWS secret key
    String region,                     // "us-east-1" (defaults if blank)
    @NotBlank String bucket            // "my-bucket-name"
) {}
```
`@NotBlank` means "if this field is empty, reject the request with an error".

### ApiResponse — Standard response wrapper:
```java
public record ApiResponse(boolean success, String message, Object data) {
    public static ApiResponse success(String msg) { ... }
    public static ApiResponse error(String msg) { ... }
}
```
Every API endpoint wraps its response in this format so the frontend always knows: did it succeed? What's the message? What's the data?

---

## Chapter 13: S3SessionManager — Managing the Connection

This class is like a **phone line to Amazon**. You pick it up (connect), talk (do operations), and hang up (disconnect).

### Key Fields
```java
private S3Client s3Client;       // The AWS SDK client object
private S3Presigner s3Presigner; // For generating share URLs
private String bucket;           // Which bucket we're connected to
private boolean connected;       // Are we connected right now?
```

### connect() Method — Opening the Connection
```java
public synchronized void connect(String accessKeyId, String secretAccessKey, 
                                  String regionStr, String bucketName) {
    disconnect(); // Close any existing connection first
    
    // Create credentials object from the provided keys
    AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
    
    // Build the S3 client with those credentials
    this.s3Client = S3Client.builder()
        .region(awsRegion)
        .credentialsProvider(StaticCredentialsProvider.create(credentials))
        .build();
    
    // Test the connection by checking if the bucket exists
    this.s3Client.headBucket(b -> b.bucket(bucketName));
    
    this.connected = true;
}
```

`synchronized` means only one thread can call this method at a time — prevents race conditions.

`headBucket()` is a lightweight API call that checks if the bucket exists and if the credentials are valid. If invalid, it throws an exception and the connection fails.

---

## Chapter 14: S3Service — All File Operations

### listObjects() — Browse Files at a Path

```java
ListObjectsV2Request request = ListObjectsV2Request.builder()
    .bucket(sessionManager.getBucket())
    .prefix(prefix)       // e.g., "photos/" — show only files in photos/
    .delimiter("/")       // treat "/" as a folder separator
    .build();
```

**prefix** = "only show files whose path starts with this". If prefix is `photos/`, you only get files inside the photos folder.

**delimiter** = "group files by this character". The `/` delimiter tells S3 to give us "common prefixes" (folders) separately from files. Without this, S3 would return ALL files in all subfolders as a flat list.

### uploadFile() — Send a File to S3

1. Constructs the S3 key: `prefix + filename` (e.g., `photos/` + `cat.jpg` = `photos/cat.jpg`)
2. Creates a `PutObjectRequest` with bucket name, key, and content type
3. Calls `putObject()` with the file's bytes
4. The file is now in S3

### deleteObject() — Remove a File/Folder

Files are simple — one `DeleteObject` call. Folders are tricky: S3 doesn't have real folders, so a "folder" is just a common prefix shared by multiple files. To delete a folder, we must:
1. List ALL objects with that prefix
2. Delete them all using batch `DeleteObjects`
3. Delete the folder marker itself

### renameObject() — S3 Has No Rename!

S3 doesn't support renaming. So we simulate it:
1. **Copy** the file to the new key (new name)
2. **Delete** the original file

For folders, we must copy every file inside the folder to the new prefix, then delete all old files.

### generatePresignedUrl() — Temporary Share Links

A pre-signed URL is a special URL that grants temporary access to a private S3 file. It embeds a cryptographic signature in the URL that expires after the specified duration. Anyone with the URL can download the file until it expires.

---

## Chapter 15: S3Controller — REST API Endpoints

The controller is the **front door** of the backend. It receives HTTP requests and delegates to the service.

### Pattern for Every Endpoint:

```java
@PostMapping("/connect")
public ResponseEntity<ApiResponse> connect(@Valid @RequestBody ConnectRequest request) {
    try {
        // 1. Call the service to do the actual work
        sessionManager.connect(request.accessKeyId(), ...);
        // 2. Return success with data
        return ResponseEntity.ok(ApiResponse.success("Connected!", data));
    } catch (Exception e) {
        // 3. If anything goes wrong, return an error
        return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
    }
}
```

Every single endpoint follows this **try/catch pattern**:
- **try**: call the service, return `200 OK` with success
- **catch**: return `400 Bad Request` with the error message

### Download Endpoint — Streaming Bytes

The download endpoint is special — it doesn't return JSON. It returns **raw file bytes** with headers that tell the browser "this is a file download":

```java
return ResponseEntity.ok()
    .contentType(MediaType.parseMediaType("image/jpeg"))    // file type
    .header("Content-Disposition", "attachment; filename=\"photo.jpg\"")  // triggers download
    .header("Content-Length", "245000")                      // file size
    .body(new InputStreamResource(s3Object));                // file bytes stream
```

---

## Chapter 16: WebConfig.java — CORS Configuration

```java
registry.addMapping("/api/**")
    .allowedOrigins("http://localhost:5173", "http://localhost:3000")
    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
    .allowCredentials(true);
```

This says: "Allow the frontend (running on port 5173 or 3000) to make HTTP requests to any URL starting with `/api/`. Allow all HTTP methods. Allow cookies/credentials to be sent."

Without this, every request from the frontend would be blocked by the browser with a CORS error.

---

*← [Part 1: Overview](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part1_overview.md) | [Part 3: Frontend Core →](file:///Users/umarkhan/.gemini/antigravity/brain/a3746206-051e-40ee-9255-f5cfd673582b/guide_part3_frontend_core.md)*
