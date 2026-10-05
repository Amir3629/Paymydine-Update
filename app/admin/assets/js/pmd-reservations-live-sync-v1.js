/* PMD_RESERVATIONS_PUBLIC_BOOKING_LIVE_SYNC_R18
 * Event-driven only: consumes the existing admin notification/live snapshot
 * stream. It creates no timer and no extra polling loop.
 */
(function () {
  'use strict';

  if (window.PMDReservationsPublicBookingLiveSyncR18) return;

  var root = document.getElementById('pmd-reservations-cards-v2-1');

  function lang() {
    var value = String(document.documentElement.lang || 'en').toLowerCase();
    if (value.indexOf('de') === 0) return 'de';
    if (value.indexOf('tr') === 0) return 'tr';
    return 'en';
  }

  function text() {
    var code = lang();
    if (code === 'de') {
      return {
        reservation: 'Reservierung',
        reservations: 'Reservierungen',
        time: 'Uhrzeit',
        guests: 'Gäste',
        table: 'Tisch',
        open: 'Reservierung öffnen',
        noTable: 'Noch kein Tisch',
        empty: 'Keine Reservierung',
        confirmed: 'Bestätigt',
        pending: 'Ausstehend',
        cancelled: 'Storniert',
        arrived: 'Angekommen',
        completed: 'Abgeschlossen',
        scheduled: 'Geplant'
      };
    }
    if (code === 'tr') {
      return {
        reservation: 'Rezervasyon',
        reservations: 'Rezervasyonlar',
        time: 'Saat',
        guests: 'Kişi',
        table: 'Masa',
        open: 'Rezervasyonu aç',
        noTable: 'Henüz masa yok',
        empty: 'Rezervasyon yok',
        confirmed: 'Onaylandı',
        pending: 'Beklemede',
        cancelled: 'İptal edildi',
        arrived: 'Geldi',
        completed: 'Tamamlandı',
        scheduled: 'Planlandı'
      };
    }
    return {
      reservation: 'Reservation',
      reservations: 'Reservations',
      time: 'Time',
      guests: 'Guests',
      table: 'Table',
      open: 'Open reservation',
      noTable: 'No table yet',
      empty: 'No Reservation',
      confirmed: 'Confirmed',
      pending: 'Pending',
      cancelled: 'Cancelled',
      arrived: 'Arrived',
      completed: 'Completed',
      scheduled: 'Scheduled'
    };
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function dateValue(row) {
    return String(
      row.reserve_date ||
      row.reservation_date ||
      row.date ||
      ''
    ).slice(0, 10);
  }

  function timeValue(row) {
    var match = String(
      row.reserve_time ||
      row.reservation_time ||
      row.time ||
      ''
    ).match(/(\d{1,2}):(\d{2})/);

    return match
      ? String(match[1]).padStart(2, '0') + ':' + match[2]
      : '—';
  }

  function reservationId(row) {
    return Number(row.reservation_id || row.id || row.booking_id || 0);
  }

  function guestName(row, id, labels) {
    var value = String(
      row.guest_name ||
      row.customer_name ||
      row.name ||
      ((row.first_name || '') + ' ' + (row.last_name || ''))
    ).replace(/\s+/g, ' ').trim();

    return value || (labels.reservation + ' #' + id);
  }

  function tableValue(row, labels) {
    var values = Array.isArray(row.table_names)
      ? row.table_names.slice()
      : [];

    if (!values.length) {
      var one = String(row.table_name || row.table || row.table_number || row.table_id || '').trim();
      if (one) values = [one];
    }

    values = values.map(function (value) {
      return String(value || '')
        .replace(/^(?:table|tisch)\s*#?\s*/i, '')
        .trim();
    }).filter(Boolean);

    return values.length ? values.join(', ') : labels.noTable;
  }

  function status(row) {
    var raw = row.status || row.status_name || row.state || '';
    if (raw && typeof raw === 'object') {
      raw = raw.name || raw.label || raw.status || raw.status_name || '';
    }
    raw = String(raw || '').toLowerCase().trim();

    if (/cancel|declin|reject|no.?show|storn|abgelehnt/.test(raw)) return 'cancelled';
    if (/pending|request|wait|aussteh|wart/.test(raw)) return 'pending';
    if (/arriv|seat|angekommen|platziert/.test(raw)) return 'arrived';
    if (/complete|finished|abgesch/.test(raw)) return 'completed';
    if (/confirm|approved|bestät/.test(raw)) return 'confirmed';
    return 'scheduled';
  }

  function statusLabel(key, labels) {
    return labels[key] || labels.scheduled;
  }

  function dateLabel(value) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return value || '—';

    try {
      var locale = lang() === 'de' ? 'de-DE' : (lang() === 'tr' ? 'tr-TR' : 'en-GB');
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
    } catch (_) {
      return value;
    }
  }

  function renderCards(schedule) {
    root = root || document.getElementById('pmd-reservations-cards-v2-1');
    if (!root || !schedule || !Array.isArray(schedule.reservations)) return false;

    var labels = text();
    var from = String(root.getAttribute('data-pmd-range-from') || '');
    var to = String(root.getAttribute('data-pmd-range-to') || from);
    var rows = schedule.reservations.filter(function (row) {
      var date = dateValue(row);
      var id = reservationId(row);
      return id > 0 && date && (!from || date >= from) && (!to || date <= to);
    });

    rows.sort(function (a, b) {
      var left = dateValue(a) + ' ' + timeValue(a) + ' ' + String(reservationId(a)).padStart(12, '0');
      var right = dateValue(b) + ' ' + timeValue(b) + ' ' + String(reservationId(b)).padStart(12, '0');
      return left.localeCompare(right);
    });

    var count = root.querySelector('.pmd-ops-section__count');
    if (count) {
      count.innerHTML = '<strong>' + rows.length + '</strong> ' +
        esc(rows.length === 1 ? labels.reservation : labels.reservations);
    }

    var grid = root.querySelector('.pmd-ops-grid');
    if (!grid) return false;

    var addCard = grid.querySelector('[data-pmd-reservations-card-create]');
    if (addCard) addCard = addCard.cloneNode(true);
    grid.innerHTML = '';
    if (addCard) grid.appendChild(addCard);

    if (!rows.length) {
      var empty = document.createElement('article');
      empty.className = 'pmd-ops-inline-empty-card';
      empty.setAttribute('data-pmd-reservations-empty-card', '1');
      empty.innerHTML = '<strong>' + esc(labels.empty) + '</strong>';
      grid.appendChild(empty);
      return true;
    }

    rows.forEach(function (row) {
      var id = reservationId(row);
      var date = dateValue(row);
      var time = timeValue(row);
      var guests = Math.max(0, Number(row.guest_num || row.guests || row.party_size || 0));
      var key = status(row);
      var article = document.createElement('article');
      article.className = 'pmd-ops-card';
      article.setAttribute('data-pmd-reservation-card', String(id));
      article.innerHTML =
        '<header class="pmd-ops-card__head">' +
          '<strong class="pmd-ops-card__title">' + esc(guestName(row, id, labels)) + '</strong>' +
          '<span class="pmd-ops-card__status is-' + esc(key) + '">' + esc(statusLabel(key, labels)) + '</span>' +
        '</header>' +
        '<div class="pmd-ops-card__meta"><strong>#' + id + '</strong><span>' + esc(dateLabel(date)) + '</span></div>' +
        '<dl class="pmd-ops-card__facts">' +
          '<div><dt>' + esc(labels.time) + '</dt><dd>' + esc(time) + '</dd></div>' +
          '<div><dt>' + esc(labels.guests) + '</dt><dd>' + guests + '</dd></div>' +
          '<div><dt>' + esc(labels.table) + '</dt><dd>' + esc(tableValue(row, labels)) + '</dd></div>' +
        '</dl>' +
        '<footer class="pmd-ops-card__footer">' +
          '<a href="/admin/reservations/edit/' + id + '"' +
            ' data-pmd-reservations-card-edit="' + id + '"' +
            ' data-pmd-reservations-card-date="' + esc(date) + '"' +
            ' data-pmd-reservations-card-time="' + esc(time === '—' ? '' : time) + '">' +
            esc(labels.open) +
          '</a>' +
        '</footer>';

      grid.appendChild(article);
    });

    return true;
  }

  function apply(detail) {
    var extras = detail && detail.extras ? detail.extras : {};
    var schedule = extras.reservations_schedule;
    if (!schedule || !Array.isArray(schedule.reservations)) return false;

    if (
      window.PMDReservationsScheduleV1 &&
      typeof window.PMDReservationsScheduleV1.applyLivePayload === 'function'
    ) {
      window.PMDReservationsScheduleV1.applyLivePayload(schedule);
    }

    renderCards(schedule);
    return true;
  }

  window.addEventListener('pmd:dashboard:live-data', function (event) {
    apply(event && event.detail ? event.detail : {});
  });

  window.PMDReservationsPublicBookingLiveSyncR18 = {
    version: '1.0.0-r18',
    applyLivePayload: apply,
    renderCards: renderCards
  };
})();
