#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"

SCHEME='https'
HOST='raw.githubusercontent.com'
BASE="${SCHEME}://${HOST}/Amir3629/Paymydine-Update/${SHA}/scripts"
PATCH='/tmp/pmd-r6-admin-i18n-crawler-hotfix.php'
EXPECTED_PATCH='93fcee6602631456644ba4e4a6f7097361b3b062'

cd "$ROOT" || exit 1

echo
echo '======================================================'
echo '1/8 DOWNLOAD + VERIFY R6 HOTFIX'
echo '======================================================'
rm -f "$PATCH"
curl -fL --retry 3 --connect-timeout 20 \
  "${BASE}/pmd-r6-admin-i18n-crawler-hotfix.php" \
  -o "$PATCH"

test -s "$PATCH"
ACTUAL_PATCH="$(git hash-object "$PATCH")"
echo "Expected patch blob: $EXPECTED_PATCH"
echo "Actual patch blob:   $ACTUAL_PATCH"
if [ "$ACTUAL_PATCH" != "$EXPECTED_PATCH" ]; then
  echo 'ERROR: R6 patch blob mismatch.'
  exit 20
fi
if grep -q 'ELLIPSIZATION' "$PATCH"; then
  echo 'ERROR: R6 patch contains an ELLIPSIZATION marker.'
  exit 21
fi
php -l "$PATCH"

echo
echo '======================================================'
echo '2/8 APPLY R6 AGAINST CURRENT VPS SOURCE'
echo '======================================================'
sudo php "$PATCH" --root="$ROOT"

echo
echo '======================================================'
echo '3/8 PHP + JAVASCRIPT CHECKS'
echo '======================================================'
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php -l app/admin/i18n/platform/tr.php

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-settings-polish-r6.js
  node --check app/admin/assets/js/pmd-settings-stable-r10.js
  node --check app/admin/assets/js/pmd-admin-i18n-crawler-r6.js
  node --check app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js
else
  echo 'Node not installed; skipping JavaScript parser checks.'
fi

echo
echo '======================================================'
echo '4/8 ASSET AUTHORITY CHECK'
echo '======================================================'
php -r '
$p = "app/admin/views/_meta/assets.json";
$j = json_decode((string)file_get_contents($p), true, 512, JSON_THROW_ON_ERROR);
$paths = array_column($j["script"] ?? [], "path");
$required = [
  "js/pmd-settings-polish-r6.js",
  "js/pmd-settings-stable-r10.js",
  "js/pmd-admin-canonical-visible-audit-r5.js",
  "js/pmd-admin-i18n-crawler-r6.js"
];
foreach ($required as $path) {
  if (!in_array($path, $paths, true)) {
    fwrite(STDERR, "Missing active R6/R5 asset: {$path}\n");
    exit(1);
  }
}
foreach (["js/pmd-settings-polish-r5.js", "js/pmd-settings-stable-r9.js"] as $retired) {
  if (in_array($retired, $paths, true)) {
    fwrite(STDERR, "Retired authority still active: {$retired}\n");
    exit(1);
  }
}
echo "R6 asset authority: OK\n";
'

echo
echo '======================================================'
echo '5/8 CANONICAL LANGUAGE AUDIT'
echo '======================================================'
php scripts/pmd-audit-platform-i18n.php

echo
echo '======================================================'
echo '6/8 VERIFY TURKISH FRONTEND SETTINGS COPY'
echo '======================================================'
php -r '
$m = require "app/admin/i18n/platform/tr.php";
$keys = [
  "r3.customer_menu_theme",
  "r4.settings.choose_look",
  "r4.settings.choose_theme",
  "settings.frontend.save_theme",
  "settings.frontend.theme_single_help",
  "settings.frontend.languages_help",
  "settings.frontend.qr_journey_help",
  "settings.frontend.theme_type.fine_dining",
  "settings.frontend.theme_type.persian_fine_dining",
  "settings.frontend.theme_type.steakhouse"
];
foreach ($keys as $key) {
  if (!isset($m[$key]) || !is_string($m[$key]) || trim($m[$key]) === "") {
    fwrite(STDERR, "Missing Turkish canonical value: {$key}\n");
    exit(1);
  }
  echo $key." => ".$m[$key]."\n";
}
'

echo
echo '======================================================'
echo '7/8 CLEAR COMPILED VIEWS'
echo '======================================================'
sudo -u www-data php artisan view:clear

echo
echo '======================================================'
echo '8/8 VERIFY R6 MARKERS'
echo '======================================================'
grep -n 'PMD_FRONTEND_SETTINGS_SERVER_I18N_R6' app/admin/views/pmdsettings/frontend.blade.php
grep -n 'PMD_SETTINGS_POLISH_R6_CLEAN_ROUTE_AUTHORITY' app/admin/assets/js/pmd-settings-polish-r6.js
grep -n 'PMD_SETTINGS_CLEAN_ROUTE_NORMALIZER_R6' app/admin/assets/js/pmd-settings-polish-r6.js
grep -n 'PMD_SETTINGS_STABLE_R10_CANONICAL_AUTHORITY' app/admin/assets/js/pmd-settings-stable-r10.js
grep -n 'PMD_SETTINGS_STABLE_CANONICAL_COPY_R10' app/admin/assets/js/pmd-settings-stable-r10.js
grep -n 'PMD_ADMIN_I18N_CRAWLER_R6' app/admin/assets/js/pmd-admin-i18n-crawler-r6.js

echo
echo '======================================================'
echo 'R6 ADMIN I18N AUTHORITY + CRAWLER COMPLETE'
echo '======================================================'
echo 'Old Settings R5/R9 authorities are retired from the asset manifest.'
echo 'Frontend Settings clean routes and internal routes now share one locale path.'
echo 'Authenticated multi-page audit is available from one console command:'
echo 'await window.PMDAdminI18nCrawlerR6.run()'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
