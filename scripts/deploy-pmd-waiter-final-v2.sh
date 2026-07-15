#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="origin/agent/waiter-pos-final-v2-sharp-workstation"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-v2-$TS"
BACKUP="/var/backups/pmd-waiter-final-v2-$TS"
ROUTES="$LIVE/app/admin/routes.php"
TMP_ROUTES="$TMP/app/admin/routes.php"

FILES=(
  "app/admin/controllers/PmdWaiterDashboardFinalV2.php"
  "app/admin/views/waiter_dashboard_final2.blade.php"
  "app/admin/assets/css/pmd-waiter-final-v2.css"
  "app/admin/assets/css/pmd-waiter-final-v2-pos.css"
  "app/admin/assets/css/pmd-waiter-final-v2-responsive.css"
  "app/admin/assets/js/pmd-waiter-final-v2.js"
  "routes/pmd-waiter-final-v2.php"
)

declare -A EXPECTED=(
  ["app/admin/controllers/PmdWaiterDashboardFinalV2.php"]="da9b838b98ae0722a0e99079540885d88217ddf8"
  ["app/admin/views/waiter_dashboard_final2.blade.php"]="a72beb8052e53cbcb576577cd737a259a02ca1d2"
  ["app/admin/assets/css/pmd-waiter-final-v2.css"]="b29f5909f23c4352d9ce2d64215a8870c2077bb0"
  ["app/admin/assets/css/pmd-waiter-final-v2-pos.css"]="1ceeebc98589c66f09e814b317c3a2194f535d49"
  ["app/admin/assets/css/pmd-waiter-final-v2-responsive.css"]="45b030d03e83dd80490d681d321223f4ce675491"
  ["app/admin/assets/js/pmd-waiter-final-v2.js"]="39feecf4c88d91fac230171707206f828b7cd2b7"
  ["routes/pmd-waiter-final-v2.php"]="17000cad4b0c5c8503de6619d5517e97b16daee1"
)

INSTALLED=0

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"
  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring the previous production state..."

    for FILE in "${FILES[@]}"; do
      sudo rm -f "$LIVE/$FILE"
      if grep -Fxq "$FILE" "$BACKUP/existing-files.txt" 2>/dev/null; then
        sudo mkdir -p "$(dirname "$LIVE/$FILE")"
        sudo cp -a "$BACKUP/files/$FILE" "$LIVE/$FILE"
      fi
    done

    sudo cp -a "$BACKUP/app-admin-routes.php.before" "$ROUTES"
    php artisan view:clear || true
    php artisan route:clear || true
    php artisan config:clear || true
    echo "Previous production files restored."
  fi
  cleanup
  exit "$code"
}
trap rollback_on_error EXIT

cd "$LIVE"

echo "========================================================"
echo "PMD Waiter Final V2 — sharp POS workstation"
echo "========================================================"

echo
echo "== Confirming proven waiter engines =="
test -s app/admin/assets/js/pmd-waiter-pos-v1.js
test -s app/admin/assets/js/pmd-waiter-pos-payment-v2.js
test -s app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js
test -s app/admin/assets/js/pmd-waiter-standard-v22.js
test -s app/admin/assets/js/pmd-waiter-final-v1.js
test -s app/admin/assets/js/pmd-waiter-final-v11-fixes.js
test -s app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js
test -s app/admin/assets/css/pmd-waiter-standard-v211-payment-guard.css
test -s app/admin/assets/css/pmd-waiter-standard-v22.css
test -s app/admin/controllers/PmdWaiterPosV1.php
test -s app/admin/views/waiter_pos_shell.blade.php
grep -Fq "PMDWaiterPOSApp" app/admin/assets/js/pmd-waiter-pos-v1.js
grep -Fq "data-pos-mobile-cart" app/admin/views/waiter_pos_shell.blade.php
echo "PMD_WAITER_FINAL_V2_BACKEND_BASE_OK"

echo
echo "== Fetching isolated GitHub branch =="
git fetch --no-tags origin \
  agent/waiter-pos-final-v2-sharp-workstation:refs/remotes/origin/agent/waiter-pos-final-v2-sharp-workstation

echo "Branch commit: $(git rev-parse "$BRANCH")"

mkdir -p "$TMP"

echo
echo "== Extracting and hash-validating only Final2 files =="
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
echo "== Validating PHP, Blade, JavaScript and CSS =="
php -l "$TMP/app/admin/controllers/PmdWaiterDashboardFinalV2.php"
php -l "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
php -l "$TMP/routes/pmd-waiter-final-v2.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-final-v2.js"

grep -Fq "data-pmd-waiter-final2-root" "$TMP/app/admin/views/waiter_dashboard_final2.blade.php"
grep -Fq "dashboardwaiternewfinal2" "$TMP/routes/pmd-waiter-final-v2.php"
grep -Fq "grid-template-columns: 138px minmax(0, 1fr)" "$TMP/app/admin/assets/css/pmd-waiter-final-v2-pos.css"
grep -Fq "pmd-pos-product-desc { display: none" "$TMP/app/admin/assets/css/pmd-waiter-final-v2-pos.css"
grep -Fq "pmd-pos-mobile-cart-bar" "$TMP/app/admin/assets/css/pmd-waiter-final-v2-responsive.css"
grep -Fq "repeat(2, minmax(0,1fr))" "$TMP/app/admin/assets/css/pmd-waiter-final-v2-responsive.css"
grep -Fq "Waiter Final V2 sharp workstation active" "$TMP/app/admin/assets/js/pmd-waiter-final-v2.js"

echo "PMD_WAITER_FINAL_V2_SOURCE_OK"

echo
echo "== Preparing route-loader patch =="
mkdir -p "$(dirname "$TMP_ROUTES")"
cp -a "$ROUTES" "$TMP_ROUTES"

if ! grep -Fq "PMD_WAITER_FINAL_V2_ROUTE_LOADER" "$TMP_ROUTES"; then
  cat >> "$TMP_ROUTES" <<'PHP'

// PMD_WAITER_FINAL_V2_ROUTE_LOADER
require_once base_path('routes/pmd-waiter-final-v2.php');
PHP
fi

php -l "$TMP_ROUTES"
grep -Fq "routes/pmd-waiter-final-v2.php" "$TMP_ROUTES"
echo "PMD_WAITER_FINAL_V2_ROUTE_LOADER_OK"

echo
echo "== Creating complete rollback backup =="
sudo mkdir -p "$BACKUP/files"
sudo sh -c "> \"$BACKUP/existing-files.txt\""

for FILE in "${FILES[@]}"; do
  if [[ -e "$LIVE/$FILE" ]]; then
    echo "$FILE" | sudo tee -a "$BACKUP/existing-files.txt" >/dev/null
    sudo mkdir -p "$BACKUP/files/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/files/$FILE"
  fi
done

sudo cp -a "$ROUTES" "$BACKUP/app-admin-routes.php.before"
echo "Backup: $BACKUP"

echo
echo "== Installing isolated Final2 files =="
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$LIVE/$FILE")"
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

sudo install -m 0644 "$TMP_ROUTES" "$ROUTES"
INSTALLED=1

echo
echo "== Validating installed production files =="
php -l "$LIVE/app/admin/controllers/PmdWaiterDashboardFinalV2.php"
php -l "$LIVE/app/admin/views/waiter_dashboard_final2.blade.php"
php -l "$LIVE/routes/pmd-waiter-final-v2.php"
php -l "$ROUTES"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-final-v2.js"

for FILE in "${FILES[@]}"; do
  ACTUAL="$(git hash-object "$LIVE/$FILE")"
  if [[ "$ACTUAL" != "${EXPECTED[$FILE]}" ]]; then
    echo "ERROR: Installed blob mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Clearing Laravel/TastyIgniter caches =="
php artisan view:clear
php artisan route:clear
php artisan config:clear

echo
echo "== Checking the new URL =="
HTTP_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' \
  https://mimoza.paymydine.com/admin/dashboardwaiternewfinal2 || true)"

echo "HTTP: $HTTP_CODE"
if [[ "$HTTP_CODE" == "404" || "$HTTP_CODE" =~ ^5 ]]; then
  echo "ERROR: Final2 route returned HTTP $HTTP_CODE"
  exit 1
fi
if [[ "$HTTP_CODE" == "000" ]]; then
  echo "WARNING: Network check was unavailable; source and route loader validation passed."
fi

echo
echo "========================================================"
echo "PMD Waiter Final V2 installed successfully"
echo "========================================================"
echo "✓ Completely separate Final2 URL"
echo "✓ Existing final and final1.2 pages untouched"
echo "✓ Desktop categories fixed in a left-side rail"
echo "✓ Product cards show only name and price"
echo "✓ Product cards are fully clickable; no ADD badge"
echo "✓ Sharper operational colors and 3px corners"
echo "✓ No large rounded frame around the catalog"
echo "✓ Desktop keeps the current-order ticket on the right"
echo "✓ Phone keeps two product columns"
echo "✓ Phone has a permanent ORDER bar with item count, total and arrow"
echo "✓ Proven order, modifier, kitchen, payment, coupon and split engines reused"
echo
echo "Preview:"
echo "https://mimoza.paymydine.com/admin/dashboardwaiternewfinal2"
echo
echo "Short URL:"
echo "https://mimoza.paymydine.com/admin/waiter-final2"
echo
echo "Console:"
echo "PMDWaiterFinalV2.debug()"
echo
echo "Backup: $BACKUP"
echo "========================================================"
