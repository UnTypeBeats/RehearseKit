# Cubase Import Guide - RehearseKit Stems

**Update:** Cubase 14 Pro DOES support .dawproject import! 🎉  
**Requirement:** Specific folder structure (now included in RehearseKit packages)  
**Time Required:** 1 minute

---

## ✅ Cubase 14 Pro - .dawproject Import (RECOMMENDED)

**Good News:** Cubase 14 Pro supports .dawproject import! The key is understanding Cubase's two-step selection process.

### How It Works

Cubase expects a **folder structure** for .dawproject imports:
```
ProjectName/
  └── project.dawproject
```

RehearseKit packages now include this structure automatically!

### Import Steps (1 Minute)

1. **Extract the ZIP file**
   - Download your RehearseKit package
   - Extract all contents to a folder

2. **Import into Cubase**
   - Open Cubase 14 Pro
   - **File → Import → DAWproject**
   - If prompted about existing project:
     - **"Yes"** = Import into new project
     - **"No"** = Import into current project

3. **Two-Step Selection** (Important!)
   - **STEP 1:** In the file browser, **SELECT THE PROJECT FOLDER** (e.g., "MyProject/")
   - **STEP 2:** Navigate INTO that folder and **SELECT THE .dawproject FILE**
   - Click **"Open"**

4. **Done!** ✅
   - All 4 stems imported as separate tracks
   - Tempo automatically set to detected BPM
   - Sample rate: 48000 Hz (48 kHz)
   - Tracks named: Vocals, Drums, Bass, Other

**Total Time:** ~1 minute

---

## 📦 Package Structure

Your RehearseKit download contains:

```
package.zip
├── ProjectName/
│   └── project.dawproject     ← For Cubase, Studio One, Bitwig, Reaper
├── stems/
│   ├── vocals.wav
│   ├── drums.wav
│   ├── bass.wav
│   └── other.wav              ← Manual import fallback
├── IMPORT_GUIDE.txt
└── README.txt
```

---

## 🎹 Other DAWs

### Studio One 7, Bitwig, Reaper

**Even simpler:**
1. Extract the ZIP
2. File → Open
3. Select the `.dawproject` file
4. Done!

**Note:** Studio One may open at 44.1 kHz - change to 48 kHz in Song Setup if needed (takes 5 seconds).

---

## 🛠️ Manual Import (Fallback Method)

If .dawproject import doesn't work for any reason, use the `stems/` folder:

### Quick Method (2 Minutes)

1. **Create New Cubase Project**
   - File → New Project → Empty
   - Sample Rate: **48000 Hz**
   - Bit Depth: **24-bit**
   - Tempo: **[Check README.txt for detected BPM]**

2. **Add 4 Audio Tracks**
   - Press **Ctrl+T** (Win) or **Cmd+T** (Mac) four times
   - Name tracks: **Vocals**, **Drums**, **Bass**, **Other**

3. **Drag-and-Drop Stems**
   - Open file browser to `stems/` folder
   - Drag `vocals.wav` → Vocals track (position 1.1.1.0)
   - Drag `drums.wav` → Drums track (position 1.1.1.0)
   - Drag `bass.wav` → Bass track (position 1.1.1.0)
   - Drag `other.wav` → Other track (position 1.1.1.0)

4. **Set Tempo**
   - Check detected BPM in README.txt
   - Project → Tempo Track → Set tempo

**Time:** ~2 minutes

---

## 🚨 Troubleshooting

### Issue: .dawproject files appear grayed out

**Cause:** You're trying to select the file at the wrong step

**Solution:**
1. In the Cubase import dialog, first SELECT THE FOLDER containing the .dawproject
2. THEN navigate into that folder and select the .dawproject file itself
3. Cubase expects folder selection → file selection (two steps)

### Issue: Wrong sample rate warning

**Cause:** Project defaults to 44.1 kHz instead of 48 kHz

**Solution:**
1. **Project → Project Setup**
2. Change Sample Rate to **48000 Hz**
3. Cubase will convert automatically

### Issue: Tempo is wrong

**Cause:** Tempo not imported correctly

**Solution:**
1. Check `README.txt` for detected BPM
2. **Project → Tempo Track**
3. Set tempo to detected value

### Issue: Stems are out of sync

**Cause:** Different start positions

**Solution:**
1. Select all audio events
2. Press **E** to open Sample Editor
3. Align all to position 1.1.1.0

---

## 💡 Pro Tips

### Create a Template (Saves Even More Time)

**One-Time Setup:**
1. Create empty project with 4 audio tracks
2. Name them: Vocals, Drums, Bass, Other
3. Set sample rate to 48000 Hz
4. **File → Save as Template**
5. Name: "RehearseKit 4-Stem"

**For Future Imports:**
- File → New Project → **RehearseKit 4-Stem**
- Drag 4 stems to timeline
- Set tempo
- **Done in 30 seconds!**

### Keyboard Shortcuts

- **Ctrl+T / Cmd+T** - Add audio track
- **Ctrl+P / Cmd+P** - Open Pool (for import via Pool)
- **Spacebar** - Play/Pause
- **L** - Locator to start
- **E** - Sample Editor

---

## 📊 Time Comparison

### Without RehearseKit
1. Find song audio - 10 min
2. Use online stem separator - 15 min
3. Download stems - 5 min
4. Convert to correct format - 10 min
5. Detect BPM - 5 min
6. Import to DAW - 5 min
7. Align and setup - 5 min

**Total:** ~55 minutes

### With RehearseKit (.dawproject)
1. Upload to RehearseKit - 1 min
2. Processing (automatic) - 5 min
3. Download ZIP - 1 min
4. Import to Cubase - 1 min

**Total:** ~8 minutes (saves 47 minutes!)

### With RehearseKit (Manual Import)
1. Upload to RehearseKit - 1 min
2. Processing (automatic) - 5 min
3. Download ZIP - 1 min
4. Manual import to Cubase - 2 min

**Total:** ~9 minutes (saves 46 minutes!)

**You save 85% of your time with RehearseKit!**

---

## 🔍 Technical Details

### What's in the .dawproject file?

The .dawproject is a ZIP file containing:
- `project.xml` - Project structure, tracks, clips
- `metadata.xml` - Project metadata (name, BPM, etc.)
- `audio/` folder - All stem files (48 kHz, 24-bit WAV)

### Why the folder structure?

Cubase's .dawproject import workflow expects:
1. User selects a **project folder** (not a file)
2. Then selects the **.dawproject file** inside that folder

This is different from other DAWs (Studio One, Bitwig) that allow direct file selection.

RehearseKit packages now include this folder structure automatically, so Cubase users can import with zero friction!

---

## 🎯 What RehearseKit Provides

- ✅ AI-powered stem separation (vocals, drums, bass, other)
- ✅ Automatic BPM detection
- ✅ .dawproject files with correct folder structure for Cubase
- ✅ Individual stem files (48 kHz, 24-bit WAV)
- ✅ Works with Cubase, Studio One, Bitwig, Reaper
- ✅ Comprehensive import guides
- ✅ Perfect alignment (all stems start at 0:00)

---

## 🚀 Best Workflow

### For Cubase 14 Pro Users

**Use .dawproject import** (1 minute):
1. Extract ZIP
2. File → Import → DAWproject
3. Select folder → Select file
4. Done!

### For Older Cubase Versions

**Use manual import** (2 minutes):
1. Extract ZIP
2. Create 4 tracks (or use template)
3. Drag stems from `stems/` folder
4. Set tempo

---

## 📝 Version History

- **v2.0 (Oct 2025)** - Added Cubase-compatible folder structure for .dawproject
- **v1.0 (Sep 2025)** - Initial release with manual import guide

---

## 🆘 Need Help?

- **In-package guide:** See `IMPORT_GUIDE.txt` in your download
- **README:** Check `README.txt` for BPM and technical specs
- **Documentation:** `/docs/cubase-import-guide.md` (this file)
- **Website:** https://rehearsekit.uk
- **Issues:** https://github.com/UnTypeBeats/RehearseKit/issues

---

**Questions? Found a bug?** Open an issue on GitHub or check the troubleshooting section above!

