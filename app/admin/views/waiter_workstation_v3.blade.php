<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#080c12">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter Workstation · PayMyDine</title>
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-workstation-v3.css') }}?v=300">
</head>
<body>
<div
    id="pmd-ws3"
    class="pmd-ws3"
    data-pmd-ws3
    data-launcher-url="{{ $launcherUrl }}"
    data-notifications-url="{{ $notificationsUrl }}"
    data-reservations-url="{{ $reservationsUrl }}"
    data-table-data-url="{{ $tableDataUrl }}"
    data-save-url="{{ $saveUrl }}"
    data-payment-summary-url="{{ $paymentSummaryUrl }}"
    data-payment-coupon-url="{{ $paymentCouponUrl }}"
    data-payment-settle-url="{{ $paymentSettleUrl }}"
    data-terminal-payment-url="{{ $terminalPaymentUrl }}"
    data-operations-url="{{ $operationsUrl }}"
    data-table-state-url="{{ $tableStateUrl }}"
>
    <header class="pmd-ws3-topbar">
        <button type="button" class="pmd-ws3-brand" data-ws3-home aria-label="Show tables">
            <span class="pmd-ws3-logo">P</span>
            <span><strong>WAITER WORKSTATION</strong><small data-ws3-user>CONNECTING</small></span>
        </button>
        <div class="pmd-ws3-top-actions">
            <span class="pmd-ws3-online" data-ws3-online><i></i><b>LIVE</b></span>
            <button type="button" data-ws3-reservations>RESERVATIONS</button>
            <button type="button" class="has-counter" data-ws3-alerts>ALERTS <b data-ws3-alert-count hidden>0</b></button>
            <button type="button" data-ws3-refresh aria-label="Refresh">↻</button>
        </div>
    </header>

    <main class="pmd-ws3-screen is-active" data-ws3-screen="tables">
        <section class="pmd-ws3-table-command">
            <div class="pmd-ws3-filter-tabs" role="tablist">
                <button type="button" data-ws3-filter="mine"><span>MY TABLES</span><b data-ws3-count="mine">0</b></button>
                <button type="button" data-ws3-filter="open" class="is-active"><span>OPEN</span><b data-ws3-count="open">0</b></button>
                <button type="button" data-ws3-filter="attention"><span>ATTENTION</span><b data-ws3-count="attention">0</b></button>
                <button type="button" data-ws3-filter="free"><span>FREE</span><b data-ws3-count="free">0</b></button>
                <button type="button" data-ws3-filter="all"><span>ALL</span><b data-ws3-count="all">0</b></button>
            </div>
            <label class="pmd-ws3-search"><span>⌕</span><input type="search" data-ws3-table-search placeholder="TABLE, AREA OR STATUS" autocomplete="off"></label>
        </section>
        <nav class="pmd-ws3-area-tabs" data-ws3-areas aria-label="Areas"></nav>
        <section class="pmd-ws3-stats">
            <article><span>OPEN CHECKS</span><strong data-ws3-stat="open">0</strong></article>
            <article><span>READY / CALLS</span><strong data-ws3-stat="attention">0</strong></article>
            <article><span>PAYMENT DUE</span><strong data-ws3-stat="due">€0.00</strong></article>
            <article><span>FREE TABLES</span><strong data-ws3-stat="free">0</strong></article>
        </section>
        <section class="pmd-ws3-table-stage">
            <div class="pmd-ws3-inline-status" data-ws3-table-status>LOADING LIVE TABLES…</div>
            <div class="pmd-ws3-table-grid" data-ws3-table-grid></div>
        </section>
    </main>

    <main class="pmd-ws3-screen" data-ws3-screen="order" hidden>
        <section class="pmd-ws3-order-head">
            <button type="button" data-ws3-back-tables>← TABLES</button>
            <div><strong data-ws3-table-title>TABLE</strong><small data-ws3-table-subtitle>QUICK ORDERING</small></div>
            <div>
                <button type="button" data-ws3-order-refresh>REFRESH</button>
                <button type="button" data-ws3-more>MORE</button>
            </div>
        </section>

        <section class="pmd-ws3-order-layout">
            <aside class="pmd-ws3-category-rail" data-ws3-categories></aside>
            <section class="pmd-ws3-catalog">
                <label class="pmd-ws3-menu-search"><span>⌕</span><input type="search" data-ws3-menu-search placeholder="SEARCH MENU" autocomplete="off"></label>
                <div class="pmd-ws3-quick-row">
                    <button type="button" data-ws3-quick="popular">POPULAR</button>
                    <button type="button" data-ws3-quick="recent">RECENT</button>
                    <button type="button" data-ws3-quick="all" class="is-active">ALL ITEMS</button>
                </div>
                <div class="pmd-ws3-products" data-ws3-products></div>
            </section>
            <aside class="pmd-ws3-ticket" data-ws3-ticket>
                <header>
                    <div><strong>CURRENT ORDER</strong><small data-ws3-order-pill>NEW ORDER</small></div>
                    <button type="button" data-ws3-close-ticket aria-label="Close order on phone">×</button>
                </header>
                <section class="pmd-ws3-guests">
                    <div><strong>GUESTS</strong><small>TABLE COVERS</small></div>
                    <div><button type="button" data-ws3-guests-minus>−</button><b data-ws3-guests>1</b><button type="button" data-ws3-guests-plus>+</button></div>
                </section>
                <section class="pmd-ws3-sent" data-ws3-sent-section hidden>
                    <div class="pmd-ws3-section-title"><span>SENT ITEMS</span><small data-ws3-kitchen-status></small></div>
                    <div data-ws3-sent-items></div>
                </section>
                <section class="pmd-ws3-new-items">
                    <div class="pmd-ws3-section-title"><span>NEW ITEMS</span><small>NOT SENT YET</small></div>
                    <div class="pmd-ws3-cart" data-ws3-cart></div>
                </section>
                <textarea data-ws3-table-note placeholder="ORDER NOTE FOR KITCHEN OR SERVICE"></textarea>
                <section class="pmd-ws3-ticket-total">
                    <div><span>NEW ITEMS</span><b data-ws3-new-total>€0.00</b></div>
                    <div class="grand"><span>ORDER TOTAL</span><b data-ws3-total>€0.00</b></div>
                </section>
                <section class="pmd-ws3-ticket-actions">
                    <button type="button" class="hold" data-ws3-hold>HOLD</button>
                    <button type="button" class="send" data-ws3-send>SEND ORDER</button>
                    <button type="button" class="pay" data-ws3-pay>PAY / SPLIT</button>
                    <button type="button" data-ws3-receipt>RECEIPT</button>
                </section>
            </aside>
        </section>
        <button type="button" class="pmd-ws3-mobile-order" data-ws3-mobile-order>
            <span><b data-ws3-mobile-count>0 ITEMS</b><small data-ws3-mobile-total>€0.00</small></span><strong>ORDER ›</strong>
        </button>
    </main>

    <main class="pmd-ws3-screen" data-ws3-screen="payment" hidden>
        <section class="pmd-ws3-payment-head">
            <button type="button" data-ws3-payment-back>← ORDER</button>
            <div><small>PAYMENT CENTER</small><strong data-ws3-payment-title>SETTLE ORDER</strong><span data-ws3-payment-subtitle></span></div>
            <button type="button" data-ws3-payment-refresh>REFRESH</button>
        </section>
        <section class="pmd-ws3-payment-layout">
            <section class="pmd-ws3-payment-column coverage">
                <div class="pmd-ws3-balance-cards" data-ws3-balance-cards></div>
                <div class="pmd-ws3-panel">
                    <div class="pmd-ws3-panel-title"><strong>PAYMENT COVERAGE</strong><small>FULL, EQUAL, ITEMS OR SHARES</small></div>
                    <div class="pmd-ws3-split-tabs">
                        <button type="button" data-ws3-split="full" class="is-active">FULL</button>
                        <button type="button" data-ws3-split="equal">EQUALLY</button>
                        <button type="button" data-ws3-split="items">BY ITEMS</button>
                        <button type="button" data-ws3-split="shares">BY SHARES</button>
                    </div>
                    <div data-ws3-split-panel></div>
                </div>
            </section>
            <section class="pmd-ws3-payment-column tender">
                <div class="pmd-ws3-panel">
                    <div class="pmd-ws3-panel-title"><strong>PAYMENT METHOD</strong><small>ONLY CONFIGURED METHODS</small></div>
                    <div class="pmd-ws3-methods" data-ws3-methods></div>
                    <div class="pmd-ws3-method-detail" data-ws3-method-detail></div>
                </div>
                <div class="pmd-ws3-panel pmd-ws3-adjustments">
                    <div>
                        <div class="pmd-ws3-panel-title"><strong>TIP</strong><small>OPTIONAL</small></div>
                        <div class="pmd-ws3-tip-tabs">
                            <button type="button" data-ws3-tip="0" class="is-active">NO TIP</button>
                            <button type="button" data-ws3-tip="5">5%</button>
                            <button type="button" data-ws3-tip="10">10%</button>
                            <button type="button" data-ws3-tip="custom">CUSTOM</button>
                        </div>
                        <input type="number" min="0" step="0.01" data-ws3-custom-tip placeholder="CUSTOM TIP" hidden>
                    </div>
                    <div>
                        <div class="pmd-ws3-panel-title"><strong>COUPON</strong><small>FULL BALANCE ONLY</small></div>
                        <div class="pmd-ws3-coupon-row"><input data-ws3-coupon placeholder="COUPON CODE"><button type="button" data-ws3-coupon-apply>APPLY</button></div>
                        <small data-ws3-coupon-result></small>
                    </div>
                </div>
                <div class="pmd-ws3-panel pmd-ws3-tender-panel">
                    <div class="pmd-ws3-panel-title"><strong>AMOUNT TENDERED</strong><b data-ws3-tender-display>0.00</b></div>
                    <div class="pmd-ws3-keypad" data-ws3-keypad>
                        <button>1</button><button>2</button><button>3</button><button data-key="exact">EXACT</button>
                        <button>4</button><button>5</button><button>6</button><button data-key="plus5">+5</button>
                        <button>7</button><button>8</button><button>9</button><button data-key="plus10">+10</button>
                        <button data-key="clear">C</button><button>0</button><button data-key="00">00</button><button data-key="back">⌫</button>
                    </div>
                    <input class="pmd-ws3-payer-input" data-ws3-payer placeholder="PAYER / GUEST LABEL (OPTIONAL)">
                </div>
            </section>
            <aside class="pmd-ws3-payment-summary">
                <strong>PAYMENT SUMMARY</strong>
                <div data-ws3-payment-totals></div>
                <div class="pmd-ws3-change" data-ws3-change hidden></div>
                <button type="button" class="primary" data-ws3-collect>COLLECT PAYMENT</button>
                <button type="button" data-ws3-copy-link>COPY CUSTOMER PAYMENT LINK</button>
                <button type="button" data-ws3-payment-status>REFRESH PAYMENT STATUS</button>
                <div class="pmd-ws3-payment-history"><div class="pmd-ws3-panel-title"><strong>PAYMENT HISTORY</strong></div><div data-ws3-payment-history></div></div>
            </aside>
        </section>
    </main>

    <aside class="pmd-ws3-drawer" data-ws3-drawer="alerts" hidden aria-hidden="true">
        <button type="button" class="backdrop" data-ws3-close-drawer></button>
        <section><header><div><small>LIVE SERVICE</small><strong>ALERTS & ACTIVITY</strong></div><button data-ws3-close-drawer>×</button></header><div data-ws3-alert-list></div></section>
    </aside>

    <aside class="pmd-ws3-drawer" data-ws3-drawer="modifier" hidden aria-hidden="true">
        <button type="button" class="backdrop" data-ws3-close-drawer></button>
        <section><header><div><small>MODIFIERS</small><strong data-ws3-modifier-title>ITEM</strong></div><button data-ws3-close-drawer>×</button></header><div data-ws3-modifier-body></div><footer><button data-ws3-close-drawer>CANCEL</button><button class="primary" data-ws3-modifier-add>ADD ITEM</button></footer></section>
    </aside>

    <aside class="pmd-ws3-drawer wide" data-ws3-drawer="operations" hidden aria-hidden="true">
        <button type="button" class="backdrop" data-ws3-close-drawer></button>
        <section><header><div><small>CHECK TOOLS</small><strong>ORDER & TABLE OPERATIONS</strong></div><button data-ws3-close-drawer>×</button></header><div data-ws3-operations-body></div></section>
    </aside>

    <div class="pmd-ws3-confirm" data-ws3-confirm hidden aria-hidden="true">
        <section><strong data-ws3-confirm-title>CONFIRM</strong><p data-ws3-confirm-message></p><input data-ws3-confirm-input hidden><div><button data-ws3-confirm-cancel>CANCEL</button><button class="danger" data-ws3-confirm-ok>CONFIRM</button></div></section>
    </div>

    <div class="pmd-ws3-toast" data-ws3-toast role="status" aria-live="polite"></div>
</div>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-workstation-v3.js') }}?v=300"></script>
</body>
</html>
