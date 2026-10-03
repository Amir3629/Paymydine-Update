@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $data = $pmdFinance ?? [];
    $methods = $data['methods'] ?? collect();
    $providers = $data['providers'] ?? collect();
    $settings = $data['settings'] ?? [];
    $fiskaly = $data['fiskaly'] ?? [];
    $checked = fn($value) => !in_array(strtolower((string)$value), ['0','false','off','no',''], true);

    $marketCountry = strtoupper((string)($data['market']['country_code'] ?? ''));
    $isTurkey = $marketCountry === 'TR';
    $isGermany = $marketCountry === 'DE';
    $turkey = (array)($data['turkey'] ?? []);
    $trIntegrations = (array)($turkey['integrations'] ?? []);
    $trPaymentMethods = (array)($turkey['payment_methods'] ?? []);
    $trReadiness = (array)($turkey['readiness'] ?? []);

    $trCfg = static function (string $code, string $key, $fallback = '') use ($trIntegrations) {
        return $trIntegrations[$code]['config'][$key] ?? $fallback;
    };
    $trState = static function (string $code) use ($trIntegrations): array {
        return (array)($trIntegrations[$code]['state'] ?? []);
    };
    $trStatus = static function (string $code) use ($trState): string {
        $state = $trState($code);
        if (!empty($state['production_ready'])) return 'Live';
        return ucfirst(str_replace('_', ' ', (string)($state['status'] ?? 'Not configured')));
    };
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-finance-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back') }}"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>{{ $pmdSettingsText('Payments & finance') }}</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span id="pmd-owner-save-status"></span>
            <button type="submit" form="pmd-finance-form" class="pmd-owner-header-button pmd-owner-save" data-pmd-owner-save aria-label="{{ $pmdSettingsText('Save changes') }}" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></button>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    @if($isTurkey)
        <div class="pmd-owner-card" data-accent="orange" style="margin-bottom:18px">
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list-row">
                    <div>
                        <strong>Türkiye · TRY · Payments & fiscal setup</strong>
                        <small>Cloud payment, e-document, delivery and communication connections live here. The physical YN ÖKC device lives under Devices & hardware.</small>
                    </div>
                    <div class="pmd-owner-status {{ !empty($trReadiness['pilot_ready']) ? 'is-active' : '' }}">{{ !empty($trReadiness['pilot_ready']) ? 'Pilot ready' : 'Not pilot ready' }}</div>
                    <a class="pmd-owner-action" href="{{ admin_url('pmddevices') }}#turkey-fiscal-device">Open YN ÖKC device</a>
                </div>
            </div>
        </div>
    @endif

    <form id="pmd-finance-form" data-pmd-owner-form data-request="onSaveFinance" data-request-flash data-request-validate>

        <section class="pmd-owner-section" id="payment-providers">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"></rect><path d="M8 8h8M8 12h5M8 16h3"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Payment providers') }}</h2><p>{{ $pmdSettingsText($isTurkey ? 'Connect the Turkish bank/payment partner that will actually collect the money.' : 'Each restaurant connects its own provider account once. Payment methods and terminal devices reuse that connection.') }}</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    @if($isTurkey)
                        <p class="pmd-provider-section-note">Save only references to secrets, for example <code>env:PMD_TR_CARD_SECRET</code>. A saved sandbox configuration is not automatically live.</p>
                        <div class="pmd-owner-grid" id="turkey-payment-connections">
                            @foreach([
                                ['acquirer','Card / bank / PSP','Online/card acquiring connection. This is the company that actually processes the restaurant payment.','contract_status'],
                                ['fast_request','FAST Ödeme İste','Same-phone request-to-pay: guest taps FAST, receives a request in their banking app and approves it.','activation_status'],
                                ['tr_qr_fast','FAST / TR Karekod','Payment-specific QR. Best when the payment QR is shown on a waiter/terminal/second screen.','activation_status'],
                            ] as [$code,$title,$description,$statusField])
                                <div class="pmd-owner-panel">
                                    <h3>{{ $title }}</h3>
                                    <p class="pmd-provider-section-note">{{ $description }}</p>
                                    <div class="pmd-owner-form-grid">
                                        <div class="pmd-owner-field"><label>Provider</label><input type="text" name="turkey[{{ $code }}][provider]" value="{{ e($trCfg($code,'provider')) }}" placeholder="Bank / licensed payment provider"></div>
                                        <div class="pmd-owner-field"><label>Merchant ID</label><input type="text" name="turkey[{{ $code }}][merchant_id]" value="{{ e($trCfg($code,'merchant_id')) }}"></div>
                                        <div class="pmd-owner-field"><label>Environment</label><select name="turkey[{{ $code }}][environment]"><option value="sandbox" {{ $trCfg($code,'environment','sandbox') === 'sandbox' ? 'selected' : '' }}>Sandbox / test</option><option value="production" {{ $trCfg($code,'environment') === 'production' ? 'selected' : '' }}>Production</option></select></div>
                                        <div class="pmd-owner-field"><label>Credential reference</label><input type="text" name="turkey[{{ $code }}][credential_reference]" value="{{ e($trCfg($code,'credential_reference')) }}" placeholder="env:PMD_TR_..._SECRET"></div>
                                        <div class="pmd-owner-field pmd-owner-field--full"><label>{{ ucfirst(str_replace('_',' ',$statusField)) }}</label><input type="text" name="turkey[{{ $code }}][{{ $statusField }}]" value="{{ e($trCfg($code,$statusField)) }}" placeholder="pending / sandbox / active"></div>
                                    </div>
                                    <div class="pmd-owner-status {{ !empty($trState($code)['production_ready']) ? 'is-active' : '' }}" style="margin-top:10px">{{ $trStatus($code) }}</div>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <p class="pmd-provider-section-note">{{ $pmdSettingsText('Test and production stay separate. A provider is only offered for a payment method when the matching PayMyDine flow is actually implemented.') }}</p>
                        <div data-pmd-payment-provider-catalogue>
                            <div class="pmd-provider-fallback" data-pmd-provider-fallback>
                                @forelse($providers as $provider)
                                    <div class="pmd-owner-list-row">
                                        <div><strong>{{ $provider->name ?: ucfirst(str_replace('_', ' ', (string)$provider->code)) }}</strong><small>{{ $pmdSettingsText(!empty($provider->status) ? 'Connected/configured for this restaurant' : 'Not configured yet') }}</small></div>
                                        <div class="pmd-owner-meta">{{ strtoupper(str_replace('_', ' ', (string)$provider->code)) }}</div>
                                        <div class="pmd-owner-status {{ !empty($provider->status) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($provider->status) ? 'Enabled' : 'Available') }}</div>
                                        @if((string)$provider->code === 'sumup')
                                            <span class="pmd-owner-meta">{{ $pmdSettingsText('Loading connection…') }}</span>
                                        @else
                                            <button type="button" class="pmd-owner-action" data-pmd-inline-open="finance:provider:{{ $provider->code }}">{{ $pmdSettingsText('Configure') }}</button>
                                        @endif
                                    </div>
                                @empty
                                    <div class="pmd-owner-empty">{{ $pmdSettingsText('No payment providers are available yet.') }}</div>
                                @endforelse
                            </div>
                        </div>
                    @endif
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="payment-methods">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h2"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Payment methods') }}</h2><p>{{ $pmdSettingsText($isTurkey ? 'The PMD table QR still opens the menu. These are the choices shown later at checkout.' : 'Guest-facing payment choices and the provider powering each method.') }}</p></div>
                    @if(!$isTurkey)<div class="pmd-owner-card__actions"><span class="pmd-owner-meta">{{ $pmdSettingsText('Edit here — no detail-page navigation') }}</span></div>@endif
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-list">
                        @if($isTurkey)
                            @foreach($trPaymentMethods as $method)
                                <div class="pmd-owner-list-row">
                                    <div><strong>{{ $method['label'] ?? $method['code'] ?? 'Payment' }}</strong><small>{{ $method['guest_experience'] ?? (($method['code'] ?? '') === 'cash' ? 'Guest requests/pays cash.' : 'Waiting for the matching provider connection.') }}</small></div>
                                    <div class="pmd-owner-meta">{{ !empty($method['same_phone']) ? 'Same phone' : 'Second-screen / QR flow' }}</div>
                                    <div class="pmd-owner-status {{ !empty($method['available']) ? 'is-active' : '' }}">{{ !empty($method['available']) ? 'Available' : 'Waiting for activation' }}</div>
                                </div>
                            @endforeach
                        @else
                            @forelse($methods as $method)
                                <div class="pmd-owner-list-row">
                                    @php
                                        $methodCode = strtolower((string)$method->code);
                                        $methodProvider = strtolower((string)($method->provider_code ?: ''));
                                        $methodHint = $method->description ?: strtoupper((string)$method->code);
                                        if ($methodProvider === 'vr_payment') {
                                            if (in_array($methodCode, ['apple_pay', 'google_pay'], true)) {
                                                $methodHint = !empty($method->status)
                                                    ? 'VR Payment wallet available in this Space.'
                                                    : 'Unavailable in the current VR Payment Space. Activate/configure this wallet with VR Payment first; PMD will not fake-enable it.';
                                            } elseif ($methodCode === 'card') {
                                                $methodHint = 'VR Payment card checkout — Lightbox first, hosted page only as a provider fallback.';
                                            } elseif ($methodCode === 'wero') {
                                                $methodHint = 'VR Payment Wero checkout — Lightbox first, hosted page only as a provider fallback.';
                                            }
                                        }
                                    @endphp
                                    <div><strong>{{ $method->name ?: ucfirst(str_replace('_',' ',(string)$method->code)) }}</strong><small>{{ $pmdSettingsText($methodHint) }}</small></div>
                                    <div class="pmd-owner-meta">{{ $pmdSettingsText('Provider') }}: {{ $method->provider_code ?: '—' }}</div>
                                    <div class="pmd-owner-status {{ !empty($method->status) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($method->status) ? 'Enabled' : 'Disabled') }}</div>
                                    <button type="button" class="pmd-owner-action" data-pmd-inline-open="finance:method:{{ $method->code }}">{{ $pmdSettingsText('Edit') }}</button>
                                </div>
                            @empty
                                <div class="pmd-owner-empty">{{ $pmdSettingsText('No payment methods are available yet.') }}</div>
                            @endforelse
                        @endif
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="tax-invoicing">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Tax & invoicing') }}</h2><p>{{ $pmdSettingsText('VAT calculation, receipt design, numbering and print behaviour in one place.') }}</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>{{ $pmdSettingsText('VAT & tax') }}</h3>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Enable tax calculation') }}</strong><small>{{ $pmdSettingsText('Apply the restaurant tax configuration to orders.') }}</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[tax_mode]" value="1" {{ $checked($settings['tax_mode'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            <input type="hidden" name="finance[tax_menu_price]" value="1">
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Tax percentage') }}</label><input type="number" step="0.01" min="0" max="100" name="finance[tax_percentage]" value="{{ $settings['tax_percentage'] ?? 0 }}"></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('VAT handling') }}</label><input type="text" value="{{ \Admin\Classes\PmdPlatformI18n::fromEnglish('Added at checkout and shown separately', 'settings.') }}" readonly aria-readonly="true"><small>{{ $pmdSettingsText('Menu prices stay net. VAT is added to the order total and shown as a separate line before payment.') }}</small></div>
                            </div>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Tax delivery charge') }}</strong><small>{{ $pmdSettingsText('Also apply tax to delivery charges.') }}</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[tax_delivery_charge]" value="1" {{ $checked($settings['tax_delivery_charge'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                        </div>

                        <div class="pmd-owner-panel">
                            <h3>{{ $pmdSettingsText('Invoice identity & numbering') }}</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Invoice logo path') }}</label><input type="text" name="finance[invoice_logo]" value="{{ $settings['invoice_logo'] ?? '' }}" placeholder="/logo.png"><small>{{ $pmdSettingsText('Uses the existing media-library path authority.') }}</small></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Receipt template') }}</label><select name="finance[invoice_customer_template]">@foreach(['classic'=>'Classic receipt','modern'=>'Modern compact','minimal'=>'Minimal clean'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_customer_template'] ?? 'classic') === $value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Prefix preset') }}</label><select name="finance[invoice_prefix_preset]">@foreach([''=>'No prefix','INV-{year}-'=>'Yearly','INV-{year}{month}-'=>'Monthly','INV-{year}{month}{day}-'=>'Daily','custom'=>'Custom'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_prefix_preset'] ?? 'custom') === $value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Invoice prefix') }}</label><input type="text" name="finance[invoice_prefix]" value="{{ $settings['invoice_prefix'] ?? '' }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Customer invoice footer') }}</label><textarea name="finance[invoice_customer_footer_text]">{{ $settings['invoice_customer_footer_text'] ?? '' }}</textarea></div>
                            </div>
                        </div>
                    </div>

                    <div class="pmd-owner-divider"></div>
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>{{ $pmdSettingsText('Receipt layout') }}</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Paper width') }}</label><select name="finance[invoice_paper_width]">@foreach(['58mm'=>'58mm','80mm'=>'80mm thermal','112mm'=>'112mm','a4'=>'A4'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_paper_width'] ?? '80mm') === $value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Font size') }}</label><select name="finance[invoice_font_size_preset]"><option value="small" {{ ($settings['invoice_font_size_preset'] ?? 'normal') === 'small' ? 'selected' : '' }}>{{ $pmdSettingsText('Small') }}</option><option value="normal" {{ ($settings['invoice_font_size_preset'] ?? 'normal') === 'normal' ? 'selected' : '' }}>{{ $pmdSettingsText('Normal') }}</option></select></div>
                            </div>
                            @php
                                $receiptToggles = [
                                    'invoice_receipt_mode'=>'Receipt mode',
                                    'invoice_compact_mode'=>'Compact receipt',
                                    'invoice_show_logo'=>'Show logo',
                                    'invoice_show_qr'=>'Show fiscal QR',
                                ];
                                if ($isGermany) $receiptToggles['invoice_show_fiskaly'] = 'Show Fiskaly information';
                            @endphp
                            @foreach($receiptToggles as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText($label) }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[{{ $key }}]" value="1" {{ $checked($settings[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>{{ $pmdSettingsText('Print automation') }}</h3>
                            @foreach(['invoice_auto_print_dialog'=>'Open print dialog automatically','invoice_auto_print_after_paid'=>'Auto-print after payment'] as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText($label) }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[{{ $key }}]" value="1" {{ $checked($settings[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Print hint') }}</label><textarea name="finance[invoice_print_hint]">{{ $settings['invoice_print_hint'] ?? '' }}</textarea></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        @if($isTurkey)
            <section class="pmd-owner-section" id="turkey-edocument">
                <div class="pmd-owner-card" data-accent="slate">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path></svg></div>
                        <div class="pmd-owner-card__title"><h2>Türkiye e-Fatura / e-Arşiv</h2><p>Electronic invoice connection. The ordinary restaurant fiscal receipt still comes from the YN ÖKC flow.</p></div>
                        <div class="pmd-owner-card__actions"><span class="pmd-owner-status {{ !empty($trState('e_document')['production_ready']) ? 'is-active' : '' }}">{{ $trStatus('e_document') }}</span></div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-owner-grid">
                            <div class="pmd-owner-panel">
                                <h3>e-Document provider</h3>
                                <div class="pmd-owner-form-grid">
                                    <div class="pmd-owner-field"><label>Provider / Özel Entegratör</label><input type="text" name="turkey[e_document][provider]" value="{{ e($trCfg('e_document','provider')) }}" placeholder="Authorized e-document provider"></div>
                                    <div class="pmd-owner-field"><label>Restaurant tax / merchant identifier</label><input type="text" name="turkey[e_document][merchant_identifier]" value="{{ e($trCfg('e_document','merchant_identifier')) }}"></div>
                                    <div class="pmd-owner-field"><label>Environment</label><select name="turkey[e_document][environment]"><option value="sandbox" {{ $trCfg('e_document','environment','sandbox') === 'sandbox' ? 'selected' : '' }}>Sandbox / test</option><option value="production" {{ $trCfg('e_document','environment') === 'production' ? 'selected' : '' }}>Production</option></select></div>
                                    <div class="pmd-owner-field"><label>Credential reference</label><input type="text" name="turkey[e_document][credential_reference]" value="{{ e($trCfg('e_document','credential_reference')) }}" placeholder="env:PMD_TR_EDOCUMENT_SECRET"></div>
                                    <div class="pmd-owner-field pmd-owner-field--full"><label>Activation status</label><input type="text" name="turkey[e_document][activation_status]" value="{{ e($trCfg('e_document','activation_status')) }}" placeholder="not_onboarded / test / active"></div>
                                </div>
                            </div>
                            <div class="pmd-owner-panel">
                                <h3>Physical fiscal device</h3>
                                <p class="pmd-provider-section-note">YN ÖKC is hardware/fiscal-device configuration, so it is kept under Devices & hardware rather than duplicated here.</p>
                                <a class="pmd-owner-action" href="{{ admin_url('pmddevices') }}#turkey-fiscal-device">Open Türkiye YN ÖKC device settings</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="pmd-owner-section" id="turkey-delivery-channels">
                <div class="pmd-owner-card" data-accent="orange">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M3 7h12v10H3zM15 10h3l3 3v4h-6zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path></svg></div>
                        <div class="pmd-owner-card__title"><h2>Delivery channels · Yemeksepeti</h2><p>Connect the official Partner API here. Uber / Trendyol Go stays for a later phase.</p></div>
                        <div class="pmd-owner-card__actions"><span class="pmd-owner-status {{ !empty($trState('yemeksepeti')['production_ready']) ? 'is-active' : '' }}">{{ $trStatus('yemeksepeti') }}</span></div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-owner-form-grid">
                            <div class="pmd-owner-field"><label>Environment</label><select name="turkey[yemeksepeti][environment]"><option value="sandbox" {{ $trCfg('yemeksepeti','environment','sandbox') === 'sandbox' ? 'selected' : '' }}>Sandbox</option><option value="production" {{ $trCfg('yemeksepeti','environment') === 'production' ? 'selected' : '' }}>Production</option></select></div>
                            <div class="pmd-owner-field"><label>Client ID</label><input type="text" name="turkey[yemeksepeti][client_id]" value="{{ e($trCfg('yemeksepeti','client_id')) }}"></div>
                            <div class="pmd-owner-field"><label>Client secret reference</label><input type="text" name="turkey[yemeksepeti][client_secret_reference]" value="{{ e($trCfg('yemeksepeti','client_secret_reference')) }}" placeholder="env:PMD_TR_YEMEKSEPETI_CLIENT_SECRET"></div>
                            <div class="pmd-owner-field"><label>Merchant / Partner ID</label><input type="text" name="turkey[yemeksepeti][merchant_or_partner_id]" value="{{ e($trCfg('yemeksepeti','merchant_or_partner_id')) }}"></div>
                            <div class="pmd-owner-field"><label>Chain ID</label><input type="text" name="turkey[yemeksepeti][chain_id]" value="{{ e($trCfg('yemeksepeti','chain_id')) }}"></div>
                            <div class="pmd-owner-field"><label>Vendor ID</label><input type="text" name="turkey[yemeksepeti][vendor_id]" value="{{ e($trCfg('yemeksepeti','vendor_id')) }}"></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
                            <button type="button" class="pmd-owner-action" data-request="onTestTurkeyYemeksepeti" data-request-form="#pmd-finance-form" data-request-flash>Test saved sandbox connection</button>
                            <span id="pmd-tr-yemek-test-status"></span>
                        </div>
                    </div>
                </div>
            </section>

            <section class="pmd-owner-section" id="turkey-communications">
                <div class="pmd-owner-card" data-accent="slate">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H7l-3 3z"></path></svg></div>
                        <div class="pmd-owner-card__title"><h2>Türkiye communications</h2><p>Service messages, marketing permission and WhatsApp remain separate connections.</p></div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-owner-grid">
                            <div class="pmd-owner-panel">
                                <h3>İYS · marketing permission</h3>
                                <div class="pmd-owner-form-grid">
                                    <div class="pmd-owner-field"><label>Authorized integrator</label><input type="text" name="turkey[iys][integrator]" value="{{ e($trCfg('iys','integrator')) }}"></div>
                                    <div class="pmd-owner-field"><label>Restaurant legal entity / brand</label><input type="text" name="turkey[iys][brand_or_legal_entity]" value="{{ e($trCfg('iys','brand_or_legal_entity')) }}"></div>
                                    <div class="pmd-owner-field"><label>Environment</label><select name="turkey[iys][environment]"><option value="sandbox" {{ $trCfg('iys','environment','sandbox') === 'sandbox' ? 'selected' : '' }}>Sandbox/test</option><option value="production" {{ $trCfg('iys','environment') === 'production' ? 'selected' : '' }}>Production</option></select></div>
                                    <div class="pmd-owner-field"><label>Credential reference</label><input type="text" name="turkey[iys][credential_reference]" value="{{ e($trCfg('iys','credential_reference')) }}" placeholder="env:PMD_TR_IYS_SECRET"></div>
                                    <div class="pmd-owner-field pmd-owner-field--full"><label>Contract status</label><input type="text" name="turkey[iys][contract_status]" value="{{ e($trCfg('iys','contract_status')) }}"></div>
                                </div>
                            </div>
                            <div class="pmd-owner-panel">
                                <h3>SMS / OTP</h3>
                                <div class="pmd-owner-form-grid">
                                    <div class="pmd-owner-field"><label>Provider</label><input type="text" name="turkey[sms][provider]" value="{{ e($trCfg('sms','provider')) }}"></div>
                                    <div class="pmd-owner-field"><label>Restaurant sender ID</label><input type="text" name="turkey[sms][sender_id]" value="{{ e($trCfg('sms','sender_id')) }}"></div>
                                    <div class="pmd-owner-field pmd-owner-field--full"><label>Credential reference</label><input type="text" name="turkey[sms][credential_reference]" value="{{ e($trCfg('sms','credential_reference')) }}" placeholder="env:PMD_TR_SMS_SECRET"></div>
                                </div>
                                <div class="pmd-owner-divider"></div>
                                <h3>WhatsApp Business</h3>
                                <div class="pmd-owner-form-grid">
                                    <div class="pmd-owner-field"><label>Provider</label><input type="text" name="turkey[whatsapp][provider]" value="{{ e($trCfg('whatsapp','provider')) }}"></div>
                                    <div class="pmd-owner-field"><label>Business account reference</label><input type="text" name="turkey[whatsapp][business_account_reference]" value="{{ e($trCfg('whatsapp','business_account_reference')) }}"></div>
                                    <div class="pmd-owner-field pmd-owner-field--full"><label>Credential reference</label><input type="text" name="turkey[whatsapp][credential_reference]" value="{{ e($trCfg('whatsapp','credential_reference')) }}" placeholder="env:PMD_TR_WHATSAPP_SECRET"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        @endif

        @if($isGermany)
            <section class="pmd-owner-section" id="fiskaly">
                <div class="pmd-owner-card" data-accent="slate">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"></path><path d="M9 7h6M9 11h6M9 15h4"></path></svg></div>
                        <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Fiskaly / TSE') }}</h2><p>{{ $pmdSettingsText('German fiscal compliance credentials and cash-register identity.') }}</p></div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Enable Fiskaly') }}</strong><small>{{ $pmdSettingsText('Use Fiskaly for fiscal/TSE integration.') }}</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[fiskaly_is_enabled]" value="1" {{ $checked($fiskaly['fiskaly_is_enabled'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                        <div class="pmd-owner-form-grid">
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Environment') }}</label><select name="finance[fiskaly_environment]"><option value="test" {{ ($fiskaly['fiskaly_environment'] ?? 'test') === 'test' ? 'selected' : '' }}>{{ $pmdSettingsText('Test') }}</option><option value="live" {{ ($fiskaly['fiskaly_environment'] ?? 'test') === 'live' ? 'selected' : '' }}>{{ $pmdSettingsText('Live') }}</option></select></div>
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('API key') }}</label><input type="text" name="finance[fiskaly_api_key]" value="{{ $fiskaly['fiskaly_api_key'] ?? '' }}"></div>
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('API secret') }}</label><input type="password" name="finance[fiskaly_api_secret]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($fiskaly['has_api_secret']) ? 'Stored — leave blank to keep' : 'Enter API secret') }}"></div>
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Organization ID') }}</label><input type="text" name="finance[fiskaly_organization_id]" value="{{ $fiskaly['fiskaly_organization_id'] ?? '' }}"></div>
                            <div class="pmd-owner-field"><label>{{ $pmdSettingsText('TSS ID') }}</label><input type="text" name="finance[fiskaly_tss_id]" value="{{ $fiskaly['fiskaly_tss_id'] ?? '' }}"></div>
                            <div class="pmd-owner-field"><label>Client ID</label><input type="text" name="finance[fiskaly_client_id]" value="{{ $fiskaly['fiskaly_client_id'] ?? '' }}"></div>
                            <div class="pmd-owner-field"><label>Cash register ID</label><input type="text" name="finance[fiskaly_cash_register_id]" value="{{ $fiskaly['fiskaly_cash_register_id'] ?? '' }}"></div>
                            <div class="pmd-owner-field"><label>Admin PIN</label><input type="password" name="finance[fiskaly_admin_pin]" value="" autocomplete="new-password" placeholder="{{ !empty($fiskaly['has_admin_pin']) ? 'Stored — leave blank to keep' : 'Optional' }}"></div>
                            <div class="pmd-owner-field"><label>Time Admin PIN</label><input type="password" name="finance[fiskaly_time_admin_pin]" value="" autocomplete="new-password" placeholder="{{ !empty($fiskaly['has_time_admin_pin']) ? 'Stored — leave blank to keep' : 'Optional' }}"></div>
                        </div>
                        <div class="pmd-owner-secret-note">Stored secrets are never printed back into the page. Leave secret/PIN fields blank to keep their current values.</div>
                    </div>
                </div>
            </section>
        @endif
    </form>
</div>

@include('admin::pmdfinance._inline_templates_v1')
@include('admin::_partials.pmd_settings_inline_modal_host_v1')