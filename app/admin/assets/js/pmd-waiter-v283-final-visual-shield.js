(function () {
  'use strict';

  if (window.PMDWaiterV283) return;

  var startedAt = performance.now();
  var lastRelevantMutation = performance.now();
  var stableChecks = 0;
  var released = false;
  var observer = null;
  var timer = null;

  var PMD = window.PMDWaiterV283 = {
    version: '2.8.3',
    startedAt: startedAt,
    released: false,
    reason: '',
    diagnostics: {}
  };

  function q(selector) {
    return document.querySelector(selector);
  }

  function qa(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function elapsed() {
    return Math.round(performance.now() - startedAt);
  }

  function cardCount() {
    return qa(
      'button.pmd-v2-table-key,' +
      'button.pmd-v21-table-key,' +
      'button[data-v2-open-table],' +
      'button[data-v21-number]'
    ).filter(function (node, index, all) {
      return all.indexOf(node) === index;
    }).length;
  }

  function isVisible(node) {
    if (!node) return false;
    var style = getComputedStyle(node);
    var rect = node.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function currentState() {
    var root =
      q('[data-pmd-waiter-v2-root]') ||
      q('.pmd-v2-shell') ||
      q('.pmd-v2-launcher');

    var grid =
      q('[data-v2-table-grid]') ||
      q('.pmd-v2-table-grid');

    var leftRail =
      q('.v241-filter-rail') ||
      q('[data-v241-filter-rail]');

    var rightRail =
      q('.v257-operations-rail') ||
      q('.pmd-v257-operations-rail');

    var logout =
      q('.pmd-v265-logout') ||
      q('.pmd-v275-logout') ||
      q('[data-pmd-logout]');

    var areaRow =
      q('[data-v2-areas]') ||
      q('.pmd-v2-areas');

    var cards = cardCount();
    var quietFor = Math.round(performance.now() - lastRelevantMutation);

    return {
      elapsed: elapsed(),
      quietFor: quietFor,
      cards: cards,
      root: isVisible(root),
      grid: isVisible(grid),
      leftRail: isVisible(leftRail),
      rightRail: isVisible(rightRail),
      logout: isVisible(logout),
      areaRow: isVisible(areaRow)
    };
  }

  function looksFinal(state) {
    return (
      state.elapsed >= 1700 &&
      state.quietFor >= 650 &&
      state.cards >= 1 &&
      state.root &&
      state.grid &&
      state.leftRail &&
      state.rightRail &&
      state.areaRow
    );
  }

  function release(reason) {
    if (released) return;
    released = true;

    var state = currentState();
    PMD.released = true;
    PMD.reason = reason;
    PMD.diagnostics = state;

    if (observer) observer.disconnect();
    if (timer) clearInterval(timer);

    var shield = q('#pmd-v283-shield');

    requestAnimationFrame(function () {
      document.documentElement.classList.remove('pmd-v283-booting');
      document.documentElement.classList.add('pmd-v283-ready');

      if (shield) shield.hidden = true;

      console.info(
        '[PMD] V2.8.3 final visual shield released:',
        reason,
        state
      );
    });
  }

  function check() {
    var state = currentState();
    PMD.diagnostics = state;

    if (looksFinal(state)) {
      stableChecks += 1;
    } else {
      stableChecks = 0;
    }

    if (stableChecks >= 3) {
      release('final UI stable');
      return;
    }

    if (state.elapsed >= 5000) {
      release('5000ms safety timeout');
    }
  }

  function isRelevantMutation(record) {
    var target = record.target;

    if (!target || target.nodeType !== 1) {
      target = target && target.parentElement;
    }

    if (!target) return false;

    if (target.closest && target.closest('#pmd-v283-shield')) {
      return false;
    }

    if (
      record.type === 'attributes' &&
      ['class', 'style', 'hidden', 'aria-pressed', 'data-pmd-pos-theme']
        .indexOf(record.attributeName) === -1
    ) {
      return false;
    }

    return Boolean(
      target.closest &&
      target.closest(
        '[data-pmd-waiter-v2-root],' +
        '.pmd-v2-shell,' +
        '.pmd-v2-launcher,' +
        '.pmd-v2-table-grid,' +
        '[data-v2-table-grid],' +
        '.v241-filter-rail,' +
        '.v257-operations-rail'
      )
    );
  }

  function boot() {
    var shield = q('#pmd-v283-shield');

    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'pmd-v283-shield';
      shield.innerHTML =
        '<div class="pmd-v283-box">' +
          '<p class="pmd-v283-title">Waiter Workstation</p>' +
          '<p class="pmd-v283-status">Preparing final workspace…</p>' +
          '<div class="pmd-v283-progress"></div>' +
        '</div>';

      document.body.insertBefore(shield, document.body.firstChild);
    }

    observer = new MutationObserver(function (records) {
      if (records.some(isRelevantMutation)) {
        lastRelevantMutation = performance.now();
        stableChecks = 0;
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'hidden',
        'aria-pressed',
        'data-pmd-pos-theme'
      ]
    });

    timer = setInterval(check, 120);
    check();

    console.info('[PMD] V2.8.3 final visual shield active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
