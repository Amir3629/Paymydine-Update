(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV44';
  var OLD = ['pmdSidebarCollapsedV43', 'pmdSidebarCollapsedV42', 'pmdSidebarCollapsedV41'];

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function wantedCollapsed() {
    if (localStorage.getItem(KEY) === '1') return true;
    for (var i = 0; i < OLD.length; i++) if (localStorage.getItem(OLD[i]) === '1') return true;
    return false;
  }

  function setWanted(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    OLD.forEach(function (k) { localStorage.setItem(k, v ? '1' : '0'); });
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v44', !!v);
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v43', 'pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
  }

  function isCollapsed() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v44');
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v44');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v43', 'pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
    if (document.body) document.body.classList.add('pmd-sidebar-collapsed', 'pmd-sidebar-icons-only');
  }

  function menu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function side() {
    var m = menu();
    return (m && (m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar') || m.parentElement))
      || document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function firstNavItem() {
    var m = menu();
    if (!m) return null;
    var items = Array.prototype.slice.call(m.children || []);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.classList.contains('pmd-logo-cycle-nav-item-v38')) continue;
      if ((it.className || '').toString().indexOf('toggle') !== -1) continue;
      if (it.querySelector && it.querySelector('a,button')) return it;
    }
    return null;
  }

  function realToggle() {
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41):not(#pmd-sidebar-edge-toggle-v42):not(#pmd-sidebar-edge-toggle-v43):not(#pmd-sidebar-edge-toggle-v44)');
  }

  function chevronSvg() {
    return isCollapsed()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  }

  function ensureButton() {
    document.querySelectorAll('#pmd-sidebar-edge-toggle-v40, #pmd-sidebar-edge-toggle-v41, #pmd-sidebar-edge-toggle-v42, #pmd-sidebar-edge-toggle-v43').forEach(function (old) {
      old.style.display = 'none';
      old.style.visibility = 'hidden';
      old.style.pointerEvents = 'none';
    });

    var btn = document.getElementById('pmd-sidebar-edge-toggle-v44');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v44';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      btn.innerHTML = chevronSvg();
      document.body.appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var before = isCollapsed();
        var rt = realToggle();

        if (rt) rt.click();
        else document.body.classList.toggle('pmd-sidebar-collapsed'), document.body.classList.toggle('pmd-sidebar-icons-only');

        setWanted(!before);
        [40, 140, 300].forEach(function (ms) { setTimeout(applyAll, ms); });
        return false;
      }, true);
    }
    btn.innerHTML = chevronSvg();
    return btn;
  }

  function positionButton() {
    var btn = ensureButton();
    var s = side();

    var left = isCollapsed() ? 72 : 246;
    var top = isCollapsed() ? 170 : 240;

    if (s) {
      s.style.overflow = 'visible';
      var sr = s.getBoundingClientRect();
      if (sr && sr.width > 20) left = Math.round(sr.right - 16);
    }

    var item = firstNavItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) {
        top = isCollapsed() ? Math.round(ir.top - 56) : Math.round(ir.top - 43);
      }
    } else if (s) {
      var r = s.getBoundingClientRect();
      top = Math.round(r.top + (isCollapsed() ? 170 : 230));
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v44', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v44', top + 'px');

    btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');

    var rt = realToggle();
    if (rt) {
      rt.setAttribute('tabindex', '-1');
      rt.setAttribute('aria-hidden', 'true');
    }
  }

  function persistLinks() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href]').forEach(function (a) {
      if (a.getAttribute('data-pmd-sidebar-persist-v44')) return;
      a.setAttribute('data-pmd-sidebar-persist-v44', '1');
      a.addEventListener('click', function () { setWanted(isCollapsed()); }, true);
    });
  }

  function resetPower() {
    document.querySelectorAll('.pmd-power-box-v44').forEach(function (box) { box.classList.remove('pmd-power-box-v44'); });
    document.querySelectorAll('.pmd-profile-hidden-v44').forEach(function (el) { el.classList.remove('pmd-profile-hidden-v44'); el.style.display = ''; });
    document.querySelectorAll('.pmd-power-control-v44').forEach(function (el) { el.classList.remove('pmd-power-control-v44'); el.style.display = ''; });
  }

  function fixPowerBox() {
    if (!isCollapsed()) { resetPower(); return; }

    var s = side();
    if (!s) return;

    var powerIcon = s.querySelector('.fa-power-off, .ti-power-off, [class*="power"]');
    if (!powerIcon) return;

    var control = powerIcon.closest('a,button') || powerIcon.parentElement;
    if (!control) return;

    var box = control.closest('.sidebar-footer, .pmd-sidebar-footer, .pmd-sidebar-user, .pmd-user-card, .media, .card, li, div');
    if (!box || box === control) box = control.parentElement;
    if (!box) return;

    box.classList.add('pmd-power-box-v44');
    control.classList.add('pmd-power-control-v44');

    Array.prototype.slice.call(box.children).forEach(function (child) {
      if (child === control || child.contains(control)) {
        child.classList.add('pmd-power-control-v44');
        child.classList.remove('pmd-profile-hidden-v44');
        child.style.display = '';
      } else {
        child.classList.add('pmd-profile-hidden-v44');
      }
    });
  }

  function applyAll() {
    if (wantedCollapsed()) applyCollapsedClass();
    ensureButton();
    persistLinks();
    fixPowerBox();
    positionButton();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v44');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v43', 'pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
  }

  ready(function () {
    applyAll();
    [80, 220, 500, 900, 1600, 2600].forEach(function (ms) { setTimeout(applyAll, ms); });
    window.addEventListener('resize', positionButton, { passive: true });
    document.addEventListener('click', function () { setTimeout(function () { fixPowerBox(); positionButton(); }, 120); }, true);

    window.PMDSidebarCleanV44 = {
      apply: applyAll,
      position: positionButton,
      fixPower: fixPowerBox,
      setCollapsed: function (v) { setWanted(!!v); applyAll(); },
      isCollapsed: isCollapsed
    };
  });
})();
