#!/bin/bash
# Prepare API package for deployment by staging source + shared into an
# env-isolated directory under .build/api-${ENV}/.
#
# Usage: ./scripts/prepare-api-deploy.sh [env]
#   env: dev (default), staging, prod

set -e

ENV="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/packages/api"
SHARED_DIR="$ROOT_DIR/packages/shared"
STAGE_DIR="$ROOT_DIR/.build/api-${ENV}"

echo "Preparing API for deployment (${ENV})..."

# Validate OpenAPI spec before deployment
echo "Validating OpenAPI spec..."
if ! bash "$SCRIPT_DIR/validate-openapi.sh"; then
  echo "OpenAPI validation failed. Aborting deployment."
  exit 1
fi
echo ""

# Build shared package with mkdir-based lock (macOS-compatible)
mkdir -p "$ROOT_DIR/.build"
LOCK_DIR="$ROOT_DIR/.build/shared-build.lock"
if [ ! -d "$SHARED_DIR/dist" ] || [ "$SHARED_DIR/src" -nt "$SHARED_DIR/dist" ]; then
    echo "Building shared package..."
    while ! mkdir "$LOCK_DIR" 2>/dev/null; do sleep 0.5; done
    trap "rmdir '$LOCK_DIR' 2>/dev/null" EXIT
    npm run build --workspace=@equiduty/shared
    rmdir "$LOCK_DIR" 2>/dev/null
    trap - EXIT
fi

# Create clean staging directory
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

# Copy API source and config files
echo "Staging API source to ${STAGE_DIR}..."
cp -r "$API_DIR/src" "$STAGE_DIR/src"
cp "$API_DIR/package.docker.json" "$STAGE_DIR/"
cp "$API_DIR/package.json" "$STAGE_DIR/"
cp "$API_DIR/package-lock.json" "$STAGE_DIR/"
cp "$API_DIR/tsconfig.docker.json" "$STAGE_DIR/"
cp "$API_DIR/Dockerfile" "$STAGE_DIR/"

# Copy shared package into staging (for Dockerfile COPY shared/)
mkdir -p "$STAGE_DIR/shared/dist"
cp -r "$SHARED_DIR/dist/"* "$STAGE_DIR/shared/dist/"
cp "$SHARED_DIR/package.json" "$STAGE_DIR/shared/"

echo "API preparation complete (${ENV})!"
