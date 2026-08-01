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
  var saving = false;
  var tableCatalog = [];
  var tablePicker = null;
  var lastAvailability = null;

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
    var api = window.PMDReservations2FloorExperience;
    var state = api && api.getState ? api.getState() : {};
    var node = document.querySelector('#pmd-r2-shared-floor-canvas-v310 [data-pmd-r2-selected-table-v320], #pmd-r2-shared-floor-canvas-v310 .pmd-r2-table-selected-v317');
    var members = node ? clean(node.getAttribute('data-floor-members')).split(',') : [];
    var ids = positiveIds(members);
    if (!ids.length && node && !node.classList.contains('is-merged-card')) ids = positiveIds(node.getAttribute('data-floor-table'));
    if (!ids.length) ids = positiveIds(state.tableId);
    var names = node ? [clean(node.getAttribute('aria-label') || node.getAttribute('title') || state.tableName)] : [state.tableName];
    return { ids: ids, names: names.filter(Boolean), date: dateValue(state.start) };
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
      tableNames: floor.names, locationId: null, returnView: id && source === 'calendar-reservation' ? 'calendar' : (id && source === 'hour-reservation' ? 'hour' : currentView()),
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

    picker.triggerText.textContent = selected.length
      ? selected.length
        + (
            selected.length === 1
              ? ' table selected'
              : ' tables selected'
          )
      : 'Choose matching table(s)';

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
    lastAvailability = result;
    renderTablePicker(result);

    var status = root.querySelector(
      '[data-pmd-composer-availability]'
    );

    status.textContent = formatAvailability(result);
    status.classList.toggle('is-error', !result.available);
    status.classList.toggle('is-success', !!result.available);

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

  function populate(data) {
    applySmartComposerFields();

    var values = data.reservation || data.defaults;
    ['first_name','last_name','telephone','email','guest_num','reserve_date','reserve_time','duration','comment'].forEach(function (name) {
      var field = form.elements[name]; if (field) field.value = values[name] == null ? '' : (name === 'reserve_time' ? (timeValue(values[name]) || '') : values[name]);
    });
    form.elements.reservation_id.value = context.reservationId || '';
    form.elements.source.value = context.source;
    var selectedTables = positiveIds(data.reservation ? (data.reservation.tables || []).map(function (table) { return table.table_id; }) : data.defaults.tables);
    tableCatalog = Array.isArray(data.tables)
      ? data.tables
      : [];

    var tableSelect = form.querySelector('[name="tables[]"]');
    tableSelect.innerHTML = '';

    tableCatalog.forEach(function (table) {
      option(
        tableSelect,
        table.table_id,
        table.table_name
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
    var assignment = data.reservation ? (selectedTables.length ? 'choose' : 'later') : data.defaults.assignment_mode;
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

    var notify = form.elements.notify;
    if (notify) {
      notify.value = '0';
      notify.checked = false;
    }

    syncAssignment();

    if (
      form.elements.duration
      && !Number(form.elements.duration.value)
    ) {
      form.elements.duration.value = '45';
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
      if (key === 'tables[]') { data.tables = data.tables || []; data.tables.push(Number(value)); }
      else data[key] = value;
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
  function scheduleAvailability() {
    syncAssignment();
    window.clearTimeout(checkingTimer);

    var status = root.querySelector(
      '[data-pmd-composer-availability]'
    );

    var data = payload();

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

    checkingTimer = window.setTimeout(function () {
      status.textContent = 'Checking availability…';
      status.classList.remove('is-error', 'is-success');

      request(
        'onCheckReservationAvailability',
        payload()
      ).then(function (response) {
        applyAvailability(response.availability);
      }).catch(function (error) {
        lastAvailability = null;
        renderTablePicker(null);
        status.textContent = error.message;
        status.classList.add('is-error');
        status.classList.remove('is-success');
      });
    }, 300);
  }
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
      location_id: context.locationId
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
    if (!cards || !(cards.renderReservations || cards.refresh)) throw new Error('Reservation card refresh is unavailable.');
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
    event.preventDefault(); if (saving) return; saving = true; clearErrors();
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

    scheduleAvailability();
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
  root.querySelectorAll('[data-pmd-composer-close],[data-pmd-composer-cancel]').forEach(function (button) { button.addEventListener('click', function () { close(false); }); });
  root.addEventListener('hide.bs.modal', function (event) { if (!allowHide) { event.preventDefault(); close(false); } });
  root.addEventListener('hidden.bs.modal', function () { allowHide = false; closing = false; root.classList.remove('pmd-reservation-composer-v1--closing'); document.body.classList.remove('pmd-reservation-composer-open-v1'); if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open'); if (trigger && trigger.isConnected) trigger.focus(); });
  root.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); close(false); } });
  document.addEventListener('click', clickOwner, true);

  window.PMDReservationComposerV1 = {version:'1.0.0', open:open, normalizeContext:normalize, close:close};
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

    if (field.value === next) {
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
      return;
    }

    setSelected(column, selected);
    centerItem(column, selected, true);
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

        if (!item || !column.contains(item)) {
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

        var allItems = items(column);
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

    var recommendation =
      recommendationFromStatus();

    /*
     * When the user changes fields, the Availability response
     * updates this recommendation automatically.
     */
    visual.textContent = recommendation
      ? 'Auto · ' + recommendation
      : 'Auto assignment';
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

  var VERSION = '2.2.4';
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
      latestAvailability
      && Array.isArray(
        latestAvailability.recommendedTableIds
      )
    ) {
      return positiveIds(
        latestAvailability.recommendedTableIds
      );
    }

    return [];
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

    if (!ids.length) {
      var chosen = selectedIds();

      if (chosen.length) {
        ids = chosen;
      }
    }

    if (!ids.length) {
      return 'Finding best table…';
    }

    return ids.map(function (id) {
      return nameFor(id, catalog);
    }).join(' + ');
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
          'tables[]'
        ].indexOf(event.target.name) >= 0
      ) {
        window.setTimeout(apply, 0);
      }
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
      && !/^auto assign/i.test(
        String(audit.recommendation)
      )
    ) {
      return String(audit.recommendation)
        .replace(
          /^auto assign(?:ment)?\s*[·:–-]?\s*/i,
          ''
        )
        .trim();
    }

    var chosen = selectedNames();

    if (chosen.length) {
      return chosen.join(' + ');
    }

    return 'Finding best table…';
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
    }

    enforceRecommendationLabel();

    /*
     * V223 updates its label roughly 420ms after field changes.
     * Reapply once after that legacy update finishes.
     */
    labelTimer = window.setTimeout(
      function () {
        labelTimer = null;
        enforceRecommendationLabel();
      },
      540
    );
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
          !field.disabled
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
            field.disabled
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
            field.name === 'location_id'
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
          ) === 'v2426'
      };
    }
  };

  console.info(
    '[PMD Composer Soft Draft V2.4.2.6] Ready',
    window.PMDReservationComposerSoftDraftV2426
  );
})();

/* PMD_COMPOSER_SOFT_DRAFT_V2426_END */
