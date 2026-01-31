#!/usr/bin/env bash
# check-deploy-branch.sh — Validate branch/tag before deploy
#
# Usage: ./scripts/check-deploy-branch.sh <ENV> [TAG]
# Exit 0 = allowed, Exit 1 = blocked

set -euo pipefail

ENV="${1:-dev}"
TAG="${2:-}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
CURRENT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

fail() {
  echo ""
  echo -e "${RED}${BOLD}DEPLOY BLOCKED${NC}"
  echo -e "${RED}$1${NC}"
  echo ""
  echo -e "  Branch: ${BOLD}${CURRENT_BRANCH}${NC}"
  echo -e "  SHA:    ${BOLD}${CURRENT_SHA}${NC}"
  echo -e "  ENV:    ${BOLD}${ENV}${NC}"
  [ -n "$TAG" ] && echo -e "  TAG:    ${BOLD}${TAG}${NC}"
  echo ""
  if [ -n "${2:-}" ]; then
    echo -e "${YELLOW}Fix:${NC}"
    echo "  $2"
    echo ""
  fi
  exit 1
}

# -------------------------------------------------------------------
# Dev: always allowed
# -------------------------------------------------------------------
if [ "$ENV" = "dev" ]; then
  exit 0
fi

# -------------------------------------------------------------------
# Staging/Prod: block dirty working tree
# -------------------------------------------------------------------
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  fail "Working tree has uncommitted changes." \
       "git stash  OR  git commit your changes first"
fi

# -------------------------------------------------------------------
# With TAG: validate tag exists on origin
# -------------------------------------------------------------------
if [ -n "$TAG" ]; then
  # Fetch latest tag refs
  if ! git ls-remote --tags origin "refs/tags/${TAG}" 2>/dev/null | grep -q "${TAG}"; then
    fail "Tag '${TAG}' not found on origin." \
         "git tag -a ${TAG} -m \"Release\" && git push origin ${TAG}"
  fi
  # Tag is valid — Taskfile handles checkout/restore
  exit 0
fi

# -------------------------------------------------------------------
# Prod without TAG: blocked
# -------------------------------------------------------------------
if [ "$ENV" = "prod" ]; then
  fail "Production deploys require a TAG." \
       "task deploy:<target> ENV=prod TAG=v0.x.y"
fi

# -------------------------------------------------------------------
# Staging without TAG: must be on main, synced with origin
# -------------------------------------------------------------------
if [ "$CURRENT_BRANCH" != "main" ]; then
  fail "Staging deploys without TAG must be on 'main' branch (currently on '${CURRENT_BRANCH}')." \
       "git checkout main && git pull origin main  OR  provide TAG=v0.x.y"
fi

# Fetch origin to compare
git fetch origin main --quiet 2>/dev/null || true

LOCAL_SHA=$(git rev-parse main 2>/dev/null)
REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  # Determine if ahead, behind, or diverged
  AHEAD=$(git rev-list origin/main..main --count 2>/dev/null || echo "?")
  BEHIND=$(git rev-list main..origin/main --count 2>/dev/null || echo "?")

  if [ "$AHEAD" != "0" ] && [ "$BEHIND" != "0" ]; then
    fail "Local 'main' has diverged from origin (${AHEAD} ahead, ${BEHIND} behind)." \
         "git pull --rebase origin main && git push origin main"
  elif [ "$AHEAD" != "0" ]; then
    fail "Local 'main' is ${AHEAD} commit(s) ahead of origin (unpushed)." \
         "git push origin main"
  else
    fail "Local 'main' is ${BEHIND} commit(s) behind origin (stale)." \
         "git pull origin main"
  fi
fi

# -------------------------------------------------------------------
# All checks passed — confirm with user
# -------------------------------------------------------------------
echo ""
echo -e "${GREEN}Deploy gate passed${NC}"
echo -e "  ENV:    ${BOLD}${ENV}${NC}"
echo -e "  Branch: ${BOLD}${CURRENT_BRANCH}${NC}"
echo -e "  SHA:    ${BOLD}${CURRENT_SHA}${NC}"
[ -n "$TAG" ] && echo -e "  TAG:    ${BOLD}${TAG}${NC}"
echo ""

# Interactive confirmation (skip in CI)
if [ -t 0 ]; then
  echo -ne "${YELLOW}Proceed with deploy to ${ENV}? [y/N]${NC} "
  read -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Deploy cancelled."
    exit 1
  fi
fi

exit 0
