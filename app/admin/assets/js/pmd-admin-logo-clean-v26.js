(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV25';
  var logoUrls = [
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-1.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-2.png',
    '/app/admin/assets/images/pmd-logo-candidates/pmd-logo-3.png'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function index() {
    var n = parseInt(localStorage.getItem(LOGO_KEY), 10);
    if (isNaN(n) || n < 0 || n > 2) n = 0;
    return n;
  }

  function url() {
    return logoUrls[index()] + '?v=' + Date.now();
  }

  function findSidebarBrand() {
    return document.querySelector('.pmd-sidebar-brand')
      || document.querySelector('.sidebar-brand')
      || document.querySelector('.brand-logo')
      || document.querySelector('#sidebar .brand')
      || document.querySelector('#sidebar');
  }

  function removeOldRestaurantLogos(scope) {
    if (!scope) return;

    // Remove specific generated / restaurant image DOM nodes.
    scope.querySelectorAll('img, source').forEach(function (el) {
      var src = (el.getAttribute('src') || el.getAttribute('srcset') || '').toLowerCase();
      var cls = (el.className || '').toString().toLowerCase();

      if (el.classList && el.classList.contains('pmd-platform-logo-img-v26')) return;

      if (
        src.indexOf('gemini_generated_image') !== -1 ||
        src.indexOf('kzcmghkzcmghkzcm') !== -1 ||
        src.indexOf('mimoza') !== -1 ||
        cls.indexOf('logo-svg') !== -1 ||
        cls.indexOf('pmd-dashboard-logo-img') !== -1
      ) {
        el.remove();
      }
    });

    // Hide/remove old inline logo wrappers inside the brand.
    scope.querySelectorAll('.logo-svg, .pmd-dashboard-logo-img').forEach(function (el) {
      if (!el.classList.contains('pmd-platform-logo-img-v26')) el.remove();
    });
  }

  function installOnlyPmdLogo() {
    document.documentElement.classList.add('pmd-admin-logo-v26-ready');

    var brand = findSidebarBrand();
    if (!brand) return;

    // Remove all visible old brand children; then keep a single PMD logo slot.
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

    img.src = url();
    img.setAttribute('data-logo-index', String(index()));

    removeOldRestaurantLogos(brand);

    // Also remove known old restaurant logo if it got rendered elsewhere in the sidebar top area.
    var sidebar = document.querySelector('#sidebar, .sidebar, .pmd-sidebar, .main-sidebar, aside');
    if (sidebar) removeOldRestaurantLogos(sidebar);

    updateButtonLabel();
  }

  function updateButtonLabel() {
    var small = document.querySelector('.pmd-logo-cycle-btn-v25 small');
    if (small) small.textContent = String(index() + 1) + '/3';
  }

  function patchLogoButton() {
    var btn = document.querySelector('.pmd-logo-cycle-btn-v25');
    if (!btn) return;

    if (!btn.getAttribute('data-pmd-v26-bound')) {
      btn.setAttribute('data-pmd-v26-bound', '1');
      btn.addEventListener('click', function () {
        setTimeout(installOnlyPmdLogo, 0);
        setTimeout(installOnlyPmdLogo, 120);
      }, true);
    }

    updateButtonLabel();
  }

  ready(function () {
    installOnlyPmdLogo();
    patchLogoButton();

    setTimeout(function () {
      installOnlyPmdLogo();
      patchLogoButton();
    }, 250);

    setTimeout(function () {
      installOnlyPmdLogo();
      patchLogoButton();
    }, 1000);
  });
})();
