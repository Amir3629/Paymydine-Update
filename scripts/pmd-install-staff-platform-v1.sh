#!/usr/bin/env bash
# PMD_STAFF_APP_SERVER_INSTALL_V1_20261021
# PMD_STAFF_WORKFORCE_DAILY_RELIABILITY_V2_20261021: includes the canonical Mywork route and Time Clock stylesheet.
# Only the staff backend + Shifts center. Never modifies POS/Device APK.
set -Eeuo pipefail
cd /var/www/paymydine

REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash <this-script> <exact-commit-sha>"
  exit 2
fi
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${REV}"
BACKUP="$HOME/pmd-backups/staff-platform-$(date -u +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
INSTALLING=0
FILES=(
  "app/admin/controllers/Mywork.php"
  "app/admin/assets/css/pmd-staff-time-clock-v1.css"
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "app/Services/PmdStaffClockGeofenceV1.php"
  "app/Http/Controllers/PmdStaffPortalV6Controller.php"
  "app/admin/assets/js/pmd-staff-time-clock-v1.js"
  "app/admin/Services/PmdStaffOperationsCenterV1.php"
  "app/admin/controllers/Shifts.php"
  "app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
  "app/admin/views/pmdshifts/index.blade.php"
  "app/admin/assets/css/pmd-shifts-staff-center-v1.css"
  "app/admin/assets/js/pmd-shifts-staff-center-v1.js"
)
cleanup() {
  local status=$?
  if (( status != 0 && INSTALLING == 1 )); then
    echo "ERROR: Rolling back..."
    local f
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then
        cp -a "$BACKUP/$f" "$f"
      else
        rm -f "$f"
      fi
    done
    php artisan view:clear || true
  fi
  rm -rf "$STAGE"
}
trap cleanup EXIT

echo "=== Download + syntax validation ==="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f" || { echo "Empty: $f"; exit 1; }
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
    *.js)
      if command -v node >/dev/null 2>&1; then
        node --check "$STAGE/$f"
      fi
      ;;
  esac
  echo "VALIDATED: $f"
done

# Wrong commits / partial file uploads fail before touching production.
grep -Fq 'PMD_STAFF_RESTAURANT_GPS_PIN_V1_20261021' "$STAGE/app/admin/controllers/Pmdsettings.php"
grep -Fq 'PMD_STAFF_RESTAURANT_GPS_PIN_V1_20261021' "$STAGE/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq 'PMD_MY_WORK_STAFF_PORTAL_V6' "$STAGE/app/admin/controllers/Mywork.php"
grep -Fq 'PMD_STAFF_PORTAL_TIME_CLOCK_V1' "$STAGE/app/admin/assets/css/pmd-staff-time-clock-v1.css"
grep -Fq 'PMD_STAFF_GEOFENCE_SERVER_V1_20261021' "$STAGE/app/Services/PmdStaffClockGeofenceV1.php"
grep -Fq 'PMD_STAFF_GEOFENCE_SERVER_V1_20261021' "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq 'PMD_STAFF_GEOFENCE_ONDEMAND_V1_20261021' "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js"
grep -Fq 'PMD_STAFF_OPERATIONS_CENTER_V1_20261021' "$STAGE/app/admin/Services/PmdStaffOperationsCenterV1.php"
grep -Fq 'PMD_SHIFTS_STAFF_CENTER_V1_20261021' "$STAGE/app/admin/controllers/Shifts.php"
grep -Fq 'PMD_SHIFTS_STAFF_CENTER_PANEL_V1_20261021' "$STAGE/app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
grep -Fq 'PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021' "$STAGE/app/admin/views/pmdshifts/index.blade.php"
grep -Fq 'PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021' "$STAGE/app/admin/assets/css/pmd-shifts-staff-center-v1.css"
grep -Fq 'PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021' "$STAGE/app/admin/assets/js/pmd-shifts-staff-center-v1.js"

echo "=== Backup ==="
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "=== Install ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  tmp="$(mktemp "$(dirname "$f")/.pmd-staff.XXXXXXXX")"
  if [[ -f "$f" ]]; then
    cp -a "$f" "$tmp"
  else
    chmod 644 "$tmp"
  fi
  cat "$STAGE/$f" > "$tmp"
  mv -f "$tmp" "$f"
  cmp -s "$STAGE/$f" "$f"
  echo "INSTALLED: $f"
done
php artisan view:clear
INSTALLING=0
echo "========================================"
echo "PAYMYDINE STAFF SERVER INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "========================================"
echo "Check restaurant GPS pin + tenant attendance metadata before time clock rollout."
echo "IMPORTANT: do not enable employee GPS attendance until real-device checks pass."
