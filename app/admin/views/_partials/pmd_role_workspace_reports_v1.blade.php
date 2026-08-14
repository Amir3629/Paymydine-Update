{{-- PMD_ROLE_WORKSPACE_REPORTS_V1 --}}
@php
    $pmdRoleWorkspaceKey = (string)($pmdCleanWorkspaceKey ?? '');

    $pmdRoleReports = $pmdRoleWorkspaceKey === 'manager'
        ? [
            ['title' => 'Live orders', 'text' => 'See open orders, service status and order age in one operational view.', 'href' => admin_url('pmdreports/liveorders'), 'icon' => 'orders'],
            ['title' => 'Alerts', 'text' => 'Review payment, refund, stock, review and long-open-table exceptions.', 'href' => admin_url('pmdreports/alerts'), 'icon' => 'alert'],
            ['title' => 'Sales by hour', 'text' => 'Identify the strongest and weakest service hours for staffing decisions.', 'href' => admin_url('pmdreports/hourly'), 'icon' => 'clock'],
            ['title' => 'Top-selling items', 'text' => 'See which menu items lead by sold quantity and revenue.', 'href' => admin_url('pmdreports/topitems'), 'icon' => 'star'],
            ['title' => 'Upcoming reservations', 'text' => 'Review upcoming bookings, guests, statuses and table assignments.', 'href' => admin_url('pmdreports/reservations'), 'icon' => 'calendar'],
            ['title' => 'Sales by category', 'text' => 'Compare category revenue and contribution for menu decisions.', 'href' => admin_url('pmdreports/categories'), 'icon' => 'chart'],
        ]
        : [
            ['title' => 'Sales over time', 'text' => 'Reconcile settled revenue, order volume and averages across the selected period.', 'href' => admin_url('pmdreports/sales'), 'icon' => 'chart'],
            ['title' => 'Recent transactions', 'text' => 'Open the detailed settled-order ledger for reconciliation and review.', 'href' => admin_url('pmdreports/transactions'), 'icon' => 'ledger'],
            ['title' => 'Payment methods', 'text' => 'Compare settled revenue across cash, card and other enabled payment methods.', 'href' => admin_url('pmdreports/payments'), 'icon' => 'payment'],
            ['title' => 'Tips summary', 'text' => 'Review tip totals and tipped-order history from the canonical order totals.', 'href' => admin_url('pmdreporttips'), 'icon' => 'tips'],
            ['title' => 'Sales by hour', 'text' => 'Inspect hourly revenue and order volume for finance and shift reconciliation.', 'href' => admin_url('pmdreports/hourly'), 'icon' => 'clock'],
            ['title' => 'Order channels', 'text' => 'Compare revenue and order mix across real order types and channels.', 'href' => admin_url('pmdreportchannels'), 'icon' => 'channels'],
        ];

    $pmdRoleHeading = $pmdRoleWorkspaceKey === 'manager'
        ? 'Manager command center'
        : 'Finance & accounting reports';

    $pmdRoleSubtitle = $pmdRoleWorkspaceKey === 'manager'
        ? 'Practical operational drill-downs for running today’s restaurant service.'
        : 'Reconcile revenue, payments, tips and transactions from the existing PMD report authorities.';

    $pmdRoleIcon = static function (string $name): string {
        $icons = [
            'orders' => '<path d="M5 6h14M5 12h14M5 18h9"></path><circle cx="18" cy="18" r="2"></circle>',
            'alert' => '<path d="M12 3l9 17H3L12 3z"></path><path d="M12 9v4M12 17h.01"></path>',
            'clock' => '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
            'star' => '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9z"></path>',
            'calendar' => '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 11h18"></path>',
            'chart' => '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
            'ledger' => '<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path>',
            'payment' => '<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18M7 15h3"></path>',
            'tips' => '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"></path>',
            'channels' => '<circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="6" r="3"></circle><circle cx="18" cy="18" r="3"></circle><path d="M9 11l6-4M9 13l6 4"></path>',
        ];

        return $icons[$name] ?? $icons['chart'];
    };
@endphp

<section id="pmd-role-workspace-reports-v1" class="pmd-role-reports" data-pmd-role-reports="{{ $pmdRoleWorkspaceKey }}" aria-labelledby="pmd-role-workspace-reports-title-v1">
    <header class="pmd-role-reports__header">
        <div>
            <h2 id="pmd-role-workspace-reports-title-v1">{{ $pmdRoleHeading }}</h2>
            <p>{{ $pmdRoleSubtitle }}</p>
        </div>
        <span class="pmd-role-reports__permission">Reports</span>
    </header>

    <div class="pmd-role-reports__grid">
        @foreach($pmdRoleReports as $report)
            <a class="pmd-role-report-card" href="{{ $report['href'] }}">
                <span class="pmd-role-report-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">{!! $pmdRoleIcon($report['icon']) !!}</svg>
                </span>
                <span class="pmd-role-report-card__body">
                    <strong>{{ $report['title'] }}</strong>
                    <span>{{ $report['text'] }}</span>
                </span>
                <span class="pmd-role-report-card__action">
                    Open report
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>
                </span>
            </a>
        @endforeach
    </div>
</section>
