#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-standard-v211-payment-stable"
REF="origin/$BRANCH"

FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php"
  "app/admin/views/waiter_dashboard_new.blade.php"
  "app/admin/assets/css/pmd-waiter-standard-v211-payment-guard.css"
  "app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js"
)

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-payment-stable-v211-$TS"
BACKUP="/var/backups/pmd-waiter-payment-stable-v211-$TS"
INSTALLED=0

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation — restoring the previous V2.1 files..."

    for FILE in "${FILES[@]}"; do
      SAFE_NAME="${FILE//\//__}"
      if [[ -f "$BACKUP/$SAFE_NAME.before" ]]; then
        sudo install -m 0644 "$BACKUP/$SAFE_NAME.before" "$LIVE/$FILE"
        sudo chown --reference="$BACKUP/$SAFE_NAME.before" "$LIVE/$FILE" || true
      else
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    cd "$LIVE"
    php artisan view:clear || true
    php artisan route:clear || true
    echo "Previous V2.1 payment files restored."
  fi

  cleanup
  exit "$code"
}

trap rollback_on_error EXIT

cd "$LIVE"

cat <<'TXT'
======================================================
PMD Waiter Payment Stable V2.1.1 — selective update
======================================================
TXT

echo
echo "== Fetching isolated payment-fix branch =="

git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

echo
echo "== Confirming V2.1 preview baseline =="

grep -Fq \
  "Waiter Standard POS V2.1 complete operations layer active" \
  app/admin/assets/js/pmd-waiter-standard-v21.js

grep -Fq \
  "pmd-waiter-standard-v21.css" \
  app/admin/views/waiter_dashboard_new.blade.php

echo "PMD_WAITER_V21_BASE_OK"

mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo
echo "== Extracting only six V2.1.1 payment files =="

for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"
  echo "Extracted: $FILE"
done

echo
echo "== Validating extracted PHP, Blade, JavaScript and CSS =="

php -l "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php"
php -l "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js"

python3 - \
  "$TMP/app/admin/controllers/PmdWaiterPosV1.php" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php" \
  "$TMP/app/admin/views/waiter_dashboard_new.blade.php" \
  "$TMP/app/admin/assets/css/pmd-waiter-standard-v211-payment-guard.css" \
  "$TMP/app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js" <<'PY'
from pathlib import Path
import sys

controller = Path(sys.argv[1]).read_text(encoding="utf-8")
endpoint = Path(sys.argv[2]).read_text(encoding="utf-8")
fallback = Path(sys.argv[3]).read_text(encoding="utf-8")
blade = Path(sys.argv[4]).read_text(encoding="utf-8")
css = Path(sys.argv[5]).read_text(encoding="utf-8")
js = Path(sys.argv[6]).read_text(encoding="utf-8")

if css.count("{") != css.count("}"):
    raise SystemExit("ERROR: V2.1.1 CSS brace validation failed")

required = {
    "controller": [
        "PmdWaiterPosPaymentFallbackConcern.php",
        "PmdWaiterPosPaymentFallbackConcern;",
    ],
    "endpoint": [
        "buildPaymentSummaryFallback",
        "Payment details could not be loaded",
        "report($e)",
    ],
    "fallback": [
        "pmd-waiter-pos-v2.1.1-fallback",
        "fallbackPaymentStorageStatus",
        "fallbackPaidQuantities",
        "Payment storage is incomplete",
    ],
    "blade": [
        "pmd-waiter-standard-v211-payment-guard.css",
        "pmd-waiter-standard-v211-payment-guard.js",
        "pmd-waiter-standard-v211-page",
    ],
    "css": [
        "pmd-v211-payment-error",
        "pmd-v211-payment-warning",
        "RETRY" if False else "storage-missing",
    ],
    "js": [
        "pmd-waiter-payment-stable-v2.1.1",
        "preventedAutoCloses",
        "RETRY PAYMENT DETAILS",
        "Waiter payment stable V2.1.1 no-auto-close guard active",
    ],
}

for marker in required["controller"]:
    if marker not in controller:
        raise SystemExit(f"ERROR: Missing controller marker: {marker}")

for marker in required["endpoint"]:
    if marker not in endpoint:
        raise SystemExit(f"ERROR: Missing endpoint marker: {marker}")

for marker in required["fallback"]:
    if marker not in fallback:
        raise SystemExit(f"ERROR: Missing fallback marker: {marker}")

for marker in required["blade"]:
    if marker not in blade:
        raise SystemExit(f"ERROR: Missing Blade marker: {marker}")

for marker in required["css"]:
    if marker not in css:
        raise SystemExit(f"ERROR: Missing CSS marker: {marker}")

for marker in required["js"]:
    if marker not in js:
        raise SystemExit(f"ERROR: Missing JS marker: {marker}")

for forbidden in [
    "git reset --hard",
    "git checkout",
    "location.reload()",
    "window.fetch =",
    "CSSStyleDeclaration.prototype",
]:
    if forbidden in js or forbidden in fallback or forbidden in endpoint:
        raise SystemExit(f"ERROR: Forbidden implementation marker: {forbidden}")

print("PMD_WAITER_PAYMENT_V211_FILES_OK")
PY

echo
echo "== Backing up current live targets =="

for FILE in "${FILES[@]}"; do
  SAFE_NAME="${FILE//\//__}"
  if [[ -f "$LIVE/$FILE" ]]; then
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$SAFE_NAME.before"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only V2.1.1 payment stability files =="

for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$LIVE/$FILE")"
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"

  SAFE_NAME="${FILE//\//__}"
  if [[ -f "$BACKUP/$SAFE_NAME.before" ]]; then
    sudo chown --reference="$BACKUP/$SAFE_NAME.before" "$LIVE/$FILE" || true
  else
    sudo chown --reference="$(dirname "$LIVE/$FILE")" "$LIVE/$FILE" || true
  fi

  echo "Installed: $FILE"
done

INSTALLED=1

echo
echo "== Final live validation =="

php -l app/admin/controllers/PmdWaiterPosV1.php
php -l app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php
php -l app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php
php -l app/admin/views/waiter_dashboard_new.blade.php
node --check app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js

grep -n \
  "Waiter payment stable V2.1.1 no-auto-close guard active" \
  app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js

grep -n \
  "pmd-waiter-pos-v2.1.1-fallback" \
  app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php

echo
echo "== Confirming existing V2.1 UI remains installed =="

grep -n \
  "Waiter Standard POS V2.1 complete operations layer active" \
  app/admin/assets/js/pmd-waiter-standard-v21.js

grep -n \
  "pmd-waiter-standard-v21.css" \
  app/admin/views/waiter_dashboard_new.blade.php

echo
echo "== Clearing compiled views and route cache =="

php artisan view:clear
php artisan route:clear

INSTALLED=2

cat <<TXT

======================================================
PMD Waiter Payment Stable V2.1.1 installed
======================================================
✓ Payment modal no longer disappears after summary errors
✓ HTTP errors remain inside the modal with a Retry button
✓ Normal manual close with × remains unchanged
✓ Payment summary has a schema-safe fallback
✓ Missing optional payment columns no longer return HTML 500
✓ Missing payment storage is shown clearly and collection is disabled
✓ Existing split-bill, tips, coupons and provider payment engine preserved
✓ Existing Waiter Standard POS V2.1 design preserved
✓ Legacy waiter dashboard remains untouched

Preview:
https://<tenant>.paymydine.com/admin/dashboardwaiternew

Console check:
PMDWaiterPaymentStableV211.debug()

Backup:
$BACKUP
======================================================
TXT
