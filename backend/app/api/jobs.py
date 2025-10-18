from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from uuid import UUID
from app.core.database import get_db
from app.models.job import Job, JobStatus, InputType, QualityMode
from app.schemas.job import JobResponse, JobListResponse, JobCreate
from app.tasks.audio_processing import process_audio_job
from app.services.storage import StorageService
import os
import aiofiles

router = APIRouter()


@router.post("/create", response_model=JobResponse)
async def create_job(
    project_name: str = Form(...),
    quality_mode: str = Form("fast"),
    input_type: Optional[str] = Form(None),
    input_url: Optional[str] = Form(None),
    manual_bpm: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Create a new audio processing job"""
    
    # Determine input type
    if file:
        actual_input_type = InputType.upload
        if not file.filename.endswith(".flac"):
            raise HTTPException(status_code=400, detail="Only FLAC files are supported")
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


@router.get("/{job_id}/download")
async def get_download_url(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get download URL for completed job package"""
    
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job is not completed yet")
    
    if not job.package_path:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Generate signed URL or return local path
    storage = StorageService()
    url = await storage.get_download_url(job.package_path)
    
    return {"url": url}

