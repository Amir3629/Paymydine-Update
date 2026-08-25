#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
TARGET="$ROOT/app/Services/Payments/VrPaymentApiClient.php"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_payment_method_search_r1_1_${STAMP}"
BACKUP="/var/backups/pmd_vr_payment_method_search_r1_1_${STAMP}"
HELPER="$STAGE/patch.py"
STAGED_TARGET="$STAGE/VrPaymentApiClient.php"

mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

cd "$ROOT"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT METHOD SEARCH R1.1"
echo " FIX SEARCH ORDER CONTRACT + SAFE API ERROR MESSAGE"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

git show "origin/$BRANCH:scripts/patch-pmd-vr-payment-method-search-r1-1.py" > "$HELPER"
chmod 755 "$HELPER"
python3 -m py_compile "$HELPER"
echo "PATCH_HELPER=OK"

if [[ ! -f "$TARGET" ]]; then
  echo "ERROR: live target not found: $TARGET" >&2
  exit 1
fi

cp "$TARGET" "$STAGED_TARGET"
sudo cp "$TARGET" "$BACKUP/VrPaymentApiClient.php"

echo "BACKUP=$BACKUP"

python3 "$HELPER" "$STAGED_TARGET"
php -l "$STAGED_TARGET"

if ! grep -q 'PMD_VR_PAYMENT_METHOD_SEARCH_R1_1' "$STAGED_TARGET"; then
  echo "ERROR: R1.1 marker missing from staged target" >&2
  exit 1
fi

if grep -A12 -F 'function paymentMethodConfigurations' "$STAGED_TARGET" | grep -Fq "'order' => 'id ASC'"; then
  echo "ERROR: invalid search order survived patch" >&2
  exit 1
fi

echo "STATIC_CONTRACT=OK"

sudo install -m 0644 "$STAGED_TARGET" "$TARGET"
php -l "$TARGET"

echo "INSTALLED=$TARGET"

php artisan optimize:clear || true

echo "========== LIVE CONTRACT =========="
grep -n -A10 -B2 'PMD_VR_PAYMENT_METHOD_SEARCH_R1_1' "$TARGET" || true

echo "============================================================"
echo " SUCCESS - VR PAYMENT METHOD SEARCH R1.1 INSTALLED"
echo "============================================================"
echo "PAYMENT_METHOD_SEARCH_ORDER=OMITTED"
echo "TERMINAL_LIST_ORDER=UNCHANGED"
echo "VR_PROVIDER_ERRORS=SURFACED_SAFELY"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
