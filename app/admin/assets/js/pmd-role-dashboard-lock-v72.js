(function () {
  'use strict';

  var lock = window.PMD_LOCKED_DASHBOARD_ROLE_V78 || {};
  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();

  var target = lock.target || null;
  var role = lock.role || null;

  if (!target) {
    if (username === 'waiter' || roleCode === 'waiter' || roleName === 'waiter') { target = 'W3'; role = 'waiter3'; }
    else if (username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1) { target = 'K'; role = 'kitchen'; }
    else if (username === 'manager' || roleCode === 'manager' || roleName === 'manager') { target = 'M'; role = 'manager'; }
  }

  if (!target || !role) {
    window.PMDRoleDashboardLockV72 = { locked: false, context: ctx, safeV78: true };
    return;
  }

  function writeStorage() {
    try {
      localStorage.setItem('pmdDashboardPreviewRole', role);
      [
        'pmdDashboardVariant','pmd-dashboard-variant','pmd_dashboard_variant',
        'pmdAdminDashboardVariant','pmd-admin-dashboard-variant','pmdDashboardMode',
        'pmd-dashboard-mode','PMD_DASHBOARD_VARIANT','PMD_ADMIN_DASHBOARD_VARIANT',
        'pmdOwnerDashboardVariant','pmdManagerDashboardVariant','pmdWaiterDashboardVariant','pmdKdsDashboardVariant'
      ].forEach(function (key) { localStorage.setItem(key, target); });
      sessionStorage.setItem('pmdRoleDashboardTargetV72', target);
      sessionStorage.setItem('pmdRoleDashboardRoleV72', role);
    } catch (e) {}
  }

  function markContext() {
    document.documentElement.setAttribute('data-pmd-role-dashboard-target-v72', target);
    document.documentElement.setAttribute('data-pmd-role-dashboard-role-v72', role);
    document.documentElement.classList.add('pmd-role-dashboard-locked-v72', 'pmd-role-dashboard-locked-v78');
    if (document.body) {
      document.body.classList.add('pmd-role-dashboard-locked-v72', 'pmd-role-dashboard-locked-v78');
      document.body.setAttribute('data-pmd-role-dashboard-target-v72', target);
      document.body.setAttribute('data-pmd-role-dashboard-role-v72', role);
    }
  }

  function hideSwitcher() {
    document.querySelectorAll('.pmd-role-switcher').forEach(function (root) {
      root.classList.add('pmd-dashboard-role-switcher-hidden-v72', 'pmd-dashboard-switcher-hide-v73');
      root.setAttribute('data-pmd-role-dashboard-switcher-v72', target);
    });
    document.querySelectorAll('[data-pmd-role-btn]').forEach(function (btn) {
      var br = btn.getAttribute('data-pmd-role-btn');
      var isTarget = br === role || (role === 'kitchen' && br === 'kitchen') || (role === 'waiter3' && br === 'waiter3');
      if (!isTarget) btn.setAttribute('data-pmd-role-dashboard-extra-button-v72', '1');
      else btn.removeAttribute('data-pmd-role-dashboard-extra-button-v72');
    });
  }

  function currentRole() {
    var rt = document.querySelector('.pmd-dashboard-modern');
    return rt ? rt.getAttribute('data-pmd-role') : null;
  }

  function applyRole() {
    var rt = document.querySelector('.pmd-dashboard-modern');
    if (!rt) return false;
    if (currentRole() === role) return true;

    if (window.PMDDashboardRolePreview && typeof window.PMDDashboardRolePreview.setRole === 'function') {
      try {
        window.PMDDashboardRolePreview.setRole(role);
        return currentRole() === role;
      } catch (e) {}
    }
    return false;
  }

  function enforce() {
    writeStorage();
    markContext();
    applyRole();
    hideSwitcher();
  }

  window.PMDRoleDashboardLockV72 = {
    locked: true,
    safeV78: true,
    username: username,
    roleCode: roleCode,
    roleName: roleName,
    target: target,
    role: role,
    enforce: enforce,
    currentRole: currentRole
  };

  function schedule() {
    [0, 80, 180, 350, 700, 1200, 2000, 3500, 5500].forEach(function (ms) {
      setTimeout(enforce, ms);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})();
