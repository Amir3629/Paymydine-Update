<style id="pmd-menu-critical-v3">
html,
body,
.page,
.page-wrapper,
.page-content,
.content-wrapper,
.container-fluid,
#pmd-menu-checkout {
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

html.pmd-menu-booting #notif-root {
    visibility: hidden !important;
    opacity: 0 !important;
}
</style>

<script>
document.documentElement.classList.add('pmd-menu-booting');
</script>


<style id="pmd-menu-zero-jump-first-paint-v5">
html{scrollbar-gutter:stable!important}body:has(#pmd-menu-checkout),body:has(#pmd-menu-checkout) .page,body:has(#pmd-menu-checkout) .page-wrapper,body:has(#pmd-menu-checkout) .page-content,body:has(#pmd-menu-checkout) .content-wrapper,body:has(#pmd-menu-checkout) .main-content,body:has(#pmd-menu-checkout) .nk-wrap,body:has(#pmd-menu-checkout) .nk-content,body:has(#pmd-menu-checkout) .nk-content-inner,body:has(#pmd-menu-checkout) .nk-content-body,body:has(#pmd-menu-checkout) .container,body:has(#pmd-menu-checkout) .container-fluid{background:#f8fbfd!important;animation:none!important;transition:none!important;transform:none!important}body:has(#pmd-menu-checkout) .container-fluid,body:has(#pmd-menu-checkout) .container,body:has(#pmd-menu-checkout) .row,body:has(#pmd-menu-checkout) [class*="col-"]{margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;max-width:none!important}body:has(#pmd-menu-checkout) #pmd-menu-checkout,body:has(#pmd-menu-checkout) #pmd-menu-header,body:has(#pmd-menu-checkout) #pmd-menu-checkout-form,body:has(#pmd-menu-checkout) .pmd-menu-section,body:has(#pmd-menu-checkout) .pmd-menu-card,body:has(#pmd-menu-checkout) .pmd-menu-card__header,body:has(#pmd-menu-checkout) .pmd-menu-card__body,body:has(#pmd-menu-checkout) .pmd-menu-settings-grid,body:has(#pmd-menu-checkout) .pmd-menu-setting-panel,body:has(#pmd-menu-checkout) .pmd-menu-setting-row,body:has(#pmd-menu-checkout) .pmd-menu-field-grid,body:has(#pmd-menu-checkout) .pmd-menu-field{animation:none!important;animation-delay:0s!important;animation-duration:0s!important;transition:none!important;transition-delay:0s!important;transform:none!important;translate:none!important;scale:1!important;opacity:1!important;visibility:visible!important;will-change:auto!important}body:has(#pmd-menu-checkout) .pmd-menu-card{background:#fff!important}body:has(#pmd-menu-checkout) .pmd-menu-setting-panel,body:has(#pmd-menu-checkout) .pmd-menu-setting-row{background:#fff!important}

</style>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-menu-v1.css?v=20260809_1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-menu-v2.css?v=20260809_4">

@php
    $checked = function ($key) use ($pmdMenuCheckout) {
        return !in_array(strtolower((string)($pmdMenuCheckout[$key] ?? '0')), ['0', 'false', 'off', 'no', ''], true);
    };
@endphp


<style id="pmd-menu-absolute-static-v5">
/*
 PMD_MENU_ABSOLUTE_STATIC_PAINT_V5

 Structural elements must never animate during first paint,
 refresh, CSS hydration, or global admin class changes.
*/
html {
    scrollbar-gutter: stable !important;
}

body:has(#pmd-menu-checkout)
#pmd-menu-checkout,

body:has(#pmd-menu-checkout)
#pmd-menu-checkout-form,

body:has(#pmd-menu-checkout)
.pmd-menu-section,

body:has(#pmd-menu-checkout)
.pmd-menu-card,

body:has(#pmd-menu-checkout)
.pmd-menu-card__header,

body:has(#pmd-menu-checkout)
.pmd-menu-card__body,

body:has(#pmd-menu-checkout)
.pmd-menu-settings-grid,

body:has(#pmd-menu-checkout)
.pmd-menu-setting-panel,

body:has(#pmd-menu-checkout)
.pmd-menu-setting-row {

    animation: none !important;
    animation-name: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;

    transition: none !important;
    transition-delay: 0s !important;

    transform: none !important;
    translate: none !important;
    scale: 1 !important;

    opacity: 1 !important;
    visibility: visible !important;

    will-change: auto !important;
}
</style>

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-menu-checkout" class="pmd-menu-checkout" data-pmd-menu-checkout>
    <header class="pmd-menu-header" id="pmd-menu-header">
        <div class="pmd-menu-header__left">
            <a class="pmd-menu-header-button pmd-menu-back" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings" title="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>Menu & checkout</h1>
        </div>

        <div class="pmd-menu-header__actions" data-pmd-menu-header-actions>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')

            <span id="pmd-menu-save-status"></span>
            <button
                type="submit"
                form="pmd-menu-checkout-form"
                class="pmd-menu-header-button pmd-menu-save-icon"
                aria-label="Save changes"
                title="Save changes"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
        </div>
    </header>

    <form
        id="pmd-menu-checkout-form"
        class="pmd-menu-form"
        data-request="onSaveMenuCheckout"
        data-request-flash
    >
        <section class="pmd-menu-section">
            <div class="pmd-menu-card">
                <div class="pmd-menu-card__header">
                    <div class="pmd-menu-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7"></path></svg>
                    </div>
                    <div>
                        <h2>Menu highlights</h2>
                        <p>Control Chef’s Recommendations, Best Sellers and where highlight sections appear.</p>
                    </div>
                </div>

                <div class="pmd-menu-card__body pmd-menu-settings-grid">
                    <div class="pmd-menu-setting-panel">
                        <div class="pmd-menu-setting-panel__title">Highlight sections</div>

                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Chef’s Recommendations</strong>
                                <p>Show a dedicated Chef’s Recommendations section on the guest menu.</p>
                            </div>
                            <label class="pmd-menu-switch" aria-label="Enable Chef’s Recommendations">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_enable_chef_recommendations_section]" value="1" {{ $checked('pmd_menu_highlights_enable_chef_recommendations_section') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>

                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Best Sellers</strong>
                                <p>Show a dedicated Best Sellers section on the guest menu.</p>
                            </div>
                            <label class="pmd-menu-switch" aria-label="Enable Best Sellers">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_enable_best_sellers_section]" value="1" {{ $checked('pmd_menu_highlights_enable_best_sellers_section') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>

                        <label class="pmd-menu-field">
                            <span>Section placement</span>
                            <select name="menu_checkout[pmd_menu_highlights_section_placement]">
                                <option value="hidden" {{ ($pmdMenuCheckout['pmd_menu_highlights_section_placement'] ?? 'hidden') === 'hidden' ? 'selected' : '' }}>Hidden</option>
                                <option value="top" {{ ($pmdMenuCheckout['pmd_menu_highlights_section_placement'] ?? '') === 'top' ? 'selected' : '' }}>Top of menu</option>
                                <option value="after_categories" {{ ($pmdMenuCheckout['pmd_menu_highlights_section_placement'] ?? '') === 'after_categories' ? 'selected' : '' }}>After categories filter</option>
                            </select>
                        </label>

                        <div class="pmd-menu-field-grid">
                            <label class="pmd-menu-field">
                                <span>Max Chef items</span>
                                <input type="number" min="1" max="24" name="menu_checkout[pmd_menu_highlights_max_chef_recommendation_items]" value="{{ $pmdMenuCheckout['pmd_menu_highlights_max_chef_recommendation_items'] ?? 8 }}">
                            </label>
                            <label class="pmd-menu-field">
                                <span>Max Best Seller items</span>
                                <input type="number" min="1" max="24" name="menu_checkout[pmd_menu_highlights_max_best_seller_items]" value="{{ $pmdMenuCheckout['pmd_menu_highlights_max_best_seller_items'] ?? 8 }}">
                            </label>
                        </div>
                    </div>

                    <div class="pmd-menu-setting-panel">
                        <div class="pmd-menu-setting-panel__title">Labels</div>

                        <label class="pmd-menu-field">
                            <span>Chef badge label</span>
                            <input type="text" maxlength="80" name="menu_checkout[pmd_menu_highlights_chef_recommendation_label]" value="{{ $pmdMenuCheckout['pmd_menu_highlights_chef_recommendation_label'] ?? 'Chef’s Choice' }}">
                        </label>

                        <label class="pmd-menu-field">
                            <span>Best Seller badge label</span>
                            <input type="text" maxlength="80" name="menu_checkout[pmd_menu_highlights_best_seller_label]" value="{{ $pmdMenuCheckout['pmd_menu_highlights_best_seller_label'] ?? 'Best Seller' }}">
                        </label>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-menu-section">
            <div class="pmd-menu-card">
                <div class="pmd-menu-card__header">
                    <div class="pmd-menu-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg>
                    </div>
                    <div>
                        <h2>Badges</h2>
                        <p>Choose how Chef’s Choice and Best Seller badges appear on menu cards and product modals.</p>
                    </div>
                </div>

                <div class="pmd-menu-card__body pmd-menu-settings-grid">
                    <div class="pmd-menu-setting-panel">
                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Show badges on menu cards</strong>
                                <p>Display highlight badges directly on guest-facing item cards.</p>
                            </div>
                            <label class="pmd-menu-switch">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_show_badges_on_cards]" value="1" {{ $checked('pmd_menu_highlights_show_badges_on_cards') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>

                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Show badges in product modal</strong>
                                <p>Display highlight badges when guests open an item.</p>
                            </div>
                            <label class="pmd-menu-switch">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_show_badges_in_modal]" value="1" {{ $checked('pmd_menu_highlights_show_badges_in_modal') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>

                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Show badge text on cards</strong>
                                <p>Show the badge label text together with the badge on menu cards.</p>
                            </div>
                            <label class="pmd-menu-switch">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_show_badge_text_on_cards]" value="1" {{ $checked('pmd_menu_highlights_show_badge_text_on_cards') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>

                        <div class="pmd-menu-setting-row">
                            <div>
                                <strong>Show badge text in modal</strong>
                                <p>Show the badge label text inside the product modal.</p>
                            </div>
                            <label class="pmd-menu-switch">
                                <input type="checkbox" name="menu_checkout[pmd_menu_highlights_show_badge_text_in_modal]" value="1" {{ $checked('pmd_menu_highlights_show_badge_text_in_modal') ? 'checked' : '' }}>
                                <span></span>
                            </label>
                        </div>
                    </div>

                    <div class="pmd-menu-setting-panel">
                        <label class="pmd-menu-field">
                            <span>Badge display mode</span>
                            <select name="menu_checkout[pmd_menu_highlights_badge_display_mode]">
                                <option value="priority_only" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_display_mode'] ?? 'priority_only') === 'priority_only' ? 'selected' : '' }}>Priority only — Chef’s Choice over Best Seller</option>
                                <option value="show_all" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_display_mode'] ?? '') === 'show_all' ? 'selected' : '' }}>Show all matching badges</option>
                            </select>
                        </label>

                        <label class="pmd-menu-field">
                            <span>Badge style</span>
                            <select name="menu_checkout[pmd_menu_highlights_badge_style]">
                                <option value="minimal_circle" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_style'] ?? '') === 'minimal_circle' ? 'selected' : '' }}>Minimal circle</option>
                                <option value="corner_ribbon" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_style'] ?? 'corner_ribbon') === 'corner_ribbon' ? 'selected' : '' }}>Corner ribbon</option>
                                <option value="soft_pill" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_style'] ?? '') === 'soft_pill' ? 'selected' : '' }}>Soft pill</option>
                                <option value="luxury_label" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_style'] ?? '') === 'luxury_label' ? 'selected' : '' }}>Luxury label</option>
                            </select>
                        </label>

                        <label class="pmd-menu-field">
                            <span>Badge position</span>
                            <select name="menu_checkout[pmd_menu_highlights_badge_position]">
                                <option value="image_top_left" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_position'] ?? 'image_top_left') === 'image_top_left' ? 'selected' : '' }}>Image top left</option>
                                <option value="image_top_right" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_position'] ?? '') === 'image_top_right' ? 'selected' : '' }}>Image top right</option>
                                <option value="title_inline" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_position'] ?? '') === 'title_inline' ? 'selected' : '' }}>Inline with title</option>
                                <option value="hidden" {{ ($pmdMenuCheckout['pmd_menu_highlights_badge_position'] ?? '') === 'hidden' ? 'selected' : '' }}>Hidden on cards</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-menu-section">
            <div class="pmd-menu-card">
                <div class="pmd-menu-card__header">
                    <div class="pmd-menu-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H7l-3 3Z"></path><path d="M8 9h8M8 13h5"></path></svg>
                    </div>
                    <div>
                        <h2>Checkout & reviews</h2>
                        <p>Control what guests see after checkout and whether the reviews experience is available.</p>
                    </div>
                </div>

                <div class="pmd-menu-card__body pmd-menu-card__body--settings">
                    <div class="pmd-menu-setting-row">
                        <div>
                            <strong>Ask for a review after checkout</strong>
                            <p>Show the review-sharing prompt after a guest completes checkout.</p>
                        </div>
                        <label class="pmd-menu-switch" aria-label="Ask for a review after checkout">
                            <input type="checkbox" name="menu_checkout[review_prompt_enabled]" value="1" {{ !empty($pmdMenuCheckout['review_prompt_enabled']) ? 'checked' : '' }}>
                            <span></span>
                        </label>
                    </div>

                    <div class="pmd-menu-setting-row">
                        <div>
                            <strong>Enable the reviews experience</strong>
                            <p>Allow the guest-facing menu to expose the restaurant reviews experience.</p>
                        </div>
                        <label class="pmd-menu-switch" aria-label="Enable reviews experience">
                            <input type="checkbox" name="menu_checkout[reviews_enabled]" value="1" {{ !empty($pmdMenuCheckout['reviews_enabled']) ? 'checked' : '' }}>
                            <span></span>
                        </label>
                    </div>
                </div>
            </div>
        </section>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-menu-v1.js?v=20260809_3"></script>
