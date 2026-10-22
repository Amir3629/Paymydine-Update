#!/usr/bin/env bash
# PMD_STAFF_NATIVE_CLOCK_GPS_DEPLOY_V1_20261022
# Installs Staff Clock + Owner Staff Activity unscheduled-attendance UI.
# PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022
# No schema changes, shift plans, identities, POS or device APK are modified.
# The Android native fix still requires a NEW Staff APK on the phone.
set -Eeuo pipefail

REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-native-gps-v1-deploy.sh <40-char-Git-SHA>"
  exit 2
fi

cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
BACKUP="$HOME/pmd-backups/staff-native-gps-$(date -u +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
TEMP=""
INSTALLING=0
FILES=(
  "app/admin/assets/js/pmd-staff-time-clock-v1.js"
  "app/admin/assets/css/pmd-staff-time-clock-v1.css"
  "app/Http/Controllers/PmdStaffPortalV6Controller.php"
  "app/admin/Services/PmdStaffOperationsCenterV1.php"
  "app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
  "app/admin/assets/css/pmd-shifts-staff-center-v1.css"
)

cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && INSTALLING == 1 )); then
    echo "Install failed: restoring the original Staff Time Clock files..."
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then cp -a "$BACKUP/$f" "$f"; fi
    done
    php artisan view:clear || true
  fi
  if [[ -n "$TEMP" && -f "$TEMP" ]]; then rm -f "$TEMP"; fi
  rm -rf "$STAGE"
  exit "$status"
}
trap cleanup EXIT

echo "=== Staff GPS native bridge: download & validate ==="
for f in "${FILES[@]}"; do
  test -f "$f" || { echo "Missing live file: $f"; exit 1; }
  mkdir -p "$STAGE/$(dirname "$f")" "$BACKUP/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.js)
      if command -v node >/dev/null 2>&1; then node --check "$STAGE/$f"; fi
      ;;
    *.php)
      php -l "$STAGE/$f"
      ;;
  esac
  echo "VALIDATED: $f"
done

grep -Fq "PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022" \
  "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js"
# JS regex escapes the slash (PMDStaffNativeGPS\\/1), so check the stable prefix.
# Print a meaningful error instead of terminating silently on a grep miss.
grep -Fq "PMDStaffNativeGPS" \
  "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js" || {
    echo "ERROR: Native Staff GPS user-agent check is absent from the JS asset." >&2
    exit 1
  }
grep -Fq "pmdstaffgeo://clock?request=" \
  "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js"
grep -Fq "'?v=5'" \
  "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq "PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022" \
  "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq "PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022" \
  "$STAGE/app/admin/Services/PmdStaffOperationsCenterV1.php"
grep -Fq "pmd-staff-ops__unscheduled" \
  "$STAGE/app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
grep -Fq "PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022" \
  "$STAGE/app/admin/assets/css/pmd-staff-time-clock-v1.css"
grep -Fq "PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022" \
  "$STAGE/app/admin/assets/css/pmd-shifts-staff-center-v1.css"

echo "=== Backup originals ==="
for f in "${FILES[@]}"; do cp -a "$f" "$BACKUP/$f"; done
echo "Backup: $BACKUP"

echo "=== Install 6 Staff Time Clock and Staff Activity files ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  TEMP="$(mktemp "$(dirname "$f")/.pmd-staff-gps.XXXXXXXX")"
  cp -a "$f" "$TEMP"
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done

php artisan view:clear
INSTALLING=0
echo "======================================="
echo "STAFF NATIVE GPS + UNSCHEDULED ATTENDANCE V2 INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "======================================="
echo "IMPORTANT: Now install the new Staff APK. VPS changes alone cannot update Android native code."
