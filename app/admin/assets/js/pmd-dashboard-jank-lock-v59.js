(function () {
  'use strict';

  function isDashboardPage() {
    return /\/admin\/dashboard\/?$/.test(location.pathname);
  }

  function enableLock() {
    if (!isDashboardPage()) return;
    document.documentElement.classList.add('pmd-dashboard-jank-lock-v59');
    document.documentElement.classList.remove('pmd-dashboard-jank-ready-v59');
  }

  function reveal(reason) {
    if (!isDashboardPage()) return;
    document.documentElement.classList.remove('pmd-dashboard-jank-lock-v59');
    document.documentElement.classList.add('pmd-dashboard-jank-ready-v59');
    document.documentElement.setAttribute('data-pmd-dashboard-jank-v59', reason || 'ready');
  }

  function rectKey(el) {
    if (!el) return '';
    var r = el.getBoundingClientRect();
    return [
      Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)
    ].join(':');
  }

  function kpiBar() {
    return document.querySelector('section.pmd-dashboard-modern.pmd-owner-match-v13 > .pmd-dashboard-kpi-bar') ||
      document.querySelector('section.pmd-dashboard-modern.pmd-manager-ops-v29 > .pmd-dashboard-kpi-bar') ||
      document.querySelector('.pmd-dashboard-modern > .pmd-dashboard-kpi-bar') ||
      document.querySelector('.pmd-dashboard-kpi-bar');
  }

  function dashboardReadyEnough() {
    var bar = kpiBar();
    if (!bar) return false;
    var section = bar.closest('.pmd-dashboard-modern');
    if (!section) return false;
    var cards = bar.querySelectorAll('.pmd-dashboard-kpi').length;
    var rendered = section.className.indexOf('rendered') !== -1 || cards >= 3;
    var visibleSize = bar.getBoundingClientRect().height >= 100 && bar.getBoundingClientRect().width >= 400;
    return rendered && visibleSize;
  }

  function waitStable() {
    if (!isDashboardPage()) return;

    var start = Date.now();
    var last = '';
    var stableCount = 0;

    var tick = function () {
      var bar = kpiBar();
      var current = rectKey(bar);

      if (dashboardReadyEnough() && current && current === last) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      last = current;

      if (stableCount >= 5) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { reveal('stable-kpi'); });
        });
        return;
      }

      if (Date.now() - start > 2600) {
        reveal('timeout');
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function lockKpiInline() {
    document.querySelectorAll('.pmd-dashboard-kpi-value, .pmd-dashboard-kpi-sub, .pmd-real-loaded, .pmd-real-updated').forEach(function (el) {
      el.style.transition = 'none';
      el.style.animation = 'none';
      el.style.transform = 'none';
    });
  }

  function stabilizeHeaderInline() {
    var item = document.getElementById('pmd-header-toolbar-actions-item');
    if (item) {
      item.style.width = '142px';
      item.style.minWidth = '142px';
      item.style.maxWidth = '142px';
      item.style.flexBasis = '142px';
    }

    var notifRoot = document.getElementById('notif-root');
    if (notifRoot) {
      notifRoot.style.width = '72px';
      notifRoot.style.minWidth = '72px';
      notifRoot.style.maxWidth = '72px';
      notifRoot.style.flexBasis = '72px';
    }

    var count = document.getElementById('notification-count');
    if (count) {
      count.style.width = '69px';
      count.style.minWidth = '69px';
      count.style.maxWidth = '69px';
      count.style.height = '46px';
    }
  }

  function apply() {
    lockKpiInline();
    stabilizeHeaderInline();
  }

  enableLock();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      apply();
      waitStable();
    }, { once: true });
  } else {
    apply();
    waitStable();
  }

  [80, 220, 500, 900, 1400, 2200, 3600, 6500].forEach(function (ms) {
    setTimeout(apply, ms);
  });

  /* Never leave dashboard hidden, even if future dashboard code breaks. */
  setTimeout(function () { reveal('max-safety'); }, 3200);

  window.PMDDashboardJankLockV59 = {
    apply: apply,
    reveal: reveal,
    waitStable: waitStable,
    dashboardReadyEnough: dashboardReadyEnough
  };
})();
