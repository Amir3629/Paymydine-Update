/* ============================================================
   PMD_DASHBOARD2_V1403_FINAL_BAR_BOOT_AUTHORITY
   PREPAINT GUARD
   ============================================================ */
(function () {
  'use strict';

  /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT */
  window.PMD_DASHBOARD2_ZERO_BLINK_V1410 = true;

  try {
    if (
      localStorage.getItem(
        'pmd.dashboard2.salesChartMode.v1'
      ) === 'bar'
    ) {
      document.documentElement.classList.add(
        'pmd-dashboard2-v1403-bar-boot'
      );
    }
  } catch (error) {
    // localStorage may be unavailable.
  }

  const style =
    document.createElement('style');

  style.id =
    'pmd-dashboard2-v1403-prepaint-style';

  style.textContent = `
    html.pmd-dashboard2-v1403-bar-boot
    [data-pmd-analytics-widget="salesOverTime"]
    [data-pmd-widget-body] {
      visibility: hidden !important;
      opacity: 0 !important;
    }
  `;

  (
    document.head ||
    document.documentElement
  ).appendChild(style);
})();

(function () {
  'use strict';

  var route = String(location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/dashboard2') return;

  var VERSION = '3.1.0';
  var ENDPOINT = '/admin/dashboard2?pmd_kpis=1';
  var SECTION_ID = 'pmd-r2-reservation-kpis-v307';
  var ORDER = ['revenue', 'guests', 'turnover', 'channels', 'kitchen', 'occupancy', 'menu', 'tips'];
  var PERIOD_KEYS = ['revenue', 'guests', 'turnover', 'channels', 'kitchen', 'tips'];
  var PERIOD_STORAGE_KEY = 'pmd.dashboard2.kpi.periods.v3';
  var SELECTION_STORAGE_KEY = 'pmd.dashboard2.kpiSelection.v3';
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

  function selectedKeys() {
    var keys = [];
    try { keys = JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY) || '[]') || []; } catch (error) {}
    keys = keys.filter(function (key, index) { return ORDER.indexOf(key) !== -1 && keys.indexOf(key) === index; });
    ORDER.forEach(function (key) { if (keys.length < 4 && keys.indexOf(key) === -1) keys.push(key); });
    return keys.slice(0, 4);
  }

  function replaceKey(slot, key) {
    var keys = selectedKeys();
    var duplicate = keys.indexOf(key);
    if (duplicate !== -1 && duplicate !== slot) return;
    keys[slot] = key;
    try { localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(keys)); } catch (error) {}
    closeMenu();
    renderKpis();
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

  function cardMenu(slot, key, selected) {
    var menu = document.createElement('div');
    menu.className = 'pmd-r2-kpi-v2401-menu pmd-dashboard2-kpi-menu-v2';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    var heading = document.createElement('span');
    heading.className = 'pmd-dashboard2-kpi-menu-heading';
    heading.textContent = 'Metric';
    menu.appendChild(heading);
    var visibleKeys = selectedKeys();
    ORDER.forEach(function (choice) {
      var option = document.createElement('button');
      var unavailable = visibleKeys.indexOf(choice) !== -1 && choice !== key;
      option.type = 'button'; option.className = 'pmd-r2-kpi-v2401-option'; option.disabled = unavailable;
      option.innerHTML = '<span class="pmd-r2-kpi-v2401-option-copy"><strong>' + escapeHtml((cards[choice] || {}).title || choice) +
        '</strong><small>' + (unavailable ? 'Already visible' : 'Show in this card') + '</small></span>' +
        '<span class="pmd-r2-kpi-v2401-check">' + (choice === key ? '✓' : '') + '</span>';
      option.addEventListener('click', function () { replaceKey(slot, choice); }); menu.appendChild(option);
    });
    if (PERIOD_KEYS.indexOf(key) !== -1) {
      var periodHeading = heading.cloneNode(false); periodHeading.textContent = 'Period'; menu.appendChild(periodHeading);
      ['today', 'month'].forEach(function (period) {
        var option = document.createElement('button'), aggregate = metricPeriod(cards[key], period);
        option.type = 'button'; option.className = 'pmd-r2-kpi-v2401-option' + (period === selected ? ' is-selected' : '');
        option.innerHTML = '<span class="pmd-r2-kpi-v2401-option-copy"><strong>' + (period === 'today' ? 'Today' : 'This month') +
          '</strong><small>' + escapeHtml(formatValue(cards[key], aggregate)) + ' · ' + escapeHtml(statusText(aggregate)) +
          '</small></span><span class="pmd-r2-kpi-v2401-check">' + (period === selected ? '✓' : '') + '</span>';
        option.addEventListener('click', function () { setPeriod(key, period); }); menu.appendChild(option);
      });
    }
    return menu;
  }

  function createCard(key, slot) {
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

    {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-r2-kpi-v2401-more';
      button.dataset.pmdDashboard2KpiMenuButton = 'selector';
      button.setAttribute('aria-label', 'Choose KPI and period');
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span></span><span></span><span></span>';
      var menu = cardMenu(slot, key, period);
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
    selectedKeys().forEach(function (key, slot) { section.appendChild(createCard(key, slot)); });
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
    var keys = selectedKeys();
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
      selectedKeys: keys,
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

/* PMD Dashboard2 persistent analytics workspace V1.0.0 */
(function () {
  'use strict';
  if (String(location.pathname || '').replace(/\/+$/, '') !== '/admin/dashboard2') return;
  var VERSION = '1.1.0', ROOT_ID = 'pmd-dashboard2-analytics-v1';
  var PERIOD_KEY = 'pmd.dashboard2.analyticsPeriod.v1', CHART_MODE_KEY = 'pmd.dashboard2.salesChartMode.v1', cache = {}, requestCount = 0, controller = null, data = null, salesChartMode = 'line';
  try { salesChartMode = localStorage.getItem(CHART_MODE_KEY) === 'bar' ? 'bar' : 'line'; } catch (e) {}
  var widgetKeys = ['salesOverTime','salesByHour','topItems','categorySales','paymentMethods','channelSplit','liveOperations','recentTransactions','alerts','reviews','tips','calendarEvents'];

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
  function period() { return 'last30'; }
  function money(value) { try { return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {style:'currency',currency:(data && data.currency)||'EUR'}).format(Number(value||0)); } catch(e) { return Number(value||0).toFixed(2); } }
  function ensureRoot() {
    var reservations = document.getElementById('pmd-reservations2');
    if (!reservations || !reservations.parentElement) return null;
    var parent = reservations.parentElement;
    var roots = document.querySelectorAll('#' + ROOT_ID);
    var root = roots[0] || document.createElement('section');
    Array.prototype.slice.call(roots, 1).forEach(function (node) { node.remove(); });
    root.id = ROOT_ID;
    root.className = 'pmd-dashboard2-analytics-v1';
    root.setAttribute('aria-label', 'Dashboard analytics');
    if (root.parentElement !== parent || root.previousElementSibling !== reservations) {
      reservations.insertAdjacentElement('afterend', root);
    }
    return root;
  }
  function widget(id, title, span) { var toggle=id==='salesOverTime'?'<div class="pmd-dashboard2-chart-toggle" role="group" aria-label="Chart type"><button type="button" data-pmd-chart-mode="line" class="'+(salesChartMode==='line'?'is-active':'')+'" aria-pressed="'+(salesChartMode==='line'?'true':'false')+'">Linie</button><button type="button" data-pmd-chart-mode="bar" class="'+(salesChartMode==='bar'?'is-active':'')+'" aria-pressed="'+(salesChartMode==='bar'?'true':'false')+'">Balken</button></div>':''; return '<article class="pmd-dashboard2-analytics-card ' + (span||'') + '" data-pmd-analytics-widget="' + id + '"><header><h3>' + esc(title) + '</h3>'+toggle+'</header><div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div></article>'; }
  function shell() {
    var root = ensureRoot(); if (!root) return null;
    if (!root.querySelector('[data-pmd-analytics-grid]')) root.innerHTML = '<div class="pmd-dashboard2-analytics-grid" data-pmd-analytics-grid>' +
      widget('salesOverTime','Umsatzverlauf','is-wide') + widget('salesByHour','Umsatz nach Stunde','') + widget('topItems','Top-selling items','') + widget('categorySales','Sales by category','') + widget('paymentMethods','Payment methods','') + widget('channelSplit','Order channels','') + widget('liveOperations','Live orders','is-wide') + widget('recentTransactions','Recent transactions','is-wide') + widget('alerts','Alerts','') + widget('reviews','Latest reviews','') + widget('tips','Tips summary','') + widget('calendarEvents','Upcoming reservations','') + '</div>';
    
    return root;
  }
  function empty(source) { return '<p class="pmd-dashboard2-empty">' + esc((source && (source.reason || source.source)) || 'No records') + '</p>'; }
  function bars(rows, label, value) { if (!rows || !rows.length) return empty(); var max=Math.max.apply(null,rows.map(function(r){return Number(r[value]||0);}).concat([1])); return '<div class="pmd-dashboard2-bars">'+rows.map(function(r){var v=Number(r[value]||0);return '<div title="'+esc(label(r))+' · '+esc(money(v))+'"><span>'+esc(label(r))+'</span><i style="--pmd-bar:'+Math.round(v/max*100)+'%"></i><b>'+esc(money(v))+'</b></div>';}).join('')+'</div>'; }
  function list(rows, render) { return rows && rows.length ? '<ul class="pmd-dashboard2-data-list">'+rows.map(function(r){return '<li>'+render(r)+'</li>';}).join('')+'</ul>' : empty(); }


  function chartText(value) {
    return esc(money(Number(value || 0)));
  }

  function niceChartScale(rawMaximum) {
    var maximum = Math.max(1, Number(rawMaximum || 0));
    var roughStep = maximum / 4;
    var magnitude = Math.pow(
      10,
      Math.floor(Math.log10(roughStep))
    );
    var normalized = roughStep / magnitude;
    var niceNormalized;

    if (normalized <= 1) {
      niceNormalized = 1;
    } else if (normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized <= 2.5) {
      niceNormalized = 2.5;
    } else if (normalized <= 5) {
      niceNormalized = 5;
    } else {
      niceNormalized = 10;
    }

    var step = niceNormalized * magnitude;
    var scaleMaximum = Math.ceil(maximum / step) * step;
    var ticks = [];

    for (var value = 0; value <= scaleMaximum + step / 10; value += step) {
      ticks.push(Number(value.toFixed(8)));
    }

    return {
      max: scaleMaximum,
      step: step,
      ticks: ticks
    };
  }

  function shortBucketLabel(row) {
    if (row && row.hour !== undefined && row.hour !== null) {
      return String(row.hour).padStart(2, '0') + ':00';
    }

    var raw = String((row && row.bucket) || '');

    if (!raw) return '';

    if (raw.indexOf(' ') !== -1) {
      return raw.slice(11, 16);
    }

    try {
      var parsed = new Date(raw + 'T12:00:00');

      return new Intl.DateTimeFormat(
        document.documentElement.lang || 'de-DE',
        {
          day: '2-digit',
          month: 'short'
        }
      ).format(parsed);
    } catch (error) {
      return raw.slice(5);
    }
  }

  function longBucketLabel(row) {
    if (row && row.hour !== undefined && row.hour !== null) {
      return String(row.hour).padStart(2, '0') + ':00';
    }

    var raw = String((row && row.bucket) || '');

    try {
      var parsed = raw.indexOf(' ') !== -1
        ? new Date(raw.replace(' ', 'T'))
        : new Date(raw + 'T12:00:00');

      return new Intl.DateTimeFormat(
        document.documentElement.lang || 'de-DE',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }
      ).format(parsed);
    } catch (error) {
      return raw;
    }
  }

  function axisIndexes(rows, hourly) {
    var indexes = [];

    if (hourly) {
      rows.forEach(function (row, index) {
        if (Number(row.hour) % 3 === 0) {
          indexes.push(index);
        }
      });

      return indexes;
    }

    var target = Math.min(7, rows.length);
    var step = Math.max(
      1,
      Math.ceil((rows.length - 1) / Math.max(1, target - 1))
    );

    for (var index = 0; index < rows.length; index += step) {
      indexes.push(index);
    }

    if (
      indexes.length &&
      indexes[indexes.length - 1] !== rows.length - 1
    ) {
      indexes.push(rows.length - 1);
    }

    return indexes;
  }

  function chartGrid(scale, dimensions) {
    return scale.ticks.map(function (value) {
      var ratio = value / scale.max;
      var y = dimensions.top +
        dimensions.plotH -
        dimensions.plotH * ratio;

      return (
        '<line class="pmd-chart-grid-line" ' +
        'x1="' + dimensions.left + '" y1="' + y + '" ' +
        'x2="' + (dimensions.w - dimensions.right) + '" ' +
        'y2="' + y + '"></line>' +
        '<text class="pmd-dashboard2-chart-axis-label is-y-axis" ' +
        'x="' + (dimensions.left - 14) + '" y="' + (y + 4) + '" ' +
        'text-anchor="end">' +
        chartText(value) +
        '</text>'
      );
    }).join('');
  }

  function svgLine(rows) {
    if (!rows || !rows.length) return empty();

    var values = rows.map(function (row) {
      return Number(row.sales || 0);
    });

    var rawMaximum = Math.max.apply(null, values.concat([1]));
    var scale = niceChartScale(rawMaximum);

    var dimensions = {
      w: 900,
      h: 330,
      left: 78,
      right: 18,
      top: 12,
      bottom: 46
    };

    dimensions.plotW =
      dimensions.w - dimensions.left - dimensions.right;

    dimensions.plotH =
      dimensions.h - dimensions.top - dimensions.bottom;

    var points = rows.map(function (row, index) {
      return {
        x: dimensions.left +
          dimensions.plotW *
          (rows.length === 1 ? 0 : index / (rows.length - 1)),

        y: dimensions.top +
          dimensions.plotH -
          dimensions.plotH *
          Number(row.sales || 0) /
          scale.max,

        value: Number(row.sales || 0),
        row: row,
        index: index
      };
    });

    var indexes = axisIndexes(rows, false);
    var baseline = dimensions.top + dimensions.plotH;

    var linePoints = points.map(function (point) {
      return point.x + ',' + point.y;
    }).join(' ');

    var areaPoints =
      dimensions.left + ',' + baseline + ' ' +
      linePoints + ' ' +
      (dimensions.w - dimensions.right) + ',' + baseline;

    var xLabels = indexes.map(function (index) {
      var point = points[index];

      return (
        '<text class="pmd-dashboard2-chart-axis-label is-x-axis" ' +
        'x="' + point.x + '" y="' + (dimensions.h - 15) + '" ' +
        'text-anchor="middle">' +
        esc(shortBucketLabel(point.row)) +
        '</text>'
      );
    }).join('');

    var pointMarkup = points.map(function (point) {
      var aria =
        longBucketLabel(point.row) + '. ' +
        money(point.row.sales) + '. ' +
        Number(point.row.orders || 0) + ' Bestellungen';

      var visiblePoint = point.value > 0
        ? (
          '<circle class="pmd-chart-point" ' +
          'cx="' + point.x + '" cy="' + point.y + '" r="3.5"></circle>'
        )
        : '';

      return (
        '<g class="pmd-chart-focus-point" tabindex="0" ' +
        'role="img" aria-label="' + esc(aria) + '">' +
        '<rect class="pmd-chart-hit-target" ' +
        'x="' + (point.x - 9) + '" ' +
        'y="' + (point.y - 9) + '" ' +
        'width="18" height="18" rx="4"></rect>' +
        visiblePoint +
        '<title>' + esc(aria) + '</title>' +
        '</g>'
      );
    }).join('');

    return (
      '<div class="pmd-dashboard2-chart-frame">' +
      '<svg class="pmd-dashboard2-chart is-line-chart" ' +
      'viewBox="0 0 ' + dimensions.w + ' ' + dimensions.h + '" ' +
      'role="img" aria-label="Umsatzverlauf">' +

      '<defs>' +
      '<linearGradient id="pmd-sales-area-gradient" ' +
      'x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#2f816c" stop-opacity="0.18">' +
      '</stop>' +
      '<stop offset="100%" stop-color="#2f816c" stop-opacity="0.01">' +
      '</stop>' +
      '</linearGradient>' +
      '</defs>' +

      chartGrid(scale, dimensions) +

      '<line class="pmd-chart-axis" ' +
      'x1="' + dimensions.left + '" y1="' + baseline + '" ' +
      'x2="' + (dimensions.w - dimensions.right) + '" ' +
      'y2="' + baseline + '"></line>' +

      '<polygon class="pmd-chart-area" points="' +
      areaPoints + '"></polygon>' +

      '<polyline class="pmd-chart-line" points="' +
      linePoints + '"></polyline>' +

      pointMarkup +
      xLabels +

      '</svg>' +
      '</div>'
    );
  }

  function svgBars(rows, label, initialVisibleCount) {
    if (!rows || !rows.length) return empty();

    var hourly =
      rows[0] &&
      rows[0].hour !== undefined &&
      rows[0].hour !== null;

    var values = rows.map(function (row) {
      return Number(row.sales || 0);
    });

    var rawMaximum = Math.max.apply(null, values.concat([1]));
    var peak = Math.max.apply(null, values);
    var scale = niceChartScale(rawMaximum);

    var dimensions = {
      w: 900,
      h: 310,
      left: 78,
      right: 18,
      top: 12,
      bottom: 46
    };

    dimensions.plotW =
      dimensions.w - dimensions.left - dimensions.right;

    dimensions.plotH =
      dimensions.h - dimensions.top - dimensions.bottom;

    var gap = dimensions.plotW / rows.length;
    var barW = Math.max(5, Math.min(23, gap * 0.6));
    var baseline = dimensions.top + dimensions.plotH;

    /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT
     * Build the final selected window in the first HTML string. All points
     * remain in the SVG for the slider, but points outside the selected
     * window are hidden before the browser gets a paint opportunity.
     */
    var requestedInitialVisible = Number(initialVisibleCount);
    var initialVisible = Number.isFinite(requestedInitialVisible)
      ? Math.max(1, Math.min(requestedInitialVisible, rows.length))
      : rows.length;
    var initialWindowActive = initialVisible < rows.length;
    var initialPeakIndex = values.indexOf(peak);
    if (initialPeakIndex < 0) initialPeakIndex = 0;
    var initialStart = 0;

    if (initialWindowActive) {
      initialStart = hourly
        ? Math.max(0, rows.length - initialVisible)
        : Math.max(
            0,
            Math.min(
              initialPeakIndex - Math.floor(initialVisible / 2),
              rows.length - initialVisible
            )
          );
    }

    var initialEnd = initialStart + initialVisible;
    var initialGap = dimensions.plotW / initialVisible;
    var initialBarW = initialWindowActive
      ? Math.max(14, Math.min(58, initialGap * 0.68, barW * 2.8))
      : barW;
    var visibleRows = rows.slice(initialStart, initialEnd);
    var indexes = axisIndexes(visibleRows, hourly).map(function (index) {
      return index + initialStart;
    });

    var barsMarkup = rows.map(function (row, index) {
      var value = Number(row.sales || 0);
      var height = dimensions.plotH * value / scale.max;
      var insideInitialWindow =
        index >= initialStart && index < initialEnd;
      var visibleIndex = index - initialStart;
      var activeGap = initialWindowActive ? initialGap : gap;
      var activeBarW = initialWindowActive ? initialBarW : barW;
      var x = insideInitialWindow
        ? dimensions.left +
          visibleIndex * activeGap +
          (activeGap - activeBarW) / 2
        : dimensions.left +
          index * gap +
          (gap - barW) / 2;

      var y = baseline - height;
      var isPeak = value === peak && value > 0;

      var aria =
        longBucketLabel(row) + '. ' +
        money(value) + '. ' +
        Number(row.orders || 0) + ' Bestellungen';

      return (
        '<g class="pmd-chart-focus-point" tabindex="0" ' +
        (insideInitialWindow ? '' : 'style="display:none" ') +
        'role="img" aria-label="' + esc(aria) + '">' +

        '<rect class="' +
        (
          isPeak
            ? 'is-peak'
            : (value === 0 ? 'is-zero' : '')
        ) +
        '" x="' + x + '" ' +
        'y="' + (value === 0 ? baseline - 1 : y) + '" ' +
        'width="' + (insideInitialWindow ? activeBarW : barW) + '" ' +
        'height="' + (value === 0 ? 1 : Math.max(3, height)) + '">' +
        '<title>' + esc(aria) + '</title>' +
        '</rect>' +

        '</g>'
      );
    }).join('');

    var xLabels = indexes.map(function (index) {
      var visibleLabelIndex = index - initialStart;
      var labelGap = initialWindowActive ? initialGap : gap;
      var x =
        dimensions.left +
        visibleLabelIndex * labelGap +
        labelGap / 2;

      return (
        '<text class="pmd-dashboard2-chart-axis-label is-x-axis" ' +
        'x="' + x + '" y="' + (dimensions.h - 14) + '" ' +
        'text-anchor="middle">' +
        esc(shortBucketLabel(rows[index])) +
        '</text>'
      );
    }).join('');

    /*
     * PMD_DASHBOARD2_V1412_SINGLE_SALES_LEGEND
     *
     * svgBars() is shared by:
     * - Sales over time
     * - Sales by hour
     *
     * Keep one clear legend item only. Peak remains available visually
     * through the is-peak bar class, but no separate Spitzenwert sticker
     * is rendered in either card.
     */
    var legend =
      '<div class="pmd-dashboard2-chart-key">' +

      '<span>' +
      '<i class="is-sales"></i>' +
      'Umsatz' +
      '</span>' +

      '</div>';

    return (
      '<div class="pmd-dashboard2-chart-frame">' +

      '<svg class="pmd-dashboard2-chart is-bar-chart" ' +
      'viewBox="0 0 ' + dimensions.w + ' ' + dimensions.h + '" ' +
      'role="img" aria-label="' + esc(label) + '">' +

      chartGrid(scale, dimensions) +

      '<line class="pmd-chart-axis" ' +
      'x1="' + dimensions.left + '" y1="' + baseline + '" ' +
      'x2="' + (dimensions.w - dimensions.right) + '" ' +
      'y2="' + baseline + '"></line>' +

      barsMarkup +
      xLabels +

      '</svg>' +

      legend +

      '</div>'
    );
  }
  function svgDonut(rows,name,value,label) {
    rows = Array.isArray(rows) ? rows.slice(0, 6) : [];
    if (!rows.length) return empty();
    var total = rows.reduce(function(sum,r){return sum+Number(r[value]||0);},0);
    var colors=['#00A676','#2563EB','#FF8A00','#D946EF','#06B6D4','#EF4444'];
    var offset=0;
    var circles = total > 0 ? rows.map(function(r,i){
      var pct=Number(r[value]||0)/total*100;
      var c='<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="18" stroke-dasharray="'+pct+' '+(100-pct)+'" stroke-dashoffset="'+(-offset)+'"><title>'+esc(r[name])+' · '+esc(money(r[value]))+' · '+pct.toFixed(1)+'%</title></circle>';
      offset+=pct;
      return c;
    }).join('') : '';
    var legend='<ul class="pmd-chart-legend">'+rows.map(function(r,i){
      var pct=total>0?Number(r[value]||0)/total*100:0;
      return '<li><i style="background:'+colors[i%colors.length]+'"></i><span>'+esc(r[name])+'</span><b>'+esc(label(r))+' · '+pct.toFixed(1)+'%</b></li>';
    }).join('')+'</ul>';
    return '<div class="pmd-dashboard2-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Breakdown chart"><circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#edf1ef" stroke-width="18"/>'+circles+'</svg>'+legend+'</div>';
  }

  function render() {
    var root=shell(); if(!root||!data) return;
    root.querySelectorAll('[data-pmd-chart-mode]').forEach(function(button){
      var active = button.dataset.pmdChartMode === salesChartMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    function put(key, html){var body=root.querySelector('[data-pmd-analytics-widget="'+key+'"] [data-pmd-widget-body]');if(body)body.innerHTML=html;}
    var s=data.sales_over_time;
    var salesCard = root.querySelector(
      '[data-pmd-analytics-widget="salesOverTime"]'
    );
    var salesBody = salesCard && salesCard.querySelector('[data-pmd-widget-body]');

    if (salesBody) {
      salesBody.style.setProperty('visibility', 'hidden', 'important');
      salesBody.style.setProperty('opacity', '0', 'important');
    }

    put(
      'salesOverTime',
      s.available
        ? (salesChartMode === 'line'
            ? svgLine(s.buckets)
            : svgBars(s.buckets, 'Sales over time bar chart', 19))
        : empty(s)
    );
    var h=data.sales_by_hour;
    put(
      'salesByHour',
      h.available
        ? svgBars(h.hours, 'Sales by hour bar chart', 15)
        : empty(h)
    );
    var t=data.top_items; put('topItems',t.available?(t.empty?empty(t):list(t.items,function(r){return '<span>'+esc(r.name)+'</span><b>'+esc(r.quantity)+' · '+esc(money(r.revenue))+'</b>'; })):empty(t));
    var c=(window.PMDDashboard2DonutPeriodsV1395&&window.PMDDashboard2DonutPeriodsV1395.sourceFor?window.PMDDashboard2DonutPeriodsV1395.sourceFor('categorySales'):null)||data.sales_by_category; put('categorySales',c.available?(c.empty?empty(c):svgDonut(c.categories,'category','revenue',function(r){return money(r.revenue);})) :empty(c));
    var p=(window.PMDDashboard2DonutPeriodsV1395&&window.PMDDashboard2DonutPeriodsV1395.sourceFor?window.PMDDashboard2DonutPeriodsV1395.sourceFor('paymentMethods'):null)||data.payment_methods; put('paymentMethods',p.available?(p.empty?empty(p):svgDonut(p.methods,'method','total',function(r){return money(r.total)+' · '+r.transactions;})):empty(p));
    var ch=(window.PMDDashboard2DonutPeriodsV1395&&window.PMDDashboard2DonutPeriodsV1395.sourceFor?window.PMDDashboard2DonutPeriodsV1395.sourceFor('channelSplit'):null)||data.channels; put('channelSplit',ch.available?(ch.empty?empty(ch):svgDonut(ch.channels,'channel','revenue',function(r){return r.orders+' · '+money(r.revenue);})):empty(ch));
    var live=data.live_operations; put('liveOperations',live.available?'<div class="pmd-dashboard2-live-summary"><b>'+esc(live.live_order_count)+'</b><span>live orders</span></div>'+list(live.orders,function(r){return '<span>#'+esc(r.order_id)+' · '+esc(r.channel)+'</span><b>'+esc(r.status)+'</b>'; }):empty(live));
    var tx=data.recent_transactions; put('recentTransactions',tx.available?(tx.empty?empty(tx):list(tx.transactions,function(r){var method=r.method?' · '+esc(r.method):'';return '<span>#'+esc(r.order_id)+method+' · '+esc(r.timestamp)+'</span><b>'+esc(money(r.amount))+'</b>'; })):empty(tx));
    var a=data.alerts; put('alerts',a.available?list(Object.keys(a.types).map(function(k){var name=k.replace(/_/g,' ');if(k==='long_open_tables')name+=' (> '+esc(a.long_open_threshold_minutes)+' min)';return {name:name,value:a.types[k]};}),function(r){return '<span>'+esc(r.name)+'</span><b>'+(r.value===null?'Source unavailable':esc(r.value))+'</b>'; }):empty(a));
    /*
     * PMD_DASHBOARD2_NATIVE_TODAY_CARDS_V6
     *
     * The first and only render already contains the final
     * today-only Review presentation.
     */
    var rv = data.reviews;

    put(
      'reviews',
      rv.available
        ? (
            '<div class="pmd-dashboard2-review-score">' +
              '<b>' +
                (
                  rv.average === null
                    ? '—'
                    : esc(rv.average)
                ) +
              '</b>' +
              '<span>' +
                esc(rv.count) +
                (
                  Number(rv.count) === 1
                    ? ' review today'
                    : ' reviews today'
                ) +
              '</span>' +
            '</div>' +

            list(
              (rv.latest || []).slice(0, 4),
              function (r) {
                var stars =
                  r.stars ||
                  Array(
                    Math.max(
                      1,
                      Math.min(
                        5,
                        Math.round(
                          Number(r.rating || 0)
                        )
                      )
                    ) + 1
                  ).join('★');

                return (
                  '<span ' +
                    'style="' +
                      'color:#d4a017;' +
                      'font-size:22px;' +
                      'font-weight:700;' +
                      'line-height:1;' +
                      'letter-spacing:2px;' +
                      'white-space:nowrap' +
                    '">' +
                    esc(stars) +
                  '</span>' +

                  '<b>' +
                    esc(r.time || '') +
                  '</b>'
                );
              }
            )
          )
        : empty(rv)
    );
    var tips=data.tips; put('tips',tips.available?'<dl class="pmd-dashboard2-stats"><div><dt>Today</dt><dd>'+esc(money(tips.today))+'</dd></div><div><dt>This month</dt><dd>'+esc(money(tips.month))+'</dd></div><div><dt>Average</dt><dd>'+esc(money(tips.average_tip))+'</dd></div><div><dt>Tipped orders</dt><dd>'+esc(tips.tipped_orders)+'</dd></div></dl>':empty(tips));
    /*
     * PMD_DASHBOARD2_TABLE_TITLE_RENDER_FIX_V62
     *
     * Normalize only duplicated visible table prefixes.
     * Example:
     * "Tische Tisch 2 + 10" becomes "Tische 2 + 10".
     */
    /*
     * PMD_DASHBOARD2_TABLE_PREFIX_FIX_V63
     *
     * Covers normal spaces, NBSP and other invisible whitespace.
     */
    function cleanReservationTableTitle(value) {
      var text = String(value || '')
        .replace(/[\u00A0\u2007\u202F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      text = text
        .replace(
          /^Tische? +Tische? +/iu,
          function (match) {
            return /^Tische /iu.test(match)
              ? 'Tische '
              : 'Tisch ';
          }
        )
        .replace(
          /^Tables? +Tables? +/iu,
          function (match) {
            return /^Tables /iu.test(match)
              ? 'Tables '
              : 'Table ';
          }
        );

      return text;
    }

    /*
     * PMD_DASHBOARD2_NATIVE_TODAY_CARDS_V6
     *
     * Native today count, real table labels and four rows.
     */
    var ev = data.calendar_events;

    put(
      'calendarEvents',
      ev.available
        ? (
            '<div class="pmd-dashboard2-review-score">' +
              '<b>' +
                esc(ev.count || 0) +
              '</b>' +
              '<span>' +
                (
                  Number(ev.count || 0) === 1
                    ? 'reservation today'
                    : 'reservations today'
                ) +
              '</span>' +
            '</div>' +

            list(
              (ev.events || []).slice(0, 4),
              function (r) {
                return (
                  '<span>' +
                    esc(
                      cleanReservationTableTitle(
                        r.title ||
                        (
                          (r.table_label || 'Kein Tisch') +
                          ' · ' +
                          (r.guests || 0) +
                          ' Gäste'
                        )
                      )
                    ) +
                  '</span>' +

                  '<b>' +
                    esc(r.time || '') +
                  '</b>'
                );
              }
            )
          )
        : empty(ev)
    );

    /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT
     * The fetch callback runs after this complete bundle has been evaluated,
     * so every authority below is already available. Apply the final state
     * synchronously and reveal exactly once.
     */
    if (salesCard) {
      salesCard.dataset.pmdSalesChartMode = salesChartMode;
    }

    window.PMDDashboard2ZoomDensityV1375?.refresh?.();

    if (salesChartMode === 'line') {
      window.PMDDashboard2RealLineV1384?.apply?.();
    }

    window.PMDDashboard2StablePillV1380?.apply?.();
    window.PMDDashboard2BarPillSmoothLineV1399?.refresh?.();
    window.PMDDashboard2SalesAxisV1393?.refresh?.();

    document.documentElement.classList.remove(
      'pmd-dashboard2-v1403-bar-boot'
    );

    if (salesBody) {
      salesBody.style.removeProperty('visibility');
      salesBody.style.removeProperty('opacity');
    }
  }
  /*
   * PMD_DASHBOARD2_V1398_NO_PILL_FLASH_PARTIAL_MODE_RENDER
   *
   * Chart-mode switching must not call the complete analytics render().
   * The complete renderer rebuilds salesByHour, Donuts and every widget body
   * and also creates temporary duplicate chart-key pills.
   */
  function renderSalesChartModeOnly() {
    var root = shell();

    if (!root || !data) {
      return false;
    }

    root
      .querySelectorAll(
        '[data-pmd-chart-mode]'
      )
      .forEach(function (button) {
        var active =
          button.dataset.pmdChartMode ===
          salesChartMode;

        button.classList.toggle(
          'is-active',
          active
        );

        button.setAttribute(
          'aria-pressed',
          active ? 'true' : 'false'
        );
      });

    var card =
      root.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"]'
      );

    var body =
      card &&
      card.querySelector(
        '[data-pmd-widget-body]'
      );

    var source =
      data.sales_over_time;

    if (!body || !source) {
      return false;
    }

    /*
     * PMD_DASHBOARD2_V1399_BAR_PILL_SMOOTH_LINE_PREPAINT
     *
     * ثبت Mode روی خود Card باعث می‌شود Pill موجود در Header
     * قبل از هر Render و بدون انتظار برای Authorityهای بعدی
     * در Line مخفی و در Bar قابل‌نمایش باشد.
     */
    card.dataset.pmdSalesChartMode =
      salesChartMode;

    /*
     * مرورگر نباید SVG خام Line را Paint کند.
     * Body در همین JavaScript task مخفی می‌شود، Line نرم ساخته
     * می‌شود و سپس دوباره نمایش داده می‌شود.
     */
    body.style.setProperty(
      'visibility',
      'hidden',
      'important'
    );

    body.style.setProperty(
      'opacity',
      '0',
      'important'
    );

    /*
     * Preserve the existing Slider DOM node and all of its listeners.
     * It must not disappear and be recreated during a mode switch.
     */
    var scrubber =
      body.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375'
      );

    var preservedVisible = Number(
      scrubber?.querySelector('input[type="range"]')?.value
    );

    if (!Number.isFinite(preservedVisible) || preservedVisible <= 0) {
      preservedVisible = 19;
    }

    if (scrubber) {
      scrubber.remove();
    }

    var html =
      source.available
        ? (
            salesChartMode === 'line'
              ? svgLine(source.buckets)
              : svgBars(
                  source.buckets,
                  'Sales over time bar chart',
                  preservedVisible
                )
          )
        : empty(source);

    /*
     * The canonical pill already exists in the Card Header.
     * Remove the newly generated Body pill before inserting any DOM.
     * Therefore no duplicate can be painted even for one browser frame.
     */
    var staging =
      document.createElement('div');

    staging.innerHTML = html;

    /*
     * PMD_DASHBOARD2_V1400_RESTORE_BAR_HEADER_PILL
     *
     * svgBars() یک Pill صحیح با مقادیر واقعی می‌سازد.
     * قبل از حذف آن از Body، همان Pill را به Header منتقل می‌کنیم.
     * در Line هیچ Pillی نباید در Header باقی بماند.
     */
    var header =
      card.querySelector(
        ':scope > header'
      );

    var generatedPill =
      staging.querySelector(
        '.pmd-dashboard2-chart-key'
      );

    var headerPills =
      header
        ? Array.from(
            header.querySelectorAll(
              '.pmd-dashboard2-chart-key'
            )
          )
        : [];

    if (
      salesChartMode === 'bar' &&
      header &&
      generatedPill
    ) {
      headerPills.forEach(
        function (pill) {
          pill.remove();
        }
      );

      var headerPill =
        generatedPill.cloneNode(true);

      headerPill.setAttribute(
        'data-pmd-v1400-bar-header-pill',
        'true'
      );

      header.appendChild(
        headerPill
      );
    } else if (
      salesChartMode === 'line'
    ) {
      headerPills.forEach(
        function (pill) {
          pill.remove();
        }
      );
    }

    staging
      .querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
      .forEach(function (pill) {
        pill.remove();
      });

    body.replaceChildren(
      ...Array.from(staging.childNodes)
    );

    if (scrubber) {
      body.appendChild(scrubber);
    }

    /*
     * در Line باید قبل از اولین Paint:
     * 1. Window واقعی Line اعمال شود.
     * 2. Polyline تیز مخفی شود.
     * 3. Path نرم ساخته شود.
     * 4. فقط Axis صحیح باقی بماند.
     */
    if (salesChartMode === 'line') {
      var lineInput =
        scrubber &&
        scrubber.querySelector(
          'input[type="range"]'
        );

      var lineVisible =
        lineInput
          ? Number(lineInput.value)
          : null;

      if (
        Number.isFinite(lineVisible) &&
        window.PMDDashboard2RealLineV1384 &&
        typeof window
          .PMDDashboard2RealLineV1384
          .setVisible === 'function'
      ) {
        window
          .PMDDashboard2RealLineV1384
          .setVisible(lineVisible);
      } else if (
        window.PMDDashboard2RealLineV1384 &&
        typeof window
          .PMDDashboard2RealLineV1384
          .apply === 'function'
      ) {
        window
          .PMDDashboard2RealLineV1384
          .apply();
      }

      window
        .PMDDashboard2SalesAxisV1393
        ?.refresh?.();
    } else {
      /*
       * در Bar نیز Axis Authority همان لحظه اعمال شود تا Native
       * Label یا Axis قدیمی برای یک Frame دیده نشود.
       */
      window
        .PMDDashboard2ZoomDensityV1375
        ?.refresh?.();

      window
        .PMDDashboard2SalesAxisV1393
        ?.refresh?.();
    }

    /*
     * تمام اصلاحات بالا synchronous هستند؛ نمایش Body در انتهای
     * همین task انجام می‌شود، بنابراین SVG خام Paint نمی‌شود.
     */
    body.style.removeProperty(
      'visibility'
    );

    body.style.removeProperty(
      'opacity'
    );

    return true;
  }

  /*
   * PMD_DASHBOARD2_V1416_EARLY_ANALYTICS
   *
   * Use the request that started at the beginning of the HTML.
   * Only create a normal request when no speculative request exists.
   */
  function load(value) {
    if (cache[value]) {
      data = cache[value];
      render();
      return Promise.resolve(data);
    }

    if (controller) {
      controller.abort();
    }

    controller = new AbortController();
    requestCount++;

    var earlyAuthority =
      window.PMDDashboard2EarlyPayloadV1416;

    var earlyRequest =
      earlyAuthority &&
      typeof earlyAuthority.take === 'function'
        ? earlyAuthority.take(value)
        : null;

    var request =
      earlyRequest ||
      fetch(
        '/admin/dashboard2' +
        '?pmd_analytics=1' +
        '&period=' +
        encodeURIComponent(value),
        {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            Accept: 'application/json'
          },
          signal: controller.signal
        }
      ).then(function (response) {
        if (!response.ok) {
          throw new Error(
            'HTTP ' + response.status
          );
        }

        return response.json();
      });

    return request
      .then(function (result) {
        if (
          !result ||
          result.success !== true
        ) {
          throw new Error(
            'Invalid analytics payload'
          );
        }

        cache[value] = result;
        data = result;

        render();

        return result;
      })
      .catch(function (error) {
        if (
          error.name !== 'AbortError'
        ) {
          console.warn(
            '[PMD Analytics V1]',
            error
          );
        }
      });
  }
  function currentView(){var page=document.getElementById('pmd-reservations2');return page&&page.classList.contains('pmd-r2-hour-layout-v38-active')?'hour':(page&&page.classList.contains('is-calendar-mode')?'calendar':'floor');}
  function setupOneRow(){var floor=document.getElementById('pmd-r2-shared-floor-canvas-v310'),scroll=floor&&floor.querySelector('[data-floor-scroll]');if(!floor||!scroll)return null;var originalX={value:scroll.style.getPropertyValue('overflow-x'),priority:scroll.style.getPropertyPriority('overflow-x')},originalY={value:scroll.style.getPropertyValue('overflow-y'),priority:scroll.style.getPropertyPriority('overflow-y')};
    function sync(){var active=floor.classList.contains('is-strip-mode');scroll.classList.toggle('pmd-dashboard2-one-row-scroll-v1',active);if(active){/* Existing Reservations2 rules use !important; exact inline priority is required only while One Row is active. */scroll.style.setProperty('overflow-x','auto','important');scroll.style.setProperty('overflow-y','hidden','important');scroll.scrollTop=0;}else{if(originalX.value)scroll.style.setProperty('overflow-x',originalX.value,originalX.priority);else scroll.style.removeProperty('overflow-x');if(originalY.value)scroll.style.setProperty('overflow-y',originalY.value,originalY.priority);else scroll.style.removeProperty('overflow-y');}}
    function wheel(e){if(!floor.classList.contains('is-strip-mode')||scroll.scrollWidth<=scroll.clientWidth||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;var next=scroll.scrollLeft+e.deltaY,max=scroll.scrollWidth-scroll.clientWidth;if((e.deltaY<0&&scroll.scrollLeft<=0)||(e.deltaY>0&&scroll.scrollLeft>=max))return;scroll.scrollLeft=Math.max(0,Math.min(max,next));e.preventDefault();}
    scroll.addEventListener('wheel',wheel,{passive:false});document.addEventListener('click',function(e){if(e.target.closest('[data-floor-strip],[data-proxy-action="one-row"]'))requestAnimationFrame(sync);},true);window.addEventListener('pmd:floor:updated',sync);sync();return {floor:floor,scroll:scroll,sync:sync};}
  var oneRow=null;
  function audit(){var root=document.getElementById(ROOT_ID),keys=window.PMDDashboard2KPIDataFinal&&window.PMDDashboard2KPIDataFinal.audit?window.PMDDashboard2KPIDataFinal.audit():{},widgets={};widgetKeys.forEach(function(k){widgets[k]=Boolean(root&&root.querySelector('[data-pmd-analytics-widget="'+k+'"]'));});var unavailable=[],emptyWidgets=[];if(data)Object.keys(data).forEach(function(k){if(data[k]&&data[k].available===false)unavailable.push(k);if(data[k]&&data[k].available===true&&data[k].empty===true)emptyWidgets.push(k);});var active=Boolean(oneRow&&oneRow.floor.classList.contains('is-strip-mode')),style=oneRow?getComputedStyle(oneRow.scroll):null;return {version:VERSION,route:String(location.pathname).replace(/\/+$/,''),kpis:{totalDefinitions:8,visibleCards:document.querySelectorAll('[data-pmd-dashboard2-kpi]').length,selectedKeys:keys.selectedKeys||[],duplicates:new Set(keys.selectedKeys||[]).size!==(keys.selectedKeys||[]).length,endpointRequestCount:keys.requestCount||0},operationalView:{current:currentView(),floorExists:Boolean(document.getElementById('pmd-r2-shared-floor-canvas-v310')),toolbarExists:Boolean(document.getElementById('pmd-dashboard2-floor-toolbar-proxy-v350')),toolbarButtons:(document.getElementById('pmd-dashboard2-floor-toolbar-proxy-v350')||document).querySelectorAll('[data-proxy-action]').length,reservationCardsPresent:Boolean(document.getElementById('pmd-r2-reservation-cards-v320'))},analytics:{rootCount:document.querySelectorAll('#'+ROOT_ID).length,visible:Boolean(root&&getComputedStyle(root).display!=='none'),currentPeriod:period(),chartMode:salesChartMode,chartLabelsPresent:Boolean(root&&root.querySelector('.pmd-dashboard2-chart-axis-label')),requestCount:requestCount,widgets:widgets,unavailableSources:unavailable,chartCount:root?root.querySelectorAll('svg.pmd-dashboard2-chart,.pmd-dashboard2-donut svg').length:0,availableWidgetCount:data?widgetKeys.filter(function(k){var map={salesOverTime:'sales_over_time',salesByHour:'sales_by_hour',topItems:'top_items',categorySales:'sales_by_category',paymentMethods:'payment_methods',channelSplit:'channels',liveOperations:'live_operations',recentTransactions:'recent_transactions',alerts:'alerts',reviews:'reviews',tips:'tips',calendarEvents:'calendar_events'};return data[map[k]]&&data[map[k]].available===true;}).length:0,emptyWidgetCount:emptyWidgets.length,emptyWidgets:emptyWidgets,unavailableWidgetCount:unavailable.length,sourceModes:data?Object.keys(data).reduce(function(out,k){if(data[k]&&data[k].source_mode)out[k]=data[k].source_mode;return out;},{}):{},outerFrame:(function(){var st=root?getComputedStyle(root):null;return {transparent:Boolean(st&&(st.backgroundColor==='rgba(0, 0, 0, 0)'||st.backgroundColor==='transparent')),borderless:Boolean(st&&parseFloat(st.borderTopWidth)===0),shadowless:Boolean(st&&st.boxShadow==='none')};})()},oneRow:{active:active,overflowX:style?style.overflowX:null,overflowY:style?style.overflowY:null,verticalScrollbar:Boolean(oneRow&&style&&style.overflowY!=='hidden'&&oneRow.scroll.scrollHeight>oneRow.scroll.clientHeight),horizontalOverflow:Boolean(oneRow&&oneRow.scroll.scrollWidth>oneRow.scroll.clientWidth),wheelListeners:active?1:0},protected:{pushNotificationScriptPresent:Boolean(document.querySelector('script[src*="push-notifications.js"]')),notificationPollingActive:Boolean(document.querySelector('script[src*="push-notifications.js"]') && (window.pushNotif && window.pushNotif.pollInterval)),composerPresent:Boolean(document.querySelector('[data-reservation-composer],#pmd-reservation-composer-v1'))}};}
  function boot(){var root=shell();if(!root)return;root.addEventListener('click',function(e){var chartButton=e.target.closest('[data-pmd-chart-mode]');if(chartButton){salesChartMode=chartButton.dataset.pmdChartMode;try{localStorage.setItem(CHART_MODE_KEY,salesChartMode);}catch(x){}renderSalesChartModeOnly();return;}return;});oneRow=setupOneRow();window.PMDDashboard2FinalWorkspace={
  version:VERSION,
  audit:audit,

  refresh:function(){
    return load(period());
  },

  setChartMode:function(mode){
    if(mode!=='line'&&mode!=='bar')return false;

    salesChartMode=mode;

    try{
      localStorage.setItem(
        CHART_MODE_KEY,
        salesChartMode
      );
    }catch(error){}

    renderSalesChartModeOnly();

    return true;
  },

  getChartMode:function(){
    return salesChartMode;
  }
}; 

  /*
   * PMD_DASHBOARD2_V1415_SINGLE_HYDRATION
   *
   * Main workspace and the three independently selected donut
   * periods load in parallel. Nothing is revealed piecemeal.
   */
  var hydrationTasks = [
    load(period())
  ];

  var donutApi =
    window.PMDDashboard2DonutPeriodsV1395;

  if (
    donutApi &&
    typeof donutApi.refresh === 'function'
  ) {
    hydrationTasks.push(
      donutApi.refresh(
        null,
        false
      )
    );
  }

  var hydrationReady =
    Promise
      .allSettled(hydrationTasks)
      .then(function (results) {
        /*
         * Main render has created the SVGs.
         * Apply final authorities synchronously before revealing bodies.
         */
        window
          .PMDDashboard2ZoomDensityV1375
          ?.refresh?.();

        window
          .PMDDashboard2StablePillV1380
          ?.apply?.();

        window
          .PMDDashboard2BarPillSmoothLineV1399
          ?.refresh?.();

        window
          .PMDDashboard2SalesAxisV1393
          ?.refresh?.();

        window
          .PMDDashboard2PaymentCompactV1389
          ?.apply?.();

        window
          .PMDDashboard2PaymentContentV1390
          ?.apply?.();

        window
          .PMDDashboard2FirstRowV1391
          ?.apply?.();

        root.classList.remove(
          'pmd-dashboard2-v1415-hydrating'
        );

        root.classList.add(
          'pmd-dashboard2-v1415-ready'
        );

        root.setAttribute(
          'aria-busy',
          'false'
        );

        root.dataset
          .pmdInitialHydration =
          'complete';

        document.documentElement
          .classList.add(
            'pmd-dashboard2-v1415-analytics-ready'
          );

        var result = {
          version: '1.4.1.5',
          settledTasks: results.length,
          rejectedTasks:
            results.filter(function (item) {
              return item.status === 'rejected';
            }).length,
          cards:
            root.querySelectorAll(
              '[data-pmd-analytics-widget]'
            ).length,
          bodies:
            root.querySelectorAll(
              '[data-pmd-widget-body]'
            ).length,
          charts:
            root.querySelectorAll(
              'svg.pmd-dashboard2-chart, ' +
              '.pmd-dashboard2-donut svg'
            ).length,
          ready: true
        };

        console.info(
          '[PMD Dashboard2 V1.4.1.5] ' +
          'Single hydration complete',
          result
        );

        return result;
      });

  window.PMDDashboard2HydrationV1415 = {
    version: '1.4.1.5',

    ready: hydrationReady,

    audit: function () {
      var currentRoot =
        document.getElementById(
          'pmd-dashboard2-analytics-v1'
        );

      return {
        version: '1.4.1.5',

        rootFound:
          Boolean(currentRoot),

        serverShell:
          Boolean(
            currentRoot &&
            currentRoot.querySelector(
              '[data-pmd-analytics-grid]'
            )
          ),

        hydrating:
          Boolean(
            currentRoot &&
            currentRoot.classList.contains(
              'pmd-dashboard2-v1415-hydrating'
            )
          ),

        ready:
          Boolean(
            currentRoot &&
            currentRoot.classList.contains(
              'pmd-dashboard2-v1415-ready'
            )
          ),

        ariaBusy:
          currentRoot
            ?.getAttribute('aria-busy') ??
            null,

        cards:
          currentRoot
            ?.querySelectorAll(
              '[data-pmd-analytics-widget]'
            ).length ?? 0,

        firstRowHeights:
          [
            'salesOverTime',
            'categorySales',
            'salesByHour',
            'paymentMethods'
          ].map(function (key) {
            var card =
              document.querySelector(
                '[data-pmd-analytics-widget="' +
                key +
                '"]'
              );

            return {
              key: key,
              height:
                card
                  ?.getBoundingClientRect()
                  .height ?? null
            };
          })
      };
    }
  };

  window
    .PMDDashboard2FinalWorkspace
    .ready =
      hydrationReady;
}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
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
     * PMD_DASHBOARD2_V1414_SCOPED_LATE_RENDER_FIX
     *
     * Build the proxy synchronously. cleanClone() already creates safe
     * fallback controls when the native buttons are not ready yet, and
     * click handling resolves the current native control at click time.
     */
    buildToolbar();

    console.info(
      '[PMD Dashboard2 Toolbar + Performance V3.6.0] Ready',
      audit()
    );

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

/* Reflow V4 removed by Dashboard2 V1.3.0 */

/* Layout V6 removed by Dashboard2 V1.3.0 */

/* Equal Rows V9 removed by Dashboard2 V1.3.0 */

/* PMD Dashboard2 One Row Parent Height V11 */
(function () {
  'use strict';

  if (window.PMDDashboard2OneRowParentV11) {
    return;
  }

  var VERSION = '11.4.0';
  var applyCount = 0;
  var compactCount = 0;
  var resetCount = 0;
  var clickCount = 0;
  var lastHeight = null;
  var resizeFrame = 0;

  function getElements() {
    var reservations =
      document.getElementById('pmd-reservations2');

    var analytics =
      document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

    var floor =
      document.getElementById(
        'pmd-r2-shared-floor-canvas-v310'
      ) ||
      reservations?.querySelector(
        '.pmd-floor-v1'
      );

    return {
      reservations: reservations,
      analytics: analytics,
      floor: floor
    };
  }

  function floorIsVisible(floor) {
    if (!floor) {
      return false;
    }

    var style = window.getComputedStyle(floor);
    var rect = floor.getBoundingClientRect();

    return Boolean(
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function isOneRow(floor) {
    return Boolean(
      floorIsVisible(floor) &&
      (
        floor.classList.contains('is-strip-mode') ||
        floor.classList.contains('is-strip-calibrated')
      )
    );
  }

  function clearCompact(reservations) {
    if (!reservations) {
      return false;
    }

    reservations.classList.remove(
      'pmd-dashboard2-one-row-parent-v11'
    );

    reservations.style.removeProperty(
      '--pmd-one-row-parent-height'
    );

    reservations.style.removeProperty('height');
    reservations.style.removeProperty('min-height');
    reservations.style.removeProperty('max-height');

    document.documentElement.classList.remove(
      'pmd-dashboard2-one-row-active-v11'
    );

    lastHeight = null;
    resetCount += 1;

    return true;
  }

  function apply() {
    var elements = getElements();
    var reservations = elements.reservations;
    var analytics = elements.analytics;
    var floor = elements.floor;

    applyCount += 1;

    if (
      !reservations ||
      !analytics ||
      !floor
    ) {
      return false;
    }

    if (!isOneRow(floor)) {
      clearCompact(reservations);
      return true;
    }

    /*
     * Important:
     * Only #pmd-reservations2 gets resized.
     * Canvas, stage, wrapper and tables remain untouched.
     */
    var parentRect =
      reservations.getBoundingClientRect();

    var floorRect =
      floor.getBoundingClientRect();

    var floorBottomInsideParent =
      floorRect.bottom - parentRect.top;

    /*
     * 20px keeps the same small visual gap before Analytics.
     * No forced width, overflow or Canvas height is applied.
     */
    var targetHeight = Math.ceil(
      floorBottomInsideParent + 20
    );

    targetHeight = Math.max(
      320,
      targetHeight
    );

    reservations.style.setProperty(
      '--pmd-one-row-parent-height',
      targetHeight + 'px'
    );

    /*
     * Canonical Dashboard scripts enforce height:auto and a 667px
     * minimum after One Row is activated. Apply the final geometry
     * directly with inline !important so those legacy rules cannot
     * hold the empty area open.
     */
    reservations.style.setProperty(
      'height',
      targetHeight + 'px',
      'important'
    );

    reservations.style.setProperty(
      'min-height',
      targetHeight + 'px',
      'important'
    );

    reservations.style.setProperty(
      'max-height',
      targetHeight + 'px',
      'important'
    );

    reservations.classList.add(
      'pmd-dashboard2-one-row-parent-v11'
    );

    document.documentElement.classList.add(
      'pmd-dashboard2-one-row-active-v11'
    );

    lastHeight = targetHeight;
    compactCount += 1;

    return true;
  }

  function schedule() {
    window.requestAnimationFrame(apply);

    window.setTimeout(apply, 100);
    window.setTimeout(apply, 260);
    window.setTimeout(apply, 550);

    /*
     * The canonical One Row restoration runs after its own delayed
     * mode-change work. These one-time checks run after that process;
     * they are not recurring timers.
     */
    window.setTimeout(apply, 900);
    window.setTimeout(apply, 1500);
  }

  function isRelevantControl(target) {
    if (!target?.closest) {
      return false;
    }

    var control = target.closest(
      'button, a, [role="button"]'
    );

    if (!control) {
      return false;
    }

    var text = String(
      control.textContent || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return (
      text === 'one row' ||
      text === 'floor' ||
      text === 'calendar' ||
      text === 'hour' ||
      text.indexOf('one row') !== -1 ||
      text.indexOf('eine reihe') !== -1 ||
      text.indexOf('calendar') !== -1 ||
      text.indexOf('kalender') !== -1 ||
      text.indexOf('hour') !== -1 ||
      text.indexOf('stunde') !== -1 ||
      text.indexOf('timeline') !== -1 ||
      control.id === 'pmd-r2-calendar-toggle-v1' ||
      control.classList.contains(
        'pmd-r2-timeslot-screen__back'
      ) ||
      control.hasAttribute('data-pmd-one-row') ||
      control.hasAttribute('data-one-row')
    );
  }

  document.addEventListener(
    'click',
    function (event) {
      if (!isRelevantControl(event.target)) {
        return;
      }

      clickCount += 1;
      schedule();
    },
    true
  );

  window.addEventListener(
    'resize',
    function () {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame =
        window.requestAnimationFrame(function () {
          resizeFrame = 0;
          apply();
        });
    },
    { passive: true }
  );

  window.PMDDashboard2OneRowParentV11 = {
    version: VERSION,

    apply: apply,

    refresh: schedule,

    reset: function () {
      return clearCompact(
        getElements().reservations
      );
    },

    audit: function () {
      var elements = getElements();

      var reservationsRect =
        elements.reservations
          ?.getBoundingClientRect();

      var floorRect =
        elements.floor
          ?.getBoundingClientRect();

      var analyticsRect =
        elements.analytics
          ?.getBoundingClientRect();

      return {
        version: VERSION,

        reservationsFound:
          Boolean(elements.reservations),

        floorFound:
          Boolean(elements.floor),

        analyticsFound:
          Boolean(elements.analytics),

        floorClasses:
          elements.floor
            ? Array.from(elements.floor.classList)
            : [],

        floorVisible:
          floorIsVisible(elements.floor),

        oneRowDetected:
          isOneRow(elements.floor),

        reservationsHeight:
          reservationsRect
            ? Math.round(reservationsRect.height)
            : null,

        floorHeight:
          floorRect
            ? Math.round(floorRect.height)
            : null,

        floorBottom:
          floorRect
            ? Math.round(floorRect.bottom)
            : null,

        analyticsTop:
          analyticsRect
            ? Math.round(analyticsRect.top)
            : null,

        visualGap:
          floorRect && analyticsRect
            ? Math.round(
                analyticsRect.top -
                floorRect.bottom
              )
            : null,

        appliedHeight:
          lastHeight,

        inlineHeight:
          elements.reservations
            ?.style.getPropertyValue('height') || '',

        inlineHeightPriority:
          elements.reservations
            ?.style.getPropertyPriority('height') || '',

        inlineMinHeight:
          elements.reservations
            ?.style.getPropertyValue('min-height') || '',

        inlineMinHeightPriority:
          elements.reservations
            ?.style.getPropertyPriority('min-height') || '',

        inlineMaxHeight:
          elements.reservations
            ?.style.getPropertyValue('max-height') || '',

        inlineMaxHeightPriority:
          elements.reservations
            ?.style.getPropertyPriority('max-height') || '',

        applyCount: applyCount,
        compactCount: compactCount,
        resetCount: resetCount,
        clickCount: clickCount,

        canvasInlineHeight:
          document.querySelector(
            '.pmd-floor-v1__canvas'
          )?.style.height || '',

        stageInlineHeight:
          document.querySelector(
            '.pmd-floor-v1__stage'
          )?.style.height || '',

        recurringTimer: false,
        permanentObserver: false
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      schedule,
      { once: true }
    );
  } else {
    schedule();
  }

  window.addEventListener(
    'load',
    schedule,
    { once: true }
  );
})();

/* PMD Dashboard2 One Row FLIP V11.3 */
(function () {
  'use strict';

  if (window.PMDDashboard2OneRowFlipV113) {
    return;
  }

  var state = {
    version: '11.3.0',
    bound: false,
    clickCount: 0,
    animationCount: 0,
    cancelCount: 0,
    lastDelta: 0,
    lastDuration: 0,
    active: false
  };

  var rootSelector = '#pmd-reservations2';
  var analyticsSelector = '#pmd-dashboard2-analytics-v1';
  var floorSelector = '#pmd-r2-shared-floor-canvas-v310';

  function isOneRowControl(element) {
    if (!element || !element.closest) {
      return false;
    }

    var control = element.closest(
      'button, [role="button"], a'
    );

    if (!control) {
      return false;
    }

    var text = String(
      control.textContent || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    var aria = String(
      control.getAttribute('aria-label') || ''
    )
      .trim()
      .toLowerCase();

    var title = String(
      control.getAttribute('title') || ''
    )
      .trim()
      .toLowerCase();

    return (
      text === 'one row' ||
      text.indexOf('one row') !== -1 ||
      aria.indexOf('one row') !== -1 ||
      title.indexOf('one row') !== -1
    );
  }

  function cancelCurrentAnimation(analytics) {
    if (!analytics) {
      return;
    }

    if (analytics.__pmdFlipFinish) {
      analytics.__pmdFlipFinish(true);
      state.cancelCount += 1;
    }
  }

  function animateAnalyticsFrom(firstTop) {
    var analytics = document.querySelector(
      analyticsSelector
    );

    var reservations = document.querySelector(
      rootSelector
    );

    var floor = document.querySelector(
      floorSelector
    );

    if (!analytics || !reservations || !floor) {
      return false;
    }

    cancelCurrentAnimation(analytics);

    /*
     * Wait for the canonical One Row controller and V11.1 height
     * authority to finish their synchronous writes.
     */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var lastTop =
          analytics.getBoundingClientRect().top;

        var delta = firstTop - lastTop;

        state.lastDelta = Math.round(delta);

        if (!Number.isFinite(delta) ||
            Math.abs(delta) < 2) {
          state.active = false;
          return;
        }

        var distance = Math.abs(delta);

        var duration = Math.max(
          420,
          Math.min(680, 390 + distance * 0.32)
        );

        state.lastDuration = Math.round(duration);
        state.animationCount += 1;
        state.active = true;

        analytics.style.setProperty(
          'transition',
          'none',
          'important'
        );

        analytics.style.setProperty(
          'transform',
          'translate3d(0,' + delta + 'px,0)',
          'important'
        );

        analytics.style.setProperty(
          'will-change',
          'transform',
          'important'
        );

        /*
         * Force the inverted frame to be painted before playing.
         */
        void analytics.offsetHeight;

        requestAnimationFrame(function () {
          analytics.style.setProperty(
            'transition',
            'transform ' + duration +
              'ms cubic-bezier(0.16, 1, 0.3, 1)',
            'important'
          );

          analytics.style.setProperty(
            'transform',
            'translate3d(0,0,0)',
            'important'
          );
        });

        var finished = false;

        function finish(cancelled) {
          if (finished) {
            return;
          }

          finished = true;
          state.active = false;

          analytics.removeEventListener(
            'transitionend',
            onTransitionEnd
          );

          window.clearTimeout(fallback);

          analytics.style.removeProperty(
            'transition'
          );

          analytics.style.removeProperty(
            'transform'
          );

          analytics.style.removeProperty(
            'will-change'
          );

          delete analytics.__pmdFlipFinish;

          if (cancelled) {
            state.cancelCount += 1;
          }
        }

        function onTransitionEnd(event) {
          if (
            event.target === analytics &&
            event.propertyName === 'transform'
          ) {
            finish(false);
          }
        }

        analytics.__pmdFlipFinish = finish;

        analytics.addEventListener(
          'transitionend',
          onTransitionEnd
        );

        var fallback = window.setTimeout(
          function () {
            finish(false);
          },
          duration + 120
        );
      });
    });

    return true;
  }

  function onPointerDown(event) {
    if (!isOneRowControl(event.target)) {
      return;
    }

    var analytics = document.querySelector(
      analyticsSelector
    );

    if (!analytics) {
      return;
    }

    state.clickCount += 1;

    var firstTop =
      analytics.getBoundingClientRect().top;

    /*
     * The real One Row handler runs normally. We only animate the
     * resulting document-flow movement afterward.
     */
    window.setTimeout(function () {
      animateAnalyticsFrom(firstTop);
    }, 0);
  }

  function bind() {
    if (state.bound) {
      return;
    }

    document.addEventListener(
      'pointerdown',
      onPointerDown,
      true
    );

    state.bound = true;
  }

  function audit() {
    var analytics = document.querySelector(
      analyticsSelector
    );

    var reservations = document.querySelector(
      rootSelector
    );

    var floor = document.querySelector(
      floorSelector
    );

    return {
      version: state.version,
      bound: state.bound,
      clickCount: state.clickCount,
      animationCount: state.animationCount,
      cancelCount: state.cancelCount,
      lastDelta: state.lastDelta,
      lastDuration: state.lastDuration,
      active: state.active,
      analyticsFound: Boolean(analytics),
      reservationsFound: Boolean(reservations),
      floorFound: Boolean(floor),
      recurringInterval: false,
      mutationObserver: false
    };
  }

  bind();

  window.PMDDashboard2OneRowFlipV113 = {
    version: state.version,
    bind: bind,
    audit: audit
  };
})();

/* PMD Dashboard2 View Height Isolation V11.4 */
(function () {
  'use strict';

  if (window.PMDDashboard2ViewHeightIsolationV114) {
    return;
  }

  var VERSION = '11.4.0';

  var state = {
    syncCount: 0,
    releaseCount: 0,
    floorRestoreCount: 0,
    clickCount: 0,
    lastView: 'unknown'
  };

  function visible(element) {
    if (!element) {
      return false;
    }

    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();

    return Boolean(
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function elements() {
    return {
      reservations:
        document.getElementById(
          'pmd-reservations2'
        ),

      floor:
        document.getElementById(
          'pmd-r2-shared-floor-canvas-v310'
        ),

      calendar:
        document.getElementById(
          'pmd-r2-calendar-surface-v160'
        ),

      analytics:
        document.getElementById(
          'pmd-dashboard2-analytics-v1'
        )
    };
  }

  function currentView(items) {
    if (
      items.calendar &&
      visible(items.calendar) &&
      items.calendar.classList.contains(
        'is-timeslot-screen'
      )
    ) {
      return 'hour';
    }

    if (
      items.calendar &&
      visible(items.calendar) &&
      items.calendar.classList.contains(
        'is-visible'
      )
    ) {
      return 'calendar';
    }

    if (items.floor && visible(items.floor)) {
      return 'floor';
    }

    return 'unknown';
  }

  function releaseCompactHeight(reservations) {
    if (!reservations) {
      return false;
    }

    reservations.classList.remove(
      'pmd-dashboard2-one-row-parent-v11'
    );

    reservations.style.removeProperty(
      '--pmd-one-row-parent-height'
    );

    reservations.style.removeProperty('height');
    reservations.style.removeProperty('min-height');
    reservations.style.removeProperty('max-height');

    document.documentElement.classList.remove(
      'pmd-dashboard2-one-row-active-v11'
    );

    state.releaseCount += 1;

    return true;
  }

  function sync() {
    var items = elements();
    var view = currentView(items);

    state.syncCount += 1;
    state.lastView = view;

    if (
      view === 'calendar' ||
      view === 'hour'
    ) {
      releaseCompactHeight(items.reservations);

      return true;
    }

    if (
      view === 'floor' &&
      window.PMDDashboard2OneRowParentV11
    ) {
      window.PMDDashboard2OneRowParentV11.apply();

      state.floorRestoreCount += 1;

      return true;
    }

    return false;
  }

  function schedule() {
    /*
     * First frame handles immediately available view state.
     * The one-time delayed checks cover the existing Calendar/Hour
     * render authorities without creating any recurring work.
     */
    window.requestAnimationFrame(sync);
    window.setTimeout(sync, 80);
    window.setTimeout(sync, 240);
    window.setTimeout(sync, 520);
    window.setTimeout(sync, 950);
  }

  function relevantControl(target) {
    if (!target || !target.closest) {
      return false;
    }

    var control = target.closest(
      'button, a, [role="button"]'
    );

    if (!control) {
      return false;
    }

    var text = String(
      control.textContent || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return Boolean(
      text.indexOf('floor') !== -1 ||
      text.indexOf('calendar') !== -1 ||
      text.indexOf('kalender') !== -1 ||
      text.indexOf('hour') !== -1 ||
      text.indexOf('stunde') !== -1 ||
      text.indexOf('timeline') !== -1 ||
      text.indexOf('one row') !== -1 ||
      control.id === 'pmd-r2-calendar-toggle-v1' ||
      control.classList.contains(
        'pmd-r2-timeslot-screen__back'
      )
    );
  }

  document.addEventListener(
    'click',
    function (event) {
      if (!relevantControl(event.target)) {
        return;
      }

      state.clickCount += 1;
      schedule();
    },
    true
  );

  window.PMDDashboard2ViewHeightIsolationV114 = {
    version: VERSION,

    sync: sync,

    refresh: schedule,

    audit: function () {
      var items = elements();
      var reservationsRect =
        items.reservations
          ? items.reservations.getBoundingClientRect()
          : null;

      var calendarRect =
        items.calendar
          ? items.calendar.getBoundingClientRect()
          : null;

      var analyticsRect =
        items.analytics
          ? items.analytics.getBoundingClientRect()
          : null;

      return {
        version: VERSION,
        currentView: currentView(items),
        floorVisible: visible(items.floor),
        calendarVisible: visible(items.calendar),

        reservationsHeight:
          reservationsRect
            ? Math.round(reservationsRect.height)
            : null,

        calendarHeight:
          calendarRect
            ? Math.round(calendarRect.height)
            : null,

        analyticsTop:
          analyticsRect
            ? Math.round(analyticsRect.top)
            : null,

        inlineHeight:
          items.reservations
            ?.style.getPropertyValue('height') || '',

        inlineHeightPriority:
          items.reservations
            ?.style.getPropertyPriority('height') || '',

        inlineMinHeight:
          items.reservations
            ?.style.getPropertyValue('min-height') || '',

        inlineMaxHeight:
          items.reservations
            ?.style.getPropertyValue('max-height') || '',

        compactClass:
          Boolean(
            items.reservations?.classList.contains(
              'pmd-dashboard2-one-row-parent-v11'
            )
          ),

        syncCount: state.syncCount,
        releaseCount: state.releaseCount,
        floorRestoreCount: state.floorRestoreCount,
        clickCount: state.clickCount,
        lastView: state.lastView,

        recurringInterval: false,
        mutationObserver: false
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      schedule,
      { once: true }
    );
  } else {
    schedule();
  }

  window.addEventListener(
    'load',
    schedule,
    { once: true }
  );
})();

/* PMD Dashboard2 Chart Toggle Bridge V11.5 */
(function () {
  'use strict';

  if (window.PMDDashboard2ChartToggleV115) {
    return;
  }

  var VERSION = '11.5.0';

  var state = {
    bound: false,
    clickCount: 0,
    applyCount: 0,
    failureCount: 0,
    lastRequestedMode: null,
    lastAppliedMode: null,
    lastError: null
  };

  var rootSelector =
    '#pmd-dashboard2-analytics-v1';

  var buttonSelector =
    rootSelector +
    ' [data-pmd-chart-mode]';

  function normalizeMode(value) {
    var mode = String(value || '')
      .trim()
      .toLowerCase();

    if (mode === 'line' || mode === 'bar') {
      return mode;
    }

    return null;
  }

  function getRoot() {
    return document.querySelector(
      rootSelector
    );
  }

  function getButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        buttonSelector
      )
    );
  }

  function updateButtonState(mode) {
    getButtons().forEach(function (button) {
      var buttonMode = normalizeMode(
        button.getAttribute(
          'data-pmd-chart-mode'
        )
      );

      var active = buttonMode === mode;

      button.classList.toggle(
        'is-active',
        active
      );

      button.classList.toggle(
        'active',
        active
      );

      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      );
    });
  }

  function callLayoutAuthority(mode) {
    var authority =
      window.PMDDashboard2AnalyticsLayoutV6;

    if (
      !authority ||
      typeof authority.setChartMode !== 'function'
    ) {
      throw new Error(
        'PMDDashboard2AnalyticsLayoutV6.setChartMode is unavailable.'
      );
    }

    authority.setChartMode(mode);

    return true;
  }

  function applyMode(mode) {
    mode = normalizeMode(mode);

    if (!mode) {
      return false;
    }

    state.lastRequestedMode = mode;
    state.lastError = null;

    var root = getRoot();

    try {
      callLayoutAuthority(mode);

      /*
       * Keep the DOM state synchronized for auditing and any
       * downstream Dashboard2 code.
       */
      if (root) {
        root.setAttribute(
          'data-chart-mode',
          mode
        );
      }

      updateButtonState(mode);

      state.applyCount += 1;
      state.lastAppliedMode = mode;

      /*
       * Equal-row layout does not own the chart mode, but reapplying
       * it after redraw keeps final card geometry stable.
       */
      window.requestAnimationFrame(function () {
        if (
          window.PMDDashboard2EqualRowsV9 &&
          typeof window
            .PMDDashboard2EqualRowsV9
            .apply === 'function'
        ) {
          window
            .PMDDashboard2EqualRowsV9
            .apply();
        }
      });

      return true;
    } catch (error) {
      state.failureCount += 1;
      state.lastError =
        error && error.message
          ? error.message
          : String(error);

      console.error(
        '[PMD Chart Toggle V11.5]',
        state.lastError
      );

      return false;
    }
  }

  function buttonFromEvent(event) {
    if (!event.target?.closest) {
      return null;
    }

    var button = event.target.closest(
      buttonSelector
    );

    if (!button) {
      return null;
    }

    return button;
  }

  function onClick(event) {
    var button = buttonFromEvent(event);

    if (!button) {
      return;
    }

    var mode = normalizeMode(
      button.getAttribute(
        'data-pmd-chart-mode'
      )
    );

    if (!mode) {
      return;
    }

    state.clickCount += 1;

    /*
     * Do not stop propagation here.
     *
     * The canonical analytics listener attached to the Analytics root
     * owns the live chart renderer. It updates the closure-scoped
     * salesChartMode value and immediately calls render().
     *
     * Earlier V11.5 code stopped this click before it reached that
     * listener, so only Local Storage changed and the SVG updated only
     * after a full page refresh.
     */
    state.lastRequestedMode = mode;

    return;
  }

  function bind() {
    if (state.bound) {
      return true;
    }

    document.addEventListener(
      'click',
      onClick,
      true
    );

    state.bound = true;

    return true;
  }

  function currentMode() {
    var root = getRoot();

    var rootMode = normalizeMode(
      root?.getAttribute(
        'data-chart-mode'
      )
    );

    if (rootMode) {
      return rootMode;
    }

    var activeButton = getButtons().find(
      function (button) {
        return (
          button.classList.contains(
            'is-active'
          ) ||
          button.classList.contains(
            'active'
          ) ||
          button.getAttribute(
            'aria-pressed'
          ) === 'true'
        );
      }
    );

    return normalizeMode(
      activeButton?.getAttribute(
        'data-pmd-chart-mode'
      )
    );
  }

  bind();

  window.PMDDashboard2ChartToggleV115 = {
    version: VERSION,

    applyMode: applyMode,

    setLine: function () {
      return applyMode('line');
    },

    setBar: function () {
      return applyMode('bar');
    },

    audit: function () {
      var authority =
        window.PMDDashboard2AnalyticsLayoutV6;

      return {
        version: VERSION,
        bound: state.bound,

        rootFound:
          Boolean(getRoot()),

        buttonCount:
          getButtons().length,

        buttons:
          getButtons().map(function (button) {
            return {
              text: String(
                button.textContent || ''
              )
                .replace(/\s+/g, ' ')
                .trim(),

              mode:
                normalizeMode(
                  button.getAttribute(
                    'data-pmd-chart-mode'
                  )
                ),

              active:
                button.classList.contains(
                  'is-active'
                ) ||
                button.classList.contains(
                  'active'
                ),

              ariaPressed:
                button.getAttribute(
                  'aria-pressed'
                )
            };
          }),

        authorityFound:
          Boolean(authority),

        setChartModeFound:
          Boolean(
            authority &&
            typeof authority
              .setChartMode === 'function'
          ),

        currentMode:
          currentMode(),

        clickCount:
          state.clickCount,

        applyCount:
          state.applyCount,

        failureCount:
          state.failureCount,

        lastRequestedMode:
          state.lastRequestedMode,

        lastAppliedMode:
          state.lastAppliedMode,

        lastError:
          state.lastError,

        recurringInterval:
          false,

        mutationObserver:
          false
      };
    }
  };

  /*
   * Preserve the existing active default after page load without
   * forcing a redraw before Analytics has rendered.
   */
  window.addEventListener(
    'load',
    function () {
      var mode = currentMode();

      if (mode) {
        var root = getRoot();

        root?.setAttribute(
          'data-chart-mode',
          mode
        );

        updateButtonState(mode);
      }
    },
    { once: true }
  );
})();

/* PMD Dashboard2 Chart Toggle Direct Binding V11.5.1 */
(function () {
  'use strict';

  if (window.PMDDashboard2ChartToggleDirectV1151) {
    return;
  }

  var VERSION = '11.5.1';
  var boundButtons = new WeakSet();

  var state = {
    bindRuns: 0,
    directlyBound: 0,
    pointerCount: 0,
    keyboardCount: 0,
    applyCount: 0,
    failureCount: 0,
    lastMode: null,
    lastError: null
  };

  function normalizeMode(value) {
    value = String(value || '')
      .trim()
      .toLowerCase();

    return value === 'line' || value === 'bar'
      ? value
      : null;
  }

  function buttons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        '#pmd-dashboard2-analytics-v1 ' +
        '[data-pmd-chart-mode]'
      )
    );
  }

  function updateState(mode) {
    buttons().forEach(function (button) {
      var active =
        normalizeMode(
          button.getAttribute(
            'data-pmd-chart-mode'
          )
        ) === mode;

      button.classList.toggle(
        'is-active',
        active
      );

      button.classList.toggle(
        'active',
        active
      );

      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      );
    });

    var root = document.getElementById(
      'pmd-dashboard2-analytics-v1'
    );

    if (root) {
      root.setAttribute(
        'data-chart-mode',
        mode
      );
    }
  }

  function apply(mode) {
    mode = normalizeMode(mode);

    if (!mode) {
      return false;
    }

    state.lastError = null;

    try {
      var authority =
        window.PMDDashboard2AnalyticsLayoutV6;

      if (
        !authority ||
        typeof authority.setChartMode !== 'function'
      ) {
        throw new Error(
          'Analytics Layout V6 setChartMode unavailable.'
        );
      }

      authority.setChartMode(mode);
      updateState(mode);

      state.applyCount += 1;
      state.lastMode = mode;

      window.requestAnimationFrame(function () {
        if (
          window.PMDDashboard2EqualRowsV9 &&
          typeof window
            .PMDDashboard2EqualRowsV9
            .apply === 'function'
        ) {
          window
            .PMDDashboard2EqualRowsV9
            .apply();
        }
      });

      return true;
    } catch (error) {
      state.failureCount += 1;
      state.lastError =
        error?.message || String(error);

      console.error(
        '[PMD Chart Direct V11.5.1]',
        state.lastError
      );

      return false;
    }
  }

  function buttonMode(button) {
    return normalizeMode(
      button.getAttribute(
        'data-pmd-chart-mode'
      )
    );
  }

  function onPointerDown(event) {
    var button = event.currentTarget;
    var mode = buttonMode(button);

    if (!mode) {
      return;
    }

    state.pointerCount += 1;

    /*
     * Run directly at the button instead of relying on delegated
     * document handlers.
     */
    apply(mode);
  }

  function onKeyDown(event) {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    var button = event.currentTarget;
    var mode = buttonMode(button);

    if (!mode) {
      return;
    }

    state.keyboardCount += 1;

    event.preventDefault();
    apply(mode);
  }

  function bind() {
    state.bindRuns += 1;

    buttons().forEach(function (button) {
      if (boundButtons.has(button)) {
        return;
      }

      button.type = 'button';

      button.addEventListener(
        'pointerdown',
        onPointerDown,
        false
      );

      button.addEventListener(
        'keydown',
        onKeyDown,
        false
      );

      boundButtons.add(button);
      state.directlyBound += 1;
    });

    return state.directlyBound;
  }

  function scheduleBinding() {
    bind();
    window.requestAnimationFrame(bind);
    window.setTimeout(bind, 120);
    window.setTimeout(bind, 450);
    window.setTimeout(bind, 1000);
  }

  scheduleBinding();

  window.addEventListener(
    'load',
    scheduleBinding,
    { once: true }
  );

  window.PMDDashboard2ChartToggleDirectV1151 = {
    version: VERSION,

    bind: bind,

    setLine: function () {
      return apply('line');
    },

    setBar: function () {
      return apply('bar');
    },

    audit: function () {
      var authority =
        window.PMDDashboard2AnalyticsLayoutV6;

      return {
        version: VERSION,
        buttonCount: buttons().length,
        bindRuns: state.bindRuns,
        directlyBound: state.directlyBound,
        pointerCount: state.pointerCount,
        keyboardCount: state.keyboardCount,
        applyCount: state.applyCount,
        failureCount: state.failureCount,
        lastMode: state.lastMode,
        lastError: state.lastError,

        authorityFound:
          Boolean(authority),

        setChartModeFound:
          Boolean(
            authority &&
            typeof authority
              .setChartMode === 'function'
          ),

        buttons: buttons().map(function (button) {
          return {
            text: String(
              button.textContent || ''
            )
              .replace(/\s+/g, ' ')
              .trim(),

            mode: buttonMode(button),

            active:
              button.classList.contains(
                'is-active'
              ) ||
              button.classList.contains(
                'active'
              ),

            ariaPressed:
              button.getAttribute(
                'aria-pressed'
              )
          };
        }),

        recurringInterval: false,
        mutationObserver: false
      };
    }
  };
})();


/* PMD Dashboard2 Chart Live Render Restore V11.6 */
(function () {
  'use strict';

  window.PMDDashboard2ChartLiveRenderV116 = {
    version: '11.6.0',

    audit: function () {
      var root = document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

      var svg = root && root.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"] svg'
      );

      return {
        version: '11.6.0',

        rootFound:
          Boolean(root),

        originalRendererExpected:
          Boolean(
            window.PMDDashboard2FinalWorkspace
          ),

        currentSvgType:
          svg
            ? (
                svg.classList.contains('is-line-chart')
                  ? 'line'
                  : (
                      svg.classList.contains('is-bar-chart')
                        ? 'bar'
                        : 'unknown'
                    )
              )
            : null,

        selectedMode:
          localStorage.getItem(
            'pmd.dashboard2.salesChartMode.v1'
          ),

        blockingCaptureRemoved:
          true,

        originalClickPropagationRestored:
          true,

        recurringInterval:
          false,

        mutationObserver:
          false
      };
    }
  };
})();


/* PMD Dashboard2 Chart Renderer Authority V11.7 */
(function () {
  'use strict';

  window.PMDDashboard2ChartRendererV117 = {
    version: '11.7.0',

    setLine: function () {
      return window
        .PMDDashboard2FinalWorkspace
        ?.setChartMode('line');
    },

    setBar: function () {
      return window
        .PMDDashboard2FinalWorkspace
        ?.setChartMode('bar');
    },

    audit: function () {
      var workspace =
        window.PMDDashboard2FinalWorkspace;

      var root = document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

      var svg = root?.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"] svg'
      );

      var svgType = svg
        ? (
            svg.classList.contains('is-line-chart')
              ? 'line'
              : (
                  svg.classList.contains('is-bar-chart')
                    ? 'bar'
                    : 'unknown'
                )
          )
        : null;

      var closureMode =
        typeof workspace?.getChartMode === 'function'
          ? workspace.getChartMode()
          : null;

      var storedMode = null;

      try {
        storedMode = localStorage.getItem(
          'pmd.dashboard2.salesChartMode.v1'
        );
      } catch (error) {}

      return {
        version: '11.7.0',

        workspaceFound:
          Boolean(workspace),

        setChartModeFound:
          typeof workspace?.setChartMode === 'function',

        getChartModeFound:
          typeof workspace?.getChartMode === 'function',

        closureMode:
          closureMode,

        storedMode:
          storedMode,

        currentSvgType:
          svgType,

        modesSynchronized:
          Boolean(
            closureMode &&
            closureMode === storedMode &&
            closureMode === svgType
          ),

        recurringInterval:
          false,

        mutationObserver:
          false
      };
    }
  };
})();


/* PMD_DASHBOARD2_SHARP_COLORS_V121 */
(function () {
  'use strict';

  if (
    location.pathname.replace(/\/+$/, '') !==
    '/admin/dashboard2'
  ) {
    return;
  }

  var id = 'pmd-dashboard2-sharp-colors-v121';

  if (document.getElementById(id)) {
    return;
  }

  var style = document.createElement('style');
  style.id = id;

  style.textContent = `
    #pmd-dashboard2-analytics-v1 {
      --pmd-vivid-green: #00A676;
      --pmd-vivid-green-dark: #007A59;
      --pmd-vivid-blue: #2563EB;
      --pmd-vivid-orange: #FF8A00;
      --pmd-vivid-purple: #D946EF;
      --pmd-vivid-cyan: #06B6D4;
      --pmd-vivid-red: #EF4444;
      --pmd-vivid-ink: #102A43;
    }

    #pmd-dashboard2-analytics-v1
#pmd-dashboard2-analytics-v1
#pmd-dashboard2-analytics-v1
#pmd-dashboard2-analytics-v1
    .pmd-dashboard2-analytics-card h3 {
      color: var(--pmd-vivid-ink) !important;
      font-weight: 800 !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-chart-line {
      stroke: var(--pmd-vivid-green) !important;
      stroke-width: 4 !important;
      filter:
        drop-shadow(0 2px 3px rgba(0, 166, 118, 0.25));
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart circle:not(.pmd-chart-grid) {
      fill: #FFFFFF !important;
      stroke: var(--pmd-vivid-green) !important;
      stroke-width: 4 !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart rect:not(.is-zero) {
      fill: var(--pmd-vivid-green) !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart rect.is-peak {
      fill: var(--pmd-vivid-orange) !important;
      filter:
        drop-shadow(0 3px 3px rgba(255, 138, 0, 0.25));
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart rect.is-zero {
      fill: rgba(0, 166, 118, 0.12) !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-chart-grid {
      stroke: rgba(16, 42, 67, 0.13) !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart-toggle button.is-active,
    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart-toggle button[aria-pressed="true"] {
      background: var(--pmd-vivid-green-dark) !important;
      border-color: var(--pmd-vivid-green-dark) !important;
      color: #FFFFFF !important;
      box-shadow:
        0 3px 8px rgba(0, 122, 89, 0.3) !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-live-summary b,
    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-review-score b,
    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-stats dd {
      color: var(--pmd-vivid-green-dark) !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="alerts"]
    .pmd-dashboard2-data-list li:nth-child(1) b,
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="alerts"]
    .pmd-dashboard2-data-list li:nth-child(2) b {
      color: var(--pmd-vivid-red) !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="alerts"]
    .pmd-dashboard2-data-list li:nth-child(3) b {
      color: var(--pmd-vivid-orange) !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-empty {
      color: #64748B !important;
    }

    #pmd-dashboard2-analytics-v1
    .pmd-chart-legend i {
      box-shadow:
        0 0 0 2px #FFFFFF,
        0 0 0 3px rgba(16, 42, 67, 0.15);
    }
  `;

  document.head.appendChild(style);

  window.PMDDashboard2SharpColorsV121 = {
    version: '1.2.1',
    palette: [
      '#00A676',
      '#2563EB',
      '#FF8A00',
      '#D946EF',
      '#06B6D4',
      '#EF4444'
    ],
    audit: function () {
      return {
        version: '1.2.1',
        stylePresent: Boolean(
          document.getElementById(id)
        ),
        deliveryLegendPresent:
          Array.from(
            document.querySelectorAll(
              '[data-pmd-analytics-widget="channelSplit"] ' +
              '.pmd-chart-legend span'
            )
          ).some(function (node) {
            return node.textContent.trim() === 'Delivery';
          })
      };
    }
  };

  console.info(
    '[PMD Dashboard2 Sharp Colors V1.2.1] Ready',
    window.PMDDashboard2SharpColorsV121.audit()
  );
})();


/* Single Layout Authority V1.2.7 removed by Dashboard2 V1.3.0 */


/* PMD_DASHBOARD2_V137_REAL_CHART_NAV */
(function () {
  'use strict';

  const VERSION = '1.3.7';
  const PATCH_KEY = 'PMDDashboard2RealChartNavV137';

  if (window[PATCH_KEY]?.installed) {
    return;
  }

  const state = new WeakMap();

  const CONFIG = {
    salesOverTime: {
      label: 'Zeitbereich Umsatzverlauf',
      visibleRatio: 0.72,
      stepRatio: 0.18
    },

    salesByHour: {
      label: 'Zeitbereich Umsatz nach Stunde',
      visibleRatio: 0.72,
      stepRatio: 0.18
    }
  };

  const getCard = key =>
    document.querySelector(
      `[data-pmd-analytics-widget="${key}"]`
    );

  const getSvg = card =>
    card?.querySelector(
      '.pmd-dashboard2-chart-frame > svg'
    ) || null;

  const parseViewBox = svg => {
    const base = svg?.viewBox?.baseVal;

    if (
      base &&
      Number.isFinite(base.width) &&
      base.width > 0 &&
      Number.isFinite(base.height) &&
      base.height > 0
    ) {
      return {
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height
      };
    }

    const raw = svg
      ?.getAttribute('viewBox')
      ?.trim()
      ?.split(/\s+/)
      ?.map(Number);

    if (
      Array.isArray(raw) &&
      raw.length === 4 &&
      raw.every(Number.isFinite) &&
      raw[2] > 0 &&
      raw[3] > 0
    ) {
      return {
        x: raw[0],
        y: raw[1],
        width: raw[2],
        height: raw[3]
      };
    }

    return null;
  };

  const setViewBox = (svg, box) => {
    svg.setAttribute(
      'viewBox',
      [
        box.x,
        box.y,
        box.width,
        box.height
      ].join(' ')
    );
  };

  const updateControls = entry => {
    const {
      previousButton,
      nextButton,
      resetButton,
      original,
      windowWidth,
      currentX
    } = entry;

    const minX = original.x;
    const maxX =
      original.x + original.width - windowWidth;

    const isFull =
      Math.abs(windowWidth - original.width) < 0.01;

    previousButton.disabled =
      isFull || currentX <= minX + 0.01;

    nextButton.disabled =
      isFull || currentX >= maxX - 0.01;

    resetButton.classList.toggle(
      'is-windowed',
      !isFull
    );

    resetButton.textContent =
      isFull ? 'Alle' : 'Reset';

    resetButton.setAttribute(
      'aria-pressed',
      isFull ? 'false' : 'true'
    );
  };

  const applyWindow = (entry, requestedX) => {
    const {
      svg,
      original,
      windowWidth
    } = entry;

    const minX = original.x;
    const maxX =
      original.x + original.width - windowWidth;

    const nextX = Math.min(
      maxX,
      Math.max(minX, requestedX)
    );

    entry.currentX = nextX;

    setViewBox(svg, {
      x: nextX,
      y: original.y,
      width: windowWidth,
      height: original.height
    });

    updateControls(entry);
  };

  const showFullRange = entry => {
    entry.windowWidth = entry.original.width;
    entry.currentX = entry.original.x;

    setViewBox(entry.svg, entry.original);
    updateControls(entry);
  };

  const showWindowedRange = (
    entry,
    direction
  ) => {
    const configuredWidth =
      entry.original.width *
      entry.config.visibleRatio;

    entry.windowWidth = Math.max(
      1,
      Math.min(
        entry.original.width,
        configuredWidth
      )
    );

    const step =
      entry.original.width *
      entry.config.stepRatio;

    let startX = entry.currentX;

    if (
      Math.abs(
        entry.windowWidth -
        entry.original.width
      ) < 0.01
    ) {
      startX =
        direction === 'previous'
          ? entry.original.x
          : entry.original.x +
            entry.original.width -
            entry.windowWidth;
    } else {
      startX +=
        direction === 'previous'
          ? -step
          : step;
    }

    applyWindow(entry, startX);
  };

  const createButton = ({
    text,
    ariaLabel,
    attribute
  }) => {
    const button =
      document.createElement('button');

    button.type = 'button';
    button.textContent = text;
    button.setAttribute(
      'aria-label',
      ariaLabel
    );

    if (attribute) {
      button.setAttribute(
        attribute.name,
        attribute.value
      );
    }

    return button;
  };

  const createToolbar = (
    card,
    frame,
    config
  ) => {
    const toolbar =
      document.createElement('div');

    toolbar.className =
      'pmd-dashboard2-chart-nav-v137';

    toolbar.setAttribute(
      'data-pmd-chart-toolbar',
      'v137'
    );

    toolbar.setAttribute(
      'role',
      'group'
    );

    toolbar.setAttribute(
      'aria-label',
      config.label
    );

    const previousButton =
      createButton({
        text: '‹',
        ariaLabel: 'Vorheriger Zeitraum',
        attribute: {
          name:
            'data-pmd-chart-nav-direction',
          value: 'previous'
        }
      });

    const resetButton =
      createButton({
        text: 'Alle',
        ariaLabel:
          'Gesamten Zeitraum anzeigen',
        attribute: {
          name:
            'data-pmd-chart-nav-reset',
          value: 'true'
        }
      });

    const nextButton =
      createButton({
        text: '›',
        ariaLabel: 'Nächster Zeitraum',
        attribute: {
          name:
            'data-pmd-chart-nav-direction',
          value: 'next'
        }
      });

    toolbar.append(
      previousButton,
      resetButton,
      nextButton
    );

    frame.appendChild(toolbar);

    return {
      toolbar,
      previousButton,
      resetButton,
      nextButton
    };
  };

  const setupCard = key => {
    const config = CONFIG[key];
    const card = getCard(key);

    if (!config || !card) {
      return {
        key,
        installed: false,
        reason: 'card-not-found'
      };
    }

    const frame = card.querySelector(
      '.pmd-dashboard2-chart-frame'
    );

    const svg = getSvg(card);

    if (!frame || !svg) {
      return {
        key,
        installed: false,
        reason: 'frame-or-svg-not-found'
      };
    }

    const existingToolbar =
      frame.querySelector(
        '[data-pmd-chart-toolbar="v137"]'
      );

    if (existingToolbar) {
      return {
        key,
        installed: true,
        reason: 'already-installed'
      };
    }

    const original = parseViewBox(svg);

    if (!original) {
      return {
        key,
        installed: false,
        reason: 'invalid-viewbox'
      };
    }

    svg.setAttribute(
      'preserveAspectRatio',
      'xMidYMid meet'
    );

    const controls = createToolbar(
      card,
      frame,
      config
    );

    const entry = {
      key,
      config,
      card,
      frame,
      svg,
      original,
      windowWidth: original.width,
      currentX: original.x,
      ...controls
    };

    state.set(card, entry);

    controls.previousButton.addEventListener(
      'click',
      () => {
        showWindowedRange(
          entry,
          'previous'
        );
      }
    );

    controls.nextButton.addEventListener(
      'click',
      () => {
        showWindowedRange(
          entry,
          'next'
        );
      }
    );

    controls.resetButton.addEventListener(
      'click',
      () => {
        showFullRange(entry);
      }
    );

    updateControls(entry);

    return {
      key,
      installed: true,
      originalViewBox: original
    };
  };

  const refreshCardAfterRender = key => {
    window.setTimeout(() => {
      const card = getCard(key);

      if (!card) return;

      const previousEntry =
        state.get(card);

      const svg = getSvg(card);

      if (
        !previousEntry ||
        !svg ||
        previousEntry.svg === svg
      ) {
        return;
      }

      previousEntry.toolbar?.remove();
      state.delete(card);
      setupCard(key);
    }, 80);
  };

  const setup = () =>
    Object.keys(CONFIG).map(setupCard);

  const boot = () => {
    const result = setup();

    document.addEventListener(
      'click',
      event => {
        const modeButton =
          event.target.closest(
            '[data-pmd-chart-mode]'
          );

        if (!modeButton) return;

        const card =
          modeButton.closest(
            '[data-pmd-analytics-widget]'
          );

        const key =
          card?.getAttribute(
            'data-pmd-analytics-widget'
          );

        if (
          key === 'salesOverTime' ||
          key === 'salesByHour'
        ) {
          refreshCardAfterRender(key);
        }
      },
      true
    );

    console.info(
      '[PMD Dashboard2 Real Chart Nav V1.3.7] Ready',
      result
    );

    return result;
  };

  const auditCard = key => {
    const card = getCard(key);
    const frame = card?.querySelector(
      '.pmd-dashboard2-chart-frame'
    );
    const svg = getSvg(card);
    const pills = frame?.querySelector(
      '.pmd-dashboard2-chart-key'
    );
    const toolbar = frame?.querySelector(
      '[data-pmd-chart-toolbar="v137"]'
    );

    const rect = element => {
      if (!element) return null;

      const value =
        element.getBoundingClientRect();

      return {
        top: Math.round(value.top * 100) / 100,
        bottom:
          Math.round(value.bottom * 100) / 100,
        width:
          Math.round(value.width * 100) / 100,
        height:
          Math.round(value.height * 100) / 100
      };
    };

    const cardRect =
      card?.getBoundingClientRect();

    const svgRect =
      svg?.getBoundingClientRect();

    const pillsRect =
      pills?.getBoundingClientRect();

    const toolbarRect =
      toolbar?.getBoundingClientRect();

    return {
      key,
      found: Boolean(card),
      card: rect(card),
      frame: rect(frame),
      svg: rect(svg),
      pills: rect(pills),
      toolbar: rect(toolbar),

      toolbarExists: Boolean(toolbar),

      pillToSvg:
        pillsRect && svgRect
          ? Math.round(
              (svgRect.top -
                pillsRect.bottom) *
                100
            ) / 100
          : null,

      svgBottomToCardBottom:
        cardRect && svgRect
          ? Math.round(
              (cardRect.bottom -
                svgRect.bottom) *
                100
            ) / 100
          : null,

      toolbarBottomToCardBottom:
        cardRect && toolbarRect
          ? Math.round(
              (cardRect.bottom -
                toolbarRect.bottom) *
                100
            ) / 100
          : null,

      viewBox:
        svg?.getAttribute('viewBox') ||
        null
    };
  };

  const api = {
    version: VERSION,
    installed: true,
    boot,
    setup,
    audit() {
      const result = {
        salesOverTime:
          auditCard('salesOverTime'),

        salesByHour:
          auditCard('salesByHour')
      };

      console.table([
        {
          card: 'Sales over time',
          toolbar:
            result.salesOverTime
              .toolbarExists,
          pillToSvg:
            result.salesOverTime
              .pillToSvg,
          svgBottomSpace:
            result.salesOverTime
              .svgBottomToCardBottom,
          toolbarBottomSpace:
            result.salesOverTime
              .toolbarBottomToCardBottom,
          viewBox:
            result.salesOverTime
              .viewBox
        },
        {
          card: 'Sales by hour',
          toolbar:
            result.salesByHour
              .toolbarExists,
          pillToSvg:
            result.salesByHour
              .pillToSvg,
          svgBottomSpace:
            result.salesByHour
              .svgBottomToCardBottom,
          toolbarBottomSpace:
            result.salesByHour
              .toolbarBottomToCardBottom,
          viewBox:
            result.salesByHour
              .viewBox
        }
      ]);

      return result;
    },

    reset() {
      Object.keys(CONFIG).forEach(key => {
        const card = getCard(key);
        const entry =
          card && state.get(card);

        if (entry) {
          showFullRange(entry);
        }
      });
    }
  };

  window[PATCH_KEY] = api;

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    window.setTimeout(boot, 0);
  }
})();

/* PMD_DASHBOARD2_V1375_ZOOM_DENSITY_SCRUBBER */
(function () {
  'use strict';

  const PATCH_KEY =
    'PMD_DASHBOARD2_V1375_ZOOM_DENSITY_SCRUBBER';

  if (window[PATCH_KEY]) {
    return;
  }

  window[PATCH_KEY] = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CONFIG = {
    salesOverTime: {
      minimumVisible: 7,
      labelCount: 7,
      barOnly: true
    },

    salesByHour: {
      minimumVisible: 1,
      labelCount: 7,
      barOnly: false
    }
  };

  const zoomState = new Map();

  /*
   * PMD V1.3.9.4:
   * هر Slider فقط یک Render در هر Animation Frame دارد.
   * این Map از اجرای چند applyZoom در یک Drag جلوگیری می‌کند.
   */
  const inputRenderFrames = new Map();

  function addStyles() {
    if (
      document.getElementById(
        'pmd-dashboard2-v1375-zoom-style'
      )
    ) {
      return;
    }

    const style = document.createElement('style');

    style.id =
      'pmd-dashboard2-v1375-zoom-style';

    style.textContent = `
      [data-pmd-analytics-widget="salesOverTime"]
      .pmd-dashboard2-widget-body,

      [data-pmd-analytics-widget="salesByHour"]
      .pmd-dashboard2-widget-body {
        position: relative !important;
      }

      .pmd-dashboard2-zoom-scrubber-v1375 {
        position: absolute;
        left: 50%;
        bottom: 14px;
        z-index: 8;

        width: 164px;
        height: 18px;

        display: flex;
        align-items: center;
        justify-content: center;

        transform: translateX(-50%);
        margin: 0;
        padding: 0;

        background: transparent;
        border: 0;
        box-shadow: none;
      }

      .pmd-dashboard2-zoom-scrubber-v1375[hidden] {
        display: none !important;
      }

      .pmd-dashboard2-zoom-scrubber-v1375 input {
        appearance: none;
        -webkit-appearance: none;

        width: 164px;
        height: 18px;

        margin: 0;
        padding: 0;

        background: transparent;
        border: 0;
        outline: none;

        cursor: ew-resize;
      }

      .pmd-dashboard2-zoom-scrubber-v1375
      input::-webkit-slider-runnable-track {
        width: 100%;
        height: 3px;

        border-radius: 999px;

        background:
          linear-gradient(
            90deg,
            #078d70 0%,
            #078d70 var(--pmd-zoom-progress, 100%),
            #dce6e3 var(--pmd-zoom-progress, 100%),
            #dce6e3 100%
          );
      }

      .pmd-dashboard2-zoom-scrubber-v1375
      input::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;

        width: 13px;
        height: 13px;

        margin-top: -5px;

        border: 2px solid #fff;
        border-radius: 50%;

        background: #078d70;

        box-shadow:
          0 0 0 1px #b6cbc5,
          0 2px 5px rgba(9, 54, 44, .22);
      }

      .pmd-dashboard2-zoom-scrubber-v1375
      input::-moz-range-track {
        width: 100%;
        height: 3px;

        border: 0;
        border-radius: 999px;

        background: #dce6e3;
      }

      .pmd-dashboard2-zoom-scrubber-v1375
      input::-moz-range-progress {
        height: 3px;
        border-radius: 999px;
        background: #078d70;
      }

      .pmd-dashboard2-zoom-scrubber-v1375
      input::-moz-range-thumb {
        width: 13px;
        height: 13px;

        border: 2px solid #fff;
        border-radius: 50%;

        background: #078d70;

        box-shadow:
          0 0 0 1px #b6cbc5,
          0 2px 5px rgba(9, 54, 44, .22);
      }

      .pmd-dashboard2-zoom-axis-v1375 text {
        pointer-events: none;
      }

      @media (max-width: 991px) {
        .pmd-dashboard2-zoom-scrubber-v1375 {
          width: 140px;
          bottom: 10px;
        }

        .pmd-dashboard2-zoom-scrubber-v1375 input {
          width: 140px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getCard(key) {
    return document.querySelector(
      `[data-pmd-analytics-widget="${key}"]`
    );
  }

  function getBody(card) {
    return card?.querySelector(
      '[data-pmd-widget-body]'
    );
  }

  function getFrame(card) {
    return card?.querySelector(
      '.pmd-dashboard2-chart-frame'
    );
  }

  function getSvg(frame) {
    return frame?.querySelector(
      'svg.pmd-dashboard2-chart, svg'
    );
  }

  function isBarChart(svg) {
    return Boolean(
      svg?.classList.contains('is-bar-chart')
    );
  }

  function enforceStableViewBox(svg) {
    if (!svg) {
      return;
    }

    svg.setAttribute(
      'viewBox',
      '0 0 900 310'
    );

    svg.setAttribute(
      'preserveAspectRatio',
      'xMidYMid meet'
    );
  }

  function getPointGroups(svg) {
    return Array.from(
      svg.querySelectorAll(
        'g.pmd-chart-focus-point'
      )
    ).filter(group => group.querySelector('rect'));
  }

  function rememberOriginal(group) {
    const rect = group.querySelector('rect');

    if (!rect) {
      return;
    }

    if (!group.dataset.pmdV1375Display) {
      group.dataset.pmdV1375Display =
        group.style.display || '__EMPTY__';
    }

    if (!rect.dataset.pmdV1375X) {
      rect.dataset.pmdV1375X =
        rect.getAttribute('x') || '0';
    }

    if (!rect.dataset.pmdV1375Width) {
      rect.dataset.pmdV1375Width =
        rect.getAttribute('width') || '1';
    }
  }

  function restoreOriginal(svg) {
    if (!svg) {
      return;
    }

    getPointGroups(svg).forEach(group => {
      rememberOriginal(group);

      const rect = group.querySelector('rect');

      if (!rect) {
        return;
      }

      if (
        group.dataset.pmdV1375Display ===
        '__EMPTY__'
      ) {
        group.style.removeProperty('display');
      } else {
        group.style.display =
          group.dataset.pmdV1375Display;
      }

      rect.setAttribute(
        'x',
        rect.dataset.pmdV1375X
      );

      rect.setAttribute(
        'width',
        rect.dataset.pmdV1375Width
      );
    });

    svg
      .querySelector(
        '.pmd-dashboard2-zoom-axis-v1375'
      )
      ?.remove();

    Array.from(
      svg.querySelectorAll(
        '.pmd-dashboard2-chart-axis-label.is-x-axis'
      )
    ).forEach(label => {
      label.style.removeProperty('display');
    });

    enforceStableViewBox(svg);
  }

  function getNumericAttribute(element, name) {
    const value = Number(
      element?.getAttribute(name)
    );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  function getPeakIndex(groups) {
    let peakIndex = 0;
    let peakHeight = -Infinity;

    groups.forEach((group, index) => {
      const rect = group.querySelector('rect');
      const height =
        getNumericAttribute(rect, 'height');

      if (height > peakHeight) {
        peakHeight = height;
        peakIndex = index;
      }
    });

    return peakIndex;
  }

  function getGroupText(group) {
    return (
      group.getAttribute('aria-label') ||
      group.querySelector('title')?.textContent ||
      group.textContent ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getAxisLabel(key, group) {
    const text = getGroupText(group);

    if (key === 'salesByHour') {
      const hour = text.match(
        /\b([01]\d|2[0-3]):[0-5]\d\b/
      );

      return hour ? hour[0] : '';
    }

    const germanDate = text.match(
      /^(\d{1,2}\.\s+[^\d]+?)(?:\s+\d{4})?\./
    );

    if (germanDate) {
      return germanDate[1].trim();
    }

    const englishDate = text.match(
      /^([A-Za-z]{3,9}\s+\d{1,2})(?:,\s+\d{4})?\./
    );

    if (englishDate) {
      return englishDate[1];
    }

    return text
      .split(/[·.]/)[0]
      .trim();
  }

  function createAxis(
    svg,
    key,
    visibleGroups,
    config
  ) {
    svg
      .querySelector(
        '.pmd-dashboard2-zoom-axis-v1375'
      )
      ?.remove();

    Array.from(
      svg.querySelectorAll(
        '.pmd-dashboard2-chart-axis-label.is-x-axis'
      )
    ).forEach(label => {
      label.style.display = 'none';
    });

    const axis =
      document.createElementNS(SVG_NS, 'g');

    axis.setAttribute(
      'class',
      'pmd-dashboard2-zoom-axis-v1375'
    );

    const count = visibleGroups.length;

    if (!count) {
      svg.appendChild(axis);
      return;
    }

    const plotLeft = 78;
    const plotRight = 882;
    const plotWidth = plotRight - plotLeft;
    const slotWidth = plotWidth / count;

    const targetLabelCount = Math.max(
      2,
      Math.min(config.labelCount, count)
    );

    const labelStep = Math.max(
      1,
      Math.ceil(count / targetLabelCount)
    );

    visibleGroups.forEach((group, index) => {
      const shouldShow =
        index === 0 ||
        index === count - 1 ||
        index % labelStep === 0;

      if (!shouldShow) {
        return;
      }

      const text =
        document.createElementNS(
          SVG_NS,
          'text'
        );

      const x =
        plotLeft +
        slotWidth * index +
        slotWidth / 2;

      text.setAttribute(
        'class',
        'pmd-dashboard2-chart-axis-label is-x-axis'
      );

      text.setAttribute(
        'x',
        x.toFixed(3)
      );

      text.setAttribute('y', '299');
      text.setAttribute(
        'text-anchor',
        'middle'
      );

      text.textContent =
        getAxisLabel(key, group);

      axis.appendChild(text);
    });

    svg.appendChild(axis);
  }

  function calculateCenteredWindow(
    total,
    visibleCount,
    peakIndex
  ) {
    const safeVisible = Math.max(
      1,
      Math.min(visibleCount, total)
    );

    const maximumStart =
      total - safeVisible;

    const preferredStart =
      peakIndex -
      Math.floor(safeVisible / 2);

    const start = Math.max(
      0,
      Math.min(
        preferredStart,
        maximumStart
      )
    );

    return {
      start,
      end: start + safeVisible,
      visible: safeVisible
    };
  }

  function applyZoom(key, visibleCount) {
    const config = CONFIG[key];
    const card = getCard(key);
    const frame = getFrame(card);
    const svg = getSvg(frame);

    if (!config || !card || !frame || !svg) {
      return {
        key,
        applied: false,
        reason: 'card-frame-or-svg-not-found'
      };
    }

    enforceStableViewBox(svg);

    if (
      config.barOnly &&
      !isBarChart(svg)
    ) {
      restoreOriginal(svg);

      return {
        key,
        applied: false,
        reason: 'line-mode'
      };
    }

    const groups = getPointGroups(svg);

    groups.forEach(rememberOriginal);

    const total = groups.length;

    if (!total) {
      return {
        key,
        applied: false,
        reason: 'points-not-found'
      };
    }

    const safeVisible = Math.max(
      config.minimumVisible,
      Math.min(
        Number(visibleCount) || total,
        total
      )
    );

    /*
     * حتی در حالت نمایش کامل نیز ستون‌ها دوباره چیدمان
     * می‌شوند تا عرض آن‌ها متناسب با فضای واقعی Plot باشد.
     * فاصله زمانی و ترتیب داده‌ها تغییر نمی‌کند.
     */
    const peakIndex =
      getPeakIndex(groups);

    const isFullRange =
      safeVisible >= total;

    /*
     * Umsatz nach Stunde is a trailing live window:
     * its final visible point is always the latest available hour.
     *
     * Sales over time keeps the existing peak-centred behavior.
     */
    const windowResult =
      isFullRange
        ? {
            start: 0,
            end: total,
            visible: total
          }
        : key === 'salesByHour'
          ? {
              start: Math.max(0, total - safeVisible),
              end: total,
              visible: safeVisible
            }
          : calculateCenteredWindow(
              total,
              safeVisible,
              peakIndex
            );

    const visibleGroups = groups.slice(
      windowResult.start,
      windowResult.end
    );

    groups.forEach(group => {
      group.style.display = 'none';
    });

    const plotLeft = 78;
    const plotRight = 882;
    const plotWidth = plotRight - plotLeft;
    const slotWidth =
      plotWidth / visibleGroups.length;

    visibleGroups.forEach((group, index) => {
      const rect = group.querySelector('rect');

      if (!rect) {
        return;
      }

      group.style.removeProperty('display');

      const originalWidth = Math.max(
        1,
        Number(
          rect.dataset.pmdV1375Width
        ) || 14
      );

      /*
       * هرچه تعداد نقاط کمتر شود،
       * فاصله و عرض ستون‌ها بیشتر می‌شود.
       */
      /*
       * ستون‌ها پهن‌تر از نسخه قبلی هستند، اما هیچ‌وقت
       * از فضای Slot خود خارج نمی‌شوند و روی هم نمی‌افتند.
       *
       * Full range:
       * ستون‌ها حدود 76 درصد فضای هر Slot را استفاده می‌کنند.
       *
       * Zoom range:
       * ستون‌ها با کاهش تعداد نقاط بازتر و واضح‌تر می‌شوند.
       */
      const widthRatio =
        isFullRange
          ? 0.76
          : 0.68;

      const newWidth = Math.max(
        14,
        Math.min(
          58,
          slotWidth * widthRatio,
          originalWidth * 2.8
        )
      );

      const x =
        plotLeft +
        slotWidth * index +
        (slotWidth - newWidth) / 2;

      rect.setAttribute(
        'x',
        x.toFixed(3)
      );

      rect.setAttribute(
        'width',
        newWidth.toFixed(3)
      );
    });

    createAxis(
      svg,
      key,
      visibleGroups,
      config
    );

    enforceStableViewBox(svg);

    return {
      key,
      applied: true,
      mode: isFullRange
        ? 'full-wide'
        : 'zoom-wide',
      totalPoints: total,
      visiblePoints: visibleGroups.length,
      peakIndex,
      startIndex: windowResult.start,
      endIndex: windowResult.end - 1,
      viewBox: svg.getAttribute('viewBox')
    };
  }

  function removePreviousControls(card) {
    if (!card) {
      return;
    }

    const selectors = [
      '.pmd-dashboard2-zoom-scrubber-v1375',
      '.pmd-dashboard2-real-window-v1374',
      '.pmd-dashboard2-minimal-range-scrubber',
      '[data-pmd-minimal-range-scrubber]',
      '[data-pmd-chart-range-toolbar]',
      '.pmd-dashboard2-day-week-month-toolbar'
    ];

    selectors.forEach(selector => {
      card
        .querySelectorAll(selector)
        .forEach(element => {
          element.remove();
        });
    });
  }

  function updateTrack(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);

    const percentage =
      max <= min
        ? 100
        : ((value - min) / (max - min)) * 100;

    input.style.setProperty(
      '--pmd-zoom-progress',
      `${percentage}%`
    );
  }

  function installControl(key) {
    const config = CONFIG[key];

    const card = getCard(key);
    const body = getBody(card);
    const frame = getFrame(card);
    const svg = getSvg(frame);

    if (
      !config ||
      !card ||
      !body ||
      !frame ||
      !svg
    ) {
      return {
        key,
        installed: false,
        reason: 'body-frame-or-svg-not-found'
      };
    }

    /*
     * فقط کنترل متعلق به نسخه‌های قبلی حذف می‌شود.
     */
    card
      .querySelectorAll(
        [
          '.pmd-dashboard2-real-window-v1374',
          '.pmd-dashboard2-minimal-range-scrubber',
          '[data-pmd-minimal-range-scrubber]',
          '[data-pmd-chart-range-toolbar]',
          '.pmd-dashboard2-day-week-month-toolbar'
        ].join(',')
      )
      .forEach(element => element.remove());

    enforceStableViewBox(svg);

    const groups = getPointGroups(svg);

    groups.forEach(rememberOriginal);

    let control = card.querySelector(
      '.pmd-dashboard2-zoom-scrubber-v1375'
    );

    let input;

    if (!control) {
      control = document.createElement('div');

      control.className =
        'pmd-dashboard2-zoom-scrubber-v1375';

      control.dataset.pmdZoomScrubber = key;

      input = document.createElement('input');

      input.type = 'range';
      input.step = '1';

      input.setAttribute(
        'aria-label',
        key === 'salesByHour'
          ? 'Adjust visible hour density'
          : 'Adjust visible date density'
      );

      control.appendChild(input);
      body.appendChild(control);

      input.addEventListener('input', () => {
        const visible =
          Number(input.value);

        zoomState.set(key, visible);
        updateTrack(input);

        const previousFrame =
          inputRenderFrames.get(key);

        if (previousFrame) {
          cancelAnimationFrame(
            previousFrame
          );
        }

        const frameId =
          requestAnimationFrame(() => {
            inputRenderFrames.delete(key);

            const currentCard =
              getCard(key);

            const currentFrame =
              getFrame(currentCard);

            const currentSvg =
              getSvg(currentFrame);

            if (!currentSvg) {
              return;
            }

            /*
             * Sales over time:
             * - Bar را فقط V1.3.7.5 Render می‌کند.
             * - Line را فقط V1.3.8.4 Render می‌کند.
             *
             * در Line دیگر restoreOriginal/applyZoom اجرا نمی‌شود؛
             * بنابراین نمودار قدیمی وسط Drag چشمک نمی‌زند.
             */
            if (
              key === 'salesOverTime' &&
              !isBarChart(currentSvg)
            ) {
              /*
               * PMD V1.3.9.7:
               * Pass the live slider value into the Line authority.
               *
               * apply() only redraws the existing selectedVisible state.
               * setVisible(visible) updates state and then redraws.
               */
              window
                .PMDDashboard2RealLineV1384
                ?.setVisible?.(visible);

              window
                .PMDDashboard2SalesAxisV1393
                ?.refresh?.();

              return;
            }

            applyZoom(key, visible);

            if (key === 'salesOverTime') {
              window
                .PMDDashboard2SalesAxisV1393
                ?.refresh?.();
            }
          });

        inputRenderFrames.set(
          key,
          frameId
        );
      });
    } else {
      input = control.querySelector(
        'input[type="range"]'
      );
    }

    const total = groups.length;

    input.min = String(
      Math.min(
        config.minimumVisible,
        Math.max(1, total)
      )
    );

    input.max = String(
      Math.max(1, total)
    );

    /*
     * شروع پیش‌فرض:
     * تمام بازه دیده می‌شود.
     * کاربر با حرکت نقطه به چپ Zoom می‌کند.
     */
    /*
     * PMD_DASHBOARD2_V1420_RANGE_DEFAULT_MAX
     *
     * Both time-based chart scrubbers start at the far-right
     * maximum position after every complete page refresh.
     */
    const canonicalDefault =
      total;

    const storedValue =
      zoomState.has(key)
        ? zoomState.get(key)
        : canonicalDefault;

    const safeValue = Math.max(
      Number(input.min),
      Math.min(
        Number(storedValue) || total,
        total
      )
    );

    input.value = String(safeValue);
    zoomState.set(key, safeValue);

    const lineMode =
      config.barOnly &&
      !isBarChart(svg);

    /*
     * PMD V1.3.8.4:
     * Keep the existing range control visible in line mode.
     * The real line-window authority below owns line rendering.
     */
    control.hidden =
      total <= config.minimumVisible;

    updateTrack(input);

    if (lineMode) {
      /*
       * V1.3.9.6:
       * Line rendering belongs exclusively to V1.3.8.4.
       * Do not restore the original/native axis here.
       */
      return {
        key,
        installed: true,
        active: false,
        reason: 'line-mode'
      };
    }

    return {
      key,
      installed: true,
      active: true,
      minimumVisible:
        Number(input.min),
      maximumVisible:
        Number(input.max),
      currentVisible:
        safeValue,
      result: applyZoom(
        key,
        safeValue
      )
    };
  }

  function applyAll(reason) {
    addStyles();

    const result = Object.keys(CONFIG).map(
      installControl
    );

    console.info(
      '[PMD Dashboard2 Zoom Density Scrubber V1.3.7.5] Applied',
      {
        reason,
        result
      }
    );

    return result;
  }

  let scheduledApplyFrame = null;

  function scheduleApply(reason) {
    if (scheduledApplyFrame) {
      cancelAnimationFrame(
        scheduledApplyFrame
      );
    }

    scheduledApplyFrame =
      requestAnimationFrame(() => {
        scheduledApplyFrame = null;
        applyAll(reason);
      });
  }

  /*
   * تغییر Line/Balken ممکن است SVG را از نو بسازد.
   */
  /*
   * V1.3.9.6:
   * Chart mode switching is owned by
   * PMDDashboard2ChartAuthorityV1392.
   *
   * The legacy V1.3.7.5 mode-click scheduler was removed
   * because it rendered an old axis after the canonical render.
   */

  window.PMDDashboard2ZoomDensityV1375 = {
    version: '1.3.7.5',

    refresh() {
      return applyAll('manual-refresh');
    },

    reset(key) {
      const keys = key
        ? [key]
        : Object.keys(CONFIG);

      keys.forEach(cardKey => {
        const card = getCard(cardKey);

        const input = card?.querySelector(
          '.pmd-dashboard2-zoom-scrubber-v1375 input'
        );

        if (!input) {
          return;
        }

        input.value = input.max;

        zoomState.set(
          cardKey,
          Number(input.max)
        );

        updateTrack(input);

        applyZoom(
          cardKey,
          Number(input.max)
        );
      });

      return this.audit();
    },

    audit() {
      const cards = {};

      Object.keys(CONFIG).forEach(key => {
        const card = getCard(key);
        const frame = getFrame(card);
        const svg = getSvg(frame);

        const control = card?.querySelector(
          '.pmd-dashboard2-zoom-scrubber-v1375'
        );

        const input = control?.querySelector(
          'input[type="range"]'
        );

        const groups = svg
          ? getPointGroups(svg)
          : [];

        const visibleGroups =
          groups.filter(group => {
            return (
              getComputedStyle(group).display !==
              'none'
            );
          });

        const controlRect =
          control?.getBoundingClientRect();

        const cardRect =
          card?.getBoundingClientRect();

        cards[key] = {
          cardFound: Boolean(card),
          svgFound: Boolean(svg),

          chartMode: svg
            ? isBarChart(svg)
              ? 'bar'
              : 'line'
            : null,

          viewBox:
            svg?.getAttribute('viewBox') ||
            null,

          controlFound:
            Boolean(control),

          controlHidden:
            control
              ? control.hidden
              : null,

          controlInsideCard:
            controlRect && cardRect
              ? (
                  controlRect.top >=
                    cardRect.top &&
                  controlRect.bottom <=
                    cardRect.bottom
                )
              : null,

          controlBottomGap:
            controlRect && cardRect
              ? Math.round(
                  cardRect.bottom -
                  controlRect.bottom
                )
              : null,

          minimumVisible:
            input
              ? Number(input.min)
              : null,

          maximumVisible:
            input
              ? Number(input.max)
              : null,

          selectedVisible:
            input
              ? Number(input.value)
              : null,

          totalPoints:
            groups.length,

          visiblePoints:
            visibleGroups.length,

          generatedLabels:
            svg
              ? svg.querySelectorAll(
                  '.pmd-dashboard2-zoom-axis-v1375 text'
                ).length
              : 0
        };
      });

      const result = {
        version: '1.3.7.5',
        behavior:
          'zoom-density-not-pan',
        cards
      };

      console.log(result);

      return result;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        scheduleApply('dom-ready');
      },
      { once: true }
    );
  } else {
    scheduleApply('already-ready');
  }
})();


/* PMD_DASHBOARD2_V1376_WIDER_CHART_BARS
 *
 * V1.3.7.6:
 * - Keeps the V1.3.7.5 scrubber in its current position.
 * - Uses wider bars in both full-range and zoom-range modes.
 * - Does not alter values, Y-axis, grid, dates or viewBox.
 */

/* PMD_DASHBOARD2_V1377_DEFAULT_DENSITY */
(function () {
  'use strict';

  const PATCH_KEY = 'PMD_DASHBOARD2_V1377_DEFAULT_DENSITY';

  if (window[PATCH_KEY]) {
    return;
  }

  window[PATCH_KEY] = true;

  const DEFAULTS = Object.freeze({
    salesOverTime: 19,
    salesByHour: 15
  });

  function applyDefault(key, reason) {
    const card = document.querySelector(
      `[data-pmd-analytics-widget="${key}"]`
    );

    if (!card) {
      return {
        key,
        applied: false,
        reason: 'card-not-found'
      };
    }

    const range = card.querySelector(
      'input[type="range"]'
    );

    if (!range) {
      return {
        key,
        applied: false,
        reason: 'range-not-found'
      };
    }

    if (
      range.dataset.pmdDefaultDensityApplied === 'true'
    ) {
      return {
        key,
        applied: false,
        reason: 'already-applied',
        value: Number(range.value)
      };
    }

    const min = Number(range.min || 1);
    const max = Number(range.max || 100);
    /*
     * PMD_DASHBOARD2_V1420_RANGE_DEFAULT_MAX
     *
     * A chart-mode reconstruction must also restore the
     * range thumb to the current maximum, not 19 or 15.
     */
    const requested = max;

    const safeValue = Math.max(
      min,
      Math.min(max, requested)
    );

    range.value = String(safeValue);
    range.dataset.pmdDefaultDensityApplied = 'true';

    range.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );

    range.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );

    return {
      key,
      applied: true,
      reason,
      min,
      max,
      requested,
      finalValue: Number(range.value)
    };
  }

  function applyAll(reason) {
    const result = Object.keys(DEFAULTS).map(
      key => applyDefault(key, reason)
    );

    console.info(
      '[PMD Dashboard2 Default Density V1.3.7.7] Applied',
      {
        reason,
        result
      }
    );

    return result;
  }

  function scheduleApply() {
    /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT: V1375 now owns the synchronous defaults. */
    return [];
  }

  document.addEventListener(
    'click',
    event => {
      const toggle = event.target.closest(
        '[data-pmd-chart-mode]'
      );

      if (!toggle) {
        return;
      }

      window.setTimeout(
        () => applyAll('chart-mode-change'),
        80
      );

      window.setTimeout(
        () => applyAll('chart-mode-change-late'),
        260
      );
    },
    true
  );

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      scheduleApply,
      {
        once: true
      }
    );
  } else {
    scheduleApply();
  }

  window.PMDDashboard2DefaultDensityV1377 = {
    version: '1.3.7.7',

    apply() {
      return applyAll('manual');
    },

    resetMarkers() {
      document
        .querySelectorAll(
          '[data-pmd-analytics-widget] input[type="range"]'
        )
        .forEach(range => {
          delete range.dataset
            .pmdDefaultDensityApplied;
        });

      return applyAll('manual-reset');
    },

    audit() {
      const cards = {};

      Object.entries(DEFAULTS).forEach(
        ([key, expectedDefault]) => {
          const card = document.querySelector(
            `[data-pmd-analytics-widget="${key}"]`
          );

          const range = card?.querySelector(
            'input[type="range"]'
          );

          cards[key] = {
            cardFound: Boolean(card),
            rangeFound: Boolean(range),
            min: range
              ? Number(range.min)
              : null,
            max: range
              ? Number(range.max)
              : null,
            currentValue: range
              ? Number(range.value)
              : null,
            expectedDefault,
            defaultApplied:
              range?.dataset
                .pmdDefaultDensityApplied ===
              'true'
          };
        }
      );

      const result = {
        version: '1.3.7.7',
        behavior:
          'initial-density-only-user-remains-free',
        cards
      };

      console.log(result);
      return result;
    }
  };
})();

/* PMD_DASHBOARD2_V1380_STABLE_PILL_AUTHORITY */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1380_STABLE_PILL_AUTHORITY';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const KEYS = [
    'salesOverTime',
    'salesByHour'
  ];

  function getCard(key) {
    return document.querySelector(
      `[data-pmd-analytics-widget="${key}"]`
    );
  }

  function normalizeCard(key) {
    const card = getCard(key);

    if (!card) {
      return {
        key,
        ok: false,
        reason: 'card-not-found'
      };
    }

    const header =
      card.querySelector(':scope > header') ||
      card.querySelector('header');

    const body = card.querySelector(
      '[data-pmd-widget-body]'
    );

    if (!header || !body) {
      return {
        key,
        ok: false,
        reason: 'header-or-body-not-found'
      };
    }

    const bodyPills = Array.from(
      body.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
    );

    const headerPills = Array.from(
      header.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
    );

    /*
     * Renderer جدیدترین Pill را داخل Body می‌سازد.
     * به‌جای نمایش آن و حذف بعدی، ابتدا نامرئی می‌شود.
     */
    bodyPills.forEach(pill => {
      pill.style.setProperty(
        'visibility',
        'hidden',
        'important'
      );
    });

    const newest =
      bodyPills.at(-1) ||
      headerPills.at(-1) ||
      null;

    if (!newest) {
      return {
        key,
        ok: false,
        reason: 'pill-not-found'
      };
    }

    /*
     * قبل از نمایش Pill جدید، تمام نسخه‌های قدیمی حذف می‌شوند.
     * بنابراین هیچ Frame قابل‌دیدنی با دو Pill وجود ندارد.
     */
    Array.from(
      card.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
    ).forEach(pill => {
      if (pill !== newest) {
        pill.remove();
      }
    });

    const toggle = header.querySelector(
      '.pmd-dashboard2-chart-toggle'
    );

    if (newest.parentElement !== header) {
      if (toggle) {
        header.insertBefore(newest, toggle);
      } else {
        header.appendChild(newest);
      }
    }

    newest.style.removeProperty('visibility');
    newest.style.removeProperty('display');
    newest.dataset.pmdStablePillV1380 = 'true';

    return {
      key,
      ok: true,
      headerCount: header.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      ).length,
      bodyCount: body.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      ).length
    };
  }

  function normalizeAll(reason) {
    const result = KEYS.map(normalizeCard);

    console.info(
      '[PMD Dashboard2 Stable Pill Authority V1.3.8.0]',
      {
        reason,
        result
      }
    );

    return result;
  }

  /*
   * Capture phase:
   * هنگام کلیک، Body موقتاً Clip می‌شود تا Pill جدید Renderer
   * قبل از انتقال دیده نشود.
   */
  document.addEventListener(
    'pointerdown',
    event => {
      const button = event.target.closest(
        '[data-pmd-chart-mode]'
      );

      if (!button) return;

      const card = button.closest(
        '[data-pmd-analytics-widget]'
      );

      const body = card?.querySelector(
        '[data-pmd-widget-body]'
      );

      if (body) {
        body.dataset.pmdPillTransitionV1380 = 'true';
      }
    },
    true
  );

  document.addEventListener(
    'click',
    event => {
      const button = event.target.closest(
        '[data-pmd-chart-mode]'
      );

      if (!button) return;

      const card = button.closest(
        '[data-pmd-analytics-widget]'
      );

      /*
       * فقط یک مرحله پس از Render؛ نه 0/80/220/600ms.
       */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          normalizeAll('chart-toggle');

          const body = card?.querySelector(
            '[data-pmd-widget-body]'
          );

          if (body) {
            delete body.dataset.pmdPillTransitionV1380;
          }
        });
      });
    },
    true
  );

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        requestAnimationFrame(() => {
          normalizeAll('DOMContentLoaded');
        });
      },
      { once: true }
    );
  } else {
    requestAnimationFrame(() => {
      normalizeAll('ready');
    });
  }

  window.PMDDashboard2StablePillV1380 = {
    version: '1.3.8.0',

    apply() {
      return normalizeAll('manual');
    },

    audit() {
      const cards = {};

      KEYS.forEach(key => {
        const card = getCard(key);
        const header =
          card?.querySelector(':scope > header') ||
          card?.querySelector('header');

        const body = card?.querySelector(
          '[data-pmd-widget-body]'
        );

        cards[key] = {
          cardFound: Boolean(card),
          headerPillCount:
            header?.querySelectorAll(
              '.pmd-dashboard2-chart-key'
            ).length || 0,
          bodyPillCount:
            body?.querySelectorAll(
              '.pmd-dashboard2-chart-key'
            ).length || 0
        };
      });

      const result = {
        version: '1.3.8.0',
        cards
      };

      console.log(result);
      return result;
    }
  };
})();

/* PMD_DASHBOARD2_V1382_HOURLY_TODAY_TRAILING_TIGHT */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1382_HOURLY_TODAY_TRAILING_TIGHT';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesByHour"]';

  const CONTROL_SELECTOR =
    '.pmd-dashboard2-zoom-scrubber-v1375';

  const DESIRED_CHART_GAP = 18;
  const DESIRED_BOTTOM_GAP = 16;

  const state = {
    applies: 0,
    observerInstalled: false,
    layoutGuardReverted: false,
    lastReason: null,
    lastDesiredBodyHeight: null,
    beforeSvg: null,
    afterSvg: null
  };

  let queued = false;
  let observer = null;

  function getParts() {
    const card =
      document.querySelector(CARD_SELECTOR);

    const body = card?.querySelector(
      '[data-pmd-widget-body]'
    );

    const frame = card?.querySelector(
      '.pmd-dashboard2-chart-frame'
    );

    const svg = frame?.querySelector(
      'svg.pmd-dashboard2-chart, svg'
    );

    const control = card?.querySelector(
      CONTROL_SELECTOR
    );

    const range = control?.querySelector(
      'input[type="range"]'
    );

    return {
      card,
      body,
      frame,
      svg,
      control,
      range
    };
  }

  function rectSnapshot(element) {
    if (!element) return null;

    const rect =
      element.getBoundingClientRect();

    return {
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      top: Math.round(rect.top * 10) / 10,
      bottom: Math.round(rect.bottom * 10) / 10
    };
  }

  function applyLayout(reason) {
    const {
      card,
      body,
      frame,
      svg,
      control
    } = getParts();

    if (
      !card ||
      !body ||
      !frame ||
      !svg ||
      !control
    ) {
      return {
        applied: false,
        reason: 'card-body-frame-svg-or-control-not-found',
        trigger: reason
      };
    }

    state.applies += 1;
    state.lastReason = reason;
    state.layoutGuardReverted = false;

    /*
     * Only the second hourly card is touched.
     */
    card.style.setProperty(
      'align-self',
      'start',
      'important'
    );

    card.style.setProperty(
      'height',
      'auto',
      'important'
    );

    card.style.setProperty(
      'min-height',
      '0',
      'important'
    );

    card.style.setProperty(
      'padding-bottom',
      '0',
      'important'
    );

    body.style.setProperty(
      'position',
      'relative',
      'important'
    );

    body.style.setProperty(
      'box-sizing',
      'border-box',
      'important'
    );

    body.style.setProperty(
      'padding-bottom',
      '0',
      'important'
    );

    body.style.setProperty(
      'overflow',
      'visible',
      'important'
    );

    frame.style.setProperty(
      'margin-bottom',
      '0',
      'important'
    );

    control.style.setProperty(
      'bottom',
      `${DESIRED_BOTTOM_GAP}px`,
      'important'
    );

    const beforeSvg =
      rectSnapshot(svg);

    const bodyRect =
      body.getBoundingClientRect();

    const svgRect =
      svg.getBoundingClientRect();

    const controlRect =
      control.getBoundingClientRect();

    const controlHeight =
      Math.max(
        18,
        controlRect.height || 18
      );

    const svgBottomInsideBody =
      Math.max(
        0,
        svgRect.bottom - bodyRect.top
      );

    const desiredBodyHeight =
      Math.ceil(
        svgBottomInsideBody +
        DESIRED_CHART_GAP +
        controlHeight +
        DESIRED_BOTTOM_GAP
      );

    state.beforeSvg = beforeSvg;
    state.lastDesiredBodyHeight =
      desiredBodyHeight;

    body.style.setProperty(
      'height',
      `${desiredBodyHeight}px`,
      'important'
    );

    body.style.setProperty(
      'min-height',
      `${desiredBodyHeight}px`,
      'important'
    );

    requestAnimationFrame(() => {
      const afterSvg =
        rectSnapshot(svg);

      state.afterSvg = afterSvg;

      /*
       * Safety guard:
       * compacting the card must never resize the chart SVG.
       */
      const changed =
        beforeSvg &&
        afterSvg &&
        (
          Math.abs(
            beforeSvg.width - afterSvg.width
          ) > 2 ||
          Math.abs(
            beforeSvg.height - afterSvg.height
          ) > 2
        );

      if (changed) {
        body.style.removeProperty('height');
        body.style.removeProperty('min-height');

        state.layoutGuardReverted = true;

        console.warn(
          '[PMD Dashboard2 Hourly Today V1.3.8.2] ' +
          'Card compaction reverted because SVG size changed.',
          {
            beforeSvg,
            afterSvg
          }
        );
      }
    });

    return {
      applied: true,
      trigger: reason,
      desiredBodyHeight,
      beforeSvg
    };
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;
      applyLayout(reason);
    });
  }

  function installObserver() {
    if (state.observerInstalled) return true;

    const { body } = getParts();

    if (!body) return false;

    observer = new MutationObserver(() => {
      queueApply('hourly-body-render');
    });

    observer.observe(body, {
      childList: true,
      subtree: true
    });

    state.observerInstalled = true;

    return true;
  }

  function schedule(reason) {
    [
      0,
      120,
      320,
      750,
      1300,
      1900
    ].forEach(delay => {
      window.setTimeout(() => {
        installObserver();
        queueApply(`${reason}-${delay}`);
      }, delay);
    });
  }

  document.addEventListener(
    'click',
    event => {
      if (
        event.target.closest(
          '[data-pmd-analytics-period], ' +
          '[data-pmd-chart-mode]'
        )
      ) {
        schedule('chart-or-period-change');
      }
    },
    true
  );

  window.PMDDashboard2HourlyTodayV1382 = {
    version: '1.3.8.2',

    apply() {
      return applyLayout('manual');
    },

    audit() {
      const {
        card,
        body,
        svg,
        control,
        range
      } = getParts();

      const cardRect =
        rectSnapshot(card);

      const bodyRect =
        rectSnapshot(body);

      const svgRect =
        rectSnapshot(svg);

      const controlRect =
        rectSnapshot(control);

      const labels = svg
        ? Array.from(
            svg.querySelectorAll(
              '.pmd-dashboard2-zoom-axis-v1375 text'
            )
          ).map(label =>
            String(label.textContent || '').trim()
          )
        : [];

      const groups = svg
        ? Array.from(
            svg.querySelectorAll(
              'g.pmd-chart-focus-point'
            )
          ).filter(group =>
            group.querySelector('rect')
          )
        : [];

      const visibleGroups =
        groups.filter(group =>
          getComputedStyle(group).display !==
          'none'
        );

      const result = {
        version: '1.3.8.2',
        behavior:
          'today-until-now-trailing-window',

        cardFound: Boolean(card),
        bodyFound: Boolean(body),
        svgFound: Boolean(svg),
        controlFound: Boolean(control),
        rangeFound: Boolean(range),

        range: range
          ? {
              min: Number(range.min),
              max: Number(range.max),
              value: Number(range.value)
            }
          : null,

        totalPoints: groups.length,
        visiblePoints: visibleGroups.length,

        firstVisibleLabel:
          labels[0] || null,

        lastVisibleLabel:
          labels.at(-1) || null,

        chartToToolbarGap:
          svgRect && controlRect
            ? Math.round(
                controlRect.top -
                svgRect.bottom
              )
            : null,

        toolbarToCardBottom:
          controlRect && cardRect
            ? Math.round(
                cardRect.bottom -
                controlRect.bottom
              )
            : null,

        cardRect,
        bodyRect,
        svgRect,
        controlRect,

        layoutGuardReverted:
          state.layoutGuardReverted,

        beforeSvg:
          state.beforeSvg,

        afterSvg:
          state.afterSvg,

        applies:
          state.applies,

        lastReason:
          state.lastReason
      };

      console.log(result);
      return result;
    },

    stopObserver() {
      observer?.disconnect();
      observer = null;
      state.observerInstalled = false;

      return this.audit();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1384_REAL_LINE_WINDOW_SMOOTH */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1384_REAL_LINE_WINDOW_SMOOTH';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const SVG_NS =
    'http://www.w3.org/2000/svg';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const CONTROL_SELECTOR =
    '.pmd-dashboard2-zoom-scrubber-v1375';

  const GENERATED_PATH_CLASS =
    'pmd-dashboard2-real-smooth-line-v1384';

  const GENERATED_AXIS_CLASS =
    'pmd-dashboard2-real-line-axis-v1384';

  const MINIMUM_VISIBLE = 7;
  const DEFAULT_VISIBLE = 19;
  const LABEL_COUNT = 7;

  const state = {
    selectedVisible: null,
    applies: 0,
    lastReason: null,
    lastResult: null
  };

  let queued = false;

  function getParts() {
    const card =
      document.querySelector(CARD_SELECTOR);

    const body = card?.querySelector(
      '[data-pmd-widget-body]'
    );

    const frame = card?.querySelector(
      '.pmd-dashboard2-chart-frame'
    );

    const svg = frame?.querySelector(
      'svg.pmd-dashboard2-chart, svg'
    );

    const control = card?.querySelector(
      CONTROL_SELECTOR
    );

    const input = control?.querySelector(
      'input[type="range"]'
    );

    return {
      card,
      body,
      frame,
      svg,
      control,
      input
    };
  }

  function isBarChart(svg) {
    return Boolean(
      svg?.classList.contains(
        'is-bar-chart'
      )
    );
  }

  function getPolyline(svg) {
    return (
      svg?.querySelector(
        'polyline.pmd-chart-line'
      ) ||
      null
    );
  }

  function getGroups(svg) {
    return Array.from(
      svg?.querySelectorAll(
        'g.pmd-chart-focus-point'
      ) || []
    ).filter(group =>
      group.querySelector(
        'rect.pmd-chart-hit-target, rect'
      )
    );
  }

  function getCircles(svg) {
    return Array.from(
      svg?.querySelectorAll(
        'circle.pmd-chart-point, circle'
      ) || []
    );
  }

  function parsePoints(polyline) {
    const source = String(
      polyline?.getAttribute('points') || ''
    ).trim();

    if (!source) return [];

    return source
      .split(/\s+/)
      .map(pair => {
        const [rawX, rawY] =
          pair.split(',');

        const x = Number(rawX);
        const y = Number(rawY);

        return {
          x,
          y
        };
      })
      .filter(point =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
      );
  }

  function rememberOriginals(
    svg,
    polyline,
    groups,
    circles
  ) {
    if (
      polyline &&
      !polyline.dataset.pmdV1384OriginalPoints
    ) {
      polyline.dataset.pmdV1384OriginalPoints =
        polyline.getAttribute('points') || '';
    }

    groups.forEach((group, index) => {
      const rect = group.querySelector(
        'rect.pmd-chart-hit-target, rect'
      );

      if (!rect) return;

      group.dataset.pmdV1384Index =
        String(index);

      if (
        !group.dataset.pmdV1384Display
      ) {
        group.dataset.pmdV1384Display =
          group.style.display || '__EMPTY__';
      }

      [
        'x',
        'y',
        'width',
        'height'
      ].forEach(attribute => {
        const key =
          `pmdV1384${attribute[0].toUpperCase()}${attribute.slice(1)}`;

        if (!rect.dataset[key]) {
          rect.dataset[key] =
            rect.getAttribute(attribute) || '';
        }
      });
    });

    const originalPoints =
      parsePoints(polyline);

    circles.forEach(circle => {
      if (
        !circle.dataset.pmdV1384OriginalCx
      ) {
        circle.dataset.pmdV1384OriginalCx =
          circle.getAttribute('cx') || '0';
      }

      if (
        !circle.dataset.pmdV1384OriginalCy
      ) {
        circle.dataset.pmdV1384OriginalCy =
          circle.getAttribute('cy') || '0';
      }

      if (
        !circle.dataset.pmdV1384Display
      ) {
        circle.dataset.pmdV1384Display =
          circle.style.display || '__EMPTY__';
      }

      if (
        !circle.dataset.pmdV1384PointIndex
      ) {
        const cx = Number(
          circle.dataset.pmdV1384OriginalCx
        );

        let nearestIndex = -1;
        let nearestDistance = Infinity;

        originalPoints.forEach(
          (point, index) => {
            const distance =
              Math.abs(point.x - cx);

            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          }
        );

        circle.dataset.pmdV1384PointIndex =
          String(nearestIndex);
      }
    });
  }

  function addStyles() {
    if (
      document.getElementById(
        'pmd-dashboard2-v1384-style'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'pmd-dashboard2-v1384-style';

    style.textContent = `
      ${CARD_SELECTOR}
      .${GENERATED_PATH_CLASS} {
        fill: none !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        vector-effect: non-scaling-stroke;
        pointer-events: none;
      }

      ${CARD_SELECTOR}
      .${GENERATED_AXIS_CLASS} text {
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
  }

  function restoreDisplay(
    element,
    storedValue
  ) {
    if (!element) return;

    if (
      storedValue === '__EMPTY__' ||
      storedValue === undefined
    ) {
      element.style.removeProperty(
        'display'
      );
    } else {
      element.style.display =
        storedValue;
    }
  }

  function restoreOriginal() {
    const {
      svg
    } = getParts();

    if (!svg) return;

    svg.querySelector(
      `.${GENERATED_PATH_CLASS}`
    )?.remove();

    svg.querySelector(
      `.${GENERATED_AXIS_CLASS}`
    )?.remove();

    const polyline =
      getPolyline(svg);

    if (
      polyline?.dataset
        .pmdV1384OriginalPoints
    ) {
      polyline.setAttribute(
        'points',
        polyline.dataset
          .pmdV1384OriginalPoints
      );
    }

    polyline?.style.removeProperty(
      'display'
    );

    getGroups(svg).forEach(group => {
      const rect = group.querySelector(
        'rect.pmd-chart-hit-target, rect'
      );

      restoreDisplay(
        group,
        group.dataset.pmdV1384Display
      );

      if (!rect) return;

      const map = {
        x: 'pmdV1384X',
        y: 'pmdV1384Y',
        width: 'pmdV1384Width',
        height: 'pmdV1384Height'
      };

      Object.entries(map)
        .forEach(([attribute, key]) => {
          const value =
            rect.dataset[key];

          if (value !== undefined) {
            rect.setAttribute(
              attribute,
              value
            );
          }
        });
    });

    getCircles(svg).forEach(circle => {
      circle.setAttribute(
        'cx',
        circle.dataset
          .pmdV1384OriginalCx ||
        circle.getAttribute('cx')
      );

      circle.setAttribute(
        'cy',
        circle.dataset
          .pmdV1384OriginalCy ||
        circle.getAttribute('cy')
      );

      restoreDisplay(
        circle,
        circle.dataset
          .pmdV1384Display
      );
    });

    Array.from(
      svg.querySelectorAll(
        '.pmd-dashboard2-chart-axis-label.is-x-axis'
      )
    ).forEach(label => {
      label.style.removeProperty(
        'display'
      );
    });
  }

  /*
   * Smooth curve with horizontal control points.
   * It rounds each transition without overshooting
   * above or below the actual values.
   */
  function createRoundedPath(points) {
    if (!points.length) return '';

    if (points.length === 1) {
      return (
        `M ${points[0].x.toFixed(3)} ` +
        `${points[0].y.toFixed(3)}`
      );
    }

    let path =
      `M ${points[0].x.toFixed(3)} ` +
      `${points[0].y.toFixed(3)}`;

    for (
      let index = 1;
      index < points.length;
      index += 1
    ) {
      const previous =
        points[index - 1];

      const current =
        points[index];

      const middleX =
        (
          previous.x +
          current.x
        ) / 2;

      path +=
        ` C ${middleX.toFixed(3)}` +
        ` ${previous.y.toFixed(3)}` +
        ` ${middleX.toFixed(3)}` +
        ` ${current.y.toFixed(3)}` +
        ` ${current.x.toFixed(3)}` +
        ` ${current.y.toFixed(3)}`;
    }

    return path;
  }

  function getGroupLabel(group) {
    const source = String(
      group.getAttribute('aria-label') ||
      group.querySelector('title')
        ?.textContent ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();

    const german =
      source.match(
        /^(\d{1,2}\.\s+[A-Za-zÄÖÜäöü]+)/
      );

    if (german) {
      return german[1];
    }

    const english =
      source.match(
        /^([A-Za-z]+\s+\d{1,2})/
      );

    if (english) {
      return english[1];
    }

    return source
      .split(/[·.]/)[0]
      .trim();
  }

  function createAxis(
    svg,
    visibleGroups,
    xPositions
  ) {
    svg.querySelector(
      `.${GENERATED_AXIS_CLASS}`
    )?.remove();

    Array.from(
      svg.querySelectorAll(
        '.pmd-dashboard2-chart-axis-label.is-x-axis'
      )
    ).forEach(label => {
      label.style.setProperty(
        'display',
        'none',
        'important'
      );
    });

    const axis =
      document.createElementNS(
        SVG_NS,
        'g'
      );

    axis.setAttribute(
      'class',
      GENERATED_AXIS_CLASS
    );

    const count =
      visibleGroups.length;

    const targetLabelCount =
      Math.max(
        2,
        Math.min(
          LABEL_COUNT,
          count
        )
      );

    const labelStep =
      Math.max(
        1,
        Math.ceil(
          count / targetLabelCount
        )
      );

    visibleGroups.forEach(
      (group, index) => {
        const shouldShow =
          index === 0 ||
          index === count - 1 ||
          index % labelStep === 0;

        if (!shouldShow) return;

        const label =
          document.createElementNS(
            SVG_NS,
            'text'
          );

        label.setAttribute(
          'class',
          'pmd-dashboard2-chart-axis-label is-x-axis'
        );

        label.setAttribute(
          'x',
          xPositions[index].toFixed(3)
        );

        label.setAttribute(
          'y',
          '299'
        );

        label.setAttribute(
          'text-anchor',
          'middle'
        );

        label.textContent =
          getGroupLabel(group);

        axis.appendChild(label);
      }
    );

    svg.appendChild(axis);
  }

  function updateTrack(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);

    const percentage =
      max <= min
        ? 100
        : (
            (value - min) /
            (max - min)
          ) * 100;

    input.style.setProperty(
      '--pmd-zoom-progress',
      `${percentage}%`
    );
  }

  function applyLineWindow(reason) {
    addStyles();

    const {
      card,
      svg,
      control,
      input
    } = getParts();

    state.lastReason = reason;

    if (
      !card ||
      !svg ||
      !control ||
      !input
    ) {
      return {
        applied: false,
        reason:
          'card-svg-control-or-input-not-found',
        trigger: reason
      };
    }

    if (isBarChart(svg)) {
      restoreOriginal();

      return {
        applied: false,
        reason: 'bar-mode',
        trigger: reason
      };
    }

    const polyline =
      getPolyline(svg);

    const groups =
      getGroups(svg);

    const circles =
      getCircles(svg);

    if (
      !polyline ||
      groups.length === 0
    ) {
      return {
        applied: false,
        reason:
          'polyline-or-focus-groups-not-found',
        trigger: reason
      };
    }

    rememberOriginals(
      svg,
      polyline,
      groups,
      circles
    );

    const originalPoints =
      parsePoints({
        getAttribute(name) {
          if (name !== 'points') return '';

          return polyline.dataset
            .pmdV1384OriginalPoints ||
            polyline.getAttribute(
              'points'
            ) ||
            '';
        }
      });

    const total =
      Math.min(
        originalPoints.length,
        groups.length
      );

    if (!total) {
      return {
        applied: false,
        reason: 'real-line-points-not-found',
        trigger: reason
      };
    }

    const minimum =
      Math.max(
        1,
        Math.min(
          MINIMUM_VISIBLE,
          total
        )
      );

    input.min =
      String(minimum);

    input.max =
      String(total);

    input.step = '1';

    input.setAttribute(
      'aria-label',
      document.documentElement.lang
        .toLowerCase()
        .startsWith('de')
        ? 'Sichtbarer Datumsbereich'
        : 'Visible date range'
    );

    if (
      state.selectedVisible === null
    ) {
      const current =
        Number(input.value);

      state.selectedVisible =
        current >= minimum &&
        current <= total
          ? current
          : total;
    }

    const visibleCount =
      Math.max(
        minimum,
        Math.min(
          Number(
            state.selectedVisible
          ) || total,
          total
        )
      );

    state.selectedVisible =
      visibleCount;

    input.value =
      String(visibleCount);

    control.hidden = false;

    control.style.setProperty(
      'display',
      'flex',
      'important'
    );

    control.style.setProperty(
      'visibility',
      'visible',
      'important'
    );

    control.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    control.style.setProperty(
      'pointer-events',
      'auto',
      'important'
    );

    updateTrack(input);

    const startIndex =
      Math.max(
        0,
        total - visibleCount
      );

    const selectedOriginalPoints =
      originalPoints.slice(
        startIndex,
        total
      );

    const visibleGroups =
      groups.slice(
        startIndex,
        total
      );

    const plotLeft = 78;
    const plotRight = 882;
    const plotWidth =
      plotRight - plotLeft;

    const xPositions =
      selectedOriginalPoints.map(
        (_, index) => {
          if (
            selectedOriginalPoints.length === 1
          ) {
            return (
              plotLeft +
              plotWidth / 2
            );
          }

          return (
            plotLeft +
            plotWidth *
            (
              index /
              (
                selectedOriginalPoints.length -
                1
              )
            )
          );
        }
      );

    const renderedPoints =
      selectedOriginalPoints.map(
        (point, index) => ({
          x: xPositions[index],
          y: point.y,
          originalIndex:
            startIndex + index
        })
      );

    groups.forEach(group => {
      group.style.setProperty(
        'display',
        'none',
        'important'
      );
    });

    visibleGroups.forEach(
      (group, visibleIndex) => {
        const rect =
          group.querySelector(
            'rect.pmd-chart-hit-target, rect'
          );

        const renderedPoint =
          renderedPoints[visibleIndex];

        group.style.removeProperty(
          'display'
        );

        if (!rect) return;

        const originalWidth =
          Number(
            rect.dataset
              .pmdV1384Width
          ) || 18;

        const originalHeight =
          Number(
            rect.dataset
              .pmdV1384Height
          ) || 18;

        rect.setAttribute(
          'x',
          (
            renderedPoint.x -
            originalWidth / 2
          ).toFixed(3)
        );

        rect.setAttribute(
          'y',
          (
            renderedPoint.y -
            originalHeight / 2
          ).toFixed(3)
        );

        rect.setAttribute(
          'width',
          originalWidth.toFixed(3)
        );

        rect.setAttribute(
          'height',
          originalHeight.toFixed(3)
        );
      }
    );

    circles.forEach(circle => {
      const originalIndex =
        Number(
          circle.dataset
            .pmdV1384PointIndex
        );

      if (
        !Number.isInteger(originalIndex) ||
        originalIndex < startIndex ||
        originalIndex >= total
      ) {
        circle.style.setProperty(
          'display',
          'none',
          'important'
        );

        return;
      }

      const visibleIndex =
        originalIndex - startIndex;

      const point =
        renderedPoints[visibleIndex];

      circle.style.removeProperty(
        'display'
      );

      circle.setAttribute(
        'cx',
        point.x.toFixed(3)
      );

      circle.setAttribute(
        'cy',
        point.y.toFixed(3)
      );
    });

    svg.querySelector(
      `.${GENERATED_PATH_CLASS}`
    )?.remove();

    const generatedPath =
      document.createElementNS(
        SVG_NS,
        'path'
      );

    generatedPath.setAttribute(
      'class',
      `pmd-chart-line ${GENERATED_PATH_CLASS}`
    );

    generatedPath.setAttribute(
      'd',
      createRoundedPath(
        renderedPoints
      )
    );

    const lineStyle =
      getComputedStyle(polyline);

    generatedPath.style.setProperty(
      'fill',
      'none',
      'important'
    );

    generatedPath.style.setProperty(
      'stroke',
      (
        lineStyle.stroke &&
        lineStyle.stroke !== 'none'
          ? lineStyle.stroke
          : '#0aa579'
      ),
      'important'
    );

    generatedPath.style.setProperty(
      'stroke-width',
      (
        lineStyle.strokeWidth &&
        lineStyle.strokeWidth !== '0px'
          ? lineStyle.strokeWidth
          : '4px'
      ),
      'important'
    );

    generatedPath.style.setProperty(
      'stroke-linecap',
      'round',
      'important'
    );

    generatedPath.style.setProperty(
      'stroke-linejoin',
      'round',
      'important'
    );

    polyline.insertAdjacentElement(
      'afterend',
      generatedPath
    );

    polyline.style.setProperty(
      'display',
      'none',
      'important'
    );

    /*
     * Keep interactive groups and visible point circles
     * above the rendered line.
     */
    visibleGroups.forEach(group => {
      svg.appendChild(group);
    });

    circles
      .filter(circle =>
        getComputedStyle(circle)
          .display !== 'none'
      )
      .forEach(circle => {
        svg.appendChild(circle);
      });

    createAxis(
      svg,
      visibleGroups,
      xPositions
    );

    state.applies += 1;

    const result = {
      applied: true,
      trigger: reason,
      mode: 'line',
      source:
        'polyline-plus-focus-groups',

      totalPoints: total,
      totalGroups:
        groups.length,

      totalNonZeroCircles:
        circles.length,

      visiblePoints:
        renderedPoints.length,

      visibleGroups:
        visibleGroups.length,

      startIndex,
      endIndex: total - 1,

      minimumVisible:
        minimum,

      maximumVisible:
        total,

      selectedVisible:
        visibleCount,

      firstLabel:
        getGroupLabel(
          visibleGroups[0]
        ),

      lastLabel:
        getGroupLabel(
          visibleGroups.at(-1)
        ),

      smoothPathFound:
        Boolean(generatedPath),

      viewBox:
        svg.getAttribute(
          'viewBox'
        )
    };

    state.lastResult = result;

    /*
     * Avoid one console message for every pixel of slider movement.
     * Keep useful boot, mode-change, manual and final-change logs.
     */
    if (reason !== 'line-range-input') {
      console.info(
        '[PMD Dashboard2 Real Line Window Smooth V1.3.8.4]',
        result
      );
    }

    return result;
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;
      applyLineWindow(reason);
    });
  }

  function schedule(reason) {
    [
      0,
      100,
      260,
      600,
      1000,
      1450,
      2100
    ].forEach(delay => {
      window.setTimeout(() => {
        queueApply(
          `${reason}-${delay}`
        );
      }, delay);
    });
  }

  /*
   * V1.3.9.6:
   * Range input is handled once by V1.3.7.5,
   * which calls PMDDashboard2RealLineV1384.apply()
   * only when the current chart is Line.
   */

  /*
   * V1.3.9.6:
   * Duplicate range-change listener removed.
   */

  /*
   * V1.3.9.6:
   * Seven delayed chart-mode renders removed.
   * V1.3.9.2 is the sole chart-mode authority.
   */

  window.PMDDashboard2RealLineV1384 = {
    version: '1.3.8.4',

    apply() {
      return applyLineWindow(
        'manual'
      );
    },

    setVisible(value) {
      state.selectedVisible =
        Number(value);

      return applyLineWindow(
        'manual-set-visible'
      );
    },

    reset() {
      state.selectedVisible = null;

      return applyLineWindow(
        'manual-reset'
      );
    },

    audit() {
      const {
        card,
        svg,
        control,
        input
      } = getParts();

      const polyline =
        getPolyline(svg);

      const generatedPath =
        svg?.querySelector(
          `.${GENERATED_PATH_CLASS}`
        );

      const groups =
        getGroups(svg);

      const visibleGroups =
        groups.filter(group =>
          getComputedStyle(group)
            .display !== 'none'
        );

      const result = {
        version: '1.3.8.4',

        cardFound:
          Boolean(card),

        svgFound:
          Boolean(svg),

        chartMode:
          svg
            ? isBarChart(svg)
              ? 'bar'
              : 'line'
            : null,

        polylineFound:
          Boolean(polyline),

        originalPolylineHidden:
          polyline
            ? getComputedStyle(polyline)
                .display === 'none'
            : null,

        generatedSmoothPathFound:
          Boolean(generatedPath),

        generatedPathStart:
          generatedPath
            ?.getAttribute('d')
            ?.slice(0, 180) ||
          null,

        strokeLinecap:
          generatedPath
            ? getComputedStyle(
                generatedPath
              ).strokeLinecap
            : null,

        strokeLinejoin:
          generatedPath
            ? getComputedStyle(
                generatedPath
              ).strokeLinejoin
            : null,

        controlFound:
          Boolean(control),

        controlHidden:
          control
            ? control.hidden
            : null,

        controlDisplay:
          control
            ? getComputedStyle(control)
                .display
            : null,

        range: input
          ? {
              min: Number(input.min),
              max: Number(input.max),
              value:
                Number(input.value)
            }
          : null,

        totalGroups:
          groups.length,

        visibleGroups:
          visibleGroups.length,

        viewBox:
          svg?.getAttribute(
            'viewBox'
          ) || null,

        applies:
          state.applies,

        lastReason:
          state.lastReason,

        lastResult:
          state.lastResult
      };

      console.log(result);
      return result;
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1385_CLEAN_LINE_AREA_LOGS */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1385_CLEAN_LINE_AREA_LOGS';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const state = {
    applies: 0,
    lastReason: null,
    hiddenAreaCount: 0
  };

  let queued = false;

  function getSvg() {
    return document.querySelector(
      `${CARD_SELECTOR} ` +
      '.pmd-dashboard2-chart-frame ' +
      'svg.pmd-dashboard2-chart'
    );
  }

  function isLineMode(svg) {
    return Boolean(
      svg?.classList.contains(
        'is-line-chart'
      )
    );
  }

  function isGeneratedSmoothPath(element) {
    return element.classList.contains(
      'pmd-dashboard2-real-smooth-line-v1384'
    );
  }

  function isAreaElement(element) {
    if (
      element.tagName.toLowerCase() ===
      'polygon'
    ) {
      return true;
    }

    const className =
      element.getAttribute('class') || '';

    const fill =
      element.getAttribute('fill') || '';

    const computedFill =
      getComputedStyle(element).fill || '';

    return (
      /area|gradient|fill/i.test(className) ||
      /pmd-sales-area-gradient/i.test(fill) ||
      /pmd-sales-area-gradient/i.test(computedFill)
    );
  }

  function getAreaElements(svg) {
    if (!svg) return [];

    return Array.from(
      svg.querySelectorAll(
        'polygon, path'
      )
    ).filter(element =>
      !isGeneratedSmoothPath(element) &&
      isAreaElement(element)
    );
  }

  function rememberDisplay(element) {
    if (
      element.dataset
        .pmdV1385OriginalDisplay ===
      undefined
    ) {
      element.dataset
        .pmdV1385OriginalDisplay =
        element.style.display || '__EMPTY__';
    }
  }

  function restoreDisplay(element) {
    const value =
      element.dataset
        .pmdV1385OriginalDisplay;

    if (
      value === undefined ||
      value === '__EMPTY__'
    ) {
      element.style.removeProperty(
        'display'
      );
    } else {
      element.style.display = value;
    }
  }

  function apply(reason) {
    const svg = getSvg();

    state.lastReason = reason;

    if (!svg) {
      return {
        applied: false,
        reason: 'svg-not-found',
        trigger: reason
      };
    }

    const areas =
      getAreaElements(svg);

    areas.forEach(rememberDisplay);

    if (isLineMode(svg)) {
      areas.forEach(element => {
        element.style.setProperty(
          'display',
          'none',
          'important'
        );
      });

      state.hiddenAreaCount =
        areas.length;
    } else {
      areas.forEach(restoreDisplay);

      state.hiddenAreaCount = 0;
    }

    state.applies += 1;

    return {
      applied: true,
      trigger: reason,
      chartMode:
        isLineMode(svg)
          ? 'line'
          : 'bar',
      detectedAreaCount:
        areas.length,
      hiddenAreaCount:
        state.hiddenAreaCount
    };
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;
      apply(reason);
    });
  }

  function schedule(reason) {
    [
      0,
      100,
      260,
      600,
      1100,
      1800
    ].forEach(delay => {
      window.setTimeout(() => {
        queueApply(
          `${reason}-${delay}`
        );
      }, delay);
    });
  }

  /*
   * V1.3.9.6:
   * Legacy Area input listener removed.
   * V1.3.9.3 owns final Line cleanup.
   */

  /*
   * V1.3.9.6:
   * Legacy Area change listener removed.
   */

  /*
   * V1.3.9.6:
   * Six delayed Area mode renders removed.
   */

  window.PMDDashboard2CleanLineV1385 = {
    version: '1.3.8.5',

    apply() {
      return apply('manual');
    },

    audit() {
      const svg = getSvg();

      const areas =
        getAreaElements(svg);

      const result = {
        version: '1.3.8.5',

        svgFound:
          Boolean(svg),

        chartMode:
          svg
            ? isLineMode(svg)
              ? 'line'
              : 'bar'
            : null,

        detectedAreaCount:
          areas.length,

        visibleAreaCount:
          areas.filter(element =>
            getComputedStyle(element)
              .display !== 'none'
          ).length,

        hiddenAreaCount:
          areas.filter(element =>
            getComputedStyle(element)
              .display === 'none'
          ).length,

        smoothPathFound:
          Boolean(
            svg?.querySelector(
              '.pmd-dashboard2-real-smooth-line-v1384'
            )
          ),

        applies:
          state.applies,

        lastReason:
          state.lastReason
      };

      console.log(result);
      return result;
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1389_PAYMENT_COMPACT_OUTER */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1389_PAYMENT_COMPACT_OUTER';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const PAYMENT_SELECTOR =
    '[data-pmd-analytics-widget="paymentMethods"]';

  const HOURLY_SELECTOR =
    '[data-pmd-analytics-widget="salesByHour"]';

  const DESKTOP_MIN_WIDTH = 900;
  const SAFE_BOTTOM_PADDING = 18;

  const state = {
    applies: 0,
    targetHeight: null,
    paymentHeightBefore: null,
    paymentHeightAfter: null,
    bodyHeightBefore: null,
    bodyHeightAfter: null,
    svgHeightBefore: null,
    svgHeightAfter: null,
    contentFits: null,
    lastReason: null
  };

  let queued = false;

  function getParts() {
    const payment =
      document.querySelector(PAYMENT_SELECTOR);

    const hourly =
      document.querySelector(HOURLY_SELECTOR);

    const body =
      payment?.querySelector(
        '[data-pmd-widget-body]'
      );

    const svg =
      body?.querySelector('svg');

    return {
      payment,
      hourly,
      body,
      svg
    };
  }

  function heightOf(element) {
    if (!element) return null;

    return Math.round(
      element.getBoundingClientRect().height
    );
  }

  function clearPaymentOverrides(payment) {
    if (!payment) return;

    payment.style.removeProperty('height');
    payment.style.removeProperty('min-height');
    payment.style.removeProperty('max-height');
    payment.style.removeProperty('align-self');
  }

  function getContentBottom(payment) {
    if (!payment) return null;

    const paymentRect =
      payment.getBoundingClientRect();

    const visibleChildren = Array.from(
      payment.querySelectorAll(
        ':scope > header, ' +
        ':scope > [data-pmd-widget-body]'
      )
    ).filter(element => {
      const style =
        getComputedStyle(element);

      const rect =
        element.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.height > 0
      );
    });

    if (!visibleChildren.length) {
      return null;
    }

    return Math.max(
      ...visibleChildren.map(element =>
        element.getBoundingClientRect().bottom -
        paymentRect.top
      )
    );
  }

  function apply(reason) {
    state.lastReason = reason;

    const {
      payment,
      hourly,
      body,
      svg
    } = getParts();

    if (!payment || !hourly) {
      return {
        applied: false,
        reason:
          'payment-or-hourly-card-not-found',
        trigger: reason
      };
    }

    if (
      window.innerWidth <
      DESKTOP_MIN_WIDTH
    ) {
      clearPaymentOverrides(payment);

      return {
        applied: false,
        reason:
          'mobile-layout-left-untouched',
        trigger: reason
      };
    }

    /*
     * Read the already-correct compact height
     * from Sales by hour. Do not modify that card.
     */
    const targetHeight =
      heightOf(hourly);

    if (
      !Number.isFinite(targetHeight) ||
      targetHeight < 350 ||
      targetHeight > 450
    ) {
      return {
        applied: false,
        reason:
          'invalid-hourly-reference-height',
        trigger: reason,
        targetHeight
      };
    }

    const paymentHeightBefore =
      heightOf(payment);

    const bodyHeightBefore =
      heightOf(body);

    const svgHeightBefore =
      heightOf(svg);

    const contentBottomBefore =
      getContentBottom(payment);

    const contentFits =
      Number.isFinite(contentBottomBefore) &&
      (
        contentBottomBefore +
        SAFE_BOTTOM_PADDING
      ) <= targetHeight;

    /*
     * Never crop content. Refuse the change when the current
     * title/body content cannot fit inside the reference height.
     */
    if (!contentFits) {
      return {
        applied: false,
        reason:
          'payment-content-does-not-fit-safely',
        trigger: reason,
        targetHeight,
        contentBottomBefore,
        requiredHeight:
          Number.isFinite(contentBottomBefore)
            ? Math.ceil(
                contentBottomBefore +
                SAFE_BOTTOM_PADDING
              )
            : null
      };
    }

    /*
     * Only move the bottom border upward.
     *
     * Do not touch:
     * - payment body
     * - donut SVG
     * - legend
     * - analytics grid rows
     * - Sales by hour
     */
    payment.style.setProperty(
      'height',
      `${targetHeight}px`,
      'important'
    );

    payment.style.setProperty(
      'min-height',
      `${targetHeight}px`,
      'important'
    );

    payment.style.setProperty(
      'max-height',
      `${targetHeight}px`,
      'important'
    );

    payment.style.setProperty(
      'align-self',
      'start',
      'important'
    );

    const paymentHeightAfter =
      heightOf(payment);

    const bodyHeightAfter =
      heightOf(body);

    const svgHeightAfter =
      heightOf(svg);

    /*
     * Immediate safety rollback if Donut or Body changed size.
     */
    if (
      bodyHeightBefore !==
        bodyHeightAfter ||
      svgHeightBefore !==
        svgHeightAfter
    ) {
      clearPaymentOverrides(payment);

      return {
        applied: false,
        reason:
          'safety-revert-body-or-svg-changed',
        trigger: reason,

        bodyHeightBefore,
        bodyHeightAfter,

        svgHeightBefore,
        svgHeightAfter
      };
    }

    state.applies += 1;
    state.targetHeight =
      targetHeight;
    state.paymentHeightBefore =
      paymentHeightBefore;
    state.paymentHeightAfter =
      paymentHeightAfter;
    state.bodyHeightBefore =
      bodyHeightBefore;
    state.bodyHeightAfter =
      bodyHeightAfter;
    state.svgHeightBefore =
      svgHeightBefore;
    state.svgHeightAfter =
      svgHeightAfter;
    state.contentFits =
      contentFits;

    return {
      applied: true,
      trigger: reason,

      reference:
        'salesByHour outer card',

      targetHeight,

      paymentHeightBefore,
      paymentHeightAfter,

      bodyHeightBefore,
      bodyHeightAfter,

      svgHeightBefore,
      svgHeightAfter,

      contentBottomBefore,
      safeBottomPadding:
        SAFE_BOTTOM_PADDING,

      contentFits
    };
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;

      const result =
        apply(reason);

      if (
        result.applied &&
        !reason.includes('resize')
      ) {
        console.info(
          '[PMD Dashboard2 Payment Compact Outer V1.3.8.9]',
          result
        );
      }
    });
  }

  function schedule(reason) {
    /*
     * PMD_DASHBOARD2_V1414_SCOPED_LATE_RENDER_FIX
     *
     * Try once per browser frame only until the canonical Payment and
     * Sales-by-hour cards exist and the compact height is applied.
     * Stop immediately after success.
     */
    let attempt = 0;
    const maxAttempts = 30;

    function tryApply() {
      attempt += 1;

      const result = apply(
        `${reason}-frame-${attempt}`
      );

      if (
        result.applied ||
        result.reason ===
          'mobile-layout-left-untouched' ||
        attempt >= maxAttempts
      ) {
        if (
          result.applied &&
          !reason.includes('resize')
        ) {
          console.info(
            '[PMD Dashboard2 Payment Compact Outer V1.3.8.9]',
            result
          );
        }

        return;
      }

      requestAnimationFrame(tryApply);
    }

    requestAnimationFrame(tryApply);
  }

  window.addEventListener(
    'resize',
    () => {
      queueApply('window-resize');
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    'click',
    event => {
      if (
        event.target.closest(
          '[data-pmd-analytics-period]'
        )
      ) {
        schedule(
          'analytics-period-change'
        );
      }
    },
    true
  );

  window.PMDDashboard2PaymentCompactV1389 = {
    version: '1.3.8.9',

    apply() {
      return apply('manual');
    },

    reset() {
      const {
        payment
      } = getParts();

      clearPaymentOverrides(payment);

      return this.audit();
    },

    audit() {
      const {
        payment,
        hourly,
        body,
        svg
      } = getParts();

      const paymentHeight =
        heightOf(payment);

      const hourlyHeight =
        heightOf(hourly);

      const contentBottom =
        getContentBottom(payment);

      const result = {
        version: '1.3.8.9',

        desktopMode:
          window.innerWidth >=
          DESKTOP_MIN_WIDTH,

        paymentFound:
          Boolean(payment),

        hourlyFound:
          Boolean(hourly),

        paymentHeight,
        hourlyHeight,

        equalOuterHeight:
          Number.isFinite(paymentHeight) &&
          paymentHeight === hourlyHeight,

        paymentBodyHeight:
          heightOf(body),

        paymentSvgHeight:
          heightOf(svg),

        contentBottom,

        remainingBottomSpace:
          Number.isFinite(paymentHeight) &&
          Number.isFinite(contentBottom)
            ? Math.round(
                paymentHeight -
                contentBottom
              )
            : null,

        bodyHeightUnchanged:
          state.bodyHeightBefore ===
          state.bodyHeightAfter,

        svgHeightUnchanged:
          state.svgHeightBefore ===
          state.svgHeightAfter,

        contentFits:
          state.contentFits,

        applies:
          state.applies,

        lastReason:
          state.lastReason
      };

      console.log(result);
      return result;
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1390_PAYMENT_CONTENT_RESTORE */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1390_PAYMENT_CONTENT_RESTORE';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="paymentMethods"]';

  const DESKTOP_MIN_WIDTH = 900;

  const state = {
    applies: 0,
    lastReason: null
  };

  let queued = false;

  function getParts() {
    const card =
      document.querySelector(CARD_SELECTOR);

    return {
      card,
      header:
        card?.querySelector(':scope > header'),
      body:
        card?.querySelector(
          ':scope > [data-pmd-widget-body]'
        ),
      svg:
        card?.querySelector(
          ':scope > [data-pmd-widget-body] svg'
        )
    };
  }

  function dimensions(element) {
    if (!element) return null;

    const rect =
      element.getBoundingClientRect();

    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function clearOverrides() {
    const {
      card,
      header,
      body
    } = getParts();

    card?.style.removeProperty('position');

    [
      'position',
      'top',
      'left',
      'right',
      'width',
      'height',
      'min-height',
      'max-height',
      'margin',
      'transform'
    ].forEach(property => {
      header?.style.removeProperty(property);
      body?.style.removeProperty(property);
    });
  }

  function apply(reason) {
    state.lastReason = reason;

    const {
      card,
      header,
      body,
      svg
    } = getParts();

    if (
      !card ||
      !header ||
      !body ||
      !svg
    ) {
      return {
        applied: false,
        reason:
          'payment-card-content-not-found',
        trigger: reason
      };
    }

    if (
      window.innerWidth <
      DESKTOP_MIN_WIDTH
    ) {
      clearOverrides();

      return {
        applied: false,
        reason:
          'mobile-layout-left-untouched',
        trigger: reason
      };
    }

    const cardBefore =
      dimensions(card);

    const bodyBefore =
      dimensions(body);

    const svgBefore =
      dimensions(svg);

    if (
      cardBefore.height < 350 ||
      cardBefore.height > 430
    ) {
      return {
        applied: false,
        reason:
          'payment-card-is-not-compact',
        cardHeight:
          cardBefore.height
      };
    }

    card.style.setProperty(
      'position',
      'relative',
      'important'
    );

    header.style.setProperty(
      'position',
      'absolute',
      'important'
    );

    header.style.setProperty(
      'top',
      '17px',
      'important'
    );

    header.style.setProperty(
      'left',
      '17px',
      'important'
    );

    header.style.setProperty(
      'right',
      '17px',
      'important'
    );

    header.style.setProperty(
      'width',
      'auto',
      'important'
    );

    header.style.setProperty(
      'height',
      'auto',
      'important'
    );

    header.style.setProperty(
      'min-height',
      '0',
      'important'
    );

    header.style.setProperty(
      'max-height',
      'none',
      'important'
    );

    header.style.setProperty(
      'margin',
      '0',
      'important'
    );

    header.style.setProperty(
      'transform',
      'none',
      'important'
    );

    body.style.setProperty(
      'position',
      'absolute',
      'important'
    );

    body.style.setProperty(
      'top',
      '49px',
      'important'
    );

    body.style.setProperty(
      'left',
      '17px',
      'important'
    );

    body.style.setProperty(
      'right',
      '17px',
      'important'
    );

    body.style.setProperty(
      'width',
      'auto',
      'important'
    );

    body.style.setProperty(
      'height',
      `${bodyBefore.height}px`,
      'important'
    );

    body.style.setProperty(
      'min-height',
      `${bodyBefore.height}px`,
      'important'
    );

    body.style.setProperty(
      'max-height',
      `${bodyBefore.height}px`,
      'important'
    );

    body.style.setProperty(
      'margin',
      '0',
      'important'
    );

    body.style.setProperty(
      'transform',
      'none',
      'important'
    );

    const cardAfter =
      dimensions(card);

    const headerAfter =
      dimensions(header);

    const bodyAfter =
      dimensions(body);

    const svgAfter =
      dimensions(svg);

    const valid =
      bodyAfter.height ===
        bodyBefore.height &&
      svgAfter.height ===
        svgBefore.height &&
      bodyAfter.bottom <=
        cardAfter.bottom - 12;

    if (!valid) {
      clearOverrides();

      return {
        applied: false,
        reason:
          'safety-revert-invalid-layout',

        cardAfter,
        headerAfter,
        bodyAfter,
        svgAfter
      };
    }

    state.applies += 1;

    return {
      applied: true,
      trigger: reason,

      cardHeight:
        cardAfter.height,

      headerTopInsideCard:
        headerAfter.top -
        cardAfter.top,

      bodyTopInsideCard:
        bodyAfter.top -
        cardAfter.top,

      bodyHeight:
        bodyAfter.height,

      svgHeight:
        svgAfter.height,

      contentInsideCard: true
    };
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;

      const result =
        apply(reason);

      if (
        result.applied &&
        !reason.includes('resize')
      ) {
        console.info(
          '[PMD Dashboard2 Payment Content Restore V1.3.9.0]',
          result
        );
      }
    });
  }

  function schedule(reason) {
    /*
     * PMD_DASHBOARD2_V1414_SCOPED_LATE_RENDER_FIX
     *
     * Apply the final Payment content geometry as soon as its canonical
     * card, header, body and SVG exist. Stop after the first success.
     */
    let attempt = 0;
    const maxAttempts = 30;

    function tryApply() {
      attempt += 1;

      const result = apply(
        `${reason}-frame-${attempt}`
      );

      if (
        result.applied ||
        result.reason ===
          'mobile-layout-left-untouched' ||
        attempt >= maxAttempts
      ) {
        if (
          result.applied &&
          !reason.includes('resize')
        ) {
          console.info(
            '[PMD Dashboard2 Payment Content Restore V1.3.9.0]',
            result
          );
        }

        return;
      }

      requestAnimationFrame(tryApply);
    }

    requestAnimationFrame(tryApply);
  }

  window.addEventListener(
    'resize',
    () => {
      queueApply('window-resize');
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    'click',
    event => {
      if (
        event.target.closest(
          '[data-pmd-analytics-period]'
        )
      ) {
        schedule(
          'analytics-period-change'
        );
      }
    },
    true
  );

  window.PMDDashboard2PaymentContentV1390 = {
    version: '1.3.9.0',

    apply() {
      return apply('manual');
    },

    audit() {
      const {
        card,
        header,
        body,
        svg
      } = getParts();

      const cardRect =
        dimensions(card);

      const headerRect =
        dimensions(header);

      const bodyRect =
        dimensions(body);

      const svgRect =
        dimensions(svg);

      const result = {
        version: '1.3.9.0',

        cardFound:
          Boolean(card),

        headerFound:
          Boolean(header),

        bodyFound:
          Boolean(body),

        svgFound:
          Boolean(svg),

        cardHeight:
          cardRect?.height ?? null,

        headerTopInsideCard:
          cardRect && headerRect
            ? headerRect.top -
              cardRect.top
            : null,

        bodyTopInsideCard:
          cardRect && bodyRect
            ? bodyRect.top -
              cardRect.top
            : null,

        bodyHeight:
          bodyRect?.height ?? null,

        svgHeight:
          svgRect?.height ?? null,

        bodyVisible:
          Boolean(
            body &&
            getComputedStyle(body)
              .display !== 'none' &&
            getComputedStyle(body)
              .visibility !== 'hidden' &&
            bodyRect?.height > 0
          ),

        svgVisible:
          Boolean(
            svg &&
            getComputedStyle(svg)
              .display !== 'none' &&
            getComputedStyle(svg)
              .visibility !== 'hidden' &&
            svgRect?.height > 0
          ),

        contentInsideCard:
          Boolean(
            cardRect &&
            bodyRect &&
            bodyRect.bottom <=
              cardRect.bottom - 12
          ),

        applies:
          state.applies,

        lastReason:
          state.lastReason
      };

      console.log(result);
      return result;
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1391_FIRST_ROW_COMPACT_MATCH */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1391_FIRST_ROW_COMPACT_MATCH';

  if (window[PATCH]) return;
  window[PATCH] = true;

  const LINE_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const CATEGORY_SELECTOR =
    '[data-pmd-analytics-widget="categorySales"]';

  const HOURLY_SELECTOR =
    '[data-pmd-analytics-widget="salesByHour"]';

  const GRID_SELECTOR =
    '.pmd-dashboard2-analytics-grid';

  const DESKTOP_MIN_WIDTH = 900;

  const state = {
    applies: 0,
    targetHeight: null,
    targetBodyHeight: null,
    targetHeaderHeight: null,
    targetToolbarTop: null,
    lastReason: null
  };

  let queued = false;

  function rect(element) {
    if (!element) return null;

    const value =
      element.getBoundingClientRect();

    return {
      top: Math.round(value.top),
      bottom: Math.round(value.bottom),
      width: Math.round(value.width),
      height: Math.round(value.height)
    };
  }

  function getParts() {
    const line =
      document.querySelector(LINE_SELECTOR);

    const category =
      document.querySelector(CATEGORY_SELECTOR);

    const hourly =
      document.querySelector(HOURLY_SELECTOR);

    const grid =
      line?.closest(GRID_SELECTOR) ||
      document.querySelector(GRID_SELECTOR);

    return {
      grid,
      line,
      category,
      hourly,

      lineHeader:
        line?.querySelector(':scope > header'),

      lineBody:
        line?.querySelector(
          ':scope > [data-pmd-widget-body]'
        ),

      lineFrame:
        line?.querySelector(
          '.pmd-dashboard2-chart-frame'
        ),

      lineSvg:
        line?.querySelector(
          '.pmd-dashboard2-chart-frame svg'
        ),

      lineToolbar:
        line?.querySelector(
          '.pmd-dashboard2-zoom-scrubber-v1375'
        ),

      lineModeControl:
        line?.querySelector(
          '[data-pmd-chart-mode]'
        )?.parentElement,

      categoryHeader:
        category?.querySelector(
          ':scope > header'
        ),

      categoryBody:
        category?.querySelector(
          ':scope > [data-pmd-widget-body]'
        ),

      categorySvg:
        category?.querySelector('svg'),

      hourlyHeader:
        hourly?.querySelector(
          ':scope > header'
        ),

      hourlyBody:
        hourly?.querySelector(
          ':scope > [data-pmd-widget-body]'
        ),

      hourlyToolbar:
        hourly?.querySelector(
          '.pmd-dashboard2-zoom-scrubber-v1375'
        ),

      hourlySvg:
        hourly?.querySelector(
          '.pmd-dashboard2-chart-frame svg'
        )
    };
  }

  function setFixedHeight(element, height) {
    if (!element) return;

    element.style.setProperty(
      'height',
      `${height}px`,
      'important'
    );

    element.style.setProperty(
      'min-height',
      `${height}px`,
      'important'
    );

    element.style.setProperty(
      'max-height',
      `${height}px`,
      'important'
    );
  }

  function apply(reason) {
    state.lastReason = reason;

    const parts = getParts();

    const {
      grid,
      line,
      category,
      hourly,

      lineHeader,
      lineBody,
      lineFrame,
      lineSvg,
      lineToolbar,
      lineModeControl,

      categoryBody,
      categorySvg,

      hourlyHeader,
      hourlyBody,
      hourlyToolbar,
      hourlySvg
    } = parts;

    if (
      !grid ||
      !line ||
      !category ||
      !hourly ||
      !lineHeader ||
      !lineBody ||
      !lineFrame ||
      !lineSvg ||
      !lineToolbar ||
      !hourlyHeader ||
      !hourlyBody ||
      !hourlyToolbar ||
      !hourlySvg
    ) {
      return {
        applied: false,
        reason:
          'required-first-or-second-row-parts-not-found',
        trigger: reason
      };
    }

    if (
      window.innerWidth <
      DESKTOP_MIN_WIDTH
    ) {
      return {
        applied: false,
        reason:
          'mobile-layout-left-untouched',
        trigger: reason
      };
    }

    /*
     * Read all compact dimensions from the already-correct
     * Sales by hour card.
     */
    const hourlyCardRect =
      rect(hourly);

    const hourlyHeaderRect =
      rect(hourlyHeader);

    const hourlyBodyRect =
      rect(hourlyBody);

    const hourlyToolbarRect =
      rect(hourlyToolbar);

    const lineSvgBefore =
      rect(lineSvg);

    const categorySvgBefore =
      rect(categorySvg);

    const targetHeight =
      hourlyCardRect.height;

    const targetHeaderHeight =
      hourlyHeaderRect.height;

    const targetBodyHeight =
      hourlyBodyRect.height;

    const targetBodyTop =
      hourlyBodyRect.top -
      hourlyCardRect.top;

    const targetToolbarTop =
      hourlyToolbarRect.top -
      hourlyCardRect.top;

    if (
      targetHeight < 350 ||
      targetHeight > 430 ||
      targetBodyHeight < 300 ||
      targetBodyHeight > 370
    ) {
      return {
        applied: false,
        reason:
          'invalid-hourly-reference-geometry',
        trigger: reason,

        targetHeight,
        targetHeaderHeight,
        targetBodyHeight,
        targetBodyTop,
        targetToolbarTop
      };
    }

    /*
     * Actual grid track must also become compact.
     * Only row 1 is changed; row 2 already has the correct
     * visible card height.
     */
    const rows = String(
      getComputedStyle(grid)
        .gridTemplateRows || ''
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (rows.length >= 1) {
      rows[0] = `${targetHeight}px`;

      grid.style.setProperty(
        'grid-template-rows',
        rows.join(' '),
        'important'
      );
    }

    /*
     * Compact Sales over time outer card.
     */
    setFixedHeight(line, targetHeight);

    line.style.setProperty(
      'align-self',
      'start',
      'important'
    );

    /*
     * Match the line header geometry with Sales by hour.
     * The Line/Bar switch remains visible because header
     * overflow stays visible.
     */
    setFixedHeight(
      lineHeader,
      targetHeaderHeight
    );

    lineHeader.style.setProperty(
      'overflow',
      'visible',
      'important'
    );

    /*
     * Keep mode switch in the same top-right position.
     */
    if (lineModeControl) {
      lineModeControl.style.setProperty(
        'position',
        'absolute',
        'important'
      );

      lineModeControl.style.setProperty(
        'top',
        '0',
        'important'
      );

      lineModeControl.style.setProperty(
        'right',
        '0',
        'important'
      );
    }

    /*
     * Move the complete line body upward and use the same
     * body height as Sales by hour.
     */
    line.style.setProperty(
      'position',
      'relative',
      'important'
    );

    lineBody.style.setProperty(
      'position',
      'absolute',
      'important'
    );

    lineBody.style.setProperty(
      'top',
      `${targetBodyTop}px`,
      'important'
    );

    lineBody.style.setProperty(
      'left',
      '17px',
      'important'
    );

    lineBody.style.setProperty(
      'right',
      '17px',
      'important'
    );

    lineBody.style.setProperty(
      'width',
      'auto',
      'important'
    );

    setFixedHeight(
      lineBody,
      targetBodyHeight
    );

    /*
     * Keep the chart frame and SVG dimensions unchanged.
     * This is the same controlled overflow arrangement
     * already used successfully by Sales by hour.
     */
    lineFrame.style.setProperty(
      'height',
      `${rect(lineFrame).height}px`,
      'important'
    );

    lineFrame.style.setProperty(
      'min-height',
      `${rect(lineFrame).height}px`,
      'important'
    );

    lineFrame.style.setProperty(
      'max-height',
      `${rect(lineFrame).height}px`,
      'important'
    );

    /*
     * Anchor toolbar at exactly the same vertical position
     * as the Sales by hour toolbar.
     */
    lineToolbar.style.setProperty(
      'top',
      `${targetToolbarTop - targetBodyTop}px`,
      'important'
    );

    lineToolbar.style.setProperty(
      'bottom',
      'auto',
      'important'
    );

    /*
     * Category content already safely fits inside 398px.
     * Only its outer bottom border is moved upward.
     */
    setFixedHeight(category, targetHeight);

    category.style.setProperty(
      'align-self',
      'start',
      'important'
    );

    const lineAfter =
      rect(line);

    const categoryAfter =
      rect(category);

    const lineSvgAfter =
      rect(lineSvg);

    const categorySvgAfter =
      rect(categorySvg);

    const lineToolbarAfter =
      rect(lineToolbar);

    const safetyValid =
      lineAfter.height ===
        targetHeight &&
      categoryAfter.height ===
        targetHeight &&
      lineSvgAfter.height ===
        lineSvgBefore.height &&
      (
        !categorySvgBefore ||
        !categorySvgAfter ||
        categorySvgAfter.height ===
          categorySvgBefore.height
      ) &&
      (
        lineToolbarAfter.top -
        lineAfter.top
      ) === targetToolbarTop;

    if (!safetyValid) {
      return {
        applied: false,
        reason:
          'post-layout-safety-check-failed',
        trigger: reason,

        targetHeight,
        lineAfter,
        categoryAfter,
        lineSvgBefore,
        lineSvgAfter,
        categorySvgBefore,
        categorySvgAfter,
        lineToolbarAfter
      };
    }

    state.applies += 1;
    state.targetHeight =
      targetHeight;
    state.targetBodyHeight =
      targetBodyHeight;
    state.targetHeaderHeight =
      targetHeaderHeight;
    state.targetToolbarTop =
      targetToolbarTop;

    return {
      applied: true,
      trigger: reason,

      targetHeight,
      targetHeaderHeight,
      targetBodyHeight,
      targetBodyTop,
      targetToolbarTop,

      lineHeight:
        lineAfter.height,

      categoryHeight:
        categoryAfter.height,

      lineSvgHeight:
        lineSvgAfter.height,

      categorySvgHeight:
        categorySvgAfter?.height ?? null
    };
  }

  function queueApply(reason) {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      queued = false;

      const result =
        apply(reason);

      if (
        result.applied &&
        !reason.includes('resize')
      ) {
        console.info(
          '[PMD Dashboard2 First Row Compact Match V1.3.9.1]',
          result
        );
      }
    });
  }

  function schedule(reason) {
    /*
     * PMD_DASHBOARD2_V1415_SINGLE_HYDRATION
     *
     * Wait only until the canonical chart parts exist.
     * Stop after the first successful layout application.
     */
    let attempt = 0;
    const maxAttempts = 45;

    function tryApply() {
      attempt += 1;

      const result = apply(
        `${reason}-frame-${attempt}`
      );

      if (
        result.applied ||
        result.reason ===
          'mobile-layout-left-untouched' ||
        attempt >= maxAttempts
      ) {
        if (
          result.applied &&
          !reason.includes('resize')
        ) {
          console.info(
            '[PMD Dashboard2 First Row Compact Match V1.3.9.1]',
            result
          );
        }

        return;
      }

      requestAnimationFrame(
        tryApply
      );
    }

    requestAnimationFrame(
      tryApply
    );
  }

  window.addEventListener(
    'resize',
    () => {
      queueApply('window-resize');
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    'click',
    event => {
      if (
        event.target.closest(
          '[data-pmd-chart-mode], ' +
          '[data-pmd-analytics-period]'
        )
      ) {
        schedule(
          'chart-or-period-change'
        );
      }
    },
    true
  );

  window.PMDDashboard2FirstRowV1391 = {
    version: '1.3.9.1',

    apply() {
      return apply('manual');
    },

    audit() {
      const {
        grid,
        line,
        category,
        hourly,
        lineHeader,
        lineBody,
        lineSvg,
        lineToolbar,
        categorySvg
      } = getParts();

      const rows = [
        {
          widget: 'salesOverTime',
          height: rect(line)?.height ?? null
        },
        {
          widget: 'categorySales',
          height: rect(category)?.height ?? null
        },
        {
          widget: 'salesByHour',
          height: rect(hourly)?.height ?? null
        },
        {
          widget: 'paymentMethods',
          height:
            rect(
              document.querySelector(
                '[data-pmd-analytics-widget="paymentMethods"]'
              )
            )?.height ?? null
        }
      ];

      const heights =
        rows
          .map(row => row.height)
          .filter(Number.isFinite);

      const lineRect =
        rect(line);

      const toolbarRect =
        rect(lineToolbar);

      const result = {
        version: '1.3.9.1',

        gridTemplateRows:
          grid
            ? getComputedStyle(grid)
                .gridTemplateRows
            : null,

        cards: rows,

        allFourEqual:
          heights.length === 4 &&
          new Set(heights).size === 1,

        lineHeaderHeight:
          rect(lineHeader)?.height ?? null,

        lineBodyHeight:
          rect(lineBody)?.height ?? null,

        lineSvgHeight:
          rect(lineSvg)?.height ?? null,

        categorySvgHeight:
          rect(categorySvg)?.height ?? null,

        lineToolbarTopInsideCard:
          lineRect && toolbarRect
            ? toolbarRect.top -
              lineRect.top
            : null,

        applies:
          state.applies,

        lastReason:
          state.lastReason
      };

      console.table(rows);
      console.log(result);

      return result;
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        schedule('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    schedule('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1392_SINGLE_CHART_AUTHORITY_CATEGORY_RESTORE */
(() => {
  'use strict';

  const PATCH_KEY =
    'PMD_DASHBOARD2_V1392_SINGLE_CHART_AUTHORITY_CATEGORY_RESTORE';

  if (window[PATCH_KEY]) {
    return;
  }

  window[PATCH_KEY] = true;

  const VERSION = '1.3.9.2';

  const SALES_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const CATEGORY_SELECTOR =
    '[data-pmd-analytics-widget="categorySales"]';

  const MODE_SELECTOR =
    `${SALES_SELECTOR} [data-pmd-chart-mode]`;

  const state = {
    switches: 0,
    finalizations: 0,
    categoryRestores: 0,
    lastMode: null,
    lastReason: null,
    lastError: null
  };

  let finalizeFrame = null;
  let finalizeTimer = null;

  const elementTarget = event =>
    event.target instanceof Element
      ? event.target
      : null;

  const normalizeMode = value => {
    const mode = String(value || '')
      .trim()
      .toLowerCase();

    if (
      mode === 'line' ||
      mode === 'linie'
    ) {
      return 'line';
    }

    if (
      mode === 'bar' ||
      mode === 'balken'
    ) {
      return 'bar';
    }

    return null;
  };

  const getModeButton = event => {
    const target = elementTarget(event);

    return target?.closest(MODE_SELECTOR) || null;
  };

  const fixedStyle = (
    element,
    property,
    value
  ) => {
    if (!element) return;

    element.style.setProperty(
      property,
      value,
      'important'
    );
  };

  const visible = element => {
    if (!element) return false;

    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  /*
   * V1.3.9.1 فقط Outer height کارت Category را کوتاه کرده بود.
   * Header قدیمی min-height:100% داشت و روی Body قرار می‌گرفت.
   */
  const restoreCategoryContent = reason => {
    const card =
      document.querySelector(CATEGORY_SELECTOR);

    const header =
      card?.querySelector(':scope > header');

    const body =
      card?.querySelector(
        ':scope > [data-pmd-widget-body]'
      );

    if (!card || !header || !body) {
      return {
        applied: false,
        reason: 'category-parts-not-found'
      };
    }

    fixedStyle(card, 'position', 'relative');
    fixedStyle(card, 'overflow', 'hidden');

    fixedStyle(header, 'position', 'relative');
    fixedStyle(header, 'display', 'flex');
    fixedStyle(header, 'height', '19px');
    fixedStyle(header, 'min-height', '0');
    fixedStyle(header, 'max-height', '19px');
    fixedStyle(header, 'top', 'auto');
    fixedStyle(header, 'left', 'auto');
    fixedStyle(header, 'right', 'auto');
    fixedStyle(header, 'bottom', 'auto');
    fixedStyle(header, 'visibility', 'visible');
    fixedStyle(header, 'opacity', '1');
    fixedStyle(header, 'overflow', 'visible');

    fixedStyle(body, 'position', 'relative');
    fixedStyle(body, 'display', 'block');
    fixedStyle(body, 'top', 'auto');
    fixedStyle(body, 'left', 'auto');
    fixedStyle(body, 'right', 'auto');
    fixedStyle(body, 'bottom', 'auto');
    fixedStyle(body, 'height', '313px');
    fixedStyle(body, 'min-height', '0');
    fixedStyle(body, 'max-height', '313px');
    fixedStyle(body, 'visibility', 'visible');
    fixedStyle(body, 'opacity', '1');
    fixedStyle(body, 'overflow', 'visible');
    fixedStyle(body, 'pointer-events', 'auto');

    body
      .querySelectorAll(
        ':scope > *, svg, .pmd-dashboard2-donut'
      )
      .forEach(element => {
        element.style.removeProperty('display');
        element.style.removeProperty('visibility');
        element.style.removeProperty('opacity');
      });

    state.categoryRestores += 1;

    return {
      applied: true,
      reason,
      cardHeight:
        card.getBoundingClientRect().height,
      headerHeight:
        header.getBoundingClientRect().height,
      bodyHeight:
        body.getBoundingClientRect().height,
      svgVisible:
        visible(body.querySelector('svg'))
    };
  };

  /*
   * Renderer بعد از Line/Bar یک Pill جدید داخل Body می‌سازد.
   * فقط جدیدترین Pill نگه داشته و به Header منتقل می‌شود.
   */
  const normalizePills = cardKey => {
    const card = document.querySelector(
      `[data-pmd-analytics-widget="${cardKey}"]`
    );

    const header =
      card?.querySelector(':scope > header');

    const body =
      card?.querySelector(
        ':scope > [data-pmd-widget-body]'
      );

    if (!card || !header || !body) {
      return {
        cardKey,
        applied: false
      };
    }

    const pills = [
      ...card.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
    ];

    const bodyPills = [
      ...body.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
    ];

    const newest =
      bodyPills.at(-1) ||
      pills.at(-1) ||
      null;

    if (!newest) {
      return {
        cardKey,
        applied: false,
        reason: 'pill-not-found'
      };
    }

    pills.forEach(pill => {
      if (pill !== newest) {
        pill.remove();
      }
    });

    const toggle = header.querySelector(
      '.pmd-dashboard2-chart-toggle'
    );

    if (newest.parentElement !== header) {
      if (toggle) {
        header.insertBefore(
          newest,
          toggle
        );
      } else {
        header.appendChild(newest);
      }
    }

    newest.style.removeProperty('display');
    newest.style.removeProperty('visibility');
    newest.style.removeProperty('opacity');

    return {
      cardKey,
      applied: true,
      totalPills:
        card.querySelectorAll(
          '.pmd-dashboard2-chart-key'
        ).length,
      headerPills:
        header.querySelectorAll(
          '.pmd-dashboard2-chart-key'
        ).length,
      bodyPills:
        body.querySelectorAll(
          '.pmd-dashboard2-chart-key'
        ).length
    };
  };

  const removeGeneratedDuplicates = () => {
    const card =
      document.querySelector(SALES_SELECTOR);

    const svg =
      card?.querySelector(
        '.pmd-dashboard2-chart-frame svg'
      );

    if (!svg) {
      return {
        applied: false,
        reason: 'svg-not-found'
      };
    }

    const smoothPaths = [
      ...svg.querySelectorAll(
        '.pmd-dashboard2-v1384-smooth-path'
      )
    ];

    smoothPaths
      .slice(0, -1)
      .forEach(path => path.remove());

    /*
     * محورهای تولیدشده توسط V1.3.8.4 باید حداکثر یک نسخه باشند.
     */
    const generatedAxes = [
      ...svg.querySelectorAll(
        '[data-pmd-v1384-axis], ' +
        '.pmd-dashboard2-v1384-axis'
      )
    ];

    generatedAxes
      .slice(0, -1)
      .forEach(axis => axis.remove());

    return {
      applied: true,
      smoothPathCount:
        svg.querySelectorAll(
          '.pmd-dashboard2-v1384-smooth-path'
        ).length
    };
  };

  const finalize = reason => {
    state.lastReason = reason;

    /*
     * ابتدا هندسه 398px موجود دوباره اعمال می‌شود.
     */
    window
      .PMDDashboard2FirstRowV1391
      ?.apply?.();

    const categoryResult =
      restoreCategoryContent(reason);

    /*
     * Scrubber فقط یک مرتبه بعد از Render نهایی نصب می‌شود.
     */
    const zoomResult =
      window
        .PMDDashboard2ZoomDensityV1375
        ?.refresh?.() ?? null;

    const root =
      document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

    const currentMode =
      normalizeMode(
        root?.getAttribute(
          'data-chart-mode'
        )
      ) ||
      state.lastMode;

    let lineResult = null;

    if (currentMode === 'line') {
      lineResult =
        window
          .PMDDashboard2RealLineV1384
          ?.apply?.() ?? null;
    }

    const pillResults = [
      normalizePills('salesOverTime'),
      normalizePills('salesByHour')
    ];

    const duplicateResult =
      removeGeneratedDuplicates();

    /*
     * بعضی Authorityهای قبلی Body را دوباره تغییر می‌دهند؛
     * Category در پایان دوباره تثبیت می‌شود.
     */
    restoreCategoryContent(
      `${reason}-final`
    );

    state.finalizations += 1;

    return {
      applied: true,
      reason,
      mode: currentMode,
      categoryResult,
      zoomResult,
      lineResult,
      pillResults,
      duplicateResult
    };
  };

  const queueFinalize = reason => {
    if (finalizeFrame) {
      cancelAnimationFrame(
        finalizeFrame
      );
    }

    if (finalizeTimer) {
      clearTimeout(
        finalizeTimer
      );

      finalizeTimer = null;
    }

    /*
     * PMD V1.3.9.4:
     * فقط یک Finalize بعد از پایان Render مرورگر.
     * Safety pass دوم باعث بازگشت لحظه‌ای Chart قدیمی می‌شد.
     */
    finalizeFrame =
      requestAnimationFrame(() => {
        finalizeFrame =
          requestAnimationFrame(() => {
            finalizeFrame = null;
            finalize(reason);
          });
      });
  };

  const setMode = mode => {
    mode = normalizeMode(mode);

    if (!mode) {
      return {
        applied: false,
        reason: 'invalid-mode'
      };
    }

    const workspace =
      window.PMDDashboard2FinalWorkspace;

    if (
      !workspace ||
      typeof workspace.setChartMode !==
        'function'
    ) {
      state.lastError =
        'PMDDashboard2FinalWorkspace.setChartMode unavailable';

      console.error(
        '[PMD Dashboard2 Single Chart Authority V1.3.9.2]',
        state.lastError
      );

      return {
        applied: false,
        reason:
          'canonical-workspace-unavailable'
      };
    }

    state.lastMode = mode;
    state.switches += 1;
    state.lastError = null;

    workspace.setChartMode(mode);

    queueFinalize(
      `canonical-mode-${mode}`
    );

    return {
      applied: true,
      mode
    };
  };

  /*
   * Window capture قبل از Document capture و Target listener اجرا می‌شود.
   * بنابراین:
   * - Chart Direct V11.5.1 به pointerdown نمی‌رسد.
   * - پنج اجرای Zoom listener قدیمی شروع نمی‌شوند.
   * - هفت اجرای Real Line listener قدیمی شروع نمی‌شوند.
   */
  window.addEventListener(
    'pointerdown',
    event => {
      const button = getModeButton(event);

      if (!button) return;

      event.stopImmediatePropagation();
    },
    true
  );

  window.addEventListener(
    'click',
    event => {
      const button = getModeButton(event);

      if (!button) return;

      const mode = normalizeMode(
        button.getAttribute(
          'data-pmd-chart-mode'
        )
      );

      event.preventDefault();
      event.stopImmediatePropagation();

      setMode(mode);
    },
    true
  );

  window.addEventListener(
    'keydown',
    event => {
      const button = getModeButton(event);

      if (
        !button ||
        (
          event.key !== 'Enter' &&
          event.key !== ' '
        )
      ) {
        return;
      }

      const mode = normalizeMode(
        button.getAttribute(
          'data-pmd-chart-mode'
        )
      );

      event.preventDefault();
      event.stopImmediatePropagation();

      setMode(mode);
    },
    true
  );

  window.PMDDashboard2ChartAuthorityV1392 = {
    version: VERSION,

    setLine() {
      return setMode('line');
    },

    setBar() {
      return setMode('bar');
    },

    refresh() {
      return finalize('manual-refresh');
    },

    audit() {
      const salesCard =
        document.querySelector(
          SALES_SELECTOR
        );

      const categoryCard =
        document.querySelector(
          CATEGORY_SELECTOR
        );

      const categoryHeader =
        categoryCard?.querySelector(
          ':scope > header'
        );

      const categoryBody =
        categoryCard?.querySelector(
          ':scope > [data-pmd-widget-body]'
        );

      const categorySvg =
        categoryBody?.querySelector('svg');

      const salesSvg =
        salesCard?.querySelector(
          '.pmd-dashboard2-chart-frame svg'
        );

      const smoothPaths =
        salesSvg?.querySelectorAll(
          '.pmd-dashboard2-v1384-smooth-path'
        ).length ?? 0;

      const result = {
        version: VERSION,

        switches:
          state.switches,

        finalizations:
          state.finalizations,

        categoryRestores:
          state.categoryRestores,

        lastMode:
          state.lastMode,

        lastReason:
          state.lastReason,

        lastError:
          state.lastError,

        canonicalWorkspaceAvailable:
          typeof window
            .PMDDashboard2FinalWorkspace
            ?.setChartMode ===
          'function',

        category: {
          cardFound:
            Boolean(categoryCard),

          cardHeight:
            categoryCard
              ?.getBoundingClientRect()
              .height ?? null,

          headerHeight:
            categoryHeader
              ?.getBoundingClientRect()
              .height ?? null,

          headerMinHeight:
            categoryHeader
              ? getComputedStyle(
                  categoryHeader
                ).minHeight
              : null,

          bodyHeight:
            categoryBody
              ?.getBoundingClientRect()
              .height ?? null,

          bodyVisible:
            visible(categoryBody),

          svgVisible:
            visible(categorySvg)
        },

        salesChart: {
          svgFound:
            Boolean(salesSvg),

          smoothPathCount:
            smoothPaths,

          pillCount:
            salesCard
              ?.querySelectorAll(
                '.pmd-dashboard2-chart-key'
              ).length ?? 0,

          modeButtons:
            salesCard
              ?.querySelectorAll(
                '[data-pmd-chart-mode]'
              ).length ?? 0
        }
      };

      console.log(
        '[PMD Dashboard2 Single Chart Authority V1.3.9.2 Audit]',
        result
      );

      return result;
    }
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        queueFinalize('dom-ready');
      },
      {
        once: true
      }
    );
  } else {
    queueFinalize('already-ready');
  }
})();

/* PMD_DASHBOARD2_V1393_SALES_TIME_AXIS_AUTHORITY */
(() => {
  'use strict';

  const PATCH_KEY =
    'PMD_DASHBOARD2_V1393_SALES_TIME_AXIS_AUTHORITY';

  if (window[PATCH_KEY]) {
    return;
  }

  window[PATCH_KEY] = true;

  const VERSION = '1.3.9.3';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const state = {
    applies: 0,
    lineApplies: 0,
    barApplies: 0,
    hiddenNativeLabels: 0,
    removedDuplicateAxes: 0,
    hiddenAreaElements: 0,
    lastMode: null,
    lastReason: null
  };

  let queuedFrame = null;
  let settledTimer = null;

  const getParts = () => {
    const card =
      document.querySelector(CARD_SELECTOR);

    const frame =
      card?.querySelector(
        '.pmd-dashboard2-chart-frame'
      );

    const svg =
      frame?.querySelector('svg');

    return {
      card,
      frame,
      svg
    };
  };

  const isBarMode = svg => {
    if (!svg) return false;

    return (
      svg.classList.contains(
        'is-bar-chart'
      ) ||
      (
        svg.querySelectorAll(
          'rect.pmd-chart-bar, ' +
          'rect[data-pmd-bar-index]'
        ).length > 0 &&
        !svg.classList.contains(
          'is-line-chart'
        )
      )
    );
  };

  const showElement = element => {
    if (!element) return;

    element.style.removeProperty('display');
    element.style.removeProperty('visibility');
    element.style.removeProperty('opacity');
  };

  const hideElement = element => {
    if (!element) return;

    element.style.setProperty(
      'display',
      'none',
      'important'
    );
  };

  /*
   * Native X labels are direct children of SVG.
   * Generated Axis labels live inside a <g>.
   */
  const nativeXLabels = svg =>
    [
      ...svg.querySelectorAll(
        ':scope > text.' +
        'pmd-dashboard2-chart-axis-label.' +
        'is-x-axis'
      )
    ];

  const axisGroups = (
    svg,
    selector
  ) => [
    ...svg.querySelectorAll(selector)
  ];

  const keepNewestAxis = (
    svg,
    selector
  ) => {
    const groups =
      axisGroups(svg, selector);

    if (!groups.length) {
      return null;
    }

    const newest =
      groups.at(-1);

    groups.forEach(group => {
      if (group !== newest) {
        group.remove();
        state.removedDuplicateAxes += 1;
      }
    });

    showElement(newest);

    return newest;
  };

  const hideAxisFamily = (
    svg,
    selector
  ) => {
    axisGroups(svg, selector)
      .forEach(group => {
        hideElement(group);
      });
  };

  const cleanSmoothPaths = svg => {
    const paths = [
      ...svg.querySelectorAll(
        '.pmd-dashboard2-v1384-smooth-path'
      )
    ];

    paths
      .slice(0, -1)
      .forEach(path => path.remove());

    return paths.length
      ? paths.at(-1)
      : null;
  };

  const hideLineArea = svg => {
    let hidden = 0;

    svg
      .querySelectorAll('polygon')
      .forEach(element => {
        hideElement(element);
        hidden += 1;
      });

    /*
     * فقط Pathهایی که Fill واقعی دارند و خط Smooth نیستند.
     */
    svg
      .querySelectorAll('path')
      .forEach(element => {
        if (
          element.classList.contains(
            'pmd-dashboard2-v1384-smooth-path'
          )
        ) {
          return;
        }

        const style =
          getComputedStyle(element);

        const fill =
          String(style.fill || '');

        const opacity =
          Number(style.fillOpacity || 1);

        if (
          fill &&
          fill !== 'none' &&
          fill !== 'rgba(0, 0, 0, 0)' &&
          opacity > 0
        ) {
          hideElement(element);
          hidden += 1;
        }
      });

    state.hiddenAreaElements +=
      hidden;

    return hidden;
  };

  const apply = reason => {
    const {
      card,
      svg
    } = getParts();

    if (!card || !svg) {
      return {
        applied: false,
        reason: 'card-or-svg-not-found',
        trigger: reason
      };
    }

    const barMode =
      isBarMode(svg);

    const mode =
      barMode ? 'bar' : 'line';

    const nativeLabels =
      nativeXLabels(svg);

    nativeLabels.forEach(label => {
      hideElement(label);
    });

    state.hiddenNativeLabels +=
      nativeLabels.length;

    let activeAxis = null;
    let hiddenAreaCount = 0;

    if (barMode) {
      /*
       * BAR:
       * فقط Zoom Axis نگه داشته می‌شود.
       */
      hideAxisFamily(
        svg,
        '.pmd-dashboard2-real-line-axis-v1384'
      );

      activeAxis =
        keepNewestAxis(
          svg,
          '.pmd-dashboard2-zoom-axis-v1375'
        );

      /*
       * Line artifacts در Bar نباید دیده شوند.
       */
      svg
        .querySelectorAll(
          '.pmd-dashboard2-v1384-smooth-path'
        )
        .forEach(path => {
          hideElement(path);
        });

      state.barApplies += 1;
    } else {
      /*
       * LINE:
       * فقط Real Line Axis نگه داشته می‌شود.
       */
      hideAxisFamily(
        svg,
        '.pmd-dashboard2-zoom-axis-v1375'
      );

      activeAxis =
        keepNewestAxis(
          svg,
          '.pmd-dashboard2-real-line-axis-v1384'
        );

      const smoothPath =
        cleanSmoothPaths(svg);

      showElement(smoothPath);

      hiddenAreaCount =
        hideLineArea(svg);

      state.lineApplies += 1;
    }

    /*
     * Axis فعال همیشه بالاتر از عناصر قبلی SVG قرار بگیرد.
     */
    if (
      activeAxis &&
      activeAxis.parentElement === svg
    ) {
      svg.appendChild(activeAxis);
    }

    state.applies += 1;
    state.lastMode = mode;
    state.lastReason = reason;

    return {
      applied: true,
      trigger: reason,
      mode,

      nativeXLabelsHidden:
        nativeLabels.length,

      zoomAxisCount:
        svg.querySelectorAll(
          '.pmd-dashboard2-zoom-axis-v1375'
        ).length,

      realLineAxisCount:
        svg.querySelectorAll(
          '.pmd-dashboard2-real-line-axis-v1384'
        ).length,

      activeAxis:
        activeAxis?.getAttribute(
          'class'
        ) || null,

      hiddenAreaCount,

      smoothPathCount:
        svg.querySelectorAll(
          '.pmd-dashboard2-v1384-smooth-path'
        ).length
    };
  };

  const queueApply = reason => {
    if (queuedFrame) {
      cancelAnimationFrame(
        queuedFrame
      );
    }

    if (settledTimer) {
      clearTimeout(
        settledTimer
      );

      settledTimer = null;
    }

    /*
     * PMD V1.3.9.4:
     * Axis فقط یک بار پس از Render نهایی تثبیت می‌شود.
     */
    queuedFrame =
      requestAnimationFrame(() => {
        queuedFrame =
          requestAnimationFrame(() => {
            queuedFrame = null;
            apply(reason);
          });
      });
  };

  /*
   * V1.3.9.2 برای تغییر حالت از Canonical Workspace استفاده می‌کند.
   * همان Authority را Wrap می‌کنیم تا بعد از Render محور تمیز شود.
   */
  const wrapCanonicalWorkspace = () => {
    const workspace =
      window.PMDDashboard2FinalWorkspace;

    if (
      !workspace ||
      typeof workspace.setChartMode !==
        'function'
    ) {
      return false;
    }

    if (
      workspace.setChartMode
        .pmdV1393Wrapped
    ) {
      return true;
    }

    const original =
      workspace.setChartMode.bind(
        workspace
      );

    const wrapped = function (mode) {
      const result =
        original(mode);

      queueApply(
        `canonical-mode-${mode}`
      );

      return result;
    };

    wrapped.pmdV1393Wrapped =
      true;

    workspace.setChartMode =
      wrapped;

    return true;
  };

  /*
   * Range ممکن است Axis Zoom را دوباره بسازد.
   */
  document.addEventListener(
    'change',
    event => {
      const input =
        event.target;

      if (
        !(
          input instanceof
          HTMLInputElement
        ) ||
        input.type !== 'range' ||
        !input.closest(
          CARD_SELECTOR
        )
      ) {
        return;
      }

      queueApply(
        'sales-range-change'
      );
    },
    true
  );

  /*
   * Resize فقط موقعیت SVG را تغییر می‌دهد؛
   * یک Apply سبک برای حفظ Authority کافی است.
   */
  window.addEventListener(
    'resize',
    () => {
      queueApply(
        'window-resize'
      );
    },
    {
      passive: true
    }
  );

  window.PMDDashboard2SalesAxisV1393 = {
    version: VERSION,

    refresh() {
      wrapCanonicalWorkspace();

      return apply(
        'manual-refresh'
      );
    },

    audit() {
      const {
        card,
        svg
      } = getParts();

      const mode =
        svg
          ? (
              isBarMode(svg)
                ? 'bar'
                : 'line'
            )
          : null;

      const directNativeVisible =
        svg
          ? nativeXLabels(svg)
              .filter(element =>
                getComputedStyle(
                  element
                ).display !==
                'none'
              ).length
          : null;

      const visibleZoomAxes =
        svg
          ? axisGroups(
              svg,
              '.pmd-dashboard2-zoom-axis-v1375'
            ).filter(element =>
              getComputedStyle(
                element
              ).display !==
              'none'
            ).length
          : null;

      const visibleLineAxes =
        svg
          ? axisGroups(
              svg,
              '.pmd-dashboard2-real-line-axis-v1384'
            ).filter(element =>
              getComputedStyle(
                element
              ).display !==
              'none'
            ).length
          : null;

      const visiblePolygons =
        svg
          ? [
              ...svg.querySelectorAll(
                'polygon'
              )
            ].filter(element =>
              getComputedStyle(
                element
              ).display !==
              'none'
            ).length
          : null;

      const result = {
        version: VERSION,

        cardFound:
          Boolean(card),

        svgFound:
          Boolean(svg),

        mode,

        cardHeight:
          card
            ?.getBoundingClientRect()
            .height ?? null,

        directNativeXLabelsVisible:
          directNativeVisible,

        visibleZoomAxes,

        visibleLineAxes,

        visiblePolygons,

        smoothPathCount:
          svg
            ?.querySelectorAll(
              '.pmd-dashboard2-v1384-smooth-path'
            ).length ?? null,

        canonicalWrapped:
          Boolean(
            window
              .PMDDashboard2FinalWorkspace
              ?.setChartMode
              ?.pmdV1393Wrapped
          ),

        state: {
          ...state
        }
      };

      console.log(
        '[PMD Dashboard2 Sales Axis V1.3.9.3 Audit]',
        result
      );

      return result;
    }
  };

  const boot = () => {
    const wrapped =
      wrapCanonicalWorkspace();

    if (!wrapped) {
      [
        100,
        300,
        700,
        1400
      ].forEach(delay => {
        window.setTimeout(
          () => {
            wrapCanonicalWorkspace();
            queueApply(
              `workspace-wait-${delay}`
            );
          },
          delay
        );
      });
    }

    queueApply('boot');
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();


/* PMD_DASHBOARD2_V1394_NO_BLINK_SINGLE_FRAME */
(function () {
  'use strict';

  const VERSION = '1.3.9.4';

  function audit() {
    const card =
      document.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"]'
      );

    const svg =
      card?.querySelector(
        '.pmd-dashboard2-chart-frame svg'
      );

    const input =
      card?.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375 input[type="range"]'
      );

    const mode =
      svg?.classList.contains(
        'is-bar-chart'
      )
        ? 'bar'
        : svg
          ? 'line'
          : null;

    const visibleNativeLabels =
      svg
        ? [
            ...svg.querySelectorAll(
              ':scope > text.pmd-dashboard2-chart-axis-label.is-x-axis'
            )
          ].filter(element =>
            getComputedStyle(element)
              .display !== 'none'
          ).length
        : null;

    const visibleZoomAxes =
      svg
        ? [
            ...svg.querySelectorAll(
              '.pmd-dashboard2-zoom-axis-v1375'
            )
          ].filter(element =>
            getComputedStyle(element)
              .display !== 'none'
          ).length
        : null;

    const visibleLineAxes =
      svg
        ? [
            ...svg.querySelectorAll(
              '.pmd-dashboard2-real-line-axis-v1384'
            )
          ].filter(element =>
            getComputedStyle(element)
              .display !== 'none'
          ).length
        : null;

    const result = {
      version: VERSION,

      cardFound:
        Boolean(card),

      svgFound:
        Boolean(svg),

      inputFound:
        Boolean(input),

      mode,

      inputValue:
        input?.value ?? null,

      visibleNativeLabels,
      visibleZoomAxes,
      visibleLineAxes,

      expectedSingleAxis:
        mode === 'bar'
          ? (
              visibleNativeLabels === 0 &&
              visibleZoomAxes === 1 &&
              visibleLineAxes === 0
            )
          : mode === 'line'
            ? (
                visibleNativeLabels === 0 &&
                visibleZoomAxes === 0 &&
                visibleLineAxes === 1
              )
            : false,

      cardHeight:
        card
          ?.getBoundingClientRect()
          .height ?? null,

      svgHeight:
        svg
          ?.getBoundingClientRect()
          .height ?? null
    };

    console.info(
      '[PMD Dashboard2 No Blink Single Frame V1.3.9.4 Audit]',
      result
    );

    return result;
  }

  window.PMDDashboard2NoBlinkV1394 = {
    version: VERSION,
    audit
  };

  console.info(
    '[PMD Dashboard2 No Blink Single Frame V1.3.9.4] Ready',
    audit()
  );
})();


/* PMD_DASHBOARD2_V1395_INDEPENDENT_DONUT_PERIODS */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1395_INDEPENDENT_DONUT_PERIODS';

  const VERSION = '1.3.9.5';

  if (
    location.pathname.replace(/\/+$/, '') !==
    '/admin/dashboard2'
  ) {
    return;
  }

  if (window[PATCH]) {
    return;
  }

  window[PATCH] = true;

  const ROOT_ID =
    'pmd-dashboard2-analytics-v1';

  const STYLE_ID =
    'pmd-dashboard2-donut-periods-v1395-style';

  const GLOBAL_PERIOD_KEY =
    'pmd.dashboard2.analyticsPeriod.v1';

  const PERIODS = [
    'today',
    'week',
    'month'
  ];

  const COLORS = [
    '#00A676',
    '#2563EB',
    '#FF8A00',
    '#D946EF',
    '#06B6D4',
    '#EF4444'
  ];

  const CONFIG = {
    categorySales: {
      payloadKey: 'sales_by_category',
      rowsKey: 'categories',
      nameKey: 'category',
      valueKey: 'revenue',
      title: 'Sales by category',

      summary(row, payload) {
        return money(
          row.revenue,
          payload
        );
      }
    },

    paymentMethods: {
      payloadKey: 'payment_methods',
      rowsKey: 'methods',
      nameKey: 'method',
      valueKey: 'total',
      title: 'Payment methods',

      summary(row, payload) {
        return (
          money(
            row.total,
            payload
          ) +
          ' · ' +
          String(
            Number(
              row.transactions || 0
            )
          )
        );
      }
    },

    /*
     * PMD_DASHBOARD2_BESTELLKANAELE_CLEAN_V2
     *
     * channelSplit is intentionally excluded from V1395.
     * Its only owner is PMDBestellkanaeleCleanV2.
     */
  };

  const state = {
    selected: {},
    payloadCache: new Map(),
    inflight: new Map(),
    generations: {},
    requests: 0,
    renders: 0,
    errors: 0,
    lastError: null
  };

  function normalizePeriod(value) {
    value = String(
      value || ''
    );

    return PERIODS.includes(value)
      ? value
      : 'month';
  }

  function storageKey(widgetKey) {
    return (
      'pmd.dashboard2.donutPeriod.' +
      widgetKey +
      '.v1'
    );
  }

  function readPeriod(widgetKey) {
    let value = '';

    try {
      value =
        localStorage.getItem(
          storageKey(widgetKey)
        ) || '';
    } catch (error) {
      value = '';
    }

    return normalizePeriod(value);
  }

  function writePeriod(
    widgetKey,
    period
  ) {
    try {
      localStorage.setItem(
        storageKey(widgetKey),
        period
      );
    } catch (error) {
      // Local storage is optional.
    }
  }

  function escapeHtml(value) {
    return String(
      value == null ? '' : value
    ).replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]
    );
  }

  function locale() {
    return (
      document.documentElement.lang ||
      'en'
    );
  }

  function money(
    value,
    payload
  ) {
    const currency =
      payload?.currency ||
      'EUR';

    try {
      return new Intl.NumberFormat(
        locale(),
        {
          style: 'currency',
          currency
        }
      ).format(
        Number(value || 0)
      );
    } catch (error) {
      return (
        Number(value || 0)
          .toFixed(2) +
        ' ' +
        currency
      );
    }
  }

  function periodLabels() {
    const language =
      locale()
        .toLowerCase();

    if (
      language.startsWith('de')
    ) {
      return {
        today: 'Tag',
        week: 'Woche',
        month: 'Monat'
      };
    }

    return {
      today: 'Day',
      week: 'Week',
      month: 'Month'
    };
  }

  function cardFor(widgetKey) {
    return document.querySelector(
      (
        '[data-pmd-analytics-widget="' +
        widgetKey +
        '"]'
      )
    );
  }

  function bodyFor(widgetKey) {
    return cardFor(widgetKey)
      ?.querySelector(
        ':scope > [data-pmd-widget-body]'
      ) || null;
  }

  function emptyHtml(source) {
    const message =
      source?.reason ||
      source?.source ||
      'No records';

    return (
      '<p class="pmd-dashboard2-empty">' +
      escapeHtml(message) +
      '</p>'
    );
  }

  function donutHtml(
    widgetKey,
    source,
    payload
  ) {
    const config =
      CONFIG[widgetKey];

    if (
      !config ||
      !source ||
      source.available !== true
    ) {
      return emptyHtml(source);
    }

    const rows =
      (Array.isArray(source[config.rowsKey])
        ? source[config.rowsKey]
        : []).slice(0, 6);

    if (
      source.empty === true ||
      rows.length === 0
    ) {
      return emptyHtml(source);
    }

    const total =
      rows.reduce(
        (sum, row) => (
          sum +
          Number(
            row[config.valueKey] || 0
          )
        ),
        0
      );

    const hasPositiveTotal = total > 0;

    let offset = 0;

    const circles =
      (hasPositiveTotal ? rows : []).map(
        (row, index) => {
          const value =
            Number(
              row[config.valueKey] || 0
            );

          const percentage =
            value / total * 100;

          const color =
            COLORS[
              index % COLORS.length
            ];

          const circle =
            (
              '<circle ' +
              'cx="60" cy="60" r="45" ' +
              'pathLength="100" ' +
              'fill="none" ' +
              'stroke="' +
              color +
              '" ' +
              'stroke-width="18" ' +
              'stroke-dasharray="' +
              percentage +
              ' ' +
              (100 - percentage) +
              '" ' +
              'stroke-dashoffset="' +
              (-offset) +
              '">' +
              '<title>' +
              escapeHtml(
                row[config.nameKey]
              ) +
              ' · ' +
              escapeHtml(
                money(
                  value,
                  payload
                )
              ) +
              ' · ' +
              percentage.toFixed(1) +
              '%' +
              '</title>' +
              '</circle>'
            );

          offset += percentage;

          return circle;
        }
      ).join('');

    const legend =
      (
        '<ul class="pmd-chart-legend">' +
        rows.map(
          (row, index) => {
            const value =
              Number(
                row[
                  config.valueKey
                ] || 0
              );

            const percentage =
              hasPositiveTotal ? value / total * 100 : 0;

            const color =
              COLORS[
                index %
                COLORS.length
              ];

            return (
              '<li>' +
              '<i style="background:' +
              color +
              '"></i>' +
              '<span>' +
              escapeHtml(
                row[config.nameKey]
              ) +
              '</span>' +
              '<b>' +
              escapeHtml(
                config.summary(
                  row,
                  payload
                )
              ) +
              ' · ' +
              percentage.toFixed(1) +
              '%' +
              '</b>' +
              '</li>'
            );
          }
        ).join('') +
        '</ul>'
      );

    return (
      '<div class="pmd-dashboard2-donut">' +
      '<svg viewBox="0 0 120 120" ' +
      'role="img" aria-label="' +
      escapeHtml(config.title) +
      '">' +
      '<circle cx="60" cy="60" r="45" ' +
      'pathLength="100" fill="none" ' +
      'stroke="#edf1ef" ' +
      'stroke-width="18"></circle>' +
      circles +
      '</svg>' +
      legend +
      '</div>'
    );
  }

  function addStyles() {
    if (
      document.getElementById(
        STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        'style'
      );

    style.id = STYLE_ID;

    style.textContent = `
      #${ROOT_ID} {
        margin-top: 8px !important;
        padding-top: 0 !important;
      }

      #${ROOT_ID}
      > [data-pmd-analytics-grid],
      #${ROOT_ID}
      > .pmd-dashboard2-analytics-grid {
        margin-top: 0 !important;
      }

      #${ROOT_ID}
      .pmd-dashboard2-analytics-head,
      #${ROOT_ID}
      .pmd-dashboard2-analytics-period,
      #${ROOT_ID}
      [data-pmd-analytics-period] {
        display: none !important;
      }

      #${ROOT_ID}
      [data-pmd-analytics-widget="categorySales"],
      #${ROOT_ID}
      [data-pmd-analytics-widget="paymentMethods"],
      #${ROOT_ID}
      [data-pmd-analytics-widget="channelSplit"] {
        position: relative !important;
      }

      #${ROOT_ID}
      [data-pmd-analytics-widget="categorySales"]
      > header,
      #${ROOT_ID}
      [data-pmd-analytics-widget="paymentMethods"]
      > header,
      #${ROOT_ID}
      [data-pmd-analytics-widget="channelSplit"]
      > header {
        box-sizing: border-box !important;
        padding-right: 126px !important;
      }

      .pmd-dashboard2-donut-period-v1395 {
        position: absolute !important;
        top: 10px !important;
        right: 12px !important;
        z-index: 20 !important;

        display: inline-flex !important;
        align-items: center !important;
        gap: 2px !important;

        padding: 3px !important;

        border: 1px solid
          rgba(0, 122, 89, 0.16) !important;
        border-radius: 11px !important;

        background:
          rgba(247, 250, 249, 0.98) !important;

        box-shadow:
          0 3px 10px
          rgba(16, 42, 67, 0.07) !important;

        transition:
          opacity 120ms ease !important;
      }

      .pmd-dashboard2-donut-period-v1395
      button {
        appearance: none !important;

        min-width: 32px !important;
        min-height: 24px !important;

        margin: 0 !important;
        padding: 4px 7px !important;

        border: 0 !important;
        border-radius: 8px !important;

        background: transparent !important;
        color: #52625e !important;

        font: inherit !important;
        font-size: 10px !important;
        font-weight: 750 !important;
        line-height: 1 !important;

        cursor: pointer !important;

        transition:
          background 120ms ease,
          color 120ms ease,
          box-shadow 120ms ease !important;
      }

      .pmd-dashboard2-donut-period-v1395
      button.is-active {
        background: #008765 !important;
        color: #ffffff !important;

        box-shadow:
          0 2px 7px
          rgba(0, 135, 101, 0.22) !important;
      }

      .pmd-dashboard2-donut-period-v1395
      button:focus-visible {
        outline:
          2px solid
          rgba(0, 135, 101, 0.36) !important;
        outline-offset: 1px !important;
      }

      .pmd-dashboard2-donut-period-v1395
      button:hover:not(.is-active) {
        background:
          rgba(0, 135, 101, 0.08) !important;
      }

      .pmd-dashboard2-donut-period-v1395
      &.is-loading {
        opacity: 0.58 !important;
      }

      @media (max-width: 700px) {
        #${ROOT_ID}
        [data-pmd-analytics-widget="categorySales"]
        > header,
        #${ROOT_ID}
        [data-pmd-analytics-widget="paymentMethods"]
        > header,
        #${ROOT_ID}
        [data-pmd-analytics-widget="channelSplit"]
        > header {
          padding-right: 118px !important;
        }

        .pmd-dashboard2-donut-period-v1395 {
          right: 10px !important;
        }

        .pmd-dashboard2-donut-period-v1395
        button {
          min-width: 29px !important;
          padding-left: 5px !important;
          padding-right: 5px !important;
          font-size: 9px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeGlobalHeader() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    if (!root) {
      return 0;
    }

    const elements = [
      ...root.querySelectorAll(
        [
          ':scope > .pmd-dashboard2-analytics-head',
          ':scope > .pmd-dashboard2-analytics-period'
        ].join(',')
      )
    ];

    elements.forEach(
      element => element.remove()
    );

    return elements.length;
  }

  function syncControl(widgetKey) {
    const card =
      cardFor(widgetKey);

    const control =
      card?.querySelector(
        ':scope > ' +
        '.pmd-dashboard2-donut-period-v1395'
      );

    if (!control) {
      return false;
    }

    const selected =
      state.selected[widgetKey] ||
      readPeriod(widgetKey);

    control
      .querySelectorAll(
        '[data-pmd-donut-period]'
      )
      .forEach(button => {
        const active =
          button.dataset
            .pmdDonutPeriod ===
          selected;

        button.classList.toggle(
          'is-active',
          active
        );

        button.setAttribute(
          'aria-pressed',
          active ? 'true' : 'false'
        );
      });

    return true;
  }

  function ensureControl(widgetKey) {
    const card =
      cardFor(widgetKey);

    if (!card) {
      return null;
    }

    let control =
      card.querySelector(
        ':scope > ' +
        '.pmd-dashboard2-donut-period-v1395'
      );

    if (!control) {
      const labels =
        periodLabels();

      control =
        document.createElement(
          'div'
        );

      control.className =
        'pmd-dashboard2-donut-period-v1395';

      control.setAttribute(
        'role',
        'group'
      );

      control.setAttribute(
        'aria-label',
        (
          CONFIG[widgetKey].title +
          ' period'
        )
      );

      PERIODS.forEach(period => {
        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.dataset
          .pmdDonutWidget =
          widgetKey;

        button.dataset
          .pmdDonutPeriod =
          period;

        button.textContent =
          labels[period];

        button.setAttribute(
          'aria-pressed',
          'false'
        );

        control.appendChild(
          button
        );
      });

      card.appendChild(control);
    }

    syncControl(widgetKey);

    return control;
  }

  function setLoading(
    widgetKey,
    loading
  ) {
    const control =
      cardFor(widgetKey)
        ?.querySelector(
          ':scope > ' +
          '.pmd-dashboard2-donut-period-v1395'
        );

    control?.classList.toggle(
      'is-loading',
      Boolean(loading)
    );
  }

  function fetchPayload(
    period,
    force = false
  ) {
    period =
      normalizePeriod(period);

    if (
      !force &&
      state.payloadCache.has(period)
    ) {
      return Promise.resolve(
        state.payloadCache.get(period)
      );
    }

    if (
      !force &&
      state.inflight.has(period)
    ) {
      return state.inflight.get(period);
    }

    /*
     * PMD_DASHBOARD2_V1416_EARLY_ANALYTICS
     *
     * The requested Day/Week/Month payload may already be in flight
     * from the first inline script. Reuse it instead of waiting until
     * this late authority has booted and issuing another request.
     */
    const earlyAuthority =
      window.PMDDashboard2EarlyPayloadV1416;

    const earlyRequest =
      !force &&
      earlyAuthority &&
      typeof earlyAuthority.take ===
        'function'
        ? earlyAuthority.take(period)
        : null;

    if (earlyRequest) {
      state.requests += 1;

      const request =
        earlyRequest
          .then(payload => {
            if (
              !payload ||
              payload.success !== true
            ) {
              throw new Error(
                'Invalid analytics payload'
              );
            }

            state.payloadCache.set(
              period,
              payload
            );

            return payload;
          })
          .finally(() => {
            state.inflight.delete(
              period
            );
          });

      state.inflight.set(
        period,
        request
      );

      return request;
    }

    state.requests += 1;

    const request =
      fetch(
        (
          '/admin/dashboard2' +
          '?pmd_analytics=1' +
          '&period=' +
          encodeURIComponent(period)
        ),
        {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            Accept: 'application/json'
          }
        }
      )
        .then(response => {
          if (!response.ok) {
            throw new Error(
              'HTTP ' +
              response.status
            );
          }

          return response.json();
        })
        .then(payload => {
          if (
            !payload ||
            payload.success !== true
          ) {
            throw new Error(
              'Invalid analytics payload'
            );
          }

          state.payloadCache.set(
            period,
            payload
          );

          return payload;
        })
        .finally(() => {
          state.inflight.delete(
            period
          );
        });

    state.inflight.set(
      period,
      request
    );

    return request;
  }

  function renderOne(
    widgetKey,
    payload,
    period
  ) {
    const config =
      CONFIG[widgetKey];

    const body =
      bodyFor(widgetKey);

    const card =
      cardFor(widgetKey);

    if (
      !config ||
      !body ||
      !card
    ) {
      return {
        applied: false,
        reason: 'card-or-body-not-found'
      };
    }

    const source =
      payload?.[
        config.payloadKey
      ];

    body.innerHTML =
      donutHtml(
        widgetKey,
        source,
        payload
      );

    card.dataset
      .pmdIndependentDonutPeriod =
      period;

    card.dataset
      .pmdIndependentDonutReady =
      'true';

    state.renders += 1;

    return {
      applied: true,
      widgetKey,
      period,
      sourceAvailable:
        source?.available === true,
      sourceEmpty:
        source?.empty === true,
      donutFound:
        Boolean(
          body.querySelector(
            '.pmd-dashboard2-donut'
          )
        )
    };
  }

  function sourceFor(widgetKey) {
    const config =
      CONFIG[widgetKey];

    if (!config) {
      return null;
    }

    const selected =
      state.selected[widgetKey] ||
      readPeriod(widgetKey);

    const payload =
      state.payloadCache.get(
        selected
      );

    return (
      payload?.[
        config.payloadKey
      ] ||
      null
    );
  }

  function setPeriod(
    widgetKey,
    requestedPeriod
  ) {
    if (!CONFIG[widgetKey]) {
      return Promise.resolve({
        applied: false,
        reason: 'unknown-widget'
      });
    }

    const period =
      normalizePeriod(
        requestedPeriod
      );

    state.selected[widgetKey] =
      period;

    writePeriod(
      widgetKey,
      period
    );

    ensureControl(widgetKey);
    syncControl(widgetKey);
    setLoading(widgetKey, true);

    const generation =
      (
        state.generations[
          widgetKey
        ] || 0
      ) + 1;

    state.generations[
      widgetKey
    ] = generation;

    return fetchPayload(period)
      .then(payload => {
        if (
          state.generations[
            widgetKey
          ] !== generation ||
          state.selected[
            widgetKey
          ] !== period
        ) {
          return {
            applied: false,
            reason: 'stale-request'
          };
        }

        return renderOne(
          widgetKey,
          payload,
          period
        );
      })
      .catch(error => {
        /* PMD_DASHBOARD2_V1422_SOURCE_REPAIR */
        state.errors += 1;
        state.lastError =
          String(
            error?.message ||
            error
          );

        const body =
          bodyFor(widgetKey);

        if (body) {
          body.innerHTML =
            '<p class="pmd-dashboard2-empty">' +
            'Data source could not be loaded' +
            '</p>';
        }

        console.error(
          '[PMD Dashboard2 Donut Periods V1.3.9.5]',
          {
            widgetKey,
            period,
            error
          }
        );

        return {
          applied: false,
          reason: 'request-failed',
          error:
            state.lastError
        };
      })
      .finally(() => {
        if (
          state.generations[
            widgetKey
          ] === generation
        ) {
          setLoading(
            widgetKey,
            false
          );
        }
      });
  }

  function refreshAll(
    force = false
  ) {
    const byPeriod =
      new Map();

    Object.keys(CONFIG)
      .forEach(widgetKey => {
        const period =
          state.selected[
            widgetKey
          ] ||
          readPeriod(widgetKey);

        state.selected[
          widgetKey
        ] = period;

        ensureControl(widgetKey);
        syncControl(widgetKey);

        if (
          !byPeriod.has(period)
        ) {
          byPeriod.set(
            period,
            []
          );
        }

        byPeriod
          .get(period)
          .push(widgetKey);

        setLoading(
          widgetKey,
          true
        );
      });

    return Promise.all(
      [
        ...byPeriod.entries()
      ].map(
        ([period, widgetKeys]) =>
          fetchPayload(
            period,
            force
          )
            .then(payload =>
              widgetKeys.map(
                widgetKey =>
                  renderOne(
                    widgetKey,
                    payload,
                    period
                  )
              )
            )
            .catch(error => {
              /* PMD_DASHBOARD2_V1422_SOURCE_REPAIR */
              state.errors += 1;
              state.lastError = String(
                error?.message || error
              );

              widgetKeys.forEach(widgetKey => {
                const body = bodyFor(widgetKey);
                if (body) {
                  body.innerHTML =
                    '<p class="pmd-dashboard2-empty">' +
                    'Data source could not be loaded' +
                    '</p>';
                }
              });

              console.error(
                '[PMD Dashboard2 Donut Periods V1.3.9.5 refreshAll]',
                { period, widgetKeys, error }
              );

              return [];
            })
            .finally(() => {
              widgetKeys.forEach(
                widgetKey =>
                  setLoading(
                    widgetKey,
                    false
                  )
              );
            })
      )
    );
  }

  function onClick(event) {
    const button =
      event.target.closest(
        '[data-pmd-donut-period]'
      );

    if (!button) {
      return;
    }

    const widgetKey =
      button.dataset
        .pmdDonutWidget;

    const period =
      button.dataset
        .pmdDonutPeriod;

    if (
      !CONFIG[widgetKey]
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setPeriod(
      widgetKey,
      period
    );
  }

  function audit() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const previous =
      root?.previousElementSibling;

    const rootRect =
      root?.getBoundingClientRect();

    const previousRect =
      previous
        ?.getBoundingClientRect();

    const widgets = {};

    Object.keys(CONFIG)
      .forEach(widgetKey => {
        const card =
          cardFor(widgetKey);

        const body =
          bodyFor(widgetKey);

        const control =
          card?.querySelector(
            ':scope > ' +
            '.pmd-dashboard2-donut-period-v1395'
          );

        widgets[widgetKey] = {
          cardFound:
            Boolean(card),

          cardHeight:
            card
              ?.getBoundingClientRect()
              .height ?? null,

          selectedPeriod:
            state.selected[
              widgetKey
            ] ||
            readPeriod(widgetKey),

          controlFound:
            Boolean(control),

          buttonCount:
            control
              ?.querySelectorAll(
                '[data-pmd-donut-period]'
              ).length ?? 0,

          activeButtonCount:
            control
              ?.querySelectorAll(
                'button.is-active'
              ).length ?? 0,

          donutVisible:
            Boolean(
              body?.querySelector(
                '.pmd-dashboard2-donut svg'
              )
            ),

          legendVisible:
            Boolean(
              body?.querySelector(
                '.pmd-chart-legend'
              )
            ),

          independentReady:
            card?.dataset
              .pmdIndependentDonutReady ===
            'true'
        };
      });

    const result = {
      version: VERSION,

      rootFound:
        Boolean(root),

      globalHeaderCount:
        root
          ?.querySelectorAll(
            '.pmd-dashboard2-analytics-head'
          ).length ?? null,

      globalPeriodControlCount:
        root
          ?.querySelectorAll(
            '.pmd-dashboard2-analytics-period'
          ).length ?? null,

      globalPeriodButtonCount:
        root
          ?.querySelectorAll(
            '[data-pmd-analytics-period]'
          ).length ?? null,

      frozenWorkspacePeriod:
        'last30',

      topGap:
        (
          rootRect &&
          previousRect
        )
          ? Math.round(
              rootRect.top -
              previousRect.bottom
            )
          : null,

      requests:
        state.requests,

      renders:
        state.renders,

      cachedPeriods: [
        ...state.payloadCache.keys()
      ],

      inflightPeriods: [
        ...state.inflight.keys()
      ],

      errors:
        state.errors,

      lastError:
        state.lastError,

      widgets
    };

    console.info(
      '[PMD Dashboard2 Independent Donut Periods V1.3.9.5 Audit]',
      result
    );

    return result;
  }

  window
    .PMDDashboard2DonutPeriodsV1395 = {
      version: VERSION,

      sourceFor,

      setPeriod,

      refresh(
        widgetKey = null,
        force = true
      ) {
        if (widgetKey) {
          return setPeriod(
            widgetKey,
            state.selected[
              widgetKey
            ] ||
            readPeriod(widgetKey)
          );
        }

        return refreshAll(force);
      },

      audit
    };

  function boot() {
    /*
     * Period عمومی قدیمی دیگر حتی در localStorage
     * روی Workspace اثر ندارد.
     */
    try {
      localStorage.setItem(
        GLOBAL_PERIOD_KEY,
        'last30'
      );
    } catch (error) {
      // Local storage is optional.
    }

    addStyles();
    removeGlobalHeader();

    Object.keys(CONFIG)
      .forEach(widgetKey => {
        state.selected[
          widgetKey
        ] =
          readPeriod(widgetKey);

        ensureControl(widgetKey);
      });

    document.addEventListener(
      'click',
      onClick,
      true
    );

    /*
     * فقط یک اجرای Boot پس از ساخته‌شدن Shell اصلی.
     * هیچ Observer و هیچ Loop دائمی وجود ندارد.
     */
    /*
     * PMD_DASHBOARD2_V1415_SINGLE_HYDRATION
     *
     * Initial selected-period fetching is owned by the main
     * workspace Promise. No delayed 350ms overwrite.
     */


    console.info(
      '[PMD Dashboard2 Independent Donut Periods V1.3.9.5] Ready',
      {
        globalPeriodRemoved: true,
        workspacePeriod: 'last30',
        widgets:
          Object.keys(CONFIG)
      }
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();


/* PMD_DASHBOARD2_V1396_AXIS_LOCK_COMPACT_TOGGLES */
(function () {
  'use strict';

  const PATCH =
    'PMD_DASHBOARD2_V1396_AXIS_LOCK_COMPACT_TOGGLES';

  const VERSION = '1.3.9.6';

  const STYLE_ID =
    'pmd-dashboard2-v1396-axis-toggle-style';

  if (
    location.pathname.replace(/\/+$/, '') !==
    '/admin/dashboard2'
  ) {
    return;
  }

  if (window[PATCH]) {
    return;
  }

  window[PATCH] = true;

  const addStyles = () => {
    let style =
      document.getElementById(STYLE_ID);

    if (!style) {
      style =
        document.createElement('style');

      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
      /*
       * ======================================================
       * Sales over time — permanent single X-axis lock
       * ======================================================
       */

      #pmd-dashboard2-analytics-v1
      [data-pmd-analytics-widget="salesOverTime"]
      .pmd-dashboard2-chart-frame
      svg.pmd-dashboard2-chart
      > text.pmd-dashboard2-chart-axis-label.is-x-axis {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      #pmd-dashboard2-analytics-v1
      [data-pmd-analytics-widget="salesOverTime"]
      svg.pmd-dashboard2-chart.is-bar-chart
      .pmd-dashboard2-real-line-axis-v1384 {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      #pmd-dashboard2-analytics-v1
      [data-pmd-analytics-widget="salesOverTime"]
      svg.pmd-dashboard2-chart.is-line-chart
      .pmd-dashboard2-zoom-axis-v1375 {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      /*
       * ======================================================
       * Compact Linie / Balken segmented control
       * ======================================================
       */

      #pmd-dashboard2-analytics-v1
      .pmd-dashboard2-chart-toggle {
        display: inline-grid !important;
        grid-template-columns:
          repeat(2, max-content) !important;

        align-items: center !important;
        gap: 2px !important;

        width: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;

        padding: 3px !important;
        border-radius: 10px !important;
      }

      #pmd-dashboard2-analytics-v1
      .pmd-dashboard2-chart-toggle
      button[data-pmd-chart-mode] {
        width: auto !important;
        min-width: 48px !important;

        height: 30px !important;
        min-height: 30px !important;

        padding: 0 9px !important;

        border-radius: 8px !important;

        font-size: 10px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }

      /*
       * ======================================================
       * Compact Tag / Woche / Monat segmented controls
       * ======================================================
       */

      #pmd-dashboard2-analytics-v1
      :is(
        [data-pmd-analytics-widget="categorySales"],
        [data-pmd-analytics-widget="paymentMethods"],
        [data-pmd-analytics-widget="channelSplit"]
      )
      > header {
        column-gap: 8px !important;
        align-items: flex-start !important;
      }

      #pmd-dashboard2-analytics-v1
      :is(
        [data-pmd-analytics-widget="categorySales"],
        [data-pmd-analytics-widget="paymentMethods"],
        [data-pmd-analytics-widget="channelSplit"]
      )
      > header
      > *:has(
        > button:not([data-pmd-chart-mode])
      ) {
        display: inline-flex !important;
        align-items: center !important;

        gap: 1px !important;

        width: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;

        padding: 3px !important;
        border-radius: 10px !important;
      }

      #pmd-dashboard2-analytics-v1
      :is(
        [data-pmd-analytics-widget="categorySales"],
        [data-pmd-analytics-widget="paymentMethods"],
        [data-pmd-analytics-widget="channelSplit"]
      )
      > header
      button:not([data-pmd-chart-mode]) {
        flex: 0 0 auto !important;

        width: auto !important;
        min-width: 0 !important;

        height: 27px !important;
        min-height: 27px !important;

        padding: 0 6px !important;

        border-radius: 7px !important;

        font-size: 9px !important;
        font-weight: 700 !important;
        line-height: 1 !important;

        white-space: nowrap !important;
      }

      #pmd-dashboard2-analytics-v1
      :is(
        [data-pmd-analytics-widget="categorySales"],
        [data-pmd-analytics-widget="paymentMethods"],
        [data-pmd-analytics-widget="channelSplit"]
      )
      > header
      h3 {
        min-width: 0 !important;
        line-height: 1.08 !important;
      }

      @media (max-width: 1180px) {
        #pmd-dashboard2-analytics-v1
        :is(
          [data-pmd-analytics-widget="categorySales"],
          [data-pmd-analytics-widget="paymentMethods"],
          [data-pmd-analytics-widget="channelSplit"]
        )
        > header
        button:not([data-pmd-chart-mode]) {
          height: 26px !important;
          min-height: 26px !important;
          padding-inline: 5px !important;
          font-size: 8.5px !important;
        }
      }
    `;

    return true;
  };

  const visible = element => {
    if (!element) return false;

    const style =
      getComputedStyle(element);

    const rect =
      element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const audit = () => {
    const card =
      document.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"]'
      );

    const svg =
      card?.querySelector(
        '.pmd-dashboard2-chart-frame svg'
      );

    const mode =
      svg?.classList.contains('is-bar-chart')
        ? 'bar'
        : svg
          ? 'line'
          : null;

    const nativeLabels =
      svg
        ? [
            ...svg.querySelectorAll(
              ':scope > text.' +
              'pmd-dashboard2-chart-axis-label.' +
              'is-x-axis'
            )
          ]
        : [];

    const zoomAxes =
      svg
        ? [
            ...svg.querySelectorAll(
              '.pmd-dashboard2-zoom-axis-v1375'
            )
          ]
        : [];

    const lineAxes =
      svg
        ? [
            ...svg.querySelectorAll(
              '.pmd-dashboard2-real-line-axis-v1384'
            )
          ]
        : [];

    const controlData = [
      'salesOverTime',
      'categorySales',
      'paymentMethods',
      'channelSplit'
    ].map(key => {
      const target =
        document.querySelector(
          `[data-pmd-analytics-widget="${key}"]`
        );

      const buttons =
        target
          ? [
              ...target.querySelectorAll(
                ':scope > header button'
              )
            ]
          : [];

      return {
        key,
        cardFound: Boolean(target),
        buttonCount: buttons.length,

        buttons: buttons.map(button => ({
          text:
            String(button.textContent || '')
              .replace(/\s+/g, ' ')
              .trim(),

          active:
            button.classList.contains(
              'is-active'
            ),

          width:
            Math.round(
              button
                .getBoundingClientRect()
                .width
            ),

          height:
            Math.round(
              button
                .getBoundingClientRect()
                .height
            ),

          fontSize:
            getComputedStyle(button)
              .fontSize
        }))
      };
    });

    const result = {
      version: VERSION,

      stylePresent:
        Boolean(
          document.getElementById(
            STYLE_ID
          )
        ),

      mode,

      visibleNativeXLabels:
        nativeLabels.filter(visible).length,

      visibleZoomAxes:
        zoomAxes.filter(visible).length,

      visibleLineAxes:
        lineAxes.filter(visible).length,

      expectedSingleAxis:
        mode === 'bar'
          ? (
              nativeLabels.filter(visible).length === 0 &&
              zoomAxes.filter(visible).length === 1 &&
              lineAxes.filter(visible).length === 0
            )
          : mode === 'line'
            ? (
                nativeLabels.filter(visible).length === 0 &&
                zoomAxes.filter(visible).length === 0 &&
                lineAxes.filter(visible).length === 1
              )
            : false,

      controls: controlData
    };

    console.info(
      '[PMD Dashboard2 Axis Lock + Compact Toggles V1.3.9.6 Audit]',
      result
    );

    return result;
  };

  addStyles();

  window.PMDDashboard2AxisToggleV1396 = {
    version: VERSION,

    refresh() {
      addStyles();

      window
        .PMDDashboard2SalesAxisV1393
        ?.refresh?.();

      return audit();
    },

    audit
  };

  console.info(
    '[PMD Dashboard2 Axis Lock + Compact Toggles V1.3.9.6] Ready',
    audit()
  );
})();


/* PMD_DASHBOARD2_V1397_LINE_SLIDER_STATE_BRIDGE */
(function () {
  'use strict';

  const VERSION = '1.3.9.7';

  function audit() {
    const card =
      document.querySelector(
        '[data-pmd-analytics-widget="salesOverTime"]'
      );

    const svg =
      card?.querySelector(
        '.pmd-dashboard2-chart-frame svg'
      );

    const input =
      card?.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375 ' +
        'input[type="range"]'
      );

    const lineAudit =
      window
        .PMDDashboard2RealLineV1384
        ?.audit?.() ?? null;

    const mode =
      svg?.classList.contains('is-bar-chart')
        ? 'bar'
        : svg
          ? 'line'
          : null;

    const result = {
      version: VERSION,

      cardFound:
        Boolean(card),

      svgFound:
        Boolean(svg),

      inputFound:
        Boolean(input),

      mode,

      inputValue:
        input?.value ?? null,

      inputMinimum:
        input?.min ?? null,

      inputMaximum:
        input?.max ?? null,

      lineSelectedVisible:
        lineAudit?.selectedVisible ??
        lineAudit?.lastResult
          ?.selectedVisible ??
        null,

      lineVisiblePoints:
        lineAudit?.visiblePoints ??
        lineAudit?.lastResult
          ?.visiblePoints ??
        null,

      firstLabel:
        lineAudit?.firstLabel ??
        lineAudit?.lastResult
          ?.firstLabel ??
        null,

      lastLabel:
        lineAudit?.lastLabel ??
        lineAudit?.lastResult
          ?.lastLabel ??
        null,

      stateMatchesInput:
        mode !== 'line'
          ? null
          : (
              Number(
                lineAudit?.selectedVisible ??
                lineAudit?.lastResult
                  ?.selectedVisible
              ) ===
              Number(input?.value)
            )
    };

    console.info(
      '[PMD Dashboard2 Line Slider State Bridge V1.3.9.7 Audit]',
      result
    );

    return result;
  }

  window.PMDDashboard2LineSliderV1397 = {
    version: VERSION,
    audit
  };

  console.info(
    '[PMD Dashboard2 Line Slider State Bridge V1.3.9.7] Ready',
    audit()
  );
})();


/* ============================================================
   PMD_DASHBOARD2_V1398_NO_PILL_FLASH_PARTIAL_MODE_RENDER
   V1.3.9.8
   ============================================================ */
(function () {
  'use strict';

  if (
    window
      .PMDDashboard2NoPillFlashV1398
  ) {
    return;
  }

  const VERSION = '1.3.9.8';
  const STYLE_ID =
    'pmd-dashboard2-no-pill-flash-v1398';

  function installStyle() {
    let style =
      document.getElementById(
        STYLE_ID
      );

    if (style) {
      return style;
    }

    style =
      document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `
      /*
       * Generated chart legends inside Widget Body must never be painted.
       * The sole visible chart-key authority lives in the Card Header.
       */
      [data-pmd-analytics-widget="salesOverTime"]
      [data-pmd-widget-body]
      .pmd-dashboard2-chart-key,

      [data-pmd-analytics-widget="salesByHour"]
      [data-pmd-widget-body]
      .pmd-dashboard2-chart-key {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;

    document.head.appendChild(
      style
    );

    return style;
  }

  function visible(element) {
    if (!element) return false;

    const style =
      getComputedStyle(element);

    const rect =
      element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function inspect(key) {
    const card =
      document.querySelector(
        `[data-pmd-analytics-widget="${key}"]`
      );

    const headerPills =
      card
        ? [
            ...card.querySelectorAll(
              ':scope > header .pmd-dashboard2-chart-key'
            )
          ]
        : [];

    const bodyPills =
      card
        ? [
            ...card.querySelectorAll(
              '[data-pmd-widget-body] .pmd-dashboard2-chart-key'
            )
          ]
        : [];

    return {
      cardFound:
        Boolean(card),

      headerPillCount:
        headerPills.length,

      visibleHeaderPills:
        headerPills.filter(
          visible
        ).length,

      bodyPillCount:
        bodyPills.length,

      visibleBodyPills:
        bodyPills.filter(
          visible
        ).length,

      totalVisiblePills:
        [
          ...headerPills,
          ...bodyPills
        ].filter(visible).length
    };
  }

  installStyle();

  window
    .PMDDashboard2NoPillFlashV1398 = {
      version: VERSION,

      refresh() {
        installStyle();

        return this.audit();
      },

      audit() {
        const result = {
          version: VERSION,

          stylePresent:
            Boolean(
              document.getElementById(
                STYLE_ID
              )
            ),

          mode:
            window
              .PMDDashboard2FinalWorkspace
              ?.getChartMode?.() ??
            null,

          salesOverTime:
            inspect(
              'salesOverTime'
            ),

          salesByHour:
            inspect(
              'salesByHour'
            )
        };

        console.info(
          '[PMD Dashboard2 No Pill Flash V1.3.9.8 Audit]',
          result
        );

        return result;
      }
    };

  console.info(
    '[PMD Dashboard2 No Pill Flash V1.3.9.8] Ready',
    {
      stylePresent:
        Boolean(
          document.getElementById(
            STYLE_ID
          )
        )
    }
  );
})();


/* ============================================================
   PMD_DASHBOARD2_V1399_BAR_PILL_SMOOTH_LINE_PREPAINT
   V1.3.9.9
   ============================================================ */
(function () {
  'use strict';

  if (
    window
      .PMDDashboard2BarPillSmoothLineV1399
  ) {
    return;
  }

  const VERSION = '1.3.9.9';

  const STYLE_ID =
    'pmd-dashboard2-bar-pill-smooth-line-v1399';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  function installStyle() {
    let style =
      document.getElementById(
        STYLE_ID
      );

    if (style) {
      return style;
    }

    style =
      document.createElement('style');

    style.id = STYLE_ID;

    style.textContent = `
      /*
       * Sales-over-time sticker is a Bar-only element.
       * Stable Pill V1.3.8.0 and Final Authority may move it,
       * but they cannot make it visible while Line is active.
       */
      ${CARD_SELECTOR}
      [data-pmd-widget-body]
      .pmd-dashboard2-chart-key {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      ${CARD_SELECTOR}
      [data-pmd-sales-chart-mode="line"]
      > header
      .pmd-dashboard2-chart-key {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      ${CARD_SELECTOR}
      [data-pmd-sales-chart-mode="bar"]
      > header
      .pmd-dashboard2-chart-key {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /*
       * Native sharp polyline is never allowed to become visible after
       * the smooth V1.3.8.4 path has been generated.
       */
      ${CARD_SELECTOR}
      svg.is-line-chart
      polyline.pmd-chart-line {
        visibility: hidden !important;
        opacity: 0 !important;
      }

      ${CARD_SELECTOR}
      svg.is-line-chart
      .pmd-dashboard2-v1384-smooth-path {
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;

    document.head.appendChild(
      style
    );

    return style;
  }

  function currentMode() {
    const workspace =
      window.PMDDashboard2FinalWorkspace;

    const workspaceMode =
      workspace &&
      typeof workspace.getChartMode ===
        'function'
        ? workspace.getChartMode()
        : null;

    if (
      workspaceMode === 'line' ||
      workspaceMode === 'bar'
    ) {
      return workspaceMode;
    }

    const svg =
      document.querySelector(
        `${CARD_SELECTOR} svg`
      );

    return svg?.classList.contains(
      'is-bar-chart'
    )
      ? 'bar'
      : 'line';
  }

  function synchronize(reason) {
    installStyle();

    const card =
      document.querySelector(
        CARD_SELECTOR
      );

    if (!card) {
      return {
        applied: false,
        reason: 'card-not-found',
        trigger: reason
      };
    }

    const mode =
      currentMode();

    card.dataset.pmdSalesChartMode =
      mode;

    const header =
      card.querySelector(
        ':scope > header'
      );

    const body =
      card.querySelector(
        ':scope > [data-pmd-widget-body]'
      );

    /*
     * فقط یک Pill در Header باقی بماند.
     * در Line توسط CSS مخفی است؛ در Bar نمایش داده می‌شود.
     */
    const headerPills = [
      ...(
        header?.querySelectorAll(
          '.pmd-dashboard2-chart-key'
        ) || []
      )
    ];

    headerPills
      .slice(1)
      .forEach(pill =>
        pill.remove()
      );

    body
      ?.querySelectorAll(
        '.pmd-dashboard2-chart-key'
      )
      .forEach(pill =>
        pill.remove()
      );

    if (mode === 'line') {
      const svg =
        body?.querySelector(
          '.pmd-dashboard2-chart-frame svg'
        );

      svg
        ?.querySelectorAll(
          'polyline.pmd-chart-line'
        )
        .forEach(polyline => {
          polyline.style.setProperty(
            'display',
            'none',
            'important'
          );

          polyline.style.setProperty(
            'visibility',
            'hidden',
            'important'
          );

          polyline.style.setProperty(
            'opacity',
            '0',
            'important'
          );
        });
    }

    return {
      applied: true,
      trigger: reason,
      mode
    };
  }

  installStyle();

  /*
   * Mode button is captured before older document listeners.
   * Attribute changes immediately, so the Bar pill disappears before
   * the browser can paint the Line transition.
   */
  window.addEventListener(
    'pointerdown',
    event => {
      const button =
        event.target.closest(
          `${CARD_SELECTOR} [data-pmd-chart-mode]`
        );

      if (!button) {
        return;
      }

      const mode =
        button.getAttribute(
          'data-pmd-chart-mode'
        );

      if (
        mode !== 'line' &&
        mode !== 'bar'
      ) {
        return;
      }

      const card =
        button.closest(
          CARD_SELECTOR
        );

      if (card) {
        card.dataset
          .pmdSalesChartMode =
            mode;
      }
    },
    true
  );

  requestAnimationFrame(() => {
    synchronize('ready');
  });

  window
    .PMDDashboard2BarPillSmoothLineV1399 = {
      version: VERSION,

      refresh() {
        return synchronize(
          'manual-refresh'
        );
      },

      audit() {
        const card =
          document.querySelector(
            CARD_SELECTOR
          );

        const header =
          card?.querySelector(
            ':scope > header'
          );

        const body =
          card?.querySelector(
            ':scope > [data-pmd-widget-body]'
          );

        const svg =
          body?.querySelector(
            '.pmd-dashboard2-chart-frame svg'
          );

        const mode =
          card?.dataset
            .pmdSalesChartMode ||
          currentMode();

        const headerPills = [
          ...(
            header?.querySelectorAll(
              '.pmd-dashboard2-chart-key'
            ) || []
          )
        ];

        const visibleHeaderPills =
          headerPills.filter(element => {
            const style =
              getComputedStyle(element);

            const rect =
              element
                .getBoundingClientRect();

            return (
              style.display !== 'none' &&
              style.visibility !==
                'hidden' &&
              Number(style.opacity) > 0 &&
              rect.width > 0 &&
              rect.height > 0
            );
          });

        const sharpPolylines =
          svg
            ? [
                ...svg.querySelectorAll(
                  'polyline.pmd-chart-line'
                )
              ]
            : [];

        const visibleSharpPolylines =
          sharpPolylines.filter(element => {
            const style =
              getComputedStyle(element);

            return (
              style.display !== 'none' &&
              style.visibility !==
                'hidden' &&
              Number(style.opacity) > 0
            );
          });

        const smoothPaths =
          svg
            ? [
                ...svg.querySelectorAll(
                  '.pmd-dashboard2-v1384-smooth-path'
                )
              ]
            : [];

        const visibleSmoothPaths =
          smoothPaths.filter(element => {
            const style =
              getComputedStyle(element);

            return (
              style.display !== 'none' &&
              style.visibility !==
                'hidden' &&
              Number(style.opacity) > 0
            );
          });

        const result = {
          version: VERSION,

          cardFound:
            Boolean(card),

          mode,

          headerPillCount:
            headerPills.length,

          visibleHeaderPills:
            visibleHeaderPills.length,

          expectedVisibleHeaderPills:
            mode === 'bar' ? 1 : 0,

          bodyPillCount:
            body?.querySelectorAll(
              '.pmd-dashboard2-chart-key'
            ).length || 0,

          sharpPolylineCount:
            sharpPolylines.length,

          visibleSharpPolylines:
            visibleSharpPolylines.length,

          smoothPathCount:
            smoothPaths.length,

          visibleSmoothPaths:
            visibleSmoothPaths.length,

          noSharpLineVisible:
            visibleSharpPolylines.length ===
            0,

          correctPillVisibility:
            visibleHeaderPills.length ===
            (
              mode === 'bar'
                ? 1
                : 0
            )
        };

        console.info(
          '[PMD Dashboard2 Bar Pill + Smooth Line V1.3.9.9 Audit]',
          result
        );

        return result;
      }
    };

  console.info(
    '[PMD Dashboard2 Bar Pill + Smooth Line V1.3.9.9] Ready'
  );
})();


/* ============================================================
   PMD_DASHBOARD2_V1400_RESTORE_BAR_HEADER_PILL
   V1.4.0.0
   ============================================================ */
(function () {
  'use strict';

  if (
    window
      .PMDDashboard2BarHeaderPillV1400
  ) {
    return;
  }

  const VERSION = '1.4.0.0';
  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  function visible(element) {
    if (!element) {
      return false;
    }

    const style =
      getComputedStyle(element);

    const rect =
      element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  window
    .PMDDashboard2BarHeaderPillV1400 = {
      version: VERSION,

      audit() {
        const card =
          document.querySelector(
            CARD_SELECTOR
          );

        const mode =
          window
            .PMDDashboard2FinalWorkspace
            ?.getChartMode?.() ??
          document
            .getElementById(
              'pmd-dashboard2-analytics-v1'
            )
            ?.getAttribute(
              'data-chart-mode'
            ) ??
          null;

        const headerPills =
          card
            ? [
                ...card.querySelectorAll(
                  ':scope > header .pmd-dashboard2-chart-key'
                )
              ]
            : [];

        const bodyPills =
          card
            ? [
                ...card.querySelectorAll(
                  '[data-pmd-widget-body] .pmd-dashboard2-chart-key'
                )
              ]
            : [];

        const result = {
          version: VERSION,

          cardFound:
            Boolean(card),

          mode,

          headerPillCount:
            headerPills.length,

          visibleHeaderPills:
            headerPills.filter(
              visible
            ).length,

          bodyPillCount:
            bodyPills.length,

          visibleBodyPills:
            bodyPills.filter(
              visible
            ).length,

          correctVisibility:
            mode === 'bar'
              ? (
                  headerPills.filter(
                    visible
                  ).length === 1 &&
                  bodyPills.filter(
                    visible
                  ).length === 0
                )
              : (
                  headerPills.filter(
                    visible
                  ).length === 0 &&
                  bodyPills.filter(
                    visible
                  ).length === 0
                )
        };

        console.info(
          '[PMD Dashboard2 Bar Header Pill V1.4.0.0 Audit]',
          result
        );

        return result;
      }
    };

  console.info(
    '[PMD Dashboard2 Bar Header Pill V1.4.0.0] Ready'
  );
})();

/* ============================================================
   PMD_DASHBOARD2_V1401_BOOT_BAR_HEADER_PILL
   V1.4.0.1
   ============================================================ */
(function () {
  'use strict';

  if (
    window
      .PMDDashboard2BootBarPillV1401
  ) {
    return;
  }

  const VERSION = '1.4.0.1';

  const ROOT_ID =
    'pmd-dashboard2-analytics-v1';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const PILL_SELECTOR =
    ':scope > header .pmd-dashboard2-chart-key';

  const state = {
    attempts: 0,
    bootRepairs: 0,
    lastReason: null,
    lastResult: null,
    stopped: false
  };

  let timer = null;

  function currentMode() {
    const workspace =
      window.PMDDashboard2FinalWorkspace;

    const workspaceMode =
      workspace &&
      typeof workspace.getChartMode ===
        'function'
        ? workspace.getChartMode()
        : null;

    if (
      workspaceMode === 'bar' ||
      workspaceMode === 'line'
    ) {
      return workspaceMode;
    }

    const root =
      document.getElementById(
        ROOT_ID
      );

    const rootMode =
      root?.getAttribute(
        'data-chart-mode'
      );

    if (
      rootMode === 'bar' ||
      rootMode === 'line'
    ) {
      return rootMode;
    }

    try {
      const stored =
        localStorage.getItem(
          'pmd.dashboard2.salesChartMode.v1'
        );

      if (
        stored === 'bar' ||
        stored === 'line'
      ) {
        return stored;
      }
    } catch (error) {
      // localStorage may be unavailable.
    }

    return null;
  }

  function inspect() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const card =
      root?.querySelector(
        CARD_SELECTOR
      );

    const headerPills =
      card
        ? [
            ...card.querySelectorAll(
              PILL_SELECTOR
            )
          ]
        : [];

    const body =
      card?.querySelector(
        '[data-pmd-widget-body]'
      );

    const svg =
      body?.querySelector('svg');

    return {
      root,
      card,
      body,
      svg,
      headerPills,
      mode: currentMode()
    };
  }

  function attempt(reason) {
    if (state.stopped) {
      return {
        applied: false,
        reason: 'stopped'
      };
    }

    state.attempts += 1;
    state.lastReason = reason;

    const parts = inspect();

    if (
      !parts.root ||
      !parts.card ||
      !parts.body ||
      !parts.svg
    ) {
      state.lastResult = {
        applied: false,
        reason: 'workspace-not-ready',
        mode: parts.mode
      };

      return state.lastResult;
    }

    if (parts.mode !== 'bar') {
      state.stopped = true;

      state.lastResult = {
        applied: false,
        reason: 'line-mode-no-pill-required',
        mode: parts.mode
      };

      return state.lastResult;
    }

    if (
      parts.headerPills.length === 1
    ) {
      state.stopped = true;

      state.lastResult = {
        applied: false,
        reason: 'bar-pill-already-present',
        mode: parts.mode,
        headerPillCount: 1
      };

      return state.lastResult;
    }

    const workspace =
      window.PMDDashboard2FinalWorkspace;

    if (
      !workspace ||
      typeof workspace.setChartMode !==
        'function'
    ) {
      state.lastResult = {
        applied: false,
        reason:
          'canonical-workspace-unavailable',
        mode: parts.mode
      };

      return state.lastResult;
    }

    /*
     * V1.4.0.0 هنگام setChartMode('bar') از Partial Renderer
     * استفاده می‌کند و Pill را بدون Full-page render می‌سازد.
     */
    workspace.setChartMode('bar');

    state.bootRepairs += 1;
    state.stopped = true;

    const after =
      inspect();

    state.lastResult = {
      applied: true,
      reason,
      mode: after.mode,
      headerPillCount:
        after.headerPills.length
    };

    console.info(
      '[PMD Dashboard2 Boot Bar Header Pill V1.4.0.1] Repaired',
      state.lastResult
    );

    return state.lastResult;
  }

  function schedule() {
    const delays = [
      0,
      80,
      180,
      350,
      700,
      1200,
      2000
    ];

    let index = 0;

    const next = () => {
      if (
        state.stopped ||
        index >= delays.length
      ) {
        return;
      }

      const delay =
        delays[index];

      index += 1;

      timer =
        window.setTimeout(() => {
          timer = null;

          const result =
            attempt(
              `boot-${delay}`
            );

          if (
            !state.stopped &&
            result.reason ===
              'workspace-not-ready'
          ) {
            next();
          }
        }, delay);
    };

    next();
  }

  window
    .PMDDashboard2BootBarPillV1401 = {
      version: VERSION,

      refresh() {
        state.stopped = false;

        return attempt(
          'manual-refresh'
        );
      },

      stop() {
        state.stopped = true;

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        return this.audit();
      },

      audit() {
        const parts = inspect();

        const result = {
          version: VERSION,

          attempts:
            state.attempts,

          bootRepairs:
            state.bootRepairs,

          lastReason:
            state.lastReason,

          lastResult:
            state.lastResult,

          rootFound:
            Boolean(parts.root),

          cardFound:
            Boolean(parts.card),

          bodyFound:
            Boolean(parts.body),

          svgFound:
            Boolean(parts.svg),

          mode:
            parts.mode,

          headerPillCount:
            parts.headerPills.length,

          correctBootState:
            parts.mode === 'bar'
              ? (
                  parts.headerPills.length ===
                  1
                )
              : (
                  parts.headerPills.length ===
                  0
                )
        };

        console.info(
          '[PMD Dashboard2 Boot Bar Header Pill V1.4.0.1 Audit]',
          result
        );

        return result;
      }
    };

  if (
    document.readyState ===
      'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      schedule,
      {
        once: true
      }
    );
  } else {
    schedule();
  }

  console.info(
    '[PMD Dashboard2 Boot Bar Header Pill V1.4.0.1] Ready'
  );
})();

/* ============================================================
   PMD_DASHBOARD2_V1402_BOOT_BAR_WINDOW_SYNC
   V1.4.0.2
   ============================================================ */
(function () {
  'use strict';

  /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT: this delayed repair is replaced by canonical boot. */
  if (window.PMD_DASHBOARD2_ZERO_BLINK_V1410) {
    window.PMDDashboard2BootBarWindowV1402 = {
      version: 'disabled-by-v1410',
      refresh() { return this.audit(); },
      stop() { return this.audit(); },
      audit() {
        return {
          version: 'disabled-by-v1410',
          disabled: true,
          replacement: 'PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT'
        };
      }
    };
    return;
  }

  if (
    window
      .PMDDashboard2BootBarWindowV1402
  ) {
    return;
  }

  const VERSION = '1.4.0.2';

  const ROOT_ID =
    'pmd-dashboard2-analytics-v1';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const INPUT_SELECTOR =
    '.pmd-dashboard2-zoom-scrubber-v1375 input[type="range"]';

  const state = {
    attempts: 0,
    applications: 0,
    stopped: false,
    lastReason: null,
    lastResult: null
  };

  let timer = null;

  function currentMode() {
    const workspace =
      window.PMDDashboard2FinalWorkspace;

    const workspaceMode =
      workspace &&
      typeof workspace.getChartMode ===
        'function'
        ? workspace.getChartMode()
        : null;

    if (
      workspaceMode === 'bar' ||
      workspaceMode === 'line'
    ) {
      return workspaceMode;
    }

    const root =
      document.getElementById(
        ROOT_ID
      );

    const rootMode =
      root?.getAttribute(
        'data-chart-mode'
      );

    if (
      rootMode === 'bar' ||
      rootMode === 'line'
    ) {
      return rootMode;
    }

    try {
      const stored =
        localStorage.getItem(
          'pmd.dashboard2.salesChartMode.v1'
        );

      if (
        stored === 'bar' ||
        stored === 'line'
      ) {
        return stored;
      }
    } catch (error) {
      // localStorage may be unavailable.
    }

    return null;
  }

  function parts() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const card =
      root?.querySelector(
        CARD_SELECTOR
      );

    const body =
      card?.querySelector(
        '[data-pmd-widget-body]'
      );

    const svg =
      body?.querySelector(
        '.pmd-dashboard2-chart-frame svg'
      ) ||
      body?.querySelector('svg');

    const input =
      card?.querySelector(
        INPUT_SELECTOR
      );

    return {
      root,
      card,
      body,
      svg,
      input,
      mode: currentMode()
    };
  }

  function reveal(body) {
    if (!body) {
      return;
    }

    body.style.removeProperty(
      'visibility'
    );

    body.style.removeProperty(
      'opacity'
    );
  }

  function apply(reason) {
    if (state.stopped) {
      return {
        applied: false,
        reason: 'stopped'
      };
    }

    state.attempts += 1;
    state.lastReason = reason;

    const current = parts();

    if (
      current.mode === 'line'
    ) {
      state.stopped = true;

      reveal(current.body);

      state.lastResult = {
        applied: false,
        reason:
          'line-mode-no-bar-sync-required',
        mode: current.mode
      };

      return state.lastResult;
    }

    if (
      current.mode !== 'bar' ||
      !current.root ||
      !current.card ||
      !current.body ||
      !current.svg ||
      !current.input
    ) {
      state.lastResult = {
        applied: false,
        reason: 'bar-workspace-not-ready',
        mode: current.mode,

        rootFound:
          Boolean(current.root),

        cardFound:
          Boolean(current.card),

        bodyFound:
          Boolean(current.body),

        svgFound:
          Boolean(current.svg),

        inputFound:
          Boolean(current.input)
      };

      return state.lastResult;
    }

    /*
     * ستون‌های اولیه و قدیمی نباید قبل از اعمال Window فعلی
     * حتی برای یک Frame نمایش داده شوند.
     */
    current.body.style.setProperty(
      'visibility',
      'hidden',
      'important'
    );

    current.body.style.setProperty(
      'opacity',
      '0',
      'important'
    );

    /*
     * همان Handler واقعی Slider اجرا می‌شود، بدون تغییر مقدار آن.
     * بنابراین فقط salesOverTime و Window فعلی خودش به‌روزرسانی می‌شود.
     */
    current.input.dispatchEvent(
      new Event(
        'input',
        {
          bubbles: true
        }
      )
    );

    state.applications += 1;
    state.stopped = true;

    /*
     * Input Handler در requestAnimationFrame اجرا می‌شود.
     * بعد از دو Frame نمودار نهایی نمایش داده می‌شود.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reveal(current.body);
      });
    });

    state.lastResult = {
      applied: true,
      reason,
      mode: current.mode,

      sliderValue:
        current.input.value,

      sliderMin:
        current.input.min,

      sliderMax:
        current.input.max
    };

    console.info(
      '[PMD Dashboard2 Boot Bar Window Sync V1.4.0.2] Applied',
      state.lastResult
    );

    return state.lastResult;
  }

  function schedule() {
    const delays = [
      0,
      60,
      140,
      280,
      500,
      850,
      1300,
      2000
    ];

    let index = 0;

    const next = () => {
      if (
        state.stopped ||
        index >= delays.length
      ) {
        return;
      }

      const delay =
        delays[index];

      index += 1;

      timer =
        window.setTimeout(() => {
          timer = null;

          const result =
            apply(
              `boot-${delay}`
            );

          if (
            !state.stopped &&
            result.reason ===
              'bar-workspace-not-ready'
          ) {
            next();
          }
        }, delay);
    };

    next();
  }

  window
    .PMDDashboard2BootBarWindowV1402 = {
      version: VERSION,

      refresh() {
        state.stopped = false;

        return apply(
          'manual-refresh'
        );
      },

      stop() {
        state.stopped = true;

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        const current = parts();

        reveal(current.body);

        return this.audit();
      },

      audit() {
        const current =
          parts();

        const result = {
          version: VERSION,

          attempts:
            state.attempts,

          applications:
            state.applications,

          stopped:
            state.stopped,

          lastReason:
            state.lastReason,

          lastResult:
            state.lastResult,

          mode:
            current.mode,

          cardFound:
            Boolean(current.card),

          bodyFound:
            Boolean(current.body),

          svgFound:
            Boolean(current.svg),

          inputFound:
            Boolean(current.input),

          sliderValue:
            current.input?.value ??
            null,

          sliderMin:
            current.input?.min ??
            null,

          sliderMax:
            current.input?.max ??
            null,

          bodyVisibility:
            current.body
              ? getComputedStyle(
                  current.body
                ).visibility
              : null,

          bodyOpacity:
            current.body
              ? getComputedStyle(
                  current.body
                ).opacity
              : null,

          correctBootState:
            current.mode === 'bar'
              ? (
                  state.applications === 1 &&
                  Boolean(current.input) &&
                  getComputedStyle(
                    current.body
                  ).visibility !==
                    'hidden'
                )
              : true
        };

        console.info(
          '[PMD Dashboard2 Boot Bar Window Sync V1.4.0.2 Audit]',
          result
        );

        return result;
      }
    };

  if (
    document.readyState ===
      'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      schedule,
      {
        once: true
      }
    );
  } else {
    schedule();
  }

  console.info(
    '[PMD Dashboard2 Boot Bar Window Sync V1.4.0.2] Ready'
  );
})();


/* ============================================================
   PMD_DASHBOARD2_V1403_FINAL_BAR_BOOT_AUTHORITY
   V1.4.0.3
   ============================================================ */
(function () {
  'use strict';

  /* PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT: this delayed repair is replaced by canonical boot. */
  if (window.PMD_DASHBOARD2_ZERO_BLINK_V1410) {
    window.PMDDashboard2FinalBarBootV1403 = {
      version: 'disabled-by-v1410',
      refresh() { return this.audit(); },
      stop() { return this.audit(); },
      audit() {
        return {
          version: 'disabled-by-v1410',
          disabled: true,
          replacement: 'PMD_DASHBOARD2_V1410_ZERO_BLINK_CANONICAL_BOOT'
        };
      }
    };
    return;
  }

  if (
    window
      .PMDDashboard2FinalBarBootV1403
  ) {
    return;
  }

  const VERSION = '1.4.0.3';

  const ROOT_ID =
    'pmd-dashboard2-analytics-v1';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const INPUT_SELECTOR =
    '.pmd-dashboard2-zoom-scrubber-v1375 input[type="range"]';

  const PREPAINT_CLASS =
    'pmd-dashboard2-v1403-bar-boot';

  const state = {
    attempts: 0,
    applications: 0,
    completed: false,
    lastReason: null,
    lastResult: null,
    visibleBarsBefore: null,
    visibleBarsAfter: null
  };

  let timer = null;

  function currentMode() {
    const workspace =
      window.PMDDashboard2FinalWorkspace;

    const workspaceMode =
      workspace &&
      typeof workspace.getChartMode ===
        'function'
        ? workspace.getChartMode()
        : null;

    if (
      workspaceMode === 'bar' ||
      workspaceMode === 'line'
    ) {
      return workspaceMode;
    }

    const root =
      document.getElementById(
        ROOT_ID
      );

    const rootMode =
      root?.getAttribute(
        'data-chart-mode'
      );

    if (
      rootMode === 'bar' ||
      rootMode === 'line'
    ) {
      return rootMode;
    }

    try {
      const stored =
        localStorage.getItem(
          'pmd.dashboard2.salesChartMode.v1'
        );

      if (
        stored === 'bar' ||
        stored === 'line'
      ) {
        return stored;
      }
    } catch (error) {
      // localStorage may be unavailable.
    }

    return null;
  }

  function getParts() {
    const root =
      document.getElementById(
        ROOT_ID
      );

    const card =
      root?.querySelector(
        CARD_SELECTOR
      );

    const body =
      card?.querySelector(
        '[data-pmd-widget-body]'
      );

    const frame =
      body?.querySelector(
        '.pmd-dashboard2-chart-frame'
      );

    const svg =
      frame?.querySelector('svg') ||
      body?.querySelector('svg');

    const input =
      card?.querySelector(
        INPUT_SELECTOR
      );

    return {
      root,
      card,
      body,
      frame,
      svg,
      input,
      mode: currentMode()
    };
  }

  function visible(element) {
    if (!element) {
      return false;
    }

    const style =
      getComputedStyle(element);

    const rect =
      element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function visibleBars(svg) {
    if (!svg) {
      return [];
    }

    return [
      ...svg.querySelectorAll('rect')
    ].filter(rect => {
      const width =
        Number(
          rect.getAttribute('width')
        );

      const height =
        Number(
          rect.getAttribute('height')
        );

      return (
        width > 1 &&
        height > 1 &&
        visible(rect)
      );
    });
  }

  function releasePrepaint() {
    document.documentElement.classList.remove(
      PREPAINT_CLASS
    );

    const parts =
      getParts();

    if (parts.body) {
      parts.body.style.removeProperty(
        'visibility'
      );

      parts.body.style.removeProperty(
        'opacity'
      );
    }
  }

  function dispatchRealInput(input) {
    input.dispatchEvent(
      new Event(
        'input',
        {
          bubbles: true
        }
      )
    );
  }

  function finalize(reason) {
    state.attempts += 1;
    state.lastReason = reason;

    const parts =
      getParts();

    if (
      parts.mode === 'line'
    ) {
      state.completed = true;

      releasePrepaint();

      state.lastResult = {
        applied: false,
        reason:
          'line-mode-no-bar-finalization',
        mode: parts.mode
      };

      return state.lastResult;
    }

    if (
      parts.mode !== 'bar' ||
      !parts.root ||
      !parts.card ||
      !parts.body ||
      !parts.svg ||
      !parts.input
    ) {
      state.lastResult = {
        applied: false,
        reason:
          'bar-workspace-not-ready',

        mode:
          parts.mode,

        rootFound:
          Boolean(parts.root),

        cardFound:
          Boolean(parts.card),

        bodyFound:
          Boolean(parts.body),

        svgFound:
          Boolean(parts.svg),

        inputFound:
          Boolean(parts.input)
      };

      return state.lastResult;
    }

    /*
     * ابتدا آخرین Refresh واقعی V1.3.7.5 انجام می‌شود.
     * این Refresh هر تغییر دیرهنگام Default Density یا Boot Pill
     * را پشت سر می‌گذارد.
     */
    window
      .PMDDashboard2ZoomDensityV1375
      ?.refresh?.();

    const fresh =
      getParts();

    if (
      !fresh.input ||
      !fresh.svg
    ) {
      state.lastResult = {
        applied: false,
        reason:
          'workspace-replaced-during-refresh'
      };

      return state.lastResult;
    }

    state.visibleBarsBefore =
      visibleBars(
        fresh.svg
      ).length;

    /*
     * مقدار Slider تغییر نمی‌کند؛ فقط Window واقعی آن
     * روی SVG تازه ساخته‌شده اعمال می‌شود.
     */
    dispatchRealInput(
      fresh.input
    );

    state.applications += 1;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const after =
          getParts();

        window
          .PMDDashboard2SalesAxisV1393
          ?.refresh?.();

        state.visibleBarsAfter =
          visibleBars(
            after.svg
          ).length;

        state.completed = true;

        releasePrepaint();

        console.info(
          '[PMD Dashboard2 Final Bar Boot Authority V1.4.0.3] Completed',
          {
            reason,
            sliderValue:
              after.input?.value ??
              null,

            visibleBarsBefore:
              state.visibleBarsBefore,

            visibleBarsAfter:
              state.visibleBarsAfter
          }
        );
      });
    });

    state.lastResult = {
      applied: true,
      reason,
      mode: fresh.mode,

      sliderValue:
        fresh.input.value,

      sliderMin:
        fresh.input.min,

      sliderMax:
        fresh.input.max
    };

    return state.lastResult;
  }

  function schedule() {
    /*
     * Bootهای شناخته‌شده قبلی تا حدود 2000ms اجرا می‌شوند.
     * این Authority بعد از همه آن‌ها فقط یک Final pass دارد.
     */
    timer =
      window.setTimeout(() => {
        timer = null;

        finalize(
          'final-boot-2300'
        );

        /*
         * فقط در صورتی که Workspace هنوز آماده نبوده باشد،
         * یک Retry نهایی انجام می‌شود.
         */
        if (!state.completed) {
          timer =
            window.setTimeout(() => {
              timer = null;

              finalize(
                'final-boot-retry-2900'
              );

              if (!state.completed) {
                releasePrepaint();
              }
            }, 600);
        }
      }, 2300);
  }

  window
    .PMDDashboard2FinalBarBootV1403 = {
      version: VERSION,

      refresh() {
        state.completed = false;

        document.documentElement.classList.add(
          PREPAINT_CLASS
        );

        return finalize(
          'manual-refresh'
        );
      },

      stop() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        state.completed = true;

        releasePrepaint();

        return this.audit();
      },

      audit() {
        const parts =
          getParts();

        const result = {
          version: VERSION,

          attempts:
            state.attempts,

          applications:
            state.applications,

          completed:
            state.completed,

          lastReason:
            state.lastReason,

          lastResult:
            state.lastResult,

          mode:
            parts.mode,

          cardFound:
            Boolean(parts.card),

          svgFound:
            Boolean(parts.svg),

          inputFound:
            Boolean(parts.input),

          sliderValue:
            parts.input?.value ??
            null,

          sliderMin:
            parts.input?.min ??
            null,

          sliderMax:
            parts.input?.max ??
            null,

          visibleBarCount:
            visibleBars(
              parts.svg
            ).length,

          visibleBarsBefore:
            state.visibleBarsBefore,

          visibleBarsAfter:
            state.visibleBarsAfter,

          prepaintGuardActive:
            document.documentElement
              .classList.contains(
                PREPAINT_CLASS
              ),

          bodyVisibility:
            parts.body
              ? getComputedStyle(
                  parts.body
                ).visibility
              : null,

          bodyOpacity:
            parts.body
              ? getComputedStyle(
                  parts.body
                ).opacity
              : null,

          correctFinalState:
            parts.mode === 'bar'
              ? (
                  state.completed &&
                  state.applications === 1 &&
                  !document.documentElement
                    .classList.contains(
                      PREPAINT_CLASS
                    ) &&
                  getComputedStyle(
                    parts.body
                  ).visibility !==
                    'hidden'
                )
              : true
        };

        console.info(
          '[PMD Dashboard2 Final Bar Boot Authority V1.4.0.3 Audit]',
          result
        );

        return result;
      }
    };

  if (
    document.readyState ===
      'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      schedule,
      {
        once: true
      }
    );
  } else {
    schedule();
  }

  console.info(
    '[PMD Dashboard2 Final Bar Boot Authority V1.4.0.3] Ready'
  );
})();


/* ============================================================
   PMD_DASHBOARD2_V1413_FIRST_PAINT_LOCK
   One-time reveal after all synchronous DOMContentLoaded owners.
   No timeout, polling or MutationObserver.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDDashboard2FirstPaintLockV1413) {
    return;
  }

  const VERSION = '1.4.1.3';
  const READY_CLASS = 'pmd-dashboard2-v1413-ready';

  const state = {
    revealRequests: 0,
    revealCommits: 0,
    revealed: false,
    lastReason: null
  };

  function reveal(reason) {
    state.revealRequests += 1;
    state.lastReason = reason;

    if (
      document.documentElement.classList.contains(
        READY_CLASS
      )
    ) {
      state.revealed = true;
      return true;
    }

    /*
     * PMD_DASHBOARD2_V1413_FAST_REVEAL
     *
     * Reveal immediately in the same DOMContentLoaded turn.
     * The initial paint lock still prevents old Reservations2 UI
     * from becoming visible.
     */
    document.documentElement.classList.add(
      READY_CLASS
    );

    state.revealCommits += 1;
    state.revealed = true;

    console.info(
      '[PMD Dashboard2 First Paint Lock V1.4.1.3 Fast Reveal] Revealed',
      {
        reason,
        analyticsFound: Boolean(
          document.getElementById(
            'pmd-dashboard2-analytics-v1'
          )
        )
      }
    );

    return true;
  }

  window.PMDDashboard2FirstPaintLockV1413 = {
    version: VERSION,

    reveal() {
      return reveal('manual');
    },

    audit() {
      const page = document.getElementById(
        'pmd-reservations2'
      );

      const analytics = document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

      const style = page
        ? getComputedStyle(page)
        : null;

      const result = {
        version: VERSION,

        revealRequests:
          state.revealRequests,

        revealCommits:
          state.revealCommits,

        revealed:
          state.revealed,

        lastReason:
          state.lastReason,

        readyClass:
          document.documentElement.classList.contains(
            READY_CLASS
          ),

        pageFound:
          Boolean(page),

        analyticsFound:
          Boolean(analytics),

        pageOpacity:
          style?.opacity ?? null,

        pointerEvents:
          style?.pointerEvents ?? null,

        correctState:
          Boolean(
            state.revealed &&
            document.documentElement.classList.contains(
              READY_CLASS
            ) &&
            page &&
            analytics &&
            Number(style?.opacity) === 1
          )
      };

      console.info(
        '[PMD Dashboard2 First Paint Lock V1.4.1.3 Audit]',
        result
      );

      return result;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        reveal('dom-content-loaded');
      },
      {
        once: true
      }
    );
  } else {
    reveal('already-loaded');
  }
})();
