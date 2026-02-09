#!/bin/bash
# Verify both hosting targets are deployed and accessible

set -e

ENV=${1:-dev}

# URLs to check
LANDING_URL="https://equiduty-${ENV}.web.app/"
APP_URL="https://equiduty-${ENV}-app.web.app/"

echo "Verifying hosting deployment for ${ENV}..."
echo "Landing site: ${LANDING_URL}"
echo "App site: ${APP_URL}"

# Check landing site
LANDING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$LANDING_URL")
if [ "$LANDING_STATUS" != "200" ]; then
  echo "❌ Landing site check failed (HTTP $LANDING_STATUS)"
  exit 1
fi
echo "✅ Landing site verified (HTTP $LANDING_STATUS)"

# Check app site
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")
if [ "$APP_STATUS" != "200" ]; then
  echo "❌ App site check failed (HTTP $APP_STATUS)"
  exit 1
fi
echo "✅ App site verified (HTTP $APP_STATUS)"

# If production, also check custom domain
if [ "$ENV" = "prod" ]; then
  CUSTOM_URL="https://app.equiduty.se/"
  echo "Custom domain: ${CUSTOM_URL}"
  CUSTOM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CUSTOM_URL")
  if [ "$CUSTOM_STATUS" != "200" ]; then
    echo "❌ Custom domain check failed (HTTP $CUSTOM_STATUS)"
    exit 1
  fi
  echo "✅ Custom domain verified (HTTP $CUSTOM_STATUS)"
fi

echo ""
echo "🎉 All hosting targets verified successfully!"
