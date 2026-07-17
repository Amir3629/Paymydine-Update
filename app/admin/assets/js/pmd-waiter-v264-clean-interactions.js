(function () {
  'use strict';

  if (window.PMDWaiterV264) return;
  window.PMDWaiterV264 = true;

  function removeSearchControls() {
    document.querySelectorAll(
      '.pmd-v263-area-search, .pmd-v233-header-search'
    ).forEach(function (element) {
      element.remove();
    });
  }

  function markNoteCards() {
    document.querySelectorAll('.pmd-v2-table-key').forEach(function (card) {
      var hasNote =
        card.getAttribute('data-pmd-has-note') === '1'
        || !!card.querySelector(
          '[title*="note" i], .v257-note, [data-v257-note], ' +
          '.v257-card-note, .pmd-v257-note, [class*="note-badge" i]'
        );

      /*
       * Some final cards only contain a small NOTE chip with no stable
       * class. Inspect short leaf text, without changing card content.
       */
      if (!hasNote) {
        hasNote = Array.prototype.some.call(
          card.querySelectorAll('span, b, small'),
          function (node) {
            return node.children.length === 0
              && node.textContent.trim().toUpperCase() === 'NOTE';
          }
        );
      }

      card.classList.toggle('v264-has-note', hasNote);
    });
  }

  function mount() {
    removeSearchControls();
    markNoteCards();
  }

  mount();

  /*
   * V2.6.3 can recreate its search clone after area refresh.
   * Remove only that clone; this observer never modifies the table grid.
   */
  var areaBar = document.querySelector('[data-v2-areas]');
  if (areaBar && typeof MutationObserver === 'function') {
    new MutationObserver(removeSearchControls).observe(areaBar, {
      childList: true
    });
  }

  /*
   * Poll only for lightweight class marking. No rebuilding, sorting,
   * moving, or hiding cards.
   */
  setInterval(mount, 1500);

  console.info('[PMD] Waiter V2.6.4 clean interactions active');
})();
