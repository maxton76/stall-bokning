#!/bin/bash
# Cleanup after API deployment — removes the env-isolated staging directory.
#
# Usage: ./scripts/cleanup-api-deploy.sh [env]
#   env: dev (default), staging, prod

set -e

ENV="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STAGE_DIR="$ROOT_DIR/.build/api-${ENV}"

echo "Cleaning up after API deployment (${ENV})..."

if [ -d "$STAGE_DIR" ]; then
    rm -rf "$STAGE_DIR"
    echo "Removed staging directory: ${STAGE_DIR}"
fi

echo "Cleanup complete!"
