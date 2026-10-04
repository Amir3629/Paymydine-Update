<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex,nofollow">
    <meta name="theme-color" id="pmd-kiosk-theme-color" content="#f3f5f7">
    <title>Self-service ordering · PayMyDine</title>
    <link rel="stylesheet" href="/public/assets/pmd/kiosk-terminal-v8.css?v=9-theme-payment">
</head>
<body class="pmd-kiosk-v8" data-pmd-kiosk-terminal="blade-v8" data-pmd-kiosk-theme="kazen_japanese">
<div id="pmd-kiosk-app" class="pmd-kiosk-shell" aria-busy="true">
    <header class="pmd-kiosk-topbar">
        <div class="pmd-kiosk-brand" aria-label="Restaurant">
            <span class="pmd-kiosk-brand__mark" id="pmd-kiosk-brand-mark">
                <span id="pmd-kiosk-brand-letter">P</span>
            </span>
            <span class="pmd-kiosk-brand__copy">
                <strong id="pmd-kiosk-restaurant-name">PayMyDine</strong>
                <small id="pmd-kiosk-product-label">Self-service ordering</small>
            </span>
        </div>

        <div class="pmd-kiosk-order-mode" id="pmd-kiosk-order-mode">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h5"/></svg>
            <span>
                <small id="pmd-kiosk-order-mode-kicker">Order type</small>
                <strong id="pmd-kiosk-order-mode-label">Eat here</strong>
            </span>
        </div>

        <label class="pmd-kiosk-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
            <input id="pmd-kiosk-search" type="search" autocomplete="off" spellcheck="false" placeholder="Search menu">
            <button type="button" id="pmd-kiosk-search-clear" aria-label="Clear search" hidden>×</button>
        </label>

        <label class="pmd-kiosk-language">
            <span class="pmd-kiosk-sr-only">Language</span>
            <select id="pmd-kiosk-language" aria-label="Language"></select>
        </label>
    </header>

    <div class="pmd-kiosk-workspace">
        <aside class="pmd-kiosk-categories" aria-label="Menu categories">
            <p class="pmd-kiosk-rail-label" id="pmd-kiosk-menu-label">MENU</p>
            <nav id="pmd-kiosk-category-list" class="pmd-kiosk-category-list"></nav>
        </aside>

        <main class="pmd-kiosk-menu">
            <div class="pmd-kiosk-menu-head">
                <div>
                    <p class="pmd-kiosk-kicker" id="pmd-kiosk-context-label">EAT HERE</p>
                    <h1 id="pmd-kiosk-category-title">All items</h1>
                </div>
                <span id="pmd-kiosk-result-count" class="pmd-kiosk-result-count"></span>
            </div>

            <section id="pmd-kiosk-menu-grid" class="pmd-kiosk-grid" aria-live="polite"></section>
        </main>

        <aside class="pmd-kiosk-order" aria-label="Your order">
            <div class="pmd-kiosk-order-head">
                <div>
                    <p id="pmd-kiosk-order-title">YOUR ORDER</p>
                    <strong id="pmd-kiosk-order-count">0 items</strong>
                </div>
                <button type="button" id="pmd-kiosk-clear-order" class="pmd-kiosk-link-button" hidden>Clear order</button>
            </div>

            <div id="pmd-kiosk-order-lines" class="pmd-kiosk-order-lines"></div>

            <div class="pmd-kiosk-order-foot">
                <dl class="pmd-kiosk-totals">
                    <div><dt id="pmd-kiosk-subtotal-label">Subtotal</dt><dd id="pmd-kiosk-subtotal">€0.00</dd></div>
                    <div id="pmd-kiosk-tax-row" hidden><dt id="pmd-kiosk-tax-label">Tax</dt><dd id="pmd-kiosk-tax">€0.00</dd></div>
                    <div id="pmd-kiosk-service-row" hidden><dt id="pmd-kiosk-service-label">Service charge</dt><dd id="pmd-kiosk-service">€0.00</dd></div>
                    <div class="pmd-kiosk-total-row"><dt id="pmd-kiosk-total-label">Total</dt><dd id="pmd-kiosk-total">€0.00</dd></div>
                </dl>
                <button type="button" id="pmd-kiosk-checkout" class="pmd-kiosk-primary" disabled>
                    <span id="pmd-kiosk-checkout-label">Review & pay</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
        </aside>
    </div>

    <button type="button" id="pmd-kiosk-compact-order" class="pmd-kiosk-compact-order" hidden>
        <span id="pmd-kiosk-compact-count" class="pmd-kiosk-compact-order__count">0</span>
        <span id="pmd-kiosk-compact-label">Your order</span>
        <strong id="pmd-kiosk-compact-total">€0.00</strong>
        <span aria-hidden="true">›</span>
    </button>

    <div id="pmd-kiosk-modal-layer" class="pmd-kiosk-modal-layer" hidden>
        <button type="button" class="pmd-kiosk-modal-backdrop" data-pmd-close-modal aria-label="Close"></button>
        <section id="pmd-kiosk-modal" class="pmd-kiosk-modal" role="dialog" aria-modal="true" aria-live="polite"></section>
    </div>

    <div id="pmd-kiosk-toast" class="pmd-kiosk-toast" role="status" hidden></div>

    <div id="pmd-kiosk-loading" class="pmd-kiosk-loading" role="status">
        <div class="pmd-kiosk-loading__mark">P</div>
        <strong>Loading menu</strong>
        <span>Please wait…</span>
    </div>
</div>

<script id="pmd-kiosk-config" type="application/json">{!! json_encode($pmdKioskConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
<script src="/public/assets/pmd/kiosk-terminal-v8.js?v=9-theme-payment" defer></script>
</body>
</html>
