import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONVERTING = "CONVERTING"
    ANALYZING = "ANALYZING"
    SEPARATING = "SEPARATING"
    FINALIZING = "FINALIZING"
    PACKAGING = "PACKAGING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class InputType(str, enum.Enum):
    UPLOAD = "upload"
    YOUTUBE = "youtube"


class QualityMode(str, enum.Enum):
    FAST = "fast"
    HIGH = "high"


class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    
    # Input configuration
    input_type = Column(Enum(InputType), nullable=False)
    input_url = Column(String, nullable=True)  # For YouTube URLs
    project_name = Column(String, nullable=False)
    quality_mode = Column(Enum(QualityMode), default=QualityMode.FAST, nullable=False)
    
    # Processing results
    detected_bpm = Column(Float, nullable=True)
    manual_bpm = Column(Float, nullable=True)
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    
    # File paths (GCS or local)
    source_file_path = Column(String, nullable=True)
    stems_folder_path = Column(String, nullable=True)
    package_path = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Job(id={self.id}, name={self.project_name}, status={self.status})>"

