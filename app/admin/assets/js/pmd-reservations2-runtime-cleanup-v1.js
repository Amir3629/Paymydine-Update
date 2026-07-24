(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservations2') return;

  var html = document.documentElement;
  var page = document.getElementById('pmd-reservations2');
  var ready = false;
  var sidebar = document.getElementById('pmd-side-menu2');

  html.classList.add('pmd-r2-runtime-booting');
  html.classList.remove('pmd-r2-runtime-ready');

  window.PMD_RESERVATIONS2_RUNTIME_CLEANUP = true;
  window.PMD_RESERVATIONS2_REAL_WAITER_EMBED = false;

  function removeLegacyWaiterRoot() {
    var root = document.getElementById('pmd-waiter-dashboard-root');
    if (root) root.remove();
  }

  function normalizeHeader() {
    var actions = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions') ||
      document.querySelector('.pmd-r2-clean-actions');
    if (!actions) return false;

    var dateButton = document.getElementById('pmd-r2-date-button-v430');
    var calendarButton = document.getElementById('pmd-r2-calendar-toggle-v1');
    var createButton = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-create') ||
      document.querySelector('.pmd-r2-clean-create');
    var notification = document.getElementById('notif-root');

    [dateButton, calendarButton, createButton, notification].forEach(function (element) {
      if (!element) return;
      if (element.parentElement !== actions) actions.appendChild(element);
    });

    if (dateButton) {
      dateButton.hidden = false;
      dateButton.style.removeProperty('order');
      dateButton.setAttribute('data-pmd-r2-header-authority', 'runtime-cleanup-v1');
    }
    if (calendarButton) {
      calendarButton.style.removeProperty('order');
      calendarButton.setAttribute('data-pmd-r2-header-authority', 'runtime-cleanup-v1');
    }
    if (createButton) createButton.style.removeProperty('order');
    if (notification) notification.style.removeProperty('order');

    if (dateButton) actions.appendChild(dateButton);
    if (calendarButton) actions.appendChild(calendarButton);
    if (createButton) actions.appendChild(createButton);
    if (notification) actions.appendChild(notification);

    return true;
  }

  function stabilizeSidebar() {
    if (!sidebar) return;

    var collapsed = html.classList.contains('pmd-sm2-collapsed') ||
      sidebar.classList.contains('is-collapsed');

    sidebar.querySelectorAll('[data-pmd-sm2-dropdown]').forEach(function (dropdown) {
      var toggle = dropdown.querySelector('[data-pmd-sm2-dropdown-toggle]');
      var submenu = dropdown.querySelector('.pmd-sm2__submenu');
      var open = !collapsed && dropdown.classList.contains('is-open');

      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (submenu) {
        submenu.hidden = !open;
        submenu.classList.toggle('show', open);
        submenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
    });
  }

  function markReady() {
    if (ready) return;
    if (!page || !normalizeHeader()) return;

    removeLegacyWaiterRoot();
    stabilizeSidebar();

    if (page) page.setAttribute('aria-busy', 'false');
    html.classList.remove('pmd-r2-runtime-booting');
    html.classList.add('pmd-r2-runtime-ready');
    ready = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    removeLegacyWaiterRoot();
    normalizeHeader();
    stabilizeSidebar();
    requestAnimationFrame(function () {
      requestAnimationFrame(markReady);
    });
  }, { once: true });

  window.addEventListener('load', markReady, { once: true });

  setTimeout(markReady, 1200);

  window.PMDReservations2RuntimeCleanupV1 = {
    version: '1.0.0',
    refresh: function () {
      normalizeHeader();
      stabilizeSidebar();
      markReady();
    },
    audit: function () {
      return {
        version: '1.0.0',
        ready: ready,
        waiterRoot: Boolean(document.getElementById('pmd-waiter-dashboard-root')),
        headerActions: Boolean(document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions')),
        dateButton: Boolean(document.getElementById('pmd-r2-date-button-v430')),
        calendarButton: Boolean(document.getElementById('pmd-r2-calendar-toggle-v1')),
        sidebar: Boolean(sidebar)
      };
    }
  };
})();
