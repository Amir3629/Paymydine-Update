
<li class="nav-item dropdown" id="notif-root" style="position:relative!important;overflow:visible!important;margin-left:clamp(44px,4vw,64px)!important;margin-inline-start:clamp(44px,4vw,64px)!important;padding-left:0!important;padding-inline-start:0!important;" data-pmd-main-header-notification-spacing-v2="" data-pmd-main-header-notification-spacing-r66="">
<span
                data-pmd-main-header-notification-divider-r66=""
                aria-hidden="true"
                style="
                    position:absolute!important;
                    left:-16px!important;
                    top:50%!important;
                    transform:translateY(-50%)!important;
                    width:1px!important;
                    min-width:1px!important;
                    max-width:1px!important;
                    height:34px!important;
                    min-height:34px!important;
                    max-height:34px!important;
                    margin:0!important;
                    padding:0!important;
                    border:0!important;
                    background:#cfe0ec!important;
                    opacity:1!important;
                    pointer-events:none!important;
                    z-index:1!important;
                "
            ></span>
<a href="#" id="notifDropdown"
     class="nav-link dropdown-toggle"
     data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" role="button">
    <i class="fa fa-bell"></i>
    <span id="notification-count" class="badge badge-danger ml-1 d-none">0</span>
  </a>

  <div class="dropdown-menu dropdown-menu-right p-0 shadow"
       id="notification-panel"
       aria-labelledby="notifDropdown"
       style="min-width:420px; max-height:70vh; overflow:auto; z-index:1051;">
    <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
      <strong>Notifications</strong>
      <a id="notif-history-link" class="btn btn-light btn-sm" href="{{ url('/admin/history') }}">
        {{ __('History') }}
      </a>
    </div>

    <div id="notification-loading" class="px-3 py-4 text-muted d-none">Loading…</div>
    <div id="notification-error"   class="px-3 py-4 text-danger d-none">Failed to load.</div>
    <div id="notification-empty"   class="px-3 py-4 text-muted d-none">No notifications.</div>

    <div id="notification-list" class="list-group list-group-flush"></div>
  </div>
</li>

<!--
  PMD_DASHBOARD2_REPORT_LINK_LOADER_V1_1
  Load globally because the JS itself is route-guarded to /admin/dashboard2.
  This avoids relying on request()->is() timing/context inside shared partials.
-->
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-dashboard2-detail-links-v1.css?v=20260810-dashboard-report-links-v1-2"
>
<script
  src="/app/admin/assets/js/pmd-dashboard2-detail-links-v1.js?v=20260810-dashboard-report-links-v1-2"
  defer
></script>
