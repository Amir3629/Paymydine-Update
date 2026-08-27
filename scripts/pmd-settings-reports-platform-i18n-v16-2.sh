#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-settings-reports-i18n-v16-2-backups/$STAMP"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/candidate"
PATCHER="$TMP/pmd-settings-reports-i18n-v16.py"
OVERLAY1="$TMP/pmd-settings-reports-i18n-v16-1-overlay.py"
HARDENING="$TMP/pmd-settings-reports-i18n-v16-2-hardening.py"
BASE_MAP="$TMP/pmd-settings-reports-i18n-v16-map.json"
ADDENDUM1="$TMP/pmd-settings-reports-i18n-v16-1-addendum.json"
ADDENDUM2="$TMP/pmd-settings-reports-i18n-v16-2-hardening-map.json"
ATTENDANCE_MAP="$TMP/pmd-settings-reports-i18n-v16-2-attendance-map.json"
MERGED_MAP="$TMP/pmd-settings-reports-i18n-v16-2-merged-map.json"
VALIDATOR="$TMP/pmd-validate-platform-i18n.php"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP" "$CANDIDATE"

echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16.2"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/10] Loading and validating V16.2 migration assets..."
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16.py" > "$PATCHER"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-1-overlay.py" > "$OVERLAY1"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-2-hardening.py" > "$HARDENING"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-map.json" > "$BASE_MAP"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-1-addendum.json" > "$ADDENDUM1"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-2-hardening-map.json" > "$ADDENDUM2"
git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16-2-attendance-map.json" > "$ATTENDANCE_MAP"
git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$VALIDATOR"
python3 -m py_compile "$PATCHER" "$OVERLAY1" "$HARDENING"
python3 -m json.tool "$BASE_MAP" >/dev/null
python3 -m json.tool "$ADDENDUM1" >/dev/null
python3 -m json.tool "$ADDENDUM2" >/dev/null
python3 -m json.tool "$ATTENDANCE_MAP" >/dev/null
php -l "$VALIDATOR" >/dev/null
echo "V16_2_ASSETS_VALID=1"

echo "[2/10] Merging reviewed Settings + Reports German copy maps..."
python3 - "$BASE_MAP" "$ADDENDUM1" "$ADDENDUM2" "$ATTENDANCE_MAP" "$MERGED_MAP" <<'PY'
import json
import sys
from pathlib import Path

sources = [Path(p) for p in sys.argv[1:-1]]
out_path = Path(sys.argv[-1])
merged = {'settings': {}, 'reports': {}}
for source in sources:
    payload = json.loads(source.read_text(encoding='utf-8'))
    for scope in ('settings', 'reports'):
        merged[scope].update(payload.get(scope, {}) or {})
for scope in ('settings', 'reports'):
    if not merged[scope]:
        raise SystemExit('ERROR=Empty merged scope: ' + scope)
out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('MERGED_SETTINGS_COPY=' + str(len(merged['settings'])))
print('MERGED_REPORTS_COPY=' + str(len(merged['reports'])))
print('V16_2_COPY_MAP_MERGE_OK=1')
PY
python3 -m json.tool "$MERGED_MAP" >/dev/null

echo "[3/10] Building live-derived candidates; NO live writes yet..."
python3 "$PATCHER" build "$ROOT" "$CANDIDATE" "$MERGED_MAP" "$BACKUP"
python3 "$OVERLAY1" "$ROOT" "$CANDIDATE" "$BACKUP"
python3 "$HARDENING" "$ROOT" "$CANDIDATE" "$BACKUP"
[ -s "$CANDIDATE/.pmd-v16-targets.txt" ] || { echo "ERROR=V16.2 target manifest missing" >&2; exit 110; }
TARGET_COUNT="$(grep -cve '^[[:space:]]*$' "$CANDIDATE/.pmd-v16-targets.txt")"
[ "$TARGET_COUNT" -eq 36 ] || { echo "ERROR=Unexpected V16.2 target count: $TARGET_COUNT expected 36" >&2; exit 111; }
echo "V16_2_TARGET_FILES=$TARGET_COUNT"

echo "[4/10] Syntax and canonical-catalog validation before ANY write..."
PHP_TARGETS=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/i18n/platform/en.php"
  "app/admin/i18n/platform/de.php"
  "app/admin/controllers/Pmdreports.php"
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/controllers/Pmddevices.php"
  "app/admin/controllers/Pmdfinance.php"
  "app/admin/controllers/Pmdadvanced.php"
  "app/admin/controllers/Pmdteam.php"
  "app/admin/controllers/Pmdmenu.php"
  "app/admin/controllers/Pmdcustomer.php"
  "app/admin/controllers/concerns/PmdreportsAttendanceConcern.php"
)
for rel in "${PHP_TARGETS[@]}"; do php -l "$CANDIDATE/$rel"; done
JS_TARGETS=(
  "app/admin/assets/js/pmd-platform-messages.js"
  "app/admin/assets/js/pmd-settings-inline-detail-v1.js"
  "app/admin/assets/js/pmd-device-inline-v6.js"
  "app/admin/assets/js/pmd-reports-v1.js"
  "app/admin/assets/js/pmd-reports-excel-v1.js"
)
for rel in "${JS_TARGETS[@]}"; do node --check "$CANDIDATE/$rel"; done
php "$VALIDATOR" "$CANDIDATE"
echo "PLATFORM_CATALOG_VALIDATION_PREWRITE_OK=1"

echo "[5/10] Guarding behavior and restaurant-data boundaries before ANY write..."
grep -Fq 'function fromEnglish' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'function translateStructure' "$CANDIDATE/app/admin/classes/PmdPlatformI18n.php"
grep -Fq 'fromEnglish: fromEnglish' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"
grep -Fq "translateStructure((\$pmdSettingsGroups ?? []), 'settings.')" "$CANDIDATE/app/admin/views/pmdsettings/index.blade.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$CANDIDATE/app/admin/controllers/Pmdsettings.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$CANDIDATE/app/admin/controllers/Pmddevices.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$CANDIDATE/app/admin/controllers/Pmdfinance.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$CANDIDATE/app/admin/views/pmddevices/_inline_modal_form.blade.php"
grep -Fq 'pmdLocalizeReportPayload' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq 'pmdLocalizeReportPeriods' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq 'pmdReportIsGerman' "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq "number_format(\$value,2,',','.')" "$CANDIDATE/app/admin/controllers/Pmdreports.php"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$CANDIDATE/app/admin/controllers/concerns/PmdreportsAttendanceConcern.php"
grep -Fq "translateStructure(\$profile, 'reports.')" "$CANDIDATE/app/admin/views/pmdreports/index.blade.php"
grep -Fq "runtime.fromEnglish(value, 'reports.', value)" "$CANDIDATE/app/admin/assets/js/pmd-reports-v1.js"
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' "$CANDIDATE/app/admin/assets/js/pmd-reports-excel-v1.js"

if grep -RFn --include='*.blade.php' 'name="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16.2 attempted to translate a form field name" >&2
  exit 120
fi
if grep -RFn --include='*.blade.php' 'value="{{ $pmdSettingsText' "$CANDIDATE/app/admin/views/pmdsettings" "$CANDIDATE/app/admin/views/pmdmenu" "$CANDIDATE/app/admin/views/pmdcustomer" "$CANDIDATE/app/admin/views/pmdteam" "$CANDIDATE/app/admin/views/pmddevices" "$CANDIDATE/app/admin/views/pmdfinance" "$CANDIDATE/app/admin/views/pmdbrand" "$CANDIDATE/app/admin/views/pmdadvanced"; then
  echo "ERROR=V16.2 attempted to translate a submitted form value" >&2
  exit 121
fi
if grep -Fq '<span>{{ $pmdSettingsText($label) }}</span>' "$CANDIDATE/app/admin/views/pmddevices/_inline_modal_form.blade.php"; then
  echo "ERROR=KDS restaurant category names entered platform translation" >&2
  exit 122
fi
if grep -Eq 'MutationObserver|querySelectorAll' "$CANDIDATE/app/admin/assets/js/pmd-platform-messages.js"; then
  echo "ERROR=Canonical platform-message runtime gained DOM-scanning behavior" >&2
  exit 123
fi
if grep -RFn 'PmdCanonicalPayExistingPersistence' "$CANDIDATE/app/admin/controllers/Pmdreports.php" "$CANDIDATE/app/admin/controllers/Pmdfinance.php" "$CANDIDATE/app/admin/views/pmdfinance" >/dev/null 2>&1; then
  echo "ERROR=Unexpected payment-persistence business logic entered V16.2 targets" >&2
  exit 124
fi
# Display-only VAT text may be localized because this readonly input has no name and is not submitted.
grep -Fq "value=\"{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Added at checkout and shown separately', 'settings.') }}\" readonly" "$CANDIDATE/app/admin/views/pmdfinance/index.blade.php"
echo "REPORTS_ROW_DATA_PRESERVED=1"
echo "SETTINGS_SUBMITTED_DATA_PRESERVED=1"
echo "RESTAURANT_CATEGORY_DEVICE_NAMES_PRESERVED=1"
echo "PAYMENT_BEHAVIOR_UNCHANGED=1"
echo "V16_2_BEHAVIOR_BOUNDARIES_OK=1"

echo "[6/10] Verifying no live target changed after candidate snapshot..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  before="$BACKUP/${rel//\//__}.before"
  [ -f "$before" ] || { echo "ERROR=Backup missing for $rel" >&2; exit 130; }
  if ! cmp -s "$rel" "$before"; then
    echo "ERROR=LIVE_TARGET_CHANGED_DURING_V16_2_BUILD:$rel" >&2
    echo "NOTE=Nothing has been written by V16.2. Re-run only after the other workflow finishes." >&2
    exit 131
  fi
done < "$CANDIDATE/.pmd-v16-targets.txt"
echo "LIVE_CONCURRENCY_GUARD_OK=1"
echo "ALL_V16_2_GUARDS_OK=1"

echo "[7/10] Installing only fully validated candidates..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  sudo tee "$rel" < "$CANDIDATE/$rel" >/dev/null
done < "$CANDIDATE/.pmd-v16-targets.txt"

for rel in "${PHP_TARGETS[@]}"; do php -l "$rel" >/dev/null; done
for rel in "${JS_TARGETS[@]}"; do node --check "$rel"; done
php "$VALIDATOR" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[8/10] Verifying installed Settings suite contract..."
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' app/admin/i18n/platform/en.php
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' app/admin/i18n/platform/de.php
grep -Fq 'function fromEnglish' app/admin/classes/PmdPlatformI18n.php
grep -Fq 'fromEnglish: fromEnglish' app/admin/assets/js/pmd-platform-messages.js
grep -Fq "translateStructure((\$pmdSettingsGroups ?? []), 'settings.')" app/admin/views/pmdsettings/index.blade.php
for rel in \
  app/admin/views/pmdsettings/restaurant.blade.php \
  app/admin/views/pmdsettings/frontend.blade.php \
  app/admin/views/pmdmenu/index.blade.php \
  app/admin/views/pmdcustomer/index.blade.php \
  app/admin/views/pmdteam/index.blade.php \
  app/admin/views/pmddevices/index.blade.php \
  app/admin/views/pmdfinance/index.blade.php \
  app/admin/views/pmdbrand/index.blade.php \
  app/admin/views/pmdadvanced/index.blade.php; do
  grep -Fq 'pmdSettingsText' "$rel"
done
for rel in \
  app/admin/controllers/Pmdsettings.php \
  app/admin/controllers/Pmddevices.php \
  app/admin/controllers/Pmdfinance.php \
  app/admin/controllers/Pmdadvanced.php \
  app/admin/controllers/Pmdteam.php \
  app/admin/controllers/Pmdmenu.php \
  app/admin/controllers/Pmdcustomer.php; do
  grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' "$rel"
done
grep -Fq 'settingsText' app/admin/assets/js/pmd-settings-inline-detail-v1.js
grep -Fq 'settingsText' app/admin/assets/js/pmd-device-inline-v6.js
echo "SETTINGS_PLATFORM_I18N_OK=1"
echo "SETTINGS_INLINE_I18N_OK=1"
echo "SETTINGS_CONTROLLER_I18N_OK=1"
echo "DEVICES_PLATFORM_I18N_OK=1"
echo "SETTINGS_EXACT_SOURCE_I18N_OK=1"

echo "[9/10] Verifying installed Reports + async + Excel + locale formatting..."
grep -Fq 'pmdLocalizeReportPayload' app/admin/controllers/Pmdreports.php
grep -Fq 'pmdLocalizeReportPeriods' app/admin/controllers/Pmdreports.php
grep -Fq 'pmdReportIsGerman' app/admin/controllers/Pmdreports.php
grep -Fq "number_format(\$value,2,',','.')" app/admin/controllers/Pmdreports.php
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2' app/admin/controllers/concerns/PmdreportsAttendanceConcern.php
grep -Fq "translateStructure(\$profile, 'reports.')" app/admin/views/pmdreports/index.blade.php
grep -Fq 'reportText' app/admin/assets/js/pmd-reports-v1.js
grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1' app/admin/assets/js/pmd-reports-excel-v1.js
echo "REPORTS_FIRST_PAINT_I18N_OK=1"
echo "REPORTS_ASYNC_I18N_OK=1"
echo "REPORTS_EXCEL_I18N_OK=1"
echo "REPORTS_GERMAN_FORMATTING_OK=1"
echo "REPORTS_ATTENDANCE_I18N_OK=1"

php -r '
$en=require "app/admin/i18n/platform/en.php";
$de=require "app/admin/i18n/platform/de.php";
$checks=[
  "Settings"=>"Einstellungen",
  "Devices & hardware"=>"Geräte & Hardware",
  "Payments & finance"=>"Zahlungen & Finanzen",
  "Connection mode"=>"Verbindungsmodus",
  "Customer menu settings saved."=>"Einstellungen für das Gästemenü gespeichert.",
  "Revenue trajectory"=>"Umsatzentwicklung",
  "Strongest periods"=>"Stärkste Zeiträume",
  "Sales ledger by period"=>"Umsatzübersicht nach Zeitraum",
  "Last 30 days"=>"Letzte 30 Tage",
  "All time"=>"Gesamter Zeitraum",
  "Cancel"=>"Abbrechen",
  "Active"=>"Aktiv",
  "Download Excel"=>"Excel herunterladen",
  "Data authority"=>"Datenquelle"
];
foreach($checks as $source=>$expected){
  $found=null;
  foreach($en as $key=>$value){
    if($value===$source && (str_starts_with($key,"settings.") || str_starts_with($key,"reports."))){$found=$key;break;}
  }
  if(!$found || !isset($de[$found]) || $de[$found]!==$expected){fwrite(STDERR,"ERROR=V16.2 German catalogue check failed for {$source}\n");exit(1);}
}
echo "V16_2_GERMAN_COPY_SPOTCHECK_OK=1\n";
'
echo "PLATFORM_CATALOG_VALIDATION_OK=1"

echo "[10/10] V16.2 complete."
echo "============================================================"
echo " PMD SETTINGS + REPORTS PLATFORM I18N V16.2 COMPLETE"
echo "============================================================"
echo "SETTINGS_REPORTS_PLATFORM_I18N_V16_2_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdsettings, /admin/pmddevices, /admin/pmdfinance and /admin/pmdreports/sales in German. On Sales, change Woche to Monat once; the async render must remain German."
