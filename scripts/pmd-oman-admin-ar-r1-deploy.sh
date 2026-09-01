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
  'd23af21fdef807ba030833ee858e24cc17cd4071'
  'd54ee31746204df4dde33fd23349c7da13805802'
  '46d172a624252ea4499c95cd93e483918a798e1e'
)

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=()
  RUN_AS_WWW=(sudo -u www-data)
else
  command -v sudo >/dev/null 2>&1 || {
    echo 'ERROR: sudo is required to write the live PayMyDine source tree.' >&2
    exit 3
  }
  # Never request an interactive password. The VPS already permits the specific
  # deployment commands used by the established PayMyDine wrappers. If that
  # policy is unavailable, fail immediately instead of prompting the operator.
  SUDO=(sudo -n)
  RUN_AS_WWW=(sudo -n -u www-data)
fi

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
echo '2/7 PREFLIGHT SYNTAX + STAGED PLATFORM I18N AUDIT'
echo '======================================================'
php -l "$WORK/app/admin/i18n/platform/ar.php"
php -l "$WORK/scripts/pmd-sync-oman-admin-language-r1.php"

# Audit the candidate Arabic catalogue BEFORE touching live source. Mirror the
# currently installed non-Arabic catalogues and audit script into the temp root,
# while keeping the downloaded Arabic file as the staged candidate.
mkdir -p "$WORK/scripts" "$WORK/app/admin/i18n/platform"
cp "$ROOT/scripts/pmd-audit-platform-i18n.php" "$WORK/scripts/pmd-audit-platform-i18n.php"
for locale_file in "$ROOT"/app/admin/i18n/platform/*.php; do
  locale_name="$(basename "$locale_file")"
  [[ "$locale_name" == 'ar.php' ]] && continue
  cp "$locale_file" "$WORK/app/admin/i18n/platform/$locale_name"
done
php "$WORK/scripts/pmd-audit-platform-i18n.php"

echo '======================================================'
echo '3/7 BACKUP + INSTALL ONLY ADMIN LANGUAGE SOURCE'
echo '======================================================'
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [[ -f "$ROOT/$file" ]]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$ROOT/$file" "$BACKUP/$file"
  fi
  "${SUDO[@]}" install -d -m 0755 "$ROOT/$(dirname "$file")"
  "${SUDO[@]}" install -m 0644 "$WORK/$file" "$ROOT/$file"
done
"${SUDO[@]}" chmod +x "$ROOT/scripts/pmd-sync-oman-admin-language-r1.php"
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
"${RUN_AS_WWW[@]}" php artisan view:clear

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
