#!/bin/bash
# init-backend.sh - Initialize GCS bucket for Terraform state
#
# This script creates the GCS bucket used for storing Terraform state.
# Run this ONCE before initializing Terraform.
#
# Usage: ./init-backend.sh <project-id>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-equiduty-dev}"
BUCKET_NAME="equiduty-terraform-state"
REGION="europe-west1"

echo -e "${YELLOW}Initializing Terraform state bucket...${NC}"
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null 2>&1; then
    echo -e "${RED}Error: Not authenticated with gcloud. Run 'gcloud auth login' first.${NC}"
    exit 1
fi

# Set project
echo "Setting project..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable storage.googleapis.com --project="$PROJECT_ID"

# Check if bucket already exists
if gsutil ls -b "gs://$BUCKET_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Bucket gs://$BUCKET_NAME already exists.${NC}"
else
    # Create the bucket
    echo "Creating bucket..."
    gsutil mb -p "$PROJECT_ID" -l "$REGION" -b on "gs://$BUCKET_NAME"
    echo -e "${GREEN}Bucket created successfully.${NC}"
fi

# Enable versioning
echo "Enabling versioning..."
gsutil versioning set on "gs://$BUCKET_NAME"

# Set lifecycle policy (keep 5 versions)
echo "Setting lifecycle policy..."
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"numNewerVersions": 5}
      }
    ]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json "gs://$BUCKET_NAME"
rm /tmp/lifecycle.json

# Verify configuration
echo ""
echo -e "${GREEN}Terraform state bucket configured successfully!${NC}"
echo ""
echo "Bucket details:"
gsutil ls -L -b "gs://$BUCKET_NAME" | head -20

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. cd terraform/environments/dev"
echo "2. terraform init"
echo "3. terraform plan"
echo "4. terraform apply"
