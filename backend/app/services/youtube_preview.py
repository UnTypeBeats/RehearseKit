import os
import json
import tempfile
import yt_dlp
from uuid import uuid4
from redis import Redis
from app.services.audio import AudioService


class YouTubePreviewService:
    """Handle YouTube preview downloads and temporary storage"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.audio_service = AudioService()
        self.preview_ttl = 3600  # 1 hour
    
    def download_and_preview(self, youtube_url: str) -> dict:
        """
        Download YouTube audio, convert to WAV, and store temporarily
        
        Returns preview metadata
        """
        preview_id = str(uuid4())
        temp_dir = tempfile.mkdtemp(prefix=f"yt_preview_{preview_id}_")
        
        try:
            # Extract video info first (fast, no download)
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                title = info.get('title', 'Unknown')
                duration = info.get('duration', 0)
                thumbnail = info.get('thumbnail')
            
            # Download audio
            audio_path = self.audio_service.download_youtube(youtube_url, temp_dir)
            
            # Convert to WAV for waveform
            wav_path = self.audio_service.convert_to_wav(audio_path, temp_dir)
            
            # Store preview metadata in Redis
            preview_data = {
                'file_path': wav_path,
                'title': title,
                'duration': duration,
                'thumbnail': thumbnail,
                'original_url': youtube_url,
                'temp_dir': temp_dir
            }
            
            self.redis.setex(
                f"youtube_preview:{preview_id}",
                self.preview_ttl,
                json.dumps(preview_data)
            )
            
            return {
                'preview_id': preview_id,
                'title': title,
                'duration': duration,
                'thumbnail': thumbnail,
                'preview_url': f"/api/youtube/preview/{preview_id}/audio"
            }
            
        except Exception as e:
            # Cleanup on error
            import shutil
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise e
    
    def get_preview(self, preview_id: str) -> dict | None:
        """Get preview metadata from Redis"""
        data = self.redis.get(f"youtube_preview:{preview_id}")
        if data:
            return json.loads(data)
        return None
    
    def get_preview_file_path(self, preview_id: str) -> str | None:
        """Get the file path for a preview"""
        preview_data = self.get_preview(preview_id)
        if preview_data:
            return preview_data.get('file_path')
        return None
    
    def cleanup_preview(self, preview_id: str):
        """Delete preview from Redis and filesystem"""
        import shutil
        
        preview_data = self.get_preview(preview_id)
        if preview_data:
            temp_dir = preview_data.get('temp_dir')
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            
            self.redis.delete(f"youtube_preview:{preview_id}")

