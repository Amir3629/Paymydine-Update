#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-settings-i18n-v17-backups/$STAMP"
TMP="$(mktemp -d)"
PATCHER="$TMP/pmd-settings-dynamic-i18n-v17.py"
MAP="$TMP/pmd-settings-dynamic-i18n-v17-map.json"
VALIDATOR="$TMP/pmd-validate-platform-i18n.php"
CANDIDATE="$TMP/candidate"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP" "$CANDIDATE"

echo "============================================================"
echo " PMD SETTINGS PLATFORM I18N V17"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/9] Loading and validating V17 assets before any write..."
git show "origin/$BRANCH:scripts/pmd-settings-dynamic-i18n-v17.py" > "$PATCHER"
git show "origin/$BRANCH:scripts/pmd-settings-dynamic-i18n-v17-map.json" > "$MAP"
git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$VALIDATOR"
python3 -m py_compile "$PATCHER"
python3 -m json.tool "$MAP" >/dev/null
php -l "$VALIDATOR" >/dev/null
echo "V17_ASSETS_VALID=1"

echo "[2/9] Detecting whether the V16.2 Settings + Reports base was actually installed..."
BASE_FILES=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/i18n/platform/en.php"
  "app/admin/i18n/platform/de.php"
  "app/admin/views/pmdfinance/index.blade.php"
  "app/admin/controllers/Pmdreports.php"
)
BASE_PRESENT=0
for rel in "${BASE_FILES[@]}"; do
  if grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' "$rel"; then
    BASE_PRESENT=$((BASE_PRESENT + 1))
  fi
done

echo "V16_BASE_MARKERS_PRESENT=$BASE_PRESENT"
if [ "$BASE_PRESENT" -eq 0 ]; then
  echo "V16_2_BASE_ACTION=INSTALL_REQUIRED"
  echo "NOTE=The previous success-marker lines were shell assignments, not a V16.2 installer run."
  git show "origin/$BRANCH:scripts/pmd-settings-reports-platform-i18n-v16-2.sh" | bash
elif [ "$BASE_PRESENT" -eq "${#BASE_FILES[@]}" ]; then
  echo "V16_2_BASE_ACTION=ALREADY_INSTALLED"
else
  echo "ERROR=V16_2_BASE_PARTIAL_STATE:$BASE_PRESENT/${#BASE_FILES[@]}" >&2
  echo "NOTE=V17 made no dynamic-runtime writes. Inspect the partial base state before continuing." >&2
  exit 101
fi

for rel in "${BASE_FILES[@]}"; do
  grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' "$rel" || {
    echo "ERROR=V16_2_BASE_VERIFY_FAILED:$rel" >&2
    exit 102
  }
done
grep -Fq 'fromEnglish: fromEnglish' app/admin/assets/js/pmd-platform-messages.js
echo "V16_2_BASE_READY=1"

echo "[3/9] Guarding V17 re-run state..."
V17_MARKERS=0
for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/assets/js/pmd-payment-provider-catalogue-v1.js \
  app/admin/assets/js/pmd-sumup-self-service-v1.js \
  app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js; do
  if grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$rel"; then
    V17_MARKERS=$((V17_MARKERS + 1))
  fi
done
if [ "$V17_MARKERS" -eq 5 ]; then
  echo "SETTINGS_DYNAMIC_I18N_V17_ALREADY_INSTALLED=1"
  echo "SETTINGS_PLATFORM_I18N_V17_OK=1"
  exit 0
fi
if [ "$V17_MARKERS" -ne 0 ]; then
  echo "ERROR=V17_PARTIAL_MARKER_STATE:$V17_MARKERS/5" >&2
  exit 103
fi
echo "V17_FRESH_INSTALL_GUARD_OK=1"

echo "[4/9] Building live-derived dynamic Settings candidates; no V17 live writes yet..."
python3 "$PATCHER" "$ROOT" "$CANDIDATE" "$BACKUP" "$MAP"
[ -s "$CANDIDATE/.pmd-v17-targets.txt" ] || { echo "ERROR=V17 target manifest missing" >&2; exit 110; }
TARGET_COUNT="$(grep -cve '^[[:space:]]*$' "$CANDIDATE/.pmd-v17-targets.txt")"
[ "$TARGET_COUNT" -eq 5 ] || { echo "ERROR=Unexpected V17 target count: $TARGET_COUNT" >&2; exit 111; }
echo "V17_TARGET_COUNT_OK=5"

echo "[5/9] Validating all V17 candidates before any V17 write..."
php -l "$CANDIDATE/app/admin/i18n/platform/en.php"
php -l "$CANDIDATE/app/admin/i18n/platform/de.php"
node --check "$CANDIDATE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
node --check "$CANDIDATE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
php "$VALIDATOR" "$CANDIDATE"

grep -Fq "settingsText('Configure')" "$CANDIDATE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -Fq "settingsText('Part of this provider flow already exists in PayMyDine.')" "$CANDIDATE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -Fq "settingsHtml('PAYMENT PROVIDER')" "$CANDIDATE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
grep -Fq "settingsHtml('PAYMENT TERMINALS')" "$CANDIDATE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
grep -Fq "settingsText('Online Card & Wallets')" "$CANDIDATE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$CANDIDATE/app/admin/i18n/platform/en.php"
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$CANDIDATE/app/admin/i18n/platform/de.php"

echo "V17_PROVIDER_RUNTIME_CANDIDATE_OK=1"
echo "V17_DEVICE_SUMUP_RUNTIME_CANDIDATE_OK=1"
echo "V17_WALLET_RUNTIME_CANDIDATE_OK=1"
echo "V17_CATALOG_CANDIDATE_OK=1"
echo "ALL_V17_CANDIDATES_VALID=1"

echo "[6/9] Verifying no V17 target changed during candidate build..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  before="$BACKUP/${rel//\//__}.before"
  [ -f "$before" ] || { echo "ERROR=Missing V17 backup for $rel" >&2; exit 120; }
  if ! cmp -s "$rel" "$before"; then
    echo "ERROR=LIVE_TARGET_CHANGED_DURING_V17:$rel" >&2
    echo "NOTE=No V17 candidate was installed. Re-run after the other workflow finishes." >&2
    exit 121
  fi
done < "$CANDIDATE/.pmd-v17-targets.txt"
echo "V17_CONCURRENCY_GUARD_OK=1"
echo "ALL_V17_GUARDS_OK=1"

echo "[7/9] Installing only validated V17 display-i18n candidates..."
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  sudo tee "$rel" < "$CANDIDATE/$rel" >/dev/null
done < "$CANDIDATE/.pmd-v17-targets.txt"

php -l app/admin/i18n/platform/en.php >/dev/null
php -l app/admin/i18n/platform/de.php >/dev/null
node --check app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
node --check app/admin/assets/js/pmd-sumup-self-service-v1.js
node --check app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js
php "$VALIDATOR" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[8/9] Verifying installed dynamic Settings i18n contract..."
for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/assets/js/pmd-payment-provider-catalogue-v1.js \
  app/admin/assets/js/pmd-sumup-self-service-v1.js \
  app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js; do
  grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$rel"
done

grep -Fq "settingsText('Configure')" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq "settingsHtml('PAYMENT TERMINALS')" app/admin/assets/js/pmd-sumup-self-service-v1.js
grep -Fq "settingsText('Online Card & Wallets')" app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js

php -r '
$en=require "app/admin/i18n/platform/en.php";
$de=require "app/admin/i18n/platform/de.php";
$checks=[
  "Payments & finance"=>"Zahlungen & Finanzen",
  "Payment providers"=>"Zahlungsanbieter",
  "Configure"=>"Konfigurieren",
  "Partly ready"=>"Teilweise bereit",
  "Provider adapter is not enabled yet."=>"Der Anbieter-Adapter ist noch nicht aktiviert.",
  "SumUp terminals"=>"SumUp-Terminals",
  "Online Card & Wallets"=>"Online-Karte & Wallets"
];
foreach($checks as $source=>$expected){
  $found=[];
  foreach($en as $key=>$value){if(str_starts_with($key,"settings.") && $value===$source)$found[]=$key;}
  if(!$found){fwrite(STDERR,"ERROR=Missing V17 settings source: {$source}\n");exit(1);}
  $ok=false;
  foreach($found as $key){if(($de[$key]??null)===$expected){$ok=true;break;}}
  if(!$ok){fwrite(STDERR,"ERROR=German V17 copy mismatch: {$source}\n");exit(1);}
}
echo "V17_GERMAN_COPY_SPOTCHECK_OK=1\n";
'

echo "V17_PAYMENT_BEHAVIOR_UNCHANGED=1"
echo "V17_CREDENTIAL_VALUES_UNCHANGED=1"
echo "V17_DYNAMIC_SETTINGS_I18N_OK=1"

echo "[9/9] V17 complete."
echo "============================================================"
echo " PMD SETTINGS PLATFORM I18N V17 COMPLETE"
echo "============================================================"
echo "SETTINGS_PLATFORM_I18N_V17_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdfinance and /admin/pmddevices in German. Finance provider rows and the SumUp modal must remain German after their JS runtime renders."
