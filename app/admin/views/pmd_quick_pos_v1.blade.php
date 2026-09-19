<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#111827">
    <title>PayMyDine POS</title>
    <link rel="icon" type="image/svg+xml" href="/app/admin/assets/images/pmd-favicon-final-20260822.svg">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-quick-pos-v1.css?v=20260919-8">
</head>
<body class="pmd-qpos-body">
<div
    id="pmd-quick-pos"
    class="pmd-qpos"
    data-mode="{{ $mode }}"
    data-bootstrap-url="/admin/pos/bootstrap/{{ $mode }}"
    data-can-switch-mode="{{ $canSwitchMode ? '1' : '0' }}"
>
    <header class="pmd-qpos-topbar">
        <div class="pmd-qpos-brand">
            <span class="pmd-qpos-brand-mark">P</span>
            <div>
                <strong>PayMyDine POS</strong>
                <small data-qpos-context></small>
            </div>
        </div>

        <nav class="pmd-qpos-mode-switch" data-qpos-mode-switch @if(!$canSwitchMode) hidden @endif>
            <a href="/admin/pos" class="{{ $mode === 'cashier' ? 'is-active' : '' }}">Cashier</a>
            <a href="/admin/pos/waiter" class="{{ $mode === 'waiter' ? 'is-active' : '' }}">Waiter</a>
        </nav>

        <div class="pmd-qpos-top-actions">
            <span class="pmd-qpos-online" data-qpos-online><i></i> Online</span>
            <button type="button" class="pmd-qpos-icon-button" data-qpos-refresh aria-label="Refresh">↻</button>
            <a class="pmd-qpos-legacy-link" href="{{ $legacyOrdersUrl }}">Orders</a>
            <span class="pmd-qpos-user" data-qpos-user>Staff</span>
        </div>
    </header>

    <main class="pmd-qpos-main">
        <aside class="pmd-qpos-left">
            <section class="pmd-qpos-service" data-qpos-service-panel>
                <div class="pmd-qpos-section-label">Type</div>
                <div class="pmd-qpos-segmented">
                    <button type="button" class="is-active" data-qpos-service="dine_in">Dine</button>
                    <button type="button" data-qpos-service="takeaway">Takeout</button>
                    <button type="button" data-qpos-service="delivery">Delivery</button>
                </div>
            </section>

            <section class="pmd-qpos-tables">
                <div class="pmd-qpos-panel-head">
                    <div>
                        <div class="pmd-qpos-section-label">Floor</div>
                        <strong data-qpos-table-title>Table</strong>
                    </div>
                    <span class="pmd-qpos-table-count" data-qpos-table-count>0</span>
                </div>
                <div class="pmd-qpos-table-legend">
                    <span><i class="available"></i>Free</span>
                    <span><i class="occupied"></i>Busy</span>
                    <span><i class="reserved"></i>Res.</span>
                    <span><i class="cleaning"></i>Clean</span>
                </div>
                <div class="pmd-qpos-table-grid" data-qpos-tables>
                    <div class="pmd-qpos-skeleton-block"></div>
                    <div class="pmd-qpos-skeleton-block"></div>
                    <div class="pmd-qpos-skeleton-block"></div>
                    <div class="pmd-qpos-skeleton-block"></div>
                </div>
            </section>
        </aside>

        <section class="pmd-qpos-catalog">
            <div class="pmd-qpos-catalog-head">
                <label class="pmd-qpos-search">
                    <span>⌕</span>
                    <input type="search" autocomplete="off" placeholder="Search…" data-qpos-search>
                </label>
                <button type="button" class="pmd-qpos-new-check" data-qpos-new-check>+ Check</button>
            </div>

            <div class="pmd-qpos-categories" data-qpos-categories>
                <button type="button" class="is-active" data-category="all">All</button>
            </div>

            <div class="pmd-qpos-catalog-status" data-qpos-catalog-status>
                Select table
            </div>

            <div class="pmd-qpos-product-grid" data-qpos-products></div>
        </section>

        <aside class="pmd-qpos-cart">
            <div class="pmd-qpos-cart-head">
                <div>
                    <span class="pmd-qpos-section-label">Check</span>
                    <strong data-qpos-check-title>New</strong>
                </div>
                <button type="button" class="pmd-qpos-cart-close" data-qpos-cart-close aria-label="Close cart">×</button>
                <div class="pmd-qpos-guests">
                    <button type="button" data-qpos-guests-minus>−</button>
                    <span><b data-qpos-guests>1</b><small>pax</small></span>
                    <button type="button" data-qpos-guests-plus>+</button>
                </div>
            </div>

            <div class="pmd-qpos-open-checks" data-qpos-open-checks hidden></div>

            <div class="pmd-qpos-sent" data-qpos-sent hidden>
                <div class="pmd-qpos-subhead">
                    <strong>Sent</strong>
                    <span data-qpos-sent-total></span>
                </div>
                <div data-qpos-sent-items></div>
            </div>

            <div class="pmd-qpos-cart-list" data-qpos-cart-list>
                <div class="pmd-qpos-empty-cart">
                    <strong>No items</strong>
                </div>
            </div>

            <label class="pmd-qpos-order-note">
                <span>Note</span>
                <textarea rows="2" placeholder="Kitchen / allergy / request" data-qpos-note></textarea>
            </label>

            <div class="pmd-qpos-cart-summary">
                <div><span>New</span><strong data-qpos-new-total>€0.00</strong></div>
                <div class="grand"><span>Total</span><strong data-qpos-total>€0.00</strong></div>
            </div>

            <div class="pmd-qpos-cart-actions">
                <button type="button" class="secondary" data-qpos-hold>Hold</button>
                <button type="button" class="primary" data-qpos-send>Send</button>
                <button type="button" class="pay" data-qpos-pay disabled>Pay</button>
            </div>

            <div class="pmd-qpos-table-actions" data-qpos-table-actions hidden>
                <button type="button" data-qpos-table-cleaning>Left</button>
                <button type="button" data-qpos-table-free>Free</button>
            </div>
        </aside>
    </main>

    <button type="button" class="pmd-qpos-mobile-cart" data-qpos-mobile-cart>
        <span><b data-qpos-mobile-count>0</b></span>
        <strong data-qpos-mobile-total>€0.00</strong>
    </button>

    <div class="pmd-qpos-modal" data-qpos-modifier-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-modifier-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">Item</span>
                    <h2 data-qpos-modifier-name>Product</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-modifier-close>×</button>
            </header>
            <div class="pmd-qpos-modifier-body">
                <div class="pmd-qpos-modifier-meta" data-qpos-modifier-meta></div>
                <div data-qpos-modifier-options></div>
                <label class="pmd-qpos-field">
                    <span>Note</span>
                    <input type="text" data-qpos-modifier-note placeholder="No onions, medium, allergy…">
                </label>
            </div>
            <footer>
                <div class="pmd-qpos-modal-qty">
                    <button type="button" data-qpos-modifier-minus>−</button>
                    <strong data-qpos-modifier-qty>1</strong>
                    <button type="button" data-qpos-modifier-plus>+</button>
                </div>
                <button type="button" class="pmd-qpos-modal-primary" data-qpos-modifier-add>Add <span data-qpos-modifier-price></span></button>
            </footer>
        </div>
    </div>

    <div class="pmd-qpos-modal" data-qpos-payment-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-payment-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">Payment</span>
                    <h2 data-qpos-payment-title>Collect payment</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-payment-close>×</button>
            </header>

            <div class="pmd-qpos-payment-body">
                <div class="pmd-qpos-payment-balance">
                    <span>Due</span>
                    <strong data-qpos-payment-remaining>€0.00</strong>
                    <small data-qpos-payment-settled></small>
                </div>

                <div class="pmd-qpos-payment-methods" data-qpos-payment-methods>
                    <button type="button" class="is-active" data-payment-method="cash">Cash</button>
                                    </div>

                <div class="pmd-qpos-payment-grid">
                    <label class="pmd-qpos-field">
                        <span>Pay</span>
                        <input
                            type="text"
                            inputmode="none"
                            autocomplete="off"
                            spellcheck="false"
                            data-qpos-payment-amount
                            data-qpos-keypad-target="amount"
                        >
                    </label>
                    <label class="pmd-qpos-field" data-qpos-cash-field>
                        <span>Cash</span>
                        <input
                            type="text"
                            inputmode="none"
                            autocomplete="off"
                            spellcheck="false"
                            data-qpos-cash-received
                            data-qpos-keypad-target="cash"
                        >
                    </label>
                </div>

                <div class="pmd-qpos-cash-presets" data-qpos-cash-presets>
                    <button type="button" data-cash-preset="exact">Exact</button>
                </div>

                <section class="pmd-qpos-touch-keypad" data-qpos-touch-keypad hidden>
                    <header>
                        <div>
                            <span data-qpos-touch-keypad-label>Payment amount</span>
                            <strong data-qpos-touch-keypad-value>€0.00</strong>
                        </div>
                        
                    </header>
                    <div class="pmd-qpos-touch-keypad-grid">
                        <button type="button" data-qpos-keypad-key="1">1</button>
                        <button type="button" data-qpos-keypad-key="2">2</button>
                        <button type="button" data-qpos-keypad-key="3">3</button>
                        <button type="button" class="utility" data-qpos-keypad-key="backspace" aria-label="Backspace">⌫</button>

                        <button type="button" data-qpos-keypad-key="4">4</button>
                        <button type="button" data-qpos-keypad-key="5">5</button>
                        <button type="button" data-qpos-keypad-key="6">6</button>
                        <button type="button" class="utility" data-qpos-keypad-key="clear">C</button>

                        <button type="button" data-qpos-keypad-key="7">7</button>
                        <button type="button" data-qpos-keypad-key="8">8</button>
                        <button type="button" data-qpos-keypad-key="9">9</button>
                        <button type="button" class="exact" data-qpos-keypad-key="exact" data-qpos-keypad-exact>Exact</button>

                        <button type="button" data-qpos-keypad-key="00">00</button>
                        <button type="button" data-qpos-keypad-key="0">0</button>
                        <button type="button" data-qpos-keypad-key=".">.</button>
                        <button type="button" class="done" data-qpos-keypad-key="done">Done</button>
                    </div>
                </section>

                <div class="pmd-qpos-tip-row">
                    <span>Tip</span>
                    <button type="button" class="is-active" data-tip="0">No tip</button>
                    <button type="button" data-tip="5">5%</button>
                    <button type="button" data-tip="10">10%</button>
                    <button type="button" data-tip="15">15%</button>
                </div>

                <div class="pmd-qpos-terminals" data-qpos-terminals hidden>
                    <span class="pmd-qpos-section-label">Terminal</span>
                    <div data-qpos-terminal-list></div>
                </div>

                <div class="pmd-qpos-change" data-qpos-change hidden>
                    Change <strong data-qpos-change-amount>€0.00</strong>
                </div>

                <div class="pmd-qpos-payment-error" data-qpos-payment-error hidden></div>
            </div>

            <footer class="pmd-qpos-payment-footer">
                <div>
                    <span>Total</span>
                    <strong data-qpos-payment-charge>€0.00</strong>
                </div>
                <div class="pmd-qpos-payment-final-actions">
                    <a
                        class="pmd-qpos-receipt-link"
                        data-qpos-payment-receipt
                        href="#"
                        target="_blank"
                        rel="noopener"
                        hidden
                    >Receipt</a>
                    <button type="button" class="pmd-qpos-modal-primary" data-qpos-payment-submit>Record payment</button>
                </div>
            </footer>
        </div>
    </div>

    <div class="pmd-qpos-toast" data-qpos-toast role="status"></div>
</div>

<script>
window.PMDQuickPOSConfig = {
    mode: @json($mode),
    canSwitchMode: @json((bool)$canSwitchMode)
};
</script>
<script src="/app/admin/assets/js/pmd-quick-pos-v1.js?v=20260919-8"></script>
<script src="/app/admin/assets/js/pmd-site-access-hub-v13.js?v=20260919-qpos1"></script>
</body>
</html>
