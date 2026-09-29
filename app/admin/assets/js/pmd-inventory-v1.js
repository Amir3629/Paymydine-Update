/* PMD_INVENTORY_CONTROL_R1 */
(function () {
  'use strict';

  if (window.PMDInventoryControlR1) return;

  var root = document.querySelector('[data-pmd-inventory-root]');
  var bootstrapNode = document.getElementById('pmd-inventory-bootstrap');
  if (!root || !bootstrapNode) return;

  var bootstrap = {};
  try {
    bootstrap = JSON.parse(bootstrapNode.textContent || '{}');
  } catch (ignore) {
    bootstrap = {};
  }

  var state = {
    ready: Boolean(bootstrap.ready),
    aiReceipts: Boolean(bootstrap.ai_receipts),
    currency: String(bootstrap.currency || 'EUR'),
    today: String(bootstrap.today || ''),
    snapshot: bootstrap.snapshot && typeof bootstrap.snapshot === 'object'
      ? bootstrap.snapshot
      : {},
    busy: false,
    search: ''
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csrf() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node && node.content ? node.content : '';
  }

  function num(value, digits) {
    value = Number(value || 0);
    if (!Number.isFinite(value)) value = 0;
    var max = typeof digits === 'number' ? digits : 2;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: max,
      minimumFractionDigits: 0
    }).format(value);
  }

  function money(value) {
    value = Number(value || 0);
    if (!Number.isFinite(value)) value = 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: state.currency,
        maximumFractionDigits: 2
      }).format(value);
    } catch (ignore) {
      return num(value, 2) + ' ' + state.currency;
    }
  }

  function dateLabel(value) {
    value = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(value + 'T12:00:00'));
    } catch (ignore) {
      return value;
    }
  }

  function dateTimeLabel(value) {
    value = String(value || '');
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value.replace(' ', 'T')));
    } catch (ignore) {
      return value.slice(0, 16);
    }
  }

  function toast(message, error) {
    var node = root.querySelector('[data-pmd-inv-toast]');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.toggle('is-error', Boolean(error));
    node.classList.add('is-show');
    window.clearTimeout(node._pmdTimer);
    node._pmdTimer = window.setTimeout(function () {
      node.classList.remove('is-show');
    }, 2600);
  }

  function setBusy(next) {
    state.busy = Boolean(next);
    root.querySelectorAll('form button[type="submit"]').forEach(function (button) {
      button.disabled = state.busy;
    });
  }

  function request(handler, data, formData) {
    var headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': handler
    };
    var token = csrf();
    if (token) headers['X-CSRF-TOKEN'] = token;

    var options = {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers
    };

    if (formData) {
      options.body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data || {});
    }

    return fetch(window.location.href, options).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.ok === false) {
          throw new Error(
            json && json.error
              ? String(json.error)
              : 'Inventory action could not be completed.'
          );
        }
        return json;
      });
    });
  }

  function items() {
    return Array.isArray(state.snapshot.items) ? state.snapshot.items : [];
  }

  function menus() {
    return Array.isArray(state.snapshot.menus) ? state.snapshot.menus : [];
  }

  function recipes() {
    return Array.isArray(state.snapshot.recipes) ? state.snapshot.recipes : [];
  }

  function itemById(id) {
    id = Number(id || 0);
    return items().find(function (item) {
      return Number(item.id || 0) === id;
    }) || null;
  }

  function itemOptions(emptyLabel) {
    var html = '<option value="">' + esc(emptyLabel || 'Choose item') + '</option>';
    items().forEach(function (item) {
      html += '<option value="' + esc(item.id) + '">' +
        esc(item.name) + ' · ' + esc(item.unit || '') +
      '</option>';
    });
    return html;
  }

  function unitOptions(selected) {
    var units = bootstrap.units && typeof bootstrap.units === 'object'
      ? bootstrap.units
      : {piece:'piece',bottle:'bottle',can:'can',pack:'pack',kg:'kg',g:'g',l:'l',ml:'ml'};
    return Object.keys(units).map(function (value) {
      return '<option value="' + esc(value) + '"' +
        (String(selected || '') === String(value) ? ' selected' : '') +
        '>' + esc(units[value]) + '</option>';
    }).join('');
  }

  function syncSelects() {
    root.querySelectorAll('[data-pmd-inv-item-select]').forEach(function (select) {
      var current = String(select.value || '');
      select.innerHTML = itemOptions('Choose item');
      if (current) select.value = current;
    });

    root.querySelectorAll('[data-pmd-inv-menu-select]').forEach(function (select) {
      var current = String(select.value || '');
      select.innerHTML = '<option value="">Choose menu item</option>' +
        menus().map(function (menu) {
          return '<option value="' + esc(menu.id) + '">' + esc(menu.name) + '</option>';
        }).join('');
      if (current) select.value = current;
    });
  }

  function syncPurchaseDatalist() {
    var list = document.getElementById('pmd-inv-purchase-items-r1');
    if (!list) {
      list = document.createElement('datalist');
      list.id = 'pmd-inv-purchase-items-r1';
      root.appendChild(list);
    }

    list.innerHTML = items().map(function (item) {
      return '<option value="' + esc(item.name) + '">' +
        esc(item.unit + (item.supplier_name ? ' · ' + item.supplier_name : '')) +
      '</option>';
    }).join('');
  }

  function syncPurchaseLineToKnownItem(input) {
    var name = String(input && input.value || '').trim().toLowerCase();
    if (!name) return;

    var item = items().find(function (row) {
      return String(row.name || '').trim().toLowerCase() === name;
    });
    if (!item) return;

    var line = input.closest('.pmd-inv-line');
    if (!line) return;

    var unit = line.querySelector('[data-pmd-purchase-unit]');
    var cost = line.querySelector('[data-pmd-purchase-cost]');
    if (unit) unit.value = String(item.unit || 'piece');
    if (cost && (!cost.value || Number(cost.value) === 0)) {
      cost.value = String(item.unit_cost || 0);
    }
  }

  function renderSummary() {
    var summary = state.snapshot.summary || {};

    var attention = Number(summary.critical_items || 0) + Number(summary.low_items || 0);
    var attentionNode = root.querySelector('[data-pmd-inv-stat="attention"]');
    var criticalNode = root.querySelector('[data-pmd-inv-stat="critical"]');
    var lowNode = root.querySelector('[data-pmd-inv-stat="low"]');
    if (attentionNode) attentionNode.textContent = String(attention);
    if (criticalNode) criticalNode.textContent = String(Number(summary.critical_items || 0));
    if (lowNode) lowNode.textContent = String(Number(summary.low_items || 0));

    [
      ['stock', summary.estimated_stock_value],
      ['purchases', summary.purchases_cost_30d],
      ['waste', summary.waste_cost_30d],
      ['variance', summary.unexplained_loss_value]
    ].forEach(function (pair) {
      var node = root.querySelector('[data-pmd-inv-money="' + pair[0] + '"]');
      if (node) node.textContent = money(pair[1]);
    });

    var coverage = root.querySelector('[data-pmd-inv-recipe-coverage]');
    if (coverage) coverage.textContent = String(Number(summary.recipe_coverage_pct || 0)) + '%';

    var last = root.querySelector('[data-pmd-inv-last-count]');
    if (last) {
      last.textContent = state.snapshot.last_count && state.snapshot.last_count.counted_at
        ? 'Last count ' + dateTimeLabel(state.snapshot.last_count.counted_at)
        : 'No physical count yet';
    }
  }

  function rowMatchesSearch(item) {
    if (!state.search) return true;
    var haystack = [
      item.name,
      item.sku,
      item.category,
      item.supplier_name,
      item.status
    ].join(' ').toLowerCase();
    return haystack.indexOf(state.search.toLowerCase()) !== -1;
  }

  function renderStock() {
    var body = root.querySelector('[data-pmd-inv-stock-body]');
    if (!body) return;

    var rows = items().filter(rowMatchesSearch);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="pmd-inv__empty-row">' +
        (items().length ? 'No stock items match this search.' : 'No stock items yet. Add a purchase or stock item to start.') +
      '</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (item) {
      var status = String(item.status || 'healthy');
      var days = item.days_left === null || typeof item.days_left === 'undefined'
        ? '—'
        : num(item.days_left, 1);
      var variance = Number(item.last_variance_qty || 0);
      var varianceClass = variance < 0 ? ' is-negative' : (variance > 0 ? ' is-positive' : '');
      var meta = [item.category, item.supplier_name].filter(Boolean).join(' · ');

      return '<tr class="is-' + esc(status) + '">' +
        '<td class="pmd-inv__item-name"><button type="button" class="pmd-inv__item-edit" data-pmd-inv-edit-item="' + esc(item.id) + '">' + esc(item.name) + '</button><small>' + esc(meta || 'Stock item') + '</small></td>' +
        '<td><span class="pmd-inv__qty">' + esc(num(item.estimated_on_hand, 3)) + ' <small>' + esc(item.unit) + '</small></span>' +
          (item.stock_percent === null || typeof item.stock_percent === 'undefined'
            ? ''
            : '<small class="pmd-inv__stock-percent">' + esc(String(item.stock_percent)) + '% of par</small>') +
        '</td>' +
        '<td>' + esc(num(item.avg_daily_usage, 3)) + ' ' + esc(item.unit) + '</td>' +
        '<td><span class="pmd-inv__days">' + esc(days) + '</span></td>' +
        '<td>' + esc(num(item.par_level, 3)) + ' ' + esc(item.unit) + '</td>' +
        '<td><span class="pmd-inv__variance' + varianceClass + '">' +
          (variance > 0 ? '+' : '') + esc(num(variance, 3)) + ' ' + esc(item.unit) +
        '</span></td>' +
        '<td><span class="pmd-inv-status is-' + esc(status) + '">' + esc(status) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function renderAttention() {
    var host = root.querySelector('[data-pmd-inv-attention]');
    if (!host) return;

    var rows = [];
    items().forEach(function (item) {
      var status = String(item.status || 'healthy');
      if (status === 'critical' || status === 'low') {
        var buyQty = Number(item.suggested_order_qty || 0);
        rows.push({
          priority: status === 'critical' ? 1 : 2,
          className: status,
          name: item.name,
          copy: item.days_left === null
            ? (num(item.estimated_on_hand, 2) + ' ' + item.unit + ' estimated on hand')
            : (num(item.days_left, 1) + ' days left at recent sales usage'),
          value: buyQty > 0
            ? ('BUY ' + num(buyQty, 2) + ' ' + item.unit)
            : (status === 'critical' ? 'RESTOCK' : 'LOW')
        });
      }

      if (Number(item.last_variance_qty || 0) < 0) {
        rows.push({
          priority: 3,
          className: 'variance',
          name: item.name,
          copy: 'Latest count was ' + num(Math.abs(Number(item.last_variance_qty)), 2) + ' ' + item.unit + ' below expected',
          value: money(Math.abs(Number(item.last_variance_cost || 0)))
        });
      }
    });

    rows.sort(function (a, b) { return a.priority - b.priority; });
    rows = rows.slice(0, 9);

    if (!rows.length) {
      host.innerHTML = '<div class="pmd-inv-attention-empty">Nothing needs immediate stock attention.</div>';
      return;
    }

    host.innerHTML = rows.map(function (row) {
      return '<div class="pmd-inv-attention is-' + esc(row.className) + '">' +
        '<div><strong>' + esc(row.name) + '</strong><span>' + esc(row.copy) + '</span></div>' +
        '<b>' + esc(row.value) + '</b>' +
      '</div>';
    }).join('');
  }

  function renderActivity() {
    var purchases = root.querySelector('[data-pmd-inv-panel="purchases"]');
    var waste = root.querySelector('[data-pmd-inv-panel="waste"]');
    var recipePanel = root.querySelector('[data-pmd-inv-panel="recipes"]');
    var counts = root.querySelector('[data-pmd-inv-panel="counts"]');

    if (purchases) {
      var rows = Array.isArray(state.snapshot.recent_purchases)
        ? state.snapshot.recent_purchases
        : [];
      purchases.innerHTML = rows.length
        ? rows.map(function (row) {
            var source = String(row.source || '') === 'ai_receipt' ? 'Scanned supplier bill' : 'Manual purchase';
            var detail = Array.isArray(row.lines)
              ? row.lines.slice(0, 4).map(function (line) {
                  return num(line.quantity, 3) + ' ' + (line.unit || '') + ' ' + (line.item_name || '');
                }).join(' · ')
              : '';
            if (Array.isArray(row.lines) && row.lines.length > 4) {
              detail += ' · +' + String(row.lines.length - 4) + ' more';
            }
            if (row.staff_name) {
              detail += (detail ? ' · ' : '') + 'Entered by ' + row.staff_name;
            }
            return '<div class="pmd-inv-activity-row">' +
              '<time>' + esc(dateLabel(row.purchased_at)) + '</time>' +
              '<div><strong>' + esc(row.supplier_name || 'Supplier not set') + '</strong><small>' + esc(detail || source) + '</small></div>' +
              '<b>' + esc(money(row.total_amount)) + '</b>' +
            '</div>';
          }).join('')
        : '<div class="pmd-inv-activity-empty">No purchases recorded yet.</div>';
    }

    if (waste) {
      var wasteRows = Array.isArray(state.snapshot.recent_waste)
        ? state.snapshot.recent_waste
        : [];
      waste.innerHTML = wasteRows.length
        ? wasteRows.map(function (row) {
            return '<div class="pmd-inv-activity-row">' +
              '<time>' + esc(dateTimeLabel(row.occurred_at)) + '</time>' +
              '<div><strong>' + esc(row.item_name || 'Stock item') + '</strong><small>' +
                esc(
                  (row.reason || 'Waste') +
                  (row.note ? ' · ' + row.note : '') +
                  (row.staff_name ? ' · Entered by ' + row.staff_name : '')
                ) +
              '</small></div>' +
              '<b>−' + esc(num(row.qty, 3)) + ' · ' + esc(money(row.cost)) + '</b>' +
            '</div>';
          }).join('')
        : '<div class="pmd-inv-activity-empty">No waste recorded yet.</div>';
    }

    if (recipePanel) {
      var recipeRows = recipes();
      recipePanel.innerHTML = recipeRows.length
        ? recipeRows.map(function (recipe) {
            var detail = (recipe.lines || []).map(function (line) {
              return num(line.qty_per_sale, 3) + ' ' + line.unit + ' ' + line.item_name;
            }).join(' · ');
            return '<div class="pmd-inv-activity-row">' +
              '<time>Per sale</time>' +
              '<div><strong>' + esc(recipe.menu_name) + '</strong><small>' + esc(detail) + '</small></div>' +
              '<b>' + esc(String((recipe.lines || []).length)) + ' lines</b>' +
            '</div>';
          }).join('')
        : '<div class="pmd-inv-activity-empty">No recipes linked yet. Without recipes, PMD cannot estimate ingredient usage from sales.</div>';
    }

    if (counts) {
      var last = state.snapshot.last_count;
      counts.innerHTML = last
        ? '<div class="pmd-inv-activity-row">' +
            '<time>' + esc(dateTimeLabel(last.counted_at)) + '</time>' +
            '<div><strong>Latest physical count</strong><small>' +
              esc(
                (last.note || 'Completed stock verification') +
                (last.staff_name ? ' · Counted by ' + last.staff_name : '')
              ) +
            '</small></div>' +
            '<b>' + esc(num(last.age_hours, 1)) + 'h ago</b>' +
          '</div>'
        : '<div class="pmd-inv-activity-empty">No physical stock count has been completed yet.</div>';
    }
  }

  function renderAll() {
    if (!state.ready) return;
    renderSummary();
    renderStock();
    renderAttention();
    renderActivity();
    syncSelects();
    syncPurchaseDatalist();
  }

  function prepareItemEditor(itemId) {
    var modal = root.querySelector('[data-pmd-inv-modal="item"]');
    var form = modal ? modal.querySelector('[data-pmd-inv-form="item"]') : null;
    if (!modal || !form) return;

    form.reset();
    var item = itemId ? itemById(itemId) : null;
    var title = modal.querySelector('[data-pmd-inv-item-title]');
    var save = modal.querySelector('[data-pmd-inv-item-save]');
    var openingField = modal.querySelector('[data-pmd-inv-opening-field]');
    var unit = form.querySelector('[name="unit"]');

    form.querySelector('[name="item_id"]').value = item ? String(item.id) : '';
    form.querySelector('[name="name"]').value = item ? String(item.name || '') : '';
    form.querySelector('[name="category"]').value = item ? String(item.category || '') : '';
    form.querySelector('[name="sku"]').value = item ? String(item.sku || '') : '';
    form.querySelector('[name="unit_cost"]').value = item ? String(item.unit_cost || 0) : '0';
    form.querySelector('[name="reorder_point"]').value = item ? String(item.reorder_point || 0) : '0';
    form.querySelector('[name="par_level"]').value = item ? String(item.par_level || 0) : '0';
    form.querySelector('[name="supplier_name"]').value = item ? String(item.supplier_name || '') : '';

    if (unit) {
      unit.disabled = Boolean(item);
      unit.value = item ? String(item.unit || 'piece') : 'piece';
    }

    if (openingField) openingField.hidden = Boolean(item);
    if (title) title.textContent = item ? 'Edit stock item' : 'Add stock item';
    if (save) save.textContent = item ? 'Save item' : 'Add item';
  }

  function openModal(name) {
    var modal = root.querySelector('[data-pmd-inv-modal="' + name + '"]');
    if (!modal) return;

    if (name === 'purchase') {
      var lines = root.querySelector('[data-pmd-inv-purchase-lines]');
      if (lines && !lines.children.length) addPurchaseLine({});
    }
    if (name === 'recipe') {
      var recipeLines = root.querySelector('[data-pmd-inv-recipe-lines]');
      if (recipeLines && !recipeLines.children.length) addRecipeLine({});
    }
    if (name === 'count') {
      renderCountLines();
    }

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    var focus = modal.querySelector('input:not([type="hidden"]),select,button');
    if (focus) window.setTimeout(function () { focus.focus(); }, 30);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    var form = modal.querySelector('form');
    if (form && !state.busy) form.reset();

    if (modal.matches('[data-pmd-inv-modal="item"]')) {
      var itemUnit = modal.querySelector('[name="unit"]');
      var openingField = modal.querySelector('[data-pmd-inv-opening-field]');
      var itemTitle = modal.querySelector('[data-pmd-inv-item-title]');
      var itemSave = modal.querySelector('[data-pmd-inv-item-save]');
      if (itemUnit) itemUnit.disabled = false;
      if (openingField) openingField.hidden = false;
      if (itemTitle) itemTitle.textContent = 'Add stock item';
      if (itemSave) itemSave.textContent = 'Add item';
    }

    if (modal.matches('[data-pmd-inv-modal="purchase"]')) {
      var purchaseLines = modal.querySelector('[data-pmd-inv-purchase-lines]');
      var receiptStatus = modal.querySelector('[data-pmd-inv-receipt-status]');
      var receiptId = modal.querySelector('[name="receipt_id"]');
      if (purchaseLines) purchaseLines.innerHTML = '';
      if (receiptStatus) {
        receiptStatus.textContent = '';
        receiptStatus.classList.remove('is-error');
      }
      if (receiptId) receiptId.value = '';
    }

    if (modal.matches('[data-pmd-inv-modal="recipe"]')) {
      var recipeLines = modal.querySelector('[data-pmd-inv-recipe-lines]');
      if (recipeLines) recipeLines.innerHTML = '';
    }

    if (modal.matches('[data-pmd-inv-modal="count"]')) {
      var countLines = modal.querySelector('[data-pmd-inv-count-lines]');
      if (countLines) countLines.innerHTML = '';
    }

    if (!root.querySelector('.pmd-inv-modal:not([hidden])')) {
      document.documentElement.style.overflow = '';
    }
  }

  function closeAllModals() {
    root.querySelectorAll('.pmd-inv-modal:not([hidden])').forEach(closeModal);
  }

  function addPurchaseLine(data) {
    var host = root.querySelector('[data-pmd-inv-purchase-lines]');
    if (!host) return;

    data = data || {};
    var row = document.createElement('div');
    row.className = 'pmd-inv-line';
    row.innerHTML =
      '<input type="text" list="pmd-inv-purchase-items-r1" data-pmd-purchase-name placeholder="Stock item" value="' + esc(data.item_name || '') + '" required>' +
      '<input type="number" min="0.0001" step="0.0001" data-pmd-purchase-qty placeholder="Qty" value="' + esc(data.quantity == null ? '' : data.quantity) + '" required>' +
      '<select data-pmd-purchase-unit>' + unitOptions(data.unit || 'piece') + '</select>' +
      '<input type="number" min="0" step="0.0001" data-pmd-purchase-cost placeholder="Unit cost" value="' + esc(data.unit_cost == null ? '' : data.unit_cost) + '">' +
      '<button type="button" class="pmd-inv-line__remove" data-pmd-inv-remove-line aria-label="Remove line">×</button>';

    host.appendChild(row);
  }

  function purchaseLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-inv-purchase-lines] .pmd-inv-line')
    ).map(function (row) {
      return {
        item_name: String((row.querySelector('[data-pmd-purchase-name]') || {}).value || '').trim(),
        quantity: Number((row.querySelector('[data-pmd-purchase-qty]') || {}).value || 0),
        unit: String((row.querySelector('[data-pmd-purchase-unit]') || {}).value || 'piece'),
        unit_cost: Number((row.querySelector('[data-pmd-purchase-cost]') || {}).value || 0)
      };
    }).filter(function (line) {
      return line.item_name && line.quantity > 0;
    });
  }

  function addRecipeLine(data) {
    var host = root.querySelector('[data-pmd-inv-recipe-lines]');
    if (!host) return;

    data = data || {};
    var row = document.createElement('div');
    row.className = 'pmd-inv-line is-recipe';
    row.innerHTML =
      '<select data-pmd-recipe-item required>' + itemOptions('Choose stock item') + '</select>' +
      '<input type="number" min="0.0001" step="0.0001" data-pmd-recipe-qty placeholder="Qty per sale" value="' + esc(data.qty_per_sale == null ? '' : data.qty_per_sale) + '" required>' +
      '<button type="button" class="pmd-inv-line__remove" data-pmd-inv-remove-line aria-label="Remove ingredient">×</button>';
    host.appendChild(row);

    if (data.item_id) {
      row.querySelector('[data-pmd-recipe-item]').value = String(data.item_id);
    }
  }

  function loadRecipeForMenu(menuId) {
    var host = root.querySelector('[data-pmd-inv-recipe-lines]');
    if (!host) return;
    host.innerHTML = '';

    var recipe = recipes().find(function (row) {
      return Number(row.menu_id || 0) === Number(menuId || 0);
    });

    if (recipe && Array.isArray(recipe.lines) && recipe.lines.length) {
      recipe.lines.forEach(addRecipeLine);
    } else {
      addRecipeLine({});
    }
  }

  function recipeLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line')
    ).map(function (row) {
      return {
        item_id: Number((row.querySelector('[data-pmd-recipe-item]') || {}).value || 0),
        qty_per_sale: Number((row.querySelector('[data-pmd-recipe-qty]') || {}).value || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.qty_per_sale > 0;
    });
  }

  function renderCountLines() {
    var host = root.querySelector('[data-pmd-inv-count-lines]');
    if (!host) return;

    if (!items().length) {
      host.innerHTML = '<div class="pmd-inv-activity-empty">Add stock items first.</div>';
      return;
    }

    host.innerHTML = items().map(function (item) {
      return '<div class="pmd-inv-count-row" data-pmd-count-item="' + esc(item.id) + '" data-pmd-count-expected="' + esc(item.estimated_on_hand) + '">' +
        '<strong>' + esc(item.name) + ' <small>' + esc(item.unit) + '</small></strong>' +
        '<span>Expected <b>' + esc(num(item.estimated_on_hand, 3)) + '</b></span>' +
        '<input type="number" min="0" step="0.0001" data-pmd-count-actual placeholder="Actual count">' +
        '<span class="pmd-inv-count-variance" data-pmd-count-variance>Variance —</span>' +
      '</div>';
    }).join('');
  }

  function updateCountVariance(input) {
    var row = input.closest('[data-pmd-count-item]');
    if (!row) return;

    var node = row.querySelector('[data-pmd-count-variance]');
    if (!node) return;

    if (input.value === '') {
      node.textContent = 'Variance —';
      node.className = 'pmd-inv-count-variance';
      return;
    }

    var expected = Number(row.getAttribute('data-pmd-count-expected') || 0);
    var actual = Number(input.value || 0);
    var diff = actual - expected;

    node.textContent = 'Variance ' + (diff > 0 ? '+' : '') + num(diff, 3);
    node.className = 'pmd-inv-count-variance' +
      (diff < 0 ? ' is-negative' : (diff > 0 ? ' is-positive' : ''));
  }

  function countLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-count-item]')
    ).map(function (row) {
      var input = row.querySelector('[data-pmd-count-actual]');
      if (!input || input.value === '') return null;
      return {
        item_id: Number(row.getAttribute('data-pmd-count-item') || 0),
        counted_qty: Number(input.value || 0)
      };
    }).filter(Boolean);
  }

  function formObject(form) {
    var out = {};
    new FormData(form).forEach(function (value, key) {
      out[key] = value;
    });
    return out;
  }

  function applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    state.snapshot = snapshot;
    renderAll();
  }

  function submitAction(form, handler, payload, successMessage) {
    if (state.busy) return;
    setBusy(true);

    request(handler, payload)
      .then(function (json) {
        if (json.snapshot) applySnapshot(json.snapshot);
        closeModal(form.closest('.pmd-inv-modal'));
        form.reset();
        toast(successMessage || 'Saved.');
      })
      .catch(function (error) {
        toast(error.message || 'Could not save.', true);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  root.addEventListener('click', function (event) {
    var editItem = event.target.closest('[data-pmd-inv-edit-item]');
    if (editItem) {
      event.preventDefault();
      prepareItemEditor(Number(editItem.getAttribute('data-pmd-inv-edit-item') || 0));
      openModal('item');
      return;
    }

    var open = event.target.closest('[data-pmd-inv-open]');
    if (open) {
      event.preventDefault();
      var modalName = String(open.getAttribute('data-pmd-inv-open') || '');
      if (modalName === 'item') prepareItemEditor(0);
      openModal(modalName);
      return;
    }

    var close = event.target.closest('[data-pmd-inv-close]');
    if (close) {
      event.preventDefault();
      closeModal(close.closest('.pmd-inv-modal'));
      return;
    }

    var tab = event.target.closest('[data-pmd-inv-tab]');
    if (tab) {
      event.preventDefault();
      var name = String(tab.getAttribute('data-pmd-inv-tab') || '');
      root.querySelectorAll('[data-pmd-inv-tab]').forEach(function (button) {
        var active = button === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      root.querySelectorAll('[data-pmd-inv-panel]').forEach(function (panel) {
        var active = panel.getAttribute('data-pmd-inv-panel') === name;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
      return;
    }

    var addPurchase = event.target.closest('[data-pmd-inv-add-purchase-line]');
    if (addPurchase) {
      event.preventDefault();
      addPurchaseLine({});
      return;
    }

    var addRecipe = event.target.closest('[data-pmd-inv-add-recipe-line]');
    if (addRecipe) {
      event.preventDefault();
      addRecipeLine({});
      return;
    }

    var removeLine = event.target.closest('[data-pmd-inv-remove-line]');
    if (removeLine) {
      event.preventDefault();
      var line = removeLine.closest('.pmd-inv-line');
      if (line) line.remove();
    }
  });

  root.addEventListener('input', function (event) {
    if (event.target.matches('[data-pmd-inv-search]')) {
      state.search = String(event.target.value || '').trim();
      renderStock();
      return;
    }

    if (event.target.matches('[data-pmd-count-actual]')) {
      updateCountVariance(event.target);
    }
  });

  root.addEventListener('change', function (event) {
    if (event.target.matches('[data-pmd-purchase-name]')) {
      syncPurchaseLineToKnownItem(event.target);
      return;
    }

    if (event.target.matches('[data-pmd-inv-menu-select]')) {
      loadRecipeForMenu(event.target.value);
      return;
    }

    if (event.target.matches('[data-pmd-inv-receipt-file]')) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;

      var status = root.querySelector('[data-pmd-inv-receipt-status]');
      var form = root.querySelector('[data-pmd-inv-form="purchase"]');
      var data = new FormData();
      data.append('receipt', file);

      if (status) {
        status.textContent = state.aiReceipts
          ? 'Reading supplier bill…'
          : 'Saving attachment for manual review…';
        status.classList.remove('is-error');
      }

      event.target.disabled = true;

      request('onScanReceipt', null, data)
        .then(function (json) {
          var extraction = json.extraction || {};
          if (form) {
            var receipt = form.querySelector('[name="receipt_id"]');
            var supplier = form.querySelector('[name="supplier_name"]');
            var purchasedAt = form.querySelector('[name="purchased_at"]');
            if (receipt) receipt.value = String(json.receipt_id || '');
            if (supplier && extraction.supplier_name) supplier.value = extraction.supplier_name;
            if (purchasedAt && extraction.purchase_date) purchasedAt.value = extraction.purchase_date;
          }

          var host = root.querySelector('[data-pmd-inv-purchase-lines]');
          if (host) host.innerHTML = '';

          var lines = Array.isArray(extraction.lines) ? extraction.lines : [];
          if (lines.length) {
            lines.forEach(addPurchaseLine);
          } else {
            addPurchaseLine({});
          }

          if (status) {
            status.textContent = json.ai_ok
              ? 'Bill read. Check every line, quantity and unit cost before adding stock.'
              : 'Attachment saved. AI could not read it, so enter the purchase lines manually.';
            status.classList.toggle('is-error', !json.ai_ok);
          }
        })
        .catch(function (error) {
          if (status) {
            status.textContent = error.message || 'Receipt could not be uploaded.';
            status.classList.add('is-error');
          }
        })
        .finally(function () {
          event.target.disabled = false;
          event.target.value = '';
        });
    }
  });

  root.querySelectorAll('[data-pmd-inv-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var kind = String(form.getAttribute('data-pmd-inv-form') || '');
      var payload = formObject(form);

      if (kind === 'item') {
        var editing = Number(payload.item_id || 0) > 0;
        submitAction(
          form,
          'onSaveItem',
          payload,
          editing ? 'Stock item updated.' : 'Stock item added.'
        );
        return;
      }

      if (kind === 'waste') {
        submitAction(form, 'onRecordWaste', payload, 'Waste recorded.');
        return;
      }

      if (kind === 'purchase') {
        payload.lines = purchaseLines();
        if (!payload.lines.length) {
          toast('Add at least one purchase line.', true);
          return;
        }
        submitAction(form, 'onSavePurchase', payload, 'Purchase added to stock.');
        return;
      }

      if (kind === 'recipe') {
        payload.lines = recipeLines();
        if (!payload.menu_id) {
          toast('Choose a menu item.', true);
          return;
        }
        if (!payload.lines.length) {
          toast('Add at least one stock item to the recipe.', true);
          return;
        }
        submitAction(form, 'onSaveRecipe', payload, 'Recipe stock usage saved.');
        return;
      }

      if (kind === 'count') {
        payload.lines = countLines();
        if (!items().length) {
          toast('Add stock items before starting a count.', true);
          return;
        }
        if (payload.lines.length !== items().length) {
          toast('Enter the physical count for every stock item.', true);
          return;
        }
        submitAction(form, 'onCompleteCount', payload, 'Physical stock count completed.');
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAllModals();
  });

  renderAll();

  window.PMDInventoryControlR1 = {
    version: '1.0.0',
    refresh: function () {
      return request('onSnapshot', {}).then(function (json) {
        if (json.snapshot) applySnapshot(json.snapshot);
        return json;
      });
    },
    getState: function () {
      return {
        ready: state.ready,
        items: items().length,
        recipes: recipes().length,
        currency: state.currency
      };
    }
  };
})();
