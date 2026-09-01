/* PMD_SHIFTS_INLINE_TIME_V16 */
(function () {
  'use strict';

  if (!/^\/admin\/shifts\/?$/.test(window.location.pathname)) return;

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var modal = root.querySelector('[data-pmd-shift-modal]');
  if (!modal) return;

  var startInput = modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal.querySelector('[data-pmd-shift-end]');
  var labelInput = modal.querySelector('[data-pmd-shift-label]');
  var idInput = modal.querySelector('[data-pmd-shift-id]');
  if (!startInput || !endInput) return;

  /* V15F inserted click-to-open controls. V16 keeps the same real backend
     inputs, but the wheel itself is always visible inside the form. */
  modal.querySelectorAll('.pmd-shifts-time-field-button-v15').forEach(function (node) {
    node.remove();
  });
  modal.querySelectorAll('.pmd-shifts-time-wheel-layer-v15').forEach(function (node) {
    node.remove();
  });

  if (labelInput) {
    labelInput.setAttribute('placeholder', 'Shift name');
  }

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

  function toValue(parts) {
    var hour24 = Number(parts.hour || 12) % 12;
    if (parts.period === 'PM') hour24 += 12;
    return pad(hour24) + ':' + pad(parts.minute);
  }

  function displayValue(value, fallbackHour) {
    var parts = parseTime(value, fallbackHour);
    return pad(parts.hour) + ':' + pad(parts.minute) + ' ' + parts.period;
  }

  function itemMarkup(part, value, label) {
    return '<button type="button" class="pmd-shifts-inline-time-v16__item"' +
      ' data-pmd-inline-time-part-v16="' + part + '"' +
      ' data-value="' + value + '" role="option" aria-selected="false">' +
      label + '</button>';
  }

  function buildWheel(input, kind) {
    var field = input.closest('label');
    if (!field) return null;

    field.classList.add('pmd-shifts-time-field-v15');
    input.classList.add('pmd-shifts-native-time-v15');

    var existing = field.querySelector('[data-pmd-inline-time-v16]');
    if (existing) return existing;

    var hours = '';
    for (var hour = 1; hour <= 12; hour += 1) {
      hours += itemMarkup('hour', hour, pad(hour));
    }

    var minutes = [0, 15, 30, 45].map(function (minute) {
      return itemMarkup('minute', minute, pad(minute));
    }).join('');

    var periods = itemMarkup('period', 'AM', 'AM') + itemMarkup('period', 'PM', 'PM');

    var wheel = document.createElement('div');
    wheel.className = 'pmd-shifts-inline-time-v16';
    wheel.setAttribute('data-pmd-inline-time-v16', kind);
    wheel.innerHTML = '' +
      '<div class="pmd-shifts-inline-time-v16__value">' +
        '<strong data-pmd-inline-time-value-v16></strong>' +
        '<small>Hour · Minute · AM/PM</small>' +
      '</div>' +
      '<div class="pmd-shifts-inline-time-v16__wheel">' +
        '<div class="pmd-shifts-inline-time-v16__column" data-pmd-inline-time-column-v16="hour" role="listbox" aria-label="Hour">' + hours + '</div>' +
        '<span class="pmd-shifts-inline-time-v16__separator" aria-hidden="true">:</span>' +
        '<div class="pmd-shifts-inline-time-v16__column" data-pmd-inline-time-column-v16="minute" role="listbox" aria-label="Minute">' + minutes + '</div>' +
        '<div class="pmd-shifts-inline-time-v16__column" data-pmd-inline-time-column-v16="period" role="listbox" aria-label="AM or PM">' + periods + '</div>' +
      '</div>';

    input.insertAdjacentElement('afterend', wheel);
    return wheel;
  }

  var startWheel = buildWheel(startInput, 'start');
  var endWheel = buildWheel(endInput, 'end');

  function inputForWheel(wheel) {
    if (!wheel) return null;
    return wheel.getAttribute('data-pmd-inline-time-v16') === 'start' ? startInput : endInput;
  }

  function fallbackForInput(input) {
    return input === startInput ? 9 : 17;
  }

  function syncWheel(wheel, centerSelected) {
    var input = inputForWheel(wheel);
    if (!wheel || !input) return;

    var parts = parseTime(input.value, fallbackForInput(input));
    var valueNode = wheel.querySelector('[data-pmd-inline-time-value-v16]');
    if (valueNode) valueNode.textContent = displayValue(input.value, fallbackForInput(input));

    wheel.querySelectorAll('[data-pmd-inline-time-part-v16]').forEach(function (button) {
      var part = button.getAttribute('data-pmd-inline-time-part-v16');
      var raw = button.getAttribute('data-value');
      var selected = false;
      if (part === 'hour') selected = Number(raw) === Number(parts.hour);
      if (part === 'minute') selected = Number(raw) === Number(parts.minute);
      if (part === 'period') selected = String(raw) === String(parts.period);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });

    if (centerSelected && !modal.hidden) {
      window.requestAnimationFrame(function () {
        wheel.querySelectorAll('.pmd-shifts-inline-time-v16__column').forEach(function (column) {
          var selected = column.querySelector('.is-selected');
          if (!selected) return;
          var target = selected.offsetTop - Math.max(0, (column.clientHeight - selected.offsetHeight) / 2);
          column.scrollTop = Math.max(0, target);
        });
      });
    }
  }

  function syncAll(centerSelected) {
    syncWheel(startWheel, centerSelected);
    syncWheel(endWheel, centerSelected);
  }

  function clearSyntheticDefaultName() {
    if (!labelInput) return;
    if (idInput && String(idInput.value || '').trim() !== '') return;
    var current = String(labelInput.value || '').trim();
    if (current === 'Shift' || current === 'Dinner') labelInput.value = '';
  }

  modal.addEventListener('click', function (event) {
    var item = event.target.closest('[data-pmd-inline-time-part-v16]');
    if (!item || !modal.contains(item)) return;

    event.preventDefault();
    var wheel = item.closest('[data-pmd-inline-time-v16]');
    var input = inputForWheel(wheel);
    if (!wheel || !input) return;

    var parts = parseTime(input.value, fallbackForInput(input));
    var part = item.getAttribute('data-pmd-inline-time-part-v16');
    var value = item.getAttribute('data-value');
    if (part === 'hour') parts.hour = Number(value);
    if (part === 'minute') parts.minute = Number(value);
    if (part === 'period') parts.period = String(value);

    input.value = toValue(parts);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    syncWheel(wheel, false);
  });

  startInput.addEventListener('input', function () { syncWheel(startWheel, false); });
  startInput.addEventListener('change', function () { syncWheel(startWheel, false); });
  endInput.addEventListener('input', function () { syncWheel(endWheel, false); });
  endInput.addEventListener('change', function () { syncWheel(endWheel, false); });

  /* The canonical handler opens/populates the modal first. One task later we
     mirror its values into the always-visible wheels. No MutationObserver is
     used here. */
  root.addEventListener('click', function (event) {
    var trigger = event.target.closest(
      '[data-pmd-person-slot-create], [data-pmd-shift-open], [data-pmd-shift-manage], [data-pmd-shift-duration]'
    );
    if (!trigger) return;

    window.setTimeout(function () {
      clearSyntheticDefaultName();
      syncAll(true);
    }, 0);
  });

  clearSyntheticDefaultName();
  syncAll(false);

  console.info('[PMD Shifts Inline Time V16] Ready', {
    hourlyQuickCreate: true,
    inlineTimeWheels: true,
    syntheticShiftName: false
  });
})();
