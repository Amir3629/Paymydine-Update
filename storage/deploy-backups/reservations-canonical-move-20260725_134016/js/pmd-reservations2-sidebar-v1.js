(function () {
  'use strict';

  if (location.pathname.replace(/\/+$/, '') !== '/admin/reservations2')
    return;

  if (window.PMDReservations2SidebarV1)
    return;

  window.PMDReservations2SidebarV1 = {
    version: '1.0.0',
    isolated: true,
    fixedWidth: true,
    nativeSidebarRemoved: false
  };

  document.documentElement.classList.add('pmd-r2-sidebar-page');

  function removeNativeSidebar() {
    var custom = document.querySelector('.pmd-r2-sidebar');
    if (!custom)
      return;

    document.querySelectorAll('.sidebar, #navSidebar, .sidebar-overlay').forEach(function (node) {
      if (!node.closest('.pmd-r2-sidebar'))
        node.remove();
    });

    document.documentElement.classList.remove(
      'sidebar-open',
      'sidebar-closed',
      'sidebar-collapsed',
      'pmd-sidebar-open',
      'pmd-sidebar-closed'
    );

    document.body && document.body.classList.remove(
      'sidebar-open',
      'sidebar-closed',
      'sidebar-collapsed'
    );

    window.PMDReservations2SidebarV1.nativeSidebarRemoved = true;
  }

  function markActive() {
    document.querySelectorAll('.pmd-r2-sidebar__item').forEach(function (link) {
      var isActive = link.getAttribute('data-route') === 'reservations2';
      link.classList.toggle('is-active', isActive);
      if (isActive)
        link.setAttribute('aria-current', 'page');
      else
        link.removeAttribute('aria-current');
    });
  }

  function boot() {
    markActive();
    removeNativeSidebar();

    console.info('[PMD Reservations2 Sidebar V1] Ready', window.PMDReservations2SidebarV1);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  else
    boot();
})();
