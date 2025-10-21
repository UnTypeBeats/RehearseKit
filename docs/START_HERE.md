# 🚀 RehearseKit - Start Here (New Session Quick Reference)

**Last Updated:** October 21, 2025  
**Current Status:** Stage 3 Complete - Production Ready ✅

---

## 📍 Where We Are

**Stage:** Stage 3 Complete (All 4 features deployed)  
**Live URL:** https://rehearsekit.uk  
**Local URL:** http://10.0.0.155:30070  
**Status:** Production Ready 🚀

---

## ✅ What's Working (Stage 3 Complete)

### **All Features Operational:**
1. ✅ **Cubase Import** - Folder-wrapped .dawproject for seamless import
2. ✅ **Waveform Trimming** - Visual region selection with large alerts
3. ✅ **Reprocess Button** - One-click quality upgrades
4. ✅ **Professional DAW Mixer** - Vertical faders, solo/mute, perfect sync

### **Core Features (Pre-MVP + Stage 2):**
- ✅ File upload (MP3, WAV, FLAC)
- ✅ YouTube URL processing
- ✅ AI stem separation (4-stem: vocals, drums, bass, other)
- ✅ .dawproject generation
- ✅ Waveform visualization
- ✅ Real-time progress (WebSocket)
- ✅ Download functionality

---

## 📖 Key Documentation

**Start With These:**
1. **`docs/STAGE_3_HANDOFF.md`** ← MOST IMPORTANT for context transfer
2. **`docs/PROJECT_STATUS_STAGE_3.md`** ← Full project overview
3. **`docs/ideas/mvp-stage-2.md`** ← Feature checklist (all marked complete)

**Technical Details:**
- `docs/STAGE_3_COMPLETE_SUMMARY.md` - All features and fixes
- `docs/STAGE_3_ALL_FIXES.md` - Issue resolutions
- `docs/cubase-import-guide.md` - Cubase workflow

---

## 🔑 Key Files to Know

### **Mixer (Most Complex):**
- `frontend/components/stem-mixer.tsx` (500+ lines)
  - Web Audio API implementation
  - Vertical faders with dB scale
  - Solo/Mute with audio coordination

### **Trimming:**
- `frontend/components/audio-waveform.tsx` (regions plugin)
- `frontend/components/audio-uploader.tsx` (trim UI)
- `backend/app/services/audio.py` (trim_audio function)

### **API:**
- `frontend/utils/api.ts` (API client)
- `backend/app/api/jobs.py` (endpoints)

### **Processing:**
- `backend/app/tasks/audio_processing.py` (main pipeline)

---

## 🎯 Tech Stack

**Frontend:** Next.js 14, React Query, WaveSurfer.js, shadcn/ui, Web Audio API  
**Backend:** FastAPI, Celery, Demucs, librosa, yt-dlp, FFmpeg  
**Infrastructure:** Docker, TrueNAS SCALE, Cloudflare, GitHub Actions  
**Storage:** PostgreSQL (jobs), Redis (queue), Local filesystem (files)

---

## 🚀 Quick Deploy

```bash
# Deploy to TrueNAS (from local machine)
ssh oleg@10.0.0.155 \
  "cd /mnt/Odin/Applications/RehearseKit/config && \
   sudo docker compose pull && \
   sudo docker compose up -d"

# Check health
curl https://rehearsekit.uk/api/health

# View logs
ssh oleg@10.0.0.155
cd /mnt/Odin/Applications/RehearseKit/config
sudo docker compose logs -f
```

---

## ⚠️ Important Notes

### **Mixer Works on NEW Jobs Only**
- Stems saved to permanent storage: `/mnt/storage/rehearsekit/stems/{job_id}/`
- Old jobs (before 17:08 Oct 21): Stems not saved, mixer shows message
- **Solution:** Create new job or reprocess existing job

### **Trimming Works on NEW Jobs Only**
- Database columns added: `trim_start`, `trim_end`
- Old jobs: NULL values (no trim)
- New jobs: Can use trimming feature

### **WebSocket Fixed**
- Was: `redis://redis:6379` (didn't exist)
- Now: `redis://10.0.0.155:30059` (working)
- Result: Real-time progress updates working

---

## 🐛 Known Limitations

**Minor Issues:**
- Studio One 7: Opens at 44.1 kHz (manual change to 48 kHz needed)
- 4-stem separation only (no guitar/synth split)
- Mixer settings don't save to download (preview only)

**Not Issues:**
- Old jobs: Mixer not available (expected, graceful degradation)

---

## 🎯 Future Ideas (Stage 4+)

**High Priority:**
- Authentication (Google OAuth)
- User accounts
- Job ownership and history
- Storage quotas

**Nice to Have:**
- Custom mix export (save mixer settings to file)
- Pan controls
- 6-stem or 8-stem models
- Batch processing
- EQ and effects

**See:** `docs/ideas/mvp-stage-2.md` for full list

---

## 🧪 How to Test (Create NEW Job)

```
1. Go to https://rehearsekit.uk
2. Upload audio or YouTube URL
3. Click "Trim" button
4. Drag region markers
5. See LARGE BLUE ALERT BOX
6. Submit job
7. Watch real-time progress
8. Job completes
9. Use professional mixer:
   - Waveform shows immediately
   - Click channels to switch view
   - Adjust vertical faders
   - Use Solo (S) and Mute (M)
   - Play → perfect sync
10. Click "Upgrade to High Quality" (if fast quality)
11. Download and import to Cubase
```

**All features should work perfectly!** ✅

---

## 📊 Quick Stats

**Features:** 4 Stage 3 features complete  
**Issues Fixed:** 14 total  
**Commits:** 21 total for Stage 3  
**Deployments:** 8 successful  
**Code:** ~2,500 lines  
**Time:** ~7 hours  

---

## 🎉 Stage 3: Complete!

**Status:** PRODUCTION READY 🚀

**Live:** https://rehearsekit.uk

**Read Full Details:** `docs/STAGE_3_HANDOFF.md`

**🎵 Ready for Stage 4 or production use! 🎵**

