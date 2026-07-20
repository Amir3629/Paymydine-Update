(function () {
  'use strict';

  if (window.PMDWaiterV268) return;

  window.PMDWaiterV268 = {
    active: true,
    version: '2.6.8',
    released: false,
    releaseReason: '',
    startedAt: performance.now()
  };

  var state = window.PMDWaiterV268;
  var root = document.documentElement;
  var releaseTimer = null;
  var observer = null;

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function operationButtons() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '.v257-operations-rail .v257-operation,' +
      '.pmd-v257-operations-rail .v257-operation'
    ));
  }

  function findNotificationButton() {
    return operationButtons().find(function (button) {
      var action = clean(
        button.getAttribute('data-v257-action') ||
        button.getAttribute('data-v257-operation') ||
        button.getAttribute('data-operation')
      ).toLowerCase();

      var text = clean(button.textContent).toLowerCase();

      return (
        action === 'notifications' ||
        action === 'notification' ||
        action === 'alerts' ||
        action === 'alert' ||
        text.indexOf('notification') !== -1
      );
    }) || null;
  }

  function decorateNotificationButton() {
    var button = findNotificationButton();

    if (!button) return false;

    if (button.dataset.v268NotificationIcon === '1') {
      return true;
    }

    /*
     * Remove only the display contents.
     * The existing button node and its click handlers remain untouched.
     */
    button.innerHTML =
      '<span class="pmd-v268-notification-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" focusable="false">' +
          '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path>' +
          '<path d="M10 21h4"></path>' +
        '</svg>' +
      '</span>';

    button.dataset.v268NotificationIcon = '1';
    button.setAttribute('aria-label', 'Notifications');
    button.setAttribute('title', 'Notifications');

    /*
     * Notification must always be the first operation.
     * Moving the existing node preserves its original click listener.
     */
    var rail = button.closest(
      '.v257-operations-rail, .pmd-v257-operations-rail'
    );

    if (rail && rail.firstElementChild !== button) {
      rail.prepend(button);
    }

    return true;
  }

  function hideRemainingNotificationCounts() {
    document.querySelectorAll(
      '[data-v2-alert-count],' +
      '[data-v257-notification-count],' +
      '.v257-notification-count,' +
      '.pmd-v257-notification-count'
    ).forEach(function (count) {
      count.hidden = true;
      count.setAttribute('aria-hidden', 'true');
      count.textContent = '';
    });
  }

  function cards() {
    return Array.prototype.slice.call(
      document.querySelectorAll('.pmd-v2-table-key')
    );
  }

  function lifecycleReady() {
    var allCards = cards();

    if (!allCards.length) return false;

    return allCards.every(function (card) {
      return (
        card.hasAttribute('data-v241-status') &&
        card.hasAttribute('data-v241-signature') &&
        card.querySelector(
          '[data-v241-status-label],' +
          '.v241-status-label,' +
          '.pmd-v241-card-status,' +
          '[data-v2-open-order]'
        )
      );
    });
  }

  function railsReady() {
    var leftRail = document.querySelector(
      '[data-v2-filters],' +
      '.pmd-v2-filter-rail,' +
      '.pmd-v2-sidebar'
    );

    var areaRow = document.querySelector('[data-v2-areas]');
    var rightRail = document.querySelector(
      '.v257-operations-rail,' +
      '.pmd-v257-operations-rail'
    );

    return !!(leftRail && areaRow && rightRail);
  }

  function release(reason) {
    if (state.released) return;

    state.released = true;
    state.releaseReason = reason;
    state.releasedAt = performance.now();
    state.bootDuration = Math.round(
      state.releasedAt - state.startedAt
    );

    root.classList.remove('pmd-v268-booting');
    root.classList.add('pmd-v268-ready');

    document.body.classList.add('pmd-v268-ready');

    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    console.info(
      '[PMD] V2.6.8 first paint released:',
      reason,
      state.bootDuration + 'ms'
    );
  }

  function checkReady() {
    decorateNotificationButton();
    hideRemainingNotificationCounts();

    if (railsReady() && lifecycleReady()) {
      /*
       * Two animation frames ensure final computed CSS has been applied
       * before the floor becomes visible.
       */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          release('final lifecycle UI ready');
        });
      });

      return true;
    }

    return false;
  }

  function mount() {
    decorateNotificationButton();
    hideRemainingNotificationCounts();

    if (checkReady()) return;

    observer = new MutationObserver(function () {
      decorateNotificationButton();
      hideRemainingNotificationCounts();
      checkReady();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'hidden',
        'data-v241-status',
        'data-v241-signature',
        'data-v257-action'
      ]
    });

    /*
     * Safety release:
     * never leave the page hidden because of a failed API request.
     */
    releaseTimer = setTimeout(function () {
      release('1200ms safety timeout');
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {
      once: true
    });
  } else {
    mount();
  }
})();
