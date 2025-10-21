# RehearseKit - Development Guide

**Your Complete Development & Deployment Reference**

---

## 🎯 Current Status

### ✅ What's Working

**Local Environment** (http://localhost:3000):
- All 6 services running via Docker Compose
- 7 successful jobs processed
- 4 packages generated (33 MB each)
- Complete audio pipeline tested

**Cloud Environment** (GCP):
- Backend API: https://rehearsekit-backend-748316872223.us-central1.run.app
- Database: Cloud SQL PostgreSQL (connected)
- Cache: Memorystore Redis (connected)
- Storage: 3 GCS buckets created

---

## 💻 Local Development

### Quick Commands

```bash
# Navigate to project
cd /Users/i065699/work/projects/personal/RehearseKit

# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f worker

# Restart a service
docker-compose restart worker

# Rebuild after code changes
docker-compose up --build backend

# Stop all services
docker-compose down
```

### Create Test Jobs

**Via Web Interface**:
1. Open http://localhost:3000
2. Paste YouTube URL
3. Enter project name
4. Click "Start Processing"
5. Watch progress!

**Via API (curl)**:
```bash
# Create job
curl -X POST http://localhost:8000/api/jobs/create \
  -F "project_name=My Test Song" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Monitor progress
JOB_ID="your-job-id-here"
watch -n 2 "curl -s http://localhost:8000/api/jobs/\$JOB_ID | jq '.status, .progress_percent'"

# Download result
ls -lh tmp/storage/*.zip
```

### Access Databases

```bash
# PostgreSQL
docker-compose exec postgres psql -U rehearsekit -d rehearsekit

# Useful SQL queries
SELECT project_name, status, progress_percent FROM jobs ORDER BY created_at DESC LIMIT 10;
SELECT COUNT(*), status FROM jobs GROUP BY status;

# Redis
docker-compose exec redis redis-cli
KEYS *
GET some-key
```

### View Generated Packages

```bash
# List all packages
ls -lh tmp/storage/

# Extract a package
unzip -l tmp/storage/116a967a-e50f-4d29-8afc-0e15cd374568.zip

# Copy to desktop
cp tmp/storage/116a967a-e50f-4d29-8afc-0e15cd374568.zip ~/Desktop/my_song.zip
```

---

## ☁️ Cloud Environment

### Access Live Backend

**API Documentation**:
https://rehearsekit-backend-748316872223.us-central1.run.app/docs

**Create Cloud Jobs**:
```bash
BACKEND_URL="https://rehearsekit-backend-748316872223.us-central1.run.app"

# Create job
curl -X POST $BACKEND_URL/api/jobs/create \
  -F "project_name=Cloud Test" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"

# Check health
curl $BACKEND_URL/api/health | jq

# List jobs
curl $BACKEND_URL/api/jobs | jq '.jobs[]|{name:.project_name, status:.status}'
```

**Note**: Jobs will stay PENDING until worker is deployed. Worker deployment guide below.

### View Cloud Resources

```bash
# Cloud SQL instance
gcloud sql instances describe rehearsekit-postgres-production

# Redis instance
gcloud redis instances describe rehearsekit-redis-production --region=us-central1

# Storage buckets
gsutil ls -L gs://rehearsekit-uploads
gsutil ls -L gs://rehearsekit-stems
gsutil ls -L gs://rehearsekit-packages

# Cloud Run services
gcloud run services list --region=us-central1
```

### Monitor Cloud Resources

**Cloud Console Links**:
- Logs: https://console.cloud.google.com/logs?project=rehearsekit
- Monitoring: https://console.cloud.google.com/monitoring?project=rehearsekit
- Cloud Run: https://console.cloud.google.com/run?project=rehearsekit
- Cloud SQL: https://console.cloud.google.com/sql?project=rehearsekit

---

## 🚀 Deploy Additional Services

### Deploy Worker (Process Jobs in Cloud)

```bash
cd /Users/i065699/work/projects/personal/RehearseKit

# Build worker image (uses same Dockerfile as backend)
gcloud builds submit backend/ \
  --tag gcr.io/rehearsekit/rehearsekit-worker:latest

# Deploy to Cloud Run
gcloud run deploy rehearsekit-worker \
  --image gcr.io/rehearsekit/rehearsekit-worker:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars "DATABASE_URL=<from-terraform-output>" \
  --set-env-vars "REDIS_URL=redis://10.215.1.3:6379/0" \
  --set-env-vars "CELERY_BROKER_URL=redis://10.215.1.3:6379/0" \
  --set-env-vars "STORAGE_MODE=gcs" \
  --command celery \
  --args "-A,app.celery_app,worker,--loglevel=info" \
  --service-account rehearsekit-cloud-run@rehearsekit.iam.gserviceaccount.com \
  --vpc-connector rehearsekit-conn-prod \
  --add-cloudsql-instances rehearsekit:us-central1:rehearsekit-postgres-production \
  --memory 4Gi \
  --cpu 4 \
  --min-instances 1 \
  --timeout 3600s
```

### Deploy Frontend

```bash
# Build frontend
gcloud builds submit frontend/ \
  --tag gcr.io/rehearsekit/rehearsekit-frontend:latest

# Deploy
gcloud run deploy rehearsekit-frontend \
  --image gcr.io/rehearsekit/rehearsekit-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --memory 512Mi \
  --port 3000
```

### Deploy WebSocket

```bash
# Build
gcloud builds submit websocket/ \
  --tag gcr.io/rehearsekit/rehearsekit-websocket:latest

# Deploy
gcloud run deploy rehearsekit-websocket \
  --image gcr.io/rehearsekit/rehearsekit-websocket:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "REDIS_URL=redis://10.215.1.3:6379/0" \
  --vpc-connector rehearsekit-conn-prod \
  --memory 512Mi \
  --min-instances 1 \
  --port 8001
```

---

## 🛠️ Development Workflow

### Making Changes

1. **Edit code** in your IDE
2. **Test locally** with `docker-compose up --build`
3. **Commit changes** `git add . && git commit -m "message"`
4. **Push to GitHub** `git push origin main`
5. **Deploy to cloud** (manual or via GitHub Actions)

### Testing Workflow

```bash
# 1. Make changes to backend
vim backend/app/services/audio.py

# 2. Rebuild and restart
docker-compose up --build backend worker

# 3. Test the change
curl -X POST http://localhost:8000/api/jobs/create ...

# 4. Check worker logs
docker-compose logs -f worker
```

### Debugging

```bash
# Check why a service is failing
docker-compose logs backend

# Access container shell
docker-compose exec backend bash

# Check Python environment
docker-compose exec worker python --version
docker-compose exec worker pip list

# Test a service manually
docker-compose exec worker python -c "from app.services.audio import AudioService; print('OK')"
```

---

## 📊 Monitoring & Metrics

### Local Monitoring

```bash
# Service health
curl http://localhost:8000/api/health

# Active jobs
curl http://localhost:8000/api/jobs | jq '.jobs[]|select(.status!="COMPLETED")'

# Docker resource usage
docker stats --no-stream
```

### Cloud Monitoring

```bash
# Backend logs
gcloud logging read "resource.labels.service_name=rehearsekit-backend" \
  --limit=20 \
  --format="table(timestamp,textPayload)"

# Tail logs
gcloud logging tail "resource.labels.service_name=rehearsekit-backend"

# Check errors
gcloud logging read "resource.labels.service_name=rehearsekit-backend AND severity>=ERROR" \
  --limit=50
```

---

## 🎵 Example: Process a Song

### Local Processing

```bash
# Start services
docker-compose up -d

# Create job
curl -X POST http://localhost:8000/api/jobs/create \
  -F "project_name=Never Gonna Give You Up" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Monitor (wait ~5-10 minutes for 3:30 song)
JOB_ID="<from-response>"
watch -n 5 "curl -s http://localhost:8000/api/jobs/$JOB_ID | jq '.status, .progress_percent'"

# Download when complete
cp tmp/storage/$JOB_ID.zip ~/Desktop/never_gonna_give_you_up.zip

# Extract
unzip ~/Desktop/never_gonna_give_you_up.zip -d ~/Desktop/stems/

# Import .dawproject into Cubase/Bitwig/Studio One
```

### Cloud Processing (After Worker Deployed)

```bash
BACKEND_URL="https://rehearsekit-backend-748316872223.us-central1.run.app"

# Create job
curl -X POST $BACKEND_URL/api/jobs/create \
  -F "project_name=My Cloud Song" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=VIDEO_ID"

# Monitor
JOB_ID="<from-response>"
watch -n 10 "curl -s $BACKEND_URL/api/jobs/$JOB_ID | jq '.status, .progress_percent, .detected_bpm'"

# Download
curl -s $BACKEND_URL/api/jobs/$JOB_ID/download | jq -r '.url' | xargs curl -o my_song.zip
```

---

## 🔧 Common Tasks

### Add a New Feature

1. Create feature branch
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. Make changes and test locally
   ```bash
   docker-compose up --build
   ```

3. Commit and push
   ```bash
   git add .
   git commit -m "Add my new feature"
   git push origin feature/my-new-feature
   ```

4. Create Pull Request on GitHub
5. Merge to main → Auto-deploys to GCP (if GitHub Actions configured)

### Update Dependencies

**Backend**:
```bash
cd backend
source venv/bin/activate
pip install new-package
pip freeze | grep new-package >> requirements.txt
docker-compose up --build backend worker
```

**Frontend**:
```bash
cd frontend
npm install new-package
docker-compose up --build frontend
```

### Reset Local Environment

```bash
# Stop everything
docker-compose down

# Remove volumes (clears database)
docker-compose down -v

# Rebuild from scratch
docker-compose up --build

# Run migrations
docker-compose exec backend alembic upgrade head
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview |
| [QUICKSTART.md](docs/QUICKSTART.md) | 5-minute setup guide |
| [STATUS.md](STATUS.md) | MVP completion status |
| [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) | Live deployment info |
| [TESTING.md](docs/TESTING.md) | Test results |
| [local-development.md](docs/local-development.md) | Detailed dev setup |
| [api.md](docs/api.md) | API reference |
| [deployment.md](docs/deployment.md) | GCP deployment |
| [GCP_DEPLOYMENT_CHECKLIST.md](docs/GCP_DEPLOYMENT_CHECKLIST.md) | Step-by-step deployment |

---

## 🎓 Learning & Exploration

### Explore the Codebase

**Frontend**:
```
frontend/
├── app/
│   ├── page.tsx              # Landing page
│   └── jobs/[id]/page.tsx    # Job detail
├── components/
│   ├── audio-uploader.tsx    # Upload UI
│   └── job-card.tsx          # Job display
└── lib/
    ├── api.ts                # API client
    └── websocket.ts          # WebSocket client
```

**Backend**:
```
backend/app/
├── api/
│   ├── jobs.py               # Job endpoints
│   └── health.py             # Health checks
├── services/
│   ├── audio.py              # Audio processing
│   ├── cubase.py             # DAWproject generation
│   └── storage.py            # GCS/local storage
├── tasks/
│   └── audio_processing.py   # Celery tasks
└── models/
    └── job.py                # Database models
```

### Experiment & Learn

**Try Different Songs**:
- Short clips (faster testing)
- Various genres
- Different tempos
- Instrumental vs vocal tracks

**Modify Processing**:
- Edit `AudioService.separate_stems()` for different models
- Adjust tempo detection sensitivity
- Customize DAWproject output

**Test Error Handling**:
- Invalid YouTube URLs
- Corrupted audio
- Service failures

---

## 🚀 Next Development Steps

### Short Term (This Week)

1. **Test with Real Songs**
   - Process 3-5 minute songs
   - Test different genres
   - Verify DAWproject in actual DAW

2. **Deploy Worker to GCP**
   - Process jobs in the cloud
   - Test end-to-end cloud workflow

3. **UI Improvements**
   - Better progress visualization
   - Stem preview player
   - Download button styling

### Medium Term (This Month)

1. **Deploy Full Stack to GCP**
   - Frontend on Cloud Run
   - WebSocket service
   - Custom domain (rehearsekit.uk)

2. **Optimize Performance**
   - Faster stem separation
   - Better tempo detection
   - Progress callback improvements

3. **Enhanced Features**
   - FLAC file upload
   - Manual BPM override UI
   - Batch processing

### Long Term (Future)

1. **User Authentication**
2. **Additional DAW formats**
3. **6-stem separation**
4. **GPU acceleration**
5. **Payment integration**

---

## 💡 Tips & Tricks

### Faster Development

**Hot Reload**:
- Frontend: Changes auto-reload
- Backend: Uvicorn watches files
- Worker: Restart required

**Skip Rebuilds**:
- Use volume mounts (already configured)
- Only rebuild when dependencies change

### Save Time Testing

**Use Short Clips**:
- 10-30 second YouTube videos
- Faster iteration
- Same pipeline verification

**Cache Models**:
- Demucs model downloads once (80 MB)
- Stored in Docker volume
- Persists across restarts

### Monitor Resources

```bash
# Watch Docker resources
docker stats

# Free up space
docker system prune -a

# Check disk usage
docker system df
```

---

## 📞 Getting Help

**Documentation**: Check `docs/` folder  
**API Docs**: http://localhost:8000/docs (local) or cloud URL  
**GitHub**: https://github.com/UnTypeBeats/RehearseKit  
**Status**: See `STATUS.md` and `DEPLOYMENT_STATUS.md`

---

## 🎊 What You've Built

A **production-grade audio processing application** with:

✅ AI-powered stem separation  
✅ Automatic tempo detection  
✅ DAW project generation  
✅ Modern web interface  
✅ RESTful API  
✅ Async job processing  
✅ Cloud-native architecture  
✅ Docker containerization  
✅ GCP deployment ready  
✅ Comprehensive documentation  

**Congratulations!** 🎉

---

*Happy coding! 🎵*

