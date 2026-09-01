#!/usr/bin/env bash
set -euo pipefail

SHA="${1:-}"
ROOT="${2:-/var/www/paymydine}"

if [[ -z "$SHA" ]]; then
  echo "Usage: $0 <immutable-github-sha> [root]" >&2
  exit 2
fi

RAW_HOST='raw.githubusercontent.com'
BASE="https://${RAW_HOST}/Amir3629/Paymydine-Update/${SHA}"
WORK="$(mktemp -d)"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/oman-admin-ar-r1-${STAMP}"
trap 'rm -rf "$WORK"' EXIT

FILES=(
  'app/admin/i18n/platform/ar.php'
  'app/admin/views/_partials/pmd_admin_i18n.blade.php'
  'scripts/pmd-sync-oman-admin-language-r1.php'
)

EXPECTED=(
  '151082954cfa20cd063ea42cd09d21a2e18b64ae'
  'd54ee31746204df4dde33fd23349c7da13805802'
  '46d172a624252ea4499c95cd93e483918a798e1e'
)

echo '======================================================'
echo '1/7 DOWNLOAD + VERIFY OMAN ADMIN ARABIC R1'
echo '======================================================'
for i in "${!FILES[@]}"; do
  file="${FILES[$i]}"
  expected="${EXPECTED[$i]}"
  mkdir -p "$WORK/$(dirname "$file")"
  curl -fL --retry 3 --connect-timeout 20 "${BASE}/${file}" -o "$WORK/$file"
  actual="$(git hash-object "$WORK/$file")"
  echo "$file"
  echo "  expected: $expected"
  echo "  actual:   $actual"
  [[ "$actual" == "$expected" ]] || { echo "ERROR: blob mismatch: $file" >&2; exit 20; }
done

echo '======================================================'
echo '2/7 PREFLIGHT SYNTAX + CANONICAL ARABIC PARITY'
echo '======================================================'
php -l "$WORK/app/admin/i18n/platform/ar.php"
php -l "$WORK/scripts/pmd-sync-oman-admin-language-r1.php"
php -r '$en=require $argv[1]; $ar=require $argv[2]; $missing=array_diff(array_keys($en),array_keys($ar)); if($missing){fwrite(STDERR,"Arabic canonical missing keys: ".count($missing).PHP_EOL); exit(31);} echo "Arabic canonical key parity: ".count($en).PHP_EOL;' \
  "$ROOT/app/admin/i18n/platform/en.php" \
  "$WORK/app/admin/i18n/platform/ar.php"

echo '======================================================'
echo '3/7 BACKUP + INSTALL ONLY ADMIN LANGUAGE SOURCE'
echo '======================================================'
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [[ -f "$ROOT/$file" ]]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$ROOT/$file" "$BACKUP/$file"
  fi
  mkdir -p "$ROOT/$(dirname "$file")"
  install -m 0644 "$WORK/$file" "$ROOT/$file"
done
chmod +x "$ROOT/scripts/pmd-sync-oman-admin-language-r1.php"
echo "Backup: $BACKUP"

echo '======================================================'
echo '4/7 PLATFORM I18N AUDIT'
echo '======================================================'
cd "$ROOT"
php scripts/pmd-audit-platform-i18n.php

echo '======================================================'
echo '5/7 OMAN ADMIN LANGUAGE DRY-RUN'
echo '======================================================'
php scripts/pmd-sync-oman-admin-language-r1.php

echo '======================================================'
echo '6/7 APPLY + VERIFY OMAN ADMIN ENGLISH / ARABIC'
echo '======================================================'
php scripts/pmd-sync-oman-admin-language-r1.php --apply

echo '======================================================'
echo '7/7 CLEAR VIEWS + FINAL MARKERS'
echo '======================================================'
sudo -u www-data php artisan view:clear

grep -n 'PMD_ADMIN_DYNAMIC_LOCALE_REGISTRY_AR_R1' app/admin/views/_partials/pmd_admin_i18n.blade.php
grep -n 'PMD_ADMIN_RTL_AR_R1' app/admin/views/_partials/pmd_admin_i18n.blade.php
grep -n 'PMD_OMAN_ADMIN_AR_R1' app/admin/i18n/platform/ar.php

echo '======================================================'
echo 'OMAN ADMIN ARABIC R1 COMPLETE'
echo '======================================================'
echo 'Oman Admin language registry: English + Arabic; English remains default.'
echo 'Arabic Admin document direction: RTL.'
echo 'Canonical PMD Arabic catalogue is installed with safe English fallback for untranslated PMD strings.'
echo 'No payment/currency/order/reservation/menu/category/business data was changed.'
echo "Backup: $BACKUP"
