#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PMD Z100 V145: explicit-tenant READ-ONLY device and payment readiness audit.
 *
 * Usage: php scripts/pmd-z100-live-readiness-v145.php --tenant-host=tomo.paymydine.com
 *
 * No HTTP calls to providers, no device commands, no data changes, no schema
 * auto-repair. Never print device tokens, credentials, IP addresses, card info,
 * customer/order data, raw platform JSON or provider identifiers.
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "STOP: CLI only.\n");
    exit(2);
}

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$options = getopt('', ['tenant-host:']);
$host = strtolower(trim((string)($options['tenant-host'] ?? '')));
if ($host !== 'tomo.paymydine.com') {
    fwrite(STDERR, "STOP: --tenant-host=tomo.paymydine.com is required; other tenants are not audited.\n");
    exit(2);
}
// Script may be fetched into $HOME; the operator must run it FROM the
// verified PayMyDine application root, never an arbitrary directory.
$root = '/var/www/paymydine';
if (realpath((string)getcwd()) !== realpath($root)) {
    fwrite(STDERR, "STOP: run this audit from /var/www/paymydine.\\n");
    exit(2);
}
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$fail = static function (string $message, int $code): void {
    fwrite(STDERR, 'STOP: '.$message."\n");
    exit($code);
};

try {
    $tenant = DB::connection('mysql')
        ->table('tenants')
        ->whereRaw('LOWER(domain) = ?', [$host])
        ->first();
} catch (\Throwable $error) {
    $fail('Tenant registry lookup failed ('.get_class($error).').', 3);
}
if (!$tenant) $fail('Tomo is not in the trusted tenant registry.', 3);
$dbName = trim((string)($tenant->database ?? ''));
if ($dbName === '' || !preg_match('/^[a-zA-Z0-9_-]+$/D', $dbName)) {
    $fail('Tomo tenant database name invalid.', 3);
}

Config::set('database.connections.tenant.database', $dbName);
Config::set('database.connections.tenant.host',
    $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
Config::set('database.connections.tenant.port',
    $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
Config::set('database.connections.tenant.username',
    $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
Config::set('database.connections.tenant.password',
    $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
DB::purge('tenant');
DB::reconnect('tenant');
DB::setDefaultConnection('tenant');
$app->instance('tenant', $tenant);

try {
    $db = DB::connection('tenant');
    if (strcasecmp((string)$db->getDatabaseName(), $dbName) !== 0) {
        $fail('Refusing mismatched tenant database.', 4);
    }
    // Enforce a read-only DB transaction in addition to exclusively SELECT
    // statements below. No provider sync, mutations or migrations.
    $db->getPdo()->exec('SET TRANSACTION READ ONLY');
    $db->beginTransaction();
    $schema = Schema::connection('tenant');

    $table = static function (string $name) use ($db, $schema): array {
        if (!$schema->hasTable($name)) return [];
        return $db->table($name)->get()->all();
    };
    $exists = static fn (string $name): bool => $schema->hasTable($name);
    $recent = static function ($value): bool {
        if (empty($value)) return false;
        try {
            return \Carbon\Carbon::parse((string)$value)->gte(now()->subSeconds(90));
        } catch (\Throwable $ignored) {
            return false;
        }
    };
    $cut = static fn ($value): string => mb_substr(trim((string)($value ?? '')), 0, 55);

    $trusted = $table('pmd_site_access_devices');
    $activeIds = array_values(array_map(
        static fn ($row): int => (int)($row->id ?? 0),
        array_filter($trusted, static fn ($row): bool =>
            empty($row->revoked_at) && (int)($row->id ?? 0) > 0)
    ));
    $runtime = $exists('pmd_device_runtime') && $activeIds
        ? $db->table('pmd_device_runtime')->whereIn('device_id', $activeIds)
            ->get()->keyBy('device_id')
        : collect();
    // Bounded reads: do NOT load unbounded operational event/command history.
    $commands = $exists('pmd_device_commands') && $activeIds
        ? $db->table('pmd_device_commands')->whereIn('device_id', $activeIds)
            ->orderByDesc('id')->limit(500)->get()
        : collect();
    $logs = $exists('pmd_device_logs') && $activeIds
        ? $db->table('pmd_device_logs')->whereIn('device_id', $activeIds)
            ->orderByDesc('id')->limit(200)->get()
        : collect();
    $terminals = $table('terminal_devices');
    $providerConfigs = $table('terminal_provider_configs');

    $deviceSummary = [];
    foreach ($trusted as $device) {
        if (!empty($device->revoked_at)) continue;
        $kind = strtolower($cut($device->device_kind ?? ''));
        if (!in_array($kind, [
            'staff_personal', 'cashier', 'table_display', 'kiosk',
            'site_hub', 'kds', 'customer_display'
        ], true)) continue;
        $deviceId = (int)($device->id ?? 0);
        $actual = $runtime->get($deviceId);
        $caps = json_decode((string)($device->capabilities ?? '[]'), true);
        if (!is_array($caps)) $caps = [];
        $platform = json_decode((string)($device->platform_info ?? '{}'), true);
        if (!is_array($platform)) $platform = [];
        $latest = $commands
            ->filter(static fn ($row): bool => (int)($row->device_id ?? 0) === $deviceId)
            ->sortByDesc('id')->first();
        $lastLog = $logs
            ->filter(static fn ($row): bool => (int)($row->device_id ?? 0) === $deviceId)
            ->sortByDesc('id')->first();
        $deviceSummary[] = [
            'device_id' => $deviceId,
            'location_id' => (int)($device->location_id ?? 0),
            'kind' => $kind,
            'paired_capability_device_platform_v1' => in_array('device_platform_v1', $caps, true),
            'trusted_activity_recent_90s' => $recent($device->last_seen_at ?? null),
            // Trusted activity can be mobile sync and DOES NOT prove the
            // Device Control heartbeat/command loop is healthy.
            'device_platform_heartbeat_recent_90s' => $recent($actual->last_seen_at ?? null),
            'platform_heartbeat_at' => $cut($actual->last_seen_at ?? ''),
            'app_version_from_platform_heartbeat' => $cut($actual->app_version ?? ''),
            'platform_mode' => $cut($actual->device_mode ?? ''),
            'reported_screen_state' => $cut($actual->screen_state ?? ''),
            'reported_brightness' => isset($actual->brightness)
                ? (int)$actual->brightness : null,
            'assigned_table_id' => $kind === 'table_display'
                ? (int)($platform['table_id'] ?? 0) : null,
            'linked_terminal_device_id' => $kind === 'table_display'
                ? (int)($platform['payment_terminal_device_id'] ?? 0) : null,
            'latest_command' => $latest ? [
                'action' => $cut($latest->command ?? ''),
                'status' => $cut($latest->status ?? ''),
                'requested_at' => $cut($latest->requested_at ?? ''),
                'delivered_at' => $cut($latest->delivered_at ?? ''),
                'acknowledged_at' => $cut($latest->acknowledged_at ?? ''),
                'completed_at' => $cut($latest->completed_at ?? ''),
                'expires_at' => $cut($latest->expires_at ?? ''),
            ] : null,
            'last_platform_log_event' => $cut($lastLog->event ?? ''),
            'last_platform_log_at' => $cut($lastLog->occurred_at ?? ''),
        ];
    }

    $terminalSummary = [];
    foreach ($terminals as $terminal) {
        $code = strtolower($cut($terminal->provider_code ?? ''));
        $readerId = trim((string)($terminal->reader_id ?? ''));
        $status = strtolower($cut($terminal->terminal_status ?? ''));
        $pairing = strtolower($cut($terminal->pairing_state ?? ''));
        $isSim = str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-');
        $terminalSummary[] = [
            'terminal_device_id' => (int)($terminal->terminal_device_id ?? 0),
            'location_id' => isset($terminal->location_id) ? (int)$terminal->location_id : null,
            'provider' => $code,
            'environment' => $cut($terminal->environment ?? ''),
            'configured_active' => (int)($terminal->is_active ?? 0) === 1,
            'reader_identifier_present' => $readerId !== '',
            'simulator' => $isSim,
            'status' => $status,
            'pairing' => $pairing,
            'preliminary_physical_reader_ready' => (
                (int)($terminal->is_active ?? 0) === 1
                && $readerId !== ''
                && !$isSim
                && in_array($status, ['online', 'ready', 'connected'], true)
                && !in_array($pairing, ['unpaired', 'needs_attention'], true)
                && in_array($code, ['sumup', 'worldline', 'square', 'vr_payment'], true)
            ),
        ];
    }

    $providerSummary = [];
    foreach ($providerConfigs as $config) {
        $providerSummary[] = [
            'provider' => $cut($config->provider_code ?? ''),
            'environment' => $cut($config->environment ?? ''),
            'connection_status' => $cut($config->connection_status ?? ''),
            // Do not read/print credential JSON, tokens or merchant IDs.
        ];
    }

    $payments = [];
    if ($exists('payment_methods')) {
        $fields = $schema->getColumnListing('payment_methods');
        if (in_array('code', $fields, true) && in_array('status', $fields, true)) {
            foreach ($db->table('payment_methods')->get(['code', 'status']) as $row) {
                $payments[] = [
                    'method' => $cut($row->code ?? ''),
                    'active' => (int)($row->status ?? 0) === 1,
                ];
            }
        }
    }

    $missing = array_values(array_filter([
        'pmd_site_access_devices', 'pmd_device_runtime',
        'pmd_device_commands', 'terminal_devices', 'terminal_provider_configs'
    ], static fn (string $name) => !$exists($name)));
    $report = [
        'tenant' => $host,
        'database_verified' => true,
        'mode' => 'READ_ONLY_TRANSACTION',
        'missing_tables' => $missing,
        'devices' => $deviceSummary,
        'physical_terminals' => $terminalSummary,
        'provider_connections_metadata_only' => $providerSummary,
        'enabled_guest_payment_methods' => $payments,
        'interpretation' => [
            'trusted_recent_is_not_device_command_heartbeat' => true,
            'configured_provider_is_not_a_physical_reader' => true,
            'preliminary_reader_ready_requires_market_authorization_and_cloud_checkout' => true,
            'local_pos_bridge_currently_exposes_cash_only' => true,
            'z100_internal_nfc_acquirer_not_implemented' => true,
        ],
    ];
    $db->rollBack();
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
        | JSON_INVALID_UTF8_SUBSTITUTE)."\n";
    echo "READ_ONLY_TOMO_AUDIT=PASS\n";
} catch (\Throwable $error) {
    if (isset($db) && $db->transactionLevel() > 0) {
        try { $db->rollBack(); } catch (\Throwable $ignored) {}
    }
    $fail('Read-only Tomo audit failed ('.get_class($error).'). No mutations attempted.', 7);
}
