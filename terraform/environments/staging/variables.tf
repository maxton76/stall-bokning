# Variables - Staging Environment

# =============================================================================
# Core Configuration
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

# =============================================================================
# Cloud Run Configuration
# =============================================================================

variable "cloud_run_container_image" {
  description = "Container image for Cloud Run API service"
  type        = string
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 5
}

variable "cloud_run_memory" {
  description = "Memory limit for Cloud Run"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_cpu" {
  description = "CPU limit for Cloud Run"
  type        = string
  default     = "1"
}

# =============================================================================
# Cloud Functions Configuration
# =============================================================================

variable "functions_max_instances" {
  description = "Maximum instances for Cloud Functions"
  type        = number
  default     = 10
}

variable "functions_source_bucket" {
  description = "GCS bucket containing function source code"
  type        = string
  default     = ""
}

variable "functions_source_object" {
  description = "GCS object path for function source archive"
  type        = string
  default     = ""
}

# =============================================================================
# Monitoring Configuration
# =============================================================================

variable "enable_monitoring" {
  description = "Enable monitoring (uptime checks, log metrics)"
  type        = bool
  default     = true
}

variable "enable_alerting" {
  description = "Enable alerting (notifications)"
  type        = bool
  default     = true
}

variable "alert_email_addresses" {
  description = "Email addresses for alerts"
  type        = list(string)
  default     = []
}

# =============================================================================
# Firebase Configuration
# =============================================================================

variable "google_oauth_client_id" {
  description = "Google OAuth client ID for Firebase Auth"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret for Firebase Auth"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# IAM Configuration
# =============================================================================

variable "create_workload_identity" {
  description = "Create Workload Identity resources for GitHub Actions"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository for Workload Identity (owner/repo)"
  type        = string
  default     = ""
}

# =============================================================================
# CORS Configuration
# =============================================================================

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = []
}
