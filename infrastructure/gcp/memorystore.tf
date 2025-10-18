# Memorystore for Redis

resource "google_redis_instance" "redis" {
  name           = "rehearsekit-redis-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region
  
  redis_version     = "REDIS_7_0"
  display_name      = "RehearseKit Redis"
  # Remove reserved_ip_range - let GCP allocate automatically
  
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Outputs
output "redis_host" {
  value = google_redis_instance.redis.host
}

output "redis_port" {
  value = google_redis_instance.redis.port
}

output "redis_connection_string" {
  value     = "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}/0"
  sensitive = true
}

