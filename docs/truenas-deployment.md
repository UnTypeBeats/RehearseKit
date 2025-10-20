# TrueNAS SCALE Deployment Guide

**Version:** 1.0  
**Last Updated:** October 20, 2025  
**TrueNAS Version:** 25.04.2.4  
**Deployment Type:** Docker Compose Custom App

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step 1: Prepare TrueNAS Environment](#step-1-prepare-truenas-environment)
5. [Step 2: Build and Publish Docker Images](#step-2-build-and-publish-docker-images)
6. [Step 3: Deploy Application](#step-3-deploy-application)
7. [Step 4: Verify Deployment](#step-4-verify-deployment)
8. [Step 5: Access Application](#step-5-access-application)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Backup and Recovery](#backup-and-recovery)
12. [Upgrading](#upgrading)

---

## Overview

This guide walks through deploying RehearseKit on TrueNAS SCALE 25.04+ using Docker Compose. The deployment connects to your existing PostgreSQL database and stores audio files on TrueNAS datasets for reliability and easy backup.

### Why TrueNAS?

- ✅ **Physical access** for debugging
- ✅ **No cloud costs** (vs. $200-400/month on GCP)
- ✅ **ZFS storage** for data integrity
- ✅ **Existing infrastructure** (PostgreSQL, networking)
- ✅ **SMB/SSH access** for management

### Deployment Strategy

- **PostgreSQL:** Use existing TrueNAS database (not containerized)
- **Redis:** Deploy in container (ephemeral cache)
- **Storage:** TrueNAS datasets mounted as volumes
- **Services:** Frontend, Backend, Worker, WebSocket (all containerized)

---

## Prerequisites

### TrueNAS Requirements

- TrueNAS SCALE 25.04.2.4 or later
- Docker/Kubernetes support enabled
- At least 20GB free storage for datasets
- 8GB+ RAM available for containers
- 4+ CPU cores recommended

### Existing Services

- ✅ PostgreSQL database accessible via TCP/IP
- ✅ Network connectivity to TrueNAS
- ✅ SSH/SMB access to TrueNAS

### External Requirements

- Docker Hub account (for storing images)
- GitHub account (for building images via Actions)
- Git installed on development machine

### Software Versions

- Python 3.11+ (for development/testing)
- Node.js 20+ (for development/testing)
- Docker 24+ (for local testing)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TrueNAS SCALE                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Docker Compose Stack (rehearsekit)            │   │
│  │                                                         │   │
│  │  ┌───────────┐  ┌──────────┐  ┌───────────┐           │   │
│  │  │ Frontend  │  │ Backend  │  │ WebSocket │           │   │
│  │  │ (Next.js) │  │ (FastAPI)│  │  (FastAPI)│           │   │
│  │  │  :3000    │  │  :8000   │  │   :8001   │           │   │
│  │  └─────┬─────┘  └────┬─────┘  └─────┬─────┘           │   │
│  │        │             │               │                 │   │
│  │        └──────┬──────┴───────┬───────┘                 │   │
│  │               │              │                         │   │
│  │        ┌──────▼──────┐  ┌────▼─────┐                  │   │
│  │        │   Worker    │  │  Redis   │                  │   │
│  │        │  (Celery)   │  │  :6379   │                  │   │
│  │        └──────┬──────┘  └────┬─────┘                  │   │
│  │               │              │                         │   │
│  └───────────────┼──────────────┼─────────────────────────┘   │
│                  │              │                             │
│         ┌────────▼──────────────▼─────┐                       │
│         │   Redis Data Volume         │                       │
│         │ /mnt/tank/apps/.../redis    │                       │
│         └─────────────────────────────┘                       │
│                  │                                            │
│         ┌────────▼──────────────────────┐                     │
│         │  Storage Volume (ZFS Dataset) │                     │
│         │ /mnt/tank/apps/.../storage    │                     │
│         │  - uploads/                   │                     │
│         │  - stems/                     │                     │
│         │  - packages/                  │                     │
│         └───────────────────────────────┘                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Existing PostgreSQL (Not Containerized)         │  │
│  │         postgresql://rehearsekit:***@IP:5432            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Docker Hub      │
                    │   (Image Registry)│
                    └───────────────────┘
```

---

## Step 1: Prepare TrueNAS Environment

### 1.1 Create Datasets

SSH into your TrueNAS server:

```bash
ssh admin@<truenas-ip>
```

Create datasets for RehearseKit:

```bash
# Navigate to your apps pool (adjust 'tank' to your pool name)
cd /mnt/tank

# Create base directory
sudo mkdir -p apps/rehearsekit

# Create datasets
sudo zfs create tank/apps/rehearsekit/storage
sudo zfs create tank/apps/rehearsekit/redis

# Set permissions
# 1000:1000 is the default user:group in backend/worker containers
sudo chown -R 1000:1000 /mnt/tank/apps/rehearsekit/storage

# 999:999 is the default redis user:group
sudo chown -R 999:999 /mnt/tank/apps/rehearsekit/redis

# Verify creation
zfs list | grep rehearsekit
```

Expected output:
```
tank/apps/rehearsekit/storage    96K   500G   96K  /mnt/tank/apps/rehearsekit/storage
tank/apps/rehearsekit/redis      96K   500G   96K  /mnt/tank/apps/rehearsekit/redis
```

### 1.2 Configure PostgreSQL

#### Option A: Using Existing PostgreSQL

If PostgreSQL is already running on TrueNAS:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE rehearsekit;
CREATE USER rehearsekit WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE rehearsekit TO rehearsekit;

# Exit psql
\q
```

#### Option B: New PostgreSQL Installation

If you need to install PostgreSQL:

```bash
# Install via pkg (if not using containers)
sudo pkg install postgresql16-server postgresql16-client

# Or deploy PostgreSQL as a separate container/app
# (See TrueNAS app catalog for PostgreSQL)
```

#### Verify PostgreSQL Access

Test connectivity from TrueNAS:

```bash
psql -h <postgres-host> -U rehearsekit -d rehearsekit -c "SELECT version();"
```

**Note the connection details:**
- Host: `<postgres-host-ip>` (e.g., 192.168.1.100)
- Port: `5432` (default)
- Database: `rehearsekit`
- User: `rehearsekit`
- Password: `<your-password>`

### 1.3 Create Deployment Directory

Create a directory for deployment files:

```bash
sudo mkdir -p /mnt/tank/apps/rehearsekit/config
cd /mnt/tank/apps/rehearsekit/config
```

---

## Step 2: Build and Publish Docker Images

### 2.1 Configure Docker Hub

1. Create a Docker Hub account: https://hub.docker.com/signup
2. Create an access token:
   - Go to Account Settings → Security → Access Tokens
   - Click "New Access Token"
   - Name: `rehearsekit-github-actions`
   - Permissions: Read, Write, Delete
   - Save the token (you won't see it again!)

### 2.2 Configure GitHub Secrets

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: The access token from step 2.1

### 2.3 Build Images via GitHub Actions

#### Method A: Automatic Build (on push to main)

The images build automatically when you push to the `main` branch:

```bash
# From your local development machine
git add .
git commit -m "Prepare for TrueNAS deployment"
git push origin main
```

Monitor the build:
- Go to your GitHub repository
- Click "Actions" tab
- Watch "Build and Push Docker Images" workflow

#### Method B: Manual Build

Trigger the workflow manually:

1. Go to GitHub repository → Actions
2. Select "Build and Push Docker Images"
3. Click "Run workflow"
4. Choose branch: `main`
5. Enter tag (or leave as `latest`)
6. Click "Run workflow"

### 2.4 Verify Images

After the build completes (5-10 minutes), verify on Docker Hub:

```
https://hub.docker.com/u/<your-username>/repositories
```

You should see:
- `<your-username>/rehearsekit-backend:latest`
- `<your-username>/rehearsekit-frontend:latest`
- `<your-username>/rehearsekit-websocket:latest`

### 2.5 Test Images Locally (Optional)

Before deploying to TrueNAS, test locally:

```bash
# Pull images
docker pull <your-username>/rehearsekit-backend:latest
docker pull <your-username>/rehearsekit-frontend:latest
docker pull <your-username>/rehearsekit-websocket:latest

# Test backend
docker run --rm <your-username>/rehearsekit-backend:latest python -c "import app; print('OK')"
```

---

## Step 3: Deploy Application

### 3.1 Transfer Deployment Files to TrueNAS

From your development machine:

```bash
# Clone repository (if not already)
git clone https://github.com/<your-org>/RehearseKit.git
cd RehearseKit

# Copy deployment files to TrueNAS via SCP
scp infrastructure/truenas/docker-compose.truenas.yml admin@<truenas-ip>:/mnt/tank/apps/rehearsekit/config/docker-compose.yml

scp infrastructure/truenas/env.example admin@<truenas-ip>:/mnt/tank/apps/rehearsekit/config/env.example
```

Alternatively, use SMB:
1. Mount TrueNAS SMB share
2. Navigate to `apps/rehearsekit/config/`
3. Copy files directly

### 3.2 Configure Environment

SSH into TrueNAS:

```bash
ssh admin@<truenas-ip>
cd /mnt/tank/apps/rehearsekit/config
```

Create `.env` file:

```bash
cp env.example .env
nano .env  # or vi, emacs, etc.
```

Fill in your values:

```bash
# Docker Registry
DOCKER_REGISTRY=docker.io
DOCKER_USERNAME=your-dockerhub-username
IMAGE_TAG=latest

# Network
TRUENAS_IP=192.168.1.100  # Your TrueNAS IP
FRONTEND_PORT=3000
BACKEND_PORT=8000
WEBSOCKET_PORT=8001
REDIS_PORT=6379

# Database (from Step 1.2)
DATABASE_URL=postgresql+asyncpg://rehearsekit:YOUR_PASSWORD@192.168.1.100:5432/rehearsekit

# Application URLs
API_URL=http://192.168.1.100:8000
WS_URL=ws://192.168.1.100:8001

# Storage Paths (from Step 1.1)
STORAGE_PATH=/mnt/tank/apps/rehearsekit/storage
REDIS_DATA_PATH=/mnt/tank/apps/rehearsekit/redis
```

**Security Tip:** Restrict permissions on `.env`:

```bash
chmod 600 .env
```

### 3.3 Deploy Stack

Still in `/mnt/tank/apps/rehearsekit/config/`:

```bash
# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Verify containers started
docker-compose ps
```

Expected output:
```
NAME                      IMAGE                                    STATUS
rehearsekit-backend       your-user/rehearsekit-backend:latest     Up
rehearsekit-frontend      your-user/rehearsekit-frontend:latest    Up
rehearsekit-websocket     your-user/rehearsekit-websocket:latest   Up
rehearsekit-worker        your-user/rehearsekit-backend:latest     Up
rehearsekit-redis         redis:7-alpine                           Up
```

### 3.4 Check Logs

Monitor startup logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 50 lines
docker-compose logs --tail=50 worker
```

Look for:
- ✅ `Backend services are healthy`
- ✅ `Connected to database`
- ✅ `Celery worker ready`
- ❌ Any errors or stack traces

---

## Step 4: Verify Deployment

### 4.1 Health Checks

Test backend health:

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy"
}
```

Test frontend:

```bash
curl -I http://localhost:3000
```

Should return `HTTP/1.1 200 OK`.

### 4.2 Database Migration

Check if database tables were created:

```bash
psql -h localhost -U rehearsekit -d rehearsekit -c "\dt"
```

Expected tables:
```
 Schema |      Name       | Type  |   Owner
--------+-----------------+-------+------------
 public | alembic_version | table | rehearsekit
 public | jobs            | table | rehearsekit
```

If tables are missing, run migrations manually:

```bash
# Enter backend container
docker exec -it rehearsekit-backend /bin/bash

# Run migrations
alembic upgrade head

# Exit container
exit
```

### 4.3 Test Job Creation

Create a test job via API:

```bash
curl -X POST http://localhost:8000/api/jobs/create \
  -F "project_name=Test Job" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

Check response for job ID, then monitor:

```bash
# Watch worker logs
docker-compose logs -f worker
```

You should see processing stages: CONVERTING → ANALYZING → SEPARATING → COMPLETED

---

## Step 5: Access Application

### 5.1 Local Access (TrueNAS Network)

From any device on the same network:

```
http://<truenas-ip>:3000
```

Example: `http://192.168.1.100:3000`

### 5.2 External Access (Optional)

#### Option A: Port Forwarding

Configure your router to forward port 3000 to TrueNAS:
- External Port: 3000
- Internal IP: `<truenas-ip>`
- Internal Port: 3000

Access via: `http://<your-public-ip>:3000`

**Security Warning:** Exposes application to internet. Use firewall rules.

#### Option B: Reverse Proxy (Recommended)

Set up Nginx on TrueNAS or separate server:

```nginx
# /etc/nginx/sites-available/rehearsekit
server {
    listen 80;
    server_name rehearsekit.yourdomain.com;

    location / {
        proxy_pass http://<truenas-ip>:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://<truenas-ip>:8000;
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://<truenas-ip>:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Add SSL with Let's Encrypt:

```bash
sudo certbot --nginx -d rehearsekit.yourdomain.com
```

#### Option C: Tailscale/ZeroTier

Use mesh VPN for secure remote access without port forwarding.

---

## Maintenance

### Daily Operations

#### View Running Containers

```bash
cd /mnt/tank/apps/rehearsekit/config
docker-compose ps
```

#### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart worker
```

#### View Logs

```bash
# Continuous logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

### Resource Monitoring

#### Container Stats

```bash
docker stats
```

Shows CPU, memory, network usage.

#### Disk Usage

```bash
# Check dataset usage
zfs list | grep rehearsekit

# Check storage contents
du -sh /mnt/tank/apps/rehearsekit/storage/*
```

### Cleanup Old Jobs

Jobs accumulate over time. Clean up manually or create a cron job:

```bash
# List old jobs (>7 days)
find /mnt/tank/apps/rehearsekit/storage/uploads -type f -mtime +7

# Delete old jobs
find /mnt/tank/apps/rehearsekit/storage/uploads -type f -mtime +7 -delete
find /mnt/tank/apps/rehearsekit/storage/stems -type d -mtime +7 -exec rm -rf {} +
find /mnt/tank/apps/rehearsekit/storage/packages -type f -mtime +7 -delete
```

**Automated cleanup (cron):**

```bash
# Edit crontab
crontab -e

# Add daily cleanup at 3 AM
0 3 * * * find /mnt/tank/apps/rehearsekit/storage/uploads -type f -mtime +7 -delete
0 3 * * * find /mnt/tank/apps/rehearsekit/storage/packages -type f -mtime +7 -delete
```

---

## Troubleshooting

### Issue: Container Won't Start

**Symptom:** `docker-compose ps` shows container with status "Exited (1)"

**Diagnosis:**
```bash
docker-compose logs <service-name>
```

**Common Causes:**
1. **Database connection failed**
   - Check `DATABASE_URL` in `.env`
   - Verify PostgreSQL is running: `pg_isready -h <db-host>`
   - Check firewall: `telnet <db-host> 5432`

2. **Missing environment variable**
   - Review `.env` file for typos
   - Restart after changes: `docker-compose up -d`

3. **Port conflict**
   - Check if port already in use: `netstat -tulpn | grep <port>`
   - Change port in `.env`

### Issue: Worker Not Processing Jobs

**Symptom:** Jobs stuck in PENDING status

**Diagnosis:**
```bash
# Check worker logs
docker-compose logs -f worker

# Check Celery connection to Redis
docker exec -it rehearsekit-worker celery -A app.celery_app inspect ping
```

**Solutions:**
1. **Restart worker:**
   ```bash
   docker-compose restart worker
   ```

2. **Check Redis connectivity:**
   ```bash
   docker exec -it rehearsekit-redis redis-cli ping
   # Should return: PONG
   ```

3. **Purge task queue:**
   ```bash
   docker exec -it rehearsekit-worker celery -A app.celery_app purge
   ```

### Issue: Frontend Can't Reach Backend

**Symptom:** Frontend loads but shows "Cannot connect to backend"

**Diagnosis:**
```bash
# Test from TrueNAS
curl http://localhost:8000/api/health

# Test from frontend container
docker exec -it rehearsekit-frontend curl http://backend:8000/api/health
```

**Solutions:**
1. **Check API_URL in .env:**
   - Must be accessible from browser (not from container)
   - Use TrueNAS IP, not `localhost` or container name

2. **Verify backend is running:**
   ```bash
   docker-compose ps backend
   ```

3. **Check CORS settings:**
   - Backend logs should not show CORS errors
   - Update `CORS_ORIGINS` in backend environment

### Issue: Storage Permission Denied

**Symptom:** Jobs fail with "Permission denied" when writing files

**Diagnosis:**
```bash
# Check ownership
ls -la /mnt/tank/apps/rehearsekit/storage/

# Check from container
docker exec -it rehearsekit-backend ls -la /mnt/storage/rehearsekit/
```

**Solution:**
```bash
# Fix permissions
sudo chown -R 1000:1000 /mnt/tank/apps/rehearsekit/storage/
sudo chmod -R 755 /mnt/tank/apps/rehearsekit/storage/

# Restart services
docker-compose restart
```

### Issue: WebSocket Connection Drops

**Symptom:** Progress updates stop after a few seconds

**Solutions:**
1. **Check WebSocket service logs:**
   ```bash
   docker-compose logs -f websocket
   ```

2. **Verify WS_URL in .env:**
   - Use `ws://` (not `http://`)
   - Use TrueNAS IP (not localhost)

3. **Test WebSocket connection:**
   ```bash
   # Install wscat
   npm install -g wscat
   
   # Test connection
   wscat -c ws://<truenas-ip>:8001/ws/jobs/<job-id>
   ```

---

## Backup and Recovery

### Backup Strategy

#### 1. Database Backup (PostgreSQL)

```bash
# Manual backup
pg_dump -h <db-host> -U rehearsekit rehearsekit > /mnt/tank/backups/rehearsekit-db-$(date +%Y%m%d).sql

# Automated daily backup (cron)
0 2 * * * pg_dump -h localhost -U rehearsekit rehearsekit > /mnt/tank/backups/rehearsekit-db-$(date +\%Y\%m\%d).sql
```

#### 2. Storage Backup (ZFS Snapshots)

```bash
# Create snapshot
sudo zfs snapshot tank/apps/rehearsekit/storage@$(date +%Y%m%d)

# List snapshots
zfs list -t snapshot | grep rehearsekit

# Automated snapshots (TrueNAS periodic snapshot task)
# Go to: Data Protection → Periodic Snapshot Tasks → Add
```

#### 3. Configuration Backup

```bash
# Backup .env and docker-compose.yml
tar -czf /mnt/tank/backups/rehearsekit-config-$(date +%Y%m%d).tar.gz \
  -C /mnt/tank/apps/rehearsekit/config .
```

### Recovery

#### Restore Database

```bash
# Drop existing database (if needed)
psql -h <db-host> -U postgres -c "DROP DATABASE rehearsekit;"
psql -h <db-host> -U postgres -c "CREATE DATABASE rehearsekit OWNER rehearsekit;"

# Restore from backup
psql -h <db-host> -U rehearsekit rehearsekit < /mnt/tank/backups/rehearsekit-db-20251020.sql
```

#### Restore Storage

```bash
# Rollback to snapshot
sudo zfs rollback tank/apps/rehearsekit/storage@20251020

# Or clone snapshot
sudo zfs clone tank/apps/rehearsekit/storage@20251020 tank/apps/rehearsekit/storage-restored
```

#### Restore Configuration

```bash
cd /mnt/tank/apps/rehearsekit/config
tar -xzf /mnt/tank/backups/rehearsekit-config-20251020.tar.gz
```

---

## Upgrading

### Update to New Version

1. **Pull new code:**
   ```bash
   cd ~/RehearseKit
   git pull origin main
   ```

2. **Build new images** (via GitHub Actions)
   - Push to main, or manually trigger workflow

3. **On TrueNAS, pull new images:**
   ```bash
   cd /mnt/tank/apps/rehearsekit/config
   docker-compose pull
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

5. **Run database migrations (if needed):**
   ```bash
   docker-compose run --rm backend alembic upgrade head
   ```

6. **Start services:**
   ```bash
   docker-compose up -d
   ```

7. **Verify:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   curl http://localhost:8000/api/health
   ```

### Rollback

If upgrade fails:

```bash
# Use previous image tag
nano .env
# Change: IMAGE_TAG=previous-version

# Pull old images
docker-compose pull

# Restart
docker-compose up -d
```

---

## Next Steps

After successful deployment:

1. ✅ **Test complete workflow:** Upload → Process → Download
2. ✅ **Set up automated backups** (database + ZFS snapshots)
3. ✅ **Configure monitoring** (optional: Grafana + Prometheus)
4. ✅ **Set up job cleanup cron** (prevent storage bloat)
5. ✅ **Document your specific configuration** (IPs, credentials, etc.)

---

## Support

- **Documentation:** `docs/` directory
- **GitHub Issues:** https://github.com/<your-org>/RehearseKit/issues
- **Local logs:** `docker-compose logs`

---

**Deployment Complete!** 🎉

Your RehearseKit instance should now be running on TrueNAS SCALE.

