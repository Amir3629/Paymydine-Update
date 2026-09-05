#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PayMyDine / VR Payment deep probe.
 *
 * Default run is read-only and uses the VR Payment credentials already saved in PMD.
 * It never prints the authentication key.
 *
 * Read-only audit:
 *   php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com
 *
 * Provider capability probe (creates small pending VR test transactions, but does
 * not send anything to a terminal):
 *   php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com --transaction-probe
 *
 * Terminal perform probe (TEST mode only, provider object ID, max EUR 1.00):
 *   php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com --perform-terminal=371726 --amount=0.10
 *
 * If this file is outside the PMD root:
 *   php pmd_vr_deep_probe.php --root=/path/to/paymydine
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', [
    'root::',
    'tenant:',
    'transaction-probe',
    'perform-terminal:',
    'amount::',
    'json',
    'help',
]);

if (isset($options['help'])) {
    echo "Usage:\n";
    echo "  php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com\n";
    echo "  php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com --transaction-probe\n";
    echo "  php pmd_vr_deep_probe.php --tenant=restaurant.paymydine.com --perform-terminal=PROVIDER_OBJECT_ID --amount=0.10\n";
    echo "  php pmd_vr_deep_probe.php --root=/path/to/paymydine\n";
    exit(0);
}

$root = rtrim(trim((string)($options['root'] ?? getcwd())), '/');
if (!is_file($root.'/bootstrap/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    foreach ([rtrim(__DIR__, '/'), rtrim(dirname(__DIR__), '/')] as $candidate) {
        if (is_file($candidate.'/bootstrap/autoload.php') && is_file($candidate.'/bootstrap/app.php')) {
            $root = $candidate;
            break;
        }
    }
}
if (!is_file($root.'/bootstrap/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "Could not find PMD bootstrap files. Run from the PMD root or pass --root=/path/to/paymydine\n");
    exit(2);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Admin\Classes\VRPaymentGatewayService;
use App\Services\Payments\VrPaymentApiClient;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$jsonOnly = isset($options['json']);
$report = [
    'generated_at' => date(DATE_ATOM),
    'project_root' => $root,
];

$centralDatabase = (string)Config::get('database.connections.mysql.database');
$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));
$tenantInfo = null;
if ($tenantDomain !== '') {
    if (!str_contains($tenantDomain, '.')) $tenantDomain .= '.paymydine.com';
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$tenantDomain])->first();
    if (!$tenant) {
        fwrite(STDERR, "Tenant not found in central registry: {$tenantDomain}\n");
        exit(3);
    }
    $tenantDatabase = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
    if ($tenantDatabase === '') {
        fwrite(STDERR, "Tenant database is empty for {$tenantDomain}\n");
        exit(4);
    }
    Config::set('database.connections.mysql.database', $tenantDatabase);
    DB::purge('mysql');
    DB::reconnect('mysql');
    $tenantInfo = [
        'domain' => (string)($tenant->domain ?? $tenantDomain),
        'database' => $tenantDatabase,
        'central_database' => $centralDatabase,
    ];
} else {
    $tenantInfo = [
        'domain' => null,
        'database' => (string)Config::get('database.connections.mysql.database'),
        'central_database' => $centralDatabase,
        'warning' => 'No --tenant was supplied. In a multi-tenant PMD install this may inspect the central DB instead of the restaurant DB.',
    ];
}
$report['tenant'] = $tenantInfo;

function heading(string $title): void {
    global $jsonOnly;
    if (!$jsonOnly) echo "\n==== {$title} ====\n";
}

function lineOut(string $label, $value): void {
    global $jsonOnly;
    if ($jsonOnly) return;
    if (is_bool($value)) $value = $value ? 'true' : 'false';
    elseif ($value === null) $value = 'null';
    elseif (is_array($value) || is_object($value)) $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    echo str_pad($label, 32).": ".$value."\n";
}

function rowsFromPayload($payload): array {
    if (!is_array($payload)) return [];
    foreach (['data', 'items', 'results', 'entities'] as $key) {
        if (isset($payload[$key]) && is_array($payload[$key])) return array_values($payload[$key]);
    }
    if (function_exists('array_is_list') && array_is_list($payload)) return $payload;
    $keys = array_keys($payload);
    return $keys === range(0, count($payload) - 1) ? $payload : [];
}

function firstValue(array $row, array $keys, $default = null) {
    foreach ($keys as $key) if (array_key_exists($key, $row)) return $row[$key];
    return $default;
}

function localizedName($value): string {
    if (is_string($value)) return trim($value);
    if (!is_array($value)) return '';
    foreach (['en-US', 'en-GB', 'de-DE', 'name', 'title'] as $key) {
        if (isset($value[$key]) && is_scalar($value[$key]) && trim((string)$value[$key]) !== '') return trim((string)$value[$key]);
    }
    foreach ($value as $item) if (is_scalar($item) && trim((string)$item) !== '') return trim((string)$item);
    return '';
}

function terminalSnapshot(array $row): array {
    $device = is_array($row['device'] ?? null) ? $row['device'] : [];
    $state = strtolower(trim((string)firstValue($row, ['state', 'status'], 'unknown')));
    $plannedPurge = firstValue($row, ['plannedPurgeDate', 'planned_purge_date']);
    $deviceName = trim((string)firstValue($row, ['deviceName', 'devicename'], $device['name'] ?? ''));
    $serial = trim((string)firstValue($row, ['deviceSerialNumber', 'deviceserialnumber', 'serialNumber'], $device['serialNumber'] ?? ''));
    $deviceState = strtolower(trim((string)firstValue($row, ['deviceState', 'device_state'], $device['state'] ?? '')));
    $environment = strtoupper(trim((string)firstValue($row, ['environment', 'paymentTerminalEnvironment', 'terminalEnvironment'], '')));
    $typeRaw = firstValue($row, ['type', 'terminalType', 'paymentTerminalType']);
    $badStates = ['inactive','deleted','deleting','obsolete','failed','disabled','purged','unavailable'];

    return [
        'id' => (int)($row['id'] ?? 0),
        'identifier' => trim((string)firstValue($row, ['identifier', 'terminalIdentifier'], '')) ?: null,
        'name' => trim((string)firstValue($row, ['name', 'label'], '')) ?: null,
        'state' => $state ?: 'unknown',
        'type' => localizedName($typeRaw) ?: (is_scalar($typeRaw) ? (string)$typeRaw : null),
        'environment' => $environment ?: null,
        'planned_purge_date' => $plannedPurge ?: null,
        'device_name' => $deviceName ?: null,
        'device_serial_number' => $serial ?: null,
        'device_state' => $deviceState ?: null,
        'api_state_usable_guess' => !in_array($state, $badStates, true) && empty($plannedPurge),
        'device_linked_hint' => $deviceName !== '' || $serial !== '' || in_array($deviceState, ['linked','ready','active','online'], true),
        'configuration' => is_array($row['configuration'] ?? null) ? ($row['configuration']['id'] ?? null) : ($row['configuration'] ?? $row['configurationId'] ?? null),
        'location' => is_array($row['location'] ?? null) ? ($row['location']['id'] ?? null) : ($row['location'] ?? $row['locationId'] ?? null),
    ];
}

function createProbeTransaction(VrPaymentApiClient $client, array $config, float $amount, bool $physical, string $suffix, bool $autoConfirm = false): array {
    $amount = max(0.01, round($amount, 2));
    $ref = substr('PMD-VR-PROBE-'.($physical ? 'TERM' : 'ONLINE').'-'.gmdate('YmdHis').'-'.$suffix, 0, 100);
    $payload = [
        'currency' => strtoupper((string)($config['currency'] ?? 'EUR')) ?: 'EUR',
        'language' => 'de-DE',
        'lineItems' => [[
            'amountIncludingTax' => number_format($amount, 2, '.', ''),
            'name' => 'PayMyDine VR diagnostic probe',
            'quantity' => '1',
            'shippingRequired' => false,
            'sku' => 'pmd-vr-probe',
            'type' => 'PRODUCT',
            'uniqueId' => $ref,
        ]],
        'merchantReference' => $ref,
        'autoConfirmationEnabled' => $autoConfirm,
        'metaData' => ['pmd_surface' => 'vr_diagnostic_probe', 'pmd_probe' => '1'],
    ];
    if ($physical) $payload['customersPresence'] = 'PHYSICAL_PRESENT';
    return $client->createTransaction($payload);
}

try {
    /** @var VRPaymentGatewayService $service */
    $service = app(VRPaymentGatewayService::class);
    $config = $service->getConfig();
    $client = new VrPaymentApiClient($config);

    heading('1. SAVED PMD VR CONFIG');
    $configSummary = [
        'enabled' => (bool)($config['enabled'] ?? false),
        'mode' => (string)($config['mode'] ?? ''),
        'api_base_url' => (string)($config['api_base_url'] ?? ''),
        'space_id' => (string)($config['space_id'] ?? ''),
        'user_id' => (string)($config['user_id'] ?? ''),
        'auth_key_present' => trim((string)($config['auth_key'] ?? '')) !== '',
        'auth_key_length' => strlen((string)($config['auth_key'] ?? '')),
        'currency' => (string)($config['currency'] ?? ''),
        'configured_terminal_override' => (string)($config['terminal_id'] ?? ''),
    ];
    $report['config'] = $configSummary;
    foreach ($configSummary as $k => $v) lineOut($k, $v);

    $validation = $client->validateConfiguration();
    $report['credential_validation'] = $validation;
    lineOut('credential_validation_ok', (bool)($validation['ok'] ?? false));
    lineOut('credential_validation_message', $validation['message'] ?? null);
    if (!($validation['ok'] ?? false)) throw new RuntimeException('Saved VR credentials are not structurally valid.');

    heading('2. PAYMENT METHODS FROM VR SPACE');
    $methodResponse = $client->paymentMethodConfigurations();
    $methods = ($methodResponse['ok'] ?? false) ? $client->normalizeMethodConfigurations((array)($methodResponse['data'] ?? [])) : [];
    $report['payment_methods'] = [
        'http_ok' => (bool)($methodResponse['ok'] ?? false),
        'http_status' => $methodResponse['status'] ?? null,
        'message' => $methodResponse['message'] ?? null,
        'normalized' => $methods,
    ];
    lineOut('method_api_ok', (bool)($methodResponse['ok'] ?? false));
    lineOut('method_http_status', $methodResponse['status'] ?? null);
    if (!$jsonOnly) foreach ($methods as $m) {
        echo sprintf("  - id=%s | code=%s | active=%s | state=%s | name=%s | connector=%s\n",
            (string)($m['id'] ?? ''),
            (string)($m['pmd_method_code'] ?? ''),
            !empty($m['active']) ? 'yes' : 'no',
            (string)($m['state'] ?? ''),
            (string)($m['name'] ?? ''),
            (string)($m['connector_name'] ?? '')
        );
    }

    heading('3. REMOTE VR TERMINALS - RAW + DETAIL');
    $terminalResponse = $client->terminals();
    $rawRows = ($terminalResponse['ok'] ?? false) ? rowsFromPayload((array)($terminalResponse['data'] ?? [])) : [];
    $normalized = ($terminalResponse['ok'] ?? false) ? $client->normalizeTerminals((array)($terminalResponse['data'] ?? [])) : [];
    $normById = [];
    foreach ($normalized as $n) $normById[(int)($n['id'] ?? 0)] = $n;

    $remoteDetails = [];
    foreach ($rawRows as $raw) {
        if (!is_array($raw)) continue;
        $id = (int)($raw['id'] ?? 0);
        if ($id <= 0) continue;
        $detailResponse = $client->terminal($id);
        $detail = ($detailResponse['ok'] ?? false) && is_array($detailResponse['data'] ?? null) ? (array)$detailResponse['data'] : $raw;
        $snap = terminalSnapshot($detail);
        $snap['detail_http_ok'] = (bool)($detailResponse['ok'] ?? false);
        $snap['detail_http_status'] = $detailResponse['status'] ?? null;
        $snap['pmd_current_online_flag'] = (bool)($normById[$id]['online'] ?? false);
        $snap['pmd_current_normalized_state'] = $normById[$id]['state'] ?? null;
        $remoteDetails[] = $snap;

        if (!$jsonOnly) {
            echo "\n  Terminal API object #{$id}\n";
            foreach ($snap as $k => $v) {
                echo '    '.str_pad($k, 29).': ';
                if (is_bool($v)) echo $v ? 'true' : 'false';
                elseif ($v === null) echo 'null';
                else echo is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                echo "\n";
            }
        }
    }
    $report['remote_terminals'] = [
        'http_ok' => (bool)($terminalResponse['ok'] ?? false),
        'http_status' => $terminalResponse['status'] ?? null,
        'api_row_count' => count($rawRows),
        'normalized_count_current_pmd_logic' => count($normalized),
        'details' => $remoteDetails,
    ];
    lineOut('terminal_api_ok', (bool)($terminalResponse['ok'] ?? false));
    lineOut('terminal_http_status', $terminalResponse['status'] ?? null);
    lineOut('remote_api_row_count', count($rawRows));
    lineOut('current_pmd_normalized_count', count($normalized));

    heading('4. LOCAL PMD terminal_devices');
    $localRows = [];
    if (Schema::hasTable('terminal_devices')) {
        foreach (DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])->orderBy('terminal_device_id')->get() as $row) {
            $a = (array)$row;
            $localRows[] = [
                'terminal_device_id' => $a['terminal_device_id'] ?? null,
                'provider_terminal_id' => $a['provider_terminal_id'] ?? null,
                'reader_id' => $a['reader_id'] ?? null,
                'reader_label' => $a['reader_label'] ?? null,
                'terminal_status' => $a['terminal_status'] ?? null,
                'pairing_state' => $a['pairing_state'] ?? null,
                'environment' => $a['environment'] ?? null,
                'is_active' => isset($a['is_active']) ? (int)$a['is_active'] : null,
                'serial_number' => $a['serial_number'] ?? null,
                'last_seen_at' => $a['last_seen_at'] ?? null,
                'updated_at' => $a['updated_at'] ?? null,
            ];
        }
    }
    $report['local_terminal_devices'] = $localRows;
    lineOut('local_vr_terminal_rows', count($localRows));
    if (!$jsonOnly) foreach ($localRows as $row) echo '  - '.json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";

    heading('5. CURRENT PMD CONNECTION AUDIT');
    $audit = $client->connectionAudit();
    $auditSafe = $audit;
    unset($auditSafe['payment_methods'], $auditSafe['terminals']);
    $report['connection_audit_summary'] = $auditSafe;
    foreach ($auditSafe as $k => $v) lineOut((string)$k, $v);

    $amount = isset($options['amount']) && $options['amount'] !== false ? (float)$options['amount'] : 0.10;
    $amount = max(0.01, round($amount, 2));

    if (isset($options['transaction-probe'])) {
        heading('6. NO-TERMINAL TRANSACTION CAPABILITY PROBE');
        if (strtolower((string)($config['mode'] ?? 'test')) !== 'test') throw new RuntimeException('--transaction-probe is blocked because PMD VR mode is not TEST.');
        $suffix = (string)random_int(1000, 9999);

        $onlineCreated = createProbeTransaction($client, $config, $amount, false, $suffix, false);
        $onlineProbe = ['create_ok' => (bool)($onlineCreated['ok'] ?? false), 'create_status' => $onlineCreated['status'] ?? null, 'message' => $onlineCreated['message'] ?? null, 'transaction_id' => null, 'modes' => []];
        if (($onlineCreated['ok'] ?? false) && is_array($onlineCreated['data'] ?? null)) {
            $tx = (int)($onlineCreated['data']['id'] ?? 0);
            $onlineProbe['transaction_id'] = $tx ?: null;
            foreach (['payment_page', 'lightbox', 'iframe'] as $mode) {
                if ($tx <= 0) break;
                $possible = $client->availablePaymentMethodConfigurations($tx, $mode);
                $onlineProbe['modes'][$mode] = [
                    'ok' => (bool)($possible['ok'] ?? false),
                    'status' => $possible['status'] ?? null,
                    'message' => $possible['message'] ?? null,
                    'methods' => ($possible['ok'] ?? false) ? $client->normalizeMethodConfigurations((array)($possible['data'] ?? [])) : [],
                ];
            }
        }

        $terminalCreated = createProbeTransaction($client, $config, $amount, true, $suffix, false);
        $terminalProbe = ['create_ok' => (bool)($terminalCreated['ok'] ?? false), 'create_status' => $terminalCreated['status'] ?? null, 'message' => $terminalCreated['message'] ?? null, 'transaction_id' => null, 'terminal_mode' => null];
        if (($terminalCreated['ok'] ?? false) && is_array($terminalCreated['data'] ?? null)) {
            $tx = (int)($terminalCreated['data']['id'] ?? 0);
            $terminalProbe['transaction_id'] = $tx ?: null;
            if ($tx > 0) {
                $possible = $client->availablePaymentMethodConfigurations($tx, 'terminal');
                $terminalProbe['terminal_mode'] = [
                    'ok' => (bool)($possible['ok'] ?? false),
                    'status' => $possible['status'] ?? null,
                    'message' => $possible['message'] ?? null,
                    'methods' => ($possible['ok'] ?? false) ? $client->normalizeMethodConfigurations((array)($possible['data'] ?? [])) : [],
                ];
            }
        }

        $report['transaction_capability_probe'] = ['amount' => $amount, 'online' => $onlineProbe, 'terminal' => $terminalProbe];
        if (!$jsonOnly) echo json_encode($report['transaction_capability_probe'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    }

    if (isset($options['perform-terminal'])) {
        heading('7. TERMINAL perform-transaction PROBE');
        if (strtolower((string)($config['mode'] ?? 'test')) !== 'test') throw new RuntimeException('--perform-terminal is blocked because PMD VR mode is not TEST.');
        if ($amount > 1.00) throw new RuntimeException('--perform-terminal amount is capped at 1.00. Use --amount=0.10.');
        $providerTerminalId = (int)$options['perform-terminal'];
        if ($providerTerminalId <= 0) throw new RuntimeException('Invalid --perform-terminal API object ID.');

        $selected = null;
        foreach ($remoteDetails as $candidate) if ((int)($candidate['id'] ?? 0) === $providerTerminalId) { $selected = $candidate; break; }
        if (!$selected) throw new RuntimeException('Selected terminal object ID is not present in the current VR API response.');
        $env = strtoupper((string)($selected['environment'] ?? ''));
        if (in_array($env, ['PRODUCTION','LIVE'], true)) throw new RuntimeException('Selected terminal reports a production/live environment. perform is blocked.');
        if (!empty($selected['planned_purge_date'])) throw new RuntimeException('Selected terminal is scheduled for purge/deletion. perform is blocked.');
        if (in_array(strtolower((string)($selected['state'] ?? '')), ['inactive','deleted','deleting','obsolete','failed','disabled','purged','unavailable'], true)) throw new RuntimeException('Selected terminal is not in a usable API state. perform is blocked.');

        $created = createProbeTransaction($client, $config, $amount, true, (string)random_int(1000,9999), true);
        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) throw new RuntimeException('Terminal test transaction creation failed: '.(string)($created['message'] ?? 'unknown error'));
        $txId = (int)($created['data']['id'] ?? 0);
        if ($txId <= 0) throw new RuntimeException('VR did not return a transaction ID.');

        $possible = $client->availablePaymentMethodConfigurations($txId, 'terminal');
        $possibleMethods = ($possible['ok'] ?? false) ? $client->normalizeMethodConfigurations((array)($possible['data'] ?? [])) : [];
        if (!($possible['ok'] ?? false) || !$possibleMethods) {
            $report['terminal_perform_probe'] = ['selected_terminal' => $selected, 'transaction_id' => $txId, 'possible_terminal_methods' => $possibleMethods, 'performed' => false, 'message' => $possible['message'] ?? 'No terminal-mode payment methods are available.'];
            throw new RuntimeException('No terminal-mode payment method is available. perform-transaction was NOT called.');
        }

        lineOut('provider_terminal_object_id', $providerTerminalId);
        lineOut('transaction_id', $txId);
        lineOut('amount', $amount.' '.($config['currency'] ?? 'EUR'));
        $performed = $client->performTerminalTransaction($providerTerminalId, $txId, (string)($config['language'] ?? 'de-DE'));
        $after = $client->readTransaction($txId);
        $report['terminal_perform_probe'] = [
            'selected_terminal' => $selected,
            'amount' => $amount,
            'transaction_id' => $txId,
            'possible_terminal_methods' => $possibleMethods,
            'perform_response' => ['ok' => (bool)($performed['ok'] ?? false), 'status' => $performed['status'] ?? null, 'message' => $performed['message'] ?? null, 'data' => $performed['data'] ?? null],
            'transaction_after_perform' => ['ok' => (bool)($after['ok'] ?? false), 'status' => $after['status'] ?? null, 'message' => $after['message'] ?? null, 'data' => $after['data'] ?? null],
        ];
        if (!$jsonOnly) echo json_encode($report['terminal_perform_probe'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    }

    $report['notes'] = [
        'Default run is read-only.',
        'Remote terminal count is API object count, not proof of a linked/usable device.',
        'Current PMD code can keep API-returned stale/unlinked terminal objects active locally.',
        'A true VR end-to-end terminal simulation requires a VR simulator or linked terminal object; PMD cannot manufacture that with API keys alone.',
        '--transaction-probe checks integration-mode capability without sending a payment to a terminal.',
        '--perform-terminal uses the VR API object ID and is intentionally blocked outside PMD TEST mode.',
    ];

    heading('FINAL NOTES');
    if (!$jsonOnly) foreach ($report['notes'] as $note) echo '  * '.$note."\n";
    if ($jsonOnly) echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    exit(0);
} catch (Throwable $e) {
    $report['fatal'] = ['class' => get_class($e), 'message' => $e->getMessage()];
    if ($jsonOnly) echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    else fwrite(STDERR, "\nFATAL: ".$e->getMessage()."\n");
    exit(1);
}
