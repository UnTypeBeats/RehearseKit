# Cloud Monitoring Dashboards and Alerts

# Uptime check for frontend
resource "google_monitoring_uptime_check_config" "frontend" {
  display_name = "RehearseKit Frontend Uptime"
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path           = "/"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "rehearsekit.uk"
    }
  }
}

# Uptime check for API
resource "google_monitoring_uptime_check_config" "backend" {
  display_name = "RehearseKit API Uptime"
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path           = "/api/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "api.rehearsekit.uk"
    }
  }
}

# Alert notification channel (email)
resource "google_monitoring_notification_channel" "email" {
  display_name = "RehearseKit Admin Email"
  type         = "email"
  
  labels = {
    email_address = var.alert_email
  }
  
  enabled = true
}

# Alert policy for frontend downtime
resource "google_monitoring_alert_policy" "frontend_uptime" {
  display_name = "Frontend Uptime Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Uptime check for RehearseKit Frontend"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.frontend.uptime_check_id}\""
      duration        = "300s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_NEXT_OLDER"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for API downtime
resource "google_monitoring_alert_policy" "backend_uptime" {
  display_name = "API Uptime Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Uptime check for RehearseKit API"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.backend.uptime_check_id}\""
      duration        = "300s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_NEXT_OLDER"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for high error rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Cloud Run error rate > 5%"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Variables
variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = "admin@rehearsekit.uk"
}

# Outputs
output "frontend_uptime_check_id" {
  value = google_monitoring_uptime_check_config.frontend.uptime_check_id
}

output "backend_uptime_check_id" {
  value = google_monitoring_uptime_check_config.backend.uptime_check_id
}

