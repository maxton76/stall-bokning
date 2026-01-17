# Terraform Backend Configuration - Dev Environment
#
# Stores Terraform state in a GCS bucket for team collaboration.
# Run `terraform/scripts/init-backend.sh` first to create the bucket.

terraform {
  backend "gcs" {
    bucket = "stall-bokning-terraform-state"
    prefix = "environments/dev"
  }
}
