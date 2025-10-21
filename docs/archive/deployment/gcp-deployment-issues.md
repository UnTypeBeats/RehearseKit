# GCP Deployment Issues

**Date:** October 20, 2025  
**Status:** Known Issues - Deferred for Future Investigation  
**Priority:** Low (Focus on TrueNAS deployment first)

## Overview

The RehearseKit application experiences frequent failures when deployed to Google Cloud Platform (GCP). While local Docker Compose deployment works reliably, the GCP Cloud Run environment presents multiple challenges.

**Decision:** Defer GCP troubleshooting to focus on stable TrueNAS deployment for immediate production use.

## Deployment Architecture (GCP)

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (HTTPS)                   │
│                  rehearsekit.uk → Cloud Run                 │
└─────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │  Frontend │      │   Backend   │     │  WebSocket  │
    │ Cloud Run │      │  Cloud Run  │     │  Cloud Run  │
    │ (Next.js) │      │  (FastAPI)  │     │   (FastAPI) │
    └───────────┘      └──────┬──────┘     └──────┬──────┘
                              │                    │
                    ┌─────────┴──────────┬─────────┘
                    │                    │
            ┌───────▼────────┐   ┌──────▼───────┐
            │   Cloud SQL    │   │ Memorystore  │
            │ (PostgreSQL)   │   │   (Redis)    │
            └────────────────┘   └──────────────┘
                    │
            ┌───────▼────────┐
            │ Cloud Storage  │
            │   (3 buckets)  │
            └────────────────┘
                    │
            ┌───────▼────────┐
            │ Celery Worker  │
            │  Cloud Run     │
            │ (background)   │
            └────────────────┘
```

## Observed Failures

### 1. Worker Service Failures

**Symptom:**
```
Error: ModuleNotFoundError: No module named 'torch'
Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable.
```

**Details:**
- Worker container crashes on startup
- Celery cannot import audio processing dependencies
- Container exits immediately after start

**Potential Causes:**
- Docker image build issues (requirements.txt not fully installed)
- Torch/PyTorch compatibility with Cloud Run CPU architecture
- Missing system libraries (ffmpeg, libsndfile)
- Build layer caching problems

**Last Occurrence:** Multiple times during October 2025 deployments

**Logs:**
```
2025-10-15T10:23:45.123Z ERROR: Container exited with code 1
2025-10-15T10:23:45.234Z INFO: Listening on port 8080
2025-10-15T10:23:46.567Z ERROR: Traceback (most recent call last):
  File "/app/worker_entrypoint.py", line 17, in <module>
    from app.tasks.audio_processing import process_audio_job
  File "/app/app/tasks/audio_processing.py", line 10, in <module>
    from app.services.audio import AudioService
  File "/app/app/services/audio.py", line 6, in <module>
    import librosa
  File "/usr/local/lib/python3.11/site-packages/librosa/__init__.py", line 12, in <module>
    from . import core
  File "/usr/local/lib/python3.11/site-packages/librosa/core/__init__.py", line 5, in <module>
    from .audio import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.11/site-packages/librosa/core/audio.py", line 8, in <module>
    import soundfile as sf
ModuleNotFoundError: No module named 'soundfile'
```

### 2. WebSocket Connection Drops

**Symptom:**
- WebSocket connections established successfully
- Connections drop after 30-60 seconds
- Progress updates stop mid-job
- Frontend doesn't receive completion notifications

**Details:**
- Cloud Run may be terminating idle connections
- Load balancer timeout settings mismatch
- WebSocket service scales to zero unexpectedly

**Potential Causes:**
- Cloud Run request timeout (default 300s)
- Load balancer WebSocket timeout
- Missing `--min-instances=1` on WebSocket service
- VPC connector bandwidth limits

**Impact:**
- Users don't see real-time progress
- Manual page refresh required to see job status

### 3. Cloud SQL Connection Timeouts

**Symptom:**
```
sqlalchemy.exc.OperationalError: (psycopg.OperationalError) connection timeout
```

**Details:**
- Intermittent database connection failures
- Backend can't reach Cloud SQL instance
- Connections work initially, then fail after idle period

**Potential Causes:**
- VPC connector not properly configured
- Cloud SQL Proxy not running/configured
- Connection pool exhaustion
- Private IP vs Public IP configuration mismatch
- IAM authentication issues

**Configuration:**
```yaml
--add-cloudsql-instances ${{ secrets.CLOUD_SQL_INSTANCE }}
--vpc-connector ${{ secrets.VPC_CONNECTOR_NAME }}
```

### 4. File Upload Size Limits

**Symptom:**
- Uploads >100MB fail with 413 error
- Large FLAC files rejected by backend

**Details:**
- Cloud Run has default 32MB request body limit
- FastAPI configured for 1GB max (`max_request_body_size=1024 * 1024 * 1024`)
- Configuration not taking effect in Cloud Run

**Potential Causes:**
- Load balancer request size limit (32MB default)
- Backend configuration not applied correctly
- Need explicit Cloud Run configuration:
  ```yaml
  --max-request-size=1073741824  # 1GB
  ```

### 5. Environment Variable Propagation

**Symptom:**
- Backend logs show "DATABASE_URL not set"
- Services can't find configuration values

**Details:**
- GitHub Secrets configured
- `--set-env-vars` passed to gcloud command
- Variables not available in container

**GitHub Actions Configuration:**
```yaml
--set-env-vars "DATABASE_URL=${{ secrets.DATABASE_URL }}"
--set-env-vars "REDIS_URL=${{ secrets.REDIS_URL }}"
--set-env-vars "CELERY_BROKER_URL=${{ secrets.CELERY_BROKER_URL }}"
```

**Potential Causes:**
- Secret values contain special characters (unescaped)
- Multi-line secrets not handled correctly
- Order of operations (secrets not loaded before deploy)

### 6. Cold Start Performance

**Symptom:**
- First request after idle period takes 30+ seconds
- Users see timeout errors
- Second requests work fine

**Details:**
- Cloud Run scales to zero when idle
- Container startup time significant (PyTorch, Demucs models)
- Model loading adds additional delay

**Impact:**
- Poor user experience for first job after idle
- Timeouts on frontend during cold start

**Potential Solutions:**
- `--min-instances=1` (increases cost)
- Pre-warm containers
- Lazy model loading
- Separate lightweight API from heavy worker

### 7. Storage Bucket Permissions

**Symptom:**
```
google.cloud.exceptions.Forbidden: 403 POST https://storage.googleapis.com/upload/storage/v1/b/rehearsekit-uploads/o?uploadType=multipart: insufficient permissions
```

**Details:**
- Cloud Run service account lacks storage permissions
- Backend can't write to GCS buckets

**Potential Causes:**
- Service account IAM roles not configured
- Bucket-level permissions missing
- Wrong service account in `--service-account` flag

**Required IAM Roles:**
- `roles/storage.objectCreator` (uploads bucket)
- `roles/storage.objectViewer` (all buckets)
- `roles/cloudsql.client` (database)

### 8. Build Failures (Docker Image)

**Symptom:**
```
ERROR: failed to solve: process "/bin/sh -c pip install --no-cache-dir -r requirements.txt" did not complete successfully
```

**Details:**
- `pip install` fails during Docker build
- PyTorch dependencies timeout
- Insufficient memory during build

**Potential Causes:**
- Cloud Build timeout (default 10 minutes)
- Network issues downloading large packages (torch 2GB+)
- Memory limits on build instances
- Incompatible package versions

**Workarounds Attempted:**
- Increase build timeout: `--timeout=30m`
- Split requirements.txt into layers
- Use pre-built PyTorch wheels

## Configuration Gaps

### Missing GitHub Secrets

These secrets need to be configured in GitHub repository settings:

- `GCP_PROJECT_ID` ✅ Configured
- `GCP_SA_KEY` ✅ Configured
- `DATABASE_URL` ⚠️  May contain issues
- `REDIS_URL` ⚠️  May contain issues
- `CELERY_BROKER_URL` ⚠️  May contain issues
- `CELERY_RESULT_BACKEND` ⚠️  May contain issues
- `GCS_BUCKET_UPLOADS` ✅ Configured
- `GCS_BUCKET_STEMS` ✅ Configured
- `GCS_BUCKET_PACKAGES` ✅ Configured
- `CLOUD_RUN_SA_EMAIL` ❓ Unknown
- `VPC_CONNECTOR_NAME` ❓ Unknown
- `CLOUD_SQL_INSTANCE` ❓ Unknown
- `API_URL` ✅ Configured
- `WS_URL` ✅ Configured

### Cloud Run Service Configuration Issues

**Backend Service:**
```yaml
# Current configuration
--memory 2Gi              # May be insufficient for Demucs
--cpu 2                   # CPU-only PyTorch is slow
--min-instances 0         # Cold starts
--max-instances 10        # May be too high (cost)
--timeout 300s            # 5 minutes may not be enough
--port 8000
```

**Worker Service:**
```yaml
# Current configuration
--memory 4Gi              # Appropriate
--cpu 4                   # Appropriate
--min-instances 1         # Good
--max-instances 3         # Appropriate
--timeout 3600s           # Good (1 hour)
--no-cpu-throttling       # Good (prevents slowdowns)
```

**Issues:**
- Worker uses Cloud Run command override (`--command celery`)
- Command may not be executing correctly
- Health checks may be failing

## Infrastructure as Code (Terraform) Status

Terraform configuration exists in `infrastructure/gcp/` but may not be in sync with manual deployments:

**Files:**
- `cloud-run.tf` - Service definitions
- `cloud-sql.tf` - Database
- `memorystore.tf` - Redis
- `storage.tf` - GCS buckets
- `vpc.tf` - Networking
- `load-balancer.tf` - HTTPS ingress
- `monitoring.tf` - (may be incomplete)

**State:**
- `tfplan-stage1`, `tfplan-stage2`, `tfplan-stage2-v2` exist
- Not clear if applied successfully
- May be drift between Terraform state and actual resources

## Debugging Steps for Future Investigation

### 1. Worker Container Issues

```bash
# Build image locally and test
cd backend
docker build -t rehearsekit-worker .
docker run -it --entrypoint /bin/bash rehearsekit-worker

# Inside container, test imports
python -c "import torch; print(torch.__version__)"
python -c "import librosa; print(librosa.__version__)"
python -c "import demucs; print('Demucs OK')"
```

### 2. Database Connectivity

```bash
# Test Cloud SQL connection from Cloud Run
gcloud run services describe rehearsekit-backend \
  --region us-central1 \
  --format yaml

# Check VPC connector
gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME \
  --region us-central1
```

### 3. Storage Permissions

```bash
# Check service account IAM
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT_EMAIL"

# Test GCS access
gsutil ls gs://rehearsekit-uploads/
gsutil cp test.txt gs://rehearsekit-uploads/
```

### 4. Logs Analysis

```bash
# Backend logs
gcloud run services logs read rehearsekit-backend \
  --region us-central1 \
  --limit 100

# Worker logs
gcloud run services logs read rehearsekit-worker \
  --region us-central1 \
  --limit 100

# Build logs
gcloud builds list --limit 5
gcloud builds log $BUILD_ID
```

## Cost Analysis

Estimated GCP costs (monthly) with current issues:

| Service | Cost (est.) | Notes |
|---------|-------------|-------|
| Cloud Run (Frontend) | $10-20 | Low traffic |
| Cloud Run (Backend) | $20-40 | Medium traffic |
| Cloud Run (Worker) | $100-200 | High CPU/memory, long running |
| Cloud Run (WebSocket) | $10-20 | Min 1 instance |
| Cloud SQL (db-f1-micro) | $15-25 | Small instance |
| Memorystore (1GB) | $30-40 | Always on |
| Cloud Storage | $5-10 | Low volume |
| Load Balancer | $18-25 | HTTPS ingress |
| VPC Connector | $10-15 | Always on |
| **Total** | **$218-395/mo** | **Unreliable service** |

**Issue:** High cost for unreliable service. TrueNAS deployment has zero cloud costs.

## Recommendations

### Immediate (Before Resuming GCP Work)

1. ✅ **Document all issues** (this file)
2. ✅ **Focus on TrueNAS deployment** (user has physical access)
3. ✅ **Defer GCP troubleshooting** until local/TrueNAS stable

### Short-Term (When Returning to GCP)

1. **Fix Worker Container**
   - Verify Dockerfile builds successfully
   - Test all imports locally
   - Add health check endpoint
   - Simplify entrypoint (remove custom command)

2. **Simplify Architecture**
   - Remove WebSocket service (use Server-Sent Events instead)
   - Use single Cloud Run service with background tasks
   - Consider Cloud Run Jobs for worker instead of long-running service

3. **Fix Database Connection**
   - Use Cloud SQL Proxy sidecar
   - Document exact connection string format
   - Test connection pooling settings

4. **Increase Limits**
   - Backend: `--max-request-size=1073741824`
   - Load balancer: Configure request size
   - Increase timeouts to 600s

### Long-Term (Production GCP Deployment)

1. **Use GKE Instead of Cloud Run**
   - More control over containers
   - Better for long-running jobs
   - Pod autoscaling
   - Persistent storage

2. **Separate Job Processing**
   - Use Cloud Run Jobs for Celery worker
   - Trigger from Cloud Tasks
   - Better isolation and scaling

3. **Add Monitoring**
   - Cloud Monitoring dashboards
   - Error Reporting
   - Uptime checks
   - Cost alerts

4. **Infrastructure as Code**
   - Ensure Terraform is source of truth
   - Apply changes via Terraform only
   - No manual console changes

## Related Files

- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-worker.yml`
- `.github/workflows/deploy-websocket.yml`
- `infrastructure/gcp/*.tf`
- `docs/deployment.md`

## Conclusion

GCP deployment is **not blocking MVP** because:
1. Local Docker Compose works reliably
2. TrueNAS deployment will provide production stability
3. GCP can be revisited after MVP validation

**Next Steps:** Complete TrueNAS deployment, validate with real users, then return to GCP with lessons learned.

