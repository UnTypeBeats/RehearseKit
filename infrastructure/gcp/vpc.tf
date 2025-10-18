# VPC Network for private service access

resource "google_compute_network" "vpc" {
  name                    = "rehearsekit-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "rehearsekit-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  private_ip_google_access = true
}

# Reserve IP range for private service connection
resource "google_compute_global_address" "private_ip_range" {
  name          = "rehearsekit-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

# Private service connection for Cloud SQL and Memorystore
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Serverless VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "rehearsekit-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  
  depends_on = [google_project_service.required_apis]
}

# Outputs
output "vpc_name" {
  value = google_compute_network.vpc.name
}

output "vpc_connector_name" {
  value = google_vpc_access_connector.connector.name
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.connector.id
}

