# Outputs - Dev Environment

# =============================================================================
# Project Information
# =============================================================================

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# =============================================================================
# IAM Outputs
# =============================================================================

output "cloud_run_service_account_email" {
  description = "Cloud Run API service account email"
  value       = module.iam.cloud_run_api_service_account_email
}

output "cloud_functions_service_account_email" {
  description = "Cloud Functions service account email"
  value       = module.iam.cloud_functions_service_account_email
}

output "terraform_ci_service_account_email" {
  description = "Terraform CI service account email"
  value       = module.iam.terraform_ci_service_account_email
}

output "workload_identity_provider" {
  description = "Workload Identity provider name for GitHub Actions"
  value       = module.iam.workload_identity_provider_name
}

# =============================================================================
# Cloud Run Outputs
# =============================================================================

output "cloud_run_service_url" {
  description = "Cloud Run API service URL"
  value       = module.cloud_run.service_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = module.cloud_run.service_name
}

output "cloud_run_health_check_url" {
  description = "Cloud Run health check URL"
  value       = module.cloud_run.health_check_url
}

# =============================================================================
# Cloud Functions Outputs
# =============================================================================

output "function_urls" {
  description = "URLs of deployed Cloud Functions"
  value       = module.cloud_functions.function_urls
}

output "function_names" {
  description = "Names of deployed Cloud Functions"
  value       = module.cloud_functions.function_names
}

output "scheduler_jobs" {
  description = "Cloud Scheduler job names"
  value       = module.cloud_functions.scheduler_job_names
}

# =============================================================================
# Firebase Outputs
# =============================================================================

output "firebase_web_app_id" {
  description = "Firebase Web App ID"
  value       = module.firebase.web_app_id
}

output "firebase_storage_bucket" {
  description = "Firebase Storage bucket name"
  value       = module.firebase.storage_bucket_name
}

output "firebase_hosting_url" {
  description = "Firebase Hosting default URL"
  value       = module.firebase.hosting_default_url
}

output "firestore_database_name" {
  description = "Firestore database name"
  value       = module.firebase.firestore_database_name
}

# =============================================================================
# Monitoring Outputs
# =============================================================================

output "uptime_check_id" {
  description = "Uptime check ID"
  value       = module.monitoring.uptime_check_id
}

output "alert_policies" {
  description = "Alert policy names"
  value       = module.monitoring.alert_policy_names
}

# =============================================================================
# Secret Manager Outputs
# =============================================================================

output "secret_ids" {
  description = "Secret Manager secret IDs"
  value       = module.secrets.secret_ids
  sensitive   = true
}

# =============================================================================
# Useful Commands
# =============================================================================

output "useful_commands" {
  description = "Useful commands for working with this environment"
  value = {
    view_cloud_run_logs  = "gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=${module.cloud_run.service_name}' --limit=50"
    view_functions_logs  = "gcloud logging read 'resource.type=cloud_function' --limit=50"
    update_secret        = "gcloud secrets versions add <secret-name> --data-file=-"
    list_secrets         = "gcloud secrets list --project=${var.project_id}"
    trigger_function     = "gcloud functions call <function-name> --region=${var.region}"
    check_scheduler_jobs = "gcloud scheduler jobs list --location=${var.region}"
  }
}
