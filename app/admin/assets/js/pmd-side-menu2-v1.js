(function () {
  'use strict';

  if (String(location.pathname).replace(/\/+$/, '') !== '/admin/reservations2')
    return;

  if (window.PMDSideMenu2V1)
    return;

  var STORAGE_KEY = 'pmd.sideMenu2.state';
  var DROPDOWN_KEY = 'pmd.sideMenu2.openDropdown';
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

  function closeAllDropdowns(except) {
    document.querySelectorAll('[data-pmd-sm2-dropdown]').forEach(function (dropdown) {
      if (dropdown === except) return;
      dropdown.classList.remove('is-open');
      var button = dropdown.querySelector('[data-pmd-sm2-dropdown-toggle]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }

  function setDropdown(dropdown, open, persist) {
    if (!dropdown) return;

    if (open && currentState() !== 'expanded')
      apply('expanded', true);

    closeAllDropdowns(open ? dropdown : null);
    dropdown.classList.toggle('is-open', !!open);

    var button = dropdown.querySelector('[data-pmd-sm2-dropdown-toggle]');
    if (button)
      button.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (persist) {
      try {
        localStorage.setItem(
          DROPDOWN_KEY,
          open ? String(dropdown.getAttribute('data-pmd-sm2-dropdown') || '') : ''
        );
      } catch (error) {}
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentState() === 'expanded' ? 'collapsed' : 'expanded';
      apply(next, true);
      if (next === 'collapsed') {
        closeAllDropdowns();
        try { localStorage.setItem(DROPDOWN_KEY, ''); } catch (error) {}
      }
    });
  }

  document.querySelectorAll('[data-pmd-sm2-dropdown-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var dropdown = button.closest('[data-pmd-sm2-dropdown]');
      setDropdown(dropdown, !dropdown.classList.contains('is-open'), true);
    });
  });

  var savedDropdown = '';
  try { savedDropdown = localStorage.getItem(DROPDOWN_KEY) || ''; } catch (error) {}
  if (savedDropdown && currentState() === 'expanded') {
    setDropdown(
      document.querySelector('[data-pmd-sm2-dropdown="' + CSS.escape(savedDropdown) + '"]'),
      true,
      false
    );
  }

  window.PMDSideMenu2V1 = {
    version: '2.0.0',
    persistent: true,
    smooth: true,
    storageKey: STORAGE_KEY,
    dropdownStorageKey: DROPDOWN_KEY,
    state: currentState(),
    setState: function (state) { apply(state, true); }
  };

  apply(currentState(), false);

  console.info('[PMD Side Menu 2 V2] Ready', window.PMDSideMenu2V1);
})();