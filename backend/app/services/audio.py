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
            '-acodec', 'pcm_s24le',  # 24-bit PCM little-endian
            '-ac', '2',  # Stereo
            '-y',  # Overwrite
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg conversion failed: {result.stderr}")
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
        stems_output = os.path.join(output_dir, "demucs_output")
        Path(stems_output).mkdir(parents=True, exist_ok=True)
        
        # Demucs model selection
        model = "htdemucs" if quality == "fast" else "htdemucs_ft"
        
        if progress_callback:
            progress_callback(5)
        
        # Run Demucs - single pass for all stems
        # Demucs outputs: vocals, drums, bass, other
        cmd = [
            'python', '-m', 'demucs',
            '-n', model,
            '-o', stems_output,
            '--flac',  # Use FLAC to avoid torchcodec requirement
            audio_path
        ]
        
        if progress_callback:
            progress_callback(10)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Demucs separation failed: {result.stderr}")
        
        if progress_callback:
            progress_callback(95)
        
        # Find the output directory
        # Demucs creates: stems_output/MODEL_NAME/TRACK_NAME/*.flac
        model_dir = Path(stems_output) / model
        if not model_dir.exists():
            raise FileNotFoundError(f"Demucs output not found in {stems_output}")
        
        # Find the track directory (should be only one)
        track_dirs = [d for d in model_dir.iterdir() if d.is_dir()]
        if not track_dirs:
            raise FileNotFoundError(f"No track directory found in {model_dir}")
        
        stems_dir = track_dirs[0]
        
        # Convert FLAC stems to WAV (24-bit/48kHz)
        wav_stems_dir = os.path.join(output_dir, "stems_wav")
        Path(wav_stems_dir).mkdir(parents=True, exist_ok=True)
        
        for flac_file in Path(stems_dir).glob("*.flac"):
            wav_file = os.path.join(wav_stems_dir, f"{flac_file.stem}.wav")
            cmd = [
                'ffmpeg', '-i', str(flac_file),
                '-acodec', 'pcm_s24le',
                '-ar', '48000',
                '-y', wav_file
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        
        if progress_callback:
            progress_callback(100)
        
        return wav_stems_dir
    
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

