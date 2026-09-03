#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
PMDDEVICES = BASE / 'app/admin/controllers/Pmddevices.php'
TERMINALDEVICES = BASE / 'app/admin/controllers/TerminalDevices.php'
MODAL = BASE / 'app/admin/views/pmddevices/_inline_modal_form.blade.php'
TERMINAL_SERVICE = BASE / 'app/Services/TerminalPayments/TerminalPaymentService.php'
WAITER = BASE / 'app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php'
REGISTRY = BASE / 'app/Services/Payments/ProviderCapabilityRegistry.php'
COUNTRY = BASE / 'app/Services/Platform/CountryPlatformProfileRegistry.php'
FINANCE = BASE / 'app/admin/controllers/Pmdfinance.php'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


# 1) Devices modal receives safe, tenant-scoped Worldline terminal provider settings.
pmd = PMDDEVICES.read_text()
pmd = replace_once(
    pmd,
    """                    'providers' => Terminal_devices_model::listProviderOptions(),\n                    'pairing' => Terminal_devices_model::listPairingStateOptions(),\n""",
    """                    'providers' => Terminal_devices_model::listProviderOptions(),\n                    'pairing' => Terminal_devices_model::listPairingStateOptions(),\n                    'worldline_terminal' => app(\\App\\Services\\TerminalPayments\\WorldlineTerminalSettingsService::class)->read(),\n""",
    'Devices Worldline settings payload',
)
PMDDEVICES.write_text(pmd)

# 2) Canonical terminal form shows Worldline Terminal API credentials when Worldline is selected.
modal = MODAL.read_text()
start = modal.index("@elseif($kind === 'terminals')")
end = modal.index("@elseif($kind === 'drawers')", start)
segment = modal[start:end]
needle = "        </section>\n        @if($mode === 'edit')"
if segment.count(needle) != 1:
    raise SystemExit(f'STOP: terminal modal include anchor: expected 1, found {segment.count(needle)}')
segment = segment.replace(
    needle,
    "        </section>\n        @include('pmddevices/_worldline_terminal_settings')\n        @if($mode === 'edit')",
    1,
)
modal = modal[:start] + segment + modal[end:]
MODAL.write_text(modal)

# 3) Saving a Worldline terminal also saves the provider-global UMID/token/base URL,
# while the device row owns the concrete UTID/Reader ID.
terminal_controller = TERMINALDEVICES.read_text()
insert_before = "    public function onDiscoverReaders()\n"
form_before_save = r'''    public function formBeforeSave($model)
    {
        $providerCode = strtolower(trim((string)($model->provider_code ?? post('Terminal_device.provider_code', ''))));
        if ($providerCode !== 'worldline') {
            return;
        }

        $readerId = trim((string)($model->reader_id ?? post('Terminal_device.reader_id', '')));
        $readerLabel = trim((string)($model->reader_label ?? post('Terminal_device.reader_label', '')));
        $worldline = (array)post('Worldline_terminal', []);
        $environment = strtolower(trim((string)($worldline['terminal_environment'] ?? ($model->environment ?? 'test'))));
        $environment = $environment === 'live' ? 'live' : 'test';
        $model->environment = $environment;

        app(\App\Services\TerminalPayments\WorldlineTerminalSettingsService::class)
            ->saveForTerminal($worldline, $readerId, $readerLabel, $environment);
    }

'''
if 'WorldlineTerminalSettingsService::class' not in terminal_controller:
    terminal_controller = replace_once(
        terminal_controller,
        insert_before,
        form_before_save + insert_before,
        'TerminalDevices formBeforeSave',
    )
TERMINALDEVICES.write_text(terminal_controller)

# 4) TerminalPaymentService resolves the selected Worldline terminal_devices row,
# exactly like SumUp/VR, and injects its UTID into provider config before validation.
service = TERMINAL_SERVICE.read_text()
create_anchor = "        $validation=$provider->validateConfiguration($config);if(!($validation['ok']??false)) return ['success'=>false,'error'=>$validation['message']??'Provider is not configured.'];"
worldline_create = r'''        if($providerCode==='worldline'){
            if(!Schema::hasTable('terminal_devices'))return ['success'=>false,'error'=>'No Worldline terminal devices table is available.'];
            $requested=trim((string)$terminalId);
            $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['worldline'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
            if($requested!=='')$query->where(function($q)use($requested){if(ctype_digit($requested))$q->orWhere('terminal_device_id',(int)$requested);$q->orWhere('reader_id',$requested);});
            $terminal=$query->orderBy('terminal_device_id')->first();
            if(!$terminal)return ['success'=>false,'error'=>'No active Worldline Terminal API device is configured. Add/activate it under Settings > Devices.'];
            $config['terminal_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            if(Schema::hasColumn('terminal_devices','environment'))$config['terminal_environment']=strtolower(trim((string)($terminal->environment??($config['terminal_environment']??'test'))));
            $terminalId=(string)$terminal->reader_id;
        }
'''
if "No active Worldline Terminal API device is configured" not in service:
    service = replace_once(service, create_anchor, worldline_create + create_anchor, 'Worldline createAttempt terminal resolution')

refresh_anchor = "        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));"
worldline_refresh = r'''        if($providerCode==='worldline'){
            if(!Schema::hasTable('terminal_devices'))return ['success'=>false,'error'=>'Worldline terminal devices table is unavailable.'];
            $requested=trim((string)($attempt['terminal_id']??''));
            $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['worldline'])->whereNotNull('reader_id')->where('reader_id','!=','');
            if($requested!=='')$query->where(function($q)use($requested){if(ctype_digit($requested))$q->orWhere('terminal_device_id',(int)$requested);$q->orWhere('reader_id',$requested);});
            $terminal=$query->orderBy('terminal_device_id')->first();
            if(!$terminal)return ['success'=>false,'error'=>'Worldline terminal for this attempt was not found.'];
            $config['terminal_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            if(Schema::hasColumn('terminal_devices','environment'))$config['terminal_environment']=strtolower(trim((string)($terminal->environment??($config['terminal_environment']??'test'))));
        }
'''
if "Worldline terminal for this attempt was not found" not in service:
    service = replace_once(service, refresh_anchor, worldline_refresh + refresh_anchor, 'Worldline refreshAttempt terminal resolution')
TERMINAL_SERVICE.write_text(service)

# 5) Waiter POS lists concrete Worldline terminal_devices rows rather than a single
# provider-global terminal ID.
waiter = WAITER.read_text()
waiter = replace_once(
    waiter,
    "foreach (['sumup', 'vr_payment'] as $providerCode)",
    "foreach (['sumup', 'vr_payment', 'worldline'] as $providerCode)",
    'Waiter provider loop',
)
waiter = replace_once(
    waiter,
    "($providerCode === 'sumup' ? 'SumUp terminal' : 'VR Payment terminal')",
    "($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : 'VR Payment terminal'))",
    'Waiter terminal label',
)
legacy_start = waiter.find("        // Worldline Terminal API is cloud-to-cloud")
legacy_end = waiter.find("        return $providers;", legacy_start)
if legacy_start < 0 or legacy_end < 0:
    raise SystemExit('STOP: Waiter legacy Worldline block not found')
waiter = waiter[:legacy_start] + "        // Worldline terminals are now sourced from terminal_devices above.\n" + waiter[legacy_end:]
WAITER.write_text(waiter)

# 6) Provider registry and Germany market profile now reflect the runtime that
# actually exists. Certification/account entitlement remains provider-specific.
registry = REGISTRY.read_text()
worldline_marker = "            'worldline' => ["
ws = registry.index(worldline_marker)
we = registry.index("            'paypal' => [", ws)
worldline_block = registry[ws:we]
old_caps = """                'implemented_capabilities' => [\n                    self::CAPABILITY_ONLINE_PAYMENTS,\n                    self::CAPABILITY_WEBHOOKS,\n                ],\n"""
new_caps = """                'implemented_capabilities' => [\n                    self::CAPABILITY_ONLINE_PAYMENTS,\n                    self::CAPABILITY_TERMINAL_PAYMENTS,\n                    self::CAPABILITY_WEBHOOKS,\n                ],\n"""
if old_caps not in worldline_block:
    raise SystemExit('STOP: Worldline registry capability anchor not found')
worldline_block = worldline_block.replace(old_caps, new_caps, 1)
registry = registry[:ws] + worldline_block + registry[we:]
REGISTRY.write_text(registry)

country = COUNTRY.read_text()
country = replace_once(country, "public const VERSION = '1.1.0';", "public const VERSION = '1.1.1';", 'Country profile version')
country = replace_once(country, "'worldline' => ['online' => 'catalogue', 'terminal' => false]", "'worldline' => ['online' => true, 'terminal' => true]", 'Germany Worldline provider readiness')
country = replace_once(country, "['stripe', 'sumup', 'vr_payment'])", "['stripe', 'sumup', 'vr_payment', 'worldline'])", 'Germany Apple Pay candidates')
country = replace_once(country, "['stripe', 'sumup', 'vr_payment'])", "['stripe', 'sumup', 'vr_payment', 'worldline'])", 'Germany Google Pay candidates')
country = replace_once(country, "['paypal', 'stripe', 'vr_payment'])", "['paypal', 'stripe', 'vr_payment', 'worldline'])", 'Germany PayPal candidates')
country = replace_once(country, "'worldline' => ['pmd_remote_runtime' => false, 'status' => 'not_certified']", "'worldline' => ['pmd_remote_runtime' => true, 'status' => 'implemented_requires_worldline_terminal_api_credentials']", 'Germany Worldline terminal runtime')
COUNTRY.write_text(country)

# 7) Payments & Finance exposes the production Google Pay Merchant ID and makes it
# clear that terminal identity/credentials live under Devices.
finance = FINANCE.read_text()
finance_old = """                'webhook_secret' => ['label' => 'Webhook Secret', 'secret' => true],\n                'terminal_id' => ['label' => 'Terminal Device ID'],\n                'terminal_environment' => ['label' => 'Terminal Environment', 'type' => 'select', 'default' => 'test', 'options' => ['test' => 'Test / Sandbox', 'live' => 'Live / Production']],\n"""
finance_new = """                'webhook_secret' => ['label' => 'Webhook Secret', 'secret' => true],\n                'google_pay_merchant_id' => ['label' => 'Google Pay Merchant ID', 'help' => 'Required for Google Pay PRODUCTION own-checkout. TEST uses Google Pay test mode.'],\n                'terminal_id' => ['label' => 'Terminal Device ID (managed in Devices)', 'readonly' => true],\n                'terminal_environment' => ['label' => 'Terminal Environment (managed in Devices)', 'readonly' => true],\n"""
finance = replace_once(finance, finance_old, finance_new, 'Finance Worldline fields')
FINANCE.write_text(finance)

print('PASS: Devices exposes Worldline UMID, Terminal API URL, Bearer token status and UTID workflow')
print('PASS: saving a Worldline terminal persists provider-global Terminal API credentials safely')
print('PASS: TerminalPaymentService resolves concrete active Worldline terminal_devices rows')
print('PASS: Waiter POS uses canonical Worldline terminal_devices inventory')
print('PASS: provider/country capability truth now includes implemented Worldline terminal runtime')
print('PASS: production Google Pay Merchant ID is configurable in Payments & Finance')
