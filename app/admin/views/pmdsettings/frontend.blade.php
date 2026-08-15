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
@endphp

<div id="pmd-frontend-settings" class="pmd-frontend-settings" data-pmd-frontend-settings>
    <header class="pmd-frontend-header">
        <div class="pmd-frontend-header__left">
            <a class="pmd-frontend-icon-button" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings" title="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <h1>Customer menu & themes</h1>
                <p>Choose the QR menu design and control the guest experience.</p>
            </div>
        </div>
        <div class="pmd-frontend-header__actions">
            <span id="pmd-frontend-save-status"></span>
            <a class="pmd-frontend-secondary-button" href="{{ root_url('/') }}" target="_blank" rel="noopener">Open customer menu</a>
            <button type="submit" form="pmd-frontend-settings-form" class="pmd-frontend-save-icon" aria-label="Save changes" title="Save changes">
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
                        <h2>Theme</h2>
                        <p>Select exactly one customer menu. V2 renders this theme server-side before first paint.</p>
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
                                    <small>{{ $theme['type'] }}</small>
                                </span>
                                <span class="pmd-theme-option__check"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></span>
                            </label>
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
                        <h2>Languages</h2>
                        <p>Languages guests can switch to. Menu translations still depend on translated content in the restaurant data.</p>
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
                        <h2>QR guest experience</h2>
                        <p>Only controls features that belong in the dine-in QR journey.</p>
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
                            ['key'=>'social_enabled','label'=>'Social links','desc'=>'Show enabled restaurant social destinations in the menu.'],
                        ];
                    @endphp
                    <div class="pmd-toggle-grid">
                        @foreach($toggles as $toggle)
                            <label class="pmd-toggle-row">
                                <span class="pmd-toggle-row__copy"><strong>{{ $toggle['label'] }}</strong><small>{{ $toggle['desc'] }}</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[{{ $toggle['key'] }}]" value="1" {{ !empty($frontend[$toggle['key']]) ? 'checked' : '' }}><i></i></span>
                            </label>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-frontend-section">
            <div class="pmd-frontend-card">
                <div class="pmd-frontend-card__header">
                    <span class="pmd-frontend-section-icon is-rose"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18"></path></svg></span>
                    <div>
                        <h2>Website & featured social link</h2>
                        <p>These destinations are optional. General restaurant social links also remain available in Restaurant profile.</p>
                    </div>
                </div>
                <div class="pmd-frontend-card__body">
                    <div class="pmd-frontend-two-col">
                        <div class="pmd-subcard">
                            <label class="pmd-toggle-row is-compact">
                                <span class="pmd-toggle-row__copy"><strong>Website shortcut</strong><small>Show the restaurant website shortcut in themes that support it.</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[website_enabled]" value="1" {{ !empty($frontend['website_enabled']) ? 'checked' : '' }}><i></i></span>
                            </label>
                            <label class="pmd-field"><span>Website URL</span><input type="url" name="frontend[website_url]" value="{{ $frontend['website_url'] ?? '' }}" placeholder="https://restaurant.com"></label>
                        </div>
                        <div class="pmd-subcard">
                            <label class="pmd-toggle-row is-compact">
                                <span class="pmd-toggle-row__copy"><strong>Featured social shortcut</strong><small>Show one featured social or review destination.</small></span>
                                <span class="pmd-switch"><input type="checkbox" name="frontend[featured_social_enabled]" value="1" {{ !empty($frontend['featured_social_enabled']) ? 'checked' : '' }}><i></i></span>
                            </label>
                            <div class="pmd-field-grid">
                                <label class="pmd-field"><span>Platform</span><select name="frontend[featured_social_platform]">
                                    @foreach(['instagram'=>'Instagram','facebook'=>'Facebook','trustpilot'=>'Trustpilot','reviews'=>'Reviews page','website'=>'Website / custom'] as $key=>$label)
                                        <option value="{{ $key }}" {{ ($frontend['featured_social_platform'] ?? 'instagram') === $key ? 'selected' : '' }}>{{ $label }}</option>
                                    @endforeach
                                </select></label>
                                <label class="pmd-field"><span>URL</span><input type="url" name="frontend[featured_social_url]" value="{{ $frontend['featured_social_url'] ?? '' }}" placeholder="https://..."></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <details class="pmd-frontend-advanced">
            <summary>Compatibility options</summary>
            <div class="pmd-frontend-card pmd-frontend-card--nested">
                <div class="pmd-frontend-card__body">
                    <div class="pmd-frontend-two-col">
                        <label class="pmd-field"><span>Kazen category layout</span><select name="frontend[kazen_menu_layout]">
                            <option value="tabs" {{ ($frontend['kazen_menu_layout'] ?? 'tabs') === 'tabs' ? 'selected' : '' }}>Category tabs + item list</option>
                            <option value="accordion" {{ ($frontend['kazen_menu_layout'] ?? 'tabs') === 'accordion' ? 'selected' : '' }}>Accordion categories</option>
                        </select><small>This only affects Kazen compatibility behavior.</small></label>
                        <div class="pmd-compat-note"><strong>Theme colors</strong><p>V2 themes keep their own isolated visual system. Legacy global primary/accent color overrides are intentionally not exposed here because they would reintroduce cross-theme styling.</p></div>
                    </div>
                </div>
            </div>
        </details>

        <div class="pmd-frontend-bottom-save">
            <button type="submit" class="pmd-frontend-primary-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                <span>Save frontend settings</span>
            </button>
        </div>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-frontend-v2.js?v=20260815_1"></script>
