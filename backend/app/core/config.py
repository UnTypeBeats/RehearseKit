from pydantic_settings import BaseSettings
from typing import Optional


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
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

