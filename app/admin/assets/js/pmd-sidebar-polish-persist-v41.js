(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV41';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function wantedCollapsed() {
    return localStorage.getItem(KEY) === '1';
  }

  function setWantedCollapsed(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v41', !!v);
  }

  function isCollapsedNow() {
    var b = document.body;
    var h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-icons-only') ||
      h.classList.contains('pmd-sidebar-collapsed') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v41');
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v41');
    if (document.body) {
      document.body.classList.add('pmd-sidebar-collapsed');
      document.body.classList.add('pmd-sidebar-icons-only');
    }
  }

  function sidebarMenu() {
    return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
  }

  function sidebarEl() {
    var m = sidebarMenu();
    return (m && (m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar') || m.parentElement))
      || document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function realToggle() {
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41)');
  }

  function ensureButton() {
    var btn = document.getElementById('pmd-sidebar-edge-toggle-v41');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v41';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      btn.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
      document.body.appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var before = isCollapsedNow();
        var rt = realToggle();

        if (rt) {
          rt.click();
        } else {
          document.body.classList.toggle('pmd-sidebar-collapsed');
          document.body.classList.toggle('pmd-sidebar-icons-only');
        }

        var after = !before;
        setWantedCollapsed(after);

        [40, 140, 320].forEach(function (ms) {
          setTimeout(function () {
            if (wantedCollapsed()) applyCollapsedClass();
            updateButtonPosition();
          }, ms);
        });

        return false;
      }, true);
    }
    return btn;
  }

  function updateButtonPosition() {
    var btn = ensureButton();
    var side = sidebarEl();

    var left = 246;
    var top = isCollapsedNow() ? 148 : 186;

    if (side) {
      side.style.overflow = 'visible';
      var r = side.getBoundingClientRect();
      if (r && r.width > 20) {
        left = Math.round(r.right - 17);
        top = Math.round(r.top + (isCollapsedNow() ? 150 : 186));
      }
    }

    left = Math.max(54, Math.min(left, window.innerWidth - 42));
    top = Math.max(88, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v41', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v41', top + 'px');

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

  function persistOnNavigation() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href]').forEach(function (a) {
      if (a.getAttribute('data-pmd-sidebar-persist-v41')) return;
      a.setAttribute('data-pmd-sidebar-persist-v41', '1');
      a.addEventListener('click', function () {
        setWantedCollapsed(isCollapsedNow());
      }, true);
    });
  }

  function fixProfileCollapsed() {
    if (!isCollapsedNow()) return;
    // Keep only logout/power visible if profile box has multiple anchors.
    document.querySelectorAll('.sidebar-footer, .pmd-sidebar-footer, .pmd-sidebar-user').forEach(function (box) {
      var links = Array.prototype.slice.call(box.querySelectorAll('a, button'));
      if (links.length <= 1) return;
      links.forEach(function (el) {
        var txt = (el.textContent || '').toLowerCase();
        var cls = (el.className || '').toString().toLowerCase();
        var keep = txt.indexOf('logout') !== -1 || txt.indexOf('sign') !== -1 || cls.indexOf('logout') !== -1 || el.querySelector('.fa-power-off');
        if (!keep) el.style.display = 'none';
      });
    });
  }

  function applyAll() {
    applyCollapsedClass();
    ensureButton();
    persistOnNavigation();
    fixProfileCollapsed();
    updateButtonPosition();
  }

  // Early mark for CSS, before DOM ready body class.
  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v41');
  }

  ready(function () {
    applyAll();

    // Finite only; no observer, no repeated page jumping.
    [80, 220, 500, 900, 1600].forEach(function (ms) {
      setTimeout(applyAll, ms);
    });

    window.addEventListener('resize', updateButtonPosition, { passive: true });

    window.PMDSidebarPolishV41 = {
      apply: applyAll,
      position: updateButtonPosition,
      setCollapsed: function (v) { setWantedCollapsed(!!v); applyAll(); },
      isCollapsed: isCollapsedNow
    };
  });
})();
