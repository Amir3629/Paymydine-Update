#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-settings-reports-i18n-v16-backups/$STAMP"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/candidate"
PATCHER="$TMP/pmd-settings-reports-i18n-v16.py"
MAP="$TMP/pmd-settings-reports-i18n-v16-map.json"
VALIDATOR="$TMP/pmd-validate-platform-i18n.php"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP" "$CANDIDATE"

echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/8] Loading and validating V16 migration assets..."
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16.py" > "$PATCHER"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-map.json" > "$MAP"
git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$VALIDATOR"
python3 -m py_compile "$PATCHER"
python3 -m json.tool "$MAP" >/dev/null
php -l "$VALIDATOR" >/dev/null
echo "V16_ASSETS_VALID=1"

echo "[2/8] Building live-derived candidates; NO live writes yet..."
python3 "$PATCHER" build "$ROOT" "$CANDIDATE" "$MAP" "$BACKUP"
[ -s "$CANDIDATE/.pmd-v16-targets.txt" ] || { echo "ERROR=V16 target manifest missing" >&2; exit 110; }
TARGET_COUNT="$(grep -cve '^[[:space:]]*$' "$CANDIDATE/.pmd-v16-targets.txt")"
[ "$TARGET_COUNT" -ge 20 ] || { echo "ERROR=Unexpectedly low V16 target count: $TARGET_COUNT" >&2; exit 111; }
echo "V16_TARGET_FILES=$TARGET_COUNT"

echo "[3/8] Syntax and canonical-catalog validation before ANY write..."
php -l "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
php -l "$CANDIDATE/app/admin/i18n/platform/en.php"
php -l "$CANDIDATE/app/admin/i18n/platform/de.php"
php -l "$CANDIDATE/app/admin/controllers/Pmdreports.php"
node --check "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-settings-inline-detail-v1.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-device-inline-v6.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-reports-v1.js"
php "$VALIDATOR" "$CANDIDATE"
echo "PLATFORM_CATALOG_VALIDATION_PREWRITE_OK=1"

echo "[4/8] Guarding behavior/data boundaries before ANY write..."
grep -Fq 'function fromEnglish' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'function translateStructure' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'fromEnglish: fromEnglish' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"
grep -Fq "translateStructure((\$pmdSettingsGroups ?? []), 'settings.')" "$CANDIDATE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq 'pmdLocalizeReportPayload' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq 'pmdLocalizeReportPeriods' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq "translateStructure(\$profile, 'reports.')" "$CANDIDATE/app/admin/views/pmdreports/index.blade.php"
grep -Fq "runtime.fromEnglish(value, 'reports.', value)" "$CANDIDATE/app/admin/assets/js/pmd-reports-v1.js"

if grep -RFn --include='*.blade.php' 'name="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16 attempted to translate a form field name" >&2
  exit 120
fi
if grep -RFn --include='*.blade.php' 'value="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16 attempted to translate a form field value" >&2
  exit 121
fi
if grep -Eq 'MutationObserver|querySelectorAll' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"; then
  echo "ERROR=Canonical platform message runtime gained DOM-scanning behavior" >&2
  exit 122
fi
if grep -Fq 'PmdCanonicalPayExistingPersistence' "$CANDIDATE/app/admin/controllers/Pmdreports.php"; then
  echo "ERROR=Unexpected payment persistence code in report candidate" >&2
  exit 123
fi
echo "REPORTS_ROW_DATA_PRESERVED=1"
echo "SETTINGS_FORM_DATA_PRESERVED=1"
echo "V16_BEHAVIOR_BOUNDARIES_OK=1"

echo "[5/8] Verifying no target changed after candidate snapshot..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  before="$BACKUP/${rel//\//__}.before"
  [ -f "$before" ] || { echo "ERROR=Backup missing for $rel" >&2; exit 130; }
  if ! cmp -s "$rel" "$before"; then
    echo "ERROR=LIVE_TARGET_CHANGED_DURING_V16_BUILD:$rel" >&2
    echo "NOTE=Nothing has been written by V16. Re-run only after the other workflow finishes." >&2
    exit 131
  fi
done < "$CANDIDATE/.pmd-v16-targets.txt"
echo "LIVE_CONCURRENCY_GUARD_OK=1"
echo "ALL_V16_GUARDS_OK=1"

echo "[6/8] Installing only fully validated candidates..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  sudo tee "$rel" < "$CANDIDATE/$rel" >/dev/null
done < "$CANDIDATE/.pmd-v16-targets.txt"

php -l app/admin/classes/PmdPlatformI18n.php >/dev/null
php -l app/admin/i18n/platform/en.php >/dev/null
php -l app/admin/i18n/platform/de.php >/dev/null
php -l app/admin/controllers/Pmdreports.php >/dev/null
node --check app/admin/assets/js/pmd-platform-messages.js
node --check app/admin/assets/js/pmd-settings-inline-detail-v1.js
node --check app/admin/assets/js/pmd-device-inline-v6.js
node --check app/admin/assets/js/pmd-reports-v1.js
php "$VALIDATOR" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[7/8] Verifying installed Settings + Reports i18n contract..."
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' app/admin/i18n/platform/en.php
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' app/admin/i18n/platform/de.php
grep -Fq 'function fromEnglish' app/admin/classes/PmdPlatformI18n.php
grep -Fq 'fromEnglish: fromEnglish' app/admin/assets/js/pmd-platform-messages.js
grep -Fq "translateStructure((\$pmdSettingsGroups ?? []), 'settings.')" app/admin/views/pmdsettings/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdsettings/frontend.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdmenu/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdcustomer/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdteam/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmddevices/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdfinance/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdbrand/index.blade.php
grep -Fq 'pmdSettingsText' app/admin/views/pmdadvanced/index.blade.php
echo "SETTINGS_PLATFORM_I18N_OK=1"
grep -Fq 'settingsText' app/admin/assets/js/pmd-settings-inline-detail-v1.js
grep -Fq 'settingsText' app/admin/assets/js/pmd-device-inline-v6.js
echo "SETTINGS_INLINE_I18N_OK=1"
echo "DEVICES_PLATFORM_I18N_OK=1"

grep -Fq 'pmdLocalizeReportPayload' app/admin/controllers/Pmdreports.php
grep -Fq 'pmdLocalizeReportPeriods' app/admin/controllers/Pmdreports.php
grep -Fq "translateStructure(\$profile, 'reports.')" app/admin/views/pmdreports/index.blade.php
grep -Fq 'reportText' app/admin/assets/js/pmd-reports-v1.js
echo "REPORTS_FIRST_PAINT_I18N_OK=1"
echo "REPORTS_ASYNC_I18N_OK=1"

php -r '
$en=require "app/admin/i18n/platform/en.php";
$de=require "app/admin/i18n/platform/de.php";
$checks=[
  "Settings"=>"Einstellungen",
  "Devices & hardware"=>"Geräte & Hardware",
  "Payments & finance"=>"Zahlungen & Finanzen",
  "Revenue trajectory"=>"Umsatzentwicklung",
  "Strongest periods"=>"Stärkste Zeiträume",
  "Sales ledger by period"=>"Umsatzübersicht nach Zeitraum",
  "Last 30 days"=>"Letzte 30 Tage",
  "All time"=>"Gesamter Zeitraum"
];
foreach($checks as $source=>$expected){
  $found=null;
  foreach($en as $key=>$value){
    if($value===$source && (str_starts_with($key,"settings.") || str_starts_with($key,"reports."))){$found=$key;break;}
  }
  if(!$found || !isset($de[$found]) || $de[$found]!==$expected){fwrite(STDERR,"ERROR=V16 German catalogue check failed for {$source}\n");exit(1);}
}
echo "V16_GERMAN_COPY_SPOTCHECK_OK=1\n";
'
echo "PLATFORM_CATALOG_VALIDATION_OK=1"

echo "[8/8] V16 complete."
echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16 COMPLETE"
echo "============================================================"
echo "SETTINGS_REPORTS_PLATFORM_I18N_V16_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdsettings, /admin/pmddevices and /admin/pmdreports/sales in German. Then change report period once (for example Woche -> Monat) to verify the async render stays German."
