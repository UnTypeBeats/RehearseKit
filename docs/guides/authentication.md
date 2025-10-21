# Authentication Guide

This guide explains how to set up and use authentication in RehearseKit.

## Overview

RehearseKit supports two authentication methods:
1. **Google OAuth** (Primary, recommended)
2. **Email/Password** (Optional, for users who prefer not to use Google)

## Features

- **Single Admin User**: Configure admin email in `.env` (defaults to `oleg@befeast.com`)
- **Anonymous Usage**: Users can still create jobs without signing in
- **Job Ownership**: Authenticated users can track and manage their jobs
- **Secure**: JWT tokens with automatic refresh, bcrypt password hashing

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: RehearseKit
   - User support email: your email
   - Developer contact: your email
6. Application type: **Web application**
7. Name: RehearseKit Web Client
8. Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://10.0.0.155:30070
   https://rehearsekit.uk
   ```
9. Authorized redirect URIs:
   ```
   http://localhost:3000
   http://10.0.0.155:30070
   https://rehearsekit.uk
   ```
10. Click **Create**
11. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

**Backend (`backend/.env`):**
```bash
# JWT Configuration
JWT_SECRET_KEY=generate-a-secure-random-key-here  # Use: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google

# Admin User
ADMIN_EMAIL=oleg@befeast.com
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Step 3: Generate JWT Secret

```bash
# Generate a secure random key
openssl rand -hex 32
```

Copy the output to `JWT_SECRET_KEY` in your backend `.env` file.

## Database Migration

Run the database migration to create the users table:

```bash
cd backend
alembic upgrade head
```

## Create Admin User

Run the admin user creation script:

```bash
cd backend
python scripts/create_admin.py
```

This creates an admin user with:
- Email: Value from `ADMIN_EMAIL` env var
- Default password: `admin123` (change immediately!)
- Can also log in via Google OAuth

**Important**: Change the default password after first login.

## Usage

### For End Users

1. **Sign In**:
   - Click "Sign In" button in the header
   - Choose "Sign in with Google" (recommended)
   - Or use email/password if registered

2. **Create Jobs**:
   - Jobs created while signed in are associated with your account
   - Anonymous jobs are still allowed

3. **Manage Profile**:
   - Click your avatar in the header
   - View profile information
   - Log out when done

### For Developers

#### Auth Context

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }
  
  return <div>Welcome, {user.full_name}!</div>;
}
```

#### Protected Routes (Optional)

```typescript
// components/protected-route.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

#### API with Auth Headers

The API client automatically includes authentication headers when a user is logged in:

```typescript
import { apiClient } from '@/utils/api';

// This will include auth headers if user is logged in
const job = await apiClient.createJob(jobData, file);
```

## Security Best Practices

### Production Deployment

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Cookies**: Cookies are automatically set to `secure` in production
3. **Strong JWT Secret**: Use a cryptographically secure random key
4. **Update Redirect URIs**: Add your production domain to Google OAuth settings

### Token Management

- **Access tokens** expire after 24 hours
- **Refresh tokens** expire after 7 days
- Tokens are automatically refreshed every 20 hours
- Tokens are stored in cookies (more secure than localStorage)

### Password Requirements

For email/password authentication:
- Minimum 8 characters
- Hashed with bcrypt before storage
- Never stored in plain text

## Troubleshooting

### Google OAuth Not Working

1. **Check Client ID**: Ensure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
2. **Verify Redirect URIs**: Must match exactly in Google Console
3. **Check Origins**: JavaScript origins must include your domain
4. **Browser Console**: Check for CORS errors

### Token Expiration

If you're logged out frequently:
1. Check JWT_SECRET_KEY is consistent across restarts
2. Verify system time is correct (JWT uses timestamps)
3. Check browser cookies are enabled

### Admin Access

To make a user an admin:
```sql
-- Connect to PostgreSQL
UPDATE users SET is_admin = true WHERE email = 'user@example.com';
```

Or update `ADMIN_EMAIL` in `.env` and they'll be made admin on next Google login.

## API Endpoints

### Authentication

- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update current user

See `/docs` (Swagger UI) for full API documentation.

## Future Enhancements

Planned features for authentication:
- [ ] Email verification for email/password signup
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] Facebook OAuth integration
- [ ] User job history and filtering
- [ ] Storage quotas per user
- [ ] Job sharing between users

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/UnTypeBeats/RehearseKit/issues)
- Review [Development Guide](DEVELOPMENT_GUIDE.md)
- Contact: support@rehearsekit.uk

