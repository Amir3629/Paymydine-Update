#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="e014798c47e7ef3008eb6cae7106b10a09b23d77"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/PmdQuickPosV1.php"
)

VIEW="app/admin/views/pmd_quick_pos_v1.blade.php"

log(){ printf '\n[PayMyDine V108] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V108][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V108 pay-before-Kitchen commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V108 commit unavailable"

# The current 0.3.28 APK intercepts the canonical Quick POS JS. The live V105
# view works around that by inlining the server JS. V107+ uses a unique runtime
# URL instead. Require one of those safe bridges before changing behavior.
if ! grep -Eq   "PMD_QPOS_ANDROID_SERVER_JS_OVERRIDE_V105|PMD_QPOS_ANDROID_RUNTIME_V108"   "$VIEW"; then
  fail "Android server-JS bridge is missing from the live Quick POS view"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v108-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v108-pay-before-kitchen-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
QUICK="$STAGE/app/admin/controllers/PmdQuickPosV1.php"

grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$JS"   || fail "V108 frontend gate missing"
grep -Fq "submitOrder(payBeforeKitchen ? 'hold' : 'send', 'pay')" "$JS"   || fail "V108 Pay routing missing"
if grep -Fq "submitOrder('send', 'pay');" "$JS"; then
  fail "Old Send-before-Pay bug is still present"
fi

grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$SAVE"   || fail "V108 dine-in backend gate missing"
grep -Fq "PMD_MOBILE_PAY_BEFORE_KITCHEN_V108" "$SAVE"   || fail "V108 mobile backend gate missing"
grep -Fq "PMD_QPOS_PAYMENT_GATE_IDENTITY_V108" "$PERSIST"   || fail "V108 durable gate identity missing"
grep -Fq "PMD_QPOS_PICKUP_PAY_BEFORE_KITCHEN_V108" "$QUICK"   || fail "V108 Pickup gate missing"

php -l "$SAVE" >/dev/null || fail "PHP syntax failed: PmdWaiterPosSaveEndpoint.php"
php -l "$PERSIST" >/dev/null || fail "PHP syntax failed: PmdWaiterPosOrderPersistenceConcern.php"
php -l "$QUICK" >/dev/null || fail "PHP syntax failed: PmdQuickPosV1.php"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null || fail "JavaScript syntax failed"
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing V108 JS + order persistence only"
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$STAGE/$rel" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108"   app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_PAYMENT_GATE_IDENTITY_V108"   app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V108 PAY-BEFORE-KITCHEN COMPLETE
============================================================

NEW CHECK + Send to Kitchen
  Kitchen dispatch = IMMEDIATE
  Payment          = LATER

NEW CHECK + Pay
  Internal order   = CREATED FOR PAYMENT
  Kitchen status   = Received-compatible
  processed        = 0
  KDS visibility   = BLOCKED
  Full payment     = processed -> 1
  KDS visibility   = RELEASED AFTER PAYMENT

FAILED / CANCELLED / PARTIAL PAYMENT
  processed        = 0
  KDS visibility   = BLOCKED

EXISTING ORDER ALREADY IN KITCHEN + Pay
  Existing Kitchen lifecycle = PRESERVED
  Payment only               = SETTLED

NOT REPLACED BY THIS DEPLOY
  Quick POS Blade/View
  V105 portrait fix
  Quick POS CSS
  database schema
  payment providers
  fiscalization
  terminal integrations

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
