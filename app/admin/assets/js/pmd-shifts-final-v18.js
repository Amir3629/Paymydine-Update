/* PMD_SHIFTS_FINAL_V18 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var memberMap = {};
  var decorateTimers = [];

  function captureBootPeople() {
    try {
      var node = document.getElementById('pmd-shifts-bootstrap');
      var payload = JSON.parse((node && node.textContent) || '{}') || {};
      (Array.isArray(payload.people) ? payload.people : []).forEach(function (person) {
        var id = Number(person && person.id || 0);
        if (!id) return;
        memberMap[String(id)] = {
          id: id,
          name: String(person.name || ''),
          role: String(person.role || ''),
          department: String(person.department || 'other'),
          hasAccess: person.has_access ? '1' : '0',
          username: String(person.username || ''),
          staffRoleId: person.staff_role_id == null ? '' : String(person.staff_role_id)
        };
      });
    } catch (error) {}
  }

  function copyMemberData(node) {
    var id = Number(node && node.getAttribute('data-person-id') || 0);
    if (!id) return;
    memberMap[String(id)] = {
      id: id,
      name: node.getAttribute('data-name') || '',
      role: node.getAttribute('data-role') || '',
      department: node.getAttribute('data-department') || 'other',
      hasAccess: node.getAttribute('data-has-access') || '0',
      username: node.getAttribute('data-username') || '',
      staffRoleId: node.getAttribute('data-staff-role-id') || ''
    };
  }

  function captureMemberMap() {
    var panel = root.querySelector('#pmd-shifts-team-panel,[data-pmd-shifts-team-panel]');
    if (!panel) return;
    Array.prototype.forEach.call(panel.querySelectorAll('[data-pmd-team-edit][data-person-id]'), copyMemberData);
  }

  function removeRetiredTeamSurfaces() {
    Array.prototype.forEach.call(
      root.querySelectorAll('.pmd-shifts__header [data-pmd-team-scroll],#pmd-shifts-team-panel,[data-pmd-shifts-team-panel]'),
      function (node) { node.remove(); }
    );
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function roleMetaForRow(row) {
    var id = String(Number(row.getAttribute('data-person-id') || 0));
    var saved = memberMap[id] || {};
    var roleNode = row.querySelector('.pmd-shifts-final-person-copy small');
    var role = normalize(saved.role || (roleNode && roleNode.textContent) || '');
    var department = normalize(saved.department || 'other');
    var text = (role + ' ' + department).trim();

    if (department === 'kitchen' || /\b(kitchen|chef|cook|kds|dish|prep|boh)\b/.test(text) || text.indexOf('kitchen') !== -1) {
      return {family:'kitchen', rank:10};
    }
    if (!role || /^(team|team member|staff|employee)$/.test(role)) {
      return {family:'team_member', rank:20};
    }
    if (/\b(cashier|till|checkout|pos)\b/.test(role)) {
      return {family:'cashier', rank:40};
    }
    if (/\b(reservation|reservations|reception|host|front desk)\b/.test(role) || department === 'reception') {
      return {family:'reservations', rank:50};
    }
    if (/\b(manager|supervisor|owner)\b/.test(role)) {
      return {family:'manager', rank:60};
    }
    if (/\b(bar|bartender|barman|barmaid)\b/.test(role) || department === 'bar') {
      return {family:'bar', rank:70};
    }
    if (/\b(accountant|accounting|finance|bookkeep)\b/.test(role)) {
      return {family:'accountant', rank:80};
    }
    if (/\b(waiter|server|service|runner|floor)\b/.test(role) || department === 'floor') {
      return {family:'waiter', rank:30};
    }
    return {family:'other', rank:90};
  }

  function makePersonEditable(row) {
    var button = row.querySelector('.pmd-shifts-final-person-copy button');
    if (!button) return;

    var id = Number(row.getAttribute('data-person-id') || 0);
    var saved = memberMap[String(id)] || {};
    button.removeAttribute('data-pmd-team-scroll-person');
    button.setAttribute('data-pmd-team-edit', '');
    button.setAttribute('data-person-id', String(id));
    button.setAttribute('data-name', saved.name || String(button.textContent || '').trim());
    button.setAttribute('data-role', saved.role || '');
    button.setAttribute('data-department', saved.department || 'other');
    button.setAttribute('data-has-access', saved.hasAccess || '0');
    button.setAttribute('data-username', saved.username || '');
    button.setAttribute('data-staff-role-id', saved.staffRoleId || '');
    button.setAttribute('title', 'Edit member');
  }

  function ensureMemberButton() {
    var actions = root.querySelector('.pmd-shifts-final-actions');
    if (!actions || actions.querySelector('[data-pmd-v18-toolbar-member]')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-shifts-final-member-add';
    button.setAttribute('data-pmd-team-open', '');
    button.setAttribute('data-pmd-v18-toolbar-member', '');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Member</span>';

    var picker = actions.querySelector('.pmd-shifts-date-picker');
    actions.insertBefore(button, picker || actions.firstChild);
  }

  function decorateRota() {
    var board = root.querySelector('.pmd-shifts-final-board');
    if (!board) {
      ensureMemberButton();
      return;
    }

    var rows = Array.prototype.slice.call(board.querySelectorAll(':scope > .pmd-shifts-final-row'));
    rows.forEach(function (row) {
      var meta = roleMetaForRow(row);
      row.setAttribute('data-pmd-role-family', meta.family);
      row.setAttribute('data-pmd-role-rank', String(meta.rank));
      makePersonEditable(row);
    });

    rows.sort(function (left, right) {
      var rank = Number(left.getAttribute('data-pmd-role-rank') || 90) - Number(right.getAttribute('data-pmd-role-rank') || 90);
      if (rank) return rank;
      var leftName = String((left.querySelector('.pmd-shifts-final-person-copy button') || {}).textContent || '');
      var rightName = String((right.querySelector('.pmd-shifts-final-person-copy button') || {}).textContent || '');
      return leftName.localeCompare(rightName, undefined, {sensitivity:'base'});
    });

    rows.forEach(function (row) { board.appendChild(row); });
    ensureMemberButton();
    document.documentElement.classList.add('pmd-shifts-v18-ready');
  }

  function normalizeKpiMenus() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-pmd-shifts-kpi-menu]'), function (menu) {
      menu.classList.add('pmd-dashboard-lab__kpi-menu');
      menu.setAttribute('data-pmd-kpi-authority', 'owner-dashboard-current');
    });
  }

  function bellSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
  }

  function mountNotification() {
    var slot = root.querySelector('[data-pmd-shifts-notification-slot]');
    var notificationRoot = document.getElementById('notif-root');
    if (!slot || !notificationRoot) return false;

    if (!slot.contains(notificationRoot)) {
      slot.innerHTML = '';
      slot.appendChild(notificationRoot);
    }

    var trigger = notificationRoot.querySelector('#notifDropdown');
    if (!trigger) return false;
    trigger.setAttribute('aria-label', 'Notifications');
    trigger.setAttribute('title', 'Notifications');

    Array.prototype.forEach.call(trigger.querySelectorAll(':scope > i'), function (node) { node.remove(); });
    var bell = trigger.querySelector(':scope > #bell-icon');
    if (!bell) {
      bell = document.createElement('span');
      bell.id = 'bell-icon';
      trigger.insertBefore(bell, trigger.firstChild || null);
    }
    bell.className = '';
    if (!bell.querySelector('svg')) bell.innerHTML = bellSvg();

    notificationRoot.setAttribute('data-pmd-shifts-notification', 'mounted-v18');
    return true;
  }

  // IMPORTANT: V17 is the live Shifts visual authority, not a disposable
  // duplicate. Removing it blanks/hides legacy containers that V17 explicitly
  // reveals and lays out. V18 layers on top of it and must preserve the link.
  function preserveSharedUiCss() {
    return document.querySelector('link[data-pmd-shifts-exact-ui-v17]');
  }

  function scheduleDecorate() {
    decorateTimers.forEach(function (timer) { window.clearTimeout(timer); });
    decorateTimers = [0, 40, 160, 500, 1200].map(function (delay) {
      return window.setTimeout(function () {
        decorateRota();
        normalizeKpiMenus();
        removeRetiredTeamSurfaces();
        mountNotification();
        preserveSharedUiCss();
      }, delay);
    });
  }

  captureBootPeople();
  captureMemberMap();
  normalizeKpiMenus();
  removeRetiredTeamSurfaces();
  preserveSharedUiCss();
  decorateRota();

  if (!mountNotification()) {
    [0, 80, 240, 700, 1500].forEach(function (delay) {
      window.setTimeout(mountNotification, delay);
    });
  }

  document.addEventListener('click', function (event) {
    if (!root.contains(event.target)) return;
    if (event.target.closest('[data-pmd-shifts-prev-day],[data-pmd-shifts-next-day],[data-pmd-shifts-today]')) {
      scheduleDecorate();
    }
  });

  document.addEventListener('change', function (event) {
    if (!root.contains(event.target)) return;
    if (event.target.closest('[data-pmd-shifts-date-input]')) scheduleDecorate();
  });
})();
