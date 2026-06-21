(function () {
  'use strict';

  function unfreeze() {
    try {
      document.documentElement.classList.remove(
        'pmd-shell-loading-v60',
        'pmd-shell-ready-v60',
        'pmd-sidebar-logo-locking-v60',
        'pmd-sidebar-logo-ready-v60'
      );

      if (document.body) {
        document.body.classList.remove('pmd-page-leaving-v60');
      }

      document.querySelectorAll('.page-wrapper,.page-content,.sidebar,#navSidebar,#side-nav-menu,.navbar-top').forEach(function (el) {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
      });

      document.querySelectorAll('.pmd-platform-logo-slot-v38,img.pmd-platform-logo-img-v38').forEach(function (el) {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });
    } catch (e) {}
  }

  unfreeze();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unfreeze, { once: true });
  } else {
    unfreeze();
  }

  [50, 150, 400, 900, 1600, 3000].forEach(function (ms) {
    setTimeout(unfreeze, ms);
  });

  window.PMDEmergencyUnfreezeV61 = { unfreeze: unfreeze };
})();
