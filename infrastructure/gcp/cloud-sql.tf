# Cloud SQL PostgreSQL Instance

resource "google_sql_database_instance" "postgres" {
  name             = "rehearsekit-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region
  
  settings {
    tier              = "db-f1-micro"  # Upgrade for production
    availability_type = "ZONAL"        # Change to REGIONAL for HA
    disk_size         = 10
    disk_type         = "PD_SSD"
    
    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
    
    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }
  }
  
  deletion_protection = true
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "database" {
  name     = "rehearsekit"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "user" {
  name     = "rehearsekit"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password  # Set via terraform.tfvars or environment
}

# Outputs
output "database_instance_name" {
  value = google_sql_database_instance.postgres.name
}

output "database_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database_private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}

