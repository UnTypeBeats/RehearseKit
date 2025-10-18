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
    UPLOAD = "upload"
    YOUTUBE = "youtube"


class QualityMode(str, Enum):
    FAST = "fast"
    HIGH = "high"


class JobCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=255)
    quality_mode: QualityMode = QualityMode.FAST
    input_type: InputType
    input_url: Optional[str] = None
    manual_bpm: Optional[float] = Field(None, gt=0, lt=300)


class JobResponse(BaseModel):
    id: UUID4
    status: JobStatus
    input_type: InputType
    input_url: Optional[str] = None
    project_name: str
    quality_mode: QualityMode
    detected_bpm: Optional[float] = None
    manual_bpm: Optional[float] = None
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

