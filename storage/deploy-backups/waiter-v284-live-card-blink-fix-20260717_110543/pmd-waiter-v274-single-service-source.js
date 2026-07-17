(function () {
  'use strict';

  if (window.PMDWaiterV274) return;

  /* --------------------------------------------------------
     Stop every previous badge renderer
     -------------------------------------------------------- */

  [
    'PMDWaiterV272',
    'PMDWaiterV273'
  ].forEach(function (name) {
    var previous = window[name];

    if (!previous) return;

    if (previous.timer) {
      clearInterval(previous.timer);
      clearTimeout(previous.timer);
      previous.timer = null;
    }

    if (previous.refreshTimer) {
      clearInterval(previous.refreshTimer);
      clearTimeout(previous.refreshTimer);
      previous.refreshTimer = null;
    }

    if (
      previous.observer &&
      typeof previous.observer.disconnect === 'function'
    ) {
      previous.observer.disconnect();
      previous.observer = null;
    }
  });

  var PMD = window.PMDWaiterV274 = {
    version: '2.7.4',
    timer: null,
    observer: null
  };

  var CARD_SELECTOR = [
    'button[data-v2-open-table]',
    'button[data-final-open-table]',
    'button[data-v21-number]',
    'button.pmd-v2-table-key',
    'button.pmd-v21-table-key'
  ].join(',');

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cardIdentity(card) {
    var numberNode = card.querySelector(
      ':scope > strong,' +
      '.pmd-v2-table-number,' +
      '.pmd-final-table-number,' +
      '[data-v2-table-number]'
    );

    return {
      id: clean(
        card.getAttribute('data-v271-table-id') ||
        card.getAttribute('data-v2-open-table') ||
        card.getAttribute('data-final-open-table') ||
        card.getAttribute('data-table-id')
      ),

      number: clean(
        card.getAttribute('data-v271-table-number') ||
        card.getAttribute('data-v21-number') ||
        (numberNode ? numberNode.textContent : '')
      ).replace(/^table\s*/i, '')
    };
  }

  function eventsFor(card, category) {
    var identity = cardIdentity(card);

    var events =
      window.PMDWaiterV271 &&
      Array.isArray(window.PMDWaiterV271.events)
        ? window.PMDWaiterV271.events
        : [];

    var unique = new Map();

    events.forEach(function (event) {
      if (!event || event.category !== category) return;

      var eventTableId = clean(event.tableId);
      var eventTableNumber = clean(event.tableNumber)
        .replace(/^table\s*/i, '');

      var matches =
        (
          identity.id &&
          eventTableId &&
          identity.id === eventTableId
        ) ||
        (
          identity.number &&
          eventTableNumber &&
          identity.number === eventTableNumber
        );

      if (!matches) return;

      /*
       * Prefer a real notification ID.
       * Otherwise deduplicate by table, title and message.
       */
      var key = clean(event.id);

      if (!key) {
        key = [
          category,
          eventTableId || eventTableNumber,
          clean(event.title).toLowerCase(),
          clean(event.message).toLowerCase()
        ].join('|');
      }

      unique.set(key, event);
    });

    return Array.from(unique.values());
  }

  function isGeneratedByV274(element) {
    return Boolean(
      element.closest('[data-v274-service-tray]') ||
      element.hasAttribute('data-v274-note') ||
      element.hasAttribute('data-v274-call')
    );
  }

  function serviceText(element) {
    return clean(element.textContent)
      .replace(/\b\d+\b/g, '')
      .replace(/[()]/g, '')
      .trim()
      .toLowerCase();
  }

  function isOldServiceControl(element) {
    if (!element || !element.matches) return false;
    if (isGeneratedByV274(element)) return false;

    if (
      element.matches([
        '[data-v272-note]',
        '[data-v272-call]',
        '[data-v273-note]',
        '[data-v273-call]',
        '[data-v271-open-note]',
        '[data-v271-open-call]',
        '[data-note-action]',
        '[data-waiter-call-action]',
        '.pmd-v271-note-button',
        '.pmd-v271-call-button',
        '.pmd-v272-alert-badge',
        '.pmd-v242-note-action',
        '.pmd-v241-note'
      ].join(','))
    ) {
      return true;
    }

    var text = serviceText(element);

    return (
      text === 'note' ||
      text === 'call' ||
      text === 'waiter call'
    );
  }

  function removeEveryOldBadge(card) {
    /*
     * Remove complete old trays first.
     */
    card.querySelectorAll(
      '.pmd-v272-card-alerts:not([data-v274-service-tray]),' +
      '.pmd-v271-card-alerts,' +
      '[data-v273-service-tray]'
    ).forEach(function (element) {
      element.remove();
    });

    /*
     * Scan recursively, not only direct children.
     */
    Array.prototype.slice.call(
      card.querySelectorAll('button, a, span, div')
    )
      .reverse()
      .forEach(function (element) {
        if (isOldServiceControl(element)) {
          element.remove();
        }
      });
  }

  function findOpenOrder(card) {
    return Array.prototype.slice.call(
      card.querySelectorAll('button, a, span')
    ).find(function (element) {
      return /^open\s+order$/i.test(clean(element.textContent));
    }) || null;
  }

  function createTray(card) {
    var trays = Array.prototype.slice.call(
      card.querySelectorAll('[data-v274-service-tray]')
    );

    var tray = trays.shift() || null;

    trays.forEach(function (duplicate) {
      duplicate.remove();
    });

    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'pmd-v274-service-tray';
      tray.setAttribute('data-v274-service-tray', '1');

      var openOrder = findOpenOrder(card);

      if (openOrder) {
        openOrder.insertAdjacentElement('afterend', tray);
      } else {
        card.appendChild(tray);
      }
    }

    tray.replaceChildren();

    return tray;
  }

  function createBadge(type, count) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className =
      'pmd-v274-service-badge is-' + type;

    button.setAttribute(
      type === 'note'
        ? 'data-v274-note'
        : 'data-v274-call',
      '1'
    );

    button.setAttribute(
      'aria-label',
      type === 'note'
        ? 'Read table notes'
        : 'Open waiter calls'
    );

    var label = document.createElement('span');
    label.textContent = type === 'note' ? 'NOTE' : 'CALL';
    button.appendChild(label);

    if (count > 1) {
      var counter = document.createElement('b');
      counter.textContent = String(count);
      button.appendChild(counter);
    }

    return button;
  }

  function decorateCard(card) {
    if (!card || !card.isConnected) return;

    var notes = eventsFor(card, 'note');
    var calls = eventsFor(card, 'call');

    removeEveryOldBadge(card);

    var tray = createTray(card);

    if (calls.length) {
      tray.appendChild(createBadge('call', calls.length));
    }

    if (notes.length) {
      tray.appendChild(createBadge('note', notes.length));
    }

    if (!calls.length && !notes.length) {
      tray.remove();
    }

    card.classList.toggle(
      'pmd-v274-has-service',
      calls.length > 0 || notes.length > 0
    );

    card.setAttribute(
      'data-v274-call-count',
      String(calls.length)
    );

    card.setAttribute(
      'data-v274-note-count',
      String(notes.length)
    );
  }

  function refresh() {
    document.querySelectorAll(CARD_SELECTOR)
      .forEach(decorateCard);
  }

  function openServiceInbox(tab, card) {
    var identity = cardIdentity(card);

    if (
      window.PMDWaiterV271 &&
      typeof window.PMDWaiterV271.openInbox === 'function'
    ) {
      window.PMDWaiterV271.openInbox(tab);
    } else {
      var railButton = Array.prototype.slice.call(
        document.querySelectorAll('button')
      ).find(function (button) {
        var text = clean(button.textContent)
          .replace(/\d+/g, '')
          .trim()
          .toLowerCase();

        return tab === 'notes'
          ? text === 'notes'
          : text === 'waiter calls';
      });

      if (railButton) railButton.click();
    }

    setTimeout(function () {
      var relatedRow = Array.prototype.slice.call(
        document.querySelectorAll('.pmd-v271-event')
      ).find(function (row) {
        var rowId = clean(
          row.getAttribute('data-v271-event-table-id')
        );

        var rowNumber = clean(
          row.getAttribute('data-v271-event-table-number')
        ).replace(/^table\s*/i, '');

        return (
          identity.id &&
          rowId &&
          identity.id === rowId
        ) || (
          identity.number &&
          rowNumber &&
          identity.number === rowNumber
        );
      });

      if (relatedRow) {
        relatedRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }

  document.addEventListener('click', function (event) {
    var note = event.target.closest('[data-v274-note]');

    if (note) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var noteCard = note.closest(CARD_SELECTOR);

      if (noteCard) {
        openServiceInbox('notes', noteCard);
      }

      return;
    }

    var call = event.target.closest('[data-v274-call]');

    if (call) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var callCard = call.closest(CARD_SELECTOR);

      if (callCard) {
        openServiceInbox('calls', callCard);
      }
    }
  }, true);

  function boot() {
    refresh();

    PMD.observer = new MutationObserver(function (mutations) {
      var needsRefresh = mutations.some(function (mutation) {
        return Array.prototype.some.call(
          mutation.addedNodes,
          function (node) {
            return (
              node.nodeType === 1 &&
              (
                node.matches?.(CARD_SELECTOR) ||
                node.querySelector?.(CARD_SELECTOR)
              )
            );
          }
        );
      });

      if (needsRefresh) {
        requestAnimationFrame(refresh);
      }
    });

    var grid = document.querySelector(
      '[data-v2-table-grid],' +
      '.pmd-v2-table-grid,' +
      '.pmd-v21-table-grid'
    );

    if (grid) {
      PMD.observer.observe(grid, {
        childList: true,
        subtree: true
      });
    }

    /*
     * Reconcile live notification data without rebuilding cards.
     */
    PMD.timer = setInterval(refresh, 2000);

    console.info(
      '[PMD] Waiter V2.7.4 single service source active'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
