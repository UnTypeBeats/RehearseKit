from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from uuid import UUID
from app.core.database import get_db
from app.models.job import Job, JobStatus, InputType, QualityMode
from app.schemas.job import JobResponse, JobListResponse, JobCreate
from app.tasks.audio_processing import process_audio_job
from app.services.storage import StorageService
from app.core.config import settings
import os
import aiofiles

router = APIRouter()


@router.post("/create", response_model=JobResponse)
async def create_job(
    project_name: str = Form(...),
    quality_mode: str = Form("fast"),
    input_type: Optional[str] = Form(None),
    input_url: Optional[str] = Form(None),
    youtube_preview_id: Optional[str] = Form(None),
    manual_bpm: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Create a new audio processing job"""
    
    from app.core.database import get_redis
    from app.services.youtube_preview import YouTubePreviewService
    
    # Determine input type
    if file:
        actual_input_type = InputType.upload
        # Support MP3, WAV, and FLAC formats
        SUPPORTED_FORMATS = ['.flac', '.mp3', '.wav']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in SUPPORTED_FORMATS:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
            )
    elif input_url:
        actual_input_type = InputType.youtube
    else:
        raise HTTPException(status_code=400, detail="Either file or input_url must be provided")
    
    # Create job in database
    job = Job(
        project_name=project_name,
        quality_mode=QualityMode[quality_mode],  # Get enum by name
        input_type=actual_input_type,
        input_url=input_url,
        manual_bpm=manual_bpm,
        status=JobStatus.PENDING,
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Handle file upload
    if file:
        storage = StorageService()
        file_path = await storage.save_upload(file, job.id)
        job.source_file_path = file_path
        await db.commit()
        await db.refresh(job)
    
    # Handle YouTube preview (file already downloaded)
    elif youtube_preview_id:
        import shutil
        redis = get_redis()
        youtube_service = YouTubePreviewService(redis)
        preview_file = youtube_service.get_preview_file_path(youtube_preview_id)
        
        if preview_file and os.path.exists(preview_file):
            # Move preview file to permanent storage
            storage = StorageService()
            dest_path = os.path.join(
                settings.LOCAL_STORAGE_PATH,
                "uploads",
                f"{job.id}_source.wav"
            )
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(preview_file, dest_path)
            
            job.source_file_path = dest_path
            await db.commit()
            await db.refresh(job)
            
            # Cleanup preview
            youtube_service.cleanup_preview(youtube_preview_id)
    
    # Queue processing task
    process_audio_job.delay(str(job.id))
    
    return job


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all jobs with pagination"""
    
    # Get total count
    count_query = select(Job)
    result = await db.execute(count_query)
    total = len(result.scalars().all())
    
    # Get paginated jobs
    offset = (page - 1) * page_size
    query = (
        select(Job)
        .order_by(desc(Job.created_at))
        .offset(offset)
        .limit(page_size)
    )
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific job by ID"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running job"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Can only cancel jobs that are not completed or already cancelled
    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel job with status {job.status}")
    
    # Update job status to CANCELLED
    job.status = JobStatus.CANCELLED
    await db.commit()
    await db.refresh(job)
    
    # TODO: Send signal to Celery to terminate the task
    # For now, the worker will complete but the job is marked as cancelled
    
    return {"message": "Job cancelled successfully", "job": job}


@router.delete("/{job_id}")
async def delete_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a job and its associated files"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # TODO: Delete files from storage
    
    # Delete job from database
    await db.delete(job)
    await db.commit()
    
    return {"message": "Job deleted successfully"}


@router.get("/{job_id}/source")
async def get_source_audio(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get the source audio file for preview"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.source_file_path:
        raise HTTPException(status_code=404, detail="Source file not found")
    
    # For local mode, serve the file directly
    if settings.STORAGE_MODE == "local":
        if not os.path.exists(job.source_file_path):
            raise HTTPException(status_code=404, detail="Source file not found on disk")
        
        return FileResponse(
            path=job.source_file_path,
            media_type="audio/mpeg",  # Browser can handle multiple audio types
            filename=f"{job.project_name}_source.wav"
        )
    else:
        # For GCS mode, generate signed URL
        raise HTTPException(status_code=501, detail="GCS source preview not implemented")


@router.get("/{job_id}/download")
async def download_package(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Download the completed job package"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job is not completed yet")
    
    if not job.package_path:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # For local mode, serve the file directly
    if settings.STORAGE_MODE == "local":
        if not os.path.exists(job.package_path):
            raise HTTPException(status_code=404, detail="Package file not found on disk")
        
        return FileResponse(
            path=job.package_path,
            filename=f"{job.project_name}_RehearseKit.zip",
            media_type="application/zip"
        )
    else:
        # For GCS mode, generate signed URL and redirect
        storage = StorageService()
        url = await storage.get_download_url(job.package_path)
        return {"url": url, "redirect": True}

