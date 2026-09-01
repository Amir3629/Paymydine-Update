#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"
PATCH='/tmp/pmd-r9-v2-header-only.php'
EXPECTED_PATCH='3217bfab625d0559e5ad092431592a484fcbd12d'
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}/scripts"

cd "$ROOT"

printf '\n======================================================\n'
printf '1/6 DOWNLOAD + VERIFY R9 V2 HEADER-ONLY HOTFIX\n'
printf '======================================================\n'
rm -f "$PATCH"
curl -fL --retry 3 --connect-timeout 20 \
  "$BASE/pmd-r9-v2-header-only.php" \
  -o "$PATCH"

ACTUAL="$(git hash-object "$PATCH")"
echo "Expected patch blob: $EXPECTED_PATCH"
echo "Actual patch blob:   $ACTUAL"
if [ "$ACTUAL" != "$EXPECTED_PATCH" ]; then
  echo 'ERROR: R9 V2 patch blob mismatch.'
  exit 20
fi

if grep -q 'ELLIPSIZATION' "$PATCH"; then
  echo 'ERROR: truncation marker found in R9 V2 patch.'
  exit 21
fi

php -l "$PATCH"

printf '\n======================================================\n'
printf '2/6 APPLY R9 V2 AGAINST CURRENT VPS SOURCE\n'
printf '======================================================\n'
sudo php "$PATCH" --root="$ROOT"

printf '\n======================================================\n'
printf '3/6 JAVASCRIPT SYNTAX CHECK\n'
printf '======================================================\n'
if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-admin-header-actions.js
else
  echo 'Node is unavailable; JS syntax check skipped.'
fi

printf '\n======================================================\n'
printf '4/6 CANONICAL LANGUAGE AUDIT\n'
printf '======================================================\n'
php scripts/pmd-audit-platform-i18n.php

printf '\n======================================================\n'
printf '5/6 CLEAR COMPILED VIEWS\n'
printf '======================================================\n'
php artisan view:clear

printf '\n======================================================\n'
printf '6/6 VERIFY R9 V2 MARKER\n'
printf '======================================================\n'
grep -n 'PMD_HEADER_CANONICAL_TOOLTIPS_R9_V2' app/admin/assets/js/pmd-admin-header-actions.js

echo
printf '======================================================\n'
printf 'R9 V2 HEADER-ONLY CANONICAL I18N COMPLETE\n'
printf '======================================================\n'
echo 'Only pmd-admin-header-actions.js was changed.'
echo 'Shared pmd-admin-i18n-v1.js was not changed.'
echo 'Canonical language files were not changed.'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
