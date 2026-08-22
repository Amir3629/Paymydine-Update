(function () {
  'use strict';

  if (window.PMDCashierQuickLauncherV21) return;

  var bootNode = document.getElementById(
    'pmd-cashier-quick-canonical-bootstrap-v21'
  );
  var waiterRoot = document.querySelector(
    '[data-pmd-waiter-v2-root]'
  );

  if (!bootNode || !waiterRoot) return;

  var boot = {};
  try {
    boot = JSON.parse(bootNode.textContent || '{}');
  } catch (error) {
    console.error(
      '[PMD Cashier Quick V2.1] Canonical bootstrap parse failed',
      error
    );
    return;
  }

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function key(value) {
    return clean(value).toLocaleLowerCase();
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : Number(fallback || 0);
  }

  function positiveId(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : 0;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(
      /[&<>"']/g,
      function (character) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        }[character];
      }
    );
  }

  function canonicalFloorName(value) {
    var name = clean(value);
    var normalized = key(name);

    if (
      !name ||
      normalized === 'main' ||
      normalized === 'main floor'
    ) {
      return 'Main Floor';
    }

    return name;
  }

  function normalizeFloors() {
    var source = Array.isArray(boot.floors)
      ? boot.floors
      : [];

    var rows = source.map(function (floor, index) {
      floor = floor || {};
      var name = canonicalFloorName(floor.name || floor.label);
      var id = clean(floor.id);

      if (!id) {
        id = 'floor-' + String(index + 1);
      }

      return {
        id: id,
        name: name,
        sort: number(floor.sort, index),
        isDefault:
          floor.is_default === true ||
          String(floor.is_default || '') === '1'
      };
    });

    if (!rows.length) {
      rows.push({
        id: 'main-floor',
        name: 'Main Floor',
        sort: 0,
        isDefault: true
      });
    }

    rows.sort(function (left, right) {
      if (left.sort !== right.sort) return left.sort - right.sort;
      return left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });

    return rows;
  }

  var floorMap =
    boot.table_floor_map &&
    typeof boot.table_floor_map === 'object'
      ? boot.table_floor_map
      : {};

  function rawTableId(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    return positiveId(
      row.dbTableId ||
      row.db_table_id ||
      row.table_id ||
      row.location_table_id ||
      row.id ||
      raw.table_id ||
      raw.location_table_id ||
      raw.id
    );
  }

  function rawTableNumber(row, id) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    return clean(
      row.number ||
      row.table_number ||
      row.table_no ||
      raw.table_number ||
      raw.table_no ||
      id
    );
  }

  function rawTableName(row, numberText, id) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    var name = clean(
      row.name ||
      row.label ||
      row.table_label ||
      row.table_name ||
      raw.table_name ||
      raw.name
    );

    if (!name || /^\d+$/.test(name)) {
      return 'Table ' + (numberText || id);
    }

    return name;
  }

  function floorForRow(row, id, numberText, name) {
    var byId = floorMap.by_id || {};
    var byNumber = floorMap.by_number || {};
    var byName = floorMap.by_name || {};

    var idKeys = [
      id,
      row && row.table_id,
      row && row.id,
      row && row.dbTableId,
      row && row.raw && row.raw.table_id,
      row && row.raw && row.raw.id
    ].map(clean).filter(Boolean);

    for (var i = 0; i < idKeys.length; i += 1) {
      if (byId[idKeys[i]]) {
        return canonicalFloorName(byId[idKeys[i]]);
      }
    }

    var numberKeys = [
      numberText,
      row && row.table_number,
      row && row.table_no,
      row && row.number
    ].map(key).filter(Boolean);

    for (var j = 0; j < numberKeys.length; j += 1) {
      if (byNumber[numberKeys[j]]) {
        return canonicalFloorName(byNumber[numberKeys[j]]);
      }
    }

    var nameKeys = [
      name,
      row && row.table_name,
      row && row.name,
      row && row.label
    ].map(key).filter(Boolean);

    for (var k = 0; k < nameKeys.length; k += 1) {
      if (byName[nameKeys[k]]) {
        return canonicalFloorName(byName[nameKeys[k]]);
      }
    }

    return 'Main Floor';
  }

  function tableOpenOrders(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    return Math.max(
      0,
      number(
        row.open_orders != null
          ? row.open_orders
          : (
              row.openOrders != null
                ? row.openOrders
                : raw.open_orders
            ),
        0
      )
    );
  }

  function tableDue(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    return Math.max(
      0,
      number(
        row.due != null
          ? row.due
          : (
              row.payment_due != null
                ? row.payment_due
                : (
                    row.pending_value != null
                      ? row.pending_value
                      : raw.due
                  )
            ),
        0
      )
    );
  }

  function tableCapacity(row) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    return Math.max(
      0,
      number(
        row.capacity ||
        raw.capacity ||
        raw.table_capacity ||
        raw.preferred_capacity ||
        raw.max_capacity,
        0
      )
    );
  }

  function tableStatus(row, openOrders) {
    row = row || {};
    var raw = row.raw && typeof row.raw === 'object'
      ? row.raw
      : {};

    var status = key(
      row.operational_status ||
      raw.operational_status ||
      row.status ||
      raw.status ||
      row.baseStatus ||
      row.base_status ||
      ''
    );

    var waiterCall =
      row.waiterCall === true ||
      row.waiter_call === true ||
      raw.waiter_call === true ||
      String(raw.waiter_call || '') === '1';

    var cleaning =
      row.cleaning === true ||
      row.cleaning_required === true ||
      raw.cleaning_required === true ||
      /clean/.test(status);

    if (waiterCall) return 'call';
    if (cleaning) return 'cleaning';
    if (/ready/.test(status)) return 'ready';
    if (/reserve/.test(status)) return 'reserved';
    if (/call|attention/.test(status)) return 'call';

    if (
      openOrders > 0 ||
      /occup|busy|active|open|kitchen|prepar|serv/.test(status)
    ) {
      return 'open';
    }

    return 'free';
  }

  function normalizeTable(row) {
    row = row || {};

    var id = rawTableId(row);
    if (!id) return null;

    var numberText = rawTableNumber(row, id);
    var name = rawTableName(row, numberText, id);
    var systemName = key(name);

    if (
      systemName === 'cashier' ||
      systemName === 'delivery'
    ) {
      return null;
    }

    var openOrders = tableOpenOrders(row);

    return {
      id: id,
      number: numberText,
      name: name,
      floorName: floorForRow(
        row,
        id,
        numberText,
        name
      ),
      capacity: tableCapacity(row),
      openOrders: openOrders,
      due: tableDue(row),
      status: tableStatus(row, openOrders),
      raw: row
    };
  }

  var floors = normalizeFloors();
  var tables = (Array.isArray(boot.tables) ? boot.tables : [])
    .map(normalizeTable)
    .filter(Boolean);

  var seen = {};
  tables = tables.filter(function (table) {
    if (seen[table.id]) return false;
    seen[table.id] = true;
    return true;
  });

  tables.sort(function (left, right) {
    var leftNumeric = /^\d+$/.test(left.number)
      ? Number(left.number)
      : Number.MAX_SAFE_INTEGER;
    var rightNumeric = /^\d+$/.test(right.number)
      ? Number(right.number)
      : Number.MAX_SAFE_INTEGER;

    if (leftNumeric !== rightNumeric) {
      return leftNumeric - rightNumeric;
    }

    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });

  function floorById(id) {
    id = clean(id);
    return floors.find(function (floor) {
      return clean(floor.id) === id;
    }) || null;
  }

  function floorByName(name) {
    var wanted = key(canonicalFloorName(name));
    return floors.find(function (floor) {
      return key(canonicalFloorName(floor.name)) === wanted;
    }) || null;
  }

  var activeFloor =
    floorById(boot.active_floor && boot.active_floor.id) ||
    floorByName(boot.active_floor && boot.active_floor.name) ||
    floors[0];

  var query = '';

  function visibleTables() {
    var floorName = canonicalFloorName(activeFloor && activeFloor.name);
    var wanted = key(query);

    return tables.filter(function (table) {
      if (key(table.floorName) !== key(floorName)) return false;
      if (!wanted) return true;

      return key(
        [
          table.name,
          table.number,
          table.floorName,
          table.status
        ].join(' ')
      ).indexOf(wanted) !== -1;
    });
  }

  function statusText(status) {
    return {
      free: 'Free',
      open: 'Open',
      ready: 'Ready',
      reserved: 'Reserved',
      cleaning: 'Cleaning',
      call: 'Waiter call'
    }[status] || 'Free';
  }

  function statusClass(status) {
    return 'is-' + String(status || 'free').replace(/[^a-z0-9_-]/gi, '');
  }

  function money(value) {
    return '€' + number(value, 0).toFixed(2);
  }

  function writeFloorCookie(floor) {
    var cookieName = clean(boot.cookie_name);
    if (!cookieName || !floor) return;

    document.cookie =
      cookieName + '=' +
      encodeURIComponent(clean(floor.id)) +
      '; Path=/admin; Max-Age=31536000; SameSite=Lax';
  }

  var launcher = document.createElement('section');
  launcher.id = 'pmd-cashier-quick-launcher-v21';
  launcher.setAttribute('data-pmd-cashier-quick-launcher-v21', '1');
  launcher.innerHTML = [
    '<header class="pmd-cql-v21__head">',
      '<div>',
        '<small>WAITER QUICK MODE</small>',
        '<h1>Quick Service</h1>',
        '<p data-cql-active-floor></p>',
      '</div>',
      '<button type="button" data-cql-refresh aria-label="Refresh tables" title="Refresh tables">',
        '<span aria-hidden="true">↻</span>',
      '</button>',
    '</header>',

    '<section class="pmd-cql-v21__summary" aria-label="Current floor summary">',
      '<article><span>Tables</span><strong data-cql-table-count>0</strong></article>',
      '<article><span>Open checks</span><strong data-cql-open-count>0</strong></article>',
      '<article><span>Due</span><strong data-cql-due>€0.00</strong></article>',
    '</section>',

    '<nav class="pmd-cql-v21__floors" data-cql-floors aria-label="Floors"></nav>',

    '<label class="pmd-cql-v21__search">',
      '<span aria-hidden="true">⌕</span>',
      '<input type="search" data-cql-search placeholder="Search table..." autocomplete="off" enterkeyhint="search">',
    '</label>',

    '<div class="pmd-cql-v21__meta">',
      '<strong data-cql-floor-title></strong>',
      '<span data-cql-floor-count></span>',
    '</div>',

    '<div class="pmd-cql-v21__grid" data-cql-grid></div>',

    '<div class="pmd-cql-v21__empty" data-cql-empty hidden>',
      '<strong>No tables on this floor</strong>',
      '<span>Choose another floor or clear the search.</span>',
    '</div>',
  ].join('');

  waiterRoot.insertBefore(launcher, waiterRoot.firstChild);
  document.body.classList.add('pmd-cashier-waiter-host-v21');

  var floorHost = launcher.querySelector('[data-cql-floors]');
  var grid = launcher.querySelector('[data-cql-grid]');
  var empty = launcher.querySelector('[data-cql-empty]');
  var search = launcher.querySelector('[data-cql-search]');

  function renderFloors() {
    if (!floorHost) return;

    if (floors.length <= 1) {
      floorHost.hidden = true;
      floorHost.innerHTML = '';
      return;
    }

    floorHost.hidden = false;
    floorHost.innerHTML = floors.map(function (floor) {
      var count = tables.filter(function (table) {
        return key(table.floorName) === key(floor.name);
      }).length;

      return [
        '<button type="button" data-cql-floor="',
        escapeHtml(floor.id),
        '" class="',
        activeFloor && activeFloor.id === floor.id ? 'is-active' : '',
        '">',
          '<span>', escapeHtml(floor.name), '</span>',
          '<b>', count, '</b>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderTables() {
    var rows = visibleTables();
    var totalOpen = rows.reduce(function (sum, table) {
      return sum + Math.max(0, table.openOrders);
    }, 0);
    var totalDue = rows.reduce(function (sum, table) {
      return sum + Math.max(0, table.due);
    }, 0);

    var activeName = canonicalFloorName(activeFloor && activeFloor.name);

    var floorCopy = launcher.querySelector('[data-cql-active-floor]');
    var floorTitle = launcher.querySelector('[data-cql-floor-title]');
    var floorCount = launcher.querySelector('[data-cql-floor-count]');
    var tableCount = launcher.querySelector('[data-cql-table-count]');
    var openCount = launcher.querySelector('[data-cql-open-count]');
    var due = launcher.querySelector('[data-cql-due]');

    if (floorCopy) floorCopy.textContent = activeName;
    if (floorTitle) floorTitle.textContent = activeName;
    if (floorCount) {
      floorCount.textContent =
        rows.length + (rows.length === 1 ? ' table' : ' tables');
    }
    if (tableCount) tableCount.textContent = String(rows.length);
    if (openCount) openCount.textContent = String(totalOpen);
    if (due) due.textContent = money(totalDue);

    if (!rows.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    grid.innerHTML = rows.map(function (table) {
      var meta = [];
      if (table.capacity > 0) {
        meta.push(
          table.capacity +
          (table.capacity === 1 ? ' seat' : ' seats')
        );
      }
      if (table.openOrders > 0) {
        meta.push(
          table.openOrders +
          (table.openOrders === 1 ? ' open check' : ' open checks')
        );
      }
      if (table.due > 0.009) {
        meta.push('Due ' + money(table.due));
      }
      if (!meta.length) meta.push('Ready for service');

      return [
        '<button type="button" class="pmd-cql-v21__table ',
        statusClass(table.status),
        '" data-cql-table="',
        escapeHtml(table.id),
        '">',
          '<span class="pmd-cql-v21__dot" aria-hidden="true"></span>',
          '<span class="pmd-cql-v21__table-copy">',
            '<strong>', escapeHtml(table.name), '</strong>',
            '<small>', escapeHtml(meta.join(' · ')), '</small>',
          '</span>',
          '<span class="pmd-cql-v21__state">',
            escapeHtml(statusText(table.status)),
          '</span>',
          '<span class="pmd-cql-v21__arrow" aria-hidden="true">›</span>',
        '</button>'
      ].join('');
    }).join('');
  }

  function render() {
    renderFloors();
    renderTables();
  }

  launcher.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1
      ? event.target
      : null;
    if (!target) return;

    var floorButton = target.closest('[data-cql-floor]');
    if (floorButton) {
      var nextFloor = floorById(
        floorButton.getAttribute('data-cql-floor')
      );
      if (!nextFloor) return;

      activeFloor = nextFloor;
      writeFloorCookie(activeFloor);
      render();
      return;
    }

    if (target.closest('[data-cql-refresh]')) {
      window.location.reload();
      return;
    }

    var tableButton = target.closest('[data-cql-table]');
    if (tableButton) {
      var tableId = positiveId(
        tableButton.getAttribute('data-cql-table')
      );
      if (!tableId) return;

      if (
        !window.PMDWaiterStandardV2 ||
        typeof window.PMDWaiterStandardV2.openTable !== 'function'
      ) {
        console.error(
          '[PMD Cashier Quick V2.1] Existing Waiter POS launcher is unavailable.'
        );
        return;
      }

      window.PMDWaiterStandardV2.openTable(String(tableId));
    }
  });

  if (search) {
    search.addEventListener('input', function () {
      query = clean(search.value);
      renderTables();
    });
  }

  render();

  window.PMDCashierQuickLauncherV21 = {
    version: '2.1.0',
    inspect: function () {
      return {
        route: window.location.pathname,
        source: clean(boot.source),
        locationId: positiveId(boot.location_id),
        floors: floors.map(function (floor) {
          return {
            id: floor.id,
            name: floor.name
          };
        }),
        activeFloor: activeFloor
          ? {
              id: activeFloor.id,
              name: activeFloor.name
            }
          : null,
        canonicalTables: tables.length,
        visibleTables: visibleTables().length,
        waiterRuntimeReady: Boolean(
          window.PMDWaiterStandardV2 &&
          typeof window.PMDWaiterStandardV2.openTable === 'function'
        ),
        oldLauncherHidden: true,
        canonicalFloorAuthority: 'PmdCleanWorkspaceSharedV1 + PmdSharedFloorRegistryV1'
      };
    }
  };

  console.info(
    '[PMD] Cashier Quick Launcher V2.1 ready',
    window.PMDCashierQuickLauncherV21.inspect()
  );
})();
