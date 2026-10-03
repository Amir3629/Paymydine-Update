#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905"

FILES = {
    "terminal_controller": "app/admin/controllers/TerminalDevices.php",
    "payments_controller": "app/admin/controllers/Payments.php",
    "finance_controller": "app/admin/controllers/Pmdfinance.php",
    "finance_provider_view": "app/admin/views/pmdfinance/_inline_provider_form_v1.blade.php",
    "devices_view": "app/admin/views/pmddevices/index.blade.php",
}


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one anchor, found {count}. Live code differs from the audited main branch.")
    return text.replace(old, new, 1)


def lint_php(path: Path) -> None:
    p = subprocess.run(["php", "-l", str(path)], text=True, capture_output=True)
    out = (p.stdout or p.stderr).strip()
    if out:
        print(out)
    if p.returncode != 0:
        raise RuntimeError(f"PHP lint failed: {path}")


def patch_terminal_controller(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    discovery_anchor = """        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'provider' => $providerCode,
                'error' => 'Automatic device discovery is not available for this terminal provider.',
            ], 422);
        }
"""
    discovery_replacement = """        // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
        if ($providerCode === 'vr_payment') {
            try {
                $service = app(\\Admin\\Classes\\VRPaymentGatewayService::class);
                $probe = $service->probeConnectivity();

                if (!($probe['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => (string)($probe['message'] ?? 'VR Payment terminal discovery failed.'),
                    ], 422);
                }

                $columns = Schema::hasTable('terminal_devices')
                    ? Schema::getColumnListing('terminal_devices')
                    : [];

                $rows = Schema::hasTable('terminal_devices')
                    ? DB::table('terminal_devices')
                        ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                        ->orderBy('terminal_device_id')
                        ->get()
                    : collect();

                $readers = [];
                foreach ($rows as $row) {
                    $readerId = trim((string)($row->reader_id ?? ''));
                    $readers[] = [
                        'terminal_device_id' => (int)($row->terminal_device_id ?? 0),
                        'provider_terminal_id' => in_array('provider_terminal_id', $columns, true)
                            ? ($row->provider_terminal_id ?? null)
                            : null,
                        'id' => $readerId,
                        'name' => trim((string)($row->reader_label ?? '')) ?: $readerId,
                        'status' => (string)($row->terminal_status ?? 'unknown'),
                        'pairing_state' => (string)($row->pairing_state ?? 'unknown'),
                        'environment' => in_array('environment', $columns, true)
                            ? (string)($row->environment ?? 'test')
                            : 'test',
                        'active' => !empty($row->is_active),
                        'simulator' => str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-'),
                    ];
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'message' => 'VR Payment inventory synchronized. No payment or terminal command was sent.',
                    'api_terminal_count' => (int)($probe['api_terminal_count'] ?? $probe['terminal_count'] ?? 0),
                    'usable_terminal_count' => (int)($probe['usable_terminal_count'] ?? $probe['terminal_count'] ?? 0),
                    'pmd_simulator_count' => (int)($probe['pmd_simulator_count'] ?? 0),
                    'readers' => $readers,
                ]);
            } catch (\\Throwable $error) {
                Log::error('PMD_VR_TERMINAL_DISCOVERY_FAILED_R5', ['message' => $error->getMessage()]);
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'error' => 'VR Payment terminal discovery failed: '.$error->getMessage(),
                ], 422);
            }
        }

        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'provider' => $providerCode,
                'error' => 'Automatic device discovery is not available for this terminal provider.',
            ], 422);
        }
"""
    text = replace_once(text, discovery_anchor, discovery_replacement, "VR device discovery branch")

    test_anchor = """        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'error' => 'This provider does not expose a safe non-charging terminal connection test here.',
            ], 422);
        }
"""
    test_replacement = """        // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
        if ($providerCode === 'vr_payment') {
            try {
                $service = app(\\Admin\\Classes\\VRPaymentGatewayService::class);
                $config = $service->getConfig();
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';

                $readerId = trim((string)($model->reader_id ?? ''));
                $isSimulator = str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-');

                if ($isSimulator) {
                    if ($mode !== 'test') {
                        return response()->json([
                            'success' => false,
                            'provider' => 'vr_payment',
                            'simulator' => true,
                            'payment_sent' => false,
                            'error' => 'PMD VR Simulator is TEST-only and is blocked while VR Payment is in live mode.',
                        ], 422);
                    }

                    $metadata = $model->metadata ?? [];
                    if (is_string($metadata)) {
                        $decoded = json_decode($metadata, true);
                        $metadata = is_array($decoded) ? $decoded : [];
                    }
                    if (!is_array($metadata)) {
                        $metadata = [];
                    }

                    return response()->json([
                        'success' => true,
                        'provider' => 'vr_payment',
                        'simulator' => true,
                        'payment_sent' => false,
                        'network_probe_performed' => false,
                        'reader_id' => $readerId,
                        'scenario' => $metadata['scenario'] ?? null,
                        'message' => 'PMD VR Simulator is ready. This is an internal TEST-only simulator and no request was sent to VR Payment.',
                    ]);
                }

                $client = new \\App\\Services\\Payments\\VrPaymentApiClient($config);
                $validation = $client->validateConfiguration();
                if (!($validation['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => (string)($validation['message'] ?? 'VR Payment configuration is invalid.'),
                    ], 422);
                }

                $providerTerminalId = Schema::hasColumn('terminal_devices', 'provider_terminal_id')
                    ? (int)($model->provider_terminal_id ?? 0)
                    : 0;

                if ($providerTerminalId <= 0) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'error' => 'This VR terminal has no provider object ID. Run Test saved connection in Payments & finance to synchronize terminals.',
                    ], 422);
                }

                $response = $client->terminal($providerTerminalId);
                if (!($response['ok'] ?? false) || !is_array($response['data'] ?? null)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'vr_payment',
                        'payment_sent' => false,
                        'provider_terminal_id' => $providerTerminalId,
                        'error' => (string)($response['message'] ?? 'Unable to read the VR Payment terminal object.'),
                        'status' => $response['status'] ?? null,
                    ], 422);
                }

                $terminal = (array)$response['data'];
                $state = strtolower(trim((string)($terminal['state'] ?? 'unknown')));
                $serial = trim((string)(
                    $terminal['deviceSerialNumber']
                    ?? $terminal['serialNumber']
                    ?? ((array)($terminal['device'] ?? []))['serialNumber']
                    ?? ''
                ));
                $plannedPurge = $terminal['plannedPurgeDate'] ?? null;
                $usable = $state === 'active' && $serial !== '' && empty($plannedPurge);

                return response()->json([
                    'success' => true,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'network_probe_performed' => true,
                    'provider_terminal_id' => $providerTerminalId,
                    'identifier' => $terminal['identifier'] ?? $readerId,
                    'state' => $terminal['state'] ?? null,
                    'planned_purge_date' => $plannedPurge,
                    'device_serial_number' => $serial !== '' ? $serial : null,
                    'usable_for_payment' => $usable,
                    'message' => $usable
                        ? 'VR Payment terminal object is reachable and exposes a linked device.'
                        : 'VR Payment terminal object is reachable, but it is not a linked/usable payment device yet.',
                ]);
            } catch (\\Throwable $error) {
                Log::error('PMD_VR_TERMINAL_SAFE_TEST_FAILED_R5', ['message' => $error->getMessage()]);
                return response()->json([
                    'success' => false,
                    'provider' => 'vr_payment',
                    'payment_sent' => false,
                    'error' => 'VR Payment terminal read-only test failed: '.$error->getMessage(),
                ], 422);
            }
        }

        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'error' => 'This provider does not expose a safe non-charging terminal connection test here.',
            ], 422);
        }
"""
    text = replace_once(text, test_anchor, test_replacement, "VR safe terminal test branch")

    path.write_text(text, encoding="utf-8")


def patch_payments_controller(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    anchor = """    public function onTestProviderConnection()
    {
"""
    method = """    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    public function onTestVrTerminalCapability()
    {
        $code = (string)post('code', post('Payment.code', (string)($this->params[0] ?? '')));
        if ($code !== 'vr_payment') {
            throw new ApplicationException('VR Payment provider context is required.');
        }

        $service = app(\\Admin\\Classes\\VRPaymentGatewayService::class);
        $config = $service->getConfig();

        if (strtolower(trim((string)($config['mode'] ?? 'test'))) !== 'test') {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'payment_sent' => false,
                'error' => 'Cloud Till capability probe is TEST-only. Switch VR Payment to Test / Sandbox first.',
            ], 422);
        }

        $client = new \\App\\Services\\Payments\\VrPaymentApiClient($config);
        $validation = $client->validateConfiguration();
        if (!($validation['ok'] ?? false)) {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'payment_sent' => false,
                'error' => (string)($validation['message'] ?? 'VR Payment credentials are invalid.'),
            ], 422);
        }

        $amount = 0.10;
        $reference = 'PMD-VR-CLOUD-TILL-UI-'.gmdate('YmdHis').'-'.random_int(1000, 9999);
        $payload = [
            'currency' => strtoupper((string)($config['currency'] ?? 'EUR')) ?: 'EUR',
            'language' => 'de-DE',
            'lineItems' => [[
                'amountIncludingTax' => number_format($amount, 2, '.', ''),
                'name' => 'PayMyDine VR Cloud Till capability test',
                'quantity' => '1',
                'shippingRequired' => false,
                'sku' => 'pmd-vr-cloud-till-ui',
                'type' => 'PRODUCT',
                'uniqueId' => $reference,
            ]],
            'merchantReference' => $reference,
            'autoConfirmationEnabled' => false,
            'metaData' => [
                'pmd_surface' => 'finance_vr_cloud_till_test',
                'pmd_probe_version' => 'r5',
            ],
        ];

        $created = $client->createTransaction($payload);
        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'payment_sent' => false,
                'stage' => 'create_transaction',
                'status' => $created['status'] ?? null,
                'error' => (string)($created['message'] ?? 'VR test transaction creation failed.'),
            ], 422);
        }

        $transaction = (array)$created['data'];
        $transactionId = (int)($transaction['id'] ?? 0);
        if ($transactionId <= 0) {
            return response()->json([
                'success' => false,
                'provider' => 'vr_payment',
                'payment_sent' => false,
                'error' => 'VR Payment did not return a transaction ID.',
            ], 422);
        }

        $possible = $client->availablePaymentMethodConfigurations($transactionId, 'terminal');
        $methods = ($possible['ok'] ?? false)
            ? $client->normalizeMethodConfigurations((array)($possible['data'] ?? []))
            : [];

        $read = $client->readTransaction($transactionId);
        $readData = ($read['ok'] ?? false) && is_array($read['data'] ?? null)
            ? (array)$read['data']
            : $transaction;

        return response()->json([
            'success' => true,
            'provider' => 'vr_payment',
            'payment_sent' => false,
            'terminal_command_sent' => false,
            'transaction_created' => true,
            'transaction_id' => $transactionId,
            'merchant_reference' => $reference,
            'amount' => $amount,
            'customers_presence' => $readData['customersPresence'] ?? $transaction['customersPresence'] ?? null,
            'transaction_state' => $readData['state'] ?? $transaction['state'] ?? null,
            'terminal_mode' => [
                'ok' => (bool)($possible['ok'] ?? false),
                'status' => $possible['status'] ?? null,
                'message' => $possible['message'] ?? null,
                'methods' => $methods,
            ],
            'message' => $methods
                ? 'VR Cloud Till capability is available. No perform-transaction command was sent.'
                : 'VR transaction was created, but no terminal-mode payment method is currently available.',
        ]);
    }

    public function onTestProviderConnection()
    {
"""
    text = replace_once(text, anchor, method, "Payments VR capability handler")
    path.write_text(text, encoding="utf-8")


def patch_finance_controller(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    vars_anchor = """            'provider_secret_fields' => $this->inlineProviderSecretFields(),
            'settings' => $this->financeSettings(),
            'fiskaly' => $this->fiskalyPayload(),
"""
    vars_replacement = """            'provider_secret_fields' => $this->inlineProviderSecretFields(),
            'settings' => $this->financeSettings(),
            'fiskaly' => $this->fiskalyPayload(),
            // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
            'vr_terminal_inventory' => $this->vrTerminalInventory(),
"""
    text = replace_once(text, vars_anchor, vars_replacement, "Finance VR inventory payload")

    method_anchor = """    /**
     * Presentation-only schema for the Finance in-page modal.
     * Payments.php remains the save/validation/provider authority.
     */
    protected function inlineProviderFields(): array
"""
    inventory_method = """    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    protected function vrTerminalInventory(): array
    {
        $result = [
            'total_rows' => 0,
            'provider_rows' => 0,
            'usable_real' => 0,
            'simulators' => 0,
            'rows' => [],
        ];

        try {
            if (!Schema::hasTable('terminal_devices')) {
                return $result;
            }

            $columns = Schema::getColumnListing('terminal_devices');
            $rows = DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->orderBy('terminal_device_id')
                ->get();

            foreach ($rows as $row) {
                $readerId = trim((string)($row->reader_id ?? ''));
                $simulator = str_starts_with(strtoupper($readerId), 'PMD-VR-SIM-');
                $active = !empty($row->is_active);

                $result['total_rows']++;
                if ($simulator) {
                    if ($active) $result['simulators']++;
                } else {
                    $result['provider_rows']++;
                    if ($active) $result['usable_real']++;
                }

                $result['rows'][] = [
                    'terminal_device_id' => (int)($row->terminal_device_id ?? 0),
                    'provider_terminal_id' => in_array('provider_terminal_id', $columns, true)
                        ? ($row->provider_terminal_id ?? null)
                        : null,
                    'reader_id' => $readerId,
                    'name' => trim((string)($row->reader_label ?? '')) ?: $readerId,
                    'status' => (string)($row->terminal_status ?? 'unknown'),
                    'pairing_state' => (string)($row->pairing_state ?? 'unknown'),
                    'environment' => in_array('environment', $columns, true)
                        ? (string)($row->environment ?? 'test')
                        : 'test',
                    'active' => $active,
                    'simulator' => $simulator,
                ];
            }
        } catch (\\Throwable $error) {
            logger()->warning('PMD finance VR terminal inventory failed', ['message' => $error->getMessage()]);
        }

        return $result;
    }

    /**
     * Presentation-only schema for the Finance in-page modal.
     * Payments.php remains the save/validation/provider authority.
     */
    protected function inlineProviderFields(): array
"""
    text = replace_once(text, method_anchor, inventory_method, "Finance VR inventory method")
    path.write_text(text, encoding="utf-8")


def patch_finance_provider_view(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    top_anchor = """    $config = $provider ? $provider->getConfigData() : [];
@endphp
"""
    top_replacement = """    $config = $provider ? $provider->getConfigData() : [];
    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    $vrTerminalInventory = $code === 'vr_payment'
        ? (array)($pmdFinance['vr_terminal_inventory'] ?? [])
        : [];
@endphp
"""
    text = replace_once(text, top_anchor, top_replacement, "Finance view VR inventory variable")

    vr_anchor = """        @if($code === 'vr_payment')
            {{-- PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
"""
    vr_replacement = """        @if($code === 'vr_payment')
            {{-- PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
                <strong>VR Terminal management</strong><br>
                Provider terminal records: <strong>{{ (int)($vrTerminalInventory['provider_rows'] ?? 0) }}</strong>
                · Usable real terminals: <strong>{{ (int)($vrTerminalInventory['usable_real'] ?? 0) }}</strong>
                · PMD test simulators: <strong>{{ (int)($vrTerminalInventory['simulators'] ?? 0) }}</strong>
                <br><small>VR terminal inventory is managed here. Provider terminals are synchronized from VR Payment; PMD simulators are TEST-only and never call the VR network.</small>

                @if(!empty($vrTerminalInventory['rows']))
                    <div style="margin-top:10px;display:grid;gap:8px">
                        @foreach((array)$vrTerminalInventory['rows'] as $terminal)
                            <div style="border:1px solid #dce7ea;border-radius:10px;padding:9px 11px;display:flex;justify-content:space-between;gap:12px;align-items:center">
                                <div>
                                    <strong>{{ $terminal['name'] ?? ($terminal['reader_id'] ?? 'VR terminal') }}</strong><br>
                                    <small>
                                        {{ !empty($terminal['simulator']) ? 'PMD simulator' : 'VR provider terminal' }}
                                        · {{ $terminal['reader_id'] ?? '—' }}
                                        @if(!empty($terminal['provider_terminal_id'])) · API #{{ $terminal['provider_terminal_id'] }} @endif
                                    </small>
                                </div>
                                <div style="text-align:right">
                                    <strong>{{ !empty($terminal['active']) ? 'Ready in PMD' : 'Not selectable' }}</strong><br>
                                    <small>{{ $terminal['status'] ?? 'unknown' }} · {{ $terminal['pairing_state'] ?? 'unknown' }}</small>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">Refresh / sync VR inventory</button>
                    <button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestVrTerminalCapability">Test Cloud Till capability</button>
                </div>
                <small style="display:block;margin-top:8px">Cloud Till capability test creates one €0.10 TEST transaction in VR, but sends no perform-transaction command and charges nothing.</small>
            </div>

            {{-- PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
"""
    text = replace_once(text, vr_anchor, vr_replacement, "Finance VR terminal management UI")

    old_button = """        <div style="margin-top:12px"><button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">{{ $pmdSettingsText('Test saved connection') }}</button></div>
"""
    new_button = """        @if($code !== 'vr_payment')
            <div style="margin-top:12px"><button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">{{ $pmdSettingsText('Test saved connection') }}</button></div>
        @endif
"""
    text = replace_once(text, old_button, new_button, "Avoid duplicate VR test button")
    path.write_text(text, encoding="utf-8")


def patch_devices_view(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    anchor = """    $terminals = $data['terminals'] ?? collect();
    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);
    $pmdTerminalProviderCodes = array_values(array_map(static fn ($code) => strtolower(trim((string)$code)), array_keys($terminalProviders)));
"""
    replacement = """    $terminals = $data['terminals'] ?? collect();
    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);

    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    // VR Payment credentials, provider inventory and simulator state now live in
    // Payments & finance. Keep Devices focused on generic/local hardware.
    $terminals = collect($terminals)->reject(static function ($terminal) {
        return strtolower(trim((string)($terminal->provider_code ?? ''))) === 'vr_payment';
    })->values();
    unset($terminalProviders['vr_payment']);

    $pmdTerminalProviderCodes = array_values(array_map(static fn ($code) => strtolower(trim((string)$code)), array_keys($terminalProviders)));
"""
    text = replace_once(text, anchor, replacement, "Hide VR terminals from Devices page")

    stats_anchor = """    $stats = $data['stats'] ?? ['pos'=>0,'terminals'=>0,'drawers'=>0,'kds'=>0,'biometric'=>0];
@endphp
"""
    stats_replacement = """    $stats = $data['stats'] ?? ['pos'=>0,'terminals'=>0,'drawers'=>0,'kds'=>0,'biometric'=>0];
    $stats['terminals'] = $terminals->count();
@endphp
"""
    text = replace_once(text, stats_anchor, stats_replacement, "Devices terminal count after VR move")

    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Move VR terminal management into Payments & finance and fix VR safe test/discovery."
    )
    parser.add_argument("--root", default="/var/www/paymydine")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    paths = {name: root / rel for name, rel in FILES.items()}
    for name, path in paths.items():
        if not path.is_file():
            fail(f"Missing {name}: {path}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_root = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"finance-authority-r5-{stamp}"
    backup_root.mkdir(parents=True, exist_ok=True)

    for rel in FILES.values():
        src = root / rel
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print("Backup directory:", backup_root)

    try:
        patch_terminal_controller(paths["terminal_controller"])
        patch_payments_controller(paths["payments_controller"])
        patch_finance_controller(paths["finance_controller"])
        patch_finance_provider_view(paths["finance_provider_view"])
        patch_devices_view(paths["devices_view"])

        for key in ["terminal_controller", "payments_controller", "finance_controller"]:
            lint_php(paths[key])

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Backup:", backup_root)
        print("\nAfter reload:")
        print("  1) /admin/settings/devices no longer lists VR Payment terminals.")
        print("  2) /admin/settings/finance -> VR Payment shows VR terminal inventory.")
        print("  3) Refresh/sync VR inventory performs a safe read-only provider sync.")
        print("  4) Test Cloud Till capability creates a €0.10 TEST transaction only; no terminal command.")
        print("  5) Direct VR terminal Test connection becomes safe/read-only.")
        print("  6) PMD VR Simulator Test connection returns READY without contacting VR.")
        print("\nRun:")
        print("  sudo systemctl reload php8.3-fpm")
        print("Then hard-refresh the browser.")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring all backups...", file=sys.stderr)
        for rel in FILES.values():
            src = backup_root / rel
            dst = root / rel
            if src.is_file():
                shutil.copy2(src, dst)
        raise


if __name__ == "__main__":
    main()
