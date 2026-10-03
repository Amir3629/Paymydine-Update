@php
    $isEmbedded = !empty($embedded);
@endphp
<section class="pmd-pos-app" data-pmd-pos-root data-pmd-pos-mode="{{ $isEmbedded ? 'overlay' : 'standalone' }}">
    <header class="pmd-pos-topbar">
        <div class="pmd-pos-top-left">
            <button type="button" class="pmd-pos-back" data-pos-close>← Back to floor</button>
            <span class="pmd-pos-status-dot" aria-hidden="true"></span>
            <span class="pmd-pos-waiter">{{ $bootstrap['user']['name'] ?? 'Waiter' }}</span>
        </div>

        <div class="pmd-pos-table-title">
            <strong>{{ $bootstrap['table']['name'] ?? 'Table' }}</strong>
            <span>
                @if(!empty($bootstrap['table']['section']))
                    {{ $bootstrap['table']['section'] }} ·
                @endif
                Quick waiter ordering
            </span>
        </div>

        <div class="pmd-pos-top-right">
            <button type="button" class="pmd-pos-ghost-btn" data-pos-clear>Clear cart</button>
            <button type="button" class="pmd-pos-icon-btn" data-pos-refresh title="Refresh order and menu" aria-label="Refresh order and menu">↻</button>
        </div>
    </header>

    <div class="pmd-pos-success" data-pos-success hidden></div>

    <main class="pmd-pos-workspace">
        <section class="pmd-pos-catalog" aria-label="Menu items">
            <div class="pmd-pos-tools">
                <label class="pmd-pos-search-wrap">
                    <input data-pos-search class="pmd-pos-search" type="search" autocomplete="off" placeholder="Search food, drink, category…">
                    <span class="pmd-pos-search-icon">⌕</span>
                </label>
                <div class="pmd-pos-view-toggle" aria-label="View mode">
                    <button type="button" class="is-active" data-pos-view="grid" title="Grid view" aria-label="Grid view">▦</button>
                    <button type="button" data-pos-view="list" title="Compact list view" aria-label="Compact list view">☷</button>
                </div>
            </div>

            <div class="pmd-pos-warning" data-pos-menu-warning hidden></div>
            <nav data-pos-categories class="pmd-pos-categories" aria-label="Menu categories"></nav>
            <div class="pmd-pos-menu-scroll">
                <div data-pos-menu class="pmd-pos-menu-grid"></div>
            </div>
        </section>

        <aside class="pmd-pos-cart" data-pos-cart aria-label="Current order">
            <div class="pmd-pos-cart-head">
                <div class="pmd-pos-cart-head-row">
                    <div>
                        <h2>Current order</h2>
                        <span class="pmd-pos-order-pill" data-pos-order-pill>New order</span>
                    </div>
                    <button type="button" class="pmd-pos-icon-btn pmd-pos-mobile-only" data-pos-close-cart aria-label="Close cart">×</button>
                </div>
                <div class="pmd-pos-guest-row">
                    <span><b>Guests</b><br><small>Table covers</small></span>
                    <div class="pmd-pos-stepper">
                        <button type="button" data-pos-guest-minus aria-label="Decrease guests">−</button>
                        <span data-pos-guests>1</span>
                        <button type="button" data-pos-guest-plus aria-label="Increase guests">+</button>
                    </div>
                </div>
            </div>

            <div class="pmd-pos-existing" data-pos-existing></div>

            <section class="pmd-pos-sent-section" data-pos-sent-section hidden>
                <div class="pmd-pos-section-heading">
                    <span>Already sent</span>
                    <small data-pos-kitchen-status></small>
                </div>
                <div class="pmd-pos-sent-list" data-pos-sent-list></div>
            </section>

            <section class="pmd-pos-new-section">
                <div class="pmd-pos-section-heading">
                    <span>New items</span>
                    <small>Not sent yet</small>
                </div>
                <div class="pmd-pos-cart-list" data-pos-cart-list></div>
            </section>

            <div class="pmd-pos-checkout">
                <textarea data-pos-table-note class="pmd-pos-table-note" placeholder="Order note for kitchen or service…"></textarea>

                <div class="pmd-pos-totals">
                    <div class="pmd-pos-total-row"><span>New items</span><b data-pos-subtotal>€0.00</b></div>
                    <div class="pmd-pos-total-row" data-pos-existing-total-row hidden><span>Existing order</span><b data-pos-existing-total>€0.00</b></div>
                    <div class="pmd-pos-total-row grand"><span>Order total</span><b data-pos-total>€0.00</b></div>
                </div>

                <div class="pmd-pos-actions">
                    <button type="button" class="pmd-pos-action hold" data-pos-hold>
                        <span>Save / Hold</span><small>Do not send</small>
                    </button>
                    <button type="button" class="pmd-pos-action send" data-pos-send>Send to kitchen</button>
                </div>

                <div class="pmd-pos-secondary-actions">
                    <button type="button" data-pos-edit-order disabled>Edit order</button>
                    <button type="button" data-pos-payment disabled>Payment</button>
                    <button type="button" data-pos-print disabled>Print</button>
                </div>
            </div>
        </aside>
    </main>

    <button type="button" class="pmd-pos-mobile-cart-bar" data-pos-mobile-cart>
        <span><b>View order</b><small data-pos-mobile-count>0 items</small></span>
        <span class="pmd-pos-mobile-cart-total" data-pos-mobile-total>€0.00</span>
    </button>

    <div class="pmd-pos-modal" data-pos-modifier-modal aria-hidden="true">
        <div class="pmd-pos-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-modifier-title">
            <div class="pmd-pos-modal-head">
                <h2 id="pmd-pos-modifier-title" data-pos-modal-title>Options</h2>
                <button type="button" class="pmd-pos-modal-close" data-pos-modal-close aria-label="Close">×</button>
            </div>
            <div class="pmd-pos-modal-body" data-pos-modal-body></div>
            <div class="pmd-pos-modal-foot">
                <button type="button" class="pmd-pos-modal-cancel" data-pos-modal-cancel>Cancel</button>
                <button type="button" class="pmd-pos-modal-add" data-pos-modal-add>Add item</button>
            </div>
        </div>
    </div>

    <div class="pmd-pos-payment-modal" data-pos-payment-modal aria-hidden="true">
        <div class="pmd-pos-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-payment-title">
            <header class="pmd-pos-payment-head">
                <div>
                    <span class="pmd-pos-payment-eyebrow">PAYMENT CENTER</span>
                    <h2 id="pmd-pos-payment-title">Settle order</h2>
                    <p data-pos-payment-subtitle></p>
                </div>
                <button type="button" class="pmd-pos-payment-close" data-pos-payment-close aria-label="Close payment">×</button>
            </header>

            <div class="pmd-pos-payment-body">
                <section class="pmd-pos-payment-main">
                    <div class="pmd-pos-payment-balance" data-pos-payment-balance></div>

                    <div class="pmd-pos-payment-block">
                        <div class="pmd-pos-payment-block-title"><b>Split bill</b><span>Choose what this payer covers</span></div>
                        <div class="pmd-pos-split-tabs" data-pos-split-tabs>
                            <button type="button" class="is-active" data-split-mode="full">Full bill</button>
                            <button type="button" data-split-mode="equal">Equally</button>
                            <button type="button" data-split-mode="items">By items</button>
                            <button type="button" data-split-mode="custom">Custom</button>
                        </div>
                        <div class="pmd-pos-split-panel" data-pos-split-panel></div>
                    </div>

                    <div class="pmd-pos-payment-block">
                        <div class="pmd-pos-payment-block-title"><b>Payment method</b><span>Only configured methods are shown</span></div>
                        <div class="pmd-pos-method-grid" data-pos-methods></div>
                        <div class="pmd-pos-online-box" data-pos-online-box hidden></div>
                        <div class="pmd-pos-terminal-box" data-pos-terminal-box hidden></div>
                    </div>

                    <div class="pmd-pos-payment-block pmd-pos-adjustments">
                        <div>
                            <div class="pmd-pos-payment-block-title"><b>Tip</b><span>Optional</span></div>
                            <div class="pmd-pos-tip-buttons" data-pos-tip-buttons>
                                <button type="button" class="is-active" data-tip-percent="0">No tip</button>
                                <button type="button" data-tip-percent="5">5%</button>
                                <button type="button" data-tip-percent="10">10%</button>
                                <button type="button" data-tip-percent="custom">Custom</button>
                            </div>
                            <input type="number" min="0" step="0.01" class="pmd-pos-payment-input" data-pos-custom-tip placeholder="Custom tip" hidden>
                        </div>
                        <div>
                            <div class="pmd-pos-payment-block-title"><b>Coupon</b><span>Full remaining balance only</span></div>
                            <div class="pmd-pos-coupon-row">
                                <input type="text" class="pmd-pos-payment-input" data-pos-coupon-code placeholder="Coupon code" autocomplete="off">
                                <button type="button" data-pos-coupon-apply>Apply</button>
                            </div>
                            <div class="pmd-pos-coupon-result" data-pos-coupon-result></div>
                        </div>
                    </div>

                    <div class="pmd-pos-payment-block" data-pos-collection-fields>
                        <div class="pmd-pos-payment-fields">
                            <label><span>Payer / guest label</span><input type="text" class="pmd-pos-payment-input" data-pos-payer-label placeholder="Guest 1, Anna, Seat 2…"></label>
                            <label data-pos-reference-field hidden><span>Terminal approval / receipt reference</span><input type="text" class="pmd-pos-payment-input" data-pos-payment-reference placeholder="Required for external terminal"></label>
                            <label data-pos-cash-field><span>Cash received</span><input type="number" min="0" step="0.01" class="pmd-pos-payment-input" data-pos-cash-received></label>
                        </div>
                        <label class="pmd-pos-confirm-row" data-pos-external-confirm-row hidden><input type="checkbox" data-pos-external-confirm> I confirm the external terminal approved this exact amount.</label>
                    </div>
                </section>

                <aside class="pmd-pos-payment-summary">
                    <h3>Payment summary</h3>
                    <div data-pos-payment-totals></div>
                    <div class="pmd-pos-change-box" data-pos-change-box hidden></div>
                    <button type="button" class="pmd-pos-pay-button" data-pos-pay-button>Record payment</button>
                    <button type="button" class="pmd-pos-payment-secondary" data-pos-copy-link>Copy customer payment link</button>
                    <button type="button" class="pmd-pos-payment-secondary" data-pos-refresh-payment>Refresh payment status</button>
                    <p class="pmd-pos-payment-safety">Online and direct-terminal payments are never marked successful without provider confirmation.</p>

                    <div class="pmd-pos-payment-history-wrap">
                        <div class="pmd-pos-payment-block-title"><b>Payment history</b><span data-pos-payment-history-count></span></div>
                        <div class="pmd-pos-payment-history" data-pos-payment-history></div>
                    </div>
                </aside>
            </div>
        </div>
    </div>

    <div class="pmd-pos-toast" data-pos-toast role="status" aria-live="polite"></div>
</section>
