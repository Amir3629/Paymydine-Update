#!/usr/bin/env bash
# PMD_STAFF_OWNER_ADDRESS_GEOCODE_DEPLOY_V1_20261023
# Owner address to map preview and accepted Staff entrance.
# Scoped five-file deploy. No APK, no SQL writes, no clock bypass.
set -Eeuo pipefail
REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-owner-address-geocode-v1-deploy.sh <40-char commit>" >&2
  exit 2
fi
cd /var/www/paymydine
ROOT="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "app/admin/assets/js/pmd-staff-address-geocode-v1.js"
  "app/Services/PmdStaffClockGeofenceV1.php"
  "app/system/database/records/location.json"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/staff-owner-geocode-v1-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0
cleanup() {
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Restoring previous files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -e "$BACKUP/$f" ]]; then
        cp -a "$BACKUP/$f" "$f"
      else
        rm -f "$f"
      fi
    done
    php artisan view:clear || true
  fi
  if [[ -n "$TEMP" && -f "$TEMP" ]]; then rm -f "$TEMP"; fi
  rm -rf "$STAGE"
  exit "$rc"
}
trap cleanup EXIT

echo "=== 1. Download and validate exactly 5 scoped files ==="
test -f app/admin/controllers/Pmdsettings.php
test -f app/admin/views/pmdsettings/restaurant.blade.php
test -f app/Services/PmdStaffClockGeofenceV1.php
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$ROOT/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.php) php -l "$STAGE/$f" ;;
    *.json) php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);' "$STAGE/$f" ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023' "$STAGE/app/admin/controllers/Pmdsettings.php"
grep -Fq 'data-pmd-staff-address-setup' "$STAGE/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq 'PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023' "$STAGE/app/admin/assets/js/pmd-staff-address-geocode-v1.js"
grep -Fq 'PMD_STAFF_DEMO_GEOFENCE_REJECT_V1_20261023' "$STAGE/app/Services/PmdStaffClockGeofenceV1.php"
php -r '$a=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR); if(($a["location_lat"]??null)!==0||($a["location_lng"]??null)!==0) exit(1);' \
  "$STAGE/app/system/database/records/location.json"

echo "=== 2. Backup all previous files ==="
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -e "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "Backup: $BACKUP"
echo "=== 3. Install with rollback ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-staff-geocode.XXXXXXXX")"
  if [[ -e "$f" ]]; then
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
echo "STAFF ADDRESS-TO-MAP PREVIEW INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "No APK or tenant database changed."
echo "NEXT: Restaurant Settings > Find location from address > Check map > Use for staff check-in > Save changes."
echo "=========================================="
