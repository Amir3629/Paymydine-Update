#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
BRANCH="feature/cash-drawer-local-agent-r1"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
EXPECTED_HEAD="${EXPECTED_HEAD:-71750b33cc21b7ddcef24c946c5ccd01b2b83864}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-cash-drawer-local-agent-r1-backups/$STAMP"
STAGE="$(mktemp -d /tmp/pmd-cash-drawer-local-agent-r1.XXXXXX)"
ACTIVATED=0

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  echo "PMD CASH DRAWER LOCAL AGENT R1 REFUSED: $*" >&2
  exit 1
}

http_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

cleanup() {
  rm -rf "$STAGE" 2>/dev/null || true
}

rollback_code() {
  [[ "$ACTIVATED" -eq 1 ]] || return 0
  echo
  echo "AUTOMATIC CASH DRAWER R1 CODE ROLLBACK"
  if [[ -x "$BACKUP/rollback.sh" ]]; then
    bash "$BACKUP/rollback.sh" || true
  fi
}

trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback_code; fi; cleanup; exit $rc' EXIT

[[ "$(id -u)" -eq 0 ]] || fail "Run with sudo/root."
[[ -d "$ROOT" && -f "$ROOT/artisan" ]] || fail "PayMyDine root not found: $ROOT"
cd "$ROOT"

HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
[[ "$HEAD_BEFORE" == "$EXPECTED_HEAD" ]] || fail "Unexpected live Git HEAD: $HEAD_BEFORE"
[[ "$BRANCH_BEFORE" == "main" ]] || fail "Live branch must remain main; found: $BRANCH_BEFORE"

log "1. PRE-DEPLOY HEALTH"
PRE_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?cashr1=$(date +%s)")"
PRE_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?cashr1=$(date +%s)")"
PRE_ADMIN="$(http_code "https://$TEST_HOST/admin/managerlab?cashr1=$(date +%s)")"
PRE_ROOT="$(http_code "https://$TEST_HOST/?cashr1=$(date +%s)")"
echo "HEAD:     $HEAD_BEFORE"
echo "BRANCH:   $BRANCH_BEFORE"
echo "settings=$PRE_SETTINGS menu=$PRE_MENU admin=$PRE_ADMIN root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" && "$PRE_MENU" == "200" && "$PRE_ROOT" == "200" ]] || fail "Production is unhealthy before deploy."
case "$PRE_ADMIN" in 5*|000) fail "Admin is unhealthy before deploy." ;; esac

log "2. FETCH REVIEWED R1"
git fetch origin "$BRANCH" || fail "Unable to fetch $BRANCH"
FETCH_REF="FETCH_HEAD"
mkdir -p "$STAGE/files"

EXACT_FILES=(
  "config/cashdrawer.php"
  "tools/local-pos-agent/agent.js"
  "routes/pmd-pos-agent-r1.php"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
)

for rel in "${EXACT_FILES[@]}"; do
  mkdir -p "$STAGE/files/$(dirname "$rel")"
  git show "$FETCH_REF:$rel" > "$STAGE/files/$rel" || fail "Unable to stage $rel"
done

PATCH_FILES=(
  "routes/api.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/Services/PmdTenantProductBaselineR1.php"
)

for rel in "${PATCH_FILES[@]}"; do
  [[ -f "$ROOT/$rel" ]] || fail "Live patch target missing: $rel"
  mkdir -p "$STAGE/files/$(dirname "$rel")"
  cp -p "$ROOT/$rel" "$STAGE/files/$rel"
done

[[ -f "$ROOT/.env" ]] || fail ".env is missing"
cp -p "$ROOT/.env" "$STAGE/files/.env"

log "3. PATCH CURRENT LIVE SOURCES IN STAGE"
python3 - "$STAGE/files/routes/api.php" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
marker="PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER"
if marker not in s:
    anchor="// Apply CORS middleware to all API routes\n"
    if anchor not in s:
        raise SystemExit("routes/api.php anchor missing")
    block="// PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER\nrequire_once base_path('routes/pmd-pos-agent-r1.php');\n\n"
    s=s.replace(anchor, block+anchor, 1)
p.write_text(s)
PY

python3 - "$STAGE/files/app/admin/controllers/CashDrawers.php" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="$adminBase = rtrim(url(admin_url('/')), '/');"
new="$adminBase = rtrim(request()->getSchemeAndHttpHost(), '/');"
if old in s:
    s=s.replace(old,new,1)
old2="$agentUrl = $adminBase.'/cash_drawers/windows_connector_agent/'.$drawer->drawer_id;"
new2="$agentUrl = $adminBase.'/api/pmd-pos-agent/agent.js';"
if old2 in s:
    s=s.replace(old2,new2,1)
if new not in s or new2 not in s:
    raise SystemExit("CashDrawers connector URL patch failed")
p.write_text(s)
PY

python3 - "$STAGE/files/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
marker="PMD_CASH_DRAWER_SETTLEMENT_R1"
if marker not in s:
    import_anchor="use App\\Services\\TerminalPayments\\TerminalPaymentService;\n"
    if import_anchor not in s:
        raise SystemExit("settlement import anchor missing")
    s=s.replace(import_anchor, import_anchor+"use Admin\\Services\\CashDrawerService\\CashDrawerSettlementBridge;\n", 1)

    anchor="""                $order->refresh();
                $freshSummary = $this->buildPaymentSummary($order, true);
"""
    replacement="""                $order->refresh();

                // PMD_CASH_DRAWER_SETTLEMENT_R1
                // Queue only after the cash transaction exists. Hardware failure
                // never rolls back a valid payment; the bridge returns diagnostics.
                $cashDrawerResult = CashDrawerSettlementBridge::enqueueAfterSettlement(
                    $order,
                    (int)$transactionId,
                    $method,
                    $payload,
                    $idempotencyKey
                );

                $freshSummary = $this->buildPaymentSummary($order, true);
"""
    if anchor not in s:
        raise SystemExit("settlement refresh anchor missing")
    s=s.replace(anchor,replacement,1)

    anchor2="""                    'remaining_amount' => $newRemaining,
                ];
"""
    repl2="""                    'remaining_amount' => $newRemaining,
                    'cash_drawer' => $cashDrawerResult,
                ];
"""
    if anchor2 not in s:
        raise SystemExit("settlement result anchor missing")
    s=s.replace(anchor2,repl2,1)

    anchor3="""                'remaining_amount' => $result['remaining_amount'],
                'summary' => $result['summary'],
"""
    repl3="""                'remaining_amount' => $result['remaining_amount'],
                'cash_drawer' => $result['cash_drawer'] ?? null,
                'summary' => $result['summary'],
"""
    if anchor3 not in s:
        raise SystemExit("settlement response anchor missing")
    s=s.replace(anchor3,repl3,1)
p.write_text(s)
PY

python3 - "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
marker="PMD_CASHIER_LOCAL_POS_IDENTITY_R1"
if marker not in s:
    anchor="""      function resetPaymentState() {
"""
    helper="""      // PMD_CASHIER_LOCAL_POS_IDENTITY_R1
      var pmdLocalPosIdentityPromise = null;
      async function resolveLocalPosIdentity() {
        var cachedCode = '';
        try { cachedCode = String(window.localStorage.getItem('pmd_local_pos_device_code') || ''); } catch (e) {}
        if (pmdLocalPosIdentityPromise) return pmdLocalPosIdentityPromise;

        pmdLocalPosIdentityPromise = (async function () {
          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timer = controller ? setTimeout(function () { controller.abort(); }, 900) : null;
          try {
            var response = await fetch('http://127.0.0.1:17877/identity?_=' + Date.now(), {
              method: 'GET',
              cache: 'no-store',
              mode: 'cors',
              signal: controller ? controller.signal : undefined,
              headers: {'Accept': 'application/json'}
            });
            if (!response.ok) throw new Error('Local POS identity HTTP ' + response.status);
            var identity = await response.json();
            if (identity && identity.paired && identity.device_code) {
              try { window.localStorage.setItem('pmd_local_pos_device_code', String(identity.device_code)); } catch (e) {}
              return identity;
            }
          } catch (e) {
            // Connector may not be installed yet. Backend may still use the
            // single unambiguous drawer fallback for this location.
          } finally {
            if (timer) clearTimeout(timer);
          }
          return cachedCode ? {device_code: cachedCode, cached: true} : null;
        })();

        try { return await pmdLocalPosIdentityPromise; }
        finally { pmdLocalPosIdentityPromise = null; }
      }

"""
    if anchor not in s:
        raise SystemExit("payment JS reset anchor missing")
    s=s.replace(anchor,helper+anchor,1)

    anchor2="""        var summary = state.payment.summary;
        try {
          var json = await fetchJson(paymentSettleUrl(), {
"""
    repl2="""        var summary = state.payment.summary;
        try {
          var localPosIdentity = state.payment.method === 'cash'
            ? await resolveLocalPosIdentity()
            : null;
          var json = await fetchJson(paymentSettleUrl(), {
"""
    if anchor2 not in s:
        raise SystemExit("payment JS submit anchor missing")
    s=s.replace(anchor2,repl2,1)

    anchor3="""              payment_method: state.payment.method,
              provider_code: state.payment.method === 'external_terminal' ? 'external_terminal' : null,
"""
    repl3="""              payment_method: state.payment.method,
              pos_device_code: localPosIdentity && localPosIdentity.device_code ? String(localPosIdentity.device_code) : null,
              provider_code: state.payment.method === 'external_terminal' ? 'external_terminal' : null,
"""
    if anchor3 not in s:
        raise SystemExit("payment JS payload anchor missing")
    s=s.replace(anchor3,repl3,1)

    anchor4="""          toast(json.message || 'Payment recorded');
          showSuccess(json.message || 'Payment recorded.');
"""
    repl4="""          toast(json.message || 'Payment recorded');
          if (json.cash_drawer && json.cash_drawer.ok === false && !json.cash_drawer.skipped) {
            toast(json.cash_drawer.message || 'Payment recorded, but the cash drawer did not open.', true);
          }
          showSuccess(json.message || 'Payment recorded.');
"""
    if anchor4 not in s:
        raise SystemExit("payment JS result anchor missing")
    s=s.replace(anchor4,repl4,1)
p.write_text(s)
PY

python3 - "$STAGE/files/app/Services/PmdTenantProductBaselineR1.php" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
marker="PMD_CASH_DRAWER_FOUNDATION_R1"
if marker not in s:
    anchor="""        if (in_array('pos', $scopes, true)) {
            $this->step($report, 'cash_drawers', fn () => $this->ensureCashDrawers());
"""
    replacement="""        if (in_array('pos', $scopes, true)) {
            // PMD_CASH_DRAWER_FOUNDATION_R1
            $this->step($report, 'cash_drawer_local_agent_foundation', fn () => (new PmdCashDrawerFoundationR1())->repairCurrentTenant(false));
            $this->step($report, 'cash_drawers', fn () => $this->ensureCashDrawers());
"""
    if anchor not in s:
        raise SystemExit("tenant baseline POS anchor missing")
    s=s.replace(anchor,replacement,1)
p.write_text(s)
PY

GENERATED_TOKEN="$(openssl rand -hex 32)"
GENERATED_TOKEN="$GENERATED_TOKEN" python3 - "$STAGE/files/.env" <<'PY'
from pathlib import Path
import os,sys
p=Path(sys.argv[1]); text=p.read_text(); lines=text.splitlines()

def set_key(key, value, only_if_empty=False):
    global lines
    found=False
    for i,line in enumerate(lines):
        if line.startswith(key+'='):
            found=True
            current=line.split('=',1)[1].strip().strip('"').strip("'")
            if not only_if_empty or not current:
                lines[i]=key+'='+value
            return
    if not found:
        lines.append(key+'='+value)

set_key('CASHDRAWER_LOCAL_AGENT_ENABLED','true')
set_key('POS_AGENT_TOKEN', os.environ['GENERATED_TOKEN'], only_if_empty=True)
p.write_text('\n'.join(lines)+'\n')
PY
unset GENERATED_TOKEN

log "4. SOURCE CONTRACT + SYNTAX"
PHP_FILES=(
  "config/cashdrawer.php"
  "routes/pmd-pos-agent-r1.php"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
  "routes/api.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/Services/PmdTenantProductBaselineR1.php"
)
for rel in "${PHP_FILES[@]}"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
node --check "$STAGE/files/tools/local-pos-agent/agent.js" || fail "Agent JavaScript syntax failed"
node --check "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Cashier payment JavaScript syntax failed"

grep -q 'PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER' "$STAGE/files/routes/api.php" || fail "API route loader marker missing"
grep -q 'PMD_CASH_DRAWER_SETTLEMENT_R1' "$STAGE/files/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php" || fail "Cash settlement marker missing"
grep -q 'PMD_CASHIER_LOCAL_POS_IDENTITY_R1' "$STAGE/files/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" || fail "Cashier workstation marker missing"
grep -q 'PMD_CASH_DRAWER_FOUNDATION_R1' "$STAGE/files/app/Services/PmdTenantProductBaselineR1.php" || fail "Tenant baseline marker missing"
grep -q 'agent_token_hash' "$STAGE/files/app/admin/controllers/Api/PosAgentController.php" || fail "Per-device token authority missing"
grep -q 'dedupe_key' "$STAGE/files/app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php" || fail "Command dedupe authority missing"

log "5. BACKUP INDIVIDUAL FILES ONLY"
mkdir -p "$BACKUP/files"
: > "$BACKUP/present.list"
: > "$BACKUP/missing.list"

ALL_FILES=(
  ".env"
  "config/cashdrawer.php"
  "tools/local-pos-agent/agent.js"
  "routes/pmd-pos-agent-r1.php"
  "app/Services/PmdCashDrawerFoundationR1.php"
  "app/admin/Services/CashDrawerService/CashDrawerSettlementBridge.php"
  "app/admin/controllers/Api/PosAgentController.php"
  "app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
  "app/admin/Services/CashDrawerService/CashDrawerService.php"
  "routes/api.php"
  "app/admin/controllers/CashDrawers.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/Services/PmdTenantProductBaselineR1.php"
)

for rel in "${ALL_FILES[@]}"; do
  if [[ -f "$ROOT/$rel" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    cp -p "$ROOT/$rel" "$BACKUP/files/$rel"
    echo "$rel" >> "$BACKUP/present.list"
  else
    echo "$rel" >> "$BACKUP/missing.list"
  fi
done

cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  mkdir -p "$ROOT/$(dirname "$rel")"
  cp -p "$BACKUP_DIR/files/$rel" "$ROOT/$rel"
done < "$BACKUP_DIR/present.list"
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  rm -f "$ROOT/$rel"
done < "$BACKUP_DIR/missing.list"
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl reload php8.3-fpm >/dev/null 2>&1 || true
echo "CASH DRAWER LOCAL AGENT R1 CODE ROLLBACK COMPLETE"
echo "NOTE: additive tenant schema columns/bootstrap rows are intentionally not removed."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "6. ACTIVATE EXACT FILES"
for rel in "${ALL_FILES[@]}"; do
  [[ -f "$STAGE/files/$rel" ]] || fail "Staged activation file missing: $rel"
  mkdir -p "$ROOT/$(dirname "$rel")"
  cp -p "$STAGE/files/$rel" "$ROOT/$rel"
done
ACTIVATED=1

php artisan optimize:clear >/dev/null
systemctl reload "$PHP_FPM"
sleep 2

log "7. ADDITIVE TENANT FOUNDATION + SAFE BOOTSTRAP"
TEST_HOST="$TEST_HOST" php <<'PHP'
<?php
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use App\Services\PmdCashDrawerFoundationR1;

$domain = getenv('TEST_HOST') ?: 'a.paymydine.com';
$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant) throw new RuntimeException('Tenant not found: '.$domain);

$originalDefault = DB::getDefaultConnection();
$originalConfig = (array)Config::get('database.connections.tenant', []);
$cfg = $originalConfig ?: (array)Config::get('database.connections.mysql', []);
$cfg['database'] = $tenant->database;
foreach (['host'=>'db_host','port'=>'db_port','username'=>'db_user','password'=>'db_pass'] as $key=>$field) {
    if (isset($tenant->{$field}) && $tenant->{$field} !== null && $tenant->{$field} !== '') $cfg[$key] = $tenant->{$field};
}
try {
    Config::set('database.connections.tenant', $cfg);
    DB::purge('tenant');
    DB::reconnect('tenant');
    DB::setDefaultConnection('tenant');
    $report = (new PmdCashDrawerFoundationR1())->repairCurrentTenant(true);
    echo json_encode($report, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
} finally {
    DB::purge('tenant');
    Config::set('database.connections.tenant', $originalConfig);
    DB::setDefaultConnection($originalDefault);
}
PHP

php artisan optimize:clear >/dev/null
systemctl reload "$PHP_FPM"
sleep 2

log "8. FAIL-CLOSED POST-DEPLOY VERIFICATION"
POST_SETTINGS="$(http_code "https://$TEST_HOST/api/v1/settings?cashr1=$(date +%s)")"
POST_MENU="$(http_code "https://$TEST_HOST/api/v1/menu?cashr1=$(date +%s)")"
POST_ADMIN="$(http_code "https://$TEST_HOST/admin/managerlab?cashr1=$(date +%s)")"
POST_ROOT="$(http_code "https://$TEST_HOST/?cashr1=$(date +%s)")"
AGENT_CODE="$(curl -k -sS -o /tmp/pmd-agent-r1.out -w '%{http_code}' "https://$TEST_HOST/api/pmd-pos-agent/agent.js?cashr1=$(date +%s)")"
PULL_CODE="$(curl -k -sS -o /tmp/pmd-agent-pull.out -w '%{http_code}' "https://$TEST_HOST/api/pmd-pos-agent/pull?device_code=PMD-UNAUTHORIZED-CHECK")"

echo "POST settings=$POST_SETTINGS menu=$POST_MENU admin=$POST_ADMIN root=$POST_ROOT agent=$AGENT_CODE unauth_pull=$PULL_CODE"
[[ "$POST_SETTINGS" == "200" && "$POST_MENU" == "200" && "$POST_ROOT" == "200" ]] || fail "Core HTTP health failed after activation."
case "$POST_ADMIN" in 5*|000) fail "Admin health failed after activation." ;; esac
[[ "$AGENT_CODE" == "200" ]] || fail "Public agent package route is not 200."
grep -q 'PayMyDine Local POS Agent' /tmp/pmd-agent-r1.out || fail "Agent package body is invalid."
grep -q '/api/pmd-pos-agent/pair' /tmp/pmd-agent-r1.out || fail "Agent package is not using dedicated R1 API."
[[ "$PULL_CODE" == "401" ]] || fail "Unauthenticated agent pull must be 401, got $PULL_CODE."

TEST_HOST="$TEST_HOST" php <<'PHP'
<?php
require getcwd().'/vendor/autoload.php';
$app=require getcwd().'/bootstrap/app.php';
$kernel=$app->make(\Illuminate\Contracts\Console\Kernel::class); $kernel->bootstrap();
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$enabled = config('cashdrawer.local_agent_enabled');
$token = trim((string)config('cashdrawer.agent_token', ''));
echo 'local_agent_enabled='.var_export($enabled,true).PHP_EOL;
echo 'bootstrap_token_configured='.($token !== '' ? 'yes' : 'no').PHP_EOL;
if (!$enabled || $token === '') exit(11);

$domain=getenv('TEST_HOST');
$t=DB::connection('mysql')->table('tenants')->where('domain',$domain)->first();
if(!$t) exit(12);
$orig=DB::getDefaultConnection(); $origCfg=(array)Config::get('database.connections.tenant',[]);
$cfg=$origCfg ?: (array)Config::get('database.connections.mysql',[]); $cfg['database']=$t->database;
foreach(['host'=>'db_host','port'=>'db_port','username'=>'db_user','password'=>'db_pass'] as $k=>$f){if(isset($t->{$f})&&$t->{$f}!==null&&$t->{$f}!=='')$cfg[$k]=$t->{$f};}
try{
 Config::set('database.connections.tenant',$cfg); DB::purge('tenant'); DB::reconnect('tenant'); DB::setDefaultConnection('tenant');
 $schema=DB::connection()->getSchemaBuilder();
 $required=[
  'pos_devices'=>['is_local_terminal','device_code','pairing_token','agent_token_hash','last_seen_at'],
  'cash_drawers'=>['local_pos_device_id','setup_state','last_command_status'],
  'pos_hardware_commands'=>['picked_at','completed_at','result_message','result_payload','dedupe_key','expires_at'],
 ];
 foreach($required as $table=>$cols){
  if(!$schema->hasTable($table)){echo "$table=MISSING\n"; exit(13);}
  $have=$schema->getColumnListing($table); $missing=array_values(array_diff($cols,$have));
  echo $table.'_missing='.json_encode($missing).PHP_EOL; if($missing) exit(14);
 }
 echo 'drawer_count='.DB::table('cash_drawers')->count().PHP_EOL;
 echo 'local_pos_count='.DB::table('pos_devices')->where('is_local_terminal',1)->count().PHP_EOL;
 $drawer=DB::table('cash_drawers')->orderBy('drawer_id')->first();
 if($drawer){
  echo 'drawer_id='.(int)$drawer->drawer_id.PHP_EOL;
  echo 'drawer_name='.(string)$drawer->name.PHP_EOL;
  echo 'auto_open_on_cash='.(int)$drawer->auto_open_on_cash.PHP_EOL;
  echo 'local_pos_device_id='.(int)($drawer->local_pos_device_id ?? 0).PHP_EOL;
 }
} finally { DB::purge('tenant'); Config::set('database.connections.tenant',$origCfg); DB::setDefaultConnection($orig); }
PHP

HEAD_AFTER="$(git rev-parse HEAD)"
echo "Git HEAD after deploy: $HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || fail "Live Git HEAD moved."

ACTIVATED=0
log "PMD CASH DRAWER + LOCAL POS AGENT R1 DEPLOYED"
echo "Software contract:"
echo "- Cash payment -> short-lived deduplicated open_drawer command"
echo "- Card/terminal payment -> no drawer command"
echo "- Local POS Agent -> Windows RAW receipt printer -> ESC/POS drawer kick"
echo "- Offline Agent -> payment succeeds but no delayed drawer command is queued"
echo "- Agent normal traffic uses per-device credential after one-time pairing"
echo "- One default drawer/device is bootstrapped only when exactly one active location exists and no drawer exists"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo "Next physical step: download and run the Windows connector from /admin/pmddevices on the cashier PC."
