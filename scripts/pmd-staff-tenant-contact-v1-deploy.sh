#!/usr/bin/env bash
# PMD_STAFF_TENANT_CONTACT_DEPLOY_V1_20261023
# Scope: verified restaurant contact, compact staff GPS controls,
# read-only tenant audit. No DB writes or POS files in this installer.
set -Eeuo pipefail
REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-tenant-contact-v1-deploy.sh <40-char-GitHub-commit>" >&2
  exit 2
fi
cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "scripts/pmd-staff-tenant-location-audit-v1.php"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/tenant-contact-v1-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && INSTALLING == 1 )); then
    echo "Error during installation; restoring original files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then
        cp -a "$BACKUP/$f" "$f"
      else
        rm -f "$f"
      fi
    done
    php artisan view:clear || true
  fi
  [[ -z "$TEMP" || ! -f "$TEMP" ]] || rm -f "$TEMP"
  rm -rf "$STAGE"
  exit "$status"
}
trap cleanup EXIT

echo "=== 1. Stage and validate three scoped files ==="
test -f app/admin/controllers/Pmdsettings.php
test -f app/admin/views/pmdsettings/restaurant.blade.php
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_RESTAURANT_CONTACT_READBACK_V1_20261023' "$STAGE/app/admin/controllers/Pmdsettings.php"
grep -Fq 'PMD_PROFILE_COMPACT_ATTENDANCE_CONFIG_V1_20261023' "$STAGE/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq 'PMD_STAFF_TENANT_LOCATION_AUDIT_V1_20261023' "$STAGE/scripts/pmd-staff-tenant-location-audit-v1.php"

echo "=== 2. Backup live files ==="
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "Backup: $BACKUP"

echo "=== 3. Install staged files, rollback on error ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-contact-v1.XXXXXXXX")"
  if [[ -f "$f" ]]; then
    cp -a "$f" "$TEMP"
  else
    chmod 0644 "$TEMP"
  fi
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done
php artisan view:clear
INSTALLING=0
echo "=========================================="
echo "STAFF TENANT CONTACT AUDIT + SETTINGS UI INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "READ-ONLY AUDIT:"
echo "php scripts/pmd-staff-tenant-location-audit-v1.php --tenant=tomo.paymydine.com"
echo "=========================================="
