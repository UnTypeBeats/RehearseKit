import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from redis import Redis
from app.schemas.youtube import YouTubePreviewRequest, YouTubePreviewResponse
from app.services.youtube_preview import YouTubePreviewService
from app.core.database import get_redis

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.post("/preview", response_model=YouTubePreviewResponse)
async def create_youtube_preview(
    request: YouTubePreviewRequest,
    redis_client: Redis = Depends(get_redis)
):
    """
    Download YouTube audio and create a preview
    Returns preview ID and metadata for display
    """
    try:
        youtube_service = YouTubePreviewService(redis_client)
        preview_data = youtube_service.download_and_preview(str(request.url))
        
        return YouTubePreviewResponse(**preview_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download YouTube audio: {str(e)}"
        )


@router.get("/preview/{preview_id}/audio")
async def get_preview_audio(
    preview_id: str,
    redis_client: Redis = Depends(get_redis)
):
    """Stream the preview audio file"""
    youtube_service = YouTubePreviewService(redis_client)
    file_path = youtube_service.get_preview_file_path(preview_id)
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Preview not found or expired")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename="preview.wav"
    )


@router.delete("/preview/{preview_id}")
async def delete_preview(
    preview_id: str,
    redis_client: Redis = Depends(get_redis)
):
    """Delete a preview (optional - Redis TTL handles this automatically)"""
    youtube_service = YouTubePreviewService(redis_client)
    youtube_service.cleanup_preview(preview_id)
    
    return {"message": "Preview deleted"}

