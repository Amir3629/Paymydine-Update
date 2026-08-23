#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_provider_finance_v3_${STAMP}"
BACKUP="/var/backups/pmd_provider_finance_v3_${STAMP}"
DOMAIN_FILE="/tmp/pmd_provider_domains_v3_${STAMP}.txt"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"
: > "$DOMAIN_FILE"

echo "=========================================="
echo " PAYMYDINE PROVIDER FINANCE V3"
echo " MULTI-TENANT SCHEMA + UI ROLLOUT"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

FILES=(
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/Services/Payments/ProviderConnectionService.php"
  "app/Services/Payments/TenantProviderSchemaService.php"
  "app/admin/controllers/PaymentProviders.php"
  "app/admin/views/pmdfinance/index.blade.php"
  "app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-sumup-self-service-v1.css"
  "app/admin/Services/Payments/PaymentOrchestrator.php"
  "app/admin/controllers/PaymentController.php"
  "app/admin/database/migrations/2026_08_22_230000_create_terminal_provider_configs_table.php"
  "app/admin/database/migrations/2026_08_23_101500_ensure_terminal_provider_schema_on_tenants.php"
  "routes/terminal-payments.php"
)

REMOVE_FILES=(
  "app/admin/assets/js/pmd-payment-providers-settings-link-v1.js"
  "app/admin/views/paymentproviders/index.blade.php"
)

backup_file() {
  local file="$1"
  if [ -e "$ROOT/$file" ]; then
    sudo mkdir -p "$BACKUP/files/$(dirname "$file")"
    sudo cp -a "$ROOT/$file" "$BACKUP/files/$file"
  else
    echo "$file" | sudo tee -a "$BACKUP/new-files.txt" >/dev/null
  fi
}

rollback() {
  echo
  echo "!!!!! PROVIDER FINANCE V3 DEPLOY FAILED !!!!!"
  echo "Restoring application files..."

  if [ -d "$BACKUP/files" ]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi

  if [ -f "$BACKUP/new-files.txt" ]; then
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      sudo rm -f "$ROOT/$file"
    done < "$BACKUP/new-files.txt"
  fi

  sudo -u www-data -H php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED APPLICATION FILES FROM: $BACKUP"
  echo "NOTE: additive provider schema repairs are intentionally retained."
}

trap rollback ERR

echo
echo "========== STAGE =========="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  if ! git cat-file -e "$REMOTE:$file" 2>/dev/null; then
    echo "REMOTE FILE MISSING: $file"
    exit 2
  fi
  git show "$REMOTE:$file" > "$STAGE/$file"
  echo "STAGED: $file"
done

echo
echo "========== PREFLIGHT =========="
while IFS= read -r -d '' file; do
  php -l "$file"
done < <(find "$STAGE" -type f -name '*.php' -print0)

if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
  node --check "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
fi

grep -q 'id="payment-providers"' "$STAGE/app/admin/views/pmdfinance/index.blade.php"
grep -q 'data-pmd-payment-provider-catalogue' "$STAGE/app/admin/views/pmdfinance/index.blade.php"
grep -q "admin_url('pmdfinance').'#payment-providers'" "$STAGE/app/admin/controllers/PaymentProviders.php"
grep -q 'class TenantProviderSchemaService' "$STAGE/app/Services/Payments/TenantProviderSchemaService.php"

echo "PREFLIGHT OK"

echo
echo "========== BACKUP =========="
for file in "${FILES[@]}"; do
  backup_file "$file"
done
for file in "${REMOVE_FILES[@]}"; do
  backup_file "$file"
done
backup_file "app/admin/views/_meta/assets.json"
echo "BACKUP=$BACKUP"

echo
echo "========== INSTALL =========="
for file in "${FILES[@]}"; do
  sudo install -D -m 0644 -o root -g www-data "$STAGE/$file" "$ROOT/$file"
  echo "INSTALLED: $file"
done

for file in "${REMOVE_FILES[@]}"; do
  sudo rm -f "$ROOT/$file"
  echo "REMOVED OBSOLETE: $file"
done

echo
echo "========== MERGE ADMIN ASSETS =========="
sudo python3 <<'PY'
import json
from pathlib import Path

path = Path('/var/www/paymydine/app/admin/views/_meta/assets.json')
data = json.loads(path.read_text())
style_rows = data.setdefault('style', [])
script_rows = data.setdefault('script', [])

obsolete_scripts = {'js/pmd-payment-providers-settings-link-v1.js'}
script_rows[:] = [
    row for row in script_rows
    if not isinstance(row, dict) or str(row.get('path', '')) not in obsolete_scripts
]

styles = [
    ('css/pmd-payment-provider-catalogue-v1.css', 'pmd-payment-provider-catalogue-v1-css'),
    ('css/pmd-sumup-self-service-v1.css', 'pmd-sumup-self-service-v1-css'),
]
scripts = [
    ('js/pmd-payment-provider-catalogue-v1.js', 'pmd-payment-provider-catalogue-v1-js'),
    ('js/pmd-sumup-self-service-v1.js', 'pmd-sumup-self-service-v1-js'),
]

style_paths = {str(row.get('path', '')) for row in style_rows if isinstance(row, dict)}
script_paths = {str(row.get('path', '')) for row in script_rows if isinstance(row, dict)}

for asset_path, name in styles:
    if asset_path not in style_paths:
        style_rows.append({'path': asset_path, 'name': name})

for asset_path, name in scripts:
    if asset_path not in script_paths:
        script_rows.append({'path': asset_path, 'name': name})

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print('ASSETS MERGED')
PY

sudo chown root:www-data app/admin/views/_meta/assets.json
sudo chmod 0644 app/admin/views/_meta/assets.json

php -r '
$data = json_decode(file_get_contents("app/admin/views/_meta/assets.json"), true);
if (!is_array($data)) {
    fwrite(STDERR, "assets.json invalid\n");
    exit(1);
}
foreach (($data["script"] ?? []) as $row) {
    if (($row["path"] ?? "") === "js/pmd-payment-providers-settings-link-v1.js") {
        fwrite(STDERR, "obsolete Settings provider injector is still registered\n");
        exit(1);
    }
}
echo "ASSETS JSON OK\n";
'

echo
echo "========== REPAIR PROVIDER SCHEMA =========="
cat > "$STAGE/repair_provider_schema.php" <<'PHP'
<?php

use App\Services\Payments\TenantProviderSchemaService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$base = (array)config('database.connections.mysql');
Config::set('database.connections.pmd_provider_central_v3', $base);
DB::purge('pmd_provider_central_v3');
DB::reconnect('pmd_provider_central_v3');
$central = DB::connection('pmd_provider_central_v3');

if (!$central->getSchemaBuilder()->hasTable('tenants')) {
    throw new RuntimeException('Central tenants table not found.');
}

$rows = $central->table('tenants')
    ->whereNotNull('database')
    ->where('database', '<>', '')
    ->get();

$databases = [];
foreach ($rows as $tenant) {
    $status = strtolower(trim((string)($tenant->status ?? 'active')));
    if (!in_array($status, ['active', 'enabled', '1', 'true', 'yes'], true)) {
        continue;
    }
    $database = trim((string)$tenant->database);
    if ($database !== '') {
        $databases[$database] = 'tenant:'.trim((string)($tenant->name ?? $database));
    }
}

$templateExists = (int)($central->selectOne(
    'SELECT COUNT(*) AS aggregate FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    ['newtenantdb']
)->aggregate ?? 0) > 0;

if ($templateExists) {
    $databases['newtenantdb'] = 'template:newtenantdb';
}

$service = app(TenantProviderSchemaService::class);
$failed = 0;

foreach ($databases as $database => $label) {
    $runtime = $base;
    $runtime['database'] = $database;
    Config::set('database.connections.pmd_provider_schema_v3', $runtime);
    DB::purge('pmd_provider_schema_v3');

    try {
        DB::reconnect('pmd_provider_schema_v3');
        $actual = DB::connection('pmd_provider_schema_v3')->getDatabaseName();
        if (strcasecmp((string)$actual, (string)$database) !== 0) {
            throw new RuntimeException("database mismatch: expected {$database}, got {$actual}");
        }

        $result = $service->ensure('pmd_provider_schema_v3');
        if (empty($result['provider_config_table']) || empty($result['terminal_environment_column'])) {
            throw new RuntimeException('provider schema verification failed after repair');
        }

        echo 'SCHEMA_READY='.$label
            .' DB='.$actual
            .' PROVIDER_CONFIG=YES'
            .' TERMINAL_ENV='.(empty($result['terminal_environment_column']) ? 'NO' : 'YES')
            .' CREATED_TABLE='.(!empty($result['created_provider_config_table']) ? 'YES' : 'NO')
            .' ADDED_ENV='.(!empty($result['added_terminal_environment']) ? 'YES' : 'NO')
            .PHP_EOL;
    } catch (Throwable $e) {
        $failed++;
        echo 'SCHEMA_ERROR='.$label.' DB='.$database.' ERROR='.$e->getMessage().PHP_EOL;
    } finally {
        DB::disconnect('pmd_provider_schema_v3');
    }
}

echo 'SCHEMA_TARGETS='.count($databases).PHP_EOL;
echo 'SCHEMA_FAILED='.$failed.PHP_EOL;

if (!$databases || $failed > 0) {
    exit(1);
}
PHP

PMD_ROOT="$ROOT" php "$STAGE/repair_provider_schema.php"

echo
echo "========== CLEAR CACHE =========="
sudo -u www-data -H php artisan optimize:clear || php artisan optimize:clear || true

echo
echo "========== VERIFY ALL ACTIVE TENANTS READ-ONLY =========="
cat > "$STAGE/verify_all_tenants.php" <<'PHP'
<?php

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
$domainFile = getenv('PMD_DOMAIN_FILE');
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$base = (array)config('database.connections.mysql');
Config::set('database.connections.pmd_provider_central_verify_v3', $base);
DB::purge('pmd_provider_central_verify_v3');
DB::reconnect('pmd_provider_central_verify_v3');
$central = DB::connection('pmd_provider_central_verify_v3');

$tenants = $central->table('tenants')
    ->whereNotNull('database')->where('database', '<>', '')
    ->whereNotNull('domain')->where('domain', '<>', '')
    ->get();

$checked = 0;
$failed = 0;
$domains = [];

foreach ($tenants as $tenant) {
    $status = strtolower(trim((string)($tenant->status ?? 'active')));
    if (!in_array($status, ['active', 'enabled', '1', 'true', 'yes'], true)) continue;

    $name = trim((string)($tenant->name ?? 'tenant'));
    $domain = strtolower(trim((string)$tenant->domain));
    $database = trim((string)$tenant->database);

    $runtime = $base;
    $runtime['database'] = $database;
    Config::set('database.connections.pmd_provider_verify_v3', $runtime);
    DB::purge('pmd_provider_verify_v3');

    try {
        DB::reconnect('pmd_provider_verify_v3');
        $conn = DB::connection('pmd_provider_verify_v3');
        $schema = $conn->getSchemaBuilder();
        $actual = $conn->getDatabaseName();

        if (strcasecmp((string)$actual, $database) !== 0) {
            throw new RuntimeException("database mismatch: expected {$database}, got {$actual}");
        }
        if (!$schema->hasTable('terminal_provider_configs')) {
            throw new RuntimeException('terminal_provider_configs table is missing');
        }
        if ($schema->hasTable('terminal_devices') && !$schema->hasColumn('terminal_devices', 'environment')) {
            throw new RuntimeException('terminal_devices.environment column is missing');
        }

        $sumupRows = $conn->table('terminal_provider_configs')
            ->where('provider_code', 'sumup')
            ->orderBy('environment')
            ->get();
        $active = $sumupRows->firstWhere('is_active', 1);

        $checked++;
        $domains[] = $domain;
        echo 'TENANT='.$name
            .' DOMAIN='.$domain
            .' DB='.$actual
            .' PROVIDER_SCHEMA=YES'
            .' SUMUP_ACTIVE_ENV='.($active->environment ?? 'NONE')
            .PHP_EOL;

        foreach (['test', 'production'] as $env) {
            $row = $sumupRows->firstWhere('environment', $env);
            $configured = $row && (!empty($row->access_token_encrypted) || !empty($row->merchant_code));
            $connected = $row && ((string)$row->connection_status === 'connected');
            $terminals = 0;
            if ($schema->hasTable('terminal_devices')) {
                $query = $conn->table('terminal_devices')->where('provider_code', 'sumup');
                if ($schema->hasColumn('terminal_devices', 'environment')) {
                    $query->where('environment', $env);
                }
                if ($schema->hasColumn('terminal_devices', 'is_active')) {
                    $query->where('is_active', 1);
                }
                $terminals = $query->count();
            }

            echo '  '.strtoupper($env)
                .' configured='.($configured ? 'YES' : 'NO')
                .' connected='.($connected ? 'YES' : 'NO')
                .' terminals='.$terminals
                .PHP_EOL;
        }
    } catch (Throwable $e) {
        $failed++;
        echo 'TENANT='.$name.' DOMAIN='.$domain.' DB='.$database.' ERROR='.$e->getMessage().PHP_EOL;
    } finally {
        DB::disconnect('pmd_provider_verify_v3');
    }
}

if ($domainFile) {
    file_put_contents($domainFile, implode(PHP_EOL, array_values(array_unique($domains))).PHP_EOL);
}

echo 'TENANTS_CHECKED='.$checked.PHP_EOL;
echo 'TENANTS_FAILED='.$failed.PHP_EOL;
if ($checked === 0 || $failed > 0) exit(1);
PHP

PMD_ROOT="$ROOT" PMD_DOMAIN_FILE="$DOMAIN_FILE" php "$STAGE/verify_all_tenants.php"

echo
echo "========== HTTP CHECK ALL ACTIVE TENANTS =========="
check_route() {
  local url="$1"
  local label="$2"
  local method="${3:-GET}"
  local code

  if [ "$method" = "POST" ]; then
    code="$(curl -sS -X POST -H 'Accept: application/json' -o /tmp/pmd_provider_http_v3.txt -w '%{http_code}' "$url" || true)"
  else
    code="$(curl -sS -H 'Accept: application/json' -o /tmp/pmd_provider_http_v3.txt -w '%{http_code}' "$url" || true)"
  fi

  echo "$label=$code"
  case "$code" in
    200|301|302|303|307|308|401|403|419|422) ;;
    *)
      echo "ROUTE FAILED: $url"
      cat /tmp/pmd_provider_http_v3.txt || true
      return 1
      ;;
  esac
}

while IFS= read -r domain; do
  [ -z "$domain" ] && continue
  safe_label="$(printf '%s' "$domain" | tr '.-' '__')"
  echo "DOMAIN=$domain"
  check_route "https://$domain/admin/pmdfinance" "${safe_label}_FINANCE_HTTP"
  check_route "https://$domain/admin/payment-providers" "${safe_label}_LEGACY_PROVIDER_HTTP"
  check_route "https://$domain/admin/payment-providers/state" "${safe_label}_PROVIDER_STATE_HTTP"
  check_route "https://$domain/admin/payment-providers/sumup/state" "${safe_label}_SUMUP_STATE_HTTP"
  check_route "https://$domain/admin/terminal-payments/sumup/callback/999999" "${safe_label}_SUMUP_CALLBACK_HTTP" "POST"
done < "$DOMAIN_FILE"

echo
echo "========== UI CHECK =========="
grep -q 'id="payment-providers"' app/admin/views/pmdfinance/index.blade.php
grep -q 'data-pmd-payment-provider-catalogue' app/admin/views/pmdfinance/index.blade.php
grep -q 'PMDPaymentProviderCatalogueV2' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -q "admin_url('pmdfinance').'#payment-providers'" app/admin/controllers/PaymentProviders.php
grep -q 'Pair and test this restaurant' app/admin/assets/js/pmd-sumup-self-service-v1.js

if grep -q 'pmd-payment-providers-settings-link-v1.js' app/admin/views/_meta/assets.json; then
  echo "ERROR: delayed Settings provider injector is still registered"
  exit 1
fi

if [ -e app/admin/assets/js/pmd-payment-providers-settings-link-v1.js ]; then
  echo "ERROR: obsolete delayed Settings provider injector file still exists"
  exit 1
fi

if [ -e app/admin/views/paymentproviders/index.blade.php ]; then
  echo "ERROR: obsolete standalone provider page still exists"
  exit 1
fi

echo "UI CHECK OK"

trap - ERR

echo
echo "=========================================="
echo " SUCCESS - PROVIDER FINANCE V3 LIVE"
echo " ALL ACTIVE TENANTS + TEMPLATE READY"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
