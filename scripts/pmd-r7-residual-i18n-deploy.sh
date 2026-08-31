#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"
PATCH='/tmp/pmd-r7-residual-i18n-hotfix.php'
EXPECTED_PATCH='550c25d5b31e2823f967a68502a2241f9d8658ea'
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}/scripts"

cd "$ROOT"

printf '\n======================================================\n'
printf '1/6 DOWNLOAD + VERIFY R7 RESIDUAL I18N HOTFIX\n'
printf '======================================================\n'
rm -f "$PATCH"
curl -fL --retry 3 --connect-timeout 20 \
  "${BASE}/pmd-r7-residual-i18n-hotfix.php" \
  -o "$PATCH"

ACTUAL_PATCH="$(git hash-object "$PATCH")"
printf 'Expected patch blob: %s\n' "$EXPECTED_PATCH"
printf 'Actual patch blob:   %s\n' "$ACTUAL_PATCH"
if [ "$ACTUAL_PATCH" != "$EXPECTED_PATCH" ]; then
  echo 'ERROR: R7 patch blob mismatch.'
  exit 20
fi
php -l "$PATCH"

printf '\n======================================================\n'
printf '2/6 APPLY R7 AGAINST CURRENT VPS SOURCE\n'
printf '======================================================\n'
sudo php "$PATCH" --root="$ROOT"

printf '\n======================================================\n'
printf '3/6 CHECK NEW R7 ASSETS\n'
printf '======================================================\n'
grep -n 'PMD_ADMIN_I18N_RESIDUAL_R7' \
  app/admin/assets/css/pmd-admin-i18n-residual-r7.css \
  app/admin/assets/js/pmd-admin-i18n-residual-r7.js

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-admin-i18n-residual-r7.js
else
  echo 'Node not installed; skipping JS parser check.'
fi

php -r '
  $m = json_decode(file_get_contents("app/admin/views/_meta/assets.json"), true, 512, JSON_THROW_ON_ERROR);
  $styles = array_column($m["style"] ?? [], "path");
  $scripts = array_column($m["script"] ?? [], "path");
  foreach ([
    "css/pmd-admin-i18n-residual-r7.css" => $styles,
    "js/pmd-admin-i18n-residual-r7.js" => $scripts,
  ] as $needle => $haystack) {
    if (!in_array($needle, $haystack, true)) {
      fwrite(STDERR, "Missing R7 asset in manifest: {$needle}\n");
      exit(1);
    }
  }
  echo "R7 asset manifest: OK\n";
'

printf '\n======================================================\n'
printf '4/6 CANONICAL LANGUAGE AUDIT\n'
printf '======================================================\n'
php scripts/pmd-audit-platform-i18n.php

printf '\n======================================================\n'
printf '5/6 CLEAR COMPILED VIEWS\n'
printf '======================================================\n'
sudo -u www-data php artisan view:clear

printf '\n======================================================\n'
printf '6/6 FINAL R7 VERIFICATION\n'
printf '======================================================\n'
php -r '
  foreach (["en", "de", "tr"] as $locale) {
    $path = "app/admin/i18n/platform/{$locale}.php";
    $data = require $path;
    echo strtoupper($locale)." canonical entries: ".count($data).PHP_EOL;
  }
'

echo
echo 'R7 RESIDUAL ADMIN I18N COMPLETE'
echo 'Canonical language files were not changed.'
echo 'Legacy CSS-generated English Settings copy is overridden by localized DOM text.'
echo 'Header/report aria-label and tooltip attributes are re-localized after late runtime writes.'
echo 'No tenant/payment/currency/order/reservation/business data was changed.'
echo
echo 'After hard refresh, rerun:'
echo 'await window.PMDAdminI18nCrawlerR6.run()'
