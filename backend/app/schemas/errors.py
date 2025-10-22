"""
Structured error response schemas for consistent API error handling
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ErrorDetail(BaseModel):
    """Detailed error information"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """Structured error response"""
    error: str
    message: str
    details: Optional[list[ErrorDetail]] = None
    timestamp: datetime = datetime.utcnow()
    path: Optional[str] = None
    status_code: int


class ValidationErrorResponse(ErrorResponse):
    """Validation error response"""
    error: str = "validation_error"
    message: str = "Request validation failed"


class AuthenticationErrorResponse(ErrorResponse):
    """Authentication error response"""
    error: str = "authentication_error"
    message: str = "Authentication failed"


class AuthorizationErrorResponse(ErrorResponse):
    """Authorization error response"""
    error: str = "authorization_error"
    message: str = "Access denied"


class RateLimitErrorResponse(ErrorResponse):
    """Rate limit error response"""
    error: str = "rate_limit_exceeded"
    message: str = "Too many requests"
    retry_after: Optional[int] = None


class TokenErrorResponse(ErrorResponse):
    """Token-related error response"""
    error: str = "token_error"
    message: str = "Token validation failed"
    token_type: Optional[str] = None  # "access" or "refresh"


class GoogleAuthErrorResponse(ErrorResponse):
    """Google OAuth error response"""
    error: str = "google_auth_error"
    message: str = "Google authentication failed"
    google_error: Optional[str] = None
