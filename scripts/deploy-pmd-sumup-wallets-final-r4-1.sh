#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
REMOTE="origin/$BRANCH"
STAMP="$(date +%Y%m%d_%H%M%S)"
WORK="/tmp/pmd_sumup_wallets_final_r4_1_${STAMP}"
BACKUP="/var/backups/pmd_sumup_wallets_final_r4_1_${STAMP}"
R4="scripts/deploy-pmd-sumup-wallets-final-r4.sh"
DISCOVERY_PATCH="scripts/patch-pmd-sumup-payment-method-discovery-r4.py"
SERVICE="app/Services/Payments/SumupOnlineCheckoutService.php"

cd "$ROOT"
mkdir -p "$WORK"
sudo mkdir -p "$BACKUP"

echo "============================================================"
echo " PAYMYDINE SUMUP WALLETS FINAL R4.1"
echo " STRICT WALLET UI + OFFICIAL SUMUP ELIGIBILITY DISCOVERY"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

for f in "$R4" "$DISCOVERY_PATCH"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote file missing: $f"; exit 2; }
  mkdir -p "$WORK/$(dirname "$f")"
  git show "$REMOTE:$f" > "$WORK/$f"
  echo "STAGED: $f"
done
bash -n "$WORK/$R4"
python3 -m py_compile "$WORK/$DISCOVERY_PATCH"

# First install the frontend/admin R4 guard. It is itself audited, backed up and
# rollback-safe. It never changes the SumUp connection, tenant secrets or DB.
echo "========== INSTALL R4 WALLET UI GUARD =========="
bash "$WORK/$R4"

# Then align backend eligibility with SumUp's current documented endpoint.
echo "========== STAGE OFFICIAL PAYMENT-METHOD DISCOVERY =========="
[ -f "$ROOT/$SERVICE" ] || { echo "ERROR: live SumUp checkout service missing"; exit 3; }
mkdir -p "$WORK/$(dirname "$SERVICE")"
cp "$ROOT/$SERVICE" "$WORK/$SERVICE"
python3 "$WORK/$DISCOVERY_PATCH" "$WORK"
php -l "$WORK/$SERVICE"
grep -Fq 'PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4' "$WORK/$SERVICE"
grep -Fq "/v0.1/merchants/'.rawurlencode(\$merchantCode).'/payment-methods" "$WORK/$SERVICE"
if grep -Fq "/v0.1/checkouts/'.rawurlencode(\$checkoutId).'/payment-methods" "$WORK/$SERVICE"; then
  echo "ERROR: stale checkout-specific payment-method endpoint remains"
  exit 4
fi
echo "OFFICIAL_METHOD_DISCOVERY_PREFLIGHT=OK"

echo "========== BACKUP + INSTALL BACKEND ELIGIBILITY =========="
sudo mkdir -p "$BACKUP/$(dirname "$SERVICE")"
sudo cp -a "$ROOT/$SERVICE" "$BACKUP/$SERVICE"
rollback_backend() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! R4.1 BACKEND ELIGIBILITY FAILED - RESTORING SERVICE !!!!!"
  sudo cp -a "$BACKUP/$SERVICE" "$ROOT/$SERVICE" 2>/dev/null || true
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_BACKEND_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$rc" != "0" ]; then rollback_backend "$rc"; fi' EXIT

sudo install -m 0644 "$WORK/$SERVICE" "$ROOT/$SERVICE"
php -l "$ROOT/$SERVICE"
sudo -u www-data php artisan optimize:clear

# Static live contract check. No real payment is created here.
grep -Fq 'PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4' "$ROOT/$SERVICE"
grep -Fq "'amount' => round(\$amount, 2)" "$ROOT/$SERVICE"
grep -Fq "'currency' => strtoupper(\$currency)" "$ROOT/$SERVICE"
trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP WALLETS FINAL R4.1 INSTALLED"
echo "============================================================"
echo "APPLE_EXTENSIONLESS_FILE=selectable_in_PMD"
echo "APPLE_DOMAIN_FILE=required_before_Apple_widget_mount"
echo "APPLE_CARD_FALLBACK=blocked"
echo "GOOGLE_CARD_FALLBACK=blocked"
echo "SUMUP_METHOD_DISCOVERY=/v0.1/merchants/{merchant_code}/payment-methods"
echo "SUMUP_METHOD_DISCOVERY_FILTER=amount+currency"
echo "STANDALONE_WALLET_ELIGIBILITY=fail_closed"
echo "CARD_WALLET=unchanged"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
