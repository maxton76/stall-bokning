#!/bin/bash
# cleanup-functions-deploy.sh
# Cleans up after functions deployment by restoring the original package.json
# This script should be called after deployment completes (success or failure)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FUNCTIONS_DIR="$ROOT_DIR/packages/functions"

echo "Cleaning up after functions deployment..."

# Restore original package.json if backup exists
if [ -f "$FUNCTIONS_DIR/package.original.json" ]; then
    echo "Restoring original package.json..."
    mv "$FUNCTIONS_DIR/package.original.json" "$FUNCTIONS_DIR/package.json"
fi

# Remove backup if it exists
if [ -f "$FUNCTIONS_DIR/package.json.bak" ]; then
    rm "$FUNCTIONS_DIR/package.json.bak"
fi

# Remove copied shared directory (keep workspace clean)
if [ -d "$FUNCTIONS_DIR/shared" ]; then
    echo "Removing temporary shared directory..."
    rm -rf "$FUNCTIONS_DIR/shared"
fi

echo "Cleanup complete!"
