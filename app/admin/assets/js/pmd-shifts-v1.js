/* PMD_SHIFTS_CONNECTED_WORKSPACE_V5
 * Four configurable Owner-Dashboard KPI cards.
 * Reservations-style month -> hour workflow.
 * Shift team editing always reuses the canonical Save Shift form.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var modal = root.querySelector('[data-pmd-shift-modal]');
  var capacityModal = root.querySelector('[data-pmd-capacity-modal]');
  var teamModal = root.querySelector('[data-pmd-team-modal]');
  var teamForm = teamModal && teamModal.querySelector('[data-pmd-team-form]');
  var teamIdInput = teamModal && teamModal.querySelector('[data-pmd-team-person-id]');
  var teamNameInput = teamModal && teamModal.querySelector('[data-pmd-team-name]');
  var teamRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-role]');
  var teamDepartmentInput = teamModal && teamModal.querySelector('[data-pmd-team-department]');
  var teamAccessToggle = teamModal && teamModal.querySelector('[data-pmd-team-access-toggle]');
  var teamAccessFields = teamModal && teamModal.querySelector('[data-pmd-team-access-fields]');
  var teamUsernameInput = teamModal && teamModal.querySelector('[data-pmd-team-username]');
  var teamAccessRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-access-role]');
  var teamPasswordInput = teamModal && teamModal.querySelector('[data-pmd-team-password]');
  var teamPasswordHint = teamModal && teamModal.querySelector('[data-pmd-team-password-hint]');
  var teamFormTitle = teamModal && teamModal.querySelector('[data-pmd-team-form-title]');
  var teamUsernameTouched = false;
  var teamHasExistingAccess = false;
  var form = modal && modal.querySelector('[data-pmd-shift-form]');
  var title = modal && modal.querySelector('[data-pmd-shift-modal-title]');
  var idInput = modal && modal.querySelector('[data-pmd-shift-id]');
  var dateInput = modal && modal.querySelector('[data-pmd-shift-date-input]');
  var labelInput = modal && modal.querySelector('[data-pmd-shift-label]');
  var startInput = modal && modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal && modal.querySelector('[data-pmd-shift-end]');
  var breakInput = modal && modal.querySelector('[data-pmd-shift-break]');
  var notesInput = modal && modal.querySelector('[data-pmd-shift-notes]');
  var personInputs = modal
    ? Array.prototype.slice.call(modal.querySelectorAll('[data-pmd-shift-person]'))
    : [];
  var lastTrigger = null;
  var activeKpiMenu = null;

  var boot = {};
  var kpiCards = {};
  try {
    var bootNode = document.getElementById('pmd-shifts-bootstrap');
    boot = JSON.parse((bootNode && bootNode.textContent) || '{}') || {};
  } catch (error) {
    boot = {};
  }
  try {
    var kpiNode = document.getElementById('pmd-shifts-kpi-data');
    kpiCards = JSON.parse((kpiNode && kpiNode.textContent) || '{}') || {};
  } catch (error) {
    kpiCards = {};
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }

  function loadExactSharedUiCss() {
    if (document.querySelector('link[data-pmd-shifts-exact-ui-v17]')) return;
    var base = document.querySelector('link[href*="pmd-shifts-v1.css"]');
    var href = '/app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css?v=17';
    if (base && base.getAttribute('href')) {
      href = base.getAttribute('href').replace(
        /pmd-shifts-v1\.css(?:\?[^#]*)?/,
        'pmd-shifts-dashboard-reservations-v4.css?v=17'
      );
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-pmd-shifts-exact-ui-v17', '');
    document.head.appendChild(link);
  }

  function setScrollLock(locked) {
    var value = locked ? 'hidden' : '';
    document.documentElement.style.overflow = value;
    document.body.style.overflow = value;
  }

  function syncReturnTo(container) {
    if (!container) return;
    var value = window.location.pathname + window.location.search;
    container.querySelectorAll('input[name="return_to"]').forEach(function (input) {
      input.value = value;
    });
  }

  function clearPresets() {
    if (!modal) return;
    modal.querySelectorAll('[data-pmd-shift-preset]').forEach(function (button) {
      button.classList.remove('is-active');
    });
  }

  function resetForm(date) {
    if (!form) return;
    form.reset();
    if (idInput) idInput.value = '';
    if (dateInput) dateInput.value = date || '';
    if (labelInput) labelInput.value = 'Shift';
    if (startInput) startInput.value = '09:00';
    if (endInput) endInput.value = '17:00';
    if (breakInput) breakInput.value = '30';
    if (notesInput) notesInput.value = '';
    personInputs.forEach(function (input) { input.checked = false; });
    clearPresets();
  }

  function openModal(trigger, values) {
    if (!modal) return;
    lastTrigger = trigger || null;
    syncReturnTo(modal);
    values = values || {};
    resetForm(values.date || boot.selected_day || new Date().toISOString().slice(0, 10));

    if (values.id && idInput) idInput.value = String(values.id);
    if (values.date && dateInput) dateInput.value = String(values.date);
    if (values.label && labelInput) labelInput.value = String(values.label);
    if (values.start !== undefined && startInput) startInput.value = values.start || '';
    if (values.end !== undefined && endInput) endInput.value = values.end || '';
    if (values.break_minutes !== undefined && breakInput) breakInput.value = String(values.break_minutes == null ? 30 : values.break_minutes);
    if (values.notes !== undefined && notesInput) notesInput.value = values.notes || '';
    if (title) title.textContent = values.id ? 'Edit shift' : 'Add shift';

    var selectedPeople = Array.isArray(values.person_ids)
      ? values.person_ids.map(String)
      : String(values.people || '')
          .split(',')
          .map(function (value) { return value.trim(); })
          .filter(Boolean);

    personInputs.forEach(function (input) {
      input.checked = selectedPeople.indexOf(String(input.value)) !== -1;
    });

    modal.hidden = false;
    modal.scrollTop = 0;
    var modalBody = modal.querySelector('.pmd-shifts__modal-body');
    if (modalBody) modalBody.scrollTop = 0;
    modal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
    window.setTimeout(function () {
      if (labelInput) labelInput.focus();
    }, 0);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    if ((!capacityModal || capacityModal.hidden) && (!teamModal || teamModal.hidden)) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function openCapacity(trigger) {
    if (!capacityModal) return;
    lastTrigger = trigger || null;
    syncReturnTo(capacityModal);
    capacityModal.hidden = false;
    capacityModal.scrollTop = 0;
    var capacityBody = capacityModal.querySelector('.pmd-shifts__modal-body');
    if (capacityBody) capacityBody.scrollTop = 0;
    capacityModal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
  }

  function closeCapacity() {
    if (!capacityModal) return;
    capacityModal.hidden = true;
    capacityModal.setAttribute('aria-hidden', 'true');
    if ((!modal || modal.hidden) && (!teamModal || teamModal.hidden)) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function syncTeamAccessFields() {
    if (!teamAccessFields) return;
    teamAccessFields.hidden = false;
    teamAccessFields.querySelectorAll('input,select').forEach(function (field) { field.disabled = false; });
    if (teamUsernameInput) teamUsernameInput.required = true;
    if (teamAccessRoleInput) teamAccessRoleInput.required = true;
    if (teamPasswordInput) teamPasswordInput.required = !teamHasExistingAccess;
  }

  function suggestedUsername(name) {
    var value = String(name || '').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    value = value.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
    return value || 'team-member';
  }

  function resetTeamForm() {
    if (!teamForm) return;
    teamForm.reset();
    if (teamIdInput) teamIdInput.value = '';
    if (teamDepartmentInput) teamDepartmentInput.value = 'other';
    if (teamFormTitle) teamFormTitle.textContent = 'Add team member';
    if (teamAccessRoleInput) teamAccessRoleInput.value = teamForm.getAttribute('data-default-access-role') || teamAccessRoleInput.value;
    if (teamPasswordInput) teamPasswordInput.value = '';
    if (teamPasswordHint) teamPasswordHint.textContent = 'required for new login';
    teamUsernameTouched = false;
    teamHasExistingAccess = false;
    syncTeamAccessFields();
  }

  function openTeam(trigger, personNode) {
    if (!teamModal) return;
    lastTrigger = trigger || null;
    syncReturnTo(teamModal);
    resetTeamForm();
    if (personNode) {
      if (teamIdInput) teamIdInput.value = personNode.getAttribute('data-person-id') || '';
      if (teamNameInput) teamNameInput.value = personNode.getAttribute('data-name') || '';
      if (teamRoleInput) teamRoleInput.value = personNode.getAttribute('data-role') || '';
      if (teamDepartmentInput) teamDepartmentInput.value = personNode.getAttribute('data-department') || 'other';
      var hasAccess = personNode.getAttribute('data-has-access') === '1';
      teamHasExistingAccess = hasAccess;
      if (teamUsernameInput) teamUsernameInput.value = personNode.getAttribute('data-username') || suggestedUsername(personNode.getAttribute('data-name'));
      if (teamAccessRoleInput && personNode.getAttribute('data-staff-role-id')) teamAccessRoleInput.value = personNode.getAttribute('data-staff-role-id');
      if (teamPasswordInput) teamPasswordInput.value = '';
      if (teamPasswordHint) teamPasswordHint.textContent = hasAccess ? 'leave blank to keep current password' : 'required for new login';
      if (teamFormTitle) teamFormTitle.textContent = 'Edit team member';
      teamUsernameTouched = hasAccess;
      syncTeamAccessFields();
    }
    teamModal.hidden = false;
    teamModal.scrollTop = 0;
    var teamCard = teamModal.querySelector('.pmd-shifts__team-card');
    if (teamCard) teamCard.scrollTop = 0;
    teamModal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
    window.setTimeout(function () { if (teamNameInput) teamNameInput.focus(); }, 0);
  }

  function mountHeaderNotification() {
    var slot = root.querySelector('[data-pmd-shifts-notification-slot]');
    var notificationRoot = document.getElementById('notif-root');
    if (!slot || !notificationRoot) return false;
    if (!slot.contains(notificationRoot)) {
      slot.innerHTML = '';
      slot.appendChild(notificationRoot);
    }
    notificationRoot.classList.add('pmd-shifts__notification-root');
    var trigger = notificationRoot.querySelector('#notifDropdown');
    if (trigger) {
      trigger.setAttribute('aria-label', 'Notifications');
      trigger.setAttribute('title', 'Notifications');
    }
    return true;
  }

  function ensureHeaderNotification() {
    var attempts = 0;
    function tryMount() {
      if (mountHeaderNotification()) return;
      attempts += 1;
      if (attempts < 20) window.setTimeout(tryMount, 150);
    }
    tryMount();
  }

  function scrollToTeamPanel(personId) {
    var panel = root.querySelector('[data-pmd-shifts-team-panel]');
    if (!panel) return;
    panel.scrollIntoView({behavior: 'smooth', block: 'start'});
    if (!personId) return;
    var row = panel.querySelector('[data-pmd-team-panel-person-id="' + Number(personId || 0) + '"]');
    if (!row) return;
    row.classList.add('is-focused');
    window.setTimeout(function () { row.classList.remove('is-focused'); }, 1600);
  }

  function closeTeam() {
    if (!teamModal) return;
    teamModal.hidden = true;
    teamModal.setAttribute('aria-hidden', 'true');
    if ((!modal || modal.hidden) && (!capacityModal || capacityModal.hidden)) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function findShift(id) {
    var numeric = Number(id || 0);
    var shifts = Array.isArray(boot.shifts) ? boot.shifts : [];
    for (var index = 0; index < shifts.length; index += 1) {
      if (Number(shifts[index].id || 0) === numeric) return shifts[index];
    }
    return null;
  }

  function valuesFromShift(shift) {
    shift = shift || {};
    return {
      id: shift.id || '',
      date: shift.date || boot.selected_day || '',
      label: shift.label || 'Shift',
      start: shift.start || '',
      end: shift.end || '',
      notes: shift.notes || '',
      break_minutes: Number(shift.break_minutes == null ? 0 : shift.break_minutes),
      person_ids: (Array.isArray(shift.people) ? shift.people : [])
        .map(function (person) { return person && person.person_id; })
        .filter(Boolean)
    };
  }

  function iconMarkup(name) {
    var icons = {
      calendar: '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path>',
      check: '<path d="m5 12 4 4L19 6"></path>',
      alert: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 17h.01"></path>',
      timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"></path>',
      days: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"></path>',
      users: '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>'
    };
    return icons[name] || icons.calendar;
  }

  function kpiSection() {
    return root.querySelector('[data-pmd-shifts-kpis]');
  }

  function visibleKpiCards() {
    var section = kpiSection();
    if (!section) return [];
    return Array.prototype.slice.call(section.querySelectorAll('[data-pmd-shifts-kpi-slot]'))
      .sort(function (left, right) {
        return Number(left.getAttribute('data-pmd-shifts-kpi-slot')) - Number(right.getAttribute('data-pmd-shifts-kpi-slot'));
      });
  }

  function selectedKpiKeys() {
    return visibleKpiCards().map(function (card) {
      return card.getAttribute('data-pmd-shifts-kpi-key') || '';
    });
  }

  function closeKpiMenu() {
    if (!activeKpiMenu) return;
    var menu = activeKpiMenu;
    var card = menu.closest('[data-pmd-shifts-kpi-slot]');
    var button = card && card.querySelector('[data-pmd-shifts-kpi-menu-button]');
    menu.hidden = true;
    activeKpiMenu = null;
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function syncKpiMenus() {
    var selected = selectedKpiKeys();
    visibleKpiCards().forEach(function (card) {
      var current = card.getAttribute('data-pmd-shifts-kpi-key') || '';
      card.querySelectorAll('[data-pmd-shifts-kpi-option]').forEach(function (option) {
        var key = option.getAttribute('data-pmd-shifts-kpi-option') || '';
        var isCurrent = key === current;
        var duplicate = selected.indexOf(key) !== -1 && !isCurrent;
        option.disabled = duplicate;
        option.classList.toggle('is-selected', isCurrent);
        var small = option.querySelector('small');
        var check = option.querySelector('.pmd-r2-kpi-v2401-check');
        if (small) small.textContent = isCurrent ? 'Visible in this card' : (duplicate ? 'Already visible' : 'Show in this card');
        if (check) check.textContent = isCurrent ? '✓' : '';
      });
    });
  }

  function persistKpis() {
    var keys = selectedKpiKeys();
    document.cookie = 'pmd_shifts_kpis=' + encodeURIComponent(keys.join(',')) + '; Path=/admin; Max-Age=31536000; SameSite=Lax';
    try {
      localStorage.setItem('pmd.shifts.kpis.v1', JSON.stringify(keys));
    } catch (error) {
      // Cookie is enough for server-first paint.
    }
  }

  function applyKpi(card, key) {
    var data = kpiCards[key];
    if (!card || !data) return;
    card.setAttribute('data-pmd-shifts-kpi-key', key);
    card.setAttribute('data-pmd-kpi-v2401-tone', data.tone || 'cyan');
    var icon = card.querySelector('.pmd-r2-kpi-v2401-icon');
    var titleNode = card.querySelector('.pmd-r2-kpi-v2401-title');
    var valueNode = card.querySelector('.pmd-r2-kpi-v2401-value');
    var descriptionNode = card.querySelector('.pmd-r2-kpi-v2401-description');
    if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconMarkup(data.icon) + '</svg>';
    if (titleNode) titleNode.textContent = data.title || key;
    if (valueNode) valueNode.textContent = data.value == null ? '0' : String(data.value);
    if (descriptionNode) descriptionNode.textContent = data.description || '';
    persistKpis();
    syncKpiMenus();
  }

  function parseDateKey(key) {
    var parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function dateKey(date) {
    function pad(value) { return String(value).padStart(2, '0'); }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function shiftedDate(key, amount) {
    var date = parseDateKey(key);
    if (!date) return key;
    date.setDate(date.getDate() + amount);
    return dateKey(date);
  }

  function monthKey(key) {
    var date = parseDateKey(key);
    if (!date) return '';
    return dateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0));
  }

  function formattedDate(key) {
    var date = parseDateKey(key);
    if (!date) return key;
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return key;
    }
  }

  function minuteValue(clock, fallback) {
    var match = String(clock || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) return fallback;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function minuteLabel(value) {
    var minutes = Number(value || 0) % 1440;
    if (minutes < 0) minutes += 1440;
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }

  function shiftsForDate(key) {
    return (Array.isArray(boot.shifts) ? boot.shifts : []).filter(function (shift) {
      return String(shift.date || '') === String(key || '');
    }).sort(function (left, right) {
      return minuteValue(left.start, 9999) - minuteValue(right.start, 9999);
    });
  }

  function shiftWindow(shift) {
    var start = minuteValue(shift.start, 360);
    var end = minuteValue(shift.end, 1560);
    if (!shift.start && !shift.end) return {start: 360, end: 1560};
    if (!shift.start) start = 360;
    if (!shift.end) end = Math.min(1560, start + 8 * 60);
    if (end <= start) end += 1440;
    return {start: start, end: end};
  }

  function activeAt(shift, cursor) {
    var window = shiftWindow(shift);
    return cursor >= window.start && cursor < window.end;
  }

  function schedulingPeople() {
    var people = Array.isArray(boot.people) ? boot.people.slice() : [];
    var departmentOrder = {kitchen: 0, floor: 1, bar: 2, reception: 3, other: 4};
    return people.sort(function (left, right) {
      var leftDepartment = departmentOrder[String(left.department || 'other')];
      var rightDepartment = departmentOrder[String(right.department || 'other')];
      if (leftDepartment === undefined) leftDepartment = 4;
      if (rightDepartment === undefined) rightDepartment = 4;
      if (leftDepartment !== rightDepartment) return leftDepartment - rightDepartment;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
  }

  function personInitials(name) {
    var parts = String(name || 'Team').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'T');
  }

  function shiftHasPerson(shift, personId) {
    return (Array.isArray(shift.people) ? shift.people : []).some(function (person) {
      return Number(person && person.person_id || 0) === Number(personId || 0);
    });
  }

  function finalTimelineWindow(shift) {
    var dayStart = 360;
    var dayEnd = 1800;
    var window = shiftWindow(shift);
    var start = Math.max(dayStart, window.start);
    var end = Math.min(dayEnd, window.end);
    if (end <= start) end = Math.min(dayEnd, start + 30);
    return {start: start, end: end};
  }

  function finalShiftMarkup(shift, person) {
    var window = finalTimelineWindow(shift);
    var total = 1440;
    var left = ((window.start - 360) / total) * 100;
    var width = ((window.end - window.start) / total) * 100;
    var time = shift.start || 'All day';
    if (shift.end) time += '–' + shift.end;
    var attendance = (Array.isArray(shift.people) ? shift.people : []).find(function (assigned) {
      return Number(assigned && assigned.person_id || 0) === Number(person.id || 0);
    });
    var state = String(attendance && attendance.attendance || 'planned').toLowerCase();
    return '' +
      '<button type="button" class="pmd-shifts-final-shift' + (shift.confirmed ? ' is-confirmed' : '') + (state === 'absent' ? ' is-absent' : '') + '"' +
        ' data-pmd-shift-manage="' + Number(shift.id || 0) + '"' +
        ' style="left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%"' +
        ' title="' + escapeHtml((shift.label || 'Shift') + ' · ' + time) + '">' +
        '<strong>' + escapeHtml(time) + '</strong>' +
        '<span>' + escapeHtml(shift.label || 'Shift') + '</span>' +
      '</button>';
  }

  function finalTimeScaleMarkup() {
    var labels = [];
    for (var value = 360; value <= 1800; value += 120) {
      labels.push('<span>' + escapeHtml(minuteLabel(value)) + '</span>');
    }
    return labels.join('');
  }

  function finalSlotMarkup(person, key) {
    var slots = [];
    for (var value = 360; value < 1800; value += 30) {
      var time = minuteLabel(value);
      slots.push(
        '<button type="button" class="pmd-shifts-final-slot" data-pmd-person-slot-create' +
        ' data-person-id="' + Number(person.id || 0) + '" data-date="' + escapeHtml(key) + '" data-time="' + time + '"' +
        ' aria-label="Add ' + escapeHtml(person.name || 'team member') + ' at ' + time + '"><span>+</span></button>'
      );
    }
    return slots.join('');
  }

  function parseEmbeddedJson(doc, id) {
    try {
      var node = doc.getElementById(id);
      return JSON.parse((node && node.textContent) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function weekStartKey(key) {
    var date = parseDateKey(key);
    if (!date) return key;
    var mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return dateKey(date);
  }

  function renderHourView(key) {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    if (!host) return;

    key = key || boot.selected_day || new Date().toISOString().slice(0, 10);
    boot.selected_day = key;

    var globalAddShift = root.querySelector('.pmd-shifts__header [data-pmd-shift-open]');
    if (globalAddShift) globalAddShift.setAttribute('data-date', key);

    var shifts = shiftsForDate(key);
    var people = schedulingPeople();
    var todayKey = dateKey(new Date());

    var rows = people.map(function (person) {
      var personShifts = shifts.filter(function (shift) { return shiftHasPerson(shift, person.id); });
      var shiftsMarkup = personShifts.map(function (shift) { return finalShiftMarkup(shift, person); }).join('');
      return '' +
        '<div class="pmd-shifts-final-row" data-person-id="' + Number(person.id || 0) + '">' +
          '<div class="pmd-shifts-final-person">' +
            '<span class="pmd-shifts-final-avatar">' + escapeHtml(personInitials(person.name)) + '</span>' +
            '<span class="pmd-shifts-final-person-copy">' +
              '<button type="button" data-pmd-team-scroll-person="' + Number(person.id || 0) + '">' + escapeHtml(person.name || 'Team member') + '</button>' +
              '<small>' + escapeHtml(person.role || 'Team') + '</small>' +
            '</span>' +
          '</div>' +
          '<div class="pmd-shifts-final-track">' +
            '<div class="pmd-shifts-final-slots">' + finalSlotMarkup(person, key) + '</div>' +
            '<div class="pmd-shifts-final-shifts">' + shiftsMarkup + '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    var emptyState = people.length ? '' : '' +
      '<div class="pmd-shifts-final-empty">' +
        '<strong>No team members yet</strong>' +
        '<button type="button" data-pmd-team-open>+ Member</button>' +
      '</div>';

    host.innerHTML = '' +
      '<div class="pmd-shifts-final-screen">' +
        '<header class="pmd-shifts-final-toolbar">' +
          '<div class="pmd-shifts-final-date">' +
            '<button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-prev-day aria-label="Previous day">‹</button>' +
            '<div><h2>' + escapeHtml(formattedDate(key)) + '</h2></div>' +
            '<button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-next-day aria-label="Next day">›</button>' +
          '</div>' +
          '<div class="pmd-shifts-final-actions">' +
            (key === todayKey ? '' : '<button type="button" class="pmd-shifts-final-soft" data-pmd-shifts-today>Today</button>') +
            '<label class="pmd-shifts-date-picker" title="Choose date">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>' +
              '<input type="date" data-pmd-shifts-date-input value="' + escapeHtml(key) + '" aria-label="Choose date">' +
            '</label>' +
          '</div>' +
        '</header>' +
        emptyState +
        (people.length ? '' +
          '<div class="pmd-shifts-final-scroll">' +
            '<div class="pmd-shifts-final-board">' +
              '<div class="pmd-shifts-final-scale-row">' +
                '<div class="pmd-shifts-final-scale-person">Team</div>' +
                '<div class="pmd-shifts-final-scale">' + finalTimeScaleMarkup() + '</div>' +
              '</div>' +
              rows +
            '</div>' +
          '</div>' : '') +
      '</div>';

    host.hidden = false;

    try {
      var url = new URL(window.location.href);
      url.searchParams.set('month', monthKey(key));
      url.searchParams.set('day', key);
      url.hash = '';
      history.replaceState(null, '', url.toString());
    } catch (error) {}
  }

  function dayPageUrl(key) {
    var base = (boot.urls && boot.urls.shifts) || window.location.pathname;
    return base + '?month=' + encodeURIComponent(monthKey(key)) + '&day=' + encodeURIComponent(key);
  }

  function loadDayData(key) {
    var url = dayPageUrl(key);
    root.classList.add('is-day-loading');
    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(function (response) {
        if (!response.ok) throw new Error('Shift day request failed');
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nextBoot = parseEmbeddedJson(doc, 'pmd-shifts-bootstrap');
        var nextKpis = parseEmbeddedJson(doc, 'pmd-shifts-kpi-data');
        if (!nextBoot || !Array.isArray(nextBoot.shifts)) throw new Error('Shift day payload missing');
        boot = nextBoot;
        if (nextKpis && Object.keys(nextKpis).length) kpiCards = nextKpis;
        refreshVisibleKpis();
        renderHourView(key);
      })
      .finally(function () { root.classList.remove('is-day-loading'); });
  }

  function openHourDay(key) {
    key = String(key || '');
    if (!parseDateKey(key)) return;
    if (monthKey(key) !== String(boot.month || '')) {
      loadDayData(key).catch(function () { window.location.href = dayPageUrl(key); });
      return;
    }
    renderHourView(key);
  }

  function changeHourDay(delta) {
    openHourDay(shiftedDate(boot.selected_day, delta));
  }

  function submitRemoveShift(id) {
    var shift = findShift(id);
    if (!shift || !window.confirm('Remove this shift?')) return;
    var formNode = document.createElement('form');
    formNode.method = 'post';
    formNode.action = (boot.urls && boot.urls.remove) || '';
    formNode.style.display = 'none';
    formNode.innerHTML = '' +
      '<input type="hidden" name="_token" value="' + escapeHtml(boot.csrf || '') + '">' +
      '<input type="hidden" name="id" value="' + Number(id || 0) + '">' +
      '<input type="hidden" name="return_to" value="' + escapeHtml(window.location.pathname + window.location.search) + '">';
    document.body.appendChild(formNode);
    formNode.submit();
  }

  if (teamUsernameInput) teamUsernameInput.addEventListener('input', function () { teamUsernameTouched = true; });
  if (startInput) startInput.addEventListener('change', function () {
    if (!idInput || !idInput.value) {
      if (endInput) endInput.value = minuteLabel(minuteValue(startInput.value, 9 * 60) + 8 * 60);
    }
  });
  if (teamNameInput) teamNameInput.addEventListener('input', function () {
    if (teamUsernameInput && !teamUsernameTouched) teamUsernameInput.value = suggestedUsername(teamNameInput.value);
  });
  loadExactSharedUiCss();
  syncKpiMenus();
  ensureHeaderNotification();

  document.addEventListener('click', function (event) {
    var generatePassword = event.target.closest('[data-pmd-team-password-generate]');
    if (generatePassword && teamModal && teamModal.contains(generatePassword)) {
      event.preventDefault();
      var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      var password = '';
      for (var p = 0; p < 12; p += 1) password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      if (teamPasswordInput) { teamPasswordInput.value = password; teamPasswordInput.type = 'text'; teamPasswordInput.focus(); teamPasswordInput.select(); }
      return;
    }

    var kpiButton = event.target.closest('[data-pmd-shifts-kpi-menu-button]');
    if (kpiButton && root.contains(kpiButton)) {
      event.preventDefault();
      event.stopPropagation();
      var card = kpiButton.closest('[data-pmd-shifts-kpi-slot]');
      var menu = card && card.querySelector('[data-pmd-shifts-kpi-menu]');
      if (!menu) return;
      var opening = menu.hidden;
      closeKpiMenu();
      if (opening) {
        menu.hidden = false;
        activeKpiMenu = menu;
        kpiButton.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    var kpiOption = event.target.closest('[data-pmd-shifts-kpi-option]');
    if (kpiOption && root.contains(kpiOption) && !kpiOption.disabled) {
      event.preventDefault();
      event.stopPropagation();
      var optionCard = kpiOption.closest('[data-pmd-shifts-kpi-slot]');
      var key = kpiOption.getAttribute('data-pmd-shifts-kpi-option') || '';
      closeKpiMenu();
      applyKpi(optionCard, key);
      return;
    }

    if (activeKpiMenu && !activeKpiMenu.contains(event.target)) closeKpiMenu();

    var teamScrollPerson = event.target.closest('[data-pmd-team-scroll-person]');
    if (teamScrollPerson) {
      event.preventDefault();
      scrollToTeamPanel(teamScrollPerson.getAttribute('data-pmd-team-scroll-person'));
      return;
    }
    var teamScroll = event.target.closest('[data-pmd-team-scroll]');
    if (teamScroll) {
      event.preventDefault();
      scrollToTeamPanel(null);
      return;
    }

    var teamOpen = event.target.closest('[data-pmd-team-open]');
    if (teamOpen) {
      event.preventDefault();
      openTeam(teamOpen, null);
      return;
    }
    var teamClose = event.target.closest('[data-pmd-team-close]');
    if (teamClose) {
      event.preventDefault();
      closeTeam();
      return;
    }
    var teamEdit = event.target.closest('[data-pmd-team-edit]');
    if (teamEdit) {
      event.preventDefault();
      openTeam(teamEdit, teamEdit);
      return;
    }
    var teamNew = event.target.closest('[data-pmd-team-new]');
    if (teamNew) {
      event.preventDefault();
      resetTeamForm();
      if (teamNameInput) teamNameInput.focus();
      return;
    }

    var capacityOpen = event.target.closest('[data-pmd-capacity-open]');
    if (capacityOpen) {
      event.preventDefault();
      openCapacity(capacityOpen);
      return;
    }
    var capacityClose = event.target.closest('[data-pmd-capacity-close]');
    if (capacityClose) {
      event.preventDefault();
      closeCapacity();
      return;
    }

    if (event.target.closest('[data-pmd-shifts-today]')) {
      event.preventDefault();
      openHourDay(dateKey(new Date()));
      return;
    }

    if (event.target.closest('[data-pmd-shifts-prev-day]')) {
      event.preventDefault();
      changeHourDay(-1);
      return;
    }
    if (event.target.closest('[data-pmd-shifts-next-day]')) {
      event.preventDefault();
      changeHourDay(1);
      return;
    }

    var manage = event.target.closest('[data-pmd-shift-manage]');
    if (manage) {
      event.preventDefault();
      var managedShift = findShift(manage.getAttribute('data-pmd-shift-manage'));
      if (managedShift) openModal(manage, valuesFromShift(managedShift));
      return;
    }

    var personSlotCreate = event.target.closest('[data-pmd-person-slot-create]');
    if (personSlotCreate) {
      event.preventDefault();
      var personStart = personSlotCreate.getAttribute('data-time') || '';
      var personStartMinutes = minuteValue(personStart, 0);
      openModal(personSlotCreate, {
        date: personSlotCreate.getAttribute('data-date') || boot.selected_day || '',
        label: 'Shift',
        start: personStart,
        end: minuteLabel(personStartMinutes + 8 * 60),
        break_minutes: 30,
        person_ids: [Number(personSlotCreate.getAttribute('data-person-id') || 0)]
      });
      return;
    }

    var add = event.target.closest('[data-pmd-shift-open]');
    if (add) {
      event.preventDefault();
      openModal(add, {date: add.getAttribute('data-date') || boot.selected_day || ''});
      return;
    }

    var close = event.target.closest('[data-pmd-shift-close]');
    if (close) {
      event.preventDefault();
      closeModal();
      return;
    }

    var durationQuick = event.target.closest('[data-pmd-shift-duration]');
    if (durationQuick && modal && modal.contains(durationQuick)) {
      event.preventDefault();
      var duration = Math.max(30, Number(durationQuick.getAttribute('data-pmd-shift-duration') || 480));
      if (startInput && endInput) endInput.value = minuteLabel(minuteValue(startInput.value, 9 * 60) + duration);
      return;
    }

    var breakQuick = event.target.closest('[data-pmd-shift-break-default]');
    if (breakQuick && modal && modal.contains(breakQuick)) {
      event.preventDefault();
      if (breakInput) breakInput.value = String(Math.max(0, Number(breakQuick.getAttribute('data-pmd-shift-break-default') || 30)));
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
      return;
    }

    var remove = event.target.closest('[data-pmd-shift-remove]');
    if (remove) {
      event.preventDefault();
      submitRemoveShift(remove.getAttribute('data-pmd-shift-remove'));
    }
  });

  document.addEventListener('change', function (event) {
    var dateInput = event.target && event.target.closest
      ? event.target.closest('[data-pmd-shifts-date-input]')
      : null;
    if (!dateInput || !root.contains(dateInput)) return;
    openHourDay(dateInput.value);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeKpiMenu();
    if (modal && !modal.hidden) closeModal();
    if (capacityModal && !capacityModal.hidden) closeCapacity();
    if (teamModal && !teamModal.hidden) closeTeam();
  });

  if (boot.open_hour_on_boot && boot.selected_day) {
    renderHourView(boot.selected_day);
  }
})();
