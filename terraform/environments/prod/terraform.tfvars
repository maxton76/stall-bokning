# Terraform Variables - Prod Environment
#
# This file contains environment-specific values for the production environment.
# IMPORTANT: Do not commit sensitive values to version control.
#            Use terraform.tfvars.local for sensitive values (gitignored).

# =============================================================================
# Core Configuration
# =============================================================================

project_id  = "equiduty-prod"
region      = "europe-west1"
environment = "prod"

# =============================================================================
# Cloud Run Configuration
# =============================================================================

# Initial placeholder image - will be updated by CI/CD
cloud_run_container_image = "gcr.io/cloudrun/placeholder"

# Prod: scale to zero allowed, higher max instances
cloud_run_min_instances = 0
cloud_run_max_instances = 10
cloud_run_memory        = "512Mi"
cloud_run_cpu           = "1"

# =============================================================================
# Cloud Functions Configuration
# =============================================================================

functions_max_instances = 10

# Source bucket/object will be set when deploying functions
# functions_source_bucket = "equiduty-prod-functions-source"
# functions_source_object = "functions-v1.0.0.zip"

# =============================================================================
# Monitoring Configuration
# =============================================================================

# Enable full monitoring and alerting in production
enable_monitoring = true
enable_alerting   = true

# Alert emails - SET APPROPRIATE PRODUCTION ALERT RECIPIENTS
alert_email_addresses = []

# =============================================================================
# IAM Configuration
# =============================================================================

# Enable Workload Identity for CI/CD
create_workload_identity = false
github_repository        = ""

# =============================================================================
# CORS Configuration
# =============================================================================

cors_origins = [
  "https://equiduty-prod.web.app",
  "https://equiduty-prod.firebaseapp.com",
  "https://equiduty-prod-app.web.app",
  "https://equiduty-prod-app.firebaseapp.com"
  # Add custom domain when configured:
  # "https://app.equicare.se"
]

# =============================================================================
# Firebase Configuration
# =============================================================================

# Google OAuth credentials - SET IN terraform.tfvars.local (gitignored)
# google_oauth_client_id     = ""
# google_oauth_client_secret = ""
