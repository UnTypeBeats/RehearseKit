from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from redis import Redis
from app.core.config import settings

# SQLAlchemy async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()


# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# Redis client (for YouTube previews and Celery)
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)


# Dependency to get Redis
def get_redis():
    return redis_client
