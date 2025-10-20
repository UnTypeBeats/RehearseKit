#!/bin/bash
# Final deployment step on TrueNAS
# Run this after transferring files from Mac

set -e

cd /mnt/Odin/Applications/RehearseKit/config

echo "🚀 RehearseKit - Final Deployment"
echo "=================================="
echo ""

# Secure env file
echo "🔒 Securing .env file..."
chmod 600 .env
echo "✅ .env secured"

# Test Redis
echo "🔍 Testing Redis connection..."
if redis-cli -h 10.0.0.155 -p 30059 ping > /dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "⚠️  Redis connection failed - deployment will continue but may have issues"
fi

# Pull images
echo "📥 Pulling Docker images from Docker Hub (kossoy/rehearsekit-*)..."
echo "This will take 2-3 minutes..."
sudo docker compose pull

echo "✅ Images pulled"

# Start services
echo "🎬 Starting RehearseKit services..."
sudo docker compose up -d

echo "✅ Services started"

# Wait for services to initialize
echo "⏳ Waiting for services to initialize (10 seconds)..."
sleep 10

# Check container status
echo "📊 Container status:"
sudo docker compose ps

# Health check
echo ""
echo "🏥 Health check..."
if curl -s http://localhost:30071/api/health | grep -q "healthy"; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed - check logs"
fi

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
sudo docker exec rehearsekit-backend alembic upgrade head || echo "⚠️  Migrations may have failed - check logs"

echo ""
echo "===================================="
echo "✅ Deployment complete!"
echo ""
echo "Access RehearseKit at:"
echo "  http://10.0.0.155:30070"
echo ""
echo "API documentation:"
echo "  http://10.0.0.155:30071/docs"
echo ""
echo "Check logs:"
echo "  sudo docker compose logs -f"
echo ""
echo "Stop services:"
echo "  sudo docker compose down"
echo ""

