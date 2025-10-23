#!/bin/bash
# Redeploy RehearseKit to TrueNAS staging server
# Run this from your Mac to pull new images and restart services
# Usage: ./infrastructure/truenas/redeploy.sh

set -e

# Configuration
TRUENAS_HOST="oleg@10.0.0.155"
DEPLOY_PATH="/mnt/Odin/Applications/RehearseKit/config"

echo "🔄 RehearseKit - Redeploy to Staging"
echo "===================================="
echo "Target: ${TRUENAS_HOST}"
echo "Path: ${DEPLOY_PATH}"
echo ""

# Check SSH connection
echo "🔍 Checking SSH connection to TrueNAS..."
if ! ssh -o ConnectTimeout=5 "${TRUENAS_HOST}" "echo '✅ SSH connection successful'" 2>/dev/null; then
    echo "❌ Cannot connect to ${TRUENAS_HOST}"
    echo "Please check:"
    echo "  1. TrueNAS server is running"
    echo "  2. SSH is enabled"
    echo "  3. You have SSH key configured"
    exit 1
fi

echo ""

# Execute deployment commands on remote server
echo "📥 Pulling latest Docker images..."
ssh "${TRUENAS_HOST}" << 'EOF'
set -e
cd /mnt/Odin/Applications/RehearseKit/config

# Pull latest images
echo "Pulling from Docker Hub (kossoy/rehearsekit-*)..."
sudo docker compose pull

echo ""
echo "🔄 Restarting services..."
sudo docker compose up -d

echo ""
echo "⏳ Waiting for services to initialize (10 seconds)..."
sleep 10

echo ""
echo "📊 Container status:"
sudo docker compose ps

echo ""
echo "🗄️  Running database migrations..."
sudo docker exec rehearsekit-backend alembic upgrade head || echo "⚠️  Migrations failed or not needed"

echo ""
echo "🏥 Health check..."
if curl -s http://localhost:30071/api/health | grep -q "healthy"; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed - check logs with: sudo docker compose logs -f"
fi
EOF

echo ""
echo "===================================="
echo "✅ Redeploy complete!"
echo ""
echo "Access RehearseKit at:"
echo "  https://rehearsekit.uk (via Cloudflare)"
echo "  http://10.0.0.155:30070 (direct)"
echo ""
echo "API documentation:"
echo "  http://10.0.0.155:30071/docs"
echo ""
echo "Useful commands (SSH into server):"
echo "  ssh ${TRUENAS_HOST}"
echo "  cd ${DEPLOY_PATH}"
echo "  sudo docker compose logs -f        # View logs"
echo "  sudo docker compose ps             # Check status"
echo "  sudo docker compose restart        # Restart all"
echo "  sudo docker compose down           # Stop all"
echo ""