/* PMD_KPI_INFO_AUTHORITY_V3_SERVER_FIRST_PAINT */
(function () {
  'use strict';
  if (window.PMDKpiInfoV1) return;

  var section = document.getElementById('pmd-r2-reservation-kpis-v307');
  if (!section) return;

  function locale() {
    var value = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en').toLowerCase();
    return value.indexOf('de') === 0 ? 'de' : 'en';
  }

  var COPY = {
    en: {
      revenue: 'Revenue from paid or settled orders for the selected period.',
      guests: 'Guests actually recorded on served orders. 0 means no usable guest sample yet.',
      turnover: 'Average duration of completed table visits. 0 means no completed visit sample yet.',
      channels: 'Number of dine-in orders compared with takeaway orders.',
      kitchen: 'Average time from kitchen start or receipt until ready or served.',
      occupancy: 'Percentage of enabled tables that are occupied right now.',
      menu: 'How much of the active menu is currently available to sell.',
      tips: 'Tips recorded on paid or settled orders.',
      live_orders: 'Orders that are currently active in service.',
      open_alerts: 'Operational issues that currently need manager attention.',
      occupied_tables: 'Tables currently marked occupied on the visible Floor.',
      upcoming_reservations: 'Reservations still expected to arrive.',
      reservations_today: 'Active reservations scheduled for today.',
      upcoming_arrivals: 'Future active reservations that are still expected to arrive.',
      pending_confirmations: 'Reservations that still need confirmation.',
      available_tables: 'Tables currently available for reservation or service.',
      table_occupancy: 'Percentage of enabled tables that are currently occupied.',
      no_show_rate: 'Share of reservations where the guest did not arrive.',
      cancellation_rate: 'Share of reservations that were cancelled.',
      average_party_size: 'Average number of guests per reservation.',
      reservation_tables: 'Tables included in the reservation workspace.',
      total_seats: 'Total seats/capacity reported by Reservations. It is not labeled as currently free seats.',
      average_turn_time: 'Average time a completed table visit occupied its table.',
      waiting_list: 'Guests or parties currently on the waiting list.',
      revpash: 'Revenue per available seat hour: revenue compared with available seating time.',
      open_bills: 'Bills that are not yet financially closed.',
      average_settlement_time: 'Average time until an order or bill becomes settled.',
      shift_payments: 'Payments recorded in the current cashier shift.',
      failed_transactions: 'Payment attempts that failed or were declined.',
      cash_percent: 'Cash payments as a percentage of all payments.',
      vat: 'VAT recorded on the relevant settled sales.',
      gross_to_net: 'Gross sales compared with the net amount after discounts and adjustments.',
      total_loss: 'Value of voids, refunds, and other loss adjustments.',
      payment_method: 'The payment method used most often in the selected period.',
      average_checks: 'Average value of settled orders or checks.',
      tips_to_share: 'Tips currently marked to be shared.'
    },
    de: {
      revenue: 'Umsatz aus bezahlten oder abgerechneten Bestellungen im gewählten Zeitraum.',
      guests: 'Tatsächlich in Bestellungen erfasste Gäste. 0 bedeutet: noch keine nutzbare Gast-Stichprobe.',
      turnover: 'Durchschnittliche Dauer abgeschlossener Tischbesuche. 0 bedeutet: noch kein abgeschlossener Besuch.',
      channels: 'Vergleich der Anzahl Vor-Ort- und Mitnahme-Bestellungen.',
      kitchen: 'Durchschnittliche Zeit vom Küchenstart bis Bereit oder Serviert.',
      occupancy: 'Anteil der aktivierten Tische, die aktuell belegt sind.',
      menu: 'Wie viel des aktiven Menüs aktuell verkauft werden kann.',
      tips: 'Erfasstes Trinkgeld aus bezahlten oder abgerechneten Bestellungen.',
      live_orders: 'Bestellungen, die im laufenden Service aktiv sind.',
      open_alerts: 'Operative Punkte, die aktuell Aufmerksamkeit des Managers brauchen.',
      occupied_tables: 'Tische, die im sichtbaren Floor aktuell als belegt markiert sind.',
      upcoming_reservations: 'Reservierungen, deren Ankunft noch erwartet wird.',
      reservations_today: 'Aktive Reservierungen, die für heute geplant sind.',
      upcoming_arrivals: 'Künftige aktive Reservierungen, deren Ankunft noch erwartet wird.',
      pending_confirmations: 'Reservierungen, die noch bestätigt werden müssen.',
      available_tables: 'Tische, die aktuell für Reservierung oder Service verfügbar sind.',
      table_occupancy: 'Anteil der aktivierten Tische, die aktuell belegt sind.',
      no_show_rate: 'Anteil der Reservierungen, bei denen die Gäste nicht erschienen sind.',
      cancellation_rate: 'Anteil der Reservierungen, die storniert wurden.',
      average_party_size: 'Durchschnittliche Gästezahl pro Reservierung.',
      reservation_tables: 'Tische, die im Reservierungsbereich enthalten sind.',
      total_seats: 'Von Reservierungen gemeldete Sitzplatzanzahl/Kapazität. Sie ist nicht als aktuell freie Sitzplätze gekennzeichnet.',
      average_turn_time: 'Durchschnittliche Dauer eines abgeschlossenen Tischbesuchs.',
      waiting_list: 'Gäste oder Gruppen, die aktuell auf der Warteliste stehen.',
      revpash: 'Umsatz pro verfügbarer Sitzplatzstunde.',
      open_bills: 'Rechnungen, die finanziell noch nicht abgeschlossen sind.',
      average_settlement_time: 'Durchschnittliche Zeit bis eine Bestellung oder Rechnung abgerechnet ist.',
      shift_payments: 'Zahlungen, die in der aktuellen Kassenschicht erfasst wurden.',
      failed_transactions: 'Zahlungsversuche, die fehlgeschlagen oder abgelehnt wurden.',
      cash_percent: 'Barzahlungen als Anteil aller Zahlungen.',
      vat: 'Erfasste MwSt. der relevanten abgerechneten Verkäufe.',
      gross_to_net: 'Bruttoumsatz im Vergleich zum Nettobetrag nach Rabatten und Anpassungen.',
      total_loss: 'Wert von Stornos, Rückerstattungen und Verlustanpassungen.',
      payment_method: 'Die im gewählten Zeitraum am häufigsten verwendete Zahlungsart.',
      average_checks: 'Durchschnittlicher Wert abgerechneter Bestellungen oder Rechnungen.',
      tips_to_share: 'Trinkgeld, das aktuell zur Verteilung markiert ist.'
    }
  };

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
    var lang = locale();
    var key = canonicalKey(card.getAttribute('data-pmd-dashboard2-kpi'));
    var copy = COPY[lang][key];
    if (copy) return copy;
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    var name = title ? String(title.textContent || '').trim() : key;
    return lang === 'de'
      ? 'Diese KPI zeigt den aktuellen Wert für ' + name + '.'
      : 'This KPI shows the current value for ' + name + '.';
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
    var lang = locale();
    Array.prototype.forEach.call(section.querySelectorAll('[data-pmd-kpi-info-button]'), function (button) {
      var label = lang === 'de' ? 'Info zu dieser KPI' : 'About this KPI';
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
