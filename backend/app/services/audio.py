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
            # Anti-bot detection measures
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
            # Use age gate bypass
            'age_limit': None,
            # Retry configuration
            'retries': 3,
            'fragment_retries': 3,
            # Avoid rate limiting
            'sleep_interval': 1,
            'max_sleep_interval': 2,
            # Use extractor args to avoid bot detection
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'skip': ['dash', 'hls'],
                }
            },
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            # If standard download fails, try with po_token bypass
            if 'Sign in' in str(e) or 'bot' in str(e):
                # Fallback: try with android client
                ydl_opts['extractor_args'] = {
                    'youtube': {
                        'player_client': ['android_embedded', 'android', 'ios'],
                    }
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
            else:
                raise
        
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
    
    def create_package(self, stems_dir: str, dawproject_path: str, output_path: str, bpm: float = 120.0):
        """
        Create ZIP package with stems and DAWproject file
        
        Note: The DAWproject file already contains the stems,
        but we also include them separately for convenience.
        
        Package structure for Cubase compatibility:
          - ProjectName/
              └── project.dawproject  (for Cubase: select folder first, then file)
          - stems/
              └── *.wav  (individual stems for manual import)
        """
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add individual stems in a separate folder
            for stem_file in Path(stems_dir).glob("*.wav"):
                zipf.write(stem_file, f"stems/{stem_file.name}")
            
            # Add DAWproject file inside a project folder (Cubase compatibility)
            if os.path.exists(dawproject_path):
                dawproject_filename = os.path.basename(dawproject_path)
                project_name = Path(dawproject_filename).stem
                # Wrap .dawproject in a folder for Cubase import workflow
                zipf.write(dawproject_path, f"{project_name}/{dawproject_filename}")
                
            # Add import guide for all DAWs
            import_guide = f"""DAW IMPORT GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PACKAGE CONTENTS:
  - ProjectName/ folder with .dawproject file (Cubase, Bitwig, Studio One, Reaper)
  - stems/ folder with individual .wav files (manual import for any DAW)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎵 CUBASE 14 PRO (.dawproject import)

IMPORTANT: Cubase requires a two-step selection process!

1. EXTRACT THE ZIP
   - Extract all files from this package to a folder

2. IMPORT DAWPROJECT
   - File → Import → DAWproject
   - If prompted about existing project: choose "Yes" (new project) or "No" (current project)
   - **STEP 1:** In the file browser, navigate to and SELECT THE PROJECT FOLDER (ProjectName/)
   - **STEP 2:** Then click into that folder and SELECT THE .dawproject FILE
   - Click "Open"

3. DONE!
   - All 4 stems imported as separate tracks
   - Tempo set to {bpm} BPM
   - Sample rate: 48000 Hz

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎹 STUDIO ONE 7, BITWIG, REAPER (.dawproject)

1. Extract the ZIP file
2. Open your DAW
3. File → Open (or Import) → Select the .dawproject file
4. Done!

Note: Studio One may open at 44.1 kHz - change to 48 kHz in Song Setup if needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ MANUAL IMPORT (Any DAW)

If .dawproject doesn't work, use the stems/ folder:

1. Create new project (48000 Hz, {bpm} BPM)
2. Add 4 audio tracks: Vocals, Drums, Bass, Other
3. Drag stems from stems/ folder to corresponding tracks
4. Align all stems to position 1.1.1.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 TROUBLESHOOTING:

Cubase: Files appear grayed out during import?
→ Make sure you SELECT THE FOLDER first, then the .dawproject file inside

Wrong sample rate warning?
→ Project Setup → Set to 48000 Hz

Stems not aligned?
→ Select all clips → Move to 1.1.1.0

Tempo wrong?
→ Set transport tempo to {bpm} BPM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For detailed instructions, see:
docs/cubase-import-guide.md

Generated by RehearseKit
"""
            zipf.writestr("IMPORT_GUIDE.txt", import_guide)
                
            # Add README with import instructions
            readme = f"""RehearseKit - Your Complete Rehearsal Toolkit

PROJECT: {os.path.basename(stems_dir).replace('stems_wav', '')}
DETECTED BPM: {bpm}
SAMPLE RATE: 48 kHz
BIT DEPTH: 24-bit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PACKAGE CONTENTS:

1. ProjectName/ - DAW project folder
   └── *.dawproject - Open interchange format
       ✅ Cubase 14 Pro (with special import process)
       ✅ Studio One 7
       ✅ Bitwig
       ✅ Reaper

2. stems/ - Individual stem files (WAV format, 24-bit/48kHz)
   ├── vocals.wav  - Lead and backing vocals
   ├── drums.wav   - Drum kit (kick, snare, hi-hat, cymbals)
   ├── bass.wav    - Bass guitar and sub-bass
   └── other.wav   - Guitars, keys, synths, strings, ambient

3. IMPORT_GUIDE.txt - Detailed instructions for all DAWs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 QUICK START:

🎵 Cubase 14 Pro:
1. Extract this ZIP file
2. File → Import → DAWproject
3. SELECT THE PROJECT FOLDER first (ProjectName/)
4. Then SELECT THE .dawproject FILE inside
5. Done! All tracks imported with {bpm} BPM

🎹 Studio One / Bitwig / Reaper:
1. Extract this ZIP file
2. File → Open → Select the .dawproject file
3. Done!

🛠️ Manual Import (Any DAW):
1. Create new project (48000 Hz, {bpm} BPM)
2. Drag files from stems/ folder to your tracks
3. Done!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEM INFORMATION:

Vocals:  All vocal parts (lead, harmonies, backing)
Drums:   Complete drum kit
Bass:    Bass guitar and sub-bass elements  
Other:   Guitars, keyboards, synths, strings, ambient sounds

NOTE: Guitar and keyboard parts are combined in "other.wav"
This is a limitation of the Demucs AI model (4-stem separation)
See: docs/stem-separation-limitations.md for details

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNICAL SPECS:

Audio Format:    WAV (uncompressed)
Sample Rate:     48000 Hz (48 kHz)
Bit Depth:       24-bit
Channels:        Stereo (2 channels)
Tempo:           {bpm} BPM (detected)

All stems are perfectly aligned and start at 0:00.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEED HELP?

Documentation: docs/cubase-import-guide.md
Website: https://rehearsekit.uk
Issues: https://github.com/UnTypeBeats/RehearseKit/issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by RehearseKit
Your Complete Rehearsal Toolkit
"""
            zipf.writestr("README.txt", readme)

