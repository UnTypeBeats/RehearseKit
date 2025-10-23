"""
Authentication API endpoints
- Google OAuth login
- Optional email/password login/registration
- Token refresh
- User profile
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    create_access_token, create_refresh_token, decode_token, verify_token_type,
    blacklist_token, is_token_blacklisted, revoke_user_tokens, is_user_revoked
)
from app.core.oauth import google_oauth
from app.core.exceptions import (
    AuthenticationError, TokenError, GoogleAuthError, RateLimitError,
    create_structured_error_response
)
from app.models.user import User
from app.schemas.user import (
    Token, UserResponse, GoogleAuthRequest, UserLogin, UserRegister,
    RefreshTokenRequest, UserUpdate
)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)


def is_email_whitelisted(email: str) -> bool:
    """
    Check if email domain is in the whitelisted domains list
    Users from whitelisted domains are auto-approved (is_active=True)
    """
    if not email:
        return False

    email_domain = email.split("@")[-1].lower()
    return email_domain in settings.WHITELISTED_DOMAINS


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token (including pending users)
    Raises 401 if token is invalid or user not found
    Does NOT check is_active - use get_current_active_user for that
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise TokenError(
            detail="Token has been revoked",
            token_type="access"
        )

    payload = decode_token(token)

    if not payload or not verify_token_type(payload, "access"):
        raise TokenError(
            detail="Invalid or expired token",
            token_type="access"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise TokenError(
            detail="Invalid token payload - missing user ID",
            token_type="access"
        )

    # Check if user tokens were revoked after this token was issued
    token_issued_at = payload.get("iat", 0)
    if is_user_revoked(user_id, token_issued_at):
        raise TokenError(
            detail="Token has been revoked",
            token_type="access"
        )

    # Fetch user from database
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError(
            detail="User not found",
            error_code="USER_NOT_FOUND"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user (is_active=True)
    Use this for protected endpoints that require approved users
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval. Please wait for an administrator to approve your account.",
            headers={"X-Account-Status": "pending"}
        )

    return current_user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns User if authenticated, None otherwise
    Does not raise exceptions for missing/invalid tokens
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


@router.post("/google", response_model=Token)
@limiter.limit("10/minute")
async def google_auth(
    request: Request,
    auth_request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with Google OAuth
    Creates new user if doesn't exist, updates existing user info
    """
    # Verify ID token and get user info
    try:
        user_info = await google_oauth.verify_id_token(auth_request.id_token)
    except Exception as e:
        raise GoogleAuthError(
            detail="Failed to verify Google ID token",
            google_error=str(e)
        )

    if not user_info:
        raise GoogleAuthError(
            detail="Invalid Google ID token",
            google_error="Token verification returned no user info"
        )
    
    oauth_id = user_info["oauth_id"]
    email = user_info["email"]
    
    # Check if user exists by OAuth ID
    result = await db.execute(
        select(User).where(
            User.oauth_provider == "google",
            User.oauth_id == oauth_id
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Check if user exists by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            # Update existing user with OAuth info
            user.oauth_provider = "google"
            user.oauth_id = oauth_id
            user.avatar_url = user_info.get("avatar_url") or user.avatar_url
            user.full_name = user_info.get("full_name") or user.full_name
        else:
            # Create new user
            # Auto-approve users from whitelisted domains, otherwise require admin approval
            is_whitelisted = is_email_whitelisted(email)
            is_admin = (email == settings.ADMIN_EMAIL)

            user = User(
                email=email,
                full_name=user_info.get("full_name"),
                avatar_url=user_info.get("avatar_url"),
                oauth_provider="google",
                oauth_id=oauth_id,
                is_admin=is_admin,
                is_active=is_whitelisted or is_admin  # Auto-approve whitelisted domains or admin
            )
            db.add(user)
    else:
        # Update existing OAuth user info
        user.avatar_url = user_info.get("avatar_url") or user.avatar_url
        user.full_name = user_info.get("full_name") or user.full_name
    
    # Update last login
    user.update_last_login()
    
    await db.commit()
    await db.refresh(user)
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=Token)
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register new user with email/password (optional feature)
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    # Auto-approve users from whitelisted domains, otherwise require admin approval
    is_whitelisted = is_email_whitelisted(user_data.email)
    is_admin = (user_data.email == settings.ADMIN_EMAIL)

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        oauth_provider="email",
        is_admin=is_admin,
        is_active=is_whitelisted or is_admin  # Auto-approve whitelisted domains or admin
    )
    user.set_password(user_data.password)
    user.update_last_login()
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email/password (optional feature)
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not user.verify_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    user.update_last_login()
    await db.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    payload = decode_token(token_request.refresh_token)
    
    if not payload or not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile
    """
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user)
):
    """
    Logout endpoint - blacklists the current token
    """
    token = credentials.credentials
    
    # Blacklist the current token
    blacklist_success = blacklist_token(token)
    
    if blacklist_success:
        return {"message": "Logged out successfully"}
    else:
        # Even if blacklisting fails, we still consider logout successful
        # The token will expire naturally
        return {"message": "Logged out successfully (token will expire naturally)"}


@router.post("/revoke-all-tokens")
async def revoke_all_tokens(
    current_user: User = Depends(get_current_user)
):
    """
    Revoke all tokens for the current user (useful for security incidents)
    """
    user_id = str(current_user.id)
    
    # Revoke all tokens for this user
    revoke_success = revoke_user_tokens(user_id)
    
    if revoke_success:
        return {"message": "All tokens for this user have been revoked"}
    else:
        return {"message": "Token revocation may have failed, but tokens will expire naturally"}


@router.get("/config")
async def get_config():
    """
    Get frontend configuration including Google Client ID
    """
    return {
        "googleClientId": settings.GOOGLE_CLIENT_ID
    }

