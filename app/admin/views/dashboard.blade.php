{{-- PMD Owner/Admin Dashboard Clean v25
     Dashboard2 clean rebuild is isolated to /admin/dashboard2.
     Normal /admin/dashboard keeps the existing owner dashboard root. --}}

@if (request()->is('admin/dashboard2'))
    <script id="pmd-dashboard2-clean-preboot-v2">
    (function () {
        'use strict';

        document.documentElement.classList.add(
            'pmd-dashboard2-clean-server-v1',
            'pmd-dashboard2-active'
        );

        window.PMD_OWNER_V114_ISOLATED_DASHBOARD2 = true;
    })();
    </script>

    <style id="pmd-dashboard2-clean-critical-v2">
    html.pmd-dashboard2-clean-server-v1,
    html.pmd-dashboard2-clean-server-v1 body {
        background: #f6f8fb !important;
    }

    html.pmd-dashboard2-clean-server-v1 #pmd-d2-root,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-root,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-shell,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-kpis,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-grid,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-priority-grid,
    html.pmd-dashboard2-clean-server-v1 .pmd-d2-service-performance,
    html.pmd-dashboard2-clean-server-v1 #pmd-dashboard2-quick-btn {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    </style>

    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard2-rebuild-v1.css?v=20260802_0144') }}">

    <main id="pmd-dashboard2-rebuild-root" data-pmd-dashboard2-rebuild="v2">
        <div class="pmd-d2r-shell">
            <header class="pmd-d2r-header">
                <div>
                    <p class="pmd-d2r-eyebrow">Owner operations</p>
                    <h1 class="pmd-d2r-title">Dashboard</h1>
                    <p class="pmd-d2r-subtitle">
                        Clean rebuild based on the finished Reservations2 design system.
                    </p>
                </div>
                <div class="pmd-d2r-status-pill">Clean rebuild active</div>
            </header>

            <section class="pmd-d2r-kpis" aria-label="Owner KPI overview">
                <article class="pmd-d2r-kpi is-money"><div class="pmd-d2r-kpi-top"><h3>Revenue</h3><div class="pmd-d2r-kpi-icon">€</div></div><strong>€0.00</strong><span>Today / this month</span></article>
                <article class="pmd-d2r-kpi is-guests"><div class="pmd-d2r-kpi-top"><h3>Guests served</h3><div class="pmd-d2r-kpi-icon">👥</div></div><strong>0</strong><span>Today / this month</span></article>
                <article class="pmd-d2r-kpi is-speed"><div class="pmd-d2r-kpi-top"><h3>Table turnover</h3><div class="pmd-d2r-kpi-icon">⏱</div></div><strong>--</strong><span>Average table time per customer</span></article>
                <article class="pmd-d2r-kpi is-money"><div class="pmd-d2r-kpi-top"><h3>Dine in / take away</h3><div class="pmd-d2r-kpi-icon">🍽</div></div><strong>--</strong><span>Order channel split</span></article>
                <article class="pmd-d2r-kpi is-speed"><div class="pmd-d2r-kpi-top"><h3>Kitchen ticket time</h3><div class="pmd-d2r-kpi-icon">🔥</div></div><strong>--</strong><span>Order to serve</span></article>
                <article class="pmd-d2r-kpi is-guests"><div class="pmd-d2r-kpi-top"><h3>Table occupancy</h3><div class="pmd-d2r-kpi-icon">▦</div></div><strong>--</strong><span>Active tables / total tables</span></article>
                <article class="pmd-d2r-kpi is-risk"><div class="pmd-d2r-kpi-top"><h3>Menu availability</h3><div class="pmd-d2r-kpi-icon">☑</div></div><strong>--</strong><span>Available now / total menu items</span></article>
                <article class="pmd-d2r-kpi is-money"><div class="pmd-d2r-kpi-top"><h3>Tips</h3><div class="pmd-d2r-kpi-icon">★</div></div><strong>€0.00</strong><span>Today / this month</span></article>
            </section>

            <section class="pmd-d2r-floor" aria-label="Floor map overview">
                <div class="pmd-d2r-section-head">
                    <div>
                        <h2>Floor map</h2>
                        <p>Operations overview. Same visual direction as Reservations2, without reservation cards.</p>
                    </div>
                </div>
                <div class="pmd-d2r-floor-map" role="img" aria-label="Restaurant floor overview placeholder">
                    <div class="pmd-d2r-table t1">1</div><div class="pmd-d2r-table t2 is-busy">2</div><div class="pmd-d2r-table t3">3</div><div class="pmd-d2r-table t4 is-late">4</div><div class="pmd-d2r-table t5">5</div><div class="pmd-d2r-table t6">6</div><div class="pmd-d2r-table t7 is-busy">7</div><div class="pmd-d2r-table t8">8</div><div class="pmd-d2r-table t9">9</div>
                </div>
            </section>

            <section class="pmd-d2r-grid" aria-label="Owner analytics panels">
                <article class="pmd-d2r-card"><h3>Sales over time</h3><p>Line / bar chart. Toggle day, week, month.</p></article>
                <article class="pmd-d2r-card"><h3>Sales by hour</h3><p>Peak and dead periods.</p></article>
                <article class="pmd-d2r-card"><h3>Top selling items</h3><p>Top 5 menu items.</p></article>
                <article class="pmd-d2r-card"><h3>Sales by category</h3><p>Pie chart placeholder.</p></article>
                <article class="pmd-d2r-card"><h3>Payment methods</h3><p>Cash, card, online, wallet.</p></article>
                <article class="pmd-d2r-card"><h3>Order channels</h3><p>Dine in, take away, delivery.</p></article>
                <article class="pmd-d2r-card"><h3>Live orders / active tables</h3><p>Current operational pulse.</p></article>
                <article class="pmd-d2r-card"><h3>Recent transactions</h3><p>Latest payments and settlements.</p></article>
                <article class="pmd-d2r-card"><h3>Alerts</h3><p>Failed payments, refunds, long-open tables, out of stock, negative reviews.</p></article>
                <article class="pmd-d2r-card"><h3>Latest reviews</h3><p>Ratings and guest feedback.</p></article>
                <article class="pmd-d2r-card"><h3>Tips summary</h3><p>Tips today and from start of month.</p></article>
                <article class="pmd-d2r-card"><h3>Top calendar events</h3><p>Top 5 upcoming calendar events.</p></article>
            </section>
        </div>
    </main>

    <script defer src="{{ asset('app/admin/assets/js/pmd-dashboard2-rebuild-v1.js?v=20260802_0144') }}"></script>
@else
    <script>
    (function(){
      document.documentElement.classList.add('pmd-owner-dashboard-clean-v1-html');
    })();
    </script>
    <div id="pmd-owner-dashboard-clean-v1-root" data-version="20260626-owner-clean-v23-waiter-interactive">
        <div class="pmd-owner-clean-loading">
            <div></div>
        </div>
    </div>
    <noscript>
        <div class="alert alert-warning">JavaScript is required for the PayMyDine role dashboard.</div>
    </noscript>
@endif
