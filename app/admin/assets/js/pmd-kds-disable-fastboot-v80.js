(function () {
  'use strict';

  function pathClean() {
    return (window.location.pathname || '').replace(/\/+$/, '') || '/';
  }

  function context() {
    return window.PMD_ROLE_DASHBOARD_CONTEXT_V72 || window.PMD_ROLE_DASHBOARD_CONTEXT_V73 || {};
  }

  function isKdsContext() {
    var ctx = context();
    var username = String(ctx.username || '').toLowerCase();
    var roleCode = String(ctx.role_code || '').toLowerCase();
    var roleName = String(ctx.role_name || '').toLowerCase();
    return username === 'kds' || roleCode === 'kds' || roleName === 'kds' || roleName.indexOf('kitchen') !== -1;
  }

  function removeV79State() {
    var classes = [
      'pmd-kds-fast-boot-v79',
      'pmd-kds-fast-visible-v79',
      'pmd-kds-fast-loaded-v79'
    ];
    classes.forEach(function (c) {
      document.documentElement.classList.remove(c);
      if (document.body) (document.body||document.documentElement).classList.remove(c);
    });

    document.documentElement.classList.add('pmd-kds-disable-fastboot-v80');
    if (document.body) (document.body||document.documentElement).classList.add('pmd-kds-disable-fastboot-v80');

    document.querySelectorAll('.pmd-kds-fast-preloading-v79').forEach(function (el) {
      el.classList.remove('pmd-kds-fast-preloading-v79');
    });
  }

  window.PMDKdsDisableFastBootV80 = {
    active: true,
    reason: 'v79 disabled because early iframe boot could freeze on Loading Kitchen Display',
    isKds: isKdsContext,
    path: pathClean,
    clean: removeV79State
  };

  removeV79State();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeV79State, { once: true });
  } else {
    setTimeout(removeV79State, 0);
  }
  setTimeout(removeV79State, 250);
  setTimeout(removeV79State, 1000);

  console.log('✅ PMD KDS v80: v79 fast boot disabled; stable v76 inline KDS restored');
})();
