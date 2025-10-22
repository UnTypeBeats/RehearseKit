from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.database import engine, Base
from app.api import jobs, health, youtube, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
    
    yield
    
    try:
        await engine.dispose()
    except Exception:
        pass


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Transform audio into rehearsal-ready stems and DAW projects",
    lifespan=lifespan,
    # Increase max request body size to 1GB for FLAC uploads
    max_request_body_size=1024 * 1024 * 1024,
)

# Add rate limiter to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Increase max upload size to 500MB
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["authentication"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(youtube.router, prefix="/api", tags=["youtube"])


@app.get("/")
async def root():
    return {
        "message": "RehearseKit API",
        "version": "1.0.0",
        "docs": "/docs",
    }
