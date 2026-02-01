# Cloud Functions Module - Gen2 Functions and Schedulers
#
# Manages Cloud Functions Gen2 deployments with optional Cloud Scheduler triggers.

locals {
  # Prefix function names with environment
  function_prefix = "${var.environment}-"

  # Default environment variables for all functions
  default_env_vars = {
    NODE_ENV             = var.environment == "prod" ? "production" : "development"
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIRESTORE_DATABASE   = "(default)"
    LOG_LEVEL            = var.environment == "prod" ? "info" : "debug"
  }

  # Merge with custom env vars
  base_env_vars = merge(local.default_env_vars, var.common_environment_variables)
}

# =============================================================================
# GCS Bucket for Function Source (if needed)
# =============================================================================

resource "google_storage_bucket" "function_source" {
  count = var.create_source_bucket ? 1 : 0

  name     = "${var.project_id}-functions-source"
  location = var.source_bucket_location
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = var.environment
    purpose     = "function-source"
    managed_by  = "terraform"
  }
}

# =============================================================================
# Cloud Functions Gen2
# =============================================================================

resource "google_cloudfunctions2_function" "functions" {
  for_each = var.functions

  name     = "${local.function_prefix}${each.key}"
  location = var.region
  project  = var.project_id

  description = each.value.description

  build_config {
    runtime     = each.value.runtime
    entry_point = each.value.entry_point

    # Source from GCS bucket
    dynamic "source" {
      for_each = each.value.source_archive_bucket != "" ? [1] : []
      content {
        storage_source {
          bucket = each.value.source_archive_bucket
          object = each.value.source_archive_object
        }
      }
    }

    environment_variables = merge(
      local.base_env_vars,
      each.value.build_environment_variables
    )
  }

  service_config {
    service_account_email            = var.service_account_email
    available_memory                 = each.value.memory
    available_cpu                    = each.value.cpu
    timeout_seconds                  = each.value.timeout_seconds
    max_instance_count               = each.value.max_instances
    min_instance_count               = each.value.min_instances
    max_instance_request_concurrency = each.value.max_concurrency
    ingress_settings                 = each.value.ingress_settings

    environment_variables = merge(
      local.base_env_vars,
      each.value.environment_variables
    )

    # Secret environment variables
    dynamic "secret_environment_variables" {
      for_each = each.value.secret_environment_variables
      content {
        key        = secret_environment_variables.key
        project_id = var.project_id
        secret     = secret_environment_variables.value.secret
        version    = secret_environment_variables.value.version
      }
    }

    # VPC connector if specified
    vpc_connector                 = var.vpc_connector != "" ? var.vpc_connector : null
    vpc_connector_egress_settings = var.vpc_connector != "" ? "PRIVATE_RANGES_ONLY" : null
  }

  # Event trigger (for Firestore, Pub/Sub, etc.)
  dynamic "event_trigger" {
    for_each = each.value.event_trigger != null ? [each.value.event_trigger] : []
    content {
      trigger_region        = event_trigger.value.region != "" ? event_trigger.value.region : var.region
      event_type            = event_trigger.value.event_type
      retry_policy          = event_trigger.value.retry_policy
      service_account_email = var.service_account_email

      dynamic "event_filters" {
        for_each = event_trigger.value.filters
        content {
          attribute = event_filters.value.attribute
          value     = event_filters.value.value
          operator  = event_filters.value.operator
        }
      }
    }
  }

  labels = merge(var.labels, {
    environment = var.environment
    managed_by  = "terraform"
    function    = each.key
  })

  # Note: Source changes are typically managed by CI/CD pipelines.
  # Use `terraform apply -refresh-only` or deploy via gcloud/CI to update function source.
}

# =============================================================================
# Cloud Scheduler Jobs (for scheduled functions)
# =============================================================================

resource "google_cloud_scheduler_job" "scheduled_functions" {
  for_each = {
    for name, config in var.functions : name => config
    if config.schedule != null
  }

  name        = "${local.function_prefix}${each.key}-scheduler"
  description = "Scheduler for ${each.key} function"
  project     = var.project_id
  region      = var.region

  schedule  = each.value.schedule.cron
  time_zone = each.value.schedule.timezone

  # Pause scheduler: force-pause if requested, otherwise pause in non-prod
  paused = var.pause_all_schedulers || (var.environment != "prod" && each.value.schedule.pause_in_non_prod)

  http_target {
    uri         = google_cloudfunctions2_function.functions[each.key].url
    http_method = "POST"

    body = base64encode(jsonencode(each.value.schedule.payload != null ? each.value.schedule.payload : {}))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = var.scheduler_service_account_email != "" ? var.scheduler_service_account_email : var.service_account_email
      audience              = google_cloudfunctions2_function.functions[each.key].url
    }
  }

  retry_config {
    retry_count          = each.value.schedule.retry_count
    max_retry_duration   = "${each.value.schedule.max_retry_duration}s"
    min_backoff_duration = "5s"
    max_backoff_duration = "3600s"
  }

  depends_on = [
    google_cloudfunctions2_function.functions
  ]
}

# =============================================================================
# IAM - Allow Cloud Scheduler to invoke functions
# =============================================================================

resource "google_cloudfunctions2_function_iam_member" "scheduler_invoker" {
  for_each = {
    for name, config in var.functions : name => config
    if config.schedule != null
  }

  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.functions[each.key].name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${var.scheduler_service_account_email != "" ? var.scheduler_service_account_email : var.service_account_email}"
}

# =============================================================================
# IAM - Allow unauthenticated access (for public functions)
# =============================================================================

resource "google_cloudfunctions2_function_iam_member" "public_invoker" {
  for_each = {
    for name, config in var.functions : name => config
    if config.allow_unauthenticated
  }

  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.functions[each.key].name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

# =============================================================================
# IAM - Allow Eventarc to invoke event-triggered functions
# =============================================================================

# For Cloud Functions Gen2 with Eventarc triggers, the trigger's service account
# needs roles/run.invoker on the underlying Cloud Run service to deliver events.
resource "google_cloud_run_v2_service_iam_member" "eventarc_invoker" {
  for_each = {
    for name, config in var.functions : name => config
    if config.event_trigger != null
  }

  project  = var.project_id
  location = var.region
  name     = google_cloudfunctions2_function.functions[each.key].service_config[0].service
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_email}"
}
