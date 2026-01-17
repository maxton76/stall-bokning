# Cloud Functions Module Outputs

output "function_urls" {
  description = "Map of function names to their URLs"
  value = {
    for name, function in google_cloudfunctions2_function.functions :
    name => function.url
  }
}

output "function_names" {
  description = "Map of function keys to their full names"
  value = {
    for name, function in google_cloudfunctions2_function.functions :
    name => function.name
  }
}

output "function_ids" {
  description = "Map of function names to their IDs"
  value = {
    for name, function in google_cloudfunctions2_function.functions :
    name => function.id
  }
}

output "function_service_configs" {
  description = "Map of function names to their service configurations"
  value = {
    for name, function in google_cloudfunctions2_function.functions :
    name => {
      service         = function.service_config[0].service
      uri             = function.service_config[0].uri
      max_instances   = function.service_config[0].max_instance_count
      timeout_seconds = function.service_config[0].timeout_seconds
    }
  }
}

output "scheduler_job_names" {
  description = "Map of scheduler job keys to their names"
  value = {
    for name, job in google_cloud_scheduler_job.scheduled_functions :
    name => job.name
  }
}

output "scheduler_job_schedules" {
  description = "Map of scheduler job keys to their cron schedules"
  value = {
    for name, job in google_cloud_scheduler_job.scheduled_functions :
    name => job.schedule
  }
}

output "source_bucket_name" {
  description = "Name of the function source bucket"
  value       = var.create_source_bucket ? google_storage_bucket.function_source[0].name : null
}
