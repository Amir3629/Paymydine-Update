(function () {
  'use strict';

  function clean(v) { return String(v || '').toLowerCase().trim(); }

  function detect() {
    var c = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
    var u = clean(c.username);
    var code = clean(c.role_code);
    var name = clean(c.role_name);
    var role = null;
    var target = null;
    var noSidebar = false;

    if (u === 'waiter' || code === 'waiter' || name === 'waiter') {
      role = 'waiter3'; target = 'W3'; noSidebar = true;
    } else if (u === 'kds' || code === 'kds' || name === 'kds' || name.indexOf('kitchen') !== -1) {
      role = 'kitchen'; target = 'K'; noSidebar = true;
    } else if (u === 'manager' || code === 'manager' || name === 'manager') {
      role = 'manager'; target = 'M'; noSidebar = false;
    }

    return { context: c, username: u, role: role, target: target, noSidebar: noSidebar };
  }

  function writeStorage(lock) {
    if (!lock || !lock.role) return;
    try {
      localStorage.setItem('pmdDashboardPreviewRole', lock.role);
      localStorage.setItem('pmdDashboardVariant', lock.target);
      localStorage.setItem('pmd-dashboard-variant', lock.target);
      localStorage.setItem('pmd_dashboard_variant', lock.target);
      localStorage.setItem('pmdAdminDashboardVariant', lock.target);
      localStorage.setItem('pmd-admin-dashboard-variant', lock.target);
      localStorage.setItem('pmdDashboardMode', lock.target);
      localStorage.setItem('pmd-dashboard-mode', lock.target);
      localStorage.setItem('PMD_DASHBOARD_VARIANT', lock.target);
      localStorage.setItem('PMD_ADMIN_DASHBOARD_VARIANT', lock.target);
      localStorage.setItem('pmdOwnerDashboardVariant', lock.target);
      localStorage.setItem('pmdManagerDashboardVariant', lock.target);
      localStorage.setItem('pmdWaiterDashboardVariant', lock.target);
      localStorage.setItem('pmdKdsDashboardVariant', lock.target);
      sessionStorage.setItem('pmdRoleDashboardTargetV78', lock.target);
      sessionStorage.setItem('pmdRoleDashboardRoleV78', lock.role);
    } catch (e) {}
  }

  function addClasses(lock) {
    if (!lock || !lock.target) return;
    var h = document.documentElement;
    h.classList.add('pmd-role-dashboard-locked-v78', 'pmd-role-dashboard-locked-v73', 'pmd-role-dashboard-locked-v72');
    h.setAttribute('data-pmd-role-dashboard-target-v78', lock.target);
    h.setAttribute('data-pmd-role-dashboard-role-v78', lock.role || '');
    if (lock.noSidebar) h.classList.add('pmd-no-sidebar-role-v78', 'pmd-no-sidebar-role-v73');

    if (document.body) {
      (document.body||document.documentElement).classList.add('pmd-role-dashboard-locked-v78', 'pmd-role-dashboard-locked-v73', 'pmd-role-dashboard-locked-v72');
      document.body.setAttribute('data-pmd-role-dashboard-target-v78', lock.target);
      document.body.setAttribute('data-pmd-role-dashboard-role-v78', lock.role || '');
      if (lock.noSidebar) (document.body||document.documentElement).classList.add('pmd-no-sidebar-role-v78', 'pmd-no-sidebar-role-v73');
    }
  }

  var lock = detect();
  window.PMD_LOCKED_DASHBOARD_ROLE_V78 = lock;
  if (!lock.target) return;

  writeStorage(lock);
  addClasses(lock);

  // Stop old real-data listeners from rebuilding whole role dashboards four times.
  // The real API still writes KPI/card values before dispatching these events.
  if (!document.__pmdRoleStabilityDispatchV78) {
    document.__pmdRoleStabilityDispatchV78 = true;
    var originalDispatch = document.dispatchEvent.bind(document);
    document.dispatchEvent = function (event) {
      try {
        if (event && /^pmd:dashboard-real-data/.test(String(event.type || ''))) {
          if (event.detail) window.PMDRealDashboardData = event.detail;
          window.__PMD_SUPPRESSED_REAL_DATA_EVENT_V78 = event.type;
          return true;
        }
      } catch (e) {}
      return originalDispatch(event);
    };
  }

  window.PMDRoleStabilityPrebootV78 = {
    lock: lock,
    writeStorage: function () { writeStorage(window.PMD_LOCKED_DASHBOARD_ROLE_V78); },
    addClasses: function () { addClasses(window.PMD_LOCKED_DASHBOARD_ROLE_V78); }
  };
})();
