#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_provider_arch_${STAMP}"
BACKUP="/var/backups/pmd_provider_arch_${STAMP}"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"

echo "=========================================="
echo " PAYMYDINE PROVIDER ARCHITECTURE V1"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

FILES=(
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/Services/Payments/ProviderConnectionService.php"
  "app/admin/controllers/PaymentProviders.php"
  "app/admin/views/paymentproviders/index.blade.php"
  "app/admin/assets/js/pmd-payment-provider-catalogue-v1.js"
  "app/admin/assets/js/pmd-payment-providers-settings-link-v1.js"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-sumup-self-service-v1.css"
  "app/admin/Services/Payments/PaymentOrchestrator.php"
  "app/admin/controllers/PaymentController.php"
  "routes/terminal-payments.php"
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
  echo "!!!!! PROVIDER ARCHITECTURE DEPLOY FAILED !!!!!"
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
  node --check "$STAGE/app/admin/assets/js/pmd-payment-providers-settings-link-v1.js"
  node --check "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
fi

echo "PREFLIGHT OK"

echo
echo "========== BACKUP =========="

for file in "${FILES[@]}"; do
  backup_file "$file"
done

backup_file "app/admin/views/_meta/assets.json"

echo "BACKUP=$BACKUP"

echo
echo "========== INSTALL =========="

for file in "${FILES[@]}"; do
  sudo install \
    -D \
    -m 0644 \
    -o root \
    -g www-data \
    "$STAGE/$file" \
    "$ROOT/$file"

  echo "INSTALLED: $file"
done

echo
echo "========== MERGE ADMIN ASSETS =========="

sudo python3 <<'PY'
import json
from pathlib import Path

path = Path('/var/www/paymydine/app/admin/views/_meta/assets.json')
data = json.loads(path.read_text())

styles = [
    ('css/pmd-payment-provider-catalogue-v1.css', 'pmd-payment-provider-catalogue-v1-css'),
    ('css/pmd-sumup-self-service-v1.css', 'pmd-sumup-self-service-v1-css'),
]

scripts = [
    ('js/pmd-payment-provider-catalogue-v1.js', 'pmd-payment-provider-catalogue-v1-js'),
    ('js/pmd-payment-providers-settings-link-v1.js', 'pmd-payment-providers-settings-link-v1-js'),
    ('js/pmd-sumup-self-service-v1.js', 'pmd-sumup-self-service-v1-js'),
]

style_rows = data.setdefault('style', [])
script_rows = data.setdefault('script', [])
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
echo "ASSETS JSON OK\n";
'

echo
echo "========== CLEAR CACHE =========="

sudo -u www-data -H php artisan optimize:clear || php artisan optimize:clear || true

echo
echo "========== MIMOZA PROVIDER STATE =========="

php artisan tinker --execute='
config(["database.connections.mysql.database" => "mimoza"]);
DB::purge("mysql");
DB::reconnect("mysql");
DB::setDefaultConnection("mysql");

$sumup = app(App\Services\TerminalPayments\SumupTenantConnectionService::class)->state();
$providers = app(App\Services\Payments\ProviderConnectionService::class)->state("sumup");

echo "DB=".DB::connection()->getDatabaseName().PHP_EOL;
echo "SUMUP_ACTIVE_ENV=".($sumup["active_environment"] ?? "NONE").PHP_EOL;

foreach (["test", "production"] as $env) {
    $cfg = $sumup["environments"][$env] ?? [];
    echo strtoupper($env)
        ." connected=".(($cfg["connection_status"] ?? "") === "connected" ? "YES" : "NO")
        ." terminals=".count($cfg["terminals"] ?? [])
        .PHP_EOL;
}

echo "GENERIC_PROVIDER_SCHEMA=".(($providers["schema_ready"] ?? false) ? "YES" : "NO").PHP_EOL;
'

echo
echo "========== HTTP ROUTE CHECK =========="

check_route() {
  local url="$1"
  local label="$2"
  local method="${3:-GET}"
  local code

  if [ "$method" = "POST" ]; then
    code="$(curl -sS -X POST -H 'Accept: application/json' -o /tmp/pmd_provider_http.txt -w '%{http_code}' "$url" || true)"
  else
    code="$(curl -sS -H 'Accept: application/json' -o /tmp/pmd_provider_http.txt -w '%{http_code}' "$url" || true)"
  fi

  echo "$label=$code"

  case "$code" in
    200|302|401|403|419|422)
      ;;
    *)
      echo "ROUTE FAILED: $url"
      cat /tmp/pmd_provider_http.txt || true
      return 1
      ;;
  esac
}

check_route "https://mimoza.paymydine.com/admin/payment-providers" "PROVIDER_PAGE_HTTP"
check_route "https://mimoza.paymydine.com/admin/payment-providers/state" "PROVIDER_STATE_HTTP"
check_route "https://mimoza.paymydine.com/admin/payment-providers/sumup/state" "SUMUP_PROVIDER_STATE_HTTP"

CALLBACK_CODE="$(curl -sS -X POST -H 'Accept: application/json' -o /tmp/pmd_provider_callback.txt -w '%{http_code}' https://mimoza.paymydine.com/admin/terminal-payments/sumup/callback/999999 || true)"
echo "SUMUP_CALLBACK_HTTP=$CALLBACK_CODE"

if [ "$CALLBACK_CODE" != "200" ]; then
  echo "SumUp callback regression detected."
  cat /tmp/pmd_provider_callback.txt || true
  exit 1
fi

echo
echo "========== UI FILE CHECK =========="

grep -q 'data-pmd-payment-provider-catalogue' app/admin/views/paymentproviders/index.blade.php
grep -q 'Manage provider connection' app/admin/assets/js/pmd-sumup-self-service-v1.js
grep -q 'guardLegacyTerminalEditor' app/admin/assets/js/pmd-sumup-self-service-v1.js
grep -q 'pmd-payment-providers-settings-link-v1.js' app/admin/views/_meta/assets.json
grep -q "'/payment-providers'" routes/terminal-payments.php

echo "UI FILES OK"

trap - ERR

echo
echo "=========================================="
echo " SUCCESS - PROVIDER ARCHITECTURE V1 LIVE"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
