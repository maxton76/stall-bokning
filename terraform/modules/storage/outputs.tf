# Storage Module Outputs

output "state_bucket_name" {
  description = "Name of the Terraform state bucket"
  value       = var.create_state_bucket ? google_storage_bucket.terraform_state[0].name : null
}

output "state_bucket_url" {
  description = "URL of the Terraform state bucket"
  value       = var.create_state_bucket ? google_storage_bucket.terraform_state[0].url : null
}

output "artifacts_bucket_name" {
  description = "Name of the artifacts bucket"
  value       = var.create_artifacts_bucket ? google_storage_bucket.artifacts[0].name : null
}

output "artifacts_bucket_url" {
  description = "URL of the artifacts bucket"
  value       = var.create_artifacts_bucket ? google_storage_bucket.artifacts[0].url : null
}
