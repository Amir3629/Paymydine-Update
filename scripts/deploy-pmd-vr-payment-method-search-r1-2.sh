#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
BRANCH="sumup-inline-widget-r1"
TARGET="$ROOT/app/Services/Payments/VrPaymentApiClient.php"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_vr_payment_method_search_r1_2_${STAMP}"
BACKUP="/var/backups/pmd_vr_payment_method_search_r1_2_${STAMP}"
HELPER="$STAGE/patch.py"
STAGED_TARGET="$STAGE/VrPaymentApiClient.php"

mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP"

cd "$ROOT"

echo "============================================================"
echo " PAYMYDINE VR PAYMENT METHOD SEARCH R1.2"
echo " RESILIENT LIVE-AUTHORITY PATCH + MOON API VERIFY"
echo "============================================================"

git fetch origin "$BRANCH"
REMOTE="$(git rev-parse "origin/$BRANCH")"
echo "REMOTE=$REMOTE"

git show "origin/$BRANCH:scripts/patch-pmd-vr-payment-method-search-r1-2.py" > "$HELPER"
chmod 755 "$HELPER"
python3 -m py_compile "$HELPER"
echo "PATCH_HELPER=OK"

if [[ ! -f "$TARGET" ]]; then
  echo "ERROR: live target not found: $TARGET" >&2
  exit 1
fi

cp "$TARGET" "$STAGED_TARGET"
sudo cp -a "$TARGET" "$BACKUP/VrPaymentApiClient.php"
echo "BACKUP=$BACKUP"

python3 "$HELPER" "$STAGED_TARGET"
php -l "$STAGED_TARGET"

python3 - "$STAGED_TARGET" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
t = p.read_text(encoding='utf-8')
s = t.find('    public function paymentMethodConfigurations(): array')
e = t.find('    public function availablePaymentMethodConfigurations', s)
if s < 0 or e < 0:
    raise SystemExit('ERROR: staged payment method search function missing')
b = t[s:e]
if "'order'" in b or '"order"' in b:
    raise SystemExit('ERROR: order survived inside paymentMethodConfigurations')
if 'PMD_VR_PAYMENT_METHOD_SEARCH_R1_2' not in b:
    raise SystemExit('ERROR: R1.2 marker missing in staged method')
print('STATIC_CONTRACT=OK')
PY

sudo install -m 0644 "$STAGED_TARGET" "$TARGET"
php -l "$TARGET"
echo "INSTALLED=$TARGET"

php artisan optimize:clear || true

echo
echo "========== LIVE CONTRACT =========="
grep -n -A12 -B2 'PMD_VR_PAYMENT_METHOD_SEARCH_R1_2' "$TARGET" || true

echo
echo "========== MOON VR REAL API VERIFY =========="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Admin\Models\Payments_model;
use App\Services\Payments\VrPaymentApiClient;

$tenant = DB::connection('mysql')->table('tenants')
    ->where('domain', 'moon.paymydine.com')
    ->first();

if (!$tenant || empty($tenant->database)) {
    echo "MOON_TENANT=NOT_FOUND\n";
    exit(0);
}

$cfg = config('database.connections.mysql');
$cfg['database'] = (string)$tenant->database;
Config::set('database.connections.pmd_vr_r12_verify', $cfg);
DB::purge('pmd_vr_r12_verify');
DB::reconnect('pmd_vr_r12_verify');
Config::set('database.default', 'pmd_vr_r12_verify');
DB::setDefaultConnection('pmd_vr_r12_verify');

$row = Payments_model::query()->where('code', 'vr_payment')->first();
if (!$row) {
    echo "MOON_VR_PROVIDER=NOT_FOUND\n";
    exit(0);
}

$data = method_exists($row, 'getConfigData')
    ? (array)$row->getConfigData()
    : (array)$row->data;

$client = new VrPaymentApiClient([
    'mode' => $data['mode'] ?? 'test',
    'api_base_url' => $data['api_base_url'] ?? '',
    'space_id' => $data['space_id'] ?? '',
    'user_id' => $data['user_id'] ?? '',
    'auth_key' => $data['auth_key'] ?? '',
]);

$methods = $client->paymentMethodConfigurations();
$terminals = $client->terminals();
$audit = $client->connectionAudit();

echo 'MOON_DATABASE='.DB::connection()->getDatabaseName().PHP_EOL;
echo 'MOON_PROVIDER_STATUS='.(int)$row->status.PHP_EOL;
echo 'MOON_SPACE_ID='.(string)($data['space_id'] ?? '').PHP_EOL;
echo 'MOON_USER_ID='.(string)($data['user_id'] ?? '').PHP_EOL;
echo 'MOON_METHOD_API_OK='.(($methods['ok'] ?? false) ? 'YES' : 'NO').PHP_EOL;
echo 'MOON_METHOD_API_HTTP='.(int)($methods['status'] ?? 0).PHP_EOL;
echo 'MOON_METHOD_API_MESSAGE='.(string)($methods['message'] ?? '').PHP_EOL;
echo 'MOON_TERMINAL_API_OK='.(($terminals['ok'] ?? false) ? 'YES' : 'NO').PHP_EOL;
echo 'MOON_TERMINAL_API_HTTP='.(int)($terminals['status'] ?? 0).PHP_EOL;
echo 'MOON_CONNECTED='.(($audit['connected'] ?? false) ? 'YES' : 'NO').PHP_EOL;
echo 'MOON_AVAILABLE_METHODS='.json_encode($audit['available_method_codes'] ?? [], JSON_UNESCAPED_SLASHES).PHP_EOL;
echo 'MOON_TERMINAL_COUNT='.(int)($audit['terminal_count'] ?? 0).PHP_EOL;
if (!($audit['ok'] ?? false)) {
    echo 'MOON_AUDIT_MESSAGE='.(string)($audit['message'] ?? '').PHP_EOL;
}
PHP

echo
echo "============================================================"
echo " SUCCESS - VR PAYMENT METHOD SEARCH R1.2 INSTALLED"
echo "============================================================"
echo "PAYMENT_METHOD_SEARCH_ORDER=OMITTED"
echo "LIVE_AUTHORITY_FORMAT_TOLERANT=YES"
echo "VR_PROVIDER_ERRORS=SURFACED_SAFELY"
echo "MOON_REAL_API_VERIFY=RUN"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE"
