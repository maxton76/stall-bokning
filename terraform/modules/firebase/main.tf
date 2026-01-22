# Firebase Module - Firebase Project and Identity Platform Configuration
#
# Enables Firebase services and configures authentication providers.
# Note: Firestore rules, indexes, and hosting are managed via Firebase CLI.

# =============================================================================
# Enable Required APIs
# =============================================================================

resource "google_project_service" "firebase" {
  for_each = toset([
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# =============================================================================
# Firebase Project
# =============================================================================

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.firebase
  ]
}

# =============================================================================
# Firebase Web App
# =============================================================================

resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = "${var.environment}-stall-bokning-web"

  deletion_policy = var.environment == "prod" ? "DELETE" : "ABANDON"

  depends_on = [
    google_firebase_project.default
  ]
}

# Get the Firebase Web App config for frontend
data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.frontend.app_id
}

# =============================================================================
# Identity Platform (Firebase Auth)
# =============================================================================

resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id

  # Enable sign-in email enumeration protection
  sign_in {
    allow_duplicate_emails = false

    email {
      enabled           = true
      password_required = true
    }
  }

  # Block disposable email domains (only configure if function URI is provided)
  dynamic "blocking_functions" {
    for_each = var.auth_blocking_function_uri != "" ? [1] : []
    content {
      triggers {
        event_type   = "beforeCreate"
        function_uri = var.auth_blocking_function_uri
      }
    }
  }

  # Authorized domains for authentication
  authorized_domains = concat(
    [
      "${var.project_id}.firebaseapp.com",
      "${var.project_id}.web.app",
      "localhost",
    ],
    var.additional_authorized_domains
  )

  # Multi-factor authentication
  mfa {
    enabled_providers = var.enable_mfa ? ["PHONE_SMS"] : []
    state             = var.enable_mfa ? "ENABLED" : "DISABLED"
  }

  depends_on = [
    google_project_service.firebase
  ]
}

# =============================================================================
# Identity Platform OAuth IDP Config (Google OAuth)
# =============================================================================

resource "google_identity_platform_default_supported_idp_config" "google" {
  provider = google-beta
  project  = var.project_id
  enabled  = var.enable_google_oauth
  idp_id   = "google.com"

  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret

  depends_on = [
    google_identity_platform_config.default
  ]
}

# =============================================================================
# Firestore Database (Native Mode)
# =============================================================================

resource "google_firestore_database" "default" {
  provider    = google-beta
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location

  type             = "FIRESTORE_NATIVE"
  concurrency_mode = "OPTIMISTIC"

  # Point-in-time recovery (only for prod)
  point_in_time_recovery_enablement = var.environment == "prod" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"

  # Deletion protection (only for prod)
  deletion_policy = var.environment == "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE"

  depends_on = [
    google_project_service.firebase
  ]
}

# =============================================================================
# Firebase Storage Bucket
# =============================================================================

resource "google_firebase_storage_bucket" "default" {
  provider  = google-beta
  project   = var.project_id
  bucket_id = google_storage_bucket.firebase_storage.name

  depends_on = [
    google_firebase_project.default
  ]
}

resource "google_storage_bucket" "firebase_storage" {
  name     = "${var.project_id}.appspot.com"
  location = var.storage_location
  project  = var.project_id

  uniform_bucket_level_access = true

  # CORS configuration for web uploads
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    condition {
      age = 365 # Delete after 1 year
    }
    action {
      type = "Delete"
    }
  }

  # Versioning for recovery
  versioning {
    enabled = var.environment == "prod"
  }

  labels = {
    environment = var.environment
    purpose     = "firebase-storage"
    managed_by  = "terraform"
  }
}

# =============================================================================
# Firebase Hosting (configuration only - deployment via CLI)
# =============================================================================

resource "google_firebase_hosting_site" "default" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.hosting_site_id != "" ? var.hosting_site_id : var.project_id

  depends_on = [
    google_firebase_project.default
  ]
}
