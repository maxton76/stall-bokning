#!/bin/bash

# Test script for Feature Toggle critical fixes
# Run after deploying to dev environment

set -e

API_URL="${API_URL:-https://api-dev.equiduty.app/api/v1}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
USER_TOKEN="${USER_TOKEN:-}"
VALID_ORG_ID="${VALID_ORG_ID:-}"
INVALID_ORG_ID="${INVALID_ORG_ID:-other-org-id}"

echo "🧪 Feature Toggle Security & Quality Fixes - Test Suite"
echo "================================================"
echo ""

if [ -z "$ADMIN_TOKEN" ] || [ -z "$USER_TOKEN" ] || [ -z "$VALID_ORG_ID" ]; then
  echo "⚠️  Please set environment variables:"
  echo "  export ADMIN_TOKEN=your-admin-token"
  echo "  export USER_TOKEN=your-user-token"
  echo "  export VALID_ORG_ID=your-org-id"
  echo ""
  echo "Exiting..."
  exit 1
fi

echo "Configuration:"
echo "  API_URL: $API_URL"
echo "  VALID_ORG_ID: $VALID_ORG_ID"
echo "  INVALID_ORG_ID: $INVALID_ORG_ID"
echo ""

# Test 1: IDOR Vulnerability Fix
echo "Test 1: IDOR Vulnerability (should return 403)"
echo "-----------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/feature-toggles/check" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-organization-id: $INVALID_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"features": ["lessons"]}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASS: Unauthorized access blocked (403)"
else
  echo "❌ FAIL: Expected 403, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Schema Validation - Invalid Feature Key
echo "Test 2: Schema Validation - Invalid Feature Key (should return 400)"
echo "-------------------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/feature-toggles/check" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-organization-id: $VALID_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"features": ["invalid@feature!!"]}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS: Invalid feature key rejected (400)"
else
  echo "❌ FAIL: Expected 400, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Schema Validation - Too Many Features
echo "Test 3: Schema Validation - Too Many Features (should return 400)"
echo "-----------------------------------------------------------------"
FEATURES='["f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12","f13","f14","f15","f16","f17","f18","f19","f20","f21","f22","f23","f24","f25","f26","f27","f28","f29","f30","f31","f32","f33","f34","f35","f36","f37","f38","f39","f40","f41","f42","f43","f44","f45","f46","f47","f48","f49","f50","f51"]'
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/feature-toggles/check" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-organization-id: $VALID_ORG_ID" \
  -H "Content-Type: application/json" \
  -d "{\"features\": $FEATURES}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ PASS: Too many features rejected (400)"
else
  echo "❌ FAIL: Expected 400, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Valid Request - Authorized Access
echo "Test 4: Valid Request - Authorized Access (should return 200)"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/feature-toggles/check" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "x-organization-id: $VALID_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"features": ["lessons", "routines"]}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Valid request succeeded (200)"
  echo "Response: $BODY"
else
  echo "❌ FAIL: Expected 200, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 5: Admin Can Access Any Organization
echo "Test 5: Admin Access - Can Access Any Org (should return 200)"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/feature-toggles/check" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-organization-id: $INVALID_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"features": ["lessons"]}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASS: Admin can access any org (200 or 404)"
  echo "Response: $BODY"
else
  echo "❌ FAIL: Expected 200/404, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 6: Rate Limiting (requires admin token)
echo "Test 6: Rate Limiting - Cache Invalidation (should block after 10)"
echo "-------------------------------------------------------------------"
SUCCESS_COUNT=0
BLOCKED_COUNT=0

for i in {1..12}; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$API_URL/admin/feature-toggles/cache/invalidate" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" = "429" ]; then
    BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
  fi

  sleep 0.5
done

echo "Requests: 12 total"
echo "  Success: $SUCCESS_COUNT"
echo "  Blocked: $BLOCKED_COUNT"

if [ $BLOCKED_COUNT -gt 0 ] && [ $SUCCESS_COUNT -le 10 ]; then
  echo "✅ PASS: Rate limiting works (blocked $BLOCKED_COUNT requests)"
else
  echo "⚠️  WARNING: Rate limiting might not be working correctly"
fi
echo ""

# Summary
echo "================================================"
echo "✅ Test Suite Complete"
echo "================================================"
echo ""
echo "Next Steps:"
echo "  1. Review test results above"
echo "  2. Test frontend UI in dev environment"
echo "  3. Verify Swedish translations work"
echo "  4. Deploy to staging for final QA"
echo ""
