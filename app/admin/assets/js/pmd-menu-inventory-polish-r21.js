/* PMD_MENU_INVENTORY_POLISH_R21
 * Header-first Menu/Inventory navigation, one-shot Stock usage setup mode and
 * dashboard-parity Menu KPI interactions.
 */
(function () {
  'use strict';

  if (window.PMDMenuInventoryPolishR21) return;

  var body = document.body;
  var header = document.getElementById('pmd-r2-clean-header');
  var title = header && header.querySelector('.pmd-r2-clean-title');
  var tabs = document.querySelector('[data-pmd-unified-workspace-tabs]');
  var setupButton = document.querySelector('[data-pmd-stock-usage-setup-r21]');
  var menuPanel = document.querySelector('[data-pmd-unified-menu-panel]');
  var inventoryRoot = document.querySelector('[data-pmd-inventory-root]');
  var api = window.PMDInventoryControlR1 || null;
  var unified = window.PMDMenuInventoryUnifiedR20 || null;

  if (!header || !tabs || !menuPanel || !api || !unified) return;

  var menuKpiCatalog = readJson('pmd-menu-r21-kpi-data', {});
  var menuKpiSelection = ['menu_items', 'categories', 'stock_out', 'disabled'];
  var pickerActive = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

  function snapshot() {
    return api && typeof api.getSnapshot === 'function'
      ? (api.getSnapshot() || {})
      : {};
  }

  function recipes() {
    var rows = snapshot().recipes;
    return Array.isArray(rows) ? rows : [];
  }

  function setHeaderTitle(text) {
    if (title) title.textContent = String(text || 'Menu');
  }

  function activeWorkspace() {
    var active = tabs.querySelector('[data-pmd-unified-workspace-tab].is-active');
    return active ? String(active.getAttribute('data-pmd-unified-workspace-tab') || 'menu') : 'menu';
  }

  function setPicker(active, keepTitle) {
    pickerActive = Boolean(active);
    body.classList.toggle('pmd-menu-stock-usage-pick-r21', pickerActive);

    if (setupButton) {
      setupButton.setAttribute('aria-pressed', String(pickerActive));
      setupButton.classList.toggle('is-active', pickerActive);
    }

    if (!keepTitle) {
      setHeaderTitle(pickerActive ? 'Choose food for stock usage' : 'Menu');
    }
  }

  function decorateRecipeCounts() {
    var byMenu = {};
    recipes().forEach(function (recipe) {
      var menuId = Number(recipe.menu_id || 0);
      if (menuId < 1) return;
      byMenu[menuId] = Array.isArray(recipe.lines) ? recipe.lines.length : 0;
    });

    document.querySelectorAll('[data-pmd-menu-card][data-menu-id]').forEach(function (card) {
      var menuId = Number(card.getAttribute('data-menu-id') || 0);
      var count = Number(byMenu[menuId] || 0);
      if (count > 0) {
        card.setAttribute('data-pmd-stock-usage-connected-r21', String(count));
      } else {
        card.removeAttribute('data-pmd-stock-usage-connected-r21');
      }
    });
  }

  function openPicker() {
    if (activeWorkspace() !== 'menu') {
      unified.showMenu();
    }
    setPicker(true);
    decorateRecipeCounts();
    // Pull the latest paid-order usage before the owner edits a recipe.
    if (api && typeof api.refresh === 'function') {
      api.refresh().then(decorateRecipeCounts).catch(function () {});
    }
    window.scrollTo({top: 0, behavior: 'auto'});
  }

  function closePicker() {
    setPicker(false);
  }

  function openUsageFromCard(card) {
    if (!card) return;
    var menuId = Number(card.getAttribute('data-menu-id') || 0);
    if (menuId < 1) return;
    setPicker(false, true);
    unified.openStockUsage(menuId);
  }

  /* ============================================================
     Menu KPI component — same four-slot chooser language as Dashboard
     ============================================================ */

  function refreshMenuKpiValuesFromDom() {
    var cards = Array.prototype.slice.call(
      menuPanel.querySelectorAll('[data-pmd-menu-card]')
    );
    var foods = cards.filter(function (card) {
      return String(card.getAttribute('data-item-type') || 'food') !== 'combo';
    });
    var combos = cards.filter(function (card) {
      return String(card.getAttribute('data-item-type') || '') === 'combo';
    });
    var stockOut = foods.filter(function (card) {
      return String(card.getAttribute('data-stock-out') || '0') === '1';
    }).length;
    var disabled = foods.filter(function (card) {
      return String(card.getAttribute('data-published') || '0') !== '1';
    }).length;

    if (menuKpiCatalog.menu_items) menuKpiCatalog.menu_items.value = foods.length;
    if (menuKpiCatalog.stock_out) menuKpiCatalog.stock_out.value = stockOut;
    if (menuKpiCatalog.disabled) menuKpiCatalog.disabled.value = disabled;
    if (menuKpiCatalog.active) menuKpiCatalog.active.value = Math.max(0, foods.length - disabled);
    if (menuKpiCatalog.combos) menuKpiCatalog.combos.value = combos.length;
  }

  function saveMenuKpis() {
    try {
      localStorage.setItem('pmd.menu.kpis.r21', JSON.stringify(menuKpiSelection));
    } catch (ignore) {}
  }

  function loadMenuKpis() {
    try {
      var parsed = JSON.parse(localStorage.getItem('pmd.menu.kpis.r21') || 'null');
      if (!Array.isArray(parsed) || parsed.length !== 4) return;
      var clean = parsed.filter(function (key, index) {
        return Boolean(menuKpiCatalog[key]) && parsed.indexOf(key) === index;
      });
      if (clean.length === 4) menuKpiSelection = clean;
    } catch (ignore) {}
  }

  function closeMenuKpiMenus(except) {
    document.querySelectorAll('[data-pmd-menu-r21-kpi-menu]').forEach(function (menu) {
      if (except && menu === except) return;
      menu.hidden = true;
      var card = menu.closest('[data-pmd-menu-r21-kpi-slot]');
      var button = card && card.querySelector('[data-pmd-menu-r21-kpi-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }

  function closeMenuKpiInfo(except) {
    document.querySelectorAll('[data-pmd-menu-r21-kpi-slot].is-pmd-kpi-info-open').forEach(function (card) {
      if (except && card === except) return;
      card.classList.remove('is-pmd-kpi-info-open');
      var button = card.querySelector('[data-pmd-menu-r21-kpi-info]');
      if (button) button.setAttribute('aria-pressed', 'false');
    });
  }

  function paintMenuKpi(card, key, slot) {
    var data = menuKpiCatalog[key];
    if (!card || !data) return;

    card.setAttribute('data-pmd-menu-r21-kpi-key', key);
    card.setAttribute('data-pmd-kpi-v2401-key', key);
    card.setAttribute('data-pmd-kpi-v2401-tone', String(data.tone || 'green'));

    var icon = card.querySelector('.pmd-r2-kpi-v2401-icon svg');
    var titleNode = card.querySelector('.pmd-r2-kpi-v2401-title');
    var valueNode = card.querySelector('[data-pmd-menu-r21-kpi-value]');
    var descNode = card.querySelector('.pmd-r2-kpi-v2401-description');
    var panel = card.querySelector('[data-pmd-menu-r21-kpi-info-panel]');

    if (icon) icon.innerHTML = String(data.icon || '');
    if (titleNode) titleNode.textContent = String(data.title || key);
    if (valueNode) valueNode.textContent = String(data.value == null ? '0' : data.value);
    if (descNode) descNode.textContent = String(data.description || '');

    if (panel) {
      var strong = panel.querySelector('strong');
      var span = panel.querySelector('span');
      if (strong) strong.textContent = String(data.title || key);
      if (span) span.textContent = String(data.info || data.description || '');
    }

    card.querySelectorAll('[data-pmd-menu-r21-kpi-option]').forEach(function (option) {
      var optionKey = String(option.getAttribute('data-pmd-menu-r21-kpi-option') || '');
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

    card.setAttribute('data-pmd-menu-r21-kpi-slot', String(slot));
  }

  function renderMenuKpis() {
    var section = document.querySelector('[data-pmd-menu-r21-kpis]');
    if (!section) return;
    refreshMenuKpiValuesFromDom();
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-pmd-menu-r21-kpi-slot]'));
    cards.forEach(function (card, slot) {
      var key = menuKpiSelection[slot] || Object.keys(menuKpiCatalog)[slot];
      paintMenuKpi(card, key, slot);
    });
  }

  function mountMenuKpis() {
    if (!menuKpiCatalog || typeof menuKpiCatalog !== 'object') menuKpiCatalog = {};
    loadMenuKpis();
    renderMenuKpis();
  }

  /* ============================================================
     Events
     ============================================================ */

  if (setupButton) {
    setupButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (pickerActive) closePicker();
      else openPicker();
    });
  }

  // Capture card clicks while setup mode is active so Edit/Stock buttons do not
  // accidentally fire. The whole food card becomes the single "choose food" hit target.
  document.addEventListener('click', function (event) {
    if (!pickerActive) return;
    var card = event.target.closest('[data-pmd-menu-card][data-menu-id]');
    if (!card || !menuPanel.contains(card)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openUsageFromCard(card);
  }, true);

  tabs.addEventListener('click', function (event) {
    var button = event.target.closest('[data-pmd-unified-workspace-tab]');
    if (!button) return;
    if (button.getAttribute('data-pmd-unified-workspace-tab') === 'inventory') {
      setPicker(false, true);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && pickerActive) {
      event.preventDefault();
      closePicker();
    }
  });

  document.addEventListener('click', function (event) {
    var info = event.target.closest('[data-pmd-menu-r21-kpi-info]');
    if (info) {
      event.preventDefault();
      event.stopPropagation();
      var card = info.closest('[data-pmd-menu-r21-kpi-slot]');
      if (!card) return;
      var open = !card.classList.contains('is-pmd-kpi-info-open');
      closeMenuKpiInfo(card);
      closeMenuKpiMenus();
      card.classList.toggle('is-pmd-kpi-info-open', open);
      info.setAttribute('aria-pressed', String(open));
      return;
    }

    var menuButton = event.target.closest('[data-pmd-menu-r21-kpi-menu-button]');
    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();
      var menuCard = menuButton.closest('[data-pmd-menu-r21-kpi-slot]');
      var menu = menuCard && menuCard.querySelector('[data-pmd-menu-r21-kpi-menu]');
      if (!menu) return;
      var willOpen = menu.hidden;
      closeMenuKpiInfo();
      closeMenuKpiMenus(menu);
      menu.hidden = !willOpen;
      menuButton.setAttribute('aria-expanded', String(willOpen));
      return;
    }

    var option = event.target.closest('[data-pmd-menu-r21-kpi-option]');
    if (option) {
      event.preventDefault();
      event.stopPropagation();
      if (option.disabled) return;
      var optionCard = option.closest('[data-pmd-menu-r21-kpi-slot]');
      if (!optionCard) return;
      var slot = Number(optionCard.getAttribute('data-pmd-menu-r21-kpi-slot') || 0);
      var key = String(option.getAttribute('data-pmd-menu-r21-kpi-option') || '');
      if (!menuKpiCatalog[key] || menuKpiSelection.indexOf(key) !== -1) return;
      menuKpiSelection[slot] = key;
      saveMenuKpis();
      renderMenuKpis();
      closeMenuKpiMenus();
      return;
    }

    if (!event.target.closest('[data-pmd-menu-r21-kpi-menu]')) closeMenuKpiMenus();
    if (!event.target.closest('[data-pmd-menu-r21-kpi-info]')) closeMenuKpiInfo();
  });

  if (inventoryRoot) {
    inventoryRoot.addEventListener('pmd:inventory-snapshot', function () {
      decorateRecipeCounts();
    });
  }

  var menuStatsObserver = new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (mutation) {
      return mutation.type === 'childList'
        || mutation.attributeName === 'data-stock-out'
        || mutation.attributeName === 'data-published';
    });
    if (relevant) renderMenuKpis();
  });

  menuStatsObserver.observe(menuPanel, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-stock-out', 'data-published']
  });

  mountMenuKpis();
  decorateRecipeCounts();

  window.PMDMenuInventoryPolishR21 = {
    version: '21.0.0',
    openStockUsagePicker: openPicker,
    closeStockUsagePicker: closePicker,
    renderMenuKpis: renderMenuKpis
  };
}());
