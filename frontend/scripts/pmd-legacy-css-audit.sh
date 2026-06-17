#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== PMD structured CSS compatibility audit ==="
date
pwd

echo ""
echo "=== Active import chain ==="
echo "app/globals.css:"
cat app/globals.css

echo ""
echo "styles/global/paymydine-legacy-globals.css imports:"
grep -n "@import" styles/global/paymydine-legacy-globals.css || true

echo ""
echo "=== CSS line inventory ==="
find app components features styles   -path '*/node_modules' -prune -o   -path '*/.next' -prune -o   -type f -name '*.css' -print   | while read -r f; do printf "%7s  %s
" "$(wc -l < "$f" | tr -d ' ')" "$f"; done   | sort -nr

echo ""
echo "=== Legacy marker folder total ==="
wc -l styles/global/legacy/*.css | sort -n

echo ""
echo "=== Structured compatibility files ==="
find styles/customer -type f -name '*compat.css' -print   | while read -r f; do printf "%7s  %s
" "$(wc -l < "$f" | tr -d ' ')" "$f"; done   | sort -nr

echo ""
echo "=== Theme-isolated compatibility files ==="
for f in styles/customer/themes/*-compat.css; do
  [ -f "$f" ] && printf "%7s  %s
" "$(wc -l < "$f" | tr -d ' ')" "$f"
done | sort -nr

echo ""
echo "=== Guard ==="
bash scripts/pmd-legacy-css-guard.sh

echo ""
echo "=== Remaining broad selector samples inside legacy marker folder ==="
grep -RInE '^\s*(html|body|\*|button|div|span|p|a|img|input|select|textarea|\[data-theme\]|body:has|html\[data-theme)' styles/global/legacy 2>/dev/null | head -80 || true

echo ""
echo "=== Structured broad selector samples still to componentize later ==="
grep -RInE '^\s*(html|body|\*|button|div|span|p|a|img|input|select|textarea|\[data-theme\]|body:has|html\[data-theme)' styles/customer 2>/dev/null | head -180 || true
