# Cloud Run Module Outputs

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.name
}

output "service_id" {
  description = "ID of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.id
}

output "service_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "service_location" {
  description = "Location (region) of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.location
}

output "latest_revision" {
  description = "Name of the latest revision"
  value       = google_cloud_run_v2_service.api.latest_ready_revision
}

output "custom_domain_status" {
  description = "Status of custom domain mapping"
  value       = var.custom_domain != "" ? google_cloud_run_domain_mapping.custom_domain[0].status : null
}

output "health_check_url" {
  description = "Full URL for health check endpoint"
  value       = "${google_cloud_run_v2_service.api.uri}${var.health_check_path}"
}
