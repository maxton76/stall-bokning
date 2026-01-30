# Firebase Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# =============================================================================
# Location Configuration
# =============================================================================

variable "firestore_location" {
  description = "Location for Firestore database"
  type        = string
  default     = "europe-west1"
}

variable "storage_location" {
  description = "Location for Firebase Storage bucket"
  type        = string
  default     = "europe-west1"
}

# =============================================================================
# Authentication Configuration
# =============================================================================

variable "enable_google_oauth" {
  description = "Whether to enable Google OAuth sign-in"
  type        = bool
  default     = true
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_mfa" {
  description = "Whether to enable multi-factor authentication"
  type        = bool
  default     = false
}

variable "additional_authorized_domains" {
  description = "Additional authorized domains for authentication"
  type        = list(string)
  default     = []
}

variable "auth_blocking_function_uri" {
  description = "URI of the blocking function for auth events (optional)"
  type        = string
  default     = ""
}

# =============================================================================
# Storage Configuration
# =============================================================================

variable "cors_origins" {
  description = "CORS origins for Firebase Storage"
  type        = list(string)
  default     = ["http://localhost:5555"]
}

variable "create_storage_bucket" {
  description = "Whether to create the Firebase Storage bucket via Terraform (set false if Firebase manages it)"
  type        = bool
  default     = false
}

# =============================================================================
# Hosting Configuration
# =============================================================================

variable "hosting_site_id" {
  description = "Firebase Hosting site ID (defaults to project ID)"
  type        = string
  default     = ""
}
