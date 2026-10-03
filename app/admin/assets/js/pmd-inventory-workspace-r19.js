/* PMD_INVENTORY_WORKSPACE_R20
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
  var embedded = Boolean(config.embedded);
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
    barcodeOpen: false,
    pendingBarcode: '',
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
    {key:'AlcoholFree', parent:'Drinks', label:'Alcohol-free drinks'},
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

  function barcodeTokens(item) {
    return String(item && item.sku || '')
      .split(/[\s,;|]+/)
      .map(function (value) { return String(value || '').trim(); })
      .filter(Boolean);
  }

  function normalizedBarcode(value) {
    return String(value == null ? '' : value).trim().replace(/[\r\n\t]+/g, '');
  }

  function itemForBarcode(code) {
    code = normalizedBarcode(code);
    if (!code) return null;
    return items().find(function (item) {
      return barcodeTokens(item).indexOf(code) !== -1;
    }) || null;
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

    // Zero-alcohol beer/wine belongs with non-alcoholic drinks even if the
    // source catalogue uses an alcoholic product family for taxonomy.
    if (
      /alcohol free|non alcoholic|zero alcohol|0 0/.test(name)
      && ['Beer & cider','Wine','Spirits','Beverages','Soft drinks'].indexOf(category) !== -1
    ) {
      return 'AlcoholFree';
    }

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
    var safety = Number(item.safety_stock || 0) / factor;
    var purchaseCost = Number(item.purchase_unit_cost || (Number(item.unit_cost || 0) * factor));
    var storageRows = Array.isArray(snapshot().storage_locations) ? snapshot().storage_locations : [];
    var storageOptions = '<option value="">Default storage</option>' + storageRows.map(function (row) {
      return '<option value="' + esc(row.id) + '"' + (Number(item.default_storage_location_id || 0) === Number(row.id) ? ' selected' : '') + '>' + esc(row.name) + '</option>';
    }).join('');
    var identifiers = Array.isArray(item.identifiers) ? item.identifiers : [];
    var identifierHtml = identifiers.length
      ? identifiers.map(function (identifier) {
          return '<span class="pmd-inv-r24-code-chip"><b>' + esc(identifier.code) + '</b><small>' +
            esc(identifier.package_unit + ' = ' + number(identifier.base_quantity, 2) + ' ' + item.unit) + '</small></span>';
        }).join('')
      : '<span class="pmd-inv-r24-code-empty">No package barcode mapped yet.</span>';

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
          '<label>Legacy SKU / alias<input type="text" value="' + esc(item.sku || '') + '" data-r19-edit-sku></label>' +
          '<label>1 purchase unit contains<input type="number" min="0.0001" step="0.0001" value="' + esc(item.purchase_to_base || 1) + '" data-r19-edit-factor></label>' +
          '<label>Safety stock<input type="number" min="0" step="0.01" value="' + esc(safety) + '" data-r19-edit-safety></label>' +
          '<label>Yield %<input type="number" min="1" max="100" step="0.1" value="' + esc(item.yield_percent || 100) + '" data-r19-edit-yield></label>' +
          '<label>Default storage<select data-r19-edit-storage>' + storageOptions + '</select></label>' +
          '<label class="pmd-inv-r24-check"><input type="checkbox" data-r19-edit-expiry' + (item.track_expiry ? ' checked' : '') + '><span>Track lot / expiry dates</span></label>' +
          '<label class="is-wide">Supplier<input type="text" value="' + esc(item.supplier_name || '') + '" data-r19-edit-supplier></label>' +
        '</div>' +
        '<div class="pmd-inv-r24-item-codes"><strong>Barcodes & package codes</strong><div>' + identifierHtml + '</div></div>' +
      '</details>' +
      '<div class="pmd-inv-r19-editor-actions">' +
        '<button type="button" class="pmd-inv-r19-secondary" data-r24-item-ledger="' + esc(item.id) + '">Ledger</button>' +
        '<button type="button" class="pmd-inv-r19-secondary" data-r24-item-identifier="' + esc(item.id) + '">Add barcode / package</button>' +
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
      safety_stock: Number(valueOf(host,'[data-r19-edit-safety]', Number(item.safety_stock || 0) / purchaseFactor(item))),
      yield_percent: Number(valueOf(host,'[data-r19-edit-yield]', item.yield_percent || 100)),
      default_storage_location_id: Number(valueOf(host,'[data-r19-edit-storage]', item.default_storage_location_id || 0)),
      track_expiry: Boolean((host.querySelector('[data-r19-edit-expiry]') || {}).checked),
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

    var settings = snapshot().inventory_settings || {};
    var blind = Boolean(settings.blind_counts);
    var countItems = items().slice();

    // Count the operator's current Stock scope. Uncounted items are carried
    // forward by the service, so a bar/fridge/category count is safe.
    countItems = filterByHierarchy(countItems, state.stockMain, state.stockSub);
    if (state.stockSearch) {
      var q = normalize(state.stockSearch);
      countItems = countItems.filter(function (item) {
        return normalize([item.name,item.category,item.sku].join(' ')).indexOf(q) !== -1;
      });
    }
    if (!countItems.length) countItems = items().slice();

    host.hidden = false;
    host.setAttribute('data-r24-blind-count', blind ? '1' : '0');
    host.innerHTML =
      '<div class="pmd-inv-r19-count-head"><div><h3>Physical count</h3>' +
      '<small>' + (blind
        ? 'Blind count is on. Enter only what you are checking; expected quantities stay hidden until completion.'
        : 'Count this stock scope. Leave an item blank if it is outside today’s count; its current baseline will be carried forward.') +
      '</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r19-cancel-count>Cancel</button></div>' +
      '<div class="pmd-inv-r19-count-list">' +
      countItems.map(function (item) {
        var owner = ownerQuantity(item, item.estimated_on_hand);
        return '<div class="pmd-inv-r19-count-row" data-r19-count-row="' + esc(item.id) + '">' +
          '<strong>' + esc(item.name) + '<span>' + esc(item.category || '') + '</span></strong>' +
          (blind
            ? '<span class="pmd-inv-r24-blind-label">Expected hidden</span>'
            : '<span>Expected ' + esc(number(owner.qty,2) + ' ' + owner.unit) + '</span>') +
          '<input type="number" min="0" step="0.01" placeholder="Actual ' + esc(owner.unit) + '" data-r19-count-input data-factor="' + esc(owner.factor) + '">' +
          (blind
            ? '<span class="pmd-inv-r19-count-variance">Variance hidden</span>'
            : '<span class="pmd-inv-r19-count-variance" data-r19-count-variance>Variance —</span>') +
        '</div>';
      }).join('') +
      '</div>' +
      '<div class="pmd-inv-r19-editor-fields" style="margin-top:10px"><label class="is-wide">Count note<input type="text" placeholder="Optional · e.g. Bar close count" data-r19-count-note></label></div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r19-complete-count>Complete scoped count</button></div>';
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
    var countHost = workspace.querySelector('[data-r19-count]');
    if (countHost && countHost.getAttribute('data-r24-blind-count') === '1') return;
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
      if (!input || input.value === '') continue;
      lines.push({
        item_id:Number(rows[i].getAttribute('data-r19-count-row')),
        counted_qty:Number(input.value || 0) * Number(input.getAttribute('data-factor') || 1)
      });
    }
    if (!lines.length) {
      toast('Enter at least one physical quantity for this count.', true);
      return;
    }

    setBusy(true);
    api.request('onCompleteCount', {
      lines:lines,
      note:valueOf(workspace,'[data-r19-count-note]','')
    }).then(applyActionSnapshot)
      .then(function () {
        cancelCount();
        toast('Physical count completed. Uncounted stock kept its current baseline.');
      })
      .catch(function (error) {
        toast(error.message || 'Could not complete the physical count.', true);
      })
      .finally(function () { setBusy(false); });
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

  function openPurchaseEditor(index, custom, barcode) {
    var row = custom ? null : catalog()[Number(index)];
    var host = workspace.querySelector('[data-r19-purchase-editor]');
    if (!host) return;
    state.purchaseSelection = custom ? {custom:true, barcode:normalizedBarcode(barcode)} : row;
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
        (custom && state.purchaseSelection.barcode ? '<label>Barcode / QR<input type="text" readonly value="' + esc(state.purchaseSelection.barcode) + '" data-r19-receive-barcode></label>' : '') +
        '<label>Quantity<input type="number" min="0.0001" step="0.01" value="1" data-r19-receive-qty></label>' +
        '<label>Unit<select data-r19-receive-unit>' + unitOptions(unit) + '</select></label>' +
        (custom && state.purchaseSelection.barcode ? '<label>1 scanned unit = base qty<input type="number" min="0.0001" step="0.0001" value="1" data-r19-receive-factor></label>' : '') +
        '<label>Cost / unit<input type="number" min="0" step="0.01" value="' + esc(cost) + '" data-r19-receive-cost></label>' +
        '<label>Lot / batch code<input type="text" placeholder="Optional" data-r19-receive-lot></label>' +
        '<label>Expiry date<input type="date" data-r19-receive-expiry></label>' +
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
      supplier_id:Number(valueOf(workspace,'[data-r19-purchase-supplier-id]',0)),
      supplier_name:valueOf(workspace,'[data-r19-purchase-supplier]','').trim(),
      invoice_number:valueOf(workspace,'[data-r19-purchase-invoice]','').trim(),
      storage_location_id:Number(valueOf(workspace,'[data-r19-purchase-storage]',0)),
      purchased_at:valueOf(workspace,'[data-r19-purchase-date]',todayKey()),
      lines:[{
        item_id:existing ? Number(existing.id) : 0,
        item_name:name,
        category:category,
        quantity:qty,
        unit:unit,
        unit_cost:cost,
        barcode:custom ? normalizedBarcode(selection.barcode) : '',
        base_quantity_per_unit:Number(valueOf(host,'[data-r19-receive-factor]',0)),
        lot_code:valueOf(host,'[data-r19-receive-lot]',''),
        expiry_date:valueOf(host,'[data-r19-receive-expiry]','')
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

  function renderBarcodeLinkOptions() {
    var select = workspace.querySelector('[data-r19-barcode-link-select]');
    if (select) {
      select.innerHTML = items().slice().sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }).map(function (item) {
        return '<option value="' + esc(item.id) + '">' + esc(item.name + ' · ' + ownerQuantityLabel(item, item.estimated_on_hand, 2)) + '</option>';
      }).join('');
    }

    var supplierSelect = workspace.querySelector('[data-r19-barcode-supplier]');
    if (supplierSelect) {
      var suppliers = Array.isArray(snapshot().suppliers) ? snapshot().suppliers : [];
      supplierSelect.innerHTML = '<option value="">No supplier</option>' + suppliers.map(function (supplier) {
        return '<option value="' + esc(supplier.id) + '">' + esc(supplier.name) + '</option>';
      }).join('');
    }
  }

  function setBarcodeStatus(message, error) {
    var status = workspace.querySelector('[data-r19-barcode-status]');
    if (!status) return;
    status.textContent = String(message || '');
    status.classList.toggle('is-error', Boolean(error));
    status.classList.toggle('is-success', Boolean(message) && !error);
  }

  function focusBarcodeInput() {
    var input = workspace.querySelector('[data-r19-barcode-input]');
    if (!input || !state.barcodeOpen) return;
    window.requestAnimationFrame(function () {
      input.focus({preventScroll:true});
      input.select();
    });
  }

  function openBarcodeScanner() {
    var panel = workspace.querySelector('[data-r19-barcode-panel]');
    if (!panel) return;
    state.barcodeOpen = true;
    state.pendingBarcode = '';
    panel.hidden = false;
    var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
    if (unknown) unknown.hidden = true;
    setBarcodeStatus('Scanner ready. Scan a bottle, pack, case, GTIN or supplier code.', false);
    restoreBarcodeDraft();
    renderBarcodeLinkOptions();
    panel.scrollIntoView({behavior:'smooth', block:'nearest'});
    focusBarcodeInput();
  }

  function closeBarcodeScanner() {
    var panel = workspace.querySelector('[data-r19-barcode-panel]');
    if (panel) panel.hidden = true;
    state.barcodeOpen = false;
    state.pendingBarcode = '';
    var cameraStop = workspace.querySelector('[data-r24-barcode-camera-stop]');
    if (cameraStop) cameraStop.click();
  }

  function ensureBarcodeReview() {
    if (!state.bulkReview) {
      state.bulkReview = {
        receiptId:0,
        label:'Barcode purchase',
        lines:[]
      };
    }
    if (!Array.isArray(state.bulkReview.lines)) state.bulkReview.lines = [];
    return state.bulkReview;
  }
  function barcodeDraftKey() {
    return 'pmd.inventory.barcodeDraft.v24.' + String(window.location.pathname || 'inventory');
  }

  function saveBarcodeDraft() {
    if (!state.bulkReview || state.bulkReview.label !== 'Barcode purchase') return;
    try {
      window.sessionStorage.setItem(barcodeDraftKey(), JSON.stringify({
        savedAt:Date.now(),
        lines:state.bulkReview.lines || []
      }));
    } catch (ignore) {}
  }

  function restoreBarcodeDraft() {
    if (state.bulkReview) return;
    try {
      var raw = window.sessionStorage.getItem(barcodeDraftKey());
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.lines) || !parsed.lines.length) return;
      state.bulkReview = {
        receiptId:0,
        label:'Barcode purchase',
        lines:parsed.lines
      };
      renderBulkReview();
      setBarcodeStatus('Restored ' + parsed.lines.length + ' unconfirmed scanned purchase line(s).', false);
    } catch (ignore) {}
  }

  function clearBarcodeDraft() {
    try {
      window.sessionStorage.removeItem(barcodeDraftKey());
    } catch (ignore) {}
  }


  function identifierCost(item, identifier) {
    var offers = Array.isArray(item && item.supplier_offers) ? item.supplier_offers : [];
    var supplierId = Number(identifier && identifier.supplier_id || 0);
    var unit = String(identifier && identifier.package_unit || item.purchase_unit || item.unit || 'piece');
    var factor = Math.max(.0001, Number(identifier && identifier.base_quantity || item.purchase_to_base || 1));

    var offer = offers.find(function (row) {
      return supplierId > 0
        && Number(row.supplier_id || 0) === supplierId
        && String(row.purchase_unit || '') === unit
        && Math.abs(Number(row.purchase_to_base || 1) - factor) < .0001;
    }) || offers.find(function (row) {
      return Boolean(row.preferred)
        && String(row.purchase_unit || '') === unit
        && Math.abs(Number(row.purchase_to_base || 1) - factor) < .0001;
    });

    if (offer) return Number(offer.unit_cost || 0);
    if (
      String(item.purchase_unit || item.unit) === unit
      && Math.abs(Number(item.purchase_to_base || 1) - factor) < .0001
    ) {
      return Number(item.purchase_unit_cost || 0);
    }
    return Number(item.unit_cost || 0) * factor;
  }

  function addBarcodeItemToDraft(item, code, identifier) {
    if (!item) return;
    identifier = identifier || {};
    var review = ensureBarcodeReview();
    var unit = String(identifier.package_unit || item.purchase_unit || item.unit || 'piece');
    var factor = Math.max(.0001, Number(identifier.base_quantity || item.purchase_to_base || 1));
    var identifierId = Number(identifier.id || 0);
    var cost = identifierCost(item, identifier);

    // Same stock item may legitimately have Bottle and Case codes. Merge only
    // an identical package identifier, never merely by item_id.
    var existing = review.lines.find(function (line) {
      return Number(line.item_id || 0) === Number(item.id)
        && Number(line.identifier_id || 0) === identifierId
        && String(line.unit || '') === unit
        && Math.abs(Number(line.base_quantity_per_unit || 1) - factor) < .0001;
    });

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
      review.lines.push({
        item_id:Number(item.id),
        item_name:String(item.name || ''),
        category:String(item.category || ''),
        identifier_id:identifierId,
        quantity:1,
        unit:unit,
        unit_cost:cost,
        base_quantity_per_unit:factor,
        barcode:normalizedBarcode(code)
      });
    }

    state.pendingBarcode = '';
    var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
    if (unknown) unknown.hidden = true;
    setBarcodeStatus(
      'Scanned ' + item.name + ' · 1 ' + unit + ' = ' + number(factor, 2) + ' ' + String(item.unit || 'piece') + ' added to draft.',
      false
    );
    renderBulkReview();
    saveBarcodeDraft();
    focusBarcodeInput();
  }

  function showUnknownBarcode(code, resolved) {
    state.pendingBarcode = code;
    renderBarcodeLinkOptions();

    var unknown = workspace.querySelector('[data-r19-barcode-unknown]');
    var unknownCode = workspace.querySelector('[data-r19-barcode-unknown-code]');
    var type = workspace.querySelector('[data-r24-barcode-code-type]');
    var typeSelect = workspace.querySelector('[data-r19-barcode-code-type-select]');
    var unit = workspace.querySelector('[data-r19-barcode-package-unit]');
    var base = workspace.querySelector('[data-r19-barcode-base-qty]');

    if (unknownCode) unknownCode.textContent = code;
    if (type) {
      var typeText = String(resolved && resolved.code_type || 'unknown').toUpperCase();
      type.textContent = typeText + (resolved && resolved.valid_gtin ? ' · valid GTIN check digit' : '') + ' · not linked yet';
    }
    if (typeSelect) {
      var detected = String(resolved && resolved.code_type || 'auto');
      typeSelect.value = ['gtin8','upca','ean13','gtin14','qr','internal'].indexOf(detected) !== -1
        ? detected
        : 'auto';
    }
    if (unknown) unknown.hidden = false;

    var selected = workspace.querySelector('[data-r19-barcode-link-select]');
    var selectedItem = items().find(function (row) {
      return Number(row.id) === Number(selected && selected.value || 0);
    });
    if (selectedItem) {
      if (unit) unit.value = String(selectedItem.purchase_unit || selectedItem.unit || 'piece');
      if (base) base.value = String(selectedItem.purchase_to_base || 1);
    }

    setBarcodeStatus('Unknown package code. Link the package once; future scans will resolve instantly.', true);
  }

  function scanBarcode(code) {
    code = normalizedBarcode(code);
    var input = workspace.querySelector('[data-r19-barcode-input]');
    if (input) input.value = '';
    if (!code) {
      setBarcodeStatus('No code received. Scan again.', true);
      focusBarcodeInput();
      return;
    }
    if (code.length > 160) {
      setBarcodeStatus('The scanned code is too long to store.', true);
      focusBarcodeInput();
      return;
    }
    if (state.busy) return;

    setBarcodeStatus('Looking up ' + code + '…', false);
    setBusy(true);

    api.request('onResolveBarcode', {code:code})
      .then(function (resolved) {
        if (!resolved || !resolved.found) {
          showUnknownBarcode(code, resolved || {});
          return;
        }

        var identifier = resolved.identifier || {};
        var item = items().find(function (row) {
          return Number(row.id) === Number(identifier.item_id || 0);
        });

        if (!item) {
          showUnknownBarcode(code, resolved);
          return;
        }

        addBarcodeItemToDraft(item, code, identifier);
        if (resolved.legacy) {
          setBarcodeStatus(
            'Legacy code resolved. Confirm this purchase; map the exact bottle/case conversion when you next edit the code.',
            false
          );
        }
      })
      .catch(function () {
        // Safe fallback for a tenant that has not run R24 yet.
        var legacy = itemForBarcode(code);
        if (legacy) {
          addBarcodeItemToDraft(legacy, code, {
            id:0,
            package_unit:String(legacy.purchase_unit || legacy.unit || 'piece'),
            base_quantity:Number(legacy.purchase_to_base || 1)
          });
          return;
        }
        showUnknownBarcode(code, {});
      })
      .finally(function () {
        setBusy(false);
        focusBarcodeInput();
      });
  }

  function linkPendingBarcode() {
    var code = normalizedBarcode(state.pendingBarcode);
    var select = workspace.querySelector('[data-r19-barcode-link-select]');
    var itemId = Number(select && select.value || 0);
    var item = items().find(function (row) { return Number(row.id) === itemId; });
    if (!code || !item || state.busy) return;

    var codeTypeNode = workspace.querySelector('[data-r19-barcode-code-type-select]');
    var packageUnitNode = workspace.querySelector('[data-r19-barcode-package-unit]');
    var baseQtyNode = workspace.querySelector('[data-r19-barcode-base-qty]');
    var supplierNode = workspace.querySelector('[data-r19-barcode-supplier]');
    var primaryNode = workspace.querySelector('[data-r19-barcode-primary]');
    var packageUnit = String(packageUnitNode && packageUnitNode.value || item.purchase_unit || item.unit || 'piece');
    var baseQty = Number(baseQtyNode && baseQtyNode.value || item.purchase_to_base || 1);

    if (!(baseQty > 0)) {
      setBarcodeStatus('Enter how much base stock one scan represents.', true);
      if (baseQtyNode) baseQtyNode.focus();
      return;
    }

    setBusy(true);
    api.request('onSaveIdentifier', {
      item_id:Number(item.id),
      code:code,
      code_type:String(codeTypeNode && codeTypeNode.value || 'auto'),
      package_unit:packageUnit,
      package_quantity:1,
      base_quantity:baseQty,
      supplier_id:Number(supplierNode && supplierNode.value || 0),
      is_primary:Boolean(primaryNode && primaryNode.checked),
      source:'scanner'
    }).then(applyActionSnapshot)
      .then(function () {
        var refreshed = items().find(function (row) { return Number(row.id) === itemId; }) || item;
        var identifier = (Array.isArray(refreshed.identifiers) ? refreshed.identifiers : []).find(function (row) {
          return String(row.code || '') === code;
        }) || {
          id:0,
          package_unit:packageUnit,
          base_quantity:baseQty,
          supplier_id:Number(supplierNode && supplierNode.value || 0)
        };
        addBarcodeItemToDraft(refreshed, code, identifier);
        toast('Package code linked to ' + item.name + '.');
      })
      .catch(function (error) {
        setBarcodeStatus(error.message || 'Could not link this package code.', true);
      })
      .finally(function () {
        setBusy(false);
        focusBarcodeInput();
      });
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
        return '<div class="pmd-inv-r19-receipt-line pmd-inv-r24-receipt-line" data-r19-bulk-line="' + index + '">' +
          '<label>Item<input type="text" value="' + esc(line.item_name || '') + '" data-r19-bulk-name></label>' +
          '<label>Qty<input type="number" min="0" step="0.01" value="' + esc(line.quantity == null ? '' : line.quantity) + '" data-r19-bulk-qty></label>' +
          '<label>Unit<select data-r19-bulk-unit>' + unitOptions(line.unit || 'piece') + '</select></label>' +
          '<label>Cost / unit<input type="number" min="0" step="0.01" value="' + esc(line.unit_cost == null ? 0 : line.unit_cost) + '" data-r19-bulk-cost></label>' +
          '<label>Base qty / unit<input type="number" min="0" step="0.0001" value="' + esc(line.base_quantity_per_unit || '') + '" placeholder="Auto" data-r19-bulk-factor></label>' +
          '<label>Lot<input type="text" value="' + esc(line.lot_code || '') + '" data-r19-bulk-lot></label>' +
          '<label>Expiry<input type="date" value="' + esc(line.expiry_date || '') + '" data-r19-bulk-expiry></label>' +
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
      var sourceLine = state.bulkReview && state.bulkReview.lines
        ? state.bulkReview.lines[Number(node.getAttribute('data-r19-bulk-line'))]
        : null;
      var existing = sourceLine && Number(sourceLine.item_id || 0) > 0
        ? items().find(function (row) { return Number(row.id) === Number(sourceLine.item_id); })
        : findExistingByName(name);
      var template = catalogByKey[normalize(name)] || null;
      return {
        item_id:existing ? Number(existing.id) : 0,
        item_name:name,
        category:String((sourceLine && sourceLine.category) || (template ? (template.category || '') : '')),
        identifier_id:Number(sourceLine && sourceLine.identifier_id || 0),
        quantity:qty,
        unit:unit,
        unit_cost:cost,
        base_quantity_per_unit:Number(valueOf(node,'[data-r19-bulk-factor]', sourceLine && sourceLine.base_quantity_per_unit || 0)),
        barcode:String(sourceLine && sourceLine.barcode || ''),
        purchase_order_line_id:Number(sourceLine && sourceLine.purchase_order_line_id || 0),
        lot_code:String(valueOf(node,'[data-r19-bulk-lot]', sourceLine && sourceLine.lot_code || '')),
        expiry_date:String(valueOf(node,'[data-r19-bulk-expiry]', sourceLine && sourceLine.expiry_date || ''))
      };
    }).filter(function (line) { return line.item_name && line.quantity > 0; });
    if (!lines.length) return toast('Keep at least one purchase line with a quantity.', true);
    var payload = {
      receipt_id:Number(state.bulkReview.receiptId || 0),
      supplier_id:Number(valueOf(workspace,'[data-r19-purchase-supplier-id]',0)),
      supplier_name:valueOf(workspace,'[data-r19-purchase-supplier]','').trim(),
      invoice_number:valueOf(workspace,'[data-r19-purchase-invoice]','').trim(),
      storage_location_id:Number(valueOf(workspace,'[data-r19-purchase-storage]',0)),
      purchased_at:valueOf(workspace,'[data-r19-purchase-date]',todayKey()),
      lines:lines
    };
    setBusy(true);
    api.request('onSavePurchase', payload).then(applyActionSnapshot)
      .then(function () {
        if (state.bulkReview && state.bulkReview.label === 'Barcode purchase') clearBarcodeDraft();
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
    var lots = Array.isArray(item.lots) ? item.lots : [];
    var lotOptions = '<option value="">No specific lot</option>' + lots.map(function (lot) {
      return '<option value="' + esc(lot.id) + '" data-storage="' + esc(lot.storage_location_id || '') + '">' +
        esc((lot.lot_code ? 'Lot ' + lot.lot_code + ' · ' : '') +
          number(lot.qty_remaining,2) + ' ' + item.unit +
          (lot.expiry_date ? ' · ' + lot.expiry_date : '')) + '</option>';
    }).join('');
    var storageRows = Array.isArray(snapshot().storage_locations) ? snapshot().storage_locations : [];
    var storageOptions = '<option value="">Unassigned / default</option>' + storageRows.map(function (row) {
      return '<option value="' + esc(row.id) + '"' +
        (Number(row.id) === Number(item.default_storage_location_id || 0) ? ' selected' : '') +
        '>' + esc(row.name) + '</option>';
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
        '<label>Lot / expiry<select data-r19-waste-lot>' + lotOptions + '</select></label>' +
        '<label>Storage<select data-r19-waste-storage>' + storageOptions + '</select></label>' +
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
      note:valueOf(host,'[data-r19-waste-note]',''),
      lot_id:Number(valueOf(host,'[data-r19-waste-lot]',0)),
      storage_location_id:Number(valueOf(host,'[data-r19-waste-storage]',0))
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
      var smartQty = Number(item.smart_order_qty || 0);
      var smartUnit = String(item.smart_order_unit || item.purchase_unit || item.unit || 'piece');
      var smartCost = Number(item.smart_order_unit_cost || item.purchase_unit_cost || 0);
      var preferred = item.preferred_supplier_offer || null;

      // Operations V2 can account for supplier lead time, safety stock, MOQ and
      // pack multiples. Use it for the normal smart-order horizon.
      if (days === 1 && smartQty > .00005) {
        return {
          item:item,
          qty:smartQty,
          unit:smartUnit,
          factor:Number(preferred && preferred.purchase_to_base || item.purchase_to_base || 1),
          estimatedCost:smartQty * smartCost,
          supplier:String(preferred && preferred.supplier_name || item.supplier_name || 'Unassigned supplier'),
          supplierId:Number(preferred && preferred.supplier_id || item.preferred_supplier_id || 0),
          supplierItemId:Number(preferred && preferred.id || 0),
          smart:true
        };
      }

      var par = Math.max(0, Number(item.par_level || 0));
      var safety = Math.max(0, Number(item.safety_stock || 0));
      var usageNeed = Math.max(0, Number(item.avg_daily_usage || 0) * days + safety);
      var desired = Math.max(par, usageNeed);
      if (desired <= 0 && Number(item.reorder_point || 0) > 0 && onHand <= Number(item.reorder_point || 0)) {
        desired = Number(item.reorder_point || 0);
      }
      var baseQty = Math.max(0, desired - onHand);
      if (baseQty <= .00005) return null;

      var factor = Math.max(.0001, Number(preferred && preferred.purchase_to_base || item.purchase_to_base || 1));
      var qty = baseQty / factor;
      var unit = String(preferred && preferred.purchase_unit || item.purchase_unit || item.unit || 'piece');
      var costPer = Number(preferred && preferred.unit_cost || item.purchase_unit_cost || 0);
      var multiple = Math.max(.0001, Number(preferred && preferred.pack_multiple || 1));
      var moq = Math.max(.0001, Number(preferred && preferred.moq || 1));
      qty = Math.max(qty, moq);
      qty = Math.ceil((qty - .0000001) / multiple) * multiple;

      return {
        item:item,
        qty:qty,
        unit:unit,
        factor:factor,
        estimatedCost:qty * costPer,
        supplier:String(preferred && preferred.supplier_name || item.supplier_name || 'Unassigned supplier'),
        supplierId:Number(preferred && preferred.supplier_id || item.preferred_supplier_id || 0),
        supplierItemId:Number(preferred && preferred.id || 0),
        smart:Boolean(preferred)
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
      var preferred = item && item.preferred_supplier_offer || null;
      return item && qty > 0 ? {
        item:item,
        qty:qty,
        unit:String(node.getAttribute('data-unit') || (preferred && preferred.purchase_unit) || item.purchase_unit || item.unit),
        cost:Number((preferred && preferred.unit_cost) || item.purchase_unit_cost || 0),
        supplier_id:Number((preferred && preferred.supplier_id) || item.preferred_supplier_id || 0),
        supplier_item_id:Number((preferred && preferred.id) || 0),
        factor:Number((preferred && preferred.purchase_to_base) || item.purchase_to_base || 1)
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
          item_id:Number(row.item.id),
          item_name:row.item.name,
          quantity:row.qty,
          unit:row.unit,
          unit_cost:Number(row.cost || row.item.purchase_unit_cost || 0),
          supplier_id:Number(row.supplier_id || 0),
          supplier_item_id:Number(row.supplier_item_id || 0),
          base_quantity_per_unit:Number(row.factor || row.item.purchase_to_base || 1)
        };
      })
    };
    renderBulkReview();
    var review = workspace.querySelector('[data-r19-receipt-review]');
    if (review) review.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function setMode(mode) {
    mode = ['overview','stock','purchases','orders','suppliers','waste','shopping','operations'].indexOf(mode) !== -1 ? mode : 'overview';
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
    if (
      ['orders','suppliers','operations'].indexOf(mode) !== -1
      && window.PMDInventoryOperationsR24
      && typeof window.PMDInventoryOperationsR24.render === 'function'
    ) {
      window.PMDInventoryOperationsR24.render();
    }

    if (!embedded) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('mode', mode);
        window.history.replaceState({}, '', url.toString());
      } catch (ignore) {}
    }
  }

  function renderAllVisible() {
    renderKpis();
    if (state.mode === 'overview') renderOverview();
    if (state.mode === 'stock') renderStock();
    if (state.mode === 'purchases') renderPurchaseGrid(true);
    if (state.mode === 'waste') renderWaste();
    if (state.mode === 'shopping') renderShopping();
    if (
      ['orders','suppliers','operations'].indexOf(state.mode) !== -1
      && window.PMDInventoryOperationsR24
      && typeof window.PMDInventoryOperationsR24.render === 'function'
    ) {
      window.PMDInventoryOperationsR24.render();
    }
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
    if (event.target.closest('[data-r19-barcode-open]')) {
      openBarcodeScanner();
      return;
    }
    if (event.target.closest('[data-r19-barcode-close]')) {
      closeBarcodeScanner();
      return;
    }
    if (event.target.closest('[data-r19-barcode-link]')) {
      linkPendingBarcode();
      return;
    }
    if (event.target.closest('[data-r19-barcode-new]')) {
      var pending = normalizedBarcode(state.pendingBarcode);
      if (pending) {
        openPurchaseEditor(null, true, pending);
        setBarcodeStatus('Create the item below; this code will be saved with it.', false);
      }
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
      if (state.bulkReview.label === 'Barcode purchase') saveBarcodeDraft();
      return;
    }
    if (event.target.closest('[data-r19-close-review]')) {
      if (state.bulkReview && state.bulkReview.label === 'Barcode purchase') clearBarcodeDraft();
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

  workspace.addEventListener('keydown', function (event) {
    if (!event.target.matches('[data-r19-barcode-input]')) return;
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    scanBarcode(event.target.value);
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
      return;
    }

    if (event.target.matches('[data-r19-waste-lot]')) {
      var selectedLot = event.target.options[event.target.selectedIndex];
      var storage = workspace.querySelector('[data-r19-waste-editor] [data-r19-waste-storage]');
      if (storage && selectedLot) {
        var storageId = selectedLot.getAttribute('data-storage');
        if (storageId) storage.value = storageId;
      }
      return;
    }

    if (event.target.matches('[data-r19-barcode-link-select]')) {
      var item = items().find(function (row) {
        return Number(row.id) === Number(event.target.value || 0);
      });
      if (!item) return;
      var unit = workspace.querySelector('[data-r19-barcode-package-unit]');
      var base = workspace.querySelector('[data-r19-barcode-base-qty]');
      if (unit) unit.value = String(item.purchase_unit || item.unit || 'piece');
      if (base) base.value = String(item.purchase_to_base || 1);
    }
  });

  root.addEventListener('pmd:inventory-snapshot', function () {
    renderAllVisible();
    if (state.barcodeOpen) renderBarcodeLinkOptions();
  });

  buildCatalogIndex();
  renderKpis();

  var initialMode = 'overview';
  if (!embedded) {
    try {
      var requested = new URL(window.location.href).searchParams.get('mode');
      if (requested) initialMode = requested;
    } catch (ignore) {}
  }
  setMode(initialMode);

  window.PMDInventoryWorkspaceR19 = {
    version:'24.0.0',
    setMode:setMode,
    refresh:function () {
      return api.refresh().then(function () {
        renderAllVisible();
      });
    }
  };
}());
