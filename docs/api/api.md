# RehearseKit API Documentation

Base URL: `https://api.rehearsekit.uk` (Production) or `http://localhost:8000` (Local)

## Authentication

The MVP version does not require authentication. All endpoints are publicly accessible.

Future versions will implement API key or OAuth2 authentication.

## API Endpoints

### Health Check

Check API and dependency health status.

**GET** `/api/health`

#### Response

```json
{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy"
}
```

### Create Job

Create a new audio processing job.

**POST** `/api/jobs/create`

#### Request (Form Data)

For file upload:
```
project_name: string (required)
quality_mode: "fast" | "high" (default: "fast")
file: File (FLAC format, required)
manual_bpm: number (optional)
```

For YouTube URL:
```
project_name: string (required)
quality_mode: "fast" | "high" (default: "fast")
input_url: string (required, YouTube URL)
manual_bpm: number (optional)
```

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "input_type": "upload",
  "project_name": "My Song",
  "quality_mode": "fast",
  "detected_bpm": null,
  "manual_bpm": null,
  "progress_percent": 0,
  "error_message": null,
  "source_file_path": "gs://bucket/550e8400_source.flac",
  "stems_folder_path": null,
  "package_path": null,
  "created_at": "2025-01-18T10:30:00Z",
  "completed_at": null
}
```

#### Status Codes

- `200 OK`: Job created successfully
- `400 Bad Request`: Invalid input (e.g., wrong file format)
- `500 Internal Server Error`: Server error

### List Jobs

Get a paginated list of all jobs.

**GET** `/api/jobs`

#### Query Parameters

- `page` (integer, default: 1): Page number
- `page_size` (integer, default: 20): Number of jobs per page

#### Response

```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "COMPLETED",
      "input_type": "youtube",
      "input_url": "https://www.youtube.com/watch?v=...",
      "project_name": "My Song",
      "quality_mode": "high",
      "detected_bpm": 120.5,
      "manual_bpm": null,
      "progress_percent": 100,
      "error_message": null,
      "source_file_path": "...",
      "stems_folder_path": "...",
      "package_path": "gs://bucket/package.zip",
      "created_at": "2025-01-18T10:30:00Z",
      "completed_at": "2025-01-18T10:45:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

### Get Job

Get details of a specific job.

**GET** `/api/jobs/{job_id}`

#### Path Parameters

- `job_id` (UUID): Job identifier

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SEPARATING",
  "input_type": "upload",
  "project_name": "My Song",
  "quality_mode": "fast",
  "detected_bpm": 128.0,
  "manual_bpm": null,
  "progress_percent": 45,
  "error_message": null,
  "source_file_path": "...",
  "stems_folder_path": null,
  "package_path": null,
  "created_at": "2025-01-18T10:30:00Z",
  "completed_at": null
}
```

#### Status Codes

- `200 OK`: Job found
- `404 Not Found`: Job does not exist

### Get Download URL

Get a signed download URL for a completed job's package.

**GET** `/api/jobs/{job_id}/download`

#### Path Parameters

- `job_id` (UUID): Job identifier

#### Response

```json
{
  "url": "https://storage.googleapis.com/bucket/package.zip?X-Goog-Algorithm=..."
}
```

#### Status Codes

- `200 OK`: URL generated
- `400 Bad Request`: Job not completed yet
- `404 Not Found`: Job or package not found

### Delete Job

Delete a job and its associated files.

**DELETE** `/api/jobs/{job_id}`

#### Path Parameters

- `job_id` (UUID): Job identifier

#### Response

```json
{
  "message": "Job deleted successfully"
}
```

#### Status Codes

- `200 OK`: Job deleted
- `404 Not Found`: Job does not exist

## Job Status Flow

```
PENDING → CONVERTING → ANALYZING → SEPARATING → FINALIZING → PACKAGING → COMPLETED

                                   ↓
                               FAILED (if error occurs)
```

### Status Descriptions

- **PENDING**: Job created, waiting to start
- **CONVERTING**: Converting audio to 48kHz WAV
- **ANALYZING**: Detecting tempo/BPM
- **SEPARATING**: AI-powered stem separation (longest step)
- **FINALIZING**: Embedding metadata
- **PACKAGING**: Creating ZIP package
- **COMPLETED**: Processing finished, ready to download
- **FAILED**: Error occurred during processing

## WebSocket API

Real-time job progress updates via WebSocket.

**WS** `wss://ws.rehearsekit.uk/jobs/{job_id}/progress`

### Connection

```javascript
const ws = new WebSocket('wss://ws.rehearsekit.uk/jobs/550e8400-e29b-41d4-a716-446655440000/progress');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(update);
};
```

### Message Format

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SEPARATING",
  "progress_percent": 45,
  "message": "Separating stems..."
}
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input data
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Unexpected server error

## Rate Limiting

Currently no rate limiting is enforced in the MVP.

Future versions will implement:
- 100 requests per minute per IP
- 10 concurrent jobs per user

## Example Usage

### cURL

```bash
# Create job with file upload
curl -X POST https://api.rehearsekit.uk/api/jobs/create \
  -F "file=@song.flac" \
  -F "project_name=My Song" \
  -F "quality_mode=fast"

# Get job status
curl https://api.rehearsekit.uk/api/jobs/550e8400-e29b-41d4-a716-446655440000

# List all jobs
curl https://api.rehearsekit.uk/api/jobs?page=1&page_size=20
```

### JavaScript (Fetch API)

```javascript
// Create job with file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('project_name', 'My Song');
formData.append('quality_mode', 'fast');

const response = await fetch('https://api.rehearsekit.uk/api/jobs/create', {
  method: 'POST',
  body: formData,
});

const job = await response.json();

// Monitor progress via WebSocket
const ws = new WebSocket(`wss://ws.rehearsekit.uk/jobs/${job.id}/progress`);
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`Progress: ${update.progress_percent}%`);
};
```

### Python (httpx)

```python
import httpx

# Create job with YouTube URL
response = httpx.post(
    'https://api.rehearsekit.uk/api/jobs/create',
    data={
        'project_name': 'My Song',
        'quality_mode': 'high',
        'input_url': 'https://www.youtube.com/watch?v=...',
    }
)

job = response.json()
job_id = job['id']

# Poll for status
while True:
    response = httpx.get(f'https://api.rehearsekit.uk/api/jobs/{job_id}')
    job = response.json()
    
    if job['status'] == 'COMPLETED':
        # Get download URL
        download_response = httpx.get(
            f'https://api.rehearsekit.uk/api/jobs/{job_id}/download'
        )
        download_url = download_response.json()['url']
        break
    
    time.sleep(5)
```

## Interactive Documentation

Visit `https://api.rehearsekit.uk/docs` for interactive Swagger UI documentation where you can test endpoints directly.

