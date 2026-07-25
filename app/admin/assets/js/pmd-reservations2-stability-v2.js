(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/reservations2') return;

  var VERSION = '2.0.0';
  var html = document.documentElement;
  var lastSidebarState = null;
  var lastDropdownState = Object.create(null);
  var arranged = false;

  html.classList.add('pmd-r2-stability-active');

  function safeCall(fn) {
    try {
      return typeof fn === 'function' ? fn() : undefined;
    } catch (error) {
      console.warn('[PMD Reservations2 Stability V2]', error);
      return undefined;
    }
  }

  function currentSidebarState() {
    try {
      return localStorage.getItem('pmd.sideMenu2.state') === 'expanded'
        ? 'expanded'
        : 'collapsed';
    } catch (error) {
      return 'collapsed';
    }
  }

  function sidebarDomMatches(state) {
    var menu = document.getElementById('pmd-side-menu2');
    if (!menu) return true;
    var expanded = state === 'expanded';
    return html.classList.contains(expanded ? 'pmd-sm2-expanded' : 'pmd-sm2-collapsed') &&
      menu.classList.contains(expanded ? 'is-expanded' : 'is-collapsed');
  }

  function patchSidebar() {
    var api = window.PMDSideMenu2GlobalV3;
    if (!api || api.__pmdR2StablePatched) return false;

    var originalRefresh = api.refresh;
    var originalApply = api.applyState;
    var originalDropdown = api.setDropdown;

    api.applyState = function (state) {
      state = state === 'expanded' ? 'expanded' : 'collapsed';
      if (state === lastSidebarState && sidebarDomMatches(state)) return state;
      lastSidebarState = state;
      return originalApply.call(api, state);
    };

    api.refresh = function () {
      var state = currentSidebarState();
      if (state === lastSidebarState && sidebarDomMatches(state)) return state;
      lastSidebarState = state;
      return originalRefresh.call(api);
    };

    api.setDropdown = function (name, open) {
      var key = String(name || '');
      var next = Boolean(open);
      var dropdown = document.querySelector('[data-pmd-sm2-dropdown="' + CSS.escape(key) + '"]');
      var actual = Boolean(dropdown && dropdown.classList.contains('is-open'));
      if (lastDropdownState[key] === next && actual === next) return next;
      lastDropdownState[key] = next;
      return originalDropdown.call(api, name, open);
    };

    api.__pmdR2StablePatched = true;
    return true;
  }

  function neutralizeLegacyHeaderAuthorities() {
    var calendar = window.PMDReservations2CalendarToggleV1;
    if (!calendar) return false;

    if (!arranged && typeof calendar.arrangeHeader === 'function') {
      safeCall(function () { calendar.arrangeHeader(); });
      arranged = true;
    }

    var datePopover = window.PMDReservations2DatePopoverV318;
    if (datePopover && !datePopover.__pmdR2StablePatched) {
      datePopover.refresh = function () { return datePopover.audit ? datePopover.audit() : true; };
      datePopover.__pmdR2StablePatched = true;
    }

    return true;
  }

  function removeEntranceEffects() {
    var page = document.getElementById('pmd-reservations2');
    if (!page) return false;

    page.style.setProperty('opacity', '1', 'important');
    page.style.setProperty('transform', 'none', 'important');
    page.style.setProperty('animation', 'none', 'important');
    page.style.setProperty('transition-property', 'margin-left,width', 'important');

    html.classList.remove('pmd-dashboard-booting');
    html.classList.add('pmd-r2-stability-ready');
    return true;
  }

  function finalize() {
    patchSidebar();
    neutralizeLegacyHeaderAuthorities();
    removeEntranceEffects();
  }

  function boot() {
    finalize();
    requestAnimationFrame(function () {
      finalize();
      requestAnimationFrame(finalize);
    });
    setTimeout(finalize, 250);
    setTimeout(finalize, 900);
    setTimeout(finalize, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.PMDReservations2StabilityV2 = {
    version: VERSION,
    refresh: finalize,
    audit: function () {
      var page = document.getElementById('pmd-reservations2');
      var date = document.getElementById('pmd-r2-date-button-v430');
      var calendar = document.getElementById('pmd-r2-calendar-toggle-v1');
      return {
        version: VERSION,
        ready: html.classList.contains('pmd-r2-stability-ready'),
        sidebarPatched: Boolean(window.PMDSideMenu2GlobalV3 && window.PMDSideMenu2GlobalV3.__pmdR2StablePatched),
        datePopoverPatched: Boolean(window.PMDReservations2DatePopoverV318 && window.PMDReservations2DatePopoverV318.__pmdR2StablePatched),
        pageOpacity: page ? getComputedStyle(page).opacity : null,
        pageTransform: page ? getComputedStyle(page).transform : null,
        dateSize: date ? [date.offsetWidth, date.offsetHeight] : null,
        calendarSize: calendar ? [calendar.offsetWidth, calendar.offsetHeight] : null
      };
    }
  };

  console.info('[PMD Reservations2 Stability V2] Ready', window.PMDReservations2StabilityV2.audit());
})();