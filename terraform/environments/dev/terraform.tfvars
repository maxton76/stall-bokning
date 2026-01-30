# Terraform Variables - Dev Environment
#
# This file contains environment-specific values for the dev environment.
# IMPORTANT: Do not commit sensitive values to version control.
#            Use terraform.tfvars.local for sensitive values (gitignored).

# =============================================================================
# Core Configuration
# =============================================================================

project_id  = "equiduty-dev"
region      = "europe-west1"
environment = "dev"

# =============================================================================
# Cloud Run Configuration
# =============================================================================

# Container image - updated by deploy:api task
cloud_run_container_image = "gcr.io/equiduty-dev/api-service:latest"

# Dev environment: scale to zero, limited max instances
cloud_run_min_instances = 0
cloud_run_max_instances = 2
cloud_run_memory        = "512Mi"
cloud_run_cpu           = "1"

# =============================================================================
# Cloud Functions Configuration
# =============================================================================

functions_max_instances = 10

# Source bucket/object will be set when deploying functions
# functions_source_bucket = "equiduty-dev-functions-source"
# functions_source_object = "functions-v1.0.0.zip"

# =============================================================================
# Monitoring Configuration
# =============================================================================

# Enable monitoring but not alerting in dev
enable_monitoring = true
enable_alerting   = false

# Alert emails (empty in dev, set in prod)
alert_email_addresses = []

# =============================================================================
# IAM Configuration
# =============================================================================

# Disable Workload Identity in dev (enable when ready for CI/CD)
create_workload_identity = false
github_repository        = ""

# =============================================================================
# CORS Configuration
# =============================================================================

cors_origins = [
  "http://localhost:5555",
  "http://localhost:5173",
  "https://equiduty-dev.web.app",
  "https://equiduty-dev.firebaseapp.com",
  "https://equiduty-dev-app.web.app",
  "https://equiduty-dev-app.firebaseapp.com"
]

# =============================================================================
# Firebase Configuration
# =============================================================================

# Google OAuth credentials - SET IN terraform.tfvars.local (gitignored)
# google_oauth_client_id     = ""
# google_oauth_client_secret = ""
