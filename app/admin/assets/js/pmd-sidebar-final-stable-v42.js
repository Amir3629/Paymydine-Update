(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV42';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function wantedCollapsed() {
    return localStorage.getItem(KEY) === '1' || localStorage.getItem('pmdSidebarCollapsedV41') === '1';
  }

  function setWantedCollapsed(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    localStorage.setItem('pmdSidebarCollapsedV41', v ? '1' : '0');
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v42', !!v);
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v41', false);
  }

  function isCollapsedNow() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v42');
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v42');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v41');
    if (document.body) {
      (document.body||document.documentElement).classList.add('pmd-sidebar-collapsed');
      (document.body||document.documentElement).classList.add('pmd-sidebar-icons-only');
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
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41):not(#pmd-sidebar-edge-toggle-v42)');
  }

  function ensureButton() {
    document.querySelectorAll('#pmd-sidebar-edge-toggle-v40, #pmd-sidebar-edge-toggle-v41').forEach(function (old) {
      old.style.display = 'none';
      old.style.visibility = 'hidden';
      old.style.pointerEvents = 'none';
    });

    var btn = document.getElementById('pmd-sidebar-edge-toggle-v42');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v42';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      btn.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
      (document.body||document.documentElement).appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var before = isCollapsedNow();
        var rt = realToggle();

        if (rt) rt.click();
        else {
          (document.body||document.documentElement).classList.toggle('pmd-sidebar-collapsed');
          (document.body||document.documentElement).classList.toggle('pmd-sidebar-icons-only');
        }

        var after = !before;
        setWantedCollapsed(after);

        [40, 140, 300].forEach(function (ms) {
          setTimeout(function () {
            if (wantedCollapsed()) applyCollapsedClass();
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
      if (sr && sr.width > 20) {
        left = Math.round(sr.right - 16);
      }
    }

    var item = firstRealNavItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) {
        // Place handle in the gap above Dashboard, never on top of the Dashboard card.
        top = Math.round(ir.top - 43);
      }
    } else if (s) {
      var r = s.getBoundingClientRect();
      top = Math.round(r.top + (isCollapsedNow() ? 170 : 230));
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v42', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v42', top + 'px');

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
      if (a.getAttribute('data-pmd-sidebar-persist-v42')) return;
      a.setAttribute('data-pmd-sidebar-persist-v42', '1');
      a.addEventListener('click', function () {
        setWantedCollapsed(isCollapsedNow());
      }, true);
    });
  }

  function fixCollapsedProfile() {
    if (!isCollapsedNow()) return;
    document.querySelectorAll('.sidebar-footer, .pmd-sidebar-footer, .pmd-sidebar-user').forEach(function (box) {
      var controls = Array.prototype.slice.call(box.querySelectorAll('a,button'));
      controls.forEach(function (el) {
        var keep = el.querySelector && el.querySelector('.fa-power-off');
        if (!keep && controls.length > 1) el.style.display = 'none';
        if (keep) el.style.display = 'inline-flex';
      });
    });
  }

  function applyAll() {
    if (wantedCollapsed()) applyCollapsedClass();
    ensureButton();
    persistLinks();
    fixCollapsedProfile();
    position();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v42');
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v41');
  }

  ready(function () {
    applyAll();

    // Finite retries only, no observer.
    [80, 220, 500, 900, 1600, 2600].forEach(function (ms) {
      setTimeout(applyAll, ms);
    });

    window.addEventListener('resize', position, { passive: true });
    document.addEventListener('click', function () { setTimeout(position, 120); }, true);

    window.PMDSidebarFinalV42 = {
      apply: applyAll,
      position: position,
      setCollapsed: function (v) { setWantedCollapsed(!!v); applyAll(); },
      isCollapsed: isCollapsedNow
    };
  });
})();
