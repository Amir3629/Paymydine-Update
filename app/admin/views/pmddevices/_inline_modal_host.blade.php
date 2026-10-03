@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $catalog = $pmdDeviceModalCatalog ?? [];
    $idFor = function ($kind, $record) {
        if (!$record) return null;
        if ($kind === 'kds') return $record->station_id ?? null;
        if ($kind === 'terminals') return $record->terminal_device_id ?? null;
        if ($kind === 'drawers') return $record->drawer_id ?? null;
        if ($kind === 'biometric') return $record->device_id ?? null;
        if ($kind === 'integrations') return $record->config_id ?? null;
        if ($kind === 'pos') return $record->device_id ?? null;
        return null;
    };
@endphp

<div id="pmd-device-modal-templates" hidden aria-hidden="true">
    @foreach(['kds','terminals','drawers','biometric','integrations'] as $kind)
        @php $page = $catalog[$kind] ?? null; @endphp
        @if($page)
            <template data-pmd-device-template="{{ $kind }}:create">
                @include('pmddevices/_inline_modal_form', ['page'=>$page, 'kind'=>$kind, 'mode'=>'create', 'record'=>$page['record'] ?? null, 'recordId'=>null])
            </template>
            @foreach(($page['items'] ?? collect()) as $record)
                @php $recordId = $idFor($kind, $record); @endphp
                @if($recordId)
                    <template data-pmd-device-template="{{ $kind }}:edit:{{ $recordId }}">
                        @include('pmddevices/_inline_modal_form', ['page'=>$page, 'kind'=>$kind, 'mode'=>'edit', 'record'=>$record, 'recordId'=>$recordId])
                    </template>
                @endif
            @endforeach
        @endif
    @endforeach

    @php $posPage = $catalog['pos'] ?? null; @endphp
    @if($posPage)
        @foreach(($posPage['items'] ?? collect()) as $record)
            @php $recordId = $idFor('pos', $record); @endphp
            @if($recordId)
                <template data-pmd-device-template="pos:view:{{ $recordId }}">
                    @include('pmddevices/_inline_modal_form', ['page'=>$posPage, 'kind'=>'pos', 'mode'=>'view', 'record'=>$record, 'recordId'=>$recordId])
                </template>
            @endif
        @endforeach
    @endif
</div>

<div class="pmd-device-v6-modal" data-pmd-device-modal hidden aria-hidden="true">
    <button type="button" class="pmd-device-v6-backdrop" data-pmd-device-close aria-label="{{ $pmdSettingsText('Close') }}"></button>
    <section class="pmd-device-v6-card" role="dialog" aria-modal="true" aria-labelledby="pmd-device-v6-modal-title">
        <header class="pmd-device-v6-card__header">
            <h2 id="pmd-device-v6-modal-title" data-pmd-device-modal-title>{{ $pmdSettingsText('Device settings') }}</h2>
            <button type="button" class="pmd-device-v6-close" data-pmd-device-close aria-label="{{ $pmdSettingsText('Close') }}" title="{{ $pmdSettingsText('Close') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
        </header>
        <div class="pmd-device-v6-card__body" data-pmd-device-modal-body></div>
        <footer class="pmd-device-v6-card__footer">
            <span class="pmd-device-v6-status" data-pmd-device-status aria-live="polite"></span>
            <button type="button" class="pmd-device-v6-delete" data-pmd-device-delete hidden>{{ $pmdSettingsText('Delete') }}</button>
            <span class="pmd-device-v6-footer-spacer"></span>
            <button type="button" class="pmd-device-v6-secondary" data-pmd-device-close>{{ $pmdSettingsText('Cancel') }}</button>
            <button type="button" class="pmd-device-v6-save" data-pmd-device-save>{{ $pmdSettingsText('Save') }}</button>
        </footer>
    </section>
</div>
