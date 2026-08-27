#!/usr/bin/env bash
# scripts/pre-commit-secret-scan.sh
# Scans staged files for potential secrets before committing

STAGED=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED" ]; then
  exit 0
fi

PATTERNS=(
  "ghp_[A-Za-z0-9]+"
  "sk-[A-Za-z0-9]+"
  "AKIA[0-9A-Z]{16}"
  "-----BEGIN RSA PRIVATE KEY-----"
  "password\s*=\s*[\"'][^\"']{8,}"
  "secret\s*=\s*[\"'][^\"']{8,}"
)

FOUND=0
for file in $STAGED; do
  for pattern in "${PATTERNS[@]}"; do
    if grep -qiE "$pattern" "$file" 2>/dev/null; then
      echo "POTENTIAL SECRET in $file (pattern: $pattern)"
      FOUND=1
    fi
  done
done

if [ "$FOUND" -eq 1 ]; then
  echo "Commit blocked: potential secrets detected. Review the files above."
  exit 1
fi

exit 0