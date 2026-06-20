(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV25';
  var COUNT = 6;
  var logoUrls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-4.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-5.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-6.png'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function index() {
    var n = parseInt(localStorage.getItem(LOGO_KEY), 10);
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    return n;
  }

  function setIndex(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    localStorage.setItem(LOGO_KEY, String(n));
  }

  function cacheBustUrl() {
    return logoUrls[index()] + '?v=' + Date.now();
  }

  function cleanCandidateClasses() {
    var html = document.documentElement;

    // Remove old 3-logo class systems and our 6-logo class system.
    for (var i = 1; i <= 6; i++) {
      html.classList.remove('pmd-logo-candidate-' + i + '-v36');
      html.classList.remove('pmd-logo-candidate-' + i + '-v27');
    }

    html.classList.add('pmd-logo-candidate-' + (index() + 1) + '-v36');
    html.classList.add('pmd-admin-logo-v26-ready');
  }

  function findBrand() {
    return document.querySelector('.pmd-sidebar-brand')
      || document.querySelector('.sidebar-brand')
      || document.querySelector('.brand-logo')
      || document.querySelector('#sidebar .brand')
      || document.querySelector('#sidebar');
  }

  function ensureLogoSlot() {
    var brand = findBrand();
    if (!brand) return null;

    Array.prototype.slice.call(brand.children).forEach(function (child) {
      if (!child.classList || !child.classList.contains('pmd-platform-logo-slot-v26')) {
        child.remove();
      }
    });

    var slot = brand.querySelector('.pmd-platform-logo-slot-v26');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'pmd-platform-logo-slot-v26';
      brand.insertBefore(slot, brand.firstChild);
    }

    var link = slot.querySelector('.pmd-platform-logo-link-v26');
    if (!link) {
      link = document.createElement('a');
      link.className = 'pmd-platform-logo-link-v26';
      link.href = '/admin/dashboard';
      slot.appendChild(link);
    }

    var img = link.querySelector('img.pmd-platform-logo-img-v26');
    if (!img) {
      img = document.createElement('img');
      img.className = 'pmd-platform-logo-img-v26';
      img.alt = 'PayMyDine';
      link.appendChild(img);
    }

    return img;
  }

  function removeOldLogos() {
    var brand = findBrand();
    if (!brand) return;

    brand.querySelectorAll('img, svg, .logo-svg, .pmd-dashboard-logo-img').forEach(function (el) {
      if (el.classList && el.classList.contains('pmd-platform-logo-img-v26')) return;
      if (el.closest && el.closest('.pmd-platform-logo-slot-v26')) return;
      el.remove();
    });
  }

  function applyLogo() {
    cleanCandidateClasses();

    var img = ensureLogoSlot();
    if (img) {
      img.src = cacheBustUrl();
      img.setAttribute('data-logo-index', String(index()));
      img.alt = 'PayMyDine logo candidate ' + (index() + 1);
    }

    removeOldLogos();
    updateButton();
  }

  function updateButton() {
    var small = document.querySelector('.pmd-logo-cycle-btn-v25 small');
    if (small) small.textContent = String(index() + 1) + '/' + COUNT;
  }

  function installButtonOverride() {
    var btn = document.querySelector('.pmd-logo-cycle-btn-v25');
    if (!btn || btn.getAttribute('data-pmd-logo-v36-bound')) return;

    btn.setAttribute('data-pmd-logo-v36-bound', '1');

    // Capture phase: stop the old 3-logo v25/v26 click handler from running.
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      setIndex((index() + 1) % COUNT);
      applyLogo();

      if (window.pushNotif && typeof window.pushNotif.showFlash === 'function') {
        window.pushNotif.showFlash('PayMyDine logo candidate ' + (index() + 1) + ' / ' + COUNT + ' selected.', 'success');
      }

      return false;
    }, true);
  }

  function init() {
    applyLogo();
    installButtonOverride();

    // Finite retries only, because older logo scripts may apply after page load.
    [100, 300, 700, 1200, 2200].forEach(function (delay) {
      setTimeout(function () {
        applyLogo();
        installButtonOverride();
      }, delay);
    });

    window.PMDLogoSwitcherV36 = {
      count: COUNT,
      index: index,
      set: function (n) { setIndex(n); applyLogo(); },
      next: function () { setIndex((index() + 1) % COUNT); applyLogo(); },
      apply: applyLogo
    };
  }

  ready(init);
})();
