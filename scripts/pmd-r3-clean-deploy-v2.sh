#!/usr/bin/env bash
set -euo pipefail

SHA="${1:-}"
ROOT="${2:-/var/www/paymydine}"

if [ -z "$SHA" ]; then
  echo "Usage: $0 <git-commit-sha> [root]" >&2
  exit 2
fi

BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}/scripts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

FILES=(
  pmd-r3-clean-apply.php
  pmd-r3-clean-apply-v2.php
  pmd-r3-clean-translations-1.php
  pmd-r3-clean-translations-2.php
  pmd-r3-clean-runtime.js
  pmd-r3-clean-finalize.php
)

declare -A BLOBS=(
  [pmd-r3-clean-apply.php]='3b29f774943c24839f5974f51f47c778274418a7'
  [pmd-r3-clean-apply-v2.php]='8fe27627a0f63311b188ae488ef0df0bc19cf0ed'
  [pmd-r3-clean-translations-1.php]='90f2b872be8fe6a7e86845eca7efeaad9cb6ab4b'
  [pmd-r3-clean-translations-2.php]='d0b69902c0a9ec3f4477fc070863db6a92eff1a4'
  [pmd-r3-clean-runtime.js]='fb546caea27b632b0db69a270edc0e670b4ebf0d'
  [pmd-r3-clean-finalize.php]='45fa25a0b558c4c6337d58a7217fd81573509509'
)

echo
echo '======================================================'
echo '1/7 DOWNLOAD + VERIFY R3 CLEAN V2'
echo '======================================================'
for file in "${FILES[@]}"; do
  echo "Downloading: $file"
  curl -fL --retry 3 --connect-timeout 20 "${BASE}/${file}" -o "${WORK}/${file}"
  test -s "${WORK}/${file}"

  actual="$(git hash-object "${WORK}/${file}")"
  expected="${BLOBS[$file]}"
  echo "  expected: $expected"
  echo "  actual:   $actual"
  if [ "$actual" != "$expected" ]; then
    echo "ERROR: blob mismatch: $file" >&2
    exit 20
  fi
done

if grep -R -n 'ELLIPSIZATION' "$WORK"; then
  echo 'ERROR: truncation marker detected.' >&2
  exit 21
fi

echo
echo '======================================================'
echo '2/7 STAGING SYNTAX CHECKS'
echo '======================================================'
php -l "${WORK}/pmd-r3-clean-apply.php"
php -l "${WORK}/pmd-r3-clean-apply-v2.php"
php -l "${WORK}/pmd-r3-clean-translations-1.php"
php -l "${WORK}/pmd-r3-clean-translations-2.php"
php -l "${WORK}/pmd-r3-clean-finalize.php"
if command -v node >/dev/null 2>&1; then
  node --check "${WORK}/pmd-r3-clean-runtime.js"
fi

key_count="$(php -r '$a=array_merge(require $argv[1],require $argv[2]); echo count($a);' \
  "${WORK}/pmd-r3-clean-translations-1.php" \
  "${WORK}/pmd-r3-clean-translations-2.php")"
echo "Canonical R3 keys: $key_count"
if [ "$key_count" != '128' ]; then
  echo 'ERROR: expected exactly 128 R3 keys.' >&2
  exit 22
fi

echo
echo '======================================================'
echo '3/7 APPLY R3 CLEAN V2'
echo '======================================================'
cd "$ROOT"
sudo php "${WORK}/pmd-r3-clean-apply-v2.php" --root="$ROOT"

echo
echo '======================================================'
echo '4/7 APPLY QR SERVER-FIRST FINALIZER'
echo '======================================================'
sudo php "${WORK}/pmd-r3-clean-finalize.php" --root="$ROOT"

echo
echo '======================================================'
echo '5/7 PRODUCTION SYNTAX + I18N AUDIT'
echo '======================================================'
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php -l app/admin/i18n/platform/tr.php
php -l app/admin/classes/PmdPlatformI18n.php

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-admin-coverage-r3.js
  node --check app/admin/assets/js/pmd-menu-runtime-stability.js
  node --check app/admin/assets/js/pmd-menu-all-foods-r27.js
  node --check app/admin/assets/js/pmd-menu-all-foods-r28.js
  node --check app/admin/assets/js/pmd-menu-category-guard-r26.js
  node --check app/admin/assets/js/pmd-menu-scoped-food-remove-v1.js
fi

php scripts/pmd-audit-platform-i18n.php

echo
echo '======================================================'
echo '6/7 CLEAR VIEW CACHE + VERIFY MARKERS'
echo '======================================================'
sudo -u www-data php artisan view:clear

grep -n 'PMD_ADMIN_COVERAGE_R3_CLEAN_LOADER' app/admin/views/_partials/pmd_admin_i18n.blade.php
grep -n 'PMD_ADMIN_COVERAGE_R3_CLEAN' app/admin/assets/js/pmd-admin-coverage-r3.js | head -n 3
grep -n 'PMD_MENU_CLEAN_ALIAS_R3_CLEAN' app/admin/assets/js/pmd-menu-runtime-stability.js
grep -n 'PMD_MENU_ROOT_ADOPTION_R3_CLEAN' app/admin/assets/js/pmd-menu-runtime-stability.js
grep -n 'PMD_TABLE_QR_I18N_R3_CLEAN' app/admin/views/tables/edit.blade.php
grep -n 'PMD_TABLE_QR_SERVER_I18N_R3_CLEAN' app/admin/views/tables/edit.blade.php

echo
echo '======================================================'
echo '7/7 VERIFY SCREENSHOT TRANSLATION KEY'
echo '======================================================'
php -r '$tr=require "app/admin/i18n/platform/tr.php"; $key="r3.shown_guests_menu"; if (!isset($tr[$key])) {fwrite(STDERR,"ERROR: missing $key\n"); exit(1);} echo $key." => ".$tr[$key].PHP_EOL;'

echo
echo '======================================================'
echo 'R3 CLEAN V2 DEPLOYMENT COMPLETE'
echo '======================================================'
echo 'Now hard-refresh the Turkish Admin page.'
