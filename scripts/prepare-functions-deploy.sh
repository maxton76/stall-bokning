#!/bin/bash
# prepare-functions-deploy.sh
# Prepares the functions package for deployment by copying the shared package
# This script is called as a predeploy hook in firebase.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_DIR="$ROOT_DIR/packages/shared"
FUNCTIONS_DIR="$ROOT_DIR/packages/functions"

echo "Preparing functions deployment..."

# Step 1: Build shared package if dist doesn't exist or is outdated
if [ ! -d "$SHARED_DIR/dist" ]; then
    echo "Building shared package..."
    (cd "$SHARED_DIR" && npm run build)
fi

# Step 2: Remove old shared directory in functions if it exists
if [ -d "$FUNCTIONS_DIR/shared" ]; then
    echo "Removing old shared directory..."
    rm -rf "$FUNCTIONS_DIR/shared"
fi

# Step 3: Create shared directory structure for deployment
echo "Copying shared package..."
mkdir -p "$FUNCTIONS_DIR/shared"

# Copy the built dist directory
cp -r "$SHARED_DIR/dist" "$FUNCTIONS_DIR/shared/"

# Copy package.json for the shared package (needed for file: resolution)
cp "$SHARED_DIR/package.json" "$FUNCTIONS_DIR/shared/"

# Step 4: Replace package.json with deployment version
echo "Switching to deployment package.json..."
cp "$FUNCTIONS_DIR/package.deploy.json" "$FUNCTIONS_DIR/package.json.bak"

# Backup original package.json and use deploy version
mv "$FUNCTIONS_DIR/package.json" "$FUNCTIONS_DIR/package.original.json"
cp "$FUNCTIONS_DIR/package.deploy.json" "$FUNCTIONS_DIR/package.json"

echo "Functions deployment preparation complete!"
echo "  - Shared package copied to: $FUNCTIONS_DIR/shared/"
echo "  - Using deployment package.json with file: protocol"
