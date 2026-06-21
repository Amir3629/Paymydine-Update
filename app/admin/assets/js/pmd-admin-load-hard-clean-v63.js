(function () {
  'use strict';

  var LOGO_BASE = '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-';

  function isAdmin() {
    return /^\/admin(\/|$)/.test(location.pathname) && !/\/admin\/login/.test(location.pathname);
  }

  function removeBadClasses() {
    document.documentElement.classList.remove(
      'pmd-ui-fouc-shield-v58',
      'pmd-dashboard-jank-lock-v59',
      'pmd-shell-loading-v60',
      'pmd-shell-ready-v60',
      'pmd-sidebar-logo-locking-v60',
      'pmd-sidebar-logo-ready-v60',
      'pmd-sidebar-logo-locking-v62',
      'pmd-sidebar-logo-ready-v62'
    );

    if (document.body) {
      document.body.classList.remove('pmd-page-leaving-v60');
    }
  }

  function getCandidate() {
    var keys = [
      'pmdAdminPlatformLogoCandidateV38',
      'pmdAdminPlatformLogoCandidateV37',
      'pmdAdminPlatformLogoCandidateV25'
    ];

    for (var i = 0; i < keys.length; i++) {
      try {
        var n = parseInt(localStorage.getItem(keys[i]), 10);
        if (n >= 1 && n <= 6) return n;
      } catch (e) {}
    }

    var m = String(document.documentElement.className || '').match(/pmd-logo-candidate-(\d)-v38/);
    if (m) {
      var c = parseInt(m[1], 10);
      if (c >= 1 && c <= 6) return c;
    }

    return 5;
  }

  function logoUrl(n) {
    return LOGO_BASE + n + '.png';
  }

  function stabilizeLogo() {
    var n = getCandidate();

    for (var i = 1; i <= 6; i++) {
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v38');
    }
    document.documentElement.classList.add('pmd-logo-candidate-' + n + '-v38');

    try {
      var preload = new Image();
      preload.decoding = 'async';
      preload.src = logoUrl(n);
    } catch (e) {}

    document.querySelectorAll('img.pmd-platform-logo-img-v38').forEach(function (img) {
      var clean = (img.getAttribute('src') || '').split('?')[0];
      if (clean !== logoUrl(n)) img.src = logoUrl(n);
      img.alt = 'PayMyDine';
      img.setAttribute('decoding', 'async');
      img.setAttribute('fetchpriority', 'high');
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      img.style.transition = 'none';
      img.style.animation = 'none';
      img.style.transform = 'none';
    });

    document.querySelectorAll('.pmd-platform-logo-slot-v38').forEach(function (slot) {
      slot.style.visibility = 'visible';
      slot.style.opacity = '1';
      slot.style.transition = 'none';
      slot.style.animation = 'none';
      slot.style.transform = 'none';
    });
  }

  function forceVisible() {
    document.querySelectorAll('.sidebar,#navSidebar,#side-nav-menu,.navbar-top,.page-wrapper,.page-content,.pmd-dashboard-modern,.pmd-platform-logo-slot-v38,img.pmd-platform-logo-img-v38').forEach(function (el) {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    });
  }

  function freezeDashboardMotion() {
    document.querySelectorAll('.pmd-dashboard-modern,.pmd-dashboard-modern *,.pmd-dashboard-kpi-bar,.pmd-dashboard-kpi,.pmd-dashboard-kpi-value,.pmd-dashboard-kpi-sub,.pmd-real-loaded,.pmd-real-updated').forEach(function (el) {
      el.style.transition = 'none';
      el.style.animation = 'none';
      el.style.transform = 'none';
    });
  }

  function apply() {
    if (!isAdmin()) return;
    removeBadClasses();
    stabilizeLogo();
    freezeDashboardMotion();
    forceVisible();
  }

  apply();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  [30, 80, 160, 350, 700, 1200, 2200, 3600, 6500].forEach(function (ms) {
    setTimeout(apply, ms);
  });

  try {
    var mo = new MutationObserver(function () {
      apply();
    });
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'src']
    });
  } catch (e) {}

  window.addEventListener('pageshow', apply);

  window.PMDAdminLoadHardCleanV63 = { apply: apply };
})();
