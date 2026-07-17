(function () {
  'use strict';

  if (window.PMDWaiterLauncherV233) return;
  window.PMDWaiterLauncherV233 = true;

  function mount() {
    var root = document.querySelector('[data-pmd-waiter-v2-root]');
    if (!root) return;

    var topActions = root.querySelector('.pmd-v2-top-actions');
    var search = root.querySelector('.pmd-v2-search');
    var input = search && search.querySelector('[data-v2-search]');
    var icon = search && search.querySelector('span');

    if (topActions && search && !search.classList.contains('pmd-v233-header-search')) {
      search.classList.add('pmd-v233-header-search');
      topActions.insertBefore(search, topActions.firstChild);

      function openSearch() {
        search.classList.add('is-open');
        window.setTimeout(function () {
          if (input) input.focus();
        }, 40);
      }

      function closeSearch() {
        if (input && input.value.trim()) return;
        search.classList.remove('is-open');
        if (input) input.blur();
      }

      search.addEventListener('click', function (event) {
        if (!search.classList.contains('is-open')) {
          event.preventDefault();
          openSearch();
        }
      });

      if (icon) {
        icon.setAttribute('role', 'button');
        icon.setAttribute('aria-label', 'Search tables');
        icon.setAttribute('tabindex', '0');
        icon.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openSearch();
          }
        });
      }

      if (input) {
        input.placeholder = 'SEARCH TABLE OR AREA';
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            if (!input.value) closeSearch();
            else {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        });

        input.addEventListener('blur', function () {
          window.setTimeout(closeSearch, 120);
        });
      }

      document.addEventListener('click', function (event) {
        if (!search.contains(event.target)) closeSearch();
      });
    }

    /* Remove duplicated status nodes even if another layer recreates them. */
    root.querySelectorAll('.pmd-v23-online-user, .pmd-v2-live, .pmd-v2-footer')
      .forEach(function (node) {
        node.remove();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  window.setTimeout(mount, 150);
  window.setTimeout(mount, 700);

  console.info('[PMD] Waiter Launcher V2.3.3 unified UI active');
})();
