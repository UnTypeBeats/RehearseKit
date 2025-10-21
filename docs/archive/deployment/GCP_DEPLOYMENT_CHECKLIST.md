# RehearseKit GCP Deployment Checklist

## Pre-Deployment Checklist

### ☐ 1. GCP Project Setup

```bash
# Create GCP project
gcloud projects create rehearsekit-prod --name="RehearseKit Production"

# Set project
gcloud config set project rehearsekit-prod

# Enable billing
# Visit: https://console.cloud.google.com/billing/link?project=rehearsekit-prod
```

### ☐ 2. Service Account Creation

```bash
# Create service account
gcloud iam service-accounts create rehearsekit-deploy \
  --display-name="RehearseKit Deployment"

# Grant necessary roles
gcloud projects add-iam-policy-binding rehearsekit-prod \
  --member="serviceAccount:rehearsekit-deploy@rehearsekit-prod.iam.gserviceaccount.com" \
  --role="roles/owner"

# Create and download key
gcloud iam service-accounts keys create ~/rehearsekit-sa-key.json \
  --iam-account=rehearsekit-deploy@rehearsekit-prod.iam.gserviceaccount.com

# Encode for GitHub Secret
cat ~/rehearsekit-sa-key.json | base64
```

### ☐ 3. Terraform State Bucket

```bash
# Create bucket for Terraform state
gsutil mb -p rehearsekit-prod -l us-central1 gs://rehearsekit-terraform-state

# Enable versioning
gsutil versioning set on gs://rehearsekit-terraform-state
```

### ☐ 4. Configure Terraform Variables

```bash
cd infrastructure/gcp

# Copy example
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
# - project_id = "rehearsekit-prod"
# - region = "us-central1"
# - environment = "production"
# - db_password = "<secure-random-password>"
# - alert_email = "your-email@example.com"
```

---

## Infrastructure Deployment

### ☐ 5. Initialize Terraform

```bash
cd infrastructure/gcp

terraform init
```

### ☐ 6. Review Plan

```bash
terraform plan

# Review:
# - Cloud SQL instance
# - Memorystore Redis
# - Cloud Storage buckets (3)
# - VPC connector
# - Service accounts
# - Load balancer
```

### ☐ 7. Apply Infrastructure

```bash
terraform apply

# Save outputs - you'll need these for GitHub secrets
terraform output -json > terraform-outputs.json
```

**Expected Time**: 10-15 minutes

### ☐ 8. Verify Infrastructure

```bash
# Check Cloud SQL
gcloud sql instances list

# Check Memorystore
gcloud redis instances list --region=us-central1

# Check buckets
gsutil ls

# Check VPC connector
gcloud compute networks vpc-access connectors list --region=us-central1
```

---

## GitHub Configuration

### ☐ 9. Configure GitHub Secrets

Go to: https://github.com/UnTypeBeats/RehearseKit/settings/secrets/actions

Add these secrets:

```
GCP_PROJECT_ID=rehearsekit-prod

GCP_SA_KEY=<base64-encoded-service-account-key>

DATABASE_URL=postgresql+asyncpg://rehearsekit:PASSWORD@/rehearsekit?host=/cloudsql/PROJECT:REGION:INSTANCE

CLOUD_SQL_INSTANCE=rehearsekit-prod:us-central1:rehearsekit-postgres-production

REDIS_URL=redis://REDIS_IP:6379/0
CELERY_BROKER_URL=redis://REDIS_IP:6379/0
CELERY_RESULT_BACKEND=redis://REDIS_IP:6379/1

GCS_BUCKET_UPLOADS=rehearsekit-prod-uploads
GCS_BUCKET_STEMS=rehearsekit-prod-stems
GCS_BUCKET_PACKAGES=rehearsekit-prod-packages

VPC_CONNECTOR_NAME=rehearsekit-connector-production

CLOUD_RUN_SA_EMAIL=rehearsekit-cloud-run@rehearsekit-prod.iam.gserviceaccount.com

API_URL=https://api.rehearsekit.uk
WS_URL=wss://ws.rehearsekit.uk
```

**Get values from**:
```bash
cd infrastructure/gcp
terraform output -json
```

---

## Database Setup

### ☐ 10. Run Database Migrations

```bash
# Connect to Cloud SQL via proxy
cloud-sql-proxy rehearsekit-prod:us-central1:rehearsekit-postgres-production &

# Run migrations
cd backend
export DATABASE_URL="postgresql+asyncpg://rehearsekit:PASSWORD@127.0.0.1:5432/rehearsekit"
alembic upgrade head

# Stop proxy
killall cloud-sql-proxy
```

---

## Application Deployment

### ☐ 11. Deploy via GitHub Actions

```bash
# Push to main branch
git push origin main
```

GitHub Actions will automatically:
1. Build Docker images
2. Push to Google Container Registry
3. Deploy to Cloud Run:
   - rehearsekit-frontend
   - rehearsekit-backend
   - rehearsekit-websocket
   - rehearsekit-worker

**Monitor deployment**:
- https://github.com/UnTypeBeats/RehearseKit/actions

### ☐ 12. Verify Deployments

```bash
# List Cloud Run services
gcloud run services list --region=us-central1

# Check service status
gcloud run services describe rehearsekit-backend \
  --region=us-central1 \
  --format="value(status.url,status.conditions)"
```

Test endpoints:
```bash
# Frontend
curl https://FRONTEND_URL/

# Backend
curl https://BACKEND_URL/api/health

# WebSocket
curl https://WEBSOCKET_URL/health
```

---

## DNS Configuration

### ☐ 13. Get Load Balancer IP

```bash
cd infrastructure/gcp
terraform output load_balancer_ip
```

### ☐ 14. Configure DNS Records

At your domain registrar (e.g., Google Domains, Cloudflare):

```
Type  Name              Value
A     rehearsekit.uk    LOAD_BALANCER_IP
CNAME www               rehearsekit.uk
CNAME api               rehearsekit.uk
CNAME ws                rehearsekit.uk
```

### ☐ 15. Wait for SSL Certificate

```bash
# Check certificate status
gcloud compute ssl-certificates list

# Wait for status: ACTIVE (10-15 minutes)
```

### ☐ 16. Test Production URLs

```bash
# Frontend
curl https://rehearsekit.uk/

# API
curl https://api.rehearsekit.uk/api/health

# WebSocket
curl https://ws.rehearsekit.uk/health
```

---

## Post-Deployment

### ☐ 17. Create Test Job

```bash
curl -X POST https://api.rehearsekit.uk/api/jobs/create \
  -F "project_name=Production Test" \
  -F "quality_mode=fast" \
  -F "input_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

### ☐ 18. Monitor First Job

- Check Cloud Logging for errors
- Monitor Cloud Run metrics
- Verify worker processes job
- Confirm package created in GCS

### ☐ 19. Set Up Monitoring

```bash
# View monitoring dashboard
open https://console.cloud.google.com/monitoring/dashboards
```

Configure alerts for:
- Service downtime
- High error rates (>5%)
- High latency (>5s)
- Resource exhaustion

### ☐ 20. Cost Monitoring

```bash
# Set up billing alerts
gcloud billing budgets create --billing-account=BILLING_ID \
  --display-name="RehearseKit Monthly Budget" \
  --budget-amount=100

# Monitor costs
open https://console.cloud.google.com/billing
```

---

## Rollback Plan

If deployment fails:

```bash
# Rollback Cloud Run service
gcloud run services update-traffic rehearsekit-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100

# Rollback database (if needed)
gcloud sql backups list --instance=rehearsekit-postgres-production
gcloud sql backups restore BACKUP_ID \
  --backup-instance=rehearsekit-postgres-production
```

---

## Expected Costs

### Infrastructure (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| Cloud Run (4 services) | Min instances: frontend/backend=0, worker/ws=1 | $15-25 |
| Cloud SQL | db-f1-micro, 10GB | $10 |
| Memorystore Redis | Basic tier, 1GB | $30 |
| Cloud Storage | ~100GB with lifecycle | $2-5 |
| Load Balancer | Minimal traffic | $5 |
| **Total** | | **$62-75/month** |

### Scaling Costs

For higher traffic:
- Cloud Run scales automatically (pay per use)
- Upgrade Cloud SQL to db-g1-small: +$40/month
- More Memorystore: +$30/GB/month

---

## Success Criteria

✅ All services deployed and running
✅ Health endpoints returning "healthy"
✅ DNS resolving to correct IPs
✅ SSL certificates active
✅ Test job completes successfully
✅ Monitoring dashboards showing data
✅ No errors in Cloud Logging
✅ Costs within expected range

---

## Next Steps After Deployment

1. User acceptance testing
2. Performance optimization
3. Add user authentication (future)
4. Implement usage analytics
5. Set up automated backups
6. Configure CDN for downloads
7. Add more DAW format support

---

## Support

- **Infrastructure Code**: `infrastructure/gcp/`
- **Deployment Workflows**: `.github/workflows/`
- **Documentation**: `docs/deployment.md`
- **Terraform Outputs**: `terraform output`

---

Last Updated: October 18, 2025

