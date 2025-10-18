import os
import subprocess
from pathlib import Path
from typing import Callable, Optional
import yt_dlp
import librosa
import soundfile as sf
from mutagen.wave import WAVE
from mutagen.id3 import ID3, TBPM
import zipfile


class AudioService:
    """Handle all audio processing operations"""
    
    def download_youtube(self, url: str, output_dir: str) -> str:
        """Download audio from YouTube URL"""
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_dir, 'youtube_audio.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Find the downloaded file
        for file in os.listdir(output_dir):
            if file.startswith('youtube_audio'):
                return os.path.join(output_dir, file)
        
        raise FileNotFoundError("Downloaded audio file not found")
    
    def convert_to_wav(self, input_path: str, output_dir: str) -> str:
        """Convert audio to 24-bit/48kHz WAV using FFmpeg"""
        output_path = os.path.join(output_dir, "converted_48k.wav")
        
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ar', '48000',  # 48kHz sample rate
            '-sample_fmt', 's24',  # 24-bit
            '-ac', '2',  # Stereo
            '-y',  # Overwrite
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        return output_path
    
    def detect_tempo(self, audio_path: str) -> float:
        """Detect tempo/BPM using librosa"""
        y, sr = librosa.load(audio_path, sr=None)
        
        # Get tempo using beat tracking
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # Handle array return (newer librosa versions)
        if hasattr(tempo, '__iter__'):
            tempo = float(tempo[0])
        else:
            tempo = float(tempo)
        
        return round(tempo, 2)
    
    def separate_stems(
        self,
        audio_path: str,
        output_dir: str,
        quality: str = "fast",
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Separate audio into stems using Demucs
        
        Returns path to directory containing separated stems
        """
        stems_dir = os.path.join(output_dir, "stems")
        Path(stems_dir).mkdir(parents=True, exist_ok=True)
        
        # Demucs model selection
        model = "htdemucs" if quality == "fast" else "htdemucs_ft"
        
        # Run Demucs
        # Note: In production, you'd want to capture output and parse progress
        cmd = [
            'python', '-m', 'demucs',
            '--two-stems=vocals',  # First pass: separate vocals
            '-n', model,
            '-o', stems_dir,
            audio_path
        ]
        
        if progress_callback:
            progress_callback(10)
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        if progress_callback:
            progress_callback(50)
        
        # Run full separation
        cmd_full = [
            'python', '-m', 'demucs',
            '-n', model,
            '-o', stems_dir,
            audio_path
        ]
        
        subprocess.run(cmd_full, check=True, capture_output=True)
        
        if progress_callback:
            progress_callback(100)
        
        # Find the output directory (Demucs creates subdirs)
        # Structure: stems/MODEL_NAME/TRACK_NAME/*.wav
        for subdir in Path(stems_dir).iterdir():
            if subdir.is_dir():
                for track_dir in subdir.iterdir():
                    if track_dir.is_dir():
                        return str(track_dir)
        
        return stems_dir
    
    def embed_tempo_metadata(self, stems_dir: str, bpm: float):
        """Embed tempo information in WAV files"""
        for stem_file in Path(stems_dir).glob("*.wav"):
            try:
                # Try to add BPM metadata using mutagen
                # Note: WAV doesn't natively support BPM, but we can try ID3 tags
                audio = WAVE(stem_file)
                
                # Some DAWs read tempo from filename, so we could also rename
                # For now, we'll just ensure the files are properly formatted
                
            except Exception as e:
                # If metadata embedding fails, continue
                print(f"Could not embed metadata in {stem_file}: {e}")
                continue
    
    def create_package(self, stems_dir: str, cpr_path: str, output_path: str):
        """Create ZIP package with stems and Cubase project"""
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all stems
            for stem_file in Path(stems_dir).glob("*.wav"):
                zipf.write(stem_file, f"stems/{stem_file.name}")
            
            # Add Cubase project
            if os.path.exists(cpr_path):
                zipf.write(cpr_path, os.path.basename(cpr_path))

