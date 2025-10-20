# Cubase Import Guide - RehearseKit Stems

**Issue:** Cubase does not support .dawproject import (as of Cubase 13)  
**Solution:** Manual stem import with this quick guide  
**Time Required:** 2-3 minutes

---

## Why Doesn't Cubase Support .dawproject?

Despite being part of the DAWproject consortium, **Steinberg has not implemented .dawproject import in Cubase**. The format works perfectly in:
- ✅ Studio One 7 (PreSonus)
- ✅ Bitwig Studio
- ✅ Reaper
- ❌ Cubase (all versions)

**Workaround:** Manual stem import (it's actually quite fast!)

---

## Quick Import Guide (2 Minutes)

### Step 1: Extract the ZIP

1. Download your RehearseKit package
2. Extract the ZIP file
3. You'll see:
   ```
   /stems/
     ├── bass.wav
     ├── drums.wav
     ├── other.wav
     └── vocals.wav
   /cubase/
     └── IMPORT_GUIDE.txt  <-- Quick reference
   README.txt
   [ProjectName].dawproject  <-- For Studio One/Bitwig
   ```

### Step 2: Create New Cubase Project

1. Open Cubase
2. **File → New Project**
3. Select **"Empty"** template
4. Choose save location
5. **Set Project Settings:**
   - Sample Rate: **48000 Hz** (48 kHz)
   - Bit Depth: **24-bit**
   - Tempo: **[Your detected BPM is in README.txt]**

### Step 3: Import Stems (Drag-and-Drop Method)

**Fastest Way:**

1. In Cubase, create **4 audio tracks**:
   - Right-click Track List → **Add Audio Track** (x4)
   - Or press **Ctrl+T** (Win) / **Cmd+T** (Mac) four times

2. **Name the tracks:**
   - Track 1: `Vocals`
   - Track 2: `Drums`
   - Track 3: `Bass`
   - Track 4: `Other`

3. **Drag-and-drop stems:**
   - Open your file browser to `stems/` folder
   - Drag `vocals.wav` → Vocals track (timeline position 0)
   - Drag `drums.wav` → Drums track (timeline position 0)
   - Drag `bass.wav` → Bass track (timeline position 0)
   - Drag `other.wav` → Other track (timeline position 0)

4. **Done!** All stems are now in Cubase, aligned, and ready to play

**Time:** ~2 minutes

### Step 4: Set Tempo (Optional)

The detected BPM is written in `README.txt` inside your ZIP package.

1. Open **Tempo Track** (Ctrl+T or Cmd+T)
2. Set tempo to detected BPM
3. Enable **Musical Mode** on audio events (if needed)

---

## Alternative: Import via Pool

**For more control over import settings:**

### Method 1: Pool Import

1. Open **Pool** (Ctrl+P or Cmd+P)
2. **Import Files** button
3. Navigate to `stems/` folder
4. Select all 4 WAV files
5. Click **Open**
6. Files appear in Pool

### Method 2: Drag from Pool to Timeline

1. Create audio tracks (as above)
2. Drag each file from Pool to corresponding track
3. Align all to position 1.1.1.0 (bar 1, beat 1)

---

## Automation Script (Optional - For Power Users)

If you import stems frequently, use this Cubase Logical Editor preset:

### Cubase Macro: Quick Import

**Not available in Cubase** - No scripting support unfortunately.

**Alternative:** Create a template project

1. **One-time setup:**
   - Create empty project with 4 audio tracks
   - Name them: Vocals, Drums, Bass, Other
   - Set sample rate to 48 kHz
   - **Save as Template:** File → Save as Template
   - Name: "RehearseKit 4-Stem"

2. **For each new RehearseKit package:**
   - File → New Project → **RehearseKit 4-Stem**
   - Drag-and-drop 4 stems to timeline
   - Set tempo from README
   - **Done in 1 minute!**

---

## Troubleshooting

### Issue: Stems are out of sync

**Cause:** Different start times

**Solution:**
1. Select all audio events
2. **Audio → Events to Part** (convert to parts)
3. Use **Group Editing** to move together

### Issue: Wrong sample rate warning

**Cause:** Project set to 44.1 kHz instead of 48 kHz

**Solution:**
1. **Project → Project Setup**
2. Change Sample Rate to **48000 Hz**
3. Cubase will convert automatically (may take a moment)

### Issue: Tempo is wrong

**Cause:** Need to set tempo manually

**Solution:**
1. Check `README.txt` in ZIP for detected BPM
2. **Project → Tempo Track**
3. Set tempo to detected value
4. Save project

---

## Why We Can't Generate Native .cpr Files

**Technical Limitation:**
- Cubase .cpr format is **proprietary and undocumented**
- No public specification available
- Reverse engineering is unreliable
- Only Cubase itself can create valid .cpr files

**What RehearseKit Provides:**
- ✅ Individual stems (48 kHz, 24-bit WAV)
- ✅ .dawproject for Studio One/Bitwig/Reaper
- ✅ Clear naming convention
- ✅ BPM information in README
- ✅ This import guide

**Result:** 2-minute manual import vs. hours of manual stem separation

---

## Comparison: Manual vs RehearseKit

### Traditional Workflow (No RehearseKit)
1. Find song audio - 10 min
2. Use online stem separator - 15 min
3. Download individual stems - 5 min
4. Convert to correct format - 10 min
5. Detect BPM manually - 5 min
6. Import to Cubase - 5 min
7. Set tempo and align - 5 min

**Total:** ~55 minutes

### With RehearseKit
1. Upload to RehearseKit - 1 min
2. Wait for processing - 5 min (automatic)
3. Download ZIP - 1 min
4. Import to Cubase (this guide) - 2 min
5. Set tempo - 30 sec

**Total:** ~9-10 minutes (saves 45 minutes!)

**Even with manual Cubase import, you save 80% of the time!**

---

## Future Possibilities

### Option 1: Cubase Template Generator

**Not feasible** - .cpr format is proprietary

### Option 2: Cubase Scripting

**Not available** - Cubase has no scripting/CLI

### Option 3: Wait for Cubase

**Possible** - Steinberg may add .dawproject import in future

### Option 4: Use Studio One Instead

**Works today** - Studio One imports .dawproject perfectly!

---

## Best Workflow for Cubase Users

### Recommended Setup

1. **Create RehearseKit template in Cubase (one time):**
   - 4 audio tracks (Vocals, Drums, Bass, Other)
   - 48 kHz / 24-bit project settings
   - Save as template

2. **For each RehearseKit package:**
   - Open template
   - Drag 4 stems to timeline (30 seconds)
   - Set tempo from README (10 seconds)
   - Start rehearsing!

**Time per package:** ~1 minute

---

## Feedback to Steinberg

If you want .dawproject support in Cubase:

**Vote here:** https://forums.steinberg.net/t/dawproject-format-exchange-between-daws-achieved/870243

**Or contact Steinberg support** requesting .dawproject import feature.

---

## Conclusion

**The Limitation:** Cubase doesn't support .dawproject (not RehearseKit's fault)

**The Workaround:** 2-minute manual import (still way faster than manual stem separation)

**The Good News:** 
- ✅ Stems are perfect quality (48 kHz, 24-bit)
- ✅ All aligned and ready
- ✅ BPM detected for you
- ✅ Works great in Studio One/Bitwig
- ✅ Cubase import is quick and easy

**You still save 45+ minutes per song compared to manual stem separation!**

---

**Questions? Issues?** Check `README.txt` in your download package or docs/cubase-import-guide.md

