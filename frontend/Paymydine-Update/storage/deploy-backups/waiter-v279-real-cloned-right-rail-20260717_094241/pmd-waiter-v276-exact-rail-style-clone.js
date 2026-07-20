(function () {
  'use strict';

  if (window.PMDWaiterV276) return;

  var PMD = window.PMDWaiterV276 = {
    version: '2.7.6',
    observer: null,
    timer: null,
    applied: false
  };

  function findLeftRail() {
    var selectors = [
      '.pmd-v2-filter-rail',
      '.pmd-v23-service-rail',
      '.pmd-v241-lifecycle-rail',
      '.pmd-v257-left-rail',
      '[data-v2-filter-rail]',
      '[data-v241-lifecycle-rail]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var rail = document.querySelector(selectors[i]);

      if (rail && rail.getBoundingClientRect().width > 60) {
        return rail;
      }
    }

    /*
     * Fallback: find the rail containing ALL TABLES and AVAILABLE.
     */
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('aside, nav, section, div')
    );

    return candidates.find(function (element) {
      var text = String(element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      var rect = element.getBoundingClientRect();

      return (
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('OCCUPIED') !== -1 &&
        rect.width >= 90 &&
        rect.width <= 180 &&
        rect.height > 250
      );
    }) || null;
  }

  function findLeftButton(leftRail) {
    if (!leftRail) return null;

    var selectors = [
      'button',
      '[role="button"]',
      '.pmd-v2-table-filter',
      '.pmd-v2-table-key-filter',
      '[data-v241-filter]',
      '[data-v2-filter]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var elements = Array.prototype.slice.call(
        leftRail.querySelectorAll(selectors[i])
      );

      var usable = elements.find(function (element) {
        var rect = element.getBoundingClientRect();
        return rect.width > 70 && rect.height > 35;
      });

      if (usable) return usable;
    }

    return null;
  }

  function findRightRail() {
    return document.querySelector(
      '.v257-operations-rail, .pmd-v257-operations-rail'
    );
  }

  function px(value) {
    var number = parseFloat(value);
    return Number.isFinite(number) ? number + 'px' : value;
  }

  function setVariable(element, name, value) {
    if (!element || value == null || value === '') return;
    element.style.setProperty(name, value);
  }

  function copyRailStyles(leftRail, rightRail) {
    var style = getComputedStyle(leftRail);
    var rect = leftRail.getBoundingClientRect();

    setVariable(rightRail, '--v276-rail-bg', style.backgroundColor);
    setVariable(rightRail, '--v276-rail-color', style.color);
    setVariable(rightRail, '--v276-rail-border-color', style.borderRightColor);
    setVariable(rightRail, '--v276-rail-border-width', style.borderRightWidth);
    setVariable(rightRail, '--v276-rail-width', px(rect.width));
    setVariable(rightRail, '--v276-rail-padding-top', style.paddingTop);
    setVariable(rightRail, '--v276-rail-padding-right', style.paddingRight);
    setVariable(rightRail, '--v276-rail-padding-bottom', style.paddingBottom);
    setVariable(rightRail, '--v276-rail-padding-left', style.paddingLeft);
    setVariable(rightRail, '--v276-rail-gap', style.rowGap || style.gap || '6px');
  }

  function copyButtonStyles(leftButton, rightRail) {
    var style = getComputedStyle(leftButton);
    var rect = leftButton.getBoundingClientRect();

    setVariable(rightRail, '--v276-button-bg', style.backgroundColor);
    setVariable(rightRail, '--v276-button-color', style.color);
    setVariable(rightRail, '--v276-button-border-color', style.borderColor);
    setVariable(rightRail, '--v276-button-border-width', style.borderWidth);
    setVariable(rightRail, '--v276-button-border-style', style.borderStyle);
    setVariable(rightRail, '--v276-button-radius', style.borderRadius);
    setVariable(rightRail, '--v276-button-width', px(rect.width));
    setVariable(rightRail, '--v276-button-height', px(rect.height));
    setVariable(rightRail, '--v276-button-padding-top', style.paddingTop);
    setVariable(rightRail, '--v276-button-padding-right', style.paddingRight);
    setVariable(rightRail, '--v276-button-padding-bottom', style.paddingBottom);
    setVariable(rightRail, '--v276-button-padding-left', style.paddingLeft);
    setVariable(rightRail, '--v276-button-font-family', style.fontFamily);
    setVariable(rightRail, '--v276-button-font-size', style.fontSize);
    setVariable(rightRail, '--v276-button-font-weight', style.fontWeight);
    setVariable(rightRail, '--v276-button-line-height', style.lineHeight);
    setVariable(rightRail, '--v276-button-letter-spacing', style.letterSpacing);
    setVariable(rightRail, '--v276-button-shadow', style.boxShadow);
  }

  function applyExactClone() {
    var leftRail = findLeftRail();
    var leftButton = findLeftButton(leftRail);
    var rightRail = findRightRail();

    if (!leftRail || !leftButton || !rightRail) {
      return false;
    }

    copyRailStyles(leftRail, rightRail);
    copyButtonStyles(leftButton, rightRail);

    rightRail.dataset.v276ExactClone = '1';

    Array.prototype.forEach.call(
      rightRail.querySelectorAll('.v257-operation'),
      function (button) {
        button.dataset.v276ExactCloneButton = '1';

        /*
         * Remove inline visual mutations left by older runtime layers.
         */
        button.style.removeProperty('background');
        button.style.removeProperty('background-color');
        button.style.removeProperty('color');
        button.style.removeProperty('border-color');
        button.style.removeProperty('box-shadow');
        button.style.removeProperty('transform');
        button.style.setProperty('transition', 'none', 'important');
        button.style.setProperty('animation', 'none', 'important');
      }
    );

    PMD.applied = true;
    return true;
  }

  function scheduleApply() {
    clearTimeout(PMD.timer);

    PMD.timer = setTimeout(function () {
      applyExactClone();
    }, 20);
  }

  function start() {
    applyExactClone();

    /*
     * Re-copy after theme changes or rail regeneration.
     * This does not rebuild cards or move table nodes.
     */
    PMD.observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'attributes') {
          return (
            mutation.target === document.documentElement ||
            mutation.attributeName === 'data-pmd-pos-theme' ||
            mutation.attributeName === 'class'
          );
        }

        return mutation.type === 'childList';
      });

      if (relevant) scheduleApply();
    });

    PMD.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-pmd-pos-theme', 'class'],
      childList: true,
      subtree: true
    });

    window.addEventListener('resize', scheduleApply, {
      passive: true
    });

    console.info(
      '[PMD] Waiter V2.7.6 exact left-to-right rail clone active'
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
