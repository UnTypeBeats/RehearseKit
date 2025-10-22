"""
Security utilities for authentication
- Password hashing using bcrypt
- JWT token generation and validation
- Token blacklisting/revocation
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
import redis
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password for storage"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary with user data to encode (should include 'sub' for user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token (longer expiration)
    
    Args:
        data: Dictionary with user data to encode (should include 'sub' for user ID)
        
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary with token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> bool:
    """
    Verify that a token is of the expected type (access or refresh)
    
    Args:
        payload: Decoded token payload
        expected_type: Expected token type ('access' or 'refresh')
        
    Returns:
        True if token type matches, False otherwise
    """
    return payload.get("type") == expected_type


def get_redis_client() -> redis.Redis:
    """Get Redis client for token blacklisting"""
    return redis.from_url(settings.REDIS_URL)


def blacklist_token(token: str, expires_in_seconds: Optional[int] = None) -> bool:
    """
    Add a token to the blacklist
    
    Args:
        token: JWT token to blacklist
        expires_in_seconds: Optional expiration time in seconds (defaults to token's natural expiration)
        
    Returns:
        True if token was successfully blacklisted, False otherwise
    """
    try:
        redis_client = get_redis_client()
        
        # If no expiration provided, try to get it from the token
        if expires_in_seconds is None:
            try:
                payload = decode_token(token)
                if payload and 'exp' in payload:
                    exp_timestamp = payload['exp']
                    current_timestamp = datetime.utcnow().timestamp()
                    expires_in_seconds = int(exp_timestamp - current_timestamp)
                    if expires_in_seconds <= 0:
                        return False  # Token already expired
                else:
                    return False  # Cannot determine expiration
            except Exception:
                return False  # Cannot decode token
        
        # Store token in blacklist with expiration
        redis_client.setex(f"blacklist:{token}", expires_in_seconds, "1")
        return True
    except Exception:
        return False


def is_token_blacklisted(token: str) -> bool:
    """
    Check if a token is blacklisted
    
    Args:
        token: JWT token to check
        
    Returns:
        True if token is blacklisted, False otherwise
    """
    try:
        redis_client = get_redis_client()
        return redis_client.exists(f"blacklist:{token}") > 0
    except Exception:
        # If Redis is unavailable, assume token is not blacklisted
        # This is a security trade-off for availability
        return False


def revoke_user_tokens(user_id: str) -> bool:
    """
    Revoke all tokens for a specific user by adding them to a user-specific blacklist
    
    Args:
        user_id: User ID whose tokens should be revoked
        
    Returns:
        True if revocation was successful, False otherwise
    """
    try:
        redis_client = get_redis_client()
        
        # Set a timestamp for when user tokens were revoked
        # This allows us to invalidate tokens issued before this timestamp
        current_timestamp = int(datetime.utcnow().timestamp())
        redis_client.set(f"user_revoked:{user_id}", current_timestamp)
        
        return True
    except Exception:
        return False


def is_user_revoked(user_id: str, token_issued_at: int) -> bool:
    """
    Check if a user's tokens were revoked after a token was issued
    
    Args:
        user_id: User ID to check
        token_issued_at: Timestamp when the token was issued
        
    Returns:
        True if user was revoked after token was issued, False otherwise
    """
    try:
        redis_client = get_redis_client()
        revoked_timestamp = redis_client.get(f"user_revoked:{user_id}")
        
        if revoked_timestamp:
            return int(revoked_timestamp) > token_issued_at
        
        return False
    except Exception:
        return False

