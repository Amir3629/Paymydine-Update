(function () {
  'use strict';

  if (window.PMDWaiterV271) return;

  var PMD = window.PMDWaiterV271 = {
    version: '2.7.1',
    events: [],
    dashboard: null,
    activeTab: 'calls',
    open: false,
    refreshTimer: null
  };

  var NOTIFICATIONS_URL = '/admin/notifications-api?limit=100';
  var DASHBOARD_URL = '/admin/pmd-waiter-dashboard-v9-tenant-data';

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c];
    });
  }

  function fetchJson(url) {
    var separator = url.indexOf('?') === -1 ? '?' : '&';

    return fetch(url + separator + '_=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok) {
          throw new Error(
            clean(payload.message || payload.error) ||
            'HTTP ' + response.status
          );
        }

        return payload;
      });
    });
  }

  function parsePayload(value) {
    if (!value) return {};

    if (typeof value === 'object') return value;

    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }

  function tableNumberFromObject(item, payload) {
    return clean(
      item.table_number ||
      item.table_no ||
      item.table ||
      payload.table_number ||
      payload.table_no ||
      payload.table ||
      payload.table_name ||
      ''
    ).replace(/^table\s*/i, '');
  }

  function tableIdFromObject(item, payload) {
    return clean(
      item.table_id ||
      item.location_table_id ||
      payload.table_id ||
      payload.location_table_id ||
      ''
    );
  }

  function classifyEvent(item, payload) {
    var haystack = lower([
      item.type,
      item.title,
      item.message,
      payload.type,
      payload.event,
      payload.title,
      payload.message,
      payload.status,
      payload.action
    ].join(' '));

    if (
      /waiter.?call|call.?waiter|guest.?request|service.?request/.test(haystack)
    ) {
      return 'call';
    }

    if (
      /order.?note|customer.?note|guest.?note|item.?note|\bnote\b/.test(haystack)
    ) {
      return 'note';
    }

    if (/payment|paid|refund|settlement|cash|card/.test(haystack)) {
      return 'payment';
    }

    if (/cancel|void|rejected/.test(haystack)) {
      return 'cancel';
    }

    if (/stock|sold.?out|available.?again/.test(haystack)) {
      return 'stock';
    }

    if (/order|kitchen|ready|serve/.test(haystack)) {
      return 'order';
    }

    return 'activity';
  }

  function normalizeNotification(item) {
    var payload = parsePayload(item.payload);

    return {
      id: clean(item.id || payload.id || Math.random()),
      category: classifyEvent(item, payload),
      tableId: tableIdFromObject(item, payload),
      tableNumber: tableNumberFromObject(item, payload),
      title: clean(
        item.title ||
        payload.title ||
        item.type ||
        payload.type ||
        'Service update'
      ),
      message: clean(
        item.message ||
        payload.message ||
        payload.note ||
        payload.comment ||
        payload.status_name ||
        payload.status ||
        ''
      ),
      time: clean(
        item.created_at ||
        item.updated_at ||
        payload.created_at ||
        payload.updated_at ||
        ''
      ),
      source: 'notification'
    };
  }

  function orderTableNumber(order) {
    return clean(
      order.table_number ||
      order.table_no ||
      order.table ||
      ''
    ).replace(/^table\s*/i, '');
  }

  function orderTableId(order) {
    return clean(
      order.table_id ||
      order.location_table_id ||
      ''
    );
  }

  function collectOrderNotes(payload) {
    var orders = Array.isArray(payload.orders)
      ? payload.orders
      : Array.isArray(payload.current_orders)
        ? payload.current_orders
        : [];

    var rows = [];

    orders.forEach(function (order) {
      var notes = [];

      [
        order.note,
        order.comment,
        order.order_note,
        order.customer_note,
        order.service_note
      ].forEach(function (value) {
        if (clean(value)) notes.push(clean(value));
      });

      if (Array.isArray(order.item_notes)) {
        order.item_notes.forEach(function (note) {
          if (typeof note === 'string' && clean(note)) {
            notes.push(clean(note));
          } else if (note && clean(note.note || note.comment)) {
            notes.push(clean(note.note || note.comment));
          }
        });
      }

      notes.forEach(function (note, index) {
        rows.push({
          id: 'order-note-' + clean(order.id || order.order_id) + '-' + index,
          category: 'note',
          tableId: orderTableId(order),
          tableNumber: orderTableNumber(order),
          title: 'ORDER NOTE',
          message: note,
          time: clean(order.updated_at || order.created_at || ''),
          source: 'order'
        });
      });
    });

    return rows;
  }

  function collectTableCalls(payload) {
    var tables = Array.isArray(payload.tables)
      ? payload.tables
      : [];

    return tables.filter(function (table) {
      var status = lower(
        table.status ||
        table.attention_type ||
        table.service_status ||
        ''
      );

      return (
        table.waiter_call === true ||
        table.waiter_call === 1 ||
        table.waiter_call === '1' ||
        table.needs_waiter === true ||
        table.needs_waiter === 1 ||
        table.needs_waiter === '1' ||
        table.call_waiter === true ||
        table.call_waiter === 1 ||
        table.call_waiter === '1' ||
        /waiter.?call|guest.?request/.test(status)
      );
    }).map(function (table) {
      return {
        id: 'table-call-' + clean(table.id || table.table_id),
        category: 'call',
        tableId: clean(table.id || table.table_id),
        tableNumber: clean(
          table.number ||
          table.table_number ||
          table.table_no
        ),
        title: 'WAITER CALL',
        message: clean(
          table.waiter_call_message ||
          table.service_message ||
          table.message ||
          'Guest requested waiter assistance.'
        ),
        time: clean(table.updated_at || ''),
        source: 'table'
      };
    });
  }

  function uniqueEvents(rows) {
    var seen = {};

    return rows.filter(function (row) {
      var key = [
        row.category,
        row.tableId || row.tableNumber,
        lower(row.message),
        row.id
      ].join('|');

      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function eventTimestamp(event) {
    var parsed = Date.parse(event.time || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function loadData() {
    return Promise.allSettled([
      fetchJson(NOTIFICATIONS_URL),
      fetchJson(DASHBOARD_URL)
    ]).then(function (results) {
      var notificationPayload =
        results[0].status === 'fulfilled' ? results[0].value : {};

      var dashboardPayload =
        results[1].status === 'fulfilled' ? results[1].value : {};

      var notifications = Array.isArray(notificationPayload.items)
        ? notificationPayload.items
        : Array.isArray(notificationPayload.notifications)
          ? notificationPayload.notifications
          : Array.isArray(notificationPayload.data)
            ? notificationPayload.data
            : [];

      PMD.dashboard = dashboardPayload;

      PMD.events = uniqueEvents(
        notifications.map(normalizeNotification)
          .concat(collectOrderNotes(dashboardPayload))
          .concat(collectTableCalls(dashboardPayload))
      ).sort(function (a, b) {
        return eventTimestamp(b) - eventTimestamp(a);
      });

      updateWaiterCalls();
      updateNoteCount();
      decorateCards();
      renderInbox();
    }).catch(function (error) {
      console.error('[PMD V2.7.1] Service inbox refresh failed', error);
    });
  }

  function findButtonByText(pattern, scope) {
    var buttons = Array.prototype.slice.call(
      (scope || document).querySelectorAll('button')
    );

    return buttons.find(function (button) {
      return pattern.test(
        clean(button.textContent).replace(/\d+/g, '')
      );
    }) || null;
  }

  function setButtonCount(button, value) {
    if (!button) return;

    var count = button.querySelector('b');

    if (!count) {
      count = document.createElement('b');
      button.appendChild(count);
    }

    count.textContent = String(value);
  }

  function activeCalls() {
    return PMD.events.filter(function (event) {
      return event.category === 'call';
    });
  }

  function activeNotes() {
    return PMD.events.filter(function (event) {
      return event.category === 'note';
    });
  }

  function updateWaiterCalls() {
    var button = findButtonByText(/^waiter\s*calls?$/i);
    setButtonCount(button, activeCalls().length);
  }

  function updateNoteCount() {
    var button = findButtonByText(/^notes?$/i);
    setButtonCount(button, activeNotes().length);
  }

  function tableCards() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '[data-v2-open-table],' +
      '[data-final-open-table],' +
      '[data-v21-number],' +
      '.pmd-v2-table-key,' +
      '.pmd-v21-table-key'
    ));
  }

  function cardTableIdentity(card) {
    var bigNumber = card.querySelector(
      '.pmd-v2-table-number,' +
      '.pmd-final-table-number,' +
      ':scope > strong'
    );

    return {
      id: clean(
        card.getAttribute('data-v2-open-table') ||
        card.getAttribute('data-final-open-table') ||
        card.getAttribute('data-table-id') ||
        ''
      ),
      number: clean(
        card.getAttribute('data-v21-number') ||
        (bigNumber && bigNumber.textContent) ||
        ''
      ).replace(/^table\s*/i, '')
    };
  }

  function matchingEvents(identity, category) {
    return PMD.events.filter(function (event) {
      if (category && event.category !== category) return false;

      if (identity.id && event.tableId && identity.id === event.tableId) {
        return true;
      }

      return (
        identity.number &&
        event.tableNumber &&
        identity.number === event.tableNumber
      );
    });
  }

  function decorateCards() {
    tableCards().forEach(function (card) {
      var identity = cardTableIdentity(card);
      var calls = matchingEvents(identity, 'call');
      var notes = matchingEvents(identity, 'note');

      card.classList.toggle('pmd-v271-has-call', calls.length > 0);
      card.classList.toggle('pmd-v271-has-note', notes.length > 0);

      card.dataset.v271TableId = identity.id;
      card.dataset.v271TableNumber = identity.number;

      var noteButton = card.querySelector(
        '[data-v271-open-note], .pmd-v271-note-button'
      );

      if (notes.length && !noteButton) {
        noteButton = document.createElement('span');
        noteButton.className = 'pmd-v271-note-button';
        noteButton.setAttribute('data-v271-open-note', '1');
        noteButton.setAttribute('role', 'button');
        noteButton.setAttribute('tabindex', '0');
        noteButton.textContent = 'NOTE';
        card.appendChild(noteButton);
      }

      if (noteButton) {
        noteButton.hidden = notes.length < 1;
      }
    });
  }

  function centralHost() {
    return (
      document.querySelector('.pmd-v2-main') ||
      document.querySelector('.pmd-v2-content') ||
      document.querySelector('.pmd-v2-floor-main') ||
      document.querySelector('[data-v2-table-grid]')?.parentElement ||
      document.querySelector('.pmd-v2-table-grid')?.parentElement
    );
  }

  function ensureInbox() {
    var current = document.querySelector('[data-v271-service-inbox]');

    if (current) return current;

    var host = centralHost();

    if (!host) return null;

    var inbox = document.createElement('section');
    inbox.className = 'pmd-v271-service-inbox';
    inbox.setAttribute('data-v271-service-inbox', '1');
    inbox.hidden = true;

    inbox.innerHTML =
      '<div class="pmd-v271-inbox-head">' +
        '<div>' +
          '<small>LIVE SERVICE</small>' +
          '<strong>SERVICE INBOX</strong>' +
        '</div>' +
        '<button type="button" data-v271-close aria-label="Close">×</button>' +
      '</div>' +
      '<nav class="pmd-v271-tabs">' +
        '<button type="button" data-v271-tab="calls">WAITER CALLS <b>0</b></button>' +
        '<button type="button" data-v271-tab="notes">NOTES <b>0</b></button>' +
        '<button type="button" data-v271-tab="activity">ALL ACTIVITY <b>0</b></button>' +
      '</nav>' +
      '<div class="pmd-v271-event-list" data-v271-event-list></div>';

    host.appendChild(inbox);
    return inbox;
  }

  function normalFloorElements() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '[data-v2-table-grid],' +
      '.pmd-v2-table-grid,' +
      '.pmd-v2-areas,' +
      '[data-v2-areas]'
    ));
  }

  function setFloorHidden(hidden) {
    normalFloorElements().forEach(function (element) {
      element.classList.toggle('pmd-v271-floor-hidden', hidden);
    });
  }

  function filteredEvents() {
    if (PMD.activeTab === 'calls') return activeCalls();
    if (PMD.activeTab === 'notes') return activeNotes();
    return PMD.events;
  }

  function iconFor(category) {
    if (category === 'call') return '!';
    if (category === 'note') return 'N';
    if (category === 'payment') return '€';
    if (category === 'cancel') return '×';
    if (category === 'stock') return 'S';
    if (category === 'order') return 'O';
    return '•';
  }

  function formatTime(value) {
    if (!value) return '';

    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function eventMarkup(event) {
    var tableLabel = event.tableNumber
      ? 'TABLE ' + event.tableNumber
      : 'GENERAL';

    return (
      '<button type="button" class="pmd-v271-event is-' +
        escapeHtml(event.category) +
        '" data-v271-event-table-id="' + escapeHtml(event.tableId) +
        '" data-v271-event-table-number="' + escapeHtml(event.tableNumber) +
      '">' +
        '<span class="pmd-v271-event-icon">' +
          escapeHtml(iconFor(event.category)) +
        '</span>' +
        '<span class="pmd-v271-event-copy">' +
          '<small>' + escapeHtml(tableLabel) + '</small>' +
          '<strong>' + escapeHtml(event.title) + '</strong>' +
          '<span>' +
            escapeHtml(event.message || 'Service update') +
          '</span>' +
        '</span>' +
        '<time>' + escapeHtml(formatTime(event.time)) + '</time>' +
        '<i>' + (event.tableId || event.tableNumber ? '›' : '') + '</i>' +
      '</button>'
    );
  }

  function renderInbox() {
    var inbox = ensureInbox();

    if (!inbox) return;

    inbox.querySelectorAll('[data-v271-tab]').forEach(function (button) {
      var tab = button.getAttribute('data-v271-tab');
      button.classList.toggle('is-active', tab === PMD.activeTab);

      var count = button.querySelector('b');

      if (count) {
        count.textContent =
          tab === 'calls' ? activeCalls().length :
          tab === 'notes' ? activeNotes().length :
          PMD.events.length;
      }
    });

    var list = inbox.querySelector('[data-v271-event-list]');
    var rows = filteredEvents();

    list.innerHTML = rows.length
      ? rows.map(eventMarkup).join('')
      : (
        '<div class="pmd-v271-empty">' +
          '<strong>ALL CLEAR</strong>' +
          '<span>No active items in this section.</span>' +
        '</div>'
      );
  }

  function openInbox(tab) {
    var inbox = ensureInbox();

    if (!inbox) return;

    PMD.activeTab = tab || 'activity';
    PMD.open = true;

    setFloorHidden(true);
    inbox.hidden = false;
    renderInbox();
    loadData();
  }

  function closeInbox() {
    var inbox = ensureInbox();

    PMD.open = false;

    if (inbox) inbox.hidden = true;
    setFloorHidden(false);
  }

  function findTableCard(tableId, tableNumber) {
    return tableCards().find(function (card) {
      var identity = cardTableIdentity(card);

      if (tableId && identity.id === tableId) return true;
      return tableNumber && identity.number === tableNumber;
    }) || null;
  }

  function openTable(tableId, tableNumber) {
    var card = findTableCard(tableId, tableNumber);

    closeInbox();

    if (card) {
      card.click();
    }
  }

  function notificationButton() {
    return (
      document.querySelector(
        '.v257-operations-rail [data-v257-operation="notifications"]'
      ) ||
      document.querySelector(
        '.pmd-v257-operations-rail [data-v257-operation="notifications"]'
      ) ||
      document.querySelector('[data-v2-alerts]')
    );
  }

  document.addEventListener('click', function (event) {
    var target = event.target;

    var close = target.closest('[data-v271-close]');

    if (close) {
      event.preventDefault();
      closeInbox();
      return;
    }

    var tab = target.closest('[data-v271-tab]');

    if (tab) {
      event.preventDefault();
      PMD.activeTab = tab.getAttribute('data-v271-tab');
      renderInbox();
      return;
    }

    var row = target.closest('[data-v271-event-table-id]');

    if (row) {
      event.preventDefault();

      openTable(
        row.getAttribute('data-v271-event-table-id'),
        row.getAttribute('data-v271-event-table-number')
      );
      return;
    }

    var note = target.closest('[data-v271-open-note]');

    if (note) {
      event.preventDefault();
      event.stopPropagation();

      var card = note.closest(
        '[data-v2-open-table],' +
        '[data-final-open-table],' +
        '.pmd-v2-table-key'
      );

      var identity = card ? cardTableIdentity(card) : {};

      PMD.activeTab = 'notes';
      openInbox('notes');

      setTimeout(function () {
        var matching = Array.prototype.slice.call(
          document.querySelectorAll('.pmd-v271-event')
        ).find(function (row) {
          return (
            (identity.id &&
             row.getAttribute('data-v271-event-table-id') === identity.id) ||
            (identity.number &&
             row.getAttribute('data-v271-event-table-number') === identity.number)
          );
        });

        if (matching) {
          matching.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
          });
          matching.classList.add('is-highlighted');

          setTimeout(function () {
            matching.classList.remove('is-highlighted');
          }, 1800);
        }
      }, 50);

      return;
    }

    var button = target.closest('button');

    if (button) {
      var text = clean(button.textContent).replace(/\d+/g, '');

      if (/^waiter\s*calls?$/i.test(text)) {
        event.preventDefault();
        event.stopPropagation();
        openInbox('calls');
        return;
      }

      if (/^notes?$/i.test(text)) {
        event.preventDefault();
        event.stopPropagation();
        openInbox('notes');
        return;
      }
    }

    var bell = notificationButton();

    if (bell && (target === bell || bell.contains(target))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openInbox('activity');
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && PMD.open) {
      closeInbox();
    }

    if (
      (event.key === 'Enter' || event.key === ' ') &&
      event.target.closest('[data-v271-open-note]')
    ) {
      event.preventDefault();
      event.target.closest('[data-v271-open-note]').click();
    }
  });

  function boot() {
    ensureInbox();
    loadData();

    clearInterval(PMD.refreshTimer);

    PMD.refreshTimer = setInterval(function () {
      loadData();
    }, 10000);

    console.info('[PMD] Waiter V2.7.1 unified service inbox active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();


/* ==========================================================
   PMD Waiter V2.7.2
   Clean Call / Note badges + cleaner service inbox
   ========================================================== */

(function () {
  'use strict';

  if (window.PMDWaiterV272) return;

  window.PMDWaiterV272 = {
    version: '2.7.2',
    observer: null,
    timer: null
  };

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '[data-v2-open-table],' +
      '[data-final-open-table],' +
      '[data-v21-number],' +
      '.pmd-v2-table-key,' +
      '.pmd-v21-table-key'
    ));
  }

  function cardIdentity(card) {
    var numberNode = card.querySelector(
      '.pmd-v2-table-number,' +
      '.pmd-final-table-number,' +
      '[data-v2-table-number],' +
      ':scope > strong'
    );

    return {
      id: clean(
        card.getAttribute('data-v271-table-id') ||
        card.getAttribute('data-v2-open-table') ||
        card.getAttribute('data-final-open-table') ||
        card.getAttribute('data-table-id') ||
        ''
      ),

      number: clean(
        card.getAttribute('data-v271-table-number') ||
        card.getAttribute('data-v21-number') ||
        (numberNode && numberNode.textContent) ||
        ''
      ).replace(/^table\s*/i, '')
    };
  }

  function eventsForCard(card, category) {
    var identity = cardIdentity(card);
    var events = (
      window.PMDWaiterV271 &&
      Array.isArray(window.PMDWaiterV271.events)
    ) ? window.PMDWaiterV271.events : [];

    return events.filter(function (item) {
      if (category && item.category !== category) return false;

      if (
        identity.id &&
        item.tableId &&
        clean(identity.id) === clean(item.tableId)
      ) {
        return true;
      }

      return (
        identity.number &&
        item.tableNumber &&
        clean(identity.number) === clean(item.tableNumber)
      );
    });
  }

  function removeGeneratedPseudoState(card) {
    card.classList.remove('pmd-v271-has-call');
  }

  function findExistingNoteButtons(card) {
    return Array.prototype.slice.call(card.querySelectorAll(
      '[data-v271-open-note],' +
      '.pmd-v271-note-button,' +
      '.pmd-v242-note-action,' +
      '.pmd-v241-note,' +
      '[data-v2-note],' +
      '[data-note-action]'
    )).filter(function (element) {
      return /^note$/i.test(clean(element.textContent));
    });
  }

  function ensureBadgeTray(card) {
    var tray = card.querySelector(':scope > .pmd-v272-card-alerts');

    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'pmd-v272-card-alerts';

      var orderButton = Array.prototype.slice.call(
        card.querySelectorAll('button, [role="button"], span')
      ).find(function (element) {
        return /^open order$/i.test(clean(element.textContent));
      });

      if (orderButton && orderButton.parentNode === card) {
        orderButton.insertAdjacentElement('afterend', tray);
      } else {
        card.appendChild(tray);
      }
    }

    return tray;
  }

  function ensureNoteBadge(card, notes) {
    var tray = ensureBadgeTray(card);
    var badge = tray.querySelector('[data-v272-note]');

    if (!notes.length) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'pmd-v272-alert-badge is-note';
      badge.setAttribute('data-v272-note', '1');
      badge.setAttribute('aria-label', 'Open table notes');
      badge.innerHTML =
        '<span>NOTE</span>' +
        '<b data-v272-note-count></b>';

      tray.appendChild(badge);
    }

    var count = badge.querySelector('[data-v272-note-count]');

    if (count) {
      count.textContent = notes.length > 1
        ? String(notes.length)
        : '';
      count.hidden = notes.length < 2;
    }
  }

  function ensureCallBadge(card, calls) {
    var tray = ensureBadgeTray(card);
    var badge = tray.querySelector('[data-v272-call]');

    if (!calls.length) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'pmd-v272-alert-badge is-call';
      badge.setAttribute('data-v272-call', '1');
      badge.setAttribute('aria-label', 'Open waiter calls');
      badge.innerHTML =
        '<span>CALL</span>' +
        '<b data-v272-call-count></b>';

      tray.prepend(badge);
    }

    var count = badge.querySelector('[data-v272-call-count]');

    if (count) {
      count.textContent = calls.length > 1
        ? String(calls.length)
        : '';
      count.hidden = calls.length < 2;
    }
  }

  function cleanDuplicateNotes(card) {
    var existing = findExistingNoteButtons(card);

    existing.forEach(function (element) {
      element.remove();
    });
  }

  function decorateCard(card) {
    var calls = eventsForCard(card, 'call');
    var notes = eventsForCard(card, 'note');

    removeGeneratedPseudoState(card);
    cleanDuplicateNotes(card);

    ensureCallBadge(card, calls);
    ensureNoteBadge(card, notes);

    card.classList.toggle(
      'pmd-v272-has-service-attention',
      calls.length > 0 || notes.length > 0
    );

    card.classList.toggle(
      'pmd-v272-has-call',
      calls.length > 0
    );

    card.classList.toggle(
      'pmd-v272-has-note',
      notes.length > 0
    );
  }

  function cleanTechnicalMessage(value) {
    var text = clean(value);

    text = text
      .replace(/\|\s*\[[^\]]*(?:guest_session|submitted_by|table_draft_id)[^\]]*\]/gi, '')
      .replace(/\[(?:guest_session|submitted_by|table_draft_id)[^\]]*\]/gi, '')
      .replace(/\btable\s*draft\s*basket\b\s*\|?/gi, '')
      .replace(/\btable\s*id\s*:\s*\d+\b\s*\|?/gi, '')
      .replace(/\btable\s*:\s*table\s*\d+\b\s*\|?/gi, '')
      .replace(/\|{2,}/g, '|')
      .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      !text ||
      /^\[.*\]$/.test(text) ||
      /^(guest_session|submitted_by|table_draft_id)\s*:?$/i.test(text)
    ) {
      return '';
    }

    return text;
  }

  function eventFingerprint(event) {
    return [
      clean(event.category),
      clean(event.tableId || event.tableNumber),
      lower(event.title),
      lower(cleanTechnicalMessage(event.message))
    ].join('|');
  }

  function cleanupEvents() {
    if (
      !window.PMDWaiterV271 ||
      !Array.isArray(window.PMDWaiterV271.events)
    ) {
      return;
    }

    var seen = Object.create(null);

    window.PMDWaiterV271.events =
      window.PMDWaiterV271.events
        .map(function (event) {
          var copy = Object.assign({}, event);

          copy.message = cleanTechnicalMessage(copy.message);

          if (
            copy.category === 'note' &&
            !copy.message &&
            !/note/i.test(clean(copy.title))
          ) {
            return null;
          }

          if (
            copy.category === 'note' &&
            !copy.message
          ) {
            copy.message = 'A note was added to this table.';
          }

          return copy;
        })
        .filter(Boolean)
        .filter(function (event) {
          var key = eventFingerprint(event);

          if (seen[key]) return false;

          seen[key] = true;
          return true;
        });
  }

  function replaceInboxRows() {
    var list = document.querySelector('[data-v271-event-list]');

    if (!list) return;

    Array.prototype.slice.call(
      list.querySelectorAll('.pmd-v271-event')
    ).forEach(function (row) {
      var title = row.querySelector('.pmd-v271-event-copy strong');
      var message = row.querySelector('.pmd-v271-event-copy > span');
      var small = row.querySelector('.pmd-v271-event-copy small');

      if (message) {
        var cleaned = cleanTechnicalMessage(message.textContent);

        message.textContent =
          cleaned || 'A note was added to this table.';
      }

      if (small && /general/i.test(clean(small.textContent))) {
        var titleText = clean(title && title.textContent);
        var match = titleText.match(/table\s*(\d+)/i);

        if (match) {
          small.textContent = 'TABLE ' + match[1];
          title.textContent = 'CUSTOMER NOTE';
        }
      }
    });
  }

  function refreshVisuals() {
    cleanupEvents();

    cards().forEach(decorateCard);

    if (
      window.PMDWaiterV271 &&
      typeof window.PMDWaiterV271.renderInbox === 'function'
    ) {
      window.PMDWaiterV271.renderInbox();
    }

    replaceInboxRows();
  }

  function openInboxFor(category, card) {
    if (!window.PMDWaiterV271) return;

    var identity = cardIdentity(card);

    if (typeof window.PMDWaiterV271.openInbox === 'function') {
      window.PMDWaiterV271.openInbox(
        category === 'call' ? 'calls' : 'notes'
      );
    } else {
      var button = Array.prototype.slice.call(
        document.querySelectorAll('button')
      ).find(function (item) {
        var text = clean(item.textContent).replace(/\d+/g, '');

        return category === 'call'
          ? /^waiter\s*calls?$/i.test(text)
          : /^notes?$/i.test(text);
      });

      if (button) button.click();
    }

    setTimeout(function () {
      var matching = Array.prototype.slice.call(
        document.querySelectorAll('.pmd-v271-event')
      ).find(function (row) {
        var rowId = clean(
          row.getAttribute('data-v271-event-table-id')
        );

        var rowNumber = clean(
          row.getAttribute('data-v271-event-table-number')
        );

        return (
          (identity.id && rowId === identity.id) ||
          (identity.number && rowNumber === identity.number)
        );
      });

      if (matching) {
        matching.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        });

        matching.classList.add('is-highlighted');

        setTimeout(function () {
          matching.classList.remove('is-highlighted');
        }, 1600);
      }
    }, 80);
  }

  document.addEventListener('click', function (event) {
    var callBadge = event.target.closest('[data-v272-call]');

    if (callBadge) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openInboxFor(
        'call',
        callBadge.closest(
          '[data-v2-open-table],' +
          '[data-final-open-table],' +
          '[data-v21-number],' +
          '.pmd-v2-table-key,' +
          '.pmd-v21-table-key'
        )
      );

      return;
    }

    var noteBadge = event.target.closest('[data-v272-note]');

    if (noteBadge) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openInboxFor(
        'note',
        noteBadge.closest(
          '[data-v2-open-table],' +
          '[data-final-open-table],' +
          '[data-v21-number],' +
          '.pmd-v2-table-key,' +
          '.pmd-v21-table-key'
        )
      );
    }
  }, true);

  function boot() {
    refreshVisuals();

    clearInterval(window.PMDWaiterV272.timer);

    window.PMDWaiterV272.timer = setInterval(function () {
      refreshVisuals();
    }, 1500);

    console.info(
      '[PMD] Waiter V2.7.2 clean call/note service UI active'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once: true}
    );
  } else {
    boot();
  }
})();


/* ==========================================================
   PMD Waiter V2.7.3
   Exactly one NOTE and one CALL badge per table
   ========================================================== */

(function () {
  'use strict';

  if (window.PMDWaiterV273) return;

  window.PMDWaiterV273 = {
    version: '2.7.3',
    timer: null
  };

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cardSelector() {
    return [
      '[data-v2-open-table]',
      '[data-final-open-table]',
      '[data-v21-number]',
      '.pmd-v2-table-key',
      '.pmd-v21-table-key'
    ].join(',');
  }

  function getCards() {
    return Array.prototype.slice.call(
      document.querySelectorAll(cardSelector())
    );
  }

  function identity(card) {
    var numberNode = card.querySelector(
      '.pmd-v2-table-number,' +
      '.pmd-final-table-number,' +
      '[data-v2-table-number],' +
      ':scope > strong'
    );

    return {
      id: clean(
        card.getAttribute('data-v271-table-id') ||
        card.getAttribute('data-v2-open-table') ||
        card.getAttribute('data-final-open-table') ||
        card.getAttribute('data-table-id') ||
        ''
      ),

      number: clean(
        card.getAttribute('data-v271-table-number') ||
        card.getAttribute('data-v21-number') ||
        (numberNode ? numberNode.textContent : '')
      ).replace(/^table\s*/i, '')
    };
  }

  function uniqueEventsForCard(card, category) {
    var cardIdentity = identity(card);

    var events =
      window.PMDWaiterV271 &&
      Array.isArray(window.PMDWaiterV271.events)
        ? window.PMDWaiterV271.events
        : [];

    var seen = Object.create(null);

    return events.filter(function (event) {
      if (event.category !== category) return false;

      var sameTable =
        (
          cardIdentity.id &&
          event.tableId &&
          clean(cardIdentity.id) === clean(event.tableId)
        ) ||
        (
          cardIdentity.number &&
          event.tableNumber &&
          clean(cardIdentity.number) === clean(event.tableNumber)
        );

      if (!sameTable) return false;

      var fingerprint = [
        category,
        clean(event.id || ''),
        clean(event.tableId || event.tableNumber || ''),
        clean(event.title || '').toLowerCase(),
        clean(event.message || '').toLowerCase()
      ].join('|');

      /*
       * Some notification payloads have no stable ID.
       * In that case, title/message/table prevent duplicate counting.
       */
      if (seen[fingerprint]) return false;

      seen[fingerprint] = true;
      return true;
    });
  }

  function isOpenOrderElement(element) {
    return /^open\s+order$/i.test(clean(element.textContent));
  }

  function isLegacyNoteElement(element) {
    if (!element || !element.matches) return false;

    if (
      element.matches(
        '[data-v272-note],' +
        '[data-v273-note],' +
        '.pmd-v272-alert-badge'
      )
    ) {
      return false;
    }

    var text = clean(element.textContent)
      .replace(/\d+$/g, '')
      .trim();

    return /^note$/i.test(text);
  }

  function isLegacyCallElement(element) {
    if (!element || !element.matches) return false;

    if (
      element.matches(
        '[data-v272-call],' +
        '[data-v273-call],' +
        '.pmd-v272-alert-badge'
      )
    ) {
      return false;
    }

    var text = clean(element.textContent)
      .replace(/\d+$/g, '')
      .trim();

    return /^(call|waiter\s+call)$/i.test(text);
  }

  function removeOldServiceElements(card) {
    /*
     * Remove explicit old implementations.
     */
    card.querySelectorAll([
      '[data-v271-open-note]',
      '.pmd-v271-note-button',
      '.pmd-v242-note-action',
      '.pmd-v241-note',
      '[data-v2-note]',
      '[data-note-action]',
      '.pmd-v271-call-button',
      '[data-v271-open-call]',
      '[data-waiter-call-action]'
    ].join(',')).forEach(function (element) {
      element.remove();
    });

    /*
     * Catch plain BUTTON/SPAN/A elements containing only NOTE or CALL.
     * This is the structure that survived V2.7.2.
     */
    card.querySelectorAll(
      ':scope button, :scope a, :scope span, :scope div'
    ).forEach(function (element) {
      if (
        isLegacyNoteElement(element) ||
        isLegacyCallElement(element)
      ) {
        element.remove();
      }
    });
  }

  function getSingleTray(card) {
    var trays = Array.prototype.slice.call(
      card.querySelectorAll(':scope > .pmd-v272-card-alerts')
    );

    var tray = trays.shift() || null;

    /*
     * Remove duplicate trays created by earlier refreshes.
     */
    trays.forEach(function (duplicate) {
      duplicate.remove();
    });

    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'pmd-v272-card-alerts';
      tray.setAttribute('data-v273-service-tray', '1');

      var orderElement = Array.prototype.slice.call(
        card.querySelectorAll(':scope > button, :scope > a, :scope > span')
      ).find(isOpenOrderElement);

      if (orderElement) {
        orderElement.insertAdjacentElement('afterend', tray);
      } else {
        card.appendChild(tray);
      }
    }

    /*
     * Clear previous generated badges.
     * They will be rebuilt once from current unique data.
     */
    tray.querySelectorAll(
      '[data-v272-note],' +
      '[data-v272-call],' +
      '[data-v273-note],' +
      '[data-v273-call]'
    ).forEach(function (badge) {
      badge.remove();
    });

    return tray;
  }

  function makeBadge(type, count) {
    var button = document.createElement('button');

    button.type = 'button';
    button.className =
      'pmd-v272-alert-badge ' +
      (type === 'call' ? 'is-call' : 'is-note');

    button.setAttribute(
      type === 'call' ? 'data-v273-call' : 'data-v273-note',
      '1'
    );

    button.setAttribute(
      'aria-label',
      type === 'call'
        ? 'Open waiter calls'
        : 'Open table notes'
    );

    var label = document.createElement('span');
    label.textContent = type === 'call' ? 'CALL' : 'NOTE';

    button.appendChild(label);

    if (count > 1) {
      var counter = document.createElement('b');
      counter.textContent = String(count);
      button.appendChild(counter);
    }

    return button;
  }

  function decorate(card) {
    var notes = uniqueEventsForCard(card, 'note');
    var calls = uniqueEventsForCard(card, 'call');

    removeOldServiceElements(card);

    var tray = getSingleTray(card);

    if (calls.length) {
      tray.appendChild(makeBadge('call', calls.length));
    }

    if (notes.length) {
      tray.appendChild(makeBadge('note', notes.length));
    }

    if (!calls.length && !notes.length) {
      tray.remove();
    }

    card.classList.toggle(
      'pmd-v272-has-call',
      calls.length > 0
    );

    card.classList.toggle(
      'pmd-v272-has-note',
      notes.length > 0
    );

    card.classList.toggle(
      'pmd-v272-has-service-attention',
      calls.length > 0 || notes.length > 0
    );

    card.setAttribute(
      'data-v273-note-count',
      String(notes.length)
    );

    card.setAttribute(
      'data-v273-call-count',
      String(calls.length)
    );
  }

  function openInbox(tab, card) {
    var cardIdentity = identity(card);

    if (
      window.PMDWaiterV271 &&
      typeof window.PMDWaiterV271.openInbox === 'function'
    ) {
      window.PMDWaiterV271.openInbox(tab);
    } else {
      var label = tab === 'calls'
        ? /^waiter\s*calls?$/i
        : /^notes?$/i;

      var trigger = Array.prototype.slice.call(
        document.querySelectorAll('button')
      ).find(function (button) {
        return label.test(
          clean(button.textContent).replace(/\d+/g, '')
        );
      });

      if (trigger) trigger.click();
    }

    setTimeout(function () {
      var rows = Array.prototype.slice.call(
        document.querySelectorAll('.pmd-v271-event')
      );

      var matching = rows.find(function (row) {
        var rowId = clean(
          row.getAttribute('data-v271-event-table-id')
        );

        var rowNumber = clean(
          row.getAttribute('data-v271-event-table-number')
        );

        return (
          cardIdentity.id &&
          rowId === cardIdentity.id
        ) || (
          cardIdentity.number &&
          rowNumber === cardIdentity.number
        );
      });

      if (matching) {
        matching.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  document.addEventListener('click', function (event) {
    var note = event.target.closest('[data-v273-note]');

    if (note) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var noteCard = note.closest(cardSelector());

      if (noteCard) {
        openInbox('notes', noteCard);
      }

      return;
    }

    var call = event.target.closest('[data-v273-call]');

    if (call) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var callCard = call.closest(cardSelector());

      if (callCard) {
        openInbox('calls', callCard);
      }
    }
  }, true);

  function refresh() {
    getCards().forEach(decorate);
  }

  function boot() {
    refresh();

    clearInterval(window.PMDWaiterV273.timer);

    /*
     * Lightweight reconciliation only.
     * No card rebuilding or node sorting.
     */
    window.PMDWaiterV273.timer = setInterval(
      refresh,
      1500
    );

    console.info(
      '[PMD] Waiter V2.7.3 single NOTE/CALL badges active'
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
