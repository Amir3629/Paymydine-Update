/* PMD_SHIFTS_BIG_CALENDAR_V14 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var card = null;
  var grid = null;
  var title = null;
  var activeInput = null;
  var cursor = null;
  var observer = null;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseKey(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) return null;
    return date;
  }

  function locale() {
    return document.documentElement.lang || navigator.language || 'de-DE';
  }

  function labelText() {
    var lang = String(locale()).toLowerCase();
    if (lang.indexOf('de') === 0) return 'Datum auswählen';
    if (lang.indexOf('fa') === 0) return 'انتخاب تاریخ';
    return 'Choose date';
  }

  function todayText() {
    var lang = String(locale()).toLowerCase();
    if (lang.indexOf('de') === 0) return 'Heute';
    if (lang.indexOf('fa') === 0) return 'امروز';
    return 'Today';
  }

  function monthTitle(date) {
    try {
      return new Intl.DateTimeFormat(locale(), {month:'long', year:'numeric'}).format(date);
    } catch (error) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1);
    }
  }

  function weekdayLabels() {
    var monday = new Date(2024, 0, 1, 12, 0, 0, 0);
    var labels = [];
    for (var i = 0; i < 7; i += 1) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + i);
      try {
        labels.push(new Intl.DateTimeFormat(locale(), {weekday:'short'}).format(day));
      } catch (error) {
        labels.push(['Mo','Tu','We','Th','Fr','Sa','Su'][i]);
      }
    }
    return labels;
  }

  function ensureCard() {
    if (card) return card;

    card = document.createElement('section');
    card.id = 'pmd-shifts-big-calendar-v14';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-label', labelText());
    card.innerHTML = '' +
      '<div class="pmd-shifts-big-calendar-v14__header">' +
        '<button type="button" class="pmd-shifts-big-calendar-v14__nav" data-pmd-cal-v14-prev aria-label="Previous month">‹</button>' +
        '<strong data-pmd-cal-v14-title></strong>' +
        '<button type="button" class="pmd-shifts-big-calendar-v14__nav" data-pmd-cal-v14-next aria-label="Next month">›</button>' +
      '</div>' +
      '<div class="pmd-shifts-big-calendar-v14__weekdays" data-pmd-cal-v14-weekdays></div>' +
      '<div class="pmd-shifts-big-calendar-v14__grid" data-pmd-cal-v14-grid></div>' +
      '<div class="pmd-shifts-big-calendar-v14__footer">' +
        '<button type="button" data-pmd-cal-v14-today></button>' +
      '</div>';

    document.body.appendChild(card);
    grid = card.querySelector('[data-pmd-cal-v14-grid]');
    title = card.querySelector('[data-pmd-cal-v14-title]');

    var weekdays = card.querySelector('[data-pmd-cal-v14-weekdays]');
    weekdays.innerHTML = weekdayLabels().map(function (value) {
      return '<span>' + String(value).replace(/[&<>"']/g, function (ch) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
      }) + '</span>';
    }).join('');

    card.querySelector('[data-pmd-cal-v14-today]').textContent = todayText();
    return card;
  }

  function selectedKey() {
    if (activeInput && /^\d{4}-\d{2}-\d{2}$/.test(String(activeInput.value || ''))) {
      return String(activeInput.value);
    }
    try {
      var url = new URL(window.location.href);
      var fromUrl = String(url.searchParams.get('day') || '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) return fromUrl;
    } catch (error) {}
    return dateKey(new Date());
  }

  function render() {
    ensureCard();
    if (!cursor) cursor = parseKey(selectedKey()) || new Date();

    var year = cursor.getFullYear();
    var month = cursor.getMonth();
    var first = new Date(year, month, 1, 12, 0, 0, 0);
    var startOffset = (first.getDay() + 6) % 7;
    var start = new Date(year, month, 1 - startOffset, 12, 0, 0, 0);
    var selected = selectedKey();
    var today = dateKey(new Date());

    title.textContent = monthTitle(first);

    var html = '';
    for (var i = 0; i < 42; i += 1) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var key = dateKey(day);
      var outside = day.getMonth() !== month;
      var classes = 'pmd-shifts-big-calendar-v14__day';
      if (outside) classes += ' is-outside';
      if (key === today) classes += ' is-today';
      if (key === selected) classes += ' is-selected';
      html += '<button type="button" class="' + classes + '" data-pmd-cal-v14-day="' + key + '" aria-label="' + key + '">' + day.getDate() + '</button>';
    }
    grid.innerHTML = html;
  }

  function positionCard(trigger) {
    if (!card || card.hidden || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var margin = 16;
    var width = Math.min(540, Math.max(320, window.innerWidth - margin * 2));
    card.style.width = width + 'px';

    var measured = card.getBoundingClientRect();
    var left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    var top = rect.bottom + 12;
    var height = measured.height || 520;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - height - 12);
    }

    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function openCalendar(input, trigger) {
    activeInput = input;
    cursor = parseKey(String(input && input.value || '')) || parseKey(selectedKey()) || new Date();
    ensureCard();
    render();
    card.hidden = false;
    card.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(function () {
      positionCard(trigger || (input && input.closest('.pmd-shifts-date-picker')) || input);
    });
  }

  function closeCalendar() {
    if (!card) return;
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    activeInput = null;
  }

  function choose(key) {
    if (!activeInput || !/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return;
    activeInput.value = key;
    activeInput.dispatchEvent(new Event('change', {bubbles:true}));
    closeCalendar();
  }

  function normalizePickers() {
    root.querySelectorAll('.pmd-shifts-date-picker').forEach(function (picker) {
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (!input) return;
      picker.setAttribute('data-pmd-big-calendar-trigger-v14', '1');
      picker.setAttribute('role', 'button');
      picker.setAttribute('tabindex', '0');
      picker.setAttribute('aria-label', labelText());
      picker.removeAttribute('title');
      input.readOnly = true;
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      input.style.pointerEvents = 'none';
    });
  }

  normalizePickers();
  observer = new MutationObserver(function () {
    normalizePickers();
  });
  observer.observe(root, {childList:true, subtree:true});

  document.addEventListener('pointerdown', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker)) event.preventDefault();
  }, true);

  document.addEventListener('click', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker)) {
      event.preventDefault();
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (input) openCalendar(input, picker);
      return;
    }

    var day = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-day]')
      : null;
    if (day && card && card.contains(day)) {
      event.preventDefault();
      choose(day.getAttribute('data-pmd-cal-v14-day'));
      return;
    }

    var prev = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-prev]')
      : null;
    if (prev && card && card.contains(prev)) {
      event.preventDefault();
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12, 0, 0, 0);
      render();
      return;
    }

    var next = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-next]')
      : null;
    if (next && card && card.contains(next)) {
      event.preventDefault();
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0, 0);
      render();
      return;
    }

    var today = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-today]')
      : null;
    if (today && card && card.contains(today)) {
      event.preventDefault();
      choose(dateKey(new Date()));
      return;
    }

    if (card && !card.hidden && !card.contains(event.target)) closeCalendar();
  }, true);

  document.addEventListener('keydown', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (input) openCalendar(input, picker);
      return;
    }
    if (event.key === 'Escape') closeCalendar();
  }, true);

  window.addEventListener('resize', function () {
    if (!card || card.hidden || !activeInput) return;
    positionCard(activeInput.closest('.pmd-shifts-date-picker') || activeInput);
  });

  window.addEventListener('scroll', function () {
    if (!card || card.hidden || !activeInput) return;
    positionCard(activeInput.closest('.pmd-shifts-date-picker') || activeInput);
  }, true);

  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
  }, {once:true});
})();
