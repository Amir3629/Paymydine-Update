/* PMD_SHIFTS_RESERVATION_JADE_TIME_V17C */
(function () {
  'use strict';

  if (!/^\/admin\/shifts\/?$/.test(window.location.pathname)) return;

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var modal = root.querySelector('[data-pmd-shift-modal]');
  if (!modal) return;

  var startInput = modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal.querySelector('[data-pmd-shift-end]');
  var breakInput = modal.querySelector('[data-pmd-shift-break]');
  var labelInput = modal.querySelector('[data-pmd-shift-label]');
  var shiftIdInput = modal.querySelector('[data-pmd-shift-id]');
  if (!startInput || !endInput || !breakInput) return;

  var localeRaw = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en').toLowerCase();
  var isDe = localeRaw.indexOf('de') === 0;
  var isTr = localeRaw.indexOf('tr') === 0;
  var settleTimers = new WeakMap();
  var syncing = false;
  var breakUserOverride = false;

  var copy = isDe ? {
    custom: 'Benutzerdefiniert'
  } : (isTr ? {
    custom: 'Özel'
  } : {
    custom: 'Custom'
  });

  if (labelInput) {
    labelInput.removeAttribute('required');
    labelInput.setAttribute('placeholder', 'Optional');
  }

  var oldBreakQuick = modal.querySelector('[data-pmd-shift-break-default]');
  if (oldBreakQuick) oldBreakQuick.hidden = true;

  Array.prototype.forEach.call(
    modal.querySelectorAll('.pmd-shifts-break-panel-v17, .pmd-shifts-break-panel-v17b'),
    function (node) { node.remove(); }
  );

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseTime(value, fallbackHour) {
    var match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)/);
    var hour24 = match ? Number(match[1]) : Number(fallbackHour || 9);
    var minute = match ? Number(match[2]) : 0;
    return {
      hour: hour24 % 12 || 12,
      minute: minute,
      period: hour24 >= 12 ? 'PM' : 'AM'
    };
  }

  function nativeTime(hour, minute, period) {
    var hour24 = Number(hour) % 12;
    if (period === 'PM') hour24 += 12;
    return pad(hour24) + ':' + pad(Number(minute));
  }

  function valuesRepeated(values, count) {
    var result = [];
    for (var cycle = 0; cycle < count; cycle += 1) {
      values.forEach(function (value) { result.push(value); });
    }
    return result;
  }

  function createColumn(name, values, formatter, label) {
    var column = document.createElement('div');
    column.className = 'pmd-jade-wheel-v221__column is-' + name;
    column.tabIndex = 0;
    column.setAttribute('role', 'listbox');
    column.setAttribute('aria-label', label);

    valuesRepeated(values, 5).forEach(function (value) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'pmd-jade-wheel-v221__item';
      item.dataset.value = String(value);
      item.textContent = formatter(value);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      column.appendChild(item);
    });

    return column;
  }

  function items(column) {
    return Array.prototype.slice.call(column.querySelectorAll('.pmd-jade-wheel-v221__item'));
  }

  function activeItem(column) {
    return column && column.querySelector('.pmd-jade-wheel-v221__item.is-selected');
  }

  function valueOf(column) {
    var item = activeItem(column);
    return item ? item.dataset.value : '';
  }

  function setSelected(column, selected) {
    items(column).forEach(function (item) {
      var active = item === selected;
      item.classList.toggle('is-selected', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function centerItem(column, item, smooth) {
    if (!column || !item) return;
    var top = item.offsetTop - (column.clientHeight - item.offsetHeight) / 2;
    column.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function middleItem(column, value) {
    var matching = items(column).filter(function (item) {
      return item.dataset.value === String(value);
    });
    return matching[Math.floor(matching.length / 2)] || null;
  }

  function closestItem(column) {
    var rect = column.getBoundingClientRect();
    var center = rect.top + rect.height / 2;
    var selected = null;
    var bestDistance = Infinity;

    items(column).forEach(function (item) {
      var itemRect = item.getBoundingClientRect();
      var distance = Math.abs((itemRect.top + itemRect.height / 2) - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        selected = item;
      }
    });

    return selected;
  }

  function nearestQuarter(minute) {
    var options = [0, 15, 30, 45];
    var best = options[0];
    var distance = Math.abs(Number(minute || 0) - best);
    options.slice(1).forEach(function (candidate) {
      var nextDistance = Math.abs(Number(minute || 0) - candidate);
      if (nextDistance < distance) {
        distance = nextDistance;
        best = candidate;
      }
    });
    return best;
  }

  function buildWheel(input, kind, fallbackHour) {
    input.classList.add('pmd-shifts-jade-native-time-v17c');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    var label = input.closest('label');
    if (!label) return null;
    label.classList.add('pmd-shifts-jade-field-v17c');

    var container = document.createElement('div');
    container.className = 'pmd-jade-wheel-v221';
    container.setAttribute('data-pmd-shifts-jade-wheel-v17c', kind);

    var highlight = document.createElement('div');
    highlight.className = 'pmd-jade-wheel-v221__highlight';
    highlight.setAttribute('aria-hidden', 'true');

    var hour = createColumn(
      'hour',
      [1,2,3,4,5,6,7,8,9,10,11,12],
      function (value) { return pad(value); },
      kind === 'start' ? 'Start hour' : 'End hour'
    );

    var minute = createColumn(
      'minute',
      [0,15,30,45],
      function (value) { return pad(value); },
      kind === 'start' ? 'Start minute' : 'End minute'
    );

    var period = createColumn(
      'period',
      ['AM','PM'],
      function (value) { return value; },
      kind === 'start' ? 'Start AM or PM' : 'End AM or PM'
    );

    var separator = document.createElement('span');
    separator.className = 'pmd-jade-wheel-v221__separator';
    separator.textContent = ':';
    separator.setAttribute('aria-hidden', 'true');

    container.appendChild(hour);
    container.appendChild(separator);
    container.appendChild(minute);
    container.appendChild(period);
    container.appendChild(highlight);
    label.appendChild(container);

    var wheel = {
      kind: kind,
      input: input,
      fallbackHour: fallbackHour,
      container: container,
      hour: hour,
      minute: minute,
      period: period
    };

    bindColumn(wheel, hour);
    bindColumn(wheel, minute);
    bindColumn(wheel, period);
    return wheel;
  }

  function publishTime(wheel) {
    if (!wheel || syncing) return;

    var hour = Number(valueOf(wheel.hour));
    var minute = Number(valueOf(wheel.minute));
    var period = valueOf(wheel.period);
    if (!hour || Number.isNaN(minute) || !period) return;

    var next = nativeTime(hour, minute, period);
    if (wheel.input.value === next) return;

    wheel.input.value = next;
    wheel.input.dispatchEvent(new Event('input', {bubbles:true}));
    wheel.input.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function settle(wheel, column) {
    var selected = closestItem(column);
    if (!selected) return;

    var middle = middleItem(column, selected.dataset.value) || selected;
    setSelected(column, middle);
    centerItem(column, middle, false);
    publishTime(wheel);
  }

  function bindColumn(wheel, column) {
    column.addEventListener('scroll', function () {
      var previous = settleTimers.get(column);
      if (previous) window.clearTimeout(previous);
      var timer = window.setTimeout(function () {
        settle(wheel, column);
      }, 90);
      settleTimers.set(column, timer);
    }, {passive:true});

    column.addEventListener('click', function (event) {
      var item = event.target.closest('.pmd-jade-wheel-v221__item');
      if (!item || !column.contains(item)) return;
      setSelected(column, item);
      centerItem(column, item, true);
      publishTime(wheel);
    });

    column.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();

      var available = items(column);
      if (!available.length) return;
      var current = activeItem(column) || closestItem(column);
      var index = available.indexOf(current);
      if (index < 0) index = 0;
      index += event.key === 'ArrowDown' ? 1 : -1;
      index = Math.max(0, Math.min(available.length - 1, index));

      var selected = available[index];
      setSelected(column, selected);
      centerItem(column, selected, true);
      publishTime(wheel);
    });
  }

  function syncWheel(wheel) {
    if (!wheel) return;

    syncing = true;
    var parsed = parseTime(wheel.input.value, wheel.fallbackHour);
    var minute = nearestQuarter(parsed.minute);

    [
      [wheel.hour, parsed.hour],
      [wheel.minute, minute],
      [wheel.period, parsed.period]
    ].forEach(function (entry) {
      var selected = middleItem(entry[0], entry[1]);
      if (!selected) return;
      setSelected(entry[0], selected);
      centerItem(entry[0], selected, false);
    });

    window.requestAnimationFrame(function () { syncing = false; });
  }

  var startWheel = buildWheel(startInput, 'start', 9);
  var endWheel = buildWheel(endInput, 'end', 17);

  function recommendedBreakMinutes() {
    var start = String(startInput.value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    var end = String(endInput.value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!start || !end) return 0;

    var startMinutes = Number(start[1]) * 60 + Number(start[2]);
    var endMinutes = Number(end[1]) * 60 + Number(end[2]);
    if (endMinutes <= startMinutes) endMinutes += 1440;
    var span = endMinutes - startMinutes;

    if (span > 9 * 60) return 45;
    if (span > 6 * 60) return 30;
    return 0;
  }

  function isEditing() {
    return Boolean(shiftIdInput && String(shiftIdInput.value || '').trim());
  }

  var breakLabel = breakInput.closest('label');
  var breakOptions = document.createElement('div');
  breakOptions.className = 'pmd-shifts-break-options-v17c';
  breakOptions.setAttribute('data-pmd-break-options-v17c', '1');

  var breakChoices = document.createElement('div');
  breakChoices.className = 'pmd-shifts-break-options-v17c__buttons';
  breakOptions.appendChild(breakChoices);

  var customRow = document.createElement('div');
  customRow.className = 'pmd-shifts-break-custom-v17c';
  customRow.setAttribute('data-pmd-break-custom-v17c', '1');
  customRow.hidden = true;
  breakOptions.appendChild(customRow);

  var breakPresets = [0,20,30,45,60];
  breakPresets.forEach(function (minutes) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-break-choice-v17c';
    button.setAttribute('data-pmd-break-choice-v17c', String(minutes));
    button.textContent = String(minutes) + ' min';
    breakChoices.appendChild(button);
  });

  var customButton = document.createElement('button');
  customButton.type = 'button';
  customButton.className = 'pmd-shifts-break-choice-v17c';
  customButton.setAttribute('data-pmd-break-custom-open-v17c', '1');
  customButton.textContent = copy.custom;
  breakChoices.appendChild(customButton);

  if (breakLabel) {
    breakLabel.appendChild(breakOptions);
    customRow.appendChild(breakInput);
  }

  function currentBreakMinutes() {
    return Math.max(0, Math.min(240, Number(breakInput.value || 0)));
  }

  function syncBreakChoices() {
    var current = currentBreakMinutes();
    if (String(breakInput.value) !== String(current)) breakInput.value = String(current);

    var exact = false;
    breakOptions.querySelectorAll('[data-pmd-break-choice-v17c]').forEach(function (button) {
      var selected = Number(button.getAttribute('data-pmd-break-choice-v17c')) === current;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.disabled = false;
      if (selected) exact = true;
    });

    customButton.classList.toggle('is-selected', !exact);
    customButton.setAttribute('aria-pressed', !exact ? 'true' : 'false');
    if (customRow) customRow.hidden = exact;
  }

  function applyBreakRecommendation(force) {
    if (isEditing()) {
      syncBreakChoices();
      return;
    }
    if (breakUserOverride && !force) {
      syncBreakChoices();
      return;
    }

    breakInput.value = String(recommendedBreakMinutes());
    syncBreakChoices();
  }

  modal.addEventListener('click', function (event) {
    var breakChoice = event.target.closest('[data-pmd-break-choice-v17c]');
    if (breakChoice) {
      event.preventDefault();
      breakUserOverride = true;
      breakInput.value = String(Number(breakChoice.getAttribute('data-pmd-break-choice-v17c')) || 0);
      breakInput.dispatchEvent(new Event('input', {bubbles:true}));
      breakInput.dispatchEvent(new Event('change', {bubbles:true}));
      syncBreakChoices();
      return;
    }

    if (event.target.closest('[data-pmd-break-custom-open-v17c]')) {
      event.preventDefault();
      breakUserOverride = true;
      if (customRow) customRow.hidden = false;
      breakInput.hidden = false;
      breakInput.focus();
    }
  });

  function syncAll() {
    syncWheel(startWheel);
    syncWheel(endWheel);
    applyBreakRecommendation(false);
  }

  startInput.addEventListener('input', function () {
    syncWheel(startWheel);
    applyBreakRecommendation(false);
  });
  startInput.addEventListener('change', function () {
    syncWheel(startWheel);
    applyBreakRecommendation(false);
  });
  endInput.addEventListener('input', function () {
    syncWheel(endWheel);
    applyBreakRecommendation(false);
  });
  endInput.addEventListener('change', function () {
    syncWheel(endWheel);
    applyBreakRecommendation(false);
  });

  breakInput.addEventListener('input', function (event) {
    if (event.isTrusted) breakUserOverride = true;
    syncBreakChoices();
  });
  breakInput.addEventListener('change', function (event) {
    if (event.isTrusted) breakUserOverride = true;
    syncBreakChoices();
  });

  root.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-pmd-person-slot-create], [data-pmd-shift-open], [data-pmd-shift-manage]');
    if (opener) {
      window.setTimeout(function () {
        if (labelInput && !isEditing()) {
          if (labelInput.value === 'Shift' || labelInput.value === 'Dinner') labelInput.value = '';
        }
        breakUserOverride = isEditing();
        syncWheel(startWheel);
        syncWheel(endWheel);
        applyBreakRecommendation(!isEditing());
      }, 0);
      return;
    }

    if (event.target.closest('[data-pmd-shift-duration]')) {
      window.setTimeout(function () {
        syncWheel(startWheel);
        syncWheel(endWheel);
        applyBreakRecommendation(false);
      }, 0);
    }
  });

  syncWheel(startWheel);
  syncWheel(endWheel);
  syncBreakChoices();

  console.info('[PMD Shifts Reservation Jade Time V17C] Ready', {
    reservationJadeModel: '2.2.1',
    compactWheel: true,
    observer: false,
    popup: false,
    pauseMode: 'recommended-default-owner-editable'
  });
})();
