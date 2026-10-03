(function () {
  'use strict';

  if (window.PMDWaiterV255NumericOrder) return;
  window.PMDWaiterV255NumericOrder = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var scheduled = false;
  var observer = null;
  var observedGrid = null;

  function value(node) {
    return String(node == null ? '' : node).trim();
  }

  function getNumber(card) {
    var candidates = [
      card.getAttribute('data-v21-number'),
      card.getAttribute('data-table-number'),
      card.getAttribute('data-v2-table-number'),
      card.querySelector('strong') && card.querySelector('strong').textContent,
      card.querySelector('.pmd-v2-table-name') &&
        card.querySelector('.pmd-v2-table-name').textContent
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var match = value(candidates[i]).match(/\d+(?:\.\d+)?/);
      if (match) return Number(match[0]);
    }

    return 999999;
  }

  function applyOrder() {
    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid) return;

    var cards = grid.querySelectorAll(':scope > [data-v2-open-table]');

    cards.forEach(function (card) {
      var number = getNumber(card);
      var expected = String(number);

      if (card.style.order !== expected) {
        card.style.order = expected;
      }
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      connect();
      applyOrder();
    });
  }

  function connect() {
    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid || grid === observedGrid) return;

    if (observer) observer.disconnect();

    observedGrid = grid;
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'childList' && mutation.target === grid) {
          return true;
        }

        if (
          mutation.type === 'attributes' &&
          mutation.target.matches &&
          mutation.target.matches('[data-v2-open-table]')
        ) {
          return true;
        }

        return false;
      });

      if (relevant) schedule();
    });

    observer.observe(grid, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: [
        'data-v21-number',
        'data-table-number',
        'data-v2-table-number'
      ]
    });
  }

  function boot() {
    connect();
    applyOrder();

    root.addEventListener('click', function () {
      setTimeout(schedule, 0);
    });

    root.addEventListener('input', function () {
      setTimeout(schedule, 0);
    });

    window.addEventListener(
      'pmd:waiter-launcher-data-refreshed',
      schedule
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  console.info(
    '[PMD] Waiter V2.5.5 CSS-order numeric sorting active — no DOM reparenting'
  );
})();
