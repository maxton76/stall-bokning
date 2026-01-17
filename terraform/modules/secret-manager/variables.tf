# Secret Manager Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "cloud_run_service_account_email" {
  description = "Email of the Cloud Run service account to grant secret access"
  type        = string
  default     = ""
}

variable "cloud_functions_service_account_email" {
  description = "Email of the Cloud Functions service account to grant secret access"
  type        = string
  default     = ""
}

variable "additional_secrets" {
  description = "Additional secrets to create beyond the defaults"
  type = map(object({
    description = string
    labels      = map(string)
  }))
  default = {}
}

variable "create_placeholder_versions" {
  description = "Create placeholder secret versions (useful for initial setup, values should be updated externally)"
  type        = bool
  default     = true
}
