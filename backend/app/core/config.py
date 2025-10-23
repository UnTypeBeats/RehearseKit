from pydantic_settings import BaseSettings
from typing import Optional
import secrets
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "RehearseKit"
    APP_ENV: str = "development"
    DEBUG: bool = False  # Disable debug in production
    
    # Database
    DATABASE_URL: str = ""  # Make optional with default
    
    # Redis
    REDIS_URL: str
    
    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    # Google Cloud Storage
    GCS_BUCKET_UPLOADS: str = "rehearsekit-uploads"
    GCS_BUCKET_STEMS: str = "rehearsekit-stems"
    GCS_BUCKET_PACKAGES: str = "rehearsekit-packages"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    # Storage mode
    STORAGE_MODE: str = "local"  # "local" or "gcs"
    LOCAL_STORAGE_PATH: str = "/tmp/storage"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:30070",
        "http://10.0.0.155:30070",
        "https://rehearsekit.uk",
        "https://www.rehearsekit.uk",
        "https://rehearsekit-frontend-748316872223.us-central1.run.app",
        "https://rehearsekit-backend-748316872223.us-central1.run.app"
    ]
    
    # Job retention
    JOB_RETENTION_DAYS: int = 7
    
    # JWT Authentication
    JWT_SECRET_KEY: str = ""  # Must be set via environment variable
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour (reduced from 24 hours for better security)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback/google"
    
    # Admin Configuration
    ADMIN_EMAIL: str = "oleg@befeast.com"

    # Whitelisted domains for auto-approval (users from these domains don't need admin approval)
    WHITELISTED_DOMAINS: list[str] = ["befeast.com", "kossoy.com", "rehearsekit.uk"]

    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_jwt_secret()
    
    def _validate_jwt_secret(self):
        """Validate that JWT secret key is properly configured"""
        if not self.JWT_SECRET_KEY:
            if self.APP_ENV == "development":
                # Generate a secure random key for development
                self.JWT_SECRET_KEY = secrets.token_urlsafe(32)
                print(f"⚠️  WARNING: JWT_SECRET_KEY not set. Generated temporary key for development.")
                print(f"⚠️  Set JWT_SECRET_KEY environment variable for production!")
            else:
                raise ValueError(
                    "JWT_SECRET_KEY must be set in production environment. "
                    "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )
        
        # Validate key strength
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long for security")
        
        # Check for common weak keys
        weak_keys = [
            "dev-secret-key-change-in-production-at-least-32-chars-long",
            "your-secret-key",
            "secret",
            "password",
            "12345678901234567890123456789012"
        ]
        if self.JWT_SECRET_KEY in weak_keys:
            raise ValueError("JWT_SECRET_KEY appears to be a default/weak key. Please use a secure, randomly generated key.")


settings = Settings()

