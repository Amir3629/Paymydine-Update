#!/usr/bin/env bash
# PMD_STAFF_V022_FUSED_GPS_DEPLOY_20261022
# Deploys ONLY the independently-built Staff 0.2.2 debug APK, Staff Portal UX,
# Fused GPS diagnostics and Staff download; no POS or DB changes.
set -Eeuo pipefail

REV="${1:-}"
APK_SOURCE="${2:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-v022-fused-gps-deploy.sh <pinned-github-sha> [local-staff-0.2.2-apk]" >&2
  exit 2
fi

cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
APK_NAME="PayMyDine-Staff-App-0.2.2-debug.apk"
APK_SHA="137d325f3d6b3b3dba9aee6e10d14fbb0481cc7c729bb5d17243de055cde6c34"
APK_PATH="public/downloads/paymydine/$APK_NAME"
RUN_ID="39856947714"
BACKUP="$HOME/pmd-backups/staff-v022-fused-gps-$(date -u +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
TEMP=""
INSTALLING=0
APK_ORIGINAL=0
FILES=(
  "app/admin/assets/js/pmd-staff-time-clock-v1.js"
  "app/admin/assets/css/pmd-staff-time-clock-v1.css"
  "app/admin/assets/js/pmd-staff-portal-locale-v2.js"
  "app/Http/Controllers/PmdStaffPortalV6Controller.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

cleanup() {
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Restoring previous Staff Portal and Settings files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then
        cp -a "$BACKUP/$f" "$f"
      else
        rm -f "$f"
      fi
    done
    if (( APK_ORIGINAL == 1 )); then
      cp -a "$BACKUP/$APK_PATH" "$APK_PATH"
    else
      rm -f "$APK_PATH"
    fi
    php artisan view:clear || true
  fi
  [[ -z "$TEMP" || ! -f "$TEMP" ]] || rm -f "$TEMP"
  rm -rf "$STAGE"
  exit "$rc"
}
trap cleanup EXIT

echo "=== 1. Verify exact Staff 0.2.2 APK before touching production ==="
if [[ -z "$APK_SOURCE" ]] && command -v gh >/dev/null 2>&1 &&
   gh auth status -h github.com >/dev/null 2>&1; then
  mkdir -p "$STAGE/artifact"
  gh run download "$RUN_ID" --repo Amir3629/Paymydine-Update \
    --name PayMyDine-Staff-Android-debug --dir "$STAGE/artifact"
  APK_SOURCE="$STAGE/artifact/staff-debug.apk"
fi

if [[ -z "$APK_SOURCE" || ! -f "$APK_SOURCE" ]]; then
  echo "ERROR: Staff 0.2.2 APK not found. Transfer it to /home/ubuntu/$APK_NAME first." >&2
  echo "No live file has changed." >&2
  exit 3
fi
echo "$APK_SHA  $APK_SOURCE" | sha256sum -c -
test "$(wc -c < "$APK_SOURCE")" -gt 100000
if command -v unzip >/dev/null 2>&1; then unzip -tqq "$APK_SOURCE"; fi

echo "=== 2. Download/validate exactly 5 Staff-only server files ==="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.js) if command -v node >/dev/null 2>&1; then node --check "$STAGE/$f"; fi ;;
    *.php) php -l "$STAGE/$f" ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_STAFF_FUSED_LOCATION_V3_20261022' "$STAGE/app/admin/assets/js/pmd-staff-time-clock-v1.js"
grep -Fq 'PMD_STAFF_FUSED_GPS_HELP_V3_20261022' "$STAGE/app/admin/assets/css/pmd-staff-time-clock-v1.css"
grep -Fq "'?v=8'" "$STAGE/app/Http/Controllers/PmdStaffPortalV6Controller.php"
grep -Fq 'PayMyDine-Staff-App-0.2.2-debug.apk' "$STAGE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq 'PMD_STAFF_PORTAL_I18N_V2_20261022' "$STAGE/app/admin/assets/js/pmd-staff-portal-locale-v2.js"
grep -Fq 'data-pmd-device-app-download-v21' "$STAGE/app/admin/views/pmdsettings/index.blade.php"

echo "=== 3. Backup all existing files ==="
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
if [[ -f "$APK_PATH" ]]; then
  APK_ORIGINAL=1
  mkdir -p "$BACKUP/$(dirname "$APK_PATH")"
  cp -a "$APK_PATH" "$BACKUP/$APK_PATH"
fi
echo "Backup: $BACKUP"

echo "=== 4. Install Staff APK and 5 scoped files with rollback ==="
INSTALLING=1
mkdir -p "$(dirname "$APK_PATH")"
TEMP="$(mktemp "$(dirname "$APK_PATH")/.pmd-staff-v022.XXXXXXXX")"
cat "$APK_SOURCE" > "$TEMP"
chmod 0644 "$TEMP"
mv -f "$TEMP" "$APK_PATH"
TEMP=""
echo "$APK_SHA  $APK_PATH" | sha256sum -c -

for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-staff-v022.XXXXXXXX")"
  if [[ -f "$f" ]]; then cp -a "$f" "$TEMP"; else chmod 0644 "$TEMP"; fi
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done

php artisan view:clear
INSTALLING=0
echo "=========================================="
echo "PAYMYDINE STAFF V0.2.2 INSTALLED"
echo "Commit: $REV"
echo "APK: $APK_PATH"
echo "Backup: $BACKUP"
echo "=========================================="
echo "NEXT: Settings > PayMyDine Apps > Staff Android 0.2.2"
echo "Install the new APK on the PHONE. VPS deploy cannot update installed apps."
