## ✅ Completed: Stage 2 (Deployed Oct 21, 2025)

### Audio file management
- ✅ Display uploaded/fetched from YT audio as waveform (WaveSurfer.js)
- ✅ Controls to play it (spacebar, seek controls)
- ✅ YouTube two-step workflow (fetch → preview → process)
- ✅ Source audio playback on job details page
- ✅ Cancel/Delete buttons with confirmation dialogs

### Critical Bug Fixes
- ✅ Fixed API URL detection (runtime vs build-time)
- ✅ Fixed download in Brave browser
- ✅ Centralized API URL logic across all components

---

## 🎯 Stage 3: Advanced Audio Features

### 1. Waveform Trimming
- [ ] Add region selection to waveform component
- [ ] Visual start/end markers
- [ ] Send trim parameters to backend
- [ ] Process only selected portion of audio
- [ ] Update job schema to include trim info

### 2. Reprocess Button
- [ ] Add "Reprocess in High Quality" button to job details
- [ ] Reuse existing source file (no re-upload/download)
- [ ] Create new job with quality upgrade
- [ ] Link to original job for comparison

### 3. Mix Preview
- [ ] Add individual stem volume controls
- [ ] Preview mix before download
- [ ] Incorporate audio mixer UI (ref: https://audiomixer.io/)
- [ ] Save mix settings with job
- [ ] Optional: export custom mix as additional file

### 4. Fix Cubase DAWproject Import Issue
> **Problem:** Cubase expects folder selection first, then file selection. Current .dawproject files appear grayed out during import.

**Implementation:**
- [ ] Update `dawproject_generator.py` to create folder structure
- [ ] Modify package to include parent folder:
  ```
  📁 ProjectName/
     └── 📄 project.dawproject
     └── 📁 Audio Files/
         └── (stem files)
  ```
- [ ] Update ZIP creation logic to preserve folder structure
- [ ] Test import workflow in Cubase 14 Pro
- [ ] Update documentation with correct import steps

**Reference:** See `docs/ideas/dawproject-cubase-import-issue.md` for detailed analysis

---

## 🔮 Future: Authentication & Production

### Auth (Post-Stage 3)
- [ ] Google OAuth integration
- [ ] User accounts (oleg@befeast.com as admin)
- [ ] Job ownership and history
- [ ] Storage quotas per user

### Bugs to Investigate
- [ ] Fix "not secure" WebSocket warning on HTTPS
- [ ] Investigate other DAW project formats (AAF, OMF, etc.)

### Production Deployment Planning
- [ ] Compare cloud solutions (GCP, AWS, Render, Railway)
- [ ] Cost analysis for different hosting options
- [ ] Migration plan from TrueNAS to cloud

### Model Improvements (Long-term)
- [ ] Improve separation capabilities
- [ ] Split guitars: clean, lead, distorted
- [ ] Separate synth types
- [ ] 6-stem or 8-stem models
