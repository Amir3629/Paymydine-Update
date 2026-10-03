@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

<div class="pmd-settings-inline-modal" data-pmd-inline-modal hidden aria-hidden="true">
    <button type="button" class="pmd-settings-inline-backdrop" data-pmd-inline-close aria-label="{{ $pmdSettingsText('Close settings card') }}"></button>
    <section class="pmd-settings-inline-card" role="dialog" aria-modal="true" aria-labelledby="pmd-settings-inline-title">
        <header class="pmd-settings-inline-card__header">
            <h2 id="pmd-settings-inline-title" data-pmd-inline-modal-title>{{ $pmdSettingsText('Settings') }}</h2>
            <button type="button" class="pmd-settings-inline-close" data-pmd-inline-close aria-label="{{ $pmdSettingsText('Close') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
            </button>
        </header>
        <div class="pmd-settings-inline-card__body" data-pmd-inline-modal-body></div>
        <footer class="pmd-settings-inline-card__footer">
            <span class="pmd-settings-inline-status" data-pmd-inline-status></span>
            <span class="pmd-settings-inline-footer-spacer"></span>
            <button type="button" class="pmd-settings-inline-secondary" data-pmd-inline-close>{{ $pmdSettingsText('Cancel') }}</button>
            <button type="button" class="pmd-settings-inline-save" data-pmd-inline-save>{{ $pmdSettingsText('Save') }}</button>
        </footer>
    </section>
</div>
