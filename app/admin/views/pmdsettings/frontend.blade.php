@php
    // PMD_FRONTEND_SETTINGS_SERVER_I18N_R6
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

<style id="pmd-frontend-settings-critical-v1">
html,
body,
.page,
.page-wrapper,
.page-content,
.content-wrapper,
.container-fluid,
#pmd-frontend-settings {
    background: #f8fbfd !important;
}
.navbar-top,
.navbar-fixed-top {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
}
</style>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-frontend-v2.css?v=20260815_1">

@php
    $frontend = $pmdFrontend ?? [];
    $selectedTheme = $frontend['theme_configuration'] ?? 'kazen_japanese';
    $enabledLanguages = $frontend['enabled_languages'] ?? ['de', 'en'];
    $themes = [
        ['id'=>'noir_editorial','name'=>'Noir Editorial','type'=>'Luxury dining','swatches'=>['#111111','#f2eee7','#a2845d']],
        ['id'=>'verdant_modern','name'=>'Verdant Modern','type'=>'Modern bistro','swatches'=>['#173c32','#f4f0e7','#91a776']],
        ['id'=>'lumiere_fine_dining','name'=>'Lumière Fine Dining','type'=>'Fine dining','swatches'=>['#17130f','#f5efe4','#c8a96b']],
        ['id'=>'kazen_japanese','name'=>'Kazen Japanese','type'=>'Japanese / Omakase','swatches'=>['#062f2a','#faf9f4','#c89b4a']],
        ['id'=>'azzurra_coastal','name'=>'Azzurra Coastal','type'=>'Mediterranean / Seafood','swatches'=>['#0f6076','#f5f0e7','#d6a85f']],
        ['id'=>'neon_cocktail_bar','name'=>'Neon Cocktail Bar','type'=>'Bar / Nightlife','swatches'=>['#101018','#ff3bbd','#33e7ff']],
        ['id'=>'art_deco_speakeasy','name'=>'Art Deco Speakeasy','type'=>'Premium bar','swatches'=>['#10110f','#e9d7ab','#b88b43']],
        ['id'=>'shahrazad_persian','name'=>'Shahrazad Persian','type'=>'Persian fine dining','swatches'=>['#3d1521','#f4eadb','#c99c50']],
        ['id'=>'anatolia_turkish','name'=>'Anatolia Turkish','type'=>'Turkish / Grill','swatches'=>['#6e3328','#f5ead8','#a86f44']],
        ['id'=>'ember_steakhouse','name'=>'Ember Steakhouse','type'=>'Steakhouse','swatches'=>['#17120f','#f0e6d7','#a6532d']],
    ];
    $languages = [
        'de'=>'Deutsch','en'=>'English','fa'=>'فارسی','tr'=>'Türkçe','ja'=>'日本語',
        'fr'=>'Français','es'=>'Español','it'=>'Italiano','ar'=>'العربية',
    ];

    // PMD_CUSTOMER_EXPERIENCE_QR_LIBRARY_R39
    // Keep these ten presentation labels/colors aligned with the existing
    // pmd-floor-qr-template-studio-r3.js design authority.
    $pmdCustomerQrTables = array_values((array)($pmdCustomerQrTables ?? []));
    $pmdQrTemplatesR39 = [
        ['id'=>'classic','name'=>'Classic White','desc'=>'Clean, bright and easy to print.','bg'=>'#eef4f8','panel'=>'#ffffff','accent'=>'#1f5b91','ink'=>'#12314f'],
        ['id'=>'midnight','name'=>'Midnight','desc'=>'Premium dark table card.','bg'=>'#071b18','panel'=>'#0d2a25','accent'=>'#8de64e','ink'=>'#ffffff'],
        ['id'=>'emerald','name'=>'Emerald','desc'=>'Fresh PayMyDine green style.','bg'=>'#e7f7ef','panel'=>'#ffffff','accent'=>'#0f8a68','ink'=>'#103d32'],
        ['id'=>'bistro','name'=>'Warm Bistro','desc'=>'Warm restaurant table presentation.','bg'=>'#f8efe1','panel'=>'#fffaf2','accent'=>'#a9473d','ink'=>'#4b2b27'],
        ['id'=>'ocean','name'=>'Ocean Blue','desc'=>'Modern blue hospitality card.','bg'=>'#e8f3ff','panel'=>'#ffffff','accent'=>'#2674c7','ink'=>'#173a63'],
        ['id'=>'mono','name'=>'Maximum Scan','desc'=>'High-contrast black and white scan style.','bg'=>'#ffffff','panel'=>'#ffffff','accent'=>'#111111','ink'=>'#111111'],
        ['id'=>'gold','name'=>'Gold Dining','desc'=>'Elegant dark and gold finish.','bg'=>'#171714','panel'=>'#22221d','accent'=>'#d4ad4f','ink'=>'#fff8e3'],
        ['id'=>'coral','name'=>'Coral Welcome','desc'=>'Friendly and colourful.','bg'=>'#fff0eb','panel'=>'#fffaf8','accent'=>'#ef715f','ink'=>'#502f31'],
        ['id'=>'tent','name'=>'Table Tent','desc'=>'Bold header for counter or table stands.','bg'=>'#eaf0f5','panel'=>'#ffffff','accent'=>'#15324d','ink'=>'#15324d'],
        ['id'=>'botanical','name'=>'Botanical','desc'=>'Soft natural restaurant style.','bg'=>'#f0f3e9','panel'=>'#fbfcf7','accent'=>'#718b62','ink'=>'#31432f'],
    ];
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-frontend-settings" class="pmd-frontend-settings" data-pmd-frontend-settings data-pmd-customer-experience-r39="1">
    <header class="pmd-frontend-header">
        <div class="pmd-frontend-header__left">
            <a class="pmd-frontend-icon-button" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back to Settings') }}" title="{{ $pmdSettingsText('Back to Settings') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <h1>{{ $pmdSettingsText('Customer Experience & Design') }}</h1>
                <p>{{ $pmdSettingsText('Themes, QR designs and guest-facing settings in one place.') }}</p>
            </div>
        </div>
        <div class="pmd-frontend-header__actions">
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')

            <span id="pmd-frontend-save-status"></span>
            <a class="pmd-frontend-secondary-button" href="{{ root_url('/') }}" target="_blank" rel="noopener">{{ $pmdSettingsText('Open customer menu') }}</a>
            <button type="submit" form="pmd-frontend-settings-form" class="pmd-frontend-save-icon" aria-label="{{ $pmdSettingsText('Save changes') }}" title="{{ $pmdSettingsText('Save changes') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
        </div>
    </header>

    <form id="pmd-frontend-settings-form" class="pmd-frontend-form" data-request="onSaveFrontendExperience" data-request-flash data-request-validate>
        <section class="pmd-frontend-section">
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-violet"><svg viewBox="0 0 24 24"><path d="M4 20h16M6 16l3-9 3 6 3-9 3 12"></path></svg></span>
                    <div>
                        <h2>{{ $pmdSettingsText('Theme') }}</h2>
                        <p>{{ $pmdSettingsText('Select exactly one customer menu. V2 renders this theme server-side before first paint.') }}</p>
                    </div>
                </div>
                <div class="pmd-frontend-card__body">
                    <div class="pmd-theme-grid">
                        @foreach($themes as $theme)
                            <label class="pmd-theme-option {{ $selectedTheme === $theme['id'] ? 'is-selected' : '' }}" data-pmd-theme-option>
                                <input type="radio" name="frontend[theme_configuration]" value="{{ $theme['id'] }}" {{ $selectedTheme === $theme['id'] ? 'checked' : '' }} required>
                                <span class="pmd-theme-option__preview">
                                    <span class="pmd-theme-option__swatches">
                                        @foreach($theme['swatches'] as $swatch)<i style="--swatch: {{ $swatch }}"></i>@endforeach
                                    </span>
                                    <span class="pmd-theme-option__mock"><b></b><em></em><em></em><em></em></span>
                                </span>
                                <span class="pmd-theme-option__copy">
                                    <strong>{{ $theme['name'] }}</strong>
                                    <small>{{ $pmdSettingsText($theme['type']) }}</small>
                                </span>
                                <span class="pmd-theme-option__check"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></span>
                            </label>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        {{-- PMD_CUSTOMER_EXPERIENCE_QR_LIBRARY_R39 --}}
        <section class="pmd-frontend-section pmd-customer-qr-library-r39" data-pmd-customer-qr-library-r39>
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-emerald">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="4" y="4" width="6" height="6" rx="1"></rect>
                            <rect x="14" y="4" width="6" height="6" rx="1"></rect>
                            <rect x="4" y="14" width="6" height="6" rx="1"></rect>
                            <path d="M14 14h2v2h-2zM18 14h2v6h-6v-2M16 18h2"></path>
                        </svg>
                    </span>
                    <div>
                        <h2>{{ $pmdSettingsText('QR Design Library') }}</h2>
                        <p>{{ $pmdSettingsText('The same 10 table QR designs are available here centrally. Choose a table, then open the studio to preview and download any design.') }}</p>
                    </div>
                </div>

                <div class="pmd-frontend-card__body">
                    <div class="pmd-customer-qr-toolbar-r39">
                        <label class="pmd-field pmd-customer-qr-table-field-r39">
                            <span>{{ $pmdSettingsText('Table for preview & download') }}</span>
                            <select data-pmd-customer-qr-table-r39 {{ empty($pmdCustomerQrTables) ? 'disabled' : '' }}>
                                @forelse($pmdCustomerQrTables as $table)
                                    <option
                                        value="{{ (int)($table['id'] ?? 0) }}"
                                        data-active="{{ !empty($table['active']) ? '1' : '0' }}"
                                    >
                                        {{ $table['name'] ?? ('Table '.($table['number'] ?? '')) }}{{ empty($table['active']) ? ' — Disabled' : '' }}
                                    </option>
                                @empty
                                    <option value="">{{ $pmdSettingsText('No tables available') }}</option>
                                @endforelse
                            </select>
                        </label>

                        <button
                            type="button"
                            class="pmd-customer-qr-open-r39"
                            data-pmd-customer-qr-studio-open-r39
                            {{ empty($pmdCustomerQrTables) ? 'disabled' : '' }}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 3v12"></path>
                                <path d="m7 10 5 5 5-5"></path>
                                <path d="M5 19h14"></path>
                            </svg>
                            <span>{{ $pmdSettingsText('Preview & download selected design') }}</span>
                        </button>

                        <span class="pmd-customer-qr-status-r39" data-pmd-customer-qr-status-r39 aria-live="polite"></span>
                    </div>

                    <div class="pmd-customer-qr-grid-r39" aria-label="{{ $pmdSettingsText('Available QR designs') }}">
                        @foreach($pmdQrTemplatesR39 as $index => $template)
                            <button
                                type="button"
                                class="pmd-customer-qr-template-r39{{ $index === 0 ? ' is-selected' : '' }}"
                                style="--pmd-qr-bg:{{ $template['bg'] }};--pmd-qr-panel:{{ $template['panel'] }};--pmd-qr-accent:{{ $template['accent'] }};--pmd-qr-ink:{{ $template['ink'] }}"
                                data-pmd-customer-qr-template-r39="{{ $template['id'] }}"
                                data-pmd-customer-qr-template-name-r42="{{ $template['name'] }}"
                                aria-pressed="{{ $index === 0 ? 'true' : 'false' }}"
                            >
                                <span class="pmd-customer-qr-template-selected-r42" aria-hidden="true">✓</span>
                                <span class="pmd-customer-qr-template-preview-r39" aria-hidden="true">
                                    <span class="pmd-customer-qr-template-number-r39">{{ str_pad((string)($index + 1), 2, '0', STR_PAD_LEFT) }}</span>
                                    <span class="pmd-customer-qr-template-brand-r39">PayMyDine</span>
                                    <span class="pmd-customer-qr-template-code-r39"></span>
                                    <span class="pmd-customer-qr-template-accent-r39"></span>
                                </span>
                                <span class="pmd-customer-qr-template-copy-r39">
                                    <strong>{{ $template['name'] }}</strong>
                                    <small>{{ $pmdSettingsText($template['desc']) }}</small>
                                </span>
                            </button>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-frontend-section">
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-blue"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path></svg></span>
                    <div>
                        <h2>{{ $pmdSettingsText('Languages') }}</h2>
                        <p>{{ $pmdSettingsText('Languages guests can switch to. Menu translations still depend on translated content in the restaurant data.') }}</p>
                    </div>
                </div>
                <div class="pmd-frontend-card__body">
                    <div class="pmd-language-grid">
                        @foreach($languages as $code => $label)
                            <label class="pmd-language-chip">
                                <input type="checkbox" name="frontend[languages][]" value="{{ $code }}" {{ in_array($code, $enabledLanguages, true) ? 'checked' : '' }}>
                                <span><strong>{{ strtoupper($code) }}</strong>{{ $label }}</span>
                            </label>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-frontend-section">
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-emerald"><svg viewBox="0 0 24 24"><path d="M5 4h14v12H9l-4 4V4Z"></path><path d="M9 9h6M9 12h4"></path></svg></span>
                    <div>
                        <h2>{{ $pmdSettingsText('QR guest experience') }}</h2>
                        <p>{{ $pmdSettingsText('Only controls features that belong in the dine-in QR journey.') }}</p>
                    </div>
                </div>
                <div class="pmd-frontend-card__body">
                    @php
                        $toggles = [
                            ['key'=>'waiter_call_enabled','label'=>'Waiter call','desc'=>'Allow a guest at a valid table to call a waiter.'],
                            ['key'=>'valet_enabled','label'=>'Valet','desc'=>'Show valet request for table guests.'],
                            ['key'=>'table_order_enabled','label'=>'QR table ordering','desc'=>'Confirm personal items and send the shared table order to kitchen.'],
                            ['key'=>'split_bill_enabled','label'=>'Split bill','desc'=>'Allow supported split-payment flows.'],
                            ['key'=>'tips_enabled','label'=>'Tips','desc'=>'Show tip controls where the payment flow supports them.'],
                            ['key'=>'coupons_enabled','label'=>'Coupons','desc'=>'Allow coupon validation in checkout.'],
                            ['key'=>'service_charge_enabled','label'=>'Service cost','desc'=>'Add a configured service cost to new QR table orders.'],
                            ['key'=>'social_enabled','label'=>'Social links','desc'=>'Show enabled restaurant social destinations in the menu.'],
                        ];
                    @endphp
                    <div class="pmd-toggle-grid">
                        @foreach($toggles as $toggle)
                            <label class="pmd-toggle-row">
                                <span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText($toggle['label']) }}</strong><small>{{ $pmdSettingsText($toggle['desc']) }}</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[{{ $toggle['key'] }}]" value="1" {{ !empty($frontend[$toggle['key']]) ? 'checked' : '' }}><i></i></span>
                            </label>
                        @endforeach
                    </div>
                    <div class="pmd-subcard" style="margin-top:16px" data-pmd-service-charge-r35>
                        <strong>{{ $pmdSettingsText('Service cost') }}</strong>
                        <p style="margin:.35rem 0 .8rem;color:#667085">{{ $pmdSettingsText('Applied only to new QR table orders after this setting is saved. Existing orders keep their frozen totals.') }}</p>
                        <div class="pmd-field-grid">
                            <label class="pmd-field"><span>{{ $pmdSettingsText('Type') }}</span><select name="frontend[service_charge_type]">
                                <option value="percentage" {{ ($frontend['service_charge_type'] ?? 'percentage') === 'percentage' ? 'selected' : '' }}>{{ $pmdSettingsText('Percentage') }}</option>
                                <option value="fixed" {{ ($frontend['service_charge_type'] ?? 'percentage') === 'fixed' ? 'selected' : '' }}>{{ $pmdSettingsText('Fixed amount') }}</option>
                            </select></label>
                            <label class="pmd-field"><span>{{ $pmdSettingsText('Value') }}</span><input type="number" min="0" step="0.01" name="frontend[service_charge_value]" value="{{ $frontend['service_charge_value'] ?? 0 }}"></label>
                            <label class="pmd-field"><span>{{ $pmdSettingsText('Checkout / invoice label') }}</span><input type="text" maxlength="191" name="frontend[service_charge_label]" value="{{ $frontend['service_charge_label'] ?? 'Service charge' }}"></label>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-frontend-section">
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-rose"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18"></path></svg></span>
                    <div>
                        <h2>{{ $pmdSettingsText('Website & featured social link') }}</h2>
                        <p>{{ $pmdSettingsText('These destinations are optional. General restaurant social links also remain available in Restaurant profile.') }}</p>
                    </div>
                </div>
                <div class="pmd-frontend-card__body">
                    <div class="pmd-frontend-two-col">
                        <div class="pmd-subcard">
                            <label class="pmd-toggle-row is-compact">
                                <span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText('Website shortcut') }}</strong><small>{{ $pmdSettingsText('Show the restaurant website shortcut in themes that support it.') }}</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[website_enabled]" value="1" {{ !empty($frontend['website_enabled']) ? 'checked' : '' }}><i></i></span>
                            </label>
                            <label class="pmd-field"><span>{{ $pmdSettingsText('Website URL') }}</span><input type="url" name="frontend[website_url]" value="{{ $frontend['website_url'] ?? '' }}" placeholder="https://restaurant.com"></label>
                        </div>
                        <div class="pmd-subcard">
                            <label class="pmd-toggle-row is-compact">
                                <span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText('Featured social shortcut') }}</strong><small>{{ $pmdSettingsText('Show one featured social or review destination.') }}</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[featured_social_enabled]" value="1" {{ !empty($frontend['featured_social_enabled']) ? 'checked' : '' }}><i></i></span>
                            </label>
                            <div class="pmd-field-grid">
                                <label class="pmd-field"><span>{{ $pmdSettingsText('Platform') }}</span><select name="frontend[featured_social_platform]">
                                    @foreach(['instagram'=>'Instagram','facebook'=>'Facebook','trustpilot'=>'Trustpilot','reviews'=>'Reviews page','website'=>'Website / custom'] as $key=>$label)
                                        <option value="{{ $key }}" {{ ($frontend['featured_social_platform'] ?? 'instagram') === $key ? 'selected' : '' }}>{{ $label }}</option>
                                    @endforeach
                                </select></label>
                                <label class="pmd-field"><span>{{ $pmdSettingsText('URL') }}</span><input type="url" name="frontend[featured_social_url]" value="{{ $frontend['featured_social_url'] ?? '' }}" placeholder="https://..."></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <details class="pmd-frontend-advanced">
            <summary>{{ $pmdSettingsText('Compatibility options') }}</summary>
            <div class="pmd-frontend-card pmd-frontend-card--nested">
                <div class="pmd-frontend-card__body">
                    <div class="pmd-frontend-two-col">
                        <label class="pmd-field"><span>{{ $pmdSettingsText('Kazen category layout') }}</span><select name="frontend[kazen_menu_layout]">
                            <option value="tabs" {{ ($frontend['kazen_menu_layout'] ?? 'tabs') === 'tabs' ? 'selected' : '' }}>{{ $pmdSettingsText('Category tabs + item list') }}</option>
                            <option value="accordion" {{ ($frontend['kazen_menu_layout'] ?? 'tabs') === 'accordion' ? 'selected' : '' }}>{{ $pmdSettingsText('Accordion categories') }}</option>
                        </select><small>{{ $pmdSettingsText('This only affects Kazen compatibility behavior.') }}</small></label>
                        <div class="pmd-compat-note"><strong>{{ $pmdSettingsText('Theme colors') }}</strong><p>{{ $pmdSettingsText('V2 themes keep their own isolated visual system. Legacy global primary/accent color overrides are intentionally not exposed here because they would reintroduce cross-theme styling.') }}</p></div>
                    </div>
                </div>
            </div>
        </details>

        <div class="pmd-frontend-bottom-save">
            <button type="submit" class="pmd-frontend-primary-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                <span>{{ $pmdSettingsText('Save frontend settings') }}</span>
            </button>
        </div>
    </form>
</div>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-qr-template-studio-r3.css?v=20260928-r42">
<script defer src="/app/admin/assets/js/pmd-floor-qr-template-studio-r3.js?v=20260928-r42"></script>
<script defer src="/app/admin/assets/js/pmd-settings-frontend-v2.js?v=20260928-r42"></script>
<script defer src="/app/admin/assets/js/pmd-settings-customer-qr-r39.js?v=20260928-r42"></script>
