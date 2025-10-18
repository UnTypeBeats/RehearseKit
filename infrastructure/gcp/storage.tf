# Cloud Storage Buckets

resource "google_storage_bucket" "uploads" {
  name          = "${var.project_id}-uploads"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
  
  versioning {
    enabled = false
  }
}

resource "google_storage_bucket" "stems" {
  name          = "${var.project_id}-stems"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
  
  versioning {
    enabled = false
  }
}

resource "google_storage_bucket" "packages" {
  name          = "${var.project_id}-packages"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
  
  versioning {
    enabled = false
  }
}

# IAM for Cloud Run services to access buckets
resource "google_storage_bucket_iam_member" "cloud_run_uploads" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "cloud_run_stems" {
  bucket = google_storage_bucket.stems.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "cloud_run_packages" {
  bucket = google_storage_bucket.packages.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Outputs
output "uploads_bucket" {
  value = google_storage_bucket.uploads.name
}

output "stems_bucket" {
  value = google_storage_bucket.stems.name
}

output "packages_bucket" {
  value = google_storage_bucket.packages.name
}

