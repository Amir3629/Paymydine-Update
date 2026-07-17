(function () {
  'use strict';

  if (window.PMDWaiterV300) return;

  var PMD = window.PMDWaiterV300 = {
    version: '3.0.0',
    gridObserver: null,
    areaObserver: null,
    lastEventSignature: '',
    events: []
  };

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cardSelector() {
    return [
      'button[data-v2-open-table]',
      'button[data-final-open-table]',
      'button[data-v21-number]',
      'button.pmd-v2-table-key',
      'button.pmd-v21-table-key'
    ].join(',');
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

  function uniqueEventsFor(card, category) {
    var identity = cardIdentity(card);
    var seen = Object.create(null);

    return PMD.events.filter(function (event) {
      if (!event || event.category !== category) return false;

      var eventId = clean(event.tableId);
      var eventNumber = clean(event.tableNumber).replace(/^table\s*/i, '');

      var same =
        (identity.id && eventId && identity.id === eventId) ||
        (identity.number && eventNumber && identity.number === eventNumber);

      if (!same) return false;

      var key = clean(event.id) || [
        category,
        eventId || eventNumber,
        clean(event.title).toLowerCase(),
        clean(event.message).toLowerCase()
      ].join('|');

      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function removeLegacyServiceControls(card) {
    card.querySelectorAll([
      '[data-v271-open-note]',
      '[data-v271-open-call]',
      '[data-v272-note]',
      '[data-v272-call]',
      '[data-v273-note]',
      '[data-v273-call]',
      '[data-v274-note]',
      '[data-v274-call]',
      '.pmd-v271-note-button',
      '.pmd-v272-alert-badge',
      '.pmd-v272-card-alerts',
      '.pmd-v274-service-tray'
    ].join(',')).forEach(function (node) {
      node.remove();
    });
  }

  function makeBadge(type, count) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-v300-service-badge is-' + type;
    button.setAttribute(
      type === 'note' ? 'data-v300-note' : 'data-v300-call',
      '1'
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

    var notes = uniqueEventsFor(card, 'note');
    var calls = uniqueEventsFor(card, 'call');
    var signature = calls.length + '|' + notes.length;

    if (card.getAttribute('data-v300-service-signature') === signature) {
      return;
    }

    removeLegacyServiceControls(card);

    var oldTray = card.querySelector(':scope > [data-v300-service-tray]');
    if (oldTray) oldTray.remove();

    if (calls.length || notes.length) {
      var tray = document.createElement('div');
      tray.className = 'pmd-v300-service-tray';
      tray.setAttribute('data-v300-service-tray', '1');

      if (calls.length) tray.appendChild(makeBadge('call', calls.length));
      if (notes.length) tray.appendChild(makeBadge('note', notes.length));

      card.appendChild(tray);
    }

    card.classList.toggle(
      'pmd-v300-has-service',
      calls.length > 0 || notes.length > 0
    );

    card.setAttribute('data-v300-service-signature', signature);
  }

  function decorateCards() {
    document.querySelectorAll(cardSelector()).forEach(decorateCard);
  }

  function openInbox(tab, card) {
    var inbox = window.PMDWaiterV271;
    if (!inbox || typeof inbox.openInbox !== 'function') return;

    inbox.openInbox(tab);

    if (!card) return;
    var identity = cardIdentity(card);

    setTimeout(function () {
      var row = Array.prototype.slice.call(
        document.querySelectorAll('.pmd-v271-event')
      ).find(function (item) {
        return (
          identity.id &&
          item.getAttribute('data-v271-event-table-id') === identity.id
        ) || (
          identity.number &&
          item.getAttribute('data-v271-event-table-number') === identity.number
        );
      });

      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 60);
  }

  function ensureLogout() {
    if (document.querySelector('.pmd-v265-logout')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-v265-logout';
    button.textContent = 'LOG OUT';
    button.setAttribute('aria-label', 'Log out');

    button.addEventListener('click', function () {
      var existing = document.querySelector(
        'a[href*="logout" i], form[action*="logout" i]'
      );

      if (existing && existing.tagName === 'A') {
        existing.click();
        return;
      }

      if (existing && existing.tagName === 'FORM') {
        existing.requestSubmit ? existing.requestSubmit() : existing.submit();
        return;
      }

      var token =
        document.querySelector('meta[name="csrf-token"]')?.content ||
        document.querySelector('input[name="_token"]')?.value ||
        '';

      var form = document.createElement('form');
      form.method = 'POST';
      form.action = '/admin/logout';
      form.hidden = true;

      if (token) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_token';
        input.value = token;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    });

    document.body.appendChild(button);
  }

  function aliasAreas() {
    var aliases = {
      bar: 'INSIDE',
      center: 'FLOOR 1',
      family: 'FLOOR 2',
      group: 'FLOOR 2',
      high: 'ROOF',
      outdoor: 'OUTDOOR',
      vip: 'BALCONY',
      window: 'GARDEN'
    };

    document.querySelectorAll('[data-v2-areas] button').forEach(function (btn) {
      if (!btn.dataset.v300OriginalLabel) {
        btn.dataset.v300OriginalLabel = clean(btn.textContent);
      }

      var original = btn.dataset.v300OriginalLabel.toLowerCase();
      if (aliases[original]) btn.textContent = aliases[original];
    });
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      var note = event.target.closest('[data-v300-note]');
      if (note) {
        event.preventDefault();
        event.stopPropagation();
        openInbox('notes', note.closest(cardSelector()));
        return;
      }

      var call = event.target.closest('[data-v300-call]');
      if (call) {
        event.preventDefault();
        event.stopPropagation();
        openInbox('calls', call.closest(cardSelector()));
      }
    }, true);

    document.addEventListener('pmd:v3-service-data', function (event) {
      PMD.events = Array.isArray(event.detail && event.detail.events)
        ? event.detail.events
        : [];

      decorateCards();
    });
  }

  function observeDynamicRegions() {
    var grid = document.querySelector('[data-v2-table-grid]');
    if (grid) {
      PMD.gridObserver = new MutationObserver(function (records) {
        var hasCards = records.some(function (record) {
          return Array.prototype.some.call(record.addedNodes || [], function (node) {
            return node.nodeType === 1 && (
              node.matches?.(cardSelector()) ||
              node.querySelector?.(cardSelector())
            );
          });
        });

        if (hasCards) requestAnimationFrame(decorateCards);
      });

      PMD.gridObserver.observe(grid, { childList: true, subtree: true });
    }

    var areas = document.querySelector('[data-v2-areas]');
    if (areas) {
      PMD.areaObserver = new MutationObserver(aliasAreas);
      PMD.areaObserver.observe(areas, { childList: true });
    }
  }

  function boot() {
    ensureLogout();
    aliasAreas();
    bindEvents();
    observeDynamicRegions();

    if (
      window.PMDWaiterV271 &&
      Array.isArray(window.PMDWaiterV271.events)
    ) {
      PMD.events = window.PMDWaiterV271.events.slice();
    }

    decorateCards();

    document.documentElement.classList.add('pmd-v300-ready');

    console.info('[PMD] Waiter V3.0 clean bootstrap active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
