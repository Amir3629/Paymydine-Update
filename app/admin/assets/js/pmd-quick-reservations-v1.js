/* PMD_QPOS_QUICK_RESERVATIONS_R128
 * Same Quick POS shell, same table rail; only left + center switch to
 * Reservations. Canonical Reservation Composer remains the write authority.
 */
(function () {
  'use strict';

  if (window.PMDQuickReservationsR128) return;

  var root = document.getElementById('pmd-quick-pos');
  if (!root) return;

  var left = document.querySelector('[data-qpos-reservations-left]');
  var center = document.querySelector('[data-qpos-reservations-center]');
  var posCatalog = root.querySelector('.pmd-qpos-catalog');
  var posCart = root.querySelector('.pmd-qpos-cart');
  var list = document.querySelector('[data-qres-list]');
  var timeline = document.querySelector('[data-qres-timeline]');
  var dateInput = document.querySelector('[data-qres-date]');
  var searchInput = document.querySelector('[data-qres-search]');
  var tableFilter = document.querySelector('[data-qres-table-filter]');
  var tableFilterText = document.querySelector('[data-qres-table-filter-text]');
  var dateLabel = document.querySelector('[data-qres-date-label]');
  var countNode = document.querySelector('[data-qres-count]');
  var guestNode = document.querySelector('[data-qres-guests]');
  var tableNode = document.querySelector('[data-qres-tables]');
  var clockNode = document.querySelector('[data-qres-clock]');

  var state = {
    workspace: root.getAttribute('data-workspace') === 'reservations'
      ? 'reservations'
      : 'pos',
    date: root.getAttribute('data-qpos-reservations-today') || '',
    today: root.getAttribute('data-qpos-reservations-today') || '',
    rows: [],
    selectedTableId: 0,
    selectedTableName: '',
    search: '',
    filter: 'all',
    requestId: 0,
    loading: false
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csrfToken() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node && node.content ? node.content : '';
  }

  function toast(message, error) {
    var box = document.querySelector('[data-qpos-toast]');
    if (!box) return;
    box.textContent = String(message || '');
    box.classList.toggle('is-error', !!error);
    box.classList.add('is-show');
    window.setTimeout(function () { box.classList.remove('is-show'); }, 2200);
  }

  function localClock() {
    if (!clockNode) return;
    var now = new Date();
    clockNode.textContent =
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(value + 'T12:00:00'));
    } catch (ignore) {
      return value;
    }
  }

  function shiftDate(value, days) {
    var date = new Date((value || state.today) + 'T12:00:00');
    date.setDate(date.getDate() + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function rowName(row) {
    return String(
      row.customer_name ||
      row.guest_name ||
      ((row.first_name || '') + ' ' + (row.last_name || ''))
    ).trim() || 'Guest';
  }

  function rowTables(row) {
    var names = Array.isArray(row.table_names) ? row.table_names.filter(Boolean) : [];
    if (names.length) return names.join(', ');
    return String(row.table_name || '').trim() || 'Automatic table';
  }

  function rowIds(row) {
    var ids = Array.isArray(row.table_ids) ? row.table_ids : [];
    return ids.map(Number).filter(function (id, index, listIds) {
      return Number.isInteger(id) && id > 0 && listIds.indexOf(id) === index;
    });
  }

  function rowStatus(row) {
    return String(row.status_name || row.status || 'Reservation').trim() || 'Reservation';
  }

  function rowIsPast(row) {
    var time = String(row.reserve_time || '00:00').slice(0, 5);
    if (state.date < state.today) return true;
    if (state.date > state.today) return false;
    var now = new Date();
    var current = now.getHours() * 60 + now.getMinutes();
    var parts = time.split(':').map(Number);
    return ((parts[0] || 0) * 60 + (parts[1] || 0)) < current;
  }

  function filteredRows() {
    var needle = state.search.toLowerCase();
    return state.rows.filter(function (row) {
      if (state.filter === 'upcoming' && rowIsPast(row)) return false;
      if (state.filter === 'past' && !rowIsPast(row)) return false;
      if (!needle) return true;
      var haystack = [
        rowName(row),
        rowTables(row),
        row.telephone || '',
        row.email || '',
        row.reserve_time || '',
        rowStatus(row),
        row.reservation_id || ''
      ].join(' ').toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });
  }

  function renderTableFilter() {
    if (!tableFilter) return;
    var visible = state.selectedTableId > 0;
    tableFilter.classList.toggle('is-visible', visible);
    if (tableFilterText) {
      tableFilterText.textContent = visible
        ? 'Table ' + (state.selectedTableName || state.selectedTableId)
        : '';
    }

    root.querySelectorAll('[data-qpos-table]').forEach(function (button) {
      var id = Number(button.getAttribute('data-qpos-table') || 0);
      button.classList.toggle(
        'is-reservation-filter-r128',
        visible && id === state.selectedTableId
      );
    });
  }

  function renderStats(rows) {
    if (countNode) countNode.textContent = String(rows.length);
    if (guestNode) {
      guestNode.textContent = String(rows.reduce(function (sum, row) {
        return sum + Math.max(0, Number(row.guest_num || row.guests || 0));
      }, 0));
    }
    if (tableNode) {
      var ids = {};
      rows.forEach(function (row) {
        rowIds(row).forEach(function (id) { ids[id] = true; });
      });
      tableNode.textContent = String(Object.keys(ids).length);
    }
  }

  function renderList() {
    var rows = filteredRows();
    renderStats(rows);
    if (!list) return;

    if (state.loading) {
      list.innerHTML = '<div class="pmd-qres-loading">Loading reservations…</div>';
      return;
    }

    if (!rows.length) {
      list.innerHTML =
        '<div class="pmd-qres-empty">No reservations match this day and table.</div>';
      return;
    }

    list.innerHTML = rows.map(function (row) {
      var duration = Math.max(1, Number(row.duration || 45));
      var guests = Math.max(0, Number(row.guest_num || row.guests || 0));
      return (
        '<button type="button" class="pmd-qres-list-card" data-qres-edit="' +
          esc(row.reservation_id || row.id) + '">' +
          '<span class="pmd-qres-list-time">' + esc(String(row.reserve_time || '').slice(0,5)) + '</span>' +
          '<span class="pmd-qres-list-copy">' +
            '<strong>' + esc(rowName(row)) + '</strong>' +
            '<small>' + esc(guests + ' pax · ' + rowTables(row) + ' · ' + duration + ' min') + '</small>' +
            '<span class="pmd-qres-status">' + esc(rowStatus(row)) + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');
  }

  function renderTimeline() {
    var rows = filteredRows();
    if (!timeline) return;

    if (state.loading) {
      timeline.innerHTML = '<div class="pmd-qres-loading">Loading schedule…</div>';
      return;
    }

    if (!rows.length) {
      timeline.innerHTML =
        '<div class="pmd-qres-empty">' +
          '<div><strong>No reservations here yet.</strong><br>' +
          'Use New reservation to book this day' +
          (state.selectedTableId ? ' for the selected table.' : '.') +
          '</div>' +
        '</div>';
      return;
    }

    timeline.innerHTML = rows.map(function (row) {
      var id = row.reservation_id || row.id;
      var guests = Math.max(0, Number(row.guest_num || row.guests || 0));
      var duration = Math.max(1, Number(row.duration || 45));
      var contact = String(row.telephone || row.email || '').trim();
      return (
        '<div class="pmd-qres-timeline-row">' +
          '<div class="pmd-qres-timeline-time">' + esc(String(row.reserve_time || '').slice(0,5)) + '</div>' +
          '<button type="button" class="pmd-qres-timeline-card" data-qres-edit="' + esc(id) + '">' +
            '<div class="pmd-qres-timeline-card-head">' +
              '<strong>' + esc(rowName(row)) + '</strong>' +
              '<span>' + esc(guests + ' pax') + '</span>' +
            '</div>' +
            '<div class="pmd-qres-timeline-meta">' +
              '<span>' + esc(rowTables(row)) + '</span>' +
              '<span>' + esc(duration + ' min') + '</span>' +
              '<span>' + esc(rowStatus(row)) + '</span>' +
              (contact ? '<span>' + esc(contact) + '</span>' : '') +
            '</div>' +
          '</button>' +
        '</div>'
      );
    }).join('');
  }

  function render() {
    if (dateInput && dateInput.value !== state.date) dateInput.value = state.date;
    if (dateLabel) dateLabel.textContent = formatDate(state.date);
    renderTableFilter();
    renderList();
    renderTimeline();
  }

  async function loadReservations() {
    if (state.workspace !== 'reservations') return;
    var requestId = ++state.requestId;
    state.loading = true;
    render();

    var url = '/admin/pos/reservations-data?date=' +
      encodeURIComponent(state.date || state.today);
    if (state.selectedTableId) {
      url += '&table_id=' + encodeURIComponent(String(state.selectedTableId));
    }
    url += '&_=' + Date.now();

    try {
      var response = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken()
        }
      });
      var json = await response.json();
      if (!response.ok || !json || json.ok !== true) {
        throw new Error(json && json.error ? json.error : 'Reservations could not be loaded.');
      }
      if (requestId !== state.requestId) return;

      state.today = String(json.today || state.today || '');
      state.date = String(json.date || state.date || state.today);
      state.rows = Array.isArray(json.reservations) ? json.reservations : [];
      state.loading = false;

      window.PMD_RESERVATIONS_BOOT = Object.assign(
        {},
        window.PMD_RESERVATIONS_BOOT || {},
        {
          today: state.today,
          reservations: state.rows.slice()
        }
      );

      render();
    } catch (error) {
      if (requestId !== state.requestId) return;
      state.loading = false;
      state.rows = [];
      render();
      if (list) {
        list.innerHTML = '<div class="pmd-qres-error">' +
          esc(error && error.message ? error.message : 'Reservations could not be loaded.') +
          '</div>';
      }
      if (timeline) {
        timeline.innerHTML = '<div class="pmd-qres-error">Reservations could not be loaded.</div>';
      }
    }
  }

  function setWorkspace(next, updateUrl) {
    next = next === 'reservations' ? 'reservations' : 'pos';
    state.workspace = next;
    root.setAttribute('data-workspace', next);

    if (left) left.hidden = next !== 'reservations';
    if (center) center.hidden = next !== 'reservations';
    if (posCatalog) posCatalog.hidden = next === 'reservations';
    if (posCart) posCart.hidden = next === 'reservations';

    root.querySelectorAll('[data-qpos-workspace-switch]').forEach(function (button) {
      button.hidden = button.getAttribute('data-qpos-workspace-switch') === next;
    });

    if (updateUrl && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      if (next === 'reservations') url.searchParams.set('workspace', 'reservations');
      else url.searchParams.delete('workspace');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }

    if (next === 'reservations') {
      loadReservations();
    }
  }

  function currentFloorMeta() {
    var active = root.querySelector('[data-qpos-floor].is-active');
    return {
      id: active ? String(active.getAttribute('data-qpos-floor') || '') : '',
      name: active ? String(active.textContent || '').trim() : ''
    };
  }

  function rowById(id) {
    id = Number(id || 0);
    return state.rows.find(function (row) {
      return Number(row.reservation_id || row.id || 0) === id;
    }) || null;
  }

  function openComposer(reservationId, selectedTime, trigger) {
    var api = window.PMDReservationComposerV1;
    var id = Number(reservationId || 0);
    var row = id ? rowById(id) : null;
    var floor = currentFloorMeta();

    var tableIds = row
      ? rowIds(row)
      : (state.selectedTableId ? [state.selectedTableId] : []);
    var tableNames = row
      ? (Array.isArray(row.table_names) ? row.table_names.slice() : [])
      : (state.selectedTableName ? [state.selectedTableName] : []);

    var fallback = id
      ? '/admin/reservations/edit/' + id
      : '/admin/reservations/create?reserve_date=' + encodeURIComponent(state.date);

    if (!api || typeof api.open !== 'function') {
      window.location.href = fallback;
      return;
    }

    api.open({
      version: 1,
      mode: id ? 'edit' : 'create',
      source: 'quick-pos-reservations-r128',
      reservationId: id || null,
      selectedDate: state.date,
      selectedTime: selectedTime || null,
      duration: row ? Number(row.duration || 0) || null : null,
      tableIds: tableIds,
      tableNames: tableNames,
      floorId: floor.id || null,
      floorName: floor.name || null,
      floorLocked: !id && tableIds.length > 0,
      locationId: null,
      returnView: 'floor',
      fallbackUrl: fallback
    }, trigger || null).catch(function () {
      var composer = document.getElementById('pmd-reservation-composer-v1');
      if (!composer || !composer.classList.contains('show')) {
        window.location.href = fallback;
      }
    });
  }

  function selectReservationTable(button) {
    var id = Number(button.getAttribute('data-qpos-table') || 0);
    if (!id || button.disabled) return;
    state.selectedTableId = id;
    state.selectedTableName = String(
      (button.querySelector('strong') || {}).textContent || id
    ).trim();
    renderTableFilter();
    loadReservations();
  }

  document.addEventListener('click', function (event) {
    var switcher = event.target && event.target.closest
      ? event.target.closest('[data-qpos-workspace-switch]')
      : null;
    if (switcher) {
      event.preventDefault();
      event.stopPropagation();
      setWorkspace(switcher.getAttribute('data-qpos-workspace-switch'), true);
      return;
    }

    if (state.workspace !== 'reservations') return;

    var tableButton = event.target && event.target.closest
      ? event.target.closest('[data-qpos-table]')
      : null;
    if (tableButton && root.contains(tableButton)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selectReservationTable(tableButton);
      return;
    }

    var pickup = event.target && event.target.closest
      ? event.target.closest('[data-qpos-pickup]')
      : null;
    if (pickup && root.contains(pickup)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toast('Pickup is available in POS mode.');
    }
  }, true);

  document.addEventListener('click', function (event) {
    var edit = event.target && event.target.closest
      ? event.target.closest('[data-qres-edit]')
      : null;
    if (edit) {
      openComposer(Number(edit.getAttribute('data-qres-edit') || 0), null, edit);
      return;
    }

    var create = event.target && event.target.closest
      ? event.target.closest('[data-qres-new]')
      : null;
    if (create) {
      openComposer(0, null, create);
      return;
    }

    var shift = event.target && event.target.closest
      ? event.target.closest('[data-qres-shift]')
      : null;
    if (shift) {
      state.date = shiftDate(state.date, Number(shift.getAttribute('data-qres-shift') || 0));
      loadReservations();
      return;
    }

    var today = event.target && event.target.closest
      ? event.target.closest('[data-qres-today]')
      : null;
    if (today) {
      state.date = state.today;
      loadReservations();
      return;
    }

    var filter = event.target && event.target.closest
      ? event.target.closest('[data-qres-filter]')
      : null;
    if (filter) {
      state.filter = String(filter.getAttribute('data-qres-filter') || 'all');
      document.querySelectorAll('[data-qres-filter]').forEach(function (button) {
        button.classList.toggle(
          'is-active',
          button.getAttribute('data-qres-filter') === state.filter
        );
      });
      render();
      return;
    }

    var clearTable = event.target && event.target.closest
      ? event.target.closest('[data-qres-clear-table]')
      : null;
    if (clearTable) {
      state.selectedTableId = 0;
      state.selectedTableName = '';
      renderTableFilter();
      loadReservations();
    }
  });

  if (dateInput) {
    dateInput.addEventListener('change', function () {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) return;
      state.date = dateInput.value;
      loadReservations();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = String(searchInput.value || '').trim();
      render();
    });
  }

  window.addEventListener('pmd:qpos:tables-rendered', renderTableFilter);
  window.addEventListener('pmd:reservation-saved', function () {
    window.setTimeout(loadReservations, 80);
  });

  if (!window.PMDReservationsCardsV320) {
    window.PMDReservationsCardsV320 = {
      version: 'qpos-r128-bridge',
      refresh: function () {
        window.setTimeout(loadReservations, 0);
        return Promise.resolve();
      }
    };
  }

  localClock();
  window.setInterval(localClock, 30000);

  setWorkspace(state.workspace, false);

  window.PMDQuickReservationsR128 = {
    version: '1.0.0-r128',
    setWorkspace: setWorkspace,
    refresh: loadReservations,
    newReservation: function () { openComposer(0, null, null); },
    getState: function () {
      return {
        workspace: state.workspace,
        date: state.date,
        selectedTableId: state.selectedTableId,
        count: state.rows.length
      };
    }
  };
})();
