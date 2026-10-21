@include('admin::_partials.pmd_kitchen_today_team_v1')

{{-- PMD_MANAGER_DASHBOARD_SHARED_ONLINE_STAFF_V1
     Exact Owner analytics, then one shared Staff Online card. --}}
@include('admin::_partials.pmd_role_dashboard_v1')

@include('admin::_partials.pmd_online_staff_card_v1', [
    'pmdOnlineStaffCard' => $pmdManagerOnlineStaff ?? [],
])
