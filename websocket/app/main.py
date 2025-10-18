import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from redis import asyncio as aioredis
from typing import Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RehearseKit WebSocket Service")

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Store active connections
active_connections: Dict[str, list[WebSocket]] = {}


@app.websocket("/jobs/{job_id}/progress")
async def job_progress_websocket(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for job progress updates"""
    await websocket.accept()
    logger.info(f"WebSocket connection established for job {job_id}")
    
    # Add to active connections
    if job_id not in active_connections:
        active_connections[job_id] = []
    active_connections[job_id].append(websocket)
    
    try:
        # Connect to Redis
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        
        # Subscribe to job progress channel
        channel = f"job:{job_id}:progress"
        await pubsub.subscribe(channel)
        logger.info(f"Subscribed to Redis channel: {channel}")
        
        # Listen for messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                logger.info(f"Received message for job {job_id}: {data}")
                
                try:
                    # Send to WebSocket client
                    await websocket.send_text(data)
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket: {e}")
                    break
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
    finally:
        # Clean up
        if job_id in active_connections:
            active_connections[job_id].remove(websocket)
            if not active_connections[job_id]:
                del active_connections[job_id]
        
        try:
            await pubsub.unsubscribe(channel)
            await redis_client.close()
        except:
            pass
        
        logger.info(f"Cleaned up WebSocket connection for job {job_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        redis_client = aioredis.from_url(REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        return {"status": "healthy", "active_connections": len(active_connections)}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/")
async def root():
    return {
        "service": "RehearseKit WebSocket Service",
        "active_jobs": len(active_connections),
        "total_connections": sum(len(conns) for conns in active_connections.values())
    }

