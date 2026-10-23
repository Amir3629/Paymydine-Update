#!/usr/bin/env bash
# PMD_STAFF_UNIFIED_V025_DEPLOY_20261023
# Owner address save, real extra attendance sessions, role-gated mobile manager.
# Only Staff/Restaurant/Shift scoped files; no APK, SQL migration or POS.
set -Eeuo pipefail
REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-unified-v025-deploy.sh <40-char commit>" >&2
  exit 2
fi
cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "app/Http/Controllers/PmdStaffPortalV6Controller.php"
  "app/Http/Controllers/PmdStaffPortalV5Controller.php"
  "app/Services/PmdActualWorkShiftV1.php"
  "app/admin/controllers/Shifts.php"
  "app/admin/views/pmdshifts/index.blade.php"
  "app/admin/assets/css/pmd-shifts-staff-center-v1.css"
  "app/admin/assets/js/pmd-shifts-staff-center-v1.js"
  "app/admin/controllers/Mywork.php"
  "app/admin/views/pmd-staff-portal/management_v1.blade.php"
  "app/admin/assets/css/pmd-staff-manager-v1.css"
  "app/admin/assets/js/pmd-staff-manager-v1.js"
  "app/admin/views/pmd-staff-portal/index_v5.blade.php"
  "app/admin/assets/css/pmd-staff-portal-v4.css"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/staff-unified-v025-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0
cleanup(){
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Restoring previous Staff/Restaurant/Shifts files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then
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

echo "=== 1. Check deployed Staff foundation ==="
test -f app/Http/Controllers/PmdStaffPortalV6Controller.php
test -f app/admin/controllers/Shifts.php
test -f app/admin/controllers/Mywork.php
test -f app/admin/controllers/Pmdsettings.php
grep -Fq 'PMD_STAFF_ACTUAL_OUTSIDE_ROTA_V1_20261023' app/Http/Controllers/PmdStaffPortalV6Controller.php && {
  echo "Already running this Staff update, reinstall will preserve a new backup."
} || true
grep -Fq 'PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023' app/admin/controllers/Pmdsettings.php

echo "=== 2. Download and validate exactly 15 files ==="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
    *.js) if command -v node >/dev/null 2>&1; then node --check "$STAGE/$f"; fi ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_RESTAURANT_ADDRESS_AUTO_GEOFENCE_V2_20261023' "$STAGE/app/admin/controllers/Pmdsettings.php"
grep -Fq 'PMD_RESTAURANT_SINGLE_SAVE_GPS_V3_20261023' "$STAGE/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq 'PMD_STAFF_ACTUAL_OUTSIDE_ROTA_V1_20261023' "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq 'PMD_STAFF_MY_ACTUAL_EXTRAS_V1_20261023' "$STAGE/app/Http/Controllers/PmdStaffPortalV5Controller.php"
grep -Fq 'PMD_ACTUAL_EXTRA_SHIFTS_V1_20261023' "$STAGE/app/Services/PmdActualWorkShiftV1.php"
grep -Fq 'PMD_ACTUAL_EXTRA_SHIFT_REVIEW_V1_20261023' "$STAGE/app/admin/controllers/Shifts.php"
grep -Fq 'PMD_SHIFTS_WORKFORCE_DESK_V1_20261023' "$STAGE/app/admin/views/pmdshifts/index.blade.php"
grep -Fq 'PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023' "$STAGE/app/admin/controllers/Mywork.php"
grep -Fq 'PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023' "$STAGE/app/admin/views/pmd-staff-portal/management_v1.blade.php"

echo "=== 3. Back up live files ==="
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "Backup: $BACKUP"

echo "=== 4. Install with rollback ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-unified25.XXXXXXXX")"
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
echo "PAYMYDINE UNIFIED STAFF + OWNER V025 INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "No APK replacement, no migrations or automatic shift data changes."
echo "Restaurant Settings: address + Save."
echo "Admin Shifts: Team control + Extra shifts ledger."
echo "Staff App: sign in as Owner/Manager using existing account."
echo "=========================================="
