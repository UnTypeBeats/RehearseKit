# Secure Deployment Guide

This guide explains how to securely deploy RehearseKit with proper secrets management and security best practices.

## Security Improvements Implemented

### 1. JWT Security
- ✅ **Removed hardcoded JWT secret key**
- ✅ **Implemented secure key generation**
- ✅ **Reduced access token expiration from 24 hours to 1 hour**
- ✅ **Added JWT token blacklisting/revocation system**
- ✅ **Added user token revocation capability**

### 2. Rate Limiting
- ✅ **Added rate limiting to authentication endpoints**
- ✅ **Google OAuth: 10 requests/minute**
- ✅ **Email/Password login: 5 requests/minute**
- ✅ **User registration: 3 requests/minute**

### 3. Secrets Management
- ✅ **Docker secrets for sensitive data**
- ✅ **Environment file separation**
- ✅ **Secure secret generation script**

### 4. Error Handling
- ✅ **Structured error responses**
- ✅ **Consistent error codes**
- ✅ **Detailed error logging**

## Secure Deployment Steps

### 1. Generate Secure Secrets

```bash
# Run the secret generation script
./scripts/generate-secrets.sh
```

This will create:
- `secrets/jwt_secret_key.txt` - Secure JWT signing key
- `secrets/postgres_password.txt` - Database password
- `secrets/google_client_secret.txt` - Google OAuth secret (placeholder)

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp config/env.example .env
```

Edit `.env` with your actual values:
```bash
# Database Configuration
POSTGRES_DB=rehearsekit
POSTGRES_USER=rehearsekit
POSTGRES_PASSWORD=your-secure-database-password

# JWT Configuration (will be read from secrets file)
JWT_SECRET_KEY=your-super-secure-jwt-secret-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google

# Frontend Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Admin Configuration
ADMIN_EMAIL=your-admin-email@example.com
```

### 3. Update Google OAuth Secret

Replace the placeholder in `secrets/google_client_secret.txt` with your actual Google OAuth client secret from the Google Cloud Console.

### 4. Deploy with Secure Configuration

Use the secure Docker Compose configuration:
```bash
docker-compose -f docker-compose.secure.yml up -d
```

## Security Features

### JWT Token Blacklisting
- Tokens can be revoked immediately upon logout
- User-specific token revocation for security incidents
- Redis-based blacklist for scalability

### Rate Limiting
- Prevents brute force attacks
- Protects against DDoS
- Configurable limits per endpoint

### Secrets Management
- Docker secrets for sensitive data
- No hardcoded credentials
- Proper file permissions (600)
- Git-ignored secrets directory

### Error Handling
- Structured error responses
- No sensitive information in error messages
- Consistent error codes for debugging

## Production Considerations

### 1. Environment Variables
- Use a secure secrets management system (e.g., HashiCorp Vault, AWS Secrets Manager)
- Rotate secrets regularly
- Use different secrets for different environments

### 2. Database Security
- Use strong, unique passwords
- Enable SSL/TLS for database connections
- Regular security updates

### 3. Network Security
- Use HTTPS in production
- Configure proper CORS origins
- Implement firewall rules

### 4. Monitoring
- Monitor authentication failures
- Set up alerts for suspicious activity
- Log security events

## Security Checklist

- [ ] JWT secret key is secure and unique
- [ ] Database password is strong and unique
- [ ] Google OAuth secrets are properly configured
- [ ] Rate limiting is enabled
- [ ] Token blacklisting is working
- [ ] Error messages don't leak sensitive information
- [ ] Secrets are not committed to version control
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured
- [ ] Database connections use SSL/TLS

## Troubleshooting

### Common Issues

1. **JWT Secret Key Error**
   - Ensure the secret key is at least 32 characters long
   - Check that the secrets file exists and is readable

2. **Rate Limiting Issues**
   - Adjust rate limits in the Docker Compose file if needed
   - Check Redis connectivity

3. **Token Blacklisting Not Working**
   - Verify Redis is running and accessible
   - Check Redis connection URL

4. **Google OAuth Issues**
   - Verify Google Client ID and Secret are correct
   - Check redirect URI configuration

## Security Updates

This implementation addresses the following security audit findings:

- ✅ **Critical**: Default JWT Secret Key in Production
- ✅ **High**: No Token Blacklisting/Revocation
- ✅ **High**: Weak JWT Expiration Policy
- ✅ **High**: Secrets in Docker Compose Files
- ✅ **Medium**: No Rate Limiting
- ✅ **Medium**: Poor Error Handling

For additional security measures, consider implementing:
- Multi-factor authentication
- Account lockout policies
- Security headers (HSTS, CSP, etc.)
- Regular security audits
- Penetration testing
