(function () {
  'use strict';

  function removeShield(reason) {
    try {
      document.documentElement.classList.remove('pmd-ui-fouc-shield-v58');
      document.documentElement.classList.add('pmd-ui-fouc-stabilizing-v58');
      document.documentElement.setAttribute('data-pmd-fouc-v58', reason || 'ready');
      setTimeout(function () {
        document.documentElement.classList.remove('pmd-ui-fouc-stabilizing-v58');
      }, 500);
    } catch (e) {}
  }

  function readyEnough() {
    var bodyReady = document.body && (document.body||document.documentElement).classList.contains('pmd-admin-theme-v1');
    var sidebar = document.querySelector('.sidebar #navSidebar, .sidebar');
    var topbar = document.querySelector('.navbar-top, .navbar-fixed-top');
    var page = document.querySelector('.page-wrapper, .page-content');
    var pmdLogo = document.querySelector('.pmd-platform-logo-slot-v38, img.pmd-platform-logo-img-v38');
    return !!(bodyReady && sidebar && topbar && page && pmdLogo);
  }

  function waitForReady() {
    var start = Date.now();
    var timer = setInterval(function () {
      if (readyEnough()) {
        clearInterval(timer);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            removeShield('ready');
          });
        });
      } else if (Date.now() - start > 1650) {
        clearInterval(timer);
        removeShield('timeout');
      }
    }, 40);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForReady, { once: true });
  } else {
    waitForReady();
  }

  // Final safety: never let the shield get stuck.
  setTimeout(function () { removeShield('max-timeout'); }, 2300);

  window.PMDLoginFoucV58 = {
    removeShield: removeShield,
    readyEnough: readyEnough
  };
})();
