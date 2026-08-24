#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-1"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BOOTSTRAP_TEST_DRAWER="${BOOTSTRAP_TEST_DRAWER:-0}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-cash-drawer-r21.XXXXXX)"
BACKUP="$ROOT/storage/pmd-cash-drawer-r21-backups/$STAMP"
ACTIVATED=0

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  echo "PMD CASH DRAWER R2.1 REFUSED: $*" >&2
  exit 1
}

http_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

repo_git() {
  sudo -u ubuntu git -C "$ROOT" "$@"
}

cleanup() {
  rm -rf "$STAGE" 2>/dev/null || true
}

rollback_code() {
  [[ "$ACTIVATED" -eq 1 ]] || return 0
  echo
  echo "AUTOMATIC PMD CASH DRAWER R2.1 CODE ROLLBACK"
  if [[ -x "$BACKUP/rollback.sh" ]]; then
    bash "$BACKUP/rollback.sh" || true
  fi
}

trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback_code; fi; cleanup; exit $rc' EXIT

[[ "$(id -u)" -eq 0 ]] || fail "Run with sudo/root."
[[ -d "$ROOT/.git" && -f "$ROOT/artisan" ]] || fail "PayMyDine root not found: $ROOT"
cd "$ROOT"

HEAD_BEFORE="$(repo_git rev-parse HEAD)"
BRANCH_BEFORE="$(repo_git branch --show-current)"
[[ "$BRANCH_BEFORE" == "main" ]] || fail "Live branch must stay main; found $BRANCH_BEFORE"

log "1. PRE-DEPLOY HEALTH"
PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?r21=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?r21=$(date +%s)")"
PRE_ADMIN="$(http_code "https://$TEST_HOST/admin/pmddevices?r21=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?r21=$(date +%s)")"
echo "HEAD:     $HEAD_BEFORE"
echo "BRANCH:   $BRANCH_BEFORE"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU admin=$PRE_ADMIN root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" && "$PRE_MENU" == "200" && "$PRE_ROOT" == "200" ]] || fail "Production is unhealthy before deploy."
case "$PRE_ADMIN" in 5*|000) fail "Admin is unhealthy before deploy." ;; esac

log "2. FETCH REVIEWED R2.1"
repo_git fetch origin "$BRANCH" || fail "Unable to fetch $BRANCH"
FETCH_REF="FETCH_HEAD"
mkdir -p "$STAGE/files"

EXACT_FILES=(
  "config/cashdrawer.php"
  "tools/local-pos-agent/agent.js"
  "routes/pmd-pos-agent-r1.php"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/controllers/Api/PosAgentR1Controller.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
)

PATCH_TARGETS=(
  "routes/api.php"
  "routes/pos-receipts.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/admin/assets/js/pmd-cashier-order-composer-v1.js"
  "app/Services/PmdTenantProductBaselineR1.php"
  "app/admin/views/pmddevices/_inline_modal_form.blade.php"
  "app/admin/assets/js/pmd-device-inline-v6.js"
)

for rel in "${EXACT_FILES[@]}"; do
  mkdir -p "$STAGE/files/$(dirname "$rel")"
  repo_git show "$FETCH_REF:$rel" > "$STAGE/files/$rel" || fail "Unable to stage exact file: $rel"
done

for rel in "${PATCH_TARGETS[@]}"; do
  [[ -f "$ROOT/$rel" ]] || fail "Live patch target missing: $rel"
  mkdir -p "$STAGE/files/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$STAGE/files/$rel"
done

repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-patch.py" > "$STAGE/r2-patch.py" || fail "R2 patcher missing"
repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-1-patch.py" > "$STAGE/r21-patch.py" || fail "R2.1 patcher missing"
repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-tenants.php" > "$STAGE/tenants.php" || fail "Tenant runner missing"

[[ -f "$ROOT/.env" ]] || fail ".env is missing"
cp -a "$ROOT/.env" "$STAGE/files/.env"

log "3. PATCH LIVE-AUTHORITY COPIES IN STAGE"
python3 "$STAGE/r2-patch.py" "$STAGE/files" || fail "R2 source patch failed"
python3 "$STAGE/r21-patch.py" "$STAGE/files" || fail "R2.1 source patch failed"

if grep -q '^CASHDRAWER_LOCAL_AGENT_ENABLED=' "$STAGE/files/.env"; then
  sed -i 's/^CASHDRAWER_LOCAL_AGENT_ENABLED=.*/CASHDRAWER_LOCAL_AGENT_ENABLED=true/' "$STAGE/files/.env"
else
  printf '\nCASHDRAWER_LOCAL_AGENT_ENABLED=true\n' >> "$STAGE/files/.env"
fi

log "4. SOURCE CONTRACT + SYNTAX"
PHP_FILES=(
  "config/cashdrawer.php"
  "routes/pmd-pos-agent-r1.php"
  "routes/api.php"
  "routes/pos-receipts.php"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/controllers/Api/PosAgentR1Controller.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/Services/PmdTenantProductBaselineR1.php"
)
for rel in "${PHP_FILES[@]}"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
php -l "$STAGE/tenants.php" >/dev/null || fail "Tenant runner PHP syntax failed"
python3 -m py_compile "$STAGE/r2-patch.py" "$STAGE/r21-patch.py" || fail "Python patcher syntax failed"
node --check "$STAGE/files/tools/local-pos-agent/agent.js" || fail "Agent JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Payment JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-device-inline-v6.js" || fail "Device settings JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-cashier-order-composer-v1.js" || fail "Cashier composer JavaScript syntax failed"

grep -q "prefix('v1/pmd-pos-agent')" "$STAGE/files/routes/pmd-pos-agent-r1.php" || fail "Agent API v1 route marker missing"
grep -q '/api/v1/pmd-pos-agent/agent.js' "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Windows connector is not using API v1 Agent URL"
grep -q 'PMD_CASH_DRAWER_SIMPLE_SETUP_R2' "$STAGE/files/app/admin/views/pmddevices/_inline_modal_form.blade.php" || fail "Simple drawer UI marker missing"
grep -q 'PMD_CASH_DRAWER_SETTLEMENT_R1' "$STAGE/files/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php" || fail "Cash settlement wiring missing"
grep -q 'PMD_CASHIER_LOCAL_POS_IDENTITY_R1' "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Cashier workstation identity missing"
grep -q 'PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R21' "$STAGE/files/routes/pos-receipts.php" || fail "Receipt tenant authority marker missing"
grep -q 'PMD_CASHIER_TABLE_HINT_R21' "$STAGE/files/app/admin/assets/js/pmd-cashier-order-composer-v1.js" || fail "Cashier table-hint runtime fix missing"

log "5. RECHECK CASH-DRAWER SCHEMA FOR ALL TENANTS"
PMD_ROOT="$ROOT" PMD_TENANT_DOMAIN="" PMD_BOOTSTRAP_DOMAIN="" \
  php "$STAGE/tenants.php" "$STAGE/files/app/Services/PmdCashDrawerFoundationR1.php" \
  || fail "One or more tenant databases could not be repaired safely"

log "6. BACKUP LIVE FILES"
mkdir -p "$BACKUP/files"
: > "$BACKUP/present.list"
: > "$BACKUP/missing.list"

ALL_FILES=(
  ".env"
  "${EXACT_FILES[@]}"
  "${PATCH_TARGETS[@]}"
)

for rel in "${ALL_FILES[@]}"; do
  if [[ -e "$ROOT/$rel" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
    echo "$rel" >> "$BACKUP/present.list"
  else
    echo "$rel" >> "$BACKUP/missing.list"
  fi
done

cat > "$BACKUP/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$ROOT"
BACKUP_DIR="$BACKUP"
while IFS= read -r rel; do
  [[ -n "\$rel" ]] || continue
  mkdir -p "\$ROOT/\$(dirname "\$rel")"
  cp -a "\$BACKUP_DIR/files/\$rel" "\$ROOT/\$rel"
done < "\$BACKUP_DIR/present.list"
while IFS= read -r rel; do
  [[ -n "\$rel" ]] || continue
  rm -f "\$ROOT/\$rel"
done < "\$BACKUP_DIR/missing.list"
cd "\$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
echo "PMD CASH DRAWER R2.1 CODE ROLLBACK COMPLETE"
echo "Additive tenant schema changes are intentionally preserved."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "7. ACTIVATE"
DEFAULT_OWNER="$(stat -c '%U' "$ROOT/artisan")"
DEFAULT_GROUP="$(stat -c '%G' "$ROOT/artisan")"

install_one() {
  local rel="$1"
  local src="$STAGE/files/$rel"
  local dst="$ROOT/$rel"
  local owner group mode
  [[ -f "$src" ]] || fail "Staged activation file missing: $rel"
  mkdir -p "$(dirname "$dst")"
  if [[ -e "$dst" ]]; then
    owner="$(stat -c '%U' "$dst")"
    group="$(stat -c '%G' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    owner="$DEFAULT_OWNER"
    group="$DEFAULT_GROUP"
    mode="644"
  fi
  install -o "$owner" -g "$group" -m "$mode" "$src" "$dst"
}

for rel in "${ALL_FILES[@]}"; do
  install_one "$rel"
done
ACTIVATED=1

php artisan optimize:clear >/dev/null
systemctl reload "$PHP_FPM"
sleep 2

log "8. OPTIONAL TEST-TENANT BOOTSTRAP"
if [[ "$BOOTSTRAP_TEST_DRAWER" == "1" ]]; then
  PMD_ROOT="$ROOT" PMD_TENANT_DOMAIN="$TEST_HOST" PMD_BOOTSTRAP_DOMAIN="$TEST_HOST" \
    php "$STAGE/tenants.php" "$ROOT/app/Services/PmdCashDrawerFoundationR1.php" \
    || fail "Test tenant bootstrap failed"
else
  echo "BOOTSTRAP_TEST_DRAWER=0 - existing test drawer/device rows are preserved"
fi

log "9. POST-DEPLOY VERIFICATION"
POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?r21=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?r21=$(date +%s)")"
POST_ADMIN="$(http_code "https://$TEST_HOST/admin/pmddevices?r21=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?r21=$(date +%s)")"
AGENT_CODE="$(curl -k -sS -o /tmp/pmd-agent-r21.out -w '%{http_code}' "https://$TEST_HOST/api/v1/pmd-pos-agent/agent.js?r21=$(date +%s)")"
PULL_CODE="$(curl -k -sS -o /tmp/pmd-agent-r21-pull.out -w '%{http_code}' "https://$TEST_HOST/api/v1/pmd-pos-agent/pull?device_code=PMD-UNAUTHORIZED-R21")"

echo "POST settings=$POST_SETTINGS menu=$POST_MENU admin=$POST_ADMIN root=$POST_ROOT agent=$AGENT_CODE unauth_pull=$PULL_CODE"
[[ "$POST_SETTINGS" == "200" && "$POST_MENU" == "200" && "$POST_ROOT" == "200" ]] || fail "Core HTTP health failed after activation"
case "$POST_ADMIN" in 5*|000) fail "Admin health failed after activation" ;; esac
[[ "$AGENT_CODE" == "200" ]] || fail "Agent package route is not 200"
[[ "$PULL_CODE" == "401" ]] || fail "Unauthenticated Agent pull must be 401, got $PULL_CODE"
grep -q 'PayMyDine Local POS Agent' /tmp/pmd-agent-r21.out || fail "Served Agent body is invalid"
grep -q '/api/v1/pmd-pos-agent/pair' /tmp/pmd-agent-r21.out || fail "Served Agent is not using tenant-safe API v1 pairing"

grep -q 'PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R21' "$ROOT/routes/pos-receipts.php" || fail "Live receipt route marker missing"
grep -q 'PMD_CASHIER_TABLE_HINT_R21' "$ROOT/app/admin/assets/js/pmd-cashier-order-composer-v1.js" || fail "Live Cashier table-hint marker missing"

for rel in \
  app/admin/assets/js/pmd-device-inline-v6.js \
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js \
  app/admin/assets/js/pmd-cashier-order-composer-v1.js
do
  LOCAL_HASH="$(sha256sum "$ROOT/$rel" | awk '{print $1}')"
  SERVED_HASH="$(curl -k -fsSL "https://$TEST_HOST/$rel?r21=$(date +%s%N)" | sha256sum | awk '{print $1}')"
  echo "$rel"
  echo "LOCAL : $LOCAL_HASH"
  echo "SERVED: $SERVED_HASH"
  [[ "$LOCAL_HASH" == "$SERVED_HASH" ]] || fail "Nginx is not serving the activated asset: $rel"
done

HEAD_AFTER="$(repo_git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || fail "Live Git HEAD moved"

ACTIVATED=0
log "PMD CASH DRAWER + LOCAL POS AGENT R2.1 DEPLOYED"
echo "Agent authority: /api/v1/pmd-pos-agent/*"
echo "Receipt authority: tenant DB + Admin.Orders permission"
echo "Cashier table hint runtime: repaired"
echo "Next: Windows printer driver/test page, then Connector -> Find printers -> Test print -> Test drawer."
