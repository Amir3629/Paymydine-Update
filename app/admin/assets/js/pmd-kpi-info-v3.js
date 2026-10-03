/* PMD_KPI_INFO_CURRENT_CARD_AUTHORITY_V158
 * Shared KPI information authority.
 * The explanation is resolved from the KPI the user can CURRENTLY see in the
 * card. Stale identity attributes from cached chooser runtimes cannot win.
 */
(function () {
  'use strict';
  if (window.PMDKpiInfoV2) return;

  var section = document.getElementById('pmd-r2-reservation-kpis-v307');
  if (!section) return;

  function pmdT(key, fallback, replacements) {
    if (
      window.PMDPlatformMessages &&
      typeof window.PMDPlatformMessages.t === 'function'
    ) {
      return window.PMDPlatformMessages.t(
        key,
        replacements || {},
        fallback == null ? key : fallback
      );
    }
    return fallback == null ? key : fallback;
  }

  var PMD_KPI_MESSAGE_KEYS = {"available_tables":"kpi.info.available_tables","average_checks":"kpi.info.average_checks","average_party_size":"kpi.info.average_party_size","average_settlement_time":"kpi.info.average_settlement_time","average_turn_time":"kpi.info.average_turn_time","cancellation_rate":"kpi.info.cancellation_rate","cash_percent":"kpi.info.cash_percent","channels":"kpi.info.channels","failed_transactions":"kpi.info.failed_transactions","gross_to_net":"kpi.info.gross_to_net","guests":"kpi.info.guests","kitchen":"kpi.info.kitchen","live_orders":"kpi.info.live_orders","menu":"kpi.info.menu","no_show_rate":"kpi.info.no_show_rate","occupancy":"kpi.info.occupancy","occupied_tables":"kpi.info.occupied_tables","open_alerts":"kpi.info.open_alerts","open_bills":"kpi.info.open_bills","payment_method":"kpi.info.payment_method","pending_confirmations":"kpi.info.pending_confirmations","reservation_tables":"kpi.info.reservation_tables","reservations_today":"kpi.info.reservations_today","revenue":"kpi.info.revenue","revpash":"kpi.info.revpash","shift_payments":"kpi.info.shift_payments","table_occupancy":"kpi.info.table_occupancy","tips":"kpi.info.tips","tips_to_share":"kpi.info.tips_to_share","total_loss":"kpi.info.total_loss","total_seats":"kpi.info.total_seats","turnover":"kpi.info.turnover","upcoming_arrivals":"kpi.info.upcoming_arrivals","upcoming_reservations":"kpi.info.upcoming_reservations","vat":"kpi.info.vat","waiting_list":"kpi.info.waiting_list"};

  function canonicalKey(raw) {
    var key = String(raw || '').toLowerCase();
    var aliases = {
      no_show: 'no_show_rate',
      avg_party_size: 'average_party_size',
      average_table_turn_time: 'average_turn_time',
      avg_table_turn_time: 'average_turn_time',
      waitlist: 'waiting_list',
      revenue_per_available_seat_hour: 'revpash',
      avg_settlement_time: 'average_settlement_time',
      declined_transactions: 'failed_transactions',
      total_payments_shift: 'shift_payments',
      payments_shift: 'shift_payments',
      loss_total: 'total_loss'
    };

    if (aliases[key]) return aliases[key];
    if (key.indexOf('tip') !== -1 && key.indexOf('share') !== -1) return 'tips_to_share';
    if (key.indexOf('vat') !== -1) return 'vat';
    if (key.indexOf('method') !== -1) return 'payment_method';
    if (key.indexOf('check') !== -1) return 'average_checks';
    if (key.indexOf('tip') !== -1) return 'tips';
    if (key.indexOf('shift') !== -1 && key.indexOf('payment') !== -1) return 'shift_payments';
    return key;
  }

  function normalizeZero(node) {
    if (!node) return;
    var value = String(node.textContent || '').trim();
    if (!value || value === '—' || value === '–' || value === '-') {
      node.textContent = '0';
    }
  }

  function catalog() {
    var ids = ['pmd-shifts-kpi-data', 'pmd-dashboard-lab-kpi-data'];

    for (var index = 0; index < ids.length; index += 1) {
      var node = document.getElementById(ids[index]);
      if (!node) continue;

      try {
        var parsed = JSON.parse(node.textContent || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        // Continue to the shared message/fallback authority.
      }
    }

    return {};
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function visibleTitle(card) {
    var node = card && card.querySelector
      ? card.querySelector('.pmd-r2-kpi-v2401-title')
      : null;
    return node ? String(node.textContent || '').trim() : '';
  }

  // PMD_KPI_VISIBLE_CARD_IDENTITY_V158
  // Attribute values can disagree when an older chooser runtime is cached.
  // The rendered title is what the user actually selected, so resolve against
  // the current page catalog first. Attribute candidates are only fallbacks.
  function currentKey(card) {
    var cards = catalog();
    var title = normalizeText(visibleTitle(card));
    var candidates = [
      String(card.getAttribute('data-pmd-shifts-kpi-key') || '').trim(),
      String(card.getAttribute('data-pmd-dashboard2-kpi') || '').trim(),
      String(card.getAttribute('data-pmd-kpi-v2401-key') || '').trim()
    ].filter(Boolean);

    // First: among known attribute candidates, prefer the one whose catalog
    // title matches what is currently rendered in this exact card.
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      var candidateData = cards[candidate];
      if (
        candidateData &&
        normalizeText(candidateData.title) === title
      ) {
        return candidate;
      }
    }

    // Second: recover even if every identity attribute is stale by matching
    // the visible title against the whole page KPI catalog.
    if (title) {
      var keys = Object.keys(cards || {});
      for (var j = 0; j < keys.length; j += 1) {
        var key = keys[j];
        if (
          cards[key] &&
          normalizeText(cards[key].title) === title
        ) {
          return key;
        }
      }
    }

    // Last: preserve page-specific attribute precedence. Shifts owns its own
    // identity attribute, clean workspaces use dashboard2/v2401.
    return candidates[0] || '';
  }

  function currentData(card) {
    var key = currentKey(card);
    var cards = catalog();
    return key && cards[key] && typeof cards[key] === 'object'
      ? cards[key]
      : null;
  }

  function explanation(card) {
    var key = currentKey(card);
    var data = currentData(card);

    // Page-owned copy is strongest when the current KPI data provides it.
    if (data && String(data.info || '').trim()) {
      return String(data.info).trim();
    }

    var canonical = canonicalKey(key);
    var messageKey = PMD_KPI_MESSAGE_KEYS[canonical] || '';
    var translated = messageKey ? pmdT(messageKey, '') : '';
    if (translated) return translated;

    // Many clean workspaces already carry a useful KPI description in the
    // current card catalog. Use the CURRENT entry, never stale panel DOM.
    if (data && String(data.description || '').trim()) {
      return String(data.description).trim();
    }

    // Compatibility for page-specific runtimes that explicitly refresh this
    // attribute together with the KPI identity (Shifts does this).
    var directCopy = String(
      card.getAttribute('data-pmd-kpi-info-copy') || ''
    ).trim();
    if (directCopy) return directCopy;

    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    var name = title ? String(title.textContent || '').trim() : canonical;
    return pmdT(
      'kpi.info.fallback',
      'This KPI shows the current value for :name.',
      {name: name}
    );
  }

  function close(card) {
    if (!card) return;
    card.classList.remove('is-pmd-kpi-info-open');
    card.removeAttribute('data-pmd-kpi-info-open');
    var button = card.querySelector('[data-pmd-kpi-info-button]');
    if (button) button.setAttribute('aria-pressed', 'false');
  }

  function syncCard(card, options) {
    if (!card) return false;

    var panel = card.querySelector('[data-pmd-kpi-info-panel]');
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');

    if (panel) {
      var heading = panel.querySelector('strong');
      var body = panel.querySelector('span');
      if (heading) {
        heading.textContent = title
          ? String(title.textContent || '').trim()
          : '';
      }
      if (body) body.textContent = explanation(card);
    }

    if (!options || options.close !== false) close(card);
    normalizeZero(card.querySelector('.pmd-r2-kpi-v2401-value'));
    return true;
  }

  function syncLabels() {
    Array.prototype.forEach.call(
      section.querySelectorAll('[data-pmd-kpi-info-button]'),
      function (button) {
        var label = pmdT('kpi.info.about', 'About this KPI');
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
      }
    );
  }

  function mount() {
    syncLabels();
    Array.prototype.forEach.call(
      section.querySelectorAll('.pmd-r2-kpi-v2401-card'),
      function (card) {
        syncCard(card, {close: true});
      }
    );
  }

  section.addEventListener('click', function (event) {
    var button = event.target.closest('[data-pmd-kpi-info-button]');
    if (!button || !section.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    var card = button.closest('.pmd-r2-kpi-v2401-card');
    if (!card) return;

    var shouldOpen = !card.classList.contains('is-pmd-kpi-info-open');

    Array.prototype.forEach.call(
      section.querySelectorAll('.is-pmd-kpi-info-open'),
      function (other) {
        if (other !== card) close(other);
      }
    );

    if (!shouldOpen) {
      close(card);
      return;
    }

    var menu = card.querySelector(
      '[data-pmd-dashboard-lab-kpi-menu], [data-pmd-shifts-kpi-menu]'
    );
    var more = card.querySelector(
      '[data-pmd-dashboard-lab-kpi-menu-button], [data-pmd-shifts-kpi-menu-button]'
    );
    if (menu) menu.hidden = true;
    if (more) more.setAttribute('aria-expanded', 'false');

    // PMD_KPI_CLICK_REVERIFY_V158
    // Re-resolve from the rendered card at click time. This is intentionally
    // independent from whichever chooser runtime last touched the card.
    syncCard(card, {close: false});

    card.classList.add('is-pmd-kpi-info-open');
    card.setAttribute('data-pmd-kpi-info-open', 'true');
    button.setAttribute('aria-pressed', 'true');
  });

  // PMD_KPI_CURRENT_IDENTITY_OBSERVER_V157
  // Every existing chooser changes one of these card identity attributes.
  // Observing them makes the info panel follow Dashboard, Manager, Accountant,
  // Reservations and Shifts without coupling this runtime to each chooser.
  var observer = new MutationObserver(function (records) {
    var cards = [];

    records.forEach(function (record) {
      var card = record.target && record.target.closest
        ? record.target.closest('.pmd-r2-kpi-v2401-card')
        : null;
      if (card && cards.indexOf(card) === -1) cards.push(card);
    });

    cards.forEach(function (card) {
      // Mutation callbacks run after the chooser has also updated title/value.
      syncCard(card, {close: true});
    });
  });

  observer.observe(section, {
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-pmd-dashboard2-kpi',
      'data-pmd-kpi-v2401-key',
      'data-pmd-shifts-kpi-key',
      'data-pmd-kpi-info-copy'
    ]
  });

  // Optional explicit hook for present/future KPI runtimes.
  section.addEventListener('pmd:kpi-changed', function (event) {
    var card = event.target && event.target.closest
      ? event.target.closest('.pmd-r2-kpi-v2401-card')
      : null;
    if (card) syncCard(card, {close: true});
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    Array.prototype.forEach.call(
      section.querySelectorAll('.is-pmd-kpi-info-open'),
      close
    );
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }

  var api = {
    version: '3.0.0-current-card-v158',
    mount: mount,
    syncCard: syncCard,
    explanation: explanation,
    audit: function () {
      var cards = section.querySelectorAll(
        '.pmd-r2-kpi-v2401-card[data-pmd-dashboard2-kpi]'
      );
      var buttons = section.querySelectorAll('[data-pmd-kpi-info-button]');
      return {
        cards: cards.length,
        infoButtons: buttons.length,
        allCovered: cards.length === buttons.length,
        dynamicSelection: true,
        observerActive: true
      };
    }
  };

  // V1 alias keeps any existing page/runtime integrations compatible.
  window.PMDKpiInfoV1 = api;
  window.PMDKpiInfoV2 = api;
  window.PMDKpiInfoV3 = api;
})();
