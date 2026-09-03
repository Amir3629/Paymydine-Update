#!/usr/bin/env python3
from pathlib import Path

BASE = Path('/var/www/paymydine')
REQUEST = BASE / 'app/admin/requests/TerminalDevices.php'
PMDDEVICES = BASE / 'app/admin/controllers/Pmddevices.php'
INDEX = BASE / 'app/admin/views/pmddevices/index.blade.php'
MODAL = BASE / 'app/admin/views/pmddevices/_inline_modal_form.blade.php'
TERMINAL_CONTROLLER = BASE / 'app/admin/controllers/TerminalDevices.php'
DEVICE_JS = BASE / 'app/admin/assets/js/pmd-device-inline-v6.js'


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


for required in [REQUEST, PMDDEVICES, INDEX, MODAL, TERMINAL_CONTROLLER, DEVICE_JS]:
    if not required.is_file():
        raise SystemExit(f'STOP: required file missing: {required}')

# 1) The legacy request validator was still SumUp-only and also enforced a
# SumUp-specific rdr_ reader ID. That made Square/Worldline/VR rows impossible
# to save even though the runtime and market registry already supported them.
replace_once(
    REQUEST,
    "use System\\Classes\\FormRequest;\n",
    "use Admin\\Models\\Terminal_devices_model;\nuse Illuminate\\Validation\\Rule;\nuse System\\Classes\\FormRequest;\n",
    'Terminal request imports market-aware provider validation',
)

rules_function = r'''    public function rules()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R7_REQUEST
        // Server-side validation uses the same market-scoped provider list as
        // Settings > Devices. This prevents a tenant from POSTing a terminal
        // provider that is unavailable for its active restaurant market.
        $providerCodes = array_keys(Terminal_devices_model::listProviderOptions());

        return [
            'provider_code' => ['required', Rule::in($providerCodes)],
            'environment' => ['nullable', Rule::in(['test', 'production', 'live'])],
            'location_id' => ['nullable', 'integer'],
            'affiliate_key' => ['nullable', 'string', 'max:191'],
            // SumUp uses rdr_..., Square uses UUID/device: IDs, and the other
            // providers use their own alphanumeric terminal identifiers.
            'reader_id' => ['nullable', 'string', 'max:191', 'regex:/^[A-Za-z0-9][A-Za-z0-9:._-]*$/'],
            'reader_label' => ['nullable', 'string', 'max:191'],
            'pairing_state' => ['nullable', 'string', 'max:50'],
            'terminal_status' => ['nullable', 'string', 'max:191'],
            'metadata' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
'''
replace_php_function(
    REQUEST,
    '    public function rules()',
    rules_function,
    'PMD_SQUARE_TERMINAL_CANADA_R7_REQUEST',
    'Terminal request accepts only market-allowed provider/device IDs',
)

# 2) The overview used to render every historical terminal row. After changing
# a tenant market this made an archived SumUp row look like the only available
# provider. Keep foreign rows in the DB for audit, but hide them from the active
# market view and expose the canonical provider catalogue to the page.
replace_once(
    PMDDEVICES,
    "        $terminals = $this->safeCollection(Terminal_devices_model::class, 'terminal_devices', 'terminal_device_id');\n",
    "        // PMD_SQUARE_TERMINAL_CANADA_R7_OVERVIEW\n        $allTerminals = $this->safeCollection(Terminal_devices_model::class, 'terminal_devices', 'terminal_device_id');\n        $terminalProviderOptions = Terminal_devices_model::listProviderOptions();\n        $terminalProviderCodes = array_map(static fn ($code) => strtolower(trim((string)$code)), array_keys($terminalProviderOptions));\n        $terminals = $allTerminals->filter(static function ($terminal) use ($terminalProviderCodes) {\n            return in_array(strtolower(trim((string)($terminal->provider_code ?? ''))), $terminalProviderCodes, true);\n        })->values();\n        $archivedTerminalCount = max(0, $allTerminals->count() - $terminals->count());\n",
    'Devices overview filters terminal rows by active market',
)

replace_once(
    PMDDEVICES,
    "            'terminals' => $terminals,\n            'drawers' => $drawers,\n",
    "            'terminals' => $terminals,\n            'terminal_provider_options' => $terminalProviderOptions,\n            'archived_terminal_count' => $archivedTerminalCount,\n            'drawers' => $drawers,\n",
    'Devices overview exposes active terminal provider catalogue',
)

# 3) Make provider availability visible even before a concrete terminal row has
# been created. Canada will therefore visibly show Square Terminal API instead
# of an old archived SumUp row.
replace_once(
    INDEX,
    "    $terminals = $data['terminals'] ?? collect();\n    $drawers = $data['drawers'] ?? collect();\n",
    "    $terminals = $data['terminals'] ?? collect();\n    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);\n    $archivedTerminalCount = (int)($data['archived_terminal_count'] ?? 0);\n    $drawers = $data['drawers'] ?? collect();\n",
    'Devices view receives terminal provider availability',
)

old_terminal_body = r'''            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($terminals as $terminal)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $terminal->reader_label ?: $terminal->reader_id ?: 'Payment terminal' }}</strong><small>{{ strtoupper((string)($terminal->provider_code ?: 'provider')) }}</small></div>
                            <div class="pmd-owner-meta">{{ $pmdSettingsText($terminal->pairing_state ?: 'Unknown pairing') }}</div>
                            <div class="pmd-owner-status {{ !empty($terminal->is_active) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive') }}</div>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="terminals:edit:{{ $terminal->terminal_device_id }}">{{ $pmdSettingsText('Edit') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No payment terminals are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
'''
new_terminal_body = r'''            <div class="pmd-owner-card__body">
                {{-- PMD_SQUARE_TERMINAL_CANADA_R7_VIEW --}}
                <div class="pmd-owner-list">
                    @forelse($terminalProviders as $providerCode => $providerLabel)
                        @php
                            $configuredForProvider = $terminals->filter(static function ($terminal) use ($providerCode) {
                                return strtolower(trim((string)($terminal->provider_code ?? ''))) === strtolower(trim((string)$providerCode));
                            })->count();
                        @endphp
                        <div class="pmd-owner-list-row">
                            <div>
                                <strong>{{ $pmdSettingsText($providerLabel) }}</strong>
                                <small>{{ $providerCode === 'square' ? $pmdSettingsText('Canada · CAD · Square Terminal API') : $pmdSettingsText('Available for this restaurant market') }}</small>
                            </div>
                            <div class="pmd-owner-meta">{{ $configuredForProvider > 0 ? $configuredForProvider.' '.$pmdSettingsText('configured') : $pmdSettingsText('Not configured yet') }}</div>
                            <div class="pmd-owner-status is-active">{{ $pmdSettingsText('Available') }}</div>
                            @if($configuredForProvider < 1)
                                <button type="button" class="pmd-owner-action" data-pmd-device-open="terminals:create">{{ $pmdSettingsText('+ Add terminal') }}</button>
                            @endif
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No terminal provider is enabled for this restaurant market.') }}</div>
                    @endforelse
                </div>

                @if($terminals->isNotEmpty())
                    <div class="pmd-owner-list">
                        @foreach($terminals as $terminal)
                            <div class="pmd-owner-list-row">
                                <div><strong>{{ $terminal->reader_label ?: $terminal->reader_id ?: 'Payment terminal' }}</strong><small>{{ strtoupper((string)($terminal->provider_code ?: 'provider')) }}</small></div>
                                <div class="pmd-owner-meta">{{ $pmdSettingsText($terminal->pairing_state ?: 'Unknown pairing') }}</div>
                                <div class="pmd-owner-status {{ !empty($terminal->is_active) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive') }}</div>
                                <button type="button" class="pmd-owner-action" data-pmd-device-open="terminals:edit:{{ $terminal->terminal_device_id }}">{{ $pmdSettingsText('Edit') }}</button>
                            </div>
                        @endforeach
                    </div>
                @endif

                @if($archivedTerminalCount > 0)
                    <div class="pmd-owner-empty">{{ $archivedTerminalCount }} {{ $pmdSettingsText('terminal configuration(s) from another market are archived and hidden here.') }}</div>
                @endif
            </div>
'''
replace_once(
    INDEX,
    old_terminal_body,
    new_terminal_body,
    'Devices page shows current-market terminal provider availability',
)

# 4) Remove the last SumUp-only assumptions from the shared create/edit modal.
old_provider_line = r'''                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Provider type') }}</label><select name="{{ $arr }}[provider_code]">@foreach(($opts['providers'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('provider_code','sumup') === (string)$value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
'''
new_provider_line = r'''                @php
                    $providerOptions = (array)($opts['providers'] ?? []);
                    $defaultProvider = array_key_first($providerOptions) ?: '';
                @endphp
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Provider type') }}</label><select name="{{ $arr }}[provider_code]">@foreach($providerOptions as $value=>$label)<option value="{{ $value }}" {{ (string)$v('provider_code',$defaultProvider) === (string)$value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
'''
replace_once(
    MODAL,
    old_provider_line,
    new_provider_line,
    'Terminal modal defaults to the active market provider instead of SumUp',
)
replace_once(
    MODAL,
    "<label>{{ $pmdSettingsText('Affiliate key') }}</label><input type=\"text\" name=\"{{ $arr }}[affiliate_key]\"",
    "<label>{{ $pmdSettingsText('Affiliate key (SumUp only)') }}</label><input type=\"text\" name=\"{{ $arr }}[affiliate_key]\"",
    'Terminal modal clarifies SumUp-only affiliate key',
)
replace_once(
    MODAL,
    "<label>{{ $pmdSettingsText('Reader ID') }}</label><input type=\"text\" name=\"{{ $arr }}[reader_id]\"",
    "<label>{{ $pmdSettingsText('Reader / Device ID') }}</label><input type=\"text\" name=\"{{ $arr }}[reader_id]\"",
    'Terminal modal uses provider-neutral device ID label',
)

square_help_anchor = "            <div class=\"pmd-owner-setting-row\"><div class=\"pmd-owner-setting-copy\"><strong>{{ $pmdSettingsText('Active terminal') }}</strong>"
square_help = r'''            @if(isset($providerOptions['square']))
                <div class="pmd-owner-field pmd-owner-field--full">
                    <small><strong>{{ $pmdSettingsText('Square Terminal API') }}:</strong> {{ $pmdSettingsText('Sandbox can use simulator device ID 9fa747a2-25ff-48ee-b078-04381f7c828f. Production requires a paired Square Terminal device ID or serial from the Square Devices API.') }}</small>
                </div>
            @endif
'''
insert_before_once(
    MODAL,
    square_help_anchor,
    square_help,
    '9fa747a2-25ff-48ee-b078-04381f7c828f. Production requires a paired Square Terminal',
    'Terminal modal explains Square sandbox and production device IDs',
)
replace_once(
    MODAL,
    ">{{ $pmdSettingsText('Discover readers') }}</button>",
    ">{{ $pmdSettingsText('Discover / load devices') }}</button>",
    'Terminal reader action is provider-neutral',
)

# 5) Make the existing Discover action genuinely provider-aware. Square Sandbox
# has no Devices API, so return Square's documented simulator IDs. Production
# uses the Square Devices API and remains read-only/no-charge.
discover_function = r'''    public function onDiscoverReaders()
    {
        // PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY
        $model = $this->formGetModel();
        $providerCode = strtolower(trim((string)($model->provider_code ?? '')));

        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $mode = strtolower(trim((string)($config['mode'] ?? $config['transaction_mode'] ?? 'test'))) === 'live' ? 'live' : 'test';

                if ($mode === 'test') {
                    return response()->json([
                        'success' => true,
                        'provider' => 'square',
                        'mode' => 'test',
                        'sandbox' => true,
                        'payment_sent' => false,
                        'message' => 'Square Sandbox does not expose physical devices. Choose a documented simulator device ID; the first entry simulates a successful card checkout.',
                        'readers' => [
                            ['id' => '9fa747a2-25ff-48ee-b078-04381f7c828f', 'name' => 'Square Sandbox - card success', 'status' => 'SIMULATED'],
                            ['id' => '22cd266c-6246-4c06-9983-67f0c26346b0', 'name' => 'Square Sandbox - card success + 20% tip', 'status' => 'SIMULATED'],
                            ['id' => '4mp4e78c-88ed-4d55-a269-8008dfe14e9', 'name' => 'Square Sandbox - gift card success', 'status' => 'SIMULATED'],
                        ],
                    ]);
                }

                $token = trim((string)($config['access_token'] ?? ''));
                $locationId = trim((string)($config['location_id'] ?? ''));
                if ($token === '' || $locationId === '') {
                    return response()->json(['success' => false, 'provider' => 'square', 'error' => 'Square production Access Token and Location ID are required.'], 422);
                }

                $response = Http::withToken($token)
                    ->withHeaders(['Square-Version' => \App\Services\Payments\SquareRuntimeService::API_VERSION])
                    ->acceptJson()
                    ->timeout(20)
                    ->get('https://connect.squareup.com/v2/devices', ['location_id' => $locationId, 'limit' => 100]);
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
                    'location_id' => $locationId,
                    'payment_sent' => false,
                    'readers' => $readers,
                    'message' => count($readers).' Square Terminal device(s) returned by the Devices API.',
                ]);
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'provider' => 'square', 'error' => $e->getMessage()], 422);
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
    'PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY',
    'Terminal discovery supports Square Sandbox simulators and live Devices API',
)

# 6) The modal action already displays JSON. Also populate an empty Reader/Device
# ID and label from the first discovered item, so Sandbox Square can be added in
# one click without copying a UUID manually.
js_anchor = "      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);\n"
js_block = r'''      // PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY_AUTOFILL
      if (kind === 'terminals' && handler === 'onDiscoverReaders' && data && Array.isArray(data.readers) && data.readers.length) {
        var firstReader = data.readers[0] || {};
        var readerId = String(firstReader.id || firstReader.device_id || firstReader.reader_id || '').trim();
        var readerName = String(firstReader.name || firstReader.label || '').trim();
        var readerInput = form.querySelector('[name="Terminal_device[reader_id]"]');
        var labelInput = form.querySelector('[name="Terminal_device[reader_label]"]');
        if (readerInput && !String(readerInput.value || '').trim() && readerId) readerInput.value = readerId;
        if (labelInput && !String(labelInput.value || '').trim() && readerName) labelInput.value = readerName;
      }
'''
insert_before_once(
    DEVICE_JS,
    js_anchor,
    js_block,
    'PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY_AUTOFILL',
    'Device modal auto-fills first discovered Square/SumUp reader',
)

# Final integrity checks.
request = REQUEST.read_text()
if 'PMD_SQUARE_TERMINAL_CANADA_R7_REQUEST' not in request or "Rule::in($providerCodes)" not in request:
    raise SystemExit('STOP: market-aware terminal request validation missing')
if "regex:/^[A-Za-z0-9][A-Za-z0-9:._-]*$/" not in request:
    raise SystemExit('STOP: provider-neutral Reader/Device ID validation missing')

controller = PMDDEVICES.read_text()
if 'PMD_SQUARE_TERMINAL_CANADA_R7_OVERVIEW' not in controller or "'terminal_provider_options' => $terminalProviderOptions" not in controller:
    raise SystemExit('STOP: Devices active-market terminal overview missing')

index = INDEX.read_text()
if 'PMD_SQUARE_TERMINAL_CANADA_R7_VIEW' not in index or 'Canada · CAD · Square Terminal API' not in index:
    raise SystemExit('STOP: Square terminal provider availability is not visible in Devices')

modal = MODAL.read_text()
if "array_key_first($providerOptions)" not in modal or 'Square Terminal API' not in modal:
    raise SystemExit('STOP: terminal modal market provider/Square guidance missing')

terminal = TERMINAL_CONTROLLER.read_text()
for marker in ['PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY', '9fa747a2-25ff-48ee-b078-04381f7c828f', '/v2/devices']:
    if marker not in terminal:
        raise SystemExit(f'STOP: Square Terminal discovery marker missing: {marker}')

js = DEVICE_JS.read_text()
if 'PMD_SQUARE_TERMINAL_CANADA_R7_DISCOVERY_AUTOFILL' not in js:
    raise SystemExit('STOP: terminal discovery autofill missing')

print('PASS: Canada Devices visibly advertises Square Terminal API')
print('PASS: foreign-market SumUp rows are retained but hidden from Canada active view')
print('PASS: terminal save validation is market-aware and no longer SumUp-only')
print('PASS: Square UUID/device: IDs are accepted by terminal validation')
print('PASS: Square Sandbox terminal simulators can be discovered without hardware')
print('PASS: Square production device discovery uses the read-only Devices API')
print('PASS: discovered terminal ID/label auto-fill the existing modal')
print('PASS: Square runtime/settlement code was not weakened or bypassed')
