(function () {
  'use strict';

  var CLOSED_LOGO = '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png';
  var KEY = 'pmdAdminPlatformLogoCandidateV38';
  var COUNT = 6;
  var urls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-4.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-5.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-6.png'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function collapsed() {
    return document.body && (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only');
  }

  function idx() {
    var n = parseInt(localStorage.getItem(KEY), 10);
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    return n;
  }

  function logoImg() {
    return document.querySelector('img.pmd-platform-logo-img-v38') ||
           document.querySelector('img.pmd-platform-logo-img-v65') ||
           document.querySelector('.pmd-platform-logo-slot-v38 img');
  }

  function setLogo(src, label) {
    var img = logoImg();
    if (!img) return false;

    var current = (img.getAttribute('src') || '').split('?')[0];
    if (current !== src) img.src = src;

    img.alt = label || 'PayMyDine';
    img.setAttribute('decoding', 'async');
    img.setAttribute('fetchpriority', 'high');
    img.style.transition = 'none';
    img.style.animation = 'none';
    img.style.transform = 'none';
    img.style.visibility = 'visible';
    img.style.opacity = '1';
    return true;
  }

  function syncSwitcherVisibility() {
    document.querySelectorAll('.pmd-logo-cycle-nav-item-v38, .pmd-logo-cycle-btn-v38').forEach(function (el) {
      if (collapsed()) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0';
      } else {
        el.style.display = el.classList.contains('pmd-logo-cycle-nav-item-v38') ? 'flex' : 'inline-flex';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      }
    });
  }

  function syncToggleIcon() {
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) return;

    btn.setAttribute('title', collapsed() ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', collapsed() ? 'false' : 'true');

    var icon = btn.querySelector('i');
    if (icon) {
      icon.className = 'fa ' + (collapsed() ? 'fa-angle-right' : 'fa-angle-left');
      icon.setAttribute('aria-hidden', 'true');
    }
  }

  function apply() {
    if (!document.body || !(document.body||document.documentElement).classList.contains('pmd-admin-theme-v1')) return;

    if (collapsed()) {
      setLogo(CLOSED_LOGO, 'PayMyDine compact logo');
    } else {
      /* Ask v65 to restore the selected testing logo if present, then make sure src is stable. */
      if (window.PMDLogoSwitcherV65 && typeof window.PMDLogoSwitcherV65.apply === 'function') {
        window.PMDLogoSwitcherV65.apply(false);
      } else {
        setLogo(urls[idx()], 'PayMyDine logo candidate ' + (idx() + 1));
      }
    }

    syncSwitcherVisibility();
    syncToggleIcon();
  }

  ready(function () {
    apply();

    [80, 220, 500, 900, 1600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.pmd-sidebar-icons-toggle')) {
        setTimeout(apply, 0);
        setTimeout(apply, 90);
        setTimeout(apply, 220);
      }
    }, true);

    try {
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'class') {
            apply();
            return;
          }
        }
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}

    window.PMDSidebarClosedLogoModeV66 = {
      apply: apply,
      closedLogo: CLOSED_LOGO,
      collapsed: collapsed
    };
  });
})();
