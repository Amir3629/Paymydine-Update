@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $method = $method ?? null;
    $methodProviders = $methodProviders ?? [];
    $code = (string)($method->code ?? '');
    $providersForMethod = $methodProviders[$code] ?? [];
    $providerCode = (string)($method->provider_code ?? '');
    $providerRequired = !in_array($code, ['cod', 'cash'], true);
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="{{ $pmdSettingsText('Edit payment method') }}" data-pmd-backend-url="{{ admin_url('payments/edit/'.$code.'?mode=methods') }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#payment-methods">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="edit">
    <input type="hidden" name="Payment[code]" value="{{ $code }}">
    <input type="hidden" name="Payment[priority]" value="{{ $method->priority ?? 10 }}">
    <input type="hidden" name="Payment[description]" value="{{ $method->description }}">
    <input type="hidden" name="Payment[is_default]" value="{{ !empty($method->is_default) ? 1 : 0 }}">

    <section class="pmd-inline-section pmd-inline-section--payment-method-compact">
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('Name') }}</label>
                <input type="text" name="Payment[name]" value="{{ $method->name }}" readonly required maxlength="128">
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('Availability') }}</label>
                <input type="hidden" name="Payment[status]" value="0">
                <label class="pmd-owner-switch" style="display:flex;align-items:center;gap:12px;width:max-content;max-width:100%;">
                    <input type="checkbox" name="Payment[status]" value="1" {{ !empty($method->status) ? 'checked' : '' }}>
                    <span></span>
                    <strong>{{ $pmdSettingsText('Offer this payment method to guests') }}</strong>
                </label>
                <small>{{ $pmdSettingsText('The method is shown only when this switch is on and the selected provider confirms that the product is available for the current restaurant market.') }}</small>
            </div>

            @if($providerRequired)
                <div class="pmd-inline-field pmd-inline-field--full">
                    <label>{{ $pmdSettingsText('Provider') }}</label>
                    <select name="Payment[provider_code]">
                        <option value="">{{ $pmdSettingsText('Not offered') }}</option>
                        @foreach($providersForMethod as $value=>$label)
                            <option value="{{ $value }}" {{ $providerCode === (string)$value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                    @if(!count($providersForMethod))
                        <small>{{ $pmdSettingsText('Connect or enable a compatible provider first.') }}</small>
                    @endif
                </div>
            @else
                <div class="pmd-inline-field pmd-inline-field--full">
                    <label>{{ $pmdSettingsText('Provider') }}</label>
                    <input type="text" value="No provider required" readonly>
                    <input type="hidden" name="Payment[provider_code]" value="">
                </div>
            @endif
        </div>
    </section>
</form>