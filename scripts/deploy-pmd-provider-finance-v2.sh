#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_provider_finance_v2_${STAMP}"
BACKUP="/var/backups/pmd_provider_finance_v2_${STAMP}"
DOMAIN_FILE="/tmp/pmd_provider_domains_${STAMP}.txt"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"
: > "$DOMAIN_FILE"

echo "=========================================="
echo " PAYMYDINE PROVIDER FINANCE V2"
echo " MULTI-TENANT ROLLOUT"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

FILES=(
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/Services/Payments/ProviderConnectionService.php"
  "app/admin/controllers/PaymentProviders.php"
  "app/admin/views/pmdfinance/index.blade.php"
  "app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-sumup-self-service-v1.css"
  "app/admin/Services/Payments/PaymentOrchestrator.php"
  "app/admin/controllers/PaymentController.php"
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
  echo "!!!!! PROVIDER FINANCE V2 DEPLOY FAILED !!!!!"
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
  echo "RESTORED FROM: $BACKUP"
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

obsolete_scripts = {
    'js/pmd-payment-providers-settings-link-v1.js',
}
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
        fwrite(STDERR, "obsolete settings injector is still registered\n");
        exit(1);
    }
}
echo "ASSETS JSON OK\n";
'

echo
echo "========== CLEAR CACHE =========="
sudo -u www-data -H php artisan optimize:clear || php artisan optimize:clear || true

echo
echo "========== VERIFY ALL ACTIVE TENANTS =========="
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
Config::set('database.connections.pmd_provider_central_v2', $base);
DB::purge('pmd_provider_central_v2');
DB::reconnect('pmd_provider_central_v2');
$central = DB::connection('pmd_provider_central_v2');

$tenants = $central->table('tenants')
    ->whereNotNull('database')
    ->where('database', '<>', '')
    ->whereNotNull('domain')
    ->where('domain', '<>', '')
    ->get();

$checked = 0;
$failed = 0;
$domains = [];

foreach ($tenants as $tenant) {
    $status = strtolower(trim((string)($tenant->status ?? 'active')));
    if (!in_array($status, ['active', 'enabled', '1', 'true', 'yes'], true)) {
        continue;
    }

    $name = trim((string)($tenant->name ?? 'tenant'));
    $domain = strtolower(trim((string)$tenant->domain));
    $database = trim((string)$tenant->database);

    if ($domain === '' || $database === '') {
        continue;
    }

    $cfg = $base;
    $cfg['database'] = $database;
    Config::set('database.connections.pmd_provider_tenant_v2', $cfg);
    DB::purge('pmd_provider_tenant_v2');
    DB::reconnect('pmd_provider_tenant_v2');
    DB::setDefaultConnection('pmd_provider_tenant_v2');

    try {
        $actual = DB::connection()->getDatabaseName();
        if (strcasecmp((string)$actual, $database) !== 0) {
            throw new RuntimeException("database mismatch: expected {$database}, got {$actual}");
        }

        $providerState = app(App\Services\Payments\ProviderConnectionService::class)->state('sumup');
        $sumup = app(App\Services\TerminalPayments\SumupTenantConnectionService::class)->state();

        $schemaReady = (bool)($providerState['schema_ready'] ?? false);
        if (!$schemaReady) {
            throw new RuntimeException('provider schema is not ready');
        }

        $checked++;
        $domains[] = $domain;

        echo 'TENANT='.$name
            .' DOMAIN='.$domain
            .' DB='.$actual
            .' PROVIDER_SCHEMA=YES'
            .' SUMUP_ACTIVE_ENV='.($sumup['active_environment'] ?? 'NONE')
            .PHP_EOL;

        foreach (['test', 'production'] as $env) {
            $snapshot = (array)($sumup['environments'][$env] ?? []);
            $configured = !empty($snapshot['configured']) ? 'YES' : 'NO';
            $connected = (($snapshot['connection_status'] ?? '') === 'connected') ? 'YES' : 'NO';
            $terminals = count((array)($snapshot['terminals'] ?? []));
            echo '  '.strtoupper($env)
                .' configured='.$configured
                .' connected='.$connected
                .' terminals='.$terminals
                .PHP_EOL;
        }
    } catch (Throwable $e) {
        $failed++;
        echo 'TENANT='.$name
            .' DOMAIN='.$domain
            .' DB='.$database
            .' ERROR='.$e->getMessage()
            .PHP_EOL;
    } finally {
        DB::disconnect('pmd_provider_tenant_v2');
    }
}

DB::setDefaultConnection('pmd_provider_central_v2');

if ($domainFile) {
    file_put_contents($domainFile, implode(PHP_EOL, array_values(array_unique($domains))).PHP_EOL);
}

echo 'TENANTS_CHECKED='.$checked.PHP_EOL;
echo 'TENANTS_FAILED='.$failed.PHP_EOL;

if ($checked === 0 || $failed > 0) {
    exit(1);
}
PHP

PMD_ROOT="$ROOT" PMD_DOMAIN_FILE="$DOMAIN_FILE" php "$STAGE/verify_all_tenants.php"

echo
echo "========== HTTP CHECK ALL TENANT DOMAINS =========="n
check_route() {
  local url="$1"
  local label="$2"
  local method="${3:-GET}"
  local code

  if [ "$method" = "POST" ]; then
    code="$(curl -sS -X POST -H 'Accept: application/json' -o /tmp/pmd_provider_http_v2.txt -w '%{http_code}' "$url" || true)"
  else
    code="$(curl -sS -H 'Accept: application/json' -o /tmp/pmd_provider_http_v2.txt -w '%{http_code}' "$url" || true)"
  fi

  echo "$label=$code"
  case "$code" in
    200|301|302|303|307|308|401|403|419|422)
      ;;
    *)
      echo "ROUTE FAILED: $url"
      cat /tmp/pmd_provider_http_v2.txt || true
      return 1
      ;;
  esac
}

while IFS= read -r domain; do
  [ -z "$domain" ] && continue
  safe_label="$(printf '%s' "$domain" | tr '.-' '__')"
  echo "DOMAIN=$domain"
  check_route "https://$domain/admin/pmdfinance" "${safe_label}_FINANCE_HTTP"
  check_route "https://$domain/admin/payment-providers" "${safe_label}_LEGACY_PROVIDER_REDIRECT_HTTP"
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

if grep -q 'pmd-payment-providers-settings-link-v1.js' app/admin/views/_meta/assets.json; then
  echo "ERROR: delayed Settings card injector is still registered"
  exit 1
fi

echo "UI CHECK OK"

trap - ERR

echo
echo "=========================================="
echo " SUCCESS - PROVIDERS NOW LIVE IN FINANCE"
echo " ALL ACTIVE TENANTS VERIFIED"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
