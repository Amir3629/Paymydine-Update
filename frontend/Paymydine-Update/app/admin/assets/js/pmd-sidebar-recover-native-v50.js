(function () {
  'use strict';

  var OLD_KEYS = [
    'pmdSidebarCollapsedV49','pmdSidebarCollapsedV48','pmdSidebarCollapsedV47',
    'pmdSidebarCollapsedV46','pmdSidebarCollapsedV45','pmdSidebarCollapsedV44',
    'pmdSidebarCollapsedV43','pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'
  ];

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function sidebar() {
    return document.querySelector('.sidebar');
  }

  function cleanupOldSidebarExperiments() {
    document.querySelectorAll(
      '#pmd-sidebar-edge-toggle-v40,#pmd-sidebar-edge-toggle-v41,#pmd-sidebar-edge-toggle-v42,#pmd-sidebar-edge-toggle-v43,#pmd-sidebar-edge-toggle-v44,#pmd-sidebar-edge-toggle-v45,#pmd-sidebar-edge-toggle-v46,#pmd-sidebar-edge-toggle-v47,#pmd-sidebar-edge-toggle-v48,#pmd-sidebar-edge-toggle-v49,' +
      '.pmd-collapsed-rail-v45,.pmd-collapsed-rail-v46,.pmd-collapsed-rail-v47,.pmd-collapsed-rail-v49,' +
      '.pmd-collapsed-logo-v47,.pmd-collapsed-logo-v49,.pmd-collapsed-power-v45,.pmd-collapsed-power-v46,.pmd-collapsed-power-v47,.pmd-collapsed-power-v49'
    ).forEach(function (el) { el.remove(); });

    document.querySelectorAll('.pmd-v49-sidebar,.pmd-v48-power-only,.pmd-v48-hide-profile,.pmd-v48-power-control,.pmd-v47-hide-native,.pmd-v46-hidden-native').forEach(function (el) {
      el.classList.remove('pmd-v49-sidebar','pmd-v48-power-only','pmd-v48-hide-profile','pmd-v48-power-control','pmd-v47-hide-native','pmd-v46-hidden-native');
      el.style.display = '';
      el.style.visibility = '';
      el.style.pointerEvents = '';
    });

    document.documentElement.classList.remove(
      'pmd-sidebar-persist-collapsed-v49','pmd-sidebar-persist-collapsed-v48',
      'pmd-sidebar-persist-collapsed-v47','pmd-sidebar-persist-collapsed-v46',
      'pmd-sidebar-persist-collapsed-v45','pmd-sidebar-persist-collapsed-v44',
      'pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42',
      'pmd-sidebar-persist-collapsed-v41'
    );

    OLD_KEYS.forEach(function (k) { try { localStorage.setItem(k, '0'); } catch(e) {} });
  }

  function fixProfileTarget() {
    var side = sidebar();
    if (!side) return;

    // Old v15 sometimes marked the whole sidebar as profile target.
    // That breaks collapsed width. Keep the class only on the actual profile card.
    side.classList.remove('pmd-sidebar-profile-collapse-target');

    var profile = side.querySelector('.pmd-sidebar-profile-card');
    if (profile) {
      profile.classList.add('pmd-sidebar-profile-collapse-target');
      profile.setAttribute('title', 'Profile');
    }
  }

  function ensureNativeToggle() {
    var side = sidebar();
    if (!side) return;

    // Let v15 own the button; if it has not created it yet, create compatible button.
    var btn = side.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmd-sidebar-icons-toggle';
      btn.setAttribute('aria-label', 'Toggle sidebar');
      side.appendChild(btn);

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var closed = (document.body||document.documentElement).classList.toggle('pmd-sidebar-icons-only');
        (document.body||document.documentElement).classList.remove('pmd-sidebar-collapsed');
        try { localStorage.setItem('pmdAdminSidebarIconsOnlyV15', closed ? '1' : '0'); } catch(e) {}
        updateNativeToggle();
        if (closed) closeSubmenus();
        window.dispatchEvent(new Event('resize'));
      }, true);
    }
  }

  function closeSubmenus() {
    var menu = document.querySelector('#side-nav-menu');
    if (!menu) return;
    menu.querySelectorAll('ul.nav.show, .collapse.show').forEach(function(el){
      el.classList.remove('show');
      el.style.height = '';
    });
    menu.querySelectorAll('a.nav-link[data-toggle="collapse"][aria-expanded="true"]').forEach(function(a){
      a.setAttribute('aria-expanded', 'false');
    });
  }

  function updateNativeToggle() {
    var btn = document.querySelector('.sidebar .pmd-sidebar-icons-toggle');
    if (!btn) return;
    var closed = (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only');
    btn.innerHTML = closed
      ? '<i class="fa fa-angle-right" aria-hidden="true"></i>'
      : '<i class="fa fa-angle-left" aria-hidden="true"></i>';
    btn.setAttribute('title', closed ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
  }

  function persistOnLinks() {
    document.querySelectorAll('#side-nav-menu a[href]').forEach(function(a){
      if (a.getAttribute('data-pmd-v50-persist')) return;
      a.setAttribute('data-pmd-v50-persist', '1');
      a.addEventListener('click', function(){
        try {
          localStorage.setItem('pmdAdminSidebarIconsOnlyV15', (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only') ? '1' : '0');
        } catch(e) {}
      }, true);
    });
  }

  function apply() {
    cleanupOldSidebarExperiments();
    fixProfileTarget();
    ensureNativeToggle();
    updateNativeToggle();
    persistOnLinks();
  }

  ready(function(){
    // Hard cleanup first, then let v15 native sidebar keep doing the normal collapse.
    apply();
    [80, 220, 500, 900, 1600, 2600].forEach(function(ms){ setTimeout(apply, ms); });
    window.addEventListener('resize', updateNativeToggle, { passive: true });

    window.PMDSidebarRecoverNativeV50 = {
      apply: apply,
      collapse: function(){
        (document.body||document.documentElement).classList.add('pmd-sidebar-icons-only');
        (document.body||document.documentElement).classList.remove('pmd-sidebar-collapsed');
        localStorage.setItem('pmdAdminSidebarIconsOnlyV15','1');
        closeSubmenus();
        apply();
      },
      expand: function(){
        (document.body||document.documentElement).classList.remove('pmd-sidebar-icons-only','pmd-sidebar-collapsed');
        localStorage.setItem('pmdAdminSidebarIconsOnlyV15','0');
        apply();
      },
      status: function(){ return (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only') ? 'icons-only' : 'expanded'; }
    };
  });
})();
