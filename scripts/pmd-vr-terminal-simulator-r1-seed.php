#!/usr/bin/env php
<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', ['tenant:', 'remove', 'help']);
if (isset($options['help'])) {
    echo "Usage:\n";
    echo "  php scripts/pmd-vr-terminal-simulator-r1-seed.php --tenant=tomo\n";
    echo "  php scripts/pmd-vr-terminal-simulator-r1-seed.php --tenant=tomo --remove\n";
    exit(0);
}

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Admin\Classes\VRPaymentGatewayService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));
if ($tenantDomain === '') {
    fwrite(STDERR, "--tenant is required.\n");
    exit(3);
}
if (!str_contains($tenantDomain, '.')) $tenantDomain .= '.paymydine.com';

$tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$tenantDomain])->first();
if (!$tenant) {
    fwrite(STDERR, "Tenant not found: {$tenantDomain}\n");
    exit(4);
}
$tenantDb = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
if ($tenantDb === '') {
    fwrite(STDERR, "Tenant database is missing for {$tenantDomain}\n");
    exit(5);
}

Config::set('database.connections.mysql.database', $tenantDb);
DB::purge('mysql');
DB::reconnect('mysql');

if (!Schema::hasTable('terminal_devices')) {
    fwrite(STDERR, "terminal_devices table is missing in {$tenantDb}\n");
    exit(6);
}

$service = app(VRPaymentGatewayService::class);
$config = $service->getConfig();
if (strtolower(trim((string)($config['mode'] ?? 'test'))) !== 'test') {
    fwrite(STDERR, "Refusing to seed PMD VR Simulator because VR Payment is not in TEST mode.\n");
    exit(7);
}

$prefix = 'PMD-VR-SIM-';

if (isset($options['remove'])) {
    $deleted = DB::table('terminal_devices')
        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
        ->where('reader_id', 'like', $prefix.'%')
        ->delete();
    echo "Removed {$deleted} PMD VR simulator terminal row(s) from {$tenantDomain}.\n";
    exit(0);
}

$columns = Schema::getColumnListing('terminal_devices');
$scenarios = [
    'APPROVE' => ['label' => 'PMD VR Simulator - Approve', 'scenario' => 'approve'],
    'DECLINE' => ['label' => 'PMD VR Simulator - Decline', 'scenario' => 'decline'],
    'CANCEL' => ['label' => 'PMD VR Simulator - Cancel', 'scenario' => 'cancel'],
    'TIMEOUT' => ['label' => 'PMD VR Simulator - Timeout', 'scenario' => 'timeout'],
    'DELAYED' => ['label' => 'PMD VR Simulator - Delayed Success', 'scenario' => 'delayed_success'],
];

foreach ($scenarios as $suffix => $row) {
    $readerId = $prefix.$suffix;
    $payload = [
        'provider_code' => 'vr_payment',
        'environment' => 'test',
        'location_id' => null,
        'affiliate_key' => null,
        'reader_id' => $readerId,
        'reader_label' => $row['label'],
        'pairing_state' => 'paired',
        'terminal_status' => 'online',
        'metadata' => json_encode([
            'pmd_vr_simulator' => true,
            'scenario' => $row['scenario'],
            'provider_network_call' => false,
            'seed_version' => 'R1_20260905',
        ], JSON_UNESCAPED_SLASHES),
        'is_active' => 1,
        'provider_terminal_id' => null,
        'serial_number' => null,
        'updated_at' => now(),
    ];
    $payload = array_intersect_key($payload, array_flip($columns));

    $existing = DB::table('terminal_devices')
        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
        ->where('reader_id', $readerId)
        ->first();

    if ($existing) {
        DB::table('terminal_devices')
            ->where('terminal_device_id', (int)$existing->terminal_device_id)
            ->update($payload);
    } else {
        if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
        DB::table('terminal_devices')->insert($payload);
    }
}

$probe = $service->probeConnectivity();

echo "\nPMD VR simulator seed complete.\n";
echo "Tenant: {$tenantDomain}\n";
echo "Tenant DB: {$tenantDb}\n";
echo "VR Space: ".($probe['space_id'] ?? 'unknown')."\n";
echo "VR API terminal records: ".(int)($probe['api_terminal_count'] ?? 0)."\n";
echo "Usable real VR terminals: ".(int)($probe['terminal_count'] ?? 0)."\n";
echo "PMD VR simulators: ".(int)($probe['pmd_simulator_count'] ?? 0)."\n";
echo "Available online methods: ".implode(', ', (array)($probe['available_method_codes'] ?? []))."\n";
echo "\nVR terminal rows:\n";

$rows = DB::table('terminal_devices')
    ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
    ->orderBy('terminal_device_id')
    ->get();

foreach ($rows as $terminal) {
    echo sprintf(
        "  #%s | active=%s | %s | reader=%s | status=%s | pairing=%s\n",
        (string)($terminal->terminal_device_id ?? ''),
        !empty($terminal->is_active) ? 'yes' : 'no',
        (string)($terminal->reader_label ?? ''),
        (string)($terminal->reader_id ?? ''),
        (string)($terminal->terminal_status ?? ''),
        (string)($terminal->pairing_state ?? '')
    );
}

echo "\nIMPORTANT: PMD VR Simulator is internal TEST-only simulation. It never calls VR Payment.\n";
echo "Real VR certification still requires a provider-linked VR terminal/simulator.\n";
