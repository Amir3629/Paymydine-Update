(function () {
  'use strict';

  if (window.PMDWaiterV278) return;

  var PMD = window.PMDWaiterV278 = {
    version: '2.7.8',
    observer: null,
    timer: null,
    lastBackground: ''
  };

  function visible(element) {
    if (!element) return false;

    var rect = element.getBoundingClientRect();
    var style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function findLeftRail() {
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll(
        '.pmd-v2-filter-rail,' +
        '.pmd-v23-service-rail,' +
        '.pmd-v241-lifecycle-rail,' +
        '.pmd-v257-left-rail,' +
        '[data-v2-filter-rail],' +
        '[data-v241-lifecycle-rail],' +
        'aside, nav, div'
      )
    );

    return candidates.find(function (element) {
      if (!visible(element)) return false;

      var rect = element.getBoundingClientRect();

      if (
        rect.left > 20 ||
        rect.width < 110 ||
        rect.width > 160 ||
        rect.height < 500
      ) {
        return false;
      }

      var text = String(element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      return (
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('OCCUPIED') !== -1 &&
        text.indexOf('CLEANING') !== -1 &&
        text.indexOf('NOTES') !== -1
      );
    }) || null;
  }

  function findRightRail() {
    return document.querySelector(
      '.v257-operations-rail, .pmd-v257-operations-rail'
    );
  }

  function apply() {
    var leftRail = findLeftRail();
    var rightRail = findRightRail();

    if (!leftRail || !rightRail) {
      return false;
    }

    /*
     * Use the actual computed background shown by the browser.
     * The audit confirmed this is rgb(24, 34, 44) in dark mode.
     */
    var leftStyle = getComputedStyle(leftRail);
    var background = leftStyle.backgroundColor;

    /*
     * Apply the value directly with inline !important.
     * This defeats every previous V257–V277 stylesheet.
     */
    rightRail.style.setProperty(
      'background',
      background,
      'important'
    );

    rightRail.style.setProperty(
      'background-color',
      background,
      'important'
    );

    rightRail.style.setProperty(
      'background-image',
      'none',
      'important'
    );

    rightRail.style.setProperty(
      'color',
      leftStyle.color,
      'important'
    );

    /*
     * Also force the complete right-side column beneath the rail.
     */
    var parent = rightRail.parentElement;

    if (parent) {
      var parentRect = parent.getBoundingClientRect();

      if (
        parentRect.right >= window.innerWidth - 2 &&
        parentRect.width <= 180
      ) {
        parent.style.setProperty(
          'background',
          background,
          'important'
        );

        parent.style.setProperty(
          'background-color',
          background,
          'important'
        );

        parent.style.setProperty(
          'background-image',
          'none',
          'important'
        );
      }
    }

    rightRail.dataset.v278ForcedBackground = '1';
    PMD.lastBackground = background;

    console.info(
      '[PMD V2.7.8] Right rail background forced',
      {
        left: getComputedStyle(leftRail).backgroundColor,
        right: getComputedStyle(rightRail).backgroundColor,
        expected: background,
        match:
          getComputedStyle(leftRail).backgroundColor ===
          getComputedStyle(rightRail).backgroundColor
      }
    );

    return true;
  }

  function schedule() {
    clearTimeout(PMD.timer);

    PMD.timer = setTimeout(function () {
      apply();
    }, 20);
  }

  function start() {
    apply();

    /*
     * Reapply only after a theme change or if an old stylesheet
     * changes the right rail's class/style.
     */
    PMD.observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (
          mutation.target === document.documentElement &&
          mutation.type === 'attributes'
        ) {
          return true;
        }

        if (
          mutation.target &&
          mutation.target.matches &&
          mutation.target.matches(
            '.v257-operations-rail,' +
            '.pmd-v257-operations-rail'
          )
        ) {
          return true;
        }

        return Array.prototype.some.call(
          mutation.addedNodes || [],
          function (node) {
            return (
              node.nodeType === 1 &&
              (
                node.matches?.(
                  '.v257-operations-rail,' +
                  '.pmd-v257-operations-rail'
                ) ||
                node.querySelector?.(
                  '.v257-operations-rail,' +
                  '.pmd-v257-operations-rail'
                )
              )
            );
          }
        );
      });

      if (relevant) schedule();
    });

    PMD.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-pmd-pos-theme',
        'class',
        'style'
      ],
      childList: true,
      subtree: true
    });

    window.addEventListener('resize', schedule, {
      passive: true
    });

    console.info(
      '[PMD] Waiter V2.7.8 forced symmetric rail background active'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();
