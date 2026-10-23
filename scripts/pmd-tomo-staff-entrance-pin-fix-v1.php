#!/usr/bin/env php
<?php
/**
 * PMD_TOMO_ENTRANCE_PIN_REPAIR_V1_20261023
 *
 * Targeted tenant-only repair. Never copies the public booking text address
 * into attendance. Require independently verified on-site entrance coordinates.
 * The tool is dry run unless --apply and --confirm=VERIFIED-TOMO-ENTRANCE.
 *
 * Examples:
 * php script.php --lat=50.108430 --lng=8.654540
 * php script.php --lat=ACTUAL --lng=ACTUAL --apply --confirm=VERIFIED-TOMO-ENTRANCE
 */
declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

function reject(string $message, int $code = 2): void {
    fwrite(STDERR, "ABORT: ".$message.PHP_EOL);
    exit($code);
}
function meters(float $a, float $b, float $c, float $d): float {
    $r = M_PI / 180;
    $x = sin(($c - $a) * $r / 2.0) ** 2 +
        cos($a * $r) * cos($c * $r) * (sin(($d - $b) * $r / 2.0) ** 2);
    return 12742000.0 * asin(min(1.0, sqrt(max(0.0, $x))));
}
function mapUrl(float $lat, float $lng): string {
    return 'https://www.google.com/maps/search/?api=1&query='.
        rawurlencode(sprintf('%.6f,%.6f', $lat, $lng));
}
function validateCurrent(object $location, string $tenantDatabase): void {
    if ($tenantDatabase !== 'tomo') {
        throw new RuntimeException('Expected exactly the Tomo tenant database. No changes made.');
    }
    $address = strtolower(trim((string)($location->location_address_1 ?? '')));
    $city = strtolower(trim((string)($location->location_city ?? '')));
    $post = trim((string)($location->location_postcode ?? ''));
    if (!str_contains($address, 'europa') || !preg_match('/\b2\b/', $address)
        || !str_contains($city, 'frankfurt') || $post !== '60327') {
        throw new RuntimeException('The Tomo location address is not Europa-Allee 2, 60327 Frankfurt. No changes made.');
    }
    $oldLat = $location->location_lat ?? null;
    $oldLng = $location->location_lng ?? null;
    if (!is_numeric($oldLat) || !is_numeric($oldLng)) {
        throw new RuntimeException('The current Staff pin is unset or not numeric; use Restaurant Settings instead.');
    }
    if (abs((float)$oldLat - 52.415884) > 0.00005 ||
        abs((float)$oldLng - (-1.603648)) > 0.00005) {
        throw new RuntimeException('The old Coventry sample pin has already changed. Refusing to overwrite it.');
    }
}

$opts = getopt('', ['lat:', 'lng:', 'apply', 'confirm:']);
if (!isset($opts['lat'], $opts['lng']) ||
    !is_numeric($opts['lat']) || !is_numeric($opts['lng'])) {
    reject('Supply verified entrance coordinates: --lat=50.xxxxxx --lng=8.xxxxxx');
}
$lat = round((float)$opts['lat'], 6);
$lng = round((float)$opts['lng'], 6);
if (!is_finite($lat) || !is_finite($lng) || $lat < -90 || $lat > 90 ||
    $lng < -180 || $lng > 180 || ($lat === 0.0 && $lng === 0.0)) {
    reject('Invalid GPS pair');
}
$approxBuildingLat = 50.10843;
$approxBuildingLng = 8.65454;
$fromBuilding = meters($lat, $lng, $approxBuildingLat, $approxBuildingLng);
if ($fromBuilding > 500.0) {
    reject('Proposed entrance is over 500m from Europa-Allee 2 landmark. Check the map first.');
}
if (isset($opts['apply']) &&
    (string)($opts['confirm'] ?? '') !== 'VERIFIED-TOMO-ENTRANCE') {
    reject('Writes require --confirm=VERIFIED-TOMO-ENTRANCE after visual map verification.');
}

require dirname(__DIR__).'/bootstrap/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$tenant = DB::connection('mysql')->table('tenants')
    ->where('domain', 'tomo.paymydine.com')
    ->where('status', 'active')->first();
if (!$tenant || empty($tenant->database)) reject('Exact active Tomo tenant not found');
Config::set('database.connections.tenant.database', $tenant->database);
Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
DB::purge('tenant');
DB::reconnect('tenant');
DB::setDefaultConnection('tenant');
$tenantConnection = DB::connection('tenant');
$database = (string)$tenantConnection->getDatabaseName();
if ($database !== 'tomo' || (string)$tenant->domain !== 'tomo.paymydine.com') {
    reject('Unexpected tenant mapping: this utility is only for the confirmed Tomo database.');
}

echo "PMD_TOMO_ENTRANCE_PIN_REPAIR_V1_20261023".PHP_EOL;
echo "Selected tenant: tomo.paymydine.com / database tomo / location #1".PHP_EOL;
echo "Proposed entrance GPS: ".sprintf('%.6f, %.6f', $lat, $lng).PHP_EOL;
echo "Verify location visually: ".mapUrl($lat, $lng).PHP_EOL;
echo "Approx. distance to mapped building center: ".round($fromBuilding)."m".PHP_EOL;
echo "NOTICE: Building center is not necessarily the restaurant entrance.".PHP_EOL;

if (!isset($opts['apply'])) {
    $current = $tenantConnection->table('locations')
        ->where('location_id', 1)->first();
    if (!$current) reject('Location #1 does not exist for Tomo');
    validateCurrent($current, $database);
    echo "Existing pin: ".$current->location_lat.", ".$current->location_lng." (Coventry example)".PHP_EOL;
    echo "DRY RUN ONLY: no database changes.".PHP_EOL;
    echo "Apply only after comparing the map with the real restaurant entrance.".PHP_EOL;
    exit(0);
}

$home = (string)(getenv('HOME') ?: '');
if ($home === '' || !is_dir($home)) reject('Unable to locate home folder for mandatory pin backup');
$backupDir = $home.'/pmd-backups';
if (!is_dir($backupDir) && !@mkdir($backupDir, 0700, true)) reject('Cannot create mandatory backup folder');
$backupFile = $backupDir.'/tomo-staff-pin-'.gmdate('Ymd-His').'-'.getmypid().'.json';

$tenantConnection->transaction(function () use ($tenantConnection, $database, $lat, $lng, $backupFile): void {
    $location = $tenantConnection->table('locations')
        ->where('location_id', 1)->lockForUpdate()->first();
    if (!$location) throw new RuntimeException('Location #1 disappeared');
    validateCurrent($location, $database);
    $backup = [
        'domain' => 'tomo.paymydine.com',
        'database' => $database,
        'location_id' => 1,
        'old_lat' => (float)$location->location_lat,
        'old_lng' => (float)$location->location_lng,
        'new_lat' => $lat,
        'new_lng' => $lng,
        'time_utc' => gmdate('c'),
    ];
    $bytes = @file_put_contents($backupFile, json_encode($backup, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), LOCK_EX);
    if ($bytes === false || !@chmod($backupFile, 0600)) {
        throw new RuntimeException('Could not safely write mandatory backup. No database update.');
    }
    $affected = $tenantConnection->table('locations')->where('location_id', 1)
        ->update(['location_lat' => $lat, 'location_lng' => $lng]);
    if ($affected !== 1) throw new RuntimeException('Expected exactly one Tomo location to be updated.');
    $saved = $tenantConnection->table('locations')
        ->where('location_id', 1)->first(['location_lat', 'location_lng']);
    if (!$saved || abs((float)$saved->location_lat - $lat) > 0.000002 ||
        abs((float)$saved->location_lng - $lng) > 0.000002) {
        throw new RuntimeException('Read-back verification failed: rolling back transaction.');
    }
});
echo "SUCCESS: ONLY tomo.locations #1 Staff attendance GPS has been updated.".PHP_EOL;
echo "Verified new GPS: ".sprintf('%.6f, %.6f', $lat, $lng).PHP_EOL;
echo "Backup: ".$backupFile.PHP_EOL;
echo "Address, staff records and booking fields were NOT changed.".PHP_EOL;
echo "Retest Staff app 0.2.4 on the actual on-site phone.".PHP_EOL;
