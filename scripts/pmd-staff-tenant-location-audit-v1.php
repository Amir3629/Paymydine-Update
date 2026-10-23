<?php
/**
 * PMD_STAFF_TENANT_LOCATION_AUDIT_V1_20261023
 *
 * READ ONLY. Resolve exact active tenant with the same registry mapping as
 * TenantDatabaseMiddleware. No location, identity or attendance writes.
 * Never print tenant DB credentials or employee identifiers.
 *
 * Usage:
 * php scripts/pmd-staff-tenant-location-audit-v1.php --tenant=tomo.paymydine.com
 */
declare(strict_types=1);
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function pmdAuditLine(string $label, string $value): void
{
    echo $label.': '.$value.PHP_EOL;
}
function pmdAuditAddress(?object $loc): string
{
    if (!$loc) return '(location missing)';
    $parts = [
        trim((string)($loc->location_address_1 ?? '')),
        trim((string)($loc->location_address_2 ?? '')),
        trim((string)($loc->location_postcode ?? '')).' '.trim((string)($loc->location_city ?? '')),
        trim((string)($loc->location_state ?? '')),
    ];
    return implode(', ', array_filter(array_map('trim', $parts), static fn ($p) => $p !== ''));
}
function pmdAuditPrintLocation(string $name, ?object $loc): void
{
    echo PHP_EOL.'=== '.$name.' ==='.PHP_EOL;
    if (!$loc) {
        echo "No location #1 found in this database".PHP_EOL;
        return;
    }
    pmdAuditLine('Location ID', (string)$loc->location_id);
    pmdAuditLine('Location name', (string)($loc->location_name ?? ''));
    pmdAuditLine('Street address stored in DB', pmdAuditAddress($loc));
    $lat = $loc->location_lat ?? null;
    $lng = $loc->location_lng ?? null;
    pmdAuditLine('Staff GPS latitude', $lat === null ? 'NULL' : (string)$lat);
    pmdAuditLine('Staff GPS longitude', $lng === null ? 'NULL' : (string)$lng);
    if (is_numeric($lat) && is_numeric($lng)) {
        pmdAuditLine('GPS map', 'https://www.google.com/maps/search/?api=1&query='.rawurlencode((string)$lat.','.(string)$lng));
    }
    pmdAuditLine('Street address vs GPS', 'These are INDEPENDENT fields. Saving the street does NOT move the GPS pin.');
}

try {
    $options = getopt('', ['tenant:']);
    $domain = strtolower(trim((string)($options['tenant'] ?? '')));
    if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/D', $domain)) {
        fwrite(STDERR, 'Pass --tenant=tomo.paymydine.com (exact tenant hostname)'.PHP_EOL);
        exit(2);
    }

    $root = dirname(__DIR__);
    require $root.'/bootstrap/autoload.php';
    $app = require $root.'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();

    echo "PMD_STAFF_TENANT_LOCATION_AUDIT_V1_20261023 / READ ONLY".PHP_EOL;
    pmdAuditLine('Requested tenant domain', $domain);
    pmdAuditLine('Initial CLI default connection', (string)DB::getDefaultConnection());
    pmdAuditLine('Central registry database', (string)DB::connection('mysql')->getDatabaseName());

    // Never use a best-effort "fallback database" if tenant resolution fails.
    $tenant = DB::connection('mysql')->table('tenants')
        ->where('domain', $domain)->where('status', 'active')->first();
    if (!$tenant || empty($tenant->database)) {
        fwrite(STDERR, 'ERROR: Exact active tenant not found. NO alternate database used.'.PHP_EOL);
        exit(3);
    }

    // Replicate only the connection mapping from the canonical middleware.
    Config::set('database.connections.tenant.database', $tenant->database);
    Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
    Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
    Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
    Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
    DB::purge('tenant');
    DB::reconnect('tenant');
    DB::setDefaultConnection('tenant');
    app()->instance('tenant', $tenant);

    if (!Schema::connection('tenant')->hasTable('locations')) {
        throw new RuntimeException('The target tenant has no locations table; aborting');
    }
    pmdAuditLine('Confirmed HTTP tenant database', (string)DB::connection('tenant')->getDatabaseName());
    $location = DB::connection('tenant')->table('locations')->where('location_id', 1)->first();
    pmdAuditPrintLocation('TOMO TENANT DATABASE / LOCATION 1', $location);

    if (Schema::connection('mysql')->hasTable('locations')) {
        $central = DB::connection('mysql')->table('locations')->where('location_id', 1)->first();
        pmdAuditPrintLocation('CENTRAL DEFAULT DATABASE / LOCATION 1 (NOT TOMO)', $central);
    } else {
        echo PHP_EOL."Central database has no locations table.".PHP_EOL;
    }

    if (Schema::connection('tenant')->hasTable('pmd_operational_people')) {
        $staffLocations = DB::connection('tenant')->table('pmd_operational_people')
            ->where('is_active', 1)
            ->selectRaw('location_id, COUNT(*) AS total')
            ->groupBy('location_id')->orderBy('location_id')->get();
        echo PHP_EOL."=== ACTIVE STAFF LOCATION COUNTS (NO PERSONAL DATA) ===".PHP_EOL;
        foreach ($staffLocations as $link) {
            pmdAuditLine('location '.$link->location_id, (string)$link->total);
        }
        $multi = DB::connection('tenant')->table('pmd_operational_people')
            ->where('is_active', 1)->select('staff_id')
            ->groupBy('staff_id')->havingRaw('COUNT(DISTINCT location_id) > 1')->get()->count();
        pmdAuditLine('Staff with multiple active locations', (string)$multi);
    }
    echo PHP_EOL."READ ONLY: no database edits, no attendance writes, no employee GPS printed.".PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, 'AUDIT FAILED: '.get_class($e).' (inspect server connection/settings; no edits made)'.PHP_EOL);
    exit(1);
}
