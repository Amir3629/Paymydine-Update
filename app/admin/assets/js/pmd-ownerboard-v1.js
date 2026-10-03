/* ==========================================================
   PMD OWNERBOARD V1 — CLEAN SINGLE-OWNER RUNTIME
   Route: /admin/ownerboard
   ========================================================== */
(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/ownerboard') return;

  var root = document.getElementById('pmd-ownerboard');
  if (!root) return;

  var VERSION = '1.1.0-clean-ownerboard';
  var locale = String(root.getAttribute('data-locale') || 'en').toLowerCase();
  var isDe = locale === 'de';

  var endpoints = {
    kpis: root.getAttribute('data-kpis-endpoint') || '/admin/dashboard2?pmd_kpis=1',
    analytics: root.getAttribute('data-analytics-endpoint') || '/admin/dashboard2?pmd_analytics=1',
    floor: root.getAttribute('data-floor-endpoint') || '/admin/ownerboard?pmd_floor=1',
    floorSave: root.getAttribute('data-floor-save-endpoint') || '/admin/ownerboard?pmd_floor_save=1'
  };

  var I18N = {
    today: isDe ? 'Heute' : 'Today',
    month: isDe ? 'Monat' : 'Month',
    connected: isDe ? 'Verbunden' : 'Connected',
    samples: isDe ? 'Datensätze' : 'samples',
    unavailable: isDe ? 'Quelle nicht verfügbar' : 'Source unavailable',
    loading: isDe ? 'Wird geladen…' : 'Loading…',
    noData: isDe ? 'Keine Daten' : 'No data',
    edit: isDe ? 'Bearbeiten' : 'Edit',
    save: isDe ? 'Speichern' : 'Save',
    saving: isDe ? 'Speichern…' : 'Saving…',
    line: isDe ? 'Linie' : 'Line',
    bar: isDe ? 'Balken' : 'Bar',
    orders: isDe ? 'Bestellungen' : 'orders',
    guests: isDe ? 'Gäste' : 'guests',
    tables: isDe ? 'Tische' : 'tables',
    free: isDe ? 'Frei' : 'Free',
    occupied: isDe ? 'Belegt' : 'Occupied'
  };

  var KPI_KEYS = [
    'revenue',
    'guests',
    'turnover',
    'channels',
    'kitchen',
    'occupancy',
    'menu',
    'tips'
  ];

  var KPI_DEFAULTS = ['revenue', 'guests', 'turnover', 'channels'];
  var KPI_SELECTION_KEY = 'pmd.ownerboard.kpiSlots.v1';
  var FLOOR_MODE_KEY = 'pmd.ownerboard.floorMode.v1';
  var FLOOR_ZOOM_KEY = 'pmd.ownerboard.floorZoom.v1';
  var ANALYTICS_CACHE = {};
  var kpiPayload = null;
  var floorPayload = null;
  var chartMode = 'line';
  var editingFloor = false;
  var dragState = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function number(value, digits) {
    var numeric = Number(value || 0);
    try {
      return new Intl.NumberFormat(isDe ? 'de-DE' : 'en-US', {
        minimumFractionDigits: digits || 0,
        maximumFractionDigits: digits || 0
      }).format(numeric);
    } catch (error) {
      return numeric.toFixed(digits || 0);
    }
  }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat(isDe ? 'de-DE' : 'en-US', {
        style: 'currency',
        currency: currency || (kpiPayload && kpiPayload.currency) || 'EUR'
      }).format(Number(value || 0));
    } catch (error) {
      return number(value, 2) + ' €';
    }
  }

  function requestJson(url, options) {
    return fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    }, options || {})).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  }

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.getAttribute('content') || '') : '';
  }

  function iconSvg(name) {
    var paths = {
      money: '<circle cx="12" cy="12" r="9"></circle><path d="M15 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 1-3 2.3 0 1.5 1.5 2 3 2.4 1.5.4 3 .9 3 2.4 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.4-3.4-1.2M12 6v12"></path>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9M16.5 3.1a4 4 0 0 1 0 7.8"></path>',
      timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"></path>',
      utensils: '<path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10M15 3v18M15 3c3 0 5 2 5 5v3h-5"></path>',
      flame: '<path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-11-3 2-5 5-5 8-1-1-2-2-2-4-2 2-3 4-3 7 0 4 4 7 8 7Z"></path>',
      table: '<rect x="4" y="7" width="16" height="8" rx="2"></rect><path d="M7 15v6M17 15v6"></path>',
      menu: '<path d="M4 6h16M4 12h16M4 18h10"></path>',
      star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"></path>'
    };

    return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (paths[name] || paths.menu) +
      '</svg>';
  }

  function readKpiSelection() {
    try {
      var parsed = JSON.parse(localStorage.getItem(KPI_SELECTION_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed.map(function (key, index) {
          return KPI_KEYS.indexOf(key) !== -1 ? key : KPI_DEFAULTS[index];
        });
      }
    } catch (error) {}
    return KPI_DEFAULTS.slice();
  }

  function writeKpiSelection(selection) {
    try {
      localStorage.setItem(KPI_SELECTION_KEY, JSON.stringify(selection));
    } catch (error) {}
  }

  function kpiRecord(key) {
    if (!kpiPayload || !kpiPayload.cards) return null;
    return kpiPayload.cards[key] || null;
  }

  function kpiPeriod(record) {
    if (!record) return null;
    var periods = record.periods || {};
    if (periods.today) return periods.today;
    if (periods.available !== undefined) return periods;
    return periods.month || periods;
  }

  function kpiValue(record) {
    var period = kpiPeriod(record);
    if (!record || !period || period.available === false) return '—';

    var value = period.value;
    var format = record.format;

    if (format === 'money') return money(value, record.currency && record.currency.code);
    if (format === 'number') return number(value, 0);
    if (format === 'minutes') return value == null ? '—' : number(value, 0) + ' min';
    if (format === 'percent') return value == null ? '—' : number(value, 0) + '%';
    if (format === 'channels') {
      value = value || {};
      return number(value.dine_in || 0, 0) + ' / ' + number(value.takeaway || 0, 0);
    }

    return value == null ? '—' : esc(value);
  }

  function kpiMeta(record) {
    var period = kpiPeriod(record);
    if (!period) return I18N.today;
    if (period.available === false) return I18N.today + ' · ' + I18N.unavailable;

    var samples = Number(period.sample_count || 0);
    return I18N.today + ' · ' + I18N.connected + ' · ' + samples + ' ' + I18N.samples;
  }

  function renderKpis() {
    if (!kpiPayload || !kpiPayload.cards) return;

    var selection = readKpiSelection();
    var slots = root.querySelectorAll('[data-kpi-slot]');

    Array.prototype.forEach.call(slots, function (slot, index) {
      var key = selection[index];
      var record = kpiRecord(key);
      if (!record) return;

      slot.classList.remove('is-loading');
      slot.setAttribute('data-tone', record.tone || 'green');
      slot.setAttribute('data-kpi-key', key);

      var icon = slot.querySelector('[data-kpi-icon]');
      var title = slot.querySelector('[data-kpi-title]');
      var value = slot.querySelector('[data-kpi-value]');
      var meta = slot.querySelector('[data-kpi-meta]');

      if (icon) icon.innerHTML = iconSvg(record.icon || 'menu');
      if (title) title.textContent = record.title || key;
      if (value) value.textContent = kpiValue(record);
      if (meta) meta.textContent = kpiMeta(record);

      var menu = slot.querySelector('[data-kpi-menu]');
      if (menu) {
        menu.innerHTML = KPI_KEYS.map(function (optionKey) {
          var option = kpiRecord(optionKey);
          if (!option) return '';
          return '<button type="button" data-kpi-choice="' + esc(optionKey) + '" class="' +
            (optionKey === key ? 'is-active' : '') + '">' +
            esc(option.title || optionKey) + '</button>';
        }).join('');
      }
    });
  }

  function bindKpiMenus() {
    root.addEventListener('click', function (event) {
      var menuButton = event.target.closest('[data-kpi-menu-button]');
      if (menuButton && root.contains(menuButton)) {
        event.preventDefault();
        event.stopPropagation();
        var card = menuButton.closest('[data-kpi-slot]');
        if (!card) return;
        var menu = card.querySelector('[data-kpi-menu]');
        if (!menu) return;

        root.querySelectorAll('[data-kpi-menu]').forEach(function (other) {
          if (other !== menu) other.hidden = true;
        });
        menu.hidden = !menu.hidden;
        return;
      }

      var choice = event.target.closest('[data-kpi-choice]');
      if (choice && root.contains(choice)) {
        event.preventDefault();
        var card = choice.closest('[data-kpi-slot]');
        if (!card) return;
        var slot = Number(card.getAttribute('data-kpi-slot'));
        var key = choice.getAttribute('data-kpi-choice');
        if (!Number.isInteger(slot) || KPI_KEYS.indexOf(key) === -1) return;

        var selection = readKpiSelection();
        selection[slot] = key;
        writeKpiSelection(selection);
        renderKpis();
        var menu = card.querySelector('[data-kpi-menu]');
        if (menu) menu.hidden = true;
        return;
      }

      root.querySelectorAll('[data-kpi-menu]').forEach(function (menu) {
        menu.hidden = true;
      });
    });
  }

  function loadKpis() {
    return requestJson(endpoints.kpis).then(function (payload) {
      if (!payload || payload.success === false) throw new Error('KPI payload unavailable');
      kpiPayload = payload;
      renderKpis();
      return payload;
    }).catch(function (error) {
      console.warn('[PMD Ownerboard] KPI load failed', error);
    });
  }

  function floorMode() {
    try {
      return localStorage.getItem(FLOOR_MODE_KEY) === 'plan' ? 'plan' : 'row';
    } catch (error) {
      return 'row';
    }
  }

  function floorZoom() {
    try {
      var value = Number(localStorage.getItem(FLOOR_ZOOM_KEY) || 1);
      if (value >= 0.72 && value <= 1.5) return value;
    } catch (error) {}
    return 1;
  }

  function saveFloorPreference(mode, zoom) {
    try {
      if (mode) localStorage.setItem(FLOOR_MODE_KEY, mode);
      if (zoom) localStorage.setItem(FLOOR_ZOOM_KEY, String(zoom));
    } catch (error) {}
  }

  function tableLabel(table) {
    var name = String(table.name || '').trim();
    var numberValue = String(table.number || '').trim();
    var match = name.match(/(?:table\s*)?(\d+)$/i);
    if (match) return match[1];
    return numberValue || name || String(table.id || '');
  }

  function renderFloor() {
    var canvas = root.querySelector('[data-floor-canvas]');
    if (!canvas || !floorPayload || !Array.isArray(floorPayload.tables)) return;

    var mode = floorMode();
    var zoom = floorZoom();
    canvas.classList.toggle('is-row', mode === 'row');
    canvas.classList.toggle('is-plan', mode === 'plan');
    canvas.style.setProperty('--floor-scale', String(zoom));

    var markup = floorPayload.tables.map(function (table) {
      var style = '';
      if (mode === 'plan') {
        style = 'left:' + Number(table.x || 0) + 'px;top:' + Number(table.y || 0) + 'px;';
      }
      return '<button type="button" class="pmd-ownerboard-table ' +
        (table.busy ? 'is-busy ' : '') +
        (editingFloor ? 'is-editing ' : '') +
        '" data-floor-table data-table-id="' + Number(table.id || 0) + '" ' +
        'data-table-status="' + esc(table.status || '') + '" style="' + style + '" ' +
        'title="' + esc(table.name || '') + ' · ' + esc(table.busy ? I18N.occupied : I18N.free) + '">' +
        esc(tableLabel(table)) + '</button>';
    }).join('');

    canvas.innerHTML = markup || '<div class="pmd-ownerboard-floor__loading">' + esc(I18N.noData) + '</div>';

    var modeButton = root.querySelector('[data-floor-mode]');
    if (modeButton) modeButton.classList.toggle('is-active', mode === 'plan');

    if (mode === 'plan') {
      var maxRight = 1100;
      var maxBottom = 520;
      floorPayload.tables.forEach(function (table) {
        maxRight = Math.max(maxRight, Number(table.x || 0) + 180);
        maxBottom = Math.max(maxBottom, Number(table.y || 0) + 150);
      });
      canvas.style.width = maxRight + 'px';
      canvas.style.height = maxBottom + 'px';
    } else {
      canvas.style.width = '';
      canvas.style.height = '';
    }
  }

  function loadFloor() {
    return requestJson(endpoints.floor).then(function (payload) {
      if (!payload || payload.ok === false) throw new Error(payload && payload.reason || 'Floor unavailable');
      floorPayload = payload;
      renderFloor();
      return payload;
    }).catch(function (error) {
      var canvas = root.querySelector('[data-floor-canvas]');
      if (canvas) canvas.innerHTML = '<div class="pmd-ownerboard-floor__loading">' + esc(I18N.unavailable) + '</div>';
      console.warn('[PMD Ownerboard] floor load failed', error);
    });
  }

  function setFloorEditing(enabled) {
    editingFloor = Boolean(enabled);

    if (editingFloor && floorMode() !== 'plan') {
      saveFloorPreference('plan', floorZoom());
    }

    var editButton = root.querySelector('[data-floor-edit]');
    var label = root.querySelector('[data-floor-edit-label]');
    if (editButton) editButton.classList.toggle('is-active', editingFloor);
    if (label) label.textContent = editingFloor ? I18N.save : I18N.edit;
    renderFloor();
  }

  function serializeFloorPositions() {
    var canvas = root.querySelector('[data-floor-canvas]');
    if (!canvas) return [];
    return Array.prototype.map.call(canvas.querySelectorAll('[data-floor-table]'), function (table) {
      return {
        id: Number(table.getAttribute('data-table-id') || 0),
        x: Math.max(0, parseFloat(table.style.left || '0') || 0),
        y: Math.max(0, parseFloat(table.style.top || '0') || 0)
      };
    });
  }

  function saveFloorPositions() {
    var label = root.querySelector('[data-floor-edit-label]');
    if (label) label.textContent = I18N.saving;

    return requestJson(endpoints.floorSave, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken()
      },
      body: JSON.stringify({positions: serializeFloorPositions()})
    }).then(function (payload) {
      if (!payload || payload.ok === false) throw new Error('Save failed');
      setFloorEditing(false);
      return loadFloor();
    }).catch(function (error) {
      if (label) label.textContent = I18N.save;
      console.warn('[PMD Ownerboard] floor save failed', error);
    });
  }

  function floorPointerDown(event) {
    if (!editingFloor || floorMode() !== 'plan') return;
    var table = event.target.closest('[data-floor-table]');
    if (!table || !root.contains(table)) return;

    event.preventDefault();
    var canvas = root.querySelector('[data-floor-canvas]');
    if (!canvas) return;

    var rect = table.getBoundingClientRect();
    dragState = {
      table: table,
      canvas: canvas,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    table.classList.add('is-dragging');
    try { table.setPointerCapture(event.pointerId); } catch (error) {}
  }

  function floorPointerMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    var canvasRect = dragState.canvas.getBoundingClientRect();
    var x = event.clientX - canvasRect.left + dragState.canvas.scrollLeft - dragState.offsetX;
    var y = event.clientY - canvasRect.top + dragState.canvas.scrollTop - dragState.offsetY;

    dragState.table.style.left = Math.max(0, x) + 'px';
    dragState.table.style.top = Math.max(0, y) + 'px';
  }

  function floorPointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState.table.classList.remove('is-dragging');
    try { dragState.table.releasePointerCapture(event.pointerId); } catch (error) {}
    dragState = null;
  }

  function bindFloor() {
    var canvas = root.querySelector('[data-floor-canvas]');
    if (canvas) {
      canvas.addEventListener('pointerdown', floorPointerDown);
      canvas.addEventListener('pointermove', floorPointerMove);
      canvas.addEventListener('pointerup', floorPointerUp);
      canvas.addEventListener('pointercancel', floorPointerUp);
    }

    var edit = root.querySelector('[data-floor-edit]');
    if (edit) {
      edit.addEventListener('click', function () {
        if (editingFloor) saveFloorPositions();
        else setFloorEditing(true);
      });
    }

    var mode = root.querySelector('[data-floor-mode]');
    if (mode) {
      mode.addEventListener('click', function () {
        if (editingFloor) return;
        var next = floorMode() === 'row' ? 'plan' : 'row';
        saveFloorPreference(next, floorZoom());
        renderFloor();
      });
    }

    var zoomOut = root.querySelector('[data-floor-zoom-out]');
    var zoomIn = root.querySelector('[data-floor-zoom-in]');

    if (zoomOut) zoomOut.addEventListener('click', function () {
      var next = Math.max(0.72, Math.round((floorZoom() - 0.08) * 100) / 100);
      saveFloorPreference(floorMode(), next);
      renderFloor();
    });

    if (zoomIn) zoomIn.addEventListener('click', function () {
      var next = Math.min(1.5, Math.round((floorZoom() + 0.08) * 100) / 100);
      saveFloorPreference(floorMode(), next);
      renderFloor();
    });
  }

  function analyticsUrl(period) {
    return endpoints.analytics + '&period=' + encodeURIComponent(period || 'month');
  }

  function loadAnalytics(period) {
    period = period || 'month';
    if (ANALYTICS_CACHE[period]) return Promise.resolve(ANALYTICS_CACHE[period]);

    return requestJson(analyticsUrl(period)).then(function (payload) {
      if (!payload || payload.success === false) throw new Error(payload && payload.reason || 'Analytics unavailable');
      ANALYTICS_CACHE[period] = payload;
      return payload;
    });
  }

  function sourceFor(widgetKey, payload) {
    if (!payload) return null;
    var map = {
      salesOverTime: 'sales_over_time',
      salesByHour: 'sales_by_hour',
      topItems: 'top_items',
      categorySales: 'sales_by_category',
      paymentMethods: 'payment_methods',
      channelSplit: 'channels',
      liveOperations: 'live_operations',
      recentTransactions: 'recent_transactions',
      alerts: 'alerts',
      reviews: 'reviews',
      tips: 'tips',
      calendarEvents: 'calendar_events'
    };
    return payload[map[widgetKey]] || null;
  }

  function empty(source) {
    return '<div class="pmd-ob-empty">' + esc(
      source && (source.reason || source.source) || I18N.noData
    ) + '</div>';
  }

  function shortDate(raw) {
    if (raw == null) return '';
    var value = String(raw);
    if (/^\d+$/.test(value)) return value.padStart(2, '0') + ':00';
    try {
      var date = value.indexOf(' ') !== -1
        ? new Date(value.replace(' ', 'T'))
        : new Date(value.length === 10 ? value + 'T12:00:00' : value);
      return new Intl.DateTimeFormat(isDe ? 'de-DE' : 'en-US', {
        day: '2-digit',
        month: 'short'
      }).format(date);
    } catch (error) {
      return value.slice(5, 10);
    }
  }

  function lineOrBar(rows, mode) {
    if (!rows || !rows.length) return empty();

    var w = 900, h = 300, left = 74, right = 18, top = 14, bottom = 42;
    var plotW = w - left - right;
    var plotH = h - top - bottom;
    var max = Math.max.apply(null, rows.map(function (row) { return Number(row.sales || 0); }).concat([1]));
    var step = max / 4;
    var scaleMax = step > 0 ? Math.ceil(max / step) * step : 1;
    if (!isFinite(scaleMax) || scaleMax <= 0) scaleMax = 1;

    var grid = '';
    for (var i = 0; i <= 4; i++) {
      var value = scaleMax * i / 4;
      var y = top + plotH - plotH * i / 4;
      grid += '<line class="pmd-ob-grid-line" x1="' + left + '" y1="' + y + '" x2="' + (w - right) + '" y2="' + y + '"></line>' +
        '<text class="pmd-ob-axis-label" x="' + (left - 12) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(money(value)) + '</text>';
    }

    var marks = '';
    var labels = '';
    var points = [];
    var count = rows.length;
    var labelEvery = Math.max(1, Math.ceil(count / 7));

    rows.forEach(function (row, index) {
      var x = left + (count === 1 ? plotW / 2 : plotW * index / (count - 1));
      var y = top + plotH - plotH * Number(row.sales || 0) / scaleMax;
      points.push([x, y]);

      if (mode === 'bar') {
        var barW = Math.max(4, Math.min(28, plotW / Math.max(count, 1) * 0.6));
        marks += '<rect class="pmd-ob-bar" x="' + (x - barW / 2) + '" y="' + y + '" width="' + barW + '" height="' + Math.max(0, top + plotH - y) + '"></rect>';
      }

      if (index % labelEvery === 0 || index === count - 1) {
        labels += '<text class="pmd-ob-axis-label" x="' + x + '" y="' + (h - 12) + '" text-anchor="middle">' + esc(shortDate(row.bucket != null ? row.bucket : row.hour)) + '</text>';
      }
    });

    if (mode !== 'bar') {
      marks += '<polyline class="pmd-ob-line" points="' + points.map(function (point) { return point.join(','); }).join(' ') + '"></polyline>';
      marks += points.map(function (point, index) {
        if (Number(rows[index].sales || 0) <= 0) return '';
        return '<circle class="pmd-ob-point" cx="' + point[0] + '" cy="' + point[1] + '" r="4"></circle>';
      }).join('');
    }

    return '<div class="pmd-ob-chart"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img">' + grid + marks + labels + '</svg></div>';
  }

  function arrayFrom(source, candidates) {
    if (!source) return [];
    for (var i = 0; i < candidates.length; i++) {
      if (Array.isArray(source[candidates[i]])) return source[candidates[i]];
    }
    var keys = Object.keys(source);
    for (var j = 0; j < keys.length; j++) {
      if (Array.isArray(source[keys[j]])) return source[keys[j]];
    }
    return [];
  }

  function rowLabel(row) {
    if (!row) return '';
    return String(
      row.name != null ? row.name :
      row.label != null ? row.label :
      row.category != null ? row.category :
      row.method != null ? row.method :
      row.channel != null ? row.channel :
      row.status != null ? row.status :
      row.title != null ? row.title :
      row.guest_name != null ? row.guest_name :
      row.order_id != null ? ('#' + row.order_id) :
      row.reservation_id != null ? ('#' + row.reservation_id) :
      ''
    );
  }

  function rowNumeric(row) {
    if (!row) return 0;
    var candidates = ['revenue', 'sales', 'amount', 'value', 'total', 'quantity', 'orders', 'count', 'rating', 'party_size'];
    for (var i = 0; i < candidates.length; i++) {
      if (row[candidates[i]] != null && row[candidates[i]] !== '') return Number(row[candidates[i]]) || 0;
    }
    return 0;
  }

  function donut(source, currencyAware) {
    var rows = arrayFrom(source, ['categories', 'methods', 'channels', 'items', 'rows']);
    if (!rows.length) return empty(source);

    var values = rows.map(rowNumeric);
    var total = values.reduce(function (sum, value) { return sum + Math.max(0, value); }, 0);
    if (total <= 0) total = rows.length;

    var palette = ['#009d78', '#45b9d0', '#a463df', '#ff8512', '#ff5667', '#5470c6'];
    var offset = 25;
    var circles = '<circle class="track" cx="60" cy="60" r="45" pathLength="100"></circle>';

    rows.forEach(function (row, index) {
      var raw = Math.max(0, values[index]);
      var share = total > 0 ? (raw > 0 ? raw / total * 100 : (values.every(function (v) { return v <= 0; }) ? 100 / rows.length : 0)) : 0;
      circles += '<circle cx="60" cy="60" r="45" pathLength="100" stroke="' + palette[index % palette.length] + '" stroke-dasharray="' + share + ' ' + (100 - share) + '" stroke-dashoffset="-' + offset + '"></circle>';
      offset += share;
    });

    var legend = '<ul class="pmd-ob-donut-legend">' + rows.map(function (row, index) {
      var numeric = values[index];
      var shown = currencyAware ? money(numeric) : number(numeric, numeric % 1 ? 1 : 0);
      return '<li><span class="pmd-ob-legend-name">' + esc(rowLabel(row) || ('Item ' + (index + 1))) + '</span><span class="pmd-ob-legend-value">' + esc(shown) + '</span></li>';
    }).join('') + '</ul>';

    return '<div class="pmd-ob-donut-wrap"><svg class="pmd-ob-donut" viewBox="0 0 120 120" aria-hidden="true">' + circles + '</svg>' + legend + '</div>';
  }

  function genericList(source, candidates, formatter) {
    var rows = arrayFrom(source, candidates || []);
    if (!rows.length) return empty(source);
    return '<ul class="pmd-ob-list">' + rows.slice(0, 8).map(function (row, index) {
      var label = rowLabel(row) || ('#' + (index + 1));
      var value = formatter ? formatter(row) : rowNumeric(row);
      return '<li><span class="pmd-ob-legend-name">' + esc(label) + '</span><span class="pmd-ob-legend-value">' + esc(value) + '</span></li>';
    }).join('') + '</ul>';
  }

  function alerts(source) {
    if (!source || !source.types) return empty(source);
    var rows = Object.keys(source.types).map(function (key) {
      return {name: key.replace(/_/g, ' '), count: source.types[key] == null ? '—' : source.types[key]};
    });
    return '<ul class="pmd-ob-list">' + rows.map(function (row) {
      return '<li><span class="pmd-ob-legend-name">' + esc(row.name) + '</span><span class="pmd-ob-legend-value">' + esc(row.count) + '</span></li>';
    }).join('') + '</ul>';
  }

  function tips(source) {
    if (!source || source.available === false) return empty(source);
    var value = source.selected != null ? source.selected : source.month != null ? source.month : source.today;
    return '<div class="pmd-ob-stat"><strong>' + esc(money(value || 0)) + '</strong><span>' + esc((source.tipped_orders || 0) + ' ' + I18N.orders) + '</span></div>';
  }

  function reviews(source) {
    var rows = arrayFrom(source, ['latest']);
    if (!rows.length) return empty(source);
    return '<ul class="pmd-ob-list">' + rows.map(function (row) {
      var label = (row.stars || '★') + (row.comment ? ' · ' + row.comment : '');
      var value = row.rating != null ? number(row.rating, 1) + '/5' : '';
      return '<li><span class="pmd-ob-legend-name">' + esc(label) + '</span><span class="pmd-ob-legend-value">' + esc(value) + '</span></li>';
    }).join('') + '</ul>';
  }

  function renderWidget(card, payload) {
    if (!card) return;
    var key = card.getAttribute('data-analytics-widget');
    var body = card.querySelector('[data-widget-body]');
    if (!body) return;

    var source = sourceFor(key, payload);
    body.classList.remove('is-loading');

    if (!source || source.available === false) {
      body.innerHTML = empty(source);
      return;
    }

    if (key === 'salesOverTime') {
      body.innerHTML = lineOrBar(arrayFrom(source, ['buckets']), chartMode);
    } else if (key === 'salesByHour') {
      body.innerHTML = lineOrBar(arrayFrom(source, ['hours']), 'bar');
    } else if (key === 'categorySales') {
      body.innerHTML = donut(source, true);
    } else if (key === 'paymentMethods') {
      body.innerHTML = donut(source, true);
    } else if (key === 'topItems') {
      body.innerHTML = genericList(source, ['items'], function (row) {
        return row.revenue != null ? money(row.revenue) : number(row.quantity || 0, 0);
      });
    } else if (key === 'channelSplit') {
      body.innerHTML = genericList(source, ['channels'], function (row) {
        return row.revenue != null ? money(row.revenue) : number(row.orders || row.count || 0, 0);
      });
    } else if (key === 'recentTransactions') {
      body.innerHTML = genericList(source, ['transactions'], function (row) {
        return money(row.amount || 0);
      });
    } else if (key === 'alerts') {
      body.innerHTML = alerts(source);
    } else if (key === 'reviews') {
      body.innerHTML = reviews(source);
    } else if (key === 'tips') {
      body.innerHTML = tips(source);
    } else if (key === 'liveOperations') {
      body.innerHTML = genericList(source, ['orders', 'items', 'rows'], function (row) {
        return row.total != null ? money(row.total) : esc(row.status || '');
      });
    } else if (key === 'calendarEvents') {
      body.innerHTML = genericList(source, ['reservations', 'events', 'items'], function (row) {
        return esc(row.time || row.reserve_time || row.date || '');
      });
    } else {
      body.innerHTML = genericList(source, []);
    }
  }

  function renderAllAnalytics() {
    var cards = root.querySelectorAll('[data-analytics-widget]');

    Array.prototype.forEach.call(cards, function (card) {
      var period = card.getAttribute('data-widget-period') || 'month';
      loadAnalytics(period).then(function (payload) {
        renderWidget(card, payload);
      }).catch(function (error) {
        var body = card.querySelector('[data-widget-body]');
        if (body) {
          body.classList.remove('is-loading');
          body.innerHTML = empty({reason: I18N.unavailable});
        }
        console.warn('[PMD Ownerboard] analytics load failed', period, error);
      });
    });
  }

  function bindAnalytics() {
    root.addEventListener('click', function (event) {
      var chartButton = event.target.closest('[data-chart-mode]');
      if (chartButton && root.contains(chartButton)) {
        event.preventDefault();
        chartMode = chartButton.getAttribute('data-chart-mode') === 'bar' ? 'bar' : 'line';
        var group = chartButton.closest('[data-chart-mode-group]');
        if (group) group.querySelectorAll('[data-chart-mode]').forEach(function (button) {
          button.classList.toggle('is-active', button === chartButton);
        });
        var card = chartButton.closest('[data-analytics-widget]');
        if (card) {
          var period = card.getAttribute('data-widget-period') || 'last30';
          loadAnalytics(period).then(function (payload) { renderWidget(card, payload); });
        }
        return;
      }

      var periodButton = event.target.closest('[data-period]');
      if (periodButton && root.contains(periodButton)) {
        event.preventDefault();
        var card = periodButton.closest('[data-analytics-widget]');
        if (!card) return;
        var period = periodButton.getAttribute('data-period') || 'month';
        card.setAttribute('data-widget-period', period);

        var group = periodButton.closest('[data-period-group]');
        if (group) group.querySelectorAll('[data-period]').forEach(function (button) {
          button.classList.toggle('is-active', button === periodButton);
        });

        var body = card.querySelector('[data-widget-body]');
        if (body) {
          body.classList.add('is-loading');
          body.innerHTML = '<div class="pmd-ownerboard-skeleton"></div>';
        }

        loadAnalytics(period).then(function (payload) {
          renderWidget(card, payload);
        }).catch(function () {
          if (body) {
            body.classList.remove('is-loading');
            body.innerHTML = empty({reason: I18N.unavailable});
          }
        });
      }
    });
  }

  function bridgeNotifications() {
    var ownButton = root.querySelector('[data-pmd-ownerboard-notifications]');
    if (!ownButton) return;

    var selectors = [
      '#notification-button',
      '[data-notification-toggle]',
      '.navbar .notification-toggle',
      '.navbar .dropdown-notifications > a',
      '.navbar [data-toggle="dropdown"] .fa-bell'
    ];

    var original = null;
    for (var i = 0; i < selectors.length && !original; i++) {
      var candidate = document.querySelector(selectors[i]);
      if (candidate && candidate !== ownButton) {
        original = candidate.closest('button,a') || candidate;
      }
    }

    ownButton.addEventListener('click', function () {
      if (original && typeof original.click === 'function') {
        original.click();
      }
    });

    var badge = root.querySelector('[data-pmd-ownerboard-badge]');
    if (!badge) return;

    var sourceBadge = document.querySelector('.navbar .badge, .notification-badge, [data-notification-count]');
    if (sourceBadge) {
      var text = String(sourceBadge.textContent || '').trim();
      if (text && text !== '0') {
        badge.textContent = text;
        badge.hidden = false;
      }
    }
  }

  function audit() {
    return {
      version: VERSION,
      route: path,
      root: Boolean(root),
      kpisLoaded: Boolean(kpiPayload),
      floorLoaded: Boolean(floorPayload),
      analyticsPeriodsLoaded: Object.keys(ANALYTICS_CACHE),
      kpiSlots: root.querySelectorAll('[data-kpi-slot]').length,
      floorTables: root.querySelectorAll('[data-floor-table]').length,
      analyticsCards: root.querySelectorAll('[data-analytics-widget]').length,
      permanentObservers: 0,
      intervals: 0,
      legacyDashboard2Root: Boolean(document.getElementById('pmd-reservations2')),
      legacyDashboard2AnalyticsRoot: Boolean(document.getElementById('pmd-dashboard2-analytics-v1'))
    };
  }

  function boot() {
    bindKpiMenus();
    bindFloor();
    bindAnalytics();
    bridgeNotifications();

    Promise.allSettled([
      loadKpis(),
      loadFloor(),
      loadAnalytics('last30'),
      loadAnalytics('month')
    ]).then(function () {
      renderAllAnalytics();
      window.PMDOwnerboardV1 = {
        version: VERSION,
        refreshKpis: loadKpis,
        refreshFloor: loadFloor,
        refreshAnalytics: function () {
          ANALYTICS_CACHE = {};
          renderAllAnalytics();
        },
        audit: audit
      };
      console.info('[PMD Ownerboard V1] Ready', audit());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
