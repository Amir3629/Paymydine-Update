#!/usr/bin/env bash
set -euo pipefail

# PMD_AUDIT_PHASE2_SMOKE_REDIRECT_AWARE
BASE="${1:-https://mimoza.paymydine.com}"

echo "=== PMD frontend smoke: $BASE ==="

check_status_any() {
  local path="$1"
  shift
  local code
  code="$(curl -s -o /tmp/pmd-smoke-body.html -w "%{http_code}" -I "$BASE$path" || true)"
  echo "$path -> $code"
  for expected in "$@"; do
    if [ "$code" = "$expected" ]; then
      return 0
    fi
  done
  echo "❌ Expected one of [$*] for $path but got $code"
  exit 1
}

check_status_any "/" "200"
check_status_any "/menu" "200" "307" "308"
check_status_any "/table/1/menu" "200" "307" "308"
check_status_any "/themes/kazen-japanese" "200"
check_status_any "/themes/velvet-terracotta" "200"
check_status_any "/checkout" "200" "307" "308"

echo ""
echo "=== PM2 runtime error scan ==="
pm2 logs paymydine-frontend --lines 600 --nostream | egrep "WINDOW_ERROR|ReferenceError|TypeError|SyntaxError|PaymentModal|CustomerMenuPage|ThemeRoute|NeutralCheckoutShell" && {
  echo "❌ Runtime error-like logs found"
  exit 1
} || echo "✅ No frontend runtime errors found"

echo "✅ smoke passed"
