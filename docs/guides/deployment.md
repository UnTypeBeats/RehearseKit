# RehearseKit Deployment Guide

This guide covers deploying RehearseKit to Google Cloud Platform.

## Prerequisites

- Google Cloud Platform account
- GCP Project created
- `gcloud` CLI installed and configured
- Terraform installed (>= 1.0)
- Docker installed
- Domain name configured (rehearsekit.uk)

## Architecture Overview

RehearseKit deploys as a cloud-native application with the following components:

- **Frontend**: Next.js 14 on Cloud Run
- **Backend API**: FastAPI on Cloud Run
- **Worker**: Celery workers on Cloud Run
- **WebSocket**: Real-time updates on Cloud Run
- **Database**: Cloud SQL (PostgreSQL 16)
- **Cache/Queue**: Memorystore for Redis
- **Storage**: Cloud Storage buckets
- **Load Balancer**: Global HTTPS Load Balancer with SSL

## Step 1: Configure GCP Project

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Set the project
gcloud config set project $GCP_PROJECT_ID

# Enable billing (required)
# Visit: https://console.cloud.google.com/billing
```

## Step 2: Provision Infrastructure with Terraform

```bash
cd infrastructure/gcp

# Initialize Terraform
terraform init

# Copy example variables and edit
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Review the plan
terraform plan

# Apply infrastructure
terraform apply

# Note the outputs - you'll need these for GitHub secrets
```

### Key Terraform Outputs

- `database_connection_name`
- `redis_connection_string`
- `uploads_bucket`, `stems_bucket`, `packages_bucket`
- `vpc_connector_name`
- `service_account_email`
- `load_balancer_ip`

## Step 3: Configure DNS

Point your domain to the Load Balancer IP:

```
rehearsekit.uk        A     <LOAD_BALANCER_IP>
www.rehearsekit.uk    CNAME rehearsekit.uk
api.rehearsekit.uk    CNAME rehearsekit.uk
ws.rehearsekit.uk     CNAME rehearsekit.uk
```

## Step 4: Set Up GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add:

```
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY=<service-account-key-json>

# Database (from Terraform outputs)
DATABASE_URL=postgresql://rehearsekit:PASSWORD@/rehearsekit?host=/cloudsql/CONNECTION_NAME
CLOUD_SQL_INSTANCE=CONNECTION_NAME

# Redis (from Terraform outputs)
REDIS_URL=redis://REDIS_IP:6379/0
CELERY_BROKER_URL=redis://REDIS_IP:6379/0
CELERY_RESULT_BACKEND=redis://REDIS_IP:6379/1

# Storage buckets
GCS_BUCKET_UPLOADS=your-project-id-uploads
GCS_BUCKET_STEMS=your-project-id-stems
GCS_BUCKET_PACKAGES=your-project-id-packages

# VPC
VPC_CONNECTOR_NAME=rehearsekit-connector-production

# Service account
CLOUD_RUN_SA_EMAIL=rehearsekit-cloud-run@PROJECT_ID.iam.gserviceaccount.com

# URLs (for frontend environment)
API_URL=https://api.rehearsekit.uk
WS_URL=wss://ws.rehearsekit.uk
```

## Step 5: Deploy via GitHub Actions

Push to the `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

GitHub Actions will automatically:
1. Build Docker images
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Configure environment variables

## Step 6: Run Database Migrations

After first deployment, run migrations:

```bash
# Connect to the backend Cloud Run service
gcloud run services execute rehearsekit-backend \
  --region=us-central1 \
  --command="alembic upgrade head"
```

## Step 7: Verify Deployment

Check each service:

```bash
# Frontend
curl https://rehearsekit.uk

# Backend health
curl https://api.rehearsekit.uk/api/health

# WebSocket health
curl https://ws.rehearsekit.uk/health
```

## Step 8: Monitor

Access Cloud Console monitoring:
- https://console.cloud.google.com/monitoring

Key metrics to watch:
- Cloud Run request latency
- Error rates (4xx, 5xx)
- Database connections
- Redis memory usage
- Storage bucket size

## Scaling Configuration

### Auto-scaling Settings

Current defaults (adjust in GitHub Actions workflows):

- **Frontend**: 0-10 instances
- **Backend**: 0-10 instances  
- **Worker**: 1-3 instances (min 1 for processing)
- **WebSocket**: 1-5 instances (min 1 for persistent connections)

### Resource Limits

- **Frontend**: 512Mi RAM, 1 CPU
- **Backend**: 2Gi RAM, 2 CPUs
- **Worker**: 4Gi RAM, 4 CPUs
- **WebSocket**: 512Mi RAM, 1 CPU

## Cost Optimization

### Expected Monthly Costs (Low Traffic)

- Cloud Run: ~$10-20
- Cloud SQL (db-f1-micro): ~$10
- Memorystore (Basic 1GB): ~$30
- Cloud Storage: ~$1-5
- **Total: ~$50-65/month**

### Optimization Tips

1. **Cloud Run**: Services scale to zero when idle (except worker & websocket)
2. **Storage**: 7-day lifecycle policy automatically deletes old files
3. **Database**: Upgrade to larger instance only when needed
4. **CDN**: Enabled for frontend static assets

## Troubleshooting

### Service Not Responding

```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Check specific service
gcloud run services describe rehearsekit-backend \
  --region=us-central1
```

### Database Connection Issues

```bash
# Test Cloud SQL connectivity
gcloud sql connect rehearsekit-postgres-production --user=rehearsekit
```

### WebSocket Connection Failures

```bash
# Check WebSocket service logs
gcloud logging read "resource.labels.service_name=rehearsekit-websocket" \
  --limit 50
```

## Rollback Procedure

If a deployment fails:

```bash
# List revisions
gcloud run revisions list --service=rehearsekit-backend --region=us-central1

# Roll back to previous revision
gcloud run services update-traffic rehearsekit-backend \
  --region=us-central1 \
  --to-revisions=REVISION_NAME=100
```

## Security Considerations

1. **SSL/TLS**: Managed certificates for all domains
2. **VPC**: Private networking for database and Redis
3. **IAM**: Least-privilege service account roles
4. **Secrets**: Stored in GitHub Secrets, never in code
5. **SQL Injection**: SQLAlchemy ORM with parameterized queries
6. **CORS**: Configured for specific origins only

## Updating Configuration

To update environment variables:

```bash
# Update GitHub secrets
# Then redeploy by pushing to main, or manually:

gcloud run services update rehearsekit-backend \
  --region=us-central1 \
  --update-env-vars "KEY=VALUE"
```

## Disaster Recovery

### Backups

- **Database**: Automated daily backups, 7-day retention, point-in-time recovery
- **Storage**: Versioning disabled to save costs, but can be enabled

### Recovery Procedure

```bash
# Restore database from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=rehearsekit-postgres-production \
  --backup-id=BACKUP_ID
```

## Next Steps

- Set up Cloud Monitoring dashboards
- Configure alerting policies
- Enable Cloud Trace for request tracing
- Set up Cloud Error Reporting
- Review and adjust scaling limits based on actual traffic

