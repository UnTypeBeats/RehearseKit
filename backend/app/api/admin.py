"""
Admin API endpoints for user management
Only accessible by users with is_admin=True
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from pydantic import BaseModel


router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_dependency():
    """Helper to avoid circular import"""
    from app.api.auth import get_current_active_user

    async def _check_admin(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user

    return _check_admin


# Create the actual dependency
get_current_admin_user = get_admin_dependency()


# Schemas for admin operations
class UserListResponse(BaseModel):
    """Response for list users endpoint"""
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserStatsResponse(BaseModel):
    """Response for user statistics"""
    total_users: int
    active_users: int
    pending_users: int
    admin_users: int
    google_oauth_users: int
    email_users: int


class UserActionResponse(BaseModel):
    """Response for user action (approve, deactivate, etc.)"""
    success: bool
    message: str
    user: UserResponse


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, pending, all"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    List all users with pagination and filtering
    Admin only endpoint
    """
    # Build base query
    query = select(User)

    # Apply status filter
    if status_filter == "active":
        query = query.where(User.is_active == True)
    elif status_filter == "pending":
        query = query.where(User.is_active == False)
    # "all" or None = no filter

    # Apply search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(User.full_name).like(search_term)
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.created_at.desc())

    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get user statistics
    Admin only endpoint
    """
    # Total users
    total_result = await db.execute(select(func.count()).select_from(User))
    total_users = total_result.scalar()

    # Active users
    active_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )
    active_users = active_result.scalar()

    # Pending users
    pending_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == False)
    )
    pending_users = pending_result.scalar()

    # Admin users
    admin_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_admin == True)
    )
    admin_users = admin_result.scalar()

    # Google OAuth users
    google_result = await db.execute(
        select(func.count()).select_from(User).where(User.oauth_provider == "google")
    )
    google_oauth_users = google_result.scalar()

    # Email users
    email_result = await db.execute(
        select(func.count()).select_from(User).where(User.oauth_provider == "email")
    )
    email_users = email_result.scalar()

    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        pending_users=pending_users,
        admin_users=admin_users,
        google_oauth_users=google_oauth_users,
        email_users=email_users
    )


@router.patch("/users/{user_id}/approve", response_model=UserActionResponse)
async def approve_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Approve a pending user (set is_active=True)
    Admin only endpoint
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_active:
        return UserActionResponse(
            success=True,
            message="User is already active",
            user=user
        )

    # Approve user
    user.is_active = True
    await db.commit()
    await db.refresh(user)

    return UserActionResponse(
        success=True,
        message=f"User {user.email} has been approved",
        user=user
    )


@router.patch("/users/{user_id}/deactivate", response_model=UserActionResponse)
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Deactivate an active user (set is_active=False)
    Admin only endpoint
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deactivating self
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    if not user.is_active:
        return UserActionResponse(
            success=True,
            message="User is already inactive",
            user=user
        )

    # Deactivate user
    user.is_active = False
    await db.commit()
    await db.refresh(user)

    return UserActionResponse(
        success=True,
        message=f"User {user.email} has been deactivated",
        user=user
    )


@router.patch("/users/{user_id}/make-admin", response_model=UserActionResponse)
async def make_user_admin(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Grant admin privileges to a user (set is_admin=True)
    Admin only endpoint
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_admin:
        return UserActionResponse(
            success=True,
            message="User is already an admin",
            user=user
        )

    # Make user admin (also activate if not already active)
    user.is_admin = True
    user.is_active = True
    await db.commit()
    await db.refresh(user)

    return UserActionResponse(
        success=True,
        message=f"User {user.email} is now an admin",
        user=user
    )


@router.patch("/users/{user_id}/remove-admin", response_model=UserActionResponse)
async def remove_admin_privileges(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Remove admin privileges from a user (set is_admin=False)
    Admin only endpoint
    """
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent removing own admin privileges
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )

    if not user.is_admin:
        return UserActionResponse(
            success=True,
            message="User is not an admin",
            user=user
        )

    # Remove admin privileges
    user.is_admin = False
    await db.commit()
    await db.refresh(user)

    return UserActionResponse(
        success=True,
        message=f"Admin privileges removed from {user.email}",
        user=user
    )
