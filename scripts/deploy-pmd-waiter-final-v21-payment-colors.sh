#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="origin/agent/waiter-pos-final-v21-payment-colors"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-v21-$TS"
BACKUP="/var/backups/pmd-waiter-final-v21-$TS"

FILES=(
  "app/admin/views/waiter_dashboard_final2.blade.php"
  "app/admin/assets/css/pmd-waiter-final-v21-payment-colors.css"
  "app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js"
)

declare -A EXPECTED=(
  ["app/admin/views/waiter_dashboard_final2.blade.php"]="0decf245adcc222e4cfc99dda14da59ca1a78959"
  ["app/admin/assets/css/pmd-waiter-final-v21-payment-colors.css"]="e32e5dc4534d380a03509b2129208d1381ec2142"
  ["app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js"]="515599e254bfb32fd6e7150f74fe7a5777406db1"
)

INSTALLED=0

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring the previous Final2 files..."

    for FILE in "${FILES[@]}"; do
      sudo rm -f "$LIVE/$FILE"
      if grep -Fxq "$FILE" "$BACKUP/existing-files.txt" 2>/dev/null; then
        sudo mkdir -p "$(dirname "$LIVE/$FILE")"
        sudo cp -a "$BACKUP/files/$FILE" "$LIVE/$FILE"
      fi
    done

    php artisan view:clear || true
    echo "Previous Final2 files restored."
  fi

  cleanup
  exit "$code"
}
trap rollback_on_error EXIT

cd "$LIVE"

echo "========================================================"
echo "PMD Waiter Final2 V2.1"
echo "Stable payment + sharp operational colours"
echo "========================================================"

echo
echo "== Confirming the installed Final2 baseline =="
test -s app/admin/controllers/PmdWaiterDashboardFinalV2.php
test -s app/admin/views/waiter_dashboard_final2.blade.php
test -s app/admin/assets/js/pmd-waiter-final-v2.js
test -s app/admin/assets/css/pmd-waiter-final-v2.css
test -s app/admin/assets/css/pmd-waiter-final-v2-pos.css
test -s app/admin/assets/css/pmd-waiter-final-v2-responsive.css
test -s app/admin/assets/js/pmd-waiter-pos-v1.js
test -s app/admin/assets/js/pmd-waiter-pos-payment-v2.js
test -s app/admin/assets/js/pmd-waiter-standard-v22.js
grep -Fq "data-pmd-waiter-final2-root" app/admin/views/waiter_dashboard_final2.blade.php
grep -Fq "Waiter Final V2 sharp workstation active" app/admin/assets/js/pmd-waiter-final-v2.js
echo "PMD_WAITER_FINAL_V2_BASE_OK"

echo
echo "== Fetching isolated V2.1 branch =="
git fetch --no-tags origin \
  agent/waiter-pos-final-v21-payment-colors:refs/remotes/origin/agent/waiter-pos-final-v21-payment-colors

echo "Branch commit: $(git rev-parse "$BRANCH")"
mkdir -p "$TMP"

echo
echo "== Extracting and hash-validating three isolated files =="
for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$BRANCH:$FILE" > "$TMP/$FILE"

  ACTUAL="$(git hash-object "$TMP/$FILE")"
  echo "$FILE"
  echo "  expected: ${EXPECTED[$FILE]}"
  echo "  actual:   $ACTUAL"

  if [[ "$ACTUAL" != "${EXPECTED[$FILE]}" ]]; then
    echo "ERROR: Blob mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Validating Blade, JavaScript and CSS before installation =="
php -l "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js"

grep -Fq "pmd-waiter-final-v21-payment-colors.css" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
grep -Fq "pmd-waiter-final-v21-payment-stability.js" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
grep -Fq "Final2 V2.1 removes legacy payment guard loops" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
grep -Fq "pmd-final2-payment-open" "$TMP/app/admin/assets/css/pmd-waiter-final-v21-payment-colors.css"
grep -Fq "grid-template-columns: minmax(0, 1fr) 340px" "$TMP/app/admin/assets/css/pmd-waiter-final-v21-payment-colors.css"
grep -Fq "Waiter Final V2.1 stable payment" "$TMP/app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js"

if grep -Fq "pmd-waiter-standard-v211-payment-guard.js" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"; then
  echo "ERROR: Legacy V2.1.1 payment observer is still referenced."
  exit 1
fi

if grep -Fq "pmd-waiter-final-v12-runtime-fixes.js" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"; then
  echo "ERROR: Legacy 100ms payment timer is still referenced."
  exit 1
fi

echo "PMD_WAITER_FINAL_V21_SOURCE_OK"

echo
echo "== Creating rollback backup =="
sudo mkdir -p "$BACKUP/files"
sudo sh -c "> \"$BACKUP/existing-files.txt\""

for FILE in "${FILES[@]}"; do
  if [[ -e "$LIVE/$FILE" ]]; then
    echo "$FILE" | sudo tee -a "$BACKUP/existing-files.txt" >/dev/null
    sudo mkdir -p "$BACKUP/files/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/files/$FILE"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only the three validated Final2 V2.1 files =="
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$LIVE/$FILE")"
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done
INSTALLED=1

echo
echo "== Validating installed production files =="
php -l "$LIVE/app/admin/views/waiter_dashboard_final2.blade.php"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js"

for FILE in "${FILES[@]}"; do
  ACTUAL="$(git hash-object "$LIVE/$FILE")"
  if [[ "$ACTUAL" != "${EXPECTED[$FILE]}" ]]; then
    echo "ERROR: Installed blob mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Clearing compiled views =="
php artisan view:clear

echo
echo "== Checking Final2 page and new assets =="
PAGE_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' \
  https://mimoza.paymydine.com/admin/dashboardwaiternewfinal2 || true)"
CSS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' \
  https://mimoza.paymydine.com/app/admin/assets/css/pmd-waiter-final-v21-payment-colors.css?v=21 || true)"
JS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' \
  https://mimoza.paymydine.com/app/admin/assets/js/pmd-waiter-final-v21-payment-stability.js?v=21 || true)"

echo "Page HTTP: $PAGE_HTTP"
echo "CSS HTTP:  $CSS_HTTP"
echo "JS HTTP:   $JS_HTTP"

for CODE in "$PAGE_HTTP" "$CSS_HTTP" "$JS_HTTP"; do
  if [[ "$CODE" == "404" || "$CODE" =~ ^5 ]]; then
    echo "ERROR: Final2 page or asset returned HTTP $CODE"
    exit 1
  fi
done

echo
echo "========================================================"
echo "PMD Waiter Final2 V2.1 installed successfully"
echo "========================================================"
echo "✓ Removed the legacy V2.1.1 payment MutationObserver from Final2"
echo "✓ Removed the legacy V1.2 100ms payment reopen timer from Final2"
echo "✓ Added one guarded payment open with duplicate-click protection"
echo "✓ Payment close, refresh, split, coupon and methods remain native"
echo "✓ Desktop payment has independent main and summary scrolling"
echo "✓ Phone payment has one natural full-screen scroll surface"
echo "✓ Added sharp blue, green, red, yellow, orange and purple POS colours"
echo "✓ Colours are assigned by operational meaning, not decoration"
echo "✓ Existing Final, Final1.2, backend, routes and database are untouched"
echo
echo "Preview:"
echo "https://mimoza.paymydine.com/admin/dashboardwaiternewfinal2"
echo
echo "Console checks:"
echo "PMDWaiterFinalV2.debug()"
echo "PMDWaiterFinalV21.debug()"
echo
echo "Expected legacy flags in V2.1 debug:"
echo "legacyV211GuardLoaded: false"
echo "legacyV12GuardLoaded: false"
echo
echo "Backup: $BACKUP"
echo "========================================================"
