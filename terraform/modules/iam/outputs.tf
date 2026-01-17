# IAM Module Outputs

# =============================================================================
# Cloud Run API Service Account
# =============================================================================

output "cloud_run_api_service_account_email" {
  description = "Email of the Cloud Run API service account"
  value       = google_service_account.cloud_run_api.email
}

output "cloud_run_api_service_account_id" {
  description = "Unique ID of the Cloud Run API service account"
  value       = google_service_account.cloud_run_api.unique_id
}

output "cloud_run_api_service_account_name" {
  description = "Fully qualified name of the Cloud Run API service account"
  value       = google_service_account.cloud_run_api.name
}

# =============================================================================
# Cloud Functions Service Account
# =============================================================================

output "cloud_functions_service_account_email" {
  description = "Email of the Cloud Functions service account"
  value       = google_service_account.cloud_functions.email
}

output "cloud_functions_service_account_id" {
  description = "Unique ID of the Cloud Functions service account"
  value       = google_service_account.cloud_functions.unique_id
}

output "cloud_functions_service_account_name" {
  description = "Fully qualified name of the Cloud Functions service account"
  value       = google_service_account.cloud_functions.name
}

# =============================================================================
# Terraform CI Service Account
# =============================================================================

output "terraform_ci_service_account_email" {
  description = "Email of the Terraform CI service account"
  value       = var.create_terraform_ci_sa ? google_service_account.terraform_ci[0].email : null
}

output "terraform_ci_service_account_name" {
  description = "Fully qualified name of the Terraform CI service account"
  value       = var.create_terraform_ci_sa ? google_service_account.terraform_ci[0].name : null
}

# =============================================================================
# Workload Identity
# =============================================================================

output "workload_identity_pool_name" {
  description = "Name of the Workload Identity Pool"
  value       = var.create_workload_identity ? google_iam_workload_identity_pool.github[0].name : null
}

output "workload_identity_provider_name" {
  description = "Name of the Workload Identity Provider"
  value       = var.create_workload_identity ? google_iam_workload_identity_pool_provider.github[0].name : null
}

output "github_actions_sa_impersonation" {
  description = "Service account impersonation string for GitHub Actions"
  value       = var.create_workload_identity && var.create_terraform_ci_sa ? google_service_account.terraform_ci[0].email : null
}
