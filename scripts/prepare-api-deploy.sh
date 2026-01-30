#!/bin/bash
# Prepare API package for deployment by including the shared package

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/packages/api"
SHARED_DIR="$ROOT_DIR/packages/shared"

echo "Preparing API for deployment..."

# Build shared package if dist doesn't exist or is stale
if [ ! -d "$SHARED_DIR/dist" ] || [ "$SHARED_DIR/src" -nt "$SHARED_DIR/dist" ]; then
    echo "Building shared package..."
    npm run build --workspace=@equiduty/shared
fi

# Remove old shared directory in API if exists
rm -rf "$API_DIR/shared"

# Copy shared package with proper structure for package.json exports
echo "Copying shared package to API directory..."
mkdir -p "$API_DIR/shared/dist"
cp -r "$SHARED_DIR/dist/"* "$API_DIR/shared/dist/"
cp "$SHARED_DIR/package.json" "$API_DIR/shared/"

echo "API preparation complete!"
