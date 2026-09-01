/* PMD_SHIFTS_PLANNER_V17 */
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
  if (!startInput || !endInput || !breakInput) return;

  var localeRaw = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en').toLowerCase();
  var isDe = localeRaw.indexOf('de') === 0;
  var isTr = localeRaw.indexOf('tr') === 0;

  var copy = isDe ? {
    chosen: 'Ausgewählt',
    legal: 'Gesetzliches Minimum',
    germany: 'Deutschland · ArbZG §4',
    custom: 'Benutzerdefiniert',
    minutes: 'Minuten'
  } : (isTr ? {
    chosen: 'Seçili',
    legal: 'Yasal minimum',
    germany: 'Almanya · ArbZG §4',
    custom: 'Özel',
    minutes: 'dakika'
  } : {
    chosen: 'Selected',
    legal: 'Legal minimum',
    germany: 'Germany · ArbZG §4',
    custom: 'Custom',
    minutes: 'minutes'
  });

  if (labelInput) {
    labelInput.removeAttribute('required');
    if (!labelInput.getAttribute('placeholder')) labelInput.setAttribute('placeholder', 'Optional');
  }

  var oldBreakQuick = modal.querySelector('[data-pmd-shift-break-default]');
  if (oldBreakQuick) oldBreakQuick.hidden = true;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseTime(value, fallbackHour) {
    var match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    var hour24 = match ? Number(match[1]) : Number(fallbackHour || 9);
    var minute = match ? Number(match[2]) : 0;
    var period = hour24 >= 12 ? 'PM' : 'AM';
    var hour12 = hour24 % 12;
    if (!hour12) hour12 = 12;
    return {hour: hour12, minute: minute, period: period};
  }

  function to24(hour12, minute, period) {
    var hour24 = Number(hour12 || 12) % 12;
    if (String(period) === 'PM') hour24 += 12;
    return pad(hour24) + ':' + pad(Number(minute || 0));
  }

  function displayTime(value, fallbackHour) {
    var parsed = parseTime(value, fallbackHour);
    return pad(parsed.hour) + ':' + pad(parsed.minute) + ' ' + parsed.period;
  }

  function item(part, value, label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-inline-time-v17__item';
    button.setAttribute('data-pmd-inline-time-part-v17', part);
    button.setAttribute('data-value', String(value));
    button.textContent = label;
    return button;
  }

  function buildWheel(input, kind) {
    if (input.getAttribute('data-pmd-inline-time-v17') === '1') {
      return input.parentNode.querySelector('[data-pmd-inline-time-v17="' + kind + '"]');
    }

    input.setAttribute('data-pmd-inline-time-v17', '1');
    input.classList.add('pmd-shifts-native-time-v17');

    var wrap = document.createElement('div');
    wrap.className = 'pmd-shifts-inline-time-v17';
    wrap.setAttribute('data-pmd-inline-time-v17', kind);

    var summary = document.createElement('div');
    summary.className = 'pmd-shifts-inline-time-v17__summary';
    summary.innerHTML = '<strong data-pmd-inline-time-summary-v17></strong><small>' + copy.chosen + '</small>';

    var wheel = document.createElement('div');
    wheel.className = 'pmd-shifts-inline-time-v17__wheel';

    var hours = document.createElement('div');
    hours.className = 'pmd-shifts-inline-time-v17__column';
    hours.setAttribute('data-pmd-inline-time-column-v17', 'hour');
    for (var h = 1; h <= 12; h += 1) hours.appendChild(item('hour', h, pad(h)));

    var separator = document.createElement('div');
    separator.className = 'pmd-shifts-inline-time-v17__separator';
    separator.textContent = ':';

    var minutes = document.createElement('div');
    minutes.className = 'pmd-shifts-inline-time-v17__column';
    minutes.setAttribute('data-pmd-inline-time-column-v17', 'minute');
    [0, 15, 30, 45].forEach(function (minute) {
      minutes.appendChild(item('minute', minute, pad(minute)));
    });

    var periods = document.createElement('div');
    periods.className = 'pmd-shifts-inline-time-v17__column';
    periods.setAttribute('data-pmd-inline-time-column-v17', 'period');
    periods.appendChild(item('period', 'AM', 'AM'));
    periods.appendChild(item('period', 'PM', 'PM'));

    wheel.appendChild(hours);
    wheel.appendChild(separator);
    wheel.appendChild(minutes);
    wheel.appendChild(periods);

    wrap.appendChild(summary);
    wrap.appendChild(wheel);
    input.insertAdjacentElement('afterend', wrap);

    return wrap;
  }

  var startWheel = buildWheel(startInput, 'start');
  var endWheel = buildWheel(endInput, 'end');

  function syncWheel(input, wheel, fallbackHour) {
    if (!wheel) return;
    var parsed = parseTime(input.value, fallbackHour);
    var summary = wheel.querySelector('[data-pmd-inline-time-summary-v17]');
    if (summary) summary.textContent = displayTime(input.value, fallbackHour);

    wheel.querySelectorAll('[data-pmd-inline-time-part-v17]').forEach(function (button) {
      var part = button.getAttribute('data-pmd-inline-time-part-v17');
      var value = button.getAttribute('data-value');
      var selected = (part === 'hour' && Number(value) === parsed.hour)
        || (part === 'minute' && Number(value) === parsed.minute)
        || (part === 'period' && value === parsed.period);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });

    if (!modal.hidden) {
      var hourColumn = wheel.querySelector('[data-pmd-inline-time-column-v17="hour"]');
      var minuteColumn = wheel.querySelector('[data-pmd-inline-time-column-v17="minute"]');
      var periodColumn = wheel.querySelector('[data-pmd-inline-time-column-v17="period"]');
      if (hourColumn) hourColumn.scrollTop = Math.max(0, (parsed.hour - 1) * 40);
      if (minuteColumn) minuteColumn.scrollTop = Math.max(0, [0,15,30,45].indexOf(parsed.minute) * 40);
      if (periodColumn) periodColumn.scrollTop = parsed.period === 'PM' ? 40 : 0;
    }
  }

  function requiredBreakMinutes() {
    var start = String(startInput.value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    var end = String(endInput.value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!start || !end) return 0;

    var startMinutes = Number(start[1]) * 60 + Number(start[2]);
    var endMinutes = Number(end[1]) * 60 + Number(end[2]);
    if (endMinutes <= startMinutes) endMinutes += 1440;
    var span = endMinutes - startMinutes;

    // Conservative planner default for the general adult ArbZG §4 rule.
    if (span > 9 * 60) return 45;
    if (span > 6 * 60) return 30;
    return 0;
  }

  var breakLabel = breakInput.closest('label');
  var breakPanel = document.createElement('div');
  breakPanel.className = 'pmd-shifts-break-panel-v17';
  breakPanel.innerHTML = '' +
    '<div class="pmd-shifts-break-panel-v17__meta">' +
      '<span>' + copy.germany + '</span>' +
      '<span class="pmd-shifts-break-panel-v17__minimum" data-pmd-break-minimum-v17></span>' +
    '</div>' +
    '<div class="pmd-shifts-break-panel-v17__buttons" data-pmd-break-buttons-v17></div>' +
    '<div class="pmd-shifts-break-custom-v17" data-pmd-break-custom-v17 hidden><span>' + copy.custom + '</span></div>';

  if (breakLabel) breakLabel.appendChild(breakPanel);

  var breakButtons = breakPanel.querySelector('[data-pmd-break-buttons-v17]');
  var customRow = breakPanel.querySelector('[data-pmd-break-custom-v17]');
  var minimumBadge = breakPanel.querySelector('[data-pmd-break-minimum-v17]');
  var breakOptions = [0, 20, 30, 45, 60];

  breakOptions.forEach(function (minutes) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-break-choice-v17';
    button.setAttribute('data-pmd-break-choice-v17', String(minutes));
    button.textContent = String(minutes) + ' min';
    breakButtons.appendChild(button);
  });

  var customButton = document.createElement('button');
  customButton.type = 'button';
  customButton.className = 'pmd-shifts-break-choice-v17';
  customButton.setAttribute('data-pmd-break-custom-open-v17', '1');
  customButton.textContent = copy.custom;
  breakButtons.appendChild(customButton);

  if (customRow) customRow.appendChild(breakInput);

  function syncBreakPanel() {
    var minimum = requiredBreakMinutes();
    var current = Math.max(0, Math.min(240, Number(breakInput.value || 0)));
    if (current < minimum) {
      current = minimum;
      breakInput.value = String(current);
    }

    minimumBadge.textContent = copy.legal + ': ' + minimum + ' min';

    var exact = false;
    breakPanel.querySelectorAll('[data-pmd-break-choice-v17]').forEach(function (button) {
      var value = Number(button.getAttribute('data-pmd-break-choice-v17'));
      button.disabled = value < minimum;
      var selected = value === current;
      button.classList.toggle('is-selected', selected);
      if (selected) exact = true;
    });

    customButton.classList.toggle('is-selected', !exact);
    if (customRow) customRow.hidden = exact;
  }

  function syncAll() {
    syncWheel(startInput, startWheel, 9);
    syncWheel(endInput, endWheel, 17);
    syncBreakPanel();
  }

  function updateTimeFromChoice(input, wheel, fallbackHour, part, value) {
    var parsed = parseTime(input.value, fallbackHour);
    if (part === 'hour') parsed.hour = Number(value);
    if (part === 'minute') parsed.minute = Number(value);
    if (part === 'period') parsed.period = String(value);
    input.value = to24(parsed.hour, parsed.minute, parsed.period);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    syncWheel(input, wheel, fallbackHour);
    syncBreakPanel();
  }

  modal.addEventListener('click', function (event) {
    var timeItem = event.target.closest('[data-pmd-inline-time-part-v17]');
    if (timeItem) {
      event.preventDefault();
      var wheel = timeItem.closest('[data-pmd-inline-time-v17]');
      var kind = wheel && wheel.getAttribute('data-pmd-inline-time-v17');
      var input = kind === 'start' ? startInput : endInput;
      updateTimeFromChoice(
        input,
        kind === 'start' ? startWheel : endWheel,
        kind === 'start' ? 9 : 17,
        timeItem.getAttribute('data-pmd-inline-time-part-v17'),
        timeItem.getAttribute('data-value')
      );
      return;
    }

    var breakChoice = event.target.closest('[data-pmd-break-choice-v17]');
    if (breakChoice && !breakChoice.disabled) {
      event.preventDefault();
      breakInput.value = String(Number(breakChoice.getAttribute('data-pmd-break-choice-v17')) || 0);
      breakInput.dispatchEvent(new Event('input', {bubbles: true}));
      breakInput.dispatchEvent(new Event('change', {bubbles: true}));
      syncBreakPanel();
      return;
    }

    if (event.target.closest('[data-pmd-break-custom-open-v17]')) {
      event.preventDefault();
      if (customRow) customRow.hidden = false;
      breakInput.hidden = false;
      breakInput.focus();
    }
  });

  startInput.addEventListener('change', syncAll);
  endInput.addEventListener('change', syncAll);
  breakInput.addEventListener('input', syncBreakPanel);
  breakInput.addEventListener('change', syncBreakPanel);

  // Existing Shifts logic opens/resets the modal first. Re-sync one task later;
  // no subtree MutationObserver and no floating-slot pointer listeners are used.
  root.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-person-slot-create], [data-pmd-shift-open], [data-pmd-shift-manage], [data-pmd-shift-duration]')) {
      window.setTimeout(function () {
        if (labelInput && !modal.querySelector('[data-pmd-shift-id]').value) {
          if (labelInput.value === 'Shift' || labelInput.value === 'Dinner') labelInput.value = '';
        }
        syncAll();
      }, 0);
    }
  });

  syncAll();

  console.info('[PMD Shifts Planner V17] Ready', {
    observer: false,
    hourlyQuickCreate: true,
    inlineTimeWheels: true,
    automaticBreakMinimum: true
  });
})();
