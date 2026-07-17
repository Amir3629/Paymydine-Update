(function () {
  'use strict';

  if (window.PMDWaiterV266) return;
  window.PMDWaiterV266 = true;

  var STORAGE_KEY = 'pmd_waiter_theme_v266';

  function operationButtons() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '.v257-operations-rail .v257-operation,' +
      '.pmd-v257-operations-rail .v257-operation'
    ));
  }

  function findModeButton() {
    return operationButtons().find(function (button) {
      var op = (
        button.getAttribute('data-v257-operation') ||
        button.getAttribute('data-operation') ||
        button.textContent ||
        ''
      ).trim().toLowerCase();

      return op === 'mode' || op === 'theme' || op.indexOf('mode') !== -1;
    }) || null;
  }

  function darkFromExistingPage() {
    var rootClasses = (
      document.documentElement.className + ' ' + document.body.className
    ).toLowerCase();

    if (
      rootClasses.indexOf('pmd-v221-dark') !== -1 ||
      rootClasses.indexOf('theme-dark') !== -1 ||
      rootClasses.indexOf('dark-mode') !== -1 ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.body.getAttribute('data-theme') === 'dark'
    ) {
      return true;
    }

    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;

    var grid = document.querySelector('[data-v2-tables], .pmd-v2-table-grid');
    if (grid) {
      var rgb = getComputedStyle(grid).backgroundColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        var luminance =
          (Number(rgb[0]) * 299 +
           Number(rgb[1]) * 587 +
           Number(rgb[2]) * 114) / 1000;
        return luminance < 90;
      }
    }

    return false;
  }

  function applyTheme(dark, persist) {
    document.documentElement.classList.toggle('pmd-v266-dark', dark);
    document.body.classList.toggle('pmd-v266-dark', dark);

    /*
     * Preserve compatibility with the older V2.2.1 theme CSS.
     * We do not rely on its removed header button anymore.
     */
    document.body.classList.toggle('pmd-v221-dark', dark);

    if (persist !== false) {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    }

    var mode = findModeButton();
    if (mode) {
      mode.setAttribute('aria-pressed', dark ? 'true' : 'false');
      mode.setAttribute(
        'title',
        dark ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }

    document.dispatchEvent(new CustomEvent('pmd:theme-changed', {
      detail: { dark: dark }
    }));
  }

  function bindModeButton() {
    var mode = findModeButton();
    if (!mode || mode.dataset.v266ModeBound === '1') return;

    mode.dataset.v266ModeBound = '1';
    mode.type = 'button';

    mode.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      var currentlyDark =
        document.documentElement.classList.contains('pmd-v266-dark') ||
        document.body.classList.contains('pmd-v266-dark');

      applyTheme(!currentlyDark, true);
    }, true);
  }

  function removeHoverResidue() {
    var rails = document.querySelectorAll(
      '[data-v2-filters], .pmd-v2-filter-rail, .pmd-v2-sidebar,' +
      '.v257-operations-rail, .pmd-v257-operations-rail'
    );

    rails.forEach(function (rail) {
      rail.querySelectorAll('button, [role="button"]').forEach(function (el) {
        el.style.transition = 'none';
        el.style.animation = 'none';
      });
    });
  }

  function mount() {
    bindModeButton();
    removeHoverResidue();
  }

  applyTheme(darkFromExistingPage(), false);
  mount();

  /*
   * Right rail can be generated after initial page load.
   * This observer only binds the MODE button and does not touch the grid.
   */
  new MutationObserver(function (records) {
    var relevant = records.some(function (record) {
      return Array.prototype.some.call(record.addedNodes || [], function (node) {
        return node.nodeType === 1 && (
          node.matches?.('.v257-operations-rail, .pmd-v257-operations-rail, .v257-operation') ||
          node.querySelector?.('.v257-operation')
        );
      });
    });

    if (relevant) mount();
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  console.info('[PMD] Waiter V2.6.6 theme mode, dark rails and no-hover active');
})();
