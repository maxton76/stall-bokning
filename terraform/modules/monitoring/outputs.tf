# Monitoring Module Outputs

output "uptime_check_id" {
  description = "ID of the Cloud Run uptime check"
  value       = var.enable_uptime_checks && var.enable_cloud_run_monitoring ? google_monitoring_uptime_check_config.cloud_run_health[0].uptime_check_id : null
}

output "uptime_check_name" {
  description = "Name of the Cloud Run uptime check"
  value       = var.enable_uptime_checks && var.enable_cloud_run_monitoring ? google_monitoring_uptime_check_config.cloud_run_health[0].name : null
}

output "notification_channel_ids" {
  description = "Map of email addresses to notification channel IDs"
  value = var.enable_alerting ? {
    for email, channel in google_monitoring_notification_channel.email :
    email => channel.name
  } : {}
}

output "alert_policy_names" {
  description = "Names of created alert policies"
  value = compact([
    var.enable_alerting && var.enable_cloud_run_monitoring ? google_monitoring_alert_policy.cloud_run_latency[0].name : "",
    var.enable_alerting && var.enable_cloud_run_monitoring ? google_monitoring_alert_policy.cloud_run_errors[0].name : "",
    var.enable_alerting && var.enable_uptime_checks && var.enable_cloud_run_monitoring ? google_monitoring_alert_policy.uptime_failure[0].name : "",
  ])
}

output "log_metric_names" {
  description = "Names of created log-based metrics"
  value = compact([
    var.enable_log_metrics && var.enable_cloud_run_monitoring ? google_logging_metric.api_errors[0].name : "",
    var.enable_log_metrics ? google_logging_metric.function_errors[0].name : "",
  ])
}
