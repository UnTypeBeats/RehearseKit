#!/bin/bash
# RehearseKit GCP Cleanup Script
# This script removes ALL GCP resources to stop billing charges
# Safe to run - prompts before destructive actions

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Confirmation prompt
confirm() {
    local message="$1"
    local default="${2:-n}"
    
    # Auto-confirm if AUTO_CONFIRM is set
    if [ "${AUTO_CONFIRM:-}" = "yes" ] || [ "${AUTO_CONFIRM:-}" = "true" ]; then
        log_info "$message → AUTO-CONFIRMED"
        return 0
    fi
    
    if [ "$default" = "y" ]; then
        read -p "$message [Y/n]: " response
        response=${response:-Y}
    else
        read -p "$message [y/N]: " response
        response=${response:-N}
    fi
    
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    log_success "gcloud CLI found"
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi
    log_success "Authenticated with gcloud"
    
    # Get or confirm project ID
    if [ -z "$PROJECT_ID" ]; then
        CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -z "$CURRENT_PROJECT" ]; then
            log_error "No GCP project set. Set with: gcloud config set project PROJECT_ID"
            exit 1
        fi
        PROJECT_ID="$CURRENT_PROJECT"
    fi
    
    log_info "Project ID: $PROJECT_ID"
    log_info "Region: $REGION"
    
    if ! confirm "Proceed with cleanup of project '$PROJECT_ID'?" "n"; then
        log_warning "Cleanup cancelled by user"
        exit 0
    fi
}

# Discover all resources
discover_resources() {
    log_section "Discovering Resources"
    
    log_info "Scanning Cloud Run services..."
    CLOUD_RUN_SERVICES=$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format="value(metadata.name)" 2>/dev/null || echo "")
    if [ -n "$CLOUD_RUN_SERVICES" ]; then
        echo "Cloud Run Services found:"
        echo "$CLOUD_RUN_SERVICES" | while read -r service; do
            echo "  - $service"
        done
    else
        log_info "No Cloud Run services found"
    fi
    
    log_info "Scanning Cloud SQL instances..."
    SQL_INSTANCES=$(gcloud sql instances list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")
    if [ -n "$SQL_INSTANCES" ]; then
        echo "Cloud SQL instances found:"
        echo "$SQL_INSTANCES" | while read -r instance; do
            echo "  - $instance"
        done
    else
        log_info "No Cloud SQL instances found"
    fi
    
    log_info "Scanning Memorystore Redis instances..."
    REDIS_INSTANCES=$(gcloud redis instances list --project="$PROJECT_ID" --region="$REGION" --format="value(name)" 2>/dev/null || echo "")
    if [ -n "$REDIS_INSTANCES" ]; then
        echo "Memorystore Redis instances found:"
        echo "$REDIS_INSTANCES" | while read -r instance; do
            echo "  - $instance"
        done
    else
        log_info "No Redis instances found"
    fi
    
    log_info "Scanning Cloud Storage buckets..."
    STORAGE_BUCKETS=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | grep -E "rehearsekit|gs://${PROJECT_ID}" || echo "")
    if [ -n "$STORAGE_BUCKETS" ]; then
        echo "Cloud Storage buckets found:"
        echo "$STORAGE_BUCKETS" | while read -r bucket; do
            echo "  - $bucket"
        done
    else
        log_info "No Cloud Storage buckets found"
    fi
    
    log_info "Scanning VPC resources..."
    VPC_CONNECTORS=$(gcloud compute networks vpc-access connectors list --project="$PROJECT_ID" --region="$REGION" --format="value(name)" 2>/dev/null || echo "")
    VPCS=$(gcloud compute networks list --project="$PROJECT_ID" --format="value(name)" --filter="name~rehearsekit" 2>/dev/null || echo "")
    
    log_info "Scanning Load Balancer resources..."
    LB_FORWARDING_RULES=$(gcloud compute forwarding-rules list --project="$PROJECT_ID" --global --format="value(name)" --filter="name~rehearsekit" 2>/dev/null || echo "")
    
    echo ""
    log_warning "TOTAL ESTIMATED MONTHLY COST OF RESOURCES TO BE DELETED: \$200-400"
    echo ""
}

# Delete Cloud Run services
delete_cloud_run() {
    log_section "Deleting Cloud Run Services"
    
    if [ -z "$CLOUD_RUN_SERVICES" ]; then
        log_info "No Cloud Run services to delete"
        return 0
    fi
    
    echo "$CLOUD_RUN_SERVICES" | while read -r service; do
        if [ -n "$service" ]; then
            log_info "Deleting Cloud Run service: $service"
            if gcloud run services delete "$service" \
                --project="$PROJECT_ID" \
                --region="$REGION" \
                --quiet 2>/dev/null; then
                log_success "Deleted: $service"
            else
                log_warning "Failed to delete or already deleted: $service"
            fi
        fi
    done
    
    log_success "Cloud Run services cleanup complete"
}

# Delete Memorystore Redis
delete_redis() {
    log_section "Deleting Memorystore Redis Instances"
    
    if [ -z "$REDIS_INSTANCES" ]; then
        log_info "No Redis instances to delete"
        return 0
    fi
    
    echo "$REDIS_INSTANCES" | while read -r instance; do
        if [ -n "$instance" ]; then
            log_info "Deleting Redis instance: $instance (this may take 3-5 minutes)"
            if gcloud redis instances delete "$instance" \
                --project="$PROJECT_ID" \
                --region="$REGION" \
                --quiet 2>/dev/null; then
                log_success "Deleted: $instance"
            else
                log_warning "Failed to delete or already deleted: $instance"
            fi
        fi
    done
    
    log_success "Redis cleanup complete"
}

# Delete Cloud SQL instances
delete_cloud_sql() {
    log_section "Deleting Cloud SQL Instances"
    
    if [ -z "$SQL_INSTANCES" ]; then
        log_info "No Cloud SQL instances to delete"
        return 0
    fi
    
    echo "$SQL_INSTANCES" | while read -r instance; do
        if [ -n "$instance" ]; then
            # Check if deletion protection is enabled
            DELETION_PROTECTION=$(gcloud sql instances describe "$instance" \
                --project="$PROJECT_ID" \
                --format="value(settings.deletionProtectionEnabled)" 2>/dev/null || echo "false")
            
            if [ "$DELETION_PROTECTION" = "True" ]; then
                log_warning "Instance $instance has deletion protection enabled. Disabling..."
                gcloud sql instances patch "$instance" \
                    --project="$PROJECT_ID" \
                    --no-deletion-protection \
                    --quiet 2>/dev/null || true
            fi
            
            log_info "Deleting Cloud SQL instance: $instance (this may take 5-10 minutes)"
            if gcloud sql instances delete "$instance" \
                --project="$PROJECT_ID" \
                --quiet 2>/dev/null; then
                log_success "Deleted: $instance"
            else
                log_warning "Failed to delete or already deleted: $instance"
            fi
        fi
    done
    
    log_success "Cloud SQL cleanup complete"
}

# Delete Cloud Storage buckets
delete_storage() {
    log_section "Deleting Cloud Storage Buckets"
    
    if [ -z "$STORAGE_BUCKETS" ]; then
        log_info "No Cloud Storage buckets to delete"
        return 0
    fi
    
    echo "$STORAGE_BUCKETS" | while read -r bucket; do
        if [ -n "$bucket" ]; then
            log_info "Deleting bucket and all contents: $bucket"
            if gsutil -m rm -r "$bucket" 2>/dev/null; then
                log_success "Deleted: $bucket"
            else
                log_warning "Failed to delete or already deleted: $bucket"
            fi
        fi
    done
    
    log_success "Cloud Storage cleanup complete"
}

# Delete Load Balancer components
delete_load_balancer() {
    log_section "Deleting Load Balancer Components"
    
    log_info "Deleting global forwarding rules..."
    gcloud compute forwarding-rules list --project="$PROJECT_ID" --global --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r rule; do
        if [ -n "$rule" ]; then
            log_info "Deleting forwarding rule: $rule"
            gcloud compute forwarding-rules delete "$rule" --project="$PROJECT_ID" --global --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting target HTTP/HTTPS proxies..."
    gcloud compute target-https-proxies list --project="$PROJECT_ID" --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r proxy; do
        if [ -n "$proxy" ]; then
            log_info "Deleting HTTPS proxy: $proxy"
            gcloud compute target-https-proxies delete "$proxy" --project="$PROJECT_ID" --quiet 2>/dev/null || true
        fi
    done
    
    gcloud compute target-http-proxies list --project="$PROJECT_ID" --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r proxy; do
        if [ -n "$proxy" ]; then
            log_info "Deleting HTTP proxy: $proxy"
            gcloud compute target-http-proxies delete "$proxy" --project="$PROJECT_ID" --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting URL maps..."
    gcloud compute url-maps list --project="$PROJECT_ID" --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r urlmap; do
        if [ -n "$urlmap" ]; then
            log_info "Deleting URL map: $urlmap"
            gcloud compute url-maps delete "$urlmap" --project="$PROJECT_ID" --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting backend services..."
    gcloud compute backend-services list --project="$PROJECT_ID" --global --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r backend; do
        if [ -n "$backend" ]; then
            log_info "Deleting backend service: $backend"
            gcloud compute backend-services delete "$backend" --project="$PROJECT_ID" --global --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting network endpoint groups..."
    gcloud compute network-endpoint-groups list --project="$PROJECT_ID" --format="value(name,zone)" --filter="name~rehearsekit" 2>/dev/null | while read -r neg_info; do
        if [ -n "$neg_info" ]; then
            neg_name=$(echo "$neg_info" | awk '{print $1}')
            neg_region=$(echo "$neg_info" | awk '{print $2}')
            log_info "Deleting NEG: $neg_name in $neg_region"
            gcloud compute network-endpoint-groups delete "$neg_name" --project="$PROJECT_ID" --region="$neg_region" --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting SSL certificates..."
    gcloud compute ssl-certificates list --project="$PROJECT_ID" --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r cert; do
        if [ -n "$cert" ]; then
            log_info "Deleting SSL certificate: $cert"
            gcloud compute ssl-certificates delete "$cert" --project="$PROJECT_ID" --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting global IP addresses..."
    gcloud compute addresses list --project="$PROJECT_ID" --global --format="value(name)" --filter="name~rehearsekit" 2>/dev/null | while read -r address; do
        if [ -n "$address" ]; then
            log_info "Deleting global address: $address"
            gcloud compute addresses delete "$address" --project="$PROJECT_ID" --global --quiet 2>/dev/null || true
        fi
    done
    
    log_success "Load Balancer cleanup complete"
}

# Delete VPC resources
delete_vpc() {
    log_section "Deleting VPC Resources"
    
    log_info "Deleting VPC Access connectors..."
    if [ -n "$VPC_CONNECTORS" ]; then
        echo "$VPC_CONNECTORS" | while read -r connector; do
            if [ -n "$connector" ]; then
                log_info "Deleting VPC connector: $connector (this may take 2-3 minutes)"
                gcloud compute networks vpc-access connectors delete "$connector" \
                    --project="$PROJECT_ID" \
                    --region="$REGION" \
                    --quiet 2>/dev/null || true
            fi
        done
    fi
    
    log_info "Waiting 30 seconds for connectors to fully delete..."
    sleep 30
    
    log_info "Deleting service networking connections..."
    if [ -n "$VPCS" ]; then
        echo "$VPCS" | while read -r vpc; do
            if [ -n "$vpc" ]; then
                log_info "Deleting service connection for VPC: $vpc"
                gcloud services vpc-peerings delete \
                    --service=servicenetworking.googleapis.com \
                    --network="$vpc" \
                    --project="$PROJECT_ID" \
                    --quiet 2>/dev/null || true
            fi
        done
    fi
    
    log_info "Deleting global addresses for peering..."
    gcloud compute addresses list --project="$PROJECT_ID" --global --format="value(name)" --filter="purpose=VPC_PEERING AND name~rehearsekit" 2>/dev/null | while read -r address; do
        if [ -n "$address" ]; then
            log_info "Deleting peering address: $address"
            gcloud compute addresses delete "$address" --project="$PROJECT_ID" --global --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting subnets..."
    gcloud compute networks subnets list --project="$PROJECT_ID" --format="value(name,region)" --filter="name~rehearsekit" 2>/dev/null | while read -r subnet_info; do
        if [ -n "$subnet_info" ]; then
            subnet_name=$(echo "$subnet_info" | awk '{print $1}')
            subnet_region=$(echo "$subnet_info" | awk '{print $2}')
            log_info "Deleting subnet: $subnet_name in $subnet_region"
            gcloud compute networks subnets delete "$subnet_name" \
                --project="$PROJECT_ID" \
                --region="$subnet_region" \
                --quiet 2>/dev/null || true
        fi
    done
    
    log_info "Deleting VPC networks..."
    if [ -n "$VPCS" ]; then
        echo "$VPCS" | while read -r vpc; do
            if [ -n "$vpc" ]; then
                log_info "Deleting VPC: $vpc"
                gcloud compute networks delete "$vpc" \
                    --project="$PROJECT_ID" \
                    --quiet 2>/dev/null || true
            fi
        done
    fi
    
    log_success "VPC cleanup complete"
}

# Delete service accounts and IAM
delete_iam() {
    log_section "Deleting Service Accounts"
    
    log_info "Scanning service accounts..."
    SERVICE_ACCOUNTS=$(gcloud iam service-accounts list --project="$PROJECT_ID" --format="value(email)" --filter="email~rehearsekit" 2>/dev/null || echo "")
    
    if [ -n "$SERVICE_ACCOUNTS" ]; then
        echo "$SERVICE_ACCOUNTS" | while read -r sa; do
            if [ -n "$sa" ]; then
                log_info "Deleting service account: $sa"
                gcloud iam service-accounts delete "$sa" \
                    --project="$PROJECT_ID" \
                    --quiet 2>/dev/null || true
            fi
        done
        log_success "Service accounts deleted"
    else
        log_info "No service accounts to delete"
    fi
}

# Delete Terraform state bucket
delete_terraform_state() {
    log_section "Deleting Terraform State Bucket"
    
    TERRAFORM_BUCKET="gs://rehearsekit-terraform-state"
    
    log_warning "This will delete the Terraform state bucket"
    log_warning "You will NOT be able to use Terraform to manage these resources again"
    
    if confirm "Delete Terraform state bucket?" "n"; then
        log_info "Deleting Terraform state bucket: $TERRAFORM_BUCKET"
        if gsutil -m rm -r "$TERRAFORM_BUCKET" 2>/dev/null; then
            log_success "Deleted: $TERRAFORM_BUCKET"
        else
            log_warning "Bucket not found or already deleted"
        fi
    else
        log_info "Skipping Terraform state bucket deletion"
    fi
}

# Final verification
verify_cleanup() {
    log_section "Verifying Cleanup"
    
    log_info "Checking for remaining resources..."
    
    REMAINING_RUN=$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" 2>/dev/null | grep -c rehearsekit || echo "0")
    REMAINING_SQL=$(gcloud sql instances list --project="$PROJECT_ID" 2>/dev/null | grep -c rehearsekit || echo "0")
    REMAINING_REDIS=$(gcloud redis instances list --project="$PROJECT_ID" --region="$REGION" 2>/dev/null | grep -c rehearsekit || echo "0")
    REMAINING_BUCKETS=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | grep -c rehearsekit || echo "0")
    REMAINING_VPC=$(gcloud compute networks list --project="$PROJECT_ID" 2>/dev/null | grep -c rehearsekit || echo "0")
    
    echo ""
    echo "Remaining resources:"
    echo "  Cloud Run: $REMAINING_RUN"
    echo "  Cloud SQL: $REMAINING_SQL"
    echo "  Redis: $REMAINING_REDIS"
    echo "  Storage Buckets: $REMAINING_BUCKETS"
    echo "  VPCs: $REMAINING_VPC"
    echo ""
    
    TOTAL_REMAINING=$((REMAINING_RUN + REMAINING_SQL + REMAINING_REDIS + REMAINING_BUCKETS + REMAINING_VPC))
    
    if [ "$TOTAL_REMAINING" -eq 0 ]; then
        log_success "All RehearseKit resources have been deleted!"
        log_success "Monthly GCP costs should drop to near zero"
    else
        log_warning "Some resources may still remain. Check GCP Console for details."
        log_info "You may need to wait a few minutes for deletions to complete, then re-run verification."
    fi
}

# Estimate cost savings
show_cost_summary() {
    log_section "Cost Summary"
    
    echo "Estimated monthly costs BEFORE cleanup:"
    echo "  Cloud Run (4 services):       \$50-100"
    echo "  Cloud SQL (db-f1-micro):      \$15-25"
    echo "  Memorystore Redis (1GB):      \$30-40"
    echo "  Cloud Storage (3 buckets):    \$5-10"
    echo "  Load Balancer:                \$18-25"
    echo "  VPC Connector:                \$10-15"
    echo "  Network Egress:               \$20-50"
    echo "  ────────────────────────────────────"
    echo "  TOTAL:                        \$148-265/month"
    echo ""
    echo "Estimated monthly costs AFTER cleanup:"
    echo "  GCP Project (no resources):   \$0.00"
    echo ""
    log_success "Estimated savings: \$150-265/month (\$1,800-3,180/year)"
}

# Main execution
main() {
    clear
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║           RehearseKit GCP Resource Cleanup Script             ║"
    echo "║                                                                ║"
    echo "║  This script will DELETE ALL GCP resources for RehearseKit    ║"
    echo "║  to stop incurring cloud costs.                               ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_warning "This is a DESTRUCTIVE operation!"
    log_warning "All data in Cloud Storage, Cloud SQL, and Redis will be PERMANENTLY DELETED"
    echo ""
    
    if ! confirm "Do you want to proceed with the cleanup?" "n"; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    # Execute cleanup steps
    check_prerequisites
    discover_resources
    
    echo ""
    log_warning "Ready to delete resources. This cannot be undone!"
    if ! confirm "Proceed with deletion?" "n"; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    # Delete in safe order (least dependent first)
    delete_cloud_run
    delete_load_balancer
    delete_redis
    delete_cloud_sql
    delete_storage
    delete_vpc
    delete_iam
    delete_terraform_state
    
    # Verify and summarize
    verify_cleanup
    show_cost_summary
    
    log_section "Cleanup Complete!"
    log_success "All RehearseKit GCP resources have been removed"
    log_info "Your GCP project '$PROJECT_ID' is still active but has minimal resources"
    log_info "You can safely deploy to TrueNAS now without incurring GCP costs"
    
    echo ""
    log_info "Next steps:"
    echo "  1. Wait 5-10 minutes for all deletions to finalize"
    echo "  2. Check GCP Console to verify: https://console.cloud.google.com"
    echo "  3. Review billing to confirm charges have stopped"
    echo "  4. Optionally disable billing on the project to prevent future charges"
    echo ""
    log_info "To disable billing (optional):"
    echo "  gcloud billing projects unlink $PROJECT_ID"
    echo ""
}

# Run main function
main "$@"

