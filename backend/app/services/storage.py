import os
import aiofiles
from pathlib import Path
from typing import Optional
from uuid import UUID
from fastapi import UploadFile
from google.cloud import storage
from app.core.config import settings


class StorageService:
    """Handle file storage operations (local or GCS)"""
    
    def __init__(self):
        self.mode = settings.STORAGE_MODE
        if self.mode == "gcs":
            self.gcs_client = storage.Client()
        else:
            # Ensure local storage directory exists
            Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    
    async def save_upload(self, file: UploadFile, job_id: UUID) -> str:
        """Save uploaded file"""
        filename = f"{job_id}_source.flac"
        
        if self.mode == "local":
            file_path = os.path.join(settings.LOCAL_STORAGE_PATH, "uploads", filename)
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)
            
            return file_path
        else:
            # Upload to GCS
            bucket = self.gcs_client.bucket(settings.GCS_BUCKET_UPLOADS)
            blob = bucket.blob(filename)
            
            content = await file.read()
            blob.upload_from_string(content)
            
            return f"gs://{settings.GCS_BUCKET_UPLOADS}/{filename}"
    
    def save_file(self, source_path: str, destination: str, bucket_name: Optional[str] = None) -> str:
        """Save a local file to storage"""
        if self.mode == "local":
            return source_path
        else:
            bucket = self.gcs_client.bucket(bucket_name or settings.GCS_BUCKET_STEMS)
            blob = bucket.blob(destination)
            blob.upload_from_filename(source_path)
            return f"gs://{bucket_name}/{destination}"
    
    async def get_download_url(self, path: str, expiration: int = 3600) -> str:
        """Get download URL (signed URL for GCS, or path for local)"""
        if self.mode == "local":
            # In production, this would be served through a proper download endpoint
            return f"/downloads/{Path(path).name}"
        else:
            # Parse GCS path
            if path.startswith("gs://"):
                path = path[5:]
            
            bucket_name, blob_name = path.split("/", 1)
            bucket = self.gcs_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            
            url = blob.generate_signed_url(expiration=expiration)
            return url
    
    def get_local_path(self, gcs_path: str) -> str:
        """Download GCS file to local temp and return path"""
        if self.mode == "local":
            return gcs_path
        
        # Download from GCS
        if gcs_path.startswith("gs://"):
            gcs_path = gcs_path[5:]
        
        bucket_name, blob_name = gcs_path.split("/", 1)
        bucket = self.gcs_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        local_path = f"/tmp/{blob_name}"
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(local_path)
        
        return local_path

