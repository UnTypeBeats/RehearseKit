import os
import tempfile
import shutil
from pathlib import Path
from uuid import UUID
from celery import Task
from redis import Redis
from app.celery_app import celery_app
from app.core.config import settings
from app.services.storage import StorageService
from app.services.audio import AudioService
from app.services.cubase import CubaseProjectGenerator
import json


class DatabaseTask(Task):
    """Base task with database session"""
    _db = None
    
    @property
    def db(self):
        if self._db is None:
            from app.core.database import AsyncSessionLocal
            import asyncio
            loop = asyncio.get_event_loop()
            self._db = loop.run_until_complete(AsyncSessionLocal().__aenter__())
        return self._db


def update_job_status(job_id: str, status: str, progress: int, redis_client: Redis):
    """Update job status and publish to Redis pub/sub"""
    from sqlalchemy import update
    from app.models.job import Job, JobStatus
    from app.core.database import AsyncSessionLocal
    import asyncio
    
    async def _update():
        async with AsyncSessionLocal() as db:
            stmt = update(Job).where(Job.id == UUID(job_id)).values(
                status=JobStatus(status),
                progress_percent=progress
            )
            await db.execute(stmt)
            await db.commit()
    
    # Execute async update
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_update())
    
    # Publish to Redis for WebSocket
    redis_client.publish(
        f"job:{job_id}:progress",
        json.dumps({
            "job_id": job_id,
            "status": status,
            "progress_percent": progress
        })
    )


@celery_app.task(bind=True)
def process_audio_job(self, job_id: str):
    """
    Main audio processing task
    
    Pipeline:
    1. Acquire audio (from upload or YouTube)
    2. Convert to WAV (24-bit/48kHz)
    3. Detect tempo
    4. Separate stems
    5. Embed metadata
    6. Generate Cubase project
    7. Package and upload
    """
    redis_client = Redis.from_url(settings.REDIS_URL)
    storage = StorageService()
    audio_service = AudioService()
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Get job from database
        from app.models.job import Job
        from app.core.database import AsyncSessionLocal
        import asyncio
        
        async def get_job():
            async with AsyncSessionLocal() as db:
                from sqlalchemy import select
                result = await db.execute(select(Job).where(Job.id == UUID(job_id)))
                return result.scalar_one()
        
        loop = asyncio.get_event_loop()
        job = loop.run_until_complete(get_job())
        
        # 1. Acquire audio
        if job.input_type.value == "upload":
            source_path = storage.get_local_path(job.source_file_path)
        else:
            # YouTube download
            update_job_status(job_id, "CONVERTING", 5, redis_client)
            source_path = audio_service.download_youtube(job.input_url, temp_dir)
        
        # 2. Convert to WAV
        update_job_status(job_id, "CONVERTING", 10, redis_client)
        wav_path = audio_service.convert_to_wav(source_path, temp_dir)
        
        # 3. Detect tempo
        update_job_status(job_id, "ANALYZING", 25, redis_client)
        detected_bpm = audio_service.detect_tempo(wav_path)
        
        # Update job with BPM
        async def update_bpm():
            async with AsyncSessionLocal() as db:
                from sqlalchemy import update
                stmt = update(Job).where(Job.id == UUID(job_id)).values(detected_bpm=detected_bpm)
                await db.execute(stmt)
                await db.commit()
        
        loop.run_until_complete(update_bpm())
        
        # 4. Separate stems (longest operation)
        update_job_status(job_id, "SEPARATING", 30, redis_client)
        
        def progress_callback(percent):
            # Map 0-100 to 30-80 range
            mapped_progress = 30 + int(percent * 0.5)
            update_job_status(job_id, "SEPARATING", mapped_progress, redis_client)
        
        stems_dir = audio_service.separate_stems(
            wav_path,
            temp_dir,
            quality=job.quality_mode.value,
            progress_callback=progress_callback
        )
        
        # 5. Embed metadata
        update_job_status(job_id, "FINALIZING", 80, redis_client)
        final_bpm = job.manual_bpm or detected_bpm
        audio_service.embed_tempo_metadata(stems_dir, final_bpm)
        
        # 6. Generate DAWproject
        update_job_status(job_id, "PACKAGING", 85, redis_client)
        project_gen = CubaseProjectGenerator()
        dawproject_path = project_gen.generate_project(
            stems_dir,
            job.project_name,
            final_bpm
        )
        
        # 7. Create final package and upload
        update_job_status(job_id, "PACKAGING", 92, redis_client)
        package_path = os.path.join(temp_dir, f"{job.project_name}_RehearseKit.zip")
        audio_service.create_package(stems_dir, dawproject_path, package_path)
        
        # Upload to storage
        final_package_path = storage.save_file(
            package_path,
            f"{job_id}.zip",
            settings.GCS_BUCKET_PACKAGES
        )
        
        # Update job as completed
        async def complete_job():
            from datetime import datetime
            async with AsyncSessionLocal() as db:
                from sqlalchemy import update
                stmt = update(Job).where(Job.id == UUID(job_id)).values(
                    status="COMPLETED",
                    progress_percent=100,
                    package_path=final_package_path,
                    stems_folder_path=str(stems_dir),
                    completed_at=datetime.utcnow()
                )
                await db.execute(stmt)
                await db.commit()
        
        loop.run_until_complete(complete_job())
        update_job_status(job_id, "COMPLETED", 100, redis_client)
        
    except Exception as e:
        # Update job as failed
        error_message = str(e)
        
        async def fail_job():
            from datetime import datetime
            async with AsyncSessionLocal() as db:
                from sqlalchemy import update
                stmt = update(Job).where(Job.id == UUID(job_id)).values(
                    status="FAILED",
                    error_message=error_message,
                    completed_at=datetime.utcnow()
                )
                await db.execute(stmt)
                await db.commit()
        
        loop = asyncio.get_event_loop()
        loop.run_until_complete(fail_job())
        update_job_status(job_id, "FAILED", 0, redis_client)
        
        raise
    
    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)
        redis_client.close()

