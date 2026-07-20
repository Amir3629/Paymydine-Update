(function () {
  'use strict';

  if (window.PMDWaiterV234Consistency) return;
  window.PMDWaiterV234Consistency = true;

  function enhanceLauncherTables(root) {
    root.querySelectorAll('.pmd-v2-table-key').forEach(function (card) {
      var title = (card.querySelector('.pmd-v2-table-corner') || {}).title || '';
      var stateText = (card.querySelector('.pmd-v2-table-state') || {}).textContent || '';

      if (/waiter/i.test(title) || /waiter call/i.test(stateText)) {
        card.setAttribute('data-pmd-waiter-call', '1');
      }
    });
  }

  function enhancePosSearch(posRoot) {
    if (!posRoot) return;

    var topbar = posRoot.querySelector('.pmd-pos-topbar');
    var search = posRoot.querySelector('.pmd-pos-search');
    if (!topbar || !search) return;

    if (!search.classList.contains('pmd-v234-pos-header-search')) {
      search.classList.add('pmd-v234-pos-header-search');

      var rightSide =
        topbar.querySelector('.pmd-pos-top-actions') ||
        topbar.querySelector('.pmd-pos-actions');

      if (rightSide) {
        rightSide.insertBefore(search, rightSide.firstChild);
      } else {
        var clearCart = topbar.querySelector('[data-pos-clear], .pmd-pos-clear');
        if (clearCart) topbar.insertBefore(search, clearCart);
        else topbar.appendChild(search);
      }

      var input = search.querySelector('input');

      function open() {
        search.classList.add('is-open');
        setTimeout(function () {
          if (input) input.focus();
        }, 30);
      }

      function close() {
        if (input && input.value.trim()) return;
        search.classList.remove('is-open');
      }

      search.addEventListener('click', function () {
        if (!search.classList.contains('is-open')) open();
      });

      if (input) {
        input.placeholder = 'SEARCH FOOD, DRINK OR CATEGORY';
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            if (input.value) {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              close();
              input.blur();
            }
          }
        });
        input.addEventListener('blur', function () {
          setTimeout(close, 120);
        });
      }
    }
  }

  function mount() {
    var root = document.querySelector('[data-pmd-waiter-v2-root]');
    if (!root) return;

    enhanceLauncherTables(root);

    var posRoot =
      root.querySelector('.pmd-pos-app') ||
      root.querySelector('[data-pos-root]');

    if (posRoot) enhancePosSearch(posRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  var observer = new MutationObserver(function () {
    mount();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  setTimeout(mount, 100);
  setTimeout(mount, 500);

  console.info('[PMD] Waiter V2.3.4 POS consistency active');
})();
