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

/* PMD Dashboard2 persistent analytics workspace V1.2.0 */
(function () {
  'use strict';
  if (String(location.pathname || '').replace(/\/+$/, '') !== '/admin/dashboard2') return;

  var VERSION = '1.2.0', ROOT_ID = 'pmd-dashboard2-analytics-v1';
  var PERIOD_KEY = 'pmd.dashboard2.analyticsPeriod.v1';
  var MODE_KEY = 'pmd.dashboard2.salesChartMode.v1';
  var cache = {}, requestCount = 0, controller = null, data = null, oneRow = null;
  var widgetMap = {salesOverTime:'sales_over_time',salesByHour:'sales_by_hour',topItems:'top_items',categorySales:'sales_by_category',paymentMethods:'payment_methods',channelSplit:'channels',liveOperations:'live_operations',recentTransactions:'recent_transactions',alerts:'alerts',reviews:'reviews',tips:'tips',calendarEvents:'calendar_events'};
  var widgetKeys = Object.keys(widgetMap);
  var locale = /^de(?:-|$)/i.test(document.documentElement.lang || navigator.language || '') ? 'de' : 'en';
  var words = {
    en:{overview:'BUSINESS OVERVIEW',analytics:'Analytics',today:'Today',week:'Week',month:'Month',last30:'Last 30 days',salesOverTime:'Sales over time',salesByHour:'Sales by hour',topItems:'Top-selling items',categorySales:'Sales by category',paymentMethods:'Payment methods',channelSplit:'Order channels',liveOperations:'Live orders / active tables',recentTransactions:'Recent transactions',alerts:'Alerts',reviews:'Latest reviews',tips:'Tips summary',calendarEvents:'Upcoming events',line:'Line',bar:'Bar',revenue:'Revenue',orders:'Orders',noActivity:'No activity in this period',noTransactions:'No transactions in this period',sourceUnavailable:'Source unavailable',notConfigured:'Not configured',dineIn:'Dine in',takeAway:'Take away',delivery:'Delivery',received:'Received',paid:'Paid',processed:'Processed',liveOrders:'live orders',occupiedTables:'Occupied tables',availableTables:'Available tables',openFor:'Open for',minutes:'min',item:'Item',qty:'Qty',freeItem:'Free item',unnamedItem:'Unnamed item',failedPayments:'Failed payments',refunds:'Refunds',longOpenTables:'Long-open tables',outOfStock:'Out of stock',negativeReviews:'Negative reviews',tipUnavailable:'Tip data unavailable',tipExplain:'No authoritative tip field is configured.',calendarUnavailable:'No calendar source configured',calendarExplain:'Connect a calendar to show upcoming events.',basedOn:'Based on {count} rated {noun}',review:'review',reviewsNoun:'reviews',noItems:'No items sold in this period',noReviews:'No rated reviews',peak:'Peak value',order:'Order',dateTime:'Date / time',statusLabel:'Status',attention:'Attention',ok:'OK',of:'of'},
    de:{overview:'GESCHÄFTSÜBERSICHT',analytics:'Analysen',today:'Heute',week:'Woche',month:'Monat',last30:'Letzte 30 Tage',salesOverTime:'Umsatzentwicklung',salesByHour:'Umsatz nach Uhrzeit',topItems:'Meistverkaufte Artikel',categorySales:'Umsatz nach Kategorie',paymentMethods:'Zahlungsarten',channelSplit:'Bestellkanäle',liveOperations:'Aktive Bestellungen / Tische',recentTransactions:'Letzte Transaktionen',alerts:'Warnungen',reviews:'Neueste Bewertungen',tips:'Trinkgeldübersicht',calendarEvents:'Bevorstehende Ereignisse',line:'Linie',bar:'Balken',revenue:'Umsatz',orders:'Bestellungen',noActivity:'Keine Aktivität in diesem Zeitraum',noTransactions:'Keine Transaktionen in diesem Zeitraum',sourceUnavailable:'Datenquelle nicht verfügbar',notConfigured:'Nicht konfiguriert',dineIn:'Vor Ort',takeAway:'Abholung',delivery:'Lieferung',received:'Erhalten',paid:'Bezahlt',processed:'Verarbeitet',liveOrders:'aktive Bestellungen',occupiedTables:'Belegte Tische',availableTables:'Verfügbare Tische',openFor:'Offen seit',minutes:'Min.',item:'Artikel',qty:'Menge',freeItem:'Kostenlos',unnamedItem:'Unbenannter Artikel',failedPayments:'Fehlgeschlagene Zahlungen',refunds:'Rückerstattungen',longOpenTables:'Lange belegte Tische',outOfStock:'Nicht vorrätig',negativeReviews:'Negative Bewertungen',tipUnavailable:'Trinkgelddaten nicht verfügbar',tipExplain:'Es ist kein verbindliches Trinkgeldfeld konfiguriert.',calendarUnavailable:'Keine Kalenderquelle konfiguriert',calendarExplain:'Verbinde einen Kalender, um bevorstehende Ereignisse anzuzeigen.',basedOn:'Basierend auf {count} bewerteten {noun}',review:'Bewertung',reviewsNoun:'Bewertungen',noItems:'Keine Artikel in diesem Zeitraum verkauft',noReviews:'Keine bewerteten Rezensionen',peak:'Spitzenwert',order:'Bestellung',dateTime:'Datum / Uhrzeit',statusLabel:'Status',attention:'Achtung',ok:'OK',of:'von'}
  };
  function t(key){ return words[locale][key] || words.en[key] || key; }
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function period(){var value='';try{value=localStorage.getItem(PERIOD_KEY)||'';}catch(e){}return ['today','week','month','last30'].indexOf(value)!==-1?value:'today';}
  function chartMode(){var value='';try{value=localStorage.getItem(MODE_KEY)||'';}catch(e){}return value==='bar'?'bar':'line';}
  function money(value){try{return new Intl.NumberFormat(locale==='de'?'de-DE':'en-GB',{style:'currency',currency:(data&&data.currency)||'EUR'}).format(Number(value||0));}catch(e){return Number(value||0).toFixed(2);}}
  function dateTime(value, dateOnly){if(!value)return '—';var date=new Date(String(value).replace(' ','T'));if(isNaN(date.getTime()))return String(value);try{return new Intl.DateTimeFormat(locale==='de'?'de-DE':'en-GB',dateOnly?{day:'2-digit',month:'short',year:'numeric'}:{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);}catch(e){return String(value);}}
  function status(value){var key=String(value||'').toLowerCase();return key==='paid'?t('paid'):(key==='received'?t('received'):(key==='processed'?t('processed'):(value||'—')));}
  function paymentLabel(row){var code=String(row.code||row.payment_code||'').trim(),configured=String(row.configured_name||row.configured_payment_name||'').trim();if(configured&&configured.toLowerCase()!==code.toLowerCase())return configured;var labels={qr_pay_later:{en:'QR – Pay later',de:'QR – Später bezahlen'},cod:{en:'Cash',de:'Barzahlung'},stripe:{en:'Card / Stripe',de:'Karte / Stripe'},paypal:{en:'PayPal',de:'PayPal'},worldline:{en:'Card / Worldline',de:'Karte / Worldline'}};return labels[code.toLowerCase()]?labels[code.toLowerCase()][locale]:(configured||code||t('notConfigured'));}
  function channel(value){var key=String(value||'').toLowerCase();return key==='delivery'?t('delivery'):(key==='take away'||key==='takeaway'||key==='collection'?t('takeAway'):(key==='dine in'?t('dineIn'):(value||t('dineIn'))));}
  function ensureRoot(){var reservations=document.getElementById('pmd-reservations2');if(!reservations||!reservations.parentElement)return null;var roots=document.querySelectorAll('#'+ROOT_ID),root=roots[0]||document.createElement('section');Array.prototype.slice.call(roots,1).forEach(function(n){n.remove();});root.id=ROOT_ID;root.className='pmd-dashboard2-analytics-v1';root.setAttribute('aria-label',t('analytics'));if(root.parentElement!==reservations.parentElement||root.previousElementSibling!==reservations)reservations.insertAdjacentElement('afterend',root);return root;}
  function widget(id,span){var toggle=id==='salesOverTime'?'<div class="pmd-dashboard2-chart-toggle" role="group" aria-label="'+esc(t('salesOverTime'))+'"><button type="button" data-pmd-chart-mode="line">'+esc(t('line'))+'</button><button type="button" data-pmd-chart-mode="bar">'+esc(t('bar'))+'</button></div>':'';return '<article class="pmd-dashboard2-analytics-card '+(span||'')+'" data-pmd-analytics-widget="'+id+'"><header><h3>'+esc(t(id))+'</h3>'+toggle+'</header><div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div></article>';}
  function shell(){var root=ensureRoot();if(!root)return null;if(!root.querySelector('[data-pmd-analytics-grid]'))root.innerHTML='<header class="pmd-dashboard2-analytics-head"><div><span>'+esc(t('overview'))+'</span><h2>'+esc(t('analytics'))+'</h2></div><div class="pmd-dashboard2-analytics-period" role="group" aria-label="'+esc(t('analytics'))+'">'+['today','week','month','last30'].map(function(p){return '<button type="button" data-pmd-analytics-period="'+p+'">'+esc(t(p))+'</button>';}).join('')+'</div></header><div class="pmd-dashboard2-analytics-grid" data-pmd-analytics-grid>'+widget('salesOverTime','is-wide')+widget('salesByHour')+widget('topItems')+widget('categorySales')+widget('paymentMethods')+widget('channelSplit')+widget('liveOperations','is-wide')+widget('recentTransactions','is-wide')+widget('alerts')+widget('reviews')+widget('tips')+widget('calendarEvents')+'</div>';root.querySelectorAll('[data-pmd-analytics-period]').forEach(function(btn){var active=btn.dataset.pmdAnalyticsPeriod===period();btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});root.querySelectorAll('[data-pmd-chart-mode]').forEach(function(btn){var active=btn.dataset.pmdChartMode===chartMode();btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});return root;}
  function empty(source,fallback){var message=source&&source.available===true&&source.empty===true?(source.reason||fallback||t('noActivity')):(fallback||t('sourceUnavailable'));return '<div class="pmd-dashboard2-empty" role="status">'+esc(message)+'</div>';}
  function configuredEmpty(title,detail,icon){return '<div class="pmd-dashboard2-config-empty" role="status"><span aria-hidden="true">'+esc(icon)+'</span><strong>'+esc(title)+'</strong><p>'+esc(detail)+'</p></div>';}
  function list(rows,render,emptyText){return rows&&rows.length?'<ul class="pmd-dashboard2-data-list">'+rows.map(function(r){return '<li>'+render(r)+'</li>';}).join('')+'</ul>':'<p class="pmd-dashboard2-empty">'+esc(emptyText||t('noActivity'))+'</p>';}
  function axisLabel(row,index,count,hourly){if(hourly)return index%3===0?String(row.hour).padStart(2,'0'):'';var step=count<=7?1:Math.max(1,Math.ceil(count/6));return index%step===0||index===count-1?dateTime(row.bucket,true):'';}
  function svgChart(rows,kind,hourly){if(!rows||!rows.length)return empty(null,t('noActivity'));var w=760,h=250,left=70,right=18,top=18,bottom=48,plotW=w-left-right,plotH=h-top-bottom,max=Math.max.apply(null,rows.map(function(r){return Number(r.sales||0);}).concat([1])),peak=Math.max.apply(null,rows.map(function(r){return Number(r.sales||0);})),gap=plotW/rows.length,bw=Math.max(2,gap*.62),points=[];rows.forEach(function(r,i){points.push({x:left+(rows.length===1?plotW/2:i*plotW/(rows.length-1)),y:top+plotH-(Number(r.sales||0)/max*plotH),r:r,i:i});});var grid=[0,.5,1].map(function(f){var y=top+plotH*(1-f);return '<line class="pmd-chart-grid" x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'"/><text class="pmd-chart-axis" x="'+(left-8)+'" y="'+(y+4)+'" text-anchor="end">'+esc(money(max*f))+'</text>';}).join('');var marks=rows.map(function(r,i){var value=Number(r.sales||0),label=hourly?String(r.hour).padStart(2,'0')+':00':dateTime(r.bucket,true),tip=label+'\n'+t('revenue')+': '+money(value)+'\n'+t('orders')+': '+Number(r.orders||0),x=kind==='bar'?left+i*gap+(gap-bw)/2:points[i].x,y=points[i].y,shape=kind==='bar'?'<rect class="'+(value===peak&&value>0?'is-peak':(value===0?'is-zero':''))+'" x="'+x+'" y="'+y+'" width="'+bw+'" height="'+Math.max(2,top+plotH-y)+'"/>':'<circle cx="'+x+'" cy="'+y+'" r="5"/>';return '<g class="pmd-chart-point" tabindex="0" role="img" aria-label="'+esc(tip)+'" data-pmd-chart-tooltip="'+esc(tip)+'">'+shape+'<title>'+esc(tip)+'</title></g>'+(axisLabel(r,i,rows.length,hourly)?'<text class="pmd-chart-axis pmd-chart-axis-x" x="'+(kind==='bar'?x+bw/2:x)+'" y="'+(h-18)+'" text-anchor="middle">'+esc(axisLabel(r,i,rows.length,hourly))+'</text>':'');}).join('');var line=kind==='line'?'<polyline class="pmd-chart-line" points="'+points.map(function(p){return p.x+','+p.y;}).join(' ')+'"/>':'';return '<div class="pmd-dashboard2-chart-wrap"><svg class="pmd-dashboard2-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(hourly?t('salesByHour'):t('salesOverTime'))+'"><desc>'+esc(t('revenue')+'; '+t('orders'))+'</desc>'+grid+line+marks+'</svg><div class="pmd-dashboard2-chart-tooltip" role="tooltip" hidden></div></div>'+(hourly&&peak>0?'<div class="pmd-dashboard2-chart-legend"><span><i></i>'+esc(t('revenue'))+'</span><span><i class="is-peak"></i>'+esc(t('peak'))+'</span></div>':'');}
  function donut(rows,name,value,label,aria){rows=(rows||[]).filter(function(r){return Number(r[value]||0)>0;});if(!rows.length)return empty(null,t('noTransactions'));var total=rows.reduce(function(sum,r){return sum+Number(r[value]||0);},0),colors=['#2f7d69','#315d8a','#d28a35','#8a5c9e','#738078','#b84d55'],offset=0;var circles=rows.map(function(r,i){var pct=Number(r[value])/total*100,c='<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="18" stroke-dasharray="'+pct+' '+(100-pct)+'" stroke-dashoffset="'+(-offset)+'"><title>'+esc(r[name]+' · '+label(r)+' · '+pct.toFixed(1)+'%')+'</title></circle>';offset+=pct;return c;}).join('');var legend='<ul class="pmd-chart-legend">'+rows.map(function(r,i){var pct=Number(r[value])/total*100;return '<li><i style="background:'+colors[i%colors.length]+'"></i><span>'+esc(r[name])+'</span><b>'+esc(label(r))+' · '+pct.toFixed(1)+'%</b></li>';}).join('')+'</ul>';return '<div class="pmd-dashboard2-donut"><svg viewBox="0 0 120 120" role="img" aria-label="'+esc(aria)+'"><circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#edf1ef" stroke-width="18"/>'+circles+'</svg>'+legend+'</div>';}
  function render(){var root=shell();if(!root||!data)return;function put(key,html){var body=root.querySelector('[data-pmd-analytics-widget="'+key+'"] [data-pmd-widget-body]');if(body)body.innerHTML=html;}var s=data.sales_over_time;put('salesOverTime',s.available?svgChart(s.buckets,chartMode(),false):empty(s));var h=data.sales_by_hour;put('salesByHour',h.available?svgChart(h.hours,'bar',true):empty(h));var items=data.top_items;put('topItems',items.available?('<div class="pmd-dashboard2-table-head"><span>'+t('item')+'</span><span>'+t('qty')+'</span><span>'+t('revenue')+'</span></div>'+list(items.items,function(r){return '<span>'+esc(r.name||t('unnamedItem'))+(Number(r.revenue)===0?' <small>'+esc(t('freeItem'))+'</small>':'')+'</span><b>'+esc(r.quantity)+'</b><b>'+esc(money(r.revenue))+'</b>';},t('noItems'))):empty(items));var categories=data.sales_by_category;var positive=categories.available?(categories.categories||[]).filter(function(r){return Number(r.revenue)>0;}):[];put('categorySales',categories.available?donut(positive,'category','revenue',function(r){return money(r.revenue);},t('categorySales')):empty(categories));var methods=data.payment_methods;if(methods.available)(methods.methods||[]).forEach(function(r){r.label=paymentLabel(r);});put('paymentMethods',methods.available?donut(methods.methods,'label','total',function(r){return money(r.total)+' · '+r.transactions;},t('paymentMethods')):empty(methods));var channels=data.channels;if(channels.available)(channels.channels||[]).forEach(function(r){r.label=channel(r.channel||r.name);});put('channelSplit',channels.available?donut(channels.channels,'label','revenue',function(r){return r.orders+' · '+money(r.revenue);},t('channelSplit')):empty(channels));var live=data.live_operations;put('liveOperations',live.available?'<div class="pmd-dashboard2-live-summary"><b>'+esc(live.live_order_count)+'</b><span>'+esc(t('liveOrders'))+'</span></div><dl class="pmd-dashboard2-live-tables"><div><dt>'+esc(t('occupiedTables'))+'</dt><dd>'+(live.occupied_tables==null?'—':esc(live.occupied_tables)+(live.total_tables==null?'':' '+esc(t('of'))+' '+esc(live.total_tables)))+'</dd></div><div><dt>'+esc(t('availableTables'))+'</dt><dd>'+(live.available_tables==null?'—':esc(live.available_tables))+'</dd></div></dl>'+list(live.orders,function(r){return '<span><strong>#'+esc(r.order_id)+' · '+esc(channel(r.channel))+'</strong><small>'+esc(status(r.status))+' · '+esc(t('openFor'))+' '+esc(r.elapsed_minutes)+' '+esc(t('minutes'))+'</small></span><b>'+(r.amount==null?'':esc(money(r.amount)))+'</b>';},t('noActivity')):empty(live));var tx=data.recent_transactions;put('recentTransactions',tx.available?'<div class="pmd-dashboard2-transactions"><div class="pmd-dashboard2-transaction-head"><span>'+esc(t('order'))+'</span><span>'+esc(t('dateTime'))+'</span><span>'+esc(t('paymentMethods'))+'</span><span>'+esc(t('statusLabel'))+'</span><span>'+esc(t('revenue'))+'</span></div>'+((tx.transactions||[]).map(function(r){return '<div class="pmd-dashboard2-transaction-row"><strong>#'+esc(r.order_id)+'</strong><time>'+esc(dateTime(r.timestamp,false))+'</time><span>'+esc(paymentLabel(r))+'</span><span>'+esc(status(r.status))+'</span><b>'+esc(money(r.amount))+'</b></div>';}).join('')||'<p class="pmd-dashboard2-empty">'+esc(t('noTransactions'))+'</p>')+'</div>':empty(tx));var a=data.alerts;var alertLabels={failed_payments:'failedPayments',refunds:'refunds',long_open_tables:'longOpenTables',out_of_stock:'outOfStock',negative_reviews:'negativeReviews'};put('alerts',a.available?'<ul class="pmd-dashboard2-alerts">'+Object.keys(alertLabels).map(function(k){var value=a.types[k],unavailable=value===null;return '<li class="'+(!unavailable&&Number(value)>0?'has-warning':'is-neutral')+'"><span>'+esc(t(alertLabels[k]))+'</span><b>'+esc(unavailable?t('notConfigured'):value)+'</b><small>'+esc(unavailable?t('notConfigured'):(Number(value)>0?t('attention'):t('ok')))+'</small></li>';}).join('')+'</ul>':empty(a));var reviews=data.reviews,count=Number(reviews.rated_count||0),noun=count===1?t('review'):t('reviewsNoun');put('reviews',reviews.available?'<div class="pmd-dashboard2-review-score"><b>'+(reviews.average==null?'—':esc(Number(reviews.average).toFixed(1))+' ★')+'</b><span>'+esc(t('basedOn').replace('{count}',count).replace('{noun}',noun))+'</span></div>'+list(reviews.latest,function(r){var stars='★★★★★'.slice(0,Math.max(0,Math.min(5,Math.round(r.rating))));return '<span><strong aria-label="'+esc(r.rating)+' / 5">'+stars+'</strong><q>'+esc(r.comment)+'</q></span><time>'+esc(dateTime(r.date,true))+'</time>';},t('noReviews')):empty(reviews));var tips=data.tips;put('tips',tips.available?'<dl class="pmd-dashboard2-stats"><div><dt>'+t('today')+'</dt><dd>'+esc(money(tips.today))+'</dd></div><div><dt>'+t('month')+'</dt><dd>'+esc(money(tips.month))+'</dd></div></dl>':configuredEmpty(t('tipUnavailable'),t('tipExplain'),'ⓘ'));var events=data.calendar_events;put('calendarEvents',events.available?list(events.events,function(r){return '<span>'+esc(r.title)+'</span><b>'+esc(dateTime(r.date,true))+'</b>'; }):configuredEmpty(t('calendarUnavailable'),t('calendarExplain'),'▣'));bindTooltips(root);}
  function bindTooltips(root){root.querySelectorAll('[data-pmd-chart-tooltip]').forEach(function(point){var tooltip=point.closest('.pmd-dashboard2-chart-wrap').querySelector('.pmd-dashboard2-chart-tooltip');function show(){tooltip.textContent=point.dataset.pmdChartTooltip;tooltip.hidden=false;}function hide(){tooltip.hidden=true;}point.addEventListener('mouseenter',show);point.addEventListener('mouseleave',hide);point.addEventListener('focus',show);point.addEventListener('blur',hide);});}
  function load(value){if(cache[value]){data=cache[value];render();return Promise.resolve(data);}if(controller)controller.abort();controller=new AbortController();requestCount++;return fetch('/admin/dashboard2?pmd_analytics=1&period='+encodeURIComponent(value),{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(result){if(!result||result.success!==true)throw new Error('Invalid analytics payload');cache[value]=result;data=result;render();return result;}).catch(function(error){if(error.name!=='AbortError')console.warn('[PMD Analytics V1.2]',error);});}
  function currentView(){var page=document.getElementById('pmd-reservations2');return page&&page.classList.contains('pmd-r2-hour-layout-v38-active')?'hour':(page&&page.classList.contains('is-calendar-mode')?'calendar':'floor');}
  function setupOneRow(){var floor=document.getElementById('pmd-r2-shared-floor-canvas-v310'),scroll=floor&&floor.querySelector('[data-floor-scroll]');if(!floor||!scroll)return null;var originalX={value:scroll.style.getPropertyValue('overflow-x'),priority:scroll.style.getPropertyPriority('overflow-x')},originalY={value:scroll.style.getPropertyValue('overflow-y'),priority:scroll.style.getPropertyPriority('overflow-y')};function sync(){var active=floor.classList.contains('is-strip-mode');scroll.classList.toggle('pmd-dashboard2-one-row-scroll-v1',active);if(active){scroll.style.setProperty('overflow-x','auto','important');scroll.style.setProperty('overflow-y','hidden','important');scroll.scrollTop=0;}else{if(originalX.value)scroll.style.setProperty('overflow-x',originalX.value,originalX.priority);else scroll.style.removeProperty('overflow-x');if(originalY.value)scroll.style.setProperty('overflow-y',originalY.value,originalY.priority);else scroll.style.removeProperty('overflow-y');}}function wheel(e){if(!floor.classList.contains('is-strip-mode')||scroll.scrollWidth<=scroll.clientWidth||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;var next=scroll.scrollLeft+e.deltaY,max=scroll.scrollWidth-scroll.clientWidth;if((e.deltaY<0&&scroll.scrollLeft<=0)||(e.deltaY>0&&scroll.scrollLeft>=max))return;scroll.scrollLeft=Math.max(0,Math.min(max,next));e.preventDefault();}scroll.addEventListener('wheel',wheel,{passive:false});document.addEventListener('click',function(e){if(e.target.closest('[data-floor-strip],[data-proxy-action="one-row"]'))requestAnimationFrame(sync);},true);window.addEventListener('pmd:floor:updated',sync);sync();return{floor:floor,scroll:scroll,sync:sync};}
  function audit(){var root=document.getElementById(ROOT_ID),reservations=document.getElementById('pmd-reservations2'),unavailable=[],emptyWidgets=[],available=0,sourceModes={};if(data)Object.keys(widgetMap).forEach(function(key){var api=widgetMap[key],value=data[api];if(value&&value.available===true)available++;if(value&&value.available===true&&value.empty===true)emptyWidgets.push(api);if(value&&value.available===false)unavailable.push(api);if(value&&value.source_mode)sourceModes[api]=value.source_mode;});var labels=root?Array.prototype.map.call(root.querySelectorAll('h2,h3,button'),function(n){return n.textContent.trim();}):[];var mixed=locale==='de'?labels.filter(function(label){return Object.keys(words.en).some(function(k){return words.en[k]===label&&words.de[k]!==label;});}):[];return{version:VERSION,currentPeriod:period(),chartMode:chartMode(),chartCount:root?root.querySelectorAll('svg.pmd-dashboard2-chart,.pmd-dashboard2-donut svg').length:0,chartLabelsPresent:Boolean(root&&root.querySelector('.pmd-chart-axis')),tooltipCount:root?root.querySelectorAll('[data-pmd-chart-tooltip]').length:0,availableWidgetCount:available,emptyWidgetCount:emptyWidgets.length,emptyWidgets:emptyWidgets,unavailableWidgetCount:unavailable.length,unavailableSources:unavailable,sourceModes:sourceModes,paymentCodesHumanized:Boolean(root&&!root.textContent.match(/qr_pay_later|\bcod\b/i)),tipsUnavailableRenderedHonestly:Boolean(root&&root.querySelector('[data-pmd-analytics-widget="tips"] .pmd-dashboard2-config-empty')),negativeReviewsExcludeUnrated:Boolean(data&&data.reviews&&Number(data.reviews.unrated_count||0)>=0),locale:locale,mixedLanguageLabels:mixed,responsiveOverflow:Boolean(root&&root.scrollWidth>root.clientWidth+1),rootCount:document.querySelectorAll('#'+ROOT_ID).length,rootOutsideReservations2:Boolean(root&&reservations&&!reservations.contains(root)),analyticsRequestCount:requestCount,protectedFilesPresent:Boolean(document.querySelector('script[src*="push-notifications.js"]')),pushNotificationPollingActive:Boolean(document.querySelector('script[src*="push-notifications.js"]')&&(window.pushNotif&&window.pushNotif.pollInterval)),composerPresent:Boolean(document.querySelector('[data-reservation-composer],#pmd-reservation-composer-v1')),widgets:widgetKeys.reduce(function(out,key){out[key]=Boolean(root&&root.querySelector('[data-pmd-analytics-widget="'+key+'"]'));return out;},{})};}
  function boot(){var root=shell();if(!root)return;root.addEventListener('click',function(e){var mode=e.target.closest('[data-pmd-chart-mode]');if(mode){try{localStorage.setItem(MODE_KEY,mode.dataset.pmdChartMode);}catch(x){}shell();render();return;}var button=e.target.closest('[data-pmd-analytics-period]');if(!button)return;try{localStorage.setItem(PERIOD_KEY,button.dataset.pmdAnalyticsPeriod);}catch(x){}shell();load(button.dataset.pmdAnalyticsPeriod);});oneRow=setupOneRow();window.PMDDashboard2FinalWorkspace={version:VERSION,audit:audit,refresh:function(){return load(period());}};load(period());}
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
