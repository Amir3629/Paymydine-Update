#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TENANT="${PMD_TENANT:-tomo}"
HOST="${PMD_TENANT_HOST:-tomo.paymydine.com}"
SYSTEM_LOG="$ROOT/storage/logs/system.log"

section() {
  printf '\n\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

[[ -d "$ROOT/.git" ]] || { echo "ERROR: not a git checkout: $ROOT" >&2; exit 2; }
[[ -f "$ROOT/artisan" ]] || { echo "ERROR: artisan missing: $ROOT/artisan" >&2; exit 2; }

cd "$ROOT"
GIT=(git -c "safe.directory=$ROOT" -C "$ROOT")

section "PMD ANDROID PAIRING RUNTIME DIAGNOSTIC"
date -Is
echo "root=$ROOT"
echo "tenant=$TENANT"
echo "host=$HOST"
echo "branch=$("${GIT[@]}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
echo "head=$("${GIT[@]}" rev-parse HEAD 2>/dev/null || true)"
echo "origin_main=$("${GIT[@]}" rev-parse origin/main 2>/dev/null || true)"

section "LIVE CODE MARKERS"
for spec in   "app/admin/controllers/Login.php|PMD_MOBILE_PAIR_LOGIN_RESUME_V1"   "app/admin/controllers/Login.php|hasFreshIntent"   "app/Http/Middleware/PmdSiteAccessGateMiddleware.php|PMD_MOBILE_PAIR_TRANSPORT_BYPASS_V2"   "app/Http/Controllers/PmdFirstWorkplaceDeviceController.php|PMD_MOBILE_PAIR_FIRST_OWNER_RESUME_V1"   "app/Http/Controllers/PmdMobilePairController.php|Connect this Android device?"   "app/Http/Controllers/PmdMobilePairController.php|pair_request"   "app/Services/PmdMobileSync/PmdMobilePairingService.php|pairExchangeSecret"   "routes/pmd-mobile-sync-v1.php|pair/status"
do
  file="${spec%%|*}"
  needle="${spec#*|}"
  if [[ -f "$ROOT/$file" ]]; then
    if grep -nF "$needle" "$ROOT/$file" | head -3; then
      :
    else
      echo "MISSING_MARKER file=$file marker=$needle"
    fi
  else
    echo "MISSING_FILE $file"
  fi
done

section "RELEVANT GIT STATUS"
"${GIT[@]}" status --short --   app/admin/controllers/Login.php   app/Http/Middleware/PmdSiteAccessGateMiddleware.php   app/Services/PmdSiteAccessWorkspaceGateService.php   app/Http/Controllers/PmdFirstWorkplaceDeviceController.php   app/Http/Controllers/PmdMobilePairController.php   app/Services/PmdMobileSync/PmdMobilePairingService.php   routes/pmd-mobile-sync-v1.php   || true

section "REGISTERED ROUTES"
php artisan route:list 2>/dev/null   | grep -E 'mobile/pair|api/mobile/v1/(pair|bootstrap)'   | head -80   || echo "No matching mobile routes were printed by route:list"

section "TOMO SECURITY + PAIRING DATABASE STATE (READ ONLY)"
PMD_ROOT="$ROOT" PMD_TENANT="$TENANT" php <<'PHP'
<?php
$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
$tenant = getenv('PMD_TENANT') ?: 'tomo';

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

config([
    'database.default' => 'tenant',
    'database.connections.tenant.database' => $tenant,
]);
DB::purge('tenant');
DB::setDefaultConnection('tenant');
DB::reconnect('tenant');

$db = DB::connection('tenant');
$schema = Schema::connection('tenant');

echo "database=".$db->getDatabaseName()."\n";

$tables = [
    'pmd_site_access_devices',
    'pmd_site_access_challenges',
    'pmd_site_access_events',
    'pmd_owner_mfa',
    'pmd_mobile_pair_exchanges',
    'pmd_sync_commands',
    'pmd_sync_events',
    'pmd_sync_aggregate_versions',
    'pmd_mobile_edges',
];
foreach ($tables as $table) {
    echo "table.".$table."=".($schema->hasTable($table) ? 'YES' : 'NO')."\n";
}

if ($schema->hasTable('pmd_site_access_devices')) {
    echo "\n[active_site_hubs]\n";
    $rows = $db->table('pmd_site_access_devices')
        ->where('device_kind', 'site_hub')
        ->whereNull('revoked_at')
        ->orderByDesc('id')
        ->limit(10)
        ->get([
            'id','location_id','device_name','paired_by_staff_id',
            'paired_at','last_seen_at','created_at','updated_at',
        ]);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";

    echo "\n[active_staff_personal_devices]\n";
    $rows = $db->table('pmd_site_access_devices')
        ->where('device_kind', 'staff_personal')
        ->whereNull('revoked_at')
        ->orderByDesc('id')
        ->limit(10)
        ->get([
            'id','location_id','staff_id','device_name',
            'paired_by_staff_id','paired_at','last_seen_at','created_at','updated_at',
        ]);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}

if ($schema->hasTable('pmd_owner_mfa')) {
    echo "\n[owner_mfa]\n";
    $rows = $db->table('pmd_owner_mfa')
        ->orderByDesc('updated_at')
        ->limit(10)
        ->get([
            'id','user_id','staff_id','confirmed_at','disabled_at','updated_at',
        ]);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}

if ($schema->hasTable('pmd_site_access_challenges')) {
    echo "\n[recent_site_access_challenges]\n";
    $rows = $db->table('pmd_site_access_challenges')
        ->orderByDesc('id')
        ->limit(20)
        ->get([
            'id','public_id','location_id','user_id','staff_id','purpose','status',
            'approved_by_device_id','approved_at','used_at','expires_at','created_at','updated_at',
        ]);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}

if ($schema->hasTable('pmd_mobile_pair_exchanges')) {
    echo "\n[recent_mobile_pair_exchanges]\n";
    $rows = $db->table('pmd_mobile_pair_exchanges')
        ->orderByDesc('id')
        ->limit(20)
        ->get([
            'id','public_id','location_id','device_id','user_id','staff_id',
            'expires_at','used_at','created_at','updated_at',
        ]);
    echo json_encode($rows, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}
PHP

section "RECENT PAIRING / SECURITY APPLICATION LOGS"
if [[ -f "$SYSTEM_LOG" ]]; then
  echo "system_log_size=$(du -h "$SYSTEM_LOG" | awk '{print $1}')"
  tail -c 120000000 "$SYSTEM_LOG" 2>/dev/null     | grep -aEi       'PMD.*(pair|mobile|workplace|site.?access|owner|security)|mobile/pair|PmdMobile|Android pairing|pair_request|pairExchange|first Workplace|Authenticator|Restaurant verification'     | tail -400     || echo "No matching records in the last ~120 MB of system.log"
else
  echo "system.log not found: $SYSTEM_LOG"
fi

section "RECENT NGINX REQUESTS FOR TOMO / PAIRING"
FOUND_NGINX=0
for logfile in /var/log/nginx/access.log /var/log/nginx/*access*.log; do
  [[ -f "$logfile" ]] || continue
  FOUND_NGINX=1
  echo "--- $logfile ---"
  tail -n 50000 "$logfile" 2>/dev/null     | grep -aE       '(/admin/mobile/pair|/admin/api/mobile/v1/pair|/admin/siteaccess/hub|/admin/login)'     | grep -aE "($HOST|mobile/pair|siteaccess/hub|admin/login)"     | tail -250     || true
done
[[ "$FOUND_NGINX" -eq 1 ]] || echo "No nginx access log found under /var/log/nginx"

section "RECENT PHP-FPM WARNINGS"
if command -v journalctl >/dev/null 2>&1; then
  journalctl -u php8.3-fpm.service --since "-30 minutes" --no-pager 2>/dev/null     | grep -aEi 'error|warning|fatal|exception|paymydine|pair|mobile'     | tail -200     || echo "No matching php8.3-fpm journal entries"
else
  echo "journalctl unavailable"
fi

section "DIAGNOSTIC COMPLETE"
echo "This script is read-only. It does not modify DB rows, sessions, routes, files, caches, or services."
