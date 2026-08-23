@php
    $data = $pmdFinance ?? [];
    $methods = $data['methods'] ?? collect();
    $providers = $data['providers'] ?? collect();
    $settings = $data['settings'] ?? [];
    $fiskaly = $data['fiskaly'] ?? [];
    $checked = fn($value) => !in_array(strtolower((string)$value), ['0','false','off','no',''], true);
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-finance-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>Payments & finance</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span id="pmd-owner-save-status"></span>
            <button type="submit" form="pmd-finance-form" class="pmd-owner-header-button pmd-owner-save" data-pmd-owner-save aria-label="Save changes" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></button>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    <form id="pmd-finance-form" data-pmd-owner-form data-request="onSaveFinance" data-request-flash data-request-validate>
        <section class="pmd-owner-section" id="payment-methods">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h2"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Payment methods</h2><p>Guest-facing payment choices and the provider powering each method.</p></div>
                    <div class="pmd-owner-card__actions"><span class="pmd-owner-meta">Edit here — no detail-page navigation</span></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-list">
                        @forelse($methods as $method)
                            <div class="pmd-owner-list-row">
                                <div><strong>{{ $method->name ?: ucfirst(str_replace('_',' ',(string)$method->code)) }}</strong><small>{{ $method->description ?: strtoupper((string)$method->code) }}</small></div>
                                <div class="pmd-owner-meta">Provider: {{ $method->provider_code ?: '—' }}</div>
                                <div class="pmd-owner-status {{ !empty($method->status) ? 'is-active' : '' }}">{{ !empty($method->status) ? 'Enabled' : 'Disabled' }}</div>
                                <button type="button" class="pmd-owner-action" data-pmd-inline-open="finance:method:{{ $method->code }}">Edit</button>
                            </div>
                        @empty
                            <div class="pmd-owner-empty">No payment methods are available yet.</div>
                        @endforelse
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="payment-providers">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"></rect><path d="M8 8h8M8 12h5M8 16h3"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Payment providers</h2><p>Each restaurant connects its own provider account once. Payment methods and terminal devices reuse that connection.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <p class="pmd-provider-section-note">Test and production stay separate. A provider is only offered for a payment method when the matching PayMyDine flow is actually implemented.</p>
                    <div data-pmd-payment-provider-catalogue>
                        <div class="pmd-provider-fallback" data-pmd-provider-fallback>
                            @forelse($providers as $provider)
                                <div class="pmd-owner-list-row">
                                    <div>
                                        <strong>{{ $provider->name ?: ucfirst(str_replace('_', ' ', (string)$provider->code)) }}</strong>
                                        <small>{{ !empty($provider->status) ? 'Connected/configured for this restaurant' : 'Not configured yet' }}</small>
                                    </div>
                                    <div class="pmd-owner-meta">{{ strtoupper(str_replace('_', ' ', (string)$provider->code)) }}</div>
                                    <div class="pmd-owner-status {{ !empty($provider->status) ? 'is-active' : '' }}">{{ !empty($provider->status) ? 'Enabled' : 'Available' }}</div>
                                    @if((string)$provider->code === 'sumup')
                                        <span class="pmd-owner-meta">Loading connection…</span>
                                    @else
                                        <button type="button" class="pmd-owner-action" data-pmd-inline-open="finance:provider:{{ $provider->code }}">Configure</button>
                                    @endif
                                </div>
                            @empty
                                <div class="pmd-owner-empty">No payment providers are available yet.</div>
                            @endforelse
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="tax-invoicing">
            <div class="pmd-owner-card" data-accent="orange">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Tax & invoicing</h2><p>VAT calculation, receipt design, numbering and print behaviour in one place.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>VAT & tax</h3>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Enable tax calculation</strong><small>Apply the restaurant tax configuration to orders.</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[tax_mode]" value="1" {{ $checked($settings['tax_mode'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            <input type="hidden" name="finance[tax_menu_price]" value="1">
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field"><label>Tax percentage</label><input type="number" step="0.01" min="0" max="100" name="finance[tax_percentage]" value="{{ $settings['tax_percentage'] ?? 0 }}"></div>
                                <div class="pmd-owner-field"><label>VAT handling</label><input type="text" value="Added at checkout and shown separately" readonly aria-readonly="true"><small>Menu prices stay net. VAT is added to the order total and shown as a separate line before payment.</small></div>
                            </div>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Tax delivery charge</strong><small>Also apply tax to delivery charges.</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[tax_delivery_charge]" value="1" {{ $checked($settings['tax_delivery_charge'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                        </div>

                        <div class="pmd-owner-panel">
                            <h3>Invoice identity & numbering</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field pmd-owner-field--full"><label>Invoice logo path</label><input type="text" name="finance[invoice_logo]" value="{{ $settings['invoice_logo'] ?? '' }}" placeholder="/logo.png"><small>Uses the existing media-library path authority.</small></div>
                                <div class="pmd-owner-field"><label>Receipt template</label><select name="finance[invoice_customer_template]">@foreach(['classic'=>'Classic receipt','modern'=>'Modern compact','minimal'=>'Minimal clean'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_customer_template'] ?? 'classic') === $value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field"><label>Prefix preset</label><select name="finance[invoice_prefix_preset]">@foreach([''=>'No prefix','INV-{year}-'=>'Yearly','INV-{year}{month}-'=>'Monthly','INV-{year}{month}{day}-'=>'Daily','custom'=>'Custom'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_prefix_preset'] ?? 'custom') === $value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>Invoice prefix</label><input type="text" name="finance[invoice_prefix]" value="{{ $settings['invoice_prefix'] ?? '' }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>Customer invoice footer</label><textarea name="finance[invoice_customer_footer_text]">{{ $settings['invoice_customer_footer_text'] ?? '' }}</textarea></div>
                            </div>
                        </div>
                    </div>

                    <div class="pmd-owner-divider"></div>
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>Receipt layout</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field"><label>Paper width</label><select name="finance[invoice_paper_width]">@foreach(['58mm'=>'58mm','80mm'=>'80mm thermal','112mm'=>'112mm','a4'=>'A4'] as $value=>$label)<option value="{{ $value }}" {{ ($settings['invoice_paper_width'] ?? '80mm') === $value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                                <div class="pmd-owner-field"><label>Font size</label><select name="finance[invoice_font_size_preset]"><option value="small" {{ ($settings['invoice_font_size_preset'] ?? 'normal') === 'small' ? 'selected' : '' }}>Small</option><option value="normal" {{ ($settings['invoice_font_size_preset'] ?? 'normal') === 'normal' ? 'selected' : '' }}>Normal</option></select></div>
                            </div>
                            @foreach([
                                'invoice_receipt_mode'=>'Receipt mode',
                                'invoice_compact_mode'=>'Compact receipt',
                                'invoice_show_logo'=>'Show logo',
                                'invoice_show_qr'=>'Show fiscal QR',
                                'invoice_show_fiskaly'=>'Show Fiskaly information'
                            ] as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $label }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[{{ $key }}]" value="1" {{ $checked($settings[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>Print automation</h3>
                            @foreach(['invoice_auto_print_dialog'=>'Open print dialog automatically','invoice_auto_print_after_paid'=>'Auto-print after payment'] as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $label }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[{{ $key }}]" value="1" {{ $checked($settings[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                            <div class="pmd-owner-field"><label>Print hint</label><textarea name="finance[invoice_print_hint]">{{ $settings['invoice_print_hint'] ?? '' }}</textarea></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="fiskaly">
            <div class="pmd-owner-card" data-accent="slate">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"></path><path d="M9 7h6M9 11h6M9 15h4"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Fiskaly / TSE</h2><p>German fiscal compliance credentials and cash-register identity.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Enable Fiskaly</strong><small>Use Fiskaly for fiscal/TSE integration.</small></div><label class="pmd-owner-switch"><input type="checkbox" name="finance[fiskaly_is_enabled]" value="1" {{ $checked($fiskaly['fiskaly_is_enabled'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                    <div class="pmd-owner-form-grid">
                        <div class="pmd-owner-field"><label>Environment</label><select name="finance[fiskaly_environment]"><option value="test" {{ ($fiskaly['fiskaly_environment'] ?? 'test') === 'test' ? 'selected' : '' }}>Test</option><option value="live" {{ ($fiskaly['fiskaly_environment'] ?? 'test') === 'live' ? 'selected' : '' }}>Live</option></select></div>
                        <div class="pmd-owner-field"><label>API key</label><input type="text" name="finance[fiskaly_api_key]" value="{{ $fiskaly['fiskaly_api_key'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>API secret</label><input type="password" name="finance[fiskaly_api_secret]" value="" autocomplete="new-password" placeholder="{{ !empty($fiskaly['has_api_secret']) ? 'Stored — leave blank to keep' : 'Enter API secret' }}"></div>
                        <div class="pmd-owner-field"><label>Organization ID</label><input type="text" name="finance[fiskaly_organization_id]" value="{{ $fiskaly['fiskaly_organization_id'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>TSS ID</label><input type="text" name="finance[fiskaly_tss_id]" value="{{ $fiskaly['fiskaly_tss_id'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Client ID</label><input type="text" name="finance[fiskaly_client_id]" value="{{ $fiskaly['fiskaly_client_id'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Cash register ID</label><input type="text" name="finance[fiskaly_cash_register_id]" value="{{ $fiskaly['fiskaly_cash_register_id'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Admin PIN</label><input type="password" name="finance[fiskaly_admin_pin]" value="" autocomplete="new-password" placeholder="{{ !empty($fiskaly['has_admin_pin']) ? 'Stored — leave blank to keep' : 'Optional' }}"></div>
                        <div class="pmd-owner-field"><label>Time Admin PIN</label><input type="password" name="finance[fiskaly_time_admin_pin]" value="" autocomplete="new-password" placeholder="{{ !empty($fiskaly['has_time_admin_pin']) ? 'Stored — leave blank to keep' : 'Optional' }}"></div>
                    </div>
                    <div class="pmd-owner-secret-note">Stored secrets are never printed back into the page. Leave secret/PIN fields blank to keep their current values.</div>
                </div>
            </div>
        </section>
    </form>
</div>

@include('admin::pmdfinance._inline_templates_v1')
@include('admin::_partials.pmd_settings_inline_modal_host_v1')
