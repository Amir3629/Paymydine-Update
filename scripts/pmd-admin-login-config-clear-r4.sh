#!/usr/bin/env bash
set -u

ROOT="${PMD_ROOT:-$(pwd)}"
cd "$ROOT" || exit 1

if [ ! -f artisan ] || [ ! -f .env ]; then
  echo "ERROR: PayMyDine repository or .env not found at: $ROOT"
  exit 1
fi

echo "=== PMD Admin login recovery R4 ==="
echo "Reason: PayMyDine tenant middleware still uses env() at request runtime."
echo "A Laravel config cache can therefore null the tenant DB host fallback."
echo

echo "Current .env metadata:"
stat -c 'owner=%U group=%G mode=%a file=%n' .env 2>/dev/null || true

echo
echo "Clearing Laravel config cache (DO NOT config:cache on this runtime)..."
php artisan config:clear

echo "Clearing compiled views..."
php artisan view:clear >/dev/null 2>&1 || true

echo
echo "Checking uncached database configuration without printing credentials..."
php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$main = config("database.connections.mysql.host");
$tenant = config("database.connections.tenant.host");
echo "mysql_host_configured=".(is_string($main) && trim($main)!=="" ? "yes" : "no").PHP_EOL;
echo "tenant_host_configured=".(is_string($tenant) && trim($tenant)!=="" ? "yes" : "no").PHP_EOL;
echo "config_cached=".(app()->configurationIsCached() ? "yes" : "no").PHP_EOL;
' 2>&1

echo
echo "ADMIN_LOGIN_RECOVERY_R4=COMPLETE"
echo "Hard-refresh /admin/login now."
echo "Do not run php artisan config:cache on the current PayMyDine multi-tenant runtime."
