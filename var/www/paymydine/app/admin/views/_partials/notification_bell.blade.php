<li class="nav-item dropdown" id="notif-root" style="position:relative">
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