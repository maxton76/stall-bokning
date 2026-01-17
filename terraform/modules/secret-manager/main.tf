# Secret Manager Module - Centralized Secret Management
#
# Creates and manages secrets for the application.
# Secret VALUES are not managed by Terraform - they must be set manually or via CI/CD.

locals {
  # Prefix secrets with environment for isolation
  secret_prefix = "${var.environment}-"

  # Define all application secrets
  secrets = {
    # JWT Secrets
    "jwt-secret" = {
      description = "JWT signing secret for access tokens"
      labels      = { type = "auth", sensitivity = "high" }
    }
    "jwt-refresh-secret" = {
      description = "JWT signing secret for refresh tokens"
      labels      = { type = "auth", sensitivity = "high" }
    }

    # Stripe Secrets
    "stripe-secret-key" = {
      description = "Stripe API secret key"
      labels      = { type = "payment", service = "stripe", sensitivity = "high" }
    }
    "stripe-webhook-secret" = {
      description = "Stripe webhook signing secret"
      labels      = { type = "payment", service = "stripe", sensitivity = "high" }
    }

    # SendGrid Secrets
    "sendgrid-api-key" = {
      description = "SendGrid API key for transactional emails"
      labels      = { type = "notification", service = "sendgrid", sensitivity = "medium" }
    }

    # Twilio Secrets
    "twilio-account-sid" = {
      description = "Twilio account SID"
      labels      = { type = "notification", service = "twilio", sensitivity = "medium" }
    }
    "twilio-auth-token" = {
      description = "Twilio authentication token"
      labels      = { type = "notification", service = "twilio", sensitivity = "high" }
    }

    # Telegram Secrets
    "telegram-bot-token" = {
      description = "Telegram bot token for notifications"
      labels      = { type = "notification", service = "telegram", sensitivity = "high" }
    }
  }

  # Merge default secrets with any additional custom secrets
  all_secrets = merge(local.secrets, var.additional_secrets)
}

# =============================================================================
# Secret Resources
# =============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = local.all_secrets

  secret_id = "${local.secret_prefix}${each.key}"
  project   = var.project_id

  labels = merge(
    {
      environment = var.environment
      managed_by  = "terraform"
    },
    each.value.labels
  )

  replication {
    auto {}
  }
}

# =============================================================================
# Secret Accessor Permissions
# =============================================================================

# Grant Cloud Run service account access to secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_accessor" {
  for_each = var.cloud_run_service_account_email != "" ? local.all_secrets : {}

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account_email}"
}

# Grant Cloud Functions service account access to secrets
resource "google_secret_manager_secret_iam_member" "cloud_functions_accessor" {
  for_each = var.cloud_functions_service_account_email != "" ? local.all_secrets : {}

  project   = var.project_id
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_functions_service_account_email}"
}

# =============================================================================
# Secret Versions (Placeholder - actual values set externally)
# =============================================================================

# Create initial placeholder versions for secrets that should have values
# This is useful for testing but actual values should be set via gcloud or CI/CD
resource "google_secret_manager_secret_version" "placeholder" {
  for_each = var.create_placeholder_versions ? local.all_secrets : {}

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = "PLACEHOLDER_${upper(replace(each.key, "-", "_"))}_SET_VIA_GCLOUD"

  lifecycle {
    # Prevent Terraform from updating secret values
    # Values should be managed externally
    ignore_changes = [secret_data]
  }
}
