#!/bin/bash

# Script to generate secure secrets for RehearseKit
# This script creates secure random values for all sensitive configuration

set -e

# Create secrets directory if it doesn't exist
mkdir -p secrets

# Generate JWT secret key (64 characters for maximum security)
echo "Generating JWT secret key..."
python3 -c "import secrets; print(secrets.token_urlsafe(48))" > secrets/jwt_secret_key.txt

# Generate PostgreSQL password
echo "Generating PostgreSQL password..."
python3 -c "import secrets; print(secrets.token_urlsafe(32))" > secrets/postgres_password.txt

# Generate Google Client Secret (this should be replaced with actual Google OAuth secret)
echo "Generating placeholder Google Client Secret..."
echo "REPLACE_WITH_ACTUAL_GOOGLE_CLIENT_SECRET" > secrets/google_client_secret.txt

# Set proper permissions
chmod 600 secrets/*.txt

echo "✅ Secrets generated successfully!"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "1. The secrets are stored in ./secrets/ directory"
echo "2. These files contain sensitive information - never commit them to git"
echo "3. Replace the Google Client Secret with your actual Google OAuth secret"
echo "4. Copy config/env.example to .env and fill in your configuration"
echo ""
echo "Generated files:"
echo "- secrets/jwt_secret_key.txt"
echo "- secrets/postgres_password.txt" 
echo "- secrets/google_client_secret.txt"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Replace Google Client Secret with actual value from Google Console"
echo "3. Run: docker-compose -f docker-compose.secure.yml up"
