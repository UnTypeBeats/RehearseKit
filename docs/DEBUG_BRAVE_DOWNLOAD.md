# Debug Brave Download Issue

**Status:** Works in Safari, not in Brave (even incognito)

---

## What to Check in Brave

**Open DevTools (F12 or Cmd+Option+I):**

### 1. Console Tab
Look for errors like:
- `ERR_BLOCKED_BY_CLIENT`
- `Mixed content`
- `CORS policy`
- `Failed to fetch`

### 2. Network Tab
- Click Download button
- Look for the request to `/api/jobs/{id}/download`
- Check:
  - Status code (200? 405? 403?)
  - Response headers
  - Any blocked requests

### 3. Brave Shields
- Click the Brave icon (lion) in address bar
- Check if anything is blocked
- Try disabling shields for rehearsekit.uk

---

## Possible Solutions

### If Console Shows: `ERR_BLOCKED_BY_CLIENT`
**Cause:** Brave's aggressive content blocking  
**Fix:** Disable Brave Shields for rehearsekit.uk

### If Console Shows: `CORS error`
**Cause:** Missing CORS headers on download endpoint  
**Fix:** Add download to CORS allowlist

### If Console Shows: `405 Method Not Allowed`
**Cause:** HEAD request instead of GET  
**Fix:** Backend needs to handle both

### If Nothing Shows (button just blinks)
**Cause:** JavaScript not executing  
**Fix:** Use fetch + blob download

---

## Alternative Download Methods

### Method 1: Direct Link (Always Works)
```
https://rehearsekit.uk/api/jobs/YOUR_JOB_ID/download
```
Copy job ID from Details, replace in URL, paste in address bar.

### Method 2: Right-Click → Save Link As
(If we add a link element instead of button)

### Method 3: Fetch + Blob (Most Compatible)
```javascript
fetch(url)
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  });
```

---

**Next:** Tell me what you see in Brave console when you click Download!

