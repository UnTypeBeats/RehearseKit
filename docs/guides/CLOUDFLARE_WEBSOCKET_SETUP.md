# Cloudflare Tunnel - WebSocket Configuration

**Issue:** WebSocket connections don't work through Cloudflare Tunnel  
**Solution:** Configure tunnel with WebSocket support

---

## Method 1: Via Cloudflare Dashboard (Easiest)

### Step 1: Go to Cloudflare Zero Trust

1. Open: https://one.dash.cloudflare.com
2. Log in to your account
3. Go to: **Access** → **Tunnels**
4. Find your tunnel (the one pointing to 10.0.0.155)
5. Click **Configure**

### Step 2: Update Public Hostnames

**You should see 3 rules. Update them to:**

#### Rule 1: API Backend
- **Subdomain:** `rehearsekit.uk`
- **Path:** `/api`
- **Service Type:** HTTP
- **URL:** `http://10.0.0.155:30071`
- Click **Save**

#### Rule 2: WebSocket (This is the important one!)
- **Subdomain:** `rehearsekit.uk`
- **Path:** `/ws`
- **Service Type:** HTTP
- **URL:** `http://10.0.0.155:30072`
- **Additional settings:**
  - Scroll down to "Additional application settings"
  - Enable: **"No TLS Verify"** (if available)
  - Enable: **"HTTP2 Origin"** (if available)
- Click **Save**

#### Rule 3: Frontend (Catch-all - must be LAST)
- **Subdomain:** `rehearsekit.uk`
- **Path:** (leave empty)
- **Service Type:** HTTP
- **URL:** `http://10.0.0.155:30070`
- Click **Save**

### Step 3: Order Matters!

**Make sure rules are in THIS ORDER (top to bottom):**
1. `/api` → port 30071
2. `/ws` → port 30072
3. (empty) → port 30070

Use drag-and-drop to reorder if needed.

---

## Method 2: Via Config File (Advanced)

**If you're using `cloudflared` with a config file:**

### Step 1: Find Your Config

Usually at: `~/.cloudflared/config.yml` or `/etc/cloudflared/config.yml`

### Step 2: Update Config

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  # API Backend
  - hostname: rehearsekit.uk
    path: /api
    service: http://10.0.0.155:30071
  
  # WebSocket with protocol upgrade
  - hostname: rehearsekit.uk
    path: /ws
    service: http://10.0.0.155:30072
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tcpKeepAlive: 30s
  
  # Frontend (must be last)
  - hostname: rehearsekit.uk
    service: http://10.0.0.155:30070
  
  # Catch-all
  - service: http_status:404
```

### Step 3: Restart Cloudflared

```bash
sudo systemctl restart cloudflared
# or
cloudflared tunnel restart
```

---

## Method 3: Quick Test (Alternative Solution)

**If WebSocket still doesn't work, you can disable it for now:**

The app works fine without WebSocket:
- ✅ Jobs process successfully
- ✅ Download works
- ⏳ Just refresh page to see progress (instead of real-time)

**WebSocket is nice-to-have, not critical for functionality.**

---

## Verification

**After updating Cloudflare:**

1. **Wait 30 seconds** for changes to propagate
2. **Hard refresh:** https://rehearsekit.uk (Cmd+Shift+R)
3. **Create new job or view existing job**
4. **Check DevTools Console:**
   - Should see: `WebSocket connecting to: wss://rehearsekit.uk/ws/jobs/{id}/progress`
   - Should see: `WebSocket connected for job {id}`
   - No more "Not Secure" warning!

---

## Current Workaround

**Until WebSocket works via Cloudflare:**

**Use:** http://10.0.0.155:30070 for real-time updates  
**Or use:** https://rehearsekit.uk and refresh page occasionally

**Everything else works perfectly!**

---

## What's More Important Right Now

**Test Studio One 48kHz fix!**

Download "vai fukage" job and open in Studio One 7 - this is the real test of today's work! 🎸

The WebSocket is cosmetic (nice progress bars vs. manual refresh). The **core functionality is working!**

