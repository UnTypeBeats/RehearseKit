# Quick TrueNAS Deployment Reference

**Target:** Seamless YouTube → Studio One 7 workflow on TrueNAS  
**Time:** 1.5 hours total

---

## 🎯 Your 3 Steps

### 1️⃣ Docker Hub (5 min) - YOU DO

```
1. Sign up: hub.docker.com/signup
2. Create token: Account Settings → Security → New Access Token
3. Add to GitHub: repo → Settings → Secrets → Add:
   - DOCKERHUB_USERNAME
   - DOCKERHUB_TOKEN
```

**Then tell me: "Docker Hub ready"**

---

### 2️⃣ Build Images (10 min) - I DO FOR YOU

I'll commit and push to trigger builds automatically.

**You monitor:** GitHub → Actions tab

---

### 3️⃣ Deploy to TrueNAS (45 min) - YOU DO

**Quick commands (detailed guide: `docs/truenas-deployment.md`):**

```bash
# On TrueNAS:
ssh admin@YOUR_IP

# Create datasets
sudo zfs create tank/apps/rehearsekit/storage
sudo zfs create tank/apps/rehearsekit/redis
sudo chown -R 1000:1000 /mnt/tank/apps/rehearsekit/storage
sudo chown -R 999:999 /mnt/tank/apps/rehearsekit/redis

# Transfer files (from your Mac)
scp infrastructure/truenas/docker-compose.truenas.yml admin@IP:/mnt/tank/apps/rehearsekit/config/docker-compose.yml
scp infrastructure/truenas/env.example admin@IP:/mnt/tank/apps/rehearsekit/config/.env

# Configure (on TrueNAS)
cd /mnt/tank/apps/rehearsekit/config
nano .env  # Fill in your values
docker-compose pull
docker-compose up -d

# Verify
docker-compose ps
curl http://localhost:8000/api/health
```

**Access:** `http://YOUR_TRUENAS_IP:3000`

---

## ✅ Success Test

1. Open `http://YOUR_TRUENAS_IP:3000`
2. Paste YouTube URL
3. Watch real-time progress (detailed messages!)
4. Download package
5. Double-click .dawproject
6. Studio One opens at **48kHz** ✅
7. Start rehearsing! 🎸

---

## 🆘 Need Help?

**Full guide:** `docs/truenas-deployment.md` (1,000+ lines)  
**Current status:** `DEPLOYMENT_CHECKLIST.md`

---

## 📊 Current Status

**✅ READY:**
- All code changes applied
- Studio One 48kHz fix live
- Tests passing (100%)
- Documentation complete

**⏳ WAITING FOR:**
- Docker Hub account (you)
- GitHub Secrets (you)
- Then I push code → builds start automatically

---

**Start with Step 1 (Docker Hub) and let me know when ready!** 🚀

