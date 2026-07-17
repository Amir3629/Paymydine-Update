(function () {
  'use strict';

  if (window.PMDWaiterV279) return;

  /*
   * Stop the obsolete right-rail synchronizers.
   */
  [
    'PMDWaiterV276',
    'PMDWaiterV277',
    'PMDWaiterV278'
  ].forEach(function (name) {
    var instance = window[name];

    if (!instance) return;

    [
      'timer',
      'refreshTimer',
      'syncTimer'
    ].forEach(function (key) {
      if (!instance[key]) return;

      clearTimeout(instance[key]);
      clearInterval(instance[key]);
      instance[key] = null;
    });

    if (
      instance.observer &&
      typeof instance.observer.disconnect === 'function'
    ) {
      instance.observer.disconnect();
      instance.observer = null;
    }
  });

  var PMD = window.PMDWaiterV279 = {
    version: '2.7.9',
    observer: null,
    rebuildTimer: null,
    oldRail: null,
    rail: null
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
      var text = normalize(element.textContent);

      return (
        rect.left <= 20 &&
        rect.width >= 110 &&
        rect.width <= 160 &&
        rect.height >= 500 &&
        text.indexOf('ALL TABLES') !== -1 &&
        text.indexOf('AVAILABLE') !== -1 &&
        text.indexOf('OCCUPIED') !== -1 &&
        text.indexOf('CLEANING') !== -1 &&
        text.indexOf('NOTES') !== -1
      );
    }) || null;
  }

  function findLeftTemplate(leftRail) {
    if (!leftRail) return null;

    var children = Array.prototype.slice.call(leftRail.children);

    return children.find(function (child) {
      var rect = child.getBoundingClientRect();
      var text = normalize(child.textContent);

      return (
        rect.width >= 100 &&
        rect.height >= 45 &&
        text.indexOf('AVAILABLE') !== -1
      );
    }) || children.find(function (child) {
      var rect = child.getBoundingClientRect();

      return rect.width >= 100 && rect.height >= 45;
    }) || null;
  }

  function findExistingRightRail() {
    return document.querySelector(
      '.pmd-v279-right-rail,' +
      '.v257-operations-rail,' +
      '.pmd-v257-operations-rail'
    );
  }

  function findOldAction(action) {
    return document.querySelector(
      '[data-v279-old-right-rail] [data-v257-action="' + action + '"],' +
      '[data-v279-old-right-rail] [data-operation="' + action + '"],' +
      '[data-v279-old-right-rail] [data-v243-mode="' + action + '"]'
    );
  }

  function cleanClone(element) {
    if (!element) return;

    element.removeAttribute('id');
    element.removeAttribute('hidden');
    element.removeAttribute('aria-current');
    element.removeAttribute('aria-selected');
    element.removeAttribute('data-v241-filter');
    element.removeAttribute('data-v2-filter');
    element.removeAttribute('data-filter');
    element.removeAttribute('data-v279-clone');

    Array.prototype.forEach.call(
      element.querySelectorAll('[id]'),
      function (child) {
        child.removeAttribute('id');
      }
    );

    Array.prototype.forEach.call(
      element.querySelectorAll(
        'b, small, i, svg, span, strong'
      ),
      function (child) {
        child.removeAttribute('data-v2-filter-count');
        child.removeAttribute('data-v241-count');
      }
    );
  }

  function bellMarkup() {
    return (
      '<span class="pmd-v279-bell" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" focusable="false">' +
          '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path>' +
          '<path d="M10 21h4"></path>' +
        '</svg>' +
      '</span>'
    );
  }

  function setButtonContent(button, operation) {
    if (operation.action === 'alerts') {
      button.innerHTML = bellMarkup();
      return;
    }

    /*
     * Keep the same uncomplicated structure used by the left rail:
     * label on the left; no dots and no counters.
     */
    button.innerHTML =
      '<span class="pmd-v279-operation-label">' +
        operation.label +
      '</span>';
  }

  function makeButton(template, operation) {
    var button;

    /*
     * Clone the real visible left-rail button.
     */
    if (template) {
      button = template.cloneNode(true);
    } else {
      button = document.createElement('button');
    }

    cleanClone(button);

    if (button.tagName !== 'BUTTON') {
      var replacement = document.createElement('button');

      replacement.className = button.className;
      replacement.setAttribute(
        'style',
        button.getAttribute('style') || ''
      );

      button = replacement;
    }

    button.type = 'button';
    button.dataset.v257Action = operation.action;
    button.dataset.v279Clone = '1';
    button.dataset.v279Operation = operation.action;

    button.classList.add(
      'v257-operation',
      'pmd-v279-operation',
      'pmd-v279-operation-' + operation.action
    );

    button.setAttribute('aria-label', operation.aria || operation.label);
    button.setAttribute('title', operation.aria || operation.label);

    setButtonContent(button, operation);

    button.style.setProperty('transition', 'none', 'important');
    button.style.setProperty('animation', 'none', 'important');
    button.style.setProperty('transform', 'none', 'important');

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      var oldAction = findOldAction(operation.action);

      /*
       * Use the existing proven workflow whenever it exists.
       */
      if (oldAction) {
        oldAction.click();
        return;
      }

      /*
       * Safe fallbacks for controls whose old element was removed.
       */
      if (operation.action === 'theme') {
        var engine = document.querySelector(
          '[data-v221-theme-toggle],' +
          '.pmd-v221-theme-toggle'
        );

        if (engine) {
          engine.click();
          return;
        }
      }

      if (operation.action === 'alerts') {
        var alerts = document.querySelector(
          '[data-v2-alerts],' +
          '[data-v271-service-inbox-trigger]'
        );

        if (alerts) {
          alerts.click();
        }
      }
    });

    return button;
  }

  function copyRailIdentity(leftRail, rightRail) {
    /*
     * This is the important part:
     * the new right rail receives the actual left rail's classes.
     */
    rightRail.className = leftRail.className;

    rightRail.classList.add(
      'v257-operations-rail',
      'pmd-v279-right-rail'
    );

    rightRail.removeAttribute('id');
    rightRail.removeAttribute('data-v2-filter-rail');
    rightRail.removeAttribute('data-v241-lifecycle-rail');

    rightRail.setAttribute(
      'aria-label',
      'Table operations'
    );

    rightRail.dataset.v279RealClone = '1';
  }

  function preserveOldRail(oldRail) {
    if (!oldRail) return;

    oldRail.dataset.v279OldRightRail = '1';
    oldRail.setAttribute('aria-hidden', 'true');

    oldRail.style.setProperty('display', 'none', 'important');
    oldRail.style.setProperty('visibility', 'hidden', 'important');
    oldRail.style.setProperty('pointer-events', 'none', 'important');

    /*
     * Keep it only as an invisible workflow bridge.
     */
    document.body.appendChild(oldRail);
    PMD.oldRail = oldRail;
  }

  function build() {
    var leftRail = findLeftRail();

    if (!leftRail) {
      return false;
    }

    var currentRight = findExistingRightRail();

    if (
      currentRight &&
      currentRight.dataset.v279RealClone === '1'
    ) {
      PMD.rail = currentRight;
      return true;
    }

    var template = findLeftTemplate(leftRail);
    var newRail = leftRail.cloneNode(false);

    cleanClone(newRail);
    copyRailIdentity(leftRail, newRail);

    var operations = [
      {
        action: 'alerts',
        label: 'NOTIFICATIONS',
        aria: 'Notifications'
      },
      {
        action: 'available',
        label: 'SET AVAILABLE'
      },
      {
        action: 'cleaning',
        label: 'NEEDS CLEANING'
      },
      {
        action: 'merge',
        label: 'MERGE TABLES'
      },
      {
        action: 'theme',
        label: 'MODE',
        aria: 'Switch colour mode'
      }
    ];

    operations.forEach(function (operation) {
      newRail.appendChild(
        makeButton(template, operation)
      );
    });

    if (currentRight) {
      currentRight.parentNode.insertBefore(
        newRail,
        currentRight
      );

      preserveOldRail(currentRight);
    } else {
      document.body.appendChild(newRail);
    }

    PMD.rail = newRail;

    console.info(
      '[PMD V2.7.9] Real left rail cloned to right',
      {
        leftClass: leftRail.className,
        rightClass: newRail.className,
        leftBackground:
          getComputedStyle(leftRail).backgroundColor,
        rightBackground:
          getComputedStyle(newRail).backgroundColor,
        leftWidth:
          leftRail.getBoundingClientRect().width,
        rightWidth:
          newRail.getBoundingClientRect().width,
        buttons:
          newRail.querySelectorAll('.pmd-v279-operation').length
      }
    );

    return true;
  }

  function scheduleBuild() {
    clearTimeout(PMD.rebuildTimer);

    PMD.rebuildTimer = setTimeout(function () {
      build();
    }, 40);
  }

  function start() {
    build();

    /*
     * Rebuild only if another legacy script removes our cloned rail.
     * Do not observe attributes or styles.
     */
    PMD.observer = new MutationObserver(function (mutations) {
      var removed = mutations.some(function (mutation) {
        return Array.prototype.some.call(
          mutation.removedNodes || [],
          function (node) {
            return (
              node === PMD.rail ||
              (
                node.nodeType === 1 &&
                node.querySelector &&
                node.querySelector('.pmd-v279-right-rail')
              )
            );
          }
        );
      });

      if (removed) {
        scheduleBuild();
      }
    });

    PMD.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.info(
      '[PMD] Waiter V2.7.9 real cloned right rail active'
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
