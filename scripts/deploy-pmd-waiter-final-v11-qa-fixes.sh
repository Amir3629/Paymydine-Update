#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-final-v11-qa-fixes"
REF="origin/$BRANCH"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-v11-$TS"
BACKUP="/var/backups/pmd-waiter-final-v11-$TS"
INSTALLED=0

FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosRobustTableScopeV11Concern.php"
  "app/admin/views/waiter_dashboard_final.blade.php"
  "app/admin/assets/js/pmd-waiter-final-v11-fixes.js"
  "app/admin/assets/css/pmd-waiter-final-v11-fixes.css"
)

declare -A EXPECTED=(
  ["app/admin/controllers/PmdWaiterPosV1.php"]="2e61c0d7340977f7805feab3fc2b472c6ed51165"
  ["app/admin/controllers/concerns/PmdWaiterPosRobustTableScopeV11Concern.php"]="b1e4e093f3425fdb1e5a640e1c1505f81d0f27f1"
  ["app/admin/views/waiter_dashboard_final.blade.php"]="b85b8bbb44029cf54a7df836bba93f421dc6a3c3"
  ["app/admin/assets/js/pmd-waiter-final-v11-fixes.js"]="6a2a98598517d85f45b01546060a925efc654564"
  ["app/admin/assets/css/pmd-waiter-final-v11-fixes.css"]="b4b3f04595500c6a5644391a9cef2a331d313e40"
)

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring previous waiter files..."

    for FILE in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$FILE.before" ]]; then
        sudo install -D -m 0644 "$BACKUP/$FILE.before" "$LIVE/$FILE"
      elif [[ -f "$BACKUP/$FILE.was-missing" ]]; then
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    cd "$LIVE"
    php artisan view:clear || true
    php artisan route:clear || true
    php artisan config:clear || true
    echo "Previous files restored."
  fi

  cleanup
  exit "$code"
}

trap rollback_on_error EXIT

cd "$LIVE"
mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo "========================================================"
echo "PMD Waiter Final V1.1 — QA production fixes"
echo "========================================================"

echo
echo "== Fetching isolated GitHub branch =="
git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
echo "Branch commit: $(git rev-parse "$REF")"

echo
echo "== Extracting and hash-validating only five files =="
for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"

  ACTUAL="$(git hash-object "$TMP/$FILE")"
  echo "$FILE"
  echo "  expected: ${EXPECTED[$FILE]}"
  echo "  actual:   $ACTUAL"

  if [[ "$ACTUAL" != "${EXPECTED[$FILE]}" ]]; then
    echo "ERROR: source hash mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Validating PHP, Blade, JavaScript and CSS =="
php -l "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosRobustTableScopeV11Concern.php"
php -l "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-final-v11-fixes.js"

grep -Fq "PmdWaiterPosRobustTableScopeV11Concern::applyTableScope insteadof" \
  "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
grep -Fq "data-final-drawer aria-hidden=\"true\" inert" \
  "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
grep -Fq "pmd-waiter-final-v11-fixes.js" \
  "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
grep -Fq "min-height: 48px !important" \
  "$TMP/app/admin/assets/css/pmd-waiter-final-v11-fixes.css"
grep -Fq "Waiter Final V1.1 QA fixes active" \
  "$TMP/app/admin/assets/js/pmd-waiter-final-v11-fixes.js"

echo "PMD_WAITER_FINAL_V11_SOURCE_OK"

echo
echo "== Creating complete rollback backup =="
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
  if [[ -f "$LIVE/$FILE" ]]; then
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  else
    sudo touch "$BACKUP/$FILE.was-missing"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only the validated V1.1 files =="
INSTALLED=1
for FILE in "${FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

if [[ -f "$LIVE/app/admin/assets/js/pmd-waiter-final-v1.js" ]]; then
  sudo chown --reference="$LIVE/app/admin/assets/js/pmd-waiter-final-v1.js" \
    "$LIVE/app/admin/assets/js/pmd-waiter-final-v11-fixes.js" || true
fi
if [[ -f "$LIVE/app/admin/assets/css/pmd-waiter-final-v1.css" ]]; then
  sudo chown --reference="$LIVE/app/admin/assets/css/pmd-waiter-final-v1.css" \
    "$LIVE/app/admin/assets/css/pmd-waiter-final-v11-fixes.css" || true
fi
if [[ -f "$LIVE/app/admin/controllers/concerns/PmdWaiterPosOrderScopeConcern.php" ]]; then
  sudo chown --reference="$LIVE/app/admin/controllers/concerns/PmdWaiterPosOrderScopeConcern.php" \
    "$LIVE/app/admin/controllers/concerns/PmdWaiterPosRobustTableScopeV11Concern.php" || true
fi

echo
echo "== Validating installed production files =="
php -l "$LIVE/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$LIVE/app/admin/controllers/concerns/PmdWaiterPosRobustTableScopeV11Concern.php"
php -l "$LIVE/app/admin/views/waiter_dashboard_final.blade.php"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-final-v11-fixes.js"

for FILE in "${FILES[@]}"; do
  ACTUAL="$(git hash-object "$LIVE/$FILE")"
  if [[ "$ACTUAL" != "${EXPECTED[$FILE]}" ]]; then
    echo "ERROR: installed hash mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Clearing Laravel/TastyIgniter caches =="
php artisan view:clear
php artisan route:clear
php artisan config:clear

INSTALLED=0

echo
echo "========================================================"
echo "PMD Waiter Final V1.1 installed successfully"
echo "========================================================"
echo "✓ Existing orders resolve by table PK, visible number and legacy text reference"
echo "✓ activeOrderId is recovered before POS mount"
echo "✓ PAY / SPLIT, Edit and Print unlock for real existing orders"
echo "✓ Hidden notification drawer is inert and no longer keyboard-focusable"
echo "✓ Grid/List controls are visible and 44px touch targets"
echo "✓ PAY / SPLIT is at least 48px, 52px on phone"
echo "✓ Reservations and table operations reuse the authenticated admin session"
echo "✓ Existing ordering, Hold, kitchen send, payment and split engines remain untouched"
echo
echo "Preview:"
echo "https://mimoza.paymydine.com/admin/dashboardwaiternewfinal"
echo
echo "Console checks:"
echo "PMDWaiterFinalV1.debug()"
echo "PMDWaiterFinalV11.debug()"
echo "PMDWaiterPOS && PMDWaiterPOS.debug()"
echo
echo "Backup: $BACKUP"
echo "========================================================"
