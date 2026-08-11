@php
    $pmdOwnerboardLocale = $pmdOwnerboardLocale ?? 'en';
    $pmdOwnerboardEndpoints = $pmdOwnerboardEndpoints ?? [];
    $pmdObDe = $pmdOwnerboardLocale === 'de';
    $pmdObT = static function (string $en, string $de) use ($pmdObDe): string {
        return $pmdObDe ? $de : $en;
    };

    $pmdObAnalytics = [
        ['salesOverTime', $pmdObT('Sales over time', 'Umsatzverlauf'), '/admin/pmdreports/sales', 'wide'],
        ['categorySales', $pmdObT('Sales by category', 'Umsatz nach Kategorie'), '/admin/pmdreports/categories', 'side'],
        ['salesByHour', $pmdObT('Sales by hour', 'Umsatz nach Stunde'), '/admin/pmdreports/hourly', 'normal'],
        ['paymentMethods', $pmdObT('Payment methods', 'Zahlungsmethoden'), '/admin/pmdreports/payments', 'normal'],
        ['topItems', $pmdObT('Top-selling items', 'Meistverkaufte Artikel'), '/admin/pmdreports/topitems', 'normal'],
        ['channelSplit', $pmdObT('Order channels', 'Bestellkanäle'), '/admin/pmdreports/orderchannels', 'normal'],
        ['liveOperations', $pmdObT('Live orders', 'Live-Bestellungen'), '/admin/pmdreports/liveorders', 'wide'],
        ['recentTransactions', $pmdObT('Recent transactions', 'Letzte Transaktionen'), '/admin/pmdreports/transactions', 'wide'],
        ['alerts', $pmdObT('Alerts', 'Warnungen'), '/admin/pmdreports/alerts', 'normal'],
        ['reviews', $pmdObT('Latest reviews', 'Neueste Bewertungen'), '/admin/pmdreports/reviews', 'normal'],
        ['tips', $pmdObT('Tips summary', 'Trinkgeldübersicht'), '/admin/pmdreports/tipssummary', 'normal'],
        ['calendarEvents', $pmdObT('Upcoming reservations', 'Bevorstehende Reservierungen'), '/admin/pmdreports/reservations', 'normal'],
    ];
@endphp

<div
    id="pmd-ownerboard"
    class="pmd-ownerboard"
    data-locale="{{ $pmdOwnerboardLocale }}"
    data-kpis-endpoint="{{ $pmdOwnerboardEndpoints['kpis'] ?? '/admin/dashboard2?pmd_kpis=1' }}"
    data-analytics-endpoint="{{ $pmdOwnerboardEndpoints['analytics'] ?? '/admin/dashboard2?pmd_analytics=1' }}"
    data-floor-endpoint="{{ $pmdOwnerboardEndpoints['floor'] ?? '/admin/ownerboard?pmd_floor=1' }}"
    data-floor-save-endpoint="{{ $pmdOwnerboardEndpoints['floorSave'] ?? '/admin/ownerboard?pmd_floor_save=1' }}"
>
    <header class="pmd-ownerboard__header">
        <div class="pmd-ownerboard__heading">
            <h1>{{ $pmdObT('Dashboard', 'Übersicht') }}</h1>
        </div>

        <div class="pmd-ownerboard__header-actions">
            <a
                class="pmd-ownerboard__icon-button"
                href="/admin/reservations2"
                aria-label="{{ $pmdObT('Reservations', 'Reservierungen') }}"
                title="{{ $pmdObT('Reservations', 'Reservierungen') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/></svg>
            </a>

            <button
                type="button"
                class="pmd-ownerboard__icon-button"
                data-pmd-ownerboard-notifications
                aria-label="{{ $pmdObT('Notifications', 'Benachrichtigungen') }}"
                title="{{ $pmdObT('Notifications', 'Benachrichtigungen') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5a2 2 0 0 1 4 0 7 7 0 0 1 4 6v3l2 2H4l2-2v-3a7 7 0 0 1 4-6ZM10 20h4"/></svg>
                <span class="pmd-ownerboard__badge" data-pmd-ownerboard-badge hidden></span>
            </button>
        </div>
    </header>

    <section class="pmd-ownerboard__kpis" aria-label="{{ $pmdObT('Key performance indicators', 'Kennzahlen') }}">
        @foreach (range(0, 3) as $slot)
            <article class="pmd-ownerboard-kpi is-loading" data-kpi-slot="{{ $slot }}">
                <div class="pmd-ownerboard-kpi__icon" data-kpi-icon aria-hidden="true"></div>
                <div class="pmd-ownerboard-kpi__copy">
                    <div class="pmd-ownerboard-kpi__title" data-kpi-title>&nbsp;</div>
                    <div class="pmd-ownerboard-kpi__value" data-kpi-value>—</div>
                    <div class="pmd-ownerboard-kpi__meta" data-kpi-meta>{{ $pmdObT('Today', 'Heute') }}</div>
                </div>
                <button
                    type="button"
                    class="pmd-ownerboard-kpi__menu-button"
                    data-kpi-menu-button
                    aria-label="{{ $pmdObT('Choose KPI', 'Kennzahl wählen') }}"
                >⋮</button>
                <div class="pmd-ownerboard-kpi__menu" data-kpi-menu hidden></div>
            </article>
        @endforeach
    </section>

    <section class="pmd-ownerboard-floor" aria-label="{{ $pmdObT('Floor', 'Tischplan') }}">
        <div class="pmd-ownerboard-floor__toolbar">
            <button type="button" class="pmd-ownerboard-control" data-floor-edit>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
                <span data-floor-edit-label>{{ $pmdObT('Edit', 'Bearbeiten') }}</span>
            </button>
            <button type="button" class="pmd-ownerboard-control is-icon" data-floor-zoom-out aria-label="{{ $pmdObT('Zoom out', 'Verkleinern') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M16 16l5 5"/></svg>
            </button>
            <button type="button" class="pmd-ownerboard-control is-icon" data-floor-zoom-in aria-label="{{ $pmdObT('Zoom in', 'Vergrößern') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M11 8v6M16 16l5 5"/></svg>
            </button>
            <button type="button" class="pmd-ownerboard-control" data-floor-mode>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
                <span>{{ $pmdObT('Floor plan', 'Tischplan') }}</span>
            </button>
        </div>

        <div class="pmd-ownerboard-floor__viewport" data-floor-viewport>
            <div class="pmd-ownerboard-floor__canvas is-row" data-floor-canvas>
                <div class="pmd-ownerboard-floor__loading" data-floor-loading>{{ $pmdObT('Loading tables…', 'Tische werden geladen…') }}</div>
            </div>
        </div>

        <div class="pmd-ownerboard-floor__info" title="{{ $pmdObT('Live table state', 'Live-Tischstatus') }}">i</div>
    </section>

    <section class="pmd-ownerboard-analytics" aria-label="{{ $pmdObT('Analytics', 'Analysen') }}">
        @foreach ($pmdObAnalytics as [$key, $title, $href, $size])
            <article
                class="pmd-ownerboard-card pmd-ownerboard-card--{{ $size }}"
                data-analytics-widget="{{ $key }}"
                data-widget-period="{{ in_array($key, ['salesOverTime', 'topItems'], true) ? 'last30' : 'month' }}"
            >
                <header class="pmd-ownerboard-card__header">
                    <h2>{{ $title }}</h2>
                    <div class="pmd-ownerboard-card__controls">
                        @if ($key === 'salesOverTime')
                            <div class="pmd-ownerboard-segmented" data-chart-mode-group>
                                <button type="button" class="is-active" data-chart-mode="line">{{ $pmdObT('Line', 'Linie') }}</button>
                                <button type="button" data-chart-mode="bar">{{ $pmdObT('Bar', 'Balken') }}</button>
                            </div>
                        @elseif (in_array($key, ['categorySales', 'paymentMethods'], true))
                            <div class="pmd-ownerboard-segmented" data-period-group>
                                <button type="button" data-period="today">{{ $pmdObT('Day', 'Tag') }}</button>
                                <button type="button" data-period="week">{{ $pmdObT('Week', 'Woche') }}</button>
                                <button type="button" class="is-active" data-period="month">{{ $pmdObT('Month', 'Monat') }}</button>
                            </div>
                        @endif

                        <a class="pmd-ownerboard-details" href="{{ $href }}">
                            {{ $pmdObT('Details', 'Details') }}
                            <span aria-hidden="true">↗</span>
                        </a>
                    </div>
                </header>

                <div class="pmd-ownerboard-card__body is-loading" data-widget-body>
                    <div class="pmd-ownerboard-skeleton"></div>
                </div>
            </article>
        @endforeach
    </section>
</div>
