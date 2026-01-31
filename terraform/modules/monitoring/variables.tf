# Monitoring Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# =============================================================================
# Feature Flags
# =============================================================================

variable "enable_uptime_checks" {
  description = "Whether to create uptime checks"
  type        = bool
  default     = true
}

variable "enable_alerting" {
  description = "Whether to create alert policies and notification channels"
  type        = bool
  default     = false
}

variable "enable_log_metrics" {
  description = "Whether to create log-based metrics"
  type        = bool
  default     = true
}

# =============================================================================
# Cloud Run Configuration
# =============================================================================

variable "enable_cloud_run_monitoring" {
  description = "Whether to create Cloud Run monitoring resources (set to true when Cloud Run service exists)"
  type        = bool
  default     = true
}

variable "cloud_run_service_name" {
  description = "Name of the Cloud Run service to monitor"
  type        = string
  default     = ""
}

variable "cloud_run_service_url" {
  description = "URL of the Cloud Run service (for uptime checks)"
  type        = string
  default     = ""
}

# =============================================================================
# Uptime Check Configuration
# =============================================================================

variable "health_check_path" {
  description = "Path for health check endpoint"
  type        = string
  default     = "/health"
}

variable "health_check_content_match" {
  description = "Expected content in health check response"
  type        = string
  default     = "ok"
}

variable "uptime_check_regions" {
  description = "Regions to run uptime checks from"
  type        = list(string)
  default     = ["EUROPE", "USA", "ASIA_PACIFIC"]
}

# =============================================================================
# Alert Thresholds
# =============================================================================

variable "latency_threshold_ms" {
  description = "P95 latency threshold in milliseconds for alerting"
  type        = number
  default     = 500
}

variable "error_rate_threshold" {
  description = "Error rate threshold percentage for alerting"
  type        = number
  default     = 5
}

# =============================================================================
# Notification Configuration
# =============================================================================

variable "alert_email_addresses" {
  description = "Email addresses to send alerts to"
  type        = list(string)
  default     = []
}
