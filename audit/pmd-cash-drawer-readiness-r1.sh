#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TENANT_DOMAIN="${TENANT_DOMAIN:-a.paymydine.com}"

section() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

[[ -d "$ROOT" ]] || { echo "PayMyDine root not found: $ROOT" >&2; exit 2; }
[[ -f "$ROOT/artisan" ]] || { echo "artisan not found under: $ROOT" >&2; exit 2; }

cd "$ROOT"
HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
BRANCH_BEFORE="$(git branch --show-current 2>/dev/null || echo unknown)"

section "PMD CASH DRAWER READINESS R1 - READ ONLY"
echo "Root:          $ROOT"
echo "Tenant:        $TENANT_DOMAIN"
echo "Git HEAD:      $HEAD_BEFORE"
echo "Git branch:    $BRANCH_BEFORE"
echo "UTC timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "Mode:          READ ONLY - no INSERT/UPDATE/DELETE/migration/deploy"

section "1. LIVE SOURCE / PACKAGE PRESENCE"

AGENT="$ROOT/tools/local-pos-agent/agent.js"
CASH_CONFIG="$ROOT/config/cashdrawer.php"
SETTLE="$ROOT/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
PAY_JS="$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
AGENT_CONTROLLER="$ROOT/app/admin/controllers/Api/PosAgentController.php"
DRAWER_CONTROLLER="$ROOT/app/admin/controllers/CashDrawers.php"
QUEUE_SERVICE="$ROOT/app/admin/Services/CashDrawerService/LocalPosHardwareCommandService.php"
DRAWER_SERVICE="$ROOT/app/admin/Services/CashDrawerService/CashDrawerService.php"
LOG_MODEL="$ROOT/app/admin/models/Cash_drawer_logs_model.php"

for f in "$SETTLE" "$PAY_JS" "$AGENT_CONTROLLER" "$DRAWER_CONTROLLER" "$QUEUE_SERVICE" "$DRAWER_SERVICE" "$LOG_MODEL"; do
  if [[ -f "$f" ]]; then
    printf 'FILE OK:      %s\n' "${f#$ROOT/}"
  else
    printf 'FILE MISSING: %s\n' "${f#$ROOT/}"
  fi
done

if [[ -f "$AGENT" ]]; then
  echo "AGENT_PACKAGE: PRESENT"
  echo "AGENT_SIZE:    $(wc -c < "$AGENT" | tr -d ' ') bytes"
  echo "AGENT_SHA256:  $(sha256sum "$AGENT" | awk '{print $1}')"
  for marker in open_drawer list_printers test_print diagnose_drawer 17877; do
    if grep -Fq "$marker" "$AGENT"; then
      echo "AGENT_HANDLER[$marker]=PRESENT"
    else
      echo "AGENT_HANDLER[$marker]=MISSING"
    fi
  done
else
  echo "AGENT_PACKAGE: MISSING ($AGENT)"
fi

if [[ -f "$CASH_CONFIG" ]]; then
  echo "CASHDRAWER_CONFIG_FILE: PRESENT"
else
  echo "CASHDRAWER_CONFIG_FILE: MISSING ($CASH_CONFIG)"
fi

echo "Relevant .env key NAMES only (values intentionally hidden):"
if [[ -f "$ROOT/.env" ]]; then
  grep -E '^[A-Za-z0-9_]*(CASH|DRAWER|POS_AGENT|LOCAL_POS)[A-Za-z0-9_]*=' "$ROOT/.env" 2>/dev/null \
    | sed 's/=.*$/=<hidden>/' \
    | sort -u \
    || true
else
  echo ".env not readable/present"
fi

if [[ -f "$SETTLE" ]]; then
  if grep -Eq 'CashDrawer(Service|Helper)|openDrawerForOrder|openDrawerForLocation' "$SETTLE"; then
    echo "CASH_SETTLEMENT_DRAWER_WIRING: PRESENT"
    grep -nE 'CashDrawer(Service|Helper)|openDrawerForOrder|openDrawerForLocation' "$SETTLE" | head -20 || true
  else
    echo "CASH_SETTLEMENT_DRAWER_WIRING: MISSING"
  fi
fi

if [[ -f "$PAY_JS" ]]; then
  if grep -Eqi 'pos_device_id|device_code|workstation_id|local_pos_device|cashier_device' "$PAY_JS"; then
    echo "CASHIER_WORKSTATION_IDENTITY_PAYLOAD: PRESENT"
    grep -nEi 'pos_device_id|device_code|workstation_id|local_pos_device|cashier_device' "$PAY_JS" | head -20 || true
  else
    echo "CASHIER_WORKSTATION_IDENTITY_PAYLOAD: MISSING"
  fi
fi

if [[ -f "$AGENT_CONTROLLER" ]]; then
  echo "POS_AGENT_CONTROLLER_TIMESTAMP_FIELDS:"
  grep -nE 'processed_at|picked_at|acknowledged_at|completed_at|result_message|result_payload|[^_]message' "$AGENT_CONTROLLER" | head -40 || true
fi

if [[ -f "$DRAWER_CONTROLLER" ]]; then
  for marker in windows_connector windows_connector_agent onSetupOnThisPos onOpenDrawer onLoadLocalPrinters onTestPrintLocal onDiagnoseDrawer; do
    if grep -Fq "$marker" "$DRAWER_CONTROLLER"; then
      echo "DRAWER_CONTROLLER[$marker]=PRESENT"
    else
      echo "DRAWER_CONTROLLER[$marker]=MISSING"
    fi
  done
fi

section "2. LARAVEL CONFIG + TENANT DATABASE READ-ONLY AUDIT"

TENANT_DOMAIN="$TENANT_DOMAIN" PMD_ROOT="$ROOT" php <<'PHP'
<?php

$root = getenv('PMD_ROOT') ?: getcwd();
$domain = getenv('TENANT_DOMAIN') ?: 'a.paymydine.com';

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

function pmdBool($value): string {
    return $value ? 'true' : 'false';
}

function pmdJson($value): string {
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?: '{}';
}

function pmdColumns($schema, string $table): array {
    try {
        return $schema->hasTable($table) ? $schema->getColumnListing($table) : [];
    } catch (\Throwable $e) {
        return [];
    }
}

function pmdMissing(array $columns, array $expected): array {
    return array_values(array_diff($expected, $columns));
}

function pmdSelectExisting($conn, string $table, array $columns, array $requested, ?string $order = null, int $limit = 20) {
    $select = array_values(array_intersect($requested, $columns));
    if (!$select) return collect();
    $q = $conn->table($table)->select($select);
    if ($order && in_array($order, $columns, true)) $q->orderByDesc($order);
    return $q->limit($limit)->get();
}

$agentToken = (string)config('cashdrawer.agent_token', '');
$localAgent = config('cashdrawer.local_agent_enabled', null);
echo "cashdrawer.local_agent_enabled=".var_export($localAgent, true)."\n";
echo "cashdrawer.agent_token_configured=".($agentToken !== '' ? 'yes' : 'no')."\n";
echo "cashdrawer.agent_token_length=".strlen($agentToken)."\n";

$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant) {
    throw new RuntimeException("Tenant not found in central DB: {$domain}");
}

$cfg = (array)Config::get('database.connections.tenant', []);
if (!$cfg) $cfg = (array)Config::get('database.connections.mysql', []);
$cfg['database'] = $tenant->database;
foreach ([
    'host' => 'db_host',
    'port' => 'db_port',
    'username' => 'db_user',
    'password' => 'db_pass',
] as $configKey => $tenantKey) {
    if (isset($tenant->{$tenantKey}) && $tenant->{$tenantKey} !== null && $tenant->{$tenantKey} !== '') {
        $cfg[$configKey] = $tenant->{$tenantKey};
    }
}

Config::set('database.connections.pmd_cashdrawer_audit', $cfg);
DB::purge('pmd_cashdrawer_audit');
$conn = DB::connection('pmd_cashdrawer_audit');
$schema = $conn->getSchemaBuilder();

echo "TENANT_DOMAIN={$domain}\n";
echo "TENANT_DATABASE=".$conn->getDatabaseName()."\n";
echo "TENANT_CREATED_AT=".($tenant->created_at ?? 'unknown')."\n";

$tables = [
    'cash_drawers',
    'cash_drawer_logs',
    'pos_devices',
    'pos_hardware_commands',
    'order_payment_transactions',
    'locations',
];

$columnsByTable = [];
foreach ($tables as $table) {
    $cols = pmdColumns($schema, $table);
    $columnsByTable[$table] = $cols;
    echo "\nTABLE {$table}: ".($cols ? 'PRESENT' : 'MISSING')."\n";
    if ($cols) echo "COLUMNS: ".implode(',', $cols)."\n";
}

$drawerRequired = [
    'drawer_id','name','location_id','connection_type','status','auto_open_on_cash',
    'local_pos_device_id','last_command_status','last_command_message',
    'setup_state','setup_message','setup_completed_at',
];
$posRequired = [
    'device_id','name','is_local_terminal','device_code','pairing_token',
    'device_status','last_seen_at','capabilities','platform_info',
];
$queueCanonical = [
    'id','drawer_id','pos_device_id','location_id','command_type','payload','status',
    'result_message','result_payload','queued_at','picked_at','completed_at','created_at','updated_at',
];
$logModelSchema = [
    'log_id','drawer_id','order_id','location_id','action','trigger_method',
    'success','error_message','response_data','created_at','updated_at',
];
$logLegacySchema = [
    'log_id','drawer_id','order_id','staff_id','action','status','message',
    'request_payload','response_payload','created_at','updated_at',
];

$checks = [
    'cash_drawers_product_fields' => pmdMissing($columnsByTable['cash_drawers'] ?? [], $drawerRequired),
    'pos_devices_local_agent_fields' => pmdMissing($columnsByTable['pos_devices'] ?? [], $posRequired),
    'pos_hardware_commands_canonical' => pmdMissing($columnsByTable['pos_hardware_commands'] ?? [], $queueCanonical),
    'cash_drawer_logs_model_contract' => pmdMissing($columnsByTable['cash_drawer_logs'] ?? [], $logModelSchema),
    'cash_drawer_logs_legacy_contract' => pmdMissing($columnsByTable['cash_drawer_logs'] ?? [], $logLegacySchema),
];

echo "\n== SCHEMA CONTRACT RESULTS ==\n";
foreach ($checks as $name => $missing) {
    echo $name.'='.(empty($missing) ? 'PASS' : 'FAIL missing['.implode(',', $missing).']')."\n";
}

$agentControllerPath = $root.'/app/admin/controllers/Api/PosAgentController.php';
$agentController = is_file($agentControllerPath) ? (string)file_get_contents($agentControllerPath) : '';
$controllerFieldCandidates = ['processed_at','picked_at','message','result_message','acknowledged_at','completed_at','result_payload'];
$controllerFieldsUsed = [];
foreach ($controllerFieldCandidates as $field) {
    if ($agentController !== '' && strpos($agentController, $field) !== false) $controllerFieldsUsed[] = $field;
}
$queueCols = $columnsByTable['pos_hardware_commands'] ?? [];
$controllerMissing = pmdMissing($queueCols, $controllerFieldsUsed);
echo "POS_AGENT_CONTROLLER_DB_FIELDS_USED=".implode(',', $controllerFieldsUsed)."\n";
echo "POS_AGENT_CONTROLLER_SCHEMA_COMPAT=".(empty($controllerMissing) ? 'PASS' : 'FAIL missing['.implode(',', $controllerMissing).']')."\n";

if (!empty($columnsByTable['cash_drawers'])) {
    echo "\n== CASH DRAWERS ==\n";
    $requested = [
        'drawer_id','name','location_id','pos_device_id','local_pos_device_id','printer_id',
        'connection_type','device_path','esc_pos_command','voltage','network_ip','network_port',
        'serial_port','serial_baud_rate','status','auto_open_on_cash','test_on_save',
        'local_mapping_invalid','last_command_status','last_command_message',
        'setup_state','setup_message','setup_completed_at','connection_config','created_at','updated_at',
    ];
    $rows = pmdSelectExisting($conn, 'cash_drawers', $columnsByTable['cash_drawers'], $requested, 'drawer_id', 100);
    echo "COUNT=".$conn->table('cash_drawers')->count()."\n";
    foreach ($rows as $row) {
        $data = (array)$row;
        if (array_key_exists('connection_config', $data)) {
            $raw = $data['connection_config'];
            $decoded = is_array($raw) ? $raw : json_decode((string)$raw, true);
            $decoded = is_array($decoded) ? $decoded : [];
            $data['connection_config'] = [
                'keys' => array_values(array_keys($decoded)),
                'windows_printer_name' => $decoded['windows_printer_name'] ?? null,
            ];
        }
        echo pmdJson($data)."\n";
    }
}

if (!empty($columnsByTable['pos_devices'])) {
    echo "\n== POS DEVICES ==\n";
    $requested = [
        'device_id','name','code','device_type','description','is_local_terminal','device_code',
        'pairing_token','device_status','last_seen_at','capabilities','platform_info','created_at','updated_at',
    ];
    $rows = pmdSelectExisting($conn, 'pos_devices', $columnsByTable['pos_devices'], $requested, 'device_id', 100);
    echo "COUNT=".$conn->table('pos_devices')->count()."\n";
    foreach ($rows as $row) {
        $data = (array)$row;
        if (array_key_exists('pairing_token', $data)) {
            $data['pairing_token_configured'] = trim((string)$data['pairing_token']) !== '';
            unset($data['pairing_token']);
        }
        foreach (['capabilities','platform_info'] as $jsonField) {
            if (array_key_exists($jsonField, $data) && is_string($data[$jsonField])) {
                $decoded = json_decode($data[$jsonField], true);
                if (is_array($decoded)) $data[$jsonField] = $decoded;
            }
        }
        echo pmdJson($data)."\n";
    }
}

if (!empty($columnsByTable['pos_hardware_commands'])) {
    echo "\n== HARDWARE COMMAND QUEUE ==\n";
    $statusCounts = [];
    if (in_array('status', $columnsByTable['pos_hardware_commands'], true)) {
        foreach ($conn->table('pos_hardware_commands')->pluck('status') as $status) {
            $key = (string)$status;
            $statusCounts[$key] = ($statusCounts[$key] ?? 0) + 1;
        }
    }
    echo "TOTAL=".$conn->table('pos_hardware_commands')->count()."\n";
    echo "STATUS_COUNTS=".pmdJson($statusCounts)."\n";

    $requested = [
        'id','drawer_id','pos_device_id','location_id','command_type','status','payload',
        'queued_at','picked_at','processed_at','completed_at','acknowledged_at',
        'result_message','message','result_payload','created_at','updated_at',
    ];
    $rows = pmdSelectExisting($conn, 'pos_hardware_commands', $columnsByTable['pos_hardware_commands'], $requested, 'id', 30);
    foreach ($rows as $row) {
        $data = (array)$row;
        if (array_key_exists('payload', $data)) {
            $payload = json_decode((string)$data['payload'], true);
            $payload = is_array($payload) ? $payload : [];
            $data['payload_summary'] = [
                'keys' => array_values(array_keys($payload)),
                'drawer_id' => $payload['drawer_id'] ?? null,
                'connection_type' => $payload['connection_type'] ?? null,
                'printer_name' => $payload['printer_name'] ?? null,
                'target' => $payload['target'] ?? null,
                'esc_pos_command' => $payload['esc_pos_command'] ?? null,
                'trigger_method' => $payload['trigger_method'] ?? ($payload['context']['trigger_method'] ?? null),
            ];
            unset($data['payload']);
        }
        if (array_key_exists('result_payload', $data)) {
            $decoded = json_decode((string)$data['result_payload'], true);
            $data['result_payload_summary'] = is_array($decoded)
                ? ['keys' => array_values(array_keys($decoded))]
                : null;
            unset($data['result_payload']);
        }
        echo pmdJson($data)."\n";
    }
}

if (!empty($columnsByTable['cash_drawer_logs'])) {
    echo "\n== CASH DRAWER LOGS ==\n";
    echo "COUNT=".$conn->table('cash_drawer_logs')->count()."\n";
    $requested = [
        'log_id','drawer_id','order_id','staff_id','location_id','action','status','trigger_method',
        'success','message','error_message','created_at','updated_at',
    ];
    $rows = pmdSelectExisting($conn, 'cash_drawer_logs', $columnsByTable['cash_drawer_logs'], $requested, 'log_id', 30);
    foreach ($rows as $row) echo pmdJson((array)$row)."\n";
}

if (!empty($columnsByTable['order_payment_transactions'])) {
    echo "\n== RECENT CASH PAYMENT TRANSACTIONS ==\n";
    $cols = $columnsByTable['order_payment_transactions'];
    $requested = array_values(array_intersect([
        'id','order_id','payment_method','amount','cash_received','change_due','settlement_status','paid_at','created_at',
    ], $cols));
    if ($requested && in_array('payment_method', $cols, true)) {
        $q = $conn->table('order_payment_transactions')->where('payment_method', 'cash')->select($requested);
        if (in_array('id', $cols, true)) $q->orderByDesc('id');
        $rows = $q->limit(20)->get();
        echo "CASH_COUNT=".$conn->table('order_payment_transactions')->where('payment_method', 'cash')->count()."\n";
        foreach ($rows as $row) echo pmdJson((array)$row)."\n";
    } else {
        echo "Cash transaction columns are incomplete.\n";
    }
}

DB::disconnect('pmd_cashdrawer_audit');
PHP

section "3. HTTP ROUTE PRESENCE - READ ONLY"
http() {
  local url="$1"
  curl -k -sS -o /dev/null -w '%{http_code}' "$url" || printf '000'
}

echo "settings=$(http "https://$TENANT_DOMAIN/api/v1/settings?cash_audit=$(date +%s)")"
echo "menu=$(http "https://$TENANT_DOMAIN/api/v1/menu?cash_audit=$(date +%s)")"
echo "devices_ui_unauth=$(http "https://$TENANT_DOMAIN/admin/pmddevices?cash_audit=$(date +%s)")"
echo "agent_pull_without_token=$(http "https://$TENANT_DOMAIN/admin/api/pos-agent/commands/pull?device_code=PMD-READONLY-AUDIT")"

section "4. LIVE GIT SAFETY CHECK"
HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
if [[ "$HEAD_AFTER" != "$HEAD_BEFORE" ]]; then
  echo "ERROR: Git HEAD moved during a read-only audit." >&2
  exit 3
fi

echo "READ_ONLY_AUDIT_COMPLETE"
echo "No database rows, source files, services, permissions, or Git refs were changed by this script."
