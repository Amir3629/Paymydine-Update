(function () {
  'use strict';

  if (window.PMDWaiterV285) return;

  var PMD = window.PMDWaiterV285 = {
    version: '2.8.5',
    observer: null,
    stableClone: null,
    overlay: null,
    settleTimer: null,
    locked: false,
    mutations: 0
  };

  function getGrid() {
    return (
      document.querySelector('[data-v2-table-grid]') ||
      document.querySelector('.pmd-v2-table-grid')
    );
  }

  function cleanClone(node) {
    var clone = node.cloneNode(true);

    clone.removeAttribute('id');
    clone.removeAttribute('data-v2-table-grid');
    clone.classList.remove('pmd-v285-grid-updating');

    clone.querySelectorAll('[id]').forEach(function (el) {
      el.removeAttribute('id');
    });

    clone.querySelectorAll('script,style').forEach(function (el) {
      el.remove();
    });

    return clone;
  }

  function captureStable(grid) {
    if (!grid || !grid.isConnected) return;
    PMD.stableClone = cleanClone(grid);
  }

  function removeOverlay(grid) {
    if (PMD.overlay) {
      PMD.overlay.remove();
      PMD.overlay = null;
    }

    if (grid) {
      grid.classList.remove('pmd-v285-grid-updating');
    }

    PMD.locked = false;
  }

  function installOverlay(grid) {
    if (PMD.locked || !PMD.stableClone || !grid.parentElement) return;

    PMD.locked = true;
    grid.parentElement.classList.add('pmd-v285-grid-host');

    var overlay = document.createElement('div');
    overlay.className = 'pmd-v285-grid-overlay';

    var frozenGrid = PMD.stableClone.cloneNode(true);
    frozenGrid.style.width = grid.getBoundingClientRect().width + 'px';
    frozenGrid.style.minHeight = grid.getBoundingClientRect().height + 'px';

    overlay.appendChild(frozenGrid);
    grid.parentElement.appendChild(overlay);
    grid.classList.add('pmd-v285-grid-updating');

    PMD.overlay = overlay;
  }

  function settle(grid) {
    clearTimeout(PMD.settleTimer);

    PMD.settleTimer = setTimeout(function () {
      requestAnimationFrame(function () {
        if (
          window.PMDWaiterV274 &&
          typeof window.PMDWaiterV274.refresh === 'function'
        ) {
          window.PMDWaiterV274.refresh();
        }

        requestAnimationFrame(function () {
          captureStable(grid);
          removeOverlay(grid);
        });
      });
    }, 180);
  }

  function relevant(records, grid) {
    return records.some(function (record) {
      if (record.type !== 'childList') return false;

      if (
        record.target.closest &&
        record.target.closest('.pmd-v285-grid-overlay')
      ) {
        return false;
      }

      return (
        record.target === grid ||
        record.target.closest('button.pmd-v2-table-key,button.pmd-v21-table-key')
      );
    });
  }

  function observe(grid) {
    if (!grid || !window.MutationObserver) return;

    captureStable(grid);

    PMD.observer = new MutationObserver(function (records) {
      if (!relevant(records, grid)) return;

      PMD.mutations += records.length;
      installOverlay(grid);
      settle(grid);
    });

    PMD.observer.observe(grid, {
      childList: true,
      subtree: true
    });

    console.info('[PMD] V2.8.5 live grid visual lock active');
  }

  function boot() {
    var attempts = 0;
    var timer = setInterval(function () {
      var grid = getGrid();
      attempts += 1;

      if (grid) {
        clearInterval(timer);

        // Wait for the final startup shield to release and capture the
        // correct final-looking grid, not the old launcher state.
        setTimeout(function () {
          if (
            window.PMDWaiterV274 &&
            typeof window.PMDWaiterV274.refresh === 'function'
          ) {
            window.PMDWaiterV274.refresh();
          }

          requestAnimationFrame(function () {
            observe(grid);
          });
        }, 350);
      }

      if (attempts > 100) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
