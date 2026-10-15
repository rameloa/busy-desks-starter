#!/usr/bin/env bash
# Blocks secrets from entering busy-desks. Runs as a pre-commit hook and in CI.
# Usage: scripts/check-secrets.sh            (scan staged files)
#        scripts/check-secrets.sh --all      (scan every tracked file)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ "${1:-}" == "--all" ]]; then
  files=$(git ls-files)
else
  files=$(git diff --cached --name-only --diff-filter=ACM)
fi
[[ -z "$files" ]] && exit 0

patterns=(
  'sk-ant-[A-Za-z0-9_-]{20,}'                         # Anthropic API keys
  'sb_secret_[A-Za-z0-9_-]{10,}'                      # Supabase secret keys
  'eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'  # JWTs (service_role / anon)
  'gh[pousr]_[A-Za-z0-9]{30,}'                        # GitHub tokens
  'github_pat_[A-Za-z0-9_]{30,}'
  'AKIA[0-9A-Z]{16}'                                  # AWS keys
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'xox[baprs]-[A-Za-z0-9-]{10,}'                      # Slack tokens
  'SHORTCUT_TOKEN[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'$]{6,}'   # the Shortcut token, assigned literally
  'x-office-token["'"'"']?[[:space:]]*:[[:space:]]*["'"'"'][^"'"'"'$]{6,}' # the token sent as a header value
)

found=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  [[ "$f" == "scripts/check-secrets.sh" ]] && continue
  for p in "${patterns[@]}"; do
    if grep -EnI -- "$p" "$f" >/dev/null 2>&1; then
      echo "Possible secret in $f (pattern: $p)"
      grep -EnI -- "$p" "$f" | cut -c1-80 | sed 's/^/  /'
      found=1
    fi
  done
done <<< "$files"

if [[ $found -eq 1 ]]; then
  echo
  echo "Blocked: secrets never go in busy-desks. Remove them and keep them in Supabase secrets instead."
  exit 1
fi
