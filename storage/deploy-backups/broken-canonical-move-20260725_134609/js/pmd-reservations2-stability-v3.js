(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservations' && route !== '/admin/reservations') return;

  var VERSION = '3.0.0';
  var html = document.documentElement;
  var finalized = false;
  var sidebarState = null;
  var dropdownState = Object.create(null);

  html.classList.add('pmd-r2-stability-v3-active');

  function visible(element) {
    if (!element) return false;
    var style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }

  function headerActions() {
    return document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions') ||
      Array.from(document.querySelectorAll('.pmd-r2-clean-actions')).find(visible) || null;
  }

  function patchSidebar() {
    var api = window.PMDSideMenu2GlobalV3;
    if (!api || api.__pmdR2V3Patched) return Boolean(api);

    var originalApply = api.applyState;
    var originalRefresh = api.refresh;
    var originalDropdown = api.setDropdown;

    api.applyState = function (state) {
      var next = state === 'expanded' ? 'expanded' : 'collapsed';
      if (sidebarState === next) return next;
      sidebarState = next;
      return typeof originalApply === 'function' ? originalApply.call(api, next) : next;
    };

    api.refresh = function () {
      var next = 'collapsed';
      try {
        next = localStorage.getItem('pmd.sideMenu2.state') === 'expanded' ? 'expanded' : 'collapsed';
      } catch (error) {}
      if (sidebarState === next) return next;
      sidebarState = next;
      return typeof originalRefresh === 'function' ? originalRefresh.call(api) : next;
    };

    api.setDropdown = function (name, open) {
      var key = String(name || '');
      var next = Boolean(open);
      if (dropdownState[key] === next) return next;
      dropdownState[key] = next;
      return typeof originalDropdown === 'function' ? originalDropdown.call(api, name, next) : next;
    };

    api.__pmdR2V3Patched = true;
    return true;
  }

  function patchLegacyAuthorities() {
    var dateApi = window.PMDReservations2DatePopoverV318;
    if (dateApi && !dateApi.__pmdR2V3Patched) {
      dateApi.refresh = function () { return typeof dateApi.audit === 'function' ? dateApi.audit() : true; };
      dateApi.__pmdR2V3Patched = true;
    }

    var oldHeader = window.PMDReservations2HeaderDateV432;
    if (oldHeader && !oldHeader.__pmdR2V3Patched) {
      oldHeader.refresh = function () { return true; };
      oldHeader.__pmdR2V3Patched = true;
    }
  }

  function arrangeHeader() {
    var actions = headerActions();
    if (!actions) return false;

    var notification = document.getElementById('notif-root');
    var create = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-create') || document.querySelector('.pmd-r2-clean-create');
    var calendar = document.getElementById('pmd-r2-calendar-toggle-v1');
    var date = document.getElementById('pmd-r2-date-button-v430');

    [date, calendar, create, notification].forEach(function (element) {
      if (element && element.parentElement !== actions) actions.appendChild(element);
    });

    if (date) {
      date.hidden = false;
      date.setAttribute('aria-label', 'Reservation date range');
      date.style.order = '1';
    }
    if (calendar) calendar.style.order = '2';
    if (create) create.style.order = '3';
    if (notification) notification.style.order = '4';

    actions.classList.add('pmd-r2-header-final-v3');
    return true;
  }

  function removeEntranceEffects() {
    var page = document.getElementById('pmd-reservations2');
    if (!page) return false;
    page.style.setProperty('opacity', '1', 'important');
    page.style.setProperty('visibility', 'visible', 'important');
    page.style.setProperty('transform', 'none', 'important');
    page.style.setProperty('animation', 'none', 'important');
    page.style.setProperty('transition', 'none', 'important');
    html.classList.remove('pmd-dashboard-booting');
    html.classList.add('pmd-r2-stability-v3-ready');
    return true;
  }

  function finalize() {
    patchSidebar();
    patchLegacyAuthorities();
    arrangeHeader();
    removeEntranceEffects();
    finalized = true;
  }

  function boot() {
    finalize();
    requestAnimationFrame(finalize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.PMDReservations2StabilityV3 = {
    version: VERSION,
    refresh: finalize,
    audit: function () {
      var page = document.getElementById('pmd-reservations2');
      var date = document.getElementById('pmd-r2-date-button-v430');
      var calendar = document.getElementById('pmd-r2-calendar-toggle-v1');
      return {
        version: VERSION,
        ready: finalized && html.classList.contains('pmd-r2-stability-v3-ready'),
        sidebarPatched: Boolean(window.PMDSideMenu2GlobalV3 && window.PMDSideMenu2GlobalV3.__pmdR2V3Patched),
        datePopoverPatched: Boolean(window.PMDReservations2DatePopoverV318 && window.PMDReservations2DatePopoverV318.__pmdR2V3Patched),
        pageOpacity: page ? getComputedStyle(page).opacity : null,
        pageTransform: page ? getComputedStyle(page).transform : null,
        headerFinal: Boolean(headerActions() && headerActions().classList.contains('pmd-r2-header-final-v3')),
        dateSize: date ? [date.offsetWidth, date.offsetHeight] : null,
        calendarSize: calendar ? [calendar.offsetWidth, calendar.offsetHeight] : null
      };
    }
  };

  console.info('[PMD Reservations2 Stability V3] Ready', window.PMDReservations2StabilityV3.audit());
})();