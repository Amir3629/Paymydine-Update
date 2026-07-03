/* PMD Counter Dashboard v1
 * Frontend-only dashboard. Reuses owner dashboard JSON endpoint.
 */
(function () {
  'use strict';

  var API = '/admin/pmd-owner-dashboard-clean-v1-data';
  var state = { data: null, loading: false, lastError: null };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(v) {
    var n = Number(v || 0);
    if (!isFinite(n)) n = 0;
    return '€' + n.toFixed(2);
  }

  function metric(data, key) {
    return (data && data.metrics && data.metrics[key]) || { label: key, value: '—', raw: 0, note: '' };
  }

  function sections(data) {
    return (data && data.sections) || {};
  }

  function floorTables(data) {
    var fp = sections(data).floor_plan || {};
    var list =
      fp.tables ||
      fp.nodes ||
      fp.items ||
      fp.rows ||
      fp.floor_tables ||
      [];

    if (!Array.isArray(list)) {
      if (list && typeof list === 'object') list = Object.keys(list).map(function (k) { return list[k]; });
      else list = [];
    }

    return list;
  }

  function reservations(data) {
    var list = sections(data).upcoming_reservations || [];
    if (!Array.isArray(list)) return [];
    return list;
  }

  function getTableNumber(t, i) {
    return t.number || t.table_number || t.table_no || t.label || t.name || t.table_name || (i + 1);
  }

  function getTableId(t, i) {
    return t.id || t.table_id || t.key || getTableNumber(t, i);
  }

  function tableStatus(t) {
    var s = String(t.status || t.state || t.status_key || t.status_label || '').toLowerCase();
    if (s.indexOf('unpaid') >= 0 || s.indexOf('busy') >= 0 || s.indexOf('occupied') >= 0) return 'unpaid';
    if (s.indexOf('reserved') >= 0 || s.indexOf('hold') >= 0) return 'reserved';
    if (s.indexOf('ready') >= 0) return 'ready';
    return 'free';
  }

  function tableAmount(t) {
    return t.due_amount || t.unpaid_amount || t.total || t.open_total || 0;
  }

  function pos(t, i, prop, fallback) {
    var val = t[prop];
    if (val == null && prop === 'left') val = t.x;
    if (val == null && prop === 'top') val = t.y;
    if (val == null && prop === 'width') val = t.w;
    if (val == null && prop === 'height') val = t.h;

    var n = Number(val);
    if (isFinite(n)) return n;

    var col = i % 5;
    var row = Math.floor(i / 5);
    if (prop === 'left') return 3 + col * 19;
    if (prop === 'top') return 7 + row * 20;
    if (prop === 'width') return 15;
    if (prop === 'height') return 14;
    return fallback;
  }

  function renderKpis(data) {
    var el = document.querySelector('[data-pmd-counter-kpis]');
    if (!el) return;

    var tables = floorTables(data);
    var res = reservations(data);
    var free = tables.filter(function (t, i) { return tableStatus(t) === 'free'; }).length;
    var attention = res.filter(function (r) {
      var txt = JSON.stringify(r || {}).toLowerCase();
      return txt.indexOf('late') >= 0 || txt.indexOf('delay') >= 0 || txt.indexOf('cancel') >= 0 || txt.indexOf('no-show') >= 0;
    }).length;

    var cards = [
      {
        label: 'Today Reservations',
        value: metric(data, 'reservations_today').value || String(res.length),
        note: metric(data, 'reservations_today').note || (res.length + ' upcoming card(s)')
      },
      {
        label: 'Upcoming Next',
        value: res.length ? (res[0].time || res[0].reserve_time || res[0].start_time || 'Soon') : '—',
        note: res.length ? (res[0].table_label || res[0].guest_label || res[0].name || 'Next reservation') : 'No upcoming reservation'
      },
      {
        label: 'Free Tables',
        value: free + ' / ' + tables.length,
        note: 'Live floor availability'
      },
      {
        label: 'Attention',
        value: String(attention),
        note: 'Delay / cancel / no-show risk'
      }
    ];

    el.innerHTML = cards.map(function (c) {
      return '<article><small>' + esc(c.label) + '</small><strong>' + esc(c.value) + '</strong><span>' + esc(c.note || '') + '</span></article>';
    }).join('');
  }

  function renderFloor(data) {
    var host = document.querySelector('[data-pmd-counter-floor]');
    if (!host) return;

    var tables = floorTables(data);

    if (!tables.length) {
      host.innerHTML = '<div class="pmd-counter-empty-v1">No floor table data detected yet.</div>';
      return;
    }

    var nodes = tables.map(function (t, i) {
      var status = tableStatus(t);
      var id = getTableId(t, i);
      var num = getTableNumber(t, i);
      var left = pos(t, i, 'left', 3);
      var top = pos(t, i, 'top', 7);
      var width = pos(t, i, 'width', 15);
      var height = pos(t, i, 'height', 14);
      var amount = tableAmount(t);
      var amountHtml = Number(amount) > 0 ? '<em>' + esc(money(amount)) + '</em>' : '';
      var label = status === 'unpaid' ? 'UNPAID' : status === 'reserved' ? 'RESERVED' : 'FREE';

      return '<button type="button" title="Table ' + esc(num) + '" data-pmd-table="' + esc(id) + '" ' +
        'class="pmd-v15-floor-node pmd-v15-floor-node--' + esc(status) + ' pmd-v26-floor-table-card pmd-v27-floor-table-card pmd-v29-table-node pmd-v29-table-' + esc(status === 'unpaid' ? 'busy' : status) + '" ' +
        'style="left:' + left + '%;top:' + top + '%;width:' + width + '%;height:' + height + '%">' +
        '<span class="pmd-v15-node-number">' + esc(num) + '</span>' +
        '<span class="pmd-v15-node-pill">' + esc(label) + '</span>' +
        amountHtml +
        '</button>';
    }).join('');

    host.innerHTML = '<div class="pmd-v15-floor-canvas"><div class="pmd-v15-floor-bg"></div>' + nodes + '</div>';
  }

  function reservationTitle(r, i) {
    return r.guest_name || r.customer_name || r.name || r.title || ((r.first_name || '') + ' ' + (r.last_name || '')).trim() || ('Reservation #' + (r.id || i + 1));
  }

  function reservationTime(r) {
    return r.time || r.reserve_time || r.start_time || r.start || r.date_time || r.reserve_date || 'Time not set';
  }

  function renderReservations(data) {
    var host = document.querySelector('[data-pmd-counter-reservations]');
    if (!host) return;

    var list = reservations(data).slice(0, 12);

    if (!list.length) {
      host.innerHTML = '<div class="pmd-counter-empty-v1">No upcoming reservation cards detected.</div>';
      return;
    }

    host.innerHTML = list.map(function (r, i) {
      var id = r.id || r.reservation_id || '';
      var guest = r.guest_num || r.guests || r.guest_count || '—';
      var table = r.table_label || r.table_name || r.tables || r.table || 'No table';
      var phone = r.telephone || r.phone || r.customer_phone || '';
      var status = r.status_label || r.status || 'Upcoming';
      var href = id ? '/admin/reservations/edit/' + encodeURIComponent(id) : '/admin/reservations';

      return '<article class="pmd-counter-res-card-v1">' +
        '<div>' +
          '<strong>' + esc(reservationTitle(r, i)) + '</strong>' +
          '<small>' + esc(status) + '</small>' +
          '<div class="pmd-counter-res-meta-v1">' +
            '<span>👥 ' + esc(guest) + '</span>' +
            '<span>🪑 ' + esc(table) + '</span>' +
            (phone ? '<span>☎ ' + esc(phone) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div>' +
          '<span class="pmd-counter-res-time-v1">' + esc(reservationTime(r)) + '</span>' +
          '<div style="height:8px"></div>' +
          '<a class="pmd-counter-btn-v1" href="' + esc(href) + '">Open</a>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function render(data) {
    renderKpis(data);
    renderFloor(data);
    renderReservations(data);
  }

  function load() {
    if (state.loading) return;
    state.loading = true;
    state.lastError = null;

    fetch(API, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        state.data = data;
        render(data);
      })
      .catch(function (err) {
        state.lastError = err.message || String(err);
        document.querySelectorAll('[data-pmd-counter-floor], [data-pmd-counter-reservations]').forEach(function (el) {
          el.innerHTML = '<div class="pmd-counter-empty-v1">Counter dashboard data error: ' + esc(state.lastError) + '</div>';
        });
      })
      .finally(function () {
        state.loading = false;
      });
  }

  function bind() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-pmd-counter-refresh]')) {
        e.preventDefault();
        load();
      }
    });
  }

  window.PMDCounterDashboardV1 = {
    load: load,
    report: function () {
      var data = state.data || {};
      return {
        ready: true,
        path: location.pathname,
        ok: !!data.ok,
        version: data.version || null,
        floorTables: floorTables(data).length,
        reservations: reservations(data).length,
        error: state.lastError
      };
    }
  };

  bind();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
