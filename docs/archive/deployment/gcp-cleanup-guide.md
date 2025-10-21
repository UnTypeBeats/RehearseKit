# GCP Cleanup Guide

**Date:** October 20, 2025  
**Purpose:** Remove all RehearseKit GCP resources to stop billing  
**Estimated Time:** 20-30 minutes  
**Cost Savings:** $150-265/month ($1,800-3,180/year)

---

## Overview

This guide walks through safely deleting all RehearseKit resources from Google Cloud Platform while keeping the GCP project active for potential future use.

### What Will Be Deleted

- ✅ Cloud Run services (frontend, backend, worker, websocket)
- ✅ Cloud SQL PostgreSQL instance
- ✅ Memorystore Redis instance
- ✅ Cloud Storage buckets (uploads, stems, packages)
- ✅ Load Balancer (HTTPS, SSL certificates, forwarding rules)
- ✅ VPC network, subnets, and connectors
- ✅ Service accounts and IAM bindings
- ✅ Terraform state bucket

### What Will Be Kept

- ✅ GCP Project (active but empty)
- ✅ Enabled APIs (no cost when not in use)
- ✅ GitHub Actions workflows (for reference)

---

## Prerequisites

### 1. Install gcloud CLI

If not already installed:

```bash
# macOS
brew install google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate

```bash
gcloud auth login
```

### 3. Set Project

```bash
# List your projects
gcloud projects list

# Set active project
gcloud config set project YOUR_PROJECT_ID
```

### 4. Verify Access

```bash
# Check you have Owner or Editor role
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

---

## Method 1: Automated Cleanup (Recommended)

### Step 1: Download Cleanup Script

The cleanup script is located at: `infrastructure/gcp/cleanup-gcp.sh`

### Step 2: Make Executable

```bash
cd infrastructure/gcp
chmod +x cleanup-gcp.sh
```

### Step 3: Run Cleanup

```bash
# Dry run - see what will be deleted
./cleanup-gcp.sh

# The script will:
# 1. Discover all resources
# 2. Show estimated costs
# 3. Prompt for confirmation
# 4. Delete resources in safe order
# 5. Verify cleanup
# 6. Show cost savings
```

### Step 4: Follow Prompts

The script will ask for confirmation at critical steps:

```
Proceed with cleanup of project 'YOUR_PROJECT'? [y/N]: y
Proceed with deletion? [y/N]: y
Delete Terraform state bucket? [y/N]: y
```

### Step 5: Wait for Completion

The script takes 15-25 minutes to complete:
- Cloud Run: ~1 minute
- Load Balancer: ~2 minutes
- Redis: ~3-5 minutes
- Cloud SQL: ~5-10 minutes
- VPC: ~2-3 minutes
- Storage: ~1 minute

---

## Method 2: Manual Cleanup (If Script Fails)

### Step 1: Delete Cloud Run Services

```bash
PROJECT_ID="YOUR_PROJECT_ID"
REGION="us-central1"

# List services
gcloud run services list --project="$PROJECT_ID" --region="$REGION"

# Delete each service
gcloud run services delete rehearsekit-frontend --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services delete rehearsekit-backend --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services delete rehearsekit-worker --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services delete rehearsekit-websocket --project="$PROJECT_ID" --region="$REGION" --quiet
```

### Step 2: Delete Memorystore Redis

```bash
# List instances
gcloud redis instances list --project="$PROJECT_ID" --region="$REGION"

# Delete (takes 3-5 minutes)
gcloud redis instances delete rehearsekit-redis-production \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --quiet
```

### Step 3: Delete Cloud SQL

```bash
# List instances
gcloud sql instances list --project="$PROJECT_ID"

# Disable deletion protection
gcloud sql instances patch rehearsekit-postgres-production \
  --project="$PROJECT_ID" \
  --no-deletion-protection \
  --quiet

# Delete (takes 5-10 minutes)
gcloud sql instances delete rehearsekit-postgres-production \
  --project="$PROJECT_ID" \
  --quiet
```

### Step 4: Delete Cloud Storage

```bash
# List buckets
gsutil ls -p "$PROJECT_ID"

# Delete buckets and contents
gsutil -m rm -r gs://${PROJECT_ID}-uploads
gsutil -m rm -r gs://${PROJECT_ID}-stems
gsutil -m rm -r gs://${PROJECT_ID}-packages
```

### Step 5: Delete Load Balancer Components

```bash
# Forwarding rules
gcloud compute forwarding-rules delete rehearsekit-https-rule-production --global --project="$PROJECT_ID" --quiet
gcloud compute forwarding-rules delete rehearsekit-http-rule-production --global --project="$PROJECT_ID" --quiet

# Target proxies
gcloud compute target-https-proxies delete rehearsekit-https-proxy-production --project="$PROJECT_ID" --quiet
gcloud compute target-http-proxies delete rehearsekit-http-proxy-production --project="$PROJECT_ID" --quiet

# URL maps
gcloud compute url-maps delete rehearsekit-lb-production --project="$PROJECT_ID" --quiet
gcloud compute url-maps delete rehearsekit-https-redirect-production --project="$PROJECT_ID" --quiet

# Backend services
gcloud compute backend-services delete rehearsekit-frontend-backend --global --project="$PROJECT_ID" --quiet
gcloud compute backend-services delete rehearsekit-backend-backend --global --project="$PROJECT_ID" --quiet
gcloud compute backend-services delete rehearsekit-websocket-backend --global --project="$PROJECT_ID" --quiet

# Network endpoint groups
gcloud compute network-endpoint-groups delete rehearsekit-frontend-neg --region="$REGION" --project="$PROJECT_ID" --quiet
gcloud compute network-endpoint-groups delete rehearsekit-backend-neg --region="$REGION" --project="$PROJECT_ID" --quiet
gcloud compute network-endpoint-groups delete rehearsekit-websocket-neg --region="$REGION" --project="$PROJECT_ID" --quiet

# SSL certificates
gcloud compute ssl-certificates delete rehearsekit-ssl-cert-production --project="$PROJECT_ID" --quiet

# Global IP address
gcloud compute addresses delete rehearsekit-lb-ip-production --global --project="$PROJECT_ID" --quiet
```

### Step 6: Delete VPC Resources

```bash
# VPC connector (takes 2-3 minutes)
gcloud compute networks vpc-access connectors delete rehearsekit-conn-prod \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --quiet

# Wait for connector deletion
sleep 180

# Service networking connection
gcloud services vpc-peerings delete \
  --service=servicenetworking.googleapis.com \
  --network=rehearsekit-vpc-production \
  --project="$PROJECT_ID" \
  --quiet

# Global address for peering
gcloud compute addresses delete rehearsekit-private-ip-production \
  --global \
  --project="$PROJECT_ID" \
  --quiet

# Subnet
gcloud compute networks subnets delete rehearsekit-subnet-production \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --quiet

# VPC
gcloud compute networks delete rehearsekit-vpc-production \
  --project="$PROJECT_ID" \
  --quiet
```

### Step 7: Delete Service Accounts

```bash
# List service accounts
gcloud iam service-accounts list --project="$PROJECT_ID" --filter="email~rehearsekit"

# Delete
gcloud iam service-accounts delete rehearsekit-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com \
  --project="$PROJECT_ID" \
  --quiet
```

### Step 8: Delete Terraform State

```bash
# Delete Terraform state bucket
gsutil -m rm -r gs://rehearsekit-terraform-state
```

---

## Verification

### Check Remaining Resources

```bash
# Cloud Run
gcloud run services list --project="$PROJECT_ID"

# Cloud SQL
gcloud sql instances list --project="$PROJECT_ID"

# Redis
gcloud redis instances list --project="$PROJECT_ID" --region="$REGION"

# Storage
gsutil ls -p "$PROJECT_ID"

# VPC
gcloud compute networks list --project="$PROJECT_ID"

# Load Balancer components
gcloud compute forwarding-rules list --project="$PROJECT_ID" --global
```

### Expected Result

All commands should return empty or "Listed 0 items."

---

## Post-Cleanup Actions

### Option 1: Keep Project Active (No Costs)

The project will remain active with zero resources and near-zero costs.

**Pros:**
- Can re-enable GCP deployment later
- Keep API credentials
- Maintain project history

**Cons:**
- Small risk of accidental resource creation

### Option 2: Disable Billing

Prevents any future charges:

```bash
# Unlink billing account
gcloud billing projects unlink $PROJECT_ID

# Verify
gcloud billing projects describe $PROJECT_ID
```

**Warning:** You cannot create ANY resources with billing disabled.

### Option 3: Delete Project (Nuclear Option)

Completely removes the project:

```bash
# Delete project (IRREVERSIBLE)
gcloud projects delete $PROJECT_ID

# Confirm when prompted
```

**Warning:** This deletes EVERYTHING including API keys, service accounts, and project history.

---

## Troubleshooting

### Issue: "Resource in use" or "Cannot delete"

**Solution:** Resources may have dependencies. Wait 5 minutes and retry.

```bash
# Check for dependent resources
gcloud compute backend-services list --global --project="$PROJECT_ID"
gcloud compute url-maps list --project="$PROJECT_ID"
```

### Issue: "Deletion protection enabled"

**Solution:** Disable protection first (applies to Cloud SQL):

```bash
gcloud sql instances patch INSTANCE_NAME \
  --project="$PROJECT_ID" \
  --no-deletion-protection
```

### Issue: "Permission denied"

**Solution:** Ensure you have Owner or Editor role:

```bash
# Check your roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"
```

### Issue: Script hangs

**Solution:** Some operations take 5-10 minutes. Be patient. If truly stuck:

1. Press `Ctrl+C` to interrupt
2. Check which step failed
3. Run that step manually (see Method 2)
4. Resume script or continue manually

---

## Cost Verification

### Check Current Billing

```bash
# View current month costs
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### GCP Console Verification

1. Go to: https://console.cloud.google.com/billing
2. Select your billing account
3. View cost breakdown by service
4. Confirm costs drop to $0-5/month within 24 hours

### Expected Timeline

- **Immediate:** Cloud Run, Load Balancer charges stop
- **24 hours:** Final Cloud SQL, Redis charges appear
- **7 days:** Old Cloud Storage lifecycle deletions complete
- **30 days:** Billing reflects $0-2/month

---

## Re-enabling GCP (Future)

If you want to re-deploy to GCP later:

1. **Re-run Terraform:**
   ```bash
   cd infrastructure/gcp
   terraform init
   terraform plan
   terraform apply
   ```

2. **Trigger GitHub Actions:**
   - Push to main branch
   - Workflows rebuild and redeploy

3. **Restore Data:**
   - No data to restore (everything was deleted)
   - Fresh start required

---

## Summary

### Before Cleanup
- **Monthly Cost:** $150-265
- **Annual Cost:** $1,800-3,180
- **Resources:** 15+ GCP services

### After Cleanup
- **Monthly Cost:** $0
- **Annual Cost:** $0
- **Resources:** GCP project only (no services)

### Savings
- **Monthly:** $150-265
- **Annual:** $1,800-3,180

### Next Steps
1. ✅ Verify cleanup complete
2. ✅ Check billing after 24 hours
3. ✅ Deploy to TrueNAS instead
4. ✅ Consider disabling GCP billing

---

**Cleanup Complete!** 🎉

Your GCP costs should drop to zero within 24 hours. You can now focus on the TrueNAS deployment without ongoing cloud expenses.

