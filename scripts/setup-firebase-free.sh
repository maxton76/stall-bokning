#!/bin/bash

# Firebase Free Tier Setup Script for equiduty-dev
# This script only enables services that don't require billing

set -e  # Exit on error

PROJECT_ID="equiduty-dev"
REGION="europe-west1"

echo "🚀 Firebase Free Tier Setup Script"
echo "===================================="
echo ""

# Check if user is logged in
echo "📋 Checking authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "❌ Not logged in to gcloud or project not found."
    echo "Please run:"
    echo "  gcloud auth login"
    echo "  gcloud config set project $PROJECT_ID"
    exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Set Firebase project
echo "📋 Setting Firebase project..."
firebase use $PROJECT_ID --add
echo "✅ Firebase project set to $PROJECT_ID"
echo ""

# Enable FREE Google Cloud APIs only
echo "📋 Enabling FREE Google Cloud APIs..."
gcloud services enable \
    firestore.googleapis.com \
    identitytoolkit.googleapis.com \
    storage-api.googleapis.com \
    cloudfunctions.googleapis.com \
    --project=$PROJECT_ID

echo "✅ Free APIs enabled"
echo ""
echo "ℹ️  Skipping paid services (Cloud Run, Secret Manager, Cloud Scheduler)"
echo "ℹ️  These can be enabled later when billing is set up"
echo ""

# Create Firestore database
echo "📋 Creating Firestore database..."
if ! gcloud firestore databases describe --format="value(name)" &> /dev/null; then
    gcloud firestore databases create \
        --location=$REGION \
        --type=firestore-native \
        --project=$PROJECT_ID
    echo "✅ Firestore database created"
else
    echo "ℹ️  Firestore database already exists"
fi
echo ""

# Deploy Firestore rules and indexes
echo "📋 Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes --project=$PROJECT_ID
echo "✅ Firestore rules and indexes deployed"
echo ""

# Deploy Storage rules
echo "📋 Deploying Storage rules..."
firebase deploy --only storage:rules --project=$PROJECT_ID
echo "✅ Storage rules deployed"
echo ""

# Create service account
echo "📋 Creating service account..."
SERVICE_ACCOUNT_NAME="equiduty-dev-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &> /dev/null; then
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="EquiDuty Development Service Account" \
        --project=$PROJECT_ID
    echo "✅ Service account created: $SERVICE_ACCOUNT_EMAIL"
else
    echo "ℹ️  Service account already exists: $SERVICE_ACCOUNT_EMAIL"
fi
echo ""

# Grant roles to service account
echo "📋 Granting roles to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/firebase.admin" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/datastore.user" \
    --condition=None

echo "✅ Roles granted"
echo ""

# Download service account key
echo "📋 Downloading service account key..."
KEY_FILE="packages/api/service-account-dev.json"
mkdir -p packages/api

if [ ! -f "$KEY_FILE" ]; then
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL \
        --project=$PROJECT_ID
    echo "✅ Service account key saved to: $KEY_FILE"
    echo "⚠️  IMPORTANT: This file is in .gitignore - do NOT commit it!"
else
    echo "ℹ️  Service account key already exists: $KEY_FILE"
fi
echo ""

# Enable Firebase Authentication
echo "📋 Configuring Firebase Authentication..."
echo "Please enable Email/Password and Google sign-in manually in Firebase Console:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo ""

# Create .env file
echo "📋 Creating .env files..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
else
    echo "ℹ️  .env already exists"
fi
echo ""

echo "✅ Firebase free tier setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Enable Authentication providers in Firebase Console:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo "   - Enable Email/Password"
echo "   - Enable Google"
echo ""
echo "2. Get Firebase web config:"
echo "   firebase apps:sdkconfig web"
echo "   OR visit: https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo ""
echo "3. Create packages/frontend/.env and add Firebase config"
echo ""
echo "4. Start emulators for local development:"
echo "   firebase emulators:start"
echo ""
echo "⚠️  BILLING REQUIRED FOR:"
echo "   - Cloud Run (backend API service)"
echo "   - Secret Manager (production secrets)"
echo "   - Cloud Scheduler (cron jobs)"
echo ""
echo "   For now, you can develop using:"
echo "   - Firebase Emulators (completely local)"
echo "   - Cloud Functions Gen2 (has free tier)"
echo ""
