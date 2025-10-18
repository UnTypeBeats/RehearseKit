# Service Account for Cloud Run services
resource "google_service_account" "cloud_run" {
  account_id   = "rehearsekit-cloud-run"
  display_name = "RehearseKit Cloud Run Service Account"
}

# IAM Roles for service account
resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Note: Actual Cloud Run services will be deployed via GitHub Actions
# These are placeholder configurations showing the structure

# Frontend Cloud Run Service (deployed via CI/CD)
# resource "google_cloud_run_service" "frontend" {
#   name     = "rehearsekit-frontend"
#   location = var.region
#   
#   template {
#     spec {
#       service_account_name = google_service_account.cloud_run.email
#       containers {
#         image = "gcr.io/${var.project_id}/rehearsekit-frontend:latest"
#         
#         resources {
#           limits = {
#             memory = "512Mi"
#             cpu    = "1"
#           }
#         }
#       }
#     }
#   }
#   
#   traffic {
#     percent         = 100
#     latest_revision = true
#   }
# }

# Backend Cloud Run Service (deployed via CI/CD)
# resource "google_cloud_run_service" "backend" {
#   name     = "rehearsekit-backend"
#   location = var.region
#   
#   template {
#     spec {
#       service_account_name = google_service_account.cloud_run.email
#       containers {
#         image = "gcr.io/${var.project_id}/rehearsekit-backend:latest"
#         
#         env {
#           name  = "DATABASE_URL"
#           value = "postgresql://rehearsekit:${var.db_password}@/${google_sql_database.database.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
#         }
#         
#         env {
#           name  = "REDIS_URL"
#           value = "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}/0"
#         }
#         
#         resources {
#           limits = {
#             memory = "2Gi"
#             cpu    = "2"
#           }
#         }
#       }
#     }
#     
#     metadata {
#       annotations = {
#         "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
#         "run.googleapis.com/cloudsql-instances"   = google_sql_database_instance.postgres.connection_name
#       }
#     }
#   }
#   
#   traffic {
#     percent         = 100
#     latest_revision = true
#   }
# }

# IAM policy to allow unauthenticated access (for public API)
# resource "google_cloud_run_service_iam_member" "frontend_public" {
#   service  = google_cloud_run_service.frontend.name
#   location = google_cloud_run_service.frontend.location
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# Outputs
output "service_account_email" {
  value = google_service_account.cloud_run.email
}

