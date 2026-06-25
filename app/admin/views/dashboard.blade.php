<!-- PMD_KDS_SERVER_DASHBOARD_V82_START -->
@php
    $__pmdDashboardIsKdsRoleV82 = false;
    try {
        $__pmdDashUserV82 = null;
        if (class_exists('\\Admin\\Facades\\AdminAuth')) {
            $__pmdDashUserV82 = \Admin\Facades\AdminAuth::getUser();
        } elseif (class_exists('AdminAuth')) {
            $__pmdDashUserV82 = \AdminAuth::getUser();
        }

        $__pmdDashUsernameV82 = strtolower((string)($__pmdDashUserV82->username ?? ''));
        $__pmdDashRoleCodeV82 = '';
        $__pmdDashRoleNameV82 = '';

        if ($__pmdDashUserV82 && !empty($__pmdDashUserV82->staff_id)) {
            $__pmdDashStaffRoleV82 = \Illuminate\Support\Facades\DB::table('staffs as s')
                ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                ->where('s.staff_id', $__pmdDashUserV82->staff_id)
                ->select('r.code as role_code', 'r.name as role_name')
                ->first();
            if ($__pmdDashStaffRoleV82) {
                $__pmdDashRoleCodeV82 = strtolower((string)($__pmdDashStaffRoleV82->role_code ?? ''));
                $__pmdDashRoleNameV82 = strtolower((string)($__pmdDashStaffRoleV82->role_name ?? ''));
            }
        }

        $__pmdDashboardIsKdsRoleV82 = $__pmdDashUsernameV82 === 'kds'
            || $__pmdDashRoleCodeV82 === 'kds'
            || $__pmdDashRoleNameV82 === 'kds'
            || strpos($__pmdDashRoleNameV82, 'kitchen') !== false;
    } catch (\Throwable $e) {
        $__pmdDashboardIsKdsRoleV82 = false;
    }
@endphp

@if($__pmdDashboardIsKdsRoleV82)
<script>
(function(){
  document.documentElement.classList.add('pmd-kds-server-fast-v82','pmd-no-sidebar-role-v73','pmd-kds-only-role-v73');
})();
</script>
<div class="pmd-kds-server-shell-v82" data-pmd-kds-server-dashboard-v82="1">
    <section class="pmd-kds-server-host-v82" role="region" aria-label="Kitchen Display Dashboard">
        <div class="pmd-kds-server-loading-v82">
            <div>Loading Kitchen Display…</div>
            <small>Direct KDS server render, dashboard widgets skipped</small>
        </div>
        <iframe
            class="pmd-kds-server-iframe-v82"
            title="Kitchen Display - Main Kitchen"
            src="{{ admin_url('kitchendisplay/main-kitchen') }}?embedded=dashboard-v82"
            loading="eager"
            fetchpriority="high"
            allowfullscreen>
        </iframe>
    </section>
</div>
@else
@php
    $__pmdDashboardRoleText = strtolower(trim(($__pmdDashRoleCodeV82 ?? '').' '.($__pmdDashRoleNameV82 ?? '').' '.($__pmdDashUsernameV82 ?? '')));
    $__pmdUseWaiterDashboard = preg_match('/waiter|server|service|manager|owner|admin|super/', $__pmdDashboardRoleText);
@endphp
@if($__pmdUseWaiterDashboard)
    <div id="pmd-waiter-dashboard-root" data-version="20260624-rebuild"></div>
@else
<div class="row-fluid">
    {!! $this->widgets['dashboardContainer']->render() !!}
</div>
@endif
@endif
<!-- PMD_KDS_SERVER_DASHBOARD_V82_END -->
