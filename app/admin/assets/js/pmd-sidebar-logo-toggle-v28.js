(function () {
  'use strict';

  var LOGO_KEY = 'pmdAdminPlatformLogoCandidateV25';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function selectedIndex() {
    var n = parseInt(localStorage.getItem(LOGO_KEY), 10);
    if (isNaN(n) || n < 0 || n > 2) n = 0;
    return n;
  }

  function applyLogoCandidateClass() {
    var html = document.documentElement;
    html.classList.remove('pmd-logo-candidate-1-v27', 'pmd-logo-candidate-2-v27', 'pmd-logo-candidate-3-v27');
    html.classList.add('pmd-logo-candidate-' + (selectedIndex() + 1) + '-v27');

    document.querySelectorAll('img.pmd-platform-logo-img-v26').forEach(function (img) {
      img.setAttribute('data-logo-index', String(selectedIndex()));
    });
  }

  function findMenu() {
    return document.querySelector('#side-nav-menu')
      || document.querySelector('.side-nav-menu')
      || document.querySelector('.sidebar-menu')
      || document.querySelector('.nav-sidebar');
  }

  function moveSidebarToggleToMenuEnd() {
    var menu = findMenu();
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!menu || !btn) return;

    var existing = menu.querySelector('.pmd-sidebar-toggle-end-v28');
    if (!existing) {
      existing = document.createElement('li');
      existing.className = 'pmd-sidebar-toggle-end-v28';
      menu.appendChild(existing);
    }

    if (btn.parentNode !== existing) {
      existing.appendChild(btn);
    }

    btn.classList.add('pmd-sidebar-icons-toggle-at-end-v28');
    btn.setAttribute('title', btn.getAttribute('aria-expanded') === 'false' ? 'Open sidebar' : 'Close sidebar');
  }

  function bindLogoButton() {
    var btn = document.querySelector('.pmd-logo-cycle-btn-v25');
    if (!btn || btn.getAttribute('data-pmd-v28-bound')) return;

    btn.setAttribute('data-pmd-v28-bound', '1');
    btn.addEventListener('click', function () {
      setTimeout(applyLogoCandidateClass, 20);
      setTimeout(applyLogoCandidateClass, 160);
      setTimeout(moveSidebarToggleToMenuEnd, 180);
    }, true);
  }

  function init() {
    applyLogoCandidateClass();
    moveSidebarToggleToMenuEnd();
    bindLogoButton();

    setTimeout(function () {
      applyLogoCandidateClass();
      moveSidebarToggleToMenuEnd();
      bindLogoButton();
    }, 250);

    setTimeout(function () {
      applyLogoCandidateClass();
      moveSidebarToggleToMenuEnd();
      bindLogoButton();
    }, 1000);

    setTimeout(function () {
      applyLogoCandidateClass();
      moveSidebarToggleToMenuEnd();
    }, 1800);
  }

  ready(init);
})();
