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

MAIN='pmd-r4-devices-menu-hotfix.php'
FINAL='pmd-r4-devices-alias-finalize.php'
MAIN_BLOB='ca9a68e0102441e8c57797c1e4386d27928a3490'
FINAL_BLOB='acc5fa4a3932a0d5192276f5bd712f1bafefb74a'

fetch_and_check() {
  local file="$1"
  local expected="$2"
  curl -fL --retry 3 --connect-timeout 20 "${BASE}/${file}" -o "${WORK}/${file}"
  test -s "${WORK}/${file}"
  local actual
  actual="$(git hash-object "${WORK}/${file}")"
  echo "$file"
  echo "  expected: $expected"
  echo "  actual:   $actual"
  if [ "$actual" != "$expected" ]; then
    echo "ERROR: blob mismatch: $file" >&2
    exit 20
  fi
}

echo
echo '======================================================'
echo '1/6 DOWNLOAD + VERIFY R4'
echo '======================================================'
fetch_and_check "$MAIN" "$MAIN_BLOB"
fetch_and_check "$FINAL" "$FINAL_BLOB"

if grep -R -n 'ELLIPSIZATION' "$WORK"; then
  echo 'ERROR: truncation marker detected.' >&2
  exit 21
fi

php -l "${WORK}/${MAIN}"
php -l "${WORK}/${FINAL}"

echo
echo '======================================================'
echo '2/6 APPLY R4 DEVICES I18N + MENU RECOVERY'
echo '======================================================'
cd "$ROOT"
sudo php "${WORK}/${MAIN}" --root="$ROOT"
sudo php "${WORK}/${FINAL}" --root="$ROOT"

echo
echo '======================================================'
echo '3/6 SOURCE SYNTAX CHECKS'
echo '======================================================'
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php -l app/admin/i18n/platform/tr.php

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-settings-polish-r4.js
  node --check app/admin/assets/js/pmd-admin-coverage-r3.js
  node --check app/admin/assets/js/pmd-menu-runtime-stability.js
fi

echo
echo '======================================================'
echo '4/6 LANGUAGE AUDIT'
echo '======================================================'
php scripts/pmd-audit-platform-i18n.php

echo
echo '======================================================'
echo '5/6 CLEAR CACHE + VERIFY MARKERS'
echo '======================================================'
sudo -u www-data php artisan view:clear

grep -n 'PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4' app/admin/assets/js/pmd-settings-polish-r4.js
grep -n 'PMD_SETTINGS_DEVICES_CLEAN_ALIAS_R4' app/admin/assets/js/pmd-settings-polish-r4.js
grep -n 'PMD_DEVICES_REAL_TEXT_I18N_R4' app/admin/assets/css/pmd-devices-settings-prune-r12.css
grep -n 'PMD_ADMIN_DYNAMIC_CATALOGUE_AUDIT_R4' app/admin/assets/js/pmd-admin-coverage-r3.js
grep -n 'PMD_MENU_NO_RELOAD_R4' app/admin/assets/js/pmd-menu-runtime-stability.js

echo
echo '======================================================'
echo '6/6 VERIFY TURKISH DEVICE COPY'
echo '======================================================'
php -r '$tr=require "app/admin/i18n/platform/tr.php"; foreach (["r4.devices.overview_help","r4.devices.kitchen_help","r4.devices.cash_drawer_help"] as $k) { if (!isset($tr[$k])) {fwrite(STDERR,"Missing $k\n"); exit(1);} echo $k." => ".$tr[$k].PHP_EOL; }'

echo
echo '======================================================'
echo 'R4 DEVICES I18N + MENU RECOVERY COMPLETE'
echo '======================================================'
echo 'Hard-refresh /admin/settings/devices and /admin/menu.'
