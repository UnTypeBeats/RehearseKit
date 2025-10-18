# RehearseKit - Quick Reference Card

## 🔗 URLs

**Local**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Cloud**:
- Backend API: https://rehearsekit-backend-748316872223.us-central1.run.app
- API Docs: https://rehearsekit-backend-748316872223.us-central1.run.app/docs

**Repository**: https://github.com/UnTypeBeats/RehearseKit

---

## ⚡ Most Common Commands

```bash
# Start local services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f worker

# Test API
curl http://localhost:8000/api/health

# Create job
curl -X POST http://localhost:8000/api/jobs/create \
  -F "project_name=Song" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=VIDEO_ID"

# View packages
ls -lh tmp/storage/*.zip
```

---

## 📊 Infrastructure

**GCP Project**: rehearsekit  
**Region**: us-central1  
**Monthly Cost**: ~$42

| Resource | Name | Connection |
|----------|------|------------|
| Cloud SQL | rehearsekit-postgres-production | 10.215.0.3:5432 |
| Redis | rehearsekit-redis-production | 10.215.1.3:6379 |
| Buckets | rehearsekit-{uploads,stems,packages} | GCS |
| VPC | rehearsekit-vpc-production | Private |

---

## 🎯 Key Files

**Backend**:
- `backend/app/services/audio.py` - Audio processing
- `backend/app/tasks/audio_processing.py` - Celery tasks
- `backend/app/api/jobs.py` - API endpoints

**Frontend**:
- `frontend/app/page.tsx` - Landing page
- `frontend/components/audio-uploader.tsx` - Upload UI
- `frontend/lib/api.ts` - API client

**Infrastructure**:
- `infrastructure/gcp/` - Terraform configs
- `docker-compose.yml` - Local services

---

## 📖 Documentation

- `DEVELOPMENT_GUIDE.md` - Complete dev guide
- `docs/QUICKSTART.md` - Get started quickly
- `docs/TESTING.md` - Test results
- `DEPLOYMENT_STATUS.md` - What's deployed

---

## 🚨 Troubleshooting

**Services won't start**:
```bash
docker-compose down
docker-compose up --build
```

**Job stuck**:
```bash
docker-compose restart worker
docker-compose logs worker
```

**Reset database**:
```bash
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

---

## ✅ Status

- [x] Local MVP: Complete & tested
- [x] Backend deployed to GCP
- [ ] Worker deployed to GCP
- [ ] Frontend deployed to GCP
- [ ] WebSocket deployed to GCP

---

**Last Updated**: October 18, 2025
