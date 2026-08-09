<style id="pmd-menu-critical-v1">
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

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-menu-v1.css?v=20260809_1">

<div id="pmd-menu-checkout" class="pmd-menu-checkout" data-pmd-menu-checkout>
    <header class="pmd-menu-header" id="pmd-menu-header">
        <div class="pmd-menu-header__left">
            <a class="pmd-menu-header-button pmd-menu-back" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings" title="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>Menu & checkout</h1>
        </div>

        <div class="pmd-menu-header__actions" data-pmd-menu-header-actions>
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
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"></path></svg>
                    </div>
                    <div>
                        <h2>Menu content</h2>
                        <p>Everything guests browse before they place an order.</p>
                    </div>
                </div>

                <div class="pmd-menu-card__body">
                    <div class="pmd-menu-action-grid">
                        @foreach(($pmdMenuActions ?? []) as $action)
                            <a class="pmd-menu-action" href="{{ $action['href'] }}">
                                <span class="pmd-menu-action__icon">
                                    @switch($action['icon'])
                                        @case('categories')
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>
                                            @break
                                        @case('star')
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9Z"></path></svg>
                                            @break
                                        @case('clock')
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path></svg>
                                            @break
                                        @default
                                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"></path></svg>
                                    @endswitch
                                </span>
                                <span class="pmd-menu-action__copy">
                                    <strong>{{ $action['title'] }}</strong>
                                    <small>{{ $action['description'] }}</small>
                                </span>
                                <svg class="pmd-menu-action__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
                            </a>
                        @endforeach
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
                        <p>Control what guests see after ordering and how review prompts behave.</p>
                    </div>
                </div>

                <div class="pmd-menu-card__body pmd-menu-card__body--settings">
                    <div class="pmd-menu-setting-row">
                        <div>
                            <strong>Ask for a review after checkout</strong>
                            <p>Show the review-sharing prompt after a guest completes checkout.</p>
                        </div>
                        <label class="pmd-menu-switch" aria-label="Ask for a review after checkout">
                            <input
                                type="checkbox"
                                name="menu_checkout[review_prompt_enabled]"
                                value="1"
                                {{ !empty($pmdMenuCheckout['review_prompt_enabled']) ? 'checked' : '' }}
                            >
                            <span></span>
                        </label>
                    </div>

                    <div class="pmd-menu-setting-row">
                        <div>
                            <strong>Enable the reviews experience</strong>
                            <p>Allow the guest-facing menu to expose the restaurant reviews experience.</p>
                        </div>
                        <label class="pmd-menu-switch" aria-label="Enable reviews experience">
                            <input
                                type="checkbox"
                                name="menu_checkout[reviews_enabled]"
                                value="1"
                                {{ !empty($pmdMenuCheckout['reviews_enabled']) ? 'checked' : '' }}
                            >
                            <span></span>
                        </label>
                    </div>

                    <a class="pmd-menu-inline-action" href="{{ admin_url('reviews') }}">
                        <span>
                            <strong>Customer reviews</strong>
                            <small>Open the review workspace and manage submitted reviews.</small>
                        </span>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
                    </a>
                </div>
            </div>
        </section>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-menu-v1.js?v=20260809_1"></script>
