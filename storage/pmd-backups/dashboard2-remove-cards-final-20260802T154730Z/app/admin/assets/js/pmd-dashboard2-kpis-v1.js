(function () {
  'use strict';

  var route = String(location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/dashboard2') return;

  var VERSION = '2.4.0';
  var SECTION_ID = 'pmd-r2-reservation-kpis-v307';
  var ROOT_ID = 'pmd-reservations2';
  var HEADER_ID = 'pmd-r2-clean-header';
  var FLOOR_ID = 'pmd-r2-shared-floor-canvas-v310';
  var TOOLBAR_ID = 'pmd-r2-floor-toolbar-v316';
  var DATE_WRAP_ID = 'pmd-dashboard2-date-wrap-v2';
  var DATE_BUTTON_ID = 'pmd-r2-date-button-v430';
  var DATE_PANEL_ID = 'pmd-dashboard2-date-panel-v2';
  var STORAGE_KEY = 'pmd.dashboard2.kpis.selection.v2';
  var DATE_STORAGE_KEY = 'pmd.dashboard2.dateRange.v2';
  var DEFAULTS = ['revenue', 'guests', 'turnover', 'channels'];
  var ORDER = ['revenue', 'guests', 'turnover', 'channels', 'kitchen', 'occupancy', 'menu', 'tips'];
  var metrics = normalizeMetrics(window.PMD_DASHBOARD2_KPIS || {});
  var activeMenu = null;
  var renderQueued = false;
  var observer = null;

  function normalizeMetrics(input) {
    var output = {};
    if (Array.isArray(input)) {
      input.forEach(function (item) {
        if (item && item.key) output[item.key] = item;
      });
      return output;
    }
    if (input && typeof input === 'object') {
      Object.keys(input).forEach(function (key) {
        if (input[key] && typeof input[key] === 'object') {
          output[key] = Object.assign({key: key}, input[key]);
        }
      });
    }
    return output;
  }

  function metric(key) {
    return metrics[key] || {
      key: key,
      title: key,
      tone: 'green',
      icon: 'money',
      value: '—',
      description: 'No data available',
      connected: false,
      source: 'not detected',
      error: null
    };
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
      menu: '<path d="M4 6h16M4 12h16M4 18h16"></path><path d="M8 4v4M14 10v4M18 16v4"></path>',
      star: '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
      minus: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6"></path>',
      plus: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (paths[name] || paths.money) + '</svg>';
  }

  function readSelection() {
    var value = null;
    try { value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) {}
    if (!Array.isArray(value) || value.length !== 4) value = DEFAULTS.slice();
    value = value.filter(function (key, index, list) {
      return ORDER.indexOf(key) !== -1 && list.indexOf(key) === index;
    });
    ORDER.forEach(function (key) {
      if (value.length < 4 && value.indexOf(key) === -1) value.push(key);
    });
    return value.slice(0, 4);
  }

  function writeSelection(selection) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); } catch (error) {}
  }

  function closeMenu() {
    if (!activeMenu) return;
    var menu = activeMenu;
    activeMenu = null;
    menu.hidden = true;
    var card = menu.closest('.pmd-r2-kpi-v2401-card');
    if (card) {
      card.classList.remove('is-menu-open');
      var button = card.querySelector('[data-pmd-dashboard2-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    }
  }

  function selectMetric(slot, key) {
    var selection = readSelection();
    var previous = selection[slot];
    var duplicate = selection.indexOf(key);
    if (duplicate !== -1 && duplicate !== slot) selection[duplicate] = previous;
    selection[slot] = key;
    writeSelection(selection);
    closeMenu();
    renderKpis();
  }

  function createMenu(slot, selectedKey) {
    var menu = document.createElement('div');
    menu.className = 'pmd-r2-kpi-v2401-menu pmd-dashboard2-kpi-menu-v2';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    ORDER.forEach(function (key) {
      var item = metric(key);
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'pmd-r2-kpi-v2401-option';
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', key === selectedKey ? 'true' : 'false');
      if (key === selectedKey) option.classList.add('is-selected');
      option.innerHTML =
        '<span class="pmd-r2-kpi-v2401-option-icon">' + icon(item.icon) + '</span>' +
        '<span class="pmd-r2-kpi-v2401-option-copy">' +
          '<strong>' + escapeHtml(item.title) + '</strong>' +
          '<small>' + escapeHtml(item.value) + ' · ' +
            (item.connected ? 'Connected' : 'Source unavailable') + '</small>' +
        '</span>' +
        '<span class="pmd-r2-kpi-v2401-check">' + (key === selectedKey ? '✓' : '') + '</span>';
      option.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        selectMetric(slot, key);
      });
      menu.appendChild(option);
    });

    return menu;
  }

  function createCard(slot, key) {
    var item = metric(key);
    var card = document.createElement('article');
    card.className = 'pmd-r2-kpi-v2401-card';
    card.dataset.pmdKpiV2401Key = key;
    card.dataset.pmdKpiV2401Tone = item.tone || 'green';
    card.dataset.pmdKpiV2401Slot = String(slot);
    card.dataset.pmdDashboard2Kpi = key;
    card.dataset.pmdConnected = item.connected ? 'true' : 'false';
    card.title = item.source || '';

    card.innerHTML =
      '<div class="pmd-r2-kpi-v2401-icon">' + icon(item.icon) + '</div>' +
      '<div class="pmd-r2-kpi-v2401-copy">' +
        '<span class="pmd-r2-kpi-v2401-title">' + escapeHtml(item.title) + '</span>' +
        '<strong class="pmd-r2-kpi-v2401-value">' + escapeHtml(item.value) + '</strong>' +
        '<span class="pmd-r2-kpi-v2401-description">' + escapeHtml(item.description) + '</span>' +
      '</div>' +
      '<button type="button" class="pmd-r2-kpi-v2401-more" ' +
        'data-pmd-dashboard2-kpi-menu-button aria-label="Change KPI" ' +
        'aria-haspopup="menu" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>';

    var menu = createMenu(slot, key);
    card.appendChild(menu);
    var button = card.querySelector('[data-pmd-dashboard2-kpi-menu-button]');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var wasOpen = !menu.hidden;
      closeMenu();
      if (!wasOpen) {
        menu.hidden = false;
        activeMenu = menu;
        card.classList.add('is-menu-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });

    return card;
  }

  function directBranch(ancestor, descendant) {
    if (!ancestor || !descendant || !ancestor.contains(descendant)) return null;
    var branch = descendant;
    while (branch.parentElement && branch.parentElement !== ancestor) branch = branch.parentElement;
    return branch.parentElement === ancestor ? branch : null;
  }

  function ensureSection() {
    var root = document.getElementById(ROOT_ID);
    var header = document.getElementById(HEADER_ID);
    if (!root || !header) return null;
    var headerBranch = directBranch(root, header);
    if (!headerBranch) return null;
    var section = document.getElementById(SECTION_ID);
    if (!section) {
      section = document.createElement('section');
      section.id = SECTION_ID;
    }
    section.className = 'pmd-r2-kpis-v2401 pmd-dashboard2-kpis-v2';
    section.dataset.pmdKpiAuthority = 'dashboard2-v2';
    section.setAttribute('aria-label', 'Owner dashboard KPIs');
    if (section.parentElement !== root || headerBranch.nextElementSibling !== section) {
      headerBranch.insertAdjacentElement('afterend', section);
    }
    return section;
  }

  function renderKpis() {
    var section = ensureSection();
    if (!section) return false;
    closeMenu();
    var selection = readSelection();
    section.replaceChildren();
    selection.forEach(function (key, slot) {
      section.appendChild(createCard(slot, key));
    });
    return true;
  }

  function refreshData() {
    return fetch('/admin/dashboard2?pmd_kpis=1&_=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {'Accept': 'application/json'}
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.ok !== true || !payload.metrics) throw new Error('Invalid KPI payload');
      metrics = normalizeMetrics(payload.metrics);
      renderKpis();
      return auditData();
    }).catch(function (error) {
      console.warn('[PMD Dashboard2 KPIs V2] Refresh failed', error);
      return auditData();
    });
  }


  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.setTimeout(function () {
      renderQueued = false;
      var section = document.getElementById(SECTION_ID);
      if (!section ||
          section.dataset.pmdKpiAuthority !== 'dashboard2-v2' ||
          section.querySelectorAll('[data-pmd-dashboard2-kpi]').length !== 4) {
        renderKpis();
      }
    }, 20);
  }

  function auditData() {
    var report = {};
    ORDER.forEach(function (key) {
      var item = metric(key);
      report[key] = {
        value: item.value,
        description: item.description,
        connected: item.connected === true,
        source: item.source || '',
        error: item.error || null
      };
    });
    return report;
  }

  function boot() {
    renderKpis();

    document.addEventListener('click', function (event) {
      if (activeMenu &&
          !activeMenu.contains(event.target) &&
          !event.target.closest('[data-pmd-dashboard2-kpi-menu-button]')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('pmd:floor:updated', scheduleRender);
    window.addEventListener('pmd:table-status:updated', function () {
      refreshData();
      scheduleRender();
    });

    var root = document.getElementById(ROOT_ID);
    if (root && window.MutationObserver) {
      observer = new MutationObserver(scheduleRender);
      observer.observe(root, {childList: true, subtree: true});
    }

    [80, 250, 700, 1400].forEach(function (delay) {
      window.setTimeout(scheduleRender, delay);
    });

    window.setInterval(refreshData, 30000);

    window.PMDDashboard2KpisV2 = {
      version: VERSION,
      render: renderKpis,
      refresh: refreshData,
      reset: function () {
        try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
        renderKpis();
      },
      audit: function () {
        var section = document.getElementById(SECTION_ID);
        return {
          version: VERSION,
          visibleCards: section
            ? section.querySelectorAll('[data-pmd-dashboard2-kpi]').length
            : 0,
          selection: readSelection(),
          authority: section ? section.dataset.pmdKpiAuthority : null
        };
      },
      auditData: auditData,
      logDataAudit: function () {
        var report = auditData();
        console.table(Object.keys(report).map(function (key) {
          return Object.assign({key: key}, report[key]);
        }));
        return report;
      }
    };

    console.info(
      '[PMD Dashboard2 KPI Authority V2.4.0] Ready',
      window.PMDDashboard2KpisV2.audit()
    );

    refreshData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
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
