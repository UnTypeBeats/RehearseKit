# Stage 3 Deployment Hotfix - Database Columns

**Issue:** Backend returning 500 errors on `/api/jobs` endpoint  
**Error:** `column jobs.trim_start does not exist`  
**Cause:** Database migration didn't run automatically  
**Fixed:** October 21, 2025 at 13:34 UTC+3

## The Problem

After deploying Stage 3, the backend code expected `trim_start` and `trim_end` columns that didn't exist in the database.

```
sqlalchemy.exc.ProgrammingError: column jobs.trim_start does not exist
```

## The Fix

Added missing columns manually via Python SQL execution:

```bash
ssh oleg@10.0.0.155 "cd /mnt/Odin/Applications/RehearseKit/config && \
  sudo docker compose exec backend python -c \"
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def add_columns():
    async with AsyncSessionLocal() as db:
        await db.execute(text('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS trim_start FLOAT'))
        await db.execute(text('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS trim_end FLOAT'))
        await db.commit()
        print('✅ Columns added successfully')

asyncio.run(add_columns())
\""
```

## Verification

```bash
# Check API works
curl 'https://rehearsekit.uk/api/jobs?page=1&page_size=20'
✅ Returns jobs with trim_start and trim_end fields (null for old jobs)

# Check health
curl https://rehearsekit.uk/api/health
✅ All services healthy
```

## Result

✅ Backend operational  
✅ API responding correctly  
✅ New trim fields available  
✅ Backward compatible (existing jobs have null values)

**Downtime:** < 1 minute (only affected job listing)  
**Impact:** Low (jobs continued processing, only API was affected)

## Prevention

For future deployments, ensure migrations run before code deployment or add migration check to container startup script.
