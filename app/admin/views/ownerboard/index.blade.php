{{-- =========================================================
     PMD OWNERBOARD V2 — EXACT CLEAN DASHBOARD

     Single clean HTML surface:
     - no Dashboard2 view include
     - no Reservations2 view include
     - no whole-page visibility guard
     - final geometry exists in initial HTML/CSS
     ========================================================= --}}

<style id="pmd-ownerboard-v2-critical-first-paint">
    /*
     * Tiny inline first-paint authority.
     *
     * Settings already proved #f8fbfd + deterministic shell geometry.
     * This prevents a white/cream document frame before the external
     * Ownerboard stylesheet has finished loading.
     */
    html,
    html body,
    html body.page,
    html body.page .page-wrapper,
    html body.page .page-content {
        background: #f8fbfd !important;
        background-image: none !important;
    }

    html body.page.pmd-ownerboard-v2-page {
        margin: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
    }

    #pmd-ownerboard {
        min-height: 100vh;
        background: #f8fbfd;
        opacity: 1;
        visibility: visible;
    }
</style>

@php
    $pmdOwnerboardLocale =
        $pmdOwnerboardLocale ?? 'en';

    $pmdOwnerboardEndpoints =
        $pmdOwnerboardEndpoints ?? [];

    $pmdOwnerboardFloorView =
        is_array($pmdOwnerboardFloorView ?? null)
            ? $pmdOwnerboardFloorView
            : [
                'floor_id' => 'main-floor',
                'layout_mode' => 'full',
                'full_floor_zoom' => 1.0,
            ];

    $pmdObDe =
        $pmdOwnerboardLocale === 'de';

    $pmdObT =
        static function (
            string $en,
            string $de
        ) use ($pmdObDe): string {
            return $pmdObDe
                ? $de
                : $en;
        };

    /*
     * Exact final Dashboard2 visual order.
     *
     * Desktop:
     * row 1  Sales over time (9) | Category (3)
     * row 2  Sales by hour  (9) | Payments (3)
     * row 3  Recent | Alerts | Live | Channels (3 each)
     * row 4  Reservations | Tips | Reviews | Top items (3 each)
     */
    $pmdObAnalytics = [
        [
            'salesOverTime',
            $pmdObT(
                'Sales over time',
                'Umsatzverlauf'
            ),
            '/admin/pmdreports/sales',
            'last30',
            'sales',
        ],
        [
            'categorySales',
            $pmdObT(
                'Sales by category',
                'Umsatz nach Kategorie'
            ),
            '/admin/pmdreports/categories',
            'month',
            'period',
        ],
        [
            'salesByHour',
            $pmdObT(
                'Sales by hour',
                'Umsatz nach Stunde'
            ),
            '/admin/pmdreports/hourly',
            'today',
            'hourly',
        ],
        [
            'paymentMethods',
            $pmdObT(
                'Payment methods',
                'Zahlungsmethoden'
            ),
            '/admin/pmdreports/payments',
            'month',
            'period',
        ],
        [
            'recentTransactions',
            $pmdObT(
                'Recent transactions',
                'Letzte Transaktionen'
            ),
            '/admin/pmdreports/transactions',
            'today',
            'plain',
        ],
        [
            'alerts',
            $pmdObT(
                'Alerts',
                'Warnungen'
            ),
            '/admin/pmdreports/alerts',
            'today',
            'plain',
        ],
        [
            'liveOperations',
            $pmdObT(
                'Live orders',
                'Live-Bestellungen'
            ),
            '/admin/pmdreports/liveorders',
            'today',
            'plain',
        ],
        [
            'channelSplit',
            $pmdObT(
                'Order channels',
                'Bestellkanäle'
            ),
            '/admin/pmdreportchannels',
            'month',
            'period',
        ],
        [
            'calendarEvents',
            $pmdObT(
                'Upcoming reservations',
                'Bevorstehende Reservierungen'
            ),
            '/admin/pmdreports/reservations',
            'today',
            'plain',
        ],
        [
            'tips',
            $pmdObT(
                'Tips summary',
                'Trinkgeldübersicht'
            ),
            '/admin/pmdreporttips',
            'month',
            'plain',
        ],
        [
            'reviews',
            $pmdObT(
                'Latest reviews',
                'Neueste Bewertungen'
            ),
            '/admin/pmdreports/reviews',
            'today',
            'plain',
        ],
        [
            'topItems',
            $pmdObT(
                'Top-selling items',
                'Meistverkaufte Artikel'
            ),
            '/admin/pmdreports/topitems',
            'month',
            'period',
        ],
    ];
@endphp

<div
    id="pmd-ownerboard"
    class="pmd-ownerboard-v2"
    data-pmd-ownerboard-v2
    data-locale="{{ $pmdOwnerboardLocale }}"
    data-kpis-endpoint="{{ $pmdOwnerboardEndpoints['kpis'] ?? admin_url('dashboard2').'?pmd_kpis=1' }}"
    data-analytics-endpoint="{{ $pmdOwnerboardEndpoints['analytics'] ?? admin_url('dashboard2').'?pmd_analytics=1' }}"
>
    <header class="pmd-ownerboard-v2__header">
        <div class="pmd-ownerboard-v2__header-left">
            <h1>
                {{ $pmdObT(
                    'Dashboard',
                    'Übersicht'
                ) }}
            </h1>
        </div>

        <div class="pmd-ownerboard-v2__header-actions">
            <a
                class="pmd-ownerboard-v2__header-button"
                href="{{ admin_url('reservations2') }}"
                aria-label="{{ $pmdObT('Reservations', 'Reservierungen') }}"
                title="{{ $pmdObT('Reservations', 'Reservierungen') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
                </svg>
            </a>

            <button
                type="button"
                class="pmd-ownerboard-v2__header-button"
                data-ownerboard-notifications
                aria-label="{{ $pmdObT('Notifications', 'Benachrichtigungen') }}"
                title="{{ $pmdObT('Notifications', 'Benachrichtigungen') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10 5a2 2 0 0 1 4 0 7 7 0 0 1 4 6v3l2 2H4l2-2v-3a7 7 0 0 1 4-6ZM10 20h4"/>
                </svg>

                <span
                    class="pmd-ownerboard-v2__notification-badge"
                    data-ownerboard-notification-badge
                    hidden
                ></span>
            </button>
        </div>
    </header>

    {{-- Four exact KPI slots. JS replaces only the contents; geometry exists now. --}}
    <section
        id="pmd-ownerboard-kpis-v2"
        class="pmd-ownerboard-v2__kpis"
        aria-label="{{ $pmdObT('Key performance indicators', 'Kennzahlen') }}"
    >
        @foreach (range(0, 3) as $slot)
            <article
                class="pmd-ob-kpi-card is-pending"
                data-ownerboard-kpi-slot="{{ $slot }}"
                data-pmd-kpi-v2401-tone="{{ ['green', 'purple', 'orange', 'blue'][$slot] }}"
            >
                <div class="pmd-ob-kpi-icon" aria-hidden="true"></div>

                <div class="pmd-ob-kpi-copy">
                    <span class="pmd-ob-kpi-title">&nbsp;</span>
                    <strong class="pmd-ob-kpi-value">—</strong>
                    <span class="pmd-ob-kpi-description">&nbsp;</span>
                </div>

                <button
                    type="button"
                    class="pmd-ob-kpi-more"
                    aria-label="{{ $pmdObT('Choose KPI', 'KPI auswählen') }}"
                    disabled
                >
                    <span></span><span></span><span></span>
                </button>
            </article>
        @endforeach
    </section>

    {{-- =====================================================
         CANONICAL FLOOR
         ===================================================== --}}
    <section
        class="pmd-ownerboard-v2__floor-shell"
        aria-label="{{ $pmdObT('Restaurant Floor', 'Tischplan') }}"
    >
        <div class="pmd-ownerboard-v2__floor-toolbar-row">
            <div
                class="pmd-ownerboard-v2__floor-toolbar"
                role="toolbar"
                aria-label="{{ $pmdObT('Floor controls', 'Tischplan-Steuerung') }}"
            >
                <button
                    type="button"
                    class="pmd-ownerboard-v2__floor-tool"
                    data-owner-floor-action="edit"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                    </svg>
                    <span data-owner-floor-edit-label>
                        {{ $pmdObT('Edit', 'Bearbeiten') }}
                    </span>
                </button>

                <button
                    type="button"
                    class="pmd-ownerboard-v2__floor-tool is-icon"
                    data-owner-floor-action="zoom-out"
                    aria-label="{{ $pmdObT('Zoom out', 'Verkleinern') }}"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7"/>
                        <path d="M8 11h6M16 16l5 5"/>
                    </svg>
                </button>

                <button
                    type="button"
                    class="pmd-ownerboard-v2__floor-tool is-icon"
                    data-owner-floor-action="zoom-in"
                    aria-label="{{ $pmdObT('Zoom in', 'Vergrößern') }}"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7"/>
                        <path d="M8 11h6M11 8v6M16 16l5 5"/>
                    </svg>
                </button>

                <button
                    type="button"
                    class="pmd-ownerboard-v2__floor-tool"
                    data-owner-floor-action="mode"
                    aria-pressed="{{ ($pmdOwnerboardFloorView['layout_mode'] ?? 'full') === 'row' ? 'true' : 'false' }}"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="4" y="4" width="6" height="6" rx="1"/>
                        <rect x="14" y="4" width="6" height="6" rx="1"/>
                        <rect x="4" y="14" width="6" height="6" rx="1"/>
                        <rect x="14" y="14" width="6" height="6" rx="1"/>
                    </svg>
                    <span data-owner-floor-mode-label>
                        {{ ($pmdOwnerboardFloorView['layout_mode'] ?? 'full') === 'row'
                            ? $pmdObT('Floor plan', 'Tischplan')
                            : $pmdObT('One row', 'Eine Reihe') }}
                    </span>
                </button>
            </div>
        </div>

        @include('admin::_partials.pmd_floor_map_v1', [
            /*
             * Reuse the canonical component id so the proven
             * Floor-canvas stylesheet applies exactly as on Dashboard2.
             * There is still only one Floor root on this route.
             */
            'floorId' => 'pmd-r2-shared-floor-canvas-v310',
            'floorSize' => 'large',
            'floorMode' => 'full',
            'dataUrl' => admin_url('pmd-waiter-dashboard-v9-tenant-data'),
            'layoutUrl' => admin_url('pmd-owner-dashboard-floor-layout'),
            'stateUrl' => admin_url('pmd-floor-v1/state'),
            'orderUrl' => admin_url('waiter-pos/{table}'),
            'viewPreference' => $pmdOwnerboardFloorView,
            'viewPreferenceUrl' => admin_url('ownerboard'),
        ])

        <button
            type="button"
            class="pmd-ownerboard-v2__floor-info"
            data-owner-floor-action="guide"
            aria-label="{{ $pmdObT('Floor guide', 'Tischplan-Hilfe') }}"
            title="{{ $pmdObT('Floor guide', 'Tischplan-Hilfe') }}"
        >
            <span aria-hidden="true">i</span>
        </button>
    </section>

    {{-- =====================================================
         EXACT FINAL ANALYTICS LAYOUT
         ===================================================== --}}
    <section
        id="pmd-ownerboard-analytics-v2"
        class="pmd-ownerboard-v2__analytics"
        aria-label="{{ $pmdObT('Dashboard analytics', 'Dashboard-Analysen') }}"
    >
        <div class="pmd-ownerboard-v2__analytics-grid">
            @foreach ($pmdObAnalytics as [$key, $title, $href, $period, $toolbar])
                <article
                    class="pmd-ownerboard-v2-card"
                    data-ownerboard-widget="{{ $key }}"
                    data-ownerboard-period="{{ $period }}"
                >
                    <header class="pmd-ownerboard-v2-card__header">
                        <h2>{{ $title }}</h2>

                        <div class="pmd-ownerboard-v2-card__controls">
                            @if ($toolbar === 'sales')
                                <div
                                    class="pmd-ownerboard-v2-segmented"
                                    data-owner-chart-mode-group
                                    role="group"
                                    aria-label="{{ $pmdObT('Chart type', 'Diagrammtyp') }}"
                                >
                                    <button
                                        type="button"
                                        data-owner-chart-mode="line"
                                    >
                                        {{ $pmdObT('Line', 'Linie') }}
                                    </button>
                                    <button
                                        type="button"
                                        data-owner-chart-mode="bar"
                                    >
                                        {{ $pmdObT('Bar', 'Balken') }}
                                    </button>
                                </div>
                            @elseif ($toolbar === 'period')
                                <div
                                    class="pmd-ownerboard-v2-segmented"
                                    data-owner-period-group
                                    role="group"
                                    aria-label="{{ $pmdObT('Period', 'Zeitraum') }}"
                                >
                                    <button
                                        type="button"
                                        data-owner-period="today"
                                    >
                                        {{ $pmdObT('Day', 'Tag') }}
                                    </button>
                                    <button
                                        type="button"
                                        data-owner-period="week"
                                    >
                                        {{ $pmdObT('Week', 'Woche') }}
                                    </button>
                                    <button
                                        type="button"
                                        data-owner-period="month"
                                    >
                                        {{ $pmdObT('Month', 'Monat') }}
                                    </button>
                                </div>
                            @endif

                            <a
                                class="pmd-ownerboard-v2-details"
                                href="{{ $href }}"
                            >
                                Details
                                <span aria-hidden="true">↗</span>
                            </a>
                        </div>
                    </header>

                    <div
                        class="pmd-ownerboard-v2-card__body"
                        data-ownerboard-widget-body
                    >
                        <div class="pmd-ownerboard-v2-pending">—</div>
                    </div>
                </article>
            @endforeach
        </div>
    </section>
</div>

