#!/bin/bash
# Complete RehearseKit TrueNAS Deployment
# Run this from your Mac - it does everything automatically

set -e

TRUENAS_IP="10.0.0.155"
TRUENAS_USER="oleg"
DEPLOY_PATH="/mnt/Odin/Applications/RehearseKit"

echo "🚀 RehearseKit - Complete TrueNAS Deployment"
echo "=============================================="
echo ""
echo "Target: ${TRUENAS_USER}@${TRUENAS_IP}"
echo "Path: ${DEPLOY_PATH}"
echo ""

# Step 1: Prepare TrueNAS
echo "📋 Step 1: Preparing TrueNAS (creating directories, database)..."
ssh ${TRUENAS_USER}@${TRUENAS_IP} 'bash -s' <<'ENDSSH'
set -e

# Create database using Docker PostgreSQL client
echo "  Creating PostgreSQL database..."
sudo docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "CREATE DATABASE rehearsekit;" 2>/dev/null || echo "  Database may already exist"
sudo docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE rehearsekit TO god;" 2>/dev/null || true

# Test
if sudo docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d rehearsekit -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL ready"
else
    echo "  ❌ PostgreSQL test failed (but continuing)"
fi

# Create directories
echo "  Creating storage directories..."
sudo mkdir -p /mnt/Odin/Applications/RehearseKit/config
sudo chown -R 1000:1000 /mnt/Odin/Applications/RehearseKit

echo "  ✅ Directories created"
ENDSSH

echo "✅ Step 1 complete"
echo ""

# Step 2: Transfer files
echo "📤 Step 2: Transferring configuration files..."
scp infrastructure/truenas/docker-compose.truenas.yml \
  ${TRUENAS_USER}@${TRUENAS_IP}:${DEPLOY_PATH}/config/docker-compose.yml

scp infrastructure/truenas/env.truenas-custom \
  ${TRUENAS_USER}@${TRUENAS_IP}:${DEPLOY_PATH}/config/.env

scp infrastructure/truenas/final-deploy.sh \
  ${TRUENAS_USER}@${TRUENAS_IP}:${DEPLOY_PATH}/config/final-deploy.sh

echo "✅ Files transferred"
echo ""

# Step 3: Deploy
echo "🎬 Step 3: Deploying services on TrueNAS..."
ssh ${TRUENAS_USER}@${TRUENAS_IP} "cd ${DEPLOY_PATH}/config && chmod +x final-deploy.sh && ./final-deploy.sh"

echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Access RehearseKit:"
echo "   http://10.0.0.155:30070"
echo ""
echo "📖 API Docs:"
echo "   http://10.0.0.155:30071/docs"
echo ""
echo "🎵 Test the YouTube → Studio One 7 workflow!"
echo ""
echo "📊 Monitor logs:"
echo "   ssh ${TRUENAS_USER}@${TRUENAS_IP}"
echo "   cd ${DEPLOY_PATH}/config"
echo "   docker-compose logs -f"
echo ""

