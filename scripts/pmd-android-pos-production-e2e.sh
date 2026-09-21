#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
HOST="${PMD_HOST:-tomo.paymydine.com}"
TENANT="${PMD_TENANT:-tomo}"

ok(){ printf '[PASS] %s\n' "$*"; }
info(){ printf '[INFO] %s\n' "$*"; }
fail(){ printf '[FAIL] %s\n' "$*" >&2; exit 1; }

[[ -d "$ROOT/.git" ]] || fail "Not a git checkout: $ROOT"
[[ -f "$ROOT/artisan" ]] || fail "artisan missing: $ROOT/artisan"

TMP="$(mktemp -d /tmp/pmd-pos-production-e2e.XXXXXX)"
chmod 700 "$TMP"
TOKEN_FILE="$TMP/token"
DEVICE_FILE="$TMP/device_id"
COOKIE_JAR="$TMP/cookies.txt"
START_HEADERS="$TMP/open.headers"
START_BODY="$TMP/open.body"
POS_HEADERS="$TMP/pos.headers"
POS_BODY="$TMP/pos.html"

cleanup() {
  set +e
  if [[ -s "$DEVICE_FILE" ]]; then
    PMD_ROOT="$ROOT" PMD_TENANT="$TENANT" PMD_DEVICE_ID="$(cat "$DEVICE_FILE")" php <<'PHP' >/dev/null 2>&1
<?php
$root = getenv('PMD_ROOT');
$tenant = getenv('PMD_TENANT');
$deviceId = (int)getenv('PMD_DEVICE_ID');

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => $tenant,
]);
Illuminate\Support\Facades\DB::purge('tenant');
Illuminate\Support\Facades\DB::setDefaultConnection('tenant');
Illuminate\Support\Facades\DB::reconnect('tenant');

if ($deviceId > 0) {
    Illuminate\Support\Facades\DB::table('pmd_site_access_devices')
        ->where('id', $deviceId)
        ->where('device_name', 'PMD POS E2E Smoke')
        ->delete();
}
PHP
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "============================================================"
echo "PayMyDine Android POS production E2E"
echo "host=$HOST"
echo "tenant=$TENANT"
echo "============================================================"
echo
echo "This test creates ONE temporary staff_personal device row,"
echo "uses it once against the live POS bridge, then deletes it."
echo "It never changes or rotates a real tablet token."
echo

info "Creating isolated temporary bearer from an existing active POS-capable identity..."

PMD_ROOT="$ROOT" PMD_TENANT="$TENANT" PMD_TOKEN_FILE="$TOKEN_FILE" PMD_DEVICE_FILE="$DEVICE_FILE" php <<'PHP'
<?php
use Admin\Models\Users_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = getenv('PMD_ROOT');
$tenant = getenv('PMD_TENANT');
$tokenFile = getenv('PMD_TOKEN_FILE');
$deviceFile = getenv('PMD_DEVICE_FILE');

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => $tenant,
]);
DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

if (!Schema::hasTable('pmd_site_access_devices')) {
    fwrite(STDERR, "[FAIL] pmd_site_access_devices is missing.\n");
    exit(20);
}

$columns = Schema::getColumnListing('pmd_site_access_devices');
$hasUserId = in_array('user_id', $columns, true);

$templates = DB::table('pmd_site_access_devices')
    ->where('device_kind', 'staff_personal')
    ->whereNull('revoked_at')
    ->whereNotNull('staff_id')
    ->orderByDesc('id')
    ->limit(100)
    ->get();

$selected = null;
$selectedUser = null;
foreach ($templates as $device) {
    $user = null;
    if ($hasUserId && (int)($device->user_id ?? 0) > 0) {
        $user = Users_model::query()->find((int)$device->user_id);
    }
    if (!$user && (int)($device->staff_id ?? 0) > 0) {
        $user = Users_model::query()
            ->where('staff_id', (int)$device->staff_id)
            ->orderBy('user_id')
            ->first();
    }

    if (!$user || !$user->staff) continue;
    if (isset($user->is_activated) && !(bool)$user->is_activated) continue;
    if (isset($user->staff->staff_status) && !(bool)$user->staff->staff_status) continue;

    try {
        if (!$user->hasPermission('Admin.Orders')) continue;
    } catch (Throwable $error) {
        continue;
    }

    $selected = $device;
    $selectedUser = $user;
    break;
}

if (!$selected || !$selectedUser) {
    fwrite(
        STDERR,
        "[FAIL] No active paired staff_personal identity with Admin.Orders was found.\n"
    );
    exit(21);
}

$rawToken = bin2hex(random_bytes(32));
$appKey = (string)config('app.key', 'pmd-site-access');
$tokenHash = hash_hmac('sha256', 'device|'.$rawToken, $appKey);

$values = [
    'location_id' => (int)$selected->location_id,
    'device_kind' => 'staff_personal',
    'staff_id' => (int)$selected->staff_id,
    'pos_device_id' => null,
    'device_name' => 'PMD POS E2E Smoke',
    'token_hash' => $tokenHash,
    'capabilities' => json_encode(
        ['staff_portal', 'android_pos_e2e_smoke'],
        JSON_UNESCAPED_SLASHES
    ),
    'platform_info' => json_encode(
        [
            'name' => 'PMD POS E2E Smoke',
            'user_agent' => 'PayMyDine-E2E/1',
            'ip' => '127.0.0.1',
        ],
        JSON_UNESCAPED_SLASHES
    ),
    'paired_by_staff_id' => null,
    'paired_at' => now(),
    'last_seen_at' => now(),
    'revoked_at' => null,
    'created_at' => now(),
    'updated_at' => now(),
];

if ($hasUserId) {
    $values['user_id'] = (int)$selectedUser->getKey();
}

$deviceId = DB::table('pmd_site_access_devices')->insertGetId($values);

file_put_contents($tokenFile, $rawToken, LOCK_EX);
chmod($tokenFile, 0600);
file_put_contents($deviceFile, (string)$deviceId, LOCK_EX);
chmod($deviceFile, 0600);

echo "[PASS] temporary device created\n";
echo "       device_id=".$deviceId."\n";
echo "       template_device_id=".(int)$selected->id."\n";
echo "       user_id=".(int)$selectedUser->getKey()."\n";
echo "       staff_id=".(int)$selected->staff_id."\n";
echo "       location_id=".(int)$selected->location_id."\n";
PHP

[[ -s "$TOKEN_FILE" ]] || fail "Temporary token was not created."
[[ -s "$DEVICE_FILE" ]] || fail "Temporary device id was not created."
TOKEN="$(cat "$TOKEN_FILE")"

info "Calling live /admin/mobile/pos/open exactly like the Android WebView first request..."

curl -sS   --connect-timeout 15   --max-time 45   -c "$COOKIE_JAR"   -D "$START_HEADERS"   -o "$START_BODY"   -H "Authorization: Bearer $TOKEN"   -H "X-PayMyDine-Android-POS: 1"   -H "Accept: text/html,application/xhtml+xml"   -H "User-Agent: Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 PayMyDine-Android-POS/E2E"   "https://$HOST/admin/mobile/pos/open"

START_STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$START_HEADERS")"
START_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$START_HEADERS")"

echo
echo "--- POS bridge response ---"
grep -Ei '^(HTTP/|Location:|Set-Cookie:|Content-Type:)' "$START_HEADERS"   | sed -E 's/(pmd_admin_session[^=]*=)[^;]+/\1<redacted>/g'   | head -20 || true

if [[ "$START_STATUS" != "302" ]]; then
  echo
  echo "--- response body (first 2500 bytes) ---"
  head -c 2500 "$START_BODY" || true
  echo
  echo
  echo "--- recent matching application errors ---"
  tail -c 40000000 "$ROOT/storage/logs/system.log" 2>/dev/null     | grep -aEi 'PmdMobilePosSession|mobile_android_pos_session|mobile/pos/open|exception|fatal|error'     | tail -120 || true
  fail "Expected POS bridge HTTP 302; got $START_STATUS."
fi
ok "POS bridge returned 302"

case "$START_LOCATION" in
  "https://$HOST/admin/pos"|"https://$HOST/admin/pos/"|"/admin/pos"|"/admin/pos/")
    ok "POS bridge redirects to canonical /admin/pos"
    ;;
  *)
    echo "location=$START_LOCATION"
    fail "POS bridge did not redirect to canonical /admin/pos."
    ;;
esac

if ! grep -qi '^Set-Cookie: pmd_admin_session' "$START_HEADERS"; then
  fail "POS bridge did not issue/update the Admin session cookie."
fi
ok "Admin session cookie was issued"

POS_URL="$START_LOCATION"
if [[ "$POS_URL" == /* ]]; then
  POS_URL="https://$HOST$POS_URL"
fi

info "Loading canonical /admin/pos with ONLY the new session cookie (no bearer)..."

curl -sS   --connect-timeout 15   --max-time 60   -b "$COOKIE_JAR"   -c "$COOKIE_JAR"   -D "$POS_HEADERS"   -o "$POS_BODY"   -H "Accept: text/html,application/xhtml+xml"   -H "User-Agent: Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 PayMyDine-Android-POS/E2E"   "$POS_URL"

POS_STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$POS_HEADERS")"
POS_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$POS_HEADERS")"

echo
echo "--- canonical POS response ---"
grep -Ei '^(HTTP/|Location:|Content-Type:)' "$POS_HEADERS" | head -20 || true

if [[ "$POS_STATUS" != "200" ]]; then
  [[ -n "$POS_LOCATION" ]] && echo "location=$POS_LOCATION"
  echo
  echo "--- POS body (first 2500 bytes) ---"
  head -c 2500 "$POS_BODY" || true
  echo
  echo
  echo "--- recent matching application errors ---"
  tail -c 40000000 "$ROOT/storage/logs/system.log" 2>/dev/null     | grep -aEi 'PmdQuickPos|PmdMobilePosSession|mobile_android_pos_session|/admin/pos|exception|fatal|error'     | tail -160 || true
  fail "Canonical /admin/pos returned HTTP $POS_STATUS."
fi
ok "Canonical /admin/pos returned HTTP 200"

grep -q 'id="pmd-quick-pos"' "$POS_BODY"   || fail "POS HTML is 200 but #pmd-quick-pos is missing."
ok "Canonical #pmd-quick-pos root is present"

grep -q 'window.PMDQuickPOSConfig' "$POS_BODY"   || fail "POS HTML is missing PMDQuickPOSConfig."
ok "Inline POS bootstrap config is present"

grep -q '/app/admin/assets/js/pmd-quick-pos-v1.js' "$POS_BODY"   || fail "POS HTML is missing canonical POS JavaScript."
ok "Canonical POS JavaScript is referenced"

grep -q 'data-bootstrap-url="/admin/pos/bootstrap/' "$POS_BODY"   || fail "POS HTML is missing the bootstrap endpoint contract."
ok "POS bootstrap endpoint contract is present"

if grep -qiE '<title>System Error|Etwas ist schiefgelaufen' "$POS_BODY"; then
  fail "Canonical POS rendered the system error page despite HTTP 200."
fi
ok "POS response is not the generic system-error page"

echo
echo "============================================================"
echo "PRODUCTION ANDROID POS E2E: PASS"
echo "============================================================"
echo
echo "Proved without a tablet:"
echo "  temporary paired-device bearer -> live mobile/pos/open"
echo "  -> Admin session cookie -> canonical /admin/pos"
echo "  -> real #pmd-quick-pos HTML + inline bootstrap + canonical JS"
echo
echo "The temporary device row will now be deleted automatically."
