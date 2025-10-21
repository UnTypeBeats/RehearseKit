# RehearseKit - Knowledge Transfer Document

**Date**: October 18-19, 2025  
**Session**: Initial development and deployment  
**Status**: Deployed to GCP with active issues being resolved

---

## 🎯 What Was Built Today

### Complete Application
- **RehearseKit**: Audio processing application that transforms YouTube videos or FLAC files into separated stems with DAWproject files
- **Tech Stack**: Next.js 14, FastAPI, Celery, PostgreSQL, Redis, Demucs AI
- **Architecture**: Microservices on Docker Compose (local) and GCP (cloud)

### Core Features Implemented
1. ✅ YouTube audio download (yt-dlp)
2. ✅ FLAC file upload
3. ✅ Audio conversion to 24-bit/48kHz WAV
4. ✅ Tempo/BPM detection (Librosa)
5. ✅ AI stem separation (Demucs) - vocals, drums, bass, other
6. ✅ DAWproject file generation (Cubase/Bitwig/Studio One compatible)
7. ✅ Job queue management (Celery + Redis)
8. ✅ RESTful API (FastAPI)
9. ✅ Modern web interface (Next.js 14)
10. ✅ Real-time progress updates (WebSocket infrastructure)

---

## 🌐 Live Deployment URLs

### Production (GCP)
- **Frontend**: https://rehearsekit-frontend-748316872223.us-central1.run.app
- **Backend API**: https://rehearsekit-backend-748316872223.us-central1.run.app
- **API Docs**: https://rehearsekit-backend-748316872223.us-central1.run.app/docs
- **WebSocket**: https://rehearsekit-websocket-748316872223.us-central1.run.app

### Local Development
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs  
- **WebSocket**: http://localhost:8001

### Repository
- **GitHub**: https://github.com/UnTypeBeats/RehearseKit
- **Commits**: 91 commits (all pushed)

---

## 🏗️ Infrastructure Deployed

### GCP Resources (Project: rehearsekit)

| Resource | Name | Location | Status | Details |
|----------|------|----------|--------|---------|
| **Cloud SQL** | rehearsekit-postgres-production | us-central1 | ✅ Running | PostgreSQL 16, 10.215.0.3 |
| **Memorystore** | rehearsekit-redis-production | us-central1 | ✅ Running | Redis 7.0, 10.215.1.3:6379 |
| **Cloud Storage** | rehearsekit-uploads | us-central1 | ✅ Created | Auto-delete after 7 days |
| **Cloud Storage** | rehearsekit-stems | us-central1 | ✅ Created | Auto-delete after 7 days |
| **Cloud Storage** | rehearsekit-packages | us-central1 | ✅ Created | Auto-delete after 7 days |
| **Cloud Run** | rehearsekit-frontend | us-central1 | ✅ Running | 512Mi RAM, scales 0-10 |
| **Cloud Run** | rehearsekit-backend | us-central1 | ✅ Running | 2Gi RAM, scales 0-10 |
| **Cloud Run** | rehearsekit-websocket | us-central1 | ✅ Running | 512Mi RAM, min 1 instance |
| **Compute Engine** | rehearsekit-worker | us-central1-a | ✅ Running | n1-standard-4, IP: 34.45.90.110 |
| **VPC** | rehearsekit-vpc-production | Global | ✅ Created | Private networking |
| **VPC Connector** | rehearsekit-conn-prod | us-central1 | ✅ Created | For Cloud Run access |

### Monthly Cost Estimate
- Cloud SQL (db-f1-micro): $10
- Memorystore Redis (1GB): $30
- Compute Engine VM (n1-standard-4): $120
- Cloud Run (frontend/backend/websocket): $5-10
- Cloud Storage: $2
- **Total**: ~$167/month

---

## 🔧 Current Issues & Solutions

### Issue 1: YouTube Bot Detection ❌ ACTIVE
**Problem**: YouTube blocks downloads from cloud IPs with "Sign in to confirm you're not a bot"

**What Was Tried**:
- Custom user agents
- Browser-like headers
- Android/iOS player clients as extractors
- Fallback to embedded clients
- Retry logic with delays

**Current Status**: Still fails on many videos

**Solutions to Try Tomorrow**:
1. **Cookie-based auth** (Best):
   ```python
   # In audio.py download_youtube():
   'cookiesfrombrowser': ('chrome',),  # Extract cookies from local Chrome
   ```

2. **Test with different videos**: Some videos work, some don't

3. **Focus on FLAC upload**: Works perfectly, no YouTube dependency

4. **Residential proxy**: Use service like BrightData (costs money)

### Issue 2: FLAC Upload 413 Error ⏳ IN PROGRESS
**Problem**: Backend returns "413 Content Too Large" for FLAC uploads

**Solution**: Increased max request body size to 1GB
- File: `backend/app/main.py`
- Change: `max_request_body_size=1024 * 1024 * 1024`
- Status: Backend rebuild in progress (check: `gcloud builds list --limit=1`)

**After build completes**:
```bash
# Deploy updated backend
gcloud run deploy rehearsekit-backend \
  --image gcr.io/rehearsekit/rehearsekit-backend:latest \
  --region us-central1
```

### Issue 3: CORS Intermittent ✅ FIXED (but may need redeployment)
**Problem**: Backend CORS config lost during rebuilds

**Solution**: CORS origins hardcoded in `backend/app/core/config.py`:
```python
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://rehearsekit-frontend-748316872223.us-central1.run.app",
    "https://rehearsekit-backend-748316872223.us-central1.run.app"
]
```

**Verification**:
```bash
curl -H "Origin: https://rehearsekit-frontend-748316872223.us-central1.run.app" \
  -X OPTIONS https://rehearsekit-backend-748316872223.us-central1.run.app/api/jobs/create \
  -I | grep access-control
```

---

## ✅ What's Working

### Local Environment
- All 6 services running via Docker Compose
- 8+ jobs successfully processed
- 4 packages generated (in `tmp/storage/`)
- Complete pipeline tested: YouTube → Stems → DAWproject → Download
- Processing time: ~90 seconds for 19-second clip

### Cloud Environment
- ✅ Frontend UI loads and works
- ✅ Backend API functional (health checks pass)
- ✅ Database connected (Cloud SQL)
- ✅ Redis connected (Memorystore)
- ✅ Worker running on Compute Engine VM
- ✅ Worker picks up jobs from queue
- ✅ WebSocket service running
- ❌ YouTube downloads fail (bot detection)
- ⏳ FLAC uploads fail (413 - being fixed)

---

## 🚀 Quick Start Commands

### Check Everything is Running

```bash
# Local services
cd /Users/i065699/work/projects/personal/RehearseKit
docker-compose ps

# Cloud services
gcloud run services list --region=us-central1

# Compute Engine worker
gcloud compute instances list --filter="name=rehearsekit-worker"

# Worker logs
gcloud compute ssh rehearsekit-worker --zone=us-central1-a --command="docker ps && docker logs \$(docker ps -q)"
```

### Start Local Development

```bash
cd /Users/i065699/work/projects/personal/RehearseKit

# Start all services
docker-compose up

# Or in background
docker-compose up -d

# View logs
docker-compose logs -f worker

# Access
open http://localhost:3000
```

### Deploy Changes to Cloud

```bash
# Frontend
gcloud builds submit frontend/ --tag gcr.io/rehearsekit/rehearsekit-frontend:latest
gcloud run deploy rehearsekit-frontend --image gcr.io/rehearsekit/rehearsekit-frontend:latest --region us-central1

# Backend
gcloud builds submit backend/ --tag gcr.io/rehearsekit/rehearsekit-backend:latest
gcloud run deploy rehearsekit-backend --image gcr.io/rehearsekit/rehearsekit-backend:latest --region us-central1

# WebSocket
gcloud builds submit websocket/ --tag gcr.io/rehearsekit/rehearsekit-websocket:latest
gcloud run deploy rehearsekit-websocket --image gcr.io/rehearsekit/rehearsekit-websocket:latest --region us-central1
```

### Update Compute Engine Worker

```bash
# SSH to worker VM
gcloud compute ssh rehearsekit-worker --zone=us-central1-a

# Pull latest image and restart container
docker pull gcr.io/rehearsekit/rehearsekit-backend:latest
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
docker run -d --name worker --restart=always \
  -e DATABASE_URL='postgresql+asyncpg://rehearsekit:PASSWORD@10.215.0.3:5432/rehearsekit' \
  -e REDIS_URL='redis://10.215.1.3:6379/0' \
  -e CELERY_BROKER_URL='redis://10.215.1.3:6379/0' \
  -e CELERY_RESULT_BACKEND='redis://10.215.1.3:6379/1' \
  -e GCS_BUCKET_UPLOADS=rehearsekit-uploads \
  -e GCS_BUCKET_STEMS=rehearsekit-stems \
  -e GCS_BUCKET_PACKAGES=rehearsekit-packages \
  -e STORAGE_MODE=gcs \
  gcr.io/rehearsekit/rehearsekit-backend:latest \
  celery -A app.celery_app worker --loglevel=info --concurrency=2

# Check it's running
docker ps
docker logs $(docker ps -q) | tail -20
```

---

## 📂 Project Structure

```
RehearseKit/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints (jobs.py, health.py)
│   │   ├── models/      # Database models (job.py)
│   │   ├── services/    # Business logic
│   │   │   ├── audio.py          # yt-dlp, FFmpeg, Librosa, Demucs
│   │   │   ├── cubase.py         # DAWproject generation
│   │   │   └── storage.py        # GCS/local storage
│   │   ├── tasks/       # Celery tasks
│   │   │   └── audio_processing.py  # Main job processing pipeline
│   │   └── core/        # Config, database
│   ├── alembic/         # Database migrations
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Production image
│
├── frontend/            # Next.js 14 frontend
│   ├── app/            # App router pages
│   ├── components/     # React components
│   ├── lib/            # API client, WebSocket
│   ├── e2e/            # Playwright tests
│   └── Dockerfile      # Production image
│
├── websocket/          # WebSocket service
│   └── app/main.py
│
├── infrastructure/gcp/ # Terraform IaC
│   ├── main.tf         # Core config
│   ├── cloud-sql.tf    # Database
│   ├── memorystore.tf  # Redis
│   ├── storage.tf      # GCS buckets
│   ├── vpc.tf          # Networking
│   ├── cloud-run.tf    # Service accounts
│   └── terraform.tfvars # Your config (gitignored)
│
├── docs/               # All documentation
│   ├── QUICKSTART.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── QUICK_REFERENCE.md
│   ├── TESTING.md
│   ├── DEPLOYMENT_STATUS.md
│   ├── GCP_DEPLOYMENT_CHECKLIST.md
│   └── KNOWLEDGE_TRANSFER.md (this file)
│
└── docker-compose.yml  # Local development
```

---

## 🔑 Important Credentials & Config

### GCP Project
- **Project ID**: rehearsekit
- **Project Number**: 748316872223
- **Region**: us-central1
- **Zone**: us-central1-a

### Database Connection
```
Host: 10.215.0.3
Port: 5432
Database: rehearsekit
User: rehearsekit
Password: In infrastructure/gcp/terraform.tfvars
Connection: rehearsekit:us-central1:rehearsekit-postgres-production
```

### Redis Connection
```
Host: 10.215.1.3
Port: 6379
No password (private VPC)
```

### Service Account
```
Email: rehearsekit-cloud-run@rehearsekit.iam.gserviceaccount.com
Roles: Cloud SQL Client, Storage Object Admin
```

### Compute Engine Worker VM
```
Name: rehearsekit-worker
Zone: us-central1-a
IP: 34.45.90.110
Type: n1-standard-4 (4 vCPU, 15GB RAM)
```

---

## 🐛 Debugging Commands

### Check Build Status
```bash
# Current builds
gcloud builds list --limit=5

# Specific build
gcloud builds log BUILD_ID

# Wait for build
gcloud builds list --limit=1 --format="value(status)"
```

### Check Service Health

```bash
# All Cloud Run services
gcloud run services list --region=us-central1

# Specific service
gcloud run services describe rehearsekit-backend --region=us-central1

# Service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rehearsekit-backend" --limit=50
```

### Check Worker on VM

```bash
# SSH to worker
gcloud compute ssh rehearsekit-worker --zone=us-central1-a

# Inside VM:
docker ps                      # Check container running
docker logs $(docker ps -q)    # View logs
docker restart $(docker ps -q) # Restart worker
```

### Check Database

```bash
# List instances
gcloud sql instances list

# Describe instance
gcloud sql instances describe rehearsekit-postgres-production
```

### Check Redis

```bash
# List instances  
gcloud redis instances list --region=us-central1

# Describe instance
gcloud redis instances describe rehearsekit-redis-production --region=us-central1
```

---

## 🔄 Common Tasks

### Create a Test Job (Local)

```bash
curl -X POST http://localhost:8000/api/jobs/create \
  -F "project_name=Test Song" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

### Create a Test Job (Cloud)

```bash
curl -X POST https://rehearsekit-backend-748316872223.us-central1.run.app/api/jobs/create \
  -F "project_name=Cloud Test" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=VIDEO_ID"
```

### Monitor Job Progress

```bash
JOB_ID="your-job-id"

# Local
watch -n 2 "curl -s http://localhost:8000/api/jobs/\$JOB_ID | jq '.status, .progress_percent'"

# Cloud
watch -n 5 "curl -s https://rehearsekit-backend-748316872223.us-central1.run.app/api/jobs/\$JOB_ID | jq '.status, .progress_percent'"
```

### View Generated Packages

```bash
# Local
ls -lh tmp/storage/*.zip
unzip -l tmp/storage/JOB_ID.zip

# Cloud (via API)
curl https://rehearsekit-backend-748316872223.us-central1.run.app/api/jobs/JOB_ID/download
```

---

## 📝 Tomorrow's Priorities

### 1. Complete Backend Deployment (IN PROGRESS)
**Current Status**: Build running (check: `gcloud builds list --limit=1`)

**When build completes**:
```bash
# Deploy
gcloud run deploy rehearsekit-backend \
  --image gcr.io/rehearsekit/rehearsekit-backend:latest \
  --region us-central1

# Test
curl https://rehearsekit-backend-748316872223.us-central1.run.app/api/health
```

### 2. Fix YouTube Bot Detection (HIGH PRIORITY)

**Option A**: Add cookie support
```python
# In backend/app/services/audio.py, download_youtube()
'cookiesfrombrowser': ('chrome',),  # or 'firefox', 'safari'
```

**Option B**: Test different videos
```
# Videos that often work from cloud:
https://www.youtube.com/watch?v=C0DPdy98e4c  # Test Card F
https://www.youtube.com/watch?v=BaW_jenozKc  # Public domain music
```

**Option C**: Focus on FLAC upload feature (no YouTube dependency)

### 3. Test FLAC Upload (After 1GB limit deployed)

**Test Files**:
- Create small test FLAC (10-30 seconds)
- Upload via https://rehearsekit-frontend-748316872223.us-central1.run.app

**Expected**: Should work with 1GB limit

### 4. UI/UX Polish

Already done:
- ✅ Favicon (no 404s)
- ✅ Clear quality buttons (5 min vs 15 min estimates)
- ✅ Processing time displayed

Still needed:
- Error message improvements
- Loading states
- Success animations

---

## 🛠️ Development Workflow

### Making Code Changes

1. **Edit locally**
   ```bash
   # Make changes in your IDE
   vim backend/app/services/audio.py
   ```

2. **Test locally**
   ```bash
   docker-compose up --build backend worker
   # Test at http://localhost:3000
   ```

3. **Commit**
   ```bash
   git add -A
   git commit -m "Description"
   git push
   ```

4. **Deploy to cloud**
   ```bash
   # Backend
   gcloud builds submit backend/ --tag gcr.io/rehearsekit/rehearsekit-backend:latest
   gcloud run deploy rehearsekit-backend --image gcr.io/rehearsekit/rehearsekit-backend:latest --region us-central1
   
   # Worker (if backend changes affect worker)
   gcloud compute ssh rehearsekit-worker --zone=us-central1-a
   docker pull gcr.io/rehearsekit/rehearsekit-backend:latest
   docker restart $(docker ps -q)
   ```

---

## 📊 Testing

### Local Testing (WORKS PERFECTLY)
```bash
cd /Users/i065699/work/projects/personal/RehearseKit

# Start services
docker-compose up

# Create job
# Open http://localhost:3000
# Upload FLAC or paste YouTube URL
# Watch it process
# Download package
```

### Cloud Testing (Partially Working)
```bash
# Open cloud frontend
open https://rehearsekit-frontend-748316872223.us-central1.run.app

# Issues:
# - YouTube: Bot detection
# - FLAC: 413 error (being fixed)
```

### Playwright E2E Tests
```bash
cd frontend

# Run tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed
```

Tests location: `frontend/e2e/*.spec.ts`

---

## 🔐 Security & Access

### GitHub Actions
**Status**: Disabled (to stop failed deployment emails)
**Location**: `.github/workflows/*.yml`
**Note**: All workflows set to `workflow_dispatch` (manual trigger only)

To re-enable auto-deploy:
- Configure GitHub Secrets (see `docs/GCP_DEPLOYMENT_CHECKLIST.md`)
- Uncomment `push:` triggers in workflow files

### GCP Authentication

```bash
# Check current project
gcloud config get-value project

# List authenticated accounts
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Application default credentials (for Terraform)
gcloud auth application-default login
```

---

## 💡 Key Learnings

### Technical Decisions Made

1. **DAWproject over .cpr**: Open interchange format instead of proprietary Cubase format
2. **Torch 2.2.0 + NumPy <2.0**: Required for Demucs compatibility
3. **FLAC intermediate format**: Demucs outputs FLAC, we convert to WAV
4. **FormData for all API requests**: Backend expects multipart/form-data
5. **Compute Engine for worker**: Cloud Run doesn't work well for background workers
6. **Next.js build-time env vars**: Must be baked into build, not set at runtime

### What Doesn't Work on Cloud Run

- ❌ Long-running background workers (Celery)
- ❌ Processes without HTTP endpoints
- ✅ Solution: Use Compute Engine for worker

### YouTube Download Challenges

- Cloud IPs are heavily rate-limited/blocked
- Bot detection is aggressive
- Cookie-based auth is most reliable (not implemented yet)
- Some videos work, most don't from cloud

---

## 📚 Documentation

All docs in `docs/` folder (per your requirement):

| File | Purpose |
|------|---------|
| QUICKSTART.md | 5-minute setup guide |
| DEVELOPMENT_GUIDE.md | Complete development guide |
| QUICK_REFERENCE.md | One-page cheat sheet |
| TESTING.md | Test results (21/21 passed locally) |
| DEPLOYMENT_STATUS.md | Current deployment info |
| GCP_DEPLOYMENT_CHECKLIST.md | Step-by-step GCP deployment |
| api.md | API reference |
| deployment.md | General deployment guide |
| local-development.md | Local dev setup |
| KNOWLEDGE_TRANSFER.md | This document |

---

## 🎯 Immediate Next Steps

### When You Return Tomorrow

1. **Check backend build finished**:
   ```bash
   gcloud builds list --limit=1
   ```

2. **If SUCCESS, deploy**:
   ```bash
   gcloud run deploy rehearsekit-backend \
     --image gcr.io/rehearsekit/rehearsekit-backend:latest \
     --region us-central1
   ```

3. **Test FLAC upload** at cloud frontend

4. **Fix YouTube** OR **Focus on FLAC as primary method**

---

## 🔍 Troubleshooting Reference

### Services Won't Start
```bash
docker-compose down
docker-compose up --build
```

### Job Stuck in PENDING
```bash
# Check worker
docker-compose logs worker  # Local
gcloud compute ssh rehearsekit-worker --zone=us-central1-a  # Cloud
```

### CORS Errors
```bash
# Verify CORS config
grep -A 5 "CORS_ORIGINS" backend/app/core/config.py

# Test CORS
curl -H "Origin: https://rehearsekit-frontend-748316872223.us-central1.run.app" \
  -X OPTIONS YOUR_BACKEND_URL/api/jobs/create -I
```

### 413 Content Too Large
```bash
# Check FastAPI config
grep "max_request_body_size" backend/app/main.py

# Should be: 1024 * 1024 * 1024 (1GB)
```

---

## 💰 Cost Management

### Current Monthly Costs
- **Cloud SQL**: $10
- **Redis**: $30  
- **Worker VM**: $120
- **Cloud Run**: $5-10
- **Storage**: $2
- **Total**: ~$167/month

### Cost Optimization Options

1. **Stop worker when not in use**:
   ```bash
   gcloud compute instances stop rehearsekit-worker --zone=us-central1-a
   # Saves ~$120/month when stopped
   ```

2. **Use smaller worker VM**:
   ```bash
   # Change to n1-standard-2 (half the cost)
   # Slower processing but ~$60/month instead of $120
   ```

3. **Smaller Redis**:
   ```bash
   # Current: 1GB ($30/month)
   # Could use: 0.5GB ($15/month) via Terraform
   ```

---

## 🎓 Technical Context

### Audio Processing Pipeline

```
1. Input (YouTube URL or FLAC file)
   ↓
2. Download/Upload
   ↓  
3. Convert to WAV (24-bit/48kHz) - FFmpeg
   ↓
4. Detect Tempo (Librosa beat tracking)
   ↓
5. Separate Stems (Demucs AI model)
   - Downloads 80MB model on first run
   - Outputs: vocals.flac, drums.flac, bass.flac, other.flac
   ↓
6. Convert stems to WAV (FFmpeg)
   ↓
7. Generate DAWproject (XML in ZIP with audio)
   ↓
8. Package everything (ZIP: stems/ + .dawproject + README.txt)
   ↓
9. Upload to storage (local or GCS)
   ↓
10. Mark job COMPLETED
```

**Processing Time**:
- Fast mode: ~5 minutes for 3-minute song
- High quality: ~15 minutes for 3-minute song

### Database Schema

**jobs table**:
- id (UUID, primary key)
- status (enum: PENDING, CONVERTING, ANALYZING, SEPARATING, FINALIZING, PACKAGING, COMPLETED, FAILED)
- input_type (enum: upload, youtube)
- input_url (YouTube URL if applicable)
- project_name (string)
- quality_mode (enum: fast, high)
- detected_bpm (float, nullable)
- manual_bpm (float, nullable)
- progress_percent (integer, 0-100)
- error_message (text, nullable)
- source_file_path (string, GCS or local path)
- stems_folder_path (string)
- package_path (string, final ZIP location)
- created_at (timestamp)
- updated_at (timestamp)
- completed_at (timestamp, nullable)

### Environment Variables

**Backend** (Cloud Run):
```
DATABASE_URL=postgresql+asyncpg://rehearsekit:PASS@/rehearsekit?host=/cloudsql/CONNECTION
REDIS_URL=redis://10.215.1.3:6379/0
CELERY_BROKER_URL=redis://10.215.1.3:6379/0
CELERY_RESULT_BACKEND=redis://10.215.1.3:6379/1
GCS_BUCKET_UPLOADS=rehearsekit-uploads
GCS_BUCKET_STEMS=rehearsekit-stems
GCS_BUCKET_PACKAGES=rehearsekit-packages
STORAGE_MODE=gcs
APP_ENV=production
```

**Worker** (Compute Engine):
Same as backend, but connects directly to private IPs

**Frontend** (Cloud Run):
```
NEXT_PUBLIC_API_URL=https://rehearsekit-backend-748316872223.us-central1.run.app
NEXT_PUBLIC_WS_URL=wss://rehearsekit-websocket-748316872223.us-central1.run.app
NEXT_PUBLIC_APP_NAME=RehearseKit
```

**IMPORTANT**: Next.js bakes `NEXT_PUBLIC_*` at build time, not runtime!
Must rebuild frontend when changing these values.

---

## ⚠️ Known Issues & Gotchas

### 1. Next.js Environment Variables
- `NEXT_PUBLIC_*` vars are compiled into JavaScript at build time
- Setting env vars after deployment doesn't work
- Must rebuild when changing: `gcloud builds submit frontend/`

### 2. Frontend Environment Variable Updates
When redeploying frontend, must set env vars:
```bash
gcloud run services update rehearsekit-frontend \
  --region us-central1 \
  --update-env-vars "NEXT_PUBLIC_API_URL=https://rehearsekit-backend-...,NEXT_PUBLIC_WS_URL=wss://rehearsekit-websocket-..."
```

### 3. CORS Gets Reset
Every backend rebuild needs CORS URLs in code (not env vars).
File: `backend/app/core/config.py`

### 4. Worker Can't Use Cloud Run
Background workers need Compute Engine or GKE.
Cloud Run requires HTTP endpoints.

### 5. YouTube Downloads From Cloud
Cloud IPs are blocked by YouTube's bot detection.
Local downloads work fine.

### 6. Large File Uploads
Default limit is too small for FLAC files.
Set `max_request_body_size=1GB` in FastAPI.

---

## 📞 Where to Find Help

### In This Repo
- README.md - Project overview
- docs/QUICK_REFERENCE.md - Command cheatsheet
- docs/DEVELOPMENT_GUIDE.md - Detailed dev guide
- docs/api.md - API documentation

### External
- Demucs: https://github.com/facebookresearch/demucs
- yt-dlp: https://github.com/yt-dlp/yt-dlp  
- DAWproject: https://github.com/bitwig/dawproject
- FastAPI: https://fastapi.tiangolo.com
- Next.js: https://nextjs.org/docs

---

## ✅ What Actually Works Right Now

### Local (100% Functional)
- ✅ Complete pipeline working
- ✅ 8+ jobs processed successfully
- ✅ YouTube downloads work
- ✅ FLAC uploads work
- ✅ Stem separation works
- ✅ DAWproject generation works
- ✅ Downloads work
- ✅ All features tested

### Cloud (Partially Functional)
- ✅ Frontend UI loads
- ✅ Backend API responds
- ✅ Database connected
- ✅ Redis connected
- ✅ Worker running (Compute Engine)
- ✅ Worker processes jobs
- ❌ YouTube downloads fail (bot detection)
- ⏳ FLAC uploads (413 error - fix deploying)

---

## 🎯 Success Criteria

**MVP Success** (90% achieved):
- ✅ Local environment fully functional
- ✅ Cloud infrastructure deployed
- ✅ Worker running in cloud
- ⏳ FLAC uploads working in cloud (fix in progress)
- ❌ YouTube working in cloud (requires more work)

**Recommended Approach**:
- Use local for development and actual processing
- Use cloud as demo/showcase
