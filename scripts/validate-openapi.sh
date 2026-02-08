#!/bin/bash
# Validate OpenAPI specification before deployment
# Usage: ./scripts/validate-openapi.sh [--strict]
#
# Exit codes:
#   0 - Validation passed (or warnings only in non-strict mode)
#   1 - Critical errors found (malformed spec)
#   2 - Missing annotations (only fails in --strict mode)

set -e

STRICT_MODE=false
if [ "$1" = "--strict" ]; then
  STRICT_MODE=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/packages/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 OpenAPI Validation${NC}"
echo "─────────────────────────────"

# Change to API directory
cd "$API_DIR"

# Check if spec file exists (generate if missing)
if [ ! -f "openapi.json" ]; then
  echo "Generating OpenAPI spec..."
  npm run openapi:export > /dev/null 2>&1
fi

# Parse spec stats
SPEC_FILE="openapi.json"
if [ ! -f "$SPEC_FILE" ]; then
  echo -e "${RED}❌ Failed to generate OpenAPI spec${NC}"
  exit 1
fi

# Extract stats using node
STATS=$(node -e "
const spec = require('./$SPEC_FILE');
const pathCount = Object.keys(spec.paths || {}).length;
const operations = Object.values(spec.paths || {})
  .reduce((sum, path) => sum + Object.keys(path).length, 0);
const annotated = Object.values(spec.paths || {})
  .flatMap(path => Object.values(path))
  .filter(op => op.description && op.tags && op.tags.length > 0)
  .length;
const progress = operations > 0 ? Math.round((annotated / operations) * 100) : 0;
console.log(pathCount + ' ' + operations + ' ' + annotated + ' ' + progress);
")

read -r PATHS OPS ANNOTATED PROGRESS <<< "$STATS"

echo "  Paths: $PATHS"
echo "  Operations: $OPS"
echo "  Annotated: $ANNOTATED/$OPS ($PROGRESS%)"
echo ""

# Validate spec structure (critical - always fail if invalid)
echo "Validating spec structure..."
if npm run openapi:validate > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Spec structure valid${NC}"
else
  echo -e "${RED}❌ Spec validation failed${NC}"
  npm run openapi:validate
  exit 1
fi

# Check annotation completeness
echo ""
echo "Checking annotations..."

if [ "$PROGRESS" -eq 100 ]; then
  echo -e "${GREEN}✅ All operations documented ($ANNOTATED/$OPS)${NC}"
  exit 0
elif [ "$PROGRESS" -ge 50 ]; then
  echo -e "${YELLOW}⚠️  $ANNOTATED/$OPS operations documented ($PROGRESS%)${NC}"
  if [ "$STRICT_MODE" = true ]; then
    echo -e "${RED}Strict mode: Deployment blocked until 100% annotated${NC}"
    exit 2
  else
    echo -e "${BLUE}Non-strict mode: Deployment allowed (warnings only)${NC}"
    exit 0
  fi
else
  echo -e "${YELLOW}⚠️  Low annotation coverage ($PROGRESS%)${NC}"
  if [ "$STRICT_MODE" = true ]; then
    echo -e "${RED}Strict mode: Deployment blocked${NC}"
    exit 2
  else
    echo -e "${BLUE}Non-strict mode: Deployment allowed (warnings only)${NC}"
    exit 0
  fi
fi
