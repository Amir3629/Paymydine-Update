(function () {
  'use strict';

  var KEY = 'pmdSidebarCollapsedV48';
  var OLD = ['pmdSidebarCollapsedV47','pmdSidebarCollapsedV46','pmdSidebarCollapsedV45','pmdSidebarCollapsedV44','pmdSidebarCollapsedV43','pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'];

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function wantedCollapsed() {
    if (localStorage.getItem(KEY) === '1') return true;
    for (var i = 0; i < OLD.length; i++) if (localStorage.getItem(OLD[i]) === '1') return true;
    return false;
  }

  function setWanted(v) {
    localStorage.setItem(KEY, v ? '1' : '0');
    OLD.forEach(function(k){ localStorage.setItem(k, '0'); });
    document.documentElement.classList.toggle('pmd-sidebar-persist-collapsed-v48', !!v);
    document.documentElement.classList.remove(
      'pmd-sidebar-persist-collapsed-v47','pmd-sidebar-persist-collapsed-v46',
      'pmd-sidebar-persist-collapsed-v45','pmd-sidebar-persist-collapsed-v44',
      'pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42',
      'pmd-sidebar-persist-collapsed-v41'
    );
  }

  function isCollapsed() {
    var b = document.body, h = document.documentElement;
    return b.classList.contains('pmd-sidebar-icons-only') ||
      b.classList.contains('pmd-sidebar-collapsed') ||
      b.classList.contains('sidebar-collapsed') ||
      b.classList.contains('sidebar-xs') ||
      h.classList.contains('pmd-sidebar-persist-collapsed-v48');
  }

  function side() {
    return document.querySelector('#sidebar') ||
      document.querySelector('.pmd-admin-sidebar') ||
      document.querySelector('.pmd-sidebar') ||
      document.querySelector('.sidebar') ||
      document.querySelector('aside');
  }

  function menu() {
    var s = side();
    if (!s) return document.querySelector('#side-nav-menu') || document.querySelector('.side-nav-menu') || document.querySelector('.sidebar-menu') || document.querySelector('.nav-sidebar');
    return s.querySelector('#side-nav-menu, .side-nav-menu, .sidebar-menu, .nav-sidebar, .pmd-sidebar-menu, .sidebar-nav, ul.nav, nav ul');
  }

  function realToggle() {
    return document.querySelector('.pmd-sidebar-icons-toggle:not(#pmd-sidebar-edge-toggle-v40):not(#pmd-sidebar-edge-toggle-v41):not(#pmd-sidebar-edge-toggle-v42):not(#pmd-sidebar-edge-toggle-v43):not(#pmd-sidebar-edge-toggle-v44):not(#pmd-sidebar-edge-toggle-v45):not(#pmd-sidebar-edge-toggle-v46):not(#pmd-sidebar-edge-toggle-v47):not(#pmd-sidebar-edge-toggle-v48)');
  }

  function chevronSvg() {
    return isCollapsed()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  }

  function cleanupExperiments() {
    document.querySelectorAll(
      '.pmd-collapsed-rail-v45,.pmd-collapsed-rail-v46,.pmd-collapsed-rail-v47,' +
      '.pmd-collapsed-logo-v47,.pmd-collapsed-power-v45,.pmd-collapsed-power-v46,.pmd-collapsed-power-v47,' +
      '#pmd-sidebar-edge-toggle-v40,#pmd-sidebar-edge-toggle-v41,#pmd-sidebar-edge-toggle-v42,#pmd-sidebar-edge-toggle-v43,#pmd-sidebar-edge-toggle-v44,#pmd-sidebar-edge-toggle-v45,#pmd-sidebar-edge-toggle-v46,#pmd-sidebar-edge-toggle-v47'
    ).forEach(function(el){ el.remove(); });

    document.querySelectorAll('.pmd-v47-hide-native,.pmd-v46-hidden-native').forEach(function(el){
      el.classList.remove('pmd-v47-hide-native','pmd-v46-hidden-native');
      el.style.display = '';
      el.style.visibility = '';
      el.style.pointerEvents = '';
    });
  }

  function applyCollapsedClass() {
    if (!wantedCollapsed()) return;
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v48');
    if (document.body) {
      (document.body||document.documentElement).classList.add('pmd-sidebar-collapsed','pmd-sidebar-icons-only');
    }
  }

  function removeCollapsedClass() {
    document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v48');
    if (document.body) (document.body||document.documentElement).classList.remove('pmd-sidebar-collapsed','pmd-sidebar-icons-only');
  }

  function ensureButton() {
    var btn = document.getElementById('pmd-sidebar-edge-toggle-v48');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'pmd-sidebar-edge-toggle-v48';
      btn.setAttribute('aria-label','Toggle sidebar');
      btn.innerHTML = chevronSvg();
      (document.body||document.documentElement).appendChild(btn);

      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();

        var before = isCollapsed();
        var rt = realToggle();

        if (rt) rt.click();
        else {
          (document.body||document.documentElement).classList.toggle('pmd-sidebar-collapsed');
          (document.body||document.documentElement).classList.toggle('pmd-sidebar-icons-only');
        }

        setWanted(!before);
        [40,140,300].forEach(function(ms){ setTimeout(applyAll, ms); });
        return false;
      }, true);
    }
    btn.innerHTML = chevronSvg();
    return btn;
  }

  function firstNativeNavItem() {
    var m = menu();
    if (!m) return null;
    var items = Array.prototype.slice.call(m.children || []);
    for (var i=0;i<items.length;i++) {
      var it = items[i];
      if (it.classList.contains('pmd-logo-cycle-nav-item-v38')) continue;
      if ((it.className || '').toString().indexOf('toggle') !== -1) continue;
      if (it.querySelector && it.querySelector('a,button')) return it;
    }
    return null;
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

    var item = firstNativeNavItem();
    if (item) {
      var ir = item.getBoundingClientRect();
      if (ir && ir.top > 20) top = Math.round(ir.top - 43);
    }

    left = Math.max(50, Math.min(left, window.innerWidth - 42));
    top = Math.max(86, Math.min(top, window.innerHeight - 72));

    document.documentElement.style.setProperty('--pmd-sidebar-edge-left-v48', left + 'px');
    document.documentElement.style.setProperty('--pmd-sidebar-edge-top-v48', top + 'px');

    btn.innerHTML = chevronSvg();
    btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');

    var rt = realToggle();
    if (rt) { rt.setAttribute('tabindex','-1'); rt.setAttribute('aria-hidden','true'); }
  }

  function resetProfile() {
    document.querySelectorAll('.pmd-v48-power-only').forEach(function(box){ box.classList.remove('pmd-v48-power-only'); });
    document.querySelectorAll('.pmd-v48-hide-profile').forEach(function(el){ el.classList.remove('pmd-v48-hide-profile'); el.style.display = ''; });
    document.querySelectorAll('.pmd-v48-power-control').forEach(function(el){ el.classList.remove('pmd-v48-power-control'); el.style.display = ''; });
  }

  function fixProfile() {
    if (!isCollapsed()) { resetProfile(); return; }

    var s = side();
    if (!s) return;

    var powerIcon = s.querySelector('.fa-power-off, .ti-power-off, [class*="power"]');
    if (!powerIcon) return;

    var control = powerIcon.closest('a,button') || powerIcon.parentElement;
    if (!control) return;

    var box = control.closest('.sidebar-footer, .pmd-sidebar-footer, .pmd-sidebar-user, .pmd-user-card, .media, .card, li, div') || control.parentElement;
    if (!box) return;

    box.classList.add('pmd-v48-power-only');
    control.classList.add('pmd-v48-power-control');

    Array.prototype.slice.call(box.children).forEach(function(child){
      if (child === control || child.contains(control)) {
        child.classList.add('pmd-v48-power-control');
        child.classList.remove('pmd-v48-hide-profile');
        child.style.display = '';
      } else {
        child.classList.add('pmd-v48-hide-profile');
      }
    });
  }

  function persistLinks() {
    document.querySelectorAll('#side-nav-menu a[href], .side-nav-menu a[href], .sidebar-menu a[href], .nav-sidebar a[href]').forEach(function(a){
      if (a.getAttribute('data-pmd-sidebar-persist-v48')) return;
      a.setAttribute('data-pmd-sidebar-persist-v48','1');
      a.addEventListener('click', function(){ setWanted(isCollapsed()); }, true);
    });
  }

  function applyAll() {
    cleanupExperiments();
    if (wantedCollapsed()) applyCollapsedClass();
    ensureButton();
    fixProfile();
    persistLinks();
    positionButton();
  }

  if (wantedCollapsed()) {
    document.documentElement.classList.add('pmd-sidebar-persist-collapsed-v48');
    document.documentElement.classList.remove(
      'pmd-sidebar-persist-collapsed-v47','pmd-sidebar-persist-collapsed-v46',
      'pmd-sidebar-persist-collapsed-v45','pmd-sidebar-persist-collapsed-v44',
      'pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42',
      'pmd-sidebar-persist-collapsed-v41'
    );
  }

  ready(function(){
    // Remove old bad state from the browser so v47/v46 cannot come back.
    OLD.forEach(function(k){ localStorage.setItem(k, '0'); });
    cleanupExperiments();
    applyAll();
    [80,220,500,900,1600,2600].forEach(function(ms){ setTimeout(applyAll, ms); });
    window.addEventListener('resize', positionButton, {passive:true});
    document.addEventListener('click', function(){ setTimeout(applyAll,120); }, true);

    window.PMDSidebarNativeResetV48 = {
      apply: applyAll,
      position: positionButton,
      cleanup: cleanupExperiments,
      setCollapsed: function(v){ setWanted(!!v); if(v) applyCollapsedClass(); else removeCollapsedClass(); applyAll(); },
      isCollapsed: isCollapsed
    };
  });
})();
