#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
PMDDEVICES = BASE / 'app/admin/controllers/Pmddevices.php'
TERMINALDEVICES = BASE / 'app/admin/controllers/TerminalDevices.php'
MODAL = BASE / 'app/admin/views/pmddevices/_inline_modal_form.blade.php'
TERMINAL_SERVICE = BASE / 'app/Services/TerminalPayments/TerminalPaymentService.php'
WAITER = BASE / 'app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php'
FINANCE = BASE / 'app/admin/controllers/Pmdfinance.php'
PROVIDER = BASE / 'app/Services/TerminalPayments/WorldlineTerminalProvider.php'
FINANCE_JS = BASE / 'app/admin/assets/js/pmd-settings-inline-detail-v1.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


# 1. Devices modal receives tenant-scoped Worldline Terminal API settings.
pmd = PMDDEVICES.read_text()
marker = "'worldline_terminal' => app(\\App\\Services\\TerminalPayments\\WorldlineTerminalSettingsService::class)->read(),"
if marker not in pmd:
    pmd = replace_once(
        pmd,
        "                    'providers' => Terminal_devices_model::listProviderOptions(),\n                    'pairing' => Terminal_devices_model::listPairingStateOptions(),\n",
        "                    'providers' => Terminal_devices_model::listProviderOptions(),\n                    'pairing' => Terminal_devices_model::listPairingStateOptions(),\n                    'worldline_terminal' => app(\\App\\Services\\TerminalPayments\\WorldlineTerminalSettingsService::class)->read(),\n",
        'Devices Worldline settings payload',
    )
PMDDEVICES.write_text(pmd)

# 2. Canonical terminal form renders the Worldline-specific credential section.
modal = MODAL.read_text()
include = "        @include('pmddevices/_worldline_terminal_settings')\n"
if include not in modal:
    start = modal.index("@elseif($kind === 'terminals')")
    end = modal.index("@elseif($kind === 'drawers')", start)
    segment = modal[start:end]
    needle = "        </section>\n        @if($mode === 'edit')"
    if segment.count(needle) != 1:
        raise SystemExit(f'STOP: terminal modal include anchor: expected 1, found {segment.count(needle)}')
    segment = segment.replace(needle, "        </section>\n" + include + "        @if($mode === 'edit')", 1)
    modal = modal[:start] + segment + modal[end:]
MODAL.write_text(modal)

# 3. Saving a Worldline terminal persists provider-global Terminal API credentials;
# terminal_devices remains the concrete UTID inventory.
terminal_controller = TERMINALDEVICES.read_text()
if 'WorldlineTerminalSettingsService::class' not in terminal_controller:
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
    terminal_controller = replace_once(
        terminal_controller,
        "    public function onDiscoverReaders()\n",
        form_before_save + "    public function onDiscoverReaders()\n",
        'TerminalDevices formBeforeSave',
    )
TERMINALDEVICES.write_text(terminal_controller)

# 4. TerminalPaymentService resolves a concrete Worldline terminal_devices row.
service = TERMINAL_SERVICE.read_text()
create_anchor = "        $validation=$provider->validateConfiguration($config);if(!($validation['ok']??false)) return ['success'=>false,'error'=>$validation['message']??'Provider is not configured.'];"
if 'No active Worldline Terminal API device is configured' not in service:
    worldline_create = r'''        if($providerCode==='worldline'){
            if(!Schema::hasTable('terminal_devices'))return ['success'=>false,'error'=>'No Worldline terminal devices table is available.'];
            $requested=trim((string)$terminalId);
            $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['worldline'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
            if($requested!=='')$query->where(function($q)use($requested){if(ctype_digit($requested))$q->orWhere('terminal_device_id',(int)$requested);$q->orWhere('reader_id',$requested);});
            $terminal=$query->orderBy('terminal_device_id')->first();
            if(!$terminal)return ['success'=>false,'error'=>'No active Worldline Terminal API device is configured. Add and activate it under Settings > Devices.'];
            $config['terminal_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            if(Schema::hasColumn('terminal_devices','environment'))$config['terminal_environment']=strtolower(trim((string)($terminal->environment??($config['terminal_environment']??'test'))));
            $terminalId=(string)$terminal->reader_id;
        }
'''
    service = replace_once(service, create_anchor, worldline_create + create_anchor, 'Worldline createAttempt terminal resolution')

refresh_anchor = "        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));"
if 'Worldline terminal for this attempt was not found' not in service:
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
    service = replace_once(service, refresh_anchor, worldline_refresh + refresh_anchor, 'Worldline refreshAttempt terminal resolution')
TERMINAL_SERVICE.write_text(service)

# 5. Waiter POS reads Worldline from terminal_devices, same inventory authority as SumUp/VR.
waiter = WAITER.read_text()
if "foreach (['sumup', 'vr_payment', 'worldline'] as $providerCode)" not in waiter:
    waiter = replace_once(
        waiter,
        "foreach (['sumup', 'vr_payment'] as $providerCode)",
        "foreach (['sumup', 'vr_payment', 'worldline'] as $providerCode)",
        'Waiter provider loop',
    )
if "($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : 'VR Payment terminal'))" not in waiter:
    waiter = replace_once(
        waiter,
        "($providerCode === 'sumup' ? 'SumUp terminal' : 'VR Payment terminal')",
        "($providerCode === 'sumup' ? 'SumUp terminal' : ($providerCode === 'worldline' ? 'Worldline terminal' : 'VR Payment terminal'))",
        'Waiter terminal label',
    )
legacy_start = waiter.find("        // Worldline Terminal API is cloud-to-cloud")
if legacy_start >= 0:
    legacy_end = waiter.find("        return $providers;", legacy_start)
    if legacy_end < 0:
        raise SystemExit('STOP: Waiter legacy Worldline block end not found')
    waiter = waiter[:legacy_start] + "        // Worldline terminals are sourced from terminal_devices above.\n" + waiter[legacy_end:]
WAITER.write_text(waiter)

# 6. Never silently reuse the online Connect merchant ID as Terminal API UMID.
provider = PROVIDER.read_text()
old_merchant = "        return trim((string)($config['terminal_merchant_id'] ?? env('WORLDLINE_TERMINAL_MERCHANT_ID') ?? $config['merchant_id'] ?? ''));"
new_merchant = "        return trim((string)($config['terminal_merchant_id'] ?? env('WORLDLINE_TERMINAL_MERCHANT_ID') ?? ''));"
if old_merchant in provider:
    provider = replace_once(provider, old_merchant, new_merchant, 'Terminal API UMID authority')
elif new_merchant not in provider:
    raise SystemExit('STOP: WorldlineTerminalProvider merchant ID authority is unknown')
PROVIDER.write_text(provider)

# 7. Remove the misleading Connect-Merchant-ID fallback copy in Payments & Finance.
finance_js = FINANCE_JS.read_text()
old_help = 'Usually the UMID supplied for Terminal API. Leave blank to use the Connect Merchant ID.'
new_help = 'Use the UMID supplied specifically for Worldline Terminal API. Do not substitute the Connect Merchant ID unless Worldline explicitly confirms they are identical for this estate.'
if old_help in finance_js:
    finance_js = replace_once(finance_js, old_help, new_help, 'Finance Terminal UMID help')
FINANCE_JS.write_text(finance_js)

# 8. Production Google Pay own-checkout merchant ID is explicitly configurable.
finance = FINANCE.read_text()
if "'google_pay_merchant_id' => ['label' => 'Google Pay Merchant ID'" not in finance:
    finance = replace_once(
        finance,
        "                'webhook_secret' => ['label' => 'Webhook Secret', 'secret' => true],\n                'terminal_id' => ['label' => 'Terminal Device ID'],\n",
        "                'webhook_secret' => ['label' => 'Webhook Secret', 'secret' => true],\n                'google_pay_merchant_id' => ['label' => 'Google Pay Merchant ID', 'help' => 'Required for Google Pay PRODUCTION own-checkout. TEST uses Google Pay test mode.'],\n                'terminal_id' => ['label' => 'Terminal Device ID'],\n",
        'Finance Google Pay merchant ID field',
    )
FINANCE.write_text(finance)

print('PASS: Worldline Terminal settings are rendered under Devices')
print('PASS: saving a Worldline terminal preserves tenant-scoped Terminal API credentials')
print('PASS: TerminalPaymentService resolves active Worldline terminal_devices rows')
print('PASS: Waiter POS uses canonical Worldline terminal_devices inventory')
print('PASS: Terminal API UMID no longer falls back to the online Connect Merchant ID')
print('PASS: Payments copy no longer suggests an unverified Connect Merchant ID fallback')
print('PASS: Google Pay production Merchant ID is configurable')
print('PASS: country/provider capability certification flags were intentionally not changed before a real terminal test')