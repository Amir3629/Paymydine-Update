{{-- PMD_GLASS_CURRENCY_CONFIG_V1_20261019
     Read ONLY this tenant's canonical default currency, never infer EUR from
     the restaurant's country or browser locale. No settings mutation. --}}
@php
    $pmdGlassCurrencyCodeV1 = '';
    try {
        $pmdGlassCurrencyCodeV1 = strtoupper(trim((string) setting('default_currency_code', '')));
        if (!preg_match('/^[A-Z]{3}$/', $pmdGlassCurrencyCodeV1)) {
            // PMD_GLASS_NUMERIC_CONTROLS_QA_R2_20261019: query-only fallback; getDefault() may write settings.
            $pmdGlassCurrencyRawV1 = trim((string) setting('default_currency_code', ''));
            $pmdGlassCurrencyQueryV1 = \System\Models\Currencies_model::query();
            $pmdGlassCurrencyRowV1 = preg_match('/^\\d+$/', $pmdGlassCurrencyRawV1)
                ? $pmdGlassCurrencyQueryV1->where('currency_id', (int) $pmdGlassCurrencyRawV1)->first()
                : null;
            if ($pmdGlassCurrencyRowV1) {
                $pmdGlassCurrencyCodeV1 = strtoupper(trim((string) $pmdGlassCurrencyRowV1->currency_code));
            }
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