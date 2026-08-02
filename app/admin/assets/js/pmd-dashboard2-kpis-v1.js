(function () {
  'use strict';

  var route = String(location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/dashboard2') return;

  var VERSION = '3.0.0';
  var ENDPOINT = '/admin/dashboard2?pmd_kpis=1';
  var SECTION_ID = 'pmd-r2-reservation-kpis-v307';
  var ORDER = ['revenue', 'guests', 'turnover', 'channels', 'kitchen', 'occupancy', 'menu', 'tips'];
  var PERIOD_KEYS = ['revenue', 'guests', 'turnover', 'channels', 'kitchen', 'tips'];
  var PERIOD_STORAGE_KEY = 'pmd.dashboard2.kpi.periods.v3';
  var payload = window.PMD_DASHBOARD2_KPI_PAYLOAD || null;
  var cards = normalizeCards(window.PMD_DASHBOARD2_KPIS || {});
  var requestCount = 0;
  var activeMenu = null;

  function normalizeCards(input) {
    var output = {};
    if (!input || typeof input !== 'object') return output;
    Object.keys(input).forEach(function (key) {
      if (input[key] && typeof input[key] === 'object') {
        output[key] = Object.assign({key: key}, input[key]);
      }
    });
    return output;
  }

  function selectedPeriods() {
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem(PERIOD_STORAGE_KEY) || '{}') || {}; } catch (error) {}
    var result = {};
    ORDER.forEach(function (key) {
      result[key] = PERIOD_KEYS.indexOf(key) === -1
        ? 'current'
        : (stored[key] === 'month' ? 'month' : 'today');
    });
    return result;
  }

  function setPeriod(key, period) {
    var periods = selectedPeriods();
    periods[key] = period === 'month' ? 'month' : 'today';
    try { localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(periods)); } catch (error) {}
    closeMenu();
    renderKpis();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
    });
  }

  function icon(name) {
    var paths = {
      money: '<circle cx="12" cy="12" r="9"></circle><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',
      users: '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
      timer: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',
      utensils: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"></path>',
      flame: '<path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1 -10 0c0 -2.3 1.2 -4.4 3.5 -6.5c.2 2 1 3 1.5 3.5c1.2 -1.4 1.2 -3.7 0 -6z"></path>',
      table: '<path d="M3 10h18M5 10v8M19 10v8"></path><path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"></path>',
      star: '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (paths[name] || paths.money) + '</svg>';
  }

  function metricPeriod(card, period) {
    if (!card) return null;
    if (period === 'current') return card.periods || null;
    return card.periods && card.periods[period] ? card.periods[period] : null;
  }

  function money(value, currency) {
    var code = currency && currency.code ? currency.code : (payload && payload.currency) || 'EUR';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
        style: 'currency', currency: code, minimumFractionDigits: 2
      }).format(Number(value || 0));
    } catch (error) {
      return ((currency && currency.symbol) || '') + Number(value || 0).toFixed(2);
    }
  }

  function formatValue(card, aggregate) {
    if (!aggregate || aggregate.available !== true) return '—';
    var value = aggregate.value;
    if (value === null) return '—';
    if (card.format === 'money') return money(value, card.currency);
    if (card.format === 'minutes') return Math.round(Number(value)) + ' min';
    if (card.format === 'channels') return Number(value.dine_in || 0) + ' / ' + Number(value.takeaway || 0);
    if (card.format === 'percent') return Number(value || 0) + '%';
    if (card.format === 'menu') return Number(value.available_now || 0) + ' / ' + Number(value.total || 0);
    return String(value == null ? 0 : value);
  }

  function statusText(aggregate) {
    if (!aggregate || aggregate.available !== true) return 'Source unavailable';
    if (aggregate.value === null) return aggregate.reason || 'No completed records';
    return 'Connected';
  }

  function description(card, aggregate, period) {
    var label = period === 'month' ? 'This month' : (period === 'today' ? 'Today' : 'Current');
    var count = aggregate && typeof aggregate.sample_count === 'number' ? aggregate.sample_count : null;
    return label + ' · ' + statusText(aggregate) + (count !== null ? ' · ' + count + ' samples' : '');
  }

  function closeMenu() {
    if (!activeMenu) return;
    var menu = activeMenu;
    activeMenu = null;
    menu.hidden = true;
    var button = menu.parentElement && menu.parentElement.querySelector('[data-pmd-dashboard2-kpi-menu-button]');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function periodMenu(key, selected) {
    var menu = document.createElement('div');
    menu.className = 'pmd-r2-kpi-v2401-menu pmd-dashboard2-kpi-menu-v2';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    ['today', 'month'].forEach(function (period) {
      var option = document.createElement('button');
      var aggregate = metricPeriod(cards[key], period);
      option.type = 'button';
      option.className = 'pmd-r2-kpi-v2401-option' + (period === selected ? ' is-selected' : '');
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', period === selected ? 'true' : 'false');
      option.innerHTML = '<span class="pmd-r2-kpi-v2401-option-copy"><strong>' +
        (period === 'today' ? 'Today' : 'This month') + '</strong><small>' +
        escapeHtml(formatValue(cards[key], aggregate)) + ' · ' + escapeHtml(statusText(aggregate)) +
        '</small></span><span class="pmd-r2-kpi-v2401-check">' + (period === selected ? '✓' : '') + '</span>';
      option.addEventListener('click', function () { setPeriod(key, period); });
      menu.appendChild(option);
    });
    return menu;
  }

  function createCard(key) {
    var cardData = cards[key] || {key:key,title:key,tone:'green',icon:'money',format:'number',periods:null};
    var period = selectedPeriods()[key];
    var aggregate = metricPeriod(cardData, period);
    var card = document.createElement('article');
    card.className = 'pmd-r2-kpi-v2401-card';
    card.dataset.pmdDashboard2Kpi = key;
    card.dataset.pmdKpiV2401Key = key;
    card.dataset.pmdKpiV2401Tone = cardData.tone || 'green';
    card.dataset.pmdConnected = aggregate && aggregate.available === true ? 'true' : 'false';
    card.dataset.pmdPeriod = period;
    card.title = aggregate && aggregate.source ? aggregate.source : '';
    card.innerHTML = '<div class="pmd-r2-kpi-v2401-icon">' + icon(cardData.icon) + '</div>' +
      '<div class="pmd-r2-kpi-v2401-copy"><span class="pmd-r2-kpi-v2401-title">' + escapeHtml(cardData.title) +
      '</span><strong class="pmd-r2-kpi-v2401-value">' + escapeHtml(formatValue(cardData, aggregate)) +
      '</strong><span class="pmd-r2-kpi-v2401-description">' + escapeHtml(description(cardData, aggregate, period)) +
      '</span></div>';

    if (PERIOD_KEYS.indexOf(key) !== -1) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-r2-kpi-v2401-more';
      button.dataset.pmdDashboard2KpiMenuButton = 'period';
      button.setAttribute('aria-label', 'Choose KPI period');
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span></span><span></span><span></span>';
      var menu = periodMenu(key, period);
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = menu.hidden;
        closeMenu();
        menu.hidden = !open;
        if (open) { activeMenu = menu; button.setAttribute('aria-expanded', 'true'); }
      });
      card.appendChild(button);
      card.appendChild(menu);
    }
    return card;
  }

  function ensureSection() {
    var root = document.getElementById('pmd-reservations2');
    var header = document.getElementById('pmd-r2-clean-header');
    if (!root || !header) return null;
    var branch = header;
    while (branch.parentElement && branch.parentElement !== root) branch = branch.parentElement;
    if (branch.parentElement !== root) return null;
    var section = document.getElementById(SECTION_ID) || document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'pmd-r2-kpis-v2401 pmd-dashboard2-kpis-v2';
    section.dataset.pmdKpiAuthority = 'dashboard2-real-v3';
    section.setAttribute('aria-label', 'Owner dashboard KPIs');
    if (section.parentElement !== root || branch.nextElementSibling !== section) branch.insertAdjacentElement('afterend', section);
    return section;
  }

  function renderKpis() {
    var section = ensureSection();
    if (!section) return false;
    closeMenu();
    section.replaceChildren();
    ORDER.forEach(function (key) { section.appendChild(createCard(key)); });
    return true;
  }

  function refreshData() {
    requestCount += 1;
    return fetch(ENDPOINT, {credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'}})
      .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
      .then(function (data) {
        if (!data || data.success !== true || !data.cards || !data.kpis) throw new Error('Invalid KPI payload');
        payload = data;
        cards = normalizeCards(data.cards);
        renderKpis();
        return audit();
      })
      .catch(function (error) {
        console.warn('[PMD Dashboard2 Real KPI Data V3] Request failed', error);
        return audit();
      });
  }

  function visible(node) {
    if (!node) return false;
    var style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function audit() {
    var periods = selectedPeriods();
    var report = {};
    var unavailable = 0;
    ORDER.forEach(function (key) {
      var card = document.querySelector('[data-pmd-dashboard2-kpi="' + key + '"]');
      var aggregate = metricPeriod(cards[key], periods[key]);
      var connected = Boolean(aggregate && aggregate.available === true);
      if (!connected) unavailable += 1;
      report[key === 'kitchen' ? 'kitchenTicketTime' : (key === 'menu' ? 'menuAvailability' : key)] = {
        connected: connected,
        value: card && card.querySelector('.pmd-r2-kpi-v2401-value')
          ? card.querySelector('.pmd-r2-kpi-v2401-value').textContent.trim() : null,
        raw: aggregate || null,
        visible: visible(card)
      };
    });
    return {
      version: VERSION,
      endpoint: ENDPOINT,
      requestCount: requestCount,
      timezone: payload ? payload.timezone : null,
      currency: payload ? payload.currency : null,
      selectedPeriods: {
        revenue: periods.revenue, guests: periods.guests, turnover: periods.turnover,
        channels: periods.channels, kitchenTicketTime: periods.kitchen,
        occupancy: periods.occupancy, menuAvailability: periods.menu, tips: periods.tips
      },
      cards: report,
      sourceUnavailableCount: unavailable,
      reservationCardsPresent: Boolean(document.getElementById('pmd-r2-reservation-cards-v320')),
      toolbarPresent: Boolean(document.getElementById('pmd-dashboard2-floor-toolbar-proxy-v350')),
      pushNotificationScriptPresent: Boolean(document.querySelector('script[src*="push-notifications.js"]'))
    };
  }

  function boot() {
    renderKpis();
    document.addEventListener('click', function (event) {
      if (activeMenu && !activeMenu.contains(event.target) && !event.target.closest('[data-pmd-dashboard2-kpi-menu-button]')) closeMenu();
    });
    window.PMDDashboard2KPIDataFinal = {version:VERSION, endpoint:ENDPOINT, refresh:refreshData, audit:audit};
    window.PMDDashboard2KpisV2 = {version:VERSION, render:renderKpis, refresh:refreshData, audit:audit};
    refreshData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

/* PMD Dashboard2 canonical controls bridge V2.5.0 */
(function () {
  'use strict';
  var route = String(location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/dashboard2') return;
  if (window.PMDDashboard2CanonicalBridgeV250) return;

  function removeLegacyCustomControls() {
    ['pmd-dashboard2-calendar-v240', 'pmd-dashboard2-floor-toolbar-v240']
      .forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.remove();
      });
  }

  function setTitle() {
    var title = document.querySelector(
      '#pmd-r2-clean-header .pmd-r2-clean-title, ' +
      '#pmd-reservations2 .pmd-r2-clean-title'
    );
    if (title && title.textContent !== 'Dashboard') {
      title.textContent = 'Dashboard';
      title.setAttribute('data-pmd-dashboard2-title-authority', 'v250');
    }
    document.title = document.title.replace(/Reservations|Reservierungen|Übersicht/g, 'Dashboard');
  }

  function apply() {
    removeLegacyCustomControls();
    setTitle();
  }

  function visible(el) {
    if (!el) return false;
    var st = getComputedStyle(el), r = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0 && r.width > 1 && r.height > 1;
  }

  function audit() {
    var toggle = document.getElementById('pmd-r2-calendar-toggle-v1');
    var toolbar = document.getElementById('pmd-r2-floor-toolbar-v316');
    var title = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-title');
    return {
      version: '2.5.0',
      title: title ? title.textContent.trim() : null,
      customCalendarRemoved: !document.getElementById('pmd-dashboard2-calendar-v240'),
      customToolbarRemoved: !document.getElementById('pmd-dashboard2-floor-toolbar-v240'),
      canonicalViewToggle: Boolean(toggle),
      canonicalViewToggleVisible: visible(toggle),
      canonicalToolbar: Boolean(toolbar),
      canonicalToolbarVisible: visible(toolbar),
      canonicalToolbarButtons: toolbar ? toolbar.querySelectorAll('button').length : 0
    };
  }

  function boot() {
    apply();
    new MutationObserver(function () {
      requestAnimationFrame(apply);
    }).observe(document.getElementById('pmd-reservations2') || document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    [0, 60, 180, 450, 900, 1600, 2600].forEach(function (d) {
      setTimeout(apply, d);
    });
    window.PMDDashboard2CanonicalBridgeV250 = {version:'2.5.0', refresh:apply, audit:audit};
    console.info('[PMD Dashboard2 Canonical Bridge V2.5.0] Ready', audit());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
})();

/* ============================================================
   PMD Dashboard2 No-Cards Final Audit V1.0.0
   Read-only DOM evidence; card prevention lives in the canonical renderer.
   ============================================================ */
(function () {
  'use strict';

  function visible(node) {
    if (!node) return false;
    var style = window.getComputedStyle(node);
    var rect = node.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  function visibleCount(selector) {
    return Array.prototype.filter.call(
      document.querySelectorAll(selector),
      visible
    ).length;
  }

  function audit() {
    var toolbar = document.getElementById(
      'pmd-dashboard2-floor-toolbar-proxy-v350'
    );

    return {
      version: '1.0.0',
      route: window.location.pathname.replace(/\/+$/, ''),
      reservationSectionExists: Boolean(document.getElementById(
        'pmd-r2-reservation-cards-v320'
      )),
      reservationGridExists: Boolean(document.getElementById(
        'pmd-r2-reservation-grid-v320'
      )),
      visibleReservationCardsBelowView: visibleCount(
        '#pmd-r2-reservation-cards-v320 [data-r2-reservation-id], ' +
        '#pmd-r2-reservation-cards-v320 .pmd-r2-add-waiter-card, ' +
        '#pmd-r2-reservation-cards-v320 .pmd-r2-simple-add-card-v460'
      ),
      calendarDetailCardsBelowView: visibleCount('.pmd-r2-yc-detail-card'),
      hourCardsBelowView: visibleCount(
        '#pmd-r2-reservation-cards-v320 [data-reservation], ' +
        '#pmd-r2-reservation-cards-v320 [data-reservation-card]'
      ),
      floorExists: Boolean(document.getElementById(
        'pmd-r2-shared-floor-canvas-v310'
      )),
      toolbarExists: Boolean(toolbar),
      toolbarButtons: toolbar ? toolbar.querySelectorAll('button').length : 0,
      kpiCards: document.querySelectorAll(
        '[data-pmd-dashboard2-kpi]'
      ).length,
      pushNotificationScriptPresent: Boolean(document.querySelector(
        'script[src*="push-notifications.js"]'
      ))
    };
  }

  window.PMDDashboard2NoCardsFinal = {
    version: '1.0.0',
    audit: audit
  };
})();

/* ============================================================
   PMD Dashboard2 Toolbar + Performance Authority V3.6.0
   One toolbar build only. No observers, no intervals, no repeated
   rebuild loops and no legacy V3.5.0/V3.5.1/V3.5.2 runtimes.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDDashboard2PerformanceV360) return;

  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var PROXY_ID = 'pmd-dashboard2-floor-toolbar-proxy-v350';

  function last(selector) {
    var list = document.querySelectorAll(selector);
    return list.length ? list[list.length - 1] : null;
  }

  function nativeMap() {
    return {
      edit: last('[data-floor-edit]'),
      save: last('[data-floor-save]'),
      zoomOut: last('[data-floor-zoom-out]'),
      zoomIn: last('[data-floor-zoom-in]'),
      oneRow: last('[data-floor-strip]')
    };
  }

  function cleanClone(source, action, fallbackLabel) {
    var button = source
      ? source.cloneNode(true)
      : document.createElement('button');

    if (!source) {
      button.type = 'button';
      button.className = 'pmd-r2-floor-tool-v316';
      button.textContent = fallbackLabel;
    }

    button.removeAttribute('id');
    button.removeAttribute('hidden');
    button.removeAttribute('aria-hidden');
    button.removeAttribute('tabindex');
    button.removeAttribute('style');

    Array.prototype.slice.call(button.attributes).forEach(function (attr) {
      if (attr.name.indexOf('data-floor') === 0) {
        button.removeAttribute(attr.name);
      }
    });

    [
      'pmd-dashboard2-toolbar-extra-v290',
      'pmd-dashboard2-toolbar-keep-v290',
      'pmd-dashboard2-toolbar-extra-v300',
      'pmd-dashboard2-toolbar-keep-v300',
      'pmd-dashboard2-r2-toolbar-hidden-v330',
      'pmd-dashboard2-r2-toolbar-hidden-v331',
      'pmd-dashboard2-toolbar-visible-v341',
      'pmd-dashboard2-toolbar-hidden-v341'
    ].forEach(function (name) {
      button.classList.remove(name);
    });

    button.type = 'button';
    button.setAttribute('data-proxy-action', action);

    return button;
  }

  function buildToolbar() {
    var floor = document.getElementById(FLOOR_ID);
    if (!floor) return false;

    var existing = document.getElementById(PROXY_ID);
    if (existing) return true;

    var map = nativeMap();
    var proxy = document.createElement('div');

    proxy.id = PROXY_ID;
    proxy.setAttribute('aria-label', 'Floor controls');

    proxy.appendChild(cleanClone(map.edit, 'edit', 'Bearbeiten'));
    proxy.appendChild(cleanClone(map.zoomOut, 'zoom-out', '−'));
    proxy.appendChild(cleanClone(map.zoomIn, 'zoom-in', '+'));
    proxy.appendChild(cleanClone(map.oneRow, 'one-row', 'Eine Reihe'));

    proxy.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-proxy-action]');
      if (!button) return;

      var action = button.getAttribute('data-proxy-action');
      var current = nativeMap();
      var target = null;

      if (action === 'edit') {
        var editing = Boolean(
          current.edit &&
          current.edit.getAttribute('aria-pressed') === 'true'
        );
        target = editing && current.save ? current.save : current.edit;
      } else if (action === 'zoom-out') {
        target = current.zoomOut;
      } else if (action === 'zoom-in') {
        target = current.zoomIn;
      } else if (action === 'one-row') {
        target = current.oneRow;
      }

      if (target) target.click();
    });

    floor.insertBefore(proxy, floor.firstElementChild);
    floor.setAttribute('data-pmd-dashboard2-performance', 'v360');

    return true;
  }

  function reduceRouteWork() {
    document.documentElement.classList.add(
      'pmd-dashboard2-performance-v360'
    );

    window.SKIP_EXPENSIVE_OBSERVERS = true;

    if (
      window.forceButtonAlignment &&
      typeof window.forceButtonAlignment.stop === 'function'
    ) {
      window.forceButtonAlignment.stop();
    }
  }

  function audit() {
    var proxy = document.getElementById(PROXY_ID);

    return {
      version: '3.6.0',
      proxy: Boolean(proxy),
      proxyButtons: proxy
        ? proxy.querySelectorAll('button').length
        : 0,
      legacyProxyGlobals: [
        'PMDDashboard2ReservationsToolbarProxyV350',
        'PMDDashboard2ReservationsToolbarProxyV351',
        'PMDDashboard2ReservationsToolbarProxyV352'
      ].filter(function (name) {
        return Boolean(window[name]);
      }),
      expensiveObserversSkipped:
        window.SKIP_EXPENSIVE_OBSERVERS === true,
      observersAdded: 0,
      intervalsAdded: 0
    };
  }

  function boot() {
    reduceRouteWork();

    /*
     * Native controls are created during the existing Reservations startup.
     * One delayed build avoids eight repeated full-document scans.
     */
    window.setTimeout(function () {
      buildToolbar();

      console.info(
        '[PMD Dashboard2 Toolbar + Performance V3.6.0] Ready',
        audit()
      );
    }, 1800);

    window.PMDDashboard2PerformanceV360 = {
      version: '3.6.0',
      buildToolbar: buildToolbar,
      audit: audit
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
