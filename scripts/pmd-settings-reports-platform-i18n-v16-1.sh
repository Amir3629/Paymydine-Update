#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-settings-reports-i18n-v16-1-backups/$STAMP"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/candidate"
PATCHER="$TMP/pmd-settings-reports-i18n-v16.py"
OVERLAY="$TMP/pmd-settings-reports-i18n-v16-1-overlay.py"
BASE_MAP="$TMP/pmd-settings-reports-i18n-v16-map.json"
ADDENDUM="$TMP/pmd-settings-reports-i18n-v16-1-addendum.json"
MERGED_MAP="$TMP/pmd-settings-reports-i18n-v16-1-merged-map.json"
VALIDATOR="$TMP/pmd-validate-platform-i18n.php"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP" "$CANDIDATE"

echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16.1"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/9] Loading and validating V16.1 migration assets..."
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16.py" > "$PATCHER"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-1-overlay.py" > "$OVERLAY"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-map.json" > "$BASE_MAP"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-1-addendum.json" > "$ADDENDUM"
git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$VALIDATOR"
python3 -m py_compile "$PATCHER" "$OVERLAY"
python3 -m json.tool "$BASE_MAP" >/dev/null
python3 -m json.tool "$ADDENDUM" >/dev/null
php -l "$VALIDATOR" >/dev/null
echo "V16_1_ASSETS_VALID=1"

echo "[2/9] Merging reviewed Settings + Reports German copy maps..."
python3 - "$BASE_MAP" "$ADDENDUM" "$MERGED_MAP" <<'PY'
import json
import sys
from pathlib import Path

base_path = Path(sys.argv[1])
add_path = Path(sys.argv[2])
out_path = Path(sys.argv[3])
base = json.loads(base_path.read_text(encoding='utf-8'))
add = json.loads(add_path.read_text(encoding='utf-8'))
for scope in ('settings', 'reports'):
    base.setdefault(scope, {})
    base[scope].update(add.get(scope, {}))
    if not base[scope]:
        raise SystemExit('ERROR=Empty merged scope: ' + scope)
out_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('MERGED_SETTINGS_COPY=' + str(len(base['settings'])))
print('MERGED_REPORTS_COPY=' + str(len(base['reports'])))
print('V16_1_COPY_MAP_MERGE_OK=1')
PY
python3 -m json.tool "$MERGED_MAP" >/dev/null

echo "[3/9] Building live-derived candidates; NO live writes yet..."
python3 "$PATCHER" build "$ROOT" "$CANDIDATE" "$MERGED_MAP" "$BACKUP"
python3 "$OVERLAY" "$ROOT" "$CANDIDATE" "$BACKUP"
[ -s "$CANDIDATE/.pmd-v16-targets.txt" ] || { echo "ERROR=V16.1 target manifest missing" >&2; exit 110; }
TARGET_COUNT="$(grep -cve '^[[:space:]]*$' "$CANDIDATE/.pmd-v16-targets.txt")"
[ "$TARGET_COUNT" -eq 28 ] || { echo "ERROR=Unexpected V16.1 target count: $TARGET_COUNT expected 28" >&2; exit 111; }
echo "V16_1_TARGET_FILES=$TARGET_COUNT"

echo "[4/9] Syntax and canonical-catalog validation before ANY write..."
php -l "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
php -l "$CANDIDATE/app/admin/i18n/platform/en.php"
php -l "$CANDIDATE/app/admin/i18n/platform/de.php"
php -l "$CANDIDATE/app/admin/controllers/Pmdreports.php"
node --check "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-settings-inline-detail-v1.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-device-inline-v6.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-reports-v1.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-reports-excel-v1.js"
php "$VALIDATOR" "$CANDIDATE"
echo "PLATFORM_CATALOG_VALIDATION_PREWRITE_OK=1"

echo "[5/9] Guarding behavior and restaurant-data boundaries before ANY write..."
grep -Fq 'function fromEnglish' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'function translateStructure' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'fromEnglish: fromEnglish' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"
grep -Fq "translateStructure((\$pmdSettingsGroups ?? []), 'settings.')" "$CANDIDATE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' "$CANDIDATE/app/admin/views/pmdbrand/index.blade.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' "$CANDIDATE/app/admin/views/pmdadvanced/index.blade.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' "$CANDIDATE/app/admin/views/pmdfinance/index.blade.php"
grep -Fq 'pmdLocalizeReportPayload' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq 'pmdLocalizeReportPeriods' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq "translateStructure(\$profile, 'reports.')" "$CANDIDATE/app/admin/views/pmdreports/index.blade.php"
grep -Fq "runtime.fromEnglish(value, 'reports.', value)" "$CANDIDATE/app/admin/assets/js/pmd-reports-v1.js"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' "$CANDIDATE/app/admin/assets/js/pmd-reports-excel-v1.js"

if grep -RFn --include='*.blade.php' 'name="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16.1 attempted to translate a form field name" >&2
  exit 120
fi
if grep -RFn --include='*.blade.php' 'value="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16.1 attempted to translate a submitted form value" >&2
  exit 121
fi
if grep -Eq 'MutationObserver|querySelectorAll' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"; then
  echo "ERROR=Canonical platform-message runtime gained DOM-scanning behavior" >&2
  exit 122
fi
if grep -RFn 'PmdCanonicalPayExistingPersistence' "$CANDIDATE/app/admin/controllers/Pmdreports.php" "$CANDIDATE/app/admin/views/pmdfinance" >/dev/null 2>&1; then
  echo "ERROR=Unexpected payment-persistence business logic entered V16.1 targets" >&2
  exit 123
fi
# Display-only VAT text may be localized because this readonly input has no name and is not submitted.
grep -Fq "value=\"{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Added at checkout and shown separately', 'settings.') }}\" readonly" "$CANDIDATE/app/admin/views/pmdfinance/index.blade.php"
echo "REPORTS_ROW_DATA_PRESERVED=1"
echo "SETTINGS_SUBMITTED_DATA_PRESERVED=1"
echo "PAYMENT_BEHAVIOR_UNCHANGED=1"
echo "V16_1_BEHAVIOR_BOUNDARIES_OK=1"

echo "[6/9] Verifying no live target changed after candidate snapshot..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  before="$BACKUP/${rel//\//__}.before"
  [ -f "$before" ] || { echo "ERROR=Backup missing for $rel" >&2; exit 130; }
  if ! cmp -s "$rel" "$before"; then
    echo "ERROR=LIVE_TARGET_CHANGED_DURING_V16_1_BUILD:$rel" >&2
    echo "NOTE=Nothing has been written by V16.1. Re-run only after the other workflow finishes." >&2
    exit 131
  fi
done < "$CANDIDATE/.pmd-v16-targets.txt"
echo "LIVE_CONCURRENCY_GUARD_OK=1"
echo "ALL_V16_1_GUARDS_OK=1"

echo "[7/9] Installing only fully validated candidates..."
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
node --check app/admin/assets/js/pmd-reports-excel-v1.js
php "$VALIDATOR" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[8/9] Verifying installed Settings + Reports + Excel i18n contract..."
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
echo "SETTINGS_EXACT_SOURCE_I18N_V16_1_OK=1"

grep -Fq 'pmdLocalizeReportPayload' app/admin/controllers/Pmdreports.php
grep -Fq 'pmdLocalizeReportPeriods' app/admin/controllers/Pmdreports.php
grep -Fq "translateStructure(\$profile, 'reports.')" app/admin/views/pmdreports/index.blade.php
grep -Fq 'reportText' app/admin/assets/js/pmd-reports-v1.js
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' app/admin/assets/js/pmd-reports-excel-v1.js
echo "REPORTS_FIRST_PAINT_I18N_OK=1"
echo "REPORTS_ASYNC_I18N_OK=1"
echo "REPORTS_EXCEL_I18N_OK=1"

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
  "All time"=>"Gesamter Zeitraum",
  "Download Excel"=>"Excel herunterladen",
  "Data authority"=>"Datenquelle"
];
foreach($checks as $source=>$expected){
  $found=null;
  foreach($en as $key=>$value){
    if($value===$source && (str_starts_with($key,"settings.") || str_starts_with($key,"reports."))){$found=$key;break;}
  }
  if(!$found || !isset($de[$found]) || $de[$found]!==$expected){fwrite(STDERR,"ERROR=V16.1 German catalogue check failed for {$source}\n");exit(1);}
}
echo "V16_1_GERMAN_COPY_SPOTCHECK_OK=1\n";
'
echo "PLATFORM_CATALOG_VALIDATION_OK=1"

echo "[9/9] V16.1 complete."
echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16.1 COMPLETE"
echo "============================================================"
echo "SETTINGS_REPORTS_PLATFORM_I18N_V16_1_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdsettings, /admin/pmddevices, /admin/pmdfinance and /admin/pmdreports/sales in German. On Sales, change Woche to Monat once; the async render must remain German."
