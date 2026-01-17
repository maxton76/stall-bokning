# Storage Module - GCS Buckets for Terraform State and Artifacts
#
# This module creates GCS buckets with proper versioning and lifecycle policies.

resource "google_storage_bucket" "terraform_state" {
  count = var.create_state_bucket ? 1 : 0

  name     = var.state_bucket_name
  location = var.location
  project  = var.project_id

  # Prevent accidental deletion
  force_destroy = false

  # Enable versioning for state file recovery
  versioning {
    enabled = true
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Labels for organization
  labels = merge(var.labels, {
    purpose     = "terraform-state"
    managed_by  = "terraform"
    environment = var.environment
  })

  # Soft delete policy for recovery
  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }
}

resource "google_storage_bucket" "artifacts" {
  count = var.create_artifacts_bucket ? 1 : 0

  name     = var.artifacts_bucket_name
  location = var.location
  project  = var.project_id

  force_destroy = false

  versioning {
    enabled = true
  }

  # Clean up old artifacts after 90 days
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true

  labels = merge(var.labels, {
    purpose     = "build-artifacts"
    managed_by  = "terraform"
    environment = var.environment
  })
}

# IAM binding for CI/CD service account to access state bucket
resource "google_storage_bucket_iam_member" "state_bucket_admin" {
  count = var.create_state_bucket && var.ci_service_account_email != "" ? 1 : 0

  bucket = google_storage_bucket.terraform_state[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.ci_service_account_email}"
}
