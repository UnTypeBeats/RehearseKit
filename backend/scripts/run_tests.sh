#!/bin/bash

# Test runner script for RehearseKit backend
# This script runs the test suite with proper configuration

set -e

echo "🧪 Running RehearseKit Backend Tests"
echo "=================================="

# Check if we're in the backend directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Install test dependencies if not already installed
echo "📦 Installing test dependencies..."
pip install -r requirements.txt

# Set test environment variables
export TESTING=true
export DATABASE_URL="sqlite+aiosqlite:///:memory:"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET_KEY="test-secret-key-for-testing-only"
export GOOGLE_CLIENT_ID="test-client-id"
export GOOGLE_CLIENT_SECRET="test-client-secret"

# Run tests with coverage
echo "🚀 Running tests..."
pytest tests/ \
    --cov=app \
    --cov-report=html \
    --cov-report=term-missing \
    --cov-fail-under=80 \
    -v \
    --tb=short \
    --color=yes

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo "📊 Coverage report generated in htmlcov/index.html"
else
    echo ""
    echo "❌ Some tests failed!"
    exit 1
fi
