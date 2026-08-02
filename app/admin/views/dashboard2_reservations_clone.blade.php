{{-- PMD_DASHBOARD2_REAL_R2_SYSTEM_V13_VIEW --}}
<script id="pmd-dashboard2-real-r2-system-v13-preboot">
(function () {
    'use strict';

    document.documentElement.classList.add(
        'pmd-dashboard2-clean-server-v1',
        'pmd-dashboard2-real-r2-system-v13',
        'pmd-dashboard2-active'
    );

    /*
     * Stop old Dashboard2 injectors.
     * This is Dashboard2-only because this view only renders on /admin/dashboard2.
     */
    window.PMD_OWNER_V114_ISOLATED_DASHBOARD2 = true;
})();
</script>

<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-floor-v1.css?pmd-dashboard2-real-floor=13') }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-floor-v1-stable-v11.css?pmd-dashboard2-real-floor=13') }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-floor-v1-native-smart-v20.css?pmd-dashboard2-real-floor=13') }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard2-rebuild-v1.css?pmd-dashboard2-real-r2-system=13-' . time()) }}">

<main id="pmd-dashboard2-rebuild-root" data-pmd-dashboard2-rebuild="real-r2-system-v13">
    <div class="pmd-d2r-page">
        <header class="pmd-d2r-header">
            <div class="pmd-d2r-title">
                <h1>Dashboard</h1>
                <p>Owner operations overview</p>
            </div>

            <div class="pmd-d2r-header-actions">
                <button type="button" class="pmd-d2r-head-btn" aria-label="Date range">
                    <span>▣</span>
                    <strong>Today</strong>
                </button>
                <button type="button" class="pmd-d2r-head-square" aria-label="Create">+</button>
                <button type="button" class="pmd-d2r-head-square has-badge" aria-label="Notifications">
                    ♡
                    <em>0</em>
                </button>
            </div>
        </header>

        <section class="pmd-d2r-kpis" aria-label="Dashboard KPIs">
            <article class="pmd-d2r-kpi kpi-green">
                <div class="pmd-d2r-kpi-icon">€</div>
                <div>
                    <h3>Revenue</h3>
                    <strong>€0.00</strong>
                    <span>Today / this month</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-purple">
                <div class="pmd-d2r-kpi-icon">👥</div>
                <div>
                    <h3>Guests served</h3>
                    <strong>0</strong>
                    <span>Today / this month</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-orange">
                <div class="pmd-d2r-kpi-icon">⏱</div>
                <div>
                    <h3>Table turnover</h3>
                    <strong>--</strong>
                    <span>Average table time</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-teal">
                <div class="pmd-d2r-kpi-icon">🍽</div>
                <div>
                    <h3>Dine in / take away</h3>
                    <strong>--</strong>
                    <span>Order channel split</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-orange">
                <div class="pmd-d2r-kpi-icon">🔥</div>
                <div>
                    <h3>Kitchen ticket time</h3>
                    <strong>--</strong>
                    <span>Order to serve</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-green">
                <div class="pmd-d2r-kpi-icon">▦</div>
                <div>
                    <h3>Table occupancy</h3>
                    <strong>--</strong>
                    <span>Active / total tables</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-red">
                <div class="pmd-d2r-kpi-icon">☑</div>
                <div>
                    <h3>Menu availability</h3>
                    <strong>--</strong>
                    <span>Available / total items</span>
                </div>
                <button type="button">⋮</button>
            </article>

            <article class="pmd-d2r-kpi kpi-green">
                <div class="pmd-d2r-kpi-icon">★</div>
                <div>
                    <h3>Tips</h3>
                    <strong>€0.00</strong>
                    <span>Today / this month</span>
                </div>
                <button type="button">⋮</button>
            </article>
        </section>

        <section class="pmd-d2r-floor-shell" aria-label="Live floor map">
            @php
                $pmdDashboard2FloorArgs = [
                    'floorId' => 'pmd-dashboard2-real-floor-v13',
                    'stateUrl' => admin_url('pmd-floor-v1/state'),
                    'viewMode' => 'grid',
                ];
            @endphp

            @if (view()->exists('admin::_partials.pmd_floor_map_v1'))
                @include('admin::_partials.pmd_floor_map_v1', $pmdDashboard2FloorArgs)
            @elseif (view()->exists('_partials.pmd_floor_map_v1'))
                @include('_partials.pmd_floor_map_v1', $pmdDashboard2FloorArgs)
            @else
                <div class="pmd-d2r-missing-floor">
                    Real floor partial was not found.
                </div>
            @endif
        </section>

        <section class="pmd-d2r-analytics" aria-label="Dashboard analytics">
            <article class="pmd-d2r-panel panel-wide">
                <div class="pmd-d2r-panel-head">
                    <h3>Sales over time</h3>
                    <div class="pmd-d2r-toggle"><span>Day</span><span>Week</span><span>Month</span></div>
                </div>
                <div class="pmd-d2r-bars big">
                    <i style="height:36%"></i><i style="height:58%"></i><i style="height:46%"></i>
                    <i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:70%"></i>
                </div>
            </article>

            <article class="pmd-d2r-panel">
                <h3>Sales by hour</h3>
                <div class="pmd-d2r-bars"><i style="height:28%"></i><i style="height:52%"></i><i style="height:86%"></i><i style="height:62%"></i><i style="height:34%"></i></div>
                <p>Peak and dead periods.</p>
            </article>

            <article class="pmd-d2r-panel">
                <h3>Top selling items</h3>
                <div class="pmd-d2r-list">
                    <div><span>1. Item</span><strong>--</strong></div>
                    <div><span>2. Item</span><strong>--</strong></div>
                    <div><span>3. Item</span><strong>--</strong></div>
                    <div><span>4. Item</span><strong>--</strong></div>
                    <div><span>5. Item</span><strong>--</strong></div>
                </div>
            </article>

            <article class="pmd-d2r-panel"><h3>Sales by category</h3><div class="pmd-d2r-pie pie-category"></div><p>Food · Drinks · Dessert</p></article>
            <article class="pmd-d2r-panel"><h3>Payment methods</h3><div class="pmd-d2r-pie pie-payment"></div><p>Card · Cash · Online</p></article>
            <article class="pmd-d2r-panel"><h3>Order channels</h3><div class="pmd-d2r-pie pie-channel"></div><p>Dine in · Take away · Delivery</p></article>

            <article class="pmd-d2r-panel">
                <h3>Live orders / active tables</h3>
                <div class="pmd-d2r-stat"><span>Live orders</span><strong>--</strong></div>
                <div class="pmd-d2r-stat"><span>Active tables</span><strong>--</strong></div>
            </article>

            <article class="pmd-d2r-panel">
                <h3>Recent transactions</h3>
                <div class="pmd-d2r-list">
                    <div><span>Transaction</span><strong>--</strong></div>
                    <div><span>Transaction</span><strong>--</strong></div>
                    <div><span>Transaction</span><strong>--</strong></div>
                </div>
            </article>

            <article class="pmd-d2r-panel">
                <h3>Alerts</h3>
                <div class="pmd-d2r-alert ok">No failed payments</div>
                <div class="pmd-d2r-alert warn">Long-open tables: --</div>
                <div class="pmd-d2r-alert danger">Out of stock: --</div>
            </article>

            <article class="pmd-d2r-panel"><h3>Latest reviews</h3><div class="pmd-d2r-rating">★★★★★</div><p>Ratings and guest feedback.</p></article>

            <article class="pmd-d2r-panel">
                <h3>Tips summary</h3>
                <div class="pmd-d2r-stat"><span>Today</span><strong>€0.00</strong></div>
                <div class="pmd-d2r-stat"><span>Month</span><strong>€0.00</strong></div>
            </article>

            <article class="pmd-d2r-panel">
                <h3>Top calendar events</h3>
                <div class="pmd-d2r-list">
                    <div><span>Event</span><strong>--</strong></div>
                    <div><span>Event</span><strong>--</strong></div>
                    <div><span>Event</span><strong>--</strong></div>
                </div>
            </article>
        </section>
    </div>
</main>

<script src="{{ asset('app/admin/assets/js/pmd-floor-v1.js?pmd-dashboard2-real-floor=13') }}" defer></script>
<script src="{{ asset('app/admin/assets/js/pmd-floor-v1-stable-v11.js?pmd-dashboard2-real-floor=13') }}" defer></script>
<script src="{{ asset('app/admin/assets/js/pmd-dashboard2-rebuild-v1.js?pmd-dashboard2-real-r2-system=13-' . time()) }}" defer></script>
