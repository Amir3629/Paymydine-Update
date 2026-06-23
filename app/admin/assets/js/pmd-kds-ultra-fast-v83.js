(function () {
  'use strict';
  var ctx = window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  var username = String(ctx.username || '').toLowerCase();
  var roleCode = String(ctx.role_code || '').toLowerCase();
  var roleName = String(ctx.role_name || '').toLowerCase();
  var path = (window.location.pathname || '').replace(/\/+$/, '') || '/';
  var active = (path === '/admin' || path === '/admin/dashboard') && (
    username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1
  );
  window.PMDKdsUltraFastV83 = {
    active: active,
    startedAt: Date.now(),
    iframe: function () { return document.querySelector('.pmd-kds-server-iframe-v82'); },
    loaded: function () { return document.documentElement.classList.contains('pmd-kds-server-loaded-v82'); }
  };
  if (!active) return;
  document.documentElement.classList.add('pmd-kds-ultra-fast-v83');
  if (document.body) document.body.classList.add('pmd-kds-ultra-fast-v83');
  var f = document.querySelector('.pmd-kds-server-iframe-v82');
  if (f && !f.__pmdKdsV83Bound) {
    f.__pmdKdsV83Bound = true;
    f.addEventListener('load', function () {
      document.documentElement.classList.add('pmd-kds-ultra-loaded-v83');
      if (document.body) document.body.classList.add('pmd-kds-ultra-loaded-v83');
      console.log('⚡ PMD KDS ultra fast v83: iframe loaded in', Date.now() - window.PMDKdsUltraFastV83.startedAt, 'ms');
    });
  }
})();
