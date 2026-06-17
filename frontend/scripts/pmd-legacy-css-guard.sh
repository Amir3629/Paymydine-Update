#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0

fail() { echo "❌ $1"; failures=$((failures + 1)); }
pass() { echo "✅ $1"; }

if grep -q '../styles/global/paymydine-legacy-globals.css' app/globals.css; then
  pass "app/globals.css keeps the active legacy compatibility import"
else
  fail "app/globals.css no longer imports ../styles/global/paymydine-legacy-globals.css; this broke live visuals before"
fi

[ -f styles/global/paymydine-legacy-globals.css ] && pass "paymydine-legacy-globals.css exists" || fail "styles/global/paymydine-legacy-globals.css missing"

for n in 01 02 03 04 05 06 07 08 09 10; do
  file="styles/global/legacy/legacy-${n}.css"
  [ -f "$file" ] && pass "present: $file" || fail "missing: $file"
  if grep -q "./legacy/legacy-${n}.css" styles/global/paymydine-legacy-globals.css 2>/dev/null; then
    pass "imported: legacy-${n}.css"
  else
    fail "not imported by paymydine-legacy-globals.css: legacy-${n}.css"
  fi
done

for file in \
  styles/customer/actions/action-controls-compat.css \
  styles/customer/checkout/checkout-theme-compat.css \
  styles/customer/themes/kazen-menu-compat.css
do
  [ -f "$file" ] && pass "present: extracted scoped compat file: $file" || fail "missing extracted scoped compat file: $file"
done

if grep -q '../customer/actions/action-controls-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported: action-controls-compat.css"
else
  fail "action-controls-compat.css not imported by paymydine-legacy-globals.css"
fi

if grep -q '../customer/checkout/checkout-theme-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported: checkout-theme-compat.css"
else
  fail "checkout-theme-compat.css not imported by paymydine-legacy-globals.css"
fi

if grep -q '../customer/themes/kazen-menu-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported: kazen-menu-compat.css"
else
  fail "kazen-menu-compat.css not imported by paymydine-legacy-globals.css"
fi

legacy03_lines=$(wc -l < styles/global/legacy/legacy-03.css 2>/dev/null | tr -d ' ' || echo 0)
echo "legacy-03.css lines after Phase 6C extraction: ${legacy03_lines:-0}"
if [ "${legacy03_lines:-0}" -gt 120 ]; then
  fail "legacy-03.css still contains too many rules; Phase 6C extraction may have been reverted"
else
  pass "legacy-03.css reduced to migration marker"
fi

legacy10_lines=$(wc -l < styles/global/legacy/legacy-10.css 2>/dev/null | tr -d ' ' || echo 0)
echo "legacy-10.css lines after Phase 6B extraction: ${legacy10_lines:-0}"
if [ "${legacy10_lines:-0}" -gt 120 ]; then
  fail "legacy-10.css still contains too many rules; Phase 6B extraction may have been reverted"
else
  pass "legacy-10.css reduced to migration marker"
fi

[ -f docs/LEGACY_CSS_COMPATIBILITY_LAYER.md ] && pass "legacy CSS cleanup documentation exists" || fail "docs/LEGACY_CSS_COMPATIBILITY_LAYER.md missing"
[ -f styles/global/legacy/README.md ] && pass "legacy folder README exists" || fail "styles/global/legacy/README.md missing"

if grep -q 'Do not remove the whole legacy folder at once' docs/LEGACY_CSS_COMPATIBILITY_LAYER.md 2>/dev/null; then
  pass "documentation warns against one-shot legacy CSS removal"
else
  fail "legacy CSS docs missing one-shot removal warning"
fi

legacy_lines=$(find styles/global/legacy -type f -name '*.css' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
echo "legacy CSS total lines: ${legacy_lines:-0}"

if [ "${legacy_lines:-0}" -lt 10000 ]; then
  fail "legacy CSS line count unexpectedly low; keep broad compatibility until migrated block-by-block"
else
  pass "broad legacy CSS compatibility layer still present while Phase 6C extracted scoped rules"
fi

if [ "$failures" -ne 0 ]; then
  echo "❌ legacy CSS guard failed with $failures issue(s)"
  exit 1
fi

echo "✅ legacy CSS guard passed"
