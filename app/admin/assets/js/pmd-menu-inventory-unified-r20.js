/* PMD_MENU_INVENTORY_UNIFIED_R22_SAFE
 * Stable same-page Menu + Inventory workspace.
 * R22 keeps one runtime owner: no KPI self-observer loops, no second polish JS.
 */
(function () {
  'use strict';

  if (window.PMDMenuInventoryUnifiedR20) return;

  var workspaceSwitchButton = document.querySelector('[data-pmd-workspace-toggle-r23]');
  var menuPanel = document.querySelector('[data-pmd-unified-menu-panel]');
  var inventoryPanel = document.querySelector('[data-pmd-unified-inventory-panel]');
  var usagePanel = document.querySelector('[data-pmd-stock-usage-workspace]');
  var inventoryRoot = document.querySelector('[data-pmd-inventory-root]');
  var menuGrid = document.querySelector('[data-pmd-menu-grid]');
  var stockUsageSetupButton = document.querySelector('[data-pmd-stock-usage-setup-r22]');
  var api = window.PMDInventoryControlR1 || null;

  if (!workspaceSwitchButton || !menuPanel || !inventoryPanel || !usagePanel || !inventoryRoot || !api) return;

  var headerTitle = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-title');
  var originalHeaderTitle = headerTitle
    ? String(headerTitle.getAttribute('data-pmd-menu-title') || 'Menu').trim()
    : 'Menu';
  var body = document.body;

  var usageState = {
    menuId: 0,
    menuName: '',
    query: '',
    category: 'All',
    selected: {},
    returnScrollY: 0
  };

  var catalogRows = [];
  var catalogByName = {};
  var kpiCatalog = {};
  var kpiSelection = ['stock_value', 'stock_health', 'attention', 'waste'];

  var stockUsageSetupActive = false;
  var menuKpiCatalog = {};
  var menuKpiSelection = ['menu_items', 'categories', 'stock_out', 'disabled'];
  var menuKpiRenderFrame = 0;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    value = String(value == null ? '' : value).trim().toLowerCase();
    try {
      value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (ignore) {}
    return value.replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function snapshot() {
    return api && typeof api.getSnapshot === 'function'
      ? (api.getSnapshot() || {})
      : {};
  }

  function stockItems() {
    var rows = snapshot().items;
    return Array.isArray(rows) ? rows : [];
  }

  function recipes() {
    var rows = snapshot().recipes;
    return Array.isArray(rows) ? rows : [];
  }

  function config() {
    return api && typeof api.getConfig === 'function' ? (api.getConfig() || {}) : {};
  }

  function money(value) {
    var n = Number(value || 0);
    var currency = String(config().currency || 'EUR');
    if (!Number.isFinite(n)) n = 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      }).format(n);
    } catch (ignore) {
      return n.toFixed(2) + ' ' + currency;
    }
  }

  function number(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: typeof digits === 'number' ? digits : 2,
      minimumFractionDigits: 0
    }).format(n);
  }

  function readJson(id, fallback) {
    var node = document.getElementById(id);
    if (!node) return fallback;
    try {
      var parsed = JSON.parse(node.textContent || '');
      return parsed == null ? fallback : parsed;
    } catch (ignore) {
      return fallback;
    }
  }

  function toast(message, error) {
    var old = document.querySelector('.pmd-menu-inventory-r20-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'pmd-menu-inventory-r20-toast' + (error ? ' is-error' : '');
    node.textContent = String(message || '');
    node.style.cssText =
      'position:fixed;z-index:13000;right:22px;bottom:22px;max-width:360px;padding:11px 14px;border-radius:12px;' +
      'background:' + (error ? '#ad2940' : '#0b6653') + ';color:#fff;font:800 11px/1.3 system-ui,sans-serif;' +
      'box-shadow:0 14px 38px rgba(0,0,0,.16)';
    document.body.appendChild(node);
    window.setTimeout(function () { node.remove(); }, 2800);
  }

  function setHeaderTitle(text) {
    if (headerTitle) headerTitle.textContent = String(text || originalHeaderTitle);
  }

  function setStockUsageSetup(active, quiet) {
    stockUsageSetupActive = Boolean(active);
    body.classList.toggle('pmd-menu-stock-usage-setup-r22', stockUsageSetupActive);

    if (stockUsageSetupButton) {
      stockUsageSetupButton.classList.toggle('is-active', stockUsageSetupActive);
      stockUsageSetupButton.setAttribute('aria-pressed', String(stockUsageSetupActive));
      stockUsageSetupButton.setAttribute(
        'title',
        stockUsageSetupActive ? 'Cancel stock usage setup' : 'Set stock usage'
      );
    }

    if (stockUsageSetupActive && !quiet) {
      toast('Choose Stock usage on the food you want to configure.');
    }
  }

  function updateUrlWorkspace(workspace) {
    try {
      var url = new URL(window.location.href);
      if (workspace === 'inventory') url.searchParams.set('workspace', 'inventory');
      else url.searchParams.delete('workspace');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());
    } catch (ignore) {}
  }

  function syncWorkspaceAction(name) {
    if (!workspaceSwitchButton) return;
    var inventoryActive = name === 'inventory';
    var nextLabel = inventoryActive ? 'Menu' : 'Inventory';
    workspaceSwitchButton.setAttribute('data-workspace', name);
    workspaceSwitchButton.setAttribute('aria-label', 'Open ' + nextLabel);
    workspaceSwitchButton.setAttribute('title', 'Open ' + nextLabel);
    var label = workspaceSwitchButton.querySelector('[data-pmd-workspace-toggle-label]');
    if (label) label.textContent = nextLabel;
  }

  function switchWorkspaceAnimated(name) {
    var target = name === 'inventory' ? 'inventory' : 'menu';
    if (
      (target === 'inventory' && !inventoryPanel.hidden)
      || (target === 'menu' && !menuPanel.hidden)
    ) {
      syncWorkspaceAction(target);
      return;
    }

    body.classList.add('pmd-workspace-switching-r23');
    window.setTimeout(function () {
      if (target === 'inventory') showInventory(true);
      else showMenu(true);
      window.requestAnimationFrame(function () {
        body.classList.remove('pmd-workspace-switching-r23');
      });
    }, 90);
  }

  function showMenu(updateUrl) {
    usagePanel.hidden = true;
    inventoryPanel.hidden = true;
    menuPanel.hidden = false;
    syncWorkspaceAction('menu');
    setStockUsageSetup(false, true);
    body.classList.remove('pmd-menu-r20-inventory-active', 'pmd-menu-r20-stock-usage-active');
    setHeaderTitle(originalHeaderTitle || 'Menu');
    if (updateUrl !== false) updateUrlWorkspace('menu');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function showInventory(updateUrl) {
    usagePanel.hidden = true;
    menuPanel.hidden = true;
    inventoryPanel.hidden = false;
    syncWorkspaceAction('inventory');
    setStockUsageSetup(false, true);
    body.classList.add('pmd-menu-r20-inventory-active');
    body.classList.remove('pmd-menu-r20-stock-usage-active');
    setHeaderTitle('Inventory');
    if (updateUrl !== false) updateUrlWorkspace('inventory');

    // R22: refresh once when Inventory is opened so a just-paid order is
    // reflected without a full page reload. This does not mutate workspace DOM.
    if (updateUrl !== false && api && typeof api.refresh === 'function') {
      api.refresh().catch(function () {});
    }

    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function showUsage() {
    menuPanel.hidden = true;
    inventoryPanel.hidden = true;
    usagePanel.hidden = false;
    syncWorkspaceAction('menu');
    setStockUsageSetup(false, true);
    body.classList.add('pmd-menu-r20-inventory-active', 'pmd-menu-r20-stock-usage-active');
    setHeaderTitle('Stock usage');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  /* ============================================================
     KPI component — same four-slot interaction contract as Dashboard
     ============================================================ */

  function dynamicKpiData(key) {
    var base = kpiCatalog[key] || {};
    var snap = snapshot();
    var summary = snap.summary || {};
    var rows = stockItems();
    var value = base.value == null ? '0' : String(base.value);
    var description = String(base.description || '');

    if (key === 'stock_value') {
      value = money(summary.estimated_stock_value || 0);
    } else if (key === 'stock_health') {
      var targeted = rows.filter(function (row) {
        return Number(row.par_level || 0) > 0 &&
          row.stock_percent !== null &&
          typeof row.stock_percent !== 'undefined';
      });
      value = targeted.length
        ? Math.round(targeted.reduce(function (sum, row) {
            return sum + Number(row.stock_percent || 0);
          }, 0) / targeted.length) + '%'
        : 'Set targets';
    } else if (key === 'attention') {
      value = String(Number(summary.critical_items || 0) + Number(summary.low_items || 0));
    } else if (key === 'waste') {
      value = money(summary.waste_cost_30d || 0);
    } else if (key === 'variance') {
      value = money(summary.unexplained_loss_value || 0);
    } else if (key === 'in_stock') {
      value = String(rows.filter(function (row) {
        return Number(row.estimated_on_hand || 0) > 0;
      }).length);
      description = rows.length + ' tracked inventory items';
    }

    return {
      key: key,
      title: String(base.title || key),
      value: value,
      description: description,
      info: String(base.info || base.description || ''),
      tone: String(base.tone || 'green'),
      icon: String(base.icon || '')
    };
  }

  function saveKpiSelection() {
    try {
      localStorage.setItem('pmd.inventory.kpis.r20', JSON.stringify(kpiSelection));
    } catch (ignore) {}
  }

  function loadKpiSelection() {
    try {
      var parsed = JSON.parse(localStorage.getItem('pmd.inventory.kpis.r20') || 'null');
      if (!Array.isArray(parsed) || parsed.length !== 4) return;
      var clean = parsed.filter(function (key, index) {
        return Boolean(kpiCatalog[key]) && parsed.indexOf(key) === index;
      });
      if (clean.length === 4) kpiSelection = clean;
    } catch (ignore) {}
  }

  function closeKpiMenus(except) {
    document.querySelectorAll('[data-r20-kpi-menu]').forEach(function (menu) {
      if (except && menu === except) return;
      menu.hidden = true;
      var card = menu.closest('.pmd-r2-kpi-v2401-card');
      if (card) card.classList.remove('is-pmd-kpi-menu-open');
      var button = card && card.querySelector('[data-r20-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
    var section = document.querySelector('[data-r20-inventory-kpis]');
    if (section && !except) section.classList.remove('is-pmd-kpi-menu-open');
  }

  function closeKpiInfo(exceptCard) {
    document.querySelectorAll('[data-r20-kpi-slot].is-pmd-kpi-info-open').forEach(function (card) {
      if (exceptCard && card === exceptCard) return;
      card.classList.remove('is-pmd-kpi-info-open');
      var button = card.querySelector('[data-r20-kpi-info]');
      if (button) button.setAttribute('aria-pressed', 'false');
    });
  }

  function paintKpiCard(card, key, slot) {
    var data = dynamicKpiData(key);
    if (!card || !data) return;

    card.setAttribute('data-r20-kpi-key', key);
    card.setAttribute('data-pmd-kpi-v2401-key', key);
    card.setAttribute('data-pmd-kpi-v2401-tone', data.tone);
    card.setAttribute('data-pmd-kpi-info-copy', data.info);

    var icon = card.querySelector('.pmd-r2-kpi-v2401-icon svg');
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    var value = card.querySelector('[data-r20-kpi-value]');
    var description = card.querySelector('.pmd-r2-kpi-v2401-description');
    var panel = card.querySelector('[data-pmd-kpi-info-panel]');

    if (icon) icon.innerHTML = data.icon;
    if (title) title.textContent = data.title;
    if (value) value.textContent = data.value;
    if (description) description.textContent = data.description;
    if (panel) {
      var strong = panel.querySelector('strong');
      var span = panel.querySelector('span');
      if (strong) strong.textContent = data.title;
      if (span) span.textContent = data.info;
    }

    card.querySelectorAll('[data-r20-kpi-option]').forEach(function (option) {
      var optionKey = option.getAttribute('data-r20-kpi-option');
      var selected = optionKey === key;
      var usedElsewhere = kpiSelection.indexOf(optionKey) !== -1 && !selected;
      option.classList.toggle('is-selected', selected);
      option.disabled = usedElsewhere;

      var check = option.querySelector('.pmd-r2-kpi-v2401-check');
      var small = option.querySelector('small');
      if (check) check.textContent = selected ? '✓' : '';
      if (small) {
        small.textContent = selected
          ? 'Visible in this card'
          : (usedElsewhere ? 'Already visible' : 'Show in this card');
      }
    });

    if (typeof slot === 'number') card.setAttribute('data-r20-kpi-slot', String(slot));
  }

  function renderKpis() {
    var section = document.querySelector('[data-r20-inventory-kpis]');
    if (!section) return;
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-r20-kpi-slot]'));
    cards.forEach(function (card, slot) {
      paintKpiCard(card, kpiSelection[slot] || Object.keys(kpiCatalog)[slot], slot);
    });
  }

  function mountKpis() {
    kpiCatalog = readJson('pmd-inventory-r20-kpi-data', {});
    if (!kpiCatalog || typeof kpiCatalog !== 'object') kpiCatalog = {};
    loadKpiSelection();
    renderKpis();
  }

  /* ============================================================
     Menu KPI component — dashboard geometry, isolated from Menu grid
     ============================================================ */

  function menuCards() {
    if (!menuGrid) return [];
    return Array.prototype.slice.call(
      menuGrid.querySelectorAll('[data-pmd-menu-card]')
    );
  }

  function menuKpiData(key) {
    var base = menuKpiCatalog[key] || {};
    var cards = menuCards();
    var foods = cards.filter(function (card) {
      return String(card.getAttribute('data-item-type') || 'food') !== 'combo';
    });
    var combos = cards.filter(function (card) {
      return String(card.getAttribute('data-item-type') || '') === 'combo';
    });
    var published = cards.filter(function (card) {
      return String(card.getAttribute('data-published') || '0') === '1';
    }).length;
    var stockOut = foods.filter(function (card) {
      return String(card.getAttribute('data-stock-out') || '0') === '1';
    }).length;
    var value = String(base.value == null ? '0' : base.value);

    if (key === 'menu_items') value = String(cards.length);
    else if (key === 'stock_out') value = String(stockOut);
    else if (key === 'disabled') value = String(Math.max(0, cards.length - published));
    else if (key === 'active') value = String(published);
    else if (key === 'combos') value = String(combos.length);

    return {
      key: key,
      title: String(base.title || key),
      value: value,
      description: String(base.description || ''),
      info: String(base.info || base.description || ''),
      tone: String(base.tone || 'green'),
      icon: String(base.icon || '')
    };
  }

  function saveMenuKpiSelection() {
    try {
      localStorage.setItem('pmd.menu.kpis.r22', JSON.stringify(menuKpiSelection));
    } catch (ignore) {}
  }

  function loadMenuKpiSelection() {
    try {
      var parsed = JSON.parse(localStorage.getItem('pmd.menu.kpis.r22') || 'null');
      if (!Array.isArray(parsed) || parsed.length !== 4) return;
      var clean = parsed.filter(function (key, index) {
        return Boolean(menuKpiCatalog[key]) && parsed.indexOf(key) === index;
      });
      if (clean.length === 4) menuKpiSelection = clean;
    } catch (ignore) {}
  }

  function closeMenuKpiMenus(except) {
    document.querySelectorAll('[data-pmd-menu-r22-kpi-menu]').forEach(function (menu) {
      if (except && menu === except) return;
      menu.hidden = true;
      var card = menu.closest('[data-pmd-menu-r22-kpi-slot]');
      if (card) card.classList.remove('is-pmd-kpi-menu-open');
      var button = card && card.querySelector('[data-pmd-menu-r22-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
    var section = document.querySelector('[data-pmd-menu-r22-kpis]');
    if (section && !except) section.classList.remove('is-pmd-kpi-menu-open');
  }

  function closeMenuKpiInfo(exceptCard) {
    document.querySelectorAll('[data-pmd-menu-r22-kpi-slot].is-pmd-kpi-info-open').forEach(function (card) {
      if (exceptCard && card === exceptCard) return;
      card.classList.remove('is-pmd-kpi-info-open');
      var button = card.querySelector('[data-pmd-menu-r22-kpi-info]');
      if (button) button.setAttribute('aria-pressed', 'false');
    });
  }

  function paintMenuKpi(card, key, slot) {
    var data = menuKpiData(key);
    if (!card || !data) return;

    card.setAttribute('data-pmd-menu-r22-kpi-key', key);
    card.setAttribute('data-pmd-kpi-v2401-key', key);
    card.setAttribute('data-pmd-kpi-v2401-tone', data.tone);

    var icon = card.querySelector('.pmd-r2-kpi-v2401-icon svg');
    var title = card.querySelector('.pmd-r2-kpi-v2401-title');
    var value = card.querySelector('[data-pmd-menu-r22-kpi-value]');
    var description = card.querySelector('.pmd-r2-kpi-v2401-description');
    var panel = card.querySelector('[data-pmd-menu-r22-kpi-info-panel]');

    if (icon) icon.innerHTML = data.icon;
    if (title) title.textContent = data.title;
    if (value) value.textContent = data.value;
    if (description) description.textContent = data.description;

    if (panel) {
      var strong = panel.querySelector('strong');
      var span = panel.querySelector('span');
      if (strong) strong.textContent = data.title;
      if (span) span.textContent = data.info;
    }

    card.querySelectorAll('[data-pmd-menu-r22-kpi-option]').forEach(function (option) {
      var optionKey = String(option.getAttribute('data-pmd-menu-r22-kpi-option') || '');
      var selected = optionKey === key;
      var usedElsewhere = menuKpiSelection.indexOf(optionKey) !== -1 && !selected;
      option.classList.toggle('is-selected', selected);
      option.disabled = usedElsewhere;

      var check = option.querySelector('.pmd-r2-kpi-v2401-check');
      var small = option.querySelector('small');
      if (check) check.textContent = selected ? '✓' : '';
      if (small) {
        small.textContent = selected
          ? 'Visible in this card'
          : (usedElsewhere ? 'Already visible' : 'Show in this card');
      }
    });

    card.setAttribute('data-pmd-menu-r22-kpi-slot', String(slot));
  }

  function renderMenuKpis() {
    var section = document.querySelector('[data-pmd-menu-r22-kpis]');
    if (!section) return;
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-pmd-menu-r22-kpi-slot]'));
    cards.forEach(function (card, slot) {
      paintMenuKpi(card, menuKpiSelection[slot] || Object.keys(menuKpiCatalog)[slot], slot);
    });
  }

  function scheduleMenuKpiRender() {
    if (menuKpiRenderFrame) return;
    menuKpiRenderFrame = window.requestAnimationFrame(function () {
      menuKpiRenderFrame = 0;
      renderMenuKpis();
    });
  }

  function mountMenuKpis() {
    menuKpiCatalog = readJson('pmd-menu-r22-kpi-data', {});
    if (!menuKpiCatalog || typeof menuKpiCatalog !== 'object') menuKpiCatalog = {};
    loadMenuKpiSelection();
    renderMenuKpis();

    // Observe ONLY the Menu card grid. KPI DOM is outside this node, so
    // repainting KPIs cannot retrigger the observer and cannot form a loop.
    if (menuGrid && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function (mutations) {
        var relevant = mutations.some(function (mutation) {
          if (
            mutation.type === 'attributes'
            && mutation.target
            && mutation.target.matches
            && mutation.target.matches('[data-pmd-menu-card]')
          ) {
            return true;
          }

          if (mutation.type === 'childList' && mutation.target === menuGrid) {
            return Array.prototype.some.call(
              mutation.addedNodes,
              function (node) {
                return node.nodeType === 1 && node.matches && node.matches('[data-pmd-menu-card]');
              }
            ) || Array.prototype.some.call(
              mutation.removedNodes,
              function (node) {
                return node.nodeType === 1 && node.matches && node.matches('[data-pmd-menu-card]');
              }
            );
          }

          return false;
        });

        if (relevant) scheduleMenuKpiRender();
      });

      observer.observe(menuGrid, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-stock-out', 'data-published']
      });
    }
  }

  /* ============================================================
     Direct stock-usage editor
     ============================================================ */

  function buildCatalogIndex() {
    catalogRows = api && typeof api.getCatalog === 'function' ? (api.getCatalog() || []) : [];
    catalogByName = {};

    catalogRows.forEach(function (row) {
      var keys = [row.name].concat(Array.isArray(row.aliases) ? row.aliases : []);
      keys.forEach(function (key) {
        var normalized = normalize(key);
        if (normalized && !catalogByName[normalized]) catalogByName[normalized] = row;
      });
    });
  }

  function catalogForItem(item) {
    return catalogByName[normalize(item && item.name)] || null;
  }

  function imageForItem(item) {
    var row = catalogForItem(item);
    return row && row.image_url ? String(row.image_url) : '';
  }

  function ownerStockLabel(item) {
    item = item || {};
    var baseQty = Number(item.estimated_on_hand || 0);
    var baseUnit = String(item.unit || 'piece');
    var purchaseUnit = String(item.purchase_unit || baseUnit);
    var factor = Math.max(.0001, Number(item.purchase_to_base || 1));
    if (purchaseUnit && purchaseUnit !== baseUnit && factor > 0) {
      return number(baseQty / factor, 2) + ' ' + purchaseUnit;
    }
    return number(baseQty, 2) + ' ' + baseUnit;
  }

  function normalizeUsageUnit(value) {
    return String(value || '').trim().toLowerCase();
  }

  function usageUnitOptions(item) {
    item = item || {};
    var baseUnit = String(item.unit || 'piece').trim() || 'piece';
    var purchaseUnit = String(item.purchase_unit || baseUnit).trim() || baseUnit;
    var baseKey = normalizeUsageUnit(baseUnit);
    var purchaseKey = normalizeUsageUnit(purchaseUnit);
    var purchaseFactor = Math.max(0.0001, Number(item.purchase_to_base || 1));
    var options = [];

    function add(value, label, factor) {
      value = String(value || '').trim();
      label = String(label || value).trim();
      factor = Number(factor || 0);
      if (!value || !(factor > 0)) return;
      if (options.some(function (row) {
        return row.value === value
          || (
            normalizeUsageUnit(row.label) === normalizeUsageUnit(label)
            && Math.abs(Number(row.factor || 0) - factor) < 0.000001
          );
      })) return;
      options.push({value: value, label: label, factor: factor});
    }

    add(baseKey, baseUnit, 1);

    if (baseKey === 'g') add('kg', 'kg', 1000);
    if (baseKey === 'kg') add('g', 'g', 0.001);
    if (baseKey === 'ml') add('l', 'l', 1000);
    if (baseKey === 'l') add('ml', 'ml', 0.001);

    if (purchaseKey && purchaseKey !== baseKey) {
      add('purchase:' + purchaseKey, purchaseUnit, purchaseFactor);
    }

    if (purchaseKey && purchaseKey !== baseKey) {
      add('percent', '% of ' + purchaseUnit, purchaseFactor / 100);
    } else {
      add('percent', '% of ' + baseUnit, 0.01);
    }

    return options;
  }

  function usageUnitOption(item, value) {
    var options = usageUnitOptions(item);
    value = String(value || '');
    return options.find(function (row) { return row.value === value; })
      || options[0]
      || {value: normalizeUsageUnit(item && item.unit || 'piece'), label: String(item && item.unit || 'piece'), factor: 1};
  }

  function defaultUsageSelection(item) {
    var base = normalizeUsageUnit(item && item.unit || 'piece');
    if (base === 'g' || base === 'ml') return {qty: 100, unit: base};
    if (base === 'kg' || base === 'l') return {qty: 0.1, unit: base};
    return {qty: 1, unit: base || 'piece'};
  }

  function selectionBaseQty(item, selection) {
    selection = selection || defaultUsageSelection(item);
    var option = usageUnitOption(item, selection.unit);
    return Math.max(0, Number(selection.qty || 0))
      * Math.max(0.0001, Number(option.factor || 1));
  }

  function recipeFor(menuId) {
    return recipes().find(function (row) {
      return Number(row.menu_id) === Number(menuId);
    }) || null;
  }

  function menuCard(menuId) {
    return document.querySelector('[data-pmd-menu-card][data-menu-id="' + Number(menuId) + '"]');
  }

  function menuName(menuId) {
    var card = menuCard(menuId);
    var title = card && card.querySelector('.pmd-menu-card__title-row h2');
    return title ? String(title.textContent || '').trim() : ('Menu #' + menuId);
  }

  function updateUsageButtons() {
    document.querySelectorAll('[data-pmd-stock-usage-r20]').forEach(function (button) {
      var menuId = Number(button.getAttribute('data-pmd-stock-usage-r20') || 0);
      var recipe = recipeFor(menuId);
      var count = recipe && Array.isArray(recipe.lines) ? recipe.lines.length : 0;
      button.textContent = count ? ('Stock usage · ' + count) : 'Stock usage';
    });
  }

  function resetUsageSelection(menuId) {
    usageState.selected = {};
    var recipe = recipeFor(menuId);
    var lines = recipe && Array.isArray(recipe.lines) ? recipe.lines : [];
    var items = stockItems();

    lines.forEach(function (line) {
      var itemId = Number(line.item_id || 0);
      if (itemId < 1) return;

      var item = items.find(function (row) { return Number(row.id) === itemId; });
      if (!item) return;

      usageState.selected[itemId] = {
        qty: Math.max(0, Number(line.qty_per_sale || 0)),
        unit: normalizeUsageUnit(item.unit || 'piece')
      };
    });
  }

  function usageCategories() {
    var counts = {};
    stockItems().forEach(function (item) {
      var category = String(item.category || 'Other').trim() || 'Other';
      counts[category] = Number(counts[category] || 0) + 1;
    });
    return counts;
  }

  function renderUsageCategories() {
    var host = usagePanel.querySelector('[data-pmd-stock-usage-categories]');
    if (!host) return;
    var counts = usageCategories();
    var keys = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b); });
    host.innerHTML =
      '<button type="button" class="' + (usageState.category === 'All' ? 'is-active' : '') +
      '" data-pmd-stock-usage-category="All">All · ' + stockItems().length + '</button>' +
      keys.map(function (key) {
        return '<button type="button" class="' + (usageState.category === key ? 'is-active' : '') +
          '" data-pmd-stock-usage-category="' + esc(key) + '">' + esc(key) + ' · ' + counts[key] + '</button>';
      }).join('');
  }

  function filteredUsageItems() {
    var q = normalize(usageState.query);
    return stockItems().filter(function (item) {
      var category = String(item.category || 'Other').trim() || 'Other';
      if (usageState.category !== 'All' && category !== usageState.category) return false;
      if (!q) return true;
      var catalogRow = catalogForItem(item);
      var hay = [
        item.name,
        item.category,
        item.supplier_name,
        catalogRow && Array.isArray(catalogRow.aliases) ? catalogRow.aliases.join(' ') : ''
      ].join(' ');
      return normalize(hay).indexOf(q) !== -1;
    }).sort(function (a, b) {
      var aSelected = Object.prototype.hasOwnProperty.call(usageState.selected, Number(a.id)) ? 0 : 1;
      var bSelected = Object.prototype.hasOwnProperty.call(usageState.selected, Number(b.id)) ? 0 : 1;
      return aSelected - bSelected || String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function usageCardHtml(item) {
    var itemId = Number(item.id);
    var selected = Object.prototype.hasOwnProperty.call(usageState.selected, itemId);
    var image = imageForItem(item);
    return '<button type="button" class="pmd-stock-usage-r20-card' + (selected ? ' is-selected' : '') +
      '" data-pmd-stock-usage-item="' + itemId + '">' +
      '<span class="pmd-stock-usage-r20-card__media">' +
        (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" decoding="async">' : '') +
        '<span class="pmd-stock-usage-r20-card__check">✓</span>' +
      '</span>' +
      '<span class="pmd-stock-usage-r20-card__copy">' +
        '<strong>' + esc(item.name || 'Stock item') + '</strong>' +
        '<small>' + esc(ownerStockLabel(item) + ' on hand · ' + (item.category || 'Other')) + '</small>' +
      '</span>' +
    '</button>';
  }

  function renderUsageGrid() {
    var host = usagePanel.querySelector('[data-pmd-stock-usage-grid]');
    var empty = usagePanel.querySelector('[data-pmd-stock-usage-empty]');
    if (!host) return;
    var rows = filteredUsageItems();
    host.innerHTML = rows.map(usageCardHtml).join('');
    if (empty) empty.hidden = rows.length > 0;
  }

  function selectedRows() {
    var selected = usageState.selected;
    return stockItems().filter(function (item) {
      return Object.prototype.hasOwnProperty.call(selected, Number(item.id));
    }).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function renderSelectedUsage() {
    var host = usagePanel.querySelector('[data-pmd-stock-usage-selected-list]');
    var empty = usagePanel.querySelector('[data-pmd-stock-usage-selected-empty]');
    var countNode = usagePanel.querySelector('[data-pmd-stock-usage-selected-count]');
    var badge = usagePanel.querySelector('[data-pmd-stock-usage-selected-badge]');
    if (!host) return;

    var rows = selectedRows();
    if (countNode) countNode.textContent = rows.length + ' selected';
    if (badge) badge.textContent = String(rows.length);
    if (empty) empty.hidden = rows.length > 0;

    host.innerHTML = rows.map(function (item) {
      var id = Number(item.id);
      var selection = usageState.selected[id] || defaultUsageSelection(item);
      var qty = Math.max(0, Number(selection.qty || 0));
      var option = usageUnitOption(item, selection.unit);
      var options = usageUnitOptions(item);
      var baseQty = selectionBaseQty(item, selection);

      return '<div class="pmd-stock-usage-r20-selected-row" data-pmd-stock-usage-selected-row="' + id + '">' +
        '<div class="pmd-stock-usage-r20-selected-row__copy">' +
          '<strong>' + esc(item.name || 'Stock item') + '</strong>' +
          '<small data-pmd-stock-usage-base-hint="' + id + '">' +
            esc('Deducts ' + number(baseQty, 4) + ' ' + (item.unit || 'piece') + ' per sale') +
          '</small>' +
        '</div>' +
        '<label class="pmd-stock-usage-r20-selected-row__qty">' +
          '<input type="number" min="0.0001" step="0.0001" value="' + esc(qty > 0 ? qty : 1) +
          '" data-pmd-stock-usage-qty="' + id + '" aria-label="Quantity per sale for ' + esc(item.name || 'item') + '">' +
        '</label>' +
        '<label class="pmd-stock-usage-r20-selected-row__unit">' +
          '<select data-pmd-stock-usage-unit="' + id + '" aria-label="Usage unit for ' + esc(item.name || 'item') + '">' +
            options.map(function (row) {
              return '<option value="' + esc(row.value) + '"' + (row.value === option.value ? ' selected' : '') + '>' +
                esc(row.label) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<button type="button" class="pmd-stock-usage-r20-selected-row__remove" data-pmd-stock-usage-remove="' + id + '" aria-label="Remove">×</button>' +
      '</div>';
    }).join('');
  }

  function updateUsageBaseHint(itemId) {
    itemId = Number(itemId || 0);
    if (itemId < 1 || !usageState.selected[itemId]) return;

    var item = stockItems().find(function (row) { return Number(row.id) === itemId; });
    var hint = usagePanel.querySelector('[data-pmd-stock-usage-base-hint="' + itemId + '"]');
    if (!item || !hint) return;

    hint.textContent = 'Deducts '
      + number(selectionBaseQty(item, usageState.selected[itemId]), 4)
      + ' ' + (item.unit || 'piece')
      + ' per sale';
  }

  function renderUsage() {
    renderUsageCategories();
    renderUsageGrid();
    renderSelectedUsage();
  }

  function openUsage(menuId) {
    menuId = Number(menuId || 0);
    if (!menuId) return;

    usageState.menuId = menuId;
    usageState.menuName = menuName(menuId);
    usageState.returnScrollY = Math.max(0, Number(window.scrollY || 0));
    usageState.query = '';
    usageState.category = 'All';
    resetUsageSelection(menuId);

    var title = usagePanel.querySelector('[data-pmd-stock-usage-title]');
    var search = usagePanel.querySelector('[data-pmd-stock-usage-search]');
    if (title) title.textContent = usageState.menuName + ' · Stock usage';
    if (search) search.value = '';

    renderUsage();
    showUsage();
  }

  function closeUsage() {
    var returnY = Math.max(0, Number(usageState.returnScrollY || 0));
    usageState.menuId = 0;
    usageState.menuName = '';
    usageState.query = '';
    usageState.category = 'All';
    usageState.selected = {};
    usageState.returnScrollY = 0;
    showMenu(true);
    window.requestAnimationFrame(function () {
      window.scrollTo({top: returnY, behavior: 'auto'});
    });
  }

  function toggleUsageItem(itemId) {
    itemId = Number(itemId || 0);
    if (!itemId) return;
    if (Object.prototype.hasOwnProperty.call(usageState.selected, itemId)) {
      delete usageState.selected[itemId];
    } else {
      var item = stockItems().find(function (row) { return Number(row.id) === itemId; });
      usageState.selected[itemId] = defaultUsageSelection(item);
    }
    renderUsageGrid();
    renderSelectedUsage();
  }

  function removeUsageItem(itemId) {
    itemId = Number(itemId || 0);
    if (!itemId) return;
    delete usageState.selected[itemId];
    renderUsageGrid();
    renderSelectedUsage();
  }

  function saveUsage() {
    if (!usageState.menuId) return;

    var lines = selectedRows().map(function (item) {
      var id = Number(item.id);
      var current = usageState.selected[id] || defaultUsageSelection(item);
      var input = usagePanel.querySelector('[data-pmd-stock-usage-qty="' + id + '"]');
      var select = usagePanel.querySelector('[data-pmd-stock-usage-unit="' + id + '"]');
      var selection = {
        qty: Number(input ? input.value : current.qty),
        unit: String(select ? select.value : current.unit)
      };

      return {
        item_id: id,
        qty_per_sale: selectionBaseQty(item, selection)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.qty_per_sale > 0;
    });

    var saveButton = usagePanel.querySelector('[data-pmd-stock-usage-save]');
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';
    }

    var headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': 'onSaveStockUsageR20'
    };
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) headers['X-CSRF-TOKEN'] = meta.content;

    fetch(window.location.href, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify({menu_id: usageState.menuId, lines: lines})
    })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (json) {
          if (!response.ok || !json || json.ok === false) {
            throw new Error(json && json.error ? json.error : 'Stock usage could not be saved.');
          }
          return json;
        });
      })
      .then(function () {
        return api.refresh();
      })
      .then(function () {
        updateUsageButtons();
        toast('Stock usage saved for ' + usageState.menuName + '.');
        closeUsage();
      })
      .catch(function (error) {
        toast(error.message || 'Stock usage could not be saved.', true);
      })
      .finally(function () {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'Save stock usage';
        }
      });
  }

  /* ============================================================
     Events
     ============================================================ */

  workspaceSwitchButton.addEventListener('click', function (event) {
    event.preventDefault();
    setStockUsageSetup(false, true);
    var current = String(workspaceSwitchButton.getAttribute('data-workspace') || 'menu');
    switchWorkspaceAnimated(current === 'inventory' ? 'menu' : 'inventory');
  });

  // R22 one-shot setup: after the header action is enabled, the whole food
  // card is the target. Capture prevents Edit/Delete/Stock controls from also
  // firing during this temporary setup mode.
  document.addEventListener('click', function (event) {
    if (!stockUsageSetupActive) return;

    var foodCard = event.target.closest('[data-pmd-menu-card][data-menu-id]');
    if (!foodCard || !menuPanel.contains(foodCard)) return;

    var menuId = Number(foodCard.getAttribute('data-menu-id') || 0);
    if (menuId < 1) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    setStockUsageSetup(false, true);
    openUsage(menuId);
  }, true);

  document.addEventListener('click', function (event) {
    var setupButton = event.target.closest('[data-pmd-stock-usage-setup-r22]');
    if (setupButton) {
      event.preventDefault();
      event.stopPropagation();
      if (stockUsageSetupActive) setStockUsageSetup(false, true);
      else {
        if (menuPanel.hidden) showMenu(true);
        setStockUsageSetup(true, false);
      }
      return;
    }

    var menuInfoButton = event.target.closest('[data-pmd-menu-r22-kpi-info]');
    if (menuInfoButton) {
      event.preventDefault();
      event.stopPropagation();
      var menuInfoCard = menuInfoButton.closest('[data-pmd-menu-r22-kpi-slot]');
      if (!menuInfoCard) return;
      var menuInfoOpen = !menuInfoCard.classList.contains('is-pmd-kpi-info-open');
      closeMenuKpiInfo(menuInfoCard);
      closeMenuKpiMenus();
      menuInfoCard.classList.toggle('is-pmd-kpi-info-open', menuInfoOpen);
      menuInfoButton.setAttribute('aria-pressed', String(menuInfoOpen));
      return;
    }

    var menuKpiButton = event.target.closest('[data-pmd-menu-r22-kpi-menu-button]');
    if (menuKpiButton) {
      event.preventDefault();
      event.stopPropagation();
      var menuKpiCard = menuKpiButton.closest('[data-pmd-menu-r22-kpi-slot]');
      var menuKpiMenu = menuKpiCard && menuKpiCard.querySelector('[data-pmd-menu-r22-kpi-menu]');
      if (!menuKpiMenu) return;
      var menuKpiOpen = menuKpiMenu.hidden;
      closeMenuKpiInfo();
      closeMenuKpiMenus(menuKpiMenu);
      menuKpiMenu.hidden = !menuKpiOpen;
      menuKpiCard.classList.toggle('is-pmd-kpi-menu-open', menuKpiOpen);
      var menuKpiSection = document.querySelector('[data-pmd-menu-r22-kpis]');
      if (menuKpiSection) menuKpiSection.classList.toggle('is-pmd-kpi-menu-open', menuKpiOpen);
      menuKpiButton.setAttribute('aria-expanded', String(menuKpiOpen));
      return;
    }

    var menuKpiOption = event.target.closest('[data-pmd-menu-r22-kpi-option]');
    if (menuKpiOption) {
      event.preventDefault();
      event.stopPropagation();
      if (menuKpiOption.disabled) return;
      var menuOptionCard = menuKpiOption.closest('[data-pmd-menu-r22-kpi-slot]');
      if (!menuOptionCard) return;
      var menuSlot = Number(menuOptionCard.getAttribute('data-pmd-menu-r22-kpi-slot') || 0);
      var menuKey = String(menuKpiOption.getAttribute('data-pmd-menu-r22-kpi-option') || '');
      if (!menuKpiCatalog[menuKey] || menuKpiSelection.indexOf(menuKey) !== -1) return;
      menuKpiSelection[menuSlot] = menuKey;
      saveMenuKpiSelection();
      renderMenuKpis();
      closeMenuKpiMenus();
      return;
    }

    var usageButton = event.target.closest('[data-pmd-stock-usage-r20]');
    if (usageButton) {
      event.preventDefault();
      event.stopPropagation();
      setStockUsageSetup(false, true);
      openUsage(usageButton.getAttribute('data-pmd-stock-usage-r20'));
      return;
    }

    if (event.target.closest('[data-pmd-stock-usage-close]')) {
      event.preventDefault();
      closeUsage();
      return;
    }

    var category = event.target.closest('[data-pmd-stock-usage-category]');
    if (category && usagePanel.contains(category)) {
      event.preventDefault();
      usageState.category = String(category.getAttribute('data-pmd-stock-usage-category') || 'All');
      renderUsageCategories();
      renderUsageGrid();
      return;
    }

    var itemCard = event.target.closest('[data-pmd-stock-usage-item]');
    if (itemCard && usagePanel.contains(itemCard)) {
      event.preventDefault();
      toggleUsageItem(itemCard.getAttribute('data-pmd-stock-usage-item'));
      return;
    }

    var remove = event.target.closest('[data-pmd-stock-usage-remove]');
    if (remove && usagePanel.contains(remove)) {
      event.preventDefault();
      removeUsageItem(remove.getAttribute('data-pmd-stock-usage-remove'));
      return;
    }

    if (event.target.closest('[data-pmd-stock-usage-clear]')) {
      event.preventDefault();
      usageState.selected = {};
      renderUsage();
      return;
    }

    if (event.target.closest('[data-pmd-stock-usage-save]')) {
      event.preventDefault();
      saveUsage();
      return;
    }

    var infoButton = event.target.closest('[data-r20-kpi-info]');
    if (infoButton) {
      event.preventDefault();
      event.stopPropagation();
      var infoCard = infoButton.closest('[data-r20-kpi-slot]');
      if (!infoCard) return;
      var willOpen = !infoCard.classList.contains('is-pmd-kpi-info-open');
      closeKpiInfo(infoCard);
      closeKpiMenus();
      infoCard.classList.toggle('is-pmd-kpi-info-open', willOpen);
      infoButton.setAttribute('aria-pressed', String(willOpen));
      return;
    }

    var menuButton = event.target.closest('[data-r20-kpi-menu-button]');
    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();
      var card = menuButton.closest('[data-r20-kpi-slot]');
      var menu = card && card.querySelector('[data-r20-kpi-menu]');
      if (!menu) return;
      var open = menu.hidden;
      closeKpiInfo();
      closeKpiMenus(menu);
      menu.hidden = !open;
      card.classList.toggle('is-pmd-kpi-menu-open', open);
      var inventoryKpiSection = document.querySelector('[data-r20-inventory-kpis]');
      if (inventoryKpiSection) inventoryKpiSection.classList.toggle('is-pmd-kpi-menu-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      return;
    }

    var option = event.target.closest('[data-r20-kpi-option]');
    if (option) {
      event.preventDefault();
      event.stopPropagation();
      if (option.disabled) return;
      var optionCard = option.closest('[data-r20-kpi-slot]');
      if (!optionCard) return;
      var slot = Number(optionCard.getAttribute('data-r20-kpi-slot') || 0);
      var key = String(option.getAttribute('data-r20-kpi-option') || '');
      if (!kpiCatalog[key] || kpiSelection.indexOf(key) !== -1) return;
      kpiSelection[slot] = key;
      saveKpiSelection();
      renderKpis();
      closeKpiMenus();
      return;
    }

    if (!event.target.closest('[data-r20-kpi-menu]')) closeKpiMenus();
    if (!event.target.closest('[data-r20-kpi-info]')) closeKpiInfo();
    if (!event.target.closest('[data-pmd-menu-r22-kpi-menu]')) closeMenuKpiMenus();
    if (!event.target.closest('[data-pmd-menu-r22-kpi-info]')) closeMenuKpiInfo();
  });

  usagePanel.addEventListener('input', function (event) {
    if (event.target.matches('[data-pmd-stock-usage-search]')) {
      usageState.query = String(event.target.value || '').trim();
      renderUsageGrid();
      return;
    }
    if (event.target.matches('[data-pmd-stock-usage-qty]')) {
      var id = Number(event.target.getAttribute('data-pmd-stock-usage-qty') || 0);
      if (id > 0 && usageState.selected[id]) {
        usageState.selected[id].qty = Math.max(0, Number(event.target.value || 0));
        updateUsageBaseHint(id);
      }
    }
  });

  usagePanel.addEventListener('change', function (event) {
    if (!event.target.matches('[data-pmd-stock-usage-unit]')) return;

    var id = Number(event.target.getAttribute('data-pmd-stock-usage-unit') || 0);
    if (id < 1 || !usageState.selected[id]) return;

    var item = stockItems().find(function (row) { return Number(row.id) === id; });
    if (!item) return;

    var current = usageState.selected[id];
    var baseQty = selectionBaseQty(item, current);
    var next = usageUnitOption(item, event.target.value);

    current.unit = next.value;
    current.qty = Math.max(0.0001, Number((baseQty / Math.max(0.0001, next.factor)).toFixed(4)));

    var input = usagePanel.querySelector('[data-pmd-stock-usage-qty="' + id + '"]');
    if (input) input.value = String(current.qty);
    updateUsageBaseHint(id);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && stockUsageSetupActive) {
      setStockUsageSetup(false, true);
    }
  });

  inventoryRoot.addEventListener('pmd:inventory-snapshot', function () {
    renderKpis();
    updateUsageButtons();
    if (!usagePanel.hidden && usageState.menuId) renderUsage();
  });

  window.addEventListener('popstate', function () {
    try {
      var workspace = new URL(window.location.href).searchParams.get('workspace');
      if (workspace === 'inventory') showInventory(false);
      else showMenu(false);
    } catch (ignore) {}
  });

  buildCatalogIndex();
  mountKpis();
  mountMenuKpis();
  updateUsageButtons();

  var initialWorkspace = 'menu';
  try {
    if (new URL(window.location.href).searchParams.get('workspace') === 'inventory') {
      initialWorkspace = 'inventory';
    }
  } catch (ignore) {}

  if (initialWorkspace === 'inventory') showInventory(false);
  else showMenu(false);

  window.PMDMenuInventoryUnifiedR20 = {
    version: '23.0.0',
    showMenu: function () { showMenu(true); },
    showInventory: function () { showInventory(true); },
    openStockUsage: openUsage,
    refresh: function () {
      return api.refresh().then(function () {
        renderKpis();
        updateUsageButtons();
      });
    }
  };
}());
