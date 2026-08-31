#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"

SCHEME='https'
HOST='raw.githubusercontent.com'
BASE="${SCHEME}://${HOST}/Amir3629/Paymydine-Update/${SHA}/scripts"
PATCH='/tmp/pmd-r5-canonical-ui-hotfix.php'
EXPECTED_PATCH='594a5b5e116236b591ba26077add38c30badfdd3'

cd "$ROOT" || exit 1

echo
echo '======================================================'
echo '1/7 DOWNLOAD + VERIFY R5 CANONICAL UI HOTFIX'
echo '======================================================'
rm -f "$PATCH"
curl -fL --retry 3 --connect-timeout 20 \
  "${BASE}/pmd-r5-canonical-ui-hotfix.php" \
  -o "$PATCH"

test -s "$PATCH"

ACTUAL_PATCH="$(git hash-object "$PATCH")"
echo "Expected patch blob: $EXPECTED_PATCH"
echo "Actual patch blob:   $ACTUAL_PATCH"
if [ "$ACTUAL_PATCH" != "$EXPECTED_PATCH" ]; then
  echo 'ERROR: R5 patch blob mismatch.'
  exit 20
fi

if grep -q 'ELLIPSIZATION' "$PATCH"; then
  echo 'ERROR: R5 patch contains an ELLIPSIZATION marker.'
  exit 21
fi

php -l "$PATCH"

echo
echo '======================================================'
echo '2/7 APPLY R5 AGAINST CURRENT VPS SOURCE'
echo '======================================================'
sudo php "$PATCH" --root="$ROOT"

echo
echo '======================================================'
echo '3/7 CHECK NEW JAVASCRIPT + ASSET MANIFEST'
echo '======================================================'
if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-settings-polish-r5.js
  node --check app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js
else
  echo 'Node not installed; skipping JavaScript parser check.'
fi

php -r '
$p = "app/admin/views/_meta/assets.json";
$j = json_decode((string)file_get_contents($p), true, 512, JSON_THROW_ON_ERROR);
$paths = array_column($j["script"] ?? [], "path");
foreach (["js/pmd-settings-polish-r5.js", "js/pmd-admin-canonical-visible-audit-r5.js"] as $required) {
    if (!in_array($required, $paths, true)) {
        fwrite(STDERR, "Missing R5 asset: {$required}\n");
        exit(1);
    }
}
if (in_array("js/pmd-settings-polish-r4.js", $paths, true)) {
    fwrite(STDERR, "Old R4 Settings Polish asset is still active.\n");
    exit(1);
}
echo "R5 asset manifest: OK\n";
'

echo
echo '======================================================'
echo '4/7 CANONICAL LANGUAGE AUDIT'
echo '======================================================'
php scripts/pmd-audit-platform-i18n.php

echo
echo '======================================================'
echo '5/7 VERIFY DIRECT TURKISH R4 COPY'
echo '======================================================'
php -r '
$m = require "app/admin/i18n/platform/tr.php";
$keys = [
  "r4.devices.overview_help",
  "r4.devices.kitchen_help",
  "r4.devices.cash_drawer_help",
  "r4.settings.shown_guests",
  "r4.settings.choose_theme",
  "r4.finance.choose_pay"
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
echo '6/7 CLEAR COMPILED VIEWS'
echo '======================================================'
sudo -u www-data php artisan view:clear

echo
echo '======================================================'
echo '7/7 VERIFY R5 AUTHORITY MARKERS'
echo '======================================================'
grep -n 'PMD_SETTINGS_POLISH_R5_CANONICAL_AUTHORITY' \
  app/admin/assets/js/pmd-settings-polish-r5.js
grep -n 'PMD_SETTINGS_DIRECT_CANONICAL_I18N_R5' \
  app/admin/assets/js/pmd-settings-polish-r5.js
grep -n 'PMD_ADMIN_CANONICAL_VISIBLE_AUDIT_R5' \
  app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js
grep -n 'pmd-settings-polish-r5.js' app/admin/views/_meta/assets.json
grep -n 'pmd-admin-canonical-visible-audit-r5.js' app/admin/views/_meta/assets.json

if grep -q 'pmd-settings-polish-r4.js' app/admin/views/_meta/assets.json; then
  echo 'ERROR: old R4 Settings Polish asset remains in manifest.'
  exit 1
fi

echo
echo '======================================================'
echo 'R5 CANONICAL UI AUTHORITY COMPLETE'
echo '======================================================'
echo 'R4 Settings Polish is retired from the asset manifest.'
echo 'R5 reads all 21 short Settings/Devices/Finance/Team strings by canonical key.'
echo 'A new full-catalogue visible-English audit is active.'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
echo
echo 'After a normal refresh, run in the browser console:'
echo 'window.PMDAdminCoverageR3.audit()'
