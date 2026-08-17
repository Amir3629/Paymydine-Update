/* ============================================================
   PMD_SHARED_FLOOR_MULTI_FLOOR_V1
   One registry/switcher concern above the existing shared Floor engine.
   No second Floor engine, no observer, no interval and no polling.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDSharedFloorMultiFloorV1) return;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function key(value) {
    return clean(value).toLocaleLowerCase();
  }

  // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_1_MAIN_ALIAS
  // The existing waiter data authority returns the legacy default Floor as
  // "Main" for rows whose floor_name is blank, while the registry calls the
  // same default "Main Floor". They are one Floor, not two floor identities.
  function canonicalFloorName(value) {
    var name = clean(value);
    var normalized = key(name);
    if (!name || normalized === 'main' || normalized === 'main floor') {
      return 'Main Floor';
    }
    return name;
  }

  function parseConfig() {
    var node = document.getElementById('pmd-shared-floor-multi-floor-bootstrap-v1');
    if (!node) return null;
    try { return JSON.parse(node.textContent || '{}'); }
    catch (error) { return null; }
  }

  function postJson(url, handler, payload) {
    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': handler
    };
    var csrf = document.querySelector('meta[name="csrf-token"]');
    if (csrf && csrf.content) headers['X-CSRF-TOKEN'] = csrf.content;

    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; }
        catch (error) { data = { message: text }; }
        if (!response.ok || data.ok === false) {
          var requestError = new Error(data.message || ('HTTP ' + response.status));
          requestError.payload = data;
          requestError.status = response.status;
          throw requestError;
        }
        return data;
      });
    });
  }

  function boot() {
    if (window.PMDSharedFloorMultiFloorV1) return;

    var root = document.getElementById('pmd-r2-shared-floor-canvas-v310');
    var config = parseConfig();
    if (!root || !config || !Array.isArray(config.floors)) return;

    if (!root.__pmdFloorV1 && window.PMDDashboardLabExactFloorV1) {
      window.PMDDashboardLabExactFloorV1.mount(document);
    }

    var instance = root.__pmdFloorV1;
    if (!instance || typeof instance.getState !== 'function') {
      console.warn('[PMD Multi Floor V1] Existing Floor engine is not mounted.');
      return;
    }

    var state = instance.getState();
    var floors = config.floors.slice();
    var activeId = clean(config.active && config.active.id);
    var activeName = canonicalFloorName(config.active && config.active.name);
    var tableMap = config.table_floor_map || {};
    var allTables = Array.isArray(state.tables) ? state.tables.slice() : [];
    var switcher = root.querySelector('[data-pmd-floor-switcher]');
    var addPanel = root.querySelector('[data-pmd-floor-add-panel]');
    var addInput = addPanel ? addPanel.querySelector('[data-pmd-floor-add-name]') : null;
    var addSave = addPanel ? addPanel.querySelector('[data-pmd-floor-add-save]') : null;
    var addError = addPanel ? addPanel.querySelector('[data-pmd-floor-add-error]') : null;
    var addBusy = false;

    function floorById(id) {
      id = clean(id);
      return floors.find(function (floor) { return clean(floor && floor.id) === id; }) || null;
    }

    function floorNameFor(table) {
      // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_2_ASSIGNMENT_AUTHORITY
      // The new PMD Floor identity is NOT raw tables.floor_name. Existing
      // restaurants already used that field for legacy floor/area metadata.
      // Only the explicit canonical table-id assignment map can move a table
      // away from Main Floor; every unassigned table remains on Main Floor.
      if (!table) return 'Main Floor';
      var raw = table.raw || {};

      var byId = tableMap.by_id || {};
      var ids = [table.dbTableId, raw.table_id, raw.id]
        .map(function (v) { return clean(v); })
        .filter(Boolean);
      for (var i = 0; i < ids.length; i += 1) {
        if (byId[ids[i]]) return canonicalFloorName(byId[ids[i]]);
      }

      var byNumber = tableMap.by_number || {};
      var numbers = [table.number, raw.table_no, raw.table_number, raw.number]
        .map(function (v) { return key(v); }).filter(Boolean);
      for (var j = 0; j < numbers.length; j += 1) {
        if (byNumber[numbers[j]]) return canonicalFloorName(byNumber[numbers[j]]);
      }

      var byName = tableMap.by_name || {};
      var names = [table.name, raw.table_name, raw.name, raw.label]
        .map(function (v) { return key(v); }).filter(Boolean);
      for (var k = 0; k < names.length; k += 1) {
        if (byName[names[k]]) return canonicalFloorName(byName[names[k]]);
      }

      return 'Main Floor';
    }

    function managedFeatures(value) {
      var list = value;
      if (typeof list === 'string') {
        try { list = JSON.parse(list); }
        catch (error) { list = []; }
      }
      if (!Array.isArray(list)) list = [];
      var normalized = list.map(function (item) { return key(item); });
      return ['near_window', 'quiet_area', 'accessible'].filter(function (feature) {
        return normalized.indexOf(feature) !== -1;
      });
    }

    function writeCookie(id) {
      var name = clean(config.cookie_name);
      if (!name) return;
      document.cookie = name + '=' + encodeURIComponent(id) + '; Path=/admin; Max-Age=31536000; SameSite=Lax';
    }

    function tableManagerPanel() {
      var owner = root.id || 'pmd-r2-shared-floor-canvas-v310';
      return document.querySelector(
        '[data-pmd-floor-table-manager-panel][data-pmd-floor-table-manager-owner="' + owner + '"]'
      ) || root.querySelector('[data-pmd-floor-table-manager-panel]');
    }

    function updateTableFloorSelect() {
      var managerPanel = tableManagerPanel();
      var select = managerPanel
        ? managerPanel.querySelector('[data-pmd-floor-table-field="floor_name"]')
        : root.querySelector('[data-pmd-floor-table-field="floor_name"]');
      var field = managerPanel
        ? managerPanel.querySelector('[data-pmd-floor-table-floor-field]')
        : root.querySelector('[data-pmd-floor-table-floor-field]');
      var form = managerPanel
        ? managerPanel.querySelector('[data-pmd-floor-table-manager-form]')
        : root.querySelector('[data-pmd-floor-table-manager-form]');
      var showFloorField = floors.length > 1;

      if (field) field.hidden = !showFloorField;
      if (form) {
        form.setAttribute(
          'data-pmd-floor-single',
          showFloorField ? 'false' : 'true'
        );
      }

      if (!select || select.tagName !== 'SELECT') return;
      var current = clean(select.value);
      select.innerHTML = floors.map(function (floor) {
        var name = clean(floor.name);
        var option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        return option.outerHTML;
      }).join('');

      if (floors.some(function (floor) { return clean(floor.name) === current; })) {
        select.value = current;
      } else if (floors.length === 1) {
        select.value = clean(floors[0].name) || activeName;
      } else {
        select.value = activeName;
      }
    }

    function renderSwitcher() {
      if (!switcher) return;
      var add = switcher.querySelector('[data-pmd-floor-add]');
      var addHtml = add ? add.outerHTML : '';
      var showFloorTabs = floors.length > 1;
      var showSwitcher = showFloorTabs || Boolean(addHtml);
      var divider = root.querySelector('[data-pmd-floor-switcher-divider]');

      var floorHtml = showFloorTabs
        ? floors.map(function (floor) {
            var id = clean(floor.id);
            var name = clean(floor.name);
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'pmd-shared-floor-switcher__floor' + (id === activeId ? ' is-active' : '');
            button.setAttribute('data-pmd-floor-switch', id);
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', id === activeId ? 'true' : 'false');
            button.textContent = name;
            return button.outerHTML;
          }).join('')
        : '';

      switcher.innerHTML = floorHtml + addHtml;
      switcher.hidden = !showSwitcher;
      if (divider) divider.hidden = !showSwitcher;
    }

    function applyActiveFloor(id, options) {
      var floor = floorById(id);
      if (!floor) return false;
      var opts = options || {};
      activeId = clean(floor.id);
      activeName = canonicalFloorName(floor.name);

      if (state.editing && typeof instance.setEditing === 'function') {
        instance.setEditing(false);
      }

      state.mergeMode = false;
      state.mergeSelection = [];
      state.active = null;
      state.selectedDisplayId = null;
      state.selectedArea = 'all';
      state.fullFloorCoordinateSnapshot = null;
      state.fullFloorDimensionSnapshot = null;

      state.tables = allTables.filter(function (table) {
        return key(floorNameFor(table)) === key(activeName);
      });

      root.setAttribute('data-pmd-active-floor-id', activeId);
      root.setAttribute('data-pmd-active-floor-name', activeName);

      if (opts.persist !== false) writeCookie(activeId);
      renderSwitcher();
      updateTableFloorSelect();

      if (typeof instance.clearSelection === 'function') instance.clearSelection();
      if (opts.refit !== false && typeof instance.fit === 'function' && !state.editing) instance.fit();

      window.dispatchEvent(new CustomEvent('pmd:floor:changed', {
        detail: {
          floor_id: activeId,
          floor_name: activeName,
          visible_tables: state.tables.length,
          total_tables: allTables.length
        }
      }));
      return true;
    }

    function adoptRegistry(registry) {
      if (!registry || typeof registry !== 'object') return;
      if (Array.isArray(registry.floors)) floors = registry.floors.slice();
      if (registry.table_floor_map && typeof registry.table_floor_map === 'object') {
        tableMap = registry.table_floor_map;
      }
    }

    function refreshRegistry() {
      if (!config.registry_read_url) return Promise.resolve(false);
      return postJson(config.registry_read_url, 'onPmdFloorRegistrySnapshot', {
        location_id: Number(config.location_id || 0)
      }).then(function (payload) {
        adoptRegistry(payload && payload.registry ? payload.registry : null);
        return true;
      }).catch(function (error) {
        console.warn('[PMD Multi Floor V1.4.3] Registry refresh failed', error);
        return false;
      });
    }

    function managerTableId(row) {
      return Number(row && row.table_id || 0);
    }

    function managerCapacity(row) {
      var value = Number(
        row && (
          row.preferred_capacity != null
            ? row.preferred_capacity
            : row.max_capacity
        )
      );
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function pmdCreatePlacementBounds() {
      var width = 1000;
      var height = 560;
      var cssWidth = parseFloat(root.style.getPropertyValue('--pmd-real-floor-width'));
      var cssHeight = parseFloat(root.style.getPropertyValue('--pmd-real-floor-height'));
      var canvas = root.querySelector('[data-floor-canvas]');

      if (Number.isFinite(cssWidth) && cssWidth > 0) width = Math.max(width, cssWidth);
      if (Number.isFinite(cssHeight) && cssHeight > 0) height = Math.max(height, cssHeight);

      if (canvas) {
        var inlineWidth = parseFloat(canvas.style.width);
        var inlineHeight = parseFloat(canvas.style.height);
        if (Number.isFinite(inlineWidth) && inlineWidth > 0) width = Math.max(width, inlineWidth);
        if (Number.isFinite(inlineHeight) && inlineHeight > 0) height = Math.max(height, inlineHeight);
      }

      return { width: width, height: height };
    }

    function pmdPlacementCoordinate(table, axis) {
      var raw = table && table.raw ? table.raw : {};
      var value = Number(axis === 'x' ? raw.floor_x : raw.floor_y);
      if (Number.isFinite(value) && value > 0) return value;
      value = Number(table && table[axis]);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function pmdPlacementDbId(table) {
      var raw = table && table.raw ? table.raw : {};
      return Number(table && table.dbTableId || raw.table_id || raw.id || 0);
    }

    function pmdCreatePlacementObstacles(floorName, excludeDbId) {
      var wanted = key(canonicalFloorName(floorName));
      return allTables.filter(function (table) {
        if (key(canonicalFloorName(floorNameFor(table))) !== wanted) return false;
        if (excludeDbId && pmdPlacementDbId(table) === Number(excludeDbId)) return false;
        return pmdPlacementCoordinate(table, 'x') > 0 && pmdPlacementCoordinate(table, 'y') > 0;
      }).map(function (table) {
        return {
          x: pmdPlacementCoordinate(table, 'x'),
          y: pmdPlacementCoordinate(table, 'y'),
          width: 108,
          height: 88
        };
      });
    }

    function pmdCreatePlacementLegal(candidate, obstacles) {
      var gap = 14;
      return obstacles.every(function (obstacle) {
        var candidateLeft = candidate.x - candidate.width / 2;
        var candidateRight = candidate.x + candidate.width / 2;
        var candidateTop = candidate.y - candidate.height / 2;
        var candidateBottom = candidate.y + candidate.height / 2;
        var obstacleLeft = obstacle.x - obstacle.width / 2;
        var obstacleRight = obstacle.x + obstacle.width / 2;
        var obstacleTop = obstacle.y - obstacle.height / 2;
        var obstacleBottom = obstacle.y + obstacle.height / 2;

        return (
          candidateRight + gap <= obstacleLeft ||
          candidateLeft >= obstacleRight + gap ||
          candidateBottom + gap <= obstacleTop ||
          candidateTop >= obstacleBottom + gap
        );
      });
    }

    function defaultPositionForFloor(floorName, excludeDbId) {
      var bounds = pmdCreatePlacementBounds();
      var obstacles = pmdCreatePlacementObstacles(floorName, excludeDbId);
      var width = 108;
      var height = 88;
      var gap = 14;
      var edge = 10;
      var stepX = width + gap;
      var stepY = height + gap;
      var startX = edge + width / 2;
      var startY = edge + height / 2;
      var maxX = bounds.width - edge - width / 2;
      var maxY = bounds.height - edge - height / 2;

      for (var y = startY; y <= maxY; y += stepY) {
        for (var x = startX; x <= maxX; x += stepX) {
          var candidate = { x: x, y: y, width: width, height: height };
          if (pmdCreatePlacementLegal(candidate, obstacles)) {
            return { x: x, y: y };
          }
        }
      }

      return null;
    }

    function persistCreatedTablePosition(dbId, position) {
      if (!dbId || !position) {
        return Promise.reject(new Error('No legal Floor position is available for the new table.'));
      }

      var layoutUrl = root.getAttribute('data-layout-url');
      if (!layoutUrl) {
        return Promise.reject(new Error('Floor layout endpoint is unavailable.'));
      }

      var headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };
      var csrf = document.querySelector('meta[name="csrf-token"]');
      if (csrf && csrf.content) headers['X-CSRF-TOKEN'] = csrf.content;

      return fetch(layoutUrl, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: headers,
        body: JSON.stringify({
          tables: [{
            id: Number(dbId),
            table_id: Number(dbId),
            floor_x: Math.round(position.x),
            floor_y: Math.round(position.y),
            floor_width: 108,
            floor_height: 88
          }]
        })
      }).then(function (response) {
        return response.text().then(function (text) {
          var payload = {};
          if (text) {
            try { payload = JSON.parse(text); }
            catch (error) { payload = { message: text }; }
          }
          if (!response.ok || payload.ok === false) {
            throw new Error(payload.message || ('HTTP ' + response.status));
          }
          if (payload.updated != null && Number(payload.updated) < 1) {
            throw new Error('New table Floor position updated 0 rows.');
          }
          return payload;
        });
      });
    }

    function upsertManagerTable(row) {
      var dbId = managerTableId(row);
      if (!dbId) return false;

      var existing = allTables.find(function (table) {
        var raw = table && table.raw ? table.raw : {};
        return Number(table && table.dbTableId || raw.table_id || 0) === dbId;
      }) || null;
      var wasCreated = !existing;

      var numberText = clean(row.table_no || dbId);
      var tableName = clean(row.table_name) || ('Table ' + numberText);
      var capacity = managerCapacity(row);
      var targetFloor = canonicalFloorName(row.floor_name || activeName);

      if (existing) {
        if (!existing.raw || typeof existing.raw !== 'object') existing.raw = {};
        existing.raw.table_id = dbId;
        existing.raw.table_no = numberText;
        existing.raw.table_number = numberText;
        existing.raw.table_name = tableName;
        existing.raw.name = tableName;
        existing.raw.preferred_capacity = capacity;
        existing.raw.max_capacity = capacity;
        existing.raw.min_capacity = 1;
        existing.raw.floor_notes = clean(row.floor_notes);
        existing.raw.features = managedFeatures(row.table_features);
        existing.raw.table_features = managedFeatures(row.table_features);
        existing.features = managedFeatures(row.table_features);
        existing.dbTableId = dbId;
        existing.number = numberText;
        existing.name = tableName;
        existing.capacity = capacity;
        existing.note = clean(row.floor_notes);
      } else {
        var fallback = defaultPositionForFloor(targetFloor, dbId);
        if (!fallback) {
          throw new Error('No legal Floor position is available for the new table.');
        }
        var x = Number(row.floor_x);
        var y = Number(row.floor_y);
        var candidate = { x: x, y: y, width: 108, height: 88 };
        var obstacles = pmdCreatePlacementObstacles(targetFloor, dbId);
        if (!Number.isFinite(x) || x <= 0 || !Number.isFinite(y) || y <= 0 || !pmdCreatePlacementLegal(candidate, obstacles)) {
          x = fallback.x;
          y = fallback.y;
        }

        existing = {
          raw: {
            id: String(dbId),
            table_id: dbId,
            table_no: numberText,
            table_number: numberText,
            table_name: tableName,
            name: tableName,
            preferred_capacity: capacity,
            max_capacity: capacity,
            min_capacity: 1,
            floor_notes: clean(row.floor_notes),
            features: managedFeatures(row.table_features),
            table_features: managedFeatures(row.table_features),
            floor_x: x,
            floor_y: y
          },
          id: String(dbId),
          dbTableId: dbId,
          number: numberText,
          name: tableName,
          area: 'Main',
          capacity: capacity,
          status: 'available',
          baseStatus: 'available',
          reservationBusy: false,
          waiterCall: false,
          cleaning: false,
          note: clean(row.floor_notes),
          features: managedFeatures(row.table_features),
          openOrders: 0,
          x: x,
          y: y,
          w: 108,
          h: 88
        };
        allTables.push(existing);
      }

      return {
        table: existing,
        created: wasCreated,
        position: wasCreated ? { x: Number(existing.x), y: Number(existing.y) } : null
      };
    }

    function renderTableQr(table) {
      var panel = tableManagerPanel();
      if (!panel) return;
      var pending = panel.querySelector('[data-pmd-floor-table-qr-pending]');
      var content = panel.querySelector('[data-pmd-floor-table-qr-content]');
      var image = panel.querySelector('[data-pmd-floor-table-qr-image]');
      var link = panel.querySelector('[data-pmd-floor-table-qr-link]');
      var code = panel.querySelector('[data-pmd-floor-table-qr-code]');

      var imageUrl = clean(table && table.qr_image_url);
      var targetUrl = clean(table && table.qr_target_url);
      var token = clean(table && table.qr_code);
      var ready = Boolean(imageUrl && targetUrl && token);

      if (pending) pending.hidden = ready;
      if (content) content.hidden = !ready;
      if (image) {
        if (ready) {
          image.src = imageUrl;
          image.alt = 'QR Code for table ' + clean(table.table_no || '');
        } else {
          image.removeAttribute('src');
        }
      }
      if (link) {
        if (ready) link.href = targetUrl;
        else link.removeAttribute('href');
      }
      if (code) code.textContent = token;
    }

    function recaptureAfterRefresh() {
      allTables = Array.isArray(state.tables) ? state.tables.slice() : [];
      applyActiveFloor(activeId, { persist: false });
    }

    if (!instance.__pmdMultiFloorRefreshWrapped && typeof instance.refresh === 'function') {
      var originalRefresh = instance.refresh.bind(instance);
      instance.refresh = function () {
        return Promise.resolve(originalRefresh()).then(function (result) {
          return refreshRegistry().then(function () {
            recaptureAfterRefresh();
            return result;
          });
        });
      };
      instance.__pmdMultiFloorRefreshWrapped = true;
    }

    function openAddPanel() {
      if (!addPanel || addBusy) return;

      // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_1_MODAL_PORTAL
      // The admin shell has legacy filtered/blurred ancestors. Keep this dialog
      // outside the Floor stacking context just like the existing global modal
      // repair does for Bootstrap modals. No observer is required.
      if (document.body && addPanel.parentElement !== document.body) {
        document.body.appendChild(addPanel);
      }
      // PMD_FLOOR_ADD_MODAL_LAYER_R36B
      // Mark the body portal explicitly so its backdrop can dim only the page,
      // while the dialog card stays at full opacity above that backdrop.
      addPanel.setAttribute('data-pmd-floor-add-portal', 'true');

      addPanel.hidden = false;
      document.documentElement.classList.add('pmd-floor-add-open');
      if (addError) { addError.hidden = true; addError.textContent = ''; }
      if (addInput) {
        addInput.value = '';
        addInput.focus();
      }
    }

    function closeAddPanel() {
      if (!addPanel || addBusy) return;
      addPanel.hidden = true;
      document.documentElement.classList.remove('pmd-floor-add-open');
      if (addError) { addError.hidden = true; addError.textContent = ''; }
    }

    function setAddBusy(value) {
      addBusy = Boolean(value);
      if (!addPanel) return;
      addPanel.setAttribute('aria-busy', addBusy ? 'true' : 'false');
      if (addInput) addInput.disabled = addBusy;
      if (addSave) addSave.disabled = addBusy;
    }

    function createFloor() {
      if (addBusy || !addInput || !config.registry_url) return;
      var name = clean(addInput.value);
      if (!name) {
        if (addError) { addError.hidden = false; addError.textContent = config.text && config.text.name_required || 'Floor name is required.'; }
        return;
      }

      setAddBusy(true);
      if (addError) { addError.hidden = true; addError.textContent = ''; }

      postJson(config.registry_url, 'onPmdFloorRegistryCreate', {
        location_id: Number(config.location_id || 0),
        name: name
      }).then(function (payload) {
        var registry = payload.registry || {};
        adoptRegistry(registry);
        var floor = payload.floor || null;
        if (!floor) throw new Error('Created floor was not returned by the server.');
        activeId = clean(floor.id);
        activeName = clean(floor.name) || name;
        writeCookie(activeId);
        updateTableFloorSelect();
        setAddBusy(false);
        closeAddPanel();
        applyActiveFloor(activeId, { persist: false });
      }).catch(function (error) {
        setAddBusy(false);
        if (addError) {
          addError.hidden = false;
          addError.textContent = clean(error && error.message) || 'Floor could not be created.';
        }
      });
    }

    window.addEventListener('pmd:floor:table-manager:loaded', function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (detail.root !== root) return;
      renderTableQr(detail.table || {});
    });

    window.addEventListener('pmd:floor:table-manager:saved', function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (detail.root !== root) return;
      var payload = detail.payload || {};
      if (payload.registry) adoptRegistry(payload.registry);
      var upserted = payload.table ? upsertManagerTable(payload.table) : null;

      // PMD_SHARED_FLOOR_MULTI_FLOOR_V1_3_ATOMIC_TABLE_SAVE
      // Suppress the old full network refresh because it briefly renders all
      // floors before V1.2 re-applies the active-floor filter. Update the same
      // in-memory Floor state once instead.
      detail.refreshHandled = true;
      applyActiveFloor(activeId, { persist: false, refit: false });

      if (upserted && upserted.created && upserted.position) {
        detail.afterSave = persistCreatedTablePosition(
          upserted.table && upserted.table.dbTableId,
          upserted.position
        ).then(function () {
          if (upserted.table && upserted.table.raw) {
            upserted.table.raw.floor_x = upserted.position.x;
            upserted.table.raw.floor_y = upserted.position.y;
          }
          return true;
        });
      }
    });

    function notificationCandidates(detail) {
      detail = detail || {};
      var notification = detail.notification || {};
      var payload = detail.payload || {};
      return [
        notification.table_id,
        notification.table_name,
        payload.table_id,
        payload.dining_table_id,
        payload.location_table_id,
        payload.table_no,
        payload.table_number,
        payload.table_name,
        payload.table,
        payload.table_ref
      ].map(clean).filter(Boolean);
    }

    function tableMatchesNotification(table, candidates) {
      var raw = table && table.raw ? table.raw : {};
      var values = [
        table && table.dbTableId,
        raw.table_id,
        raw.id,
        table && table.number,
        raw.table_no,
        raw.table_number,
        table && table.name,
        raw.table_name,
        raw.name,
        raw.label
      ].map(clean).filter(Boolean);

      return candidates.some(function (candidate) {
        var wanted = key(candidate);
        if (!wanted) return false;
        return values.some(function (value) {
          var current = key(value);
          if (current === wanted) return true;
          var match = String(candidate).match(/(?:table\s*)?#?\s*(\d+)$/i);
          return Boolean(match && key(match[1]) === current);
        });
      });
    }

    function notificationMeansOpenOrder(detail) {
      detail = detail || {};
      var notification = detail.notification || {};
      var payload = detail.payload || {};
      var type = key(notification.type || payload.type || '');
      if (type.indexOf('order') === -1 && !payload.order_id && !notification.order_id) return false;
      var status = key(
        detail.statusName
        || payload.status_name
        || payload.status
        || notification.order_status
        || notification.status
        || ''
      );
      if (/cancel|complete|completed|closed|paid|settled/.test(status)) return false;
      return true;
    }

    window.addEventListener('pmd:notification:new', function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (!notificationMeansOpenOrder(detail)) return;
      var candidates = notificationCandidates(detail);
      if (!candidates.length) return;

      var matched = false;
      allTables.forEach(function (table) {
        if (!tableMatchesNotification(table, candidates)) return;
        matched = true;
        if (!table.raw || typeof table.raw !== 'object') table.raw = {};
        table.raw.open_orders = Math.max(1, Number(table.raw.open_orders || 0));
        table.raw.status = 'occupied';
        table.openOrders = Math.max(1, Number(table.openOrders || 0));
        if (table.baseStatus !== 'attention' && table.baseStatus !== 'cleaning') {
          table.baseStatus = 'occupied';
          table.status = 'occupied';
        }
      });

      if (matched) {
        applyActiveFloor(activeId, { persist: false, refit: false });
      }
    });

    root.addEventListener('click', function (event) {
      var floorButton = event.target.closest('[data-pmd-floor-switch]');
      if (floorButton && root.contains(floorButton)) {
        event.preventDefault();
        applyActiveFloor(floorButton.getAttribute('data-pmd-floor-switch'));
        return;
      }

      var addButton = event.target.closest('[data-pmd-floor-add]');
      if (addButton && root.contains(addButton)) {
        event.preventDefault();
        openAddPanel();
      }
    });

    if (addPanel) {
      addPanel.querySelectorAll('[data-pmd-floor-add-close]').forEach(function (button) {
        button.addEventListener('click', closeAddPanel);
      });
      if (addSave) addSave.addEventListener('click', createFloor);
      if (addInput) {
        addInput.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') {
            event.preventDefault();
            createFloor();
          }
        });
      }
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !addPanel.hidden && !addBusy) closeAddPanel();
      });
    }

    applyActiveFloor(activeId, { persist: false });

    root.__pmdSharedMultiFloorV1 = {
      setActiveFloor: function (id) { return applyActiveFloor(id); },
      audit: function () {
        var distribution = {};
        var legacyMetadataDistribution = {};
        allTables.forEach(function (table) {
          var name = canonicalFloorName(floorNameFor(table));
          distribution[name] = (distribution[name] || 0) + 1;

          var raw = table && table.raw ? table.raw : {};
          var legacy = clean(raw.floor_name || (raw.floor && raw.floor.name));
          if (legacy) legacyMetadataDistribution[legacy] = (legacyMetadataDistribution[legacy] || 0) + 1;
        });
        return {
          ready: true,
          activeFloorId: activeId,
          activeFloorName: activeName,
          floorCount: floors.length,
          floors: floors.map(function (floor) { return { id: floor.id, name: floor.name }; }),
          visibleTables: state.tables.length,
          totalTables: allTables.length,
          floorDistribution: distribution,
          legacyFloorMetadataDistribution: legacyMetadataDistribution,
          explicitAssignmentCount: Object.keys((tableMap && tableMap.by_id) || {}).length,
          assignmentAuthority: 'location-option-table-id-map',
          mainAliasCompatibility: true,
          modalPortal: Boolean(addPanel && addPanel.parentElement === document.body),
          coreVersion: window.PMDDashboardLabExactFloorV1 && window.PMDDashboardLabExactFloorV1.version,
          refreshWrapped: Boolean(instance.__pmdMultiFloorRefreshWrapped),
          atomicTableSave: true,
          qrPreview: true,
          compactTableCard: true,
          equalCompactColumns: true,
          tableFeatureIcons: true,
          tableFeatureOptions: ['near_window', 'quiet_area', 'accessible'],
          qrDownload: true,
          notificationBusyBridge: true,
          safeCreatePlacement: true,
          sharedModalContract: true,
          sharedModalPortal: Boolean(
            tableManagerPanel() &&
            tableManagerPanel().parentElement === document.body
          ),
          featureRuntimeScope: 'local-manager',
          modalHeaderMinimal: true,
          floorButtonParity: true,
          featureSelectionTone: 'soft-green',
          customPanRuntime: false,
          nativeLayoutZoomGeometry: true,
          nativeScrollWorldMatchesRenderedFloor: true,
          viewportCoveredLogicalBounds: true,
          renderedFloorCoversViewport: true,
          bottomViewportFullyUsable: true,
          rightViewportFullyUsable: true,
          zoomOutAddsNoVisualWorld: true,
          dragBoundsFollowVisibleFloor: true,
          zoomChangesTableCoordinates: false,
          zoomBoundaryBlinkRemoved: true,
          scrollEventClamp: false,
          sharedFloorReadyEvent: true,
          sharedRouteBootOrderSafe: true,
          oneRowCanonicalGeometry: true,
          oneRowTransitionMeasurementFree: true,
          oneRowFixedGap: 18,
          floorTabsVisibleForAllRoles: true,
          addFloorOwnerManagerOnly: true,
          singleFloorTabsHidden: true,
          singleFloorTableFieldHidden: true,
          roleIndependentRegistryLocation: true,
          extendedLayoutPersistence: true,
          serverCoordinateClipRemoved: true,
          loadedCoordinateExtentSync: true,
          canManage: Boolean(config.can_manage)
        };
      }
    };

    window.PMDSharedFloorMultiFloorV1 = {
      version: '1.4.16',
      audit: function () { return root.__pmdSharedMultiFloorV1.audit(); }
    };

    console.info('[PMD Shared Floor Multi-Floor V1.4.16] Ready', window.PMDSharedFloorMultiFloorV1.audit());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* PMD_SHARED_FLOOR_BOOT_ORDER_V1_4_13
   * Core and coordinator may be delivered by different route asset paths.
   * Whichever arrives second completes the same one coordinator. Event-driven;
   * no interval, MutationObserver or retry timeout.
   */
  window.addEventListener(
    'pmd:shared-floor:ready',
    boot,
    false
  );

  window.addEventListener(
    'load',
    boot,
    {
      once: true
    }
  );
})();
