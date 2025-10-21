# RehearseKit - Project Status Before Stage 3

**Date:** October 21, 2025  
**Status:** Pre-MVP + Stage 2 Complete & Deployed ✅  
**Deployment:** TrueNAS SCALE (http://10.0.0.155:30070) + Public (https://rehearsekit.uk)

---

## 📋 Project Overview

**RehearseKit** is an AI-powered audio stem separation tool that processes audio files into individual instrument tracks and packages them into DAW-ready project files (.dawproject format).

### Core Functionality
- **Input Sources:** File upload (MP3, WAV, FLAC) or YouTube URL
- **Processing:** AI-powered stem separation using Demucs
- **Output:** Individual stem files + .dawproject package for DAW import
- **Supported DAWs:** Cubase 14 Pro, Studio One 7, Bitwig, Reaper

---

## ✅ Completed: Pre-MVP (Deployed)

### Backend (FastAPI + Celery)
- ✅ Multi-format audio upload (MP3, WAV, FLAC)
- ✅ YouTube audio extraction (yt-dlp)
- ✅ BPM detection (librosa)
- ✅ AI stem separation (Demucs - 4-stem: vocals, drums, bass, other)
- ✅ Quality modes: Fast (htdemucs) & High (htdemucs_ft)
- ✅ .dawproject generation with proper metadata
- ✅ PostgreSQL for job persistence
- ✅ Redis for Celery task queue
- ✅ Local storage on TrueNAS datasets
- ✅ Real-time progress updates via WebSocket

### Frontend (Next.js 14 + React Query)
- ✅ Audio file upload with drag & drop
- ✅ YouTube URL processing
- ✅ Job queue management
- ✅ Real-time progress tracking
- ✅ Download package functionality
- ✅ Job details page
- ✅ Responsive UI with shadcn/ui + Tailwind

### Deployment
- ✅ Docker containerization (4 services)
- ✅ TrueNAS SCALE deployment (ports 30070-30072)
- ✅ Cloudflare Tunnel for public access (https://rehearsekit.uk)
- ✅ GitHub Actions CI/CD pipeline
- ✅ Automated image builds and pushes to Docker Hub

---

## ✅ Completed: Stage 2 (Deployed Today)

### Audio Preview Features
- ✅ **Waveform Visualization** (WaveSurfer.js integration)
  - File upload preview before processing
  - Source audio waveform on job details page
  - YouTube preview waveform
- ✅ **Keyboard Controls**
  - Spacebar: play/pause
  - Arrow keys: seek forward/backward
- ✅ **YouTube Two-Step Workflow**
  - "Fetch Audio" button → preview before processing
  - Shows thumbnail, title, and waveform
  - "Process Stems" button to start job
  - Saves source file for later playback
- ✅ **Enhanced Job Details Page**
  - Source audio playback with waveform
  - YouTube metadata display (thumbnail + title)
  - Cancel job button (for in-progress jobs)
  - Delete job button with confirmation dialog

### Critical Bug Fixes (Today's Session)
- ✅ **Fixed API URL Detection**
  - **Issue:** `NEXT_PUBLIC_API_URL` hardcoded at build time → always `localhost:8000`
  - **Root Cause:** Next.js bakes `NEXT_PUBLIC_*` env vars into bundle during build
  - **Solution:** 
    - Removed `NEXT_PUBLIC_API_URL` from Dockerfile and docker-compose
    - Created centralized `getApiUrl()` function with runtime detection
    - All components now import and use shared function
  - **Result:** Dynamic port calculation works (`frontend_port + 1`)
    - Port 30070 → API calls to 30071 ✅
    - Port 3000 → API calls to 8000 ✅
    - HTTPS → uses same origin (Cloudflare proxy) ✅

- ✅ **Fixed Directory Naming Conflicts**
  - **Issue:** `frontend/lib/` ignored by global Python `.gitignore`
  - **Solution:** Renamed `frontend/lib/` → `frontend/utils/`
  - Updated all imports from `@/lib/*` to `@/utils/*`

- ✅ **Fixed Download in Brave Browser**
  - **Issue:** Brave blocks downloads due to mixed content/security
  - **Solution:** Fetch + Blob method instead of direct `<a>` tag download
  - Works in all browsers now (Chrome, Firefox, Brave, Safari)

---

## 🏗️ Technical Architecture

### Services
```
Frontend:    Next.js 14 (port 30070)
Backend:     FastAPI (port 30071)
WebSocket:   FastAPI WebSocket (port 30072)
Worker:      Celery (background processing)
PostgreSQL:  Existing TrueNAS app (port 65430)
Redis:       Existing TrueNAS app (port 30059)
```

### Storage
```
/mnt/Odin/apps/rehearsekit/storage/
├── uploads/        # Original uploaded files
├── youtube/        # Downloaded YouTube audio
├── stems/          # Separated stem files
└── packages/       # Final .dawproject archives
```

### Docker Images
- `kossoy/rehearsekit-frontend:latest`
- `kossoy/rehearsekit-backend:latest`
- `kossoy/rehearsekit-websocket:latest`

### Deployment Flow
1. Push to `main` branch
2. GitHub Actions builds images
3. Pushes to Docker Hub
4. SSH to TrueNAS → `docker compose pull && docker compose up -d`

---

## 📊 Current Limitations & Known Issues

### Minor Issues
1. **Studio One 7:** Opens .dawproject at 44.1 kHz (requires manual change to 48 kHz)
   - **Impact:** 5-second workaround in Song Setup
   - **Root Cause:** Studio One limitation, not RehearseKit
   
2. **WebSocket on HTTPS:** Shows "Not Secure" warning on https://rehearsekit.uk
   - **Impact:** No real-time updates (must refresh page)
   - **Workaround:** Works perfectly on http://10.0.0.155:30070
   - **Fix:** Requires Cloudflare WebSocket configuration

3. **Cubase 14 Pro:** .dawproject import requires specific folder structure
   - **Issue:** Files appear grayed out during import
   - **Root Cause:** Cubase expects folder selection, then file selection
   - **Details:** See `docs/ideas/dawproject-cubase-import-issue.md`

### Current Stem Separation
- **4 stems only:** vocals, drums, bass, other
- No guitar/synth separation
- No clean/distorted guitar split

---

## 📝 Code Quality & Best Practices

### What We Did Right
- ✅ TypeScript strict mode
- ✅ Centralized API client with runtime URL detection
- ✅ React Query for server state management
- ✅ Proper error handling with user-friendly messages
- ✅ Real-time updates via WebSocket
- ✅ Progress tracking for long-running jobs
- ✅ Responsive UI with accessible components
- ✅ Docker multi-stage builds for optimization
- ✅ Health checks for all services
- ✅ Comprehensive logging

### Recent Refactoring
- Removed 48 lines of duplicate API URL logic
- Centralized `getApiUrl()` function
- Cleaned up gitignore conflicts
- Fixed component coupling issues

---

## 🎯 Next: Stage 3 Features

### 1. Waveform Trimming
- Region selection with start/end markers
- Visual feedback on waveform
- Send trim parameters to backend for processing
- Only process selected portion of audio

### 2. Reprocess Button
- Upgrade quality on existing jobs (fast → high)
- Keep same source file
- Avoid re-uploading/re-downloading

### 3. Mix Preview
- Individual stem volume controls
- Preview mix before download
- Integrate audio mixer UI
- Reference: https://audiomixer.io/?ref=madewithvuejs.com

### 4. Fix Cubase DAWproject Import Issue
- **Problem:** Cubase expects folder selection, then file selection
- **Current State:** .dawproject files appear grayed out
- **Solution:** Modify package structure to include project folder
- **Expected Structure:**
  ```
  📁 ProjectName/
     └── 📄 project.dawproject
     └── 📁 Audio Files/
         └── (stem files)
  ```
- **Implementation:**
  - Update backend `dawproject_generator.py` to create folder structure
  - Modify packaging logic to ZIP with parent folder
  - Test import in Cubase 14 Pro
  - Update documentation with import instructions

---

## 📚 Documentation Status

### Created Documents
- ✅ `docs/DEPLOYMENT_STATUS.md` - TrueNAS deployment guide
- ✅ `docs/DEVELOPMENT_GUIDE.md` - Local development setup
- ✅ `docs/TESTING.md` - E2E testing with Playwright
- ✅ `docs/QUICK_REFERENCE.md` - Common commands
- ✅ `docs/cubase-import-guide.md` - DAW import instructions
- ✅ `docs/ideas/mvp-stage-2.md` - Stage 2 & 3 planning
- ✅ `docs/ideas/dawproject-cubase-import-issue.md` - Cubase issue analysis

---

## 🚀 Testing Coverage

### E2E Tests (Playwright)
- ✅ Basic health checks
- ✅ Job creation flow
- ✅ Download functionality
- ✅ Complete upload → process → download workflow
- ✅ Cloud environment testing

### Manual Testing
- ✅ File upload (MP3, WAV, FLAC)
- ✅ YouTube URL processing
- ✅ Waveform preview
- ✅ Job cancellation
- ✅ Job deletion
- ✅ Download in all major browsers
- ✅ DAW import (Studio One 7, Cubase 14 Pro)

---

## 💡 Lessons Learned (Today's Debugging Session)

### Environment Variables in Next.js
- `NEXT_PUBLIC_*` variables are **baked into bundle at build time**
- Cannot be changed at runtime
- For dynamic behavior, use runtime detection (window.location)
- Never rely on env vars for port/URL calculation in production

### Global Gitignore
- Global `.gitignore` can override project-specific rules
- Use project-specific directory names to avoid conflicts
- `lib/` is standard for Python packages → use `utils/` for frontend

### Component Architecture
- Centralize API logic in one place
- Avoid duplicating URL/port calculation across components
- Export utility functions for reuse
- Use TypeScript to enforce consistency

---

## 📊 Metrics

### Performance
- YouTube fetch: ~5-10 seconds (depends on video length)
- Fast separation: ~30-60 seconds (3-4 min song)
- High quality: ~2-3 minutes (3-4 min song)
- Package generation: ~5 seconds

### Storage (per job)
- Source file: ~5-15 MB
- Stems (4 files): ~20-60 MB total
- .dawproject package: ~25-75 MB

### Current Scale
- Single TrueNAS server
- Celery worker: 2 concurrent jobs
- No job limits or quotas yet
- No user authentication yet

---

## 🔒 Security Status

### Current State
- ⚠️ No authentication (public access)
- ⚠️ No rate limiting
- ⚠️ No CORS restrictions (allows all origins)
- ✅ Input validation on file uploads
- ✅ File type restrictions (audio only)
- ✅ Sandboxed Docker containers

### Required for Production
- [ ] Google OAuth authentication
- [ ] User accounts and job ownership
- [ ] Rate limiting per user
- [ ] Storage quotas
- [ ] CORS whitelist
- [ ] API key management

---

## 🎵 Ready for Stage 3!

**All systems operational. Delete functionality verified. Time to add:**
1. Trimming
2. Reprocessing
3. Mix preview
4. Cubase import fix

**Deployment target:** http://10.0.0.155:30070 (staging) → https://rehearsekit.uk (production)

