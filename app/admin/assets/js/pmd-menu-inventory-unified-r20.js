/* PMD_MENU_INVENTORY_UNIFIED_R20
 * Same-page Menu + Inventory workspace, Owner-dashboard KPI interactions and
 * direct food -> restaurant-stock usage selection (no modal).
 */
(function () {
  'use strict';

  if (window.PMDMenuInventoryUnifiedR20) return;

  var tabs = document.querySelector('[data-pmd-unified-workspace-tabs]');
  var menuPanel = document.querySelector('[data-pmd-unified-menu-panel]');
  var inventoryPanel = document.querySelector('[data-pmd-unified-inventory-panel]');
  var usagePanel = document.querySelector('[data-pmd-stock-usage-workspace]');
  var inventoryRoot = document.querySelector('[data-pmd-inventory-root]');
  var api = window.PMDInventoryControlR1 || null;

  if (!tabs || !menuPanel || !inventoryPanel || !usagePanel || !inventoryRoot || !api) return;

  var headerTitle = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-title');
  var originalHeaderTitle = headerTitle ? String(headerTitle.textContent || '').trim() : 'Menu';
  var body = document.body;

  var usageState = {
    menuId: 0,
    menuName: '',
    query: '',
    category: 'All',
    selected: {}
  };

  var catalogRows = [];
  var catalogByName = {};
  var kpiCatalog = {};
  var kpiSelection = ['stock_value', 'stock_health', 'attention', 'waste'];

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

  function updateUrlWorkspace(workspace) {
    try {
      var url = new URL(window.location.href);
      if (workspace === 'inventory') url.searchParams.set('workspace', 'inventory');
      else url.searchParams.delete('workspace');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());
    } catch (ignore) {}
  }

  function setTabState(name) {
    tabs.querySelectorAll('[data-pmd-unified-workspace-tab]').forEach(function (button) {
      var active = button.getAttribute('data-pmd-unified-workspace-tab') === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function showMenu(updateUrl) {
    usagePanel.hidden = true;
    inventoryPanel.hidden = true;
    menuPanel.hidden = false;
    tabs.hidden = false;
    setTabState('menu');
    body.classList.remove('pmd-menu-r20-inventory-active', 'pmd-menu-r20-stock-usage-active');
    setHeaderTitle(originalHeaderTitle || 'Menu');
    if (updateUrl !== false) updateUrlWorkspace('menu');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function showInventory(updateUrl) {
    usagePanel.hidden = true;
    menuPanel.hidden = true;
    inventoryPanel.hidden = false;
    tabs.hidden = false;
    setTabState('inventory');
    body.classList.add('pmd-menu-r20-inventory-active');
    body.classList.remove('pmd-menu-r20-stock-usage-active');
    setHeaderTitle('Inventory');
    if (updateUrl !== false) updateUrlWorkspace('inventory');
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function showUsage() {
    menuPanel.hidden = true;
    inventoryPanel.hidden = true;
    usagePanel.hidden = false;
    tabs.hidden = true;
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
    }

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
      var button = card && card.querySelector('[data-r20-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
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
    lines.forEach(function (line) {
      var itemId = Number(line.item_id || 0);
      if (itemId > 0) usageState.selected[itemId] = Math.max(0, Number(line.qty_per_sale || 0));
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
      var qty = Number(usageState.selected[id] || 0);
      return '<div class="pmd-stock-usage-r20-selected-row" data-pmd-stock-usage-selected-row="' + id + '">' +
        '<div class="pmd-stock-usage-r20-selected-row__copy">' +
          '<strong>' + esc(item.name || 'Stock item') + '</strong>' +
          '<small>' + esc('Per sale · base unit ' + (item.unit || 'piece')) + '</small>' +
        '</div>' +
        '<label class="pmd-stock-usage-r20-selected-row__qty">' +
          '<input type="number" min="0.0001" step="0.0001" value="' + esc(qty > 0 ? qty : 1) +
          '" data-pmd-stock-usage-qty="' + id + '" aria-label="Quantity per sale for ' + esc(item.name || 'item') + '">' +
          '<span>' + esc(item.unit || '') + '</span>' +
        '</label>' +
        '<button type="button" class="pmd-stock-usage-r20-selected-row__remove" data-pmd-stock-usage-remove="' + id + '" aria-label="Remove">×</button>' +
      '</div>';
    }).join('');
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
    usageState.menuId = 0;
    usageState.menuName = '';
    usageState.query = '';
    usageState.category = 'All';
    usageState.selected = {};
    showMenu(true);
  }

  function toggleUsageItem(itemId) {
    itemId = Number(itemId || 0);
    if (!itemId) return;
    if (Object.prototype.hasOwnProperty.call(usageState.selected, itemId)) {
      delete usageState.selected[itemId];
    } else {
      usageState.selected[itemId] = 1;
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
      var input = usagePanel.querySelector('[data-pmd-stock-usage-qty="' + id + '"]');
      var qty = Number(input ? input.value : usageState.selected[id]);
      return {
        item_id: id,
        qty_per_sale: qty
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

  tabs.addEventListener('click', function (event) {
    var button = event.target.closest('[data-pmd-unified-workspace-tab]');
    if (!button) return;
    event.preventDefault();
    if (button.getAttribute('data-pmd-unified-workspace-tab') === 'inventory') showInventory(true);
    else showMenu(true);
  });

  document.addEventListener('click', function (event) {
    var usageButton = event.target.closest('[data-pmd-stock-usage-r20]');
    if (usageButton) {
      event.preventDefault();
      event.stopPropagation();
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
  });

  usagePanel.addEventListener('input', function (event) {
    if (event.target.matches('[data-pmd-stock-usage-search]')) {
      usageState.query = String(event.target.value || '').trim();
      renderUsageGrid();
      return;
    }
    if (event.target.matches('[data-pmd-stock-usage-qty]')) {
      var id = Number(event.target.getAttribute('data-pmd-stock-usage-qty') || 0);
      if (id > 0) usageState.selected[id] = Math.max(0, Number(event.target.value || 0));
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
    version: '20.0.0',
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
