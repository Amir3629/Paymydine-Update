#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd_vr_payment_r11_${TS}"
BACKUP="/var/backups/pmd_vr_payment_r11_${TS}"
TARGET="app/Services/Payments/VrPaymentApiClient.php"
PATCHER="scripts/patch-pmd-vr-payment-r11.py"

cd "$ROOT"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT R1.1"
echo " FIX PAYMENT METHOD DISCOVERY ORDERING"
echo "============================================================"

git fetch "$REMOTE" "$BRANCH"
SHA="$(git rev-parse "$REMOTE/$BRANCH")"
echo "REMOTE=$SHA"

mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

git show "$REMOTE/$BRANCH:$PATCHER" > "$TMP/patch.py"
cp "$TARGET" "$TMP/VrPaymentApiClient.php"
python3 "$TMP/patch.py" "$TMP/VrPaymentApiClient.php"
php -l "$TMP/VrPaymentApiClient.php"

grep -q 'PMD_VR_PAYMENT_R11_METHOD_DISCOVERY' "$TMP/VrPaymentApiClient.php"
grep -q "'/api/v2.0/payment/method-configurations'" "$TMP/VrPaymentApiClient.php"

echo "STATIC_CONTRACT=OK"

sudo cp "$TARGET" "$BACKUP/VrPaymentApiClient.php"
sudo cp "$TMP/VrPaymentApiClient.php" "$TARGET"
sudo chown --reference="$BACKUP/VrPaymentApiClient.php" "$TARGET" 2>/dev/null || true
sudo chmod --reference="$BACKUP/VrPaymentApiClient.php" "$TARGET" 2>/dev/null || true

php -l "$TARGET"

echo "========== CLEAR CACHES =========="
php artisan view:clear || true
php artisan route:clear || true
php artisan config:clear || true
php artisan clear-compiled || true

echo "========== LIVE VERIFY =========="
grep -n -A12 -B2 'PMD_VR_PAYMENT_R11_METHOD_DISCOVERY' "$TARGET"

echo "============================================================"
echo " SUCCESS - VR PAYMENT R1.1 INSTALLED"
echo "============================================================"
echo "METHOD_DISCOVERY_ENDPOINT=/api/v2.0/payment/method-configurations"
echo "METHOD_DISCOVERY_ORDER=ASC"
echo "BACKUP=$BACKUP"
echo "REMOTE=$SHA"
