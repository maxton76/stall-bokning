# Cloud Run Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# =============================================================================
# Service Configuration
# =============================================================================

variable "service_account_email" {
  description = "Service account email for the Cloud Run service"
  type        = string
}

variable "container_image" {
  description = "Container image to deploy (gcr.io/project/image:tag)"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 5003
}

# =============================================================================
# Resource Limits
# =============================================================================

variable "cpu_limit" {
  description = "CPU limit for the container"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for the container"
  type        = string
  default     = "512Mi"
}

variable "cpu_idle" {
  description = "Whether to keep CPU allocated when idle"
  type        = bool
  default     = true
}

variable "startup_cpu_boost" {
  description = "Whether to boost CPU during startup"
  type        = bool
  default     = true
}

# =============================================================================
# Scaling Configuration
# =============================================================================

variable "min_instances" {
  description = "Minimum number of instances (0 for scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 2
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

# =============================================================================
# Health Checks
# =============================================================================

variable "health_check_path" {
  description = "Path for health check probes"
  type        = string
  default     = "/health"
}

# =============================================================================
# Environment Variables
# =============================================================================

variable "environment_variables" {
  description = "Additional environment variables to set"
  type        = map(string)
  default     = {}
}

variable "cors_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["http://localhost:5555"]
}

# =============================================================================
# Secret References (Secret Manager IDs)
# =============================================================================

variable "jwt_secret_id" {
  description = "Secret Manager secret ID for JWT secret"
  type        = string
  default     = ""
}

variable "jwt_refresh_secret_id" {
  description = "Secret Manager secret ID for JWT refresh secret"
  type        = string
  default     = ""
}

variable "stripe_secret_key_id" {
  description = "Secret Manager secret ID for Stripe secret key"
  type        = string
  default     = ""
}

variable "stripe_webhook_secret_id" {
  description = "Secret Manager secret ID for Stripe webhook secret"
  type        = string
  default     = ""
}

variable "sendgrid_api_key_id" {
  description = "Secret Manager secret ID for SendGrid API key (deprecated - use smtp_password_id)"
  type        = string
  default     = ""
}

variable "smtp_password_id" {
  description = "Secret Manager secret ID for SMTP password"
  type        = string
  default     = ""
}

variable "frontend_url" {
  description = "Frontend application URL for email links"
  type        = string
}

variable "twilio_account_sid_id" {
  description = "Secret Manager secret ID for Twilio account SID"
  type        = string
  default     = ""
}

variable "twilio_auth_token_id" {
  description = "Secret Manager secret ID for Twilio auth token"
  type        = string
  default     = ""
}

variable "telegram_bot_token_id" {
  description = "Secret Manager secret ID for Telegram bot token"
  type        = string
  default     = ""
}

# =============================================================================
# Access Control
# =============================================================================

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
  default     = true
}

variable "vpc_connector" {
  description = "VPC connector for private network access"
  type        = string
  default     = ""
}

# =============================================================================
# Custom Domain
# =============================================================================

variable "custom_domain" {
  description = "Custom domain for the service (optional)"
  type        = string
  default     = ""
}

# =============================================================================
# Labels and Lifecycle
# =============================================================================

variable "labels" {
  description = "Labels to apply to the Cloud Run service"
  type        = map(string)
  default     = {}
}

# Note: Image deployments are managed by CI/CD pipelines.
# Terraform creates the initial service configuration.
