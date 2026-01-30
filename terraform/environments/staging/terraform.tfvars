# Terraform Variables - Staging Environment
#
# This file contains environment-specific values for the staging environment.
# IMPORTANT: Do not commit sensitive values to version control.
#            Use terraform.tfvars.local for sensitive values (gitignored).

# =============================================================================
# Core Configuration
# =============================================================================

project_id  = "equiduty-staging"
region      = "europe-west1"
environment = "staging"

# =============================================================================
# Cloud Run Configuration
# =============================================================================

# Initial placeholder image - will be updated by CI/CD
cloud_run_container_image = "gcr.io/cloudrun/placeholder"

# Staging: scale to zero, moderate max instances
cloud_run_min_instances = 0
cloud_run_max_instances = 5
cloud_run_memory        = "512Mi"
cloud_run_cpu           = "1"

# =============================================================================
# Cloud Functions Configuration
# =============================================================================

functions_max_instances = 10

# Source bucket/object will be set when deploying functions
# functions_source_bucket = "equiduty-staging-functions-source"
# functions_source_object = "functions-v1.0.0.zip"

# =============================================================================
# Monitoring Configuration
# =============================================================================

# Enable both monitoring and alerting in staging
enable_monitoring = true
enable_alerting   = true

# Alert emails
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
  "https://equiduty-staging.web.app",
  "https://equiduty-staging.firebaseapp.com",
  "https://equiduty-staging-app.web.app",
  "https://equiduty-staging-app.firebaseapp.com"
]

# =============================================================================
# Firebase Configuration
# =============================================================================

# Google OAuth credentials - SET IN terraform.tfvars.local (gitignored)
# google_oauth_client_id     = ""
# google_oauth_client_secret = ""
