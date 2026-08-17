{{-- PMD_ROLE_DASHBOARD_EXACT_OWNER_INCLUDE_V3_5
     PMD_ROLE_SPECIFIC_INSIGHTS_V3_5
     Manager/Accountant reuse the exact live Dashboard Lab analytics partial.
     No second chart/card renderer exists on role pages. --}}
@php
    $pmdRoleMode = (string)($pmdRoleDashboardMode ?? 'manager');
    $pmdRoleOwnerBootstrap = is_array($pmdRoleOwnerAnalyticsBootstrap ?? null)
        ? $pmdRoleOwnerAnalyticsBootstrap
        : ['server_first_paint' => false, 'periods' => []];
    $pmdRoleOwnerEndpoint = (string)($pmdRoleOwnerAnalyticsEndpoint ?? '/admin/dashboardlab?pmd_analytics=1');
    $pmdRoleInsightCards = is_array($pmdRoleInsightCards ?? null)
        ? $pmdRoleInsightCards
        : [];

    /* PMD_MANAGER_NO_FINANCE_INSIGHT_CARDS_V3_5_3
     * Manager keeps the shared Owner analytics below the Floor, but never the
     * six finance/accounting insight cards. Accountant keeps those cards.
     * This view-level guard is authoritative even if an older Manager controller
     * accidentally supplies a non-empty pmdRoleInsightCards array.
     */
    if ($pmdRoleMode === 'manager') {
        $pmdRoleInsightCards = [];
    }

    $pmdRoleInsightAria = $pmdRoleMode === 'accountant'
        ? 'Accountant role insights'
        : 'Manager role insights';
@endphp

<div
    class="pmd-role-dashboard-exact-owner"
    data-pmd-role-dashboard="{{ $pmdRoleMode }}"
>
    @if($pmdRoleInsightCards)
        <section
            class="pmd-dashboard-lab-analytics pmd-role-specific-insights"
            data-pmd-role-specific-insights="{{ $pmdRoleMode }}"
            aria-label="{{ $pmdRoleInsightAria }}"
        >
            <div class="pmd-dashboard-lab-analytics__grid pmd-role-specific-insights__grid">
                @foreach($pmdRoleInsightCards as $insightKey => $insight)
                    @php
                        $insightRows = is_array($insight['rows'] ?? null)
                            ? $insight['rows']
                            : [];
                        $insightLayout = (string)($insight['layout'] ?? 'stats');
                        $insightUrl = (string)($insight['url'] ?? '');
                        $insightConnected = ($insight['connected'] ?? true) === true;
                    @endphp
                    <article
                        class="pmd-dashboard-lab-analytics__card pmd-role-specific-insights__card"
                        data-pmd-role-insight-card="{{ $insightKey }}"
                        data-pmd-connected="{{ $insightConnected ? 'true' : 'false' }}"
                        title="{{ (string)($insight['source'] ?? '') }}"
                    >
                        <header>
                            <h3>{{ (string)($insight['title'] ?? $insightKey) }}</h3>
                            @if($insightUrl !== '')
                                <div class="pmd-dashboard-lab-analytics__toolbar">
                                    <a href="{{ $insightUrl }}" aria-label="{{ (string)($insight['title'] ?? $insightKey) }}">
                                        <span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span>
                                    </a>
                                </div>
                            @endif
                        </header>
                        <div class="pmd-dashboard-lab-analytics__body pmd-role-specific-insights__body">
                            @if($insightLayout === 'list')
                                <ul class="pmd-dashboard-lab-list">
                                    @foreach($insightRows as $row)
                                        <li>
                                            <span>{{ (string)($row['label'] ?? '') }}</span>
                                            <strong>{{ (string)($row['value'] ?? '—') }}</strong>
                                        </li>
                                    @endforeach
                                </ul>
                            @else
                                <dl class="pmd-dashboard-lab-stats">
                                    @foreach($insightRows as $row)
                                        <div>
                                            <dt>{{ (string)($row['label'] ?? '') }}</dt>
                                            <dd>{{ (string)($row['value'] ?? '—') }}</dd>
                                        </div>
                                    @endforeach
                                </dl>
                            @endif
                        </div>
                    </article>
                @endforeach
            </div>
        </section>
    @endif

    @include('admin::_partials.pmd_dashboard_lab_analytics_v1', [
        'analyticsBootstrap' => $pmdRoleOwnerBootstrap,
        'pmdDashboardLabAnalyticsEndpoint' => $pmdRoleOwnerEndpoint,
    ])
</div>
