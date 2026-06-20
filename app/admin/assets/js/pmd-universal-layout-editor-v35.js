(function () {
  'use strict';

  var PREFIX = 'pmdUniversalDashboardLayoutV35:';
  var SIZES = ['compact', 'normal', 'large'];
  var PARTS = ['kpi', 'cards', 'floor', 'bottom'];
  var retries = 0;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function root() {
    return document.querySelector('.pmd-dashboard-modern');
  }

  function roleName() {
    var r = root();
    if (r && r.getAttribute('data-pmd-role')) return r.getAttribute('data-pmd-role');

    var active = document.querySelector('[data-pmd-role-btn].active, [data-pmd-role-btn].is-active, [data-pmd-role-btn][aria-pressed="true"]');
    if (active && active.getAttribute('data-pmd-role-btn')) return active.getAttribute('data-pmd-role-btn');

    return 'default';
  }

  function storeKey() {
    return PREFIX + roleName();
  }

  function defaultState() {
    return { kpi: 'normal', cards: 'normal', floor: 'normal', bottom: 'normal' };
  }

  function readState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(storeKey()) || '{}');
      var state = defaultState();
      PARTS.forEach(function (p) {
        if (SIZES.indexOf(parsed[p]) !== -1) state[p] = parsed[p];
      });
      return state;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(storeKey(), JSON.stringify(state));
  }

  function cleanText(el) {
    return (el ? (el.textContent || '') : '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function markGroups() {
    var r = root();
    if (!r) return;

    r.querySelectorAll('.pmd-layout-group-kpi-v35,.pmd-layout-group-card-v35,.pmd-layout-group-floor-v35,.pmd-layout-group-bottom-v35').forEach(function (el) {
      el.classList.remove('pmd-layout-group-kpi-v35', 'pmd-layout-group-card-v35', 'pmd-layout-group-floor-v35', 'pmd-layout-group-bottom-v35');
    });

    r.querySelectorAll('.pmd-role-kpi-bar, .pmd-dashboard-kpi-bar').forEach(function (el) {
      el.classList.add('pmd-layout-group-kpi-v35');
    });

    r.querySelectorAll('.pmd-floor-card, .pmd-manager-card-v29, .pmd-manager-card-v30, .pmd-dashboard-card, .pmd-role-card, .pmd-card, .pmd-stat-card, .pmd-owner-match-footer-v13').forEach(function (el) {
      var text = cleanText(el);
      var cls = el.className || '';

      if (el.classList.contains('pmd-owner-match-footer-v13') || /recent activity|upgrade|premium|timeline|analytics|team performance|reservation management|ai insights/.test(text)) {
        el.classList.add('pmd-layout-group-bottom-v35');
      } else if (el.classList.contains('pmd-floor-card') || /floor plan|live restaurant floor|table status|manage tables|available.*reserved.*dining/.test(text)) {
        el.classList.add('pmd-layout-group-floor-v35');
      } else if (!/pmd-role-kpi/.test(cls)) {
        el.classList.add('pmd-layout-group-card-v35');
      }
    });

    // Manager quick actions should not be resized as cards.
    r.querySelectorAll('.pmd-manager-action-v29,.pmd-manager-action-v30').forEach(function (el) {
      el.classList.remove('pmd-layout-group-card-v35', 'pmd-layout-group-bottom-v35', 'pmd-layout-group-floor-v35');
    });
  }

  function applyState() {
    var r = root();
    if (!r) return;

    markGroups();

    Array.prototype.slice.call(r.classList).forEach(function (cls) {
      if (/^pmd-layout-(kpi|cards|floor|bottom)-(compact|large)-v35$/.test(cls)) {
        r.classList.remove(cls);
      }
      if (/^pmd-owner-(cards|floor|footer)-(compact|large)-v34$/.test(cls)) {
        r.classList.remove(cls);
      }
    });

    var state = readState();
    PARTS.forEach(function (part) {
      if (state[part] !== 'normal') {
        r.classList.add('pmd-layout-' + part + '-' + state[part] + '-v35');
      }
    });

    updatePanel();
  }

  function setPart(part, value) {
    var state = readState();
    state[part] = value;
    saveState(state);
    applyState();
  }

  function reset() {
    saveState(defaultState());
    applyState();
  }

  function ensurePanel() {
    var panel = document.querySelector('.pmd-universal-layout-panel-v35');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.className = 'pmd-universal-layout-panel-v35';
    panel.innerHTML =
      '<div class="pmd-universal-layout-panel-v35__head">' +
        '<div><strong>Dashboard Layout</strong><span class="pmd-universal-layout-panel-v35__role">Role: —</span></div>' +
        '<button type="button" class="pmd-universal-layout-panel-v35__close" data-action="done" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="pmd-universal-layout-panel-v35__body">' +
        rowHtml('kpi', 'Top KPIs', 'header frame') +
        rowHtml('cards', 'Main Cards', 'same-size cards') +
        rowHtml('floor', 'Floor / Map', 'tables/floor widgets') +
        rowHtml('bottom', 'Bottom / Analytics', 'timeline/insights/footer') +
        '<div class="pmd-universal-layout-actions-v35">' +
          '<button type="button" data-action="reset">Reset Role</button>' +
          '<button type="button" data-action="done">Done</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      if (action === 'done') {
        setEditing(false);
        return;
      }
      if (action === 'reset') {
        reset();
        return;
      }

      var part = btn.getAttribute('data-part');
      var value = btn.getAttribute('data-value');
      if (part && value) setPart(part, value);
    });

    updatePanel();
    return panel;
  }

  function rowHtml(part, label, note) {
    return '<div class="pmd-universal-layout-row-v35" data-part="' + part + '">' +
      '<label>' + label + '<small>' + note + '</small></label>' +
      '<div class="pmd-universal-layout-segment-v35">' +
        '<button type="button" data-part="' + part + '" data-value="compact">Small</button>' +
        '<button type="button" data-part="' + part + '" data-value="normal">Normal</button>' +
        '<button type="button" data-part="' + part + '" data-value="large">Large</button>' +
      '</div>' +
    '</div>';
  }

  function updatePanel() {
    var state = readState();
    var role = roleName();

    var roleEl = document.querySelector('.pmd-universal-layout-panel-v35__role');
    if (roleEl) roleEl.textContent = 'Role: ' + role;

    document.querySelectorAll('.pmd-universal-layout-row-v35').forEach(function (row) {
      var part = row.getAttribute('data-part');
      row.querySelectorAll('button[data-value]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-value') === state[part]);
      });
    });
  }

  function setEditing(on) {
    document.body.classList.toggle('pmd-universal-layout-editing-v35', !!on);

    var btn = document.querySelector('.pmd-universal-layout-trigger-v35');
    if (btn) {
      btn.classList.toggle('is-active', !!on);
      var span = btn.querySelector('#edit-layout-text') || btn.querySelector('span');
      if (span) span.textContent = on ? 'Done Layout' : 'Edit Layout';
    }

    if (on) {
      ensurePanel();
      markGroups();
    }
    updatePanel();
  }

  function toggleEditing() {
    if (!root()) return;
    ensurePanel();
    applyState();
    setEditing(!document.body.classList.contains('pmd-universal-layout-editing-v35'));
  }

  function hookButton(btn) {
    if (!btn || btn.getAttribute('data-pmd-universal-layout-v35-bound')) return;

    btn.classList.add('pmd-universal-layout-trigger-v35');
    btn.setAttribute('data-pmd-universal-layout-v35-bound', '1');
    btn.removeAttribute('onclick');
    btn.onclick = null;

    var icon = btn.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.className = 'fa fa-edit';
      btn.insertBefore(icon, btn.firstChild);
    }

    var span = btn.querySelector('#edit-layout-text') || btn.querySelector('span');
    if (!span) {
      span = document.createElement('span');
      span.id = 'edit-layout-text';
      btn.appendChild(span);
    }
    span.textContent = 'Edit Layout';

    btn.addEventListener('click', function (e) {
      if (!root()) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleEditing();
      return false;
    }, true);
  }

  function ensureButton() {
    var r = root();
    document.body.classList.toggle('pmd-universal-layout-available-v35', !!r);

    var native = document.getElementById('edit-layout-toggle');
    if (native) {
      hookButton(native);
      return;
    }

    var created = document.querySelector('.pmd-universal-layout-trigger-v35.pmd-universal-layout-created-v35');
    if (created) return;

    var right = document.querySelector('.navbar.navbar-right') || document.querySelector('.navbar-right') || document.querySelector('.admin-header .navbar-right');
    if (!right) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-universal-layout-trigger-v35 pmd-universal-layout-created-v35';
    btn.innerHTML = '<i class="fa fa-edit"></i><span>Edit Layout</span>';
    hookButton(btn);

    right.insertBefore(btn, right.firstChild);
  }

  function onRoleSwitch() {
    setEditing(false);
    setTimeout(function () {
      retries = 0;
      ensureButton();
      applyState();
    }, 220);
    setTimeout(function () {
      ensureButton();
      applyState();
    }, 650);
  }

  function bindRoleButtons() {
    document.querySelectorAll('[data-pmd-role-btn]').forEach(function (btn) {
      if (btn.getAttribute('data-pmd-universal-layout-v35-role-bound')) return;
      btn.setAttribute('data-pmd-universal-layout-v35-role-bound', '1');
      btn.addEventListener('click', onRoleSwitch, true);
    });
  }

  function init() {
    ensurePanel();
    ensureButton();
    bindRoleButtons();
    applyState();

    [150, 400, 900, 1600, 2800].forEach(function (ms) {
      setTimeout(function () {
        retries++;
        ensureButton();
        bindRoleButtons();
        applyState();
      }, ms);
    });

    window.PMDUniversalLayoutEditorV35 = {
      open: function () { ensurePanel(); applyState(); setEditing(true); },
      close: function () { setEditing(false); },
      toggle: toggleEditing,
      reset: reset,
      apply: applyState,
      setPart: setPart,
      state: readState,
      role: roleName,
      markGroups: markGroups
    };
  }

  ready(init);
})();
