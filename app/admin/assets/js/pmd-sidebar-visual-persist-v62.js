(function () {
  'use strict';

  var LOGO_BASE = '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-';
  var keys = [
    'pmdAdminPlatformLogoCandidateV38',
    'pmdAdminPlatformLogoCandidateV37',
    'pmdAdminPlatformLogoCandidateV25'
  ];

  function isAdmin() {
    return /^\/admin(\/|$)/.test(location.pathname) && !/\/admin\/login/.test(location.pathname);
  }

  function getCandidate() {
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

    return window.__PMD_LOGO_CANDIDATE_V62 || 5;
  }

  function logoUrl(n) {
    return LOGO_BASE + n + '.png';
  }

  function setVar(n) {
    try {
      document.documentElement.style.setProperty('--pmd-active-sidebar-logo-v62', 'url("' + logoUrl(n) + '")');
      for (var i = 1; i <= 6; i++) document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v38');
      document.documentElement.classList.add('pmd-logo-candidate-' + n + '-v38');
    } catch (e) {}
  }

  function preload(n) {
    try {
      var img = new Image();
      img.decoding = 'async';
      img.src = logoUrl(n);
    } catch (e) {}
  }

  function stabilizeLogo() {
    var n = getCandidate();
    setVar(n);
    preload(n);

    document.querySelectorAll('img.pmd-platform-logo-img-v38').forEach(function (img) {
      img.setAttribute('decoding', 'async');
      img.setAttribute('fetchpriority', 'high');
      img.alt = 'PayMyDine';

      var current = (img.getAttribute('src') || '').split('?')[0];
      if (current !== logoUrl(n)) {
        img.src = logoUrl(n);
      }

      img.style.transition = 'none';
      img.style.animation = 'none';
      img.style.transform = 'none';
    });

    document.querySelectorAll('.pmd-platform-logo-slot-v38').forEach(function (slot) {
      slot.style.transition = 'none';
      slot.style.animation = 'none';
      slot.style.transform = 'none';
    });
  }

  function keepSidebarVisible() {
    if (!isAdmin()) return;
    document.querySelectorAll('.sidebar,#navSidebar,#side-nav-menu,.pmd-platform-logo-slot-v38,img.pmd-platform-logo-img-v38,.pmd-sidebar-icons-toggle').forEach(function (el) {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
  }

  function apply() {
    if (!isAdmin()) return;
    stabilizeLogo();
    keepSidebarVisible();
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  if (isAdmin()) {
    apply();

    ready(function () {
      apply();
      [50, 120, 250, 500, 900, 1500, 2600, 4200].forEach(function (ms) {
        setTimeout(apply, ms);
      });

      try {
        var mo = new MutationObserver(function (mutations) {
          var needs = false;
          for (var i = 0; i < mutations.length; i++) {
            var t = mutations[i].target;
            if (
              t === document.documentElement ||
              (t && t.closest && t.closest('.sidebar,#navSidebar,.pmd-platform-logo-slot-v38')) ||
              mutations[i].attributeName === 'src'
            ) {
              needs = true;
              break;
            }
          }
          if (needs) apply();
        });
        mo.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'src']
        });
      } catch (e) {}
    });

    window.addEventListener('pageshow', apply);
  }

  window.PMDSidebarVisualPersistV62 = {
    apply: apply,
    stabilizeLogo: stabilizeLogo,
    keepSidebarVisible: keepSidebarVisible,
    getCandidate: getCandidate
  };
})();
