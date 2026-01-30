# Cloud Functions Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Functions deployment"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# =============================================================================
# Service Accounts
# =============================================================================

variable "service_account_email" {
  description = "Service account email for Cloud Functions"
  type        = string
}

variable "scheduler_service_account_email" {
  description = "Service account email for Cloud Scheduler (if different from function SA)"
  type        = string
  default     = ""
}

# =============================================================================
# Source Configuration
# =============================================================================

variable "create_source_bucket" {
  description = "Whether to create a GCS bucket for function source code"
  type        = bool
  default     = true
}

variable "pause_all_schedulers" {
  description = "Force-pause all scheduler jobs regardless of environment"
  type        = bool
  default     = false
}

variable "source_bucket_location" {
  description = "Location for the source bucket"
  type        = string
  default     = "europe-west1"
}

# =============================================================================
# Functions Configuration
# =============================================================================

variable "functions" {
  description = "Map of Cloud Functions to create"
  type = map(object({
    description      = string
    runtime          = string
    entry_point      = string
    memory           = string
    cpu              = string
    timeout_seconds  = number
    max_instances    = number
    min_instances    = number
    max_concurrency  = number
    ingress_settings = string

    # Source configuration
    source_archive_bucket = string
    source_archive_object = string

    # Environment variables
    environment_variables       = map(string)
    build_environment_variables = map(string)

    # Secret environment variables
    secret_environment_variables = map(object({
      secret  = string
      version = string
    }))

    # Event trigger (for Firestore, Pub/Sub triggered functions)
    event_trigger = object({
      event_type   = string
      region       = string
      retry_policy = string
      filters = list(object({
        attribute = string
        value     = string
        operator  = string
      }))
    })

    # Schedule configuration (for scheduled functions)
    schedule = object({
      cron               = string
      timezone           = string
      pause_in_non_prod  = bool
      retry_count        = number
      max_retry_duration = number
      payload            = map(any)
    })

    # Access control
    allow_unauthenticated = bool
  }))
  default = {}
}

# =============================================================================
# Common Configuration
# =============================================================================

variable "common_environment_variables" {
  description = "Environment variables applied to all functions"
  type        = map(string)
  default     = {}
}

variable "vpc_connector" {
  description = "VPC connector for private network access"
  type        = string
  default     = ""
}

# =============================================================================
# Labels and Lifecycle
# =============================================================================

variable "labels" {
  description = "Labels to apply to Cloud Functions"
  type        = map(string)
  default     = {}
}

# Note: Function source deployments are managed by CI/CD pipelines.
# Terraform creates the initial function configuration.
