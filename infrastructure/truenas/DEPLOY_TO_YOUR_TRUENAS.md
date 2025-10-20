# Deploy RehearseKit to YOUR TrueNAS (10.0.0.155)

**Custom configuration for your specific setup**

---

## ✅ What You Have

- TrueNAS IP: **10.0.0.155**
- Pool: **Odin**
- PostgreSQL: Port **65430**, user `god`
- Redis: Existing TrueNAS app (likely port 6379)
- SSH: `oleg@10.0.0.155` (key-based, no password)
- Docker Hub: **kossoy** (images ready!)

---

## 🚀 Deployment Steps

### Step 1: Create PostgreSQL Database

```bash
# SSH to TrueNAS
ssh oleg@10.0.0.155

# Create rehearsekit database (using Docker since psql not installed)
docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "CREATE DATABASE rehearsekit;"
docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE rehearsekit TO god;"

# Test connection
docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d rehearsekit -c "SELECT 1;"
```

**Expected:** Returns "1" ✓

---

### Step 2: Create ZFS Dataset

```bash
# Still on TrueNAS
sudo zfs create Odin/apps/rehearsekit
sudo zfs create Odin/apps/rehearsekit/storage

# Set permissions (1000:1000 = app user in containers)
sudo chown -R 1000:1000 /mnt/Odin/apps/rehearsekit/storage

# Verify
zfs list | grep rehearsekit
```

---

### Step 3: Create Deployment Directory

```bash
sudo mkdir -p /mnt/Odin/apps/rehearsekit/config
cd /mnt/Odin/apps/rehearsekit/config
```

---

### Step 4: Transfer Files (From Your Mac)

```bash
# Open new terminal on your Mac
cd /Users/i065699/work/projects/personal/RehearseKit

# Copy docker-compose
scp infrastructure/truenas/docker-compose.truenas.yml \
  oleg@10.0.0.155:/mnt/Odin/apps/rehearsekit/config/docker-compose.yml

# Copy custom env file
scp infrastructure/truenas/env.truenas-custom \
  oleg@10.0.0.155:/mnt/Odin/apps/rehearsekit/config/.env
```

---

### Step 5: Configure Environment (On TrueNAS)

```bash
cd /mnt/Odin/apps/rehearsekit/config
nano .env
```

**Update these values:**
```bash
# Line with YOUR_PASSWORD - change to:
DATABASE_URL=postgresql+asyncpg://god:E1J0&D998Vyzya@10.0.0.155:65430/rehearsekit

# Line with YOUR_PORT - change to:
REDIS_URL=redis://10.0.0.155:6379/0
```

**Save:** Ctrl+X, Y, Enter

**Secure the file:**
```bash
chmod 600 .env
```

---

### Step 6: Deploy!

```bash
# Pull images from Docker Hub
docker-compose pull

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

**Expected:** All services show "Up"

---

### Step 7: Verify Health

```bash
# Health check
curl http://localhost:8000/api/health

# Expected:
# {
#   "status": "healthy",
#   "database": "healthy",
#   "redis": "healthy"
# }
```

---

### Step 8: Run Database Migrations

```bash
docker exec -it rehearsekit-backend alembic upgrade head
```

---

### Step 9: Test from Your Mac

**Browser:** `http://10.0.0.155:3000`

**Test workflow:**
1. Paste YouTube URL
2. Watch real-time status messages
3. Download package
4. Open in Studio One 7
5. Verify 48kHz sample rate ✅
6. Start rehearsing! 🎸

---

## 🎯 Your Specific Connection Strings

**PostgreSQL:**
```
postgresql+asyncpg://god:E1J0&D998Vyzya@10.0.0.155:65430/rehearsekit
```

**Redis:**
```
redis://10.0.0.155:6379/0
```

**Frontend URL:**
```
http://10.0.0.155:3000
```

**API URL:**
```
http://10.0.0.155:8000
```

**WebSocket URL:**
```
ws://10.0.0.155:8001
```

---

## 🐛 Troubleshooting

### Can't connect to PostgreSQL?
```bash
# Test from TrueNAS
psql -h 10.0.0.155 -p 65430 -U god -d rehearsekit -c "SELECT 1;"
```

### Can't connect to Redis?
```bash
# Test Redis
redis-cli -h 10.0.0.155 ping
# Expected: PONG
```

### Check logs
```bash
docker-compose logs -f backend
docker-compose logs -f worker
```

---

## ✅ Summary

**Your setup uses:**
- ✅ Existing PostgreSQL (port 65430)
- ✅ Existing Redis (port 6379)
- ✅ Pool: Odin
- ✅ Docker images: kossoy/* (AMD64, ready!)

**Estimated deployment time:** 15-20 minutes

**Ready to start!** 🚀

