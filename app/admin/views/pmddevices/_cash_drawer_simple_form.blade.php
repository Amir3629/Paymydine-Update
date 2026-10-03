@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $pmdLocalPosId = (string)$v('local_pos_device_id', '');
    $pmdLocalPosLabel = $pmdLocalPosId !== ''
        ? (($opts['local_pos'][$pmdLocalPosId] ?? null) ?: $pmdSettingsText('Configured POS terminal'))
        : $pmdSettingsText('Not connected yet');
    $pmdPrinterName = trim((string)$v('connection_config.windows_printer_name', $v('device_path', '')));
@endphp

{{-- PMD_CASH_DRAWER_OWNER_SIMPLE_R1
     Owner-facing setup intentionally exposes only the fields needed for the
     normal printer-driven cash drawer workflow. Canonical advanced values are
     preserved in the model/backend and are not reset by this form. --}}
<section class="pmd-device-v6-section" data-pmd-cash-drawer-simple-r1>
    <div class="pmd-device-v6-section__head">
        <h3>{{ $pmdSettingsText('Cash drawer') }}</h3>
        <p>{{ $pmdSettingsText('Connect this computer, choose the receipt printer and test the drawer.') }}</p>
    </div>

    <div class="pmd-owner-form-grid">
        <div class="pmd-owner-field pmd-owner-field--full">
            <label>{{ $pmdSettingsText('Drawer name') }}</label>
            <input type="text" name="{{ $arr }}[name]" value="{{ $v('name') }}" required>
        </div>
    </div>

    <input type="hidden" name="{{ $arr }}[local_pos_device_id]" value="{{ $pmdLocalPosId }}">

    <div class="pmd-owner-setting-row">
        <div class="pmd-owner-setting-copy">
            <strong>{{ $pmdSettingsText('Enabled') }}</strong>
            <small>{{ $pmdSettingsText('Keep this drawer available for the cashier.') }}</small>
        </div>
        <label class="pmd-owner-switch">
            <input type="hidden" name="{{ $arr }}[status]" value="0">
            <input type="checkbox" name="{{ $arr }}[status]" value="1" {{ $v('status',1) ? 'checked' : '' }}>
            <span></span>
        </label>
    </div>

    <div class="pmd-owner-setting-row">
        <div class="pmd-owner-setting-copy">
            <strong>{{ $pmdSettingsText('Open automatically for cash payments') }}</strong>
            <small>{{ $pmdSettingsText('Card and terminal payments never open the drawer.') }}</small>
        </div>
        <label class="pmd-owner-switch">
            <input type="hidden" name="{{ $arr }}[auto_open_on_cash]" value="0">
            <input type="checkbox" name="{{ $arr }}[auto_open_on_cash]" value="1" {{ $v('auto_open_on_cash',1) ? 'checked' : '' }}>
            <span></span>
        </label>
    </div>
</section>

@if($mode === 'edit')
<section class="pmd-device-v6-section">
    <div class="pmd-device-v6-section__head">
        <h3>{{ $pmdSettingsText('Connect this POS') }}</h3>
        <p>{{ $pmdSettingsText('One-time setup on the Windows computer connected to the receipt printer.') }}</p>
    </div>

    <div class="pmd-device-v6-kv-grid">
        <div>
            <span>{{ $pmdSettingsText('POS terminal') }}</span>
            <strong>{{ $pmdLocalPosLabel }}</strong>
        </div>
        <div>
            <span>{{ $pmdSettingsText('Receipt printer') }}</span>
            <strong>{{ $pmdPrinterName !== '' ? $pmdPrinterName : 'Not selected yet' }}</strong>
        </div>
    </div>

    <div class="pmd-device-v6-tools" style="margin-top:14px">
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onSetupOnThisPos">{{ $pmdSettingsText('Prepare this POS') }}</button>
        <a class="pmd-owner-action pmd-device-v6-primary" href="{{ admin_url('cash_drawers/windows_connector/'.$recordId) }}">{{ $pmdSettingsText('Download Windows connector') }}</a>
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onCheckAgentBridge">{{ $pmdSettingsText('Check connector') }}</button>
    </div>
</section>

<section class="pmd-device-v6-section">
    <div class="pmd-device-v6-section__head">
        <h3>{{ $pmdSettingsText('Receipt printer') }}</h3>
        <p>{{ $pmdSettingsText('Find the Windows printer connected to this computer. For the current test PC this is expected to be Generic / Text Only.') }}</p>
    </div>

    <div class="pmd-owner-form-grid">
        <div class="pmd-owner-field pmd-owner-field--full">
            <label>{{ $pmdSettingsText('Receipt printer') }}</label>
            <input type="text" name="local_printer_name" data-pmd-local-printer-name value="{{ $pmdPrinterName }}" placeholder="{{ $pmdSettingsText('Example: Generic / Text Only') }}">
            <input type="hidden" name="local_printer_target" data-pmd-local-printer-target value="{{ $pmdPrinterName }}">
            <small>{{ $pmdSettingsText('Click Find printers first. The selected printer is used for test print and drawer opening.') }}</small>
        </div>
    </div>

    <div class="pmd-device-v6-tools">
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onLoadLocalPrinters">{{ $pmdSettingsText('Find printers') }}</button>
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onApplyLocalPrinter">{{ $pmdSettingsText('Use this printer') }}</button>
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onTestPrintLocal">{{ $pmdSettingsText('Test print') }}</button>
    </div>
</section>

<section class="pmd-device-v6-section">
    <div class="pmd-device-v6-section__head">
        <h3>{{ $pmdSettingsText('Cash drawer test') }}</h3>
        <p>{{ $pmdSettingsText('The drawer cable must be connected to the DK / DRAWER port on the receipt printer.') }}</p>
    </div>
    <div class="pmd-device-v6-tools">
        <button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onTestConnection">{{ $pmdSettingsText('Test drawer') }}</button>
        <button type="button" class="pmd-owner-action" data-pmd-device-action="onOpenDrawer">{{ $pmdSettingsText('Open drawer') }}</button>
    </div>

    <details style="margin-top:14px">
        <summary style="cursor:pointer;font-weight:700">{{ $pmdSettingsText('Troubleshooting') }}</summary>
        <div class="pmd-device-v6-tools" style="margin-top:12px">
            <button type="button" class="pmd-owner-action" data-pmd-device-action="onDiagnoseDrawer">{{ $pmdSettingsText('Try compatible drawer pulses') }}</button>
        </div>
    </details>
    <pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre>
</section>

<script>
(function () {
    var form = document.currentScript && document.currentScript.closest('[data-pmd-device-modal-form]');
    if (!form) return;
    var name = form.querySelector('[data-pmd-local-printer-name]');
    var target = form.querySelector('[data-pmd-local-printer-target]');
    if (!name || !target) return;
    function syncPrinterTarget() { target.value = name.value || ''; }
    name.addEventListener('input', syncPrinterTarget);
    name.addEventListener('change', syncPrinterTarget);
    syncPrinterTarget();
})();
</script>
@endif
