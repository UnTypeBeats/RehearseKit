# Google OAuth Fix - Handover Document

**Date:** 2025-10-22
**Status:** ✅ COMPLETED AND VERIFIED
**Staging URL:** https://rehearsekit.uk
**Commit:** `050afe1` - Fix Google OAuth on staging - complete solution

---

## Summary

Fixed Google OAuth authentication that was working on localhost but failing on staging (rehearsekit.uk). The issue involved multiple root causes including missing environment variables, API endpoint mismatch, security issues, and Docker configuration problems.

**Result:** Google Auth now works perfectly on staging via https://rehearsekit.uk

---

## Architecture Overview

### OAuth Flow (Client-Side with ID Tokens)

The app uses **client-side Google OAuth** with ID tokens, NOT server-side OAuth with authorization codes:

1. **Frontend** (`frontend/app/providers.tsx`):
   - Fetches Google Client ID at runtime from backend: `GET /api/auth/config`
   - Initializes `GoogleOAuthProvider` with the client ID
   - User clicks "Sign in with Google" button (React component)
   - Google popup appears, user authenticates
   - Google returns an **ID token** directly to browser

2. **Backend** (`backend/app/api/auth.py`):
   - `GET /api/auth/config` endpoint returns Google Client ID
   - `POST /api/auth/google` receives ID token from frontend
   - Verifies ID token using `google.oauth2.id_token.verify_oauth2_token()`
   - Creates/updates user, generates JWT tokens
   - Returns access token + refresh token

3. **Why Client-Side?**
   - Simpler implementation (no redirect handling)
   - Better UX (popup instead of full page redirect)
   - Still secure - backend cryptographically verifies ID token
   - Good for SPAs/Next.js apps

### Infrastructure

**Staging Server:** 10.0.0.155 (TrueNAS)
**SSH Access:** `ssh oleg@10.0.0.155`
**Config Path:** `/mnt/Odin/Applications/RehearseKit/config/`

**Cloudflare Routing:**
```
https://rehearsekit.uk/api/* → http://10.0.0.155:30071 (backend)
https://rehearsekit.uk/ws/*  → http://10.0.0.155:30072 (websocket)
https://rehearsekit.uk/*     → http://10.0.0.155:30070 (frontend)
```

**Containers:**
- `rehearsekit-frontend` - Next.js 14 (port 30070)
- `rehearsekit-backend` - FastAPI (port 30071)
- `rehearsekit-websocket` - WebSocket service (port 30072)
- `rehearsekit-worker` - Celery worker

---

## Root Causes Identified

### 1. Backend Missing Google OAuth Environment Variables ⚠️ CRITICAL

**Problem:** The backend container was NOT receiving Google OAuth configuration variables.

**Missing Variables:**
- `GOOGLE_CLIENT_ID` - Required to verify ID tokens
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI (not used in client-side flow but required by config)
- `ADMIN_EMAIL` - Admin user email

**Impact:** Backend couldn't verify Google ID tokens, causing all auth attempts to fail.

### 2. Frontend API Endpoint Mismatch

**Problem:** Frontend was calling `/api/config` but backend endpoint is `/api/auth/config`

**File:** `frontend/app/providers.tsx:30`
```typescript
// BEFORE (wrong):
const response = await fetch('/api/config');

// AFTER (correct):
const response = await fetch('/api/auth/config');
```

**Backend Route:** `backend/app/api/auth.py:387-394`
```python
@router.get("/config")
async def get_config():
    return {"googleClientId": settings.GOOGLE_CLIENT_ID}
```

Router mounted at: `/api/auth` (see `backend/app/main.py:56`)
Full endpoint: `/api/auth/config`

### 3. YAML Syntax Error in docker-compose.yml

**Problem:** Line 25 had incorrect indentation causing duplicate environment variables.

**Location:** `infrastructure/truenas/docker-compose.truenas.yml` (on staging server)

```yaml
# WRONG:
environment:
  - NEXT_PUBLIC_APP_NAME=RehearseKit
    - NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}  # ← Wrong indent
  - NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
```

### 4. Security Issue: Google Client ID in Build Args

**Problem:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` was passed as Docker build arg, baking it into the image.

```yaml
# WRONG (before):
build:
  args:
    - NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}  # ← Baked into image!
```

**Impact:**
- Secrets exposed in Docker image layers
- Can't use same image for dev/staging/prod
- Violates "build once, deploy anywhere" principle

**Solution:** Removed build args entirely. Frontend fetches client ID at runtime from backend.

### 5. Deprecated Docker Compose Version Field

**Problem:** `version: '3.8'` field is deprecated in modern Docker Compose and causes warnings.

**Solution:** Removed the version field from docker-compose.yml.

### 6. Unused OAuth Callback Page

**Problem:** `frontend/app/auth/callback/google/page.tsx` existed but wasn't being used (remnant from server-side OAuth attempt).

**Solution:** Deleted the file to avoid confusion.

---

## Changes Made

### 1. Backend Configuration (`infrastructure/truenas/docker-compose.truenas.yml`)

**Lines 68-74:** Added missing Google OAuth environment variables to backend service:
```yaml
# Google OAuth - CRITICAL FOR AUTH TO WORK
- GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
- GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
- GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}

# Admin Configuration
- ADMIN_EMAIL=${ADMIN_EMAIL}
```

### 2. Frontend Endpoint Fix (`frontend/app/providers.tsx`)

**Line 30:** Changed API endpoint:
```typescript
// Changed from:
const response = await fetch('/api/config');

// To:
const response = await fetch('/api/auth/config');
```

### 3. Frontend Docker Config (`infrastructure/truenas/docker-compose.truenas.yml`)

**Lines 1-17:** Removed deprecated version field and build args:
```yaml
# RehearseKit - TrueNAS SCALE Deployment
services:
  frontend:
    image: ${DOCKER_REGISTRY:-docker.io}/${DOCKER_USERNAME}/rehearsekit-frontend:${IMAGE_TAG:-latest}
    container_name: rehearsekit-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_NAME=RehearseKit
      # Google Client ID fetched at runtime from backend /api/auth/config
      # NO NEXT_PUBLIC_GOOGLE_CLIENT_ID here - it's fetched dynamically
```

### 4. Removed Unused Code

**Deleted:** `frontend/app/auth/callback/google/page.tsx` (108 lines)

### 5. Staging Deployment

**Deployed to:** `/mnt/Odin/Applications/RehearseKit/config/docker-compose.yml`

**Commands used:**
```bash
# Backup old config
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

# Deploy new config
cp /tmp/docker-compose-fixed.yml docker-compose.yml

# Restart services
sudo docker compose down
sudo docker compose up -d
```

---

## Environment Variables (Staging)

**Location:** `/mnt/Odin/Applications/RehearseKit/config/.env`

**Google OAuth Variables (set):**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://rehearsekit.uk
ADMIN_EMAIL=<your-admin-email>
```

**Note:** The `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in .env is NOT used by the deployed containers (it's fetched at runtime from backend).

---

## Google Cloud Console Configuration

**OAuth Client Configured:**
- Client ID: `<your-google-client-id>.apps.googleusercontent.com`

**Authorized JavaScript Origins:**
1. `http://localhost:3000` (for local development)
2. `https://rehearsekit.uk` (for staging/production)

**Important:**
- IP addresses (like `http://10.0.0.155:30070`) are NOT allowed by Google
- Only localhost and proper domains with HTTPS are supported
- No redirect URIs needed for client-side OAuth

---

## Testing & Verification

### Backend Tests ✅

```bash
# Test backend config endpoint (locally)
ssh oleg@10.0.0.155 "curl -s http://localhost:30071/api/auth/config"
# Response: {"googleClientId":"<your-google-client-id>.apps.googleusercontent.com"}

# Test backend config endpoint (public FQDN)
curl -s https://rehearsekit.uk/api/auth/config
# Response: {"googleClientId":"<your-google-client-id>.apps.googleusercontent.com"}

# Check backend health
ssh oleg@10.0.0.155 "curl -s http://localhost:30071/api/health"
# Response: {"status":"healthy","database":"healthy","redis":"healthy"}
```

### Frontend Tests ✅

```bash
# Test frontend is serving
curl -s https://rehearsekit.uk | grep "Loading configuration"
# Should find: <p class="text-muted-foreground">Loading configuration...</p>

# Check container status
ssh oleg@10.0.0.155 "sudo docker ps | grep rehearsekit"
# All containers should be healthy or starting
```

### End-to-End Test ✅

1. Visit https://rehearsekit.uk
2. Page loads, shows "Loading configuration..." briefly
3. Click "Sign In" button in header
4. Google Sign In button appears in modal
5. Click "Sign in with Google"
6. Google popup appears, user authenticates
7. **User is logged in successfully** ✅

**User Confirmed:** "yes, works perfectly!"

---

## CI/CD Pipeline

**GitHub Actions Workflow:** `.github/workflows/build-images.yml`

**Trigger:** Push to `main` branch

**Jobs:**
1. Build Frontend Image → `kossoy/rehearsekit-frontend:latest`
2. Build Backend Image → `kossoy/rehearsekit-backend:latest`
3. Build WebSocket Image → `kossoy/rehearsekit-websocket:latest`

**Deployment Process:**
```bash
# 1. Push to GitHub
git push origin main

# 2. GitHub Actions builds and pushes images (automatic)

# 3. Pull new images on staging
ssh oleg@10.0.0.155 "cd /mnt/Odin/Applications/RehearseKit/config && \
  sudo docker compose pull frontend && \
  sudo docker compose up -d frontend"
```

**Build Times:**
- Frontend: ~1m44s
- Backend: ~3-4 minutes
- WebSocket: ~43s

---

## Key Files Reference

### Backend Files

1. **`backend/app/api/auth.py`** - Auth endpoints
   - Line 387-394: `GET /api/auth/config` endpoint
   - Line 119-195: `POST /api/auth/google` endpoint (verifies ID token)

2. **`backend/app/core/oauth.py`** - OAuth verification logic
   - Line 50-81: `verify_id_token()` method

3. **`backend/app/core/config.py`** - Configuration settings
   - Line 55-57: Google OAuth settings
   - Line 60: Admin email setting

4. **`backend/app/main.py`** - FastAPI app initialization
   - Line 56: Auth router mounted at `/api`

### Frontend Files

1. **`frontend/app/providers.tsx`** - Root provider with OAuth setup
   - Line 26-51: Fetches Google Client ID from backend at runtime
   - Line 66: Initializes `GoogleOAuthProvider`

2. **`frontend/components/auth/login-dialog.tsx`** - Login UI
   - Line 36-82: Handles Google OAuth success
   - Line 140-153: Google Login button component

3. **`frontend/contexts/auth-context.tsx`** - Auth state management
   - Manages user state, login/logout

4. **`frontend/app/api/config/route.ts`** - Next.js API route (NOT USED IN PRODUCTION)
   - This is only used during local development
   - In production, Cloudflare routes `/api/*` to backend

### Infrastructure Files

1. **`infrastructure/truenas/docker-compose.truenas.yml`** - Production Docker Compose
   - Deployed to: `/mnt/Odin/Applications/RehearseKit/config/docker-compose.yml`

2. **`infrastructure/truenas/env.truenas-custom`** - Environment template
   - Reference for setting up .env file on staging

---

## Troubleshooting

### Issue: Frontend shows "Loading configuration..." forever

**Check:**
```bash
# 1. Verify backend endpoint is accessible
curl -s https://rehearsekit.uk/api/auth/config

# 2. Check frontend logs
ssh oleg@10.0.0.155 "sudo docker logs rehearsekit-frontend --tail 50"

# 3. Check browser console for errors
# Open https://rehearsekit.uk in browser, check DevTools Console
```

### Issue: "Failed to verify Google ID token"

**Check:**
```bash
# 1. Verify backend has GOOGLE_CLIENT_ID set
ssh oleg@10.0.0.155 "sudo docker exec rehearsekit-backend env | grep GOOGLE"

# 2. Check backend logs
ssh oleg@10.0.0.155 "sudo docker logs rehearsekit-backend --tail 100 | grep -i google"

# 3. Verify Google OAuth console has correct origins
# Go to: https://console.cloud.google.com/apis/credentials
# Check authorized JavaScript origins includes: https://rehearsekit.uk
```

### Issue: "Not a valid origin" error from Google

**Solution:** Add the domain to Google Cloud Console:
1. Go to https://console.cloud.google.com/apis/credentials
2. Select OAuth 2.0 Client ID
3. Add to "Authorized JavaScript origins": `https://rehearsekit.uk`
4. Save changes (takes effect immediately)

### Issue: Backend /api/auth/config returns 404

**Check:**
```bash
# 1. Verify auth router is loaded
ssh oleg@10.0.0.155 "sudo docker logs rehearsekit-backend --tail 200 | grep -i 'auth\|route'"

# 2. Test backend health
curl -s https://rehearsekit.uk/api/health

# 3. Check if backend container has latest code
ssh oleg@10.0.0.155 "sudo docker inspect rehearsekit-backend | grep Created"
```

---

## Next Steps / Future Improvements

### Potential Enhancements

1. **Add OAuth Refresh Token Flow**
   - Currently using access token expiry of 24 hours
   - Could implement automatic refresh on expiry

2. **Add Email/Password Authentication**
   - Backend already has `/api/auth/register` and `/api/auth/login` endpoints
   - Frontend login dialog has email/password form (hidden by default)
   - Set `showEmailLogin` state to enable

3. **Add Role-Based Access Control (RBAC)**
   - Backend has `is_admin` field on User model
   - Admin email auto-promoted to admin (set in `ADMIN_EMAIL` env var)
   - Could add role checks for protected routes

4. **Add OAuth State Parameter**
   - Add CSRF protection with state parameter
   - Especially important if switching to server-side OAuth flow

5. **Monitor Token Expiry**
   - Add frontend monitoring for access token expiry
   - Automatically refresh before expiry
   - Current: Refreshes every 20 hours (see `auth-context.tsx:95`)

### Known Limitations

1. **WebSocket Container Unhealthy**
   - Status shows as "unhealthy" but this doesn't affect OAuth
   - Investigate health check configuration if WebSocket features fail

2. **Frontend Health Check Slow**
   - Takes ~40 seconds to become healthy (see `start_period: 40s`)
   - Could optimize health check or reduce start period

3. **No Logout Endpoint Called on Refresh**
   - When token refreshed, old token not explicitly revoked
   - Backend has token blacklist functionality but not fully utilized
   - Could improve security by revoking old tokens on refresh

---

## Contact & Resources

**Staging Server:** oleg@10.0.0.155
**GitHub Repo:** UnTypeBeats/RehearseKit
**Commit:** `050afe1` - Fix Google OAuth on staging - complete solution

**Google Cloud Console:**
- Project: (Configured with your Google Cloud project)
- OAuth Credentials: https://console.cloud.google.com/apis/credentials

**Cloudflare:**
- Domain: rehearsekit.uk
- Proxy routing configured for /api, /ws, and root

---

## Summary

✅ Google OAuth fully functional on staging (https://rehearsekit.uk)
✅ Backend has all required environment variables
✅ Frontend fetches config at runtime (no secrets in images)
✅ Docker Compose cleaned up (no deprecated fields, proper syntax)
✅ Security improved (no build args with secrets)
✅ Code cleaned up (removed unused OAuth callback page)
✅ All changes committed and pushed to main branch
✅ CI/CD pipeline verified working
✅ End-to-end testing completed successfully

**Status: PRODUCTION READY** 🚀

---

**Generated:** 2025-10-22
**Last Updated:** 2025-10-22
**Author:** Claude Code
