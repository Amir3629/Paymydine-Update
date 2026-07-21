(function () {
  'use strict';

  if (window.PMDFloorMapV1) return;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function fetchJson(url, options) {
    return fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'}
    }, options || {})).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || payload.ok === false) throw new Error(payload.message || ('HTTP ' + response.status));
        return payload;
      });
    });
  }

  function createFloor(root) {
    var canvas = root.querySelector('[data-floor-canvas]');
    var scroll = root.querySelector('[data-floor-scroll]');
    var loading = root.querySelector('[data-floor-loading]');
    var empty = root.querySelector('[data-floor-empty]');
    var drawer = root.querySelector('[data-floor-drawer]');
    var toastNode = root.querySelector('[data-floor-toast]');
    var dataUrl = root.getAttribute('data-data-url');
    var layoutUrl = root.getAttribute('data-layout-url');
    var stateUrl = root.getAttribute('data-state-url');
    var orderTemplate = root.getAttribute('data-order-url') || '/admin/waiter-pos/{table}';

    var state = {
      payload: {},
      tables: [],
      operational: {tables:{}, merges:{}},
      filter: 'all',
      query: '',
      zoom: 1,
      editing: false,
      mergeMode: false,
      mergeSelection: [],
      active: null,
      drag: null,
      toastTimer: null
    };

    function toast(message, error) {
      if (!toastNode) return;
      toastNode.textContent = clean(message);
      toastNode.style.background = error ? '#a82435' : '#10243a';
      toastNode.classList.add('is-visible');
      clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(function () { toastNode.classList.remove('is-visible'); }, 2600);
    }

    function tableId(raw) {
      return clean(raw.id || raw.table_id || raw.location_table_id || raw.number || raw.table_number);
    }

    function tableNumber(raw) {
      return clean(raw.number || raw.table_number || raw.table_no || raw.id || raw.table_id);
    }

    function area(raw) {
      return clean(raw.section || raw.table_section || raw.table_zone || raw.zone || raw.floor_name || 'Main');
    }

    function linkedOrders(raw, orders) {
      var keys = [raw.id, raw.table_id, raw.number, raw.table_number, raw.table_no, raw.name, raw.label].map(clean).filter(Boolean);
      return orders.filter(function (order) {
        return [order.table_id, order.location_table_id, order.table_number, order.table_no, order.table_ref, order.table, order.table_label]
          .map(clean).some(function (value) { return keys.indexOf(value) !== -1; });
      });
    }

    function normalize(payload) {
      var rawTables = Array.isArray(payload.tables) ? payload.tables : ((((payload.sections || {}).floor_plan || {}).tables) || []);
      var orders = Array.isArray(payload.orders) ? payload.orders : (Array.isArray(payload.current_orders) ? payload.current_orders : []);

      return rawTables.map(function (raw, index) {
        var id = tableId(raw);
        var linked = linkedOrders(raw, orders);
        var custom = state.operational.tables[id] || {};
        var rawStatus = clean(custom.status || raw.status || raw.latest_order_status || '').toLowerCase();
        var waiterCall = rawStatus === 'waiter-call' || yes(raw.waiter_call) || yes(raw.needs_waiter) || yes(raw.call_waiter);
        var cleaning = rawStatus === 'cleaning' || yes(raw.cleaning_required) || yes(raw.needs_cleaning);
        var reserved = rawStatus === 'reserved' || yes(raw.reserved) || yes(raw.is_reserved);
        var occupied = rawStatus === 'occupied' || linked.length > 0 || number(raw.open_orders, 0) > 0;
        var note = clean(custom.note || raw.note || raw.comment || '') || linked.some(function (order) { return clean(order.note || order.comment || '') !== ''; });
        var status = waiterCall ? 'waiter-call' : cleaning ? 'cleaning' : reserved ? 'reserved' : occupied ? 'occupied' : 'available';
        var floor = raw.floor || {};
        var x = number(raw.floor_x, number(floor.x, 80 + (index % 6) * 150));
        var y = number(raw.floor_y, number(floor.y, 60 + Math.floor(index / 6) * 110));
        var w = number(raw.floor_width, number(floor.w, 150));
        var h = number(raw.floor_height, number(floor.h, 78));

        return {
          raw: raw,
          id: id,
          number: tableNumber(raw),
          name: clean(raw.name || raw.label || ('Table ' + tableNumber(raw))),
          area: area(raw),
          capacity: number(raw.capacity || raw.table_capacity, 0),
          status: status,
          waiterCall: waiterCall,
          cleaning: cleaning,
          note: clean(custom.note || (typeof note === 'string' ? note : '')),
          openOrders: Math.max(linked.length, number(raw.open_orders, 0)),
          x: x,
          y: y,
          w: Math.max(80, Math.min(260, w)),
          h: Math.max(58, Math.min(160, h))
        };
      }).filter(function (table) { return table.id && table.number; });
    }

    function mergeFor(tableIdValue) {
      var found = null;
      Object.keys(state.operational.merges || {}).some(function (id) {
        var merge = state.operational.merges[id];
        if ((merge.table_ids || []).map(String).indexOf(String(tableIdValue)) !== -1) {
          found = {id:id, table_ids:merge.table_ids};
          return true;
        }
        return false;
      });
      return found;
    }

    function badges(table) {
      var list = [];
      if (table.waiterCall) list.push('<span class="pmd-floor-v1__badge is-call" title="Waiter call">♟</span>');
      if (table.note) list.push('<span class="pmd-floor-v1__badge is-note" title="Note">✎</span>');
      if (table.cleaning) list.push('<span class="pmd-floor-v1__badge is-clean" title="Needs cleaning">✦</span>');
      return list.length ? '<span class="pmd-floor-v1__badges">' + list.join('') + '</span>' : '';
    }

    function visible(table) {
      if (state.filter !== 'all') {
        if (state.filter === 'attention') {
          if (!(table.waiterCall || table.note)) return false;
        } else if (table.status !== state.filter) return false;
      }
      if (state.query) {
        var text = [table.number, table.name, table.area, table.status].join(' ').toLowerCase();
        if (text.indexOf(state.query) === -1) return false;
      }
      return true;
    }

    function render() {
      if (!canvas) return;
      canvas.innerHTML = state.tables.map(function (table) {
        var merge = mergeFor(table.id);
        var selected = state.mergeSelection.indexOf(table.id) !== -1;
        var meta = table.status === 'available' ? (table.capacity ? table.capacity + ' seats' : 'Available') : table.status.replace('-', ' ');
        return '<button type="button" class="pmd-floor-v1__table' + (selected ? ' is-selected' : '') + (!visible(table) ? ' is-filtered' : '') + '" data-floor-table="' + escapeHtml(table.id) + '" data-status="' + escapeHtml(table.status) + '" style="left:' + table.x + 'px;top:' + table.y + 'px;width:' + table.w + 'px;height:' + table.h + 'px" aria-label="' + escapeHtml(table.name) + '">' + badges(table) + '<strong class="pmd-floor-v1__table-number">' + escapeHtml(table.number) + '</strong><span class="pmd-floor-v1__table-meta">' + escapeHtml(meta) + '</span>' + (merge ? '<span class="pmd-floor-v1__merge-label">Merged</span>' : '') + '</button>';
      }).join('');

      var shown = state.tables.filter(visible).length;
      if (empty) empty.hidden = shown > 0;
      updateCounts();
      applyZoom();
      root.setAttribute('aria-busy', 'false');
      if (loading) loading.hidden = true;
    }

    function updateCounts() {
      ['all','available','occupied','reserved','cleaning','attention'].forEach(function (key) {
        var count = key === 'all' ? state.tables.length : state.tables.filter(function (table) {
          return key === 'attention' ? (table.waiterCall || !!table.note) : table.status === key;
        }).length;
        var node = root.querySelector('[data-floor-count="' + key + '"]');
        if (node) node.textContent = String(count);
      });
    }

    function applyZoom() {
      if (!canvas) return;
      canvas.style.transform = 'scale(' + state.zoom + ')';
      canvas.parentElement.style.setProperty('--floor-zoom', state.zoom);
    }

    function fit() {
      if (!scroll || !canvas) return;
      state.zoom = Math.max(.45, Math.min(1.4, Math.min(scroll.clientWidth / 1000, scroll.clientHeight / 560)));
      applyZoom();
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
    }

    function saveOperational(action, body) {
      return fetchJson(stateUrl, {method:'POST', body:JSON.stringify(Object.assign({action:action}, body || {}))}).then(function (payload) {
        state.operational = payload.state || state.operational;
        state.tables = normalize(state.payload);
        render();
        window.dispatchEvent(new CustomEvent('pmd:floor:updated', {detail:{action:action, state:state.operational}}));
        return payload;
      });
    }

    function saveLayout() {
      var tables = state.tables.map(function (table) {
        return {id:table.id, table_id:table.id, floor_x:table.x, floor_y:table.y, floor_width:table.w, floor_height:table.h};
      });
      return fetchJson(layoutUrl, {method:'POST', body:JSON.stringify({tables:tables})}).then(function () {
        toast('Floor layout saved');
        setEditing(false);
        window.dispatchEvent(new CustomEvent('pmd:floor:updated', {detail:{action:'layout'}}));
      }).catch(function (error) { toast(error.message, true); });
    }

    function load() {
      root.setAttribute('aria-busy', 'true');
      if (loading) loading.hidden = false;
      return Promise.all([
        fetchJson(dataUrl),
        fetchJson(stateUrl).catch(function () { return {state:{tables:{}, merges:{}}}; })
      ]).then(function (results) {
        state.payload = results[0] || {};
        state.operational = results[1].state || {tables:{}, merges:{}};
        state.tables = normalize(state.payload);
        render();
        setTimeout(fit, 0);
      }).catch(function (error) {
        if (loading) loading.textContent = 'Floor could not load: ' + error.message;
        toast(error.message, true);
      });
    }

    function setEditing(value) {
      state.editing = !!value;
      root.classList.toggle('is-editing', state.editing);
      var edit = root.querySelector('[data-floor-edit]');
      var save = root.querySelector('[data-floor-save]');
      if (edit) edit.setAttribute('aria-pressed', state.editing ? 'true' : 'false');
      if (save) save.hidden = !state.editing;
      if (edit) edit.hidden = state.editing;
    }

    function setMergeMode(value) {
      state.mergeMode = !!value;
      if (!state.mergeMode) state.mergeSelection = [];
      var button = root.querySelector('[data-floor-merge]');
      if (button) button.setAttribute('aria-pressed', state.mergeMode ? 'true' : 'false');
      render();
      if (state.mergeMode) toast('Select two or more tables to merge');
    }

    function openDrawer(table) {
      state.active = table;
      if (!drawer) return;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var title = drawer.querySelector('[data-floor-drawer-title]');
      var summary = drawer.querySelector('[data-floor-summary]');
      var note = drawer.querySelector('[data-floor-note]');
      var mergeInfo = drawer.querySelector('[data-floor-merge-info]');
      if (title) title.textContent = table.name;
      if (summary) summary.innerHTML = '<b>Status:</b> ' + escapeHtml(table.status.replace('-', ' ')) + '<br><b>Area:</b> ' + escapeHtml(table.area) + '<br><b>Capacity:</b> ' + (table.capacity || '—') + '<br><b>Open orders:</b> ' + table.openOrders;
      if (note) { note.hidden = !table.note; note.textContent = table.note ? 'Note: ' + table.note : ''; }
      var merge = mergeFor(table.id);
      if (mergeInfo) { mergeInfo.hidden = !merge; mergeInfo.innerHTML = merge ? 'Merged group: ' + merge.table_ids.map(escapeHtml).join(', ') + ' <button type="button" data-floor-unmerge="' + escapeHtml(merge.id) + '">Unmerge</button>' : ''; }
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      state.active = null;
    }

    function selectForMerge(table) {
      var index = state.mergeSelection.indexOf(table.id);
      if (index === -1) state.mergeSelection.push(table.id); else state.mergeSelection.splice(index, 1);
      render();
      if (state.mergeSelection.length >= 2) {
        saveOperational('merge', {table_ids:state.mergeSelection.slice()}).then(function () {
          toast('Tables merged');
          setMergeMode(false);
        }).catch(function (error) { toast(error.message, true); });
      }
    }

    function pointerDown(event, table) {
      if (!state.editing) return;
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      state.drag = {table:table, pointerId:event.pointerId, offsetX:(event.clientX - rect.left) / state.zoom - table.x, offsetY:(event.clientY - rect.top) / state.zoom - table.y};
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('is-dragging');
    }

    function pointerMove(event) {
      if (!state.drag) return;
      var rect = canvas.getBoundingClientRect();
      var table = state.drag.table;
      table.x = Math.max(table.w / 2 + 10, Math.min(1000 - table.w / 2 - 10, (event.clientX - rect.left) / state.zoom - state.drag.offsetX));
      table.y = Math.max(table.h / 2 + 10, Math.min(560 - table.h / 2 - 10, (event.clientY - rect.top) / state.zoom - state.drag.offsetY));
      var node = canvas.querySelector('[data-floor-table="' + CSS.escape(table.id) + '"]');
      if (node) { node.style.left = table.x + 'px'; node.style.top = table.y + 'px'; }
    }

    function pointerUp(event) {
      if (!state.drag) return;
      var node = canvas.querySelector('[data-floor-table="' + CSS.escape(state.drag.table.id) + '"]');
      if (node) node.classList.remove('is-dragging');
      state.drag = null;
    }

    root.addEventListener('click', function (event) {
      var tableNode = event.target.closest('[data-floor-table]');
      if (tableNode && !state.editing) {
        var table = state.tables.find(function (item) { return item.id === tableNode.getAttribute('data-floor-table'); });
        if (!table) return;
        if (state.mergeMode) selectForMerge(table); else openDrawer(table);
        return;
      }

      var filter = event.target.closest('[data-floor-filter]');
      if (filter) {
        state.filter = filter.getAttribute('data-floor-filter');
        root.querySelectorAll('[data-floor-filter]').forEach(function (button) { button.classList.toggle('is-active', button === filter); });
        render();
        return;
      }

      if (event.target.closest('[data-floor-refresh]')) load();
      if (event.target.closest('[data-floor-edit]')) setEditing(true);
      if (event.target.closest('[data-floor-save]')) saveLayout();
      if (event.target.closest('[data-floor-merge]')) setMergeMode(!state.mergeMode);
      if (event.target.closest('[data-floor-zoom-in]')) { state.zoom = Math.min(1.6, state.zoom + .1); applyZoom(); }
      if (event.target.closest('[data-floor-zoom-out]')) { state.zoom = Math.max(.4, state.zoom - .1); applyZoom(); }
      if (event.target.closest('[data-floor-fit]')) fit();
      if (event.target.closest('[data-floor-fullscreen]')) { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen(); }
      if (event.target.closest('[data-floor-guide]')) root.querySelector('[data-floor-guide-card]').hidden = false;
      if (event.target.closest('[data-floor-guide-close]')) root.querySelector('[data-floor-guide-card]').hidden = true;
      if (event.target.closest('[data-floor-close]')) closeDrawer();

      var unmerge = event.target.closest('[data-floor-unmerge]');
      if (unmerge) saveOperational('unmerge', {merge_id:unmerge.getAttribute('data-floor-unmerge')}).then(function () { closeDrawer(); toast('Tables unmerged'); });

      var action = event.target.closest('[data-floor-action]');
      if (action && state.active) {
        var type = action.getAttribute('data-floor-action');
        if (type === 'order') {
          location.href = orderTemplate.replace('{table}', encodeURIComponent(state.active.id));
        } else if (type === 'note') {
          var value = window.prompt('Add a note for ' + state.active.name, state.active.note || '');
          if (value !== null) saveOperational('note', {table_id:state.active.id, note:value}).then(function () { closeDrawer(); toast('Note saved'); });
        } else {
          saveOperational('table-state', {table_id:state.active.id, status:type, note:state.active.note || ''}).then(function () { closeDrawer(); toast('Table updated'); });
        }
      }
    });

    root.addEventListener('pointerdown', function (event) {
      var node = event.target.closest('[data-floor-table]');
      if (!node) return;
      var table = state.tables.find(function (item) { return item.id === node.getAttribute('data-floor-table'); });
      if (table) pointerDown(event, table);
    });
    root.addEventListener('pointermove', pointerMove);
    root.addEventListener('pointerup', pointerUp);
    root.addEventListener('pointercancel', pointerUp);

    var search = root.querySelector('[data-floor-search]');
    if (search) search.addEventListener('input', function () { state.query = clean(search.value).toLowerCase(); render(); });
    window.addEventListener('resize', function () { if (!state.editing) fit(); });

    load();

    return {
      root: root,
      refresh: load,
      fit: fit,
      setSize: function (size) { root.setAttribute('data-size', size); fit(); },
      getState: function () { return state; }
    };
  }

  var instances = [];

  function mount(scope) {
    var roots = Array.prototype.slice.call((scope || document).querySelectorAll('[data-pmd-floor]'));
    roots.forEach(function (root) {
      if (root.__pmdFloorV1) return;
      root.__pmdFloorV1 = createFloor(root);
      if (root.__pmdFloorV1) instances.push(root.__pmdFloorV1);
    });
    return instances;
  }

  window.PMDFloorMapV1 = {
    version: '1.0.0',
    mount: mount,
    instances: instances,
    sizes: ['compact','standard','large','fill']
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(document); }, {once:true});
  else mount(document);
})();
