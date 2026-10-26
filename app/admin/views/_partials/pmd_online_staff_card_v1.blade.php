{{-- PMD_ONLINE_STAFF_SHARED_CARD_V1
     One exact card on Owner and Manager. Presence unavailable is not "zero
     online": render an em dash and an explicit unavailable message. --}}
@php
    $pmdStaff = is_array($pmdOnlineStaffCard ?? null)
        ? $pmdOnlineStaffCard
        : [
            'title' => 'Staff online',
            'subtitle' => 'Signed-in admin sessions at this location',
            'count' => 0,
            'count_label' => 'online',
            'empty' => 'Staff presence is unavailable for this location.',
            'as_of' => '',
            'connected' => false,
            'rows' => [],
            'source' => 'Online staff snapshot missing',
        ];
    $pmdStaffConnected = ($pmdStaff['connected'] ?? false) === true;
    $pmdStaffRows = $pmdStaffConnected && is_array($pmdStaff['rows'] ?? null)
        ? $pmdStaff['rows']
        : [];
@endphp
<section
    class="pmd-dashboard-lab-analytics pmd-manager-online-staff"
    data-pmd-online-staff="1"
    data-pmd-manager-online-staff="1"
    data-pmd-connected="{{ $pmdStaffConnected ? 'true' : 'false' }}"
    aria-label="{{ (string)($pmdStaff['title'] ?? 'Staff online') }}"
>
    <div class="pmd-dashboard-lab-analytics__grid pmd-manager-online-staff__grid">
        <article
            class="pmd-dashboard-lab-analytics__card pmd-manager-online-staff__card"
            title="{{ (string)($pmdStaff['source'] ?? '') }}"
        >
            <header class="pmd-manager-online-staff__header">
                <div>
                    <h3>{{ (string)($pmdStaff['title'] ?? 'Staff online') }}</h3>
                    <p>{{ (string)($pmdStaff['subtitle'] ?? '') }}</p>
                </div>
                <div class="pmd-manager-online-staff__controls">
                    <div class="pmd-manager-online-staff__summary" aria-label="{{ $pmdStaffConnected ? (int)($pmdStaff['count'] ?? 0) : 'Unknown' }} {{ (string)($pmdStaff['count_label'] ?? 'online') }}">
                        <strong data-pmd-online-staff-count>{{ $pmdStaffConnected ? (int)($pmdStaff['count'] ?? 0) : '—' }}</strong>
                        <span data-pmd-online-staff-count-label>{{ (string)($pmdStaff['count_label'] ?? 'online') }}</span>
                    </div>
                    <div class="pmd-dashboard-lab-analytics__toolbar pmd-manager-online-staff__toolbar" role="group" aria-label="Staff attendance details">
                        <a href="{{ admin_url('pmdreports/attendance') }}" aria-label="Open staff attendance and presence report" title="Staff attendance and presence">
                            <svg class="pmd-dashboard-lab-toolbar-detail-icon-v15" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" style="display:block!important;width:16px!important;min-width:16px!important;max-width:16px!important;height:16px!important;min-height:16px!important;max-height:16px!important;flex:0 0 16px!important;margin:0!important;padding:0!important;"><path d="M9 4H4v5"></path><path d="M15 4h5v5"></path><path d="M20 15v5h-5"></path><path d="M9 20H4v-5"></path></svg>
                        </a>
                    </div>
                </div>
            </header>

            <div class="pmd-dashboard-lab-analytics__body pmd-manager-online-staff__body">
                <div data-pmd-online-staff-content>
                    @if(!$pmdStaffConnected)
                        <div class="pmd-manager-online-staff__empty pmd-r37-source-empty" role="status"><span class="pmd-r37-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M7 14l3-3 3 2 4-5"></path></svg></span><span class="pmd-r37-empty-message">
                            {{ (string)($pmdStaff['empty'] ?? 'Staff presence is unavailable for this location.') }}</span>
                        </div>
                    @elseif($pmdStaffRows)
                        <div class="pmd-manager-online-staff__people">
                            @foreach($pmdStaffRows as $staffRow)
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
                        <div class="pmd-manager-online-staff__empty pmd-r37-source-empty" role="status"><span class="pmd-r37-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M7 14l3-3 3 2 4-5"></path></svg></span><span class="pmd-r37-empty-message">
                            {{ (string)($pmdStaff['empty'] ?? 'No staff are currently signed in.') }}</span>
                        </div>
                    @endif
                </div>

                <div class="pmd-manager-online-staff__asof" data-pmd-online-staff-asof>
                    {{ (string)($pmdStaff['as_of'] ?? '') }}
                </div>
            </div>
        </article>
    </div>
</section>
