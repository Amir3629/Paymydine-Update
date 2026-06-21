(function () {
  'use strict';

  var LOGO_BASE = '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-';

  function adminPage() {
    return /^\/admin(\/|$)/.test(location.pathname) && !/\/admin\/login/.test(location.pathname);
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

  function logoUrl(candidate) {
    return LOGO_BASE + candidate + '.png';
  }

  function setHtmlCandidate(candidate) {
    var html = document.documentElement;
    for (var i = 1; i <= 6; i++) html.classList.remove('pmd-logo-candidate-' + i + '-v38');
    html.classList.add('pmd-logo-candidate-' + candidate + '-v38');
  }

  function findNavSidebar() {
    return document.getElementById('navSidebar') ||
      document.querySelector('.sidebar .nav-sidebar') ||
      document.querySelector('.sidebar');
  }

  function findMenu() {
    return document.getElementById('side-nav-menu') ||
      document.querySelector('.sidebar #side-nav-menu') ||
      document.querySelector('.sidebar .nav');
  }

  function ensureLogoSlot() {
    var nav = findNavSidebar();
    if (!nav) return null;

    var slot = nav.querySelector('.pmd-platform-logo-slot-v38');

    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'pmd-platform-logo-slot-v38 pmd-platform-logo-slot-v60';
      slot.innerHTML = '<a class="pmd-platform-logo-link-v38" href="/admin/dashboard" aria-label="PayMyDine dashboard"><img class="pmd-platform-logo-img-v38" alt="PayMyDine"></a>';
      var menu = findMenu();
      if (menu && menu.parentElement === nav) nav.insertBefore(slot, menu);
      else nav.insertBefore(slot, nav.firstChild);
    }

    var all = nav.querySelectorAll('.pmd-platform-logo-slot-v38');
    if (all.length > 1) {
      for (var i = 1; i < all.length; i++) {
        if (all[i] && all[i].parentNode) all[i].parentNode.removeChild(all[i]);
      }
    }

    return slot;
  }

  function forceCorrectLogo() {
    var candidate = getCandidate();
    setHtmlCandidate(candidate);

    var slot = ensureLogoSlot();
    if (!slot) return false;

    var img = slot.querySelector('img.pmd-platform-logo-img-v38') || slot.querySelector('img');
    if (!img) {
      var a = slot.querySelector('a') || slot;
      img = document.createElement('img');
      img.className = 'pmd-platform-logo-img-v38';
      img.alt = 'PayMyDine';
      a.appendChild(img);
    }

    img.classList.add('pmd-platform-logo-img-v38');
    img.setAttribute('decoding', 'async');
    img.setAttribute('fetchpriority', 'high');
    img.alt = 'PayMyDine';

    var wanted = logoUrl(candidate);
    var current = (img.getAttribute('src') || '').split('?')[0];
    if (current !== wanted) img.src = wanted;

    return img;
  }

  function decodeLogoThenReveal() {
    var img = forceCorrectLogo();
    var done = function () {
      document.documentElement.classList.remove('pmd-sidebar-logo-locking-v60');
      document.documentElement.classList.add('pmd-sidebar-logo-ready-v60');
    };

    if (!img) return done();

    if (img.complete && img.naturalWidth > 0) return done();

    if (img.decode) img.decode().then(done).catch(done);
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }

    setTimeout(done, 900);
  }

  function freezeDashboardMotion() {
    document.querySelectorAll(
      '.pmd-dashboard-modern, .pmd-dashboard-modern *, .pmd-dashboard-kpi-bar, .pmd-dashboard-kpi, .pmd-dashboard-card, .pmd-dashboard-kpi-value, .pmd-dashboard-kpi-sub, .pmd-real-loaded, .pmd-real-updated'
    ).forEach(function (el) {
      el.style.transition = 'none';
      el.style.animation = 'none';
      el.style.transform = 'none';
    });

    document.querySelectorAll('.pmd-dashboard-kpi-value, [class*="kpi-value"], [class*="metric-value"]').forEach(function (el) {
      el.style.minWidth = '150px';
      el.style.fontVariantNumeric = 'tabular-nums';
      el.style.whiteSpace = 'nowrap';
    });

    document.querySelectorAll('.pmd-dashboard-kpi-sub, [class*="kpi-sub"], [class*="metric-sub"]').forEach(function (el) {
      el.style.minWidth = '198px';
      el.style.whiteSpace = 'nowrap';
    });
  }

  function stabilizeHeader() {
    var item = document.getElementById('pmd-header-toolbar-actions-item');
    if (item) {
      item.style.width = '142px';
      item.style.minWidth = '142px';
      item.style.maxWidth = '142px';
      item.style.flex = '0 0 142px';
    }

    var notif = document.getElementById('notif-root');
    if (notif) {
      notif.style.width = '72px';
      notif.style.minWidth = '72px';
      notif.style.maxWidth = '72px';
      notif.style.flex = '0 0 72px';
    }
  }

  function shellReady() {
    document.documentElement.classList.remove('pmd-shell-loading-v60');
    document.documentElement.classList.add('pmd-shell-ready-v60');
    if (document.body) document.body.classList.remove('pmd-page-leaving-v60');
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function watchNavigationClicks() {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a || !document.body) return;

      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || a.target || a.hasAttribute('download')) return;
      if (/logout|delete|remove|destroy|javascript:/i.test(href)) return;

      var url;
      try { url = new URL(href, location.origin); } catch (e) { return; }
      if (url.origin !== location.origin) return;
      if (!/^\/admin(\/|$)/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;

      document.body.classList.add('pmd-page-leaving-v60');
      try { sessionStorage.setItem('pmdPageTransitionV60', '1'); } catch (e) {}
    }, true);
  }

  function applyAll() {
    forceCorrectLogo();
    freezeDashboardMotion();
    stabilizeHeader();
  }

  if (adminPage()) {
    ready(function () {
      decodeLogoThenReveal();
      applyAll();
      watchNavigationClicks();

      [60, 160, 320, 700, 1200, 2200, 3600, 6500].forEach(function (ms) {
        setTimeout(applyAll, ms);
      });

      setTimeout(shellReady, 620);
      setTimeout(shellReady, 1600);

      try {
        var mo = new MutationObserver(function () { applyAll(); });
        mo.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'src']
        });
      } catch (e) {}
    });

    window.addEventListener('pageshow', function () {
      if (document.body) document.body.classList.remove('pmd-page-leaving-v60');
      shellReady();
      applyAll();
    });
  }

  window.PMDStableShellV60 = {
    applyAll: applyAll,
    forceCorrectLogo: forceCorrectLogo,
    freezeDashboardMotion: freezeDashboardMotion,
    stabilizeHeader: stabilizeHeader,
    shellReady: shellReady
  };
})();
