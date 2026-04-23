# Ultra Cloud — Complete Beginner's Guide (Part 7: Deployment Roadmap)

Congratulations on building the full-stack S3 File Manager! Running it on `localhost` is great, but to share it with the world (and recruiters), you need to deploy it to the internet.

Because our application has two distinct parts — a **React Frontend** and a **Spring Boot Backend** — we need to deploy them separately.

Here is your detailed, step-by-step roadmap for deploying Ultra Cloud.

---

## Phase 1: Pre-Deployment Checklist

Before deploying anywhere, you must prepare the codebase for production.

### 1. Update the Frontend API URL
Right now, `api.js` points to `http://localhost:8080/api`. In production, it needs to point to your deployed backend URL.
- Use environment variables (e.g., `import.meta.env.VITE_API_BASE_URL`).
- Create a `.env` file for local development and a `.env.production` for deployment.

### 2. Update Backend CORS Configuration
Your `WebConfig.java` currently allows requests from `http://localhost:5173`. You must add your future frontend production URL (e.g., `https://ultracloud.vercel.app`) to the `allowedOrigins`.

### 3. Build the Frontend
Test the production build locally:
```bash
cd frontend
npm run build
npm run preview
```
This generates an optimized `dist/` folder containing plain HTML, CSS, and JS.

### 4. Package the Backend
Create an executable JAR file for the Spring Boot app:
```bash
cd backend
mvn clean package -DskipTests
```
This generates a fat JAR file in the `target/` directory (e.g., `s3-file-manager-1.0.0.jar`) containing an embedded Tomcat server.

---

## Phase 2: Choose Your Deployment Strategy

You have three main paths for deployment, ranging from easiest (PaaS) to most professional (Docker/AWS).

### Option A: The "Modern PaaS" Way (Easiest & Free)
*Best for portfolios, quick sharing, and zero server maintenance.*

**Frontend: Vercel or Netlify**
1. Push your code to a GitHub repository.
2. Sign in to Vercel and import your repository.
3. Set the Root Directory to `frontend`.
4. Vercel automatically detects Vite, runs `npm run build`, and hosts it globally on an Edge CDN.

**Backend: Railway or Render**
1. Sign in to Railway.app or Render.com and connect your GitHub.
2. Create a new Web Service pointing to your `backend` directory.
3. Railway/Render will automatically detect the Maven `pom.xml`, build the Java 23 app, and assign it a public HTTPS URL (e.g., `https://ultra-cloud-api.up.railway.app`).
4. **Final Step**: Copy this backend URL and put it into your Vercel frontend environment variables, then redeploy the frontend.

---

### Option B: The "DevOps Server" Way (Industry Standard)
*Best if you want to learn DevOps, Docker, and Linux administration.*

**1. Dockerize the Application**
Write a `Dockerfile` for both frontend and backend.
- **Backend Dockerfile**: Use an Eclipse Temurin Java 23 image, copy the JAR, and expose port 8080.
- **Frontend Dockerfile**: Use a multi-stage build (Node.js to run `npm run build`, then Nginx to serve the `dist/` folder).

**2. Rent a VPS (Virtual Private Server)**
- Rent a $5/month server from DigitalOcean, Linode, or AWS EC2.
- SSH into the server and install Docker & Docker Compose.

**3. Run with Docker Compose**
- Create a `docker-compose.yml` file that spins up both the Nginx frontend container and the Spring Boot backend container.
- Use **Nginx Reverse Proxy** to route traffic.

**4. Add HTTPS (SSL)**
- Use Certbot (Let's Encrypt) to generate free SSL certificates so your app runs on `https://`.

---

### Option C: The "AWS Native" Way (Enterprise Architecture)
*Best if you want an AWS-heavy resume and massive scalability.*

**Frontend: AWS S3 + CloudFront**
1. Create a new S3 bucket (e.g., `ultracloud-frontend`).
2. Run `npm run build` and upload the `dist/` folder to this bucket.
3. Enable "Static Website Hosting" on the bucket.
4. Put **AWS CloudFront** (CDN) in front of the bucket for global caching, HTTPS, and custom domain mapping.

**Backend: AWS Elastic Beanstalk (or ECS)**
1. AWS Elastic Beanstalk is a managed service for Java apps.
2. Upload your `target/s3-file-manager-1.0.0.jar` to Elastic Beanstalk.
3. AWS automatically provisions an EC2 instance, an Auto Scaling Group, and a Load Balancer.

---

## Phase 3: CI/CD (Continuous Integration / Continuous Deployment)

Once deployed manually, you should automate it so that every time you push code, it updates live.

**GitHub Actions Pipeline:**
1. Create a `.github/workflows/deploy.yml` file.
2. **On push to `main` branch:**
   - Action runs `mvn test` (if you add tests).
   - Action runs `npm run build` to ensure the UI compiles.
   - Action automatically triggers a redeploy on Vercel (Frontend) and Railway (Backend).

---

## Recommended Path for You

Since you want recruiters to test this easily with your "Test Credentials" button:

1. Use **Option A (Vercel + Railway/Render)**. It is entirely free, requires no Linux knowledge, and gives you professional HTTPS URLs instantly.
2. Push your `Unlimited_Storage` folder to a public GitHub repository. This acts as your portfolio piece.
3. Update your `README.md` with screenshots, the architecture diagram from Part 1, and the live deployment links.
