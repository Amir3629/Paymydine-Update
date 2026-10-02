/* PMD_INVENTORY_WORKSPACE_R19
 * Visible daily workflow for Overview / Stock / Purchases / Waste / Shopping.
 * The R18 controller/service remain the write authority. This layer consumes
 * the exposed inventory API and deliberately avoids rebuilding hidden legacy UI.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-inventory-root]');
  var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
  if (!root || !workspace) return;

  var api = window.PMDInventoryControlR1;
  if (!api || typeof api.getSnapshot !== 'function') return;

  var config = api.getConfig ? api.getConfig() : {};
  var currency = String(config.currency || 'EUR');
  var units = config.units && typeof config.units === 'object' ? config.units : {};
  var wasteReasons = config.wasteReasons && typeof config.wasteReasons === 'object'
    ? config.wasteReasons
    : ['Spoilage','Prep trim','Overcooked','Spill / breakage','Returned by guest','Staff meal','Comp / complimentary','Expired','Other'];

  function wasteReasonEntries() {
    if (Array.isArray(wasteReasons)) {
      return wasteReasons.map(function (label) {
        return {value:String(label), label:String(label)};
      });
    }
    return Object.keys(wasteReasons).map(function (key) {
      return {value:String(key), label:String(wasteReasons[key])};
    });
  }

  var state = {
    mode: 'overview',
    stockMain: '',
    stockSub: '',
    stockSearch: '',
    purchaseMain: 'Food',
    purchaseSub: '',
    purchaseSearch: '',
    purchaseLimit: 18,
    purchaseRenderToken: 0,
    wasteMain: '',
    wasteSub: '',
    wasteSelection: null,
    purchaseSelection: null,
    shoppingDays: 1,
    bulkReview: null,
    busy: false
  };

  var mainSections = [
    {key:'Food', label:'Food', icon:'🥬'},
    {key:'Drinks', label:'Non-alcoholic', icon:'🧃'},
    {key:'Alcohol', label:'Alcohol', icon:'🍷'},
    {key:'Supplies', label:'Supplies', icon:'🧽'}
  ];

  var detailSections = [
    {key:'Produce', parent:'Food', label:'Vegetables'},
    {key:'Fruit', parent:'Food', label:'Fruit'},
    {key:'Herbs', parent:'Food', label:'Fresh herbs'},
    {key:'Meat', parent:'Food', label:'Meat'},
    {key:'Poultry', parent:'Food', label:'Poultry'},
    {key:'Seafood', parent:'Food', label:'Seafood'},
    {key:'Dairy', parent:'Food', label:'Dairy & eggs'},
    {key:'DryGoods', parent:'Food', label:'Grains & dry goods'},
    {key:'Spices', parent:'Food', label:'Spices'},
    {key:'Pantry', parent:'Food', label:'Pantry'},
    {key:'Condiments', parent:'Food', label:'Oils & sauces'},
    {key:'Bakery', parent:'Food', label:'Bakery'},
    {key:'Frozen', parent:'Food', label:'Frozen'},
    {key:'CoffeeTea', parent:'Drinks', label:'Coffee & tea'},
    {key:'Juice', parent:'Drinks', label:'Juices'},
    {key:'WaterMixers', parent:'Drinks', label:'Water & mixers'},
    {key:'SoftDrinks', parent:'Drinks', label:'Soft drinks'},
    {key:'BeerCider', parent:'Alcohol', label:'Beer & cider'},
    {key:'Wine', parent:'Alcohol', label:'Wine'},
    {key:'Spirits', parent:'Alcohol', label:'Spirits'},
    {key:'Cleaning', parent:'Supplies', label:'Cleaning'},
    {key:'PaperHygiene', parent:'Supplies', label:'Paper & hygiene'},
    {key:'Packaging', parent:'Supplies', label:'Packaging'},
    {key:'KitchenUtility', parent:'Supplies', label:'Kitchen & utility'},
    {key:'HouseholdSupplies', parent:'Supplies', label:'Household'},
    {key:'PersonalCare', parent:'Supplies', label:'Personal care'}
  ];

  var catalogRows = [];
  var catalogByKey = {};
  var imageByItemKey = {};

  function snapshot() {
    return api.getSnapshot() || {};
  }

  function items() {
    var rows = snapshot().items;
    return Array.isArray(rows) ? rows : [];
  }

  function catalog() {
    return catalogRows;
  }

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
    try { value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (ignore) {}
    return value.replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function number(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: typeof digits === 'number' ? digits : 2,
      minimumFractionDigits: 0
    }).format(n);
  }

  function money(value) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      }).format(n);
    } catch (ignore) {
      return number(n, 2) + ' ' + currency;
    }
  }

  function dateLabel(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day:'2-digit', month:'short', year:'numeric'
      }).format(new Date(String(value).replace(' ', 'T')));
    } catch (ignore) {
      return String(value).slice(0, 10);
    }
  }

  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function toast(message, error) {
    var old = document.querySelector('.pmd-inv-r19-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'pmd-inv-r19-toast' + (error ? ' is-error' : '');
    node.textContent = String(message || '');
    document.body.appendChild(node);
    window.setTimeout(function () { node.remove(); }, 2800);
  }

  function setBusy(next) {
    state.busy = Boolean(next);
    workspace.querySelectorAll('button, input[type="file"]').forEach(function (node) {
      if (node.hasAttribute('data-r19-mode')) return;
      if (state.busy) {
        if (!node.disabled) {
          node.setAttribute('data-r19-busy-disabled', '1');
          node.disabled = true;
        }
      } else if (node.getAttribute('data-r19-busy-disabled') === '1') {
        node.disabled = false;
        node.removeAttribute('data-r19-busy-disabled');
      }
    });
  }

  function buildCatalogIndex() {
    catalogRows = (api.getCatalog ? api.getCatalog() : []).map(function (row, index) {
      var copy = Object.assign({}, row);
      copy._r19Index = index;
      return copy;
    });
    catalogByKey = {};
    imageByItemKey = {};

    catalogRows.forEach(function (row) {
      var keys = [row.name].concat(Array.isArray(row.aliases) ? row.aliases : []);
      keys.forEach(function (key) {
        var n = normalize(key);
        if (!n) return;
        if (!catalogByKey[n]) catalogByKey[n] = row;
        if (row.image_url && !imageByItemKey[n]) imageByItemKey[n] = row.image_url;
      });
    });
  }

  function catalogTemplateForItem(item) {
    if (!item) return null;
    var key = normalize(item.name);
    if (catalogByKey[key]) return catalogByKey[key];
    return null;
  }

  function itemImage(item) {
    if (!item) return '';
    var key = normalize(item.name);
    if (imageByItemKey[key]) return imageByItemKey[key];
    var template = catalogTemplateForItem(item);
    return template && template.image_url ? String(template.image_url) : '';
  }

  function purchaseFactor(item) {
    return Math.max(.0001, Number(item && item.purchase_to_base || 1));
  }

  function ownerQuantity(item, baseQty) {
    item = item || {};
    var factor = purchaseFactor(item);
    var baseUnit = String(item.unit || 'piece');
    var purchaseUnit = String(item.purchase_unit || baseUnit);
    var converted = purchaseUnit && purchaseUnit !== baseUnit;
    return {
      qty: Number(baseQty || 0) / (converted ? factor : 1),
      unit: converted ? purchaseUnit : baseUnit,
      factor: converted ? factor : 1
    };
  }

  function ownerQuantityLabel(item, baseQty, digits) {
    var out = ownerQuantity(item, baseQty);
    return number(out.qty, typeof digits === 'number' ? digits : 2) + ' ' + out.unit;
  }

  function department(category, name) {
    var detail = detailSection(category, name);
    for (var i = 0; i < detailSections.length; i += 1) {
      if (detailSections[i].key === detail) return detailSections[i].parent;
    }
    return 'Food';
  }

  function detailSection(category, name) {
    category = String(category || '');
    name = normalize(name || '');
    if (category === 'Produce') return 'Produce';
    if (category === 'Fruit') return 'Fruit';
    if (category === 'Fresh herbs') return 'Herbs';
    if (category === 'Meat') return 'Meat';
    if (category === 'Poultry') return 'Poultry';
    if (category === 'Seafood') return 'Seafood';
    if (category === 'Dairy & eggs') return 'Dairy';
    if (category === 'Dry goods') return 'DryGoods';
    if (category === 'Spices') return 'Spices';
    if (category === 'Oils & condiments') return 'Condiments';
    if (['Middle Eastern pantry','Asian pantry','Indian pantry','Mexican & Latin pantry','Nuts & seeds'].indexOf(category) !== -1) return 'Pantry';
    if (['Bakery','Bakery & dessert'].indexOf(category) !== -1) return 'Bakery';
    if (category === 'Frozen') return 'Frozen';
    if (category === 'Coffee & tea') return 'CoffeeTea';
    if (category === 'Juice') return 'Juice';
    if (category === 'Water & mixers') return 'WaterMixers';
    if (category === 'Soft drinks') {
      if (/juice|nectar/.test(name)) return 'Juice';
      if (/water|tonic|club soda|soda water/.test(name)) return 'WaterMixers';
      return 'SoftDrinks';
    }
    if (category === 'Beverages') return 'SoftDrinks';
    if (category === 'Beer & cider') return 'BeerCider';
    if (category === 'Wine') return 'Wine';
    if (category === 'Spirits') return 'Spirits';
    if (category === 'Cleaning') return 'Cleaning';
    if (category === 'Paper & hygiene') return 'PaperHygiene';
    if (category === 'Kitchen & utility') return 'KitchenUtility';
    if (category === 'Household supplies') return 'HouseholdSupplies';
    if (category === 'Personal care') return 'PersonalCare';
    if (category === 'Packaging') {
      if (/napkin|tissue|paper towel|toilet paper|foil|film|baking paper|parchment/.test(name)) return 'PaperHygiene';
      if (/mop|broom|brush|sponge|cloth|dustpan|bucket|squeegee|glove/.test(name)) return 'KitchenUtility';
      return 'Packaging';
    }
    return 'Pantry';
  }

  function mainLabel(key) {
    var row = mainSections.find(function (section) { return section.key === key; });
    return row ? row.label : key;
  }

  function detailLabel(key) {
    var row = detailSections.find(function (section) { return section.key === key; });
    return row ? row.label : key;
  }

  function filterByHierarchy(rows, main, sub) {
    return rows.filter(function (row) {
      if (main && department(row.category, row.name) !== main) return false;
      if (sub && detailSection(row.category, row.name) !== sub) return false;
      return true;
    });
  }

  function renderMainCategories(host, rows, selected, attr) {
    if (!host) return;
    var counts = {Food:0,Drinks:0,Alcohol:0,Supplies:0};
    rows.forEach(function (row) {
      var key = department(row.category, row.name);
      counts[key] = Number(counts[key] || 0) + 1;
    });
    host.innerHTML = mainSections.filter(function (section) {
      return counts[section.key] > 0;
    }).map(function (section) {
      return '<button type="button" class="' + (selected === section.key ? 'is-active' : '') +
        '" ' + attr + '="' + esc(section.key) + '">' +
        esc(section.icon + ' ' + section.label) + ' · ' + esc(counts[section.key]) +
      '</button>';
    }).join('');
  }

  function renderSubcategories(host, rows, main, selected, attr) {
    if (!host) return;
    if (!main) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    var counts = {};
    rows.forEach(function (row) {
      if (department(row.category, row.name) !== main) return;
      var key = detailSection(row.category, row.name);
      counts[key] = Number(counts[key] || 0) + 1;
    });
    var sections = detailSections.filter(function (section) {
      return section.parent === main && counts[section.key] > 0;
    });
    host.hidden = !sections.length;
    host.innerHTML = sections.map(function (section) {
      return '<button type="button" class="' + (selected === section.key ? 'is-active' : '') +
        '" ' + attr + '="' + esc(section.key) + '">' +
        esc(section.label) + ' · ' + esc(counts[section.key]) +
      '</button>';
    }).join('');
  }

  function renderKpis() {
    var snap = snapshot();
    var summary = snap.summary || {};
    var rows = items();
    var targeted = rows.filter(function (row) {
      return Number(row.par_level || 0) > 0 && row.stock_percent !== null && typeof row.stock_percent !== 'undefined';
    });
    var health = targeted.length
      ? Math.round(targeted.reduce(function (sum, row) { return sum + Number(row.stock_percent || 0); }, 0) / targeted.length)
      : null;
    var inStock = rows.filter(function (row) { return Number(row.estimated_on_hand || 0) > 0; }).length;
    var attention = Number(summary.critical_items || 0) + Number(summary.low_items || 0);

    setText('[data-r19-kpi="stock-value"]', money(summary.estimated_stock_value));
    setText('[data-r19-kpi="stock-health"]', health === null ? 'Set targets' : health + '%');
    setText('[data-r19-kpi="attention"]', attention);
    setText('[data-r19-kpi="waste"]', money(summary.waste_cost_30d));
    setText('[data-r19-kpi="variance"]', money(summary.unexplained_loss_value));
    setText('[data-r19-kpi="in-stock"]', inStock);

    var inStockNode = workspace.querySelector('[data-r19-kpi="in-stock"]');
    var desc = inStockNode && inStockNode.parentNode && inStockNode.parentNode.querySelector('.pmd-r2-kpi-v2401-description');
    if (desc) desc.textContent = rows.length + ' tracked inventory items';
  }

  function setText(selector, value) {
    var node = workspace.querySelector(selector);
    if (node) node.textContent = String(value == null ? '' : value);
  }

  function stockRowHtml(item) {
    var pct = item.stock_percent;
    var pctLabel = pct === null || typeof pct === 'undefined' ? 'Set target' : Math.round(Number(pct || 0)) + '% of target';
    var width = pct === null || typeof pct === 'undefined' ? 0 : Math.max(0, Math.min(100, Number(pct || 0)));
    var status = String(item.status || 'healthy');
    var image = itemImage(item);
    return '<article class="pmd-inv-r19-stock-row is-' + esc(status) + '">' +
      '<span class="pmd-inv-r19-stock-row__image">' +
        (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" decoding="async">' : '') +
      '</span>' +
      '<span class="pmd-inv-r19-stock-row__copy"><strong>' + esc(item.name) + '</strong>' +
        '<small>' + esc(item.category || 'Stock item') + '</small>' +
        '<span class="pmd-inv-r19-health-bar"><i style="width:' + width + '%"></i></span>' +
      '</span>' +
      '<span class="pmd-inv-r19-stock-row__amount"><strong>' + esc(ownerQuantityLabel(item, item.estimated_on_hand, 2)) + '</strong>' +
        '<small>' + esc(pctLabel) + '</small></span>' +
    '</article>';
  }

  function renderOverview() {
    var serverHost = workspace.querySelector('[data-r19-overview-stock][data-r19-server-overview="1"]');
    if (serverHost) {
      serverHost.removeAttribute('data-r19-server-overview');
      renderActivity();
      return;
    }

    var rows = items().slice().sort(function (a, b) {
      var priority = {critical:0,low:1,setup:2,healthy:3};
      var ap = Object.prototype.hasOwnProperty.call(priority, a.status) ? priority[a.status] : 4;
      var bp = Object.prototype.hasOwnProperty.call(priority, b.status) ? priority[b.status] : 4;
      if (ap !== bp) return ap - bp;
      return String(a.category || '').localeCompare(String(b.category || '')) ||
        String(a.name || '').localeCompare(String(b.name || ''));
    });

    var summaryHost = workspace.querySelector('[data-r19-overview-categories]');
    if (summaryHost) {
      var counts = {};
      rows.forEach(function (row) {
        var key = row.category || 'Uncategorized';
        counts[key] = Number(counts[key] || 0) + 1;
      });
      summaryHost.innerHTML = Object.keys(counts).sort().map(function (key) {
        return '<span><b>' + esc(counts[key]) + '</b>' + esc(key) + '</span>';
      }).join('');
    }

    var host = workspace.querySelector('[data-r19-overview-stock]');
    if (host) {
      if (!rows.length) {
        host.innerHTML = '<div class="pmd-inv-r19-empty">No restaurant stock yet. Open Purchases to receive your first item.</div>';
      } else {
        var groups = {};
        rows.forEach(function (row) {
          var key = row.category || 'Other';
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        });
        host.innerHTML = Object.keys(groups).sort().map(function (key) {
          return '<section class="pmd-inv-r19-overview-group"><h3>' + esc(key) + '</h3>' +
            groups[key].map(stockRowHtml).join('') +
          '</section>';
        }).join('');
      }
    }

    renderActivity();
  }

  function renderActivity() {
    var snap = snapshot();
    var rows = [];
    (Array.isArray(snap.recent_purchases) ? snap.recent_purchases : []).slice(0, 6).forEach(function (row) {
      rows.push({
        date: row.confirmed_at || row.purchased_at,
        type:'Purchase',
        label: row.supplier_name || 'Supplier purchase',
        value: money(row.total_amount || 0)
      });
    });
    (Array.isArray(snap.recent_waste) ? snap.recent_waste : []).slice(0, 6).forEach(function (row) {
      rows.push({
        date: row.occurred_at,
        type:'Waste',
        label: row.item_name || 'Waste',
        value: '-' + money(row.cost || 0)
      });
    });
    if (snap.last_count && snap.last_count.counted_at) {
      rows.push({
        date:snap.last_count.counted_at,
        type:'Count',
        label:snap.last_count.staff_name ? 'Physical count · ' + snap.last_count.staff_name : 'Physical count',
        value:'Completed'
      });
    }
    rows.sort(function (a, b) {
      return new Date(String(b.date || '').replace(' ', 'T')) - new Date(String(a.date || '').replace(' ', 'T'));
    });
    rows = rows.slice(0, 8);
    var host = workspace.querySelector('[data-r19-activity-body]');
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(function (row) {
      return '<div class="pmd-inv-r19-activity-row"><span>' + esc(dateLabel(row.date)) + '</span>' +
        '<strong>' + esc(row.type + ' · ' + row.label) + '</strong><span>' + esc(row.value) + '</span></div>';
    }).join('') : '<div class="pmd-inv-r19-empty">No inventory activity yet.</div>';
  }

  function ownedCardHtml(item, mode) {
    var image = itemImage(item);
    var pct = item.stock_percent;
    var width = pct === null || typeof pct === 'undefined' ? 0 : Math.max(0, Math.min(100, Number(pct || 0)));
    var status = String(item.status || 'healthy');
    return '<button type="button" class="pmd-inv-r19-owned-card is-' + esc(status) +
      '" data-r19-' + esc(mode) + '-item="' + esc(item.id) + '">' +
      '<span class="pmd-inv-r19-owned-card__media">' +
        (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" decoding="async">' : '') +
        '<span class="pmd-inv-r19-owned-card__health"><i style="width:' + width + '%"></i></span>' +
      '</span>' +
      '<span class="pmd-inv-r19-owned-card__copy"><strong>' + esc(item.name) + '</strong>' +
      '<small>' + esc(ownerQuantityLabel(item, item.estimated_on_hand, 2) + ' · ' + (item.category || 'Stock item')) + '</small></span>' +
    '</button>';
  }

  function renderStock() {
    var rows = items().slice();
    renderMainCategories(workspace.querySelector('[data-r19-stock-main]'), rows, state.stockMain, 'data-r19-stock-main-key');
    renderSubcategories(workspace.querySelector('[data-r19-stock-sub]'), rows, state.stockMain, state.stockSub, 'data-r19-stock-sub-key');

    rows = filterByHierarchy(rows, state.stockMain, state.stockSub);
    if (state.stockSearch) {
      var q = normalize(state.stockSearch);
      rows = rows.filter(function (row) {
        return normalize([row.name,row.category,row.supplier_name,row.sku].join(' ')).indexOf(q) !== -1;
      });
    }
    rows.sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); });

    var host = workspace.querySelector('[data-r19-stock-grid]');
    if (!host) return;
    host.innerHTML = rows.length
      ? rows.map(function (row) { return ownedCardHtml(row, 'stock'); }).join('')
      : '<div class="pmd-inv-r19-empty">No stock items match this view.</div>';
  }

  function unitOptions(selected) {
    var keys = Object.keys(units);
    if (!keys.length) keys = ['piece','bottle','can','pack','case','box','tray','bag','bunch','jar','tub','bucket','crate','carton','keg','sack','roll','loaf','dozen','kg','g','l','ml'];
    return keys.map(function (value) {
      var label = units[value] || value;
      return '<option value="' + esc(value) + '"' + (String(selected) === String(value) ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }

  function openStockEditor(itemId) {
    var item = items().find(function (row) { return Number(row.id) === Number(itemId); });
    var host = workspace.querySelector('[data-r19-stock-editor]');
    if (!item || !host) return;

    var factor = purchaseFactor(item);
    var target = Number(item.par_level || 0) / factor;
    var reorder = Number(item.reorder_point || 0) / factor;
    var purchaseCost = Number(item.purchase_unit_cost || (Number(item.unit_cost || 0) * factor));

    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>' + esc(item.name) + '</h3>' +
      '<small>' + esc(ownerQuantityLabel(item, item.estimated_on_hand, 2)) + ' on hand · current stock changes only through purchases, waste and counts</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-close-stock-editor>Close</button></div>' +
      '<div class="pmd-inv-r19-editor-fields">' +
        '<label>Target / par<input type="number" min="0" step="0.01" value="' + esc(target) + '" data-r19-edit-par></label>' +
        '<label>Reorder at<input type="number" min="0" step="0.01" value="' + esc(reorder) + '" data-r19-edit-reorder></label>' +
        '<label>Purchase unit<select data-r19-edit-purchase-unit>' + unitOptions(item.purchase_unit || item.unit) + '</select></label>' +
        '<label>Cost / purchase unit<input type="number" min="0" step="0.01" value="' + esc(purchaseCost) + '" data-r19-edit-cost></label>' +
      '</div>' +
      '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:10px;font-weight:900;color:#45655d">Advanced settings</summary>' +
        '<div class="pmd-inv-r19-editor-fields" style="margin-top:10px">' +
          '<label class="is-wide">Item name<input type="text" value="' + esc(item.name) + '" data-r19-edit-name></label>' +
          '<label>Category<input type="text" value="' + esc(item.category || '') + '" data-r19-edit-category></label>' +
          '<label>SKU / code<input type="text" value="' + esc(item.sku || '') + '" data-r19-edit-sku></label>' +
          '<label>1 purchase unit contains<input type="number" min="0.0001" step="0.0001" value="' + esc(item.purchase_to_base || 1) + '" data-r19-edit-factor></label>' +
          '<label class="is-wide">Supplier<input type="text" value="' + esc(item.supplier_name || '') + '" data-r19-edit-supplier></label>' +
        '</div>' +
      '</details>' +
      '<div class="pmd-inv-r19-editor-actions">' +
        '<button type="button" class="pmd-inv-r19-secondary" data-r19-archive-item="' + esc(item.id) + '">Archive item</button>' +
        '<button type="button" class="pmd-inv-r19-primary" data-r19-save-stock-item="' + esc(item.id) + '">Save settings</button>' +
      '</div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function saveStockItem(itemId) {
    var item = items().find(function (row) { return Number(row.id) === Number(itemId); });
    var host = workspace.querySelector('[data-r19-stock-editor]');
    if (!item || !host || state.busy) return;

    var payload = {
      item_id: item.id,
      name: valueOf(host,'[data-r19-edit-name]', item.name),
      category: valueOf(host,'[data-r19-edit-category]', item.category || ''),
      sku: valueOf(host,'[data-r19-edit-sku]', item.sku || ''),
      purchase_unit: valueOf(host,'[data-r19-edit-purchase-unit]', item.purchase_unit || item.unit),
      purchase_to_base: Number(valueOf(host,'[data-r19-edit-factor]', item.purchase_to_base || 1)),
      purchase_cost: Number(valueOf(host,'[data-r19-edit-cost]', item.purchase_unit_cost || 0)),
      reorder_point: Number(valueOf(host,'[data-r19-edit-reorder]', 0)),
      par_level: Number(valueOf(host,'[data-r19-edit-par]', 0)),
      supplier_name: valueOf(host,'[data-r19-edit-supplier]', item.supplier_name || '')
    };
    if (!payload.name.trim()) return toast('Item name is required.', true);
    setBusy(true);
    api.request('onSaveItem', payload).then(applyActionSnapshot)
      .then(function () {
        host.hidden = true;
        toast('Stock settings saved.');
      })
      .catch(function (error) { toast(error.message || 'Could not save stock settings.', true); })
      .finally(function () { setBusy(false); });
  }

  function valueOf(scope, selector, fallback) {
    var node = scope.querySelector(selector);
    return node ? node.value : (fallback == null ? '' : fallback);
  }

  function applyActionSnapshot(json) {
    if (json && json.snapshot && api.applySnapshot) api.applySnapshot(json.snapshot);
    return json;
  }

  function archiveItem(itemId) {
    if (state.busy || !window.confirm('Archive this stock item? Historical movements stay saved.')) return;
    setBusy(true);
    api.request('onArchiveItem', {item_id:Number(itemId)}).then(applyActionSnapshot)
      .then(function () {
        var host = workspace.querySelector('[data-r19-stock-editor]');
        if (host) host.hidden = true;
        toast('Stock item archived.');
      })
      .catch(function (error) { toast(error.message || 'Could not archive item.', true); })
      .finally(function () { setBusy(false); });
  }

  function startCount() {
    var host = workspace.querySelector('[data-r19-count]');
    var grid = workspace.querySelector('[data-r19-stock-grid]');
    var editor = workspace.querySelector('[data-r19-stock-editor]');
    if (!host) return;
    if (editor) editor.hidden = true;
    if (grid) grid.hidden = true;

    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r19-count-head"><div><h3>Physical count</h3>' +
      '<small>Enter what is physically there now. Every active item is required so the new baseline stays complete.</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-cancel-count>Cancel</button></div>' +
      '<div class="pmd-inv-r19-count-list">' +
      items().map(function (item) {
        var owner = ownerQuantity(item, item.estimated_on_hand);
        return '<div class="pmd-inv-r19-count-row" data-r19-count-row="' + esc(item.id) + '">' +
          '<strong>' + esc(item.name) + '<span>' + esc(item.category || '') + '</span></strong>' +
          '<span>Expected ' + esc(number(owner.qty,2) + ' ' + owner.unit) + '</span>' +
          '<input type="number" min="0" step="0.01" placeholder="Actual ' + esc(owner.unit) + '" data-r19-count-input data-factor="' + esc(owner.factor) + '">' +
          '<span class="pmd-inv-r19-count-variance" data-r19-count-variance>Variance —</span>' +
        '</div>';
      }).join('') +
      '</div>' +
      '<div class="pmd-inv-r19-editor-fields" style="margin-top:10px"><label class="is-wide">Count note<input type="text" placeholder="Optional" data-r19-count-note></label></div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r19-complete-count>Complete count</button></div>';
  }

  function cancelCount() {
    var host = workspace.querySelector('[data-r19-count]');
    var grid = workspace.querySelector('[data-r19-stock-grid]');
    if (host) host.hidden = true;
    if (grid) grid.hidden = false;
  }

  function updateCountVariance(input) {
    var row = input.closest('[data-r19-count-row]');
    if (!row) return;
    var item = items().find(function (entry) { return Number(entry.id) === Number(row.getAttribute('data-r19-count-row')); });
    var output = row.querySelector('[data-r19-count-variance]');
    if (!item || !output) return;
    if (input.value === '') {
      output.textContent = 'Variance —';
      output.className = 'pmd-inv-r19-count-variance';
      return;
    }
    var actualBase = Number(input.value || 0) * Number(input.getAttribute('data-factor') || 1);
    var diff = actualBase - Number(item.estimated_on_hand || 0);
    var owner = ownerQuantity(item, diff);
    output.textContent = 'Variance ' + (owner.qty > 0 ? '+' : '') + number(owner.qty,2) + ' ' + owner.unit;
    output.className = 'pmd-inv-r19-count-variance' + (diff < 0 ? ' is-negative' : (diff > 0 ? ' is-positive' : ''));
  }

  function completeCount() {
    if (state.busy) return;
    var rows = Array.prototype.slice.call(workspace.querySelectorAll('[data-r19-count-row]'));
    var lines = [];
    for (var i = 0; i < rows.length; i += 1) {
      var input = rows[i].querySelector('[data-r19-count-input]');
      if (!input || input.value === '') {
        toast('Enter the physical quantity for every stock item.', true);
        if (input) input.focus();
        return;
      }
      lines.push({
        item_id:Number(rows[i].getAttribute('data-r19-count-row')),
        counted_qty:Number(input.value || 0) * Number(input.getAttribute('data-factor') || 1)
      });
    }
    setBusy(true);
    api.request('onCompleteCount', {
      lines:lines,
      note:valueOf(workspace,'[data-r19-count-note]','')
    }).then(applyActionSnapshot)
      .then(function () {
        cancelCount();
        toast('Physical count completed.');
      })
      .catch(function (error) { toast(error.message || 'Could not complete count.', true); })
      .finally(function () { setBusy(false); });
  }

  function catalogSearchScore(row, query) {
    query = normalize(query);
    if (!query) return 1;
    var name = normalize(row.name);
    var aliases = Array.isArray(row.aliases) ? row.aliases.map(normalize) : [];
    var hay = normalize([row.name,row.category,(row.aliases || []).join(' ')].join(' '));
    if (name === query) return 100;
    if (name.indexOf(query) === 0) return 90;
    if (aliases.indexOf(query) !== -1) return 95;
    if (hay.indexOf(query) !== -1) return 70;
    return 0;
  }

  function preloadRows(rows) {
    var urls = [];
    rows.forEach(function (row) {
      var url = String(row.image_url || '');
      if (url && urls.indexOf(url) === -1) urls.push(url);
    });
    if (!urls.length) return Promise.resolve();
    return Promise.all(urls.map(function (url) {
      return new Promise(function (resolve) {
        var image = new Image();
        var done = function () { resolve(); };
        image.onload = done;
        image.onerror = done;
        image.decoding = 'async';
        image.src = url;
        if (image.complete) resolve();
      });
    }));
  }

  function purchaseRows() {
    var rows = catalog().slice();
    var query = state.purchaseSearch;
    if (query) {
      return rows.map(function (row) { return {row:row,score:catalogSearchScore(row,query)}; })
        .filter(function (entry) { return entry.score > 0; })
        .sort(function (a,b) { return b.score - a.score || String(a.row.name).localeCompare(String(b.row.name)); })
        .map(function (entry) { return entry.row; });
    }
    rows = filterByHierarchy(rows, state.purchaseMain, state.purchaseSub);
    rows.sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); });
    return rows;
  }

  function renderPurchaseCategories() {
    var rows = catalog();
    renderMainCategories(workspace.querySelector('[data-r19-purchase-main]'), rows, state.purchaseMain, 'data-r19-purchase-main-key');
    renderSubcategories(workspace.querySelector('[data-r19-purchase-sub]'), rows, state.purchaseMain, state.purchaseSub, 'data-r19-purchase-sub-key');
  }

  function productCardHtml(row) {
    var existing = existingItemForCatalog(row);
    return '<button type="button" class="pmd-inv-r19-product-card" data-r19-purchase-item="' + esc(row._r19Index) + '">' +
      '<span class="pmd-inv-r19-product-card__media">' +
        (row.image_url ? '<img src="' + esc(row.image_url) + '" alt="" loading="lazy" decoding="async">' : '') +
      '</span>' +
      '<span class="pmd-inv-r19-product-card__copy"><strong>' + esc(row.name) + '</strong>' +
      '<small>' + esc((existing ? 'In stock · ' : '') + (row.category || 'Stock item') + ' · buy ' + (row.purchase_unit || row.unit || 'piece')) + '</small></span>' +
    '</button>';
  }

  function customCardHtml() {
    return '<button type="button" class="pmd-inv-r19-custom-card" data-r19-custom-purchase>' +
      '<div><span>+</span><strong>Custom item</strong><small>Receive something not in the catalogue</small></div>' +
    '</button>';
  }

  function renderPurchaseGrid(reset) {
    renderPurchaseCategories();
    var rows = purchaseRows();
    var host = workspace.querySelector('[data-r19-purchase-grid]');
    var more = workspace.querySelector('[data-r19-purchase-more]');
    if (!host) return;

    if (reset) state.purchaseLimit = 18;
    var visible = rows.slice(0, state.purchaseLimit);
    var token = ++state.purchaseRenderToken;

    if (reset) {
      preloadRows(visible.slice(0, 6)).then(function () {
        if (token !== state.purchaseRenderToken) return;
        host.innerHTML = customCardHtml() + visible.map(productCardHtml).join('');
        if (more) {
          more.hidden = rows.length <= visible.length;
          more.textContent = rows.length > visible.length ? 'Show ' + Math.min(24, rows.length - visible.length) + ' more' : 'Show more';
        }
      });
      return;
    }

    var already = host.querySelectorAll('[data-r19-purchase-item]').length;
    var next = rows.slice(already, state.purchaseLimit);
    if (next.length) {
      var html = next.map(productCardHtml).join('');
      host.insertAdjacentHTML('beforeend', html);
    }
    if (more) {
      more.hidden = rows.length <= state.purchaseLimit;
      more.textContent = rows.length > state.purchaseLimit ? 'Show ' + Math.min(24, rows.length - state.purchaseLimit) + ' more' : 'Show more';
    }
  }

  function existingItemForCatalog(row) {
    if (!row) return null;
    var keys = [normalize(row.name)].concat(Array.isArray(row.aliases) ? row.aliases.map(normalize) : []);
    return items().find(function (item) { return keys.indexOf(normalize(item.name)) !== -1; }) || null;
  }

  function openPurchaseEditor(index, custom) {
    var row = custom ? null : catalog()[Number(index)];
    var host = workspace.querySelector('[data-r19-purchase-editor]');
    if (!host) return;
    state.purchaseSelection = custom ? {custom:true} : row;
    var existing = row ? existingItemForCatalog(row) : null;
    var name = row ? row.name : '';
    var category = row ? (row.category || '') : '';
    var unit = existing
      ? (existing.purchase_unit || existing.unit || 'piece')
      : (row ? (row.purchase_unit || row.unit || 'piece') : 'piece');
    var cost = existing ? Number(existing.purchase_unit_cost || 0) : 0;
    var image = row && row.image_url ? row.image_url : '';

    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>' + esc(custom ? 'Custom item' : name) + '</h3>' +
      '<small>' + esc(custom ? 'Create it as part of this purchase.' : ((existing ? 'Already tracked · ' : 'New stock item · ') + category)) + '</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-close-purchase-editor>Close</button></div>' +
      '<div class="pmd-inv-r19-editor-fields">' +
        (custom ? '<label class="is-wide">Item name<input type="text" placeholder="Item name" data-r19-receive-name></label>' : '') +
        (custom ? '<label>Category<input type="text" placeholder="Food, Cleaning…" data-r19-receive-category></label>' : '') +
        '<label>Quantity<input type="number" min="0.0001" step="0.01" value="1" data-r19-receive-qty></label>' +
        '<label>Unit<select data-r19-receive-unit>' + unitOptions(unit) + '</select></label>' +
        '<label>Cost / unit<input type="number" min="0" step="0.01" value="' + esc(cost) + '" data-r19-receive-cost></label>' +
      '</div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r19-submit-purchase>Add to stock</button></div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function submitPurchase() {
    if (state.busy || !state.purchaseSelection) return;
    var host = workspace.querySelector('[data-r19-purchase-editor]');
    var selection = state.purchaseSelection;
    var custom = Boolean(selection.custom);
    var row = custom ? null : selection;
    var name = custom ? valueOf(host,'[data-r19-receive-name]','').trim() : String(row.name || '');
    var category = custom ? valueOf(host,'[data-r19-receive-category]','').trim() : String(row.category || '');
    var qty = Number(valueOf(host,'[data-r19-receive-qty]',0));
    var unit = valueOf(host,'[data-r19-receive-unit]','piece');
    var cost = Number(valueOf(host,'[data-r19-receive-cost]',0));
    if (!name) return toast('Enter the item name.', true);
    if (!(qty > 0)) return toast('Enter the received quantity.', true);
    var existing = row ? existingItemForCatalog(row) : null;
    var payload = {
      supplier_name:valueOf(workspace,'[data-r19-purchase-supplier]','').trim(),
      purchased_at:valueOf(workspace,'[data-r19-purchase-date]',todayKey()),
      lines:[{
        item_id:existing ? Number(existing.id) : 0,
        item_name:name,
        category:category,
        quantity:qty,
        unit:unit,
        unit_cost:cost
      }]
    };
    setBusy(true);
    api.request('onSavePurchase', payload).then(applyActionSnapshot)
      .then(function () {
        host.hidden = true;
        state.purchaseSelection = null;
        toast(name + ' added to stock.');
        renderPurchaseGrid(true);
      })
      .catch(function (error) { toast(error.message || 'Could not add purchase.', true); })
      .finally(function () { setBusy(false); });
  }

  function scanReceipt(file) {
    if (!file || state.busy) return;
    var review = workspace.querySelector('[data-r19-receipt-review]');
    if (review) {
      review.hidden = false;
      review.innerHTML = '<div class="pmd-inv-r19-editor-head"><div><h3>Reading supplier bill…</h3><small>AI proposes purchase lines; nothing changes stock until you confirm.</small></div></div>';
    }
    var data = new FormData();
    data.append('receipt', file);
    setBusy(true);
    api.request('onScanReceipt', {}, data).then(function (json) {
      var extraction = json.extraction || {};
      var supplier = workspace.querySelector('[data-r19-purchase-supplier]');
      var date = workspace.querySelector('[data-r19-purchase-date]');
      if (supplier && extraction.supplier_name) supplier.value = extraction.supplier_name;
      if (date && extraction.purchase_date) date.value = extraction.purchase_date;
      state.bulkReview = {
        receiptId:Number(json.receipt_id || 0),
        label:'Scanned supplier bill',
        lines:Array.isArray(extraction.lines) ? extraction.lines.map(function (line) { return Object.assign({}, line); }) : []
      };
      renderBulkReview();
    }).catch(function (error) {
      if (review) review.hidden = true;
      toast(error.message || 'Could not read supplier bill.', true);
    }).finally(function () {
      setBusy(false);
      var input = workspace.querySelector('[data-r19-receipt-input]');
      if (input) input.value = '';
    });
  }

  function renderBulkReview() {
    var host = workspace.querySelector('[data-r19-receipt-review]');
    var review = state.bulkReview;
    if (!host || !review) return;
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>' + esc(review.label || 'Purchase review') + '</h3>' +
      '<small>Review item, quantity, unit and cost before confirming.</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-close-review>Close</button></div>' +
      '<div class="pmd-inv-r19-receipt-lines">' +
      (review.lines.length ? review.lines.map(function (line, index) {
        return '<div class="pmd-inv-r19-receipt-line" data-r19-bulk-line="' + index + '">' +
          '<label>Item<input type="text" value="' + esc(line.item_name || '') + '" data-r19-bulk-name></label>' +
          '<label>Qty<input type="number" min="0" step="0.01" value="' + esc(line.quantity == null ? '' : line.quantity) + '" data-r19-bulk-qty></label>' +
          '<label>Unit<select data-r19-bulk-unit>' + unitOptions(line.unit || 'piece') + '</select></label>' +
          '<label>Cost / unit<input type="number" min="0" step="0.01" value="' + esc(line.unit_cost == null ? 0 : line.unit_cost) + '" data-r19-bulk-cost></label>' +
          '<button type="button" data-r19-remove-bulk-line="' + index + '" aria-label="Remove">×</button>' +
        '</div>';
      }).join('') : '<div class="pmd-inv-r19-empty">No purchase lines were detected. Use the catalogue or Custom item instead.</div>') +
      '</div>' +
      (review.lines.length ? '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r19-confirm-bulk>Confirm purchase</button></div>' : '');
  }

  function confirmBulkPurchase() {
    if (!state.bulkReview || state.busy) return;
    var lineNodes = Array.prototype.slice.call(workspace.querySelectorAll('[data-r19-bulk-line]'));
    var lines = lineNodes.map(function (node) {
      var name = valueOf(node,'[data-r19-bulk-name]','').trim();
      var qty = Number(valueOf(node,'[data-r19-bulk-qty]',0));
      var unit = valueOf(node,'[data-r19-bulk-unit]','piece');
      var cost = Number(valueOf(node,'[data-r19-bulk-cost]',0));
      var existing = findExistingByName(name);
      var template = catalogByKey[normalize(name)] || null;
      return {
        item_id:existing ? Number(existing.id) : 0,
        item_name:name,
        category:template ? (template.category || '') : '',
        quantity:qty,
        unit:unit,
        unit_cost:cost
      };
    }).filter(function (line) { return line.item_name && line.quantity > 0; });
    if (!lines.length) return toast('Keep at least one purchase line with a quantity.', true);
    var payload = {
      receipt_id:Number(state.bulkReview.receiptId || 0),
      supplier_name:valueOf(workspace,'[data-r19-purchase-supplier]','').trim(),
      purchased_at:valueOf(workspace,'[data-r19-purchase-date]',todayKey()),
      lines:lines
    };
    setBusy(true);
    api.request('onSavePurchase', payload).then(applyActionSnapshot)
      .then(function () {
        state.bulkReview = null;
        var host = workspace.querySelector('[data-r19-receipt-review]');
        if (host) host.hidden = true;
        toast('Purchase added to stock.');
        renderPurchaseGrid(true);
      })
      .catch(function (error) { toast(error.message || 'Could not confirm purchase.', true); })
      .finally(function () { setBusy(false); });
  }

  function findExistingByName(name) {
    var key = normalize(name);
    var template = catalogByKey[key] || null;
    if (template) return existingItemForCatalog(template);
    return items().find(function (row) { return normalize(row.name) === key; }) || null;
  }

  function renderWaste() {
    var rows = items().slice();
    renderMainCategories(workspace.querySelector('[data-r19-waste-main]'), rows, state.wasteMain, 'data-r19-waste-main-key');
    renderSubcategories(workspace.querySelector('[data-r19-waste-sub]'), rows, state.wasteMain, state.wasteSub, 'data-r19-waste-sub-key');
    rows = filterByHierarchy(rows, state.wasteMain, state.wasteSub);
    rows.sort(function (a,b) { return String(a.name).localeCompare(String(b.name)); });
    var host = workspace.querySelector('[data-r19-waste-grid]');
    if (host) {
      host.innerHTML = rows.length
        ? rows.map(function (row) { return ownedCardHtml(row, 'waste'); }).join('')
        : '<div class="pmd-inv-r19-empty">No stock items in this category.</div>';
    }
    renderWasteHistory();
  }

  function openWasteEditor(itemId) {
    var item = items().find(function (row) { return Number(row.id) === Number(itemId); });
    var host = workspace.querySelector('[data-r19-waste-editor]');
    if (!item || !host) return;
    state.wasteSelection = item;
    var base = String(item.unit || 'piece');
    var purchase = String(item.purchase_unit || base);
    var options = '<option value="' + esc(base) + '">' + esc(base) + '</option>';
    if (purchase !== base) options = '<option value="' + esc(purchase) + '">' + esc(purchase) + '</option>' + options;
    var reasons = wasteReasonEntries().map(function (entry) {
      return '<option value="' + esc(entry.value) + '">' + esc(entry.label) + '</option>';
    }).join('');
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>' + esc(item.name) + '</h3><small>' +
      esc(ownerQuantityLabel(item,item.estimated_on_hand,2) + ' currently on hand') + '</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-close-waste-editor>Close</button></div>' +
      '<div class="pmd-inv-r19-editor-fields">' +
        '<label>Quantity<input type="number" min="0.0001" step="0.01" data-r19-waste-qty></label>' +
        '<label>Unit<select data-r19-waste-unit>' + options + '</select></label>' +
        '<label>Reason<select data-r19-waste-reason>' + reasons + '</select></label>' +
        '<label class="is-wide">Note<input type="text" placeholder="Optional" data-r19-waste-note></label>' +
      '</div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r19-submit-waste>Record waste</button></div>';
    host.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function submitWaste() {
    var item = state.wasteSelection;
    var host = workspace.querySelector('[data-r19-waste-editor]');
    if (!item || !host || state.busy) return;
    var qty = Number(valueOf(host,'[data-r19-waste-qty]',0));
    if (!(qty > 0)) return toast('Enter the wasted quantity.', true);
    var selectedUnit = valueOf(host,'[data-r19-waste-unit]',item.unit);
    var baseQty = qty;
    if (selectedUnit === String(item.purchase_unit || '') && selectedUnit !== String(item.unit || '')) {
      baseQty = qty * purchaseFactor(item);
    }
    setBusy(true);
    api.request('onRecordWaste', {
      item_id:item.id,
      quantity:baseQty,
      reason:valueOf(host,'[data-r19-waste-reason]','other'),
      note:valueOf(host,'[data-r19-waste-note]','')
    }).then(applyActionSnapshot)
      .then(function () {
        host.hidden = true;
        state.wasteSelection = null;
        toast('Waste recorded.');
      })
      .catch(function (error) { toast(error.message || 'Could not record waste.', true); })
      .finally(function () { setBusy(false); });
  }

  function renderWasteHistory() {
    var rows = Array.isArray(snapshot().recent_waste) ? snapshot().recent_waste : [];
    var host = workspace.querySelector('[data-r19-waste-history]');
    if (host) {
      host.innerHTML = rows.length ? rows.map(function (row) {
        var item = items().find(function (entry) { return Number(entry.id) === Number(row.item_id); });
        var qty = item ? ownerQuantityLabel(item, row.qty || Math.abs(row.qty_delta || 0), 2) : number(row.qty || 0,2);
        return '<div class="pmd-inv-r19-history-row"><strong>' + esc(row.item_name || 'Item') + '</strong>' +
          '<span>' + esc(qty) + '</span><span>' + esc(row.reason || 'Other') + '</span>' +
          '<span>' + esc(money(row.cost || 0)) + '</span><span>' + esc(dateLabel(row.occurred_at)) + '</span></div>';
      }).join('') : '<div class="pmd-inv-r19-empty">No waste has been recorded yet.</div>';
    }

    var summary = snapshot().summary || {};
    setText('[data-r19-waste-today]','Today · ' + money(summary.waste_cost_today || 0));
  }

  function shoppingRows() {
    var days = Math.max(1, Number(state.shoppingDays || 1));
    return items().map(function (item) {
      var onHand = Math.max(0, Number(item.estimated_on_hand || 0));
      var par = Math.max(0, Number(item.par_level || 0));
      var usageNeed = Math.max(0, Number(item.avg_daily_usage || 0) * days);
      var desired = Math.max(par, usageNeed);
      if (desired <= 0 && Number(item.reorder_point || 0) > 0 && onHand <= Number(item.reorder_point || 0)) {
        desired = Number(item.reorder_point || 0);
      }
      var baseQty = Math.max(0, desired - onHand);
      if (baseQty <= .00005) return null;
      var owner = ownerQuantity(item, baseQty);
      var cost = owner.qty * Number(item.purchase_unit_cost || 0);
      return {
        item:item,
        qty:owner.qty,
        unit:owner.unit,
        factor:owner.factor,
        estimatedCost:cost,
        supplier:String(item.supplier_name || 'Unassigned supplier')
      };
    }).filter(Boolean).sort(function (a,b) {
      return a.supplier.localeCompare(b.supplier) || String(a.item.name).localeCompare(String(b.item.name));
    });
  }

  function renderShopping() {
    workspace.querySelectorAll('[data-r19-shopping-days]').forEach(function (button) {
      button.classList.toggle('is-active', Number(button.getAttribute('data-r19-shopping-days')) === Number(state.shoppingDays));
    });
    var rows = shoppingRows();
    var total = rows.reduce(function (sum,row) { return sum + Number(row.estimatedCost || 0); },0);
    var summary = workspace.querySelector('[data-r19-shopping-summary]');
    if (summary) {
      summary.innerHTML = '<strong>' + esc(rows.length + ' item' + (rows.length === 1 ? '' : 's') + ' suggested') + '</strong>' +
        '<span>Estimated purchase value ' + esc(money(total)) + ' · cover ' + esc(state.shoppingDays === 1 ? 'today' : state.shoppingDays + ' days') + '</span>';
    }
    var host = workspace.querySelector('[data-r19-shopping-list]');
    if (!host) return;
    if (!rows.length) {
      host.innerHTML = '<div class="pmd-inv-r19-empty">Current stock covers this period based on targets and recent usage.</div>';
      return;
    }
    var currentSupplier = null;
    var html = '';
    rows.forEach(function (row) {
      if (row.supplier !== currentSupplier) {
        currentSupplier = row.supplier;
        html += '<div class="pmd-inv-r19-shopping-supplier">' + esc(currentSupplier) + '</div>';
      }
      html += '<div class="pmd-inv-r19-shopping-row" data-r19-shopping-row="' + esc(row.item.id) + '" data-unit="' + esc(row.unit) + '" data-factor="' + esc(row.factor) + '">' +
        '<div><strong>' + esc(row.item.name) + '</strong><small>' + esc(ownerQuantityLabel(row.item,row.item.estimated_on_hand,2) + ' on hand') + '</small></div>' +
        '<span>Need ' + esc(number(row.qty,2) + ' ' + row.unit) + '</span>' +
        '<input type="number" min="0" step="0.01" value="' + esc(Number(row.qty.toFixed(2))) + '" data-r19-shopping-qty>' +
        '<span>' + esc(money(row.estimatedCost)) + '</span>' +
      '</div>';
    });
    host.innerHTML = html;
  }

  function shoppingAdjustedRows() {
    return Array.prototype.slice.call(workspace.querySelectorAll('[data-r19-shopping-row]')).map(function (node) {
      var item = items().find(function (entry) { return Number(entry.id) === Number(node.getAttribute('data-r19-shopping-row')); });
      var qtyInput = node.querySelector('[data-r19-shopping-qty]');
      var qty = Number(qtyInput && qtyInput.value || 0);
      return item && qty > 0 ? {
        item:item,
        qty:qty,
        unit:String(node.getAttribute('data-unit') || item.purchase_unit || item.unit),
        cost:Number(item.purchase_unit_cost || 0)
      } : null;
    }).filter(Boolean);
  }

  function copyShopping() {
    var rows = shoppingAdjustedRows();
    var text = rows.map(function (row) {
      return row.item.name + ' — ' + number(row.qty,2) + ' ' + row.unit;
    }).join('\n');
    if (!text) return toast('The shopping list is empty.', true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Shopping list copied.'); });
    } else {
      window.prompt('Copy shopping list', text);
    }
  }

  function printShopping() {
    var rows = shoppingAdjustedRows();
    if (!rows.length) return toast('The shopping list is empty.', true);
    var popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) return toast('Pop-up was blocked.', true);
    popup.document.write('<!doctype html><html><head><title>Shopping list</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#17352f}h1{font-size:24px}li{padding:8px 0;border-bottom:1px solid #ddd}</style></head><body><h1>PayMyDine shopping list</h1><p>' + esc(dateLabel(new Date())) + '</p><ul>' +
      rows.map(function (row) { return '<li><strong>' + esc(row.item.name) + '</strong> — ' + esc(number(row.qty,2) + ' ' + row.unit) + '</li>'; }).join('') +
      '</ul></body></html>');
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function shoppingToPurchases() {
    var rows = shoppingAdjustedRows();
    setMode('purchases');
    if (!rows.length) return;
    state.bulkReview = {
      receiptId:0,
      label:'Shopping draft',
      lines:rows.map(function (row) {
        return {
          item_name:row.item.name,
          quantity:row.qty,
          unit:row.unit,
          unit_cost:Number(row.item.purchase_unit_cost || 0)
        };
      })
    };
    renderBulkReview();
    var review = workspace.querySelector('[data-r19-receipt-review]');
    if (review) review.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function setMode(mode) {
    mode = ['overview','stock','purchases','waste','shopping'].indexOf(mode) !== -1 ? mode : 'overview';
    state.mode = mode;
    workspace.querySelectorAll('[data-r19-mode]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-r19-mode') === mode);
    });
    workspace.querySelectorAll('[data-r19-pane]').forEach(function (pane) {
      var active = pane.getAttribute('data-r19-pane') === mode;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });
    if (mode === 'overview') renderOverview();
    if (mode === 'stock') renderStock();
    if (mode === 'purchases') renderPurchaseGrid(true);
    if (mode === 'waste') renderWaste();
    if (mode === 'shopping') renderShopping();

    try {
      var url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    } catch (ignore) {}
  }

  function renderAllVisible() {
    renderKpis();
    if (state.mode === 'overview') renderOverview();
    if (state.mode === 'stock') renderStock();
    if (state.mode === 'purchases') renderPurchaseGrid(true);
    if (state.mode === 'waste') renderWaste();
    if (state.mode === 'shopping') renderShopping();
  }

  workspace.addEventListener('click', function (event) {
    var modeButton = event.target.closest('[data-r19-mode]');
    if (modeButton) {
      event.preventDefault();
      setMode(modeButton.getAttribute('data-r19-mode'));
      return;
    }
    var goMode = event.target.closest('[data-r19-go-mode]');
    if (goMode) {
      event.preventDefault();
      setMode(goMode.getAttribute('data-r19-go-mode'));
      return;
    }

    var stockMain = event.target.closest('[data-r19-stock-main-key]');
    if (stockMain) {
      var key = stockMain.getAttribute('data-r19-stock-main-key');
      state.stockMain = state.stockMain === key ? '' : key;
      state.stockSub = '';
      renderStock();
      return;
    }
    var stockSub = event.target.closest('[data-r19-stock-sub-key]');
    if (stockSub) {
      var sKey = stockSub.getAttribute('data-r19-stock-sub-key');
      state.stockSub = state.stockSub === sKey ? '' : sKey;
      renderStock();
      return;
    }
    var stockItem = event.target.closest('[data-r19-stock-item]');
    if (stockItem) {
      openStockEditor(stockItem.getAttribute('data-r19-stock-item'));
      return;
    }
    if (event.target.closest('[data-r19-close-stock-editor]')) {
      var stockEditor = workspace.querySelector('[data-r19-stock-editor]');
      if (stockEditor) stockEditor.hidden = true;
      return;
    }
    var saveStock = event.target.closest('[data-r19-save-stock-item]');
    if (saveStock) {
      saveStockItem(saveStock.getAttribute('data-r19-save-stock-item'));
      return;
    }
    var archive = event.target.closest('[data-r19-archive-item]');
    if (archive) {
      archiveItem(archive.getAttribute('data-r19-archive-item'));
      return;
    }
    if (event.target.closest('[data-r19-start-count]')) { startCount(); return; }
    if (event.target.closest('[data-r19-cancel-count]')) { cancelCount(); return; }
    if (event.target.closest('[data-r19-complete-count]')) { completeCount(); return; }

    var purchaseMain = event.target.closest('[data-r19-purchase-main-key]');
    if (purchaseMain) {
      state.purchaseMain = purchaseMain.getAttribute('data-r19-purchase-main-key');
      state.purchaseSub = '';
      state.purchaseSearch = '';
      var search = workspace.querySelector('[data-r19-purchase-search]');
      if (search) search.value = '';
      renderPurchaseGrid(true);
      return;
    }
    var purchaseSub = event.target.closest('[data-r19-purchase-sub-key]');
    if (purchaseSub) {
      var pKey = purchaseSub.getAttribute('data-r19-purchase-sub-key');
      state.purchaseSub = state.purchaseSub === pKey ? '' : pKey;
      renderPurchaseGrid(true);
      return;
    }
    if (event.target.closest('[data-r19-custom-purchase]')) {
      openPurchaseEditor(null, true);
      return;
    }
    var purchaseItem = event.target.closest('[data-r19-purchase-item]');
    if (purchaseItem) {
      openPurchaseEditor(purchaseItem.getAttribute('data-r19-purchase-item'), false);
      return;
    }
    if (event.target.closest('[data-r19-close-purchase-editor]')) {
      var purchaseEditor = workspace.querySelector('[data-r19-purchase-editor]');
      if (purchaseEditor) purchaseEditor.hidden = true;
      state.purchaseSelection = null;
      return;
    }
    if (event.target.closest('[data-r19-submit-purchase]')) { submitPurchase(); return; }
    if (event.target.closest('[data-r19-purchase-more]')) {
      state.purchaseLimit += 24;
      renderPurchaseGrid(false);
      return;
    }
    var removeBulk = event.target.closest('[data-r19-remove-bulk-line]');
    if (removeBulk && state.bulkReview) {
      var idx = Number(removeBulk.getAttribute('data-r19-remove-bulk-line'));
      state.bulkReview.lines.splice(idx,1);
      renderBulkReview();
      return;
    }
    if (event.target.closest('[data-r19-close-review]')) {
      state.bulkReview = null;
      var review = workspace.querySelector('[data-r19-receipt-review]');
      if (review) review.hidden = true;
      return;
    }
    if (event.target.closest('[data-r19-confirm-bulk]')) { confirmBulkPurchase(); return; }

    var wasteMain = event.target.closest('[data-r19-waste-main-key]');
    if (wasteMain) {
      var wMain = wasteMain.getAttribute('data-r19-waste-main-key');
      state.wasteMain = state.wasteMain === wMain ? '' : wMain;
      state.wasteSub = '';
      renderWaste();
      return;
    }
    var wasteSub = event.target.closest('[data-r19-waste-sub-key]');
    if (wasteSub) {
      var wSub = wasteSub.getAttribute('data-r19-waste-sub-key');
      state.wasteSub = state.wasteSub === wSub ? '' : wSub;
      renderWaste();
      return;
    }
    var wasteItem = event.target.closest('[data-r19-waste-item]');
    if (wasteItem) {
      openWasteEditor(wasteItem.getAttribute('data-r19-waste-item'));
      return;
    }
    if (event.target.closest('[data-r19-close-waste-editor]')) {
      var wasteEditor = workspace.querySelector('[data-r19-waste-editor]');
      if (wasteEditor) wasteEditor.hidden = true;
      state.wasteSelection = null;
      return;
    }
    if (event.target.closest('[data-r19-submit-waste]')) { submitWaste(); return; }

    var days = event.target.closest('[data-r19-shopping-days]');
    if (days) {
      state.shoppingDays = Number(days.getAttribute('data-r19-shopping-days') || 1);
      renderShopping();
      return;
    }
    if (event.target.closest('[data-r19-shopping-copy]')) { copyShopping(); return; }
    if (event.target.closest('[data-r19-shopping-print]')) { printShopping(); return; }
    if (event.target.closest('[data-r19-shopping-purchases]')) { shoppingToPurchases(); return; }
  });

  workspace.addEventListener('input', function (event) {
    if (event.target.matches('[data-r19-stock-search]')) {
      state.stockSearch = String(event.target.value || '').trim();
      renderStock();
      return;
    }
    if (event.target.matches('[data-r19-purchase-search]')) {
      state.purchaseSearch = String(event.target.value || '').trim();
      state.purchaseSub = '';
      state.purchaseLimit = 18;
      renderPurchaseGrid(true);
      return;
    }
    if (event.target.matches('[data-r19-count-input]')) {
      updateCountVariance(event.target);
      return;
    }
    if (event.target.matches('[data-r19-shopping-qty]')) {
      var row = event.target.closest('[data-r19-shopping-row]');
      if (row) {
        var item = items().find(function (entry) { return Number(entry.id) === Number(row.getAttribute('data-r19-shopping-row')); });
        var value = row.lastElementChild;
        if (item && value) value.textContent = money(Number(event.target.value || 0) * Number(item.purchase_unit_cost || 0));
      }
    }
  });

  workspace.addEventListener('change', function (event) {
    if (event.target.matches('[data-r19-receipt-input]')) {
      scanReceipt(event.target.files && event.target.files[0]);
    }
  });

  root.addEventListener('pmd:inventory-snapshot', function () {
    renderAllVisible();
  });

  buildCatalogIndex();
  renderKpis();

  var initialMode = 'overview';
  try {
    var requested = new URL(window.location.href).searchParams.get('mode');
    if (requested) initialMode = requested;
  } catch (ignore) {}
  setMode(initialMode);

  window.PMDInventoryWorkspaceR19 = {
    version:'19.0.0',
    setMode:setMode,
    refresh:function () {
      return api.refresh().then(function () {
        renderAllVisible();
      });
    }
  };
}());
