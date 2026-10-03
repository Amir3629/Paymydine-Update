(function () {
  'use strict';

  if (window.PMDWaiterV281) return;

  var PMD = window.PMDWaiterV281 = {
    version: '2.8.1',
    observer: null
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
    return Array.prototype.slice.call(
      document.querySelectorAll('aside, nav, div')
    ).find(function (element) {
      if (!visible(element)) return false;

      var rect = element.getBoundingClientRect();
      var text = String(element.textContent || '')
        .replace(/\s+/g, ' ')
        .toUpperCase();

      return (
        rect.left <= 20 &&
        rect.width >= 110 &&
        rect.width <= 160 &&
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('CLEANING') !== -1
      );
    }) || null;
  }

  function findReferenceButton(leftRail) {
    if (!leftRail) return null;

    var children = Array.prototype.slice.call(leftRail.children);

    return children.find(function (element) {
      return (
        visible(element) &&
        String(element.textContent || '')
          .replace(/\s+/g, ' ')
          .toUpperCase()
          .indexOf('AVAILABLE') !== -1
      );
    }) || null;
  }

  function apply() {
    var leftRail = findLeftRail();
    var reference = findReferenceButton(leftRail);
    var rightRail = document.querySelector('.pmd-v280-right-rail');

    if (!reference || !rightRail) return false;

    var referenceStyle = getComputedStyle(reference);

    var edgeWidth =
      referenceStyle.borderLeftWidth ||
      referenceStyle.borderInlineStartWidth ||
      '4px';

    var edgeStyle =
      referenceStyle.borderLeftStyle ||
      referenceStyle.borderInlineStartStyle ||
      'solid';

    rightRail.querySelectorAll('.pmd-v280-operation')
      .forEach(function (button) {
        button.style.setProperty(
          'border-left-width',
          edgeWidth,
          'important'
        );

        button.style.setProperty(
          'border-inline-start-width',
          edgeWidth,
          'important'
        );

        button.style.setProperty(
          'border-left-style',
          edgeStyle,
          'important'
        );

        button.style.setProperty(
          'border-inline-start-style',
          edgeStyle,
          'important'
        );
      });

    console.info('[PMD V2.8.1] Right operation edge synchronized', {
      edgeWidth: edgeWidth,
      edgeStyle: edgeStyle
    });

    return true;
  }

  function start() {
    apply();

    PMD.observer = new MutationObserver(function (mutations) {
      var themeChanged = mutations.some(function (mutation) {
        return (
          mutation.type === 'attributes' &&
          (
            mutation.attributeName === 'data-pmd-pos-theme' ||
            mutation.attributeName === 'class'
          )
        );
      });

      if (themeChanged) {
        requestAnimationFrame(apply);
      }
    });

    PMD.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-pmd-pos-theme',
        'class'
      ]
    });

    console.info(
      '[PMD] Waiter V2.8.1 exact operation edge width active'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
