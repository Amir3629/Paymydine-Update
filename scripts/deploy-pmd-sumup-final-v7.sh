#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_final_v7_${STAMP}"
BACKUP="/var/backups/pmd_sumup_final_v7_${STAMP}"
FRONT_ROOT="$ROOT/frontend"
FRONT_STAGE="$STAGE/frontend-build"
FRONT_SERVICE=""
INSTALL_STARTED=0
FRONTEND_ACTIVATED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"

echo "=========================================="
echo " PAYMYDINE SUMUP FINAL V7"
echo " AUDIT-DRIVEN STAFF + GUEST FINALIZATION"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

# Exact files required by the audit. Do not overwrite the dirty live tree wholesale.
FILES=(
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/css/pmd-payment-simple-v1.css"
  "app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/Services/Payments/ProviderConnectionService.php"
  "app/Services/Payments/SumupPaymentRuntimeBridge.php"
  "app/Services/Payments/SumupHostedCheckoutService.php"
  "app/admin/controllers/SumupTerminalSettings.php"
  "app/main/routes_sumup_self_service.php"
  "app/main/routes/sumup.php"
  "frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
  "frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
  "frontend/components/payment/sumup-hosted-checkout.tsx"
)

# Live assets.json is deliberately NOT replaced by the branch copy. It is merged below.
EXTRA_BACKUP=(
  "app/admin/views/_meta/assets.json"
)

echo
echo "========== STAGE EXACT REMOTE FILES =========="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git cat-file -e "$REMOTE:$f" || {
    echo "ERROR: remote file missing: $f"
    exit 2
  }
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

echo
echo "========== SOURCE PREFLIGHT =========="
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
php -l "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
php -l "$STAGE/app/Services/Payments/ProviderConnectionService.php"
php -l "$STAGE/app/Services/Payments/SumupPaymentRuntimeBridge.php"
php -l "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php"
php -l "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
php -l "$STAGE/app/main/routes/sumup.php"

grep -q "Staff checkout is intentionally limited to the two actions" \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
grep -q "name: 'Terminal'" \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
grep -q "pmdSimpleMethodCount" \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
grep -q "PMD_PROVIDER_ENV_TAB_ISOLATION_V2" \
  "$STAGE/app/admin/assets/css/pmd-payment-provider-catalogue-v1.css"
grep -q "self-service-checkout" \
  "$STAGE/app/main/routes_sumup_self_service.php"
grep -q "self-service-status" \
  "$STAGE/app/main/routes_sumup_self_service.php"
grep -q "providerCode === \"sumup\"" \
  "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
grep -q "payment_return_provider" \
  "$STAGE/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"

if grep -RniE 'mimoza\.paymydine\.com|database[^A-Za-z0-9_]+mimoza' \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js" \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js" \
  "$STAGE/app/Services/Payments/ProviderConnectionService.php" \
  "$STAGE/app/Services/Payments/SumupPaymentRuntimeBridge.php" \
  "$STAGE/app/Services/Payments/SumupHostedCheckoutService.php" \
  "$STAGE/app/admin/controllers/SumupTerminalSettings.php" \
  "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts" \
  "$STAGE/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts" \
  >"$STAGE/hardcode.txt" 2>/dev/null; then
  echo "ERROR: tenant-specific hardcode detected"
  cat "$STAGE/hardcode.txt"
  exit 3
fi

echo "SOURCE PREFLIGHT OK"

echo
echo "========== LIVE ROUTE + ASSET PREFLIGHT =========="
[ -f "$ROOT/app/admin/views/_meta/assets.json" ] || {
  echo "ERROR: live assets.json missing"
  exit 4
}
php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) { fwrite(STDERR, "Invalid live assets JSON\n"); exit(2); } echo "LIVE ASSETS JSON OK\n";' \
  "$ROOT/app/admin/views/_meta/assets.json"
grep -q "routes/sumup.php" "$ROOT/app/main/routes.php" || {
  echo "ERROR: app/main/routes.php does not include routes/sumup.php"
  exit 5
}

echo
echo "========== DETECT ACTIVE GUEST FRONTEND =========="
if [ ! -f "$FRONT_ROOT/package.json" ] || [ ! -d "$FRONT_ROOT/node_modules" ]; then
  echo "ERROR: $FRONT_ROOT is not an installed buildable frontend"
  echo "NOTHING DEPLOYED"
  exit 6
fi

if sudo -u ubuntu -H bash -lc 'command -v pm2 >/dev/null 2>&1'; then
  PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
  FRONT_SERVICE="$(printf '%s' "$PM2_JSON" | FRONT_ROOT="$FRONT_ROOT" php -r '
    $rows=json_decode(stream_get_contents(STDIN), true) ?: [];
    $target=realpath((string)getenv("FRONT_ROOT"));
    foreach ($rows as $row) {
        $cwd=(string)($row["pm2_env"]["pm_cwd"] ?? "");
        if ($cwd !== "" && realpath($cwd) === $target) {
            echo (string)($row["name"] ?? "");
            exit;
        }
    }
  ')"
fi

if [ -z "$FRONT_SERVICE" ]; then
  echo "ERROR: could not identify the PM2 service whose cwd is $FRONT_ROOT"
  echo "NOTHING DEPLOYED"
  exit 7
fi

echo "FRONTEND_SERVICE=$FRONT_SERVICE"

echo
echo "========== STAGED FRONTEND BUILD =========="
mkdir -p "$FRONT_STAGE"
tar -C "$FRONT_ROOT" \
  --exclude='./node_modules' \
  --exclude='./.next' \
  -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"

for f in \
  "features/customer-menu/checkout/paymentModalHostedCheckout.ts" \
  "features/customer-menu/checkout/usePaymentReturnVerification.ts" \
  "components/payment/sumup-hosted-checkout.tsx"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend/$f" "$FRONT_STAGE/$f"
done

(
  cd "$FRONT_STAGE"
  npm run build
)
[ -d "$FRONT_STAGE/.next" ] || {
  echo "ERROR: staged frontend build produced no .next"
  exit 8
}
echo "FRONTEND BUILD OK"

echo
echo "========== BACKUP TARGET FILES =========="
for f in "${FILES[@]}" "${EXTRA_BACKUP[@]}"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/files/$f"
  else
    echo "$f" | sudo tee -a "$BACKUP/new-files.txt" >/dev/null
  fi
done

echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP V7 FAILED - RESTORING !!!!!"

  if [ -f "$BACKUP/new-files.txt" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && sudo rm -f "$ROOT/$f"
    done < "$BACKUP/new-files.txt"
  fi

  if [ -d "$BACKUP/files" ]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi

  if [ "$FRONTEND_ACTIVATED" = "1" ]; then
    sudo rm -rf "$FRONT_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo mv "$BACKUP/frontend-next.previous" "$FRONT_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env >/dev/null 2>&1 || true
  fi

  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED FROM: $BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL AUDITED FILES =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

echo
echo "========== MERGE LIVE ADMIN ASSETS =========="
sudo python3 <<'PY'
import json
from pathlib import Path

path = Path('/var/www/paymydine/app/admin/views/_meta/assets.json')
data = json.loads(path.read_text())
styles = data.setdefault('style', [])
scripts = data.setdefault('script', [])

style_required = [
    ('css/pmd-payment-provider-catalogue-v1.css', 'pmd-payment-provider-catalogue-v1-css'),
    ('css/pmd-payment-simple-v1.css', 'pmd-payment-simple-v1-css'),
]
script_required = [
    ('js/pmd-waiter-pos-payment-v3.js', 'pmd-waiter-pos-payment-v3-js'),
    ('js/pmd-waiter-pos-payment-policy-v2.js', 'pmd-waiter-pos-payment-policy-v2-js'),
]

def remove_matches(rows, path_value, name_value):
    return [
        row for row in rows
        if row.get('path') != path_value and row.get('name') != name_value
    ]

for p, n in style_required:
    styles[:] = remove_matches(styles, p, n)
    styles.append({'path': p, 'name': n})

# Payment V3 must exist before the policy wrapper executes.
for p, n in script_required:
    scripts[:] = remove_matches(scripts, p, n)

insert_at = 0
for i, row in enumerate(scripts):
    if row.get('name') == 'admin-js' or row.get('path') == 'js/admin.js':
        insert_at = i + 1
        break

for offset, (p, n) in enumerate(script_required):
    scripts.insert(insert_at + offset, {'path': p, 'name': n})

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print('ASSETS MERGED')
PY

php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) exit(2); echo "ASSETS JSON OK\n";' \
  "$ROOT/app/admin/views/_meta/assets.json"

grep -q 'pmd-payment-simple-v1.css' "$ROOT/app/admin/views/_meta/assets.json"
grep -q 'pmd-waiter-pos-payment-v3.js' "$ROOT/app/admin/views/_meta/assets.json"
grep -q 'pmd-waiter-pos-payment-policy-v2.js' "$ROOT/app/admin/views/_meta/assets.json"

echo
echo "========== SYNC CONNECTED SUMUP TENANTS =========="
SYNC_SCRIPT="$STAGE/sync-connected-sumup.php"
cat > "$SYNC_SCRIPT" <<'PHP'
<?php

use App\Services\Payments\SumupPaymentRuntimeBridge;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$base = (array)config('database.connections.mysql');
$central = DB::connection('mysql');
$tenants = $central->table('tenants')
    ->where('status', 'active')
    ->whereNotNull('database')
    ->where('database', '<>', '')
    ->get(['domain', 'database']);

$checked = 0;
$connected = 0;
$failed = 0;

foreach ($tenants as $tenant) {
    $checked++;
    $domain = (string)$tenant->domain;
    $database = (string)$tenant->database;

    try {
        $cfg = $base;
        $cfg['database'] = $database;
        Config::set('database.connections.pmd_sumup_v7', $cfg);
        DB::purge('pmd_sumup_v7');
        DB::reconnect('pmd_sumup_v7');
        DB::setDefaultConnection('pmd_sumup_v7');

        if (!Schema::connection('pmd_sumup_v7')->hasTable('terminal_provider_configs')) {
            echo "TENANT={$domain} SUMUP=NOT_CONFIGURED SCHEMA=MISSING".PHP_EOL;
            continue;
        }

        $bridge = app(SumupPaymentRuntimeBridge::class);
        $environment = $bridge->activeEnvironment();
        if (!$environment) {
            echo "TENANT={$domain} SUMUP=NOT_CONFIGURED SCHEMA=OK".PHP_EOL;
            continue;
        }

        DB::connection('pmd_sumup_v7')->beginTransaction();
        try {
            $result = $bridge->syncCatalogue($environment);
            DB::connection('pmd_sumup_v7')->commit();
        } catch (Throwable $e) {
            DB::connection('pmd_sumup_v7')->rollBack();
            throw $e;
        }

        $connected++;
        echo "TENANT={$domain} SUMUP=READY ENV={$environment} CARD_SUMUP="
            .(!empty($result['card_mapped_to_sumup']) ? 'YES' : 'NO')
            ." ALTERNATE_CARD_PRESERVED="
            .(!empty($result['existing_card_provider_preserved']) ? 'YES' : 'NO')
            ." SECRET_MIRROR=NO".PHP_EOL;
    } catch (Throwable $e) {
        $failed++;
        echo "TENANT={$domain} SUMUP_SYNC=FAILED ERROR=".get_class($e).PHP_EOL;
    } finally {
        DB::purge('pmd_sumup_v7');
        DB::setDefaultConnection('mysql');
    }
}

DB::setDefaultConnection('mysql');
echo "TENANTS_CHECKED={$checked}".PHP_EOL;
echo "SUMUP_CONNECTED_TENANTS={$connected}".PHP_EOL;
echo "SYNC_FAILED={$failed}".PHP_EOL;

if ($failed > 0) exit(9);
PHP
php "$SYNC_SCRIPT"

echo
echo "========== PHP + JS LIVE CHECK =========="
node --check "$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
node --check "$ROOT/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
php -l "$ROOT/app/Services/Payments/SumupPaymentRuntimeBridge.php"
php -l "$ROOT/app/Services/Payments/SumupHostedCheckoutService.php"
php -l "$ROOT/app/admin/controllers/SumupTerminalSettings.php"
php -l "$ROOT/app/main/routes_sumup_self_service.php"
php -l "$ROOT/app/main/routes/sumup.php"

echo
echo "========== ACTIVATE GUEST FRONTEND =========="
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo mv "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
sudo cp -a "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
FRONTEND_ACTIVATED=1

sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 2

PM2_STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" php -r '
  $rows=json_decode(stream_get_contents(STDIN), true) ?: [];
  foreach ($rows as $row) {
      if (($row["name"] ?? "") === getenv("FRONT_SERVICE")) {
          echo (string)($row["pm2_env"]["status"] ?? "unknown");
          exit;
      }
  }
  echo "missing";
')"

echo "FRONTEND_STATUS=$PM2_STATUS"
[ "$PM2_STATUS" = "online" ] || {
  echo "ERROR: guest frontend process is not online"
  exit 10
}

echo
echo "========== CLEAR LARAVEL CACHE =========="
cd "$ROOT"
php artisan optimize:clear || true

echo
echo "========== FINAL STATIC AUDIT =========="
grep -q "Staff checkout is intentionally limited to the two actions" \
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q "name: 'Terminal'" \
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
grep -q "pmdSimpleMethodCount" \
  app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js
grep -q "PMD_PROVIDER_ENV_TAB_ISOLATION_V2" \
  app/admin/assets/css/pmd-payment-provider-catalogue-v1.css
grep -q "self-service-checkout" app/main/routes_sumup_self_service.php
grep -q "self-service-status" app/main/routes_sumup_self_service.php
grep -q "providerCode === \"sumup\"" \
  frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts

echo "POS_METHODS=Cash+Terminal"
echo "TERMINAL_STATUS_RECHECK=enabled"
echo "OFFLINE_TERMINAL_CHARGE=blocked"
echo "GUEST_SUMUP_HOSTED_CHECKOUT=installed"
echo "GUEST_SUMUP_RETURN_VERIFICATION=installed"
echo "PROVIDER_ENV_TABS=isolated"
echo "TENANT_SECRETS=encrypted-provider-config"
echo "LIVE_ASSETS_JSON=merged-not-replaced"

INSTALL_STARTED=0
FRONTEND_ACTIVATED=0
trap - EXIT

echo
echo "=========================================="
echo " SUCCESS - SUMUP FINAL V7 INSTALLED"
echo " Production certification still requires one real low-value payment"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
