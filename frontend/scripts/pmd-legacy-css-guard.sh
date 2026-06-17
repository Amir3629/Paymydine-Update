#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0
fail() { echo "❌ $1"; failures=$((failures + 1)); }
pass() { echo "✅ $1"; }

if grep -q '../styles/global/paymydine-legacy-globals.css' app/globals.css; then
  pass "app/globals.css keeps the structured compatibility import"
else
  fail "app/globals.css no longer imports ../styles/global/paymydine-legacy-globals.css"
fi

[ -f styles/global/paymydine-legacy-globals.css ] && pass "paymydine-legacy-globals.css exists" || fail "styles/global/paymydine-legacy-globals.css missing"

for n in 01 02 03 04 05 06 07 08 09 10; do
  file="styles/global/legacy/legacy-${n}.css"
  [ -f "$file" ] && pass "present marker: $file" || fail "missing marker: $file"
  if grep -q "./legacy/legacy-${n}.css" styles/global/paymydine-legacy-globals.css 2>/dev/null; then
    pass "imported marker: legacy-${n}.css"
  else
    fail "not imported by paymydine-legacy-globals.css: legacy-${n}.css"
  fi
  lines=$(wc -l < "$file" 2>/dev/null | tr -d ' ' || echo 999)
  echo "legacy-${n}.css marker lines: ${lines:-999}"
  if [ "${lines:-999}" -gt 80 ]; then
    fail "legacy-${n}.css still contains broad CSS; Phase 6D extraction expected marker-only files"
  fi
done

if [ -f styles/customer/core/base-theme-tokens-compat.css ]; then
  pass "present structured CSS: styles/customer/core/base-theme-tokens-compat.css"
else
  fail "missing structured CSS: styles/customer/core/base-theme-tokens-compat.css"
fi
if grep -q '../customer/core/base-theme-tokens-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/core/base-theme-tokens-compat.css"
else
  fail "not imported structured CSS: styles/customer/core/base-theme-tokens-compat.css"
fi
if [ -f styles/customer/core/global-visual-compat.css ]; then
  pass "present structured CSS: styles/customer/core/global-visual-compat.css"
else
  fail "missing structured CSS: styles/customer/core/global-visual-compat.css"
fi
if grep -q '../customer/core/global-visual-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/core/global-visual-compat.css"
else
  fail "not imported structured CSS: styles/customer/core/global-visual-compat.css"
fi
if [ -f styles/customer/themes/shared-theme-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/shared-theme-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/shared-theme-compat.css"
fi
if grep -q '../customer/themes/shared-theme-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/shared-theme-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/shared-theme-compat.css"
fi
if [ -f styles/customer/themes/clean-light-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/clean-light-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/clean-light-compat.css"
fi
if grep -q '../customer/themes/clean-light-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/clean-light-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/clean-light-compat.css"
fi
if [ -f styles/customer/themes/modern-dark-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/modern-dark-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/modern-dark-compat.css"
fi
if grep -q '../customer/themes/modern-dark-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/modern-dark-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/modern-dark-compat.css"
fi
if [ -f styles/customer/themes/gold-luxury-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/gold-luxury-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/gold-luxury-compat.css"
fi
if grep -q '../customer/themes/gold-luxury-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/gold-luxury-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/gold-luxury-compat.css"
fi
if [ -f styles/customer/themes/vibrant-colors-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/vibrant-colors-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/vibrant-colors-compat.css"
fi
if grep -q '../customer/themes/vibrant-colors-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/vibrant-colors-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/vibrant-colors-compat.css"
fi
if [ -f styles/customer/themes/minimal-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/minimal-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/minimal-compat.css"
fi
if grep -q '../customer/themes/minimal-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/minimal-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/minimal-compat.css"
fi
if [ -f styles/customer/themes/light-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/light-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/light-compat.css"
fi
if grep -q '../customer/themes/light-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/light-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/light-compat.css"
fi
if [ -f styles/customer/actions/action-controls-compat.css ]; then
  pass "present structured CSS: styles/customer/actions/action-controls-compat.css"
else
  fail "missing structured CSS: styles/customer/actions/action-controls-compat.css"
fi
if grep -q '../customer/actions/action-controls-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/actions/action-controls-compat.css"
else
  fail "not imported structured CSS: styles/customer/actions/action-controls-compat.css"
fi
if [ -f styles/customer/modals/modal-compat.css ]; then
  pass "present structured CSS: styles/customer/modals/modal-compat.css"
else
  fail "missing structured CSS: styles/customer/modals/modal-compat.css"
fi
if grep -q '../customer/modals/modal-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/modals/modal-compat.css"
else
  fail "not imported structured CSS: styles/customer/modals/modal-compat.css"
fi
if [ -f styles/customer/valet/valet-compat.css ]; then
  pass "present structured CSS: styles/customer/valet/valet-compat.css"
else
  fail "missing structured CSS: styles/customer/valet/valet-compat.css"
fi
if grep -q '../customer/valet/valet-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/valet/valet-compat.css"
else
  fail "not imported structured CSS: styles/customer/valet/valet-compat.css"
fi
if [ -f styles/customer/checkout/checkout-theme-compat.css ]; then
  pass "present structured CSS: styles/customer/checkout/checkout-theme-compat.css"
else
  fail "missing structured CSS: styles/customer/checkout/checkout-theme-compat.css"
fi
if grep -q '../customer/checkout/checkout-theme-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/checkout/checkout-theme-compat.css"
else
  fail "not imported structured CSS: styles/customer/checkout/checkout-theme-compat.css"
fi
if [ -f styles/customer/themes/kazen-menu-compat.css ]; then
  pass "present structured CSS: styles/customer/themes/kazen-menu-compat.css"
else
  fail "missing structured CSS: styles/customer/themes/kazen-menu-compat.css"
fi
if grep -q '../customer/themes/kazen-menu-compat.css' styles/global/paymydine-legacy-globals.css 2>/dev/null; then
  pass "imported structured CSS: styles/customer/themes/kazen-menu-compat.css"
else
  fail "not imported structured CSS: styles/customer/themes/kazen-menu-compat.css"
fi

[ -f docs/LEGACY_CSS_COMPATIBILITY_LAYER.md ] && pass "legacy CSS cleanup documentation exists" || fail "docs/LEGACY_CSS_COMPATIBILITY_LAYER.md missing"
[ -f styles/global/legacy/README.md ] && pass "legacy folder README exists" || fail "styles/global/legacy/README.md missing"

if grep -q 'Do not remove the whole legacy folder at once' docs/LEGACY_CSS_COMPATIBILITY_LAYER.md 2>/dev/null; then
  pass "documentation warns against one-shot legacy CSS removal"
else
  fail "legacy CSS docs missing one-shot removal warning"
fi

legacy_lines=$(find styles/global/legacy -type f -name '*.css' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
echo "legacy marker folder total lines: ${legacy_lines:-0}"
if [ "${legacy_lines:-999999}" -gt 900 ]; then
  fail "legacy marker folder still too large; broad rules should now live under styles/customer"
else
  pass "legacy folder reduced to marker files"
fi

structured_lines=$(find styles/customer -type f -name '*compat.css' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
echo "structured compatibility CSS total lines: ${structured_lines:-0}"
if [ "${structured_lines:-0}" -lt 10000 ]; then
  fail "structured compatibility CSS unexpectedly low; migration may have dropped rules"
else
  pass "structured compatibility CSS retained migrated visual rules"
fi

if [ "$failures" -ne 0 ]; then
  echo "❌ legacy CSS guard failed with $failures issue(s)"
  exit 1
fi

echo "✅ legacy CSS guard passed"
