# Monitoring Module - Uptime Checks, Alerts, and Dashboards
#
# Provides observability infrastructure for Cloud Run and Cloud Functions.

locals {
  # Notification channel display name prefix
  notification_prefix = "${var.environment}-equiduty"
}

# =============================================================================
# Notification Channels
# =============================================================================

resource "google_monitoring_notification_channel" "email" {
  for_each = var.enable_alerting ? toset(var.alert_email_addresses) : []

  display_name = "${local.notification_prefix}-email-${each.key}"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = each.value
  }

  user_labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# =============================================================================
# Uptime Checks
# =============================================================================

resource "google_monitoring_uptime_check_config" "cloud_run_health" {
  count = var.enable_uptime_checks ? 1 : 0

  display_name = "${var.environment}-api-health-check"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = var.health_check_path
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(var.cloud_run_service_url, "https://", "")
    }
  }

  content_matchers {
    content = var.health_check_content_match
    matcher = "CONTAINS_STRING"
  }

  checker_type = "STATIC_IP_CHECKERS"

  selected_regions = var.uptime_check_regions

  user_labels = {
    environment = var.environment
    service     = "api"
    managed_by  = "terraform"
  }
}

# =============================================================================
# Alert Policies
# =============================================================================

# Cloud Run Latency Alert
resource "google_monitoring_alert_policy" "cloud_run_latency" {
  count = var.enable_alerting && var.cloud_run_service_name != "" ? 1 : 0

  display_name = "${var.environment}-api-high-latency"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run request latency > ${var.latency_threshold_ms}ms"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "${var.cloud_run_service_name}"
        AND metric.type = "run.googleapis.com/request_latencies"
      EOT

      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_threshold_ms

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = var.enable_alerting ? [
    for channel in google_monitoring_notification_channel.email :
    channel.name
  ] : []

  alert_strategy {
    auto_close = "1800s" # 30 minutes

    notification_rate_limit {
      period = "300s" # 5 minutes between notifications
    }
  }

  documentation {
    content   = "Cloud Run API latency has exceeded ${var.latency_threshold_ms}ms (p95). Check for slow database queries, external API calls, or resource constraints."
    mime_type = "text/markdown"
  }

  user_labels = {
    environment = var.environment
    severity    = "warning"
    managed_by  = "terraform"
  }
}

# Cloud Run Error Rate Alert
resource "google_monitoring_alert_policy" "cloud_run_errors" {
  count = var.enable_alerting && var.cloud_run_service_name != "" ? 1 : 0

  display_name = "${var.environment}-api-high-error-rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run error rate > ${var.error_rate_threshold}%"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_run_revision"
        AND resource.labels.service_name = "${var.cloud_run_service_name}"
        AND metric.type = "run.googleapis.com/request_count"
        AND metric.labels.response_code_class != "2xx"
      EOT

      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.error_rate_threshold / 100 # Convert percentage to ratio

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = var.enable_alerting ? [
    for channel in google_monitoring_notification_channel.email :
    channel.name
  ] : []

  alert_strategy {
    auto_close = "1800s"

    notification_rate_limit {
      period = "300s"
    }
  }

  documentation {
    content   = "Cloud Run API error rate has exceeded ${var.error_rate_threshold}%. Check application logs for error details and stack traces."
    mime_type = "text/markdown"
  }

  user_labels = {
    environment = var.environment
    severity    = "critical"
    managed_by  = "terraform"
  }
}

# Uptime Check Failure Alert
resource "google_monitoring_alert_policy" "uptime_failure" {
  count = var.enable_alerting && var.enable_uptime_checks && var.cloud_run_service_url != "" ? 1 : 0

  display_name = "${var.environment}-api-uptime-failure"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter = <<-EOT
        resource.type = "uptime_url"
        AND metric.type = "monitoring.googleapis.com/uptime_check/check_passed"
        AND metric.labels.check_id = "${google_monitoring_uptime_check_config.cloud_run_health[0].uptime_check_id}"
      EOT

      duration        = "300s" # 5 minutes
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = var.enable_alerting ? [
    for channel in google_monitoring_notification_channel.email :
    channel.name
  ] : []

  alert_strategy {
    auto_close = "1800s"

    notification_rate_limit {
      period = "300s"
    }
  }

  documentation {
    content   = "API uptime check is failing. The service may be down or unreachable. Check Cloud Run service status and logs."
    mime_type = "text/markdown"
  }

  user_labels = {
    environment = var.environment
    severity    = "critical"
    managed_by  = "terraform"
  }
}

# =============================================================================
# Log-based Metrics
# =============================================================================

resource "google_logging_metric" "api_errors" {
  count = var.enable_log_metrics ? 1 : 0

  name    = "${var.environment}-api-error-count"
  project = var.project_id

  filter = <<-EOT
    resource.type = "cloud_run_revision"
    AND resource.labels.service_name = "${var.cloud_run_service_name}"
    AND severity >= ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    labels {
      key         = "severity"
      value_type  = "STRING"
      description = "Log severity level"
    }
  }

  label_extractors = {
    "severity" = "EXTRACT(severity)"
  }
}

resource "google_logging_metric" "function_errors" {
  count = var.enable_log_metrics ? 1 : 0

  name    = "${var.environment}-function-error-count"
  project = var.project_id

  filter = <<-EOT
    resource.type = "cloud_function"
    AND severity >= ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    labels {
      key         = "function_name"
      value_type  = "STRING"
      description = "Cloud Function name"
    }
  }

  label_extractors = {
    "function_name" = "EXTRACT(resource.labels.function_name)"
  }
}
