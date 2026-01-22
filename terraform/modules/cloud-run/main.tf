# Cloud Run Module - API Service Deployment
#
# Deploys the main REST API service on Cloud Run v2.

locals {
  service_name = "${var.environment}-api-service"

  # Default environment variables
  default_env_vars = {
    NODE_ENV             = var.environment == "prod" ? "production" : "development"
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIRESTORE_DATABASE   = "(default)"
    LOG_LEVEL            = var.environment == "prod" ? "info" : "debug"
    CORS_ORIGINS         = join(",", var.cors_origins)
    API_VERSION          = "v1"

    # SMTP Configuration
    EMAIL_SMTP_SERVER = "send.one.com"
    EMAIL_SMTP_PORT   = "587"
    EMAIL_SMTP_USER   = "info@stallbokning.se"
    EMAIL_SMTP_SECURE = "false" # false for port 587 (STARTTLS)

    # Frontend URL for email links
    FRONTEND_URL = var.frontend_url
  }

  # Merge default with custom environment variables
  all_env_vars = merge(local.default_env_vars, var.environment_variables)

  # Secret environment variables (mounted from Secret Manager)
  secret_env_vars = {
    JWT_SECRET            = var.jwt_secret_id
    JWT_REFRESH_SECRET    = var.jwt_refresh_secret_id
    STRIPE_SECRET_KEY     = var.stripe_secret_key_id
    STRIPE_WEBHOOK_SECRET = var.stripe_webhook_secret_id
    SENDGRID_API_KEY      = var.sendgrid_api_key_id # deprecated - use EMAIL_SMTP_PASSWORD
    EMAIL_SMTP_PASSWORD   = var.smtp_password_id
    TWILIO_ACCOUNT_SID    = var.twilio_account_sid_id
    TWILIO_AUTH_TOKEN     = var.twilio_auth_token_id
    TELEGRAM_BOT_TOKEN    = var.telegram_bot_token_id
  }

  # Filter out empty secret IDs
  active_secret_env_vars = {
    for k, v in local.secret_env_vars : k => v if v != ""
  }
}

# =============================================================================
# Cloud Run Service
# =============================================================================

resource "google_cloud_run_v2_service" "api" {
  name     = local.service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = var.service_account_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    timeout = "${var.request_timeout}s"

    containers {
      image = var.container_image

      # Resource limits
      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = var.cpu_idle
        startup_cpu_boost = var.startup_cpu_boost
      }

      # Port configuration
      ports {
        container_port = var.container_port
      }

      # Regular environment variables
      dynamic "env" {
        for_each = local.all_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret environment variables
      dynamic "env" {
        for_each = local.active_secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      # Startup probe
      startup_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 5
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 15
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    # VPC connector for private services (if specified)
    dynamic "vpc_access" {
      for_each = var.vpc_connector != "" ? [1] : []
      content {
        connector = var.vpc_connector
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }

    labels = merge(var.labels, {
      environment = var.environment
      managed_by  = "terraform"
      service     = "api"
    })
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  labels = merge(var.labels, {
    environment = var.environment
    managed_by  = "terraform"
    service     = "api"
  })

  # Note: Image changes are typically managed by CI/CD pipelines.
  # Use `terraform apply -refresh-only` or deploy via gcloud/CI to update images.
}

# =============================================================================
# IAM - Allow Unauthenticated Access (for public API)
# =============================================================================

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Custom Domain Mapping (if specified)
# =============================================================================

resource "google_cloud_run_domain_mapping" "custom_domain" {
  count = var.custom_domain != "" ? 1 : 0

  name     = var.custom_domain
  location = var.region
  project  = var.project_id

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.api.name
  }
}
