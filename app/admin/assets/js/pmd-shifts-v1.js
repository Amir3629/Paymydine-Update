(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  var modal = document.querySelector('[data-pmd-shift-modal]');
  if (!root || !modal) return;

  var form = modal.querySelector('[data-pmd-shift-form]');
  var title = modal.querySelector('[data-pmd-shift-modal-title]');
  var idInput = modal.querySelector('[data-pmd-shift-id]');
  var dateInput = modal.querySelector('[data-pmd-shift-date-input]');
  var labelInput = modal.querySelector('[data-pmd-shift-label]');
  var startInput = modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal.querySelector('[data-pmd-shift-end]');
  var notesInput = modal.querySelector('[data-pmd-shift-notes]');
  var personInputs = Array.prototype.slice.call(modal.querySelectorAll('[data-pmd-shift-person]'));
  var lastTrigger = null;

  function setScrollLock(locked) {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  function clearPresets() {
    modal.querySelectorAll('[data-pmd-shift-preset]').forEach(function (button) {
      button.classList.remove('is-active');
    });
  }

  function resetForm(date) {
    if (form) form.reset();
    if (idInput) idInput.value = '';
    if (dateInput) dateInput.value = date || '';
    if (labelInput) labelInput.value = 'Dinner';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (notesInput) notesInput.value = '';
    personInputs.forEach(function (input) { input.checked = false; });
    clearPresets();
  }

  function openModal(trigger, values) {
    lastTrigger = trigger || null;
    values = values || {};
    resetForm(values.date || new Date().toISOString().slice(0, 10));

    if (values.id && idInput) idInput.value = values.id;
    if (values.label && labelInput) labelInput.value = values.label;
    if (values.start !== undefined && startInput) startInput.value = values.start || '';
    if (values.end !== undefined && endInput) endInput.value = values.end || '';
    if (values.notes !== undefined && notesInput) notesInput.value = values.notes || '';
    if (title) title.textContent = values.id ? 'Edit shift' : 'Add shift';

    var selectedPeople = String(values.people || '')
      .split(',')
      .map(function (value) { return value.trim(); })
      .filter(Boolean);
    personInputs.forEach(function (input) {
      input.checked = selectedPeople.indexOf(String(input.value)) !== -1;
    });

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
    window.setTimeout(function () {
      if (labelInput) labelInput.focus();
    }, 0);
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function valuesFromTrigger(trigger) {
    return {
      id: trigger.getAttribute('data-id') || '',
      date: trigger.getAttribute('data-date') || '',
      label: trigger.getAttribute('data-label') || '',
      start: trigger.getAttribute('data-start') || '',
      end: trigger.getAttribute('data-end') || '',
      notes: trigger.getAttribute('data-notes') || '',
      people: trigger.getAttribute('data-people') || ''
    };
  }

  function loadExactSharedUiCss() {
    if (document.querySelector('link[data-pmd-shifts-exact-ui-v4]')) return;
    var base = document.querySelector('link[href*="pmd-shifts-v1.css"]');
    var href = '/app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css?v=4';
    if (base && base.getAttribute('href')) {
      href = base.getAttribute('href').replace(/pmd-shifts-v1\.css(?:\?[^#]*)?/, 'pmd-shifts-dashboard-reservations-v4.css?v=4');
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-pmd-shifts-exact-ui-v4', '');
    document.head.appendChild(link);
  }

  function countMonthShifts() {
    var total = 0;
    root.querySelectorAll('.pmd-shifts__calendar-day:not(.is-outside)').forEach(function (day) {
      total += day.querySelectorAll('[data-pmd-shift-edit]').length;
      var more = day.querySelector('.pmd-shifts__calendar-more');
      if (more) {
        var match = String(more.textContent || '').match(/\+(\d+)/);
        if (match) total += Number(match[1] || 0);
      }
    });
    return total;
  }

  function iconMarkup(name) {
    var icons = {
      calendar: '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path>',
      users: '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
      timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path>'
    };
    return icons[name] || icons.calendar;
  }

  function appendKpiCard(container, titleText, valueText, description, tone, icon) {
    var article = document.createElement('article');
    article.className = 'pmd-shifts__kpi pmd-shifts__kpi-generated';
    article.setAttribute('data-pmd-shifts-generated-kpi', '');
    article.innerHTML = ''
      + '<span class="pmd-shifts__kpi-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + iconMarkup(icon) + '</svg></span>'
      + '<div><small>' + titleText + '</small><strong>' + valueText + '</strong><span>' + description + '</span></div>';
    article.setAttribute('data-pmd-kpi-v2401-tone', tone);
    container.appendChild(article);
  }

  function closeKpiMenus(except) {
    root.querySelectorAll('[data-pmd-shift-kpi-menu]').forEach(function (menu) {
      if (except && menu === except) return;
      menu.hidden = true;
      var card = menu.closest('.pmd-r2-kpi-v2401-card');
      var button = card && card.querySelector('[data-pmd-shift-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }

  function enhanceKpis() {
    var container = root.querySelector('.pmd-shifts__kpis');
    if (!container || container.getAttribute('data-pmd-shifts-kpis-v4') === 'ready') return;

    var monthShifts = countMonthShifts();
    appendKpiCard(container, 'Month shifts', String(monthShifts), 'planned shifts in this month', 'orange', 'calendar');
    appendKpiCard(container, 'Active team', String(personInputs.length), 'people available for scheduling', 'blue', 'users');

    container.id = 'pmd-r2-reservation-kpis-v307';
    container.classList.add('pmd-r2-kpis-v2401', 'pmd-dashboard2-kpis-v2', 'pmd-shifts-exact-kpis');
    container.setAttribute('data-pmd-shifts-kpis-v4', 'ready');

    var tones = ['blue', 'green', 'red', 'purple', 'orange', 'blue'];
    var explanations = [
      'Unique people planned across today’s shifts.',
      'People confirmed present in the active shift. This stays neutral until the shift is confirmed.',
      'People confirmed missing from the active shift. PMD never guesses this before confirmation.',
      'Total planned person-hours in the selected month from shifts that have start/end times and named people.',
      'Number of planned shifts inside the selected month.',
      'Active restaurant people available in Team for shift planning. A PMD login is not required.'
    ];

    Array.prototype.slice.call(container.children).forEach(function (card, index) {
      var icon = card.querySelector('.pmd-shifts__kpi-icon');
      var copy = card.querySelector(':scope > div');
      var titleNode = copy && copy.querySelector('small');
      var valueNode = copy && copy.querySelector('strong');
      var descriptionNode = copy && copy.querySelector(':scope > span');
      var titleText = titleNode ? String(titleNode.textContent || '').trim() : 'Shift KPI';

      card.classList.add('pmd-r2-kpi-v2401-card');
      card.setAttribute('data-pmd-kpi-v2401-tone', tones[index] || 'green');
      if (icon) icon.classList.add('pmd-r2-kpi-v2401-icon');
      if (copy) copy.classList.add('pmd-r2-kpi-v2401-copy');
      if (titleNode) titleNode.classList.add('pmd-r2-kpi-v2401-title');
      if (valueNode) valueNode.classList.add('pmd-r2-kpi-v2401-value');
      if (descriptionNode) descriptionNode.classList.add('pmd-r2-kpi-v2401-description');

      if (!card.querySelector('[data-pmd-shift-kpi-menu-button]')) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'pmd-r2-kpi-v2401-more';
        more.setAttribute('data-pmd-shift-kpi-menu-button', '');
        more.setAttribute('aria-label', 'About ' + titleText);
        more.setAttribute('aria-haspopup', 'menu');
        more.setAttribute('aria-expanded', 'false');
        more.innerHTML = '<span></span><span></span><span></span>';

        var menu = document.createElement('div');
        menu.className = 'pmd-r2-kpi-v2401-menu pmd-shifts-kpi-menu';
        menu.setAttribute('data-pmd-shift-kpi-menu', '');
        menu.setAttribute('role', 'menu');
        menu.hidden = true;
        menu.innerHTML = ''
          + '<span class="pmd-dashboard-lab__kpi-menu-heading">About this KPI</span>'
          + '<div class="pmd-shifts-kpi-menu-copy"><strong>' + titleText + '</strong><span>' + (explanations[index] || 'Shift planning metric.') + '</span></div>';
        card.appendChild(more);
        card.appendChild(menu);
      }
    });
  }

  function enhanceCalendar() {
    var section = root.querySelector('.pmd-shifts__calendar-card');
    if (!section || section.getAttribute('data-pmd-shifts-calendar-v4') === 'ready') return;

    var oldHead = section.querySelector('.pmd-shifts__section-head');
    var oldWeekdays = section.querySelector('.pmd-shifts__calendar-weekdays');
    var oldGrid = section.querySelector('.pmd-shifts__calendar');
    if (!oldHead || !oldWeekdays || !oldGrid) return;

    var titleText = (oldHead.querySelector('h2') && oldHead.querySelector('h2').textContent || '').trim();
    var navLinks = Array.prototype.slice.call(oldHead.querySelectorAll('.pmd-shifts__calendar-nav a'));
    var prevHref = navLinks[0] ? navLinks[0].getAttribute('href') : '#';
    var todayHref = navLinks[1] ? navLinks[1].getAttribute('href') : '#';
    var nextHref = navLinks[2] ? navLinks[2].getAttribute('href') : '#';
    var selectedAdd = oldGrid.querySelector('.pmd-shifts__calendar-day.is-selected [data-pmd-shift-open]');
    var selectedDate = selectedAdd ? selectedAdd.getAttribute('data-date') : '';

    Array.prototype.slice.call(oldGrid.children).forEach(function (day) {
      var outside = day.classList.contains('is-outside');
      var today = day.classList.contains('is-today');
      var selected = day.classList.contains('is-selected');
      var dayLink = day.querySelector('.pmd-shifts__calendar-day-link');
      var number = day.querySelector('.pmd-shifts__date-number');
      var editButtons = Array.prototype.slice.call(day.querySelectorAll('[data-pmd-shift-edit]'));
      var more = day.querySelector('.pmd-shifts__calendar-more');
      var add = day.querySelector('[data-pmd-shift-open]');
      var openHref = dayLink ? dayLink.getAttribute('href') : '#';
      var openLabel = dayLink ? dayLink.getAttribute('aria-label') : 'Open day';
      var numberText = number ? String(number.textContent || '').trim() : '';

      day.className = 'pmd-yc-day' + (outside ? ' is-outside' : '') + (today ? ' is-today' : '') + (selected ? ' is-selected' : '');
      day.innerHTML = '';

      var open = document.createElement('a');
      open.className = 'pmd-shifts-yc-day-open';
      open.href = openHref || '#';
      open.setAttribute('aria-label', openLabel || 'Open day');
      day.appendChild(open);

      var numberNode = document.createElement('span');
      numberNode.className = 'pmd-yc-day__number';
      numberNode.textContent = numberText;
      day.appendChild(numberNode);

      var operations = document.createElement('div');
      operations.className = 'pmd-yc-day__operations';
      editButtons.forEach(function (button) {
        var time = button.querySelector('span');
        var name = button.querySelector('strong');
        var label = ((time ? time.textContent : '') + ' · ' + (name ? name.textContent : '')).trim();
        button.className = 'pmd-r2-yc-entry is-shift';
        button.innerHTML = label;
        operations.appendChild(button);
      });
      if (more) {
        more.className = 'pmd-shifts-yc-more';
        operations.appendChild(more);
      }
      day.appendChild(operations);

      if (add) {
        add.className = 'pmd-shifts-yc-add';
        add.textContent = '+';
        day.appendChild(add);
      }
    });

    oldWeekdays.className = 'pmd-yc-weekdays';
    oldGrid.className = 'pmd-yc-days';

    var toolbar = document.createElement('div');
    toolbar.className = 'pmd-yc__toolbar';
    toolbar.innerHTML = ''
      + '<div class="pmd-yc__legend">'
      + '  <span><i class="is-shift">S</i>Shift</span>'
      + '  <span><i class="is-confirmed">✓</i>Confirmed</span>'
      + '  <span><i class="is-missing">!</i>Missing</span>'
      + '</div>'
      + '<div class="pmd-yc__month-nav">'
      + '  <a href="' + (prevHref || '#') + '" aria-label="Previous month">←</a>'
      + '  <strong>' + titleText + '</strong>'
      + '  <a href="' + (nextHref || '#') + '" aria-label="Next month">→</a>'
      + '</div>'
      + '<div class="pmd-yc__toolbar-right">'
      + '  <div class="pmd-yc__view-switch"><a href="#" class="is-active" data-pmd-shifts-month-view>Month</a><a href="#pmd-shift-day">Day</a></div>'
      + '  <a href="' + (todayHref || '#') + '">Today</a>'
      + '</div>';

    var frame = document.createElement('div');
    frame.className = 'pmd-r2-yc-calendar-frame';
    frame.setAttribute('data-r2-yc-calendar-frame', '');
    frame.appendChild(toolbar);

    var months = document.createElement('main');
    months.className = 'pmd-yc__months';

    var month = document.createElement('section');
    month.className = 'pmd-yc-month is-month-view';
    var monthHead = document.createElement('header');
    monthHead.className = 'pmd-yc-month__head';
    monthHead.innerHTML = '<h2>' + titleText + '</h2>';
    var monthAdd = document.createElement('button');
    monthAdd.type = 'button';
    monthAdd.className = 'pmd-shifts-yc-month-add';
    monthAdd.setAttribute('data-pmd-shift-open', '');
    monthAdd.setAttribute('data-date', selectedDate || new Date().toISOString().slice(0, 10));
    monthAdd.textContent = '+ Shift';
    monthHead.appendChild(monthAdd);

    month.appendChild(monthHead);
    month.appendChild(oldWeekdays);
    month.appendChild(oldGrid);
    months.appendChild(month);
    frame.appendChild(months);

    section.innerHTML = '';
    section.id = 'pmd-r2-calendar-surface-v160';
    section.className = 'pmd-shifts-reservations-calendar is-visible is-month-mode';
    section.setAttribute('data-pmd-shifts-calendar-v4', 'ready');
    section.appendChild(frame);
  }

  function enhanceExactSharedUi() {
    loadExactSharedUiCss();
    enhanceKpis();
    enhanceCalendar();
  }

  enhanceExactSharedUi();

  document.addEventListener('click', function (event) {
    var kpiButton = event.target.closest('[data-pmd-shift-kpi-menu-button]');
    if (kpiButton) {
      event.preventDefault();
      event.stopPropagation();
      var card = kpiButton.closest('.pmd-r2-kpi-v2401-card');
      var menu = card && card.querySelector('[data-pmd-shift-kpi-menu]');
      if (menu) {
        var opening = menu.hidden;
        closeKpiMenus(menu);
        menu.hidden = !opening;
        kpiButton.setAttribute('aria-expanded', opening ? 'true' : 'false');
      }
      return;
    }

    if (!event.target.closest('[data-pmd-shift-kpi-menu]')) closeKpiMenus();

    var monthView = event.target.closest('[data-pmd-shifts-month-view]');
    if (monthView) {
      event.preventDefault();
      var calendar = document.getElementById('pmd-r2-calendar-surface-v160');
      if (calendar) calendar.scrollIntoView({behavior: 'smooth', block: 'start'});
      return;
    }

    var add = event.target.closest('[data-pmd-shift-open]');
    if (add) {
      event.preventDefault();
      openModal(add, {date: add.getAttribute('data-date') || ''});
      return;
    }

    var edit = event.target.closest('[data-pmd-shift-edit]');
    if (edit) {
      event.preventDefault();
      openModal(edit, valuesFromTrigger(edit));
      return;
    }

    var close = event.target.closest('[data-pmd-shift-close]');
    if (close) {
      event.preventDefault();
      closeModal();
      return;
    }

    var preset = event.target.closest('[data-pmd-shift-preset]');
    if (preset) {
      event.preventDefault();
      clearPresets();
      preset.classList.add('is-active');
      if (labelInput) labelInput.value = preset.getAttribute('data-pmd-shift-preset') || 'Shift';
      if (startInput) startInput.value = preset.getAttribute('data-start') || '';
      if (endInput) endInput.value = preset.getAttribute('data-end') || '';
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeKpiMenus();
      if (!modal.hidden) closeModal();
    }
  });
})();