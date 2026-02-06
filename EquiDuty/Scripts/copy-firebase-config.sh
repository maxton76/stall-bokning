#!/bin/bash

# Script to copy the correct GoogleService-Info.plist based on build configuration
# This should be added as a "Run Script" build phase in Xcode

set -e

echo "🔵 Copy Firebase Config Script"
echo "Configuration: ${CONFIGURATION}"
echo "Target Name: ${TARGET_NAME}"

# Determine which plist file to copy based on configuration
if [[ "${CONFIGURATION}" == *"dev"* ]]; then
    PLIST_NAME="GoogleService-Info-Dev.plist"
    ENV_NAME="Development"
elif [[ "${CONFIGURATION}" == *"staging"* ]]; then
    PLIST_NAME="GoogleService-Info-Staging.plist"
    ENV_NAME="Staging"
elif [[ "${CONFIGURATION}" == *"prod"* ]]; then
    PLIST_NAME="GoogleService-Info-Production.plist"
    ENV_NAME="Production"
else
    echo "❌ Error: Unknown configuration '${CONFIGURATION}'"
    exit 1
fi

# Source and destination paths
SOURCE_PATH="${PROJECT_DIR}/${TARGET_NAME}/Configuration/Firebase/${PLIST_NAME}"
DEST_PATH="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"

# Verify source file exists
if [ ! -f "${SOURCE_PATH}" ]; then
    echo "❌ Error: Source file not found at ${SOURCE_PATH}"
    exit 1
fi

# Copy and rename the file
echo "📋 Copying ${PLIST_NAME}"
echo "   From: ${SOURCE_PATH}"
echo "   To:   ${DEST_PATH}"

cp "${SOURCE_PATH}" "${DEST_PATH}"

if [ -f "${DEST_PATH}" ]; then
    echo "✅ Successfully copied Firebase config for ${ENV_NAME} environment"
else
    echo "❌ Error: Failed to copy Firebase config"
    exit 1
fi
