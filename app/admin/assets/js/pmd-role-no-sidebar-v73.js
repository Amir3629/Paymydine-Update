(function () {
  'use strict';

  var lock = window.PMD_LOCKED_DASHBOARD_ROLE_V78 || {};
  var c = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  var u = String(c.username || '').toLowerCase();
  var r = String(c.role_code || c.role_name || '').toLowerCase();

  var target = lock.target || null;
  var noSide = !!lock.noSidebar;

  if (!target) {
    if (u === 'waiter' || r === 'waiter') { target = 'W3'; noSide = true; }
    else if (u === 'kds' || r === 'kds' || r.indexOf('kitchen') !== -1) { target = 'K'; noSide = true; }
    else if (u === 'manager' || r === 'manager') { target = 'M'; }
  }

  function roleNameFromTarget() {
    if (target === 'W3') return 'waiter3';
    if (target === 'K') return 'kitchen';
    if (target === 'M') return 'manager';
    return null;
  }

  function cls() {
    if (!target) return;
    document.documentElement.classList.add('pmd-role-dashboard-locked-v73', 'pmd-role-dashboard-locked-v78');
    document.documentElement.setAttribute('data-pmd-role-dashboard-target-v73', target);
    if (noSide) document.documentElement.classList.add('pmd-no-sidebar-role-v73', 'pmd-no-sidebar-role-v78');

    if (document.body) {
      (document.body||document.documentElement).classList.add('pmd-role-dashboard-locked-v73', 'pmd-role-dashboard-locked-v78');
      document.body.setAttribute('data-pmd-role-dashboard-target-v73', target);
      if (noSide) (document.body||document.documentElement).classList.add('pmd-no-sidebar-role-v73', 'pmd-no-sidebar-role-v78');
    }
  }

  function store() {
    if (!target) return;
    var role = roleNameFromTarget();
    try {
      if (role) localStorage.setItem('pmdDashboardPreviewRole', role);
      [
        'pmdDashboardVariant','pmd-dashboard-variant','pmd_dashboard_variant',
        'pmdAdminDashboardVariant','pmd-admin-dashboard-variant','pmdDashboardMode',
        'pmd-dashboard-mode','PMD_DASHBOARD_VARIANT','PMD_ADMIN_DASHBOARD_VARIANT',
        'pmdOwnerDashboardVariant','pmdManagerDashboardVariant','pmdWaiterDashboardVariant','pmdKdsDashboardVariant'
      ].forEach(function (k) { localStorage.setItem(k, target); });
      sessionStorage.setItem('pmdRoleDashboardTargetV73', target);
    } catch (e) {}
  }

  function hideSide() {
    if (!noSide) return;
    ['.sidebar','#navSidebar','.navbar-side','.sidebar-left','.pmd-sidebar-icons-toggle'].forEach(function (s) {
      document.querySelectorAll(s).forEach(function (e) {
        e.style.setProperty('display', 'none', 'important');
        e.style.setProperty('visibility', 'hidden', 'important');
        e.style.setProperty('opacity', '0', 'important');
        e.style.setProperty('pointer-events', 'none', 'important');
      });
    });
    ['.page-wrapper','#page-wrapper','.content-wrapper','.main-content','.layout-content','.page-content'].forEach(function (s) {
      document.querySelectorAll(s).forEach(function (e) {
        e.style.setProperty('margin-left', '0', 'important');
        e.style.setProperty('left', '0', 'important');
        e.style.setProperty('width', '100%', 'important');
        e.style.setProperty('max-width', 'none', 'important');
      });
    });
  }

  function hideSwitch() {
    if (!target) return;
    document.querySelectorAll('.pmd-role-switcher').forEach(function (root) {
      root.classList.add('pmd-dashboard-switcher-hide-v73', 'pmd-dashboard-role-switcher-hidden-v72');
      root.setAttribute('data-pmd-role-dashboard-switcher-v78', target);
    });
  }

  function run() {
    if (!target) return;
    cls();
    store();
    hideSide();
    hideSwitch();
  }

  window.PMDRoleNoSidebarLockV73 = {
    context: c,
    target: target,
    noSidebar: noSide,
    safeV78: true,
    run: run
  };

  cls();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  [50, 150, 350, 700, 1200, 2200].forEach(function (ms) { setTimeout(run, ms); });
})();
