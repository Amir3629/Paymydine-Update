@php
    $report = $pmdReport ?? [];
    $type = $report['type'] ?? 'sales';
    $stats = $report['stats'] ?? [];
    $chart = $report['chart'] ?? null;
    $columns = $report['columns'] ?? [];
    $rows = $report['rows'] ?? [];
    $periods = $report['periods'] ?? [];
    $activePeriod = $report['period'] ?? 'last30';
    $routeUrl = $report['route_url'] ?? url()->current();

    $profiles = [
        'sales' => [
            'eyebrow' => 'Revenue intelligence',
            'primary_title' => 'Revenue trajectory',
            'primary_copy' => 'Settled net sales across the selected period, using the same paid-order authority as Dashboard2.',
            'spotlight_title' => 'Strongest periods',
            'spotlight_copy' => 'A quick view of the leading periods in the current report window.',
            'table_title' => 'Sales ledger by period',
            'table_copy' => 'Net sales, settled orders and average order value for every visible period.',
        ],
        'hourly' => [
            'eyebrow' => 'Service timing',
            'primary_title' => 'Hourly demand curve',
            'primary_copy' => 'See when settled revenue and order volume are strongest across the restaurant day.',
            'spotlight_title' => 'Peak hours',
            'spotlight_copy' => 'The first rows of the hourly report for fast operational comparison.',
            'table_title' => 'Hour-by-hour performance',
            'table_copy' => 'All 24 hours with sales, order count and average order value.',
        ],
        'categories' => [
            'eyebrow' => 'Menu mix',
            'primary_title' => 'Category contribution',
            'primary_copy' => 'Revenue contribution across enabled menu categories without double-counting menu assignments.',
            'spotlight_title' => 'Leading categories',
            'spotlight_copy' => 'Categories currently contributing the most revenue in this period.',
            'table_title' => 'Category breakdown',
            'table_copy' => 'Revenue and share for every enabled category in the current restaurant.',
        ],
        'payments' => [
            'eyebrow' => 'Settlement mix',
            'primary_title' => 'Payment method distribution',
            'primary_copy' => 'How settled revenue is distributed across the payment methods available to this restaurant.',
            'spotlight_title' => 'Method mix',
            'spotlight_copy' => 'The leading payment methods and their contribution to settled revenue.',
            'table_title' => 'Payment method detail',
            'table_copy' => 'Provider, settled revenue, transaction count and share by payment method.',
        ],
        'transactions' => [
            'eyebrow' => 'Settlement ledger',
            'primary_title' => 'Recent settled transactions',
            'primary_copy' => 'A practical transaction ledger built from the same settlement authority used by Dashboard2.',
            'spotlight_title' => 'Latest settlements',
            'spotlight_copy' => 'The newest settled orders in the selected report period.',
            'table_title' => 'Transaction ledger',
            'table_copy' => 'Order, settlement time, channel, payment method, settled amount and net sales.',
        ],
        'alerts' => [
            'eyebrow' => 'Owner attention',
            'primary_title' => 'Operational exceptions',
            'primary_copy' => 'Payment, refund, stock, review and long-open-table signals that may require action.',
            'spotlight_title' => 'Needs attention',
            'spotlight_copy' => 'Current exception rows collected from live operational sources.',
            'table_title' => 'Alert detail',
            'table_copy' => 'Every available exception with the affected item, supporting detail and time.',
        ],
        'liveorders' => [
            'eyebrow' => 'Live operations',
            'primary_title' => 'Current service load',
            'primary_copy' => 'Open orders and current table occupancy for the authenticated restaurant location.',
            'spotlight_title' => 'Open right now',
            'spotlight_copy' => 'The newest open orders and their current operational state.',
            'table_title' => 'Live order detail',
            'table_copy' => 'Open order, channel, status, creation time and current age.',
        ],
        'channels' => [
            'eyebrow' => 'Order mix',
            'primary_title' => 'Order channel distribution',
            'primary_copy' => 'Revenue and order volume across the real order types recorded for settled orders.',
            'spotlight_title' => 'Leading channels',
            'spotlight_copy' => 'The channels currently contributing the most settled revenue.',
            'table_title' => 'Channel breakdown',
            'table_copy' => 'Revenue, settled order count and share for every active order channel.',
        ],
        'topitems' => [
            'eyebrow' => 'Menu performance',
            'primary_title' => 'Top-selling menu items',
            'primary_copy' => 'Best-performing menu items ranked from eligible settled order line items.',
            'spotlight_title' => 'Top sellers',
            'spotlight_copy' => 'The highest-volume menu items in the selected period.',
            'table_title' => 'Item performance detail',
            'table_copy' => 'Sold quantity and item revenue across the ranked menu list.',
        ],
        'tips' => [
            'eyebrow' => 'Gratuity performance',
            'primary_title' => 'Tip activity',
            'primary_copy' => 'Tips recorded in order totals for eligible current-location orders.',
            'spotlight_title' => 'Recent tipped orders',
            'spotlight_copy' => 'The newest tipped orders included in the current report window.',
            'table_title' => 'Tip ledger',
            'table_copy' => 'Eligible orders with the tip value recorded in order totals.',
        ],
        'reviews' => [
            'eyebrow' => 'Guest voice',
            'primary_title' => 'Latest guest feedback',
            'primary_copy' => 'Recent ratings and comments scoped to the authenticated restaurant location.',
            'spotlight_title' => 'Latest feedback',
            'spotlight_copy' => 'The newest guest reviews available from the restaurant review source.',
            'table_title' => 'Review detail',
            'table_copy' => 'Rating, guest comment, approval state and review date.',
        ],
        'reservations' => [
            'eyebrow' => 'Reservation pipeline',
            'primary_title' => 'Upcoming reservations',
            'primary_copy' => 'Future reservations with real guest counts, statuses and table assignments.',
            'spotlight_title' => 'Next arrivals',
            'spotlight_copy' => 'The next reservations expected at this restaurant.',
            'table_title' => 'Upcoming reservation detail',
            'table_copy' => 'Reservation date, time, guests, assigned tables and current status.',
        ],
    ];

    $profile = $profiles[$type] ?? $profiles['sales'];

    $reportRoutes = [
        'sales' => ['Sales over time', admin_url('pmdreports/sales')],
        'hourly' => ['Sales by hour', admin_url('pmdreports/hourly')],
        'categories' => ['Sales by category', admin_url('pmdreports/categories')],
        'payments' => ['Payment methods', admin_url('pmdreports/payments')],
        'transactions' => ['Recent transactions', admin_url('pmdreports/transactions')],
        'alerts' => ['Alerts', admin_url('pmdreports/alerts')],
        'liveorders' => ['Live orders', admin_url('pmdreports/liveorders')],
        'channels' => ['Order channels', admin_url('pmdreportchannels')],
        'topitems' => ['Top-selling items', admin_url('pmdreports/topitems')],
        'tips' => ['Tips summary', admin_url('pmdreporttips')],
        'reviews' => ['Latest reviews', admin_url('pmdreports/reviews')],
        'reservations' => ['Upcoming reservations', admin_url('pmdreports/reservations')],
    ];

    $spotlightRows = array_slice($rows, 0, 6);
    $primaryColumn = $columns[0] ?? null;
    $secondaryColumn = $columns[1] ?? null;
    $tertiaryColumn = $columns[2] ?? null;
@endphp

<div
    id="pmd-report-page"
    class="pmd-owner-page pmd-report-page"
    data-pmd-owner-page
    data-pmd-report-page
    data-pmd-report-type="{{ $type }}"
    data-pmd-report-currency="{{ $report['currency']['code'] ?? 'EUR' }}"
>
    <header class="pmd-owner-header pmd-report-header">
        <div class="pmd-owner-header__left">
            <a
                class="pmd-owner-header-button"
                href="{{ $report['back_url'] ?? admin_url('dashboard2') }}"
                aria-label="Back to dashboard"
                title="Back to dashboard"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>{{ $report['title'] ?? 'Owner report' }}</h1>
        </div>

        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <button
                type="button"
                class="pmd-owner-header-button pmd-report-export"
                data-pmd-report-export
                aria-label="Export this report as CSV"
                title="Export CSV"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
            </button>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <main class="pmd-report-main">
        <section class="pmd-report-intro" data-accent="{{ $report['accent'] ?? 'slate' }}">
            <div class="pmd-report-intro__copy">
                <span class="pmd-report-eyebrow">{{ $profile['eyebrow'] }}</span>
                <h2>{{ $report['title'] ?? '' }}</h2>
                <p>{{ $report['subtitle'] ?? $profile['primary_copy'] }}</p>
            </div>

            @if(count($periods) > 1)
                <nav class="pmd-report-periods" aria-label="Report period">
                    @foreach($periods as $value => $label)
                        <a
                            href="{{ $routeUrl }}?period={{ $value }}"
                            class="{{ $activePeriod === $value ? 'is-active' : '' }}"
                            aria-current="{{ $activePeriod === $value ? 'page' : 'false' }}"
                        >{{ $label }}</a>
                    @endforeach
                </nav>
            @else
                <span class="pmd-report-window-label">{{ $report['period_label'] ?? '' }}</span>
            @endif
        </section>

        <nav class="pmd-report-switcher" aria-label="Owner reports">
            @foreach($reportRoutes as $reportType => [$label, $url])
                <a
                    href="{{ $url }}"
                    class="{{ $type === $reportType ? 'is-active' : '' }}"
                    aria-current="{{ $type === $reportType ? 'page' : 'false' }}"
                >{{ $label }}</a>
            @endforeach
        </nav>

        @if(!empty($report['error']))
            <section class="pmd-report-error" role="alert">
                <strong>Report unavailable</strong>
                <span>{{ $report['error'] }}</span>
            </section>
        @endif

        @if(count($stats))
            <section class="pmd-report-stats" aria-label="Summary">
                @foreach($stats as $stat)
                    <article class="pmd-report-stat">
                        <span>{{ $stat['label'] ?? '' }}</span>
                        <strong>{{ $stat['value'] ?? '—' }}</strong>
                        @if(!empty($stat['meta']))
                            <small>{{ $stat['meta'] }}</small>
                        @endif
                    </article>
                @endforeach
            </section>
        @endif

        @if($chart)
            <section class="pmd-report-workspace pmd-report-workspace--chart">
                <div class="pmd-owner-card pmd-report-card" data-accent="{{ $report['accent'] ?? 'slate' }}">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $profile['primary_title'] }}</h2>
                            <p>{{ $profile['primary_copy'] }}</p>
                        </div>

                        @if($type === 'sales')
                            <div class="pmd-report-chart-modes" role="group" aria-label="Chart type">
                                <button type="button" class="is-active" data-pmd-report-chart-mode="line" aria-pressed="true">Line</button>
                                <button type="button" data-pmd-report-chart-mode="bar" aria-pressed="false">Bar</button>
                            </div>
                        @endif
                    </div>
                    <div class="pmd-owner-card__body">
                        <div
                            class="pmd-report-chart"
                            data-pmd-report-chart
                            aria-label="{{ $report['title'] ?? 'Report' }} chart"
                        ></div>
                    </div>
                </div>

                <aside class="pmd-owner-card pmd-report-spotlight" data-accent="{{ $report['accent'] ?? 'slate' }}">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $profile['spotlight_title'] }}</h2>
                            <p>{{ $profile['spotlight_copy'] }}</p>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body pmd-report-focus-list">
                        @forelse($spotlightRows as $row)
                            <div class="pmd-report-focus-row">
                                <div>
                                    <strong>{{ $primaryColumn ? data_get($row, $primaryColumn['key'] ?? '', '—') : '—' }}</strong>
                                    @if($tertiaryColumn)
                                        <small>{{ data_get($row, $tertiaryColumn['key'] ?? '', '—') }}</small>
                                    @endif
                                </div>
                                @if($secondaryColumn)
                                    <span>{{ data_get($row, $secondaryColumn['key'] ?? '', '—') }}</span>
                                @endif
                            </div>
                        @empty
                            <div class="pmd-report-empty pmd-report-empty--inside">
                                <strong>No activity yet</strong>
                                <span>There are no matching rows for this report window.</span>
                            </div>
                        @endforelse
                    </div>
                </aside>
            </section>

            <script id="pmd-report-chart-data" type="application/json">{!! json_encode($chart, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
        @else
            <section class="pmd-owner-card pmd-report-operational" data-accent="{{ $report['accent'] ?? 'slate' }}">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon pmd-report-card-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"></path></svg>
                    </div>
                    <div class="pmd-owner-card__title">
                        <h2>{{ $profile['spotlight_title'] }}</h2>
                        <p>{{ $profile['spotlight_copy'] }}</p>
                    </div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-report-operational-grid">
                        @forelse($spotlightRows as $row)
                            <article class="pmd-report-operational-row">
                                <strong>{{ $primaryColumn ? data_get($row, $primaryColumn['key'] ?? '', '—') : '—' }}</strong>
                                @if($secondaryColumn)
                                    <span>{{ data_get($row, $secondaryColumn['key'] ?? '', '—') }}</span>
                                @endif
                                @if($tertiaryColumn)
                                    <small>{{ data_get($row, $tertiaryColumn['key'] ?? '', '—') }}</small>
                                @endif
                            </article>
                        @empty
                            <div class="pmd-report-empty pmd-report-empty--inside">
                                <strong>No activity yet</strong>
                                <span>There are no matching source rows for this report.</span>
                            </div>
                        @endforelse
                    </div>
                </div>
            </section>
        @endif

        <section class="pmd-owner-card pmd-report-card" data-accent="{{ $report['accent'] ?? 'slate' }}">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon pmd-report-card-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"></path></svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>{{ $profile['table_title'] }}</h2>
                    <p>{{ $profile['table_copy'] }} · {{ count($rows) }} row{{ count($rows) === 1 ? '' : 's' }}</p>
                </div>
            </div>

            <div class="pmd-owner-card__body pmd-report-table-body">
                @if(count($rows) && count($columns))
                    <div class="pmd-report-table-wrap">
                        <table class="pmd-report-table">
                            <thead>
                                <tr>
                                    @foreach($columns as $column)
                                        <th>{{ $column['label'] ?? '' }}</th>
                                    @endforeach
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($rows as $row)
                                    <tr>
                                        @foreach($columns as $column)
                                            @php($key = $column['key'] ?? '')
                                            <td data-label="{{ $column['label'] ?? '' }}">{{ data_get($row, $key, '—') }}</td>
                                        @endforeach
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="pmd-report-empty">
                        <strong>No data for this view</strong>
                        <span>There is no matching source activity for the selected report window.</span>
                    </div>
                @endif
            </div>
        </section>

        <section class="pmd-report-source" aria-label="Data authority">
            <div class="pmd-report-source__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V7l-8-4Z"></path><path d="m9 12 2 2 4-4"></path></svg>
            </div>
            <div class="pmd-report-source__copy">
                <strong>Data authority</strong>
                <span>{{ $report['source'] ?? 'Dashboard2 canonical analytics source.' }}</span>
            </div>
            <div class="pmd-report-source-meta">
                <span>{{ $report['currency']['code'] ?? 'EUR' }}</span>
                <span>{{ $report['timezone'] ?? 'Europe/Berlin' }}</span>
                <span>{{ $report['period_label'] ?? '' }}</span>
            </div>
        </section>
    </main>

    <script id="pmd-report-table-data" type="application/json">{!! json_encode([
        'type' => $type,
        'title' => $report['title'] ?? 'Owner report',
        'columns' => $columns,
        'rows' => $rows,
    ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
</div>
