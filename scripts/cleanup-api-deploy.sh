#!/bin/bash
# Cleanup after API deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/packages/api"

echo "Cleaning up after API deployment..."

# Remove temporary shared directory
if [ -d "$API_DIR/shared" ]; then
    rm -rf "$API_DIR/shared"
    echo "Removed temporary shared directory"
fi

echo "Cleanup complete!"
