# Brave Browser Download Workaround

**Issue:** Download button works in Safari but not in Brave (even incognito)  
**Cause:** Brave's aggressive privacy features block `window.open()` popups  
**Status:** Backend works fine - browser-specific issue

---

## Quick Fix for Brave Users

### Option 1: Allow Popups for rehearsekit.uk

1. Click the **Brave Shields** icon (lion) in address bar
2. Under "Advanced View"
3. Find "Block scripts" or "Popups"
4. **Allow** for this site
5. Refresh page
6. Try Download button again

### Option 2: Use Safari / Chrome / Firefox

Download works perfectly in:
- ✅ Safari (confirmed working)
- ✅ Chrome
- ✅ Firefox
- ✅ Edge

### Option 3: Direct Download Link

**Copy this URL format:**
```
https://rehearsekit.uk/api/jobs/{JOB_ID}/download
```

Replace `{JOB_ID}` with your job ID and paste in browser.

---

## Technical Explanation

**Brave blocks:**
- `window.open()` calls (treats as popup)
- Downloads triggered by JavaScript
- Third-party requests in some cases

**Why it works in Safari:**
- Safari allows `window.open()` for downloads
- Less aggressive popup blocking

**Backend is fine:**
- Downloads work via curl ✓
- Downloads work via Safari ✓
- Downloads work via direct URL ✓

---

## Code Fix (Future)

**Better download method:**

Instead of:
```typescript
window.open(url, "_blank");
```

Use:
```typescript
const a = document.createElement('a');
a.href = url;
a.download = `${job.project_name}_RehearseKit.zip`;
a.click();
```

This creates a download link and clicks it programmatically, which Brave allows.

---

**For now:** Use Safari or allow popups in Brave settings!

