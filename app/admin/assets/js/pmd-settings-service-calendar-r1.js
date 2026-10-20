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
      if (!values.length) {
        var none = document.createElement('span');
        none.className = 'pmd-profile-calendar-none';
        none.textContent = 'No special closed dates.';
        closureList.appendChild(none);
        return;
      }
      values.forEach(function (key) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = key;
        button.setAttribute('aria-label', 'Reopen ' + key);
        button.addEventListener('click', function () { closed.delete(key); syncClosed(); });
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
      var windows = row.querySelectorAll('[data-pmd-service-window]');
      windows.forEach(function (node, index) {
        var start = node.querySelector('[data-pmd-service-open]');
        var end = node.querySelector('[data-pmd-service-close]');
        start.name = rowName(weekday, index, 'opening_time');
        end.name = rowName(weekday, index, 'closing_time');
      });
      var add = row.querySelector('[data-pmd-service-add]');
      add.disabled = !row.querySelector('[data-pmd-hours-enabled]').checked ||
        windows.length >= maxPeriods;
    }
    function createWindow(row, startTime, endTime) {
      var container = row.querySelector('[data-pmd-service-windows]');
      if (container.children.length >= maxPeriods) return;
      var node = document.createElement('div');
      node.className = 'pmd-profile-service-window';
      node.setAttribute('data-pmd-service-window', '');
      var localeText = container.querySelector('.pmd-profile-time span');
      var labels = localeText ? localeText.textContent : 'Opens';
      var makeLabel = function (text, value, attr) {
        var label = document.createElement('label');
        label.className = 'pmd-profile-time';
        var span = document.createElement('span');
        span.textContent = text;
        var input = document.createElement('input');
        input.type = 'time';
        input.step = '60';
        input.value = value;
        input.setAttribute('data-pmd-hours-time', '');
        input.setAttribute(attr, '');
        label.appendChild(span);
        label.appendChild(input);
        return label;
      };
      node.appendChild(makeLabel(labels, startTime, 'data-pmd-service-open'));
      node.appendChild(makeLabel('Closes', endTime, 'data-pmd-service-close'));
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'pmd-profile-service-remove';
      remove.setAttribute('data-pmd-service-remove', '');
      remove.setAttribute('aria-label', 'Remove service period');
      remove.textContent = '×';
      node.appendChild(remove);
      container.appendChild(node);
      renumber(row);
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
          createWindow(row, '18:00', '22:00');
        }
      } else if (remove && form.contains(remove)) {
        event.preventDefault();
        var hoursRow = remove.closest('[data-pmd-hours-row]');
        remove.closest('[data-pmd-service-window]').remove();
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
      version: '1.0.0',
      audit: function () {
        return {closedDates:closed.size,daysConfigured:root.querySelectorAll('[data-pmd-hours-row]').length};
      }
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
