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
    
    def to_relative_path(self, absolute_path: str) -> str:
        """Convert absolute path to relative path from storage root.
        
        This enables portable path storage in database that works across
        different machines with different LOCAL_STORAGE_PATH mounts.
        """
        if not absolute_path:
            return absolute_path
        # GCS paths stay as-is
        if absolute_path.startswith("gs://"):
            return absolute_path
        # Already relative (doesn't start with /)
        if not os.path.isabs(absolute_path):
            return absolute_path
        # Convert absolute to relative
        try:
            return os.path.relpath(absolute_path, settings.LOCAL_STORAGE_PATH)
        except ValueError:
            # On Windows, relpath fails if paths are on different drives
            return absolute_path
    
    def to_absolute_path(self, relative_path: str) -> str:
        """Convert relative path to absolute path using LOCAL_STORAGE_PATH.
        
        Used when reading files - converts database-stored relative paths
        to absolute paths that work on the current machine.
        """
        if not relative_path:
            return relative_path
        # GCS paths stay as-is
        if relative_path.startswith("gs://"):
            return relative_path
        # Already absolute
        if os.path.isabs(relative_path):
            return relative_path
        # Convert relative to absolute
        return os.path.join(settings.LOCAL_STORAGE_PATH, relative_path)
    
    async def save_upload(self, file: UploadFile, job_id: UUID) -> str:
        """Save uploaded file. Returns RELATIVE path for local storage."""
        # Preserve original file extension for proper processing
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{job_id}_source{file_ext}"
        
        if self.mode == "local":
            file_path = os.path.join(settings.LOCAL_STORAGE_PATH, "uploads", filename)
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)
            
            # Return relative path for database storage
            return self.to_relative_path(file_path)
        else:
            # Upload to GCS
            bucket = self.gcs_client.bucket(settings.GCS_BUCKET_UPLOADS)
            blob = bucket.blob(filename)
            
            content = await file.read()
            blob.upload_from_string(content)
            
            return f"gs://{settings.GCS_BUCKET_UPLOADS}/{filename}"
    
    def save_file(self, source_path: str, destination: str, bucket_name: Optional[str] = None) -> str:
        """Save a local file to storage. Returns RELATIVE path for local storage."""
        if self.mode == "local":
            # Save to local storage path
            local_dest = os.path.join(settings.LOCAL_STORAGE_PATH, destination)
            Path(local_dest).parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file to storage
            import shutil
            shutil.copy2(source_path, local_dest)
            # Return relative path for database storage
            return self.to_relative_path(local_dest)
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
    
    def get_local_path(self, path: str) -> str:
        """Get absolute local path for a file.
        
        For local storage: converts relative path to absolute.
        For GCS: downloads file to temp and returns local path.
        """
        if self.mode == "local":
            # Convert relative to absolute if needed
            return self.to_absolute_path(path)
        
        # Download from GCS
        gcs_path = path
        if gcs_path.startswith("gs://"):
            gcs_path = gcs_path[5:]
        
        bucket_name, blob_name = gcs_path.split("/", 1)
        bucket = self.gcs_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        local_path = f"/tmp/{blob_name}"
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(local_path)
        
        return local_path
