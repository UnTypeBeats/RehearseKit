#!/bin/bash
# Build and push Docker images locally
# Run this instead of GitHub Actions

set -e

# Configuration
DOCKER_USERNAME="${DOCKERHUB_USERNAME:-}"
TAG="${TAG:-latest}"

echo "🔧 RehearseKit - Local Docker Build & Push"
echo "=========================================="
echo ""

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo "⚠️  Not logged in to Docker Hub"
    echo "Run: docker login"
    exit 1
fi

echo "✅ Logged in to Docker Hub"
echo ""

# Get Docker Hub username if not set
if [ -z "$DOCKER_USERNAME" ]; then
    DOCKER_USERNAME=$(docker info | grep "Username" | awk '{print $2}')
    if [ -z "$DOCKER_USERNAME" ]; then
        echo "❌ Could not determine Docker Hub username"
        echo "Set it with: export DOCKERHUB_USERNAME=your-username"
        exit 1
    fi
fi

echo "📦 Docker Hub username: $DOCKER_USERNAME"
echo "🏷️  Tag: $TAG"
echo ""

# Build and push backend
echo "🔨 Building backend image..."
docker build -t $DOCKER_USERNAME/rehearsekit-backend:$TAG ./backend
echo "✅ Backend built"

echo "📤 Pushing backend..."
docker push $DOCKER_USERNAME/rehearsekit-backend:$TAG
echo "✅ Backend pushed"
echo ""

# Build and push frontend
echo "🔨 Building frontend image..."
docker build -t $DOCKER_USERNAME/rehearsekit-frontend:$TAG ./frontend
echo "✅ Frontend built"

echo "📤 Pushing frontend..."
docker push $DOCKER_USERNAME/rehearsekit-frontend:$TAG
echo "✅ Frontend pushed"
echo ""

# Build and push websocket
echo "🔨 Building websocket image..."
docker build -t $DOCKER_USERNAME/rehearsekit-websocket:$TAG ./websocket
echo "✅ WebSocket built"

echo "📤 Pushing websocket..."
docker push $DOCKER_USERNAME/rehearsekit-websocket:$TAG
echo "✅ WebSocket pushed"
echo ""

echo "=========================================="
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images:"
echo "  - $DOCKER_USERNAME/rehearsekit-backend:$TAG"
echo "  - $DOCKER_USERNAME/rehearsekit-frontend:$TAG"
echo "  - $DOCKER_USERNAME/rehearsekit-websocket:$TAG"
echo ""
echo "Next steps:"
echo "  1. SSH to TrueNAS"
echo "  2. Follow: docs/truenas-deployment.md"
echo "  3. Update .env with DOCKER_USERNAME=$DOCKER_USERNAME"
echo "  4. Run: docker-compose pull && docker-compose up -d"


