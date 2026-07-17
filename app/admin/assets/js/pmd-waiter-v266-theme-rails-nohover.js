(function () {
  'use strict';

  if (window.PMDWaiterV267) return;
  window.PMDWaiterV267 = true;

  var STORAGE_KEY = 'pmd-waiter-pos-theme';

  function getModeButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(
      '.v257-operations-rail .v257-operation,' +
      '.pmd-v257-operations-rail .v257-operation'
    ));

    return buttons.find(function (button) {
      var value = (
        button.getAttribute('data-v257-operation') ||
        button.getAttribute('data-operation') ||
        button.textContent ||
        ''
      ).replace(/\s+/g, ' ').trim().toLowerCase();

      return value === 'mode' || value.indexOf('mode') !== -1;
    }) || null;
  }

  function currentTheme() {
    var actual = document.documentElement.getAttribute('data-pmd-pos-theme');

    if (actual === 'dark' || actual === 'light') {
      return actual;
    }

    try {
      var saved = localStorage.getItem(STORAGE_KEY);

      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (error) {}

    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  }

  function updateModeButton(theme) {
    var button = getModeButton();
    if (!button) return;

    button.setAttribute(
      'aria-label',
      theme === 'dark'
        ? 'Switch to light mode'
        : 'Switch to dark mode'
    );

    button.setAttribute(
      'title',
      theme === 'dark'
        ? 'Switch to light mode'
        : 'Switch to dark mode'
    );

    button.setAttribute(
      'aria-pressed',
      theme === 'dark' ? 'true' : 'false'
    );

    button.dataset.v267CurrentTheme = theme;
  }

  function applyRealTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';

    /*
     * Use the original V2.2.1 theme engine. This changes the entire POS,
     * including floor, cards, area navigation, ordering page and payments.
     */
    if (
      window.PMDWaiterStandardV221 &&
      typeof window.PMDWaiterStandardV221.setTheme === 'function'
    ) {
      window.PMDWaiterStandardV221.setTheme(theme);
    } else {
      document.documentElement.setAttribute(
        'data-pmd-pos-theme',
        theme
      );

      document.body.classList.add(
        'pmd-waiter-standard-v221-page'
      );

      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (error) {}
    }

    /*
     * Remove the incorrect independent V2.6.6 theme classes.
     */
    document.documentElement.classList.remove('pmd-v266-dark');
    document.body.classList.remove(
      'pmd-v266-dark',
      'pmd-v221-dark'
    );

    updateModeButton(theme);

    document.dispatchEvent(
      new CustomEvent('pmd:theme-changed', {
        detail: {
          theme: theme,
          dark: theme === 'dark'
        }
      })
    );
  }

  function bindModeButton() {
    var button = getModeButton();

    if (!button || button.dataset.v267ModeBound === '1') {
      return;
    }

    button.dataset.v267ModeBound = '1';
    button.type = 'button';

    /*
     * Capture phase prevents old operation handlers from intercepting MODE.
     */
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      var next = currentTheme() === 'dark'
        ? 'light'
        : 'dark';

      applyRealTheme(next);
    }, true);

    updateModeButton(currentTheme());
  }

  function disableRailInteractions() {
    var selector =
      '[data-v2-filters] button,' +
      '.pmd-v2-filter-rail button,' +
      '.pmd-v2-sidebar button,' +
      '.v257-operations-rail button,' +
      '.pmd-v257-operations-rail button,' +
      '.pmd-v265-logout';

    document.querySelectorAll(selector).forEach(function (element) {
      element.style.transition = 'none';
      element.style.animation = 'none';
    });
  }

  function mount() {
    bindModeButton();
    disableRailInteractions();
  }

  /*
   * Keep the original saved theme on first load.
   */
  applyRealTheme(currentTheme());
  mount();

  /*
   * The right rail is created dynamically. Observe only rail creation;
   * table cards and the grid are never rebuilt or moved here.
   */
  new MutationObserver(function (records) {
    var shouldMount = records.some(function (record) {
      return Array.prototype.some.call(
        record.addedNodes || [],
        function (node) {
          if (!node || node.nodeType !== 1) return false;

          return (
            node.matches &&
            node.matches(
              '.v257-operations-rail,' +
              '.pmd-v257-operations-rail,' +
              '.v257-operation'
            )
          ) || (
            node.querySelector &&
            node.querySelector('.v257-operation')
          );
        }
      );
    });

    if (shouldMount) {
      mount();
      updateModeButton(currentTheme());
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  console.info(
    '[PMD] Waiter V2.6.7 real full-page theme mode active'
  );
})();
