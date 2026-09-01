#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"
PATCH='/tmp/pmd-r8-final-residual-hotfix.php'
EXPECTED_PATCH='158286b911b968776b4c87c26085b171a049bf78'
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}/scripts"

cd "$ROOT"

printf '\n======================================================\n'
printf '1/7 DOWNLOAD + VERIFY R8 FINAL RESIDUAL HOTFIX\n'
printf '======================================================\n'
rm -f "$PATCH"
curl -fL --retry 3 --connect-timeout 20 \
  "$BASE/pmd-r8-final-residual-hotfix.php" \
  -o "$PATCH"

ACTUAL="$(git hash-object "$PATCH")"
echo "Expected patch blob: $EXPECTED_PATCH"
echo "Actual patch blob:   $ACTUAL"
if [ "$ACTUAL" != "$EXPECTED_PATCH" ]; then
  echo 'ERROR: R8 patch blob mismatch.'
  exit 20
fi

if grep -q 'ELLIPSIZATION' "$PATCH"; then
  echo 'ERROR: truncation marker found in R8 patch.'
  exit 21
fi

php -l "$PATCH"

printf '\n======================================================\n'
printf '2/7 APPLY R8 TO CURRENT VPS SOURCE\n'
printf '======================================================\n'
sudo php "$PATCH" --root="$ROOT"

printf '\n======================================================\n'
printf '3/7 CHECK R8 JAVASCRIPT + MANIFEST\n'
printf '======================================================\n'
if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-admin-i18n-residual-r8.js
else
  echo 'Node not installed; JS parser check skipped.'
fi

php -r '
  $m = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
  $hits = array_values(array_filter($m["script"] ?? [], static function ($e) {
      return is_array($e) && (($e["name"] ?? "") === "pmd-admin-i18n-residual-r8-js") && (($e["path"] ?? "") === "js/pmd-admin-i18n-residual-r8.js");
  }));
  if (count($hits) !== 1) { fwrite(STDERR, "ERROR: R8 manifest authority count is not 1\n"); exit(1); }
  echo "R8 asset manifest: OK\n";
' app/admin/views/_meta/assets.json

printf '\n======================================================\n'
printf '4/7 VERIFY ROOT AUTHORITIES\n'
printf '======================================================\n'
grep -n 'PMD_R8_SETTINGS_TOOLTIP_SERVER_I18N' app/admin/views/_partials/top_settings_menu.blade.php
grep -n 'PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL' app/admin/assets/css/pmd-settings-polish-r10.css | head
grep -n 'PMD_R8_CUSTOMER_MENU_TITLE_CANONICAL' app/admin/assets/css/pmd-settings-polish-r11.css
grep -n 'PMD_ADMIN_I18N_RESIDUAL_R8' app/admin/assets/js/pmd-admin-i18n-residual-r8.js | head

if grep -nE 'content:[[:space:]]*"(Customer menu theme|Choose the look of your digital menu\.|Choose a theme for your digital menu\.)"' \
  app/admin/assets/css/pmd-settings-polish-r10.css \
  app/admin/assets/css/pmd-settings-polish-r11.css; then
  echo 'ERROR: hard-coded Customer Menu English pseudo-copy still remains in R10/R11.'
  exit 30
fi
echo 'Customer Menu hard-coded pseudo English: removed'

printf '\n======================================================\n'
printf '5/7 CANONICAL LANGUAGE AUDIT\n'
printf '======================================================\n'
php scripts/pmd-audit-platform-i18n.php

printf '\n======================================================\n'
printf '6/7 CLEAR COMPILED VIEWS\n'
printf '======================================================\n'
sudo -u www-data php artisan view:clear

printf '\n======================================================\n'
printf '7/7 FINAL R8 STATUS\n'
printf '======================================================\n'
echo 'R8 FINAL RESIDUAL I18N COMPLETE'
echo 'Canonical language files were not changed.'
echo 'The 23 R7 crawler leftovers are reduced to four direct authorities:'
echo '  - reports.ui.bar attributes'
echo '  - nav.settings header tooltip'
echo '  - Customer menu title pseudo-copy'
echo '  - Customer menu helper pseudo-copy'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
echo
echo 'After hard refresh, first run:'
echo 'window.PMDAdminResidualI18nR8.inspect()'
echo
echo 'Then run the full crawler once:'
echo 'await window.PMDAdminI18nCrawlerR6.run()'
