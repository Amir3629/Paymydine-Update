/* PMD_RESTAURANT_SERVICE_CALENDAR_R1
 * Progressive enhancement of existing profile form, no duplicate save owner.
 * All business-rule validation is repeated in PHP before persistence.
 */
(function () {
  'use strict';
  if (window.PMDRestaurantServiceCalendarR1) return;
  function init() {
    var root = document.getElementById('pmd-restaurant-profile');
    var form = root && root.querySelector('#pmd-restaurant-profile-form');
    var card = root && root.querySelector('[data-pmd-service-calendar]');
    if (!form || !card) return;

    var closedInput = card.querySelector('[data-pmd-service-closed-json]');
    var daysBox = card.querySelector('[data-pmd-service-days]');
    var monthText = card.querySelector('[data-pmd-service-month]');
    var closureList = card.querySelector('[data-pmd-service-closed-list]');
    var inputDate = card.querySelector('[data-pmd-service-date-input]');
    var closedCount = card.querySelector('[data-pmd-service-closed-count]');
    var weekdayLabels = card.querySelectorAll('.pmd-profile-calendar-weekdays > span');
    var locale = document.documentElement.lang || 'en';
    var readableDate = new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    var weekdayFormat = new Intl.DateTimeFormat(locale, {weekday: 'short'});
    weekdayLabels.forEach(function (label, index) {
      var weekday = weekdayFormat.format(new Date(2024, 0, 1 + index, 12));
      label.textContent = weekday.replace('.', '');
      label.setAttribute('title', weekday);
    });
    var maxPeriods = 4;
    var serverTodayKey = String(
      card.getAttribute('data-pmd-service-today') || ''
    );
    var serverParts = /^\d{4}-\d{2}-\d{2}$/.test(serverTodayKey)
      ? serverTodayKey.split('-').map(Number) : null;
    var today = serverParts
      ? new Date(serverParts[0], serverParts[1] - 1, serverParts[2], 12)
      : new Date();
    var todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var visibleMonth = new Date(todayMonth);
    var latestMonth = new Date(today.getFullYear() + 2, today.getMonth(), 1);
    var closed = new Set();
    try {
      JSON.parse(closedInput.value || '[]').forEach(function (key) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(key))) closed.add(key);
      });
    } catch (ignore) {}

    function pad(x) { return String(x).padStart(2, '0'); }
    function iso(date) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate());
    }
    function notifyDirty() {
      var runtime = window.PMDRestaurantProfileV6;
      if (runtime && typeof runtime.refreshDirtyState === 'function') {
        runtime.refreshDirtyState();
      }
    }
    function syncClosed() {
      closedInput.value = JSON.stringify(Array.from(closed).sort());
      renderCalendar();
      renderClosedList();
      notifyDirty();
    }
    function renderClosedList() {
      closureList.replaceChildren();
      var values = Array.from(closed).sort();
      if (closedCount) {
        closedCount.textContent = values.length + ' ' +
          (card.getAttribute('data-pmd-service-closed-count-label') || 'dates');
      }
      if (!values.length) {
        var none = document.createElement('span');
        none.className = 'pmd-profile-calendar-none';
        none.textContent = card.getAttribute('data-pmd-service-no-closures-label') ||
          'No special closed dates.';
        closureList.appendChild(none);
        return;
      }
      values.forEach(function (key) {
        var parts = key.split('-').map(Number);
        var date = new Date(parts[0], parts[1] - 1, parts[2], 12);
        var label = readableDate.format(date);
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.dataset.closedDate = key;
        button.setAttribute('aria-label',
          (card.getAttribute('data-pmd-service-reopen-label') || 'Reopen') +
          ' ' + label);
        button.addEventListener('click', function () {
          closed.delete(key);
          syncClosed();
        });
        closureList.appendChild(button);
      });
    }
    function renderCalendar() {
      var header = new Intl.DateTimeFormat(
        document.documentElement.lang || 'en',
        {month:'long',year:'numeric'}
      ).format(visibleMonth);
      monthText.textContent = header;
      daysBox.replaceChildren();
      var firstWeekday = (visibleMonth.getDay() + 6) % 7;
      var length = new Date(
        visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0
      ).getDate();
      for (var skip = 0; skip < firstWeekday; skip++) {
        daysBox.appendChild(document.createElement('span'));
      }
      for (var d = 1; d <= length; d++) {
        var date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), d);
        var key = iso(date);
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = String(d);
        button.disabled = key < iso(today);
        button.setAttribute('aria-pressed', closed.has(key) ? 'true' : 'false');
        button.setAttribute('aria-label', key + (closed.has(key) ? ', closed' : ', open'));
        button.addEventListener('click', (function (value) {
          return function () {
            if (closed.has(value)) closed.delete(value);
            else closed.add(value);
            syncClosed();
          };
        })(key));
        daysBox.appendChild(button);
      }
      card.querySelector('[data-pmd-service-prev]').disabled =
        visibleMonth <= todayMonth;
      card.querySelector('[data-pmd-service-next]').disabled =
        visibleMonth >= latestMonth;
    }

    function rowName(day, index, field) {
      return 'hours[' + day + '][windows][' + index + '][' + field + ']';
    }
    function renumber(row) {
      var weekday = Number(row.getAttribute('data-pmd-weekday'));
      var enabled = !!row.querySelector('[data-pmd-hours-enabled]').checked;
      var windows = row.querySelectorAll('[data-pmd-service-window]');
      windows.forEach(function (node, index) {
        var start = node.querySelector('[data-pmd-service-open]');
        var end = node.querySelector('[data-pmd-service-close]');
        start.name = rowName(weekday, index, 'opening_time');
        end.name = rowName(weekday, index, 'closing_time');
        start.required = enabled;
        end.required = enabled;
        start.disabled = !enabled;
        end.disabled = !enabled;
      });
      var add = row.querySelector('[data-pmd-service-add]');
      add.disabled = !enabled || windows.length >= maxPeriods;
    }

    function minutes(clock) {
      var match = /^([01]\\d|2[0-3]):([0-5]\\d)$/.exec(String(clock || ''));
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    }
    function proposeWindow(row) {
      var occupied = Array.from(row.querySelectorAll('[data-pmd-service-window]'))
        .map(function (node) {
          var start = minutes(node.querySelector('[data-pmd-service-open]').value);
          var end = minutes(node.querySelector('[data-pmd-service-close]').value);
          if (start === null || end === null) return null;
          return [start, end <= start ? end + 1440 : end];
        }).filter(Boolean);
      var suggested = [
        ['18:00','22:00'], ['11:30','15:00'],
        ['08:00','11:00'], ['15:30','17:30']
      ];
      for (var i = 0; i < suggested.length; i++) {
        var proposed = suggested[i];
        var start = minutes(proposed[0]);
        var end = minutes(proposed[1]);
        if (occupied.every(function (window) {
          return end <= window[0] || start >= window[1];
        })) return proposed;
      }
      // Never invent an overlapping dinner shift on an already full day.
      return ['', ''];
    }
    function setHint(row, message) {
      var hint = row.querySelector('[data-pmd-service-hint]');
      if (hint) hint.textContent = message || '';
    }
    function createWindow(row, startTime, endTime) {
      var container = row.querySelector('[data-pmd-service-windows]');
      if (container.children.length >= maxPeriods) return;
      var node = document.createElement('div');
      node.className = 'pmd-profile-service-window';
      node.setAttribute('data-pmd-service-window', '');
      var makeLabel = function (text, value, attr) {
        var label = document.createElement('label');
        label.className = 'pmd-profile-time';
        var span = document.createElement('span');
        span.textContent = text;
        var input = document.createElement('input');
        input.type = 'time';
        input.step = '60';
        input.lang = 'en-GB';
        input.value = value;
        input.setAttribute('data-pmd-hours-time', '');
        input.setAttribute(attr, '');
        label.appendChild(span);
        label.appendChild(input);
        return label;
      };
      node.appendChild(makeLabel(
        row.getAttribute('data-pmd-service-open-label') || 'Opens',
        startTime, 'data-pmd-service-open'
      ));
      node.appendChild(makeLabel(
        row.getAttribute('data-pmd-service-close-label') || 'Closes',
        endTime, 'data-pmd-service-close'
      ));
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'pmd-profile-service-remove';
      remove.setAttribute('data-pmd-service-remove', '');
      remove.setAttribute('aria-label',
        row.getAttribute('data-pmd-service-remove-label') || 'Remove service period');
      remove.textContent = '×';
      node.appendChild(remove);
      container.appendChild(node);
      renumber(row);
      if (!startTime || !endTime) {
        setHint(row, row.getAttribute('data-pmd-service-adjust-label') ||
          'This day is fully covered. Adjust a previous period and set the new times.');
        node.querySelector('[data-pmd-service-open]').focus();
      } else {
        setHint(row, '');
      }
      notifyDirty();
    }
    root.querySelectorAll('[data-pmd-hours-row]').forEach(function (row) {
      renumber(row);
    });
    form.addEventListener('click', function (event) {
      var add = event.target.closest('[data-pmd-service-add]');
      var remove = event.target.closest('[data-pmd-service-remove]');
      if (add && form.contains(add)) {
        event.preventDefault();
        var row = add.closest('[data-pmd-hours-row]');
        if (row && row.querySelector('[data-pmd-hours-enabled]').checked) {
          var suggested = proposeWindow(row);
          createWindow(row, suggested[0], suggested[1]);
        }
      } else if (remove && form.contains(remove)) {
        event.preventDefault();
        var hoursRow = remove.closest('[data-pmd-hours-row]');
        if (!hoursRow) return;
        remove.closest('[data-pmd-service-window]').remove();
        setHint(hoursRow, '');
        if (!hoursRow.querySelector('[data-pmd-service-window]')) {
          // An open day must have at least one period. Removing the last
          // period means Closed, and the old profile runtime updates its badge.
          var toggle = hoursRow.querySelector('[data-pmd-hours-enabled]');
          toggle.checked = false;
          toggle.dispatchEvent(new Event('change', {bubbles:true}));
          hoursRow.classList.add('is-closed');
          var state = hoursRow.querySelector('[data-pmd-hours-state]');
          if (state) state.textContent = hoursRow.getAttribute(
            'data-pmd-service-closed-label') || 'Closed';
        }
        renumber(hoursRow);
        notifyDirty();
      }
    });
    form.addEventListener('change', function (event) {
      var toggle = event.target.closest('[data-pmd-hours-enabled]');
      if (!toggle) return;
      var row = toggle.closest('[data-pmd-hours-row]');
      if (!row) return;
      if (toggle.checked && !row.querySelector('[data-pmd-service-window]')) {
        createWindow(row, '09:00', '22:00');
      }
      if (!toggle.checked) setHint(row, '');
      renumber(row);
    });
    card.querySelector('[data-pmd-service-prev]').addEventListener('click', function () {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      if (visibleMonth < todayMonth) visibleMonth = new Date(todayMonth);
      renderCalendar();
    });
    card.querySelector('[data-pmd-service-next]').addEventListener('click', function () {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      if (visibleMonth > latestMonth) visibleMonth = new Date(latestMonth);
      renderCalendar();
    });
    card.querySelector('[data-pmd-service-date-add]').addEventListener('click', function () {
      var value = inputDate.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < iso(today)) return;
      closed.add(value);
      syncClosed();
    });
    inputDate.min = iso(today);
    syncClosed();
    window.PMDRestaurantServiceCalendarR1 = {
      version: '2.0.0-ui',
      audit: function () {
        return {closedDates:closed.size,daysConfigured:root.querySelectorAll('[data-pmd-hours-row]').length};
      }
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
