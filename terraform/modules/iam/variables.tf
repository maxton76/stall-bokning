# IAM Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# =============================================================================
# Cloud Run API Service Account Configuration
# =============================================================================

variable "cloud_run_api_roles" {
  description = "IAM roles to grant to the Cloud Run API service account"
  type        = list(string)
  default = [
    "roles/datastore.user",               # Firestore access
    "roles/firebaseauth.admin",           # Firebase Auth user management
    "roles/secretmanager.secretAccessor", # Access secrets
    "roles/storage.objectViewer",         # Read from storage
    "roles/storage.objectCreator",        # Write to storage (create/upload objects)
    "roles/iam.serviceAccountTokenCreator", # Generate signed URLs (signBlob)
    "roles/logging.logWriter",            # Write logs
    "roles/cloudtrace.agent",             # Send traces
    "roles/monitoring.metricWriter",      # Write metrics
    "roles/aiplatform.user",              # Vertex AI / Gemini access
  ]
}

# =============================================================================
# Cloud Functions Service Account Configuration
# =============================================================================

variable "cloud_functions_roles" {
  description = "IAM roles to grant to the Cloud Functions service account"
  type        = list(string)
  default = [
    "roles/datastore.user",               # Firestore access
    "roles/secretmanager.secretAccessor", # Access secrets
    "roles/storage.objectAdmin",          # Full storage access for functions
    "roles/logging.logWriter",            # Write logs
    "roles/cloudtrace.agent",             # Send traces
    "roles/monitoring.metricWriter",      # Write metrics
    "roles/pubsub.publisher",             # Publish to Pub/Sub
    "roles/eventarc.eventReceiver",       # Receive Eventarc events
    "roles/firebasecloudmessaging.admin", # Send FCM push notifications
  ]
}

# =============================================================================
# Terraform CI Service Account Configuration
# =============================================================================

variable "create_terraform_ci_sa" {
  description = "Whether to create the Terraform CI service account"
  type        = bool
  default     = true
}

variable "terraform_ci_roles" {
  description = "IAM roles to grant to the Terraform CI service account"
  type        = list(string)
  default = [
    "roles/editor",                  # General project access
    "roles/iam.serviceAccountAdmin", # Manage service accounts
    "roles/iam.serviceAccountUser",  # Use service accounts
    "roles/secretmanager.admin",     # Manage secrets
    "roles/storage.admin",           # Manage storage
    "roles/run.admin",               # Manage Cloud Run
    "roles/cloudfunctions.admin",    # Manage Cloud Functions
    "roles/cloudscheduler.admin",    # Manage Cloud Scheduler
    "roles/monitoring.admin",        # Manage monitoring
  ]
}

# =============================================================================
# Workload Identity Configuration (GitHub Actions)
# =============================================================================

variable "create_workload_identity" {
  description = "Whether to create Workload Identity resources for GitHub Actions"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = ""
}

# =============================================================================
# Cross-service Permissions
# =============================================================================

variable "allow_cloud_run_to_invoke_functions" {
  description = "Whether to allow Cloud Run to invoke Cloud Functions"
  type        = bool
  default     = false
}

variable "function_names" {
  description = "List of Cloud Function names that Cloud Run can invoke"
  type        = list(string)
  default     = []
}
