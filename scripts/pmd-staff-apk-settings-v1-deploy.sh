#!/usr/bin/env bash
# PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022
# One pinned, reversible deployment for Staff clock, unscheduled attendance,
# manager review and the separate Staff APK button in Settings.
# No POS/Device app, database schema, tenant, payment or shift rota modifications.
set -Eeuo pipefail

REV="${1:-}"
APK_SOURCE="${2:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-apk-settings-v1-deploy.sh <40-char-Git-SHA> [local-staff-apk-path]" >&2
  exit 2
fi

cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
BACKUP="$HOME/pmd-backups/staff-apk-settings-$(date -u +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
APK_NAME="PayMyDine-Staff-App-0.1.1-debug.apk"
APK_DEST="public/downloads/paymydine/$APK_NAME"
APK_SHA="481c252ea4b50d336356c0eda64bb2818fe9c07615de954d621c061d6b542dc2"
APK_HAD_ORIGINAL=0
INSTALLING=0
TEMP=""
FILES=(
  "app/admin/assets/js/pmd-staff-time-clock-v1.js"
  "app/admin/assets/css/pmd-staff-time-clock-v1.css"
  "app/Http/Controllers/PmdStaffPortalV6Controller.php"
  "app/admin/Services/PmdStaffOperationsCenterV1.php"
  "app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
  "app/admin/assets/css/pmd-shifts-staff-center-v1.css"
  "app/admin/views/pmdsettings/index.blade.php"
)

cleanup() {
  local code=$?
  trap - EXIT
  if (( code != 0 && INSTALLING == 1 )); then
    echo "ERROR: installation failed; restoring backed-up Staff files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then cp -a "$BACKUP/$f" "$f"; fi
    done
    if (( APK_HAD_ORIGINAL == 1 )); then
      cp -a "$BACKUP/$APK_DEST" "$APK_DEST"
    else
      rm -f "$APK_DEST"
    fi
    php artisan view:clear || true
  fi
  [[ -z "$TEMP" || ! -e "$TEMP" ]] || rm -f "$TEMP"
  rm -rf "$STAGE"
  exit "$code"
}
trap cleanup EXIT

echo "=== 1. Validate real Staff APK before changing VPS ==="
mkdir -p "$STAGE/apk"
if [[ -z "$APK_SOURCE" && -f "$APK_DEST" ]] && echo "$APK_SHA  $APK_DEST" | sha256sum -c - >/dev/null 2>&1; then
  APK_SOURCE="$APK_DEST"
fi

if [[ -z "$APK_SOURCE" ]] && command -v gh >/dev/null 2>&1 && gh auth status -h github.com >/dev/null 2>&1; then
  echo "Fetching the verified Staff APK artifact from GitHub Actions..."
  gh run download 39686001725 --repo Amir3629/Paymydine-Update \
    --name PayMyDine-Staff-Android-debug --dir "$STAGE/apk"
  APK_SOURCE="$STAGE/apk/staff-debug.apk"
fi

if [[ -z "$APK_SOURCE" || ! -f "$APK_SOURCE" ]]; then
  echo "ERROR: New Staff APK is not present on this VPS." >&2
  echo "First upload PayMyDine-Staff-App-0.1.1-debug.apk to /home/ubuntu/" >&2
  echo "Then re-run with /home/ubuntu/PayMyDine-Staff-App-0.1.1-debug.apk as argument 2." >&2
  echo "No live files have been changed." >&2
  exit 3
fi

echo "$APK_SHA  $APK_SOURCE" | sha256sum -c -
cp "$APK_SOURCE" "$STAGE/apk/$APK_NAME"
test "$(wc -c < "$STAGE/apk/$APK_NAME")" -gt 100000
echo "$APK_SHA  $STAGE/apk/$APK_NAME" | sha256sum -c -
echo "VALIDATED: dedicated Staff Android 0.1.1 APK (not POS)"

echo "=== 2. Download pinned server-side Staff + Settings files ==="
for f in "${FILES[@]}"; do
  test -f "$f" || { echo "ERROR: live file missing $f" >&2; exit 4; }
  mkdir -p "$STAGE/$(dirname "$f")" "$BACKUP/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
    *.js) if command -v node >/dev/null 2>&1; then node --check "$STAGE/$f"; fi ;;
  esac
  echo "VALIDATED: $f"
done

grep -Fq 'PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022' \
  "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js"
grep -Fq 'PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022' \
  "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq "'?v=5'" "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq 'PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022' \
  "$STAGE/app/admin/Services/PmdStaffOperationsCenterV1.php"
grep -Fq 'pmd-staff-ops__unscheduled' \
  "$STAGE/app/admin/views/pmdshifts/_staff_operations_center_v1.blade.php"
grep -Fq 'PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022' \
  "$STAGE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq "$APK_NAME" "$STAGE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq 'data-pmd-device-app-download-v21' \
  "$STAGE/app/admin/views/pmdsettings/index.blade.php"

echo "=== 3. Backup live files ==="
for f in "${FILES[@]}"; do cp -a "$f" "$BACKUP/$f"; done
if [[ -f "$APK_DEST" ]]; then
  APK_HAD_ORIGINAL=1
  mkdir -p "$BACKUP/$(dirname "$APK_DEST")"
  cp -a "$APK_DEST" "$BACKUP/$APK_DEST"
fi
echo "Backup: $BACKUP"

echo "=== 4. Install verified Staff APK and scoped Staff settings ==="
INSTALLING=1
mkdir -p "$(dirname "$APK_DEST")"
TEMP="$(mktemp "$(dirname "$APK_DEST")/.pmd-staff-apk.XXXXXXXX")"
cat "$STAGE/apk/$APK_NAME" > "$TEMP"
chmod 0644 "$TEMP"
mv -f "$TEMP" "$APK_DEST"
TEMP=""
echo "$APK_SHA  $APK_DEST" | sha256sum -c -

for f in "${FILES[@]}"; do
  TEMP="$(mktemp "$(dirname "$f")/.pmd-staff-settings.XXXXXXXX")"
  cp -a "$f" "$TEMP"
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done
php artisan view:clear
INSTALLING=0

echo "========================================"
echo "STAFF APK + SETTINGS DOWNLOAD INSTALLED"
echo "Commit: $REV"
echo "APK path: $APK_DEST"
echo "Backup: $BACKUP"
echo "========================================"
echo "NEXT: Open Settings > PayMyDine Apps > PayMyDine Staff App (Android)"
echo "Then install the NEW Staff APK on the phone; updating VPS does not update an installed Android APK."
