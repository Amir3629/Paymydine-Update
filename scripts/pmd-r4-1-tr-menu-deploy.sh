#!/usr/bin/env bash
set -euo pipefail

SHA="${1:-}"
ROOT="${2:-/var/www/paymydine}"

if [ -z "$SHA" ]; then
  echo "Usage: $0 <git-commit-sha> [root]" >&2
  exit 2
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}/scripts"
PATCH="/tmp/pmd-r4-1-tr-menu-repair.php"
EXPECTED='8bcddaf9956bdc0e94129182928c24fc20d17b47'

rm -f "$PATCH"

echo
echo '======================================================'
echo '1/6 DOWNLOAD + VERIFY R4.1'
echo '======================================================'
curl -fL --retry 3 --connect-timeout 20 \
  "${BASE}/pmd-r4-1-tr-menu-repair.php" \
  -o "$PATCH"

actual="$(git hash-object "$PATCH")"
echo "Expected patch blob: $EXPECTED"
echo "Actual patch blob:   $actual"
if [ "$actual" != "$EXPECTED" ]; then
  echo 'ERROR: R4.1 patch blob mismatch.' >&2
  exit 20
fi

if grep -n 'ELLIPSIZATION' "$PATCH"; then
  echo 'ERROR: truncation marker detected.' >&2
  exit 21
fi

php -l "$PATCH"

echo
echo '======================================================'
echo '2/6 APPLY R4.1 TO CURRENT VPS SOURCE'
echo '======================================================'
cd "$ROOT"
sudo php "$PATCH" --root="$ROOT"

echo
echo '======================================================'
echo '3/6 SOURCE SYNTAX CHECKS'
echo '======================================================'
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php -l app/admin/i18n/platform/tr.php

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-settings-polish-r4.js
  node --check app/admin/assets/js/pmd-menu-runtime-stability.js
  node --check app/admin/assets/js/smooth-transitions.js
fi

echo
echo '======================================================'
echo '4/6 LANGUAGE + STRUCTURE AUDIT'
echo '======================================================'
php scripts/pmd-audit-platform-i18n.php

php -r '
$tr = require "app/admin/i18n/platform/tr.php";
$bad = array_values(array_filter(array_keys($tr), static fn($key) => str_starts_with((string)$key, "literal::r4.")));
if ($bad) {
    fwrite(STDERR, "ERROR: misplaced literal R4 keys remain:\n - ".implode("\n - ", $bad)."\n");
    exit(1);
}
foreach ([
    "r4.devices.overview_help",
    "r4.devices.kitchen_help",
    "r4.devices.cash_drawer_help",
    "menu.manager.title",
    "menu.manager.kitchen_capacity",
    "menu.manager.food_attributes",
] as $key) {
    if (!isset($tr[$key])) {
        fwrite(STDERR, "ERROR: missing Turkish canonical key: {$key}\n");
        exit(1);
    }
    echo $key." => ".$tr[$key].PHP_EOL;
}
'

echo
echo '======================================================'
echo '5/6 CLEAR COMPILED VIEWS'
echo '======================================================'
sudo -u www-data php artisan view:clear

echo
echo '======================================================'
echo '6/6 VERIFY R4.1 MARKERS'
echo '======================================================'
grep -n 'PMD_R4_1_TR_CANONICAL_REPAIR' app/admin/i18n/platform/tr.php
grep -n 'PMD_MENU_FULL_DOCUMENT_NAV_R4_1' app/admin/assets/js/smooth-transitions.js
grep -n 'PMD_MENU_SERVER_I18N_R4_1' app/admin/views/pmdmenus/index.blade.php
grep -n 'PMD_MENU_RUNTIME_CATALOGUE_COPY_R4_1' app/admin/assets/js/pmd-menu-runtime-stability.js
grep -n 'PMD_SETTINGS_POLISH_LATE_I18N_R4_1' app/admin/assets/js/pmd-settings-polish-r4.js

echo
echo '======================================================'
echo 'R4.1 TURKISH + MENU REPAIR COMPLETE'
echo '======================================================'
echo 'Expected canonical parity after this patch: 1856 / 1856 / 1856.'
echo 'Menu navigation now uses a full document load, not the legacy AJAX transition.'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
