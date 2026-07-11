<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter POS · {{ $bootstrap['table']['name'] ?? 'Table' }}</title>
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=1">
</head>
<body class="pmd-waiter-pos-page">
<div class="pmd-pos-app" id="pmd-pos-app">
    <header class="pmd-pos-topbar">
        <div class="pmd-pos-top-left">
            <button type="button" class="pmd-pos-back" onclick="location.href='/admin/dashboardwaiter'">← Back to floor</button>
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
            <button type="button" class="pmd-pos-ghost-btn" id="pmd-pos-clear">Clear cart</button>
            <button type="button" class="pmd-pos-icon-btn" title="Refresh" onclick="location.reload()">↻</button>
        </div>
    </header>

    <main class="pmd-pos-workspace">
        <section class="pmd-pos-catalog" aria-label="Menu items">
            <div class="pmd-pos-tools">
                <label class="pmd-pos-search-wrap">
                    <input id="pmd-pos-search" class="pmd-pos-search" type="search" autocomplete="off" placeholder="Search food, drink, category…">
                    <span class="pmd-pos-search-icon">⌕</span>
                </label>
                <div class="pmd-pos-view-toggle" aria-label="View mode">
                    <button type="button" class="is-active" title="Grid">▦</button>
                    <button type="button" title="Compact">☷</button>
                </div>
            </div>

            <nav id="pmd-pos-categories" class="pmd-pos-categories" aria-label="Menu categories"></nav>
            <div class="pmd-pos-menu-scroll">
                <div id="pmd-pos-menu" class="pmd-pos-menu-grid"></div>
            </div>
        </section>

        <aside class="pmd-pos-cart" id="pmd-pos-cart" aria-label="Current order">
            <div class="pmd-pos-cart-head">
                <div class="pmd-pos-cart-head-row">
                    <div>
                        <h2>Current order</h2>
                        <span class="pmd-pos-order-pill" id="pmd-pos-order-pill">New order</span>
                    </div>
                    <button type="button" class="pmd-pos-icon-btn" id="pmd-pos-close-cart" style="background:#eef3f8;color:#061126;border-color:#d7e0ea" aria-label="Close cart">×</button>
                </div>
                <div class="pmd-pos-guest-row">
                    <span><b>Guests</b><br><small style="color:#64748b">Table covers</small></span>
                    <div class="pmd-pos-stepper">
                        <button type="button" id="pmd-pos-guest-minus" aria-label="Decrease guests">−</button>
                        <span id="pmd-pos-guests">1</span>
                        <button type="button" id="pmd-pos-guest-plus" aria-label="Increase guests">+</button>
                    </div>
                </div>
            </div>

            <div class="pmd-pos-existing" id="pmd-pos-existing"></div>
            <div class="pmd-pos-cart-list" id="pmd-pos-cart-list"></div>

            <div class="pmd-pos-checkout">
                <textarea id="pmd-pos-table-note" class="pmd-pos-table-note" placeholder="Order note for kitchen or service…"></textarea>

                <div class="pmd-pos-totals">
                    <div class="pmd-pos-total-row"><span>Subtotal</span><b id="pmd-pos-subtotal">€0.00</b></div>
                    <div class="pmd-pos-total-row grand"><span>Total</span><b id="pmd-pos-total">€0.00</b></div>
                </div>

                <div class="pmd-pos-actions">
                    <button type="button" class="pmd-pos-action hold" id="pmd-pos-hold">Hold</button>
                    <button type="button" class="pmd-pos-action send" id="pmd-pos-send">Send to kitchen</button>
                </div>

                <div class="pmd-pos-secondary-actions">
                    <button type="button" id="pmd-pos-edit-order">Edit order</button>
                    <button type="button" id="pmd-pos-payment">Payment</button>
                    <button type="button" id="pmd-pos-print">Print</button>
                </div>
            </div>
        </aside>
    </main>

    <button type="button" class="pmd-pos-mobile-cart-bar" id="pmd-pos-mobile-cart">
        <span><b>View order</b><small id="pmd-pos-mobile-count">0 items</small></span>
        <span class="pmd-pos-mobile-cart-total" id="pmd-pos-mobile-total">€0.00</span>
    </button>
</div>

<div class="pmd-pos-modal" id="pmd-pos-modifier-modal" aria-hidden="true">
    <div class="pmd-pos-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-modal-title">
        <div class="pmd-pos-modal-head">
            <h2 id="pmd-pos-modal-title">Options</h2>
            <button type="button" class="pmd-pos-modal-close" id="pmd-pos-modal-close" aria-label="Close">×</button>
        </div>
        <div class="pmd-pos-modal-body" id="pmd-pos-modal-body"></div>
        <div class="pmd-pos-modal-foot">
            <button type="button" class="pmd-pos-modal-cancel" id="pmd-pos-modal-cancel">Cancel</button>
            <button type="button" class="pmd-pos-modal-add" id="pmd-pos-modal-add">Add item</button>
        </div>
    </div>
</div>

<div class="pmd-pos-toast" id="pmd-pos-toast" role="status" aria-live="polite"></div>

<script>
window.PMD_WAITER_POS_BOOTSTRAP = @json($bootstrap);
</script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=1" defer></script>
</body>
</html>
