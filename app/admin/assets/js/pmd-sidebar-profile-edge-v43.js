(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV43';
  var OLD_KEYS = ['pmdSidebarCollapsedV42', 'pmdSidebarCollapsedV41'];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function wantedCollapsed() {
    if (localStorage.getItem(KEY) === '1') return true;
    for (var i = 0; i < OLD_KEYS.length; i++) if (localStorage.getItem(OLD_KEYS[i]) === '1') return true;
    return false;
  }

  function setWantedCollapsed(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    OLD_KEYS.forEach(function (k) { localStorage.setItem(k, v ? '1' : '0'); });
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v43', !!v);
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
  }

  function isCollapsedNow() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v43');
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v43');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
    if (document.body) {
      (document.body||document.documentElement).classList.add('pmd-sidebar-collapsed', 'pmd-sidebar-icons-only');
    }
  }

  function menu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function side() {
    var m = menu();
    return (m && (m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar') || m.parentElement))
      || document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function firstRealNavItem() {
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
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41):not(#pmd-sidebar-edge-toggle-v42):not(#pmd-sidebar-edge-toggle-v43)');
  }

  function ensureButton() {
    document.querySelectorAll('#pmd-sidebar-edge-toggle-v40, #pmd-sidebar-edge-toggle-v41, #pmd-sidebar-edge-toggle-v42').forEach(function (old) {
      old.style.display = 'none';
      old.style.visibility = 'hidden';
      old.style.pointerEvents = 'none';
    });

    var btn = document.getElementById('pmd-sidebar-edge-toggle-v43');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v43';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      btn.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
      (document.body||document.documentElement).appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var before = isCollapsedNow();
        var rt = realToggle();

        if (rt) rt.click();
        else (document.body||document.documentElement).classList.toggle('pmd-sidebar-collapsed'), (document.body||document.documentElement).classList.toggle('pmd-sidebar-icons-only');

        var after = !before;
        setWantedCollapsed(after);

        [40, 140, 300].forEach(function (ms) {
          setTimeout(function () {
            if (wantedCollapsed()) applyCollapsedClass();
            fixProfile();
            position();
          }, ms);
        });

        return false;
      }, true);
    }
    return btn;
  }

  function position() {
    var btn = ensureButton();
    var s = side();

    var left = isCollapsedNow() ? 72 : 246;
    var top = isCollapsedNow() ? 170 : 240;

    if (s) {
      s.style.overflow = 'visible';
      var sr = s.getBoundingClientRect();
      if (sr && sr.width > 20) left = Math.round(sr.right - 16);
    }

    var item = firstRealNavItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) {
        top = Math.round(ir.top - 43); // in gap above Dashboard
      }
    } else if (s) {
      var r = s.getBoundingClientRect();
      top = Math.round(r.top + (isCollapsedNow() ? 170 : 230));
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v43', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v43', top + 'px');

    var icon = btn.querySelector('i');
    if (icon) icon.className = 'fa ' + (isCollapsedNow() ? 'fa-angle-right' : 'fa-angle-left');

    btn.setAttribute('aria-expanded', isCollapsedNow() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsedNow() ? 'Open sidebar' : 'Close sidebar');

    var rt = realToggle();
    if (rt) {
      rt.setAttribute('tabindex', '-1');
      rt.setAttribute('aria-hidden', 'true');
    }
  }

  function persistLinks() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href]').forEach(function (a) {
      if (a.getAttribute('data-pmd-sidebar-persist-v43')) return;
      a.setAttribute('data-pmd-sidebar-persist-v43', '1');
      a.addEventListener('click', function () {
        setWantedCollapsed(isCollapsedNow());
      }, true);
    });
  }

  function resetProfileClasses() {
    document.querySelectorAll('.pmd-profile-power-only-v43').forEach(function (box) {
      box.classList.remove('pmd-profile-power-only-v43');
    });
    document.querySelectorAll('.pmd-profile-hidden-v43').forEach(function (el) {
      el.classList.remove('pmd-profile-hidden-v43');
      el.style.display = '';
    });
    document.querySelectorAll('.pmd-profile-power-visible-v43').forEach(function (el) {
      el.classList.remove('pmd-profile-power-visible-v43');
      el.style.display = '';
    });
  }

  function fixProfile() {
    if (!isCollapsedNow()) {
      resetProfileClasses();
      return;
    }

    var s = side();
    if (!s) return;

    var powerIcon = s.querySelector('.fa-power-off, .ti-power-off, [class*="power"]');
    if (!powerIcon) return;

    var control = powerIcon.closest('a,button') || powerIcon.parentElement;
    if (!control) return;

    var box = control.closest('.sidebar-footer, .pmd-sidebar-footer, .pmd-sidebar-user, .pmd-user-card, .media, .card, li, div');
    if (!box || box === control) box = control.parentElement;
    if (!box) return;

    box.classList.add('pmd-profile-power-only-v43');
    control.classList.add('pmd-profile-power-visible-v43');

    Array.prototype.slice.call(box.children).forEach(function (child) {
      if (child === control || child.contains(control)) {
        child.classList.add('pmd-profile-power-visible-v43');
        child.classList.remove('pmd-profile-hidden-v43');
      } else {
        child.classList.add('pmd-profile-hidden-v43');
      }
    });
  }

  function applyAll() {
    if (wantedCollapsed()) applyCollapsedClass();
    ensureButton();
    persistLinks();
    fixProfile();
    position();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v43');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v42', 'pmd-sidebar-persist-collapsed-v41');
  }

  ready(function () {
    applyAll();

    [80, 220, 500, 900, 1600, 2600].forEach(function (ms) {
      setTimeout(applyAll, ms);
    });

    window.addEventListener('resize', position, { passive: true });
    document.addEventListener('click', function () { setTimeout(function () { fixProfile(); position(); }, 120); }, true);

    window.PMDSidebarFinalV43 = {
      apply: applyAll,
      position: position,
      fixProfile: fixProfile,
      setCollapsed: function (v) { setWantedCollapsed(!!v); applyAll(); },
      isCollapsed: isCollapsedNow
    };
  });
})();
