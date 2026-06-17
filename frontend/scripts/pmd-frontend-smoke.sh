#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://mimoza.paymydine.com}"

echo "=== PMD frontend smoke: $BASE ==="

check_status() {
  local path="$1"
  local expected="$2"
  local code
  code="$(curl -s -o /tmp/pmd-smoke-body.html -w "%{http_code}" -I "$BASE$path" || true)"
  echo "$path -> $code"
  if [ "$code" != "$expected" ]; then
    echo "❌ Expected $expected for $path but got $code"
    exit 1
  fi
}

check_status "/menu" "200"
check_status "/checkout" "307"

echo ""
echo "=== PM2 runtime error scan ==="
pm2 logs paymydine-frontend --lines 600 --nostream | egrep "WINDOW_ERROR|ReferenceError|TypeError|SyntaxError|PaymentModal|CustomerMenuPage|ThemeRoute|NeutralCheckoutShell" && {
  echo "❌ Runtime error-like logs found"
  exit 1
} || echo "✅ No frontend runtime errors found"

echo "✅ smoke passed"
