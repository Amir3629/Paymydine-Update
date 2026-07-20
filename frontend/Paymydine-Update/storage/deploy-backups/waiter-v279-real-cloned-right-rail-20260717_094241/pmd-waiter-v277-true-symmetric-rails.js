(function () {
  'use strict';

  if (window.PMDWaiterV277) return;

  var PMD = window.PMDWaiterV277 = {
    version: '2.7.7',
    timer: null,
    observer: null,
    applied: false
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

  function transparent(value) {
    value = String(value || '').replace(/\s+/g, '').toLowerCase();

    return (
      !value ||
      value === 'transparent' ||
      value === 'rgba(0,0,0,0)' ||
      value === 'hsla(0,0%,0%,0)'
    );
  }

  function effectiveBackground(element) {
    var current = element;

    while (current && current !== document.documentElement) {
      var style = getComputedStyle(current);
      var background = style.backgroundColor;

      if (!transparent(background)) {
        return background;
      }

      current = current.parentElement;
    }

    var htmlBackground = getComputedStyle(document.documentElement)
      .backgroundColor;

    if (!transparent(htmlBackground)) {
      return htmlBackground;
    }

    return getComputedStyle(document.body).backgroundColor;
  }

  function findRightRail() {
    return document.querySelector(
      '.v257-operations-rail, .pmd-v257-operations-rail'
    );
  }

  function findLeftRail() {
    var directSelectors = [
      '.pmd-v2-filter-rail',
      '.pmd-v23-service-rail',
      '.pmd-v241-lifecycle-rail',
      '.pmd-v257-left-rail',
      '[data-v2-filter-rail]',
      '[data-v241-lifecycle-rail]'
    ];

    for (var i = 0; i < directSelectors.length; i += 1) {
      var direct = document.querySelector(directSelectors[i]);

      if (visible(direct) && direct.getBoundingClientRect().width < 190) {
        return direct;
      }
    }

    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('aside, nav, section, div')
    );

    return candidates.find(function (element) {
      if (!visible(element)) return false;

      var text = String(element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      var rect = element.getBoundingClientRect();

      return (
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('OCCUPIED') !== -1 &&
        text.indexOf('NOTES') !== -1 &&
        rect.left < 30 &&
        rect.width >= 100 &&
        rect.width <= 180 &&
        rect.height > 400
      );
    }) || null;
  }

  function findLeftButton(leftRail) {
    if (!leftRail) return null;

    var elements = Array.prototype.slice.call(
      leftRail.querySelectorAll(
        'button,' +
        '[role="button"],' +
        '[data-v241-filter],' +
        '[data-v2-filter],' +
        '.pmd-v2-table-filter,' +
        '.pmd-v2-table-key-filter'
      )
    );

    return elements.find(function (element) {
      if (!visible(element)) return false;

      var rect = element.getBoundingClientRect();

      return rect.width > 90 && rect.height > 40;
    }) || null;
  }

  function setVar(element, name, value) {
    if (!element || value == null || value === '') return;
    element.style.setProperty(name, value);
  }

  function copyRail(leftRail, rightRail) {
    var leftStyle = getComputedStyle(leftRail);
    var leftRect = leftRail.getBoundingClientRect();

    var shellBackground = effectiveBackground(leftRail);

    /*
     * Copy the actual rendered shell colour, not a transparent child.
     */
    setVar(rightRail, '--v277-shell-bg', shellBackground);
    setVar(rightRail, '--v277-shell-color', leftStyle.color);
    setVar(rightRail, '--v277-rail-width', leftRect.width + 'px');

    setVar(
      rightRail,
      '--v277-divider-color',
      leftStyle.borderRightColor || leftStyle.borderColor
    );

    setVar(
      rightRail,
      '--v277-divider-width',
      leftStyle.borderRightWidth || '1px'
    );

    setVar(rightRail, '--v277-padding-top', leftStyle.paddingTop);
    setVar(rightRail, '--v277-padding-right', leftStyle.paddingRight);
    setVar(rightRail, '--v277-padding-bottom', leftStyle.paddingBottom);
    setVar(rightRail, '--v277-padding-left', leftStyle.paddingLeft);

    setVar(
      rightRail,
      '--v277-gap',
      leftStyle.rowGap !== 'normal'
        ? leftStyle.rowGap
        : (
          leftStyle.gap !== 'normal'
            ? leftStyle.gap
            : '6px'
        )
    );
  }

  function copyButton(leftButton, rightRail) {
    var style = getComputedStyle(leftButton);
    var rect = leftButton.getBoundingClientRect();

    setVar(
      rightRail,
      '--v277-button-bg',
      effectiveBackground(leftButton)
    );

    setVar(rightRail, '--v277-button-color', style.color);
    setVar(rightRail, '--v277-button-border-color', style.borderColor);
    setVar(rightRail, '--v277-button-border-width', style.borderWidth);
    setVar(rightRail, '--v277-button-border-style', style.borderStyle);
    setVar(rightRail, '--v277-button-radius', style.borderRadius);

    setVar(rightRail, '--v277-button-width', rect.width + 'px');
    setVar(rightRail, '--v277-button-height', rect.height + 'px');

    setVar(rightRail, '--v277-button-padding-top', style.paddingTop);
    setVar(rightRail, '--v277-button-padding-right', style.paddingRight);
    setVar(rightRail, '--v277-button-padding-bottom', style.paddingBottom);
    setVar(rightRail, '--v277-button-padding-left', style.paddingLeft);

    setVar(rightRail, '--v277-button-font-family', style.fontFamily);
    setVar(rightRail, '--v277-button-font-size', style.fontSize);
    setVar(rightRail, '--v277-button-font-weight', style.fontWeight);
    setVar(rightRail, '--v277-button-line-height', style.lineHeight);
    setVar(
      rightRail,
      '--v277-button-letter-spacing',
      style.letterSpacing
    );
  }

  function clearOldInlineStyles(rightRail) {
    Array.prototype.forEach.call(
      rightRail.querySelectorAll('.v257-operation'),
      function (button) {
        [
          'background',
          'background-color',
          'color',
          'border',
          'border-color',
          'border-radius',
          'box-shadow',
          'filter',
          'transform',
          'margin',
          'width',
          'height',
          'min-width',
          'max-width',
          'min-height',
          'max-height'
        ].forEach(function (property) {
          button.style.removeProperty(property);
        });

        button.style.setProperty(
          'transition',
          'none',
          'important'
        );

        button.style.setProperty(
          'animation',
          'none',
          'important'
        );

        button.dataset.v277CloneButton = '1';
      }
    );
  }

  function apply() {
    var leftRail = findLeftRail();
    var rightRail = findRightRail();

    if (!leftRail || !rightRail) {
      return false;
    }

    var leftButton = findLeftButton(leftRail);

    if (!leftButton) {
      return false;
    }

    copyRail(leftRail, rightRail);
    copyButton(leftButton, rightRail);
    clearOldInlineStyles(rightRail);

    rightRail.dataset.v277TrueClone = '1';

    /*
     * Keep both columns at exactly the same viewport position.
     */
    var leftRect = leftRail.getBoundingClientRect();

    rightRail.style.setProperty(
      '--v277-top',
      Math.round(leftRect.top) + 'px'
    );

    PMD.applied = true;

    console.info(
      '[PMD V2.7.7] Rails synchronized',
      {
        leftRail: {
          top: leftRect.top,
          width: leftRect.width,
          background: effectiveBackground(leftRail)
        },
        rightRail: {
          top: rightRail.getBoundingClientRect().top,
          width: rightRail.getBoundingClientRect().width,
          background: getComputedStyle(rightRail).backgroundColor
        },
        leftButton: {
          width: leftButton.getBoundingClientRect().width,
          height: leftButton.getBoundingClientRect().height,
          background: effectiveBackground(leftButton),
          border: getComputedStyle(leftButton).border
        }
      }
    );

    return true;
  }

  function schedule() {
    clearTimeout(PMD.timer);

    PMD.timer = setTimeout(function () {
      apply();
    }, 30);
  }

  function start() {
    apply();

    /*
     * Re-copy only when theme or the operation rail changes.
     */
    PMD.observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'attributes') {
          return (
            mutation.target === document.documentElement ||
            mutation.attributeName === 'data-pmd-pos-theme'
          );
        }

        if (mutation.type === 'childList') {
          return Array.prototype.some.call(
            mutation.addedNodes,
            function (node) {
              return (
                node.nodeType === 1 &&
                (
                  node.matches?.(
                    '.v257-operations-rail,' +
                    '.pmd-v257-operations-rail,' +
                    '.v257-operation'
                  ) ||
                  node.querySelector?.(
                    '.v257-operations-rail,' +
                    '.pmd-v257-operations-rail,' +
                    '.v257-operation'
                  )
                )
              );
            }
          );
        }

        return false;
      });

      if (relevant) {
        schedule();
      }
    });

    PMD.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-pmd-pos-theme'],
      childList: true,
      subtree: true
    });

    window.addEventListener('resize', schedule, {
      passive: true
    });

    console.info(
      '[PMD] Waiter V2.7.7 true symmetric rails active'
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
