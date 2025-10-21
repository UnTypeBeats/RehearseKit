# Cloudflare Tunnel Setup for RehearseKit

**Issue:** Mixed content error when accessing https://rehearsekit.uk  
**Solution:** Configure Cloudflare tunnel to proxy both frontend AND backend

---

## Current Setup

**Frontend:** https://rehearsekit.uk → 10.0.0.155:30070 ✅  
**Backend:** Needs https://rehearsekit.uk/api → 10.0.0.155:30071

---

## Cloudflare Tunnel Configuration

### Option 1: Single Tunnel with Path Routing (Recommended)

**In your Cloudflare Tunnel config:**

```yaml
tunnel: YOUR_TUNNEL_ID
ingress:
  # API requests
  - hostname: rehearsekit.uk
    path: /api/*
    service: http://10.0.0.155:30071
  
  # WebSocket
  - hostname: rehearsekit.uk
    path: /ws/*
    service: http://10.0.0.155:30072
  
  # Frontend (catch-all)
  - hostname: rehearsekit.uk
    service: http://10.0.0.155:30070
  
  # Default catchall
  - service: http_status:404
```

### Option 2: Subdomains (Alternative)

```yaml
ingress:
  - hostname: api.rehearsekit.uk
    service: http://10.0.0.155:30071
  
  - hostname: ws.rehearsekit.uk
    service: http://10.0.0.155:30072
  
  - hostname: rehearsekit.uk
    service: http://10.0.0.155:30070
```

Then update frontend build:
- `NEXT_PUBLIC_API_URL=https://api.rehearsekit.uk`
- `NEXT_PUBLIC_WS_URL=wss://ws.rehearsekit.uk`

---

## Quick Fix (If You Can't Change Cloudflare Config)

**The frontend code is now smart:**
- HTTPS access → uses relative /api paths (expects Cloudflare to proxy)
- HTTP access → uses direct http://10.0.0.155:30071

**But you need to configure Cloudflare tunnel to route /api/* to port 30071**

---

## Test After Cloudflare Update

1. Configure Cloudflare tunnel with path routing
2. Rebuild frontend: (code is already smart, just redeploy)
3. Access https://rehearsekit.uk
4. Should work without mixed content errors!

---

**Current Status:** Code is ready, just need Cloudflare tunnel configuration update.

