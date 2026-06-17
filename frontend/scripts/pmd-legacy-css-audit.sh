#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== PMD legacy CSS audit ==="
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
find app components features styles \
  -path '*/node_modules' -prune -o \
  -path '*/.next' -prune -o \
  -type f -name '*.css' -print \
  | while read -r f; do printf "%7s  %s\n" "$(wc -l < "$f" | tr -d ' ')" "$f"; done \
  | sort -nr

echo ""
echo "=== Legacy folder total ==="
wc -l styles/global/legacy/*.css | sort -n

echo ""
echo "=== Phase 6B/6C extracted scoped compatibility files ==="
for f in \
  styles/customer/actions/action-controls-compat.css \
  styles/customer/checkout/checkout-theme-compat.css \
  styles/customer/themes/kazen-menu-compat.css
do
  [ -f "$f" ] && printf "%7s  %s\n" "$(wc -l < "$f" | tr -d ' ')" "$f"
done

echo ""
echo "=== Legacy import status ==="
if grep -q '../styles/global/paymydine-legacy-globals.css' app/globals.css; then
  echo "✅ app/globals.css imports legacy compatibility layer"
else
  echo "❌ app/globals.css does not import legacy compatibility layer"
fi
for n in 01 02 03 04 05 06 07 08 09 10; do
  file="styles/global/legacy/legacy-${n}.css"
  [ -f "$file" ] && echo "✅ present: $file" || echo "❌ missing: $file"
  grep -q "./legacy/legacy-${n}.css" styles/global/paymydine-legacy-globals.css && echo "✅ imported: legacy-${n}.css" || echo "❌ not imported: legacy-${n}.css"
done

echo ""
echo "=== Risky broad selector samples ==="
grep -RInE '^\s*(html|body|\*|button|div|span|p|a|img|input|select|textarea|\[data-theme\]|body:has|html\[data-theme)' styles/global/legacy styles/customer/actions styles/customer/checkout styles/customer/themes 2>/dev/null | head -160 || true

echo ""
echo "=== Next migration candidates ==="
grep -RInE 'button\[aria-label|body:has|\[class\*=|data-pmd|checkout|payment|kazen|cart|modal|surface|home-action|valet' styles/global/legacy 2>/dev/null | head -180 || true
