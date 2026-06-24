(function () {
  'use strict';

  if (!/^\/admin(\/dashboard|\/?$)/.test(location.pathname)) return;
  if (window.__PMD_FLOOR_PLAN_V141_LOADER__) return;
  window.__PMD_FLOOR_PLAN_V141_LOADER__ = true;

  function boot() {
    if (!document.querySelector('script[src*="pmd-floor-plan-stable.js"]')) {
      var s = document.createElement('script');
      s.src = '/app/admin/assets/js/pmd-floor-plan-stable.js?v=' + Date.now();
      s.defer = true;
      document.head.appendChild(s);
    }
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
