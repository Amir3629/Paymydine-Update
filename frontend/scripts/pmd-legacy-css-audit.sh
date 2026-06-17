#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== PMD legacy CSS audit ==="
date -u
pwd

echo ""
echo "=== Active import chain ==="
echo "app/globals.css:"
sed -n '1,40p' app/globals.css 2>/dev/null || true

echo ""
echo "styles/global/paymydine-legacy-globals.css imports:"
grep -n '^@import' styles/global/paymydine-legacy-globals.css 2>/dev/null || true

echo ""
echo "=== CSS line inventory ==="
find app styles components features \
  -path '*/node_modules' -prune -o \
  -path '*/.next' -prune -o \
  -type f -name '*.css' -print 2>/dev/null \
  | sort \
  | while read -r file; do
      printf "%7s  %s\n" "$(wc -l < "$file" | tr -d ' ')" "$file"
    done \
  | sort -nr

echo ""
echo "=== Legacy folder total ==="
if [ -d styles/global/legacy ]; then
  wc -l styles/global/legacy/*.css 2>/dev/null | sort -n || true
else
  echo "missing styles/global/legacy"
fi

echo ""
echo "=== Legacy import status ==="
if grep -q '../styles/global/paymydine-legacy-globals.css' app/globals.css; then
  echo "✅ app/globals.css imports legacy compatibility layer"
else
  echo "⚠️ app/globals.css does not import legacy compatibility layer"
fi

for n in 01 02 03 04 05 06 07 08 09 10; do
  file="styles/global/legacy/legacy-${n}.css"
  if [ -f "$file" ]; then
    echo "✅ present: $file"
  else
    echo "❌ missing: $file"
  fi
  if grep -q "./legacy/legacy-${n}.css" styles/global/paymydine-legacy-globals.css 2>/dev/null; then
    echo "✅ imported: legacy-${n}.css"
  else
    echo "❌ not imported: legacy-${n}.css"
  fi
done

echo ""
echo "=== Risky broad selector samples ==="
{ grep -RInE '^\s*(\*|html|body|button|div|span|\.surface|\.card|\[data-theme\]|html\[data-theme)' styles/global/legacy 2>/dev/null || true; } | sed -n '1,120p'

echo ""
echo "=== Scoped migration candidate samples ==="
{ grep -RInE 'data-pmd|kazen|checkout|payment|cart-badge|pmd-v2-action|PMD_' styles/global/paymydine-legacy-globals.css styles/global/legacy 2>/dev/null || true; } | sed -n '1,160p'

echo ""
echo "=== Recommended next action ==="
echo "Keep the legacy import active. Migrate one scoped selector group at a time, then remove only that migrated block."
