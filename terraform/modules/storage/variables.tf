# Storage Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "GCS bucket location (region or multi-region)"
  type        = string
  default     = "EU"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "create_state_bucket" {
  description = "Whether to create the Terraform state bucket"
  type        = bool
  default     = true
}

variable "state_bucket_name" {
  description = "Name for the Terraform state bucket"
  type        = string
}

variable "create_artifacts_bucket" {
  description = "Whether to create the artifacts bucket"
  type        = bool
  default     = false
}

variable "artifacts_bucket_name" {
  description = "Name for the artifacts bucket"
  type        = string
  default     = ""
}

variable "ci_service_account_email" {
  description = "Service account email for CI/CD access to state bucket"
  type        = string
  default     = ""
}

variable "labels" {
  description = "Labels to apply to buckets"
  type        = map(string)
  default     = {}
}
