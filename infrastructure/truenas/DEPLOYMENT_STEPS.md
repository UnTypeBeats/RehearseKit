# TrueNAS Deployment - Step-by-Step Commands

**Quick Reference for Phase 3 Deployment**

---

## Information You Need

Fill these in before starting:

```
TRUENAS_IP=___________________
POOL_NAME=___________________ (usually "tank")
POSTGRES_IP=___________________
POSTGRES_PASSWORD=___________________
DOCKERHUB_USERNAME=___________________
```

---

## Commands to Run on TrueNAS

### 1. SSH to TrueNAS

```bash
ssh admin@YOUR_TRUENAS_IP
```

### 2. Create Datasets

```bash
# Replace "tank" with your pool name
sudo zfs create tank/apps/rehearsekit/storage
sudo zfs create tank/apps/rehearsekit/redis

# Set permissions
sudo chown -R 1000:1000 /mnt/tank/apps/rehearsekit/storage
sudo chown -R 999:999 /mnt/tank/apps/rehearsekit/redis

# Verify
zfs list | grep rehearsekit
```

**Expected output:**
```
tank/apps/rehearsekit/storage    96K   XXG   96K  /mnt/tank/apps/rehearsekit/storage
tank/apps/rehearsekit/redis      96K   XXG   96K  /mnt/tank/apps/rehearsekit/redis
```

### 3. Setup PostgreSQL Database

```bash
# Test connection first
psql -h YOUR_POSTGRES_IP -U postgres -c "SELECT version();"

# Create database and user
psql -h YOUR_POSTGRES_IP -U postgres <<'EOF'
CREATE DATABASE rehearsekit;
CREATE USER rehearsekit WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE rehearsekit TO rehearsekit;
\q
EOF

# Test new user
psql -h YOUR_POSTGRES_IP -U rehearsekit -d rehearsekit -c "SELECT 1;"
```

**Expected:** Returns "1" if successful

### 4. Create Config Directory

```bash
sudo mkdir -p /mnt/tank/apps/rehearsekit/config
cd /mnt/tank/apps/rehearsekit/config
```

---

## Commands to Run on Your Mac

### 5. Transfer Config Files

```bash
# From RehearseKit project directory
cd /Users/i065699/work/projects/personal/RehearseKit

# Copy docker-compose
scp infrastructure/truenas/docker-compose.truenas.yml \
  admin@YOUR_TRUENAS_IP:/mnt/tank/apps/rehearsekit/config/docker-compose.yml

# Copy env template  
scp infrastructure/truenas/env.example \
  admin@YOUR_TRUENAS_IP:/mnt/tank/apps/rehearsekit/config/.env
```

---

## Back on TrueNAS

### 6. Configure Environment

```bash
cd /mnt/tank/apps/rehearsekit/config
nano .env
```

**Edit these lines:**
```bash
DOCKER_USERNAME=your-dockerhub-username
TRUENAS_IP=192.168.1.XXX
DATABASE_URL=postgresql+asyncpg://rehearsekit:YOUR_PASSWORD@192.168.1.XXX:5432/rehearsekit
API_URL=http://192.168.1.XXX:8000
WS_URL=ws://192.168.1.XXX:8001
STORAGE_PATH=/mnt/tank/apps/rehearsekit/storage
REDIS_DATA_PATH=/mnt/tank/apps/rehearsekit/redis
```

**Save:** Ctrl+X, Y, Enter

**Secure the file:**
```bash
chmod 600 .env
```

### 7. Pull Docker Images

```bash
docker-compose pull
```

**Duration:** ~5 minutes (downloading ~3 GB)

### 8. Start Services

```bash
docker-compose up -d
```

### 9. Verify Deployment

```bash
# Check containers
docker-compose ps

# Should see all "Up":
# - rehearsekit-frontend
# - rehearsekit-backend
# - rehearsekit-websocket
# - rehearsekit-worker
# - rehearsekit-redis
```

### 10. Check Health

```bash
curl http://localhost:8000/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy"
}
```

### 11. Run Database Migrations

```bash
docker exec -it rehearsekit-backend alembic upgrade head
```

### 12. Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

**Look for:** "Backend services are healthy"

---

## Test from Your Mac

### 13. Open Application

**Browser:** `http://YOUR_TRUENAS_IP:3000`

### 14. Create Test Job

1. Paste YouTube URL
2. Watch real-time progress
3. Download package
4. Open in Studio One 7
5. Verify 48kHz sample rate ✅

---

## Troubleshooting

### Containers won't start?

```bash
docker-compose logs backend
docker-compose logs worker
```

### Database connection failed?

```bash
# Test from TrueNAS
psql -h YOUR_POSTGRES_IP -U rehearsekit -d rehearsekit -c "SELECT 1;"
```

### Can't access from Mac?

```bash
# Check firewall on TrueNAS
# Verify you're on same network
ping YOUR_TRUENAS_IP
```

---

## Success Criteria

- [ ] All containers show "Up"
- [ ] Health check returns "healthy"
- [ ] Can access http://TRUENAS_IP:3000 from Mac
- [ ] Can create job
- [ ] Job processes successfully
- [ ] Download works
- [ ] Studio One opens at 48kHz

---

**Full guide:** `docs/truenas-deployment.md`


