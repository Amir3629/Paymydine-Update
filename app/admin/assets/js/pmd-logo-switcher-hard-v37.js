(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV37';
  var OLD_KEY = 'pmdAdminPlatformLogoCandidateV25';
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function idx() {
    var n = parseInt(localStorage.getItem(LOGO_KEY), 10);
    if (isNaN(n)) {
      var old = parseInt(localStorage.getItem(OLD_KEY), 10);
      if (!isNaN(old) && old >= 0 && old < COUNT) n = old;
    }
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    return n;
  }

  function setIdx(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 0 || n >= COUNT) n = 0;
    localStorage.setItem(LOGO_KEY, String(n));
    localStorage.setItem(OLD_KEY, String(n)); // keep old scripts harmless if cached
  }

  function sidebarMenu() {
    return document.querySelector('#side-nav-menu')
      || document.querySelector('.side-nav-menu')
      || document.querySelector('.sidebar-menu')
      || document.querySelector('.nav-sidebar');
  }

  function ensureSlot() {
    var menu = sidebarMenu();
    var slot = document.querySelector('.pmd-platform-logo-slot-v37') || document.querySelector('.pmd-platform-logo-slot-v26');

    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'pmd-platform-logo-slot-v37';

      if (menu && menu.parentNode) {
        menu.parentNode.insertBefore(slot, menu);
      } else {
        var sidebar = document.querySelector('#sidebar') || document.querySelector('.sidebar') || document.querySelector('aside');
        if (sidebar) sidebar.insertBefore(slot, sidebar.firstChild);
        else document.body.insertBefore(slot, document.body.firstChild);
      }
    }

    slot.classList.add('pmd-platform-logo-slot-v37');

    // Replace only inside logo slot, not whole sidebar.
    slot.innerHTML = '<a class="pmd-platform-logo-link-v37" href="/admin/dashboard"><img class="pmd-platform-logo-img-v37" alt="PayMyDine"></a>';

    return slot.querySelector('img.pmd-platform-logo-img-v37');
  }

  function removeOldLogoDom() {
    document.querySelectorAll('img').forEach(function (img) {
      if (img.classList.contains('pmd-platform-logo-img-v37')) return;

      var src = (img.getAttribute('src') || '').toLowerCase();
      var cls = (img.className || '').toString().toLowerCase();

      if (
        src.indexOf('/pmd-logo-candidates/') !== -1 ||
        src.indexOf('gemini_generated_image') !== -1 ||
        src.indexOf('kzcmghkzcmghkzcm') !== -1 ||
        cls.indexOf('pmd-platform-logo-img-v25') !== -1 ||
        cls.indexOf('pmd-platform-logo-img-v26') !== -1 ||
        cls.indexOf('pmd-dashboard-logo-img') !== -1
      ) {
        img.remove();
      }
    });

    document.querySelectorAll('.pmd-logo-cycle-nav-item-v25, .pmd-logo-cycle-nav-item-v26, .pmd-logo-cycle-nav-item-v36').forEach(function (el) {
      el.remove();
    });
  }

  function applyClass() {
    for (var i = 1; i <= 6; i++) {
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v36');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v37');
      document.documentElement.classList.remove('pmd-logo-candidate-' + i + '-v27');
    }
    document.documentElement.classList.add('pmd-logo-candidate-' + (idx() + 1) + '-v37');
  }

  function applyLogo() {
    applyClass();
    removeOldLogoDom();

    var img = ensureSlot();
    if (img) {
      img.setAttribute('data-logo-index', String(idx()));
      img.src = urls[idx()] + '?v=' + Date.now();
      img.alt = 'PayMyDine logo candidate ' + (idx() + 1) + ' of ' + COUNT;
    }

    ensureButton();
  }

  function ensureButton() {
    var menu = sidebarMenu();
    if (!menu) return;

    var item = menu.querySelector('.pmd-logo-cycle-nav-item-v37');
    if (!item) {
      item = document.createElement('li');
      item.className = 'pmd-logo-cycle-nav-item-v37';
      item.innerHTML = '<button type="button" class="pmd-logo-cycle-btn-v37" aria-label="Cycle PayMyDine logo"><span>LOGO</span><small></small></button>';
      menu.insertBefore(item, menu.firstChild);
    }

    var small = item.querySelector('small');
    if (small) small.textContent = (idx() + 1) + '/' + COUNT;

    var btn = item.querySelector('.pmd-logo-cycle-btn-v37');
    if (btn && !btn.getAttribute('data-pmd-v37-bound')) {
      btn.setAttribute('data-pmd-v37-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        setIdx((idx() + 1) % COUNT);
        applyLogo();

        return false;
      }, true);
    }
  }

  function init() {
    applyLogo();

    // Finite retries only, so any cached old logo JS loses after load.
    [80, 220, 500, 900, 1600, 2600, 4200].forEach(function (ms) {
      setTimeout(applyLogo, ms);
    });

    window.PMDLogoSwitcherV37 = {
      count: COUNT,
      index: idx,
      set: function (n) { setIdx(n); applyLogo(); },
      next: function () { setIdx((idx() + 1) % COUNT); applyLogo(); },
      apply: applyLogo,
      urls: urls.slice()
    };
  }

  ready(init);
})();
