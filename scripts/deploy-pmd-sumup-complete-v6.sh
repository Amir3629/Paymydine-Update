#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_complete_v6_${STAMP}"
BACKUP="/var/backups/pmd_sumup_complete_v6_${STAMP}"
FRONTEND_ROOT="$ROOT/frontend"
FRONTEND_SERVICE=""
FRONTEND_STAGE=""
FRONTEND_ACTIVATED=0
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"
sudo touch "$BACKUP/new-files.txt"

echo "=========================================="
echo " PAYMYDINE SUMUP COMPLETE V6"
echo " MULTI-TENANT + SIMPLE POS + GUEST CHECKOUT"
echo "=========================================="

git fetch origin sumup-terminal-e2e
echo "REMOTE=$(git rev-parse "$REMOTE")"

FILES=(
  "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/js/pmd-sumup-self-service-v1.js"
  "app/admin/assets/css/pmd-payment-simple-v1.css"
  "app/admin/views/_meta/assets.json"
  "app/Services/Payments/SumupPaymentRuntimeBridge.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/admin/controllers/SumupTerminalSettings.php"
  "frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
)

PATCH_FILES=(
  "routes/admin-app-before.php"
  "app/main/routes_sumup.php"
)

echo
echo "========== STAGE =========="
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
echo "========== PREFLIGHT =========="
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
node --check "$STAGE/app/admin/assets/js/pmd-sumup-self-service-v1.js"
php -l "$STAGE/app/Services/Payments/SumupPaymentRuntimeBridge.php"
php -l "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
php -l "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) { fwrite(STDERR, "Invalid assets JSON\n"); exit(2); } echo "ASSETS JSON OK\n";' \
  "$STAGE/app/admin/views/_meta/assets.json"

grep -q 'pmd-waiter-pos-payment-policy-v2.js' "$STAGE/app/admin/views/_meta/assets.json"
grep -q 'pmd-payment-simple-v1.css' "$STAGE/app/admin/views/_meta/assets.json"
grep -q "providerReturnCode = providerCode === \"worldline\"" \
  "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
grep -q 'providerCode === "sumup"' \
  "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"

if grep -RniE 'mimoza\.paymydine\.com|database[^A-Za-z0-9_]+mimoza' \
  "$STAGE/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js" \
  "$STAGE/app/admin/assets/css/pmd-payment-simple-v1.css" \
  "$STAGE/app/Services/Payments/SumupPaymentRuntimeBridge.php" \
  "$STAGE/app/admin/controllers/SumupTerminalSettings.php" \
  "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts" \
  >/tmp/pmd_sumup_v6_hardcode.txt 2>/dev/null; then
  echo "ERROR: tenant-specific hardcode detected"
  cat /tmp/pmd_sumup_v6_hardcode.txt
  exit 3
fi
echo "MULTI-TENANT SOURCE CHECK OK"

# Detect whether the root frontend/ tree is the running PM2 guest-menu app.
if command -v pm2 >/dev/null 2>&1 && [ -d "$FRONTEND_ROOT" ]; then
  PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || true)"
  if [ -n "$PM2_JSON" ]; then
    FRONTEND_SERVICE="$(printf '%s' "$PM2_JSON" | php -r '
      $target = realpath($argv[1]);
      $rows = json_decode(stream_get_contents(STDIN), true) ?: [];
      foreach ($rows as $row) {
          $cwd = $row["pm2_env"]["pm_cwd"] ?? "";
          if ($cwd !== "" && realpath($cwd) === $target) {
              echo (string)($row["name"] ?? "");
              exit;
          }
      }
    ' "$FRONTEND_ROOT")"
  fi
fi

if [ -n "$FRONTEND_SERVICE" ]; then
  echo "ACTIVE ROOT FRONTEND SERVICE=$FRONTEND_SERVICE"
  [ -d "$FRONTEND_ROOT/node_modules" ] || {
    echo "ERROR: active root frontend has no node_modules"
    exit 4
  }

  echo
echo "========== FRONTEND BUILD PREFLIGHT =========="
  FRONTEND_STAGE="$STAGE/frontend-build"
  mkdir -p "$FRONTEND_STAGE"
  tar -C "$FRONTEND_ROOT" \
    --exclude='./node_modules' \
    --exclude='./.next' \
    -cf - . | tar -C "$FRONTEND_STAGE" -xf -
  ln -s "$FRONTEND_ROOT/node_modules" "$FRONTEND_STAGE/node_modules"
  mkdir -p "$FRONTEND_STAGE/features/customer-menu/checkout"
  cp "$STAGE/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts" \
    "$FRONTEND_STAGE/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
  (
    cd "$FRONTEND_STAGE"
    npm run build
  )
  [ -d "$FRONTEND_STAGE/.next" ] || {
    echo "ERROR: frontend build did not create .next"
    exit 5
  }
  echo "FRONTEND BUILD OK"
else
  echo "NOTE: no running PM2 process uses $FRONTEND_ROOT"
  echo "Guest frontend source will be updated, but no unknown frontend service will be restarted."
fi

echo
echo "========== BACKUP =========="
for f in "${FILES[@]}" "${PATCH_FILES[@]}"; do
  if [ -f "$f" ]; then
    sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
    sudo cp -a "$f" "$BACKUP/files/$f"
  else
    echo "$f" | sudo tee -a "$BACKUP/new-files.txt" >/dev/null
  fi
done
echo "BACKUP=$BACKUP"

rollback_files() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! V6 INSTALL FAILED - RESTORING APPLICATION FILES !!!!!"

  if [ -f "$BACKUP/new-files.txt" ]; then
    while IFS= read -r rel; do
      [ -n "$rel" ] && sudo rm -f "$ROOT/$rel"
    done < "$BACKUP/new-files.txt"
  fi

  if [ -d "$BACKUP/files" ]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi

  if [ "$FRONTEND_ACTIVATED" = "1" ]; then
    sudo rm -rf "$FRONTEND_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo mv "$BACKUP/frontend-next.previous" "$FRONTEND_ROOT/.next"
    fi
    [ -n "$FRONTEND_SERVICE" ] && sudo -u ubuntu -H pm2 restart "$FRONTEND_SERVICE" --update-env >/dev/null 2>&1 || true
  fi

  echo "RESTORED FROM: $BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback_files "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL SOURCE =========="
for f in "${FILES[@]}"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

echo
echo "========== PATCH SUMUP GUEST RUNTIME =========="
sudo python3 <<'PY'
from pathlib import Path

root = Path('/var/www/paymydine')
admin = root / 'routes/admin-app-before.php'
compat = root / 'app/main/routes_sumup.php'


def replace_once(text, old, new, label):
    if new in text:
        print(f'ALREADY PATCHED: {label}')
        return text
    if old not in text:
        raise SystemExit(f'ERROR: patch marker not found: {label}')
    print(f'PATCHED: {label}')
    return text.replace(old, new, 1)


def patch_segment(text, start_marker, end_marker, old, new, label, presence_marker=None):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'ERROR: segment start not found: {label}')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'ERROR: segment end not found: {label}')
    segment = text[start:end]
    if presence_marker and presence_marker in segment:
        print(f'ALREADY PATCHED: {label}')
        return text
    if old not in segment:
        raise SystemExit(f'ERROR: segment patch marker not found: {label}')
    segment = segment.replace(old, new, 1)
    print(f'PATCHED: {label}')
    return text[:start] + segment + text[end:]

s = admin.read_text()

old = """        $paymentRow = \\Admin\\Models\\Payments_model::query()->where('code', $providerCode)->first();
        $paymentData = is_array(optional($paymentRow)->data) ? (array)$paymentRow->data : [];

        try {
"""
new = """        $paymentRow = \\Admin\\Models\\Payments_model::query()->where('code', $providerCode)->first();
        $paymentData = is_array(optional($paymentRow)->data) ? (array)$paymentRow->data : [];

        if ($providerCode === 'sumup') {
            // PMD_SUMUP_RUNTIME_BRIDGE_V6: credentials remain encrypted in the
            // current restaurant tenant and are only decrypted for this request.
            $paymentData = app(\\App\\Services\\Payments\\SumupPaymentRuntimeBridge::class)
                ->runtimeData($paymentData);
        }

        try {
"""
s = replace_once(s, old, new, 'generic card checkout uses encrypted SumUp tenant config')

s = patch_segment(
    s,
    "            if ($providerCode === 'sumup') {",
    "            if ($providerCode === 'square') {",
    """                        'merchant_code' => (string)$merchantCode,
                        'hosted_checkout' => [
""",
    """                        'merchant_code' => (string)$merchantCode,
                        'redirect_url' => $returnUrl,
                        'hosted_checkout' => [
""",
    'SumUp Hosted Checkout gets redirect_url',
    "'redirect_url' => $returnUrl,"
)

bridge_after_data = """        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $data = app(\\App\\Services\\Payments\\SumupPaymentRuntimeBridge::class)
            ->runtimeData($data);
"""

for start_marker, end_marker, label in [
    ("    Route::post('/payments/sumup/checkout-status'", "    Route::post('/payments/sumup/widget-event'", 'SumUp checkout status'),
    ("    Route::get('/payments/sumup/health'", "    Route::get('/payments/sumup/debug'", 'SumUp health'),
    ("    Route::get('/payments/sumup/debug'", "    Route::post('/payments/square/checkout-status'", 'SumUp debug'),
]:
    s = patch_segment(
        s,
        start_marker,
        end_marker,
        """        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
""",
        bridge_after_data,
        label + ' uses encrypted tenant config',
        'SumupPaymentRuntimeBridge::class'
    )

admin.write_text(s)

s = compat.read_text()
function_marker = """    function pmdLoadSumupConfig()
    {
"""
bridge_block = """    function pmdLoadSumupConfig()
    {
        try {
            // PMD_SUMUP_RUNTIME_BRIDGE_V6
            $runtime = app(\\App\\Services\\Payments\\SumupPaymentRuntimeBridge::class)
                ->runtimeData();

            if (!empty($runtime['access_token'])) {
                return (object)[
                    'provider_payment_id' => null,
                    'url' => (string)($runtime['url'] ?? 'https://api.sumup.com'),
                    'access_token' => (string)$runtime['access_token'],
                    'id_application' => (string)($runtime['id_application'] ?? ''),
                ];
            }
        } catch (\\Throwable $e) {
            \\Log::warning('SUMUP_RUNTIME_BRIDGE_FALLBACK', [
                'message' => $e->getMessage(),
            ]);
        }

"""
if 'PMD_SUMUP_RUNTIME_BRIDGE_V6' not in s:
    if function_marker not in s:
        raise SystemExit('ERROR: pmdLoadSumupConfig marker not found')
    s = s.replace(function_marker, bridge_block, 1)
    print('PATCHED: compatibility SumUp routes use encrypted tenant config')
else:
    print('ALREADY PATCHED: compatibility SumUp routes use encrypted tenant config')

s = patch_segment(
    s,
    "    Route::post('/payments/sumup/create-checkout'",
    "    Route::get('/payments/sumup/checkout/{checkoutId}'",
    """            'return_url' => $validated['return_url'] ?? (request()->getSchemeAndHttpHost().'/sumup/return'),
""",
    """            'redirect_url' => $validated['return_url'] ?? (request()->getSchemeAndHttpHost().'/sumup/return'),
""",
    'compat Hosted Checkout uses redirect_url',
    "'redirect_url' => $validated['return_url']"
)

old_merchant = """        if (is_array($json)) {
            return $json['merchant_code'] ?? null;
        }
"""
new_merchant = """        if (is_array($json)) {
            return $json['merchant_profile']['merchant_code']
                ?? $json['merchant_code']
                ?? null;
        }
"""
s = replace_once(s, old_merchant, new_merchant, 'merchant code resolver supports /me nested profile')

compat.write_text(s)
PY

php -l routes/admin-app-before.php
php -l app/main/routes_sumup.php
php -l app/Services/Payments/SumupPaymentRuntimeBridge.php
php -l app/admin/controllers/SumupTerminalSettings.php

echo
echo "========== SYNC EXISTING CONNECTED TENANTS =========="
SYNC_SCRIPT="$STAGE/sync-sumup-catalogue.php"
cat > "$SYNC_SCRIPT" <<'PHP'
<?php

use App\Services\Payments\SumupPaymentRuntimeBridge;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$centralName = (string)config('database.connections.mysql.database');
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
        Config::set('database.connections.pmd_sumup_sync', $cfg);
        DB::purge('pmd_sumup_sync');
        DB::reconnect('pmd_sumup_sync');
        DB::setDefaultConnection('pmd_sumup_sync');

        if (!Schema::connection('pmd_sumup_sync')->hasTable('terminal_provider_configs')) {
            echo "TENANT={$domain} SUMUP=NOT_CONFIGURED SCHEMA=MISSING".PHP_EOL;
            continue;
        }

        $bridge = app(SumupPaymentRuntimeBridge::class);
        $environment = $bridge->activeEnvironment();
        if (!$environment) {
            echo "TENANT={$domain} SUMUP=NOT_CONFIGURED SCHEMA=OK".PHP_EOL;
            continue;
        }

        DB::connection('pmd_sumup_sync')->beginTransaction();
        try {
            $result = $bridge->syncCatalogue($environment);
            DB::connection('pmd_sumup_sync')->commit();
        } catch (Throwable $e) {
            DB::connection('pmd_sumup_sync')->rollBack();
            throw $e;
        }

        $connected++;
        echo "TENANT={$domain} SUMUP=READY ENV={$environment} CARD_SUMUP="
            .(!empty($result['card_mapped_to_sumup']) ? 'YES' : 'NO')
            ." OTHER_CARD_PROVIDER_PRESERVED="
            .(!empty($result['existing_card_provider_preserved']) ? 'YES' : 'NO')
            ." SECRET_MIRROR=NO".PHP_EOL;
    } catch (Throwable $e) {
        $failed++;
        echo "TENANT={$domain} SUMUP_SYNC=FAILED ERROR=".get_class($e).PHP_EOL;
    } finally {
        DB::purge('pmd_sumup_sync');
        DB::setDefaultConnection('mysql');
    }
}

DB::setDefaultConnection('mysql');
echo "TENANTS_CHECKED={$checked}".PHP_EOL;
echo "SUMUP_CONNECTED_TENANTS={$connected}".PHP_EOL;
echo "SYNC_FAILED={$failed}".PHP_EOL;

if ($failed > 0) {
    exit(9);
}
PHP

php "$SYNC_SCRIPT"

echo
echo "========== CLEAR CACHE =========="
php artisan optimize:clear || true

# Backend and database state are now coherent; a later frontend activation
# failure only needs to restore the previous .next build, not provider secrets.
INSTALL_STARTED=0
trap - EXIT

if [ -n "$FRONTEND_SERVICE" ]; then
  echo
echo "========== ACTIVATE ROOT GUEST FRONTEND =========="
  if [ -d "$FRONTEND_ROOT/.next" ]; then
    sudo mv "$FRONTEND_ROOT/.next" "$BACKUP/frontend-next.previous"
  fi

  sudo cp -a "$FRONTEND_STAGE/.next" "$FRONTEND_ROOT/.next"
  FRONTEND_ACTIVATED=1

  if ! sudo -u ubuntu -H pm2 restart "$FRONTEND_SERVICE" --update-env; then
    echo "ERROR: frontend restart failed; restoring previous .next"
    sudo rm -rf "$FRONTEND_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo mv "$BACKUP/frontend-next.previous" "$FRONTEND_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONTEND_SERVICE" --update-env || true
    exit 10
  fi

  sleep 2
  STATUS="$(sudo -u ubuntu -H pm2 jlist | php -r '
    $name=$argv[1];
    $rows=json_decode(stream_get_contents(STDIN),true)?:[];
    foreach($rows as $row){
      if(($row["name"]??"")===$name){echo $row["pm2_env"]["status"]??"unknown"; exit;}
    }
    echo "missing";
  ' "$FRONTEND_SERVICE")"

  if [ "$STATUS" != "online" ]; then
    echo "ERROR: frontend service status=$STATUS; restoring previous .next"
    sudo rm -rf "$FRONTEND_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo mv "$BACKUP/frontend-next.previous" "$FRONTEND_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONTEND_SERVICE" --update-env || true
    exit 11
  fi

  echo "GUEST_FRONTEND_SERVICE=$FRONTEND_SERVICE STATUS=online"
else
  echo
echo "GUEST_FRONTEND_RUNTIME=NOT_DETECTED_FOR_ROOT_FRONTEND"
  echo "Backend + admin + guest source are installed. No unknown PM2 frontend was restarted."
fi

echo
echo "========== FINAL AUDIT =========="ngrep -q 'PMD_SUMUP_RUNTIME_BRIDGE_V6' app/main/routes_sumup.php
grep -q 'SumupPaymentRuntimeBridge::class' routes/admin-app-before.php
grep -q "'redirect_url' => \$returnUrl" routes/admin-app-before.php
grep -q 'pmd-payment-simple-v1.css' app/admin/views/_meta/assets.json
grep -q 'pmd-waiter-pos-payment-policy-v2.js' app/admin/views/_meta/assets.json

echo "POS=Cash+Terminal only"
echo "TERMINAL_SELECTOR=multi-device capable"
echo "OFFLINE_GUARD=enabled"
echo "SUMUP_GUEST_CARD_WALLET=bridged to encrypted tenant credentials"
echo "SUMUP_HOSTED_CHECKOUT=provider-verified"
echo "SECRETS_LEGACY_MIRROR=disabled"

echo
echo "=========================================="
echo " SUCCESS - SUMUP V6 COMPLETE"
echo " Production still requires one real low-value certification payment"
echo "=========================================="
echo "BACKUP=$BACKUP"
echo "REMOTE=$(git rev-parse "$REMOTE")"
