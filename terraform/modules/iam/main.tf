# IAM Module - Service Accounts and Role Bindings
#
# Creates service accounts for:
# - Cloud Run API service
# - Cloud Functions
# - Terraform CI/CD (Workload Identity ready)

locals {
  # Service account IDs with environment prefix
  cloud_run_sa_id       = "${var.environment}-cloud-run-api"
  cloud_functions_sa_id = "${var.environment}-cloud-functions"
  terraform_ci_sa_id    = "terraform-ci"
}

# =============================================================================
# Cloud Run API Service Account
# =============================================================================

resource "google_service_account" "cloud_run_api" {
  account_id   = local.cloud_run_sa_id
  display_name = "Cloud Run API Service (${var.environment})"
  description  = "Service account for Cloud Run API service in ${var.environment} environment"
  project      = var.project_id
}

# Cloud Run API IAM roles
resource "google_project_iam_member" "cloud_run_api_roles" {
  for_each = toset(var.cloud_run_api_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run_api.email}"
}

# =============================================================================
# Cloud Functions Service Account
# =============================================================================

resource "google_service_account" "cloud_functions" {
  account_id   = local.cloud_functions_sa_id
  display_name = "Cloud Functions Service (${var.environment})"
  description  = "Service account for Cloud Functions in ${var.environment} environment"
  project      = var.project_id
}

# Cloud Functions IAM roles
resource "google_project_iam_member" "cloud_functions_roles" {
  for_each = toset(var.cloud_functions_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

# =============================================================================
# Terraform CI/CD Service Account (shared across environments)
# =============================================================================

resource "google_service_account" "terraform_ci" {
  count = var.create_terraform_ci_sa ? 1 : 0

  account_id   = local.terraform_ci_sa_id
  display_name = "Terraform CI/CD Service Account"
  description  = "Service account for Terraform operations via GitHub Actions"
  project      = var.project_id
}

# Terraform CI IAM roles
resource "google_project_iam_member" "terraform_ci_roles" {
  for_each = var.create_terraform_ci_sa ? toset(var.terraform_ci_roles) : []

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_ci[0].email}"
}

# =============================================================================
# Workload Identity Federation (for GitHub Actions)
# =============================================================================

resource "google_iam_workload_identity_pool" "github" {
  count = var.create_workload_identity ? 1 : 0

  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions CI/CD"
  project                   = var.project_id
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count = var.create_workload_identity ? 1 : 0

  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  project = var.project_id
}

# Allow GitHub Actions to impersonate the Terraform CI service account
resource "google_service_account_iam_member" "workload_identity_binding" {
  count = var.create_workload_identity && var.create_terraform_ci_sa ? 1 : 0

  service_account_id = google_service_account.terraform_ci[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repository}"
}

# =============================================================================
# Cross-service Account Permissions
# =============================================================================

# Allow Cloud Run to invoke Cloud Functions (if needed)
resource "google_cloudfunctions2_function_iam_member" "cloud_run_invoker" {
  for_each = var.allow_cloud_run_to_invoke_functions ? toset(var.function_names) : []

  project        = var.project_id
  location       = var.region
  cloud_function = each.value
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.cloud_run_api.email}"
}
