"""
Pydantic schemas for user authentication and management
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# Token schemas
class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data extracted from JWT token"""
    user_id: Optional[UUID] = None
    email: Optional[str] = None


# User authentication schemas
class UserLogin(BaseModel):
    """User login request (email/password)"""
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    """User registration request (email/password)"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    """Google OAuth authentication request"""
    id_token: str  # Google ID token from frontend
    access_token: Optional[str] = None  # Optional access token


# User response schemas
class UserBase(BaseModel):
    """Base user schema"""
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """User response schema (public info)"""
    id: UUID
    is_admin: bool
    is_active: bool
    oauth_provider: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Internal schema for creating users"""
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    oauth_provider: Optional[str] = None
    oauth_id: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# Refresh token request
class RefreshTokenRequest(BaseModel):
    """Request to refresh access token"""
    refresh_token: str

