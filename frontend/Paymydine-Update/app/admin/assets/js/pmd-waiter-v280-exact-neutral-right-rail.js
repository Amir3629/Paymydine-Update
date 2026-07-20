(function () {
  'use strict';

  if (window.PMDWaiterV280) return;

  /*
   * Stop and remove V2.7.9.
   */
  if (window.PMDWaiterV279) {
    var oldInstance = window.PMDWaiterV279;

    if (oldInstance.observer &&
        typeof oldInstance.observer.disconnect === 'function') {
      oldInstance.observer.disconnect();
    }

    if (oldInstance.rebuildTimer) {
      clearTimeout(oldInstance.rebuildTimer);
      clearInterval(oldInstance.rebuildTimer);
    }
  }

  var PMD = window.PMDWaiterV280 = {
    version: '2.8.0',
    rail: null,
    workflowBridge: null,
    themeObserver: null,
    buildTimer: null
  };

  function normalize(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

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
      var text = normalize(element.textContent);

      return (
        rect.left <= 20 &&
        rect.width >= 110 &&
        rect.width <= 160 &&
        rect.height > 500 &&
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('OCCUPIED') !== -1 &&
        text.indexOf('CLEANING') !== -1 &&
        text.indexOf('NOTES') !== -1
      );
    }) || null;
  }

  function directButtonChildren(rail) {
    if (!rail) return [];

    return Array.prototype.slice.call(rail.children).filter(function (child) {
      var rect = child.getBoundingClientRect();

      return (
        visible(child) &&
        rect.width >= 100 &&
        rect.height >= 45 &&
        rect.height <= 90
      );
    });
  }

  function isSelected(element) {
    if (!element) return false;

    var className = String(element.className || '').toLowerCase();

    return (
      element.getAttribute('aria-selected') === 'true' ||
      element.getAttribute('aria-current') === 'true' ||
      element.getAttribute('aria-pressed') === 'true' ||
      className.indexOf('active') !== -1 ||
      className.indexOf('selected') !== -1 ||
      className.indexOf('current') !== -1
    );
  }

  function findNeutralTemplate(leftRail) {
    var buttons = directButtonChildren(leftRail);

    /*
     * Prefer OCCUPIED because it is a standard neutral button.
     */
    var occupied = buttons.find(function (button) {
      return (
        normalize(button.textContent).indexOf('OCCUPIED') !== -1 &&
        !isSelected(button)
      );
    });

    if (occupied) return occupied;

    /*
     * Otherwise use any non-selected button except ALL TABLES.
     */
    return buttons.find(function (button) {
      var text = normalize(button.textContent);

      return (
        !isSelected(button) &&
        text.indexOf('ALL TABLES') === -1
      );
    }) || buttons[1] || buttons[0] || null;
  }

  function removeStateClasses(element) {
    if (!element || !element.classList) return;

    Array.prototype.slice.call(element.classList).forEach(function (name) {
      var lower = name.toLowerCase();

      if (
        lower.indexOf('active') !== -1 ||
        lower.indexOf('selected') !== -1 ||
        lower.indexOf('current') !== -1 ||
        lower.indexOf('pressed') !== -1 ||
        lower.indexOf('checked') !== -1
      ) {
        element.classList.remove(name);
      }
    });

    element.removeAttribute('aria-selected');
    element.removeAttribute('aria-current');
    element.removeAttribute('aria-pressed');
    element.removeAttribute('data-active');
    element.removeAttribute('data-selected');
  }

  function cleanClone(element) {
    if (!element) return;

    element.removeAttribute('id');
    element.removeAttribute('hidden');

    removeStateClasses(element);

    Array.prototype.forEach.call(
      element.querySelectorAll('*'),
      function (child) {
        child.removeAttribute('id');
        removeStateClasses(child);
      }
    );

    [
      'data-v241-filter',
      'data-v2-filter',
      'data-filter',
      'data-v241-count',
      'data-v2-filter-count'
    ].forEach(function (attribute) {
      element.removeAttribute(attribute);

      Array.prototype.forEach.call(
        element.querySelectorAll('[' + attribute + ']'),
        function (child) {
          child.removeAttribute(attribute);
        }
      );
    });
  }

  function styleValue(style, property) {
    return style.getPropertyValue(property);
  }

  function copyComputedBox(source, destination) {
    var sourceStyle = getComputedStyle(source);

    [
      'background',
      'background-color',
      'background-image',
      'border',
      'border-top',
      'border-right',
      'border-bottom',
      'border-left',
      'border-radius',
      'box-shadow',
      'color',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'text-transform',
      'text-align',
      'padding',
      'margin',
      'min-width',
      'max-width',
      'min-height',
      'max-height',
      'box-sizing'
    ].forEach(function (property) {
      var value = styleValue(sourceStyle, property);

      if (value) {
        destination.style.setProperty(
          property,
          value,
          'important'
        );
      }
    });

    var rect = source.getBoundingClientRect();

    destination.style.setProperty(
      'width',
      rect.width + 'px',
      'important'
    );

    destination.style.setProperty(
      'height',
      rect.height + 'px',
      'important'
    );
  }

  function findExistingRightRail() {
    return document.querySelector(
      '.pmd-v280-right-rail,' +
      '.pmd-v279-right-rail,' +
      '.v257-operations-rail,' +
      '.pmd-v257-operations-rail'
    );
  }

  function preserveWorkflowBridge(oldRail) {
    if (!oldRail) return;

    oldRail.dataset.v280WorkflowBridge = '1';
    oldRail.setAttribute('aria-hidden', 'true');

    oldRail.style.setProperty('display', 'none', 'important');
    oldRail.style.setProperty('visibility', 'hidden', 'important');
    oldRail.style.setProperty('pointer-events', 'none', 'important');

    document.body.appendChild(oldRail);

    PMD.workflowBridge = oldRail;
  }

  function findBridgeAction(action) {
    var bridge = PMD.workflowBridge ||
      document.querySelector('[data-v280-workflow-bridge]');

    if (!bridge) return null;

    return bridge.querySelector(
      '[data-v257-action="' + action + '"],' +
      '[data-operation="' + action + '"],' +
      '[data-v243-mode="' + action + '"]'
    );
  }

  function bellMarkup() {
    return (
      '<span class="pmd-v280-bell" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" focusable="false">' +
          '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path>' +
          '<path d="M10 21h4"></path>' +
        '</svg>' +
      '</span>'
    );
  }

  function makeOperationButton(template, operation) {
    var button = template.cloneNode(true);

    cleanClone(button);

    if (button.tagName !== 'BUTTON') {
      var replacement = document.createElement('button');

      replacement.className = button.className;
      button = replacement;
    }

    button.type = 'button';

    button.classList.add(
      'v257-operation',
      'pmd-v280-operation',
      'pmd-v280-operation-' + operation.action
    );

    button.dataset.v257Action = operation.action;
    button.dataset.v280Action = operation.action;

    button.setAttribute(
      'aria-label',
      operation.aria || operation.label
    );

    button.setAttribute(
      'title',
      operation.aria || operation.label
    );

    if (operation.action === 'alerts') {
      button.innerHTML = bellMarkup();
    } else {
      button.innerHTML =
        '<span class="pmd-v280-label">' +
          operation.label +
        '</span>';
    }

    copyComputedBox(template, button);

    /*
     * Apply the operational edge only.
     */
    button.style.setProperty(
      'border-left-color',
      operation.colour,
      'important'
    );

    button.style.setProperty(
      'border-inline-start-color',
      operation.colour,
      'important'
    );

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

    button.style.setProperty(
      'transform',
      'none',
      'important'
    );

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      var bridgeAction = findBridgeAction(operation.action);

      if (bridgeAction) {
        bridgeAction.click();
        return;
      }

      if (operation.action === 'theme') {
        var themeControl = document.querySelector(
          '[data-v221-theme-toggle],' +
          '.pmd-v221-theme-toggle'
        );

        if (themeControl) {
          themeControl.click();
        }

        return;
      }

      if (operation.action === 'alerts') {
        var alertControl = document.querySelector(
          '[data-v2-alerts],' +
          '[data-v271-service-inbox-trigger]'
        );

        if (alertControl) {
          alertControl.click();
        }
      }
    });

    return button;
  }

  function copyRailSurface(leftRail, rightRail) {
    var sourceStyle = getComputedStyle(leftRail);
    var rect = leftRail.getBoundingClientRect();

    rightRail.style.cssText = '';

    rightRail.style.setProperty(
      'background',
      sourceStyle.background,
      'important'
    );

    rightRail.style.setProperty(
      'background-color',
      sourceStyle.backgroundColor,
      'important'
    );

    rightRail.style.setProperty(
      'background-image',
      sourceStyle.backgroundImage,
      'important'
    );

    rightRail.style.setProperty(
      'border',
      sourceStyle.border,
      'important'
    );

    rightRail.style.setProperty(
      'box-shadow',
      sourceStyle.boxShadow,
      'important'
    );

    rightRail.style.setProperty(
      'width',
      rect.width + 'px',
      'important'
    );

    rightRail.style.setProperty(
      'padding',
      sourceStyle.padding,
      'important'
    );

    rightRail.style.setProperty(
      'box-sizing',
      sourceStyle.boxSizing,
      'important'
    );

    rightRail.style.setProperty(
      'position',
      'fixed',
      'important'
    );

    rightRail.style.setProperty(
      'top',
      '0',
      'important'
    );

    rightRail.style.setProperty(
      'right',
      '0',
      'important'
    );

    rightRail.style.setProperty(
      'bottom',
      '0',
      'important'
    );

    rightRail.style.setProperty(
      'left',
      'auto',
      'important'
    );

    rightRail.style.setProperty(
      'margin',
      '0',
      'important'
    );

    rightRail.style.setProperty(
      'overflow-y',
      'auto',
      'important'
    );

    rightRail.style.setProperty(
      'overflow-x',
      'hidden',
      'important'
    );
  }

  function verify(leftRail, template, rightRail) {
    var rightButton = rightRail.querySelector('.pmd-v280-operation');

    console.info('[PMD V2.8.0] Exact rail verification', {
      rail: {
        leftBackground:
          getComputedStyle(leftRail).backgroundColor,
        rightBackground:
          getComputedStyle(rightRail).backgroundColor,
        match:
          getComputedStyle(leftRail).backgroundColor ===
          getComputedStyle(rightRail).backgroundColor,
        leftWidth:
          leftRail.getBoundingClientRect().width,
        rightWidth:
          rightRail.getBoundingClientRect().width
      },
      button: {
        leftBackground:
          getComputedStyle(template).backgroundColor,
        rightBackground:
          rightButton &&
          getComputedStyle(rightButton).backgroundColor,
        match:
          !!rightButton &&
          getComputedStyle(template).backgroundColor ===
          getComputedStyle(rightButton).backgroundColor,
        leftWidth:
          template.getBoundingClientRect().width,
        rightWidth:
          rightButton &&
          rightButton.getBoundingClientRect().width,
        leftHeight:
          template.getBoundingClientRect().height,
        rightHeight:
          rightButton &&
          rightButton.getBoundingClientRect().height
      }
    });
  }

  function build() {
    var leftRail = findLeftRail();

    if (!leftRail) {
      return false;
    }

    var template = findNeutralTemplate(leftRail);

    if (!template) {
      return false;
    }

    /*
     * Remove the V2.7.9 visible clone.
     */
    document.querySelectorAll(
      '.pmd-v279-right-rail,' +
      '.pmd-v280-right-rail'
    ).forEach(function (element) {
      element.remove();
    });

    var existingRight = findExistingRightRail();

    if (
      existingRight &&
      !existingRight.hasAttribute('data-v280-workflow-bridge')
    ) {
      preserveWorkflowBridge(existingRight);
    }

    /*
     * Clone only the real left column shell.
     */
    var rightRail = leftRail.cloneNode(false);

    cleanClone(rightRail);

    rightRail.className = leftRail.className;

    rightRail.classList.add(
      'v257-operations-rail',
      'pmd-v280-right-rail'
    );

    rightRail.removeAttribute('id');
    rightRail.removeAttribute('data-v2-filter-rail');
    rightRail.removeAttribute('data-v241-lifecycle-rail');

    rightRail.dataset.v280ExactRail = '1';
    rightRail.setAttribute('aria-label', 'Table operations');

    copyRailSurface(leftRail, rightRail);

    [
      {
        action: 'alerts',
        label: 'NOTIFICATIONS',
        aria: 'Notifications',
        colour: '#ef2929'
      },
      {
        action: 'available',
        label: 'SET AVAILABLE',
        colour: '#18a957'
      },
      {
        action: 'cleaning',
        label: 'NEEDS CLEANING',
        colour: '#e57b00'
      },
      {
        action: 'merge',
        label: 'MERGE TABLES',
        colour: '#2868ee'
      },
      {
        action: 'theme',
        label: 'MODE',
        aria: 'Switch colour mode',
        colour: '#526177'
      }
    ].forEach(function (operation) {
      rightRail.appendChild(
        makeOperationButton(template, operation)
      );
    });

    document.body.appendChild(rightRail);

    PMD.rail = rightRail;

    verify(leftRail, template, rightRail);

    return true;
  }

  function scheduleBuild() {
    clearTimeout(PMD.buildTimer);

    PMD.buildTimer = setTimeout(function () {
      build();
    }, 80);
  }

  function start() {
    build();

    /*
     * Rebuild only when the actual theme attribute changes.
     */
    PMD.themeObserver = new MutationObserver(function (mutations) {
      var changed = mutations.some(function (mutation) {
        return (
          mutation.type === 'attributes' &&
          (
            mutation.attributeName === 'data-pmd-pos-theme' ||
            mutation.attributeName === 'class'
          )
        );
      });

      if (changed) {
        scheduleBuild();
      }
    });

    PMD.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-pmd-pos-theme',
        'class'
      ]
    });

    console.info(
      '[PMD] Waiter V2.8.0 exact neutral right rail active'
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
