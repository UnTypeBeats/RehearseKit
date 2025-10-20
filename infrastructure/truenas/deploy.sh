#!/bin/bash
# RehearseKit TrueNAS Deployment Script
# Customized for: 10.0.0.155 (Odin pool)

set -e

echo "🚀 RehearseKit - TrueNAS Deployment"
echo "===================================="
echo ""
echo "Target: 10.0.0.155 (Odin pool)"
echo "Ports: 30070 (frontend), 30071 (backend), 30072 (websocket)"
echo ""

# Step 1: Create PostgreSQL database (using Docker)
echo "📊 Step 1: Creating PostgreSQL database..."
docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "CREATE DATABASE rehearsekit;" 2>/dev/null || echo "  Database may already exist"
docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE rehearsekit TO god;"

echo "✅ Database created"

# Test connection
echo "🔍 Testing PostgreSQL connection..."
if docker run --rm postgres:16 psql -h 10.0.0.155 -p 65430 -U god -d rehearsekit -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL connection successful"
else
    echo "❌ PostgreSQL connection failed"
    exit 1
fi

# Step 2: Create storage directory
echo "📁 Step 2: Creating storage directory..."
sudo mkdir -p /mnt/Odin/Applications/RehearseKit
sudo chown -R 1000:1000 /mnt/Odin/Applications/RehearseKit
echo "✅ Storage directory created"

# Step 3: Create config directory
echo "📁 Step 3: Creating config directory..."
sudo mkdir -p /mnt/Odin/Applications/RehearseKit/config
cd /mnt/Odin/Applications/RehearseKit/config
echo "✅ Config directory ready"

echo ""
echo "===================================="
echo "✅ TrueNAS preparation complete!"
echo ""
echo "Next steps (from your Mac):"
echo "  1. scp infrastructure/truenas/docker-compose.truenas.yml \\"
echo "       oleg@10.0.0.155:/mnt/Odin/Applications/RehearseKit/config/docker-compose.yml"
echo ""
echo "  2. scp infrastructure/truenas/env.truenas-custom \\"
echo "       oleg@10.0.0.155:/mnt/Odin/Applications/RehearseKit/config/.env"
echo ""
echo "  3. SSH back and run: cd /mnt/Odin/Applications/RehearseKit/config && ./final-deploy.sh"
echo ""

