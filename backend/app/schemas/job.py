from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, UUID4
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "PENDING"
    CONVERTING = "CONVERTING"
    ANALYZING = "ANALYZING"
    SEPARATING = "SEPARATING"
    FINALIZING = "FINALIZING"
    PACKAGING = "PACKAGING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class InputType(str, Enum):
    upload = "upload"
    youtube = "youtube"


class QualityMode(str, Enum):
    fast = "fast"
    high = "high"


class JobCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=255)
    quality_mode: QualityMode = QualityMode.fast
    input_type: InputType
    input_url: Optional[str] = None
    manual_bpm: Optional[float] = Field(None, gt=0, lt=300)
    trim_start: Optional[float] = Field(None, ge=0, description="Trim start time in seconds")
    trim_end: Optional[float] = Field(None, ge=0, description="Trim end time in seconds")
    youtube_preview_id: Optional[str] = None


class JobResponse(BaseModel):
    id: UUID4
    status: JobStatus
    input_type: InputType
    input_url: Optional[str] = None
    project_name: str
    quality_mode: QualityMode
    detected_bpm: Optional[float] = None
    manual_bpm: Optional[float] = None
    trim_start: Optional[float] = None
    trim_end: Optional[float] = None
    progress_percent: int
    error_message: Optional[str] = None
    source_file_path: Optional[str] = None
    stems_folder_path: Optional[str] = None
    package_path: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    page_size: int

