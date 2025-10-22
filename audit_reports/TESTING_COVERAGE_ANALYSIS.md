# RehearseKit Testing Coverage Analysis 2025

**Project**: RehearseKit
**Audit Date**: January 2025
**Auditor**: Claude Code Testing Analysis
**Version**: 1.0 MVP

---

## Executive Summary

This comprehensive testing analysis evaluates RehearseKit's current test coverage, identifies critical gaps, and provides a roadmap for achieving robust test coverage across backend, frontend, and end-to-end scenarios.

### Current Testing Status

**Overall Test Coverage**: 12% (Estimated)

| Layer | Coverage | Status | Priority |
|-------|----------|--------|----------|
| Backend Unit Tests | 0% | ❌ None | CRITICAL |
| Backend Integration Tests | 0% | ❌ None | CRITICAL |
| Frontend Unit Tests | 0% | ❌ None | HIGH |
| Frontend Component Tests | 0% | ❌ None | HIGH |
| E2E Tests | ~35% | 🟡 Partial | MEDIUM |
| API Tests | 0% | ❌ None | HIGH |

**Test Files Found**: 8 E2E test files (Playwright)
**Lines of Test Code**: ~800 lines (E2E only)
**Lines of Application Code**: ~6,500 lines
**Test-to-Code Ratio**: 1:8 (Target: 1:3)

### Critical Findings

1. **Zero backend unit test coverage** - Core business logic untested
2. **Zero frontend unit tests** - Component behavior untested
3. **No API integration tests** - Endpoint contracts not verified
4. **Limited E2E coverage** - Only happy paths tested
5. **No performance tests** - Load handling unknown
6. **No security tests** - Vulnerabilities not systematically tested

---

## 1. Existing Test Coverage

### 1.1 End-to-End Tests (Playwright)

**Files Found**:
```
frontend/e2e/
├── basic.spec.ts                 ✓ Basic smoke tests
├── complete-flow.spec.ts         ✓ Full workflow
├── job-creation.spec.ts          ✓ Job creation
├── download.spec.ts              ✓ Download functionality
├── test-auth.spec.ts             ✓ Email/password auth
├── test-auth-google.spec.ts      ✓ Google OAuth
├── cloud-test.spec.ts            ✓ Cloud deployment
└── cloud-job-test.spec.ts        ✓ Cloud job processing
```

**Coverage Estimate**: ~35% of user flows

**What's Tested**:
- ✓ Homepage loads
- ✓ File upload (happy path)
- ✓ YouTube URL input (happy path)
- ✓ Job creation
- ✓ Job status updates
- ✓ File download
- ✓ Basic authentication flows

**What's NOT Tested**:
- ✗ Error scenarios (network failures, invalid files)
- ✗ Edge cases (large files, concurrent jobs)
- ✗ Audio trimming feature
- ✗ Job cancellation
- ✗ Job reprocessing
- ✗ Accessibility
- ✗ Mobile responsiveness
- ✗ Performance under load
- ✗ Browser compatibility

---

## 2. Backend Testing Gaps

### 2.1 Unit Tests (0% Coverage)

#### CRITICAL: No Core Service Tests

**Missing Test Files**:
```
backend/tests/services/
├── test_audio_service.py          ❌ Missing (Critical)
├── test_storage_service.py        ❌ Missing (High)
├── test_cubase_service.py         ❌ Missing (High)
├── test_youtube_preview.py        ❌ Missing (Medium)
└── test_token_blacklist.py        ❌ Missing (Medium)
```

**Priority: CRITICAL**

#### Test Implementation: Audio Service

```python
# backend/tests/services/test_audio_service.py
import pytest
import os
from pathlib import Path
from app.services.audio import AudioService

@pytest.fixture
def audio_service():
    return AudioService()

@pytest.fixture
def sample_audio_files(tmp_path):
    """Create sample audio files for testing"""
    return {
        'mp3': tmp_path / 'test.mp3',
        'flac': tmp_path / 'test.flac',
        'wav': tmp_path / 'test.wav',
    }

class TestAudioConversion:
    """Test audio format conversion"""

    @pytest.mark.asyncio
    async def test_convert_mp3_to_wav(self, audio_service, sample_audio_files, tmp_path):
        """Test MP3 to WAV conversion maintains quality"""
        mp3_file = sample_audio_files['mp3']
        # Create test MP3 file
        # ... (use pydub or sox to create test file)

        wav_path = await audio_service.convert_to_wav(str(mp3_file), str(tmp_path))

        assert wav_path.endswith('.wav')
        assert os.path.exists(wav_path)

        # Verify WAV specifications
        import wave
        with wave.open(wav_path, 'rb') as wav:
            assert wav.getnchannels() == 2  # Stereo
            assert wav.getsampwidth() == 3  # 24-bit
            assert wav.getframerate() == 48000  # 48kHz

    @pytest.mark.asyncio
    async def test_convert_invalid_file_raises_error(self, audio_service, tmp_path):
        """Test that invalid files raise appropriate errors"""
        invalid_file = tmp_path / 'not_audio.txt'
        invalid_file.write_text('This is not audio')

        with pytest.raises(ValueError, match="Invalid audio file"):
            await audio_service.convert_to_wav(str(invalid_file), str(tmp_path))

    @pytest.mark.asyncio
    async def test_convert_corrupted_audio_handles_gracefully(self, audio_service, tmp_path):
        """Test corrupted audio file handling"""
        corrupted = tmp_path / 'corrupted.mp3'
        corrupted.write_bytes(b'\x00' * 1024)  # Invalid MP3 data

        with pytest.raises(AudioProcessingError):
            await audio_service.convert_to_wav(str(corrupted), str(tmp_path))

class TestTempoDetection:
    """Test BPM detection accuracy"""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("expected_bpm,test_file", [
        (120, "test_120bpm.wav"),
        (140, "test_140bpm.wav"),
        (90, "test_90bpm.wav"),
    ])
    async def test_detect_tempo_accuracy(self, audio_service, expected_bpm, test_file):
        """Test BPM detection is within ±2 BPM"""
        # Use pre-generated test files with known BPM
        detected_bpm = await audio_service.detect_tempo(f"tests/fixtures/{test_file}")

        assert abs(detected_bpm - expected_bpm) <= 2, \
            f"Expected ~{expected_bpm} BPM, got {detected_bpm}"

    @pytest.mark.asyncio
    async def test_detect_tempo_variable_bpm(self, audio_service):
        """Test detection of songs with tempo changes"""
        # Song with tempo changes
        result = await audio_service.detect_tempo("tests/fixtures/variable_tempo.wav")

        # Should return average or most prominent tempo
        assert 60 <= result <= 200, "BPM should be in reasonable range"

class TestAudioTrimming:
    """Test audio trimming functionality"""

    @pytest.mark.asyncio
    async def test_trim_audio_preserves_quality(self, audio_service, tmp_path):
        """Test that trimming doesn't reduce audio quality"""
        source = "tests/fixtures/test_audio.wav"
        trimmed = await audio_service.trim_audio(
            source,
            str(tmp_path),
            start=10.0,  # 10 seconds
            end=30.0     # 30 seconds
        )

        # Verify duration
        import librosa
        duration = librosa.get_duration(filename=trimmed)
        assert 19.5 <= duration <= 20.5, "Trimmed duration should be ~20 seconds"

        # Verify format unchanged
        import soundfile as sf
        info = sf.info(trimmed)
        assert info.samplerate == 48000
        assert info.channels == 2

    @pytest.mark.asyncio
    async def test_trim_invalid_range_raises_error(self, audio_service, tmp_path):
        """Test that invalid trim ranges are rejected"""
        source = "tests/fixtures/test_audio.wav"

        # Start > End
        with pytest.raises(ValueError, match="start must be less than end"):
            await audio_service.trim_audio(source, str(tmp_path), start=30.0, end=10.0)

        # Negative values
        with pytest.raises(ValueError, match="times must be positive"):
            await audio_service.trim_audio(source, str(tmp_path), start=-5.0, end=10.0)

class TestStemSeparation:
    """Test stem separation"""

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_separate_stems_creates_all_files(self, audio_service, tmp_path):
        """Test that all expected stem files are created"""
        source = "tests/fixtures/full_song.wav"

        stems_dir = await audio_service.separate_stems(
            source,
            str(tmp_path),
            quality="fast"
        )

        expected_stems = ['vocals.wav', 'drums.wav', 'bass.wav', 'other.wav']
        for stem in expected_stems:
            stem_path = os.path.join(stems_dir, stem)
            assert os.path.exists(stem_path), f"Missing stem: {stem}"
            assert os.path.getsize(stem_path) > 1000, f"Stem too small: {stem}"

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_separate_stems_quality_modes(self, audio_service, tmp_path):
        """Test that high quality produces better separation"""
        source = "tests/fixtures/full_song.wav"

        # Fast mode
        fast_dir = await audio_service.separate_stems(
            source, str(tmp_path / "fast"), quality="fast"
        )

        # High quality mode
        high_dir = await audio_service.separate_stems(
            source, str(tmp_path / "high"), quality="high"
        )

        # High quality should take longer and produce slightly different results
        assert os.path.exists(fast_dir)
        assert os.path.exists(high_dir)

    @pytest.mark.asyncio
    async def test_progress_callback_is_called(self, audio_service, tmp_path):
        """Test that progress callback receives updates"""
        progress_values = []

        def progress_callback(percent):
            progress_values.append(percent)

        source = "tests/fixtures/test_audio.wav"
        await audio_service.separate_stems(
            source,
            str(tmp_path),
            quality="fast",
            progress_callback=progress_callback
        )

        # Should have received multiple progress updates
        assert len(progress_values) > 5
        assert progress_values[0] < progress_values[-1]
        assert 0 <= min(progress_values) <= 100
        assert 0 <= max(progress_values) <= 100

class TestMetadataEmbedding:
    """Test tempo metadata embedding"""

    @pytest.mark.asyncio
    async def test_embed_tempo_in_wav(self, audio_service, tmp_path):
        """Test that BPM metadata is correctly embedded"""
        # Create test WAV file
        test_wav = tmp_path / "test.wav"
        # ... create file

        await audio_service.embed_tempo_metadata(str(tmp_path), bpm=128.5)

        # Verify metadata
        from mutagen.wave import WAVE
        audio = WAVE(test_wav)
        # Check for BPM in metadata
        # Implementation depends on metadata format

    @pytest.mark.asyncio
    async def test_embed_tempo_handles_existing_metadata(self, audio_service, tmp_path):
        """Test that existing metadata is preserved"""
        # Test file with existing metadata
        pass
```

**Estimated Effort**: 12 hours
**Coverage Impact**: +45% backend coverage
**Priority**: CRITICAL

---

### 2.2 API Integration Tests (0% Coverage)

#### CRITICAL: No Endpoint Testing

```python
# backend/tests/api/test_jobs_api.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import create_async_engine

@pytest.fixture
async def client():
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def db_session():
    """Create test database session"""
    # Use test database
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/test_db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def auth_headers(client, db_session):
    """Get authentication headers"""
    # Create test user
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "Test123!@#",
        "full_name": "Test User"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestJobCreation:
    """Test job creation endpoints"""

    @pytest.mark.asyncio
    async def test_create_job_with_file_upload(self, client, auth_headers):
        """Test creating job with file upload"""
        with open("tests/fixtures/test.flac", "rb") as f:
            response = await client.post(
                "/api/jobs/create",
                files={"file": ("test.flac", f, "audio/flac")},
                data={
                    "project_name": "Test Project",
                    "quality_mode": "fast"
                },
                headers=auth_headers
            )

        assert response.status_code == 200
        job = response.json()
        assert job["project_name"] == "Test Project"
        assert job["status"] == "PENDING"
        assert job["quality_mode"] == "fast"

    @pytest.mark.asyncio
    async def test_create_job_with_youtube_url(self, client, auth_headers):
        """Test creating job with YouTube URL"""
        response = await client.post(
            "/api/jobs/create",
            data={
                "project_name": "YouTube Test",
                "quality_mode": "fast",
                "input_type": "youtube",
                "input_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "youtube_preview_id": "test-preview-id"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        job = response.json()
        assert job["input_type"] == "youtube"

    @pytest.mark.asyncio
    async def test_create_job_invalid_file_format_rejected(self, client, auth_headers):
        """Test that invalid file formats are rejected"""
        with open("tests/fixtures/test.txt", "rb") as f:
            response = await client.post(
                "/api/jobs/create",
                files={"file": ("test.txt", f, "text/plain")},
                data={"project_name": "Test", "quality_mode": "fast"},
                headers=auth_headers
            )

        assert response.status_code == 400
        assert "Unsupported format" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_job_without_auth_allowed(self, client):
        """Test that anonymous job creation works (if enabled)"""
        with open("tests/fixtures/test.flac", "rb") as f:
            response = await client.post(
                "/api/jobs/create",
                files={"file": ("test.flac", f, "audio/flac")},
                data={"project_name": "Anonymous", "quality_mode": "fast"}
            )

        # Should either succeed (if anonymous allowed) or fail with 401
        assert response.status_code in [200, 401]

class TestJobRetrieval:
    """Test job retrieval endpoints"""

    @pytest.mark.asyncio
    async def test_list_jobs(self, client, auth_headers):
        """Test listing jobs"""
        response = await client.get("/api/jobs", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert "page" in data

    @pytest.mark.asyncio
    async def test_get_job_by_id(self, client, auth_headers):
        """Test getting specific job"""
        # Create job first
        with open("tests/fixtures/test.flac", "rb") as f:
            create_response = await client.post(
                "/api/jobs/create",
                files={"file": ("test.flac", f, "audio/flac")},
                data={"project_name": "Test", "quality_mode": "fast"},
                headers=auth_headers
            )
        job_id = create_response.json()["id"]

        # Get job
        response = await client.get(f"/api/jobs/{job_id}", headers=auth_headers)

        assert response.status_code == 200
        job = response.json()
        assert job["id"] == job_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_job_returns_404(self, client, auth_headers):
        """Test 404 for non-existent job"""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/jobs/{fake_uuid}", headers=auth_headers)

        assert response.status_code == 404

class TestJobOperations:
    """Test job operations (cancel, delete, reprocess)"""

    @pytest.mark.asyncio
    async def test_cancel_job(self, client, auth_headers):
        """Test canceling a job"""
        # Create job
        # ... (create job code)

        # Cancel it
        response = await client.post(
            f"/api/jobs/{job_id}/cancel",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["job"]["status"] == "CANCELLED"

    @pytest.mark.asyncio
    async def test_delete_job(self, client, auth_headers):
        """Test deleting a job"""
        # Create and delete job
        pass

    @pytest.mark.asyncio
    async def test_reprocess_job_with_higher_quality(self, client, auth_headers):
        """Test reprocessing completed job"""
        pass

class TestFileDownloads:
    """Test file download endpoints"""

    @pytest.mark.asyncio
    async def test_download_completed_job_package(self, client, auth_headers):
        """Test downloading job package"""
        # Create completed job (mock)
        # Download package
        pass

    @pytest.mark.asyncio
    async def test_download_individual_stem(self, client, auth_headers):
        """Test downloading individual stem"""
        pass

    @pytest.mark.asyncio
    async def test_download_source_audio(self, client, auth_headers):
        """Test downloading source audio for preview"""
        pass
```

**Estimated Effort**: 16 hours
**Coverage Impact**: +35% API coverage
**Priority**: CRITICAL

---

### 2.3 Security Tests (0% Coverage)

```python
# backend/tests/security/test_authentication.py
import pytest
from httpx import AsyncClient

class TestAuthenticationSecurity:
    """Test authentication security"""

    @pytest.mark.asyncio
    async def test_jwt_token_expiration(self, client):
        """Test that expired tokens are rejected"""
        # Create token with 0 expiration
        pass

    @pytest.mark.asyncio
    async def test_jwt_token_tampering_detected(self, client):
        """Test that tampered tokens are rejected"""
        # Modify token payload
        # Attempt to use it
        # Should be rejected
        pass

    @pytest.mark.asyncio
    async def test_brute_force_protection(self, client):
        """Test rate limiting on login endpoint"""
        # Attempt multiple failed logins
        # Should be rate limited after N attempts
        pass

    @pytest.mark.asyncio
    async def test_weak_password_rejected(self, client):
        """Test password complexity requirements"""
        weak_passwords = ["123", "password", "abc", "12345678"]
        for pwd in weak_passwords:
            response = await client.post("/api/auth/register", json={
                "email": "test@example.com",
                "password": pwd
            })
            assert response.status_code == 400

class TestAuthorizationSecurity:
    """Test authorization and access control"""

    @pytest.mark.asyncio
    async def test_user_cannot_access_others_jobs(self, client):
        """Test horizontal privilege escalation prevention"""
        # User A creates job
        # User B tries to access it
        # Should be denied
        pass

    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_admin_endpoints(self, client):
        """Test vertical privilege escalation prevention"""
        pass

class TestInputValidationSecurity:
    """Test input validation security"""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("malicious_filename", [
        "../../../etc/passwd",
        "test; rm -rf /",
        "test' OR '1'='1",
        "<script>alert('xss')</script>.flac"
    ])
    async def test_malicious_filenames_sanitized(self, client, auth_headers, malicious_filename):
        """Test that malicious filenames are sanitized"""
        with open("tests/fixtures/test.flac", "rb") as f:
            response = await client.post(
                "/api/jobs/create",
                files={"file": (malicious_filename, f, "audio/flac")},
                data={"project_name": "Test", "quality_mode": "fast"},
                headers=auth_headers
            )

        # Should either sanitize or reject
        if response.status_code == 200:
            job = response.json()
            # Filename should be sanitized
            assert "../" not in job["source_file_path"]
            assert ";" not in job["source_file_path"]

    @pytest.mark.asyncio
    async def test_file_size_limit_enforced(self, client, auth_headers):
        """Test that oversized files are rejected"""
        # Create 600MB dummy file
        large_file = b'\x00' * (600 * 1024 * 1024)

        response = await client.post(
            "/api/jobs/create",
            files={"file": ("huge.flac", large_file, "audio/flac")},
            data={"project_name": "Test", "quality_mode": "fast"},
            headers=auth_headers
        )

        assert response.status_code == 413  # Payload Too Large
```

**Estimated Effort**: 8 hours
**Coverage Impact**: Security coverage
**Priority**: HIGH

---

## 3. Frontend Testing Gaps

### 3.1 Component Unit Tests (0% Coverage)

```typescript
// frontend/components/__tests__/audio-uploader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AudioUploader } from '../audio-uploader';
import { vi } from 'vitest';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AudioUploader', () => {
  describe('Input Type Selection', () => {
    it('should render upload and YouTube tabs', () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      expect(screen.getByText('Upload Audio')).toBeInTheDocument();
      expect(screen.getByText('YouTube URL')).toBeInTheDocument();
    });

    it('should switch between upload and YouTube modes', () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      // Default: upload mode
      expect(screen.getByText(/Drag and drop/)).toBeInTheDocument();

      // Switch to YouTube
      fireEvent.click(screen.getByText('YouTube URL'));
      expect(screen.getByPlaceholderText(/youtube.com/)).toBeInTheDocument();

      // Switch back to upload
      fireEvent.click(screen.getByText('Upload Audio'));
      expect(screen.getByText(/Drag and drop/)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should accept valid audio file via drag and drop', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const file = new File(['audio content'], 'test.flac', { type: 'audio/flac' });
      const dropZone = screen.getByText(/Drag and drop/);

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText('Selected: test.flac')).toBeInTheDocument();
      });
    });

    it('should reject invalid file types', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const file = new File(['text'], 'test.txt', { type: 'text/plain' });
      const dropZone = screen.getByText(/Drag and drop/);

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file/)).toBeInTheDocument();
      });
    });

    it('should auto-fill project name from filename', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const file = new File(['audio'], 'My Song.flac', { type: 'audio/flac' });
      const dropZone = screen.getByText(/Drag and drop/);

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('My Awesome Song') as HTMLInputElement;
        expect(input.value).toBe('My Song');
      });
    });
  });

  describe('YouTube URL Input', () => {
    it('should validate YouTube URL format', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('YouTube URL'));

      const input = screen.getByPlaceholderText(/youtube.com/);
      fireEvent.change(input, { target: { value: 'not-a-url' } });

      fireEvent.click(screen.getByText('Fetch Audio'));

      await waitFor(() => {
        expect(screen.getByText(/Missing URL/)).toBeInTheDocument();
      });
    });

    it('should fetch YouTube metadata successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        preview_id: 'test-id',
        title: 'Test Video',
        thumbnail: 'http://example.com/thumb.jpg',
        preview_url: '/preview/test-id',
      });

      vi.mock('@/utils/api', () => ({
        apiClient: {
          createYouTubePreview: mockFetch,
        },
        getApiUrl: () => 'http://localhost:8000',
      }));

      render(<AudioUploader />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('YouTube URL'));

      const input = screen.getByPlaceholderText(/youtube.com/);
      fireEvent.change(input, {
        target: { value: 'https://www.youtube.com/watch?v=test' },
      });

      fireEvent.click(screen.getByText('Fetch Audio'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(screen.getByText('Test Video')).toBeInTheDocument();
      });
    });
  });

  describe('Quality Mode Selection', () => {
    it('should allow selecting between fast and high quality', () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const fastButton = screen.getByText('Fast');
      const highButton = screen.getByText('High Quality');

      // Default: Fast
      expect(fastButton).toHaveClass('default');

      // Switch to High
      fireEvent.click(highButton);
      expect(highButton).toHaveClass('default');

      // Switch back to Fast
      fireEvent.click(fastButton);
      expect(fastButton).toHaveClass('default');
    });
  });

  describe('Form Submission', () => {
    it('should disable submit when no file selected', () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const submitButton = screen.getByText('Start Processing');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit when file is selected', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const file = new File(['audio'], 'test.flac', { type: 'audio/flac' });
      const dropZone = screen.getByText(/Drag and drop/);

      fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        const submitButton = screen.getByText('Start Processing');
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Audio Trimming', () => {
    it('should display trim controls when audio is loaded', async () => {
      render(<AudioUploader />, { wrapper: createWrapper() });

      const file = new File(['audio'], 'test.flac', { type: 'audio/flac' });
      const dropZone = screen.getByText(/Drag and drop/);

      fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Audio Preview')).toBeInTheDocument();
      });
    });

    it('should update trim times when region is selected', async () => {
      // Test trim functionality
      pass;
    });
  });
});
```

**Additional Component Tests Needed**:
```
frontend/components/__tests__/
├── processing-queue.test.tsx        ❌ Missing
├── job-card.test.tsx                ❌ Missing
├── audio-waveform.test.tsx          ❌ Missing
├── stem-mixer.test.tsx              ❌ Missing
├── auth/
│   ├── login-dialog.test.tsx        ❌ Missing
│   └── user-menu.test.tsx           ❌ Missing
└── layout/
    └── header.test.tsx              ❌ Missing
```

**Estimated Effort**: 20 hours
**Coverage Impact**: +60% frontend coverage
**Priority**: HIGH

---

### 3.2 Integration Tests (0% Coverage)

```typescript
// frontend/__tests__/integration/job-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import Home from '@/app/page';

const server = setupServer(
  rest.post('/api/jobs/create', (req, res, ctx) => {
    return res(ctx.json({
      id: 'test-job-id',
      status: 'PENDING',
      project_name: 'Test',
    }));
  }),

  rest.get('/api/jobs', (req, res, ctx) => {
    return res(ctx.json({
      jobs: [
        {
          id: 'test-job-id',
          status: 'PROCESSING',
          progress_percent: 50,
        },
      ],
      total: 1,
      page: 1,
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Job Creation Flow', () => {
  it('should complete full job creation flow', async () => {
    render(<Home />);

    // 1. Upload file
    const file = new File(['audio'], 'test.flac', { type: 'audio/flac' });
    const dropZone = screen.getByText(/Drag and drop/);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    // 2. Fill form
    const projectInput = screen.getByPlaceholderText('My Awesome Song');
    fireEvent.change(projectInput, { target: { value: 'Test Project' } });

    // 3. Submit
    const submitButton = screen.getByText('Start Processing');
    fireEvent.click(submitButton);

    // 4. Verify job appears in queue
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    });
  });
});
```

**Estimated Effort**: 8 hours
**Coverage Impact**: +20% integration coverage
**Priority**: MEDIUM

---

## 4. Testing Infrastructure

### 4.1 Test Configuration

#### Backend Test Setup

```python
# backend/pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=70
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    asyncio: marks tests as async
    integration: marks tests as integration tests

# backend/pyproject.toml
[tool.coverage.run]
source = ["app"]
omit = [
    "*/tests/*",
    "*/venv/*",
    "*/__pycache__/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

#### Frontend Test Setup

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/types.ts',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

// frontend/tests/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

---

### 4.2 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run unit tests
        run: |
          cd frontend
          npm run test:unit -- --coverage
      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright install
          npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/lcov.info
```

---

## 5. Testing Roadmap

### Phase 1: Critical Backend Tests (Week 1-2)
**Effort**: 36 hours

1. Audio Service Unit Tests (12h)
   - Conversion, tempo detection, trimming, separation
2. API Integration Tests (16h)
   - Jobs API, Auth API, YouTube API
3. Security Tests (8h)
   - Authentication, authorization, input validation

**Impact**: Backend coverage 0% → 65%

### Phase 2: Frontend Tests (Week 3-4)
**Effort**: 28 hours

1. Component Unit Tests (20h)
   - AudioUploader, ProcessingQueue, JobCard, StemMixer
2. Integration Tests (8h)
   - Full user flows

**Impact**: Frontend coverage 0% → 60%

### Phase 3: E2E Test Expansion (Week 5)
**Effort**: 16 hours

1. Error Scenario Tests (8h)
   - Network failures, invalid inputs, edge cases
2. Performance Tests (4h)
   - Load testing, stress testing
3. Accessibility Tests (4h)
   - Screen reader, keyboard navigation

**Impact**: E2E coverage 35% → 75%

### Phase 4: Advanced Testing (Week 6)
**Effort**: 12 hours

1. Contract Tests (4h)
   - API contract validation
2. Visual Regression Tests (4h)
   - Screenshot comparison
3. Mutation Testing (4h)
   - Test quality verification

**Impact**: Overall robustness +30%

---

## 6. Test Coverage Goals

### Target Coverage (3 Months)

| Layer | Current | 1 Month | 2 Months | 3 Months | Target |
|-------|---------|---------|----------|----------|--------|
| Backend Unit | 0% | 45% | 65% | 75% | 80% |
| Backend Integration | 0% | 30% | 50% | 65% | 70% |
| Frontend Unit | 0% | 40% | 60% | 70% | 75% |
| Frontend Component | 0% | 35% | 55% | 65% | 70% |
| E2E | 35% | 50% | 65% | 75% | 80% |
| **Overall** | **12%** | **40%** | **60%** | **70%** | **75%** |

### Success Metrics

- **Code Coverage**: >75% overall
- **Test Reliability**: <1% flaky tests
- **Test Performance**: All tests complete in <10 minutes
- **Bug Detection**: 80% of bugs caught by tests before production
- **Regression Prevention**: Zero regression bugs after test suite completion

---

## 7. Conclusion

RehearseKit currently has **critically insufficient test coverage** (12%) with zero backend and frontend unit tests. This represents a significant risk for production deployment.

**Critical Actions Required**:
1. Implement backend unit tests (Priority 1)
2. Implement API integration tests (Priority 1)
3. Add frontend component tests (Priority 2)
4. Expand E2E test coverage (Priority 2)
5. Set up CI/CD testing pipeline (Priority 1)

**Total Effort**: ~92 hours (11.5 days) to reach 75% coverage

**Timeline**: 3 months to achieve production-ready test coverage

By following this roadmap, RehearseKit can achieve robust, production-ready test coverage that ensures code quality, prevents regressions, and enables confident deployments.

---

**Report Generated**: January 2025
**Next Review**: After Phase 1 completion
**Target Date for 75% Coverage**: April 2025
