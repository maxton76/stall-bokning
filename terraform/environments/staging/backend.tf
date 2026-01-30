# Terraform Backend Configuration - Staging Environment
#
# Stores Terraform state in a GCS bucket for team collaboration.
# Run `terraform/scripts/init-backend.sh` first to create the bucket.

terraform {
  backend "gcs" {
    bucket = "equiduty-terraform-state"
    prefix = "environments/staging"
  }
}
