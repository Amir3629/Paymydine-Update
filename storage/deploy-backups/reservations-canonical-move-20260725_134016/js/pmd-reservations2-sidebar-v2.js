(function () {
  'use strict';

  if (location.pathname.replace(/\/+$/, '') !== '/admin/reservations2') return;
  if (window.PMDReservations2SidebarV2) return;

  window.PMDReservations2SidebarV2 = {
    version: '2.0.0',
    isolated: true,
    fixedWidth: true,
    destructiveRemoval: false,
    nativeSidebarHidden: false
  };

  document.documentElement.classList.add('pmd-r2-sidebar-page');

  function hideNativeSidebarSafely() {
    var nav = document.getElementById('navSidebar');
    if (!nav) return;

    nav.classList.add('pmd-r2-native-sidebar-hidden');

    var shell = nav.closest('.sidebar');
    if (shell) shell.classList.add('pmd-r2-native-sidebar-hidden');

    document.querySelectorAll('.sidebar-overlay').forEach(function (node) {
      node.classList.add('pmd-r2-native-sidebar-hidden');
    });

    document.documentElement.classList.remove(
      'sidebar-open',
      'sidebar-closed',
      'sidebar-collapsed',
      'pmd-sidebar-open',
      'pmd-sidebar-closed'
    );

    if (document.body) {
      document.body.classList.remove(
        'sidebar-open',
        'sidebar-closed',
        'sidebar-collapsed'
      );
    }

    window.PMDReservations2SidebarV2.nativeSidebarHidden = true;
  }

  function markActive() {
    document.querySelectorAll('.pmd-r2-sidebar__item').forEach(function (link) {
      var active = link.getAttribute('data-route') === 'reservations2';
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function boot() {
    markActive();
    hideNativeSidebarSafely();
    console.info('[PMD Reservations2 Sidebar V2] Ready', window.PMDReservations2SidebarV2);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();