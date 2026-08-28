@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdReportText = $pmdReportText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'reports.');
    };
@endphp

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
    $periodQuery = is_array($report['period_query'] ?? null) ? $report['period_query'] : ['period' => $activePeriod];
    $staffDirectoryRows = is_array($report['staff_directory_rows'] ?? null) ? $report['staff_directory_rows'] : [];
    $selectedStaff = is_array($report['selected_staff'] ?? null) ? $report['selected_staff'] : null;
    $selectedAdminSessions = is_array($report['selected_admin_sessions'] ?? null) ? $report['selected_admin_sessions'] : [];
    $selectedAttendanceRows = is_array($report['selected_attendance_rows'] ?? null) ? $report['selected_attendance_rows'] : [];
    $attendanceContext = is_array($report['attendance_context'] ?? null) ? $report['attendance_context'] : [];

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
            'primary_copy' => 'Open orders created inside the selected report period plus current table occupancy for the authenticated restaurant location.',
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
            'primary_copy' => 'Ratings and comments scoped to the authenticated restaurant location and selected report period.',
            'spotlight_title' => 'Latest feedback',
            'spotlight_copy' => 'The newest guest reviews available from the restaurant review source.',
            'table_title' => 'Review detail',
            'table_copy' => 'Rating, guest comment, approval state and review date.',
        ],
        'reservations' => [
            'eyebrow' => 'Reservation pipeline',
            'primary_title' => 'Reservations in range',
            'primary_copy' => 'Reservations inside the selected report period with real guest counts, statuses and table assignments.',
            'spotlight_title' => 'Reservation activity',
            'spotlight_copy' => 'Reservations matching the currently selected date range.',
            'table_title' => 'Reservation detail',
            'table_copy' => 'Reservation date, time, guests, assigned tables and current status.',
        ],
        'attendance' => [
            'eyebrow' => 'Workforce operations',
            'primary_title' => 'Staff attendance & presence',
            'primary_copy' => 'One view of signed-in admin sessions and the existing biometric/time-clock attendance authority.',
            'spotlight_title' => 'Latest attendance activity',
            'spotlight_copy' => 'The newest time-clock events in the selected report window.',
            'table_title' => 'Attendance detail',
            'table_copy' => 'Staff, check-in/out, hours, verification method, device and status.',
        ],
    ];

    $profile = $profiles[$type] ?? $profiles['sales'];
    $profile = \Admin\Classes\PmdPlatformI18n::translateStructure($profile, 'reports.');

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
        'attendance' => ['Staff attendance', admin_url('pmdreports/attendance')],
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
                aria-label="{{ $pmdReportText('Back to dashboard') }}"
                title="{{ $pmdReportText('Back to dashboard') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>{{ $report['title'] ?? 'Owner report' }}</h1>
        </div>

        <div class="pmd-owner-header__actions pmd-report-header__actions" data-pmd-owner-header-actions>
            @if(count($periods) > 1)
                <nav class="pmd-report-periods pmd-report-periods--header" aria-label="{{ $pmdReportText('Report period') }}">
                    @foreach($periods as $value => $label)
                        @php
                            $periodParams = ['period' => $value];
                            if ($value === 'custom' && $activePeriod === 'custom') {
                                if (!empty($report['date_from'])) $periodParams['date_from'] = $report['date_from'];
                                if (!empty($report['date_to'])) $periodParams['date_to'] = $report['date_to'];
                            }
                            if ($type === 'attendance' && !empty($selectedStaff['staff_id'])) {
                                $periodParams['staff_id'] = (int)$selectedStaff['staff_id'];
                            }
                            $periodHref = $routeUrl.'?'.http_build_query($periodParams);
                        @endphp
                        <a
                            href="{{ $periodHref }}"
                            class="{{ $activePeriod === $value ? 'is-active' : '' }}"
                            aria-current="{{ $activePeriod === $value ? 'page' : 'false' }}"
                        >{{ $pmdReportText($label) }}</a>
                    @endforeach
                </nav>
            @else
                <span class="pmd-report-window-label pmd-report-window-label--header">{{ $report['period_label'] ?? '' }}</span>
            @endif

            <button
                type="button"
                class="pmd-owner-header-button pmd-report-export"
                data-pmd-report-export
                aria-label="{{ $pmdReportText('Export this report as CSV') }}"
                title="{{ $pmdReportText('Export CSV') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
            </button>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <main class="pmd-report-main">
        <nav class="pmd-report-switcher" aria-label="{{ $pmdReportText('Owner reports') }}">
            @foreach($reportRoutes as $reportType => [$label, $url])
                @php($reportHref = $url.'?'.http_build_query($periodQuery))
                <a
                    href="{{ $reportHref }}"
                    class="{{ $type === $reportType ? 'is-active' : '' }}"
                    aria-current="{{ $type === $reportType ? 'page' : 'false' }}"
                >{{ $pmdReportText($label) }}</a>
            @endforeach
        </nav>

        @if(!empty($report['error']))
            <section class="pmd-report-error" role="alert">
                <strong>{{ $pmdReportText('Report unavailable') }}</strong>
                <span>{{ $report['error'] }}</span>
            </section>
        @endif

        @if(count($stats))
            <section class="pmd-report-stats" aria-label="{{ $pmdReportText('Summary') }}">
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

        @if($type === 'attendance')
            @if($selectedStaff)
                @php($allStaffUrl = admin_url('pmdreports/attendance').'?'.http_build_query($periodQuery))
                <section class="pmd-owner-card pmd-report-staff-detail" data-accent="green">
                    <div class="pmd-owner-card__header pmd-report-staff-detail__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0"></path><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title pmd-report-staff-detail__identity">
                            <h2>{{ $selectedStaff['name'] ?? 'Staff' }}</h2>
                            <p style="display:flex !important;align-items:center !important;flex-wrap:wrap !important;gap:7px !important;margin:5px 0 0 !important;color:#74837f !important;font-size:13px !important;line-height:1.35 !important">
                                <span>{{ $selectedStaff['role'] ?? 'Staff' }}</span><span aria-hidden="true">·</span>
                                <span class="pmd-report-username" style="display:inline !important;color:#74837f !important;font-size:13px !important">{{ '@'.ltrim((string)($selectedStaff['username'] ?? '—'), '@') }}</span><span aria-hidden="true">·</span>
                                <span>{{ $report['period_label'] ?? '' }}</span>
                            </p>
                        </div>
                        <div class="pmd-report-staff-detail__actions" style="margin-left:auto !important;display:flex !important;align-items:center !important;gap:10px !important">
                            <span class="pmd-attendance-state {{ !empty($selectedStaff['online']) ? 'is-ready' : 'is-muted' }}" style="display:inline-flex !important;align-items:center !important;gap:7px !important;min-height:32px !important;padding:0 11px !important;border-radius:999px !important;background:{{ !empty($selectedStaff['online']) ? '#eaf8f3' : '#f1f5f4' }} !important;color:{{ !empty($selectedStaff['online']) ? '#08705a' : '#5f6f6a' }} !important;font-size:13px !important;font-weight:800 !important;white-space:nowrap !important"><i class="pmd-attendance-state__dot" aria-hidden="true" style="display:block !important;width:8px !important;height:8px !important;flex:0 0 8px !important;border-radius:50% !important;background:{{ !empty($selectedStaff['online']) ? '#16b875' : '#a2aca8' }} !important"></i><span>{{ $pmdReportText(!empty($selectedStaff['online']) ? 'Online now' : 'Offline now') }}</span></span>
                            <a class="pmd-report-staff-detail__back" href="{{ $allStaffUrl }}" style="min-height:36px !important;display:inline-flex !important;align-items:center !important;gap:6px !important;padding:0 12px !important;border:1px solid #d4e5df !important;border-radius:10px !important;background:#fff !important;color:#08705a !important;font-size:13px !important;font-weight:800 !important;text-decoration:none !important"><span aria-hidden="true">←</span> {{ $pmdReportText('All staff') }}</a>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body pmd-report-staff-detail__body" style="display:block !important;padding:18px !important">
                        <div class="pmd-report-staff-detail-stats" aria-label="{{ $pmdReportText('Staff summary') }}" style="width:100% !important;display:grid !important;grid-template-columns:repeat(auto-fit,minmax(175px,1fr)) !important;gap:12px !important;margin:0 0 16px !important">
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Admin online time') }}</span><strong style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:24px !important;font-weight:850 !important;line-height:1.08 !important">{{ $selectedStaff['period_admin_time'] ?? '0 min' }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $report['period_label'] ?? 'Selected period' }}</small></div>
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Admin sessions') }}</span><strong style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:24px !important;font-weight:850 !important;line-height:1.08 !important">{{ (int)($selectedStaff['period_sessions'] ?? 0) }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $report['period_label'] ?? 'Selected period' }}</small></div>
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Time-clock hours') }}</span><strong style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:24px !important;font-weight:850 !important;line-height:1.08 !important">{{ $selectedStaff['worked_hours'] ?? '0.00 h' }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $report['period_label'] ?? 'Selected period' }}</small></div>
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Time-clock shifts') }}</span><strong style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:24px !important;font-weight:850 !important;line-height:1.08 !important">{{ (int)($selectedStaff['attendance_shifts'] ?? 0) }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $report['period_label'] ?? 'Selected period' }}</small></div>
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Active sessions') }}</span><strong style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:24px !important;font-weight:850 !important;line-height:1.08 !important">{{ (int)($selectedStaff['active_sessions'] ?? 0) }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $pmdReportText('Right now') }}</small></div>
                            <div class="pmd-report-staff-detail-stat" style="display:flex !important;flex-direction:column !important;justify-content:center !important;min-height:112px !important;padding:15px !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fbfdfc !important"><span style="display:block !important;color:#74837f !important;font-size:12px !important;font-weight:800 !important;text-transform:uppercase !important;letter-spacing:.04em !important">{{ $pmdReportText('Last activity') }}</span><strong class="is-small" style="display:block !important;margin-top:8px !important;color:#16342c !important;font-size:14px !important;font-weight:820 !important;line-height:1.3 !important">{{ $pmdReportText($selectedStaff['last_activity'] ?? 'No tracked activity') }}</strong><small style="display:block !important;margin-top:6px !important;color:#87938f !important;font-size:12.5px !important;line-height:1.3 !important">{{ $pmdReportText('Admin or time clock') }}</small></div>
                        </div>

                        <div class="pmd-report-staff-history-grid" style="width:100% !important;display:grid !important;grid-template-columns:1fr !important;gap:14px !important">
                            <div class="pmd-report-staff-history-panel" style="display:block !important;min-width:0 !important;overflow:hidden !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fff !important">
                                <div class="pmd-report-staff-history-panel__title" style="display:flex !important;align-items:center !important;justify-content:space-between !important;gap:12px !important;min-height:68px !important;padding:13px 15px !important;border-bottom:1px solid #e5eeeb !important;background:#fbfdfc !important">
                                    <div style="min-width:0 !important;display:flex !important;flex-direction:column !important;gap:4px !important">
                                        <strong style="display:block !important;color:#213b34 !important;font-size:15px !important;font-weight:820 !important;line-height:1.25 !important">{{ $pmdReportText('Admin session history') }}</strong>
                                        <span style="display:block !important;margin:0 !important;color:#778681 !important;font-size:13.5px !important;line-height:1.4 !important">Authenticated Admin presence inside {{ strtolower((string)($report['period_label'] ?? 'the selected period')) }}.</span>
                                    </div>
                                    <b style="min-width:32px !important;height:32px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;padding:0 9px !important;border-radius:999px !important;background:#edf6f3 !important;color:#426058 !important;font-size:13px !important;font-weight:820 !important">{{ count($selectedAdminSessions) }}</b>
                                </div>
                                @if(count($selectedAdminSessions))
                                    <div class="pmd-report-table-wrap">
                                        <table class="pmd-report-table pmd-report-staff-history-table">
                                            <thead><tr><th>{{ $pmdReportText('Login') }}</th><th>{{ $pmdReportText('End') }}</th><th>{{ $pmdReportText('Duration') }}</th><th>{{ $pmdReportText('Status') }}</th><th>{{ $pmdReportText('Client') }}</th><th>{{ $pmdReportText('IP') }}</th></tr></thead>
                                            <tbody>
                                                @foreach($selectedAdminSessions as $sessionRow)
                                                    <tr>
                                                        <td data-label="Login">{{ $sessionRow['login'] ?? '—' }}</td>
                                                        <td data-label="End">{{ $sessionRow['end'] ?? '—' }}</td>
                                                        <td data-label="Duration"><strong>{{ $sessionRow['duration'] ?? '0 min' }}</strong></td>
                                                        <td data-label="Status"><span class="pmd-attendance-state {{ ($sessionRow['status'] ?? '') === 'Online' ? 'is-ready' : 'is-muted' }}" style="display:inline-flex !important;align-items:center !important;gap:7px !important;font-size:13px !important;font-weight:750 !important;color:{{ ($sessionRow['status'] ?? '') === 'Online' ? '#08705a' : '#5f6f6a' }} !important"><i class="pmd-attendance-state__dot" aria-hidden="true" style="display:block !important;width:8px !important;height:8px !important;border-radius:50% !important;background:{{ ($sessionRow['status'] ?? '') === 'Online' ? '#16b875' : '#a2aca8' }} !important"></i><span>{{ $sessionRow['status'] ?? '—' }}</span></span></td>
                                                        <td data-label="Client">{{ $sessionRow['client'] ?? 'Browser' }}</td>
                                                        <td data-label="IP">{{ $sessionRow['ip'] ?? '—' }}</td>
                                                    </tr>
                                                @endforeach
                                            </tbody>
                                        </table>
                                    </div>
                                @else
                                    <div class="pmd-report-compact-empty" style="display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:5px !important;margin:14px !important;padding:15px !important"><strong style="display:block !important;font-size:14px !important;line-height:1.3 !important">No Admin session in this range</strong><span style="display:block !important;margin:0 !important;font-size:13.5px !important;line-height:1.45 !important;color:#6e7e79 !important">Presence history starts from the moment PMD session tracking was enabled.</span></div>
                                @endif
                            </div>

                            <div class="pmd-report-staff-history-panel" style="display:block !important;min-width:0 !important;overflow:hidden !important;border:1px solid #dfeae7 !important;border-radius:14px !important;background:#fff !important">
                                <div class="pmd-report-staff-history-panel__title" style="display:flex !important;align-items:center !important;justify-content:space-between !important;gap:12px !important;min-height:68px !important;padding:13px 15px !important;border-bottom:1px solid #e5eeeb !important;background:#fbfdfc !important">
                                    <div style="min-width:0 !important;display:flex !important;flex-direction:column !important;gap:4px !important">
                                        <strong style="display:block !important;color:#213b34 !important;font-size:15px !important;font-weight:820 !important;line-height:1.25 !important">Time-clock history</strong>
                                        <span style="display:block !important;margin:0 !important;color:#778681 !important;font-size:13.5px !important;line-height:1.4 !important">Manual or biometric attendance inside {{ strtolower((string)($report['period_label'] ?? 'the selected period')) }}.</span>
                                    </div>
                                    <b style="min-width:32px !important;height:32px !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;padding:0 9px !important;border-radius:999px !important;background:#edf6f3 !important;color:#426058 !important;font-size:13px !important;font-weight:820 !important">{{ count($selectedAttendanceRows) }}</b>
                                </div>
                                @if(count($selectedAttendanceRows))
                                    <div class="pmd-report-table-wrap">
                                        <table class="pmd-report-table pmd-report-staff-history-table">
                                            <thead><tr><th>{{ $pmdReportText('Check in') }}</th><th>{{ $pmdReportText('Check out') }}</th><th>{{ $pmdReportText('Worked') }}</th><th>{{ $pmdReportText('Verification') }}</th><th>{{ $pmdReportText('Device') }}</th><th>{{ $pmdReportText('Status') }}</th></tr></thead>
                                            <tbody>
                                                @foreach($selectedAttendanceRows as $attendanceRow)
                                                    <tr>
                                                        <td data-label="Check in">{{ $attendanceRow['check_in'] ?? '—' }}</td>
                                                        <td data-label="Check out">{{ $attendanceRow['check_out'] ?? '—' }}</td>
                                                        <td data-label="Worked"><strong>{{ $attendanceRow['worked'] ?? '—' }}</strong></td>
                                                        <td data-label="Verification">{{ $attendanceRow['verification'] ?? '—' }}</td>
                                                        <td data-label="Device">{{ $attendanceRow['device'] ?? '—' }}</td>
                                                        <td data-label="Status">{{ $attendanceRow['status'] ?? '—' }}</td>
                                                    </tr>
                                                @endforeach
                                            </tbody>
                                        </table>
                                    </div>
                                @else
                                    <div class="pmd-report-compact-empty" style="display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:5px !important;margin:14px !important;padding:15px !important"><strong style="display:block !important;font-size:14px !important;line-height:1.3 !important">No time-clock entry in this range</strong><span style="display:block !important;margin:0 !important;font-size:13.5px !important;line-height:1.45 !important;color:#6e7e79 !important">Admin login presence is tracked separately. Manual or biometric check-in will appear here when it is actually used.</span></div>
                                @endif
                            </div>
                        </div>
                    </div>
                </section>
            @else
                <section class="pmd-owner-card pmd-report-staff-directory" data-accent="blue">
                    <div class="pmd-owner-card__header pmd-report-staff-directory__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $pmdReportText('Staff accounts') }}</h2>
                            <p>Enabled Admin accounts for this restaurant location. Open a person to review their Admin-session and time-clock history for the selected date range.</p>
                        </div>
                        <div class="pmd-report-staff-directory__tools" style="margin-left:auto !important;display:flex !important;align-items:center !important;gap:10px !important">
                            <label class="pmd-report-staff-search" style="display:block !important;width:310px !important;max-width:38vw !important">
                                <input type="search" aria-label="{{ $pmdReportText('Search staff') }}" placeholder="{{ $pmdReportText('Search name, role or username') }}" autocomplete="off" data-pmd-staff-search style="display:block !important;width:100% !important;height:38px !important;padding:0 12px !important;border:1px solid #d8e5e1 !important;border-radius:10px !important;background:#fff !important;font-size:13.5px !important;line-height:38px !important;box-sizing:border-box !important">
                            </label>
                            <span class="pmd-report-card-count" style="display:inline-flex !important;align-items:center !important;min-height:34px !important;padding:0 11px !important;border-radius:999px !important;background:#edf6f3 !important;color:#31554b !important;font-size:13px !important;font-weight:800 !important;white-space:nowrap !important">{{ count($staffDirectoryRows) }} {{ $pmdReportText('staff') }}</span>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body pmd-report-table-body pmd-report-staff-directory__body">
                        @if(!empty($attendanceContext['tenant_account_count']) && (int)$attendanceContext['tenant_account_count'] !== count($staffDirectoryRows))
                            <div class="pmd-report-location-scope-note" style="display:flex !important;align-items:center !important;gap:8px !important;flex-wrap:wrap !important;margin:0 0 12px !important;padding:9px 11px !important;border:1px solid #e0ebe7 !important;border-radius:10px !important;background:#f8fbfa !important;font-size:13px !important;line-height:1.35 !important">
                                <span class="pmd-report-location-scope-note__count" style="display:inline-flex !important;align-items:center !important;gap:4px !important;font-weight:800 !important;color:#17332c !important"><strong>{{ count($staffDirectoryRows) }}</strong> {{ $pmdReportText('at this location') }}</span>
                                <span aria-hidden="true" style="color:#a0aca8">•</span>
                                <span class="pmd-report-location-scope-note__copy" style="color:#667773 !important">{{ (int)$attendanceContext['tenant_account_count'] }} {{ $pmdReportText('tenant-wide; staff assigned only to other locations are excluded.') }}</span>
                            </div>
                        @endif
                        @if(count($staffDirectoryRows))
                            <div class="pmd-report-table-wrap pmd-report-staff-directory-table-wrap">
                                <table class="pmd-report-table pmd-report-staff-directory-table">
                                    <thead>
                                        <tr><th>{{ $pmdReportText('Staff') }}</th><th>{{ $pmdReportText('Role') }}</th><th>{{ $pmdReportText('Status') }}</th><th>{{ $pmdReportText('Admin time') }}</th><th>{{ $pmdReportText('Sessions') }}</th><th>{{ $pmdReportText('Time clock') }}</th><th>{{ $pmdReportText('Shifts') }}</th><th>{{ $pmdReportText('Last activity') }}</th><th aria-label="{{ $pmdReportText('Open report') }}"></th></tr>
                                    </thead>
                                    <tbody>
                                        @foreach($staffDirectoryRows as $staffRow)
                                            <tr data-pmd-staff-row data-pmd-staff-href="{{ $staffRow['detail_url'] ?? '#' }}" data-pmd-staff-search-text="{{ strtolower(($staffRow['name'] ?? '').' '.($staffRow['role'] ?? '').' '.($staffRow['username'] ?? '')) }}">
                                                <td data-label="Staff"><a class="pmd-report-staff-name" href="{{ $staffRow['detail_url'] ?? '#' }}" style="display:block !important;line-height:1.25 !important;text-decoration:none !important"><strong style="display:block !important;color:#17332c !important;font-size:14px !important;font-weight:820 !important">{{ $staffRow['name'] ?? 'Staff' }}</strong><small style="display:block !important;margin-top:3px !important;color:#74837f !important;font-size:12.5px !important;font-weight:650 !important">{{ '@'.ltrim((string)($staffRow['username'] ?? '—'), '@') }}</small></a></td>
                                                <td data-label="Role"><span class="pmd-report-role-label">{{ $staffRow['role'] ?? 'Staff' }}</span></td>
                                                <td data-label="Status"><span class="pmd-attendance-state {{ !empty($staffRow['online']) ? 'is-ready' : 'is-muted' }}" style="display:inline-flex !important;align-items:center !important;gap:7px !important;font-size:13px !important;font-weight:750 !important;color:{{ !empty($staffRow['online']) ? '#08705a' : '#5f6f6a' }} !important"><i class="pmd-attendance-state__dot" aria-hidden="true" style="display:block !important;width:8px !important;height:8px !important;flex:0 0 8px !important;border-radius:50% !important;background:{{ !empty($staffRow['online']) ? '#16b875' : '#a2aca8' }} !important"></i><span>{{ $pmdReportText(!empty($staffRow['online']) ? 'Online' : 'Offline') }}</span></span></td>
                                                <td data-label="Admin time"><strong>{{ $staffRow['period_admin_time'] ?? '0 min' }}</strong></td>
                                                <td data-label="Sessions">{{ (int)($staffRow['period_sessions'] ?? 0) }}</td>
                                                <td data-label="Time clock">{{ $staffRow['worked_hours'] ?? '0.00 h' }}</td>
                                                <td data-label="Shifts">{{ (int)($staffRow['attendance_shifts'] ?? 0) }}</td>
                                                <td data-label="Last activity"><span class="pmd-report-last-activity">{{ $pmdReportText($staffRow['last_activity'] ?? 'No tracked activity') }}</span></td>
                                                <td class="pmd-report-staff-open"><a href="{{ $staffRow['detail_url'] ?? '#' }}" aria-label="{{ $pmdReportText('Open report') }}: {{ $staffRow['name'] ?? 'staff' }}">→</a></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            <div class="pmd-report-compact-empty" data-pmd-staff-search-empty hidden><strong>{{ $pmdReportText('No matching staff') }}</strong><span>{{ $pmdReportText('Try another name, role or username.') }}</span></div>
                        @else
                            <div class="pmd-report-compact-empty"><strong>{{ $pmdReportText('No Admin staff accounts found') }}</strong><span>{{ $pmdReportText('No enabled Admin account could be resolved for this location.') }}</span></div>
                        @endif
                    </div>
                </section>
            @endif
        @else
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
                                <div class="pmd-report-chart-modes" role="group" aria-label="{{ $pmdReportText('Chart type') }}">
                                    <button type="button" class="is-active" data-pmd-report-chart-mode="line" aria-pressed="true">{{ $pmdReportText('Line') }}</button>
                                    <button type="button" data-pmd-report-chart-mode="bar" aria-pressed="false">{{ $pmdReportText('Bar') }}</button>
                                </div>
                            @endif
                        </div>
                        <div class="pmd-owner-card__body">
                            <div class="pmd-report-chart" data-pmd-report-chart aria-label="{{ ($report['title'] ?? $pmdReportText('Report')).' '.$pmdReportText('chart') }}"></div>
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
                                        @if($tertiaryColumn)<small>{{ data_get($row, $tertiaryColumn['key'] ?? '', '—') }}</small>@endif
                                    </div>
                                    @if($secondaryColumn)<span>{{ data_get($row, $secondaryColumn['key'] ?? '', '—') }}</span>@endif
                                </div>
                            @empty
                                <div class="pmd-report-empty pmd-report-empty--inside"><strong>{{ $pmdReportText('No activity yet') }}</strong><span>{{ $pmdReportText('There are no matching rows for this report window.') }}</span></div>
                            @endforelse
                        </div>
                    </aside>
                </section>
                <script id="pmd-report-chart-data" type="application/json">{!! json_encode($chart, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
            @else
                <section class="pmd-owner-card pmd-report-operational" data-accent="{{ $report['accent'] ?? 'slate' }}">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon pmd-report-card-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"></path></svg></div>
                        <div class="pmd-owner-card__title"><h2>{{ $profile['spotlight_title'] }}</h2><p>{{ $profile['spotlight_copy'] }}</p></div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-report-operational-grid">
                            @forelse($spotlightRows as $row)
                                <article class="pmd-report-operational-row">
                                    <strong>{{ $primaryColumn ? data_get($row, $primaryColumn['key'] ?? '', '—') : '—' }}</strong>
                                    @if($secondaryColumn)<span>{{ data_get($row, $secondaryColumn['key'] ?? '', '—') }}</span>@endif
                                    @if($tertiaryColumn)<small>{{ data_get($row, $tertiaryColumn['key'] ?? '', '—') }}</small>@endif
                                </article>
                            @empty
                                <div class="pmd-report-empty pmd-report-empty--inside"><strong>{{ $pmdReportText('No activity yet') }}</strong><span>{{ $pmdReportText('There are no matching source rows for this report.') }}</span></div>
                            @endforelse
                        </div>
                    </div>
                </section>
            @endif

            <section class="pmd-owner-card pmd-report-card" data-accent="{{ $report['accent'] ?? 'slate' }}">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon pmd-report-card-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $profile['table_title'] }}</h2><p>{{ $profile['table_copy'] }} · {{ count($rows) }} {{ count($rows) === 1 ? $pmdReportText('row') : $pmdReportText('rows') }}</p></div>
                </div>
                <div class="pmd-owner-card__body pmd-report-table-body">
                    @if(count($rows) && count($columns))
                        <div class="pmd-report-table-wrap">
                            <table class="pmd-report-table">
                                <thead><tr>@foreach($columns as $column)<th>{{ $column['label'] ?? '' }}</th>@endforeach</tr></thead>
                                <tbody>
                                    @foreach($rows as $row)
                                        <tr>@foreach($columns as $column) @php($key = $column['key'] ?? '') <td data-label="{{ $column['label'] ?? '' }}">{{ data_get($row, $key, '—') }}</td> @endforeach</tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @else
                        <div class="pmd-report-empty"><strong>{{ $pmdReportText('No data for this view') }}</strong><span>{{ $pmdReportText('There is no matching source activity for the selected report window.') }}</span></div>
                    @endif
                </div>
            </section>
        @endif

    </main>

    <script id="pmd-report-table-data" type="application/json">{!! json_encode([
        'type' => $type,
        'title' => $report['title'] ?? 'Owner report',
        'columns' => $columns,
        'rows' => $rows,
    ], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
</div>
