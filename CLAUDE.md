# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RehearseKit is a self-hosted web application that transforms audio files or YouTube music videos into professionally separated stems with embedded tempo information, automatically generating Cubase project files for musicians.

## Production Deployment (TrueNAS)

The application is deployed on TrueNAS (10.10.0.15) as a unified Docker Compose stack.

### Quick Access
```bash
# SSH to TrueNAS (passwordless, sudo without password)
ssh oleg@10.10.0.15

# View running containers
sudo docker ps --filter 'name=rehearsekit'

# View logs
sudo docker logs -f rehearsekit-backend
sudo docker logs -f rehearsekit-gpu-worker

# Restart stack
cd /mnt/Odin/Applications/RehearseKit/config && sudo docker compose restart

# Check GPU status
nvidia-smi
```

### Service Endpoints

| Service | Internal URL | External URL |
|---------|-------------|--------------|
| Frontend | http://10.10.0.15:30070 | https://rk.oklabs.uk |
| Backend API | http://10.10.0.15:30071 | https://rk.oklabs.uk/api |
| WebSocket | http://10.10.0.15:30072 | https://rk.oklabs.uk/ws |

### Infrastructure

| Component | Location | Details |
|-----------|----------|---------|
| Stack Config | `/mnt/Odin/Applications/RehearseKit/config/docker-compose.yml` | Main compose file |
| Storage | `/mnt/Odin/Applications/RehearseKit/` | Uploads, stems, packages |
| PostgreSQL | TrueNAS (port 65430) | Database: `rehearsekit`, User: `god` |
| Redis | TrueNAS (port 30059) | Celery broker + cache |
| GPU | GTX 750 Ti (2GB VRAM) | DEMUCS_SEGMENT=7 |

### Containers (4 total)

| Container | Role | Health |
|-----------|------|--------|
| rehearsekit-frontend | Next.js UI | Healthy |
| rehearsekit-backend | FastAPI API | Healthy |
| rehearsekit-websocket | Real-time updates | Healthy |
| rehearsekit-gpu-worker | Celery + CUDA | Running |

GPU worker processes all jobs at ~2.6x realtime using GTX 750 Ti.

### Management
- **Portainer:** https://10.10.0.15:31015 (admin / iM#R52CyTf5jGr)
- **Stack name:** `ok-rehearsekit`

## Development Commands

### Full Stack (Docker Compose)
```bash
# Start all services (frontend, backend, worker, websocket, postgres, redis)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Rebuild after dependency changes
docker-compose up --build
```

### Frontend (Next.js 14)
```bash
cd frontend
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Jest unit tests
npm run test:watch   # Jest watch mode
npm run test:coverage # Jest with coverage (85% threshold)
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI
```

### Backend (FastAPI + Celery)
```bash
cd backend
pytest                    # Run all tests
pytest --cov=app          # Tests with coverage
pytest -k "test_name"     # Run specific test

# Worker (runs via docker-compose, or manually):
celery -A app.celery_app worker --loglevel=info --concurrency=2
```

### Database Migrations
```bash
cd backend
alembic upgrade head      # Apply migrations
alembic revision --autogenerate -m "description"  # Create migration
```

## Architecture

### Service Architecture
```
frontend (3000)  →  backend (8000)  →  postgres (5432)
                         ↓                   ↑
                    worker (celery)  ←  redis (6379)
                         ↓
websocket (8001)  ←  redis pub/sub
```

### Processing Pipeline
1. Input Reception → 2. Audio Acquisition (upload or yt-dlp) → 3. Conversion (FFmpeg to 24-bit/48kHz WAV) → 4. Tempo Detection (librosa) → 5. Stem Separation (Demucs AI) → 6. Metadata Embedding (mutagen) → 7. Cubase Project Generation → 8. ZIP Packaging

Job statuses: `PENDING → CONVERTING → ANALYZING → SEPARATING → FINALIZING → PACKAGING → COMPLETED` (or `FAILED`)

### Key Directories

**Frontend (`/frontend`):**
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (audio-uploader, stem-mixer, job-card, etc.)
- `components/ui/` - Shadcn/ui primitives (button, dialog, toast, etc.)
- `contexts/` - React contexts (auth-context.tsx)
- `hooks/` - Custom hooks (use-toast.ts)
- `lib/` - Utility functions

**Backend (`/backend/app`):**
- `api/` - FastAPI route handlers (auth.py, jobs.py, admin.py, health.py)
- `models/` - SQLAlchemy models (job.py, user.py)
- `schemas/` - Pydantic schemas
- `services/` - Business logic services
- `tasks/` - Celery async tasks
- `core/` - Configuration and utilities
- `celery_app.py` - Celery configuration

## API Endpoints

Base: `http://localhost:8000` (dev) or `https://api.rehearsekit.uk` (prod)

- `GET /api/health` - Health check
- `POST /api/jobs/create` - Create processing job (form data: file or input_url)
- `GET /api/jobs` - List jobs (paginated)
- `GET /api/jobs/{job_id}` - Get job details
- `GET /api/jobs/{job_id}/download` - Get signed download URL
- `DELETE /api/jobs/{job_id}` - Delete job

WebSocket: `ws://localhost:8001/jobs/{job_id}/progress` for real-time updates

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

## Tech Stack

**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Shadcn/ui, React Query (TanStack), Zustand, Framer Motion, Howler.js, WaveSurfer.js

**Backend:** FastAPI, SQLAlchemy (async), Alembic, Celery, Redis, PostgreSQL 16

**Audio Processing:** Demucs (AI stem separation), librosa (tempo), FFmpeg, yt-dlp, mutagen

## Environment Variables

Required in `.env`:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `JWT_SECRET_KEY` - JWT signing secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Backend OAuth credentials
- `ADMIN_EMAIL` - Admin user email (default: oleg@befeast.com)

## Testing Strategy

- **Unit Tests:** Jest for frontend components, pytest for backend
- **E2E Tests:** Playwright (3-minute timeout for audio processing)
- **Coverage:** 85% threshold for frontend
- **Audio Components:** Complex audio components (audio-uploader, audio-waveform, stem-mixer) are excluded from unit test coverage and tested via E2E

## Development Guidelines

1. **Bug Fixes:** Always verify fixes in runtime environment before claiming resolution. Document: bug description, root cause, fix applied, verification steps, test results.

2. **Pattern Consistency:** Follow established patterns in the codebase. Review existing implementations before adding new features. Document any new patterns introduced.

3. **Incremental Progress:** Make small, testable changes. Verify each change before proceeding. Maintain working state at all times.

4. **Commit Messages:** Follow conventional commits: `type(scope): subject`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Example: `feat(frontend): add stem preview player`

## Brand Colors

- Kit Blue (Primary): `#2563EB`
- Deep Navy: `#1E293B`
- Rehearsal Purple (Accent): `#7C3AED`
- Success Green: `#10B981`
- Warning Amber: `#F59E0B`
- Error Red: `#EF4444`
