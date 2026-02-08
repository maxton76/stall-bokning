# Main Configuration - Dev Environment
#
# This file instantiates all Terraform modules for the dev environment.

# =============================================================================
# Storage Module - Terraform State Bucket
# =============================================================================

module "storage" {
  source = "../../modules/storage"

  project_id        = var.project_id
  location          = "EU"
  environment       = var.environment
  state_bucket_name = "equiduty-terraform-state"

  # State bucket is created separately via init-backend.sh
  create_state_bucket     = false
  create_artifacts_bucket = false

  labels = local.common_labels
}

# =============================================================================
# IAM Module - Service Accounts
# =============================================================================

module "iam" {
  source = "../../modules/iam"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  # Service account roles (using defaults)
  # cloud_run_api_roles     = [...]
  # cloud_functions_roles   = [...]

  # Terraform CI/CD service account
  create_terraform_ci_sa = true

  # Workload Identity for GitHub Actions
  create_workload_identity = var.create_workload_identity
  github_repository        = var.github_repository
}

# =============================================================================
# Secret Manager Module - Application Secrets
# =============================================================================

module "secrets" {
  source = "../../modules/secret-manager"

  project_id  = var.project_id
  environment = var.environment

  # Grant access to service accounts
  cloud_run_service_account_email       = module.iam.cloud_run_api_service_account_email
  cloud_functions_service_account_email = module.iam.cloud_functions_service_account_email

  # Create placeholder versions for initial setup
  create_placeholder_versions = true

  depends_on = [module.iam]
}

# =============================================================================
# Firebase Module - Firebase Services
# =============================================================================

module "firebase" {
  source = "../../modules/firebase"

  project_id  = var.project_id
  environment = var.environment

  # Locations
  firestore_location = local.firestore_location
  storage_location   = var.region

  # Authentication
  enable_google_oauth        = true
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret

  # CORS
  cors_origins = var.cors_origins

  # App hosting site uses a separate subdomain
  additional_authorized_domains = [
    "${var.project_id}-app.web.app",
    "${var.project_id}-app.firebaseapp.com",
  ]

  depends_on = [module.iam]
}

# =============================================================================
# Cloud Run Module - API Service
# =============================================================================

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  # Service configuration
  service_account_email = module.iam.cloud_run_api_service_account_email
  container_image       = var.cloud_run_container_image
  container_port        = 5003

  # Resource limits
  cpu_limit    = var.cloud_run_cpu
  memory_limit = var.cloud_run_memory

  # Scaling
  min_instances = var.cloud_run_min_instances
  max_instances = var.cloud_run_max_instances

  # Secret references
  jwt_secret_id            = module.secrets.jwt_secret_id
  jwt_refresh_secret_id    = module.secrets.jwt_refresh_secret_id
  stripe_secret_key_id     = module.secrets.stripe_secret_key_id
  stripe_webhook_secret_id = module.secrets.stripe_webhook_secret_id
  sendgrid_api_key_id      = module.secrets.sendgrid_api_key_id # deprecated
  smtp_password_id         = module.secrets.smtp_password_id
  twilio_account_sid_id    = module.secrets.twilio_account_sid_id
  twilio_auth_token_id     = module.secrets.twilio_auth_token_id
  telegram_bot_token_id    = module.secrets.telegram_bot_token_id
  zendesk_api_token_id      = module.secrets.zendesk_api_token_id
  zendesk_webhook_secret_id = module.secrets.zendesk_webhook_secret_id

  # Application configuration
  frontend_url = "https://equiduty-dev-app.web.app"

  # Environment variables
  cors_origins = var.cors_origins
  environment_variables = {
    FIREBASE_PROJECT_ID   = var.project_id
    ZENDESK_EMAIL         = "support@equiduty.zendesk.com"
    ZENDESK_SUBDOMAIN     = "equiduty"
    DERIVED_IMAGES_BUCKET = "${var.project_id}-derived"
  }

  # Access control
  allow_unauthenticated = true

  labels = local.common_labels

  depends_on = [module.iam, module.secrets, module.firebase]
}

# =============================================================================
# Cloud Functions Module - Background Functions
# =============================================================================

module "cloud_functions" {
  source = "../../modules/cloud-functions"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  # Service account
  service_account_email = module.iam.cloud_functions_service_account_email

  # Function definitions
  functions = local.functions

  # Source configuration
  create_source_bucket = true

  labels = local.common_labels

  depends_on = [module.iam, module.secrets]
}

# =============================================================================
# Monitoring Module - Observability
# =============================================================================

module "monitoring" {
  source = "../../modules/monitoring"

  project_id  = var.project_id
  environment = var.environment

  # Feature flags
  enable_uptime_checks = var.enable_monitoring
  enable_alerting      = var.enable_alerting
  enable_log_metrics   = var.enable_monitoring

  # Cloud Run service details
  cloud_run_service_name = module.cloud_run.service_name
  cloud_run_service_url  = module.cloud_run.service_url

  # Alert configuration
  alert_email_addresses = var.alert_email_addresses

  depends_on = [module.cloud_run]
}
