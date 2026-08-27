#!/usr/bin/env bash
# clean-build.sh — Remove build output artifacts across all packages

set -euo pipefail

DIRS=(
  "frontend/.next"
  "frontend/out"
  "backend/dist"
  "contracts/target"
  "packages/events/dist"
)

echo "Cleaning build artifacts..."

for dir in ""; do
  if [ -d "" ]; then
    rm -rf ""
    echo "  Removed: "
  else
    echo "  Skipped (not found): "
  fi
done

# Remove node_modules caches
find . -name ".turbo" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete 2>/dev/null || true

echo "Done. All build artifacts cleaned."