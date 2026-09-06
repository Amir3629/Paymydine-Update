@php
    $isEmbedded = !empty($embedded);
    $pmdPosLocale = \Admin\Classes\PmdAdminI18n::currentLocale();
    $pmdT = static function (string $key, array $replace = []) use ($pmdPosLocale): string {
        return \Admin\Classes\PmdAdminI18n::translate($key, $replace, $pmdPosLocale);
    };
@endphp
<section class="pmd-pos-app" data-pmd-pos-root data-pmd-pos-mode="{{ $isEmbedded ? 'overlay' : 'standalone' }}">
    <header class="pmd-pos-topbar">
        <div class="pmd-pos-top-left">
            <button type="button" class="pmd-pos-back" data-pos-close>{{ $pmdT('waiter.pos.back_to_floor') }}</button>
            <span class="pmd-pos-status-dot" aria-hidden="true"></span>
            <span class="pmd-pos-waiter">{{ $bootstrap['user']['name'] ?? $pmdT('shared.waiter') }}</span>
        </div>

        <div class="pmd-pos-table-title">
            <strong>{{ $bootstrap['table']['name'] ?? $pmdT('shared.table') }}</strong>
            <span>
                @if(!empty($bootstrap['table']['section']))
                    {{ $bootstrap['table']['section'] }} ·
                @endif
                {{ $pmdT('waiter.pos.quick_ordering') }}
            </span>
        </div>

        <div class="pmd-pos-top-right">
            <button type="button" class="pmd-pos-ghost-btn" data-pos-clear>{{ $pmdT('waiter.pos.clear_cart') }}</button>
            <button type="button" class="pmd-pos-icon-btn" data-pos-refresh title="{{ $pmdT('waiter.pos.refresh_order_menu') }}" aria-label="{{ $pmdT('waiter.pos.refresh_order_menu') }}">↻</button>
        </div>
    </header>

    <div class="pmd-pos-success" data-pos-success hidden></div>

    <main class="pmd-pos-workspace">
        <section class="pmd-pos-catalog" aria-label="{{ $pmdT('waiter.pos.menu_items') }}">
            <div class="pmd-pos-tools">
                <label class="pmd-pos-search-wrap">
                    <input data-pos-search class="pmd-pos-search" type="search" autocomplete="off" placeholder="{{ $pmdT('waiter.pos.search_placeholder') }}">
                    <span class="pmd-pos-search-icon">⌕</span>
                </label>
                <div class="pmd-pos-view-toggle" aria-label="{{ $pmdT('waiter.pos.view_mode') }}">
                    <button type="button" class="is-active" data-pos-view="grid" title="{{ $pmdT('waiter.pos.grid_view') }}" aria-label="{{ $pmdT('waiter.pos.grid_view') }}">▦</button>
                    <button type="button" data-pos-view="list" title="{{ $pmdT('waiter.pos.compact_list_view') }}" aria-label="{{ $pmdT('waiter.pos.compact_list_view') }}">☷</button>
                </div>
            </div>

            <div class="pmd-pos-warning" data-pos-menu-warning hidden></div>
            <nav data-pos-categories class="pmd-pos-categories" aria-label="{{ $pmdT('waiter.pos.menu_categories') }}"></nav>
            <div class="pmd-pos-menu-scroll">
                <div data-pos-menu class="pmd-pos-menu-grid"></div>
            </div>
        </section>

        <aside class="pmd-pos-cart" data-pos-cart aria-label="{{ $pmdT('waiter.pos.current_order') }}">
            <div class="pmd-pos-cart-head">
                <div class="pmd-pos-cart-head-row">
                    <div>
                        <h2>{{ $pmdT('waiter.pos.current_order') }}</h2>
                        <span class="pmd-pos-order-pill" data-pos-order-pill>{{ $pmdT('waiter.pos.new_order') }}</span>
                    </div>
                    <button type="button" class="pmd-pos-icon-btn pmd-pos-mobile-only" data-pos-close-cart aria-label="{{ $pmdT('waiter.pos.close_cart') }}">×</button>
                </div>
                <div class="pmd-pos-guest-row">
                    <span><b>{{ $pmdT('waiter.pos.guests') }}</b><br><small>{{ $pmdT('waiter.pos.table_covers') }}</small></span>
                    <div class="pmd-pos-stepper">
                        <button type="button" data-pos-guest-minus aria-label="{{ $pmdT('waiter.pos.decrease_guests') }}">−</button>
                        <span data-pos-guests>1</span>
                        <button type="button" data-pos-guest-plus aria-label="{{ $pmdT('waiter.pos.increase_guests') }}">+</button>
                    </div>
                </div>
            </div>

            <div class="pmd-pos-existing" data-pos-existing></div>

            <section class="pmd-pos-sent-section" data-pos-sent-section hidden>
                <div class="pmd-pos-section-heading">
                    <span>{{ $pmdT('waiter.pos.already_sent') }}</span>
                    <small data-pos-kitchen-status></small>
                </div>
                <div class="pmd-pos-sent-list" data-pos-sent-list></div>
            </section>

            <section class="pmd-pos-new-section">
                <div class="pmd-pos-section-heading">
                    <span>{{ $pmdT('waiter.pos.new_items') }}</span>
                    <small>{{ $pmdT('waiter.pos.not_sent_yet') }}</small>
                </div>
                <div class="pmd-pos-cart-list" data-pos-cart-list></div>
            </section>

            <div class="pmd-pos-checkout">
                <textarea data-pos-table-note class="pmd-pos-table-note" placeholder="{{ $pmdT('waiter.pos.order_note_placeholder') }}"></textarea>

                <div class="pmd-pos-totals">
                    <div class="pmd-pos-total-row"><span>{{ $pmdT('waiter.pos.new_items') }}</span><b data-pos-subtotal>€0.00</b></div>
                    <div class="pmd-pos-total-row" data-pos-existing-total-row hidden><span>{{ $pmdT('waiter.pos.existing_order') }}</span><b data-pos-existing-total>€0.00</b></div>
                    <div class="pmd-pos-total-row grand"><span>{{ $pmdT('waiter.pos.order_total') }}</span><b data-pos-total>€0.00</b></div>
                </div>

                <div class="pmd-pos-actions">
                    <button type="button" class="pmd-pos-action hold" data-pos-hold>
                        <span>{{ $pmdT('waiter.pos.save_hold') }}</span><small>{{ $pmdT('waiter.pos.do_not_send') }}</small>
                    </button>
                    <button type="button" class="pmd-pos-action send" data-pos-send>{{ $pmdT('waiter.pos.send_to_kitchen') }}</button>
                </div>

                <div class="pmd-pos-secondary-actions">
                    <button type="button" data-pos-edit-order disabled>{{ $pmdT('shared.edit_order') }}</button>
                    <button type="button" data-pos-payment disabled>{{ $pmdT('shared.payment') }}</button>
                    <button type="button" data-pos-print disabled>{{ $pmdT('shared.print') }}</button>
                </div>
            </div>
        </aside>
    </main>

    <button type="button" class="pmd-pos-mobile-cart-bar" data-pos-mobile-cart>
        <span><b>{{ $pmdT('shared.view_order') }}</b><small data-pos-mobile-count>{{ $pmdT('waiter.pos.item_count_many', ['count' => 0]) }}</small></span>
        <span class="pmd-pos-mobile-cart-total" data-pos-mobile-total>€0.00</span>
    </button>

    <div class="pmd-pos-modal" data-pos-modifier-modal aria-hidden="true">
        <div class="pmd-pos-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-modifier-title">
            <div class="pmd-pos-modal-head">
                <h2 id="pmd-pos-modifier-title" data-pos-modal-title>{{ $pmdT('shared.options') }}</h2>
                <button type="button" class="pmd-pos-modal-close" data-pos-modal-close aria-label="{{ $pmdT('shared.close') }}">×</button>
            </div>
            <div class="pmd-pos-modal-body" data-pos-modal-body></div>
            <div class="pmd-pos-modal-foot">
                <button type="button" class="pmd-pos-modal-cancel" data-pos-modal-cancel>{{ $pmdT('shared.cancel') }}</button>
                <button type="button" class="pmd-pos-modal-add" data-pos-modal-add>{{ $pmdT('shared.add_item') }}</button>
            </div>
        </div>
    </div>

    <div class="pmd-pos-payment-modal" data-pos-payment-modal aria-hidden="true">
        <div class="pmd-pos-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-payment-title">
            <header class="pmd-pos-payment-head">
                <div>
                    <span class="pmd-pos-payment-eyebrow">{{ $pmdT('waiter.payment.center') }}</span>
                    <h2 id="pmd-pos-payment-title">{{ $pmdT('waiter.payment.settle_order') }}</h2>
                    <p data-pos-payment-subtitle></p>
                </div>
                <button type="button" class="pmd-pos-payment-close" data-pos-payment-close aria-label="{{ $pmdT('waiter.pos.close_payment') }}">×</button>
            </header>

            <div class="pmd-pos-payment-body">
                <section class="pmd-pos-payment-main">
                    <div class="pmd-pos-payment-balance" data-pos-payment-balance></div>

                    <div class="pmd-pos-payment-block">
                        <div class="pmd-pos-payment-block-title"><b>{{ $pmdT('waiter.payment.split_bill') }}</b><span>{{ $pmdT('waiter.payment.choose_coverage') }}</span></div>
                        <div class="pmd-pos-split-tabs" data-pos-split-tabs>
                            <button type="button" class="is-active" data-split-mode="full">{{ $pmdT('waiter.payment.full_bill') }}</button>
                            <button type="button" data-split-mode="equal">{{ $pmdT('waiter.payment.equally') }}</button>
                            <button type="button" data-split-mode="items">{{ $pmdT('waiter.payment.by_items') }}</button>
                            <button type="button" data-split-mode="custom">{{ $pmdT('shared.custom') }}</button>
                        </div>
                        <div class="pmd-pos-split-panel" data-pos-split-panel></div>
                    </div>

                    <div class="pmd-pos-payment-block">
                        <div class="pmd-pos-payment-block-title"><b>{{ $pmdT('shared.payment_method') }}</b><span>{{ $pmdT('waiter.payment.configured_methods_only') }}</span></div>
                        <div class="pmd-pos-method-grid" data-pos-methods></div>
                        <div class="pmd-pos-online-box" data-pos-online-box hidden></div>
                        <div class="pmd-pos-terminal-box" data-pos-terminal-box hidden></div>
                    </div>

                    <div class="pmd-pos-payment-block pmd-pos-adjustments">
                        <div>
                            <div class="pmd-pos-payment-block-title"><b>{{ $pmdT('shared.tip') }}</b><span>{{ $pmdT('shared.optional') }}</span></div>
                            <div class="pmd-pos-tip-buttons" data-pos-tip-buttons>
                                <button type="button" class="is-active" data-tip-percent="0">{{ $pmdT('waiter.payment.no_tip') }}</button>
                                <button type="button" data-tip-percent="5">5%</button>
                                <button type="button" data-tip-percent="10">10%</button>
                                <button type="button" data-tip-percent="custom">{{ $pmdT('shared.custom') }}</button>
                            </div>
                            <input type="number" min="0" step="0.01" class="pmd-pos-payment-input" data-pos-custom-tip placeholder="{{ $pmdT('waiter.payment.custom_tip') }}" hidden>
                        </div>
                        <div>
                            <div class="pmd-pos-payment-block-title"><b>{{ $pmdT('shared.coupon') }}</b><span>{{ $pmdT('waiter.payment.full_remaining_only') }}</span></div>
                            <div class="pmd-pos-coupon-row">
                                <input type="text" class="pmd-pos-payment-input" data-pos-coupon-code placeholder="{{ $pmdT('waiter.payment.coupon_code') }}" autocomplete="off">
                                <button type="button" data-pos-coupon-apply>{{ $pmdT('shared.apply') }}</button>
                            </div>
                            <div class="pmd-pos-coupon-result" data-pos-coupon-result></div>
                        </div>
                    </div>

                    <div class="pmd-pos-payment-block" data-pos-collection-fields>
                        <div class="pmd-pos-payment-fields">
                            <label><span>{{ $pmdT('waiter.payment.payer_label') }}</span><input type="text" class="pmd-pos-payment-input" data-pos-payer-label placeholder="{{ $pmdT('waiter.payment.payer_placeholder') }}"></label>
                            <label data-pos-reference-field hidden><span>{{ $pmdT('waiter.payment.terminal_reference') }}</span><input type="text" class="pmd-pos-payment-input" data-pos-payment-reference placeholder="{{ $pmdT('waiter.payment.external_reference_required') }}"></label>
                            <label data-pos-cash-field><span>{{ $pmdT('waiter.payment.cash_received') }}</span><input type="number" min="0" step="0.01" class="pmd-pos-payment-input" data-pos-cash-received></label>
                        </div>
                        <label class="pmd-pos-confirm-row" data-pos-external-confirm-row hidden><input type="checkbox" data-pos-external-confirm> {{ $pmdT('waiter.payment.external_confirmation') }}</label>
                    </div>
                </section>

                <aside class="pmd-pos-payment-summary">
                    <h3>{{ $pmdT('shared.payment_summary') }}</h3>
                    <div data-pos-payment-totals></div>
                    <div class="pmd-pos-change-box" data-pos-change-box hidden></div>
                    <button type="button" class="pmd-pos-pay-button" data-pos-pay-button>{{ $pmdT('waiter.payment.record_payment') }}</button>
                    <button type="button" class="pmd-pos-payment-secondary" data-pos-copy-link>{{ $pmdT('waiter.payment.copy_link') }}</button>
                    <button type="button" class="pmd-pos-payment-secondary" data-pos-refresh-payment>{{ $pmdT('waiter.payment.refresh_status') }}</button>
                    <p class="pmd-pos-payment-safety">{{ $pmdT('waiter.payment.provider_confirmation_safety') }}</p>

                    <div class="pmd-pos-payment-history-wrap">
                        <div class="pmd-pos-payment-block-title"><b>{{ $pmdT('shared.payment_history') }}</b><span data-pos-payment-history-count></span></div>
                        <div class="pmd-pos-payment-history" data-pos-payment-history></div>
                    </div>
                </aside>
            </div>
        </div>
    </div>

    <div class="pmd-pos-toast" data-pos-toast role="status" aria-live="polite"></div>
</section>
