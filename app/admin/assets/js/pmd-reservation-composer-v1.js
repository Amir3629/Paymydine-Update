(function () {
  'use strict';

  var config = window.PMD_RESERVATION_COMPOSER_V1 || {};
  var root = document.getElementById('pmd-reservation-composer-v1');
  var form = document.getElementById('pmd-reservation-composer-form-v1');
  if (!root || !form || window.PMDReservationComposerV1) return;

  var selectors = [
    '#pmd-r2-clean-header a.pmd-r2-clean-create',
    '#pmd-reservations2 .pmd-r2__hero a.pmd-r2__new',
    '#pmd-r2-reservation-grid-v320 [data-r2-add-reservation] a[href]',
    '#pmd-r2-calendar-surface-v160 [data-r2-create-button]',
    '#pmd-r2-reservation-grid-v320 [data-r2-reservation-id] a[href*="/admin/reservations/edit/"]',
    '#pmd-r2-calendar-surface-v160 .pmd-r2-slot-booking[data-r2-reservation-id] a[href*="/admin/reservations/edit/"]',
    '#pmd-r2-calendar-surface-v160 .pmd-r2-yc-detail-card[data-reservation] a[href*="/admin/reservations/edit/"]'
  ].join(',');
  var modal = null;
  var context = null;
  var trigger = null;
  var baseline = '';
  var allowHide = false;
  var closing = false;
  var checkingTimer = null;

  /*
   * PMD_COMPOSER_SMART_TABLE_CORRECTNESS_20260807
   * Protect availability against stale async responses.
   */
  var availabilityGeneration = 0;

  var saving = false;
  var tableCatalog = [];
  var tablePicker = null;
  var lastAvailability = null;

  /*
   * PMD_COMPOSER_STABLE_NO_BLINK_V3_20260807
   *
   * Do not repeat availability requests when nothing that
   * affects table availability actually changed.
   */
  var pmdLastAvailabilitySignatureV3 = null;


  function clean(value) { return String(value == null ? '' : value).trim(); }
  function positiveIds(values) {
    var seen = {};
    return (Array.isArray(values) ? values : [values]).map(Number).filter(function (id) {
      if (!Number.isInteger(id) || id < 1 || seen[id]) return false;
      seen[id] = true; return true;
    });
  }
  function dateValue(value) { return /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : null; }
  function timeValue(value) { var match = clean(value).match(/^([01]\d|2[0-3]):[0-5]\d/); return match ? match[0] : null; }
  function editId(url) { var match = clean(url).match(/\/reservations\/edit\/(\d+)/); return match ? Number(match[1]) : null; }
  function currentView() {
    var page = document.getElementById('pmd-reservations2');
    if (page && (page.classList.contains('is-timeslot-screen') || page.classList.contains('pmd-r2-hour-layout-v38-active'))) return 'hour';
    if (page && page.classList.contains('is-calendar-mode')) return 'calendar';
    return 'floor';
  }
  function selectedDate() {
    var page = document.getElementById('pmd-reservations2');
    var selected = document.querySelector('[data-r2-yc-selected] [data-r2-yc-date], [data-r2-yc-date][aria-selected="true"]');
    var values = [
      selected && selected.getAttribute('data-r2-yc-date'),
      page && page.getAttribute('data-pmd-selected-date'),
      page && page.getAttribute('data-r2-selected-date')
    ];
    var api = window.PMDReservations2FloorExperience;
    if (api && api.getState) values.push(api.getState().start);
    for (var i = 0; i < values.length; i += 1) if (dateValue(values[i])) return dateValue(values[i]);
    return null;
  }
  function floorSelection() {
    /* PMD_COMPOSER_EXACT_FLOOR_DB_ID_SELECTION_V1_3_20260815
     * data-floor-table is the exact Floor's DISPLAY identity. It is not a
     * guaranteed tables.table_id. Resolve the selected display card through
     * root.__pmdFloorV1 state and send dbTableId/raw.table_id to Reservations.
     *
     * PMD_COMPOSER_FLOOR_CONTEXT_V1_4_20260817
     * Multi-Floor is also part of the recommendation context. A selected table
     * locks the recommendation to that Floor. With no selected table, the
     * currently visible Floor is only preferred; AUTO may fall back to another
     * complete Floor, but a recommendation may never mix Floors.
     */
    var node = document.querySelector(
      '.pmd-floor-v1__table.is-selected[data-floor-table], ' +
      '#pmd-r2-shared-floor-canvas-v310 [data-pmd-r2-selected-table-v320], ' +
      '#pmd-r2-shared-floor-canvas-v310 .pmd-r2-table-selected-v317'
    );
    var exactRoot = node && node.closest
      ? node.closest('[data-pmd-floor]')
      : document.querySelector('[data-pmd-floor], #pmd-r2-shared-floor-canvas-v310');
    var exactInstance = exactRoot && exactRoot.__pmdFloorV1 ? exactRoot.__pmdFloorV1 : null;
    var exactState = exactInstance && typeof exactInstance.getState === 'function'
      ? (exactInstance.getState() || {})
      : null;
    var floorId = exactRoot ? clean(exactRoot.getAttribute('data-pmd-active-floor-id')) : '';
    var floorName = exactRoot ? clean(exactRoot.getAttribute('data-pmd-active-floor-name')) : '';

    if (exactRoot && exactRoot.__pmdSharedMultiFloorV1 && typeof exactRoot.__pmdSharedMultiFloorV1.audit === 'function') {
      try {
        var floorAudit = exactRoot.__pmdSharedMultiFloorV1.audit() || {};
        floorId = floorId || clean(floorAudit.activeFloorId);
        floorName = floorName || clean(floorAudit.activeFloorName);
      } catch (ignore) {}
    }

    if (exactState && Array.isArray(exactState.displayTables)) {
      var selectedId = exactState.selectedDisplayId != null && String(exactState.selectedDisplayId) !== ''
        ? exactState.selectedDisplayId
        : (node ? node.getAttribute('data-floor-table') : null);
      var selected = exactState.displayTables.find(function (table) {
        return table && String(table.id) === String(selectedId == null ? '' : selectedId);
      }) || null;

      if (selected) {
        var selectedMembers = selected.isMergedView && Array.isArray(selected.members)
          ? selected.members
          : [selected];
        var ids = positiveIds(selectedMembers.map(function (table) {
          var raw = table && table.raw && typeof table.raw === 'object' ? table.raw : {};
          return table ? (table.dbTableId || raw.table_id || 0) : 0;
        }));
        var names = selectedMembers.map(function (table) {
          var raw = table && table.raw && typeof table.raw === 'object' ? table.raw : {};
          return clean(
            table && (
              table.name ||
              raw.table_name ||
              raw.name ||
              ('Table ' + (table.number || table.dbTableId || raw.table_id || ''))
            )
          );
        }).filter(Boolean);

        if (ids.length) {
          return {
            ids: ids,
            names: names,
            date: null,
            source: 'exact-floor-db-id',
            floorId: floorId,
            floorName: floorName,
            floorLocked: true
          };
        }
      }

      return {
        ids: [],
        names: [],
        date: null,
        source: 'exact-floor-active',
        floorId: floorId,
        floorName: floorName,
        floorLocked: false
      };
    }

    /* Reservations2 compatibility fallback. Keep its existing FloorExperience
     * state path, but never treat exact Floor data-floor-table as a DB id. */
    var api = window.PMDReservations2FloorExperience;
    var state = api && api.getState ? api.getState() : {};
    var exactFloorNode = Boolean(node && node.classList && node.classList.contains('pmd-floor-v1__table'));
    var members = !exactFloorNode && node
      ? clean(node.getAttribute('data-floor-members')).split(',')
      : [];
    var ids = positiveIds(members);
    if (!ids.length) ids = positiveIds(state.tableId);
    var names = node
      ? [clean(node.getAttribute('aria-label') || node.getAttribute('title') || state.tableName)]
      : [state.tableName];
    return {
      ids: ids,
      names: names.filter(Boolean),
      date: dateValue(state.start),
      source: 'legacy-floor-experience',
      floorId: floorId,
      floorName: floorName,
      floorLocked: ids.length > 0
    };
  }

  function fallbackFor(element) {
    if (element.href) return element.href;
    var row = element.closest('[data-r2-create-date][data-r2-create-time]');
    var url = new URL((window.PMD_RESERVATIONS2_BOOT || {}).createUrl || '/admin/reservations/create', location.origin);
    if (row) {
      url.searchParams.set('reserve_date', row.getAttribute('data-r2-create-date'));
      url.searchParams.set('reserve_time', row.getAttribute('data-r2-create-time'));
    }
    return url.href;
  }
  function normalize(element) {
    var fallback = fallbackFor(element);
    var url = new URL(fallback, location.origin);
    var row = element.closest('[data-r2-create-date][data-r2-create-time]');
    var card = element.closest('[data-r2-reservation-id]');
    var calendarCard = element.closest('[data-reservation]');
    var floor = floorSelection();
    var id = positiveIds(card && card.getAttribute('data-r2-reservation-id'))[0]
      || positiveIds(calendarCard && calendarCard.getAttribute('data-reservation'))[0]
      || editId(url.pathname);
    var source = 'header';
    if (row && id) source = 'hour-reservation';
    else if (calendarCard && id) source = 'calendar-reservation';
    else if (card && id) source = 'reservation-card';
    else if (row) source = 'hour-slot';
    else if (element.closest('[data-r2-add-reservation]')) source = floor.ids.length ? 'floor-selection' : 'add-card';
    var date = dateValue(row && row.getAttribute('data-r2-create-date'))
      || dateValue(url.searchParams.get('reserve_date')) || floor.date || selectedDate();
    var time = timeValue(row && row.getAttribute('data-r2-create-time')) || timeValue(url.searchParams.get('reserve_time'));
    var hinted = positiveIds([url.searchParams.get('table_id'), url.searchParams.get('table')]);
    return {
      version: 1, mode: id ? 'edit' : 'create', source: source,
      reservationId: id || null, selectedDate: date, selectedTime: time,
      duration: null, tableIds: floor.ids.length ? floor.ids : hinted,
      tableNames: floor.names, floorId: floor.floorId || '', floorName: floor.floorName || '',
      floorLocked: Boolean(floor.floorLocked || floor.ids.length),
      locationId: null, returnView: id && source === 'calendar-reservation' ? 'calendar' : (id && source === 'hour-reservation' ? 'hour' : currentView()),
      fallbackUrl: fallback
    };
  }
  function csrf() { var meta = document.querySelector('meta[name="csrf-token"]'); return meta ? meta.content : ''; }
  function request(handler, data) {
    return fetch(config.endpoint || '/admin/reservations2', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf(),'X-IGNITER-REQUEST-HANDLER':handler},
      body: JSON.stringify(data || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.success === false) { var error = new Error(json && json.error ? json.error.message : 'Request failed.'); error.response = json; error.status = response.status; throw error; }
        return json;
      });
    });
  }
  function ensureModal() {
    if (!window.bootstrap || !window.bootstrap.Modal) throw new Error('Bootstrap Modal is unavailable.');
    if (!modal) modal = new window.bootstrap.Modal(root, {backdrop:true, keyboard:false, focus:true});
    return modal;
  }
  function tagBackdrop() {
    var backdrops = document.querySelectorAll('.modal-backdrop:not(.pmd-reservation-composer-backdrop-v1)');
    if (backdrops.length) backdrops[backdrops.length - 1].classList.add('pmd-reservation-composer-backdrop-v1');
  }
  function snapshot() {
    return JSON.stringify(Array.from(new FormData(form).entries()).sort(function (a,b) { return a[0].localeCompare(b[0]) || clean(a[1]).localeCompare(clean(b[1])); }));
  }
  function dirty() { return baseline && snapshot() !== baseline; }
  function close(force) {
    /*
     * PMD_COMPOSER_SOFT_DRAFT_V2426
     * Close immediately. Preserve unsaved create-form values.
     */
    if (
      !force &&
      window.PMDReservationComposerSoftDraftV2426 &&
      typeof window.PMDReservationComposerSoftDraftV2426.capture ===
        'function'
    ) {
      window.PMDReservationComposerSoftDraftV2426.capture();
    }
    if (closing) return;
    closing = true; root.classList.add('pmd-reservation-composer-v1--closing');
    var delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190;
    window.setTimeout(function () { allowHide = true; ensureModal().hide(); }, delay);
  }
  function clearErrors() {
    root.querySelectorAll('[aria-invalid=true]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
    root.querySelectorAll('[data-error-for]').forEach(function (node) { node.textContent = ''; });
    var summary = root.querySelector('[data-pmd-composer-summary]'); summary.hidden = true; summary.textContent = '';
  }
  function showError(error) {
    clearErrors();
    var response = error.response && error.response.error ? error.response.error : {};
    var fields = response.fields || {};
    Object.keys(fields).forEach(function (name) {
      var field = form.querySelector('[name="'+CSS.escape(name)+'"], [name="'+CSS.escape(name)+'[]"]');
      var errorNode = root.querySelector('[data-error-for="'+CSS.escape(name.replace(/\.\d+$/, ''))+'"]');
      if (field) field.setAttribute('aria-invalid', 'true');
      if (errorNode) errorNode.textContent = Array.isArray(fields[name]) ? fields[name][0] : fields[name];
    });
    var summary = root.querySelector('[data-pmd-composer-summary]');
    summary.textContent = response.message || error.message || 'The reservation could not be processed.'; summary.hidden = false; summary.focus();
    var first = root.querySelector('[aria-invalid=true]'); if (first) first.focus();
  }
  function option(select, value, text, selected) {
    var item = document.createElement('option');
    item.value = value;
    item.textContent = text;
    item.selected = !!selected;
    select.appendChild(item);
  }

  function selectedTableIds() {
    var select = form.querySelector('[name="tables[]"]');

    if (!select) return [];

    return positiveIds(
      Array.from(select.options)
        .filter(function (item) {
          return item.selected;
        })
        .map(function (item) {
          return item.value;
        })
    );
  }

  function ensureTablePicker() {
    if (tablePicker) return tablePicker;

    var wrapper = root.querySelector(
      '.pmd-reservation-composer-v1__tables'
    );

    var select = wrapper && wrapper.querySelector(
      '[name="tables[]"]'
    );

    if (!wrapper || !select) return null;

    wrapper.classList.add(
      'pmd-reservation-composer-v1__tables--enhanced'
    );

    select.classList.add(
      'pmd-reservation-composer-v1__table-native'
    );

    var triggerButton = document.createElement('button');
    triggerButton.type = 'button';
    triggerButton.className =
      'pmd-reservation-composer-v1__table-trigger';
    triggerButton.setAttribute('aria-expanded', 'false');

    var triggerText = document.createElement('span');
    triggerText.textContent = 'Select tables';

    var triggerArrow = document.createElement('span');
    triggerArrow.className =
      'pmd-reservation-composer-v1__table-arrow';
    triggerArrow.textContent = '⌄';
    triggerArrow.setAttribute('aria-hidden', 'true');

    triggerButton.appendChild(triggerText);
    triggerButton.appendChild(triggerArrow);

    var panel = document.createElement('div');
    panel.className =
      'pmd-reservation-composer-v1__table-panel';
    panel.hidden = true;

    var options = document.createElement('div');
    options.className =
      'pmd-reservation-composer-v1__table-options';

    panel.appendChild(options);

    var chips = document.createElement('div');
    chips.className =
      'pmd-reservation-composer-v1__table-chips';

    wrapper.insertBefore(triggerButton, select);
    wrapper.insertBefore(panel, select);
    wrapper.appendChild(chips);

    triggerButton.addEventListener('click', function () {
      var willOpen = panel.hidden;

      panel.hidden = !willOpen;
      triggerButton.setAttribute(
        'aria-expanded',
        willOpen ? 'true' : 'false'
      );
    });

    document.addEventListener('click', function (event) {
      if (
        panel.hidden
        || wrapper.contains(event.target)
      ) {
        return;
      }

      panel.hidden = true;
      triggerButton.setAttribute('aria-expanded', 'false');
    });

    tablePicker = {
      wrapper: wrapper,
      select: select,
      trigger: triggerButton,
      triggerText: triggerText,
      panel: panel,
      options: options,
      chips: chips
    };

    return tablePicker;
  }

  /* PMD_MATCHING_TABLES_MULTI_CARD_V2291_BEGIN */

  function matchingTableCatalog(availability) {
    var data = payload();

    var guests = Math.max(
      1,
      Number(data.guest_num || 1)
    );

    var selected =
      selectedTableIds();

    var availableIds =
      availability
      && Array.isArray(
        availability.availableTableIds
      )
        ? positiveIds(
            availability.availableTableIds
          )
        : [];

    var recommendedIds =
      availability
      && Array.isArray(
        availability.recommendedTableIds
      )
        ? positiveIds(
            availability.recommendedTableIds
          )
        : [];

    var availableCatalog =
      tableCatalog.filter(function (table) {
        var id =
          Number(table.table_id);

        return (
          selected.indexOf(id) >= 0
          || !availableIds.length
          || availableIds.indexOf(id) >= 0
        );
      });

    var matching =
      availableCatalog.filter(function (table) {
        var id =
          Number(table.table_id);

        var minCapacity =
          Math.max(
            0,
            Number(table.min_capacity || 0)
          );

        var maxCapacity =
          Math.max(
            minCapacity,
            Number(table.max_capacity || 0)
          );

        var isSelected =
          selected.indexOf(id) >= 0;

        var isRecommended =
          recommendedIds.indexOf(id) >= 0;

        var singleTableFit =
          guests >= minCapacity
          && guests <= maxCapacity;

        var recommendedMergeMember =
          recommendedIds.length > 1
          && isRecommended
          && Boolean(table.is_joinable);

        return (
          isSelected
          || isRecommended
          || singleTableFit
          || recommendedMergeMember
        );
      });

    if (!matching.length) {
      matching = availableCatalog
        .slice()
        .sort(function (left, right) {
          return (
            Number(left.max_capacity || 0)
            - Number(right.max_capacity || 0)
          );
        })
        .slice(0, 8);
    }

    matching.sort(function (left, right) {
      var leftId =
        Number(left.table_id);

      var rightId =
        Number(right.table_id);

      var leftRecommended =
        recommendedIds.indexOf(leftId) >= 0
          ? 0
          : 1;

      var rightRecommended =
        recommendedIds.indexOf(rightId) >= 0
          ? 0
          : 1;

      if (
        leftRecommended
        !== rightRecommended
      ) {
        return (
          leftRecommended
          - rightRecommended
        );
      }

      var leftWaste =
        Math.max(
          0,
          Number(left.max_capacity || 0)
          - guests
        );

      var rightWaste =
        Math.max(
          0,
          Number(right.max_capacity || 0)
          - guests
        );

      if (leftWaste !== rightWaste) {
        return leftWaste - rightWaste;
      }

      return leftId - rightId;
    });

    return matching;
  }

  /* PMD_MATCHING_TABLES_MULTI_CARD_V2291_END */

  function renderTablePicker(availability) {
    var picker = ensureTablePicker();

    if (!picker) return;

    var selected = selectedTableIds();

    var availableIds = availability
      && Array.isArray(availability.availableTableIds)
      ? positiveIds(availability.availableTableIds)
      : null;

    var visibleTables =
      matchingTableCatalog(availability);

    picker.options.innerHTML = '';
    picker.chips.innerHTML = '';

    visibleTables.forEach(function (table) {
      var id = Number(table.table_id);
      var isSelected = selected.indexOf(id) >= 0;
      var isAvailable = !availableIds
        || availableIds.indexOf(id) >= 0;

      var button = document.createElement('button');
      button.type = 'button';
      button.className =
        'pmd-reservation-composer-v1__table-option';

      button.dataset.tableId = String(id);
      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle(
        'is-unavailable',
        !isAvailable
      );

      button.disabled = !isAvailable && !isSelected;

      var main = document.createElement('span');
      main.className =
        'pmd-reservation-composer-v1__table-option-main';
      main.textContent =
        table.table_name || ('Table ' + id);

      var meta = document.createElement('small');
      meta.textContent =
        'Capacity '
        + table.min_capacity
        + '–'
        + table.max_capacity
        + (isAvailable ? ' · Available' : ' · Unavailable');

      button.appendChild(main);
      button.appendChild(meta);

      button.addEventListener('click', function () {
        var optionNode = Array.from(
          picker.select.options
        ).find(function (item) {
          return Number(item.value) === id;
        });

        if (!optionNode) return;

        optionNode.selected = !optionNode.selected;

        renderTablePicker(lastAvailability);
        scheduleAvailability();
      });

      picker.options.appendChild(button);
    });

    selected.forEach(function (id) {
      var table = tableCatalog.find(function (item) {
        return Number(item.table_id) === id;
      });

      if (!table) return;

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className =
        'pmd-reservation-composer-v1__table-chip';
      chip.textContent =
        (table.table_name || ('Table ' + id)) + ' ×';

      chip.addEventListener('click', function () {
        var optionNode = Array.from(
          picker.select.options
        ).find(function (item) {
          return Number(item.value) === id;
        });

        if (optionNode) optionNode.selected = false;

        renderTablePicker(lastAvailability);
        scheduleAvailability();
      });

      picker.chips.appendChild(chip);
    });

    var selectedNames = selected.map(function (id) {
      var table = tableCatalog.find(function (item) {
        return Number(item.table_id) === id;
      });
      return table ? (table.table_name || ('Table ' + id)) : ('Table ' + id);
    });

    picker.triggerText.textContent = selectedNames.length
      ? selectedNames.join(', ')
      : 'Choose matching table(s)';

    /* PMD_RESERVATIONSLAB_VISIBLE_CHOOSE_CONTEXT_V1_2
     * The enhanced V224/V225 UI hides the native picker trigger and uses
     * the assignment_mode=choose label as the visible control. Mirror the
     * canonical selected table names there so Floor context is visible.
     */
    var visibleChooseRadio = form.querySelector(
      '[name="assignment_mode"][value="choose"]'
    );
    var visibleChooseLabel = visibleChooseRadio
      ? visibleChooseRadio.closest('label')
      : null;
    var visibleChooseText = visibleChooseLabel
      ? visibleChooseLabel.querySelector('span')
      : null;

    if (visibleChooseText) {
      visibleChooseText.textContent = selectedNames.length
        ? selectedNames.join(', ')
        : 'Choose table(s)';
    }

    if (visibleChooseLabel) {
      visibleChooseLabel.setAttribute(
        'data-pmd-selected-table-names',
        selectedNames.join(', ')
      );
    }

    if (!visibleTables.length) {
      var emptyState =
        document.createElement('div');

      emptyState.className =
        'pmd-reservation-composer-v1__table-empty-v2291';

      emptyState.textContent =
        'No available table matches this reservation. Change the date, time, duration or guest count.';

      picker.options.appendChild(
        emptyState
      );
    }
  }

  function formatAvailability(result) {
    var data = payload();
    var mode = data.assignment_mode;
    var guests = Number(data.guest_num || 0);
    var date = clean(data.reserve_date);
    var time = clean(data.reserve_time);
    var duration = Number(data.duration || 0);

    if (!result.available) {
      return 'The selected table is occupied or does not match the guest capacity for this time. Choose another table, Auto assign, or Assign later.';
    }

    if (mode === 'later') {
      return 'No table will be assigned now.';
    }

    if (mode === 'auto') {
      var recommended = positiveIds(
        result.recommendedTableIds || []
      );

      if (recommended.length) {
        var names = recommended.map(function (id) {
          var table = tableCatalog.find(function (item) {
            return Number(item.table_id) === id;
          });

          return table
            ? table.table_name
            : ('Table ' + id);
        });

        return 'Available · Recommended: ' + names.join(', ');
      }

      return 'Available · A suitable table will be assigned automatically.';
    }

    return 'Available for '
      + guests
      + (guests === 1 ? ' guest' : ' guests')
      + ' · '
      + date
      + ' · '
      + time
      + ' · '
      + duration
      + ' min';
  }

  
function applyAvailability(result) {
    /* PMD_COMPOSER_FLOOR_CONTEXT_BLOCK_GUARD_V1_20260815
     * Floor selection is a create hint, not permission to double-book. If the
     * canonical backend says any table from that floor context is blocked by an
     * overlapping reservation, remove the entire floor hint and return to AUTO.
     * A merged floor card is kept atomic: one blocked member clears the group.
     */
    if (
      context
      && context.mode === 'create'
      && Array.isArray(context.tableIds)
      && context.tableIds.length
      && result
      && Array.isArray(result.blockedTableIds)
    ) {
      var floorIds = positiveIds(context.tableIds);
      var blockedIds = positiveIds(result.blockedTableIds);
      var floorBlocked = floorIds.some(function (id) {
        return blockedIds.indexOf(id) >= 0;
      });

      if (floorBlocked) {
        var tableSelect = form.querySelector('[name="tables[]"]');
        if (tableSelect) {
          Array.from(tableSelect.options).forEach(function (optionNode) {
            if (floorIds.indexOf(Number(optionNode.value)) >= 0) {
              optionNode.selected = false;
            }
          });
        }

        var autoRadio = form.querySelector('[name="assignment_mode"][value="auto"]');
        if (autoRadio) autoRadio.checked = true;
        context.tableIds = [];
        context.tableNames = [];
        syncAssignment();

        result = Object.assign({}, result, {
          assignmentMode: 'auto',
          requestedTableIds: [],
          available: positiveIds(result.recommendedTableIds || []).length > 0
        });
      }
    }

    lastAvailability = result;

    /* PMD_MANUAL_TABLE_SINGLE_STATE_BRIDGE_V1_20260815
     * One canonical state assignment and ONE availability event. V3 owns
     * manual dropdown DOM; later availability logic may update AUTO only. */
    window.PMDManualTableAvailabilityV2 =
        result && typeof result === 'object'
            ? {
                available: Boolean(result.available),
                assignmentMode: result.assignmentMode || null,
                requestedTableIds: Array.isArray(result.requestedTableIds) ? result.requestedTableIds.slice() : [],
                availableTableIds: Array.isArray(result.availableTableIds) ? result.availableTableIds.slice() : [],
                manualAvailableTableIds: Array.isArray(result.manualAvailableTableIds) ? result.manualAvailableTableIds.slice() : [],
                manualAvailabilityWindowMinutes: Number(result.manualAvailabilityWindowMinutes || 0),
                recommendedTableIds: Array.isArray(result.recommendedTableIds) ? result.recommendedTableIds.slice() : [],
                blockedTableIds: Array.isArray(result.blockedTableIds) ? result.blockedTableIds.slice() : []
            }
            : null;

    document.dispatchEvent(
        new CustomEvent('pmd:manual-table-availability-v2', {
            detail: window.PMDManualTableAvailabilityV2
        })
    );
    renderTablePicker(result);

    var status = root.querySelector(
      '[data-pmd-composer-availability]'
    );

    status.textContent = formatAvailability(result);
    status.classList.toggle('is-error', !result.available);
    status.classList.toggle('is-success', !!result.available);
    renderPolicyNotice(result);

    // PMD_SMART_CONTEXT_TABLES_V224
    root.dispatchEvent(
      new CustomEvent(
        'pmd:composer:availability',
        {
          detail: {
            availability: result,
            tables: tableCatalog.slice(),
            selectedTableIds: selectedTableIds()
          }
        }
      )
    );
  }
  // PMD_COMPOSER_SMART_V192
  function applySmartComposerFields() {
    var firstName = form.elements.first_name;
    var lastName = form.elements.last_name;
    var telephone = form.elements.telephone;
    var email = form.elements.email;
    var reserveTime = form.elements.reserve_time;
    var duration = form.elements.duration;

    function fieldLabel(field) {
      return field
        ? field.closest('label')
        : null;
    }

    function labelTitle(label) {
      return label
        ? label.querySelector(':scope > span')
        : null;
    }

    function replaceLabelText(span, text) {
      if (!span) {
        return;
      }

      Array.prototype.slice.call(
        span.childNodes
      ).forEach(function (node) {
        if (node.nodeType === 3) {
          node.remove();
        }
      });

      span.appendChild(
        document.createTextNode(text)
      );
    }

    if (firstName) {
      firstName.autocomplete = 'name';
      firstName.placeholder = '';

      var firstLabel = fieldLabel(firstName);
      var firstTitle = labelTitle(firstLabel);

      replaceLabelText(firstTitle, 'Name');

      if (firstLabel) {
        firstLabel.classList.add(
          'pmd-reservation-composer-v1__single-name'
        );
      }
    }

    if (lastName) {
      var lastLabel = fieldLabel(lastName);

      lastName.value = '';
      lastName.type = 'hidden';

      if (lastLabel) {
        lastLabel.hidden = true;
        lastLabel.setAttribute(
          'aria-hidden',
          'true'
        );
      }
    }

    [
      [telephone, 'Telefon (optional)'],
      [email, 'E-Mail (optional)']
    ].forEach(function (entry) {
      replaceLabelText(
        labelTitle(fieldLabel(entry[0])),
        entry[1]
      );
    });

    if (reserveTime) {
      reserveTime.step = '900';
      reserveTime.autocomplete = 'off';
    }

    if (
      duration
      && duration.tagName !== 'SELECT'
    ) {
      var select = document.createElement('select');

      select.name = 'duration';
      select.id = duration.id || '';
      select.className = duration.className || '';

      [
        [30, '30 min'],
        [45, '45 min'],
        [60, '60 min'],
        [75, '75 min'],
        [90, '90 min'],
        [120, '120 min'],
        [150, '150 min'],
        [180, '180 min']
      ].forEach(function (entry) {
        var optionNode =
          document.createElement('option');

        optionNode.value = String(entry[0]);
        optionNode.textContent = entry[1];

        select.appendChild(optionNode);
      });

      select.value = String(
        Number(duration.value || 45)
      );

      if (!select.value) {
        select.value = '45';
      }

      duration.replaceWith(select);
    }

    var saveButton = root.querySelector(
      'button[type="submit"]'
    );

    if (saveButton) {
      var svgs = saveButton.querySelectorAll('svg');

      Array.prototype.slice.call(
        svgs,
        1
      ).forEach(function (svg) {
        svg.remove();
      });
    }
  }

  function configureFeaturePreferences(data) {
    var container = root.querySelector('[data-pmd-composer-feature-preferences]');
    var options = Array.isArray(data && data.pmdTableFeatureOptions)
      ? data.pmdTableFeatureOptions
      : [];
    var available = {};
    options.forEach(function (item) {
      var key = clean(item && item.key);
      if (key) available[key] = Number(item.count || 0);
    });

    root.querySelectorAll('[data-pmd-composer-feature-option]').forEach(function (label) {
      var key = clean(label.getAttribute('data-pmd-composer-feature-option'));
      var input = label.querySelector('input[name="pmd_table_features[]"]');
      var exists = Boolean(key && available[key] > 0);
      label.hidden = !exists;
      if (input) {
        input.checked = false;
        input.disabled = !exists;
      }
    });

    if (container) {
      container.hidden = !Object.keys(available).some(function (key) {
        return available[key] > 0;
      });
    }
  }

  function selectedFeatureKeys() {
    return Array.prototype.slice.call(
      form.querySelectorAll('input[name="pmd_table_features[]"]:checked')
    ).map(function (input) {
      return clean(input.value);
    }).filter(Boolean);
  }

  function renderPolicyNotice(result) {
    var notice = root.querySelector('[data-pmd-composer-policy-notice]');
    var message = notice && notice.querySelector('[data-pmd-composer-policy-message]');
    var action = notice && notice.querySelector('[data-pmd-composer-use-suggestion]');
    if (!notice || !message || !action) return;

    var text = clean(result && result.pmdPolicyMessage);
    var modeNode = form.querySelector('[name="assignment_mode"]:checked');
    var mode = modeNode ? clean(modeNode.value) : 'auto';
    var suggested = positiveIds(result && result.pmdSelectedTableSuggestionIds || []);
    var selected = selectedTableIds();
    var same = suggested.length === selected.length && suggested.every(function (id) {
      return selected.indexOf(id) >= 0;
    });

    message.textContent = text;
    notice.hidden = !text;
    action.hidden = !(mode === 'choose' && suggested.length && !same);
    action.dataset.pmdSuggestionIds = suggested.join(',');
    notice.classList.toggle('is-warning', Boolean(text && result && result.available === false));
    notice.classList.toggle('is-success', Boolean(text && result && result.available === true));
  }

  function applyPolicySuggestion() {
    var action = root.querySelector('[data-pmd-composer-use-suggestion]');
    var ids = positiveIds(
      clean(action && action.dataset.pmdSuggestionIds).split(',')
    );
    var select = form.querySelector('[name="tables[]"]');
    if (!ids.length || !select) return;

    Array.prototype.forEach.call(select.options, function (optionNode) {
      optionNode.selected = ids.indexOf(Number(optionNode.value)) >= 0;
    });
    var choose = form.querySelector('[name="assignment_mode"][value="choose"]');
    if (choose) choose.checked = true;
    if (context) {
      context.tableIds = ids.slice();
      context.tableNames = ids.map(function (id) {
        var row = tableCatalog.find(function (table) { return Number(table.table_id) === id; });
        return row ? clean(row.table_name) : ('Table ' + id);
      });
    }
    syncAssignment();
    renderTablePicker(lastAvailability);
    scheduleAvailability(true);
  }

  function populate(data) {
    applySmartComposerFields();

    var values = data.reservation || data.defaults;
    ['first_name','last_name','telephone','email','guest_num','reserve_date','reserve_time','duration','comment'].forEach(function (name) {
      var field = form.elements[name]; if (field) field.value = values[name] == null ? '' : (name === 'reserve_time' ? (timeValue(values[name]) || '') : values[name]);
    });
    /* PMD_COMPOSER_EXPLICIT_HOUR_CONTEXT_V1_4_20260815
     * The clicked Hour row is stronger than backend defaults/soft draft.
     * Apply its exact date/time before opening-hours coercion so the Jade wheel
     * starts on the same slot the user clicked. */
    if (!data.reservation && context && context.mode === 'create') {
      if (dateValue(context.selectedDate) && form.elements.reserve_date) {
        form.elements.reserve_date.value = dateValue(context.selectedDate);
      }
      if (timeValue(context.selectedTime) && form.elements.reserve_time) {
        form.elements.reserve_time.value = timeValue(context.selectedTime);
      }
      /* PMD_COMPOSER_EXPLICIT_HOUR_DURATION_CONTEXT_V1_20260815
       * Hour-slot context may lower the duration only when the normal 45-minute
       * default cannot fit before closing. This preserves the exact clicked
       * time instead of snapping the wheel backward to make 45 minutes fit.
       */
      if (
        Number(context.duration || 0) > 0
        && form.elements.duration
      ) {
        var explicitDuration = String(
          Math.round(Number(context.duration))
        );
        var durationField = form.elements.duration;
        var durationAllowed = durationField.tagName === 'SELECT'
          ? Array.prototype.some.call(
              durationField.options,
              function (option) {
                return String(option.value) === explicitDuration;
              }
            )
          : true;

        if (durationAllowed) {
          durationField.value = explicitDuration;
        }
      }
    }
    form.elements.reservation_id.value = context.reservationId || '';
    form.elements.source.value = context.source;
    var contextTableIds = context && context.mode === 'create'
      ? positiveIds(context.tableIds || [])
      : [];
    /* PMD_COMPOSER_FRESH_TABLE_CONTEXT_V1_3_20260815
     * A new Composer open never inherits table assignment from defaults or a
     * previous unsaved draft. Only the CURRENT explicit create context may
     * preselect a table; otherwise AUTO starts clean. */
    var selectedTables = positiveIds(
      data.reservation
        ? (data.reservation.tables || []).map(function (table) { return table.table_id; })
        : contextTableIds
    );
    var pmdTableMeta = data && data.pmdTableMeta && typeof data.pmdTableMeta === 'object'
      ? data.pmdTableMeta
      : {};
    tableCatalog = (Array.isArray(data.tables) ? data.tables : []).map(function (table) {
      var id = Number(table && table.table_id || 0);
      var meta = pmdTableMeta[id] || pmdTableMeta[String(id)] || {};
      return Object.assign({}, table || {}, meta || {});
    });
    configureFeaturePreferences(data);
    renderPolicyNotice(null);

    var tableSelect = form.querySelector('[name="tables[]"]');
    tableSelect.innerHTML = '';

    tableCatalog.forEach(function (table) {
      option(
        tableSelect,
        table.table_id,
        table.table_name
          + (table.floor_name ? (' · ' + table.floor_name) : '')
          + ' ('
          + table.min_capacity
          + '–'
          + table.max_capacity
          + ')',
        selectedTables.indexOf(Number(table.table_id)) >= 0
      );
    });

    lastAvailability = null;
    ensureTablePicker();
    renderTablePicker(null);
    /* PMD_COMPOSER_CREATE_CONTEXT_ASSIGNMENT_V1_1_20260815 */
    var assignment = data.reservation
      ? (selectedTables.length ? 'choose' : 'later')
      : (contextTableIds.length ? 'choose' : 'auto');
    var radio = form.querySelector('[name=assignment_mode][value="'+assignment+'"]'); if (radio) radio.checked = true;
    var occasion = form.elements.occasion_id;
    if (occasion) {
      occasion.value = '0';
    }

    var location = form.elements.location_id;
    if (location) {
      location.value = String(
        values.location_id
        || data.locationId
        || data.location_id
        || context.locationId
        || ''
      );
    }

    var floorIdField = form.elements.pmd_floor_id;
    var floorNameField = form.elements.pmd_floor_name;
    var floorLockedField = form.elements.pmd_floor_locked;
    if (floorIdField) floorIdField.value = clean(context && context.floorId);
    if (floorNameField) floorNameField.value = clean(context && context.floorName);
    if (floorLockedField) floorLockedField.value = context && context.floorLocked ? '1' : '0';

    var notify = form.elements.notify;
    if (notify) {
      notify.value = '0';
      notify.checked = false;
    }

    // PMD_RESERVATION_TABLE_PREFERENCE_HYDRATION_V1
    // Reservation preference is saved intent. Hydrate it directly from the
    // canonical reservation payload; never infer it from assigned tables.
    var persistedTableFeatures = Array.isArray(values && values.pmd_table_features)
      ? values.pmd_table_features
      : [];
    var persistedTableFeatureSet = {};

    persistedTableFeatures.forEach(function (featureKey) {
      featureKey = clean(featureKey);
      if (
        featureKey === 'near_window'
        || featureKey === 'quiet_area'
        || featureKey === 'accessible'
      ) {
        persistedTableFeatureSet[featureKey] = true;
      }
    });

    Array.prototype.forEach.call(
      form.querySelectorAll('input[name="pmd_table_features[]"]'),
      function (featureInput) {
        featureInput.checked = !!persistedTableFeatureSet[
          clean(featureInput.value)
        ];
      }
    );

    syncAssignment();

    if (
      form.elements.duration
      && !Number(form.elements.duration.value)
    ) {
      form.elements.duration.value = '45';
    }

    if (
      window.PMDReservationComposerFutureOnlyV1
      && typeof window.PMDReservationComposerFutureOnlyV1.setOpeningHours === 'function'
    ) {
      window.PMDReservationComposerFutureOnlyV1.setOpeningHours(
        Array.isArray(data.pmdOpeningHours) ? data.pmdOpeningHours : []
      );
    }

    if (
      window.PMDReservationComposerFutureOnlyV1
      && typeof window.PMDReservationComposerFutureOnlyV1.apply === 'function'
    ) {
      window.PMDReservationComposerFutureOnlyV1.apply(true);
    }

    // PMD_COMPOSER_REVEAL_AND_BLUR_V18
    // Load succeeded: replace the Loading state with the populated form.
    var loadingState = root.querySelector(
      '[data-pmd-composer-loading]'
    );

    var contentState = root.querySelector(
      '[data-pmd-composer-content]'
    );

    if (loadingState) {
      loadingState.hidden = true;
      loadingState.setAttribute('aria-hidden', 'true');
    }

    if (contentState) {
      contentState.hidden = false;
      contentState.removeAttribute('aria-hidden');
    }

    baseline = snapshot();

    window.requestAnimationFrame(function () {
      if (form.elements.first_name) {
        if (form.elements.first_name) {
        form.elements.first_name.focus();
      }
      }

      scheduleAvailability();
    });
  }
  function payload() {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key === 'tables[]') {
        data.tables = data.tables || [];
        data.tables.push(Number(value));
      } else if (key === 'pmd_table_features[]') {
        data.pmd_table_features = data.pmd_table_features || [];
        data.pmd_table_features.push(clean(value));
      } else {
        data[key] = value;
      }
    });
    // PMD_COMPOSER_SMART_V192
    data.tables = positiveIds(data.tables || []);

    var notifyField = form.elements.notify;

    data.notify = notifyField
      ? (
          notifyField.type === 'checkbox'
            ? (notifyField.checked ? 1 : 0)
            : Number(notifyField.value || 0)
        )
      : 0;

    data.first_name = String(
      data.first_name || ''
    )
      .replace(/\s+/g, ' ')
      .trim();

    /*
     * The Composer presents one Name field.
     * Keep last_name empty while preserving the native schema.
     */
    data.last_name = '';

    if (form.elements.last_name) {
      form.elements.last_name.value = '';
    }

    data.telephone = String(
      data.telephone || ''
    ).trim();

    data.email = String(
      data.email || ''
    ).trim();

    data.guest_num = Math.max(
      1,
      Number(data.guest_num || 1)
    );

    data.duration = Math.max(
      1,
      Number(data.duration || 45)
    );

    ['occasion_id','location_id','reservation_id'].forEach(
      function (key) {
        if (
          data[key] !== ''
          && data[key] !== null
          && data[key] !== undefined
        ) {
          data[key] = Number(data[key]);
        } else {
          delete data[key];
        }
      }
    );

    return data;
  }
  function syncAssignment() {
    var mode = form.querySelector(
      '[name=assignment_mode]:checked'
    );

    var wrapper = root.querySelector(
      '.pmd-reservation-composer-v1__tables'
    );

    wrapper.hidden = !mode || mode.value !== 'choose';

    if (
      wrapper.hidden
      && tablePicker
      && !tablePicker.panel.hidden
    ) {
      tablePicker.panel.hidden = true;
      tablePicker.trigger.setAttribute(
        'aria-expanded',
        'false'
      );
    }
  }
  function pmdAvailabilitySignatureV3(data) {
    return JSON.stringify({
      reserve_date: clean(data.reserve_date),
      reserve_time: timeValue(data.reserve_time) || '',
      duration: Number(data.duration || 0),
      guest_num: Number(data.guest_num || 0),
      assignment_mode: clean(data.assignment_mode),
      tables: positiveIds(data.tables || [])
        .sort(function (a, b) {
          return a - b;
        }),
      table_features: (Array.isArray(data.pmd_table_features) ? data.pmd_table_features.slice() : [])
        .map(clean)
        .filter(Boolean)
        .sort(),
      floor_id: clean(data.pmd_floor_id),
      floor_locked: Number(data.pmd_floor_locked || 0) ? 1 : 0,
      location_id: Number(data.location_id || 0),
      reservation_id: Number(data.reservation_id || 0)
    });
  }

  /*
   * PMD_MANUAL_TABLE_FORCE_AVAILABILITY_CORE_V4_20260807
   *
   * Optional force=true is reserved for an explicit
   * "Choose table(s)" user action.
   *
   * Ordinary field/focus behaviour keeps the existing
   * signature protection.
   */
  function scheduleAvailability(force) {
    syncAssignment();
    window.clearTimeout(checkingTimer);

    availabilityGeneration += 1;
    var generation = availabilityGeneration;

    var status = root.querySelector(
      '[data-pmd-composer-availability]'
    );

    var data = payload();

    if (
      window.PMDReservationComposerFutureOnlyV1
      && typeof window.PMDReservationComposerFutureOnlyV1.validate === 'function'
      && !window.PMDReservationComposerFutureOnlyV1.validate(false)
    ) {
      lastAvailability = null;
      renderTablePicker(null);
      status.textContent = window.PMDReservationComposerFutureOnlyV1.message();
      status.classList.add('is-error');
      status.classList.remove('is-success');
      return;
    }

    var pmdAvailabilitySignature =
      pmdAvailabilitySignatureV3(data);

    /*
     * Clicking/focusing a field without changing the effective
     * reservation must leave the existing recommendation alone.
     */
    if (
      force !== true
      && lastAvailability
      && pmdAvailabilitySignature
        === pmdLastAvailabilitySignatureV3
    ) {
      return;
    }


    if (
      !dateValue(data.reserve_date)
      || !timeValue(data.reserve_time)
      || Number(data.duration || 0) < 1
      || Number(data.guest_num || 0) < 1
    ) {
      lastAvailability = null;
      renderTablePicker(null);
      status.textContent =
        'Choose date, time, duration and number of guests.';
      status.classList.remove('is-error', 'is-success');
      return;
    }

    var availabilityDelay = force === true ? 0 : 300;

    checkingTimer = window.setTimeout(function () {
      status.textContent = 'Checking availability…';
      status.classList.remove('is-error', 'is-success');

      request(
        'onCheckReservationAvailability',
        payload()
      ).then(function (response) {
        if (generation !== availabilityGeneration) {
          return;
        }

        pmdLastAvailabilitySignatureV3 =
          pmdAvailabilitySignature;

        applyAvailability(response.availability);
      }).catch(function (error) {
        if (generation !== availabilityGeneration) {
          return;
        }

        lastAvailability = null;
        renderTablePicker(null);
        status.textContent = error.message;
        status.classList.add('is-error');
        status.classList.remove('is-success');
      });
    }, availabilityDelay);
  }

  /*
   * PMD_MANUAL_TABLE_FIRST_CLICK_FORCE_V4_20260807
   *
   * Explicit manual-table discovery authority.
   *
   * This deliberately calls the SAME canonical availability
   * engine used by guest/date/time/duration changes.
   *
   * Backend:
   *   unchanged
   *
   * Availability endpoint:
   *   unchanged
   *
   * Auto recommendation algorithm:
   *   unchanged
   *
   * Save:
   *   unchanged
   */
  root.addEventListener(
    'pmd:manual-table-force-availability-v4',
    function () {
      scheduleAvailability(true);
    }
  );

  function open(nextContext, origin) {
    context = nextContext; trigger = origin; baseline = ''; clearErrors();
    root.querySelector('[data-pmd-composer-loading]').hidden = false; root.querySelector('[data-pmd-composer-content]').hidden = true;
    ensureModal().show(); document.body.classList.add('pmd-reservation-composer-open-v1');
    window.requestAnimationFrame(tagBackdrop);
    return request('onLoadReservationComposer', {
      mode: context.mode,
      reservation_id: context.reservationId,
      source: context.source,
      selected_date: context.selectedDate,
      selected_time: context.selectedTime,
      table_ids: context.tableIds,
      location_id: context.locationId,
      pmd_floor_id: clean(context.floorId),
      pmd_floor_name: clean(context.floorName),
      pmd_floor_locked: context.floorLocked ? 1 : 0
    }).then(populate).catch(function (error) {
      var loadingState = root.querySelector(
        '[data-pmd-composer-loading]'
      );

      var contentState = root.querySelector(
        '[data-pmd-composer-content]'
      );

      if (loadingState) {
        loadingState.hidden = true;
      }

      if (contentState) {
        contentState.hidden = false;
      }

      showError(error);
      throw error;
    });
  }
  function refreshWorkspace(reservation, assignmentMode) {
    var boot = window.PMD_RESERVATIONS2_BOOT || (window.PMD_RESERVATIONS2_BOOT = {});
    var items = Array.isArray(boot.reservations) ? boot.reservations : (boot.reservations = []);
    for (var index = items.length - 1; index >= 0; index -= 1) if (Number(items[index].reservation_id || items[index].id) === Number(reservation.reservation_id)) items.splice(index, 1);
    items.unshift(reservation);
    if (window.PMDReservations2KpisV309) window.PMDReservations2KpisV309.refresh();
    var cards = window.PMDReservations2FloorExperience || window.PMDReservations2CardsV320;
    if (!cards || !(cards.renderReservations || cards.refresh)) {
      return Promise.reject(new Error('Reservation card refresh is unavailable.'));
    }
    (cards.renderReservations || cards.refresh).call(cards);
    return new Promise(function (resolve) { window.requestAnimationFrame(resolve); }).then(function () {
      if (window.PMDCalendarRealCountsFloatingV1) window.PMDCalendarRealCountsFloatingV1.refresh();
      if (window.PMDCalendarCountsToolbarV111) window.PMDCalendarCountsToolbarV111.refresh();
      if (window.PMDCalendarNativeCountV14) window.PMDCalendarNativeCountV14.refresh();
      if (context.returnView === 'calendar' && window.PMDReservations2CalendarToggleV1) window.PMDReservations2CalendarToggleV1.render();
      if (context.returnView === 'hour') {
        if (window.PMDRealHourTimelineV1) window.PMDRealHourTimelineV1.render();
        if (window.PMDHourEntryAuthorityV11) window.PMDHourEntryAuthorityV11.run();
      }
      if (window.PMDReservations2FloorV312) window.PMDReservations2FloorV312.refresh();
      if (window.PMDReservations2FinalFloorUIV466) window.PMDReservations2FinalFloorUIV466.refresh();
      if (window.PMDReservations2KpiTableColorsV467) window.PMDReservations2KpiTableColorsV467.refresh();
      window.dispatchEvent(new CustomEvent('pmd:reservation-saved', {detail:{version:1,mode:context.mode,source:context.source,reservationId:reservation.reservation_id,reservation:reservation,assignmentMode:assignmentMode,selectedDate:context.selectedDate,tableIds:(reservation.tables || []).map(function (table) { return table.table_id; }),returnView:context.returnView,refreshSucceeded:true}}));
    });
  }
  function controlledReload() {
    try { sessionStorage.setItem('pmd.reservationComposer.restore.v1', JSON.stringify({view:context.returnView,date:context.selectedDate})); } catch (ignore) {}
    window.location.reload();
  }
  function submit(event) {
    event.preventDefault();
    if (saving) return;
    clearErrors();
    if (
      window.PMDReservationComposerFutureOnlyV1
      && typeof window.PMDReservationComposerFutureOnlyV1.validate === 'function'
      && !window.PMDReservationComposerFutureOnlyV1.validate(true)
    ) {
      return;
    }
    saving = true;
    var save = root.querySelector('[data-pmd-composer-save]'); save.disabled = true;
    var scroll = {x:window.scrollX,y:window.scrollY}; var data = payload();
    request('onSaveReservationComposer', data).then(function (response) {
      if (
        window.PMDReservationComposerSoftDraftV2426 &&
        typeof window.PMDReservationComposerSoftDraftV2426.clear ===
          'function'
      ) {
        window.PMDReservationComposerSoftDraftV2426.clear();
      }

      return refreshWorkspace(
        response.reservation,
        data.assignment_mode
      ).then(function () {
        window.scrollTo(scroll.x, scroll.y);
        baseline = snapshot();
        close(true);
      }).catch(controlledReload);
    }).catch(showError).finally(function () { saving = false; save.disabled = false; });
  }
  function clickOwner(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var element = event.target.closest(selectors); var page = document.getElementById('pmd-reservations2');
    if (!element || !page || !page.contains(element)) return;
    var next; try { next = normalize(element); } catch (error) { return; }
    if (!next || !window.PMDReservationComposerV1 || typeof window.PMDReservationComposerV1.open !== 'function') return;
    event.preventDefault(); event.stopImmediatePropagation();
    try { window.PMDReservationComposerV1.open(next, element).catch(function () { if (!root.classList.contains('show')) location.href = next.fallbackUrl; }); }
    catch (error) { location.href = next.fallbackUrl; }
  }

  form.insertAdjacentHTML('afterbegin', '<input type="hidden" name="reservation_id"><input type="hidden" name="source">');
  form.addEventListener('submit', submit);

  form.addEventListener('change', function (event) {
    if (event.target.name === 'location_id') {
      context.locationId = Number(event.target.value);
      context.tableIds = [];
      open(context, trigger);
      return;
    }

    /*
     * PMD_COMPOSER_STABLE_NO_BLINK_V3_20260807
     *
     * Availability is unrelated to:
     * Name / telephone / email / comment.
     */
    if (
      [
        'guest_num',
        'reserve_date',
        'reserve_time',
        'duration',
        'assignment_mode',
        'tables[]',
        'pmd_table_features[]'
      ].indexOf(event.target.name) >= 0
    ) {
      scheduleAvailability();
    }
  });

  form.addEventListener('input', function (event) {
    if (
      [
        'guest_num',
        'reserve_date',
        'reserve_time',
        'duration'
      ].indexOf(event.target.name) >= 0
    ) {
      scheduleAvailability();
    }
  });
  var policySuggestionButton = root.querySelector('[data-pmd-composer-use-suggestion]');
  if (policySuggestionButton) policySuggestionButton.addEventListener('click', applyPolicySuggestion);
  root.querySelectorAll('[data-pmd-composer-close],[data-pmd-composer-cancel]').forEach(function (button) { button.addEventListener('click', function () { close(false); }); });
  root.addEventListener('hide.bs.modal', function (event) { if (!allowHide) { event.preventDefault(); close(false); } });
  root.addEventListener('hidden.bs.modal', function () { allowHide = false; closing = false; root.classList.remove('pmd-reservation-composer-v1--closing'); document.body.classList.remove('pmd-reservation-composer-open-v1'); if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open'); if (trigger && trigger.isConnected) trigger.focus(); });
  root.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); close(false); } });
  document.addEventListener('click', clickOwner, true);

  window.PMDReservationComposerV1 = {version:'1.0.0', open:open, normalizeContext:normalize, getFloorSelection:floorSelection, close:close};
}());

/* ============================================================
   PMD_RESERVATION_COMPOSER_FUTURE_ONLY_V1
   Canonical Reservations2 + ReservationsLab create policy.
   SAME OWNER, extended to the shared PMD Settings working_hours authority.
   - Europe/Berlin booking clock
   - no past bookings
   - create time + duration must fit restaurant opening hours
   - historical EDIT remains possible
   - event-driven only; no timer/observer/polling authority
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDReservationComposerFutureOnlyV1) return;

  var root = document.getElementById('pmd-reservation-composer-v1');
  var form = root && root.querySelector('form');
  if (!root || !form) return;

  var formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  });
  var wheelRef = null;
  var openingHours = [];

  function pad(value) { return String(value).padStart(2, '0'); }
  function parts() {
    var map = {};
    formatter.formatToParts(new Date()).forEach(function (part) {
      if (part.type !== 'literal') map[part.type] = part.value;
    });
    return {
      year:Number(map.year||0), month:Number(map.month||0), day:Number(map.day||0),
      hour:Number(map.hour||0), minute:Number(map.minute||0), second:Number(map.second||0)
    };
  }
  function dateKey(value) { return String(value.year) + '-' + pad(value.month) + '-' + pad(value.day); }
  function nextDate(key) {
    var p = String(key || '').split('-').map(Number);
    var d = new Date(Date.UTC(p[0], (p[1]||1)-1, p[2]||1, 12, 0, 0, 0));
    d.setUTCDate(d.getUTCDate()+1);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth()+1) + '-' + pad(d.getUTCDate());
  }
  function minimum() {
    var now = parts();
    var day = dateKey(now);
    var raw = now.hour * 60 + now.minute + (now.second > 0 ? 1 : 0);
    var rounded = Math.ceil(raw / 15) * 15;
    if (rounded >= 1440) return {date:nextDate(day),time:'00:00',minutes:0};
    return {date:day,time:pad(Math.floor(rounded/60))+':'+pad(rounded%60),minutes:rounded};
  }
  function isCreate() { return Number((form.elements.reservation_id && form.elements.reservation_id.value) || 0) < 1; }
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
  function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '').slice(0,5)); }
  function timeMinutes(value) {
    var match = String(value || '').slice(0,5).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function weekdayForDate(key) {
    var p = String(key || '').split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
    return (new Date(Date.UTC(p[0], p[1]-1, p[2])).getUTCDay() + 6) % 7;
  }
  function normalizeHours(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (row) {
      return {
        weekday:Number(row && row.weekday),
        enabled:Boolean(row && row.enabled),
        opening_time:String((row && row.opening_time)||'').slice(0,5),
        closing_time:String((row && row.closing_time)||'').slice(0,5)
      };
    }).filter(function (row) { return row.weekday >= 0 && row.weekday <= 6; });
  }
  function scheduleOpeningHoursFallback() {
    try {
      var api = window.PMDReservationsLabScheduleV1;
      if (api && typeof api.getOpeningHours === 'function') {
        return api.getOpeningHours();
      }
      if (api && typeof api.audit === 'function') {
        var state = api.audit();
        return state && Array.isArray(state.openingHours) ? state.openingHours : [];
      }
    } catch (ignore) {}
    return [];
  }
  function setOpeningHours(rows) {
    var normalized = normalizeHours(rows);
    /* PMD_COMPOSER_WORKING_HOURS_SINGLE_CONTEXT_V1_4_1_20260815
     * ReservationsLab already bootstraps the SAME working_hours rows for its
     * Hour screen. If the Composer load response omits that optional copy,
     * reuse the schedule runtime's exact rows rather than behaving as 24/7. */
    if (!normalized.length) normalized = normalizeHours(scheduleOpeningHoursFallback());
    openingHours = normalized;
    apply(true);
  }
  function hoursConfigured() { return openingHours.length > 0; }
  function hourRow(weekday) {
    for (var index = openingHours.length - 1; index >= 0; index -= 1) {
      if (openingHours[index].weekday === weekday) return openingHours[index];
    }
    return null;
  }
  function durationMinutes() {
    return Math.max(1, Number((form.elements.duration && form.elements.duration.value) || 45));
  }
  function openingAllows(date, time, duration) {
    if (!hoursConfigured()) return true;
    var weekday = weekdayForDate(date);
    var start = timeMinutes(time);
    if (weekday === null || start === null) return false;
    var end = start + Math.max(1, Number(duration || 45));
    var current = hourRow(weekday);
    var previous = hourRow((weekday + 6) % 7);

    if (previous && previous.enabled) {
      var po = timeMinutes(previous.opening_time);
      var pc = timeMinutes(previous.closing_time);
      if (po !== null && pc !== null && pc < po && start < pc && end <= pc) return true;
    }

    if (!current || !current.enabled) return false;
    var open = timeMinutes(current.opening_time);
    var close = timeMinutes(current.closing_time);
    if (open === null || close === null) return false;
    if (open === close) return true; // explicitly enabled 24-hour day
    if (close <= open) close += 1440; // overnight
    return start >= open && end <= close;
  }
  function dateHasOpeningWindow(date) {
    if (!hoursConfigured()) return true;
    if (!validDate(date)) return false;
    for (var minute = 0; minute < 1440; minute += 15) {
      var clock = pad(Math.floor(minute / 60)) + ':' + pad(minute % 60);
      if (openingAllows(date, clock, 1)) return true;
    }
    return false;
  }
  function futureAllows(date, time) {
    var min = minimum();
    return date > min.date || (date === min.date && time >= min.time);
  }
  function allowed(date, time, duration) {
    if (!isCreate()) return true;
    var day = String(date || '');
    var clock = String(time || '').slice(0,5);
    if (!validDate(day) || !validTime(clock)) return true;
    return futureAllows(day, clock) && openingAllows(day, clock, duration == null ? durationMinutes() : duration);
  }
  function reason(date, time, duration) {
    if (!isCreate()) return '';
    var day = String(date || '');
    var clock = String(time || '').slice(0,5);
    if (validDate(day) && validTime(clock) && !futureAllows(day, clock)) return 'past';
    if (validDate(day) && validTime(clock) && hoursConfigured() && !openingAllows(day, clock, duration == null ? durationMinutes() : duration)) {
      var weekday = weekdayForDate(day);
      var current = weekday === null ? null : hourRow(weekday);
      var previous = weekday === null ? null : hourRow((weekday + 6) % 7);
      var previousOvernight = previous && previous.enabled && timeMinutes(previous.closing_time) < timeMinutes(previous.opening_time);
      if ((!current || !current.enabled) && !previousOvernight) return 'closed';
      return 'hours';
    }
    return '';
  }
  function message() {
    var lang = String(document.documentElement.lang || '').toLowerCase();
    var date = form.elements.reserve_date ? form.elements.reserve_date.value : '';
    var time = form.elements.reserve_time ? form.elements.reserve_time.value : '';
    if (validDate(date) && hoursConfigured() && !dateHasOpeningWindow(date)) {
      return lang.indexOf('de') === 0
        ? 'Das Restaurant ist an diesem Tag geschlossen.'
        : 'The restaurant is closed on the selected date.';
    }
    var why = reason(date, time, durationMinutes());
    if (why === 'closed') {
      return lang.indexOf('de') === 0
        ? 'Das Restaurant ist an diesem Tag geschlossen.'
        : 'The restaurant is closed on the selected date.';
    }
    if (why === 'hours') {
      return lang.indexOf('de') === 0
        ? 'Die Reservierungszeit liegt außerhalb der Öffnungszeiten.'
        : 'The reservation time is outside restaurant opening hours.';
    }
    return lang.indexOf('de') === 0
      ? 'Reservierungen können nicht in der Vergangenheit erstellt werden.'
      : 'Reservations cannot be created in the past.';
  }
  function errorNode() { return root.querySelector('[data-error-for="reserve_time"]'); }
  function clearPolicyError() {
    var node = errorNode();
    if (node && node.getAttribute('data-pmd-future-policy-error') === '1') {
      node.textContent = '';
      node.removeAttribute('data-pmd-future-policy-error');
    }
    var field = form.elements.reserve_time;
    if (field && field.getAttribute('data-pmd-future-policy-invalid') === '1') {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('data-pmd-future-policy-invalid');
    }
  }
  function showPolicyError() {
    var node = errorNode();
    var field = form.elements.reserve_time;
    if (node) { node.textContent = message(); node.setAttribute('data-pmd-future-policy-error','1'); }
    if (field) { field.setAttribute('aria-invalid','true'); field.setAttribute('data-pmd-future-policy-invalid','1'); }
  }
  function allowedTimes(date) {
    if (!validDate(date)) return [];
    var result = [];
    for (var minute = 0; minute < 1440; minute += 15) {
      var clock = pad(Math.floor(minute/60)) + ':' + pad(minute%60);
      if (allowed(date, clock, durationMinutes())) result.push(clock);
    }
    return result;
  }
  function firstAllowedTime(date) {
    var times = allowedTimes(date);
    return times.length ? times[0] : '';
  }
  function nearestAllowedTime(date, value) {
    var times = allowedTimes(date);
    if (!times.length) return '';
    var target = timeMinutes(value);
    if (target === null) return times[0];
    var best = times[0];
    var bestDistance = Math.abs(timeMinutes(best) - target);
    for (var index = 1; index < times.length; index += 1) {
      var distance = Math.abs(timeMinutes(times[index]) - target);
      if (distance < bestDistance) {
        best = times[index];
        bestDistance = distance;
      }
    }
    return best;
  }
  function apply(silent) {
    var date = form.elements.reserve_date;
    var time = form.elements.reserve_time;
    if (!date || !time) return minimum();
    var min = minimum();
    if (!isCreate()) { date.removeAttribute('min'); refreshWheel(); return min; }
    var previousTime = String(time.value || '');
    date.min = min.date;
    if (!validDate(date.value) || date.value < min.date) date.value = min.date;
    if (!validTime(time.value) || !allowed(date.value, time.value, durationMinutes())) {
      var next = nearestAllowedTime(date.value, time.value);
      /* Never manufacture min.time on a closed/no-valid-time date. That old
       * fallback could leave an off-hours value in the native field. */
      time.value = next || '';
    }
    clearPolicyError();
    refreshWheel();
    if (time.value !== previousTime && silent !== true) {
      time.dispatchEvent(new Event('input', {bubbles:true}));
      time.dispatchEvent(new Event('change', {bubbles:true}));
    }
    return min;
  }
  function validate(show) {
    if (!isCreate()) { clearPolicyError(); return true; }
    apply(true);
    var date = form.elements.reserve_date;
    var time = form.elements.reserve_time;
    var ok = date && time && validDate(date.value) && validTime(time.value) && allowed(date.value, time.value, durationMinutes());
    if (ok) clearPolicyError(); else if (show) showPolicyError();
    return Boolean(ok);
  }
  function to24(hour, period) {
    var h = Number(hour) % 12;
    if (period === 'PM') h += 12;
    return h;
  }
  function activeValue(column) {
    var item = column && column.querySelector('.pmd-jade-wheel-v221__item.is-selected');
    return item ? item.dataset.value : '';
  }
  function setDisabledByValue(column, predicate) {
    if (!column) return;
    Array.prototype.forEach.call(column.querySelectorAll('.pmd-jade-wheel-v221__item'), function (item) {
      var disabled = Boolean(predicate(item.dataset.value));
      item.disabled = disabled;
      item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (disabled && item.classList.contains('is-selected')) {
        item.classList.remove('is-selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }
  function selectWheelValue(column, value, smooth) {
    if (!column) return;
    var matches = Array.prototype.filter.call(
      column.querySelectorAll('.pmd-jade-wheel-v221__item'),
      function (item) { return item.dataset.value === String(value) && !item.disabled; }
    );
    var selected = matches[Math.floor(matches.length / 2)] || null;
    Array.prototype.forEach.call(column.querySelectorAll('.pmd-jade-wheel-v221__item'), function (item) {
      var active = item === selected;
      item.classList.toggle('is-selected', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (!selected) return;
    var top = selected.offsetTop - (column.clientHeight - selected.offsetHeight) / 2;
    column.scrollTo({top:Math.max(0, top), behavior:smooth ? 'smooth' : 'auto'});
  }
  function setNoAvailableTimeState(wheel, active) {
    if (!wheel || !wheel.container) return;
    wheel.container.classList.toggle('is-no-available-time', Boolean(active));
    var highlight = wheel.container.querySelector('.pmd-jade-wheel-v221__highlight');
    if (highlight) {
      var lang = String(document.documentElement.lang || '').toLowerCase();
      highlight.setAttribute(
        'data-pmd-no-time-label',
        lang.indexOf('de') === 0 ? 'Keine Reservierungszeit verfügbar' : 'No reservation time available'
      );
    }
  }
  function refreshWheel(target) {
    if (target) wheelRef = target;
    var wheel = wheelRef;
    if (!wheel) return;
    var date = form.elements.reserve_date;
    var field = form.elements.reserve_time;
    if (!isCreate() || !date || !validDate(date.value)) {
      setNoAvailableTimeState(wheel, false);
      [wheel.hour,wheel.minute,wheel.period].forEach(function(col){ setDisabledByValue(col,function(){return false;}); });
      return;
    }

    var desired = field && validTime(field.value) && allowed(date.value, field.value, durationMinutes())
      ? String(field.value).slice(0,5)
      : firstAllowedTime(date.value);

    if (!desired) {
      [wheel.hour,wheel.minute,wheel.period].forEach(function (column) {
        setDisabledByValue(column, function () { return true; });
        Array.prototype.forEach.call(column.querySelectorAll('.pmd-jade-wheel-v221__item'), function (item) {
          item.classList.remove('is-selected');
          item.setAttribute('aria-selected', 'false');
        });
      });
      if (field) field.value = '';
      setNoAvailableTimeState(wheel, true);
      var emptyHighlight = wheel.container && wheel.container.querySelector('.pmd-jade-wheel-v221__highlight');
      if (emptyHighlight && validDate(date.value) && hoursConfigured() && !dateHasOpeningWindow(date.value)) {
        var emptyLang = String(document.documentElement.lang || '').toLowerCase();
        emptyHighlight.setAttribute(
          'data-pmd-no-time-label',
          emptyLang.indexOf('de') === 0 ? 'Restaurant geschlossen' : 'Restaurant closed'
        );
      }
      return;
    }

    setNoAvailableTimeState(wheel, false);
    var desiredMinutes = timeMinutes(desired);
    var desiredHour24 = Math.floor(desiredMinutes / 60);
    var desiredMinute = desiredMinutes % 60;
    var desiredPeriod = desiredHour24 >= 12 ? 'PM' : 'AM';
    var desiredHour12 = desiredHour24 % 12 || 12;
    var minutes = [0,15,30,45];

    setDisabledByValue(wheel.period, function (period) {
      for (var h = 1; h <= 12; h += 1) {
        for (var m = 0; m < minutes.length; m += 1) {
          if (allowed(date.value, pad(to24(h, period))+':'+pad(minutes[m]), durationMinutes())) return false;
        }
      }
      return true;
    });

    setDisabledByValue(wheel.hour, function (value) {
      var h24 = to24(Number(value), desiredPeriod);
      return !minutes.some(function (minute) {
        return allowed(date.value, pad(h24)+':'+pad(minute), durationMinutes());
      });
    });

    setDisabledByValue(wheel.minute, function (value) {
      return !allowed(date.value, pad(desiredHour24)+':'+pad(Number(value)), durationMinutes());
    });

    if (field && field.value !== desired) field.value = desired;
    selectWheelValue(wheel.period, desiredPeriod, false);
    selectWheelValue(wheel.hour, desiredHour12, false);
    selectWheelValue(wheel.minute, desiredMinute, false);
  }
  function coerceTime(value) {
    var date = form.elements.reserve_date;
    if (!isCreate() || !date || !validDate(date.value)) return value;
    if (validTime(value) && allowed(date.value, value, durationMinutes())) return value;
    /* PMD_JADE_NEAREST_VALID_SLOT_V1_4_1_20260815
     * A wheel release outside the opening window snaps to the nearest valid
     * 15-minute reservation start. It never rests on a closed time and never
     * jumps all the way back to the day's first slot unless that is nearest. */
    return nearestAllowedTime(date.value, value);
  }
  function attachWheel(wheel) { wheelRef = wheel || wheelRef; refreshWheel(); }

  var dateField = form.elements.reserve_date;
  if (dateField) {
    dateField.addEventListener('input', function () { apply(false); });
    dateField.addEventListener('change', function () { apply(false); });
  }
  root.addEventListener('change', function (event) {
    if (event.target && String(event.target.name || '') === 'duration') apply(false);
  });
  root.addEventListener('shown.bs.modal', function () { apply(true); });

  window.PMDReservationComposerFutureOnlyV1 = Object.freeze({
    version:'1.2.0', minimum:minimum, isCreate:isCreate, allowed:allowed,
    apply:apply, validate:validate, message:message, coerceTime:coerceTime,
    allowedTimes:allowedTimes, nearestAllowedTime:nearestAllowedTime,
    attachWheel:attachWheel, refreshWheel:refreshWheel,
    setOpeningHours:setOpeningHours, openingHours:function(){return openingHours.slice();}
  });
}());

/* ============================================================
   PMD_COMPOSER_STABLE_JADE_V221
   Event-driven only:
   - no MutationObserver
   - no setInterval
   - no recurring DOM processing
   ============================================================ */
(function () {
  'use strict';

  var VERSION = '2.2.1';
  var ROOT_ID = 'pmd-reservation-composer-v1';

  if (window.PMDComposerStableJadeV221) {
    return;
  }

  var root = document.getElementById(ROOT_ID);

  if (!root) {
    return;
  }

  var form = root.querySelector('form');

  if (!form) {
    return;
  }

  var initialized = false;
  var wheel = null;
  var syncing = false;
  var settleTimers = new WeakMap();

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function timeField() {
    return form.elements.reserve_time || null;
  }

  function parseTime(value) {
    var match = String(value || '').match(
      /^([01]\d|2[0-3]):([0-5]\d)/
    );

    if (!match) {
      return {
        hour: 12,
        minute: 30,
        period: 'PM'
      };
    }

    var hour24 = Number(match[1]);

    return {
      hour: hour24 % 12 || 12,
      minute: Number(match[2]),
      period: hour24 >= 12 ? 'PM' : 'AM'
    };
  }

  function nativeTime(hour, minute, period) {
    var hour24 = Number(hour) % 12;

    if (period === 'PM') {
      hour24 += 12;
    }

    return pad(hour24) + ':' + pad(minute);
  }

  function calendarSvg() {
    return [
      '<svg viewBox="0 0 24 24"',
      ' fill="none"',
      ' stroke="currentColor"',
      ' stroke-width="2"',
      ' stroke-linecap="round"',
      ' stroke-linejoin="round"',
      ' aria-hidden="true">',
      '<rect x="3" y="5" width="18" height="16" rx="2"></rect>',
      '<path d="M16 3v4M8 3v4M3 11h18"></path>',
      '</svg>'
    ].join('');
  }

  function valuesRepeated(values, count) {
    var result = [];

    for (var cycle = 0; cycle < count; cycle += 1) {
      values.forEach(function (value) {
        result.push(value);
      });
    }

    return result;
  }

  function createColumn(name, values, formatter, label) {
    var column = document.createElement('div');

    column.className =
      'pmd-jade-wheel-v221__column is-' + name;

    column.tabIndex = 0;
    column.setAttribute('role', 'listbox');
    column.setAttribute('aria-label', label);

    valuesRepeated(values, 5).forEach(function (value) {
      var item = document.createElement('button');

      item.type = 'button';
      item.className =
        'pmd-jade-wheel-v221__item';

      item.dataset.value = String(value);
      item.textContent = formatter(value);

      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');

      column.appendChild(item);
    });

    return column;
  }

  function items(column) {
    return Array.prototype.slice.call(
      column.querySelectorAll(
        '.pmd-jade-wheel-v221__item'
      )
    );
  }

  function activeItem(column) {
    return column.querySelector(
      '.pmd-jade-wheel-v221__item.is-selected'
    );
  }

  function setSelected(column, selected) {
    items(column).forEach(function (item) {
      var active = item === selected;

      item.classList.toggle('is-selected', active);
      item.setAttribute(
        'aria-selected',
        active ? 'true' : 'false'
      );
    });
  }

  function centerItem(column, item, smooth) {
    if (!column || !item) {
      return;
    }

    var top =
      item.offsetTop
      - (
        column.clientHeight
        - item.offsetHeight
      ) / 2;

    column.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function middleItem(column, value) {
    var matching = items(column).filter(function (item) {
      return item.dataset.value === String(value);
    });

    return matching[
      Math.floor(matching.length / 2)
    ] || null;
  }

  function closestItem(column) {
    var rect = column.getBoundingClientRect();
    var center = rect.top + rect.height / 2;
    var selected = null;
    var bestDistance = Infinity;

    items(column).forEach(function (item) {
      if (item.disabled) return;
      var itemRect = item.getBoundingClientRect();
      var itemCenter =
        itemRect.top + itemRect.height / 2;

      var distance = Math.abs(
        itemCenter - center
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        selected = item;
      }
    });

    return selected;
  }

  function valueOf(column) {
    var item = activeItem(column);

    return item ? item.dataset.value : '';
  }

  function publishTime() {
    if (!wheel || syncing) {
      return;
    }

    var field = timeField();

    if (!field) {
      return;
    }

    var hour = Number(valueOf(wheel.hour));
    var minute = Number(valueOf(wheel.minute));
    var period = valueOf(wheel.period);

    if (
      !hour
      || Number.isNaN(minute)
      || !period
    ) {
      return;
    }

    var next = nativeTime(
      hour,
      minute,
      period
    );

    if (
      window.PMDReservationComposerFutureOnlyV1
      && typeof window.PMDReservationComposerFutureOnlyV1.coerceTime === 'function'
    ) {
      next = window.PMDReservationComposerFutureOnlyV1.coerceTime(next);
    }

    if (field.value === next) {
      if (window.PMDReservationComposerFutureOnlyV1) window.PMDReservationComposerFutureOnlyV1.refreshWheel(wheel);
      return;
    }

    field.value = next;

    field.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );

    field.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );
  }

  function settle(column) {
    var selected = closestItem(column);

    if (!selected) {
      if (window.PMDReservationComposerFutureOnlyV1) {
        window.PMDReservationComposerFutureOnlyV1.refreshWheel(wheel);
      }
      return;
    }

    /* PMD_JADE_RECENTER_MIDDLE_CYCLE_V1_4_20260815
     * Each value is repeated five times. Always settle on the middle clone so
     * Safari cannot accumulate at the finite scroll edge and expose a white
     * center band after aggressive wheel scrolling. */
    var middle = middleItem(column, selected.dataset.value) || selected;
    setSelected(column, middle);
    centerItem(column, middle, false);
    publishTime();
  }

  function bindColumn(column) {
    column.addEventListener(
      'scroll',
      function () {
        var previous =
          settleTimers.get(column);

        if (previous) {
          window.clearTimeout(previous);
        }

        var timer = window.setTimeout(
          function () {
            settle(column);
          },
          100
        );

        settleTimers.set(column, timer);
      },
      {
        passive: true
      }
    );

    column.addEventListener(
      'click',
      function (event) {
        var item = event.target.closest(
          '.pmd-jade-wheel-v221__item'
        );

        if (!item || !column.contains(item) || item.disabled) {
          return;
        }

        setSelected(column, item);
        centerItem(column, item, true);
        publishTime();
      }
    );

    column.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key !== 'ArrowUp'
          && event.key !== 'ArrowDown'
        ) {
          return;
        }

        event.preventDefault();

        var allItems = items(column).filter(function (item) { return !item.disabled; });
        if (!allItems.length) return;
        var current =
          activeItem(column)
          || closestItem(column);

        var index = allItems.indexOf(current);

        if (index < 0) {
          index = 0;
        }

        index +=
          event.key === 'ArrowDown'
            ? 1
            : -1;

        index = Math.max(
          0,
          Math.min(
            allItems.length - 1,
            index
          )
        );

        var selected = allItems[index];

        setSelected(column, selected);
        centerItem(column, selected, true);
        publishTime();
      }
    );
  }

  function createWheel() {
    if (wheel) {
      return wheel;
    }

    var field = timeField();

    if (!field) {
      return null;
    }

    var label = field.closest('label');

    if (!label) {
      return null;
    }

    label.classList.add(
      'pmd-jade-time-field-v221'
    );

    field.classList.add(
      'pmd-jade-native-time-v221'
    );

    field.tabIndex = -1;
    field.setAttribute('aria-hidden', 'true');

    var container = document.createElement('div');

    container.className =
      'pmd-jade-wheel-v221';

    var highlight = document.createElement('div');

    highlight.className =
      'pmd-jade-wheel-v221__highlight';

    highlight.setAttribute('aria-hidden', 'true');

    var hour = createColumn(
      'hour',
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      function (value) {
        return pad(value);
      },
      'Hour'
    );

    var minute = createColumn(
      'minute',
      [0, 15, 30, 45],
      function (value) {
        return pad(value);
      },
      'Minute'
    );

    var period = createColumn(
      'period',
      ['AM', 'PM'],
      function (value) {
        return value;
      },
      'AM or PM'
    );

    var separator = document.createElement('span');

    separator.className =
      'pmd-jade-wheel-v221__separator';

    separator.textContent = ':';
    separator.setAttribute('aria-hidden', 'true');

    container.appendChild(hour);
    container.appendChild(separator);
    container.appendChild(minute);
    container.appendChild(period);
    container.appendChild(highlight);

    label.appendChild(container);

    wheel = {
      container: container,
      hour: hour,
      minute: minute,
      period: period
    };

    bindColumn(hour);
    bindColumn(minute);
    bindColumn(period);

    if (window.PMDReservationComposerFutureOnlyV1) {
      window.PMDReservationComposerFutureOnlyV1.attachWheel(wheel);
    }

    field.addEventListener(
      'input',
      syncFromNative
    );

    field.addEventListener(
      'change',
      syncFromNative
    );

    syncFromNative();

    return wheel;
  }

  function syncFromNative() {
    if (!wheel) {
      return;
    }

    var field = timeField();

    if (!field) {
      return;
    }

    syncing = true;

    var value = parseTime(field.value);

    var roundedMinute =
      Math.round(value.minute / 15) * 15;

    if (roundedMinute >= 60) {
      roundedMinute = 45;
    }

    [
      [wheel.hour, value.hour],
      [wheel.minute, roundedMinute],
      [wheel.period, value.period]
    ].forEach(function (entry) {
      var item = middleItem(
        entry[0],
        entry[1]
      );

      if (!item) {
        return;
      }

      setSelected(entry[0], item);
      centerItem(entry[0], item, false);
    });

    if (window.PMDReservationComposerFutureOnlyV1) {
      window.PMDReservationComposerFutureOnlyV1.refreshWheel(wheel);
    }

    window.requestAnimationFrame(function () {
      syncing = false;
    });
  }

  function enhanceHeader() {
    var header = root.querySelector(
      '.modal-header'
    );

    if (!header) {
      return;
    }

    header.classList.add(
      'pmd-jade-header-v221'
    );

    if (
      !header.querySelector(
        '.pmd-jade-header-icon-v221'
      )
    ) {
      var icon = document.createElement('span');

      icon.className =
        'pmd-jade-header-icon-v221';

      icon.innerHTML = calendarSvg();

      header.insertBefore(
        icon,
        header.firstChild
      );
    }

    var title = header.querySelector(
      '.modal-title, h1, h2, h3'
    );

    if (!title) {
      return;
    }

    var wrapper =
      title.closest('div')
      || title.parentElement;

    if (!wrapper) {
      return;
    }

    wrapper.classList.add(
      'pmd-jade-title-wrap-v221'
    );

    if (
      !wrapper.querySelector(
        '.pmd-jade-subtitle-v221'
      )
    ) {
      var subtitle =
        document.createElement('span');

      subtitle.className =
        'pmd-jade-subtitle-v221';

      subtitle.textContent =
        'Create a new reservation for your guests.';

      wrapper.appendChild(subtitle);
    }
  }

  function enhanceActions() {
    var save =
      root.querySelector(
        '[data-pmd-composer-save]'
      )
      || root.querySelector(
        'button[type="submit"]'
      );

    var cancel = root.querySelector(
      '[data-pmd-composer-cancel]'
    );

    if (save) {
      save.classList.add(
        'pmd-jade-save-v221'
      );
    }

    if (cancel) {
      cancel.classList.add(
        'pmd-jade-cancel-v221'
      );
    }
  }

  function initialize() {
    if (!initialized) {
      root.classList.add(
        'pmd-composer-stable-jade-v221'
      );

      enhanceHeader();
      enhanceActions();
      createWheel();

      initialized = true;
    }

    syncFromNative();
  }

  initialize();
  /*
   * PMD_COMPOSER_STABLE_NO_BLINK_V3_20260807
   *
   * Removed obsolete V221 cross-scope availability invalidator.
   * The Smart Context V224 closure owns latestAvailability.
   */


  root.addEventListener(
    'shown.bs.modal',
    function () {
      initialize();

      window.requestAnimationFrame(
        syncFromNative
      );
    }
  );

  /*
   * One delayed refresh after a genuine Composer trigger.
   * This is not recurring and does not observe the page.
   */
  document.addEventListener(
    'click',
    function (event) {
      var trigger = event.target.closest(
        [
          '[data-r2-add-reservation]',
          '[data-pmd-add-reservation]',
          'a[href*="/reservations/create"]',
          'a[href*="/reservations/edit/"]'
        ].join(',')
      );

      if (!trigger) {
        return;
      }

      window.setTimeout(function () {
        initialize();
        syncFromNative();
      }, 180);
    },
    true
  );

  window.PMDComposerStableJadeV221 = {
    version: VERSION,

    refresh: function () {
      initialize();
      syncFromNative();
    },

    audit: function () {
      return {
        version: VERSION,
        initialized: initialized,
        root: Boolean(root),
        form: Boolean(form),
        wheel: Boolean(wheel),
        nativeTime:
          timeField()
            ? timeField().value
            : null,
        addedMutationObservers: 0,
        recurringIntervals: 0
      };
    }
  };

  console.info(
    '[PMD Composer Stable Jade V2.2.1] Ready',
    window.PMDComposerStableJadeV221.audit()
  );
}());

/* ============================================================
   PMD_COMPOSER_LAYOUT_V222
   Compact reference layout
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDComposerLayoutV222) {
    return;
  }

  var VERSION = '2.2.2';

  var root = document.getElementById(
    'pmd-reservation-composer-v1'
  );

  if (!root) {
    return;
  }

  var form = root.querySelector('form');

  if (!form) {
    return;
  }

  function closestField(field) {
    if (!field) {
      return null;
    }

    return field.closest(
      'label, .form-group, .pmd-reservation-composer-v1__field'
    );
  }

  function mark(fieldName, className) {
    var field = form.elements[fieldName];
    var wrapper = closestField(field);

    if (!wrapper) {
      return null;
    }

    wrapper.classList.add(className);

    return wrapper;
  }

  function applyLayout() {
    var grid = root.querySelector(
      '.pmd-reservation-composer-v1__grid'
    );

    if (!grid) {
      return false;
    }

    grid.classList.add(
      'pmd-composer-layout-grid-v222'
    );

    mark(
      'first_name',
      'pmd-composer-area-name-v222'
    );

    mark(
      'guest_num',
      'pmd-composer-area-guests-v222'
    );

    mark(
      'reserve_date',
      'pmd-composer-area-date-v222'
    );

    mark(
      'reserve_time',
      'pmd-composer-area-time-v222'
    );

    mark(
      'duration',
      'pmd-composer-area-duration-v222'
    );

    mark(
      'telephone',
      'pmd-composer-area-phone-v222'
    );

    mark(
      'email',
      'pmd-composer-area-email-v222'
    );

    mark(
      'comment',
      'pmd-composer-area-comment-v222'
    );

    var assignment = root.querySelector(
      '.pmd-reservation-composer-v1__assignment'
    );

    if (assignment) {
      assignment.classList.add(
        'pmd-composer-area-assignment-v222'
      );
    }

    return true;
  }

  applyLayout();

  root.addEventListener(
    'shown.bs.modal',
    function () {
      applyLayout();
    }
  );

  window.PMDComposerLayoutV222 = {
    version: VERSION,

    refresh: applyLayout,

    audit: function () {
      return {
        version: VERSION,
        grid: Boolean(
          root.querySelector(
            '.pmd-composer-layout-grid-v222'
          )
        ),
        name: Boolean(
          root.querySelector(
            '.pmd-composer-area-name-v222'
          )
        ),
        guests: Boolean(
          root.querySelector(
            '.pmd-composer-area-guests-v222'
          )
        ),
        date: Boolean(
          root.querySelector(
            '.pmd-composer-area-date-v222'
          )
        ),
        time: Boolean(
          root.querySelector(
            '.pmd-composer-area-time-v222'
          )
        ),
        duration: Boolean(
          root.querySelector(
            '.pmd-composer-area-duration-v222'
          )
        ),
        assignment: Boolean(
          root.querySelector(
            '.pmd-composer-area-assignment-v222'
          )
        )
      };
    }
  };

  console.info(
    '[PMD Composer Layout V2.2.2] Ready',
    window.PMDComposerLayoutV222.audit()
  );
}());

/* ============================================================
   PMD_COMPOSER_COMPACT_ASSIGNMENT_V223
   - Compact two-column form
   - Time wheel left
   - Date, duration, guests right
   - Choose-table button owns dropdown
   - Auto button displays current recommendation
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDComposerCompactAssignmentV223) {
    return;
  }

  var VERSION = '2.2.3';

  var root = document.getElementById(
    'pmd-reservation-composer-v1'
  );

  if (!root) {
    return;
  }

  var form = root.querySelector('form');

  if (!form) {
    return;
  }

  var refreshTimer = null;

  function fieldWrapper(name) {
    var field = form.elements[name];

    return field
      ? field.closest(
          'label, .form-group, .pmd-reservation-composer-v1__field'
        )
      : null;
  }

  function assignmentRoot() {
    return root.querySelector(
      '.pmd-reservation-composer-v1__assignment'
    );
  }

  function tableWrapper() {
    return root.querySelector(
      '.pmd-reservation-composer-v1__tables'
    );
  }

  function availabilityNode() {
    return root.querySelector(
      '[data-pmd-composer-availability]'
    );
  }

  function assignmentRadio(value) {
    return form.querySelector(
      '[name="assignment_mode"][value="' +
      value +
      '"]'
    );
  }

  function radioLabel(radio) {
    return radio
      ? radio.closest('label')
      : null;
  }

  function radioVisual(radio) {
    var label = radioLabel(radio);

    return label
      ? label.querySelector(':scope > span')
      : null;
  }

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function recommendationFromStatus() {
    var node = availabilityNode();
    var text = clean(node && node.textContent);

    var match = text.match(
      /Recommended:\s*(.+)$/i
    );

    if (!match) {
      match = text.match(
        /Empfohlen:\s*(.+)$/i
      );
    }

    if (!match) {
      return '';
    }

    return clean(match[1]);
  }

  function recommendationFromSelectedTables() {
    var wrapper = tableWrapper();

    if (!wrapper) {
      return '';
    }

    var chips = Array.prototype.slice.call(
      wrapper.querySelectorAll(
        '.pmd-reservation-composer-v1__table-chip'
      )
    );

    return chips
      .map(function (chip) {
        return clean(
          chip.textContent
        ).replace(/\s*[×x]\s*$/, '');
      })
      .filter(Boolean)
      .join(', ');
  }

  function updateAutoLabel() {
    var radio = assignmentRadio('auto');
    var visual = radioVisual(radio);

    if (!visual) {
      return;
    }

    /*
     * PMD_COMPOSER_SINGLE_RECOMMENDATION_AUTHORITY_20260807
     *
     * V223 is no longer allowed to invent:
     *
     *   Auto assignment
     *   Auto · Table X
     *
     * Availability-owned V224 is the only source of the
     * recommendation label.
     */
    var smart =
      window.PMDSmartContextTablesV224;

    var recommendation = '';

    if (
      smart
      && typeof smart.audit === 'function'
    ) {
      try {
        recommendation =
          String(
            smart.audit().recommendation || ''
          ).trim();
      } catch (ignore) {}
    }

    visual.textContent =
      recommendation || 'No table found';
  }

  function nativeTableTrigger() {
    var wrapper = tableWrapper();

    return wrapper
      ? wrapper.querySelector(
          '.pmd-reservation-composer-v1__table-trigger'
        )
      : null;
  }

  function nativeTablePanel() {
    var wrapper = tableWrapper();

    return wrapper
      ? wrapper.querySelector(
          '.pmd-reservation-composer-v1__table-panel'
        )
      : null;
  }

  function closeTablePanel() {
    var trigger = nativeTableTrigger();
    var panel = nativeTablePanel();

    if (panel) {
      panel.hidden = true;
    }

    if (trigger) {
      trigger.setAttribute(
        'aria-expanded',
        'false'
      );
    }

    root.classList.remove(
      'pmd-composer-table-dropdown-open-v223'
    );
  }

  function toggleTablePanel() {
    var trigger = nativeTableTrigger();
    var panel = nativeTablePanel();

    if (!trigger || !panel) {
      return;
    }

    var opening = panel.hidden;

    panel.hidden = !opening;

    trigger.setAttribute(
      'aria-expanded',
      opening ? 'true' : 'false'
    );

    root.classList.toggle(
      'pmd-composer-table-dropdown-open-v223',
      opening
    );
  }

  function bindChooseButton() {
    var choose = assignmentRadio('choose');
    var label = radioLabel(choose);

    if (
      !choose
      || !label
      || label.dataset.pmdV223Bound === '1'
    ) {
      return;
    }

    label.dataset.pmdV223Bound = '1';

    label.addEventListener(
      'click',
      function () {
        window.setTimeout(function () {
          if (!choose.checked) {
            closeTablePanel();
            return;
          }

          toggleTablePanel();
        }, 30);
      }
    );
  }

  function bindOtherAssignmentButtons() {
    ['auto', 'later'].forEach(function (mode) {
      var radio = assignmentRadio(mode);
      var label = radioLabel(radio);

      if (
        !label
        || label.dataset.pmdV223CloseBound === '1'
      ) {
        return;
      }

      label.dataset.pmdV223CloseBound = '1';

      label.addEventListener(
        'click',
        function () {
          closeTablePanel();
        }
      );
    });
  }

  function markLayout() {
    var grid = root.querySelector(
      '.pmd-reservation-composer-v1__grid'
    );

    if (!grid) {
      return;
    }

    grid.classList.add(
      'pmd-composer-grid-v223'
    );

    [
      ['first_name', 'name'],
      ['reserve_time', 'time'],
      ['reserve_date', 'date'],
      ['duration', 'duration'],
      ['guest_num', 'guests'],
      ['telephone', 'phone'],
      ['email', 'email'],
      ['comment', 'comment']
    ].forEach(function (entry) {
      var wrapper = fieldWrapper(entry[0]);

      if (wrapper) {
        wrapper.classList.add(
          'pmd-composer-v223-area-' + entry[1]
        );
      }
    });

    var assignment = assignmentRoot();

    if (assignment) {
      assignment.classList.add(
        'pmd-composer-v223-area-assignment'
      );
    }
  }

  function removeSeparateTableTriggerRow() {
    var wrapper = tableWrapper();

    if (!wrapper) {
      return;
    }

    wrapper.classList.add(
      'pmd-composer-tables-owned-by-choice-v223'
    );

    var trigger = nativeTableTrigger();

    if (trigger) {
      trigger.tabIndex = -1;
      trigger.setAttribute(
        'aria-hidden',
        'true'
      );
    }
  }

  function hideAvailabilityPresentation() {
    var node = availabilityNode();

    if (!node) {
      return;
    }

    /*
     * Keep the node in DOM so existing JS can update it and the
     * Auto button can read the recommendation. It is only hidden
     * from the visual interface.
     */
    node.classList.add(
      'pmd-composer-availability-hidden-v223'
    );

    node.removeAttribute('aria-live');
    node.setAttribute('aria-hidden', 'true');
  }

  function apply() {
    markLayout();
    removeSeparateTableTriggerRow();
    hideAvailabilityPresentation();

    bindChooseButton();
    bindOtherAssignmentButtons();

    updateAutoLabel();
  }

  function scheduleRefresh(delay) {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(
      function () {
        refreshTimer = null;
        apply();
      },
      delay
    );
  }

  form.addEventListener(
    'input',
    function () {
      scheduleRefresh(420);
    }
  );

  form.addEventListener(
    'change',
    function () {
      scheduleRefresh(420);
    }
  );

  root.addEventListener(
    'shown.bs.modal',
    function () {
      apply();
      scheduleRefresh(450);
    }
  );

  document.addEventListener(
    'click',
    function (event) {
      var wrapper = tableWrapper();
      var chooseLabel = radioLabel(
        assignmentRadio('choose')
      );

      if (
        !root.classList.contains(
          'pmd-composer-table-dropdown-open-v223'
        )
      ) {
        return;
      }

      if (
        wrapper
        && wrapper.contains(event.target)
      ) {
        return;
      }

      if (
        chooseLabel
        && chooseLabel.contains(event.target)
      ) {
        return;
      }

      closeTablePanel();
    }
  );

  apply();
  scheduleRefresh(500);

  window.PMDComposerCompactAssignmentV223 = {
    version: VERSION,

    refresh: apply,

    audit: function () {
      return {
        version: VERSION,
        layout: Boolean(
          root.querySelector(
            '.pmd-composer-grid-v223'
          )
        ),
        tableTriggerHidden: Boolean(
          root.querySelector(
            '.pmd-composer-tables-owned-by-choice-v223'
          )
        ),
        availabilityHidden: Boolean(
          root.querySelector(
            '.pmd-composer-availability-hidden-v223'
          )
        ),
        autoRecommendation:
          recommendationFromStatus()
          || recommendationFromSelectedTables()
          || null
      };
    }
  };

  console.info(
    '[PMD Composer Compact Assignment V2.2.3] Ready',
    window.PMDComposerCompactAssignmentV223.audit()
  );
}());


/* ============================================================
   PMD_SMART_CONTEXT_TABLES_V224

   - No visible "Table assignment" title
   - No visible generic "Auto assign" wording
   - Recommended table names shown directly
   - Choose table button is the dropdown trigger
   - Entry-point context is preserved
   - Duration icon is added
   - Availability bar remains functional but invisible
   ============================================================ */
(function () {
  'use strict';

  var VERSION = '2.2.4.1';
  var ROOT_ID = 'pmd-reservation-composer-v1';

  if (window.PMDSmartContextTablesV224) {
    return;
  }

  var root = document.getElementById(ROOT_ID);

  if (!root) {
    return;
  }

  var form = root.querySelector('form');

  if (!form) {
    return;
  }

  var latestAvailability = null;

  function positiveIds(values) {
    var result = [];

    (Array.isArray(values) ? values : [values])
      .forEach(function (value) {
        var id = Number(value);

        if (
          Number.isInteger(id)
          && id > 0
          && result.indexOf(id) < 0
        ) {
          result.push(id);
        }
      });

    return result;
  }

  function tableCatalog() {
    var select = form.querySelector(
      '[name="tables[]"]'
    );

    if (!select) {
      return [];
    }

    return Array.prototype.slice.call(
      select.options
    ).map(function (option) {
      return {
        table_id: Number(option.value),
        table_name: String(
          option.textContent || ''
        )
          .replace(/\s*\([^)]*\)\s*$/, '')
          .trim()
      };
    }).filter(function (table) {
      return table.table_id > 0;
    });
  }

  function nameFor(id, catalog) {
    var match = catalog.find(function (table) {
      return Number(table.table_id) === Number(id);
    });

    return match && match.table_name
      ? match.table_name
      : 'Table ' + id;
  }

  function assignmentRadio(mode) {
    return form.querySelector(
      '[name="assignment_mode"][value="' +
      mode +
      '"]'
    );
  }

  function labelForRadio(radio) {
    return radio
      ? radio.closest('label')
      : null;
  }

  function visibleLabelNode(label) {
    return label
      ? label.querySelector('span')
      : null;
  }

  function autoRecommendationIds() {
    if (
      !latestAvailability
      || !Array.isArray(
        latestAvailability.recommendedTableIds
      )
    ) {
      return [];
    }

    var recommended = positiveIds(
      latestAvailability.recommendedTableIds
    );

    /*
     * A recommended table must also be present in the
     * authoritative available-table set when that set exists.
     */
    if (
      Array.isArray(
        latestAvailability.availableTableIds
      )
    ) {
      var available = positiveIds(
        latestAvailability.availableTableIds
      );

      recommended = recommended.filter(
        function (id) {
          return available.indexOf(id) >= 0;
        }
      );
    }

    return recommended;
  }

  function selectedIds() {
    var select = form.querySelector(
      '[name="tables[]"]'
    );

    if (!select) {
      return [];
    }

    return positiveIds(
      Array.prototype.slice.call(select.options)
        .filter(function (option) {
          return option.selected;
        })
        .map(function (option) {
          return option.value;
        })
    );
  }

  function recommendationText() {
    var catalog = tableCatalog();
    var ids = autoRecommendationIds();

    /*
     * Automatic assignment never falls back to previously
     * selected tables. It is availability-owned only.
     */
    if (!ids.length) {
      return 'No table found';
    }

    var label = ids.map(function (id) {
      return nameFor(id, catalog);
    }).join(' + ');
    var floorName = String(
      latestAvailability && latestAvailability.pmdRecommendationFloorName || ''
    ).trim();
    return floorName && label.indexOf('· ' + floorName) < 0
      ? (label + ' · ' + floorName)
      : label;
  }

  function updateRecommendationButton() {
    var auto = assignmentRadio('auto');
    var label = labelForRadio(auto);
    var text = visibleLabelNode(label);

    if (!label || !text) {
      return;
    }

    label.classList.add(
      'pmd-smart-recommendation-v224'
    );

    text.textContent = recommendationText();

    var ids = autoRecommendationIds();

    label.title = ids.length
      ? 'Recommended available table'
      : 'The recommendation updates with date, time, duration and guests';
  }

  function ensureDurationIcon() {
    var duration = form.elements.duration;

    if (!duration) {
      return;
    }

    var label = duration.closest('label');
    var title = label
      ? label.querySelector(':scope > span')
      : null;

    if (
      !title
      || title.querySelector(
        '[data-pmd-duration-icon-v224]'
      )
    ) {
      return;
    }

    var svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute(
      'data-pmd-duration-icon-v224',
      ''
    );

    svg.innerHTML =
      '<circle cx="12" cy="13" r="8"></circle>' +
      '<path d="M12 9v4l3 2M9 2h6M12 2v3"></path>';

    title.insertBefore(svg, title.firstChild);
  }

  function removeVisibleAssignmentTitle() {
    var assignment = root.querySelector(
      '.pmd-reservation-composer-v1__assignment'
    );

    var heading = assignment
      ? assignment.querySelector('h3')
      : null;

    if (assignment) {
      assignment.classList.add(
        'pmd-smart-assignment-v224'
      );

      assignment.removeAttribute(
        'aria-labelledby'
      );
    }

    if (heading) {
      heading.hidden = true;
      heading.setAttribute(
        'aria-hidden',
        'true'
      );
    }
  }

  function hideAvailabilityBar() {
    var availability = root.querySelector(
      '[data-pmd-composer-availability]'
    );

    if (!availability) {
      return;
    }

    availability.classList.add(
      'pmd-smart-availability-hidden-v224'
    );

    availability.removeAttribute('aria-live');
    availability.setAttribute(
      'aria-hidden',
      'true'
    );
  }

  function makeChooseButtonDropdown() {
    var choose = assignmentRadio('choose');
    var chooseLabel = labelForRadio(choose);

    var nativeTrigger = root.querySelector(
      '.pmd-reservation-composer-v1__table-trigger'
    );

    var panel = root.querySelector(
      '.pmd-reservation-composer-v1__table-panel'
    );

    if (
      !chooseLabel
      || !nativeTrigger
      || !panel
    ) {
      return;
    }

    chooseLabel.classList.add(
      'pmd-smart-choose-dropdown-v224'
    );

    chooseLabel.setAttribute(
      'aria-haspopup',
      'listbox'
    );

    chooseLabel.setAttribute(
      'aria-expanded',
      panel.hidden ? 'false' : 'true'
    );

    nativeTrigger.classList.add(
      'pmd-smart-native-trigger-hidden-v224'
    );

    if (
      chooseLabel.dataset
        .pmdSmartDropdownBoundV224 === '1'
    ) {
      return;
    }

    chooseLabel.dataset
      .pmdSmartDropdownBoundV224 = '1';

    chooseLabel.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (choose) {
          choose.checked = true;

          choose.dispatchEvent(
            new Event(
              'change',
              { bubbles: true }
            )
          );
        }

        nativeTrigger.click();

        window.requestAnimationFrame(
          function () {
            chooseLabel.setAttribute(
              'aria-expanded',
              panel.hidden
                ? 'false'
                : 'true'
            );
          }
        );
      }
    );
  }

  function preserveContextSelection() {
    var choose = assignmentRadio('choose');
    var auto = assignmentRadio('auto');

    /*
     * A table selected from Floor must remain explicitly
     * selected. Header/Calendar/Hour entries without a table
     * remain in automatic recommendation mode.
     */
    if (selectedIds().length) {
      if (choose) {
        choose.checked = true;
      }
    } else if (auto) {
      auto.checked = true;
    }
  }

  function apply() {
    removeVisibleAssignmentTitle();
    hideAvailabilityBar();
    ensureDurationIcon();
    makeChooseButtonDropdown();
    preserveContextSelection();
    updateRecommendationButton();

    root.classList.add(
      'pmd-smart-context-v224-ready'
    );
  }

  root.addEventListener(
    'pmd:composer:availability',
    function (event) {
      latestAvailability =
        event.detail
        && event.detail.availability
          ? event.detail.availability
          : null;

      updateRecommendationButton();
      makeChooseButtonDropdown();
    }
  );

  form.addEventListener(
    'change',
    function (event) {
      if (
        [
          'guest_num',
          'reserve_date',
          'reserve_time',
          'duration',
          'assignment_mode',
          'tables[]',
          'pmd_table_features[]'
        ].indexOf(event.target.name) >= 0
      ) {
        /*
         * PMD_COMPOSER_AUTO_RECOMMENDATION_PERSISTENCE_V2427
         *
         * Do NOT clear latestAvailability from a presentation-layer change
         * event. Native inputs fire `change` when focus leaves after typing.
         * The core availability runtime then sees the SAME effective
         * reservation signature and correctly de-duplicates the request.
         * Clearing V224 here used to orphan the visible Auto recommendation
         * at `No table found` because no new availability event followed.
         *
         * V224 now changes its recommendation cache only when the canonical
         * `pmd:composer:availability` commit event delivers a new result.
         */
        window.setTimeout(apply, 0);
      }
    }
  );

  root.addEventListener(
    'show.bs.modal',
    function () {
      /* PMD_COMPOSER_AUTO_RECOMMENDATION_SESSION_RESET_V2427 */
      latestAvailability = null;
    }
  );

  root.addEventListener(
    'shown.bs.modal',
    function () {
      window.requestAnimationFrame(apply);
    }
  );

  document.addEventListener(
    'click',
    function (event) {
      var panel = root.querySelector(
        '.pmd-reservation-composer-v1__table-panel'
      );

      var chooseLabel = labelForRadio(
        assignmentRadio('choose')
      );

      if (
        panel
        && chooseLabel
        && !root.contains(event.target)
      ) {
        chooseLabel.setAttribute(
          'aria-expanded',
          panel.hidden
            ? 'false'
            : 'true'
        );
      }
    }
  );

  apply();

  window.PMDSmartContextTablesV224 = {
    version: VERSION,

    refresh: apply,

    audit: function () {
      return {
        version: VERSION,
        ready: root.classList.contains(
          'pmd-smart-context-v224-ready'
        ),
        recommendation:
          recommendationText(),
        recommendedTableIds:
          autoRecommendationIds(),
        selectedTableIds:
          selectedIds(),
        floorAware: Boolean(latestAvailability && latestAvailability.pmdFloorAware),
        recommendationFloorId: latestAvailability ? String(latestAvailability.pmdRecommendationFloorId || '') : '',
        recommendationFloorName: latestAvailability ? String(latestAvailability.pmdRecommendationFloorName || '') : '',
        requiredFeatures: latestAvailability && Array.isArray(latestAvailability.pmdRequiredFeatures)
          ? latestAvailability.pmdRequiredFeatures.slice()
          : [],
        selectedTableSuggestionIds: latestAvailability && Array.isArray(latestAvailability.pmdSelectedTableSuggestionIds)
          ? latestAvailability.pmdSelectedTableSuggestionIds.slice()
          : [],
        policyMessage: latestAvailability ? String(latestAvailability.pmdPolicyMessage || '') : '',
        recommendationEventOwned: true,
        blurChangePreservesRecommendation: true,
        newModalResetsRecommendation: true,
        availabilityVisible: Boolean(
          root.querySelector(
            '[data-pmd-composer-availability]'
          )
          && getComputedStyle(
            root.querySelector(
              '[data-pmd-composer-availability]'
            )
          ).display !== 'none'
        )
      };
    }
  };
}());

/* ============================================================
   PMD_COMPOSER_DROPDOWN_COLUMNS_V225

   Fixes:
   - Prevent legacy V223 double-toggle
   - Keep Choose table dropdown open
   - Remove every remaining Auto assign label
   - Keep recommendation table name authoritative
   ============================================================ */
(function () {
  'use strict';

  var VERSION = '2.2.5';
  var ROOT_ID = 'pmd-reservation-composer-v1';

  if (window.PMDComposerDropdownColumnsV225) {
    return;
  }

  var root = document.getElementById(ROOT_ID);

  if (!root) {
    return;
  }

  var form = root.querySelector('form');

  if (!form) {
    return;
  }

  var closeTimer = null;
  var labelTimer = null;

  function assignmentRadio(mode) {
    return form.querySelector(
      '[name="assignment_mode"][value="' +
      mode +
      '"]'
    );
  }

  function assignmentLabel(mode) {
    var radio = assignmentRadio(mode);

    return radio
      ? radio.closest('label')
      : null;
  }

  function tablePanel() {
    return root.querySelector(
      '.pmd-reservation-composer-v1__table-panel'
    );
  }

  function tableSelect() {
    return form.querySelector(
      '[name="tables[]"]'
    );
  }

  function nativeTrigger() {
    return root.querySelector(
      '.pmd-reservation-composer-v1__table-trigger'
    );
  }

  function availabilityResult() {
    var api = window.PMDSmartContextTablesV224;

    if (
      api
      && typeof api.audit === 'function'
    ) {
      try {
        return api.audit();
      } catch (ignore) {
        return null;
      }
    }

    return null;
  }

  function selectedNames() {
    var select = tableSelect();

    if (!select) {
      return [];
    }

    return Array.prototype.slice.call(
      select.options
    ).filter(function (option) {
      return option.selected;
    }).map(function (option) {
      return String(
        option.textContent || ''
      )
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim();
    }).filter(Boolean);
  }

  function recommendedText() {
    var audit = availabilityResult();

    if (
      audit
      && audit.recommendation
    ) {
      var value =
        String(audit.recommendation)
          .replace(
            /^auto assign(?:ment)?\s*[·:–-]?\s*/i,
            ''
          )
          .replace(
            /^auto\s*[·:–-]?\s*/i,
            ''
          )
          .trim();

      if (
        value
        && !/^finding best table/i.test(value)
      ) {
        return value;
      }
    }

    return 'No table found';
  }

  function enforceRecommendationLabel() {
    var label = assignmentLabel('auto');

    if (!label) {
      return;
    }

    var span = label.querySelector('span');

    if (!span) {
      span = document.createElement('span');
      label.appendChild(span);
    }

    var text = recommendedText();

    span.textContent = text;

    label.setAttribute(
      'aria-label',
      text
    );

    label.title = text;

    label.classList.add(
      'pmd-v225-recommendation'
    );

    /*
     * Remove leftover text nodes such as:
     * Auto assign
     * Auto assignment
     */
    Array.prototype.slice.call(
      label.childNodes
    ).forEach(function (node) {
      if (
        node.nodeType === Node.TEXT_NODE
        && /auto\s+assign/i.test(
          String(node.textContent || '')
        )
      ) {
        node.textContent = '';
      }
    });
  }

  function scheduleLabelEnforcement() {
    if (labelTimer) {
      window.clearTimeout(labelTimer);
      labelTimer = null;
    }

    /*
     * One synchronous owner.
     * No delayed correction and therefore no label blink.
     */
    enforceRecommendationLabel();
  }

  function isPanelOpen() {
    var panel = tablePanel();

    return Boolean(
      panel
      && !panel.hidden
      && getComputedStyle(panel).display !== 'none'
    );
  }

  function setPanelOpen(open) {
    var panel = tablePanel();
    var chooseLabel = assignmentLabel('choose');

    if (!panel || !chooseLabel) {
      return;
    }

    panel.hidden = !open;

    panel.classList.toggle(
      'is-open-v225',
      open
    );

    chooseLabel.classList.toggle(
      'is-open-v225',
      open
    );

    chooseLabel.setAttribute(
      'aria-expanded',
      open ? 'true' : 'false'
    );
  }

  function openChooseDropdown(event) {
    var chooseLabel = assignmentLabel('choose');

    if (
      !chooseLabel
      || !chooseLabel.contains(event.target)
    ) {
      return;
    }

    /*
     * This capture-phase handler runs before the old V223
     * click listener. Stopping the event here prevents the
     * old handler from opening and immediately closing it.
     */
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var choose = assignmentRadio('choose');

    if (choose) {
      choose.checked = true;
    }

    setPanelOpen(!isPanelOpen());

    scheduleLabelEnforcement();
  }

  function keepPanelState(event) {
    var panel = tablePanel();
    var chooseLabel = assignmentLabel('choose');

    if (!panel || !chooseLabel) {
      return;
    }

    if (
      chooseLabel.contains(event.target)
      || panel.contains(event.target)
    ) {
      return;
    }

    setPanelOpen(false);
  }

  function cleanChooseLabel() {
    var chooseLabel = assignmentLabel('choose');

    if (!chooseLabel) {
      return;
    }

    var span = chooseLabel.querySelector('span');

    if (span) {
      span.textContent = 'Choose table(s)';
    }

    chooseLabel.setAttribute(
      'aria-haspopup',
      'listbox'
    );
  }

  function apply() {
    cleanChooseLabel();
    scheduleLabelEnforcement();

    var trigger = nativeTrigger();

    if (trigger) {
      trigger.classList.add(
        'pmd-v225-native-trigger-hidden'
      );
    }

    root.classList.add(
      'pmd-composer-v225-ready'
    );
  }

  /*
   * Capture phase is required because V223 already attached
   * its own click listener to the same label.
   */
  root.addEventListener(
    'click',
    openChooseDropdown,
    true
  );

  document.addEventListener(
    'click',
    keepPanelState,
    true
  );

  root.addEventListener(
    'pmd:composer:availability',
    function () {
      scheduleLabelEnforcement();
    }
  );

  form.addEventListener(
    'input',
    scheduleLabelEnforcement
  );

  form.addEventListener(
    'change',
    function (event) {
      scheduleLabelEnforcement();

      /*
       * Do not close the dropdown when selecting several
       * tables. The user may need a merged combination.
       */
      if (
        event.target
        && event.target.name === 'tables[]'
      ) {
        setPanelOpen(true);
      }
    }
  );

  root.addEventListener(
    'shown.bs.modal',
    function () {
      window.requestAnimationFrame(apply);
    }
  );

  apply();

  window.PMDComposerDropdownColumnsV225 = {
    version: VERSION,

    refresh: apply,

    audit: function () {
      return {
        version: VERSION,
        ready: root.classList.contains(
          'pmd-composer-v225-ready'
        ),
        panelOpen: isPanelOpen(),
        recommendation:
          recommendedText(),
        leftColumnWidth:
          root.querySelector(
            '.pmd-composer-grid-v223'
          )
            ? getComputedStyle(
                root.querySelector(
                  '.pmd-composer-grid-v223'
                )
              ).gridTemplateColumns
            : null
      };
    }
  };
}());


/* ============================================================
   PMD_COMPOSER_SOFT_DRAFT_V2426

   - X, Cancel and Escape close immediately
   - unsaved create values survive close/reopen
   - draft is limited to the current browser tab
   - edit mode does not use the create draft
   - successful save clears the draft
   ============================================================ */

(function () {
  'use strict';

  var VERSION = '2.4.2.6';
  var STORAGE_KEY =
    'pmd.reservationComposer.softDraft.v2426';

  var root =
    document.getElementById(
      'pmd-reservation-composer-v1'
    );

  var api =
    window.PMDReservationComposerV1;

  var form =
    root &&
    root.querySelector('form');

  if (
    !root ||
    !api ||
    !form ||
    api.__softDraftV2426
  ) {
    return;
  }

  var originalOpen = api.open;
  var activeSignature = '';
  var restoring = false;
  var touched = false;

  function stringValue(value) {
    return String(
      value == null ? '' : value
    );
  }

  /* PMD_COMPOSER_TABLE_DRAFT_EXCLUSION_V1_3_20260815
   * Keep the useful soft draft for guest/name/contact/time/comment fields,
   * but NEVER persist table assignment. Every new open starts from fresh AUTO
   * or from the user's current explicit Floor/table context. */
  function isTableDraftField(fieldOrName) {
    var name = typeof fieldOrName === 'string'
      ? fieldOrName
      : (fieldOrName && fieldOrName.name);

    return (
      name === 'assignment_mode' ||
      name === 'tables[]' ||
      name === 'pmd_table_features[]' ||
      name === 'pmd_floor_id' ||
      name === 'pmd_floor_name' ||
      name === 'pmd_floor_locked'
    );
  }

  function createSignature(context) {
    context = context || {};

    if (
      context.reservationId ||
      stringValue(context.mode).toLowerCase() ===
        'edit'
    ) {
      return '';
    }

    return (
      'create|' +
      stringValue(context.selectedDate)
    );
  }

  function readDraft() {
    try {
      var raw =
        sessionStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) return null;

      var draft =
        JSON.parse(raw);

      if (
        !draft ||
        draft.version !== VERSION ||
        !Array.isArray(draft.fields)
      ) {
        return null;
      }

      return draft;
    } catch (error) {
      return null;
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(
        STORAGE_KEY
      );
    } catch (error) {}

    touched = false;

    root.removeAttribute(
      'data-pmd-composer-draft-restored'
    );
  }

  function serialize() {
    return Array.from(form.elements)
      .filter(function (field) {
        return Boolean(
          field &&
          field.name &&
          !field.disabled &&
          !isTableDraftField(field)
        );
      })
      .map(function (field) {
        var type =
          stringValue(
            field.type ||
            field.tagName
          ).toLowerCase();

        var record = {
          name: field.name,
          type: type
        };

        if (
          type === 'checkbox' ||
          type === 'radio'
        ) {
          record.value =
            stringValue(field.value);

          record.checked =
            Boolean(field.checked);

          return record;
        }

        if (type === 'select-multiple') {
          record.values =
            Array.from(field.options)
              .filter(function (option) {
                return option.selected;
              })
              .map(function (option) {
                return stringValue(
                  option.value
                );
              });

          return record;
        }

        record.value =
          stringValue(field.value);

        return record;
      });
  }

  function capture() {
    if (
      restoring ||
      !activeSignature ||
      !touched
    ) {
      return false;
    }

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: VERSION,
          signature: activeSignature,
          savedAt: Date.now(),
          fields: serialize()
        })
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function restore(signature) {
    var draft = readDraft();

    if (
      !signature ||
      !draft ||
      draft.signature !== signature
    ) {
      return false;
    }

    restoring = true;

    try {
      Array.from(form.elements)
        .forEach(function (field) {
          if (
            !field ||
            !field.name ||
            field.disabled ||
            isTableDraftField(field)
          ) {
            return;
          }

          var type =
            stringValue(
              field.type ||
              field.tagName
            ).toLowerCase();

          var records =
            draft.fields.filter(
              function (record) {
                return (
                  record &&
                  record.name === field.name
                );
              }
            );

          if (!records.length) {
            return;
          }

          if (
            type === 'checkbox' ||
            type === 'radio'
          ) {
            var matching =
              records.find(
                function (record) {
                  return (
                    record.type === type &&
                    stringValue(record.value) ===
                      stringValue(field.value)
                  );
                }
              );

            if (matching) {
              field.checked =
                Boolean(
                  matching.checked
                );
            }

            return;
          }

          if (type === 'select-multiple') {
            var selected =
              Array.isArray(records[0].values)
                ? records[0].values.map(
                    stringValue
                  )
                : [];

            Array.from(field.options)
              .forEach(function (option) {
                option.selected =
                  selected.indexOf(
                    stringValue(option.value)
                  ) >= 0;
              });

            return;
          }

          field.value =
            stringValue(
              records[0].value
            );
        });

      /*
       * Notify existing Composer UI modules that fields changed.
       * location_id is excluded because its legacy listener
       * starts a full reload of location-dependent data.
       */
      Array.from(form.elements)
        .forEach(function (field) {
          if (
            !field ||
            !field.name ||
            field.disabled ||
            field.name === 'location_id' ||
            isTableDraftField(field)
          ) {
            return;
          }

          var type =
            stringValue(
              field.type ||
              field.tagName
            ).toLowerCase();

          var eventType =
            (
              type === 'checkbox' ||
              type === 'radio' ||
              type === 'select-one' ||
              type === 'select-multiple'
            )
              ? 'change'
              : 'input';

          field.dispatchEvent(
            new Event(
              eventType,
              {bubbles: true}
            )
          );
        });

      touched = true;

      root.setAttribute(
        'data-pmd-composer-draft-restored',
        'v2426'
      );

      return true;
    } finally {
      restoring = false;
    }
  }

  function reapplyExplicitHourContext(context) {
    context = context || {};
    if (
      stringValue(context.mode).toLowerCase() !== 'create' ||
      stringValue(context.source).toLowerCase() !== 'hour-slot' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(stringValue(context.selectedDate)) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(stringValue(context.selectedTime).slice(0,5))
    ) {
      return false;
    }

    var date = form.elements.reserve_date;
    var time = form.elements.reserve_time;
    var duration = form.elements.duration;
    if (date) date.value = stringValue(context.selectedDate);
    if (time) time.value = stringValue(context.selectedTime).slice(0,5);

    if (
      duration
      && Number(context.duration || 0) > 0
    ) {
      var explicitDuration = String(
        Math.round(Number(context.duration))
      );
      var durationAllowed = duration.tagName === 'SELECT'
        ? Array.prototype.some.call(
            duration.options,
            function (option) {
              return String(option.value) === explicitDuration;
            }
          )
        : true;

      if (durationAllowed) {
        duration.value = explicitDuration;
      }
    }

    if (
      window.PMDReservationComposerFutureOnlyV1 &&
      typeof window.PMDReservationComposerFutureOnlyV1.apply === 'function'
    ) {
      window.PMDReservationComposerFutureOnlyV1.apply(true);
    }
    if (
      window.PMDComposerStableJadeV221 &&
      typeof window.PMDComposerStableJadeV221.refresh === 'function'
    ) {
      window.PMDComposerStableJadeV221.refresh();
    }
    return true;
  }

  function markTouched() {
    if (
      restoring ||
      !activeSignature
    ) {
      return;
    }

    touched = true;
    capture();
  }

  form.addEventListener(
    'input',
    markTouched,
    true
  );

  form.addEventListener(
    'change',
    markTouched,
    true
  );

  api.open = function (
    context,
    origin
  ) {
    activeSignature =
      createSignature(context);

    touched = false;

    root.removeAttribute(
      'data-pmd-composer-draft-restored'
    );

    return Promise
      .resolve(
        originalOpen.call(
          api,
          context,
          origin
        )
      )
      .then(function (result) {
        if (activeSignature) {
          restore(activeSignature);
        }
        /* Explicit Hour-row intent wins over a same-day soft draft time. */
        reapplyExplicitHourContext(context);

        return result;
      });
  };

  api.__softDraftV2426 = true;

  window.addEventListener(
    'pmd:reservation-saved',
    clearDraft
  );

  window.PMDReservationComposerSoftDraftV2426 = {
    version: VERSION,
    capture: capture,
    clear: clearDraft,

    restore: function () {
      return restore(activeSignature);
    },

    audit: function () {
      var draft = readDraft();

      return {
        version: VERSION,
        activeSignature: activeSignature,
        touched: touched,
        hasDraft: Boolean(draft),

        draftSignature:
          draft
            ? draft.signature
            : null,

        restored:
          root.getAttribute(
            'data-pmd-composer-draft-restored'
          ) === 'v2426',

        tableAssignmentPersisted: false
      };
    }
  };

  console.info(
    '[PMD Composer Soft Draft V2.4.2.6] Ready',
    window.PMDReservationComposerSoftDraftV2426
  );
})();

/* PMD_COMPOSER_SOFT_DRAFT_V2426_END */


/*
 * PMD_COMPOSER_SMART_TABLE_CORRECTNESS_20260807
 *
 * Auto recommendation contract:
 * - current availability only
 * - recommended IDs filtered by available IDs
 * - no previous selected-table fallback
 * - stale async responses ignored
 * - button text = Table name(s) OR No table found
 */


/*
 * PMD_COMPOSER_SINGLE_RECOMMENDATION_AUTHORITY_20260807
 *
 * Recommendation label ownership:
 *
 * V224 availability result = source of truth
 * V223 generic Auto text   = disabled
 * V225 delayed rewrite     = disabled
 *
 * Visible states:
 *
 *   Tisch / Table N
 *   No table found
 */

/*
 * PMD_RESERVATION_REAL_TABLE_DROPDOWN_V1_20260807
 *
 * AUTO column:
 *   recommendation only
 *
 * CHOOSE TABLE(S):
 *   authoritative manual picker generated from the
 *   native [name="tables[]"] select.
 *
 * Do NOT reduce the manual picker to recommendedTableIds.
 */
(function () {
  'use strict';

  var ROOT_ID = 'pmd-reservation-composer-v1';

  function boot() {
    var root = document.getElementById(ROOT_ID);

    if (!root) {
      return false;
    }

    var form = root.querySelector('form');

    if (!form) {
      return false;
    }

    var chooseRadio = form.querySelector(
      '[name="assignment_mode"][value="choose"]'
    );

    var chooseLabel = chooseRadio
      ? chooseRadio.closest('label')
      : null;

    var select = form.querySelector(
      '[name="tables[]"]'
    );

    var panel = root.querySelector(
      '.pmd-reservation-composer-v1__table-panel'
    );

    if (
      !chooseRadio ||
      !chooseLabel ||
      !select ||
      !panel
    ) {
      return false;
    }

    if (
      chooseLabel.dataset
        .pmdRealTableDropdownV1 === '1'
    ) {
      return true;
    }

    chooseLabel.dataset
      .pmdRealTableDropdownV1 = '1';

    root.classList.add(
      'pmd-real-table-dropdown-v1'
    );

    panel.classList.add(
      'pmd-real-table-dropdown-v1__panel'
    );

    /*
     * Stop previous dropdown authorities from replacing
     * the manual catalog with only the recommendation.
     */
    chooseLabel.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        chooseRadio.checked = true;

        chooseRadio.dispatchEvent(
          new Event(
            'change',
            { bubbles: true }
          )
        );

        render();

        panel.hidden = !panel.hidden;

        if (!panel.hidden) {
          positionPanelV2();
        }

        chooseLabel.setAttribute(
          'aria-expanded',
          panel.hidden ? 'false' : 'true'
        );
      },
      true
    );

    function cleanLabel(option) {
      var text = String(
        option.textContent || ''
      ).trim();

      return text || (
        'Table ' + option.value
      );
    }

    /*
     * PMD_MANUAL_TABLE_REAL_DROPDOWN_V2_20260807
     *
     * Manual catalog contains ONLY tables confirmed free by
     * backend for the manual availability window.
     *
     * Never temporarily show every physical table.
     */
    function enabledOptions() {
      var availability =
        window.PMDManualTableAvailabilityV2;

      var availableIds =
        availability &&
        Array.isArray(
          availability.manualAvailableTableIds
        )
          ? availability
              .manualAvailableTableIds
              .map(Number)
              .filter(function (id) {
                return id > 0;
              })
          : [];

      return Array.prototype.slice
        .call(select.options)
        .filter(function (option) {
          var id = Number(option.value);

          return (
            id > 0 &&
            !option.disabled &&
            availableIds.indexOf(id) >= 0
          );
        });
    }

    function selectedCount() {
      return enabledOptions().filter(
        function (option) {
          return option.selected;
        }
      ).length;
    }

    /*
     * PMD_MANUAL_TABLE_REAL_DROPDOWN_V2_20260807
     *
     * Position the manual list like a REAL dropdown:
     * floating under Choose table(s), without increasing
     * Composer height.
     */
    function positionPanelV2() {
      var rect =
        chooseLabel.getBoundingClientRect();

      var viewportWidth =
        window.innerWidth ||
        document.documentElement.clientWidth;

      var width = Math.max(
        280,
        Math.min(
          rect.width,
          viewportWidth - 32
        )
      );

      var left = rect.left;

      if (left + width > viewportWidth - 16) {
        left =
          viewportWidth -
          width -
          16;
      }

      panel.style.position = 'fixed';
      panel.style.left =
        Math.max(16, left) + 'px';

      panel.style.top =
        (rect.bottom + 8) + 'px';

      panel.style.width =
        width + 'px';

      panel.style.zIndex =
        '2147483000';
    }

    function render() {
      var options = enabledOptions();

      panel.innerHTML = '';

      panel.setAttribute(
        'data-pmd-real-table-list',
        '1'
      );

      if (!options.length) {
        var empty = document.createElement(
          'div'
        );

        empty.className =
          'pmd-real-table-dropdown-v1__empty';

        var availability =
          window.PMDManualTableAvailabilityV2;

        empty.textContent =
          availability
            ? 'No table is available for this time'
            : 'Checking available tables…';

        panel.appendChild(empty);

        return;
      }

      var list = document.createElement('div');

      list.className =
        'pmd-real-table-dropdown-v1__list';

      options.forEach(function (option) {
        var button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'pmd-real-table-dropdown-v1__option';

        if (option.selected) {
          button.classList.add(
            'is-selected'
          );
        }

        button.setAttribute(
          'data-table-id',
          option.value
        );

        var text =
          document.createElement('span');

        text.className =
          'pmd-real-table-dropdown-v1__name';

        /*
         * Native option already contains capacity:
         *
         * Table 4 (4–5)
         *
         * Keep it compact and readable.
         */
        text.textContent =
          cleanLabel(option);

        var check =
          document.createElement('span');

        check.className =
          'pmd-real-table-dropdown-v1__check';

        check.textContent =
          option.selected ? '✓' : '';

        button.appendChild(text);
        button.appendChild(check);

        button.addEventListener(
          'click',
          function (event) {
            event.preventDefault();
            event.stopPropagation();

            /*
             * Multi-table manual assignment remains supported.
             */
            option.selected =
              !option.selected;

            chooseRadio.checked = true;

            select.dispatchEvent(
              new Event(
                'input',
                { bubbles: true }
              )
            );

            select.dispatchEvent(
              new Event(
                'change',
                { bubbles: true }
              )
            );

            render();

            panel.hidden = false;

            chooseLabel.setAttribute(
              'aria-expanded',
              'true'
            );
          }
        );

        list.appendChild(button);
      });

      panel.appendChild(list);

      /*
       * Do not replace the Choose table(s) label
       * with the chosen/recommended table.
       */
      var labelText =
        chooseLabel.querySelector('span');

      if (labelText) {
        labelText.textContent =
          selectedCount() > 0
            ? 'Choose table(s)'
            : 'Choose table(s)';
      }
    }

    /*
     * Keep catalog synced if another composer authority
     * changes the native table list.
     */
    var observer =
      new MutationObserver(function () {
        if (!panel.hidden) {
          render();
        }
      });

    observer.observe(
      select,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'disabled',
          'selected'
        ]
      }
    );

    select.addEventListener(
      'change',
      function () {
        if (!panel.hidden) {
          render();
        }
      }
    );


    document.addEventListener(
      'pmd:manual-table-availability-v2',
      function () {
        if (!panel.hidden) {
          render();
          positionPanelV2();
        }
      }
    );

    window.addEventListener(
      'resize',
      function () {
        if (!panel.hidden) {
          positionPanelV2();
        }
      }
    );

    window.addEventListener(
      'scroll',
      function () {
        if (!panel.hidden) {
          positionPanelV2();
        }
      },
      true
    );

    /*
     * Initial panel must also contain ALL native options,
     * not only the automatic recommendation.
     */
    render();

    window.PMDReservationRealTableDropdownV1 = {
      refresh: render,

      audit: function () {
        return {
          nativeTableCount:
            enabledOptions().length,

          renderedTableCount:
            panel.querySelectorAll(
              '.pmd-real-table-dropdown-v1__option'
            ).length,

          selectedTableIds:
            enabledOptions()
              .filter(function (option) {
                return option.selected;
              })
              .map(function (option) {
                return Number(
                  option.value
                );
              })
        };
      }
    };

    return true;
  }

  if (!boot()) {
    var timer = window.setInterval(
      function () {
        if (boot()) {
          window.clearInterval(timer);
        }
      },
      100
    );

    window.setTimeout(
      function () {
        window.clearInterval(timer);
      },
      10000
    );
  }
}());


/*
 * PMD_MANUAL_TABLE_DROPDOWN_UI_V3_20260807
 *
 * Presentation/controller authority only.
 *
 * Backend manualAvailableTableIds remains authoritative.
 * AUTO assignment remains untouched.
 */
(function () {
    'use strict';

    var ROOT_SELECTOR =
        '#pmd-reservation-composer-v1';

    var PANEL_ID =
        'pmd-manual-table-dropdown-v3';

    var OPEN_CLASS =
        'pmd-manual-dropdown-open-v3';

    var explicitOpen = false;

    function clean(value) {
        return String(
            value == null ? '' : value
        ).trim();
    }

    function root() {
        return document.querySelector(
            ROOT_SELECTOR
        );
    }

    function form() {
        var node = root();

        return node
            ? node.querySelector('form')
            : null;
    }

    function nativeSelect() {
        var currentForm = form();

        return currentForm
            ? currentForm.querySelector(
                '[name="tables[]"]'
            )
            : null;
    }

    function findChooseTrigger() {
        var node = root();

        if (!node) {
            return null;
        }

        /*
         * PMD_MANUAL_TABLE_TRIGGER_LOCALE_FIX_V1_20260815
         *
         * The visible label is translated (for example
         * "Tisch(e) auswählen" in DE), so text is not a stable
         * authority for the manual-table trigger.
         *
         * The canonical assignment_mode=choose radio is the
         * structural owner in every locale. Resolve its label
         * first; keep text lookup only as a legacy fallback.
         */
        var currentForm = form();

        var chooseInput = currentForm
            ? currentForm.querySelector(
                '[name="assignment_mode"][value="choose"]'
            )
            : null;

        var chooseLabel = chooseInput
            ? chooseInput.closest('label')
            : null;

        if (chooseLabel) {
            return chooseLabel;
        }

        var candidates =
            Array.prototype.slice.call(
                node.querySelectorAll(
                    'button, label, [role="button"]'
                )
            );

        return candidates.find(
            function (candidate) {
                var text =
                    clean(candidate.textContent)
                        .toLowerCase();

                return (
                    text === 'choose table(s)' ||
                    text.indexOf(
                        'choose table(s)'
                    ) >= 0 ||
                    text === 'tisch(e) auswählen' ||
                    text.indexOf(
                        'tisch(e) auswählen'
                    ) >= 0
                );
            }
        ) || null;
    }

    /*
     * Hide OLD inline manual-table presentation.
     *
     * Do NOT hide:
     * - auto recommendation button
     * - native select
     * - our V3 dropdown
     */
    function hideLegacyPicker() {
        var node = root();

        if (!node) {
            return;
        }

        var oldOptions =
            node.querySelectorAll(
                '.pmd-reservation-composer-v1__table-option'
            );

        oldOptions.forEach(
            function (option) {
                option.style.setProperty(
                    'display',
                    'none',
                    'important'
                );
            }
        );

        [
            '.pmd-reservation-composer-v1__table-empty-v2291',
            '.pmd-real-table-dropdown-v1__panel'
        ].forEach(
            function (selector) {
                node.querySelectorAll(
                    selector
                ).forEach(
                    function (element) {
                        element.style.setProperty(
                            'display',
                            'none',
                            'important'
                        );
                    }
                );
            }
        );

        /*
         * If the old option container is now empty
         * visually, collapse it as well.
         */
        var possibleContainers =
            node.querySelectorAll(
                [
                    '.pmd-reservation-composer-v1__table-options',
                    '.pmd-reservation-composer-v1__table-picker-options'
                ].join(',')
            );

        possibleContainers.forEach(
            function (container) {
                container.style.setProperty(
                    'display',
                    'none',
                    'important'
                );
            }
        );
    }

    function ensurePanel() {
        var existing =
            document.getElementById(
                PANEL_ID
            );

        if (existing) {
            return existing;
        }

        var panel =
            document.createElement('div');

        panel.id = PANEL_ID;

        panel.className =
            'pmd-manual-table-dropdown-v3';

        panel.hidden = true;

        /*
         * Append to body so it NEVER changes
         * Composer layout/height.
         */
        document.body.appendChild(panel);

        return panel;
    }

    function availableIds() {
        var availability =
            window.PMDManualTableAvailabilityV2;

        if (
            !availability ||
            !Array.isArray(
                availability
                    .manualAvailableTableIds
            )
        ) {
            return [];
        }

        return availability
            .manualAvailableTableIds
            .map(Number)
            .filter(
                function (id) {
                    return id > 0;
                }
            );
    }

    function selectedIds() {
        var select =
            nativeSelect();

        if (!select) {
            return [];
        }

        return Array.prototype.slice
            .call(select.options)
            .filter(
                function (option) {
                    return (
                        option.selected &&
                        Number(option.value) > 0
                    );
                }
            )
            .map(
                function (option) {
                    return Number(
                        option.value
                    );
                }
            );
    }

    function labelForOption(option) {
        var label =
            clean(option.textContent);

        if (label) {
            return label;
        }

        return (
            'Table ' +
            String(option.value)
        );
    }

    function positionPanel() {
        var panel =
            ensurePanel();

        var trigger =
            findChooseTrigger();

        if (
            !trigger ||
            panel.hidden
        ) {
            return;
        }

        var rect =
            trigger.getBoundingClientRect();

        var viewportWidth =
            window.innerWidth ||
            document.documentElement
                .clientWidth;

        var preferredWidth =
            Math.max(
                300,
                rect.width
            );

        var width =
            Math.min(
                preferredWidth,
                viewportWidth - 32
            );

        var left =
            rect.left;

        if (
            left + width >
            viewportWidth - 16
        ) {
            left =
                viewportWidth -
                width -
                16;
        }

        left =
            Math.max(
                16,
                left
            );

        panel.style.left =
            Math.round(left) + 'px';

        panel.style.top =
            Math.round(
                rect.bottom + 8
            ) + 'px';

        panel.style.width =
            Math.round(width) + 'px';
    }

    function renderPanel() {
        var panel =
            ensurePanel();

        var select =
            nativeSelect();

        if (!select) {
            panel.innerHTML = '';
            return;
        }

        var ids =
            availableIds();

        var selected =
            selectedIds();

        panel.innerHTML = '';

        if (!ids.length) {
            var empty =
                document.createElement(
                    'div'
                );

            empty.className =
                'pmd-manual-table-dropdown-v3__empty';

            empty.textContent =
                window.PMDManualTableAvailabilityV2
                    ? 'No available tables'
                    : 'Checking available tables…';

            panel.appendChild(
                empty
            );

            return;
        }

        ids.forEach(
            function (id) {
                var option =
                    Array.prototype.slice
                        .call(
                            select.options
                        )
                        .find(
                            function (
                                current
                            ) {
                                return (
                                    Number(
                                        current.value
                                    ) === id
                                );
                            }
                        );

                if (!option) {
                    return;
                }

                var row =
                    document.createElement(
                        'button'
                    );

                row.type =
                    'button';

                row.className =
                    'pmd-manual-table-dropdown-v3__row';

                if (
                    selected.indexOf(id) >= 0
                ) {
                    row.classList.add(
                        'is-selected'
                    );
                }

                var text =
                    document.createElement(
                        'span'
                    );

                text.className =
                    'pmd-manual-table-dropdown-v3__label';

                text.textContent =
                    labelForOption(
                        option
                    );

                var check =
                    document.createElement(
                        'span'
                    );

                check.className =
                    'pmd-manual-table-dropdown-v3__check';

                check.textContent =
                    selected.indexOf(id) >= 0
                        ? '✓'
                        : '';

                row.appendChild(text);
                row.appendChild(check);

                row.addEventListener(
                    'click',
                    function (event) {
                        event.preventDefault();
                        event.stopPropagation();

                        option.selected =
                            !option.selected;

                        select.dispatchEvent(
                            new Event(
                                'change',
                                {
                                    bubbles: true
                                }
                            )
                        );

                        renderPanel();
                        positionPanel();
                    }
                );

                panel.appendChild(row);
            }
        );
    }

    function closePanel() {
        explicitOpen = false;

        var panel =
            ensurePanel();

        panel.hidden = true;

        document.documentElement
            .classList.remove(
                OPEN_CLASS
            );

        var trigger =
            findChooseTrigger();

        if (trigger) {
            trigger.setAttribute(
                'aria-expanded',
                'false'
            );
        }
    }

    function openPanel() {
        explicitOpen = true;

        hideLegacyPicker();
        renderPanel();

        var panel =
            ensurePanel();

        panel.hidden = false;

        document.documentElement
            .classList.add(
                OPEN_CLASS
            );

        var trigger =
            findChooseTrigger();

        if (trigger) {
            trigger.setAttribute(
                'aria-expanded',
                'true'
            );
        }

        positionPanel();
    }

    function togglePanel() {
        if (explicitOpen) {
            closePanel();
        } else {
            openPanel();
        }
    }

    /*
     * IMPORTANT:
     * Capture phase owns the click BEFORE
     * old picker handlers can auto-expand
     * their inline cards.
     */
    document.addEventListener(
        'click',
        function (event) {
            var trigger =
                findChooseTrigger();

            if (!trigger) {
                return;
            }

            if (
                event.target === trigger ||
                trigger.contains(
                    event.target
                )
            ) {
                event.preventDefault();

                /*
                 * PMD_MANUAL_TABLE_SELECTION_CANONICAL_FIX_V1_20260815
                 *
                 * V3 owns the capture-phase click and stops propagation.
                 * That means later V4/V5 click listeners cannot change the
                 * assignment mode or force a fresh availability request.
                 *
                 * Own those two actions here BEFORE stopping the click:
                 * - Choose table(s) really selects assignment_mode=choose
                 * - the canonical backend availability request is forced now
                 *
                 * No synthetic table list is introduced. The dropdown still
                 * renders only backend manualAvailableTableIds.
                 */
                var currentForm = form();
                var chooseRadio = currentForm
                    ? currentForm.querySelector(
                        '[name="assignment_mode"][value="choose"]'
                    )
                    : null;

                if (chooseRadio) {
                    chooseRadio.checked = true;
                    chooseRadio.dispatchEvent(
                        new Event(
                            'change',
                            { bubbles: true }
                        )
                    );
                }

                var composerRoot = root();

                if (composerRoot) {
                    composerRoot.dispatchEvent(
                        new CustomEvent(
                            'pmd:manual-table-force-availability-v4'
                        )
                    );
                }

                event.stopPropagation();
                event.stopImmediatePropagation();

                togglePanel();

                return;
            }

            var panel =
                ensurePanel();

            if (
                explicitOpen &&
                !panel.contains(
                    event.target
                )
            ) {
                closePanel();
            }
        },
        true
    );

    /*
     * Composer open:
     * dropdown MUST ALWAYS start closed.
     */
    document.addEventListener(
        'shown.bs.modal',
        function () {
            window.setTimeout(
                function () {
                    closePanel();
                    hideLegacyPicker();
                },
                0
            );
        }
    );

    /*
     * Availability refresh:
     *
     * Update rows only if USER currently
     * has dropdown open.
     *
     * Never auto-open it.
     */
    document.addEventListener(
        'pmd:manual-table-availability-v2',
        function () {
            hideLegacyPicker();

            if (
                explicitOpen
            ) {
                renderPanel();
                positionPanel();
            } else {
                closePanel();
            }
        }
    );

    window.addEventListener(
        'resize',
        function () {
            if (explicitOpen) {
                positionPanel();
            }
        }
    );

    window.addEventListener(
        'scroll',
        function () {
            if (explicitOpen) {
                positionPanel();
            }
        },
        true
    );

    /*
     * Existing Composer authorities may
     * redraw their picker after availability.
     *
     * Only suppress their VISUAL output.
     * No availability logic is modified.
     */
    var observer =
        new MutationObserver(
            function () {
                hideLegacyPicker();

                if (
                    explicitOpen
                ) {
                    positionPanel();
                }
            }
        );

    function boot() {
        var node =
            root();

        if (!node) {
            return false;
        }

        closePanel();
        hideLegacyPicker();

        observer.observe(
            node,
            {
                childList: true,
                subtree: true
            }
        );

        console.info(
            '[PMD Manual Table Dropdown UI V3] Ready',
            {
                manualAvailability:
                    Boolean(
                        window
                            .PMDManualTableAvailabilityV2
                    )
            }
        );

        return true;
    }

    if (!boot()) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {
                once: true
            }
        );

        window.setTimeout(
            boot,
            500
        );
    }

    window.PMDManualTableDropdownUIV3 = {
        open: openPanel,
        close: closePanel,
        refresh: function () {
            hideLegacyPicker();

            if (
                explicitOpen
            ) {
                renderPanel();
                positionPanel();
            }
        },
        audit: function () {
            var trigger = findChooseTrigger();

            return {
                triggerFound: Boolean(trigger),
                triggerText: trigger
                    ? clean(trigger.textContent)
                    : '',
                triggerStrategy:
                    'assignment_mode_choose_structure_first',
                explicitOpen: explicitOpen,
                panelExists: Boolean(
                    document.getElementById(
                        PANEL_ID
                    )
                )
            };
        }
    };
})();


/*
 * PMD_MANUAL_TABLE_FIRST_CLICK_FORCE_V4_20260807
 *
 * First explicit click on "Choose table(s)" must be sufficient
 * to obtain the current backend manual availability.
 *
 * No field mutation is required.
 */
(function () {
    'use strict';

    function clean(value) {
        return String(
            value == null ? '' : value
        ).trim().toLowerCase();
    }

    document.addEventListener(
        'click',
        function (event) {
            var root =
                document.getElementById(
                    'pmd-reservation-composer-v1'
                );

            if (!root) {
                return;
            }

            var target =
                event.target &&
                event.target.closest
                    ? event.target.closest(
                        'button, label, [role="button"]'
                    )
                    : null;

            if (
                !target ||
                !root.contains(target)
            ) {
                return;
            }

            var text =
                clean(target.textContent);

            if (
                text !== 'choose table(s)' &&
                text.indexOf(
                    'choose table(s)'
                ) < 0
            ) {
                return;
            }

            /*
             * Existing Choose control performs its own normal
             * state change first.
             *
             * On next task, ask canonical Composer for current
             * manual availability.
             */
            window.setTimeout(
                function () {
                    root.dispatchEvent(
                        new CustomEvent(
                            'pmd:manual-table-force-availability-v4'
                        )
                    );
                },
                0
            );
        },
        false
    );
}());

/*
 * PMD_COMPOSER_REAL_AVAILABILITY_AUTHORITY_V5_20260807
 *
 * Reservation table assignment has exactly ONE state authority:
 *
 * guest_num
 * duration
 * reserve_date
 * reserve_time
 *
 *      ↓
 *
 * canonical onCheckReservationAvailability
 *
 *      ↓
 *
 * AUTO:
 *     recommendedTableIds
 *
 * MANUAL:
 *     manualAvailableTableIds
 *
 * No synthetic table catalog.
 * No cached floor table status.
 * No guessed 1..20 table list.
 */
(function () {
    'use strict';

    var ROOT_SELECTOR = '#pmd-reservation-composer-v1';
    var PANEL_ID = 'pmd-manual-table-dropdown-v3';

    var WATCHED = [
        'guest_num',
        'duration',
        'reserve_date',
        'reserve_time'
    ];

    function root() {
        return document.querySelector(ROOT_SELECTOR);
    }

    function form() {
        var node = root();

        return node
            ? node.querySelector('form')
            : null;
    }

    function select() {
        var currentForm = form();

        return currentForm
            ? currentForm.querySelector('[name="tables[]"]')
            : null;
    }

    function positiveIds(values) {
        return (Array.isArray(values) ? values : [])
            .map(Number)
            .filter(function (value) {
                return Number.isFinite(value) && value > 0;
            })
            .filter(function (value, index, all) {
                return all.indexOf(value) === index;
            });
    }

    function availability() {
        var value =
            window.PMDManualTableAvailabilityV2;

        return (
            value &&
            typeof value === 'object'
        )
            ? value
            : null;
    }

    function nativeOptionById(id) {
        var nativeSelect = select();

        if (!nativeSelect) {
            return null;
        }

        return Array.prototype
            .slice.call(nativeSelect.options)
            .find(function (option) {
                return Number(option.value) === Number(id);
            }) || null;
    }

    function nativeLabel(id) {
        var option = nativeOptionById(id);

        return option
            ? String(option.textContent || '').trim()
            : '';
    }

    function realManualIds() {
        var state = availability();

        if (
            !state ||
            !Array.isArray(
                state.manualAvailableTableIds
            )
        ) {
            return [];
        }

        return positiveIds(
            state.manualAvailableTableIds
        ).filter(function (id) {
            /*
             * CRITICAL:
             *
             * A table is allowed into the dropdown ONLY if the
             * canonical native Composer catalog contains that
             * physical table ID.
             *
             * This prevents stale/synthetic IDs such as 13..20
             * from entering the UI.
             */
            return Boolean(nativeOptionById(id));
        });
    }

    function realRecommendedIds() {
        var state = availability();

        if (
            !state ||
            !Array.isArray(
                state.recommendedTableIds
            )
        ) {
            return [];
        }

        return positiveIds(
            state.recommendedTableIds
        ).filter(function (id) {
            return Boolean(nativeOptionById(id));
        });
    }

    function chooseTrigger() {
        var node = root();

        if (!node) {
            return null;
        }

        /* PMD_RESERVATIONSLAB_VISIBLE_CHOOSE_CONTEXT_V1_2
         * Do not identify the control by its mutable visible text. When a
         * Floor table is selected, the label intentionally becomes Table N.
         */
        var currentForm = form();
        var chooseInput = currentForm
            ? currentForm.querySelector(
                '[name="assignment_mode"][value="choose"]'
            )
            : null;
        var chooseLabel = chooseInput
            ? chooseInput.closest('label')
            : null;

        if (chooseLabel) {
            return chooseLabel;
        }

        return Array.prototype
            .slice.call(
                node.querySelectorAll(
                    'button, label, [role="button"]'
                )
            )
            .find(function (candidate) {
                return (
                    String(
                        candidate.textContent || ''
                    )
                        .trim()
                        .toLowerCase()
                        .indexOf(
                            'choose table(s)'
                        ) >= 0
                );
            }) || null;
    }

    function autoRadio() {
        var currentForm = form();

        return currentForm
            ? currentForm.querySelector(
                '[name="assignment_mode"][value="auto"]'
            )
            : null;
    }

    function chooseRadio() {
        var currentForm = form();

        return currentForm
            ? currentForm.querySelector(
                '[name="assignment_mode"][value="choose"]'
            )
            : null;
    }

    function selectedMode() {
        var currentForm = form();

        if (!currentForm) {
            return '';
        }

        var checked =
            currentForm.querySelector(
                '[name="assignment_mode"]:checked'
            );

        return checked
            ? String(checked.value || '')
            : '';
    }

    function autoButton() {
        var node = root();

        if (!node) {
            return null;
        }

        var auto =
            autoRadio();

        if (!auto) {
            return null;
        }

        var label =
            auto.closest('label');

        if (
            label &&
            label.textContent
        ) {
            return label;
        }

        return null;
    }

    function renderAuto() {
        var state = availability();
        var ids = realRecommendedIds();
        var control = autoButton();

        if (!control) {
            return;
        }

        /*
         * Do not present a stale recommendation as valid.
         */
        if (!state || !ids.length) {
            return;
        }

        var labels = ids
            .map(nativeLabel)
            .filter(Boolean);

        if (!labels.length) {
            return;
        }

        /*
         * Preserve any existing structure where possible.
         * Update visible text node only.
         */
        var textNodes =
            Array.prototype.slice
                .call(control.childNodes)
                .filter(function (node) {
                    return node.nodeType === 3;
                });

        if (textNodes.length) {
            textNodes[0].nodeValue =
                ' ' + labels.join(' + ') + ' ';
        }
    }

    /* Manual dropdown DOM is owned exclusively by PMD_MANUAL_TABLE_DROPDOWN_UI_V3. */

    function renderFromCurrentAvailability() {
        /* V3 is the ONE manual dropdown DOM owner. */
        renderAuto();
    }

    /* The canonical Composer emits one event after applyAvailability(). */
    document.addEventListener(
        'pmd:manual-table-availability-v2',
        renderFromCurrentAvailability
    );

    /*
     * Refresh availability ONLY when the 4 fields that actually
     * affect a reservation table change.
     *
     * Name / telephone / email / comment remain irrelevant.
     */
    document.addEventListener(
        'change',
        function (event) {
            var currentForm = form();

            if (
                !currentForm ||
                !event.target ||
                !currentForm.contains(
                    event.target
                )
            ) {
                return;
            }

            if (
                WATCHED.indexOf(
                    String(
                        event.target.name || ''
                    )
                ) < 0
            ) {
                return;
            }

            /*
             * Existing Composer listeners own the actual request.
             *
             * We clear only stale presentation here so the UI
             * cannot show yesterday/previous-input availability
             * while a new availability result is pending.
             */
            window.PMDManualTableAvailabilityV2 =
                null;

            var panel =
                document.getElementById(
                    PANEL_ID
                );

            if (panel && !panel.hidden) {
                panel.innerHTML =
                    '<div class="pmd-manual-table-dropdown-v3__empty">' +
                    'Checking available tables…' +
                    '</div>';
            }
        },
        true
    );

    /*
     * Clicking the manual button must use the current 4 field
     * values. Existing V4 force-request authority performs the
     * canonical backend request.
     *
     * We do not construct tables locally.
     */
    document.addEventListener(
        'click',
        function (event) {
            var trigger =
                chooseTrigger();

            if (
                !trigger ||
                !(
                    event.target === trigger ||
                    trigger.contains(
                        event.target
                    )
                )
            ) {
                return;
            }

            var choose =
                chooseRadio();

            if (choose) {
                choose.checked = true;
                choose.dispatchEvent(
                    new Event(
                        'change',
                        {
                            bubbles: true
                        }
                    )
                );
            }

            /*
             * Remove stale table display immediately.
             */
            window.PMDManualTableAvailabilityV2 =
                null;
        },
        true
    );

    window.PMDComposerRealAvailabilityV5 = {
        audit: function () {
            var state = availability();

            return {
                version:
                    'PMD_COMPOSER_REAL_AVAILABILITY_AUTHORITY_V5_20260807',

                assignmentMode:
                    selectedMode(),

                guestNum:
                    form() &&
                    form().elements.guest_num
                        ? Number(
                            form().elements
                                .guest_num.value || 0
                        )
                        : 0,

                duration:
                    form() &&
                    form().elements.duration
                        ? Number(
                            form().elements
                                .duration.value || 0
                        )
                        : 0,

                reserveDate:
                    form() &&
                    form().elements.reserve_date
                        ? String(
                            form().elements
                                .reserve_date.value || ''
                        )
                        : '',

                reserveTime:
                    form() &&
                    form().elements.reserve_time
                        ? String(
                            form().elements
                                .reserve_time.value || ''
                        )
                        : '',

                nativePhysicalTableIds:
                    select()
                        ? Array.prototype
                            .slice.call(
                                select().options
                            )
                            .map(function (option) {
                                return Number(
                                    option.value
                                );
                            })
                            .filter(function (id) {
                                return id > 0;
                            })
                        : [],

                backendRecommendedTableIds:
                    state
                        ? positiveIds(
                            state.recommendedTableIds
                        )
                        : [],

                renderedRecommendedTableIds:
                    realRecommendedIds(),

                backendManualAvailableTableIds:
                    state
                        ? positiveIds(
                            state
                                .manualAvailableTableIds
                        )
                        : [],

                renderedManualAvailableTableIds:
                    realManualIds()
            };
        }
    };

}());
