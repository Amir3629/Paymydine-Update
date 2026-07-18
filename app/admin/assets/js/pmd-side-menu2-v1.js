(function () {
  'use strict';

  if (String(location.pathname).replace(/\/+$/, '') !== '/admin/reservations2')
    return;

  if (window.PMDSideMenu2V1)
    return;

  var STORAGE_KEY = 'pmd.sideMenu2.state';
  var root = document.documentElement;
  var toggle = document.querySelector('[data-pmd-sm2-toggle]');

  function currentState() {
    return root.classList.contains('pmd-sm2-expanded') ? 'expanded' : 'collapsed';
  }

  function apply(state, persist) {
    var normalized = state === 'expanded' ? 'expanded' : 'collapsed';

    root.classList.toggle('pmd-sm2-expanded', normalized === 'expanded');
    root.classList.toggle('pmd-sm2-collapsed', normalized === 'collapsed');

    if (toggle) {
      toggle.setAttribute('aria-expanded', normalized === 'expanded' ? 'true' : 'false');
      toggle.setAttribute('title', normalized === 'expanded' ? 'Collapse menu' : 'Expand menu');
    }

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, normalized); } catch (error) {}
    }

    window.PMDSideMenu2V1.state = normalized;
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      apply(currentState() === 'expanded' ? 'collapsed' : 'expanded', true);
    });
  }

  window.PMDSideMenu2V1 = {
    version: '1.0.0',
    persistent: true,
    storageKey: STORAGE_KEY,
    state: currentState(),
    setState: function (state) { apply(state, true); }
  };

  apply(currentState(), false);

  console.info('[PMD Side Menu 2 V1] Ready', window.PMDSideMenu2V1);
})();
