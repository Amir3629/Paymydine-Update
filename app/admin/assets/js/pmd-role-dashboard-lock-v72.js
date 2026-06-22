(function () {
  'use strict';

  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();

  var labels = ['O', 'O2', 'M', 'W1', 'W2', 'W3', 'K'];
  var target = null;

  if (username === 'waiter' || roleCode === 'waiter' || roleName === 'waiter') {
    target = 'W3';
  } else if (username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1) {
    target = 'K';
  } else if (username === 'manager' || roleCode === 'manager' || roleName === 'manager') {
    target = 'M';
  }

  if (!target) {
    window.PMDRoleDashboardLockV72 = { locked: false, context: ctx };
    return;
  }

  document.body && document.body.classList.add('pmd-role-dashboard-locked-v72');

  var possibleKeys = [
    'pmdDashboardVariant',
    'pmd-dashboard-variant',
    'pmd_dashboard_variant',
    'pmdAdminDashboardVariant',
    'pmd-admin-dashboard-variant',
    'pmdDashboardMode',
    'pmd-dashboard-mode',
    'PMD_DASHBOARD_VARIANT',
    'PMD_ADMIN_DASHBOARD_VARIANT',
    'pmdOwnerDashboardVariant',
    'pmdManagerDashboardVariant',
    'pmdWaiterDashboardVariant',
    'pmdKdsDashboardVariant'
  ];

  function writeStorage() {
    try {
      possibleKeys.forEach(function (key) { localStorage.setItem(key, target); });
      sessionStorage.setItem('pmdRoleDashboardTargetV72', target);
    } catch (e) {}
  }

  function cleanText(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function labelOf(el) {
    if (!el) return null;

    var data = cleanText(
      el.getAttribute('data-dashboard') ||
      el.getAttribute('data-dashboard-mode') ||
      el.getAttribute('data-pmd-dashboard') ||
      el.getAttribute('data-pmd-dashboard-mode') ||
      el.getAttribute('data-value') ||
      ''
    ).toUpperCase();

    if (labels.indexOf(data) !== -1) return data;

    var text = cleanText(el.innerText || el.textContent || '').toUpperCase();
    if (labels.indexOf(text) !== -1) return text;

    var parts = text.split(' ').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      if (labels.indexOf(parts[i]) !== -1) return parts[i];
    }

    return null;
  }

  function clickableElements() {
    return Array.prototype.slice.call(document.querySelectorAll(
      'button, a, [role="button"], .btn, [data-dashboard], [data-dashboard-mode], [data-pmd-dashboard], [data-pmd-dashboard-mode]'
    ));
  }

  function dashboardButtons() {
    return clickableElements().filter(function (el) {
      return labels.indexOf(labelOf(el)) !== -1;
    });
  }

  function findTargetButton() {
    var btns = dashboardButtons();
    for (var i = 0; i < btns.length; i++) {
      if (labelOf(btns[i]) === target) return btns[i];
    }
    return null;
  }

  function findSwitcherRoot(btns) {
    if (!btns || !btns.length) return null;

    var first = btns[0];
    var node = first.parentElement;

    while (node && node !== document.body && node !== document.documentElement) {
      var found = Array.prototype.slice.call(node.querySelectorAll(
        'button, a, [role="button"], .btn, [data-dashboard], [data-dashboard-mode], [data-pmd-dashboard], [data-pmd-dashboard-mode]'
      )).filter(function (el) {
        return labels.indexOf(labelOf(el)) !== -1;
      });

      var txt = cleanText(node.innerText || node.textContent || '');

      if (found.length >= 4 && txt.length < 260) return node;
      node = node.parentElement;
    }

    return first.parentElement || null;
  }

  function forceClickTarget() {
    var btn = findTargetButton();
    if (!btn) return false;

    try {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch (e) {
      try { btn.click(); } catch (e2) {}
    }

    return true;
  }

  function hideSwitcher() {
    var btns = dashboardButtons();
    if (!btns.length) return false;

    btns.forEach(function (btn) {
      var lab = labelOf(btn);
      if (lab && lab !== target) btn.setAttribute('data-pmd-role-dashboard-extra-button-v72', '1');
    });

    var root = findSwitcherRoot(btns);
    if (root) {
      root.classList.add('pmd-dashboard-role-switcher-hidden-v72');
      root.setAttribute('data-pmd-role-dashboard-switcher-v72', target);
      return true;
    }
    return false;
  }

  function markContext() {
    document.documentElement.setAttribute('data-pmd-role-dashboard-target-v72', target);
    document.body && document.body.setAttribute('data-pmd-role-dashboard-target-v72', target);
  }

  function enforce() {
    writeStorage();
    markContext();
    forceClickTarget();
    setTimeout(hideSwitcher, 140);
  }

  window.PMDRoleDashboardLockV72 = {
    locked: true,
    username: username,
    roleCode: roleCode,
    roleName: roleName,
    target: target,
    enforce: enforce,
    buttons: dashboardButtons,
    clickTarget: forceClickTarget
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforce, { once: true });
  } else {
    enforce();
  }

  [50, 150, 350, 700, 1200, 2000, 3500].forEach(function (ms) {
    setTimeout(enforce, ms);
  });

  try {
    var mo = new MutationObserver(function () {
      clearTimeout(window.__pmdRoleDashboardLockTimerV72);
      window.__pmdRoleDashboardLockTimerV72 = setTimeout(enforce, 90);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
