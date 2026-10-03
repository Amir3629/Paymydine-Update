/* PMD_SHIFTS_PLANNER_UX_V15 */
(function () {
  'use strict';

  if (!/^\/admin\/shifts\/?$/.test(window.location.pathname)) return;

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var localeRaw = String(
    window.PMD_ADMIN_LOCALE ||
    document.documentElement.lang ||
    'en'
  ).toLowerCase();

  var locale = localeRaw.indexOf('de') === 0
    ? 'de-DE'
    : (localeRaw.indexOf('tr') === 0 ? 'tr-TR' : 'en-US');

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseDateKey(key) {
    var match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }

  function formatDateKey(key) {
    var date = parseDateKey(key);
    if (!date) return String(key || '');
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return String(key || '');
    }
  }

  function visibleDayKey() {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    if (!host) return '';

    var screen = host.querySelector('.pmd-shifts-final-screen[data-date]');
    if (screen) return String(screen.getAttribute('data-date') || '');

    var server = host.querySelector('[data-pmd-shifts-server-initial][data-date]');
    if (server) return String(server.getAttribute('data-date') || '');

    var picker = host.querySelector('[data-pmd-shifts-date-input]');
    return picker ? String(picker.value || '') : '';
  }

  function repairVisibleDate() {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    if (!host) return;

    var heading = host.querySelector('.pmd-shifts-final-date h2');
    var key = visibleDayKey();
    if (!heading || !key) return;

    var label = formatDateKey(key);
    if (!label) return;

    if (heading.getAttribute('data-pmd-fixed-date') !== label) {
      heading.setAttribute('data-pmd-fixed-date', label);
    }
    heading.setAttribute('data-pmd-no-translate', '');
    heading.setAttribute('data-pmd-i18n-skip', '');
    heading.setAttribute('data-pmd-shifts-date-label', '');
    heading.setAttribute('lang', locale.slice(0, 2));
    heading.setAttribute('aria-label', label);
  }

  var repairQueued = false;
  function queueDateRepair() {
    if (repairQueued) return;
    repairQueued = true;
    Promise.resolve().then(function () {
      repairQueued = false;
      repairVisibleDate();
    });
  }

  repairVisibleDate();

  var hourHost = root.querySelector('[data-pmd-shifts-hour-host]');
  if (hourHost && window.MutationObserver) {
    new MutationObserver(queueDateRepair).observe(hourHost, {
      childList: true,
      subtree: true
    });
  }

  var modal = root.querySelector('[data-pmd-shift-modal]');
  if (!modal) return;

  var modalCard = modal.querySelector('.pmd-shifts__modal-card');
  var startInput = modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal.querySelector('[data-pmd-shift-end]');
  if (!modalCard || !startInput || !endInput) return;

  modal.classList.add('pmd-shifts-shift-modal-v15');
  modalCard.classList.add('pmd-shifts-shift-card-v15');

  var wheelLayer = document.createElement('div');
  wheelLayer.className = 'pmd-shifts-time-wheel-layer-v15';
  wheelLayer.hidden = true;
  wheelLayer.setAttribute('aria-hidden', 'true');
  wheelLayer.innerHTML = '' +
    '<button type="button" class="pmd-shifts-time-wheel-backdrop-v15" data-pmd-time-wheel-close-v15 tabindex="-1" aria-label="Close time picker"></button>' +
    '<section class="pmd-shifts-time-wheel-panel-v15" role="dialog" aria-modal="true" aria-labelledby="pmd-shifts-time-wheel-title-v15">' +
      '<header class="pmd-shifts-time-wheel-head-v15">' +
        '<div><span>Shift time</span><h3 id="pmd-shifts-time-wheel-title-v15">Choose time</h3></div>' +
        '<button type="button" data-pmd-time-wheel-close-v15 aria-label="Close">×</button>' +
      '</header>' +
      '<div class="pmd-shifts-time-wheel-v15">' +
        '<div class="pmd-shifts-time-wheel-column-v15" data-pmd-time-wheel-hours-v15 role="listbox" aria-label="Hour"></div>' +
        '<span class="pmd-shifts-time-wheel-separator-v15" aria-hidden="true">:</span>' +
        '<div class="pmd-shifts-time-wheel-column-v15" data-pmd-time-wheel-minutes-v15 role="listbox" aria-label="Minute"></div>' +
        '<div class="pmd-shifts-time-wheel-column-v15 is-period" data-pmd-time-wheel-period-v15 role="listbox" aria-label="AM or PM"></div>' +
        '<div class="pmd-shifts-time-wheel-highlight-v15" aria-hidden="true"></div>' +
      '</div>' +
      '<footer class="pmd-shifts-time-wheel-footer-v15">' +
        '<button type="button" class="is-soft" data-pmd-time-wheel-close-v15>Cancel</button>' +
        '<button type="button" class="is-primary" data-pmd-time-wheel-apply-v15>Use this time</button>' +
      '</footer>' +
    '</section>';
  modalCard.appendChild(wheelLayer);

  var wheelTitle = wheelLayer.querySelector('#pmd-shifts-time-wheel-title-v15');
  var hourColumn = wheelLayer.querySelector('[data-pmd-time-wheel-hours-v15]');
  var minuteColumn = wheelLayer.querySelector('[data-pmd-time-wheel-minutes-v15]');
  var periodColumn = wheelLayer.querySelector('[data-pmd-time-wheel-period-v15]');

  var activeInput = null;
  var draft = {hour: 9, minute: 0, period: 'AM'};

  function parseTime(value, fallbackHour) {
    var match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    var hour24 = match ? Number(match[1]) : Number(fallbackHour || 9);
    var minute = match ? Number(match[2]) : 0;
    var period = hour24 >= 12 ? 'PM' : 'AM';
    var hour12 = hour24 % 12;
    if (!hour12) hour12 = 12;
    return {hour: hour12, minute: minute, period: period};
  }

  function valueFromDraft() {
    var hour24 = Number(draft.hour || 12) % 12;
    if (draft.period === 'PM') hour24 += 12;
    return pad(hour24) + ':' + pad(draft.minute);
  }

  function displayTime(value, fallbackHour) {
    var parsed = parseTime(value, fallbackHour);
    return pad(parsed.hour) + ':' + pad(parsed.minute) + ' ' + parsed.period;
  }

  function syncTimeButton(input) {
    var field = input && input.closest('label');
    if (!field) return;
    var button = field.querySelector('[data-pmd-time-wheel-open-v15]');
    var display = button && button.querySelector('[data-pmd-time-wheel-display-v15]');
    if (!display) return;
    display.textContent = displayTime(input.value, input === startInput ? 9 : 17);
  }

  function enhanceTimeInput(input, kind) {
    var field = input.closest('label');
    if (!field || field.getAttribute('data-pmd-time-field-v15') === '1') return;

    field.setAttribute('data-pmd-time-field-v15', '1');
    field.classList.add('pmd-shifts-time-field-v15');
    input.classList.add('pmd-shifts-native-time-v15');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-time-field-button-v15';
    button.setAttribute('data-pmd-time-wheel-open-v15', kind);
    button.innerHTML = '' +
      '<span class="pmd-shifts-time-field-icon-v15" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path></svg>' +
      '</span>' +
      '<span class="pmd-shifts-time-field-copy-v15">' +
        '<strong data-pmd-time-wheel-display-v15></strong>' +
        '<small>Tap to choose</small>' +
      '</span>' +
      '<span class="pmd-shifts-time-field-chevron-v15" aria-hidden="true">›</span>';

    input.insertAdjacentElement('afterend', button);
    syncTimeButton(input);
  }

  enhanceTimeInput(startInput, 'start');
  enhanceTimeInput(endInput, 'end');

  function wheelButton(value, label, selected, part) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-time-wheel-item-v15' + (selected ? ' is-selected' : '');
    button.setAttribute('data-pmd-time-wheel-part-v15', part);
    button.setAttribute('data-value', String(value));
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.textContent = label;
    return button;
  }

  function renderWheel() {
    hourColumn.innerHTML = '';
    minuteColumn.innerHTML = '';
    periodColumn.innerHTML = '';

    for (var hour = 1; hour <= 12; hour += 1) {
      hourColumn.appendChild(wheelButton(hour, pad(hour), hour === draft.hour, 'hour'));
    }

    var minutes = [0, 15, 30, 45];
    if (minutes.indexOf(Number(draft.minute)) === -1) {
      minutes.push(Number(draft.minute));
      minutes.sort(function (a, b) { return a - b; });
    }
    minutes.forEach(function (minute) {
      minuteColumn.appendChild(wheelButton(minute, pad(minute), minute === Number(draft.minute), 'minute'));
    });

    ['AM', 'PM'].forEach(function (period) {
      periodColumn.appendChild(wheelButton(period, period, period === draft.period, 'period'));
    });

    window.requestAnimationFrame(function () {
      wheelLayer.querySelectorAll('.pmd-shifts-time-wheel-item-v15.is-selected').forEach(function (node) {
        try { node.scrollIntoView({block: 'center', behavior: 'auto'}); } catch (error) {}
      });
    });
  }

  function openWheel(input, label) {
    activeInput = input;
    draft = parseTime(input.value, input === startInput ? 9 : 17);
    wheelTitle.textContent = label === 'start' ? 'Start time' : 'End time';
    renderWheel();
    wheelLayer.hidden = false;
    wheelLayer.setAttribute('aria-hidden', 'false');
    modalCard.classList.add('is-time-wheel-open-v15');
  }

  function closeWheel() {
    wheelLayer.hidden = true;
    wheelLayer.setAttribute('aria-hidden', 'true');
    modalCard.classList.remove('is-time-wheel-open-v15');
    activeInput = null;
  }

  function syncBothTimesSoon() {
    window.setTimeout(function () {
      syncTimeButton(startInput);
      syncTimeButton(endInput);
    }, 0);
  }

  modal.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-pmd-time-wheel-open-v15]');
    if (opener) {
      event.preventDefault();
      openWheel(
        opener.closest('label').querySelector('input[type="time"]'),
        opener.getAttribute('data-pmd-time-wheel-open-v15')
      );
      return;
    }

    var item = event.target.closest('[data-pmd-time-wheel-part-v15]');
    if (item && wheelLayer.contains(item)) {
      event.preventDefault();
      var part = item.getAttribute('data-pmd-time-wheel-part-v15');
      var value = item.getAttribute('data-value');
      if (part === 'hour') draft.hour = Number(value);
      if (part === 'minute') draft.minute = Number(value);
      if (part === 'period') draft.period = String(value);
      renderWheel();
      return;
    }

    if (event.target.closest('[data-pmd-time-wheel-apply-v15]')) {
      event.preventDefault();
      if (activeInput) {
        activeInput.value = valueFromDraft();
        activeInput.dispatchEvent(new Event('input', {bubbles: true}));
        activeInput.dispatchEvent(new Event('change', {bubbles: true}));
      }
      closeWheel();
      syncBothTimesSoon();
      return;
    }

    if (event.target.closest('[data-pmd-time-wheel-close-v15]')) {
      event.preventDefault();
      closeWheel();
    }
  });

  startInput.addEventListener('input', syncBothTimesSoon);
  startInput.addEventListener('change', syncBothTimesSoon);
  endInput.addEventListener('input', syncBothTimesSoon);
  endInput.addEventListener('change', syncBothTimesSoon);

  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (!modal.hidden) {
        syncTimeButton(startInput);
        syncTimeButton(endInput);
      }
    }).observe(modal, {attributes: true, attributeFilter: ['hidden', 'aria-hidden']});
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !wheelLayer.hidden) {
      event.preventDefault();
      closeWheel();
    }
  });

  console.info('[PMD Shifts Planner UX V15] Ready', {
    dateLock: true,
    fullCellCreate: true,
    timeWheel: true
  });
})();
