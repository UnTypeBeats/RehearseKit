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

## ✅ Completed: Stage 3 (Deployed Oct 21, 2025)

### 1. Waveform Trimming ✅
- ✅ Add region selection to waveform component (WaveSurfer.js regions plugin)
- ✅ Visual start/end markers (draggable/resizable)
- ✅ Send trim parameters to backend (trim_start, trim_end in FormData)
- ✅ Process only selected portion of audio (FFmpeg trim_audio function)
- ✅ Update job schema to include trim info (migration 002_add_trim_fields)
- ✅ Large blue alert box for visual feedback
- ✅ Display trim info on job details page
- ✅ Button shows "✂️ Start Processing (Trimmed)"

### 2. Reprocess Button ✅
- ✅ Add "Reprocess in High Quality" button to job details
- ✅ Reuse existing source file (no re-upload/download)
- ✅ Create new job with quality upgrade (POST /api/jobs/{id}/reprocess)
- ✅ Auto-navigate to new job
- ✅ Preserves all settings (BPM, trim, etc.)
- ✅ Project name suffix "(High Quality)"

### 3. Professional DAW Mixer ✅
- ✅ Individual stem volume controls (vertical faders)
- ✅ Preview mix before download
- ✅ Professional DAW-style UI (Cubase/Logic inspired)
- ✅ Web Audio API for perfect sync
- ✅ Solo and Mute buttons per channel
- ✅ Master waveform (switches per channel selection)
- ✅ Skeuomorphic 3D fader caps
- ✅ dB scale markings and conversion
- ✅ Audio coordination (stops other players)
- ✅ Dark professional theme

**Note:** Custom mix export deferred to future stage

### 4. Fix Cubase DAWproject Import Issue ✅
- ✅ Update package to include parent folder (ProjectName/project.dawproject)
- ✅ Update ZIP creation logic in audio.py
- ✅ Test import workflow in Cubase 14 Pro
- ✅ Update documentation with correct import steps
- ✅ Complete rewrite of cubase-import-guide.md

**Reference:** See `docs/STAGE_3_HANDOFF.md` for complete implementation details

---

## 🔮 Future: Authentication & Production

### Auth (Post-Stage 3)
- [ ] Google OAuth integration
- [ ] User accounts (oleg@befeast.com as admin)
- [ ] Job ownership and history
- [ ] Storage quotas per user

### Mixer improvements
- [ ] investigate possibility to include mixer faders values into resulting download (in project file)

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
