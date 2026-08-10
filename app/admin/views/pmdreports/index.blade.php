@php
    $report = $pmdReport ?? [];
    $stats = $report['stats'] ?? [];
    $chart = $report['chart'] ?? null;
    $columns = $report['columns'] ?? [];
    $rows = $report['rows'] ?? [];
    $periods = $report['periods'] ?? [];
    $activePeriod = $report['period'] ?? 'last30';
    $routeUrl = $report['route_url'] ?? url()->current();
@endphp

<div
    id="pmd-report-page"
    class="pmd-owner-page pmd-report-page"
    data-pmd-owner-page
    data-pmd-report-page
    data-pmd-report-type="{{ $report['type'] ?? '' }}"
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
            <div class="pmd-report-header-copy">
                <h1>{{ $report['title'] ?? 'Owner report' }}</h1>
                <span>Dashboard report</span>
            </div>
        </div>

        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <main class="pmd-report-main">
        <section class="pmd-report-intro">
            <div>
                <span class="pmd-report-eyebrow">{{ $report['period_label'] ?? '' }}</span>
                <h2>{{ $report['title'] ?? '' }}</h2>
                <p>{{ $report['subtitle'] ?? '' }}</p>
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
            @endif
        </section>

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
            <section class="pmd-owner-section">
                <div class="pmd-owner-card pmd-report-card" data-accent="{{ $report['accent'] ?? 'slate' }}">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"></path>
                            </svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>Performance</h2>
                            <p>{{ $report['period_label'] ?? '' }} · {{ $report['timezone'] ?? '' }}</p>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div
                            class="pmd-report-chart"
                            data-pmd-report-chart
                            aria-label="{{ $report['title'] ?? 'Report' }} chart"
                        ></div>
                    </div>
                </div>
            </section>

            <script id="pmd-report-chart-data" type="application/json">{!! json_encode($chart, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) !!}</script>
        @endif

        <section class="pmd-owner-section">
            <div class="pmd-owner-card pmd-report-card" data-accent="{{ $report['accent'] ?? 'slate' }}">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon pmd-report-card-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 5h16M4 12h16M4 19h16"></path>
                        </svg>
                    </div>
                    <div class="pmd-owner-card__title">
                        <h2>Detailed data</h2>
                        <p>{{ count($rows) }} row{{ count($rows) === 1 ? '' : 's' }} shown</p>
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
            </div>
        </section>

        <section class="pmd-report-source" aria-label="Data authority">
            <div>
                <strong>Data authority</strong>
                <span>{{ $report['source'] ?? 'Dashboard2 canonical analytics source.' }}</span>
            </div>
            <div class="pmd-report-source-meta">
                <span>{{ $report['currency']['code'] ?? 'EUR' }}</span>
                <span>{{ $report['timezone'] ?? 'Europe/Berlin' }}</span>
            </div>
        </section>
    </main>
</div>
