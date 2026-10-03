@include('admin::_partials.pmd_kitchen_today_team_v1')

{{-- PMD_MANAGER_DASHBOARD_V3_5_2
     Exact Owner analytics first; one Manager-only online-staff card after ALL analytics cards.
     The six V3.5 role insight cards are intentionally not rendered. --}}

@include('admin::_partials.pmd_role_dashboard_v1')

@php
    $pmdManagerStaff = is_array($pmdManagerOnlineStaff ?? null)
        ? $pmdManagerOnlineStaff
        : [
            'title' => 'Staff online',
            'subtitle' => 'Active admin sessions at this location',
            'count' => 0,
            'count_label' => 'online',
            'empty' => 'No staff are currently online.',
            'as_of' => '',
            'connected' => false,
            'rows' => [],
            'source' => 'PmdAdminPresenceService session registry for current location',
        ];
    $pmdManagerStaffRows = is_array($pmdManagerStaff['rows'] ?? null)
        ? $pmdManagerStaff['rows']
        : [];
    $pmdManagerStaffConnected = ($pmdManagerStaff['connected'] ?? false) === true;
@endphp

<section
    class="pmd-dashboard-lab-analytics pmd-manager-online-staff"
    data-pmd-manager-online-staff="1"
    data-pmd-connected="{{ $pmdManagerStaffConnected ? 'true' : 'false' }}"
    aria-label="{{ (string)($pmdManagerStaff['title'] ?? 'Staff online') }}"
>
    <div class="pmd-dashboard-lab-analytics__grid pmd-manager-online-staff__grid">
        <article
            class="pmd-dashboard-lab-analytics__card pmd-manager-online-staff__card"
            title="{{ (string)($pmdManagerStaff['source'] ?? '') }}"
        >
            <header class="pmd-manager-online-staff__header">
                <div>
                    <h3>{{ (string)($pmdManagerStaff['title'] ?? 'Staff online') }}</h3>
                    <p>{{ (string)($pmdManagerStaff['subtitle'] ?? '') }}</p>
                </div>
                <div class="pmd-manager-online-staff__controls">
                    <div class="pmd-manager-online-staff__summary" aria-label="{{ (int)($pmdManagerStaff['count'] ?? 0) }} {{ (string)($pmdManagerStaff['count_label'] ?? 'online') }}">
                        <strong>{{ (int)($pmdManagerStaff['count'] ?? 0) }}</strong>
                        <span>{{ (string)($pmdManagerStaff['count_label'] ?? 'online') }}</span>
                    </div>
                    <div class="pmd-dashboard-lab-analytics__toolbar pmd-manager-online-staff__toolbar" role="group" aria-label="Staff attendance details">
                        <a href="{{ admin_url('pmdreports/attendance') }}" aria-label="Open staff attendance and presence report" title="Staff attendance and presence">
                            <svg class="pmd-dashboard-lab-toolbar-detail-icon-v15" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" style="display:block!important;width:16px!important;min-width:16px!important;max-width:16px!important;height:16px!important;min-height:16px!important;max-height:16px!important;flex:0 0 16px!important;margin:0!important;padding:0!important;"><path d="M9 4H4v5"></path><path d="M15 4h5v5"></path><path d="M20 15v5h-5"></path><path d="M9 20H4v-5"></path></svg>
                        </a>
                    </div>
                </div>
            </header>

            <div class="pmd-dashboard-lab-analytics__body pmd-manager-online-staff__body">
                @if(!$pmdManagerStaffConnected)
                    <div class="pmd-manager-online-staff__empty">
                        {{ (string)($pmdManagerStaff['empty'] ?? 'No staff are currently online.') }}
                    </div>
                @elseif($pmdManagerStaffRows)
                    <div class="pmd-manager-online-staff__people">
                        @foreach($pmdManagerStaffRows as $staffRow)
                            <div class="pmd-manager-online-staff__person" data-pmd-staff-id="{{ (int)($staffRow['staff_id'] ?? 0) }}">
                                <div class="pmd-manager-online-staff__identity">
                                    <span class="pmd-manager-online-staff__dot" aria-hidden="true"></span>
                                    <div>
                                        <strong>{{ (string)($staffRow['name'] ?? 'Staff') }}</strong>
                                        <span>{{ (string)($staffRow['role'] ?? 'Staff') }}</span>
                                    </div>
                                </div>
                                <div class="pmd-manager-online-staff__time">
                                    <span>{{ (string)($staffRow['since'] ?? '-') }}</span>
                                    <strong>{{ (string)($staffRow['duration'] ?? '-') }}</strong>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <div class="pmd-manager-online-staff__empty">
                        {{ (string)($pmdManagerStaff['empty'] ?? 'No staff are currently online.') }}
                    </div>
                @endif

                @if((string)($pmdManagerStaff['as_of'] ?? '') !== '')
                    <div class="pmd-manager-online-staff__asof">
                        {{ (string)$pmdManagerStaff['as_of'] }}
                    </div>
                @endif
            </div>
        </article>
    </div>
</section>
