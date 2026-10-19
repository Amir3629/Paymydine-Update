{{-- PMD_GLASS_CURRENCY_CONFIG_V1_20261019
     Read ONLY this tenant's canonical default currency, never infer EUR from
     the restaurant's country or browser locale. No settings mutation. --}}
@php
    $pmdGlassCurrencyCodeV1 = '';
    try {
        $pmdGlassCurrencyCodeV1 = strtoupper(trim((string) setting('default_currency_code', '')));
        if (!preg_match('/^[A-Z]{3}$/', $pmdGlassCurrencyCodeV1)) {
            $pmdGlassCurrencyCodeV1 = '';
            $pmdDefaultCurrencyV1 = \System\Models\Currencies_model::getDefault();
            $pmdGlassCurrencyCodeV1 = strtoupper(trim((string) ($pmdDefaultCurrencyV1->currency_code ?? '')));
        }
        if (!preg_match('/^[A-Z]{3}$/', $pmdGlassCurrencyCodeV1)) {
            $pmdGlassCurrencyCodeV1 = '';
        }
    } catch (\Throwable $e) {
        $pmdGlassCurrencyCodeV1 = '';
    }
@endphp
<span hidden style="display:none" aria-hidden="true"
    data-pmd-glass-currency-code="{{ $pmdGlassCurrencyCodeV1 }}"></span>