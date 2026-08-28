@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

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
    <div class="pmd-device-v6-detail" data-pmd-device-modal-form data-pmd-device-kind="pos" data-pmd-device-mode="view" data-pmd-modal-title="{{ $pmdSettingsText($titles['pos']) }}">
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('POS device') }}</h3><p>{{ $pmdSettingsText('Connection and runtime details already known to PayMyDine.') }}</p></div>
            <div class="pmd-device-v6-kv-grid">
                <div><span>{{ $pmdSettingsText('Name') }}</span><strong>{{ $v('name', $v('code','POS device')) }}</strong></div>
                <div><span>{{ $pmdSettingsText('Code') }}</span><strong>{{ $v('code','—') }}</strong></div>
                <div><span>{{ $pmdSettingsText('Type') }}</span><strong>{{ $v('device_type','POS') }}</strong></div>
                <div><span>{{ $pmdSettingsText('Status') }}</span><strong>{{ $v('device_status',$pmdSettingsText('Configured')) }}</strong></div>
                <div class="pmd-device-v6-kv-full"><span>{{ $pmdSettingsText('Description') }}</span><strong>{{ $v('description','—') }}</strong></div>
            </div>
        </section>
    </div>
@else
<form class="pmd-device-v6-form" data-pmd-device-modal-form data-pmd-device-kind="{{ $kind }}" data-pmd-device-mode="{{ $mode }}" data-pmd-device-record-id="{{ $recordId }}" data-pmd-modal-title="{{ $pmdSettingsText($titles[$kind] ?? 'Device settings') }}" data-pmd-backend-url="{{ $backendUrl }}" data-pmd-save-handler="{{ $saveHandler }}">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">

    @if($kind === 'kds')
        {{-- PMD_KDS_MINIMAL_STATION_V1_1: only station name and category routing are user-configurable. --}}
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head pmd-device-v6-section__head--actions">
                <div><h3>{{ $pmdSettingsText('Basic information') }}</h3><p>{{ $pmdSettingsText('Name this kitchen display.') }}</p></div>
                @if($mode === 'edit' && !empty($record->slug))
                    <a class="pmd-owner-action" href="{{ admin_url('kitchendisplay/'.$record->slug) }}" target="_blank" rel="noopener">{{ $pmdSettingsText('Open KDS display') }}</a>
                @endif
            </div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Station name') }}</label><input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required><small>{{ $pmdSettingsText('Example: Main Kitchen, Bar, Grill, Dessert or Pass / Expo.') }}</small></div>
            </div>
        </section>

        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Routing') }}</h3><p>{{ $pmdSettingsText('Choose which menu categories reach this KDS.') }}</p></div>
            @php $selectedCategories = $selectedValues($v('category_ids',[])); @endphp
            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Assigned menu categories') }}</label><div class="pmd-device-v6-check-grid">@foreach(($opts['categories'] ?? []) as $value=>$label)<label class="pmd-device-v6-check"><input type="checkbox" name="{{ $arr }}[category_ids][]" value="{{ $value }}" {{ in_array((string)$value,$selectedCategories,true) ? 'checked' : '' }}><span>{{ $label }}</span></label>@endforeach</div><small>{{ $pmdSettingsText('Leave empty to receive all categories.') }}</small></div>
        </section>

    @elseif($kind === 'terminals')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Terminal connection') }}</h3><p>{{ $pmdSettingsText('Provider, reader identity, pairing and readiness.') }}</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Provider type') }}</label><select name="{{ $arr }}[provider_code]">@foreach(($opts['providers'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('provider_code','sumup') === (string)$value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>

                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Affiliate key') }}</label><input type="text" name="{{ $arr }}[affiliate_key]" value="{{ $v('affiliate_key') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Reader ID') }}</label><input type="text" name="{{ $arr }}[reader_id]" value="{{ $v('reader_id') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Reader label') }}</label><input type="text" name="{{ $arr }}[reader_label]" value="{{ $v('reader_label') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Pairing state') }}</label><select name="{{ $arr }}[pairing_state]">@foreach(($opts['pairing'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('pairing_state','unknown') === (string)$value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Terminal status') }}</label><input type="text" name="{{ $arr }}[terminal_status]" value="{{ $v('terminal_status') }}"></div>
                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Metadata (JSON)') }}</label><textarea name="{{ $arr }}[metadata]">{{ is_array($v('metadata',[])) ? json_encode($v('metadata',[]), JSON_PRETTY_PRINT) : $v('metadata') }}</textarea><small>{{ $pmdSettingsText('Optional diagnostic metadata for this terminal device.') }}</small></div>
            </div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Active terminal') }}</strong><small>{{ $pmdSettingsText('Inactive terminals stay configured but are not offered for payments.') }}</small></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[is_active]" value="0"><input type="checkbox" name="{{ $arr }}[is_active]" value="1" {{ $v('is_active',1) ? 'checked' : '' }}><span></span></label></div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Reader tools') }}</h3><p>{{ $pmdSettingsText('Discover and test card readers without leaving this page.') }}</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onDiscoverReaders">{{ $pmdSettingsText('Discover readers') }}</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onTestTerminalConnection">{{ $pmdSettingsText('Test terminal connection') }}</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif

    @elseif($kind === 'drawers')
        {{-- PMD_CASH_DRAWER_OWNER_SIMPLE_R1_INCLUDE --}}
        @include('admin::pmddevices._cash_drawer_simple_form')

    @elseif($kind === 'biometric')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Device connection') }}</h3><p>{{ $pmdSettingsText('Name, network address and device status.') }}</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Device name') }}</label><input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('IP address') }}</label><input type="text" name="{{ $arr }}[ip]" value="{{ $v('ip') }}" required></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Port') }}</label><input type="number" name="{{ $arr }}[port]" value="{{ $v('port',4370) }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Serial number') }}</label><input type="text" name="{{ $arr }}[serial_number]" value="{{ $v('serial_number') }}" readonly><small>{{ $pmdSettingsText('Detected from the device.') }}</small></div>

                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Description') }}</label><textarea name="{{ $arr }}[description]">{{ $v('description') }}</textarea></div>
            </div>
            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Enabled') }}</strong></div><label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[status]" value="0"><input type="checkbox" name="{{ $arr }}[status]" value="1" {{ $v('status',1) ? 'checked' : '' }}><span></span></label></div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Biometric tools') }}</h3><p>{{ $pmdSettingsText('Connection and synchronization actions.') }}</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestConnection">{{ $pmdSettingsText('Test connection') }}</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onSyncStaff" data-pmd-confirm="{{ $pmdSettingsText('Sync all staff to this device?') }}">{{ $pmdSettingsText('Sync staff') }}</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onSyncAttendance" data-pmd-confirm="{{ $pmdSettingsText('Sync attendance from this device?') }}">{{ $pmdSettingsText('Sync attendance') }}</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif

    @elseif($kind === 'integrations')
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Integration credentials') }}</h3><p>{{ $pmdSettingsText('POS provider, endpoint and credentials.') }}</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('POS device / provider') }}</label><select name="{{ $arr }}[devices]">@foreach(($opts['pos_devices'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)($record && $record->device_id ? $record->device_id : '') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('API URL') }}</label><input type="text" name="{{ $arr }}[url]" value="{{ $v('url') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Username / API key ID') }}</label><input type="text" name="{{ $arr }}[username]" value="{{ $v('username') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Password / webhook secret') }}</label><input type="password" name="{{ $arr }}[password]" value="{{ $v('password') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Application / merchant ID') }}</label><input type="text" name="{{ $arr }}[id_application]" value="{{ $v('id_application') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('SumUp affiliate key') }}</label><input type="text" name="{{ $arr }}[sumup_affiliate_key]" value="{{ $v('sumup_affiliate_key') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('SumUp reader ID') }}</label><input type="text" name="{{ $arr }}[sumup_reader_id]" value="{{ $v('sumup_reader_id') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Pairing code') }}</label><input type="text" name="{{ $arr }}[sumup_pairing_code]" value="{{ $v('sumup_pairing_code') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Pairing state') }}</label><input type="text" name="{{ $arr }}[sumup_pairing_state]" value="{{ $v('sumup_pairing_state') }}"></div>
                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Reader label') }}</label><input type="text" name="{{ $arr }}[sumup_reader_label]" value="{{ $v('sumup_reader_label') }}"></div>
                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Access token / secret API key') }}</label><textarea name="{{ $arr }}[access_token]" rows="5">{{ $v('access_token') }}</textarea></div>
            </div>
        </section>
        @if($mode === 'edit')
        <section class="pmd-device-v6-section"><div class="pmd-device-v6-section__head"><h3>{{ $pmdSettingsText('Integration tools') }}</h3><p>{{ $pmdSettingsText('Test, menu sync and webhook actions.') }}</p></div><div class="pmd-device-v6-tools"><button type="button" class="pmd-owner-action" data-pmd-device-action="onTestIntegration">{{ $pmdSettingsText('Test integration') }}</button><button type="button" class="pmd-owner-action" data-pmd-device-action="onSyncMenu">{{ $pmdSettingsText('Sync menu') }}</button><button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onRegisterWebhook" data-pmd-extra="config_id={{ $recordId }}">{{ $pmdSettingsText('Register webhook') }}</button></div><pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre></section>
        @endif
    @endif
</form>
@endif
