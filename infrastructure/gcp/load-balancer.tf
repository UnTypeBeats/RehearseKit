# Load Balancer with SSL certificate for custom domain

# Reserve global IP address
resource "google_compute_global_address" "default" {
  name = "rehearsekit-lb-ip-${var.environment}"
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "default" {
  name = "rehearsekit-ssl-cert-${var.environment}"
  
  managed {
    domains = [
      "rehearsekit.uk",
      "www.rehearsekit.uk",
      "api.rehearsekit.uk",
      "ws.rehearsekit.uk"
    ]
  }
}

# Backend NEG (Network Endpoint Group) for frontend Cloud Run service
resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "rehearsekit-frontend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = "rehearsekit-frontend"
  }
}

# Backend NEG for API Cloud Run service
resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "rehearsekit-backend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = "rehearsekit-backend"
  }
}

# Backend NEG for WebSocket Cloud Run service
resource "google_compute_region_network_endpoint_group" "websocket_neg" {
  name                  = "rehearsekit-websocket-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = "rehearsekit-websocket"
  }
}

# Backend services
resource "google_compute_backend_service" "frontend" {
  name                  = "rehearsekit-frontend-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = true
  
  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg.id
  }
  
  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    client_ttl        = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

resource "google_compute_backend_service" "backend" {
  name        = "rehearsekit-backend-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 300
  
  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }
}

resource "google_compute_backend_service" "websocket" {
  name        = "rehearsekit-websocket-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 3600
  
  backend {
    group = google_compute_region_network_endpoint_group.websocket_neg.id
  }
}

# URL map for path-based routing
resource "google_compute_url_map" "default" {
  name            = "rehearsekit-lb-${var.environment}"
  default_service = google_compute_backend_service.frontend.id
  
  host_rule {
    hosts        = ["api.rehearsekit.uk"]
    path_matcher = "api"
  }
  
  host_rule {
    hosts        = ["ws.rehearsekit.uk"]
    path_matcher = "websocket"
  }
  
  host_rule {
    hosts        = ["rehearsekit.uk", "www.rehearsekit.uk"]
    path_matcher = "frontend"
  }
  
  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.backend.id
  }
  
  path_matcher {
    name            = "websocket"
    default_service = google_compute_backend_service.websocket.id
  }
  
  path_matcher {
    name            = "frontend"
    default_service = google_compute_backend_service.frontend.id
  }
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "rehearsekit-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "https_redirect" {
  name = "rehearsekit-https-redirect-${var.environment}"
  
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "https_redirect" {
  name    = "rehearsekit-http-proxy-${var.environment}"
  url_map = google_compute_url_map.https_redirect.id
}

# Forwarding rules
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "rehearsekit-https-rule-${var.environment}"
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  target                = google_compute_target_https_proxy.default.id
  ip_address            = google_compute_global_address.default.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "rehearsekit-http-rule-${var.environment}"
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "80"
  target                = google_compute_target_http_proxy.https_redirect.id
  ip_address            = google_compute_global_address.default.id
}

# Outputs
output "load_balancer_ip" {
  description = "External IP address of the load balancer"
  value       = google_compute_global_address.default.address
}

output "ssl_certificate_status" {
  description = "Status of the SSL certificate"
  value       = google_compute_managed_ssl_certificate.default.managed[0].status
}

