#!/usr/bin/env bash
# PMD_STAFF_APP_DOWNLOAD_PATH_V2_DEPLOY_20261022
# Scoped, reversible fix for Settings > PayMyDine Apps > Staff App.
# Does NOT modify Android APK, POS, database, shifts or tenant controls.
set -Eeuo pipefail

REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash <this-script> <pinned-40-character-Git-SHA>" >&2
  exit 2
fi

cd /var/www/paymydine
FILE="app/admin/views/pmdsettings/index.blade.php"
APK="public/downloads/paymydine/PayMyDine-Staff-App-0.1.1-debug.apk"
APK_SHA="481c252ea4b50d336356c0eda64bb2818fe9c07615de954d621c061d6b542dc2"
BACKUP="$HOME/pmd-backups/staff-settings-download-v2-$(date -u +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
TEMP=""
INSTALLING=0

cleanup() {
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: restoring previous Settings view" >&2
    cp -a "$BACKUP/$FILE" "$FILE"
    php artisan view:clear || true
  fi
  if [[ -n "$TEMP" && -f "$TEMP" ]]; then rm -f "$TEMP"; fi
  rm -rf "$STAGE"
  exit "$rc"
}
trap cleanup EXIT

echo "=== 1. Verify APK published at exact VPS path ==="
test -f "$APK" || { echo "Staff APK is not present: $APK" >&2; exit 3; }
echo "$APK_SHA  $APK" | sha256sum -c -

echo "=== 2. Download and preflight one Settings view ==="
test -f "$FILE" || { echo "Settings view missing: $FILE" >&2; exit 4; }
mkdir -p "$STAGE/$(dirname "$FILE")"
curl -fLsS --retry 3 --connect-timeout 15 \
  "https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV/$FILE" \
  -o "$STAGE/$FILE"
test -s "$STAGE/$FILE"
grep -Fq "PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022" "$STAGE/$FILE"
grep -Fq "base_path('public/'" "$STAGE/$FILE"
grep -Fq "data-pmd-staff-app-download-v1" "$STAGE/$FILE"
grep -Fq "data-pmd-device-app-download-v21" "$STAGE/$FILE"
grep -Fq "Windows 10 / 11" "$STAGE/$FILE"

echo "=== 3. Backup current Settings view ==="
mkdir -p "$BACKUP/$(dirname "$FILE")"
cp -a "$FILE" "$BACKUP/$FILE"
echo "Backup: $BACKUP"

echo "=== 4. Atomically install Settings-only fix ==="
INSTALLING=1
TEMP="$(mktemp "$(dirname "$FILE")/.pmd-staff-settings.XXXXXXXX")"
cp -a "$FILE" "$TEMP"
cat "$STAGE/$FILE" > "$TEMP"
mv -f "$TEMP" "$FILE"
TEMP=""
cmp -s "$STAGE/$FILE" "$FILE"
php artisan view:clear
INSTALLING=0

echo "============================================"
echo "STAFF APP SETTINGS DOWNLOAD PATH FIXED"
echo "Revision: $REV"
echo "Backup: $BACKUP"
echo "APK: $APK"
echo "============================================"
echo "Reload Settings and open PayMyDine Apps > Staff App."
