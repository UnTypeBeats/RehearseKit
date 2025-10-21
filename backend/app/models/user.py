"""
User model for authentication and user management
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.security import verify_password, get_password_hash


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=True, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    oauth_provider = Column(String, nullable=True)  # 'google', 'facebook', 'email'
    oauth_id = Column(String, nullable=True)  # Provider's user ID
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    def verify_password(self, password: str) -> bool:
        """
        Verify a password against the hashed password
        
        Args:
            password: Plain text password to verify
            
        Returns:
            True if password matches, False otherwise
        """
        if not self.hashed_password:
            return False
        return verify_password(password, self.hashed_password)
    
    def set_password(self, password: str) -> None:
        """
        Set the user's password (hashes it before storing)
        
        Args:
            password: Plain text password to hash and store
        """
        self.hashed_password = get_password_hash(password)
    
    def update_last_login(self) -> None:
        """Update the last login timestamp to current time"""
        self.last_login_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, is_admin={self.is_admin})>"

