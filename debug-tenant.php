#!/usr/bin/env php
<?php
/**
 * Tenant Detection Debug Script
 * Run: php debug-tenant.php
 */

echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║         TENANT DETECTION DEBUG SCRIPT                       ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

// 1. Database Connection Test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "1. DATABASE CONNECTION TEST\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Connection: mysql\n";
echo "Host:       " . Config::get('database.connections.mysql.host') . "\n";
echo "Port:       " . Config::get('database.connections.mysql.port') . "\n";
echo "Database:   " . Config::get('database.connections.mysql.database') . "\n";
echo "Username:   " . Config::get('database.connections.mysql.username') . "\n";
echo "Prefix:     " . Config::get('database.connections.mysql.prefix') . "\n";

try {
    DB::connection('mysql')->getPdo();
    echo "Status:     ✅ CONNECTED\n";
} catch (Exception $e) {
    echo "Status:     ❌ FAILED\n";
    echo "Error:      " . $e->getMessage() . "\n";
    exit(1);
}

// 2. Check if tenants table exists
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "2. TENANTS TABLE CHECK\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $count = DB::connection('mysql')->table('tenants')->count();
    echo "Table:      ti_tenants (with auto prefix)\n";
    echo "Status:     ✅ EXISTS\n";
    echo "Tenants:    $count records found\n";
} catch (Exception $e) {
    echo "Status:     ❌ ERROR\n";
    echo "Error:      " . $e->getMessage() . "\n";
    echo "Hint:       Make sure the table 'ti_tenants' exists in your database\n";
    exit(1);
}

// 3. List all tenants
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "3. ALL TENANTS IN DATABASE\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$tenants = DB::connection('mysql')->table('tenants')->get(['id', 'name', 'domain', 'database', 'status']);
$maxDomainLen = max(array_map(fn($t) => strlen($t->domain), $tenants->toArray()));

echo sprintf("%-4s | %-30s | %-12s | %-8s\n", "ID", "DOMAIN", "DATABASE", "STATUS");
echo str_repeat("─", 60) . "\n";

foreach ($tenants as $t) {
    $statusIcon = $t->status === 'active' ? '✅' : '❌';
    echo sprintf("%-4s | %-30s | %-12s | %s %s\n", 
        $t->id, 
        $t->domain, 
        $t->database, 
        $statusIcon,
        strtoupper($t->status)
    );
}

// 4. Test specific hosts
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "4. TENANT LOOKUP TEST\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$testHosts = [
    'localhost',
    'localhost:8000',
    '127.0.0.1',
    '127.0.0.1:8000',
];

foreach ($testHosts as $host) {
    echo "\nSearching for domain: '$host'\n";
    
    $tenant = DB::connection('mysql')->table('tenants')
        ->where('domain', $host)
        ->first();
    
    if ($tenant) {
        echo "  Result: ✅ FOUND\n";
        echo "  Name:   {$tenant->name}\n";
        echo "  DB:     {$tenant->database}\n";
        echo "  Status: {$tenant->status}\n";
    } else {
        echo "  Result: ❌ NOT FOUND\n";
    }
}

// 5. Middleware Check
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "5. MIDDLEWARE CONFIGURATION\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$kernel = app(Illuminate\Contracts\Http\Kernel::class);
$reflection = new ReflectionClass($kernel);

try {
    $prop = $reflection->getProperty('middlewareGroups');
    $prop->setAccessible(true);
    $middlewareGroups = $prop->getValue($kernel);
    
    echo "Web Middleware Group:\n";
    foreach ($middlewareGroups['web'] ?? [] as $middleware) {
        $isTenant = str_contains($middleware, 'Tenant');
        $icon = $isTenant ? '🔑' : '  ';
        echo "  $icon $middleware\n";
    }
} catch (Exception $e) {
    echo "Could not read middleware groups\n";
}

// 6. Environment Check
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "6. ENVIRONMENT CONFIGURATION\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "APP_ENV:    " . env('APP_ENV') . "\n";
echo "APP_DEBUG:  " . (env('APP_DEBUG') ? 'true' : 'false') . "\n";
echo "APP_URL:    " . env('APP_URL') . "\n";

// 7. Recommendations
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "7. RECOMMENDATIONS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$hasLocalhost8000 = DB::connection('mysql')
    ->table('tenants')
    ->where('domain', 'localhost:8000')
    ->where('status', 'active')
    ->exists();

if ($hasLocalhost8000) {
    echo "✅ You have 'localhost:8000' configured as an active tenant\n";
    echo "✅ You can access the app at: http://localhost:8000\n";
} else {
    echo "⚠️  No active tenant found for 'localhost:8000'\n";
    echo "💡 Run this SQL to add it:\n\n";
    echo "    UPDATE ti_tenants SET domain = 'localhost:8000', status = 'active' \n";
    echo "    WHERE id = (SELECT id FROM (SELECT MIN(id) as id FROM ti_tenants) as t);\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "DEBUG COMPLETE\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

echo "💡 Next Steps:\n";
echo "   1. Make sure you're accessing: http://localhost:8000\n";
echo "   2. Check that only ONE 'php artisan serve' is running\n";
echo "   3. Visit http://localhost:8000/debug-host for live request info\n";
echo "   4. Check storage/logs/system.log for error details\n\n";

