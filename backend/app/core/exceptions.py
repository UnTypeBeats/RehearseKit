"""
Custom exception classes and error handling utilities
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from datetime import datetime


class AuthenticationError(HTTPException):
    """Custom authentication error with structured response"""
    
    def __init__(
        self,
        detail: str = "Authentication failed",
        status_code: int = status.HTTP_401_UNAUTHORIZED,
        headers: Optional[Dict[str, str]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers or {"WWW-Authenticate": "Bearer"}
        )
        self.error_code = error_code


class TokenError(HTTPException):
    """Custom token validation error"""
    
    def __init__(
        self,
        detail: str = "Token validation failed",
        status_code: int = status.HTTP_401_UNAUTHORIZED,
        token_type: Optional[str] = None
    ):
        headers = {"WWW-Authenticate": "Bearer"}
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )
        self.token_type = token_type


class GoogleAuthError(HTTPException):
    """Custom Google OAuth error"""
    
    def __init__(
        self,
        detail: str = "Google authentication failed",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        google_error: Optional[str] = None
    ):
        super().__init__(
            status_code=status_code,
            detail=detail
        )
        self.google_error = google_error


class RateLimitError(HTTPException):
    """Custom rate limit error"""
    
    def __init__(
        self,
        detail: str = "Too many requests",
        status_code: int = status.HTTP_429_TOO_MANY_REQUESTS,
        retry_after: Optional[int] = None
    ):
        headers = {}
        if retry_after:
            headers["Retry-After"] = str(retry_after)
        
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )
        self.retry_after = retry_after


def create_structured_error_response(
    error_type: str,
    message: str,
    status_code: int,
    details: Optional[list] = None,
    path: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a structured error response
    
    Args:
        error_type: Type of error (e.g., "authentication_error")
        message: Human-readable error message
        status_code: HTTP status code
        details: Optional list of error details
        path: Optional request path
        **kwargs: Additional error-specific fields
        
    Returns:
        Structured error response dictionary
    """
    response = {
        "error": error_type,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "status_code": status_code
    }
    
    if details:
        response["details"] = details
    
    if path:
        response["path"] = path
    
    # Add any additional fields
    response.update(kwargs)
    
    return response
