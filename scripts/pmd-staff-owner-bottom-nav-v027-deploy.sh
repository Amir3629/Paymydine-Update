#!/usr/bin/env bash
# PMD_OWNER_BOTTOM_NAV_DEPLOY_V027_20261023
# Owner mobile bottom tab bar (linked + unlinked Owner).
# Exactly 3 UI-only files. No APK, database, routes, GPS or Staff clock changes.
set -Eeuo pipefail
umask 022
REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-owner-bottom-nav-v027-deploy.sh <40-hex commit>" >&2
  exit 2
fi
cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css"
  "app/admin/views/pmd-staff-portal/index_v5.blade.php"
  "app/admin/views/pmd-staff-portal/management_v1.blade.php"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/staff-owner-bottom-v027-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0
cleanup() {
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Restoring previous Owner UI files..." >&2
    for file in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$file" ]]; then
        cp -a "$BACKUP/$file" "$file"
      else
        rm -f "$file"
      fi
    done
    php artisan view:clear || true
  fi
  [[ -z "$TEMP" || ! -e "$TEMP" ]] || rm -f "$TEMP"
  rm -rf "$STAGE"
  exit "$rc"
}
trap cleanup EXIT

echo "=== 1. Check installed Staff v026 ==="
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' app/admin/views/pmd-staff-portal/index_v5.blade.php
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' app/admin/views/pmd-staff-portal/management_v1.blade.php
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' app/admin/controllers/Mywork.php

echo "=== 2. Stage and validate exactly 3 Owner UI files ==="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$file" -o "$STAGE/$file"
  test -s "$STAGE/$file"
  case "$file" in
    *.blade.php) php -l "$STAGE/$file" ;;
  esac
  echo "VALIDATED: $file"
done
grep -Fq 'PMD_OWNER_BOTTOM_NAV_V027_20261023' \
  "$STAGE/app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css"
grep -Fq 'position: fixed !important;' \
  "$STAGE/app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css"
grep -Fq "pmd-staff-owner-bottom-nav-v027.css?v=27" \
  "$STAGE/app/admin/views/pmd-staff-portal/index_v5.blade.php"
grep -Fq "pmd-staff-owner-bottom-nav-v027.css?v=27" \
  "$STAGE/app/admin/views/pmd-staff-portal/management_v1.blade.php"

echo "=== 3. Backup only the existing Owner UI files ==="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
  fi
done
echo "Backup: $BACKUP"

echo "=== 4. Install and clear views (automatic rollback) ==="
INSTALLING=1
for file in "${FILES[@]}"; do
  mkdir -p "$(dirname "$file")"
  TEMP="$(mktemp "$(dirname "$file")/.pmd-owner-bottom.XXXXXXXX")"
  if [[ -f "$file" ]]; then
    cp -a "$file" "$TEMP"
  else
    chmod 0644 "$TEMP"
  fi
  cat "$STAGE/$file" > "$TEMP"
  mv -f "$TEMP" "$file"
  TEMP=""
  cmp -s "$STAGE/$file" "$file"
  echo "UPDATED: $file"
done
php artisan view:clear
INSTALLING=0

echo "=========================================="
echo "PAYMYDINE OWNER BOTTOM NAV V027 INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "All five Owner tabs fixed to bottom at all widths."
echo "Staff regular UI, APK, clock logic and database unchanged."
echo "Close and reopen Staff Android app to refresh WebView."
echo "=========================================="
