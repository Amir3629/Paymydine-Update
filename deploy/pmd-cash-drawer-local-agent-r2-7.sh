#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-7"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BOOTSTRAP_TEST_DRAWER="${BOOTSTRAP_TEST_DRAWER:-0}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-cash-drawer-r27.XXXXXX)"
BACKUP="$ROOT/storage/pmd-cash-drawer-r27-backups/$STAMP"
ACTIVATED=0

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  echo "PMD CASH DRAWER R2.7 REFUSED: $*" >&2
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
  echo "AUTOMATIC PMD CASH DRAWER R2.7 CODE ROLLBACK"
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
PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?r27=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?r27=$(date +%s)")"
PRE_ADMIN="$(http_code "https://$TEST_HOST/admin/pmddevices?r27=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?r27=$(date +%s)")"
echo "HEAD:     $HEAD_BEFORE"
echo "BRANCH:   $BRANCH_BEFORE"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU admin=$PRE_ADMIN root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" && "$PRE_MENU" == "200" && "$PRE_ROOT" == "200" ]] || fail "Production is unhealthy before deploy."
case "$PRE_ADMIN" in 5*|000) fail "Admin is unhealthy before deploy." ;; esac

log "2. FETCH CASH-DRAWER R2.7"
repo_git fetch origin "$BRANCH" || fail "Unable to fetch $BRANCH"
FETCH_REF="FETCH_HEAD"
mkdir -p "$STAGE/files"

EXACT_FILES=(
  "pmd-pos-agent.php"
  "config/cashdrawer.php"
  "tools/local-pos-agent/agent.js"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/controllers/Api/PosAgentR1Controller.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
)

PATCH_TARGETS=(
  "routes/api.php"
  "app/admin/routes.php"
  "app/system/ServiceProvider.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
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

repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-patch.py" > "$STAGE/r2-patch.py" || fail "R2 base patcher missing"
repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-3-patch.py" > "$STAGE/r23-patch.py" || fail "R2.3 patcher missing"
repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-7-patch.py" > "$STAGE/r27-patch.py" || fail "R2.7 patcher missing"
repo_git show "$FETCH_REF:deploy/pmd-cash-drawer-local-agent-r2-tenants.php" > "$STAGE/tenants.php" || fail "Tenant runner missing"

[[ -f "$ROOT/.env" ]] || fail ".env is missing"
cp -a "$ROOT/.env" "$STAGE/files/.env"

log "3. PATCH CASH DRAWER + DIRECT PHP GATEWAY"
python3 "$STAGE/r2-patch.py" "$STAGE/files" || fail "R2 cash drawer source patch failed"
python3 "$STAGE/r23-patch.py" "$STAGE/files" || fail "R2.3 cash drawer source patch failed"
python3 "$STAGE/r27-patch.py" "$STAGE/files" || fail "R2.7 direct gateway patch failed"

if grep -q '^CASHDRAWER_LOCAL_AGENT_ENABLED=' "$STAGE/files/.env"; then
  sed -i 's/^CASHDRAWER_LOCAL_AGENT_ENABLED=.*/CASHDRAWER_LOCAL_AGENT_ENABLED=true/' "$STAGE/files/.env"
else
  printf '\nCASHDRAWER_LOCAL_AGENT_ENABLED=true\n' >> "$STAGE/files/.env"
fi

log "4. CASH DRAWER CONTRACT + SYNTAX"
PHP_FILES=(
  "pmd-pos-agent.php"
  "config/cashdrawer.php"
  "routes/api.php"
  "app/admin/routes.php"
  "app/system/ServiceProvider.php"
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
python3 -m py_compile "$STAGE/r2-patch.py" "$STAGE/r23-patch.py" "$STAGE/r27-patch.py" || fail "Python patcher syntax failed"
node --check "$STAGE/files/tools/local-pos-agent/agent.js" || fail "Agent JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Payment JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-device-inline-v6.js" || fail "Device settings JavaScript syntax failed"

# R2.7 has exactly one public hardware bridge: /pmd-pos-agent.php.
grep -q 'PMD_LOCAL_POS_DIRECT_GATEWAY_R27' "$STAGE/files/pmd-pos-agent.php" || fail "Direct Local POS gateway marker missing"
! grep -q 'PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER' "$STAGE/files/routes/api.php" || fail "Old routes/api.php Agent loader is still active"
! grep -q 'PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26' "$STAGE/files/routes/api.php" || fail "R2.6 API Agent loader is still active"
! grep -q 'PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24' "$STAGE/files/app/admin/routes.php" || fail "Old Admin Agent loader is still active"
! grep -q 'PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25' "$STAGE/files/app/system/ServiceProvider.php" || fail "Old System Agent loader is still active"
grep -q 'PMD_CASH_DRAWER_DIRECT_AGENT_DOWNLOAD_R27' "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Authenticated Agent download authority missing"
grep -q 'PMD_CASH_DRAWER_AGENT_SOURCE_GATEWAY_R27' "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Agent source gateway rewrite missing"
grep -q "pmd-pos-agent.php?action=pair" "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Downloaded Agent does not target direct pair gateway"
grep -q "X-PMD-Device-Token" "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Device token fallback header missing"
grep -q 'PMD_CASH_DRAWER_SNAKE_ACTION_ALIASES_R23' "$STAGE/files/app/admin/controllers/CashDrawers.php" || fail "Connector download aliases missing"
grep -q 'PMD_CASH_DRAWER_SIMPLE_SETUP_R2' "$STAGE/files/app/admin/views/pmddevices/_inline_modal_form.blade.php" || fail "Simple drawer setup UI missing"
grep -q 'PMD_CASH_DRAWER_SETTLEMENT_R1' "$STAGE/files/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php" || fail "Cash settlement drawer wiring missing"
grep -q 'PMD_CASHIER_LOCAL_POS_IDENTITY_R1' "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Cashier workstation identity missing"

log "5. RECHECK CASH-DRAWER SCHEMA FOR ALL TENANTS"
PMD_ROOT="$ROOT" PMD_TENANT_DOMAIN="" PMD_BOOTSTRAP_DOMAIN="" \
  php "$STAGE/tenants.php" "$STAGE/files/app/Services/PmdCashDrawerFoundationR1.php" \
  || fail "One or more tenant databases could not be repaired safely"

log "6. BACKUP LIVE CASH DRAWER FILES"
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
echo "PMD CASH DRAWER R2.7 CODE ROLLBACK COMPLETE"
echo "Additive tenant schema changes are intentionally preserved."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "7. ACTIVATE CASH DRAWER R2.7"
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
  echo "BOOTSTRAP_TEST_DRAWER=0 - existing drawer/device rows are preserved"
fi

log "9. DIRECT GATEWAY RUNTIME PROOF"
HEALTH_CODE="$(curl -k -sS -o /tmp/pmd-r27-health.out -w '%{http_code}' "https://$TEST_HOST/pmd-pos-agent.php?action=health&r27=$(date +%s)")"
PULL_CODE="$(curl -k -sS -o /tmp/pmd-r27-pull.out -w '%{http_code}' "https://$TEST_HOST/pmd-pos-agent.php?action=pull&device_code=PMD-UNAUTHORIZED-R27")"
PAIR_CODE="$(curl -k -sS -o /tmp/pmd-r27-pair.out -w '%{http_code}' \
  -X POST -H 'Content-Type: application/json' --data '{}' \
  "https://$TEST_HOST/pmd-pos-agent.php?action=pair")"
echo "gateway_health=$HEALTH_CODE unauth_pull=$PULL_CODE empty_pair=$PAIR_CODE"
[[ "$HEALTH_CODE" == "200" ]] || fail "Direct Local POS gateway health is not 200"
[[ "$PULL_CODE" == "401" ]] || fail "Unauthenticated direct gateway pull must be 401, got $PULL_CODE"
[[ "$PAIR_CODE" == "422" ]] || fail "Empty direct gateway pair must be 422, got $PAIR_CODE"
grep -q 'PayMyDine Local POS R2.7' /tmp/pmd-r27-health.out || fail "Direct gateway health body is invalid"

log "10. POST-DEPLOY CORE + CASH DRAWER VERIFICATION"
POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?r27=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?r27=$(date +%s)")"
POST_ADMIN="$(http_code "https://$TEST_HOST/admin/pmddevices?r27=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?r27=$(date +%s)")"
echo "POST settings=$POST_SETTINGS menu=$POST_MENU admin=$POST_ADMIN root=$POST_ROOT"
[[ "$POST_SETTINGS" == "200" && "$POST_MENU" == "200" && "$POST_ROOT" == "200" ]] || fail "Core HTTP health failed after activation"
case "$POST_ADMIN" in 5*|000) fail "Admin health failed after activation" ;; esac

grep -q 'PMD_LOCAL_POS_DIRECT_GATEWAY_R27' "$ROOT/pmd-pos-agent.php" || fail "Live direct gateway marker missing"
grep -q 'PMD_CASH_DRAWER_DIRECT_AGENT_DOWNLOAD_R27' "$ROOT/app/admin/controllers/CashDrawers.php" || fail "Live Agent download marker missing"
grep -q 'PMD_CASH_DRAWER_SIMPLE_SETUP_R2' "$ROOT/app/admin/views/pmddevices/_inline_modal_form.blade.php" || fail "Live simple drawer UI marker missing"
grep -q 'PMD_CASH_DRAWER_SETTLEMENT_R1' "$ROOT/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php" || fail "Live cash settlement wiring missing"

for rel in \
  app/admin/assets/js/pmd-device-inline-v6.js \
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
do
  LOCAL_HASH="$(sha256sum "$ROOT/$rel" | awk '{print $1}')"
  SERVED_HASH="$(curl -k -fsSL "https://$TEST_HOST/$rel?r27=$(date +%s%N)" | sha256sum | awk '{print $1}')"
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
log "PMD CASH DRAWER + LOCAL POS AGENT R2.7 DEPLOYED"
echo "Hardware bridge: /pmd-pos-agent.php?action=pair|pull|ack"
echo "Agent package: authenticated Admin download only"
echo "Receipt/invoice authorities were intentionally not touched by R2.7."
echo "Next: hard-refresh Devices, re-download Windows connector, Check connector, Load printers, Apply printer, Diagnose, Test drawer."
