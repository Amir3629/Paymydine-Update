@php
    $page = $page ?? [];
    $kind = $kind ?? ($page['kind'] ?? '');
    $mode = $mode ?? 'create';
    $record = $record ?? ($page['record'] ?? null);
    $recordId = $recordId ?? null;
    $opts = $page['options'] ?? [];
    $arr = $page['array_name'] ?? '';
    $v = function ($key, $default = '') use ($record) {
        if (!$record) return $default;
        $value = data_get($record, $key, $default);
        return $value === null ? $default : $value;
    };
    $selectedValues = function ($value) {
        if (is_array($value)) return array_map('strval', $value);
        if ($value instanceof \Illuminate\Support\Collection) return array_map('strval', $value->all());
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') return [];
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) return array_map('strval', $decoded);
            return array_values(array_filter(array_map('trim', explode(',', $trimmed)), fn($x) => $x !== ''));
        }
        return $value === null ? [] : [(string)$value];
    };
    $titles = [
        'kds' => $mode === 'create' ? 'Create KDS station' : 'Edit KDS station',
        'terminals' => $mode === 'create' ? 'Create payment terminal' : 'Edit payment terminal',
        'drawers' => $mode === 'create' ? 'Create cash drawer' : 'Edit cash drawer',
        'biometric' => $mode === 'create' ? 'Create biometric device' : 'Edit biometric device',
        'integrations' => $mode === 'create' ? 'Create POS integration' : 'Edit POS integration',
        'pos' => 'POS device details',
    ];
    $backendUrl = null;
    $saveHandler = 'onSave';
    if ($kind === 'kds') {
        $backendUrl = $mode === 'create' ? admin_url('kds_stations/create') : admin_url('kds_stations/edit/'.$recordId);
        $saveHandler = 'onPmdDeviceNativeSaveV4';
    } elseif ($kind === 'terminals') {
        $backendUrl = $mode === 'create' ? admin_url('terminal_devices/create') : admin_url('terminal_devices/edit/'.$recordId);
    } elseif ($kind === 'drawers') {
        $backendUrl = $mode === 'create' ? admin_url('cash_drawers/create') : admin_url('cash_drawers/edit/'.$recordId);
    } elseif ($kind === 'biometric') {
        $backendUrl = $mode === 'create' ? admin_url('biometric_devices/create') : admin_url('biometric_devices/edit/'.$recordId);
    } elseif ($kind === 'integrations') {
        $backendUrl = $mode === 'create' ? admin_url('pos_configs/create') : admin_url('pos_configs/edit/'.$recordId);
    }
@endphp

@if($kind === 'pos')
    <div class="pmd-device-v6-detail" data-pmd-device-modal-form data-pmd-device-kind="pos" data-pmd-device-mode="view" data-pmd-modal-title="{{ $titles['pos'] }}">
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>POS device</h3><p>Connection and runtime details already known to PayMyDine.</p></div>
            <div class="pmd-device-v6-kv-grid">
                <div><span>Name</span><strong>{{ $v('name', $v('code','POS device')) }}</strong></div>
                <div><span>Code</span><strong>{{ $v('code','—') }}</strong></div>
                <div><span>Type</span><strong>{{ $v('device_type','POS') }}</strong></div>
                <div><span>Status</span><strong>{{ $v('device_status','Configured') }}</strong></div>
                <div class="pmd-device-v6-kv-full"><span>Description</span><strong>{{ $v('description','—') }}</strong></div>
            </div>
        </section>
    </div>
@else
<form class="pmd-device-v6-form" data-pmd-device-modal-form data-pmd-device-kind="{{ $kind }}" data-pmd-device-mode="{{ $mode }}" data-pmd-device-record-id="{{ $recordId }}" data-pmd-modal-title="{{ $titles[$kind] ?? 'Device settings' }}" data-pmd-backend-url="{{ $backendUrl }}" data-pmd-save-handler="{{ $saveHandler }}">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">

    @if($kind === 'kds')
        {{-- PMD_KDS_MINIMAL_STATION_V1_1: only station name and category routing are user-configurable. --}}
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head pmd-device-v6-section__head--actions">
                <div><h3>Basic information</h3><p>Name this kitchen display.</p></div>
                @if($mode === 'edit' && !empty($record->slug))
                    <a class="pmd-owner-action" href="{{ admin_url('kitchendisplay/'.$record->slug) }}" target="_blank" rel="noopener">Open KDS display</a>
                @endif
            </div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field pmd-owner-field--full"><label>Station name</label><input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required><small>Example: Main Kitchen, Bar, Grill, Dessert or Pass / Expo.</small></div>
            </div>
        </section>

        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Routing</h3><p>Choose which menu categories reach this KDS.</p></div>
            @php $selectedCategories = $selectedValues($v('category_ids',[])); @endphp
            <div class="pmd-owner-field"><label>Assigned menu categories</label><div class="pmd-device-v6-check-grid">@foreach(($opts['categories'] ?? []) as $value=>$label)<label class="pmd-device-v6-check"><input type="checkbox" name="{{ $arr }}[category_ids][]" value="{{ $value }}" {{ in_array((string)$value,$selectedCategories,true) ? 'checked' : '' }}><span>{{ $label }}</span></label>@endforeach</div><small>Leave empty to receive all categories.</small></div>
        </section>

    @elseif($kind === 'terminals')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Terminal connection</h3><p>Provider, reader identity, pairing and readiness.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>Provider type</label><select name="{{ $arr }}[provider_code]">@foreach(($opts['providers'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('provider_code','sumup') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>

                <div class="pmd-owner-field"><label>Affiliate key</label><input type="text" name="{{ $arr }}[affiliate_key]" value="{{ $v('affiliate_key') }}"></div>
                <div class="pmd-owner-field"><label>Reader ID</label><input type="text" name="{{ $arr }}[reader_id]" value="{{ $v('reader_id') }}"></div>
                <div class="pmd-owner-field"><label>Reader label</label><input type="text" name="{{ $arr }}[reader_label]" value="{{ $v('reader_label') }}"></div>
                <div class="pmd-owner-field"><label>Pairing state</label><select name="{{ $arr }}[pairing_state]">@foreach(($opts['pairing'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('pairing_state','unknown') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>Terminal status</label><input type="text" name="{{ $arr }}[terminal_status]" value="{{ $v('terminal_status') }}"></div>
                <div class="pmd-owner-field pmd-owner-field--full"><label>Metadata (JSON)</label><textarea name="{{ $arr }}[metadata]">{{ is_array($v('metadata',[])) ? json_encode($v('metadata',[]), JSON_PRETTY_PRINT) : $v('metadata') }}</textarea><small>Optional diagnostic metadata for this terminal device.</small></div>
            </div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Active terminal</strong><small>Inactive terminals stay configured but are not offered for payments.</small></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[is_active]" value="0"><input type="checkbox" name="{{ $arr }}[is_active]" value="1" {{ $v('is_active',1) ? 'checked' : '' }}><span></span></label></div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>Reader tools</h3><p>Discover and test card readers without leaving this page.</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onDiscoverReaders">Discover readers</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onTestTerminalConnection">Test terminal connection</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif

    @elseif($kind === 'drawers')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Drawer setup</h3><p>Local POS mapping, printer and automatic cash opening.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>Drawer name</label><input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required></div>

                <div class="pmd-owner-field"><label>Local POS terminal</label><select name="{{ $arr }}[local_pos_device_id]"><option value="">None</option>@foreach(($opts['local_pos'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('local_pos_device_id') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>Printer device</label><select name="{{ $arr }}[printer_id]"><option value="">None</option>@foreach(($opts['pos_devices'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('printer_id') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
            </div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Enabled</strong></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[status]" value="0"><input type="checkbox" name="{{ $arr }}[status]" value="1" {{ $v('status',1) ? 'checked' : '' }}><span></span></label></div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Auto-open on cash payment</strong></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[auto_open_on_cash]" value="0"><input type="checkbox" name="{{ $arr }}[auto_open_on_cash]" value="1" {{ $v('auto_open_on_cash',1) ? 'checked' : '' }}><span></span></label></div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Test connection on save</strong></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[test_on_save]" value="0"><input type="checkbox" name="{{ $arr }}[test_on_save]" value="1" {{ $v('test_on_save',1) ? 'checked' : '' }}><span></span></label></div>
        </section>
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Technical connection</h3><p>Advanced hardware connection details.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>Connection type</label><select name="{{ $arr }}[connection_type]">@foreach(($opts['connection_types'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('connection_type','rj11_printer') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>Device path / printer name</label><input type="text" name="{{ $arr }}[device_path]" value="{{ $v('device_path') }}"></div>
                <div class="pmd-owner-field"><label>ESC/POS command</label><input type="text" name="{{ $arr }}[esc_pos_command]" value="{{ $v('esc_pos_command','27,112,0,60,120') }}"></div>
                <div class="pmd-owner-field"><label>Voltage</label><select name="{{ $arr }}[voltage]">@foreach(($opts['voltages'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('voltage','12V') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>IP address</label><input type="text" name="{{ $arr }}[network_ip]" value="{{ $v('network_ip') }}"></div>
                <div class="pmd-owner-field"><label>Network port</label><input type="number" name="{{ $arr }}[network_port]" value="{{ $v('network_port',9100) }}"></div>
                <div class="pmd-owner-field"><label>Serial port</label><input type="text" name="{{ $arr }}[serial_port]" value="{{ $v('serial_port') }}"></div>
                <div class="pmd-owner-field"><label>Baud rate</label><input type="number" name="{{ $arr }}[serial_baud_rate]" value="{{ $v('serial_baud_rate',9600) }}"></div>
                <div class="pmd-owner-field"><label>USB vendor ID</label><input type="text" name="{{ $arr }}[usb_vendor_id]" value="{{ $v('usb_vendor_id') }}"></div>
                <div class="pmd-owner-field"><label>USB product ID</label><input type="text" name="{{ $arr }}[usb_product_id]" value="{{ $v('usb_product_id') }}"></div>
                <div class="pmd-owner-field"><label>Legacy POS device mapping</label><select name="{{ $arr }}[pos_device_id]"><option value="">None</option>@foreach(($opts['pos_devices'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('pos_device_id') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
            </div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>Drawer tools</h3><p>Local connector, printer discovery, diagnostics and manual drawer actions.</p></div><div class="pmd-owner-form-grid"><div class="pmd-owner-field"><label>Local printer name</label><input type="text" name="local_printer_name" value=""></div><div class="pmd-owner-field"><label>Local printer target</label><input type="text" name="local_printer_target" value=""></div></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onSetupOnThisPos">Set up on this POS</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onCheckAgentBridge">Check connector</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onLoadLocalPrinters">Load printers</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onApplyLocalPrinter">Apply printer</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestPrintLocal">Test print</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onDiagnoseDrawer">Diagnose</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestConnection">Test drawer</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onOpenDrawer">Open drawer</button><a class="pmd-owner-action" href="{{ admin_url('cash_drawers/windows_connector/'.$recordId) }}">Download Windows connector</a></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif

    @elseif($kind === 'biometric')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Device connection</h3><p>Name, network address and device status.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>Device name</label><input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required></div>
                <div class="pmd-owner-field"><label>IP address</label><input type="text" name="{{ $arr }}[ip]" value="{{ $v('ip') }}" required></div>
                <div class="pmd-owner-field"><label>Port</label><input type="number" name="{{ $arr }}[port]" value="{{ $v('port',4370) }}"></div>
                <div class="pmd-owner-field"><label>Serial number</label><input type="text" name="{{ $arr }}[serial_number]" value="{{ $v('serial_number') }}" readonly><small>Detected from the device.</small></div>

                <div class="pmd-owner-field pmd-owner-field--full"><label>Description</label><textarea name="{{ $arr }}[description]">{{ $v('description') }}</textarea></div>
            </div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Enabled</strong></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[status]" value="0"><input type="checkbox" name="{{ $arr }}[status]" value="1" {{ $v('status',1) ? 'checked' : '' }}><span></span></label></div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>Biometric tools</h3><p>Connection and synchronization actions.</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestConnection">Test connection</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onSyncStaff" data-pmd-confirm="Sync all staff to this device?">Sync staff</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onSyncAttendance" data-pmd-confirm="Sync attendance from this device?">Sync attendance</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif

    @elseif($kind === 'integrations')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Integration credentials</h3><p>POS provider, endpoint and credentials.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>POS device / provider</label><select name="{{ $arr }}[devices]">@foreach(($opts['pos_devices'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)($record && $record->device_id ? $record->device_id : '') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>API URL</label><input type="text" name="{{ $arr }}[url]" value="{{ $v('url') }}"></div>
                <div class="pmd-owner-field"><label>Username / API key ID</label><input type="text" name="{{ $arr }}[username]" value="{{ $v('username') }}"></div>
                <div class="pmd-owner-field"><label>Password / webhook secret</label><input type="password" name="{{ $arr }}[password]" value="{{ $v('password') }}"></div>
                <div class="pmd-owner-field"><label>Application / merchant ID</label><input type="text" name="{{ $arr }}[id_application]" value="{{ $v('id_application') }}"></div>
                <div class="pmd-owner-field"><label>SumUp affiliate key</label><input type="text" name="{{ $arr }}[sumup_affiliate_key]" value="{{ $v('sumup_affiliate_key') }}"></div>
                <div class="pmd-owner-field"><label>SumUp reader ID</label><input type="text" name="{{ $arr }}[sumup_reader_id]" value="{{ $v('sumup_reader_id') }}"></div>
                <div class="pmd-owner-field"><label>Pairing code</label><input type="text" name="{{ $arr }}[sumup_pairing_code]" value="{{ $v('sumup_pairing_code') }}"></div>
                <div class="pmd-owner-field"><label>Pairing state</label><input type="text" name="{{ $arr }}[sumup_pairing_state]" value="{{ $v('sumup_pairing_state') }}"></div>
                <div class="pmd-owner-field"><label>Reader label</label><input type="text" name="{{ $arr }}[sumup_reader_label]" value="{{ $v('sumup_reader_label') }}"></div>
                <div class="pmd-owner-field pmd-owner-field--full"><label>Access token / secret API key</label><textarea name="{{ $arr }}[access_token]" rows="5">{{ $v('access_token') }}</textarea></div>
            </div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>Integration tools</h3><p>Test, menu sync and webhook actions.</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestIntegration">Test integration</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onSyncMenu">Sync menu</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onRegisterWebhook" data-pmd-extra="config_id={{ $recordId }}">Register webhook</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif
    @endif
</form>
@endif
