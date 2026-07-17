(function () {
  'use strict';

  if (window.PMDWaiterV251TableNumberOrder) return;
  window.PMDWaiterV251TableNumberOrder = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var sorting = false;
  var scheduled = false;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function tableNumber(card) {
    var candidates = [
      card.getAttribute('data-v21-number'),
      card.getAttribute('data-table-number'),
      card.getAttribute('data-v2-table-number'),
      (card.querySelector('strong') || {}).textContent,
      (card.querySelector('.pmd-v2-table-name') || {}).textContent
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var match = clean(candidates[i]).match(/\d+(?:\.\d+)?/);
      if (match) return Number(match[0]);
    }

    return Number.MAX_SAFE_INTEGER;
  }

  function compareCards(a, b) {
    var aNumber = tableNumber(a);
    var bNumber = tableNumber(b);

    if (aNumber !== bNumber) return aNumber - bNumber;

    return clean((a.querySelector('strong') || {}).textContent).localeCompare(
      clean((b.querySelector('strong') || {}).textContent),
      undefined,
      {numeric: true, sensitivity: 'base'}
    );
  }

  function sortGrid() {
    if (sorting) return;

    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid) return;

    var cards = Array.prototype.slice.call(
      grid.querySelectorAll(':scope > [data-v2-open-table]')
    );

    if (cards.length < 2) return;

    var sorted = cards.slice().sort(compareCards);
    var alreadySorted = cards.every(function (card, index) {
      return card === sorted[index];
    });

    if (alreadySorted) return;

    sorting = true;

    try {
      var fragment = document.createDocumentFragment();

      sorted.forEach(function (card) {
        fragment.appendChild(card);
      });

      grid.appendChild(fragment);
    } finally {
      sorting = false;
    }
  }

  function scheduleSort() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(function () {
      scheduled = false;
      sortGrid();
    });
  }

  function observeGrid() {
    var grid = root.querySelector('[data-v2-table-grid]');
    if (!grid || grid.getAttribute('data-v251-observed') === '1') return;

    grid.setAttribute('data-v251-observed', '1');

    var observer = new MutationObserver(function (mutations) {
      if (sorting) return;

      var changed = mutations.some(function (mutation) {
        return mutation.type === 'childList' && mutation.target === grid;
      });

      if (changed) scheduleSort();
    });

    observer.observe(grid, {
      childList: true,
      subtree: false
    });
  }

  function boot() {
    observeGrid();
    scheduleSort();

    window.addEventListener(
      'pmd:waiter-launcher-data-refreshed',
      scheduleSort
    );

    root.addEventListener('click', function () {
      setTimeout(scheduleSort, 0);
    });

    root.addEventListener('input', function () {
      setTimeout(scheduleSort, 0);
    });

    setInterval(function () {
      observeGrid();
      sortGrid();
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }

  console.info('[PMD] Waiter V2.5.1 numeric table sorting active');
})();
