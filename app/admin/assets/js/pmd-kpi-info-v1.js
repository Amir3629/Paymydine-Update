/* PMD_KPI_INFO_AUTHORITY_V3_SERVER_FIRST_PAINT */
(function () {
  'use strict';
  if (window.PMDKpiInfoV1) return;

  var section = document.getElementById('pmd-r2-reservation-kpis-v307');
  if (!section) return;

  // PMD_KPI_PLATFORM_I18N_V8
  function locale() {
    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.locale === 'function') {
      return String(window.PMDPlatformMessages.locale() || 'en').toLowerCase();
    }
    return String(document.documentElement.lang || 'en').toLowerCase();
  }

  function pmdT(key, fallback, replacements) {
    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {
      return window.PMDPlatformMessages.t(key, replacements || {}, fallback == null ? key : fallback);
    }
    return fallback == null ? key : fallback;
  }

  var PMD_KPI_MESSAGE_KEYS = {"available_tables":"kpi.info.available_tables","average_checks":"kpi.info.average_checks","average_party_size":"kpi.info.average_party_size","average_settlement_time":"kpi.info.average_settlement_time","average_turn_time":"kpi.info.average_turn_time","cancellation_rate":"kpi.info.cancellation_rate","cash_percent":"kpi.info.cash_percent","channels":"kpi.info.channels","failed_transactions":"kpi.info.failed_transactions","gross_to_net":"kpi.info.gross_to_net","guests":"kpi.info.guests","kitchen":"kpi.info.kitchen","live_orders":"kpi.info.live_orders","menu":"kpi.info.menu","no_show_rate":"kpi.info.no_show_rate","occupancy":"kpi.info.occupancy","occupied_tables":"kpi.info.occupied_tables","open_alerts":"kpi.info.open_alerts","open_bills":"kpi.info.open_bills","payment_method":"kpi.info.payment_method","pending_confirmations":"kpi.info.pending_confirmations","reservation_tables":"kpi.info.reservation_tables","reservations_today":"kpi.info.reservations_today","revenue":"kpi.info.revenue","revpash":"kpi.info.revpash","shift_payments":"kpi.info.shift_payments","table_occupancy":"kpi.info.table_occupancy","tips":"kpi.info.tips","tips_to_share":"kpi.info.tips_to_share","total_loss":"kpi.info.total_loss","total_seats":"kpi.info.total_seats","turnover":"kpi.info.turnover","upcoming_arrivals":"kpi.info.upcoming_arrivals","upcoming_reservations":"kpi.info.upcoming_reservations","vat":"kpi.info.vat","waiting_list":"kpi.info.waiting_list"};

  function canonicalKey(raw) {
    var key = String(raw || '').toLowerCase();
    var aliases = {
      no_show: 'no_show_rate', avg_party_size: 'average_party_size',
      average_table_turn_time: 'average_turn_time', avg_table_turn_time: 'average_turn_time',
      waitlist: 'waiting_list', revenue_per_available_seat_hour: 'revpash',
      avg_settlement_time: 'average_settlement_time', declined_transactions: 'failed_transactions',
      total_payments_shift: 'shift_payments', payments_shift: 'shift_payments',
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
    var text = String(node.textContent || '').trim();
    if (!text || text === '—' || text === '–' || text === '-') node.textContent = '0';
  }

  function explanation(card) {
    var key = canonicalKey(card.getAttribute('data-pmd-dashboard2-kpi'));
    var messageKey = PMD_KPI_MESSAGE_KEYS[key] || '';
    var copy = messageKey ? pmdT(messageKey, '') : '';
    if (copy) return copy;
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    var name = title ? String(title.textContent || '').trim() : key;
    return pmdT('kpi.info.fallback', 'This KPI shows the current value for :name.', {name: name});
  }

  function close(card) {
    if (!card) return;
    card.classList.remove('is-pmd-kpi-info-open');
    card.removeAttribute('data-pmd-kpi-info-open');
    var button = card.querySelector('[data-pmd-kpi-info-button]');
    if (button) button.setAttribute('aria-pressed', 'false');
  }

  function ensure(card) {
    if (!card) return false;

    // PMD_KPI_INFO_SERVER_FIRST_PAINT_V3
    // Blade owns the visual control. Never append visible nodes during boot.
    return Boolean(
      card.querySelector('[data-pmd-kpi-info-button]') &&
      card.querySelector('[data-pmd-kpi-info-panel]')
    );
  }

  function mount() {
    // Attribute-only localization is safe; no visible card content is replaced.
    syncLabels();
  }

  function syncLabels() {
    Array.prototype.forEach.call(section.querySelectorAll('[data-pmd-kpi-info-button]'), function (button) {
      var label = pmdT('kpi.info.about', 'About this KPI');
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  section.addEventListener('click', function (event) {
    var button = event.target.closest('[data-pmd-kpi-info-button]');
    if (!button || !section.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();

    var card = button.closest('.pmd-r2-kpi-v2401-card');
    if (!card) return;
    var open = !card.classList.contains('is-pmd-kpi-info-open');

    Array.prototype.forEach.call(section.querySelectorAll('.is-pmd-kpi-info-open'), function (other) {
      if (other !== card) close(other);
    });

    if (!open) {
      close(card);
      return;
    }

    var menu = card.querySelector('[data-pmd-dashboard-lab-kpi-menu]');
    var more = card.querySelector('[data-pmd-dashboard-lab-kpi-menu-button]');
    if (menu) menu.hidden = true;
    if (more) more.setAttribute('aria-expanded', 'false');

    var panel = card.querySelector('[data-pmd-kpi-info-panel]');
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    if (panel) {
      var heading = panel.querySelector('strong');
      var body = panel.querySelector('span');
      if (heading) heading.textContent = title ? String(title.textContent || '').trim() : '';
      if (body) body.textContent = explanation(card);
    }

    card.classList.add('is-pmd-kpi-info-open');
    card.setAttribute('data-pmd-kpi-info-open', 'true');
    button.setAttribute('aria-pressed', 'true');
  });

  document.addEventListener('click', function (event) {
    var option = event.target.closest && event.target.closest('[data-pmd-dashboard-lab-kpi-option]');
    if (option && section.contains(option)) {
      var changedCard = option.closest('.pmd-r2-kpi-v2401-card');
      close(changedCard);
      if (changedCard) {
        normalizeZero(changedCard.querySelector('.pmd-r2-kpi-v2401-value'));
      }
    }
  }, false);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    Array.prototype.forEach.call(section.querySelectorAll('.is-pmd-kpi-info-open'), close);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  window.PMDKpiInfoV1 = {
    version: '1.2.0-server-first-paint',
    mount: mount,
    audit: function () {
      var cards = section.querySelectorAll('.pmd-r2-kpi-v2401-card[data-pmd-dashboard2-kpi]');
      var buttons = section.querySelectorAll('[data-pmd-kpi-info-button]');
      return { cards: cards.length, infoButtons: buttons.length, allCovered: cards.length === buttons.length, serverFirstPaint: true, bootVisualDomWrites: 0 };
    }
  };
})();
