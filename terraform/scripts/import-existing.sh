#!/bin/bash
# import-existing.sh - Import existing GCP resources into Terraform state
#
# This script imports existing resources that were created before Terraform management.
# Run this after 'terraform init' but before 'terraform apply'.
#
# Usage: ./import-existing.sh <project-id> <environment>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-stall-bokning-dev}"
ENVIRONMENT="${2:-dev}"
REGION="europe-west1"

echo -e "${YELLOW}Importing existing resources into Terraform state...${NC}"
echo "Project: $PROJECT_ID"
echo "Environment: $ENVIRONMENT"
echo ""

# Navigate to environment directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../environments/$ENVIRONMENT"

if [ ! -d "$ENV_DIR" ]; then
    echo -e "${RED}Error: Environment directory not found: $ENV_DIR${NC}"
    exit 1
fi

cd "$ENV_DIR"

# Check if Terraform is initialized
if [ ! -d ".terraform" ]; then
    echo -e "${RED}Error: Terraform not initialized. Run 'terraform init' first.${NC}"
    exit 1
fi

# Function to import a resource if it exists
import_if_exists() {
    local resource_address="$1"
    local resource_id="$2"
    local check_command="$3"

    # Check if already in state
    if terraform state show "$resource_address" > /dev/null 2>&1; then
        echo -e "${YELLOW}Already imported: $resource_address${NC}"
        return 0
    fi

    # Check if resource exists in GCP
    if eval "$check_command" > /dev/null 2>&1; then
        echo "Importing: $resource_address"
        terraform import "$resource_address" "$resource_id" || {
            echo -e "${RED}Failed to import: $resource_address${NC}"
            return 1
        }
        echo -e "${GREEN}Imported: $resource_address${NC}"
    else
        echo -e "${YELLOW}Resource does not exist, skipping: $resource_address${NC}"
    fi
}

echo "Checking for existing resources..."
echo ""

# =============================================================================
# Import Firebase Project
# =============================================================================

echo "Checking Firebase project..."
import_if_exists \
    "module.firebase.google_firebase_project.default" \
    "projects/$PROJECT_ID" \
    "gcloud firebase projects:get $PROJECT_ID"

# =============================================================================
# Import Firestore Database
# =============================================================================

echo "Checking Firestore database..."
import_if_exists \
    "module.firebase.google_firestore_database.default" \
    "projects/$PROJECT_ID/databases/(default)" \
    "gcloud firestore databases list --project=$PROJECT_ID --format='value(name)' | grep -q '(default)'"

# =============================================================================
# Import Firebase Storage Bucket
# =============================================================================

echo "Checking Firebase Storage bucket..."
import_if_exists \
    "module.firebase.google_storage_bucket.firebase_storage" \
    "$PROJECT_ID.appspot.com" \
    "gsutil ls -b gs://$PROJECT_ID.appspot.com"

# =============================================================================
# Import Service Accounts (if they exist)
# =============================================================================

echo "Checking service accounts..."

SA_EMAIL="${ENVIRONMENT}-cloud-run-api@${PROJECT_ID}.iam.gserviceaccount.com"
import_if_exists \
    "module.iam.google_service_account.cloud_run_api" \
    "projects/$PROJECT_ID/serviceAccounts/$SA_EMAIL" \
    "gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID"

SA_EMAIL="${ENVIRONMENT}-cloud-functions@${PROJECT_ID}.iam.gserviceaccount.com"
import_if_exists \
    "module.iam.google_service_account.cloud_functions" \
    "projects/$PROJECT_ID/serviceAccounts/$SA_EMAIL" \
    "gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID"

# =============================================================================
# Import Secrets (if they exist)
# =============================================================================

echo "Checking secrets..."

SECRETS=(
    "jwt-secret"
    "jwt-refresh-secret"
    "stripe-secret-key"
    "stripe-webhook-secret"
    "sendgrid-api-key"
    "twilio-account-sid"
    "twilio-auth-token"
    "telegram-bot-token"
)

for secret in "${SECRETS[@]}"; do
    secret_name="${ENVIRONMENT}-${secret}"
    import_if_exists \
        "module.secrets.google_secret_manager_secret.secrets[\"$secret\"]" \
        "projects/$PROJECT_ID/secrets/$secret_name" \
        "gcloud secrets describe $secret_name --project=$PROJECT_ID"
done

# =============================================================================
# Import Cloud Run Service (if it exists)
# =============================================================================

echo "Checking Cloud Run service..."
SERVICE_NAME="${ENVIRONMENT}-api-service"
import_if_exists \
    "module.cloud_run.google_cloud_run_v2_service.api" \
    "projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME" \
    "gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo -e "${GREEN}Import process completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the current state: terraform state list"
echo "2. Plan changes: terraform plan"
echo "3. Apply if needed: terraform apply"
echo ""
echo -e "${YELLOW}Note: Some resources may need manual verification.${NC}"
echo "Run 'terraform plan' to see if any changes are needed."
