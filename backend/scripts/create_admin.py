#!/usr/bin/env python3
"""
Script to create an admin user for RehearseKit
Usage: python scripts/create_admin.py
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.config import settings


async def create_admin_user():
    """Create admin user with email from settings"""
    admin_email = settings.ADMIN_EMAIL
    
    print(f"Creating admin user: {admin_email}")
    
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == admin_email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.is_admin:
                print(f"✅ Admin user already exists: {admin_email}")
                return
            else:
                # Make existing user an admin
                existing_user.is_admin = True
                await db.commit()
                print(f"✅ Made existing user an admin: {admin_email}")
                return
        
        # Create new admin user
        admin = User(
            email=admin_email,
            full_name="Admin User",
            is_admin=True,
            is_active=True,
            oauth_provider="email",  # Can login via email or OAuth
        )
        
        # Set a default password (should be changed after first login)
        default_password = "admin123"  # This should be changed!
        admin.set_password(default_password)
        
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        
        print(f"✅ Created admin user: {admin_email}")
        print(f"   Default password: {default_password}")
        print(f"   ⚠️  IMPORTANT: Change this password after first login!")
        print(f"   User can also log in with Google OAuth")


async def main():
    try:
        await create_admin_user()
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

