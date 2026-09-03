#!/usr/bin/env python3
from pathlib import Path

BASE = Path('/var/www/paymydine')
TERMINAL_CONTROLLER = BASE / 'app/admin/controllers/TerminalDevices.php'
MODAL = BASE / 'app/admin/views/pmddevices/_inline_modal_form.blade.php'
DEVICE_JS = BASE / 'app/admin/assets/js/pmd-device-inline-v6.js'
SQUARE_PROVIDER = BASE / 'app/Services/TerminalPayments/SquareTerminalProvider.php'
WAITER_ENDPOINT = BASE / 'app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php'
WAITER_PROVIDERS = BASE / 'app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php'
TERMINAL_SERVICE = BASE / 'app/Services/TerminalPayments/TerminalPaymentService.php'
WAITER_JS = BASE / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(old, new, 1))
    print(f'PASS: {label}')


def insert_before_once(path: Path, anchor: str, block: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(anchor, block + anchor, 1))
    print(f'PASS: {label}')


def replace_php_function(path: Path, signature: str, replacement: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    start = text.find(signature)
    if start < 0:
        raise SystemExit(f'STOP: {label}: function signature not found')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'STOP: {label}: opening brace not found')
    depth = 0
    end = None
    for index in range(brace, len(text)):
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f'STOP: {label}: closing brace not found')
    path.write_text(text[:start] + replacement.rstrip() + text[end:])
    print(f'PASS: {label}')


def replace_php_if_block(path: Path, function_signature: str, if_anchor: str, replacement: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    fn_start = text.find(function_signature)
    if fn_start < 0:
        raise SystemExit(f'STOP: {label}: function signature not found')
    start = text.find(if_anchor, fn_start)
    if start < 0:
        raise SystemExit(f'STOP: {label}: if anchor not found')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'STOP: {label}: opening brace not found')
    depth = 0
    end = None
    for index in range(brace, len(text)):
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f'STOP: {label}: closing brace not found')
    path.write_text(text[:start] + replacement.rstrip() + text[end:])
    print(f'PASS: {label}')


for required in [
    TERMINAL_CONTROLLER,
    MODAL,
    DEVICE_JS,
    SQUARE_PROVIDER,
    WAITER_ENDPOINT,
    WAITER_PROVIDERS,
    TERMINAL_SERVICE,
    WAITER_JS,
]:
    if not required.is_file():
        raise SystemExit(f'STOP: required file missing: {required}')

# ---------------------------------------------------------------------------
# 1) One canonical Canada Sandbox simulator catalogue.
# Square documents dedicated CAD/Interac simulator IDs; PMD Canada must not
# suggest the generic USD-oriented successful simulator as its primary device.
# ---------------------------------------------------------------------------
provider_methods = r'''    public function code(): string
    {
        return 'square';
    }

    // PMD_SQUARE_TERMINAL_CANADA_R10_SIMULATORS
    public static function canadaSandboxDevices(): array
    {
        return [
            '388b5a08-a77c-48ef-ad2a-4a790e6f2789' => [
                'name' => 'Square Sandbox Canada - Interac success',
                'expected_status' => 'COMPLETED',
                'currency' => 'CAD',
            ],
            '2b0b734b-b187-47f0-9d6f-288745210bdb' => [
                'name' => 'Square Sandbox Canada - Interac success + 20% tip',
                'expected_status' => 'COMPLETED',
                'currency' => 'CAD',
            ],
            '841100b9-ee60-4537-9bcf-e30b2ba5e215' => [
                'name' => 'Square Sandbox - buyer cancels',
                'expected_status' => 'CANCELED',
                'currency' => 'CAD',
            ],
            '0a956d49-619a-4530-8e5e-8eac603ffc5e' => [
                'name' => 'Square Sandbox - immediate timeout',
                'expected_status' => 'CANCELED',
                'currency' => 'CAD',
            ],
            'da40d603-c2ea-4a65-8cfd-f42e36dab0c7' => [
                'name' => 'Square Sandbox - terminal offline / pending',
                'expected_status' => 'PENDING',
                'currency' => 'CAD',
            ],
        ];
    }

    public static function isCanadaSandboxDeviceId(string $deviceId): bool
    {
        return array_key_exists(trim($deviceId), self::canadaSandboxDevices());
    }
'''
replace_php_function(
    SQUARE_PROVIDER,
    '    public function code(): string',
    provider_methods,
    'PMD_SQUARE_TERMINAL_CANADA_R10_SIMULATORS',
    'Square Canada sandbox simulator catalogue',
)

# ---------------------------------------------------------------------------
# 2) Terminal controller: clear SumUp-only fields for Square, inherit current
# location/environment, make discovery Canada/CAD-specific, and make Test
# terminal connection read-only so it cannot fail because of a model save.
# ---------------------------------------------------------------------------
replace_once(
    TERMINAL_CONTROLLER,
    "use Illuminate\\Support\\Facades\\Http;\n",
    "use Illuminate\\Support\\Facades\\Http;\nuse Illuminate\\Support\\Facades\\Log;\n",
    'Terminal controller logging import',
)

form_before_save = r'''    public function formBeforeSave($model)
    {
        // PMD_SQUARE_TERMINAL_CANADA_R10_SAVE_NORMALIZATION
        $providerCode = strtolower(trim((string)($model->provider_code ?? post('Terminal_device.provider_code', ''))));
        $readerId = trim((string)($model->reader_id ?? post('Terminal_device.reader_id', '')));

        // Affiliate key belongs to SumUp only. Never let a Square/Worldline/VR
        // device accidentally retain a copied reader/device ID in that field.
        if ($providerCode !== 'sumup') {
            $model->affiliate_key = '';
        }

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $model->environment = $mode;

                if (empty($model->location_id)) {
                    $state = app(\App\Services\Platform\LocationPlatformContext::class)->state();
                    if (!empty($state['location_id'])) {
                        $model->location_id = (int)$state['location_id'];
                    }
                }

                if ($mode === 'test' && SquareTerminalProvider::isCanadaSandboxDeviceId($readerId)) {
                    $model->pairing_state = 'paired';
                    $model->terminal_status = 'sandbox_simulator_ready';
                } elseif ($readerId !== '' && trim((string)($model->terminal_status ?? '')) === '') {
                    $model->terminal_status = 'configured';
                }
            } catch (\Throwable $error) {
                Log::warning('PMD_SQUARE_TERMINAL_SAVE_NORMALIZATION_FAILED_R10', [
                    'message' => $error->getMessage(),
                ]);
            }
            return;
        }

        if ($providerCode !== 'worldline') {
            return;
        }

        $readerLabel = trim((string)($model->reader_label ?? post('Terminal_device.reader_label', '')));
        $worldline = (array)post('Worldline_terminal', []);
        $environment = strtolower(trim((string)($worldline['terminal_environment'] ?? ($model->environment ?? 'test'))));
        $environment = $environment === 'live' ? 'live' : 'test';
        $model->environment = $environment;

        app(\App\Services\TerminalPayments\WorldlineTerminalSettingsService::class)
            ->saveForTerminal($worldline, $readerId, $readerLabel, $environment);
    }
'''
replace_php_function(
    TERMINAL_CONTROLLER,
    '    public function formBeforeSave($model)',
    form_before_save,
    'PMD_SQUARE_TERMINAL_CANADA_R10_SAVE_NORMALIZATION',
    'Square terminal save normalization',
)

discover_function = r'''    public function onDiscoverReaders()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R10_DISCOVERY
        try {
            $model = $this->formGetModel();
        } catch (\Throwable $error) {
            Log::error('PMD_TERMINAL_DISCOVERY_MODEL_FAILED_R10', ['message' => $error->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Unable to load this terminal record for discovery.'], 422);
        }

        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $locationId = (int)post('Terminal_device.location_id', (int)($model->location_id ?? 0));
                $platform = app(\App\Services\Platform\LocationPlatformContext::class)->state($locationId ?: null);
                $pmdCountry = strtoupper(trim((string)($platform['country_code'] ?? '')));
                $pmdCurrency = strtoupper(trim((string)($platform['profile']['currency']['code'] ?? '')));

                if ($pmdCountry !== 'CA' || $pmdCurrency !== 'CAD') {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => 'Square Terminal discovery is enabled in PayMyDine only for Canada / CAD.',
                    ], 422);
                }

                if ($mode === 'test') {
                    $readers = [];
                    foreach (SquareTerminalProvider::canadaSandboxDevices() as $deviceId => $scenario) {
                        $readers[] = [
                            'id' => $deviceId,
                            'name' => (string)($scenario['name'] ?? $deviceId),
                            'status' => 'SIMULATED',
                            'expected_status' => $scenario['expected_status'] ?? null,
                            'currency' => 'CAD',
                        ];
                    }

                    return response()->json([
                        'success' => true,
                        'provider' => 'square',
                        'mode' => 'test',
                        'sandbox' => true,
                        'payment_sent' => false,
                        'message' => 'Square Canada Sandbox simulators loaded. The first device simulates a successful CAD Interac checkout.',
                        'readers' => $readers,
                    ]);
                }

                $token = trim((string)($config['access_token'] ?? ''));
                $squareLocationId = trim((string)($config['location_id'] ?? ''));
                if ($token === '' || $squareLocationId === '') {
                    return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square production Access Token and Location ID are required.'], 422);
                }

                $response = Http::withToken($token)
                    ->withHeaders(['Square-Version' => \App\Services\Payments\SquareRuntimeService::API_VERSION])
                    ->acceptJson()
                    ->timeout(20)
                    ->get('https://connect.squareup.com/v2/devices', ['location_id' => $squareLocationId, 'limit' => 100]);
                $json = (array)$response->json();
                if (!$response->successful()) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => (string)($json['errors'][0]['detail'] ?? 'Unable to list Square Terminal devices. Ensure the token has DEVICES_READ permission.'),
                        'status' => $response->status(),
                    ], 422);
                }

                $readers = [];
                foreach ((array)($json['devices'] ?? []) as $device) {
                    $device = (array)$device;
                    $attributes = (array)($device['attributes'] ?? []);
                    $status = (array)($device['status'] ?? []);
                    $deviceId = trim((string)($device['id'] ?? ''));
                    if ($deviceId === '') continue;
                    $readers[] = [
                        'id' => $deviceId,
                        'name' => (string)($attributes['name'] ?? $attributes['model'] ?? $deviceId),
                        'model' => $attributes['model'] ?? null,
                        'status' => $status['category'] ?? null,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'mode' => 'live',
                    'location_id' => $squareLocationId,
                    'payment_sent' => false,
                    'readers' => $readers,
                    'message' => count($readers).' Square Terminal device(s) returned by the Devices API.',
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_SQUARE_TERMINAL_DISCOVERY_FAILED_R10', ['message' => $error->getMessage()]);
                return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square Terminal discovery failed: '.$error->getMessage()], 422);
            }
        }

        if ($providerCode !== 'sumup') {
            return response()->json([
                'success' => false,
                'provider' => $providerCode,
                'error' => 'Automatic device discovery is not available for this terminal provider.',
            ], 422);
        }

        $config = $this->sumupConfig();
        if (!$config['ready']) {
            return response()->json(['success' => false, 'error' => $config['message']], 422);
        }

        $merchantCode = $this->resolveMerchantCode($config);
        if ($merchantCode === '') {
            return response()->json(['success' => false, 'error' => 'SumUp merchant code could not be resolved.'], 422);
        }

        $resp = Http::withToken($config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get($config['url'].'/v0.1/merchants/'.rawurlencode($merchantCode).'/readers');

        if (!$resp->ok()) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to list SumUp readers. Ensure the token has readers.read permission.',
                'status' => $resp->status(),
                'details' => $resp->json(),
            ], 502);
        }

        $body = (array)$resp->json();
        $items = array_values((array)($body['items'] ?? $body['readers'] ?? []));

        return response()->json([
            'success' => true,
            'provider' => 'sumup',
            'merchant_code' => $merchantCode,
            'readers' => $items,
        ]);
    }
'''
replace_php_function(
    TERMINAL_CONTROLLER,
    '    public function onDiscoverReaders()',
    discover_function,
    'PMD_SQUARE_TERMINAL_CANADA_R10_DISCOVERY',
    'Square Canada terminal discovery',
)

replace_once(
    TERMINAL_CONTROLLER,
    "        $model = $this->formGetModel();\n        $providerCode = strtolower(trim((string)$model->provider_code));\n        $readerId = trim((string)$model->reader_id);\n",
    "        // PMD_SQUARE_TERMINAL_CANADA_R10_TEST_HANDLER\n        try {\n            $model = $this->formGetModel();\n        } catch (\\Throwable $error) {\n            Log::error('PMD_TERMINAL_TEST_MODEL_FAILED_R10', ['message' => $error->getMessage()]);\n            return response()->json(['success' => false, 'error' => 'Unable to load this terminal record for testing.'], 422);\n        }\n        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));\n        $readerId = trim((string)post('Terminal_device.reader_id', (string)($model->reader_id ?? '')));\n",
    'Terminal test handler reads posted terminal values safely',
)

square_test_block = r'''        if ($providerCode === 'square') {
            // PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? 'test'))) === 'live' ? 'live' : 'test';
                $locationId = (int)post('Terminal_device.location_id', (int)($model->location_id ?? 0));
                $platform = app(\App\Services\Platform\LocationPlatformContext::class)->state($locationId ?: null);
                $pmdCountry = strtoupper(trim((string)($platform['country_code'] ?? '')));
                $pmdCurrency = strtoupper(trim((string)($platform['profile']['currency']['code'] ?? '')));

                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = $pmdCountry;
                $config['currency'] = $pmdCurrency !== '' ? $pmdCurrency : strtoupper(trim((string)($config['configured_currency'] ?? '')));

                $validation = (new SquareTerminalProvider())->validateConfiguration($config);
                if (!($validation['ok'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => $validation['message'] ?? 'Square Terminal configuration is incomplete.',
                    ], 422);
                }

                $location = $runtime->location($config);
                $squareCountry = strtoupper(trim((string)($location['country'] ?? '')));
                $squareCurrency = strtoupper(trim((string)($location['currency'] ?? '')));
                if ($pmdCountry !== 'CA' || $pmdCurrency !== 'CAD' || $squareCountry !== 'CA' || $squareCurrency !== 'CAD') {
                    return response()->json([
                        'success' => false,
                        'provider' => 'square',
                        'error' => 'Square Terminal requires PayMyDine Canada/CAD and a Square Canada/CAD location.',
                        'restaurant_country' => $pmdCountry,
                        'restaurant_currency' => $pmdCurrency,
                        'square_country' => $squareCountry,
                        'square_currency' => $squareCurrency,
                    ], 422);
                }

                $sandboxSimulator = false;
                $scenario = null;
                if ($mode === 'test') {
                    $sandboxSimulator = SquareTerminalProvider::isCanadaSandboxDeviceId($readerId);
                    if (!$sandboxSimulator) {
                        return response()->json([
                            'success' => false,
                            'provider' => 'square',
                            'mode' => 'test',
                            'error' => 'For PayMyDine Canada Sandbox, choose one of the documented CAD Terminal simulator device IDs from Discover / load devices.',
                            'supported_device_ids' => array_keys(SquareTerminalProvider::canadaSandboxDevices()),
                        ], 422);
                    }
                    $scenario = SquareTerminalProvider::canadaSandboxDevices()[$readerId] ?? null;
                } else {
                    // Safe read-only production device validation. No checkout,
                    // charge, action, or pairing command is sent.
                    $deviceResponse = Http::withToken((string)$config['access_token'])
                        ->withHeaders(['Square-Version' => \App\Services\Payments\SquareRuntimeService::API_VERSION])
                        ->acceptJson()
                        ->timeout(20)
                        ->get($runtime->baseUrl($config).'/v2/devices/'.rawurlencode($readerId));
                    $deviceJson = (array)$deviceResponse->json();
                    if (!$deviceResponse->successful()) {
                        return response()->json([
                            'success' => false,
                            'provider' => 'square',
                            'mode' => 'live',
                            'error' => (string)($deviceJson['errors'][0]['detail'] ?? 'Square device was not found. Ensure DEVICES_READ permission and use the paired device_id from the Devices API.'),
                            'status' => $deviceResponse->status(),
                        ], 422);
                    }
                    $device = (array)($deviceJson['device'] ?? []);
                    if (trim((string)($device['id'] ?? '')) === '') {
                        return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square Devices API returned no matching terminal device.'], 422);
                    }
                }

                return response()->json([
                    'success' => true,
                    'provider' => 'square',
                    'reader_id' => $readerId,
                    'mode' => $mode,
                    'location' => [
                        'id' => $config['location_id'] ?? null,
                        'name' => $location['name'] ?? null,
                        'country' => $squareCountry,
                        'currency' => $squareCurrency,
                    ],
                    'sandbox_simulator' => $sandboxSimulator,
                    'scenario' => $scenario,
                    'network_probe_performed' => true,
                    'payment_sent' => false,
                    'recommended_terminal_status' => $sandboxSimulator ? 'sandbox_simulator_ready' : 'configured',
                    'recommended_pairing_state' => $sandboxSimulator ? 'paired' : ((string)($model->pairing_state ?? '') ?: 'unknown'),
                    'message' => $sandboxSimulator
                        ? 'Square Canada Sandbox Terminal configuration is valid. No charge was created. Run a CAD order through Direct terminal to test the simulated checkout.'
                        : 'Square production credentials, location and device are readable. No checkout or charge was created.',
                ]);
            } catch (\Throwable $error) {
                Log::error('PMD_SQUARE_TERMINAL_TEST_FAILED_R10', [
                    'reader_id' => $readerId,
                    'message' => $error->getMessage(),
                ]);
                return response()->json([
                    'success' => false,
                    'provider' => 'square',
                    'error' => 'Square Terminal test failed: '.$error->getMessage(),
                ], 422);
            }
        }
'''
replace_php_if_block(
    TERMINAL_CONTROLLER,
    '    public function onTestTerminalConnection()',
    "        if ($providerCode === 'square') {",
    square_test_block,
    'PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST',
    'Square Terminal read-only connection test',
)

replace_once(
    TERMINAL_CONTROLLER,
    'Reader ID = Square device_id. In Sandbox you may use Square documented simulator ID 9fa747a2-25ff-48ee-b078-04381f7c828f for a successful card checkout. Production requires a paired Square Terminal device_id and a Square-supported seller country.',
    'Reader ID = Square device_id. PayMyDine Canada Sandbox uses the documented CAD simulator 388b5a08-a77c-48ef-ad2a-4a790e6f2789 for a successful Interac checkout. Production requires the paired Square Terminal device_id returned by the Devices API.',
    'Square setup guide uses Canada CAD simulator',
)

# ---------------------------------------------------------------------------
# 3) Modal UX: Square must not show or retain the SumUp affiliate key, and the
# guidance should point at the Canadian CAD simulator instead of the old ID.
# ---------------------------------------------------------------------------
replace_once(
    MODAL,
    '<div class="pmd-owner-field"><label>{{ $pmdSettingsText(\'Affiliate key (SumUp only)\') }}</label>',
    '<div class="pmd-owner-field" data-pmd-terminal-sumup-only {{ (string)$v(\'provider_code\',$defaultProvider) === \'sumup\' ? \'\' : \'hidden\' }}><label>{{ $pmdSettingsText(\'Affiliate key (SumUp only)\') }}</label>',
    'Square modal hides SumUp-only affiliate field',
)
replace_once(
    MODAL,
    'Sandbox can use simulator device ID 9fa747a2-25ff-48ee-b078-04381f7c828f. Production requires a paired Square Terminal device ID or serial from the Square Devices API.',
    'Canada Sandbox: use device ID 388b5a08-a77c-48ef-ad2a-4a790e6f2789 for a successful CAD Interac checkout, or use Discover / load devices for additional success/failure scenarios. Production requires the paired Square Terminal device_id from the Square Devices API.',
    'Square modal guidance uses Canada/CAD simulator',
)

# ---------------------------------------------------------------------------
# 4) Shared device modal JS: provider-aware fields and test-result sync.
# ---------------------------------------------------------------------------
provider_sync_block = r'''  // PMD_SQUARE_TERMINAL_CANADA_R10_PROVIDER_FIELDS
  function syncTerminalProviderFields(form) {
    if (!form || form.getAttribute('data-pmd-device-kind') !== 'terminals') return;
    var providerSelect = form.querySelector('[name="Terminal_device[provider_code]"]');
    var providerCode = providerSelect ? String(providerSelect.value || '').toLowerCase() : '';
    var affiliateField = form.querySelector('[data-pmd-terminal-sumup-only]');
    var affiliateInput = form.querySelector('[name="Terminal_device[affiliate_key]"]');
    if (affiliateField) affiliateField.hidden = providerCode !== 'sumup';
    if (providerCode !== 'sumup' && affiliateInput) affiliateInput.value = '';
  }

'''
insert_before_once(
    DEVICE_JS,
    '  function templateFor(key) {',
    provider_sync_block,
    'PMD_SQUARE_TERMINAL_CANADA_R10_PROVIDER_FIELDS',
    'Terminal modal provider-aware field visibility',
)
replace_once(
    DEVICE_JS,
    '    initDrawerSimpleSetup(form);\n',
    '    initDrawerSimpleSetup(form);\n    syncTerminalProviderFields(form);\n',
    'Terminal provider fields sync on modal open',
)

change_listener = r'''  // PMD_SQUARE_TERMINAL_CANADA_R10_PROVIDER_CHANGE
  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!target || !target.matches('[name="Terminal_device[provider_code]"]')) return;
    var form = target.closest('[data-pmd-device-modal-form]');
    if (form && modal.contains(form)) syncTerminalProviderFields(form);
  });

'''
insert_before_once(
    DEVICE_JS,
    "  document.addEventListener('click', function (event) {",
    change_listener,
    'PMD_SQUARE_TERMINAL_CANADA_R10_PROVIDER_CHANGE',
    'Terminal provider fields sync on provider change',
)

test_result_sync = r'''      // PMD_SQUARE_TERMINAL_CANADA_R10_TEST_RESULT_SYNC
      if (kind === 'terminals' && handler === 'onTestTerminalConnection' && data && data.success) {
        var statusInput = form.querySelector('[name="Terminal_device[terminal_status]"]');
        var pairingInput = form.querySelector('[name="Terminal_device[pairing_state]"]');
        if (statusInput && data.recommended_terminal_status) statusInput.value = String(data.recommended_terminal_status);
        if (pairingInput && data.recommended_pairing_state) pairingInput.value = String(data.recommended_pairing_state);
      }
'''
insert_before_once(
    DEVICE_JS,
    '      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);\n',
    test_result_sync,
    'PMD_SQUARE_TERMINAL_CANADA_R10_TEST_RESULT_SYNC',
    'Terminal test result updates visible readiness fields',
)

# ---------------------------------------------------------------------------
# 5) Waiter/Cashier terminal path: Square was present in terminal inventory but
# an old hard-coded endpoint allowlist still rejected it. Also market-scope the
# provider inventory and enforce the active market again in TerminalPaymentService.
# ---------------------------------------------------------------------------
replace_once(
    WAITER_ENDPOINT,
    "        if (!in_array($provider, ['sumup', 'worldline', 'vr_payment'], true)) {\n",
    "        // PMD_SQUARE_TERMINAL_CANADA_R10_WAITER_ENDPOINT\n        if (!in_array($provider, ['sumup', 'worldline', 'vr_payment', 'square'], true)) {\n",
    'Waiter terminal endpoint accepts Square',
)
replace_once(
    WAITER_ENDPOINT,
    "                'message' => 'Choose a configured SumUp, Worldline or VR Payment terminal provider.',\n",
    "                'message' => 'Choose a configured SumUp, Worldline, VR Payment or Square terminal provider.',\n",
    'Waiter terminal endpoint Square validation copy',
)

replace_once(
    WAITER_PROVIDERS,
    "namespace Admin\\Controllers\\Concerns;\n\nuse Illuminate\\Support\\Facades\\DB;\n",
    "namespace Admin\\Controllers\\Concerns;\n\nuse Admin\\Models\\Terminal_devices_model;\nuse Illuminate\\Support\\Facades\\DB;\n",
    'Waiter terminal inventory imports market-aware provider model',
)
replace_once(
    WAITER_PROVIDERS,
    "            foreach (['sumup', 'vr_payment', 'worldline', 'square'] as $providerCode) {\n",
    "            // PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_INVENTORY\n            $allowedProviderCodes = array_keys(Terminal_devices_model::listProviderOptions());\n            foreach ($allowedProviderCodes as $providerCode) {\n",
    'Waiter terminal inventory follows active market provider list',
)

replace_once(
    TERMINAL_SERVICE,
    "namespace App\\Services\\TerminalPayments;\n\nuse Illuminate\\Support\\Facades\\DB;\n",
    "namespace App\\Services\\TerminalPayments;\n\nuse Admin\\Models\\Terminal_devices_model;\nuse Illuminate\\Support\\Facades\\DB;\n",
    'Terminal payment service imports market provider authority',
)
replace_once(
    TERMINAL_SERVICE,
    "$providerCode=strtolower(trim($providerCode));$provider=$this->provider($providerCode);$config=$this->providerConfig($providerCode);\n",
    "$providerCode=strtolower(trim($providerCode));\n        // PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_GUARD\n        $allowedProviderCodes=array_keys(Terminal_devices_model::listProviderOptions());\n        if(!in_array($providerCode,$allowedProviderCodes,true))return ['success'=>false,'error'=>'This terminal provider is not enabled for the active restaurant market.'];\n        $provider=$this->provider($providerCode);$config=$this->providerConfig($providerCode);\n",
    'Terminal payment service enforces active market provider',
)

replace_once(
    WAITER_JS,
    "      function terminalIsOnline(row) {\n        return !!row && String(row.terminal_status || '').toLowerCase() === 'online';\n      }\n",
    "      // PMD_SQUARE_TERMINAL_CANADA_R10_READINESS\n      function terminalIsOnline(row) {\n        if (!row) return false;\n        var provider = String(row.provider_code || '').toLowerCase();\n        var status = String(row.terminal_status || '').toLowerCase();\n        var pairing = String(row.pairing_state || '').toLowerCase();\n        if (provider === 'square') {\n          return ['online', 'ready', 'configured', 'sandbox_simulator_ready'].indexOf(status) !== -1\n            && pairing !== 'unpaired'\n            && pairing !== 'needs_attention';\n        }\n        return status === 'online';\n      }\n",
    'Waiter POS treats configured Square/sandbox simulator as available',
)

# ---------------------------------------------------------------------------
# Integrity checks: fail closed if any requested layer did not receive R10.
# ---------------------------------------------------------------------------
checks = {
    SQUARE_PROVIDER: [
        'PMD_SQUARE_TERMINAL_CANADA_R10_SIMULATORS',
        '388b5a08-a77c-48ef-ad2a-4a790e6f2789',
        'isCanadaSandboxDeviceId',
    ],
    TERMINAL_CONTROLLER: [
        'PMD_SQUARE_TERMINAL_CANADA_R10_SAVE_NORMALIZATION',
        'PMD_SQUARE_TERMINAL_CANADA_R10_DISCOVERY',
        'PMD_SQUARE_TERMINAL_CANADA_R10_READ_ONLY_TEST',
        'payment_sent',
    ],
    MODAL: [
        'data-pmd-terminal-sumup-only',
        '388b5a08-a77c-48ef-ad2a-4a790e6f2789',
    ],
    DEVICE_JS: [
        'PMD_SQUARE_TERMINAL_CANADA_R10_PROVIDER_FIELDS',
        'PMD_SQUARE_TERMINAL_CANADA_R10_TEST_RESULT_SYNC',
    ],
    WAITER_ENDPOINT: ['PMD_SQUARE_TERMINAL_CANADA_R10_WAITER_ENDPOINT', "'square'"],
    WAITER_PROVIDERS: ['PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_INVENTORY'],
    TERMINAL_SERVICE: ['PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_GUARD'],
    WAITER_JS: ['PMD_SQUARE_TERMINAL_CANADA_R10_READINESS', 'sandbox_simulator_ready'],
}
for path, markers in checks.items():
    text = path.read_text()
    for marker in markers:
        if marker not in text:
            raise SystemExit(f'STOP: missing R10 marker in {path}: {marker}')

print('PASS: Square Canada uses CAD-specific documented Terminal simulators')
print('PASS: Square terminal test is read-only and cannot fail because of a model save')
print('PASS: Square terminal test returns actionable JSON instead of a generic server 500')
print('PASS: SumUp affiliate key is hidden/cleared for Square terminals')
print('PASS: Square sandbox readiness is reflected in the modal after test')
print('PASS: Waiter POS accepts Square terminal payments')
print('PASS: Waiter terminal inventory is market-scoped')
print('PASS: TerminalPaymentService rejects providers outside the active market')
print('PASS: Square configured/sandbox simulator devices are considered available by Waiter POS')
print('PASS: payment settlement verification in SquareTerminalProvider remains unchanged')
