/* PMD_INVENTORY_PRO_R24
 * Professional supplier, package-code, PO, storage, expiry and ledger layer.
 * Additive only: PMDInventoryControlR1 remains the stock ledger authority.
 */
(function () {
  'use strict';

  if (window.PMDInventoryProR24) return;

  var root = document.querySelector('[data-pmd-inventory-root]');
  var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
  var api = window.PMDInventoryControlR1;
  if (!root || !workspace || !api || typeof api.request !== 'function') return;

  var config = api.getConfig ? api.getConfig() : {};
  var state = {
    loaded: false,
    loading: false,
    error: '',
    mode: 'overview',
    pro: {
      ready: false,
      suppliers: [],
      supplier_items: [],
      identifiers: [],
      storage_locations: [],
      storage_balances: [],
      unallocated_stock: [],
      lots: [],
      purchase_orders: [],
      price_history: [],
      ledger: [],
      settings: {},
      alerts: {}
    },
    ledgerSearch: '',
    cameraStream: null,
    cameraTimer: 0,
    detector: null
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function num(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: typeof digits === 'number' ? digits : 2,
      minimumFractionDigits: 0
    }).format(n);
  }

  function money(value, currency) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    currency = String(currency || config.currency || 'EUR');
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

  function dateLabel(value) {
    if (!value) return '—';
    try {
      var d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(d);
    } catch (ignore) {
      return String(value);
    }
  }

  function dateTimeLabel(value) {
    if (!value) return '—';
    try {
      var d = new Date(String(value).replace(' ', 'T'));
      if (isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch (ignore) {
      return String(value);
    }
  }

  function normalizeCode(value) {
    value = String(value == null ? '' : value).trim().replace(/[\r\n\t]+/g, '');
    if (/^[\d\s-]+$/.test(value)) value = value.replace(/[\s-]+/g, '');
    return value;
  }

  function items() {
    var snap = api.getSnapshot ? (api.getSnapshot() || {}) : {};
    return Array.isArray(snap.items) ? snap.items : [];
  }

  function itemById(id) {
    id = Number(id || 0);
    return items().find(function (row) { return Number(row.id) === id; }) || null;
  }

  function supplierById(id) {
    id = Number(id || 0);
    return (state.pro.suppliers || []).find(function (row) { return Number(row.id) === id; }) || null;
  }

  function identifierById(id) {
    id = Number(id || 0);
    return (state.pro.identifiers || []).find(function (row) { return Number(row.id) === id; }) || null;
  }

  function storageById(id) {
    id = Number(id || 0);
    return (state.pro.storage_locations || []).find(function (row) { return Number(row.id) === id; }) || null;
  }

  function request(handler, data) {
    return api.request(handler, data || {});
  }

  function toast(message, error) {
    var node = root.querySelector('[data-pmd-inv-toast]');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.toggle('is-error', Boolean(error));
    node.classList.add('is-visible');
    window.clearTimeout(node._r24Timer);
    node._r24Timer = window.setTimeout(function () {
      node.classList.remove('is-visible');
    }, 3200);
  }

  function setBusy(node, busy) {
    if (!node) return;
    node.classList.toggle('is-busy', Boolean(busy));
    node.querySelectorAll('button,input,select,textarea').forEach(function (control) {
      if (busy) {
        if (!control.disabled) control.setAttribute('data-r24-busy', '1');
        control.disabled = true;
      } else if (control.getAttribute('data-r24-busy') === '1') {
        control.disabled = false;
        control.removeAttribute('data-r24-busy');
      }
    });
  }

  function applyCoreSnapshot(json) {
    if (json && json.snapshot && api.applySnapshot) {
      api.applySnapshot(json.snapshot);
    }
  }

  function applySnapshot(pro) {
    state.pro = pro && typeof pro === 'object' ? pro : state.pro;
    state.loaded = Boolean(state.pro && state.pro.ready);
    state.error = '';
    renderCurrent();
    decorateReceiptReview();
  }

  function decorateReceiptReview() {
    var zones = workspace.querySelectorAll('[data-r24-reconcile-zone]');
    if (!zones.length) return;

    zones.forEach(function (zone) {
      var receiptId = Number(zone.getAttribute('data-receipt-id') || 0);
      if (!receiptId) {
        zone.innerHTML = '';
        return;
      }

      if (!state.loaded) {
        zone.innerHTML = '<span class="pmd-inv-r24-reconcile-note">Loading open purchase orders…</span>';
        return;
      }

      var orders = (state.pro.purchase_orders || []).filter(function (row) {
        return ['draft','sent','partial'].indexOf(String(row.status || '')) !== -1;
      });

      if (!orders.length) {
        zone.innerHTML = '<span class="pmd-inv-r24-reconcile-note">No open purchase order is available to compare with this invoice.</span>';
        return;
      }

      var existing = (state.pro.purchase_receipts || []).find(function (row) {
        return Number(row.id) === receiptId;
      }) || null;
      var selectedPo = existing ? Number(existing.purchase_order_id || 0) : 0;

      zone.innerHTML =
        '<div class="pmd-inv-r24-reconcile-controls">' +
          '<div><strong>Compare invoice to purchase order</strong><small>Checks supplier, lines, quantity and package price before stock is confirmed.</small></div>' +
          '<select data-r24-reconcile-po>' +
            '<option value="">Choose open PO</option>' +
            orders.map(function (row) {
              return '<option value="' + esc(row.id) + '"' + (selectedPo === Number(row.id) ? ' selected' : '') + '>' +
                esc(row.order_number + ' · ' + (row.supplier_name || 'Supplier') + ' · ' + money(row.estimated_total || 0, row.currency)) +
              '</option>';
            }).join('') +
          '</select>' +
          '<button type="button" class="pmd-inv-r19-secondary" data-r24-reconcile-run="' + esc(receiptId) + '">Compare</button>' +
        '</div>' +
        '<div class="pmd-inv-r24-reconcile-result" data-r24-reconcile-result></div>';

      if (existing && existing.reconciliation_json) {
        try {
          var saved = typeof existing.reconciliation_json === 'string'
            ? JSON.parse(existing.reconciliation_json)
            : existing.reconciliation_json;
          renderReconciliation(zone, saved);
        } catch (ignore) {}
      }
    });
  }

  function renderReconciliation(zone, result) {
    if (!zone || !result) return;
    var host = zone.querySelector('[data-r24-reconcile-result]');
    if (!host) return;
    var summary = result.summary || {};
    var matches = Array.isArray(result.matched_lines) ? result.matched_lines : [];
    var clean = Boolean(summary.clean_match);

    host.innerHTML =
      '<div class="pmd-inv-r24-reconcile-summary ' + (clean ? 'is-clean' : 'has-issues') + '">' +
        '<strong>' + esc(clean ? 'Clean PO match' : 'Review differences before confirming') + '</strong>' +
        '<span>' + esc(
          (summary.matched || 0) + ' matched · ' +
          (summary.missing || 0) + ' missing · ' +
          (summary.extra || 0) + ' extra · ' +
          (summary.quantity_issues || 0) + ' quantity issues · ' +
          (summary.price_issues || 0) + ' price issues'
        ) + '</span>' +
        (result.supplier_mismatch ? '<small>Supplier name does not match the selected PO.</small>' : '') +
      '</div>' +
      (matches.length ? '<div class="pmd-inv-r24-reconcile-lines">' + matches.map(function (row) {
        var qtyIssue = row.qty_variance !== null && Math.abs(Number(row.qty_variance || 0)) > 0.00005;
        var priceIssue = row.price_variance !== null && Math.abs(Number(row.price_variance || 0)) > 0.00005;
        return '<div class="' + (qtyIssue || priceIssue ? 'has-issue' : 'is-match') + '">' +
          '<strong>' + esc(row.item_name || row.invoice_item_name || 'Item') + '</strong>' +
          '<span>PO ' + esc(num(row.remaining_qty || 0,2) + ' ' + (row.package_unit || '')) +
          ' · Invoice ' + esc(row.invoice_qty === null ? '—' : num(row.invoice_qty,2)) + '</span>' +
          '<span>PO ' + esc(money(row.po_unit_cost || 0)) +
          ' · Invoice ' + esc(row.invoice_unit_cost === null ? '—' : money(row.invoice_unit_cost)) + '</span>' +
        '</div>';
      }).join('') + '</div>' : '');
  }

  function load(force) {
    if (state.loading) return Promise.resolve(state.pro);
    if (state.loaded && !force) return Promise.resolve(state.pro);

    state.loading = true;
    return request('onProSnapshot', {})
      .then(function (json) {
        applySnapshot(json.pro || {});
        return state.pro;
      })
      .catch(function (error) {
        state.error = error.message || 'Professional Inventory is not provisioned yet.';
        state.loaded = false;
        renderCurrent();
        throw error;
      })
      .finally(function () {
        state.loading = false;
      });
  }

  function proMode(mode) {
    return ['orders','suppliers','codes','storage','prep','expiry','ledger','analytics','settings'].indexOf(mode) !== -1;
  }

  function renderUnavailable() {
    var pane = workspace.querySelector('[data-r19-pane="' + state.mode + '"]');
    if (!pane) return;
    var existing = pane.querySelector('[data-r24-unavailable]');
    if (!existing) {
      existing = document.createElement('div');
      existing.setAttribute('data-r24-unavailable', '1');
      existing.className = 'pmd-inv-r24-unavailable';
      pane.appendChild(existing);
    }
    existing.innerHTML =
      '<strong>Inventory Professional R24 needs its additive database update.</strong>' +
      '<span>' + esc(state.error || 'Run the R24 migration, then reload this page.') + '</span>';
  }

  function renderCurrent() {
    if (!proMode(state.mode)) return;
    if (!state.loaded) {
      if (!state.loading) renderUnavailable();
      return;
    }

    workspace.querySelectorAll('[data-r24-unavailable]').forEach(function (node) {
      node.remove();
    });

    if (state.mode === 'orders') renderOrders();
    if (state.mode === 'suppliers') renderSuppliers();
    if (state.mode === 'codes') renderCodes();
    if (state.mode === 'storage') renderStorage();
    if (state.mode === 'prep') renderPrep();
    if (state.mode === 'expiry') renderExpiry();
    if (state.mode === 'ledger') renderLedger();
    if (state.mode === 'analytics') renderAnalytics();
    if (state.mode === 'settings') renderSettings();
  }

  function supplierOptions(selected, allowNone) {
    var html = allowNone ? '<option value="">No supplier</option>' : '<option value="">Choose supplier</option>';
    (state.pro.suppliers || []).forEach(function (row) {
      html += '<option value="' + esc(row.id) + '"' +
        (Number(selected || 0) === Number(row.id) ? ' selected' : '') +
        '>' + esc(row.name) + '</option>';
    });
    return html;
  }

  function itemOptions(selected) {
    var html = '<option value="">Choose stock item</option>';
    items().slice().sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    }).forEach(function (row) {
      html += '<option value="' + esc(row.id) + '"' +
        (Number(selected || 0) === Number(row.id) ? ' selected' : '') +
        '>' + esc(row.name) + '</option>';
    });
    return html;
  }

  function storageOptions(selected) {
    var html = '<option value="">Choose location</option>';
    (state.pro.storage_locations || []).forEach(function (row) {
      html += '<option value="' + esc(row.id) + '"' +
        (Number(selected || 0) === Number(row.id) ? ' selected' : '') +
        '>' + esc(row.name) + '</option>';
    });
    return html;
  }

  function defaultStorageId() {
    var rows = state.pro.storage_locations || [];
    var preferred = rows.find(function (row) { return Number(row.is_default || 0) === 1; });
    return preferred ? Number(preferred.id) : (rows[0] ? Number(rows[0].id) : 0);
  }

  function unitOptions(selected) {
    var units = config.units || {};
    var keys = Object.keys(units);
    if (!keys.length) {
      keys = ['piece','bottle','can','pack','case','box','tray','bag','bunch','jar','tub','bucket','crate','carton','keg','sack','roll','loaf','dozen','kg','g','l','ml'];
    }
    return keys.map(function (unit) {
      return '<option value="' + esc(unit) + '"' +
        (String(selected || '') === String(unit) ? ' selected' : '') +
        '>' + esc(units[unit] || unit) + '</option>';
    }).join('');
  }

  /* ------------------------------------------------------------
     Suppliers
     ------------------------------------------------------------ */

  function renderSuppliers() {
    var host = workspace.querySelector('[data-r24-supplier-list]');
    if (!host) return;

    var rows = state.pro.suppliers || [];
    host.innerHTML = rows.length ? rows.map(function (row) {
      return '<article class="pmd-inv-r24-card">' +
        '<div class="pmd-inv-r24-card__head"><div><span>Supplier</span><h3>' + esc(row.name) + '</h3></div>' +
        '<button type="button" class="pmd-inv-r24-icon-btn" data-r24-supplier-edit="' + esc(row.id) + '" aria-label="Edit supplier">•••</button></div>' +
        '<dl>' +
          '<div><dt>Lead time</dt><dd>' + esc(row.lead_time_days || 0) + ' days</dd></div>' +
          '<div><dt>Minimum order</dt><dd>' + esc(money(row.min_order_value || 0, row.currency)) + '</dd></div>' +
          '<div><dt>Supplier code</dt><dd>' + esc(row.supplier_code || '—') + '</dd></div>' +
          '<div><dt>Order email</dt><dd>' + esc(row.order_email || row.email || '—') + '</dd></div>' +
        '</dl>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No suppliers yet. Add the first supplier to start purchase-order and price tracking.</div>';

    renderSupplierProducts();
    renderPriceHistory();
  }

  function supplierItemById(id) {
    id = Number(id || 0);
    return (state.pro.supplier_items || []).find(function (row) {
      return Number(row.id) === id;
    }) || null;
  }

  function renderSupplierProducts() {
    var host = workspace.querySelector('[data-r24-supplier-product-list]');
    if (!host) return;
    var rows = state.pro.supplier_items || [];

    host.innerHTML = rows.length ? rows.map(function (row) {
      var packageText = num(row.package_quantity || 1, 2) + ' ' + (row.package_unit || 'package') +
        ' = ' + num(row.base_quantity || 1, 2) + ' ' + (row.base_unit || 'base');
      var orderRule = 'MOQ ' + num(row.min_order_qty || 1, 2) +
        ' · multiple ' + num(row.order_multiple || 1, 2);
      return '<article class="pmd-inv-r24-row">' +
        '<div class="pmd-inv-r24-row__main">' +
          (Number(row.is_preferred || 0) ? '<span class="pmd-inv-r24-status">Preferred</span>' : '<span class="pmd-inv-r24-status">Supplier item</span>') +
          '<strong>' + esc(row.item_name || 'Stock item') + '</strong>' +
          '<small>' + esc((row.supplier_name || 'Supplier') + ' · ' + packageText + ' · ' + orderRule) + '</small>' +
        '</div>' +
        '<div class="pmd-inv-r24-row__meta">' +
          '<span>' + esc(row.supplier_sku ? 'SKU ' + row.supplier_sku : (row.gtin ? 'GTIN ' + row.gtin : 'No supplier code')) + '</span>' +
          '<strong>' + esc(money(row.unit_price || 0, row.currency)) + '</strong>' +
          '<small>per ' + esc(row.package_unit || 'package') + '</small>' +
        '</div>' +
        '<div class="pmd-inv-r24-row__actions">' +
          '<button type="button" class="pmd-inv-r19-secondary" data-r24-supplier-product-edit="' + esc(row.id) + '">Edit</button>' +
          '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-supplier-product-archive="' + esc(row.id) + '">Remove</button>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No supplier products yet. Map the same stock item to one or more suppliers and packages.</div>';
  }

  function renderPriceHistory() {
    var host = workspace.querySelector('[data-r24-price-history-list]');
    if (!host) return;
    var rows = (state.pro.price_history || []).slice(0, 30);

    host.innerHTML = rows.length ? rows.map(function (row, index) {
      var previous = null;
      for (var i = index + 1; i < rows.length; i += 1) {
        if (
          Number(rows[i].item_id) === Number(row.item_id)
          && Number(rows[i].supplier_id || 0) === Number(row.supplier_id || 0)
        ) {
          previous = rows[i];
          break;
        }
      }
      var delta = previous && Number(previous.unit_cost || 0) > 0
        ? ((Number(row.unit_cost || 0) - Number(previous.unit_cost || 0)) / Number(previous.unit_cost || 0)) * 100
        : null;
      return '<article class="pmd-inv-r24-row">' +
        '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">' + esc(row.source || 'purchase') + '</span>' +
          '<strong>' + esc(row.item_name || 'Stock item') + '</strong>' +
          '<small>' + esc((row.supplier_name || 'Supplier') + ' · ' + (row.purchase_unit || 'unit') + ' · ' + dateLabel(row.recorded_at)) + '</small></div>' +
        '<div class="pmd-inv-r24-row__meta"><span>Package price</span><strong>' + esc(money(row.unit_cost || 0, row.currency)) + '</strong>' +
          '<small>' + (delta === null ? 'First comparable price' : esc((delta > 0 ? '+' : '') + num(delta,1) + '% vs previous')) + '</small></div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">Price history appears automatically after purchases and purchase-order receiving.</div>';
  }

  function openSupplierProductEditor(row) {
    var host = workspace.querySelector('[data-r24-supplier-product-editor]');
    if (!host) return;
    row = row || {};
    var item = itemById(row.item_id);
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Supplier catalogue</span><h3>' + esc(row.id ? 'Edit supplier product' : 'Add supplier product') + '</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Supplier<select data-r24-supplier-product-supplier>' + supplierOptions(row.supplier_id, false) + '</select></label>' +
        '<label>Stock item<select data-r24-supplier-product-item>' + itemOptions(row.item_id) + '</select></label>' +
        '<label>Supplier SKU<input type="text" data-r24-supplier-product-sku value="' + esc(row.supplier_sku || '') + '" placeholder="Article number"></label>' +
        '<label>GTIN / package barcode<input type="text" data-r24-supplier-product-gtin value="' + esc(row.gtin || '') + '" placeholder="Optional"></label>' +
        '<label>Package unit<select data-r24-supplier-product-unit>' + unitOptions(row.package_unit || (item && item.purchase_unit) || 'piece') + '</select></label>' +
        '<label>Packages represented<input type="number" min="0.0001" step="0.01" data-r24-supplier-product-package-qty value="' + esc(row.package_quantity || 1) + '"></label>' +
        '<label>Base quantity / package<input type="number" min="0.0001" step="0.0001" data-r24-supplier-product-base value="' + esc(row.base_quantity || (item && item.purchase_to_base) || 1) + '"></label>' +
        '<label>Price / package<input type="number" min="0" step="0.01" data-r24-supplier-product-price value="' + esc(row.unit_price || 0) + '"></label>' +
        '<label>Minimum order qty<input type="number" min="0.0001" step="0.01" data-r24-supplier-product-moq value="' + esc(row.min_order_qty || 1) + '"></label>' +
        '<label>Order multiple<input type="number" min="0.0001" step="0.01" data-r24-supplier-product-multiple value="' + esc(row.order_multiple || 1) + '"></label>' +
        '<label>Currency<input type="text" maxlength="3" data-r24-supplier-product-currency value="' + esc(row.currency || config.currency || 'EUR') + '"></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-supplier-product-preferred' + (Number(row.is_preferred || 0) ? ' checked' : '') + '><span>Preferred supplier/package for this stock item</span></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-supplier-product-save data-id="' + esc(row.id || '') + '">Save supplier product</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveSupplierProduct(button) {
    var host = workspace.querySelector('[data-r24-supplier-product-editor]');
    if (!host) return;
    var supplierId = Number((host.querySelector('[data-r24-supplier-product-supplier]') || {}).value || 0);
    var itemId = Number((host.querySelector('[data-r24-supplier-product-item]') || {}).value || 0);
    if (!supplierId || !itemId) return toast('Choose a supplier and stock item.', true);

    setBusy(host, true);
    request('onProSaveSupplierItem', {
      supplier_item_id:Number(button.getAttribute('data-id') || 0),
      supplier_id:supplierId,
      item_id:itemId,
      supplier_sku:String((host.querySelector('[data-r24-supplier-product-sku]') || {}).value || ''),
      gtin:normalizeCode((host.querySelector('[data-r24-supplier-product-gtin]') || {}).value || ''),
      package_unit:String((host.querySelector('[data-r24-supplier-product-unit]') || {}).value || 'piece'),
      package_quantity:Number((host.querySelector('[data-r24-supplier-product-package-qty]') || {}).value || 1),
      base_quantity:Number((host.querySelector('[data-r24-supplier-product-base]') || {}).value || 1),
      unit_price:Number((host.querySelector('[data-r24-supplier-product-price]') || {}).value || 0),
      min_order_qty:Number((host.querySelector('[data-r24-supplier-product-moq]') || {}).value || 1),
      order_multiple:Number((host.querySelector('[data-r24-supplier-product-multiple]') || {}).value || 1),
      currency:String((host.querySelector('[data-r24-supplier-product-currency]') || {}).value || config.currency || 'EUR'),
      is_preferred:Boolean((host.querySelector('[data-r24-supplier-product-preferred]') || {}).checked)
    }).then(function (json) {
      applyCoreSnapshot(json);
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Supplier product saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save supplier product.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function openSupplierEditor(row) {
    var host = workspace.querySelector('[data-r24-supplier-editor]');
    if (!host) return;
    row = row || {};
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Supplier</span><h3>' + esc(row.id ? 'Edit supplier' : 'Add supplier') + '</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label class="is-wide">Name<input type="text" data-r24-supplier-name value="' + esc(row.name || '') + '" placeholder="METRO, Transgourmet…"></label>' +
        '<label>Supplier code<input type="text" data-r24-supplier-code value="' + esc(row.supplier_code || '') + '"></label>' +
        '<label>Lead time · days<input type="number" min="0" step="1" data-r24-supplier-lead value="' + esc(row.lead_time_days == null ? 1 : row.lead_time_days) + '"></label>' +
        '<label>Minimum order<input type="number" min="0" step="0.01" data-r24-supplier-min value="' + esc(row.min_order_value || 0) + '"></label>' +
        '<label>Currency<input type="text" maxlength="3" data-r24-supplier-currency value="' + esc(row.currency || config.currency || 'EUR') + '"></label>' +
        '<label>Email<input type="email" data-r24-supplier-email value="' + esc(row.email || '') + '"></label>' +
        '<label>Order email<input type="email" data-r24-supplier-order-email value="' + esc(row.order_email || '') + '"></label>' +
        '<label>Phone<input type="text" data-r24-supplier-phone value="' + esc(row.phone || '') + '"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions">' +
        (row.id ? '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-supplier-archive="' + esc(row.id) + '">Archive</button>' : '') +
        '<button type="button" class="pmd-inv-r19-primary" data-r24-supplier-save data-id="' + esc(row.id || '') + '">Save supplier</button>' +
      '</div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveSupplier(button) {
    var host = workspace.querySelector('[data-r24-supplier-editor]');
    if (!host) return;
    var name = String((host.querySelector('[data-r24-supplier-name]') || {}).value || '').trim();
    if (!name) return toast('Supplier name is required.', true);

    setBusy(host, true);
    request('onProSaveSupplier', {
      supplier_id:Number(button.getAttribute('data-id') || 0),
      name:name,
      supplier_code:String((host.querySelector('[data-r24-supplier-code]') || {}).value || ''),
      lead_time_days:Number((host.querySelector('[data-r24-supplier-lead]') || {}).value || 0),
      min_order_value:Number((host.querySelector('[data-r24-supplier-min]') || {}).value || 0),
      currency:String((host.querySelector('[data-r24-supplier-currency]') || {}).value || config.currency || 'EUR'),
      email:String((host.querySelector('[data-r24-supplier-email]') || {}).value || ''),
      order_email:String((host.querySelector('[data-r24-supplier-order-email]') || {}).value || ''),
      phone:String((host.querySelector('[data-r24-supplier-phone]') || {}).value || '')
    }).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Supplier saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save supplier.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  /* ------------------------------------------------------------
     Product identifiers / GTIN packages
     ------------------------------------------------------------ */

  function renderCodes() {
    var summary = workspace.querySelector('[data-r24-code-summary]');
    var host = workspace.querySelector('[data-r24-code-list]');
    if (!host) return;

    var rows = state.pro.identifiers || [];
    var mappedItems = {};
    rows.forEach(function (row) { mappedItems[Number(row.item_id)] = true; });
    if (summary) {
      summary.innerHTML =
        '<span><b>' + esc(rows.length) + '</b> package codes</span>' +
        '<span><b>' + esc(Object.keys(mappedItems).length) + '</b> stock items mapped</span>' +
        '<span><b>' + esc(items().length - Object.keys(mappedItems).length) + '</b> items without a package code</span>';
    }

    host.innerHTML = rows.length ? rows.map(function (row) {
      var packageText = num(row.package_quantity || 1, 2) + ' ' + (row.package_unit || 'piece') +
        ' = ' + num(row.base_quantity || 1, 2) + ' ' + (row.base_unit || 'base units');
      return '<article class="pmd-inv-r24-row">' +
        '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-code">' + esc(row.code) + '</span>' +
          '<strong>' + esc(row.item_name || 'Stock item') + '</strong>' +
          '<small>' + esc((row.code_type || 'CODE') + ' · ' + packageText) + '</small></div>' +
        '<div class="pmd-inv-r24-row__meta"><span>' + esc(row.supplier_name || 'Any supplier') + '</span>' +
          '<strong>' + esc(row.unit_price > 0 ? money(row.unit_price, row.currency) : 'No package price') + '</strong></div>' +
        '<div class="pmd-inv-r24-row__actions">' +
          '<button type="button" class="pmd-inv-r19-secondary" data-r24-code-edit="' + esc(row.id) + '">Edit</button>' +
          '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-code-archive="' + esc(row.id) + '">Remove</button>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No package codes yet. Add the barcode printed on a bottle, case, crate or supplier package.</div>';
  }

  function openCodeEditor(row, seedCode) {
    var host = workspace.querySelector('[data-r24-code-editor]');
    if (!host) return;
    row = row || {};
    var item = itemById(row.item_id);
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Product identifier</span><h3>' + esc(row.id ? 'Edit package code' : 'Add package code') + '</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Stock item<select data-r24-code-item>' + itemOptions(row.item_id) + '</select></label>' +
        '<label>Supplier<select data-r24-code-supplier>' + supplierOptions(row.supplier_id, true) + '</select></label>' +
        '<label class="is-wide">Barcode / GTIN / supplier code<input type="text" data-r24-code-value value="' + esc(seedCode || row.code || '') + '" placeholder="Scan or type the code"></label>' +
        '<label>Type<select data-r24-code-type>' +
          ['AUTO','EAN8','UPC_A','EAN13','GTIN14','CODE128','QR','QR_URL','INTERNAL'].map(function (type) {
            var selected = String(row.code_type || 'AUTO') === type ? ' selected' : '';
            return '<option value="' + type + '"' + selected + '>' + type + '</option>';
          }).join('') +
        '</select></label>' +
        '<label>Package unit<select data-r24-code-unit>' + unitOptions(row.package_unit || (item && item.purchase_unit) || 'piece') + '</select></label>' +
        '<label>Packages represented<input type="number" min="0.0001" step="0.01" data-r24-code-package-qty value="' + esc(row.package_quantity || 1) + '"></label>' +
        '<label>Base quantity in 1 scan<input type="number" min="0.0001" step="0.0001" data-r24-code-base-qty value="' + esc(row.base_quantity || (item && item.purchase_to_base) || 1) + '"></label>' +
        '<label>Price / scanned package<input type="number" min="0" step="0.01" data-r24-code-price value="' + esc(row.unit_price || 0) + '"></label>' +
        '<label>Currency<input type="text" maxlength="3" data-r24-code-currency value="' + esc(row.currency || config.currency || 'EUR') + '"></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-code-primary' + (Number(row.is_primary || 0) ? ' checked' : '') + '><span>Primary code for this item</span></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-code-save data-id="' + esc(row.id || '') + '">Save package code</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
    var input = host.querySelector('[data-r24-code-value]');
    if (input) input.focus();
  }

  function saveCode(button) {
    var host = workspace.querySelector('[data-r24-code-editor]');
    if (!host) return;

    var itemId = Number((host.querySelector('[data-r24-code-item]') || {}).value || 0);
    var code = normalizeCode((host.querySelector('[data-r24-code-value]') || {}).value || '');
    if (!itemId || !code) return toast('Choose an item and scan or enter its package code.', true);

    setBusy(host, true);
    request('onProSaveIdentifier', {
      identifier_id:Number(button.getAttribute('data-id') || 0),
      item_id:itemId,
      supplier_id:Number((host.querySelector('[data-r24-code-supplier]') || {}).value || 0),
      code:code,
      code_type:String((host.querySelector('[data-r24-code-type]') || {}).value || 'AUTO'),
      package_unit:String((host.querySelector('[data-r24-code-unit]') || {}).value || 'piece'),
      package_quantity:Number((host.querySelector('[data-r24-code-package-qty]') || {}).value || 1),
      base_quantity:Number((host.querySelector('[data-r24-code-base-qty]') || {}).value || 1),
      unit_price:Number((host.querySelector('[data-r24-code-price]') || {}).value || 0),
      currency:String((host.querySelector('[data-r24-code-currency]') || {}).value || config.currency || 'EUR'),
      source:'manual',
      is_primary:Boolean((host.querySelector('[data-r24-code-primary]') || {}).checked)
    }).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Package code saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save package code.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  /* ------------------------------------------------------------
     Purchase orders / receiving
     ------------------------------------------------------------ */

  function orderStatusLabel(status) {
    status = String(status || 'draft');
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function renderOrders() {
    var summary = workspace.querySelector('[data-r24-po-summary]');
    var host = workspace.querySelector('[data-r24-po-list]');
    if (!host) return;

    var rows = state.pro.purchase_orders || [];
    var open = rows.filter(function (row) {
      return ['draft','sent','partial'].indexOf(String(row.status || '')) !== -1;
    });
    if (summary) {
      summary.innerHTML =
        '<span><b>' + esc(open.length) + '</b> open orders</span>' +
        '<span><b>' + esc(rows.filter(function (row) { return row.status === 'partial'; }).length) + '</b> partial deliveries</span>' +
        '<span><b>' + esc(money(open.reduce(function (sum, row) { return sum + Number(row.estimated_total || 0); }, 0))) + '</b> open estimate</span>';
    }

    host.innerHTML = rows.length ? rows.map(function (row) {
      var lines = Array.isArray(row.lines) ? row.lines : [];
      var remaining = lines.reduce(function (sum, line) {
        return sum + Math.max(0, Number(line.quantity_ordered || 0) - Number(line.quantity_received || 0));
      }, 0);
      return '<article class="pmd-inv-r24-order is-' + esc(row.status || 'draft') + '">' +
        '<div class="pmd-inv-r24-order__head">' +
          '<div><span class="pmd-inv-r24-status">' + esc(orderStatusLabel(row.status)) + '</span>' +
          '<h3>' + esc(row.order_number) + '</h3><small>' + esc(row.supplier_name || 'No supplier') + '</small></div>' +
          '<strong>' + esc(money(row.estimated_total || 0, row.currency)) + '</strong>' +
        '</div>' +
        '<div class="pmd-inv-r24-order__meta">' +
          '<span>Created ' + esc(dateLabel(row.created_at)) + '</span>' +
          '<span>Expected ' + esc(dateLabel(row.expected_at)) + '</span>' +
          '<span>' + esc(lines.length) + ' lines</span>' +
          '<span>' + esc(num(remaining, 2)) + ' packages remaining</span>' +
        '</div>' +
        '<div class="pmd-inv-r24-order__lines">' + lines.slice(0, 8).map(function (line) {
          return '<div><strong>' + esc(line.item_name || line.description || 'Item') + '</strong>' +
            '<span>' + esc(num(line.quantity_received || 0, 2) + ' / ' + num(line.quantity_ordered || 0, 2) + ' ' + (line.package_unit || '')) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="pmd-inv-r24-order__actions">' +
          (row.status === 'draft' ? '<button type="button" class="pmd-inv-r19-secondary" data-r24-po-send="' + esc(row.id) + '">Mark sent</button>' : '') +
          (['draft','sent','partial'].indexOf(String(row.status || '')) !== -1 ? '<button type="button" class="pmd-inv-r19-primary" data-r24-po-receive="' + esc(row.id) + '">Receive delivery</button>' : '') +
          (['received','cancelled','closed'].indexOf(String(row.status || '')) === -1 ? '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-po-cancel="' + esc(row.id) + '">Cancel</button>' : '') +
        '</div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No purchase orders yet. Create one manually or turn the Shopping list into an order.</div>';
  }

  function poLineHtml(seed) {
    seed = seed || {};
    var rowId = 'r24-po-line-' + Math.random().toString(36).slice(2);
    return '<div class="pmd-inv-r24-po-line" data-r24-po-line id="' + rowId + '">' +
      '<label>Item<select data-r24-po-item>' + itemOptions(seed.item_id) + '</select></label>' +
      '<label>Package<select data-r24-po-package></select></label>' +
      '<label>Qty<input type="number" min="0.0001" step="0.01" data-r24-po-qty value="' + esc(seed.quantity || 1) + '"></label>' +
      '<label>Cost / package<input type="number" min="0" step="0.01" data-r24-po-cost value="' + esc(seed.unit_cost || 0) + '"></label>' +
      '<button type="button" class="pmd-inv-r24-line-remove" data-r24-po-line-remove aria-label="Remove">×</button>' +
    '</div>';
  }

  function refreshPoLinePackages(line) {
    if (!line) return;
    var itemId = Number((line.querySelector('[data-r24-po-item]') || {}).value || 0);
    var select = line.querySelector('[data-r24-po-package]');
    if (!select) return;
    var item = itemById(itemId);
    var identifiers = (state.pro.identifiers || []).filter(function (row) {
      return Number(row.item_id) === itemId;
    });
    var html = '<option value="">Preferred purchase unit</option>';
    identifiers.forEach(function (row) {
      html += '<option value="' + esc(row.id) + '">' +
        esc((row.package_unit || 'package') + ' · ' + num(row.base_quantity || 1, 2) + ' ' + (row.base_unit || 'base') + ' · ' + row.code) +
      '</option>';
    });
    select.innerHTML = html;
    if (item) {
      var cost = line.querySelector('[data-r24-po-cost]');
      if (cost && Number(cost.value || 0) === 0) cost.value = String(item.purchase_unit_cost || 0);
    }
  }

  function openPoEditor(seedLines) {
    var host = workspace.querySelector('[data-r24-po-editor]');
    if (!host) return;
    seedLines = Array.isArray(seedLines) && seedLines.length ? seedLines : [{}];

    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Purchase order</span><h3>New purchase order</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Supplier<select data-r24-po-supplier>' + supplierOptions(0, false) + '</select></label>' +
        '<label>Expected delivery<input type="date" data-r24-po-expected></label>' +
        '<label class="is-wide">Note<input type="text" data-r24-po-note placeholder="Optional note for this order"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-lines" data-r24-po-lines>' + seedLines.map(poLineHtml).join('') + '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-secondary" data-r24-po-add-line>Add line</button>' +
      '<button type="button" class="pmd-inv-r19-primary" data-r24-po-save>Save draft PO</button></div>';

    host.querySelectorAll('[data-r24-po-line]').forEach(refreshPoLinePackages);
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function savePo(host) {
    var supplierId = Number((host.querySelector('[data-r24-po-supplier]') || {}).value || 0);
    if (!supplierId) return toast('Choose a supplier for this purchase order.', true);

    var lines = Array.prototype.slice.call(host.querySelectorAll('[data-r24-po-line]')).map(function (line) {
      var itemId = Number((line.querySelector('[data-r24-po-item]') || {}).value || 0);
      var identifierId = Number((line.querySelector('[data-r24-po-package]') || {}).value || 0);
      var item = itemById(itemId);
      var identifier = identifierById(identifierId);
      return {
        item_id:itemId,
        identifier_id:identifierId,
        quantity:Number((line.querySelector('[data-r24-po-qty]') || {}).value || 0),
        package_unit:identifier ? identifier.package_unit : (item ? item.purchase_unit : 'piece'),
        base_quantity_per_package:identifier ? Number(identifier.base_quantity || 1) : (item ? Number(item.purchase_to_base || 1) : 1),
        unit_cost:Number((line.querySelector('[data-r24-po-cost]') || {}).value || (identifier ? identifier.unit_price : 0) || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.quantity > 0;
    });

    if (!lines.length) return toast('Add at least one item and quantity.', true);

    setBusy(host, true);
    request('onProSavePurchaseOrder', {
      supplier_id:supplierId,
      expected_at:String((host.querySelector('[data-r24-po-expected]') || {}).value || ''),
      note:String((host.querySelector('[data-r24-po-note]') || {}).value || ''),
      currency:String(config.currency || 'EUR'),
      lines:lines
    }).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Purchase order saved as draft.');
    }).catch(function (error) {
      toast(error.message || 'Could not save purchase order.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function openReceiveEditor(order) {
    var host = workspace.querySelector('[data-r24-po-editor]');
    if (!host || !order) return;
    var lines = (order.lines || []).filter(function (line) {
      return Number(line.quantity_received || 0) + 0.00005 < Number(line.quantity_ordered || 0);
    });

    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Receive delivery</span><h3>' + esc(order.order_number) + '</h3><small>' + esc(order.supplier_name || 'Supplier') + '</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields"><label>Put stock in<select data-r24-receive-storage>' + storageOptions(defaultStorageId()) + '</select></label></div>' +
      '<div class="pmd-inv-r24-receive-lines">' + lines.map(function (line) {
        var remaining = Math.max(0, Number(line.quantity_ordered || 0) - Number(line.quantity_received || 0));
        return '<div class="pmd-inv-r24-receive-line" data-r24-receive-line="' + esc(line.id) + '">' +
          '<div><strong>' + esc(line.item_name || line.description || 'Item') + '</strong><small>' + esc(num(remaining,2) + ' ' + (line.package_unit || '') + ' remaining') + '</small></div>' +
          '<label>Receive<input type="number" min="0" max="' + esc(remaining) + '" step="0.01" value="' + esc(remaining) + '" data-r24-receive-qty></label>' +
          '<label>Lot / batch<input type="text" data-r24-receive-lot placeholder="Optional"></label>' +
          '<label>Expiry<input type="date" data-r24-receive-expiry></label>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-receive-save="' + esc(order.id) + '">Confirm received stock</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function receivePo(button) {
    var host = workspace.querySelector('[data-r24-po-editor]');
    if (!host) return;
    var lines = Array.prototype.slice.call(host.querySelectorAll('[data-r24-receive-line]')).map(function (line) {
      return {
        line_id:Number(line.getAttribute('data-r24-receive-line') || 0),
        quantity:Number((line.querySelector('[data-r24-receive-qty]') || {}).value || 0),
        lot_code:String((line.querySelector('[data-r24-receive-lot]') || {}).value || ''),
        expires_at:String((line.querySelector('[data-r24-receive-expiry]') || {}).value || '')
      };
    }).filter(function (line) { return line.quantity > 0; });
    if (!lines.length) return toast('Enter at least one received quantity.', true);

    setBusy(host, true);
    request('onProReceivePurchaseOrder', {
      purchase_order_id:Number(button.getAttribute('data-r24-receive-save') || 0),
      storage_location_id:Number((host.querySelector('[data-r24-receive-storage]') || {}).value || 0),
      lines:lines
    }).then(function (json) {
      applyCoreSnapshot(json);
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Delivery received and stock updated.');
    }).catch(function (error) {
      toast(error.message || 'Could not receive this delivery.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function shoppingSeedLines() {
    return Array.prototype.slice.call(workspace.querySelectorAll('[data-r19-shopping-row]')).map(function (node) {
      var itemId = Number(node.getAttribute('data-r19-shopping-row') || 0);
      var input = node.querySelector('[data-r19-shopping-qty]');
      return {
        item_id:itemId,
        quantity:Number(input && input.value || 0),
        unit_cost:Number((itemById(itemId) || {}).purchase_unit_cost || 0)
      };
    }).filter(function (row) { return row.item_id > 0 && row.quantity > 0; });
  }

  /* ------------------------------------------------------------
     Storage / internal transfer
     ------------------------------------------------------------ */

  function renderStorage() {
    var host = workspace.querySelector('[data-r24-storage-list]');
    var transfer = workspace.querySelector('[data-r24-transfer-editor]');
    var unallocated = workspace.querySelector('[data-r24-unallocated]');
    if (!host || !transfer) return;

    var balancesByLocation = {};
    (state.pro.storage_balances || []).forEach(function (row) {
      var id = Number(row.storage_location_id || 0);
      if (!balancesByLocation[id]) balancesByLocation[id] = [];
      balancesByLocation[id].push(row);
    });

    host.innerHTML = (state.pro.storage_locations || []).map(function (location) {
      var balances = balancesByLocation[Number(location.id)] || [];
      return '<article class="pmd-inv-r24-storage">' +
        '<div class="pmd-inv-r24-card__head"><div><span>' + esc(location.kind || 'Storage') + '</span><h3>' + esc(location.name) + '</h3></div>' +
        (Number(location.is_default || 0) ? '<strong class="pmd-inv-r24-default">Default receiving</strong>' : '') + '</div>' +
        '<div class="pmd-inv-r24-storage__items">' +
          (balances.length ? balances.slice().sort(function (a,b) {
            return String(a.item_name || '').localeCompare(String(b.item_name || ''));
          }).map(function (row) {
            return '<div><strong>' + esc(row.item_name || 'Item') + '</strong><span>' + esc(num(row.qty,2) + ' ' + (row.unit || '')) + '</span></div>';
          }).join('') : '<small>No allocated stock yet.</small>') +
        '</div>' +
      '</article>';
    }).join('');

    var unallocatedRows = state.pro.unallocated_stock || [];
    if (unallocated) {
      var positive = unallocatedRows.filter(function (row) { return Number(row.qty || 0) > 0.00005; });
      unallocated.innerHTML = positive.length
        ? '<span><b>' + esc(positive.length) + '</b> items still have stock not allocated to a room</span>' +
          '<span>New purchases are automatically allocated to the default storage.</span>'
        : '<span><b>✓</b> Current stock is allocated across storage locations.</span>';
    }

    transfer.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Internal transfer</span><h3>Move stock between rooms</h3></div></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Item<select data-r24-transfer-item>' + itemOptions(0) + '</select></label>' +
        '<label>From<select data-r24-transfer-from>' + storageOptions(0) + '</select></label>' +
        '<label>To<select data-r24-transfer-to>' + storageOptions(0) + '</select></label>' +
        '<label>Base quantity<input type="number" min="0.0001" step="0.01" data-r24-transfer-qty></label>' +
        '<label class="is-wide">Note<input type="text" data-r24-transfer-note placeholder="Optional"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-transfer-save>Transfer stock</button></div>';
  }

  function openAllocationEditor() {
    var host = workspace.querySelector('[data-r24-allocation-editor]');
    if (!host) return;
    var unallocated = (state.pro.unallocated_stock || []).filter(function (row) {
      return Number(row.qty || 0) > 0.00005;
    });
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Opening allocation</span><h3>Put existing stock into a room</h3>' +
      '<small>This does not change restaurant-wide stock. It only assigns previously unallocated quantity to a physical storage location.</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Unallocated item<select data-r24-allocation-item><option value="">Choose item</option>' +
          unallocated.map(function (row) {
            return '<option value="' + esc(row.item_id) + '" data-max="' + esc(row.qty) + '">' +
              esc(row.item_name + ' · ' + num(row.qty,2) + ' ' + (row.unit || '')) +
            '</option>';
          }).join('') +
        '</select></label>' +
        '<label>Storage location<select data-r24-allocation-storage>' + storageOptions(defaultStorageId()) + '</select></label>' +
        '<label>Base quantity<input type="number" min="0.0001" step="0.01" data-r24-allocation-qty></label>' +
        '<label class="is-wide">Note<input type="text" data-r24-allocation-note value="Opening storage allocation"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-allocation-save>Allocate stock</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveAllocation() {
    var host = workspace.querySelector('[data-r24-allocation-editor]');
    if (!host) return;
    var itemSelect = host.querySelector('[data-r24-allocation-item]');
    var selected = itemSelect && itemSelect.options[itemSelect.selectedIndex];
    var maxQty = Number(selected && selected.getAttribute('data-max') || 0);
    var payload = {
      item_id:Number(itemSelect && itemSelect.value || 0),
      storage_location_id:Number((host.querySelector('[data-r24-allocation-storage]') || {}).value || 0),
      quantity:Number((host.querySelector('[data-r24-allocation-qty]') || {}).value || 0),
      note:String((host.querySelector('[data-r24-allocation-note]') || {}).value || '')
    };
    if (!payload.item_id || !payload.storage_location_id || !(payload.quantity > 0)) {
      return toast('Choose an unallocated item, storage location and quantity.', true);
    }
    if (maxQty > 0 && payload.quantity > maxQty + 0.00005) {
      return toast('The allocation is larger than the currently unallocated quantity.', true);
    }

    setBusy(host, true);
    request('onProAllocateExistingStock', payload).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Existing stock allocated to storage.');
    }).catch(function (error) {
      toast(error.message || 'Could not allocate existing stock.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function openStorageEditor(row) {
    var host = workspace.querySelector('[data-r24-storage-editor]');
    if (!host) return;
    row = row || {};
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Storage</span><h3>' + esc(row.id ? 'Edit location' : 'Add storage location') + '</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Name<input type="text" data-r24-storage-name value="' + esc(row.name || '') + '" placeholder="Bar, Kitchen, Freezer…"></label>' +
        '<label>Type<select data-r24-storage-kind>' +
          ['storage','kitchen','bar','fridge','freezer','cellar','prep'].map(function (kind) {
            return '<option value="' + kind + '"' + (String(row.kind || 'storage') === kind ? ' selected' : '') + '>' + kind + '</option>';
          }).join('') +
        '</select></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-storage-default' + (Number(row.is_default || 0) ? ' checked' : '') + '><span>Default receiving location</span></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-storage-save data-id="' + esc(row.id || '') + '">Save location</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveStorage(button) {
    var host = workspace.querySelector('[data-r24-storage-editor]');
    if (!host) return;
    var name = String((host.querySelector('[data-r24-storage-name]') || {}).value || '').trim();
    if (!name) return toast('Storage location name is required.', true);

    setBusy(host, true);
    request('onProSaveStorageLocation', {
      storage_location_id:Number(button.getAttribute('data-id') || 0),
      name:name,
      kind:String((host.querySelector('[data-r24-storage-kind]') || {}).value || 'storage'),
      is_default:Boolean((host.querySelector('[data-r24-storage-default]') || {}).checked)
    }).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Storage location saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save storage location.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function saveTransfer(button) {
    var host = workspace.querySelector('[data-r24-transfer-editor]');
    if (!host) return;
    var payload = {
      item_id:Number((host.querySelector('[data-r24-transfer-item]') || {}).value || 0),
      from_storage_location_id:Number((host.querySelector('[data-r24-transfer-from]') || {}).value || 0),
      to_storage_location_id:Number((host.querySelector('[data-r24-transfer-to]') || {}).value || 0),
      quantity:Number((host.querySelector('[data-r24-transfer-qty]') || {}).value || 0),
      note:String((host.querySelector('[data-r24-transfer-note]') || {}).value || '')
    };
    if (!payload.item_id || !payload.from_storage_location_id || !payload.to_storage_location_id || !(payload.quantity > 0)) {
      return toast('Choose the item, source, destination and quantity.', true);
    }

    setBusy(host, true);
    request('onProTransferStock', payload).then(function (json) {
      applySnapshot(json.pro || {});
      toast('Stock transferred.');
    }).catch(function (error) {
      toast(error.message || 'Could not transfer stock.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  /* ------------------------------------------------------------
     Prepared stock / sub-recipes / production
     ------------------------------------------------------------ */

  function prepById(id) {
    id = Number(id || 0);
    return (state.pro.preparations || []).find(function (row) {
      return Number(row.id) === id;
    }) || null;
  }

  function prepIngredientLine(seed) {
    seed = seed || {};
    return '<div class="pmd-inv-r24-prep-line" data-r24-prep-line>' +
      '<label>Ingredient<select data-r24-prep-ingredient>' + itemOptions(seed.item_id) + '</select></label>' +
      '<label>Base qty / batch<input type="number" min="0.0001" step="0.0001" data-r24-prep-qty value="' + esc(seed.qty_per_batch || '') + '"></label>' +
      '<button type="button" class="pmd-inv-r24-line-remove" data-r24-prep-line-remove aria-label="Remove">×</button>' +
    '</div>';
  }

  function renderPrep() {
    var host = workspace.querySelector('[data-r24-prep-list]');
    var history = workspace.querySelector('[data-r24-production-list]');
    if (!host) return;

    var rows = state.pro.preparations || [];
    host.innerHTML = rows.length ? rows.map(function (row) {
      var lines = Array.isArray(row.lines) ? row.lines : [];
      return '<article class="pmd-inv-r24-card">' +
        '<div class="pmd-inv-r24-card__head"><div><span>Prep recipe</span><h3>' + esc(row.name || row.output_item_name || 'Preparation') + '</h3></div>' +
        '<button type="button" class="pmd-inv-r24-icon-btn" data-r24-prep-edit="' + esc(row.id) + '" aria-label="Edit preparation">•••</button></div>' +
        '<dl>' +
          '<div><dt>Output</dt><dd>' + esc(num(row.yield_qty || 0,2) + ' ' + (row.output_unit || '') + ' ' + (row.output_item_name || '')) + '</dd></div>' +
          '<div><dt>Estimated batch cost</dt><dd>' + esc(money(row.estimated_batch_cost || 0)) + '</dd></div>' +
          '<div><dt>Ingredients</dt><dd>' + esc(lines.length) + '</dd></div>' +
          '<div><dt>Output unit cost</dt><dd>' + esc(money(row.estimated_output_unit_cost || 0)) + '</dd></div>' +
        '</dl>' +
        '<div class="pmd-inv-r24-prep-ingredients">' + lines.map(function (line) {
          return '<div><strong>' + esc(line.item_name || 'Ingredient') + '</strong><span>' + esc(num(line.qty_per_batch || 0,2) + ' ' + (line.unit || '')) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-produce="' + esc(row.id) + '">Produce batch</button></div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No prep recipes yet. Create one for sauce, dough, broth, prep mix or any stock item produced from other stock.</div>';

    if (history) {
      var batches = state.pro.production_batches || [];
      history.innerHTML = batches.length ? batches.map(function (row) {
        return '<article class="pmd-inv-r24-row">' +
          '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">Produced</span><strong>' + esc(row.preparation_name || row.output_item_name || 'Prep batch') + '</strong>' +
          '<small>' + esc((row.staff_name || 'Staff') + ' · ' + dateTimeLabel(row.produced_at) + (row.lot_code ? ' · lot ' + row.lot_code : '')) + '</small></div>' +
          '<div class="pmd-inv-r24-row__meta"><span>' + esc(row.output_storage_name || 'Storage') + '</span><strong>' + esc(num(row.output_qty || 0,2) + ' ' + (row.output_unit || '')) + '</strong>' +
          '<small>' + esc(money(Number(row.output_qty || 0) * Number(row.unit_cost || 0))) + ' batch value</small></div>' +
        '</article>';
      }).join('') : '<div class="pmd-inv-r19-empty">No preparation batches have been produced yet.</div>';
    }
  }

  function openPrepEditor(row) {
    var host = workspace.querySelector('[data-r24-prep-editor]');
    if (!host) return;
    row = row || {};
    var lines = Array.isArray(row.lines) && row.lines.length ? row.lines : [{}];
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Prep recipe</span><h3>' + esc(row.id ? 'Edit preparation' : 'Add preparation') + '</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label class="is-wide">Name<input type="text" data-r24-prep-name value="' + esc(row.name || '') + '" placeholder="Tomato sauce, pizza dough…"></label>' +
        '<label>Prepared stock item<select data-r24-prep-output>' + itemOptions(row.output_item_id) + '</select></label>' +
        '<label>Yield in output base unit<input type="number" min="0.0001" step="0.0001" data-r24-prep-yield value="' + esc(row.yield_qty || 1) + '"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-lines" data-r24-prep-lines>' + lines.map(prepIngredientLine).join('') + '</div>' +
      '<div class="pmd-inv-r24-editor__actions">' +
        (row.id ? '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-prep-archive="' + esc(row.id) + '">Archive</button>' : '') +
        '<button type="button" class="pmd-inv-r19-secondary" data-r24-prep-add-line>Add ingredient</button>' +
        '<button type="button" class="pmd-inv-r19-primary" data-r24-prep-save data-id="' + esc(row.id || '') + '">Save preparation</button>' +
      '</div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function savePrep(button) {
    var host = workspace.querySelector('[data-r24-prep-editor]');
    if (!host) return;
    var outputItemId = Number((host.querySelector('[data-r24-prep-output]') || {}).value || 0);
    var yieldQty = Number((host.querySelector('[data-r24-prep-yield]') || {}).value || 0);
    var lines = Array.prototype.slice.call(host.querySelectorAll('[data-r24-prep-line]')).map(function (line) {
      return {
        item_id:Number((line.querySelector('[data-r24-prep-ingredient]') || {}).value || 0),
        qty_per_batch:Number((line.querySelector('[data-r24-prep-qty]') || {}).value || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.qty_per_batch > 0;
    });
    if (!outputItemId || !(yieldQty > 0) || !lines.length) {
      return toast('Choose the prepared stock item, yield and at least one ingredient.', true);
    }

    setBusy(host, true);
    request('onProSavePreparation', {
      preparation_id:Number(button.getAttribute('data-id') || 0),
      name:String((host.querySelector('[data-r24-prep-name]') || {}).value || ''),
      output_item_id:outputItemId,
      yield_qty:yieldQty,
      lines:lines
    }).then(function (json) {
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Preparation recipe saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save preparation recipe.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function openProduceEditor(prep) {
    var host = workspace.querySelector('[data-r24-produce-editor]');
    if (!host || !prep) return;
    var defaultStorage = defaultStorageId();
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Production batch</span><h3>' + esc(prep.name || prep.output_item_name || 'Preparation') + '</h3>' +
      '<small>Ingredients leave the source storage and ' + esc(prep.output_item_name || 'prepared stock') + ' enters the output storage.</small></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Batch count<input type="number" min="0.0001" step="0.25" value="1" data-r24-produce-count></label>' +
        '<label>Actual output · ' + esc(prep.output_unit || 'base unit') + '<input type="number" min="0.0001" step="0.01" value="' + esc(prep.yield_qty || 1) + '" data-r24-produce-output></label>' +
        '<label>Take ingredients from<select data-r24-produce-source>' + storageOptions(defaultStorage) + '</select></label>' +
        '<label>Put prepared stock in<select data-r24-produce-destination>' + storageOptions(defaultStorage) + '</select></label>' +
        '<label>Lot / batch code<input type="text" data-r24-produce-lot placeholder="Optional"></label>' +
        '<label>Expiry<input type="date" data-r24-produce-expiry></label>' +
        '<label class="is-wide">Note<input type="text" data-r24-produce-note placeholder="Optional production note"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-produce-save="' + esc(prep.id) + '">Record production</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveProduction(button) {
    var host = workspace.querySelector('[data-r24-produce-editor]');
    if (!host) return;
    var payload = {
      preparation_id:Number(button.getAttribute('data-r24-produce-save') || 0),
      batch_count:Number((host.querySelector('[data-r24-produce-count]') || {}).value || 0),
      output_qty:Number((host.querySelector('[data-r24-produce-output]') || {}).value || 0),
      source_storage_location_id:Number((host.querySelector('[data-r24-produce-source]') || {}).value || 0),
      output_storage_location_id:Number((host.querySelector('[data-r24-produce-destination]') || {}).value || 0),
      lot_code:String((host.querySelector('[data-r24-produce-lot]') || {}).value || ''),
      expires_at:String((host.querySelector('[data-r24-produce-expiry]') || {}).value || ''),
      note:String((host.querySelector('[data-r24-produce-note]') || {}).value || '')
    };
    if (!payload.preparation_id || !(payload.batch_count > 0) || !(payload.output_qty > 0)) {
      return toast('Enter a valid batch count and actual output.', true);
    }

    setBusy(host, true);
    request('onProProducePreparation', payload).then(function (json) {
      applyCoreSnapshot(json);
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Preparation batch produced and inventory updated.');
    }).catch(function (error) {
      toast(error.message || 'Could not record production.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  /* ------------------------------------------------------------
     Lots / expiry
     ------------------------------------------------------------ */

  function renderExpiry() {
    var summary = workspace.querySelector('[data-r24-expiry-summary]');
    var host = workspace.querySelector('[data-r24-lot-list]');
    if (!host) return;

    var alerts = state.pro.alerts || {};
    if (summary) {
      summary.innerHTML =
        '<span><b>' + esc(alerts.expired_count || 0) + '</b> expired lots with theoretical stock</span>' +
        '<span><b>' + esc(alerts.expiring_count || 0) + '</b> expired / near expiry</span>' +
        '<span>FEFO estimate uses current restaurant stock and received lot history.</span>';
    }

    var rows = (state.pro.lots || []).filter(function (row) {
      return Number(row.estimated_remaining || 0) > 0.00005 || row.expires_at;
    });

    host.innerHTML = rows.length ? rows.map(function (row) {
      var status = String(row.expiry_status || 'none');
      return '<article class="pmd-inv-r24-row is-expiry-' + esc(status) + '">' +
        '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">' + esc(status === 'expired' ? 'Expired' : (status === 'soon' ? 'Use soon' : 'Lot')) + '</span>' +
          '<strong>' + esc(row.item_name || 'Item') + '</strong>' +
          '<small>' + esc((row.lot_code ? 'Lot ' + row.lot_code + ' · ' : '') + (row.storage_name || 'Storage') + (row.supplier_name ? ' · ' + row.supplier_name : '')) + '</small></div>' +
        '<div class="pmd-inv-r24-row__meta"><span>Expiry ' + esc(dateLabel(row.expires_at)) + '</span>' +
          '<strong>' + esc(num(row.estimated_remaining || 0, 2) + ' ' + (row.unit || '')) + '</strong>' +
          '<small>Received ' + esc(num(row.qty_received || 0, 2) + ' ' + (row.unit || '')) + '</small></div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No received lots with expiry information yet. Add lot and expiry while receiving a purchase order.</div>';
  }

  /* ------------------------------------------------------------
     Ledger / adjustment / export
     ------------------------------------------------------------ */

  function renderLedger() {
    var host = workspace.querySelector('[data-r24-ledger-list]');
    var receiptHost = workspace.querySelector('[data-r24-receipt-list]');
    if (!host) return;

    if (receiptHost) {
      var receipts = state.pro.purchase_receipts || [];
      receiptHost.innerHTML = receipts.length ? receipts.map(function (row) {
        var reversed = Boolean(row.reversed_at);
        return '<article class="pmd-inv-r24-row' + (reversed ? ' is-reversed' : '') + '">' +
          '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">' + esc(reversed ? 'Reversed' : (row.source || 'Purchase')) + '</span>' +
            '<strong>' + esc(row.supplier_name || 'Supplier purchase') + '</strong>' +
            '<small>' + esc((row.invoice_number ? 'Invoice ' + row.invoice_number + ' · ' : '') + dateLabel(row.purchased_at) + (row.staff_name ? ' · ' + row.staff_name : '')) + '</small></div>' +
          '<div class="pmd-inv-r24-row__meta"><span>' + esc(reversed ? 'Reversed ' + dateTimeLabel(row.reversed_at) : 'Confirmed ' + dateTimeLabel(row.confirmed_at)) + '</span>' +
            '<strong>' + esc(money(row.total_amount || 0)) + '</strong></div>' +
          '<div class="pmd-inv-r24-row__actions">' +
            (!reversed ? '<button type="button" class="pmd-inv-r19-secondary is-danger" data-r24-receipt-reverse="' + esc(row.id) + '">Reverse</button>' : '') +
          '</div>' +
        '</article>';
      }).join('') : '<div class="pmd-inv-r19-empty">No confirmed purchase receipts yet.</div>';
    }

    var q = String(state.ledgerSearch || '').trim().toLowerCase();
    var rows = (state.pro.ledger || []).filter(function (row) {
      if (!q) return true;
      return [
        row.item_name,row.movement_type,row.reason,row.note,row.staff_name,row.reference_type
      ].join(' ').toLowerCase().indexOf(q) !== -1;
    });

    host.innerHTML = rows.length ? rows.map(function (row) {
      var qty = Number(row.qty_delta || 0);
      return '<article class="pmd-inv-r24-row">' +
        '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">' + esc(row.movement_type || 'MOVEMENT') + '</span>' +
          '<strong>' + esc(row.item_name || 'Item') + '</strong>' +
          '<small>' + esc([row.reason,row.note,row.staff_name].filter(Boolean).join(' · ') || 'Inventory movement') + '</small></div>' +
        '<div class="pmd-inv-r24-row__meta"><span>' + esc(dateTimeLabel(row.occurred_at)) + '</span>' +
          '<strong class="' + (qty < 0 ? 'is-negative' : 'is-positive') + '">' + (qty > 0 ? '+' : '') + esc(num(qty,2) + ' ' + (row.unit || '')) + '</strong>' +
          '<small>' + esc(money(row.value || 0)) + '</small></div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No ledger movements match this search.</div>';
  }

  function openAdjustmentEditor() {
    var host = workspace.querySelector('[data-r24-adjustment-editor]');
    if (!host) return;
    host.hidden = false;
    host.innerHTML =
      '<div class="pmd-inv-r24-editor__head"><div><span>Audited correction</span><h3>Adjustment / supplier return</h3></div>' +
      '<button type="button" class="pmd-inv-r19-secondary" data-r24-editor-close>Close</button></div>' +
      '<div class="pmd-inv-r24-fields">' +
        '<label>Type<select data-r24-adjust-kind><option value="adjustment">Adjustment</option><option value="return_supplier">Return to supplier</option></select></label>' +
        '<label>Item<select data-r24-adjust-item>' + itemOptions(0) + '</select></label>' +
        '<label>Base quantity<input type="number" step="0.01" data-r24-adjust-qty placeholder="Use negative to reduce"></label>' +
        '<label>Storage<select data-r24-adjust-storage>' + storageOptions(defaultStorageId()) + '</select></label>' +
        '<label>Reason<input type="text" data-r24-adjust-reason placeholder="Required operational reason"></label>' +
        '<label class="is-wide">Note<input type="text" data-r24-adjust-note placeholder="Optional detail"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-adjust-save>Record movement</button></div>';
    host.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function saveAdjustment(button) {
    var host = workspace.querySelector('[data-r24-adjustment-editor]');
    if (!host) return;
    var payload = {
      kind:String((host.querySelector('[data-r24-adjust-kind]') || {}).value || 'adjustment'),
      item_id:Number((host.querySelector('[data-r24-adjust-item]') || {}).value || 0),
      quantity:Number((host.querySelector('[data-r24-adjust-qty]') || {}).value || 0),
      storage_location_id:Number((host.querySelector('[data-r24-adjust-storage]') || {}).value || 0),
      reason:String((host.querySelector('[data-r24-adjust-reason]') || {}).value || ''),
      note:String((host.querySelector('[data-r24-adjust-note]') || {}).value || '')
    };
    if (!payload.item_id || !payload.quantity || !payload.reason.trim()) {
      return toast('Choose an item, quantity and operational reason.', true);
    }

    setBusy(host, true);
    request('onProRecordAdjustment', payload).then(function (json) {
      applyCoreSnapshot(json);
      applySnapshot(json.pro || {});
      host.hidden = true;
      toast('Inventory movement recorded.');
    }).catch(function (error) {
      toast(error.message || 'Could not record the adjustment.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  function csvCell(value) {
    value = String(value == null ? '' : value);
    return '"' + value.replace(/"/g, '""') + '"';
  }

  function exportLedgerCsv() {
    var rows = state.pro.ledger || [];
    if (!rows.length) return toast('There is no ledger data to export.', true);
    var lines = [
      ['Date','Item','Type','Quantity','Unit','Unit cost','Value','Reason','Note','Staff','Reference'].map(csvCell).join(',')
    ];
    rows.forEach(function (row) {
      lines.push([
        row.occurred_at,row.item_name,row.movement_type,row.qty_delta,row.unit,row.unit_cost,row.value,
        row.reason,row.note,row.staff_name,
        [row.reference_type,row.reference_id].filter(Boolean).join('#')
      ].map(csvCell).join(','));
    });
    var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'paymydine-inventory-ledger-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ------------------------------------------------------------
     Analytics / reporting
     ------------------------------------------------------------ */

  function renderAnalytics() {
    var snap = api.getSnapshot ? (api.getSnapshot() || {}) : {};
    var summary = snap.summary || {};
    var metrics = workspace.querySelector('[data-r24-analytics-metrics]');
    var wasteHost = workspace.querySelector('[data-r24-analytics-waste]');
    var varianceHost = workspace.querySelector('[data-r24-analytics-variance]');
    var priceHost = workspace.querySelector('[data-r24-analytics-prices]');

    if (metrics) {
      metrics.innerHTML =
        '<article><span>Stock value</span><strong>' + esc(money(summary.estimated_stock_value || 0)) + '</strong><small>Current theoretical on-hand value</small></article>' +
        '<article><span>Purchases · 30d</span><strong>' + esc(money(summary.purchases_cost_30d || 0)) + '</strong><small>Recorded incoming stock</small></article>' +
        '<article><span>Waste · 30d</span><strong>' + esc(money(summary.waste_cost_30d || 0)) + '</strong><small>Recorded waste movements</small></article>' +
        '<article><span>Latest unexplained variance</span><strong>' + esc(money(summary.unexplained_loss_value || 0)) + '</strong><small>Physical count difference to review</small></article>' +
        '<article><span>Recipe coverage</span><strong>' + esc(num(summary.recipe_coverage_pct || 0, 1)) + '%</strong><small>Menu items with stock recipes</small></article>' +
        '<article><span>Open purchase orders</span><strong>' + esc((state.pro.alerts || {}).open_purchase_orders || 0) + '</strong><small>Draft, sent or partially received</small></article>';
    }

    if (wasteHost) {
      var wasteByItem = {};
      (state.pro.ledger || []).forEach(function (row) {
        if (String(row.movement_type || '').toUpperCase() !== 'WASTE') return;
        var key = Number(row.item_id || 0);
        if (!wasteByItem[key]) {
          wasteByItem[key] = {
            item_name:String(row.item_name || 'Item'),
            qty:0,
            value:0,
            unit:String(row.unit || '')
          };
        }
        wasteByItem[key].qty += Math.abs(Number(row.qty_delta || 0));
        wasteByItem[key].value += Math.abs(Number(row.value || 0));
      });
      var wasteRows = Object.keys(wasteByItem).map(function (key) {
        return wasteByItem[key];
      }).sort(function (a,b) { return b.value - a.value; }).slice(0,12);

      wasteHost.innerHTML = wasteRows.length ? wasteRows.map(function (row) {
        return '<article class="pmd-inv-r24-row">' +
          '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">Waste</span><strong>' + esc(row.item_name) + '</strong>' +
          '<small>' + esc(num(row.qty,2) + ' ' + row.unit + ' in loaded ledger history') + '</small></div>' +
          '<div class="pmd-inv-r24-row__meta"><span>Recorded value</span><strong class="is-negative">' + esc(money(row.value)) + '</strong></div>' +
        '</article>';
      }).join('') : '<div class="pmd-inv-r19-empty">No waste movements in the loaded ledger history.</div>';
    }

    if (varianceHost) {
      var varianceRows = items().filter(function (row) {
        return Math.abs(Number(row.last_variance_qty || 0)) > 0.00005;
      }).sort(function (a,b) {
        return Math.abs(Number(b.last_variance_cost || 0)) - Math.abs(Number(a.last_variance_cost || 0));
      }).slice(0,12);

      varianceHost.innerHTML = varianceRows.length ? varianceRows.map(function (row) {
        var qty = Number(row.last_variance_qty || 0);
        var cost = Number(row.last_variance_cost || 0);
        return '<article class="pmd-inv-r24-row">' +
          '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">Count variance</span><strong>' + esc(row.name || 'Item') + '</strong>' +
          '<small>' + (qty > 0 ? '+' : '') + esc(num(qty,2) + ' ' + (row.unit || '')) + '</small></div>' +
          '<div class="pmd-inv-r24-row__meta"><span>Latest variance value</span><strong class="' + (cost < 0 ? 'is-negative' : 'is-positive') + '">' + esc(money(cost)) + '</strong></div>' +
        '</article>';
      }).join('') : '<div class="pmd-inv-r19-empty">No physical-count variance is currently recorded.</div>';
    }

    if (priceHost) {
      var history = (state.pro.price_history || []).slice(0,40);
      priceHost.innerHTML = history.length ? history.map(function (row, index) {
        var previous = null;
        for (var i = index + 1; i < history.length; i += 1) {
          if (
            Number(history[i].item_id) === Number(row.item_id)
            && Number(history[i].supplier_id || 0) === Number(row.supplier_id || 0)
          ) {
            previous = history[i];
            break;
          }
        }
        var change = previous && Number(previous.unit_cost || 0) > 0
          ? ((Number(row.unit_cost || 0) - Number(previous.unit_cost || 0)) / Number(previous.unit_cost || 0)) * 100
          : null;
        return '<article class="pmd-inv-r24-row">' +
          '<div class="pmd-inv-r24-row__main"><span class="pmd-inv-r24-status">Price</span><strong>' + esc(row.item_name || 'Item') + '</strong>' +
          '<small>' + esc((row.supplier_name || 'Supplier') + ' · ' + (row.purchase_unit || 'unit') + ' · ' + dateLabel(row.recorded_at)) + '</small></div>' +
          '<div class="pmd-inv-r24-row__meta"><span>Package cost</span><strong>' + esc(money(row.unit_cost || 0, row.currency)) + '</strong>' +
          '<small>' + (change === null ? 'No previous comparable price' : esc((change > 0 ? '+' : '') + num(change,1) + '% change')) + '</small></div>' +
        '</article>';
      }).join('') : '<div class="pmd-inv-r19-empty">Price analytics appear after purchase history is recorded.</div>';
    }
  }

  function exportInventorySnapshotCsv() {
    var snap = api.getSnapshot ? (api.getSnapshot() || {}) : {};
    var rows = Array.isArray(snap.items) ? snap.items : [];
    if (!rows.length) return toast('There is no stock snapshot to export.', true);

    var lines = [[
      'Item','Category','On hand','Base unit','Purchase unit','Purchase factor',
      'Unit cost','Stock value','Daily usage','Days left','Reorder point','Par',
      'Status','Supplier','Latest variance qty','Latest variance value'
    ].map(csvCell).join(',')];

    rows.forEach(function (row) {
      lines.push([
        row.name,row.category,row.estimated_on_hand,row.unit,row.purchase_unit,row.purchase_to_base,
        row.unit_cost,row.stock_value,row.avg_daily_usage,row.days_left,row.reorder_point,row.par_level,
        row.status,row.supplier_name,row.last_variance_qty,row.last_variance_cost
      ].map(csvCell).join(','));
    });

    var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'paymydine-inventory-snapshot-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ------------------------------------------------------------
     Settings / health
     ------------------------------------------------------------ */

  function renderSettings() {
    var host = workspace.querySelector('[data-r24-settings-form]');
    var health = workspace.querySelector('[data-r24-system-health]');
    if (!host) return;
    var settings = state.pro.settings || {};
    host.innerHTML =
      '<div class="pmd-inv-r24-fields">' +
        '<label>Recipe consumption event<select data-r24-setting-consumption>' +
          '<option value="paid"' + (settings.consumption_event === 'paid' ? ' selected' : '') + '>Fully paid</option>' +
          '<option value="accepted"' + (settings.consumption_event === 'accepted' ? ' selected' : '') + '>Accepted / processing</option>' +
          '<option value="completed"' + (settings.consumption_event === 'completed' ? ' selected' : '') + '>Completed</option>' +
        '</select><small>Choose when recipe ingredients begin reducing theoretical stock.</small></label>' +
        '<label>Expiry warning · days<input type="number" min="1" max="90" step="1" data-r24-setting-expiry value="' + esc(settings.expiry_alert_days || 5) + '"></label>' +
        '<label>Safety stock · days<input type="number" min="0" max="30" step="0.25" data-r24-setting-safety value="' + esc(settings.safety_stock_days == null ? 1.5 : settings.safety_stock_days) + '"></label>' +
        '<label>Stock costing<select data-r24-setting-costing>' +
          '<option value="last_purchase"' + (settings.costing_method === 'last_purchase' || !settings.costing_method ? ' selected' : '') + '>Last purchase cost</option>' +
          '<option value="weighted_average"' + (settings.costing_method === 'weighted_average' ? ' selected' : '') + '>Weighted average</option>' +
        '</select><small>Movement history keeps the actual purchase price either way.</small></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-setting-blind' + (Number(settings.blind_counts || 0) ? ' checked' : '') + '><span>Blind physical counts</span></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-setting-negative' + (Number(settings.allow_negative_stock || 0) ? ' checked' : '') + '><span>Allow negative room allocations</span></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-editor__actions"><button type="button" class="pmd-inv-r19-primary" data-r24-settings-save>Save inventory policy</button></div>';

    if (health) {
      var alerts = state.pro.alerts || {};
      health.innerHTML =
        '<article><strong>Product codes</strong><span>' + esc((state.pro.identifiers || []).length) + ' package identifiers</span></article>' +
        '<article><strong>Supplier master</strong><span>' + esc((state.pro.suppliers || []).length) + ' active suppliers</span></article>' +
        '<article><strong>Storage allocation</strong><span>' + esc(alerts.unallocated_items || 0) + ' items with unallocated quantity</span></article>' +
        '<article><strong>Expiry</strong><span>' + esc(alerts.expiring_count || 0) + ' lots need attention</span></article>' +
        '<article><strong>Purchase orders</strong><span>' + esc(alerts.open_purchase_orders || 0) + ' open orders</span></article>' +
        '<article><strong>Duplicate invoice guard</strong><span>SHA-256 document fingerprint + supplier invoice number</span></article>';
    }
  }

  function saveSettings(host) {
    setBusy(host, true);
    request('onProSaveSettings', {
      consumption_event:String((host.querySelector('[data-r24-setting-consumption]') || {}).value || 'paid'),
      expiry_alert_days:Number((host.querySelector('[data-r24-setting-expiry]') || {}).value || 5),
      safety_stock_days:Number((host.querySelector('[data-r24-setting-safety]') || {}).value || 1.5),
      costing_method:String((host.querySelector('[data-r24-setting-costing]') || {}).value || 'last_purchase'),
      blind_counts:Boolean((host.querySelector('[data-r24-setting-blind]') || {}).checked),
      allow_negative_stock:Boolean((host.querySelector('[data-r24-setting-negative]') || {}).checked)
    }).then(function (json) {
      applySnapshot(json.pro || {});
      toast('Inventory policy saved.');
      if (api.refresh) api.refresh().catch(function () {});
    }).catch(function (error) {
      toast(error.message || 'Could not save inventory policy.', true);
    }).finally(function () {
      setBusy(host, false);
    });
  }

  /* ------------------------------------------------------------
     Camera scanning
     ------------------------------------------------------------ */

  function stopCamera() {
    if (state.cameraTimer) {
      window.clearTimeout(state.cameraTimer);
      state.cameraTimer = 0;
    }
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(function (track) { track.stop(); });
      state.cameraStream = null;
    }
    var video = workspace.querySelector('[data-r24-camera-video]');
    if (video) {
      try { video.pause(); } catch (ignore) {}
      video.srcObject = null;
    }
    var wrap = workspace.querySelector('[data-r24-camera-wrap]');
    var start = workspace.querySelector('[data-r24-camera-start]');
    var stop = workspace.querySelector('[data-r24-camera-stop]');
    if (wrap) wrap.hidden = true;
    if (start) start.hidden = false;
    if (stop) stop.hidden = true;
  }

  function feedScannedCode(code) {
    code = normalizeCode(code);
    if (!code) return;
    var input = workspace.querySelector('[data-r19-barcode-input]');
    if (!input) return;
    input.value = code;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key:'Enter',
      code:'Enter',
      bubbles:true,
      cancelable:true
    }));
  }

  function cameraLoop() {
    if (!state.cameraStream || !state.detector) return;
    var video = workspace.querySelector('[data-r24-camera-video]');
    if (!video || video.readyState < 2) {
      state.cameraTimer = window.setTimeout(cameraLoop, 350);
      return;
    }
    state.detector.detect(video).then(function (results) {
      if (results && results.length && results[0].rawValue) {
        feedScannedCode(results[0].rawValue);
        stopCamera();
        toast('Code captured from camera.');
        return;
      }
      state.cameraTimer = window.setTimeout(cameraLoop, 350);
    }).catch(function () {
      state.cameraTimer = window.setTimeout(cameraLoop, 600);
    });
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return toast('Camera access is not available in this browser. Use the USB/Bluetooth scanner input instead.', true);
    }
    if (typeof window.BarcodeDetector !== 'function') {
      return toast('This browser does not provide BarcodeDetector. Use a keyboard-mode scanner, or a supported Chrome/Android device.', true);
    }

    var formats = ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code','data_matrix','itf'];
    try {
      state.detector = new window.BarcodeDetector({formats:formats});
    } catch (error) {
      state.detector = new window.BarcodeDetector();
    }

    navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'}},
      audio:false
    }).then(function (stream) {
      state.cameraStream = stream;
      var video = workspace.querySelector('[data-r24-camera-video]');
      var wrap = workspace.querySelector('[data-r24-camera-wrap]');
      var start = workspace.querySelector('[data-r24-camera-start]');
      var stop = workspace.querySelector('[data-r24-camera-stop]');
      if (video) {
        video.srcObject = stream;
        video.play().catch(function () {});
      }
      if (wrap) wrap.hidden = false;
      if (start) start.hidden = true;
      if (stop) stop.hidden = false;
      cameraLoop();
    }).catch(function (error) {
      toast(error.message || 'Camera permission was not granted.', true);
    });
  }

  /* ------------------------------------------------------------
     Event wiring
     ------------------------------------------------------------ */

  workspace.addEventListener('pmd:inventory-mode', function (event) {
    state.mode = String(event.detail && event.detail.mode || 'overview');
    if (proMode(state.mode)) {
      load(false).then(renderCurrent).catch(function () {});
    } else if (state.mode !== 'purchases') {
      stopCamera();
    }
  });

  root.addEventListener('pmd:inventory-snapshot', function () {
    if (!state.loaded) return;
    window.clearTimeout(root._r24RefreshTimer);
    root._r24RefreshTimer = window.setTimeout(function () {
      load(true).catch(function () {});
    }, 220);
  });

  workspace.addEventListener('input', function (event) {
    if (event.target.matches('[data-r24-ledger-search]')) {
      state.ledgerSearch = String(event.target.value || '');
      renderLedger();
    }
  });

  workspace.addEventListener('change', function (event) {
    if (event.target.matches('[data-r24-po-item]')) {
      refreshPoLinePackages(event.target.closest('[data-r24-po-line]'));
      return;
    }
    if (event.target.matches('[data-r24-allocation-item]')) {
      var allocationHost = workspace.querySelector('[data-r24-allocation-editor]');
      var allocationQty = allocationHost && allocationHost.querySelector('[data-r24-allocation-qty]');
      var opt = event.target.options[event.target.selectedIndex];
      if (allocationQty && opt) allocationQty.value = String(opt.getAttribute('data-max') || '');
      return;
    }

    if (event.target.matches('[data-r24-po-package]')) {
      var line = event.target.closest('[data-r24-po-line]');
      var identifier = identifierById(event.target.value);
      var cost = line && line.querySelector('[data-r24-po-cost]');
      if (identifier && cost) cost.value = String(identifier.unit_price || 0);
    }
  });

  workspace.addEventListener('click', function (event) {
    var target = event.target;

    if (target.closest('[data-r24-editor-close]')) {
      var editor = target.closest('.pmd-inv-r24-editor');
      if (editor) editor.hidden = true;
      return;
    }

    if (target.closest('[data-r24-supplier-new]')) { openSupplierEditor(null); return; }
    var supplierEdit = target.closest('[data-r24-supplier-edit]');
    if (supplierEdit) { openSupplierEditor(supplierById(supplierEdit.getAttribute('data-r24-supplier-edit'))); return; }
    var supplierSave = target.closest('[data-r24-supplier-save]');
    if (supplierSave) { saveSupplier(supplierSave); return; }
    var supplierArchive = target.closest('[data-r24-supplier-archive]');
    if (supplierArchive) {
      if (!window.confirm('Archive this supplier? Historical purchases stay intact.')) return;
      request('onProArchiveSupplier', {supplier_id:Number(supplierArchive.getAttribute('data-r24-supplier-archive') || 0)})
        .then(function (json) { applySnapshot(json.pro || {}); toast('Supplier archived.'); })
        .catch(function (error) { toast(error.message || 'Could not archive supplier.', true); });
      return;
    }

    var reconcileRun = target.closest('[data-r24-reconcile-run]');
    if (reconcileRun) {
      var zone = reconcileRun.closest('[data-r24-reconcile-zone]');
      var select = zone && zone.querySelector('[data-r24-reconcile-po]');
      var poId = Number(select && select.value || 0);
      var receiptId = Number(reconcileRun.getAttribute('data-r24-reconcile-run') || 0);
      if (!poId) return toast('Choose a purchase order to compare.', true);

      reconcileRun.disabled = true;
      request('onProReconcileReceipt', {
        receipt_id:receiptId,
        purchase_order_id:poId
      }).then(function (json) {
        applySnapshot(json.pro || {});
        renderReconciliation(zone, json.reconciliation || {});
        toast((json.reconciliation && json.reconciliation.summary && json.reconciliation.summary.clean_match)
          ? 'Invoice matches the purchase order.'
          : 'Invoice comparison completed. Review the highlighted differences.');
      }).catch(function (error) {
        toast(error.message || 'Could not compare this invoice to the purchase order.', true);
      }).finally(function () {
        reconcileRun.disabled = false;
      });
      return;
    }

    if (target.closest('[data-r24-supplier-product-new]')) { openSupplierProductEditor(null); return; }
    var supplierProductEdit = target.closest('[data-r24-supplier-product-edit]');
    if (supplierProductEdit) {
      openSupplierProductEditor(supplierItemById(supplierProductEdit.getAttribute('data-r24-supplier-product-edit')));
      return;
    }
    var supplierProductSave = target.closest('[data-r24-supplier-product-save]');
    if (supplierProductSave) { saveSupplierProduct(supplierProductSave); return; }
    var supplierProductArchive = target.closest('[data-r24-supplier-product-archive]');
    if (supplierProductArchive) {
      if (!window.confirm('Remove this supplier product mapping? Historical purchase and price records stay intact.')) return;
      request('onProArchiveSupplierItem', {
        supplier_item_id:Number(supplierProductArchive.getAttribute('data-r24-supplier-product-archive') || 0)
      }).then(function (json) {
        applyCoreSnapshot(json);
        applySnapshot(json.pro || {});
        toast('Supplier product removed.');
      }).catch(function (error) {
        toast(error.message || 'Could not remove supplier product.', true);
      });
      return;
    }

    if (target.closest('[data-r24-code-new]')) { openCodeEditor(null, ''); return; }
    var codeEdit = target.closest('[data-r24-code-edit]');
    if (codeEdit) { openCodeEditor(identifierById(codeEdit.getAttribute('data-r24-code-edit')), ''); return; }
    var codeSave = target.closest('[data-r24-code-save]');
    if (codeSave) { saveCode(codeSave); return; }
    var codeArchive = target.closest('[data-r24-code-archive]');
    if (codeArchive) {
      if (!window.confirm('Remove this package code mapping?')) return;
      request('onProArchiveIdentifier', {identifier_id:Number(codeArchive.getAttribute('data-r24-code-archive') || 0)})
        .then(function (json) { applySnapshot(json.pro || {}); toast('Package code removed.'); })
        .catch(function (error) { toast(error.message || 'Could not remove package code.', true); });
      return;
    }

    if (target.closest('[data-r24-po-new]')) { openPoEditor([]); return; }
    if (target.closest('[data-r24-po-add-line]')) {
      var linesHost = workspace.querySelector('[data-r24-po-lines]');
      if (linesHost) {
        linesHost.insertAdjacentHTML('beforeend', poLineHtml({}));
        refreshPoLinePackages(linesHost.lastElementChild);
      }
      return;
    }
    var poRemove = target.closest('[data-r24-po-line-remove]');
    if (poRemove) {
      var poLine = poRemove.closest('[data-r24-po-line]');
      if (poLine) poLine.remove();
      return;
    }
    if (target.closest('[data-r24-po-save]')) {
      var poEditor = workspace.querySelector('[data-r24-po-editor]');
      if (poEditor) savePo(poEditor);
      return;
    }
    var poSend = target.closest('[data-r24-po-send]');
    if (poSend) {
      request('onProSetPurchaseOrderStatus', {
        purchase_order_id:Number(poSend.getAttribute('data-r24-po-send') || 0),
        status:'sent'
      }).then(function (json) { applySnapshot(json.pro || {}); toast('Purchase order marked sent.'); })
        .catch(function (error) { toast(error.message || 'Could not update purchase order.', true); });
      return;
    }
    var poCancel = target.closest('[data-r24-po-cancel]');
    if (poCancel) {
      if (!window.confirm('Cancel this purchase order?')) return;
      request('onProSetPurchaseOrderStatus', {
        purchase_order_id:Number(poCancel.getAttribute('data-r24-po-cancel') || 0),
        status:'cancelled'
      }).then(function (json) { applySnapshot(json.pro || {}); toast('Purchase order cancelled.'); })
        .catch(function (error) { toast(error.message || 'Could not cancel purchase order.', true); });
      return;
    }
    var poReceive = target.closest('[data-r24-po-receive]');
    if (poReceive) {
      var order = (state.pro.purchase_orders || []).find(function (row) {
        return Number(row.id) === Number(poReceive.getAttribute('data-r24-po-receive'));
      });
      openReceiveEditor(order);
      return;
    }
    var receiveSave = target.closest('[data-r24-receive-save]');
    if (receiveSave) { receivePo(receiveSave); return; }

    if (target.closest('[data-r24-shopping-po]')) {
      if (window.PMDInventoryWorkspaceR19 && window.PMDInventoryWorkspaceR19.setMode) {
        window.PMDInventoryWorkspaceR19.setMode('orders');
      }
      load(false).then(function () {
        openPoEditor(shoppingSeedLines());
      }).catch(function () {});
      return;
    }

    if (target.closest('[data-r24-prep-new]')) { openPrepEditor(null); return; }
    var prepEdit = target.closest('[data-r24-prep-edit]');
    if (prepEdit) {
      openPrepEditor(prepById(prepEdit.getAttribute('data-r24-prep-edit')));
      return;
    }
    if (target.closest('[data-r24-prep-add-line]')) {
      var prepLines = workspace.querySelector('[data-r24-prep-lines]');
      if (prepLines) prepLines.insertAdjacentHTML('beforeend', prepIngredientLine({}));
      return;
    }
    var prepLineRemove = target.closest('[data-r24-prep-line-remove]');
    if (prepLineRemove) {
      var prepLine = prepLineRemove.closest('[data-r24-prep-line]');
      if (prepLine) prepLine.remove();
      return;
    }
    var prepSave = target.closest('[data-r24-prep-save]');
    if (prepSave) { savePrep(prepSave); return; }
    var prepArchive = target.closest('[data-r24-prep-archive]');
    if (prepArchive) {
      if (!window.confirm('Archive this preparation recipe? Production history stays intact.')) return;
      request('onProArchivePreparation', {
        preparation_id:Number(prepArchive.getAttribute('data-r24-prep-archive') || 0)
      }).then(function (json) {
        applySnapshot(json.pro || {});
        var editor = workspace.querySelector('[data-r24-prep-editor]');
        if (editor) editor.hidden = true;
        toast('Preparation recipe archived.');
      }).catch(function (error) {
        toast(error.message || 'Could not archive preparation.', true);
      });
      return;
    }
    var produce = target.closest('[data-r24-produce]');
    if (produce) {
      openProduceEditor(prepById(produce.getAttribute('data-r24-produce')));
      return;
    }
    var produceSave = target.closest('[data-r24-produce-save]');
    if (produceSave) { saveProduction(produceSave); return; }

    if (target.closest('[data-r24-allocation-new]')) { openAllocationEditor(); return; }
    if (target.closest('[data-r24-allocation-save]')) { saveAllocation(); return; }
    if (target.closest('[data-r24-storage-new]')) { openStorageEditor(null); return; }
    var storageSave = target.closest('[data-r24-storage-save]');
    if (storageSave) { saveStorage(storageSave); return; }
    var transferSave = target.closest('[data-r24-transfer-save]');
    if (transferSave) { saveTransfer(transferSave); return; }

    var reverseReceipt = target.closest('[data-r24-receipt-reverse]');
    if (reverseReceipt) {
      var receiptId = Number(reverseReceipt.getAttribute('data-r24-receipt-reverse') || 0);
      var reason = window.prompt('Reason for reversing this confirmed purchase:', 'Purchase entered incorrectly');
      if (reason === null) return;
      if (!String(reason || '').trim()) return toast('A reversal reason is required.', true);
      reverseReceipt.disabled = true;
      request('onProReversePurchaseReceipt', {
        receipt_id:receiptId,
        reason:String(reason).trim()
      }).then(function (json) {
        applyCoreSnapshot(json);
        applySnapshot(json.pro || {});
        toast('Purchase receipt reversed with an audit trail.');
      }).catch(function (error) {
        toast(error.message || 'Could not reverse this purchase.', true);
      }).finally(function () {
        reverseReceipt.disabled = false;
      });
      return;
    }

    if (target.closest('[data-r24-adjustment-new]')) { openAdjustmentEditor(); return; }
    var adjustSave = target.closest('[data-r24-adjust-save]');
    if (adjustSave) { saveAdjustment(adjustSave); return; }
    if (target.closest('[data-r24-ledger-export]')) { exportLedgerCsv(); return; }
    if (target.closest('[data-r24-analytics-export]')) { exportInventorySnapshotCsv(); return; }

    var settingsSave = target.closest('[data-r24-settings-save]');
    if (settingsSave) {
      var settingsHost = workspace.querySelector('[data-r24-settings-form]');
      if (settingsHost) saveSettings(settingsHost);
      return;
    }

    if (target.closest('[data-r24-camera-start]')) { startCamera(); return; }
    if (target.closest('[data-r24-camera-stop]')) { stopCamera(); return; }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopCamera();
  });

  // Load package identifiers shortly after first paint so barcode scans work
  // even before the user opens one of the R24 management pages.
  window.setTimeout(function () {
    load(false).catch(function () {});
  }, 350);

  window.PMDInventoryProR24 = {
    version:'24.0.0',
    refresh:function () { return load(true); },
    applySnapshot:applySnapshot,
    getSnapshot:function () { return state.pro; },
    getSettings:function () { return state.pro.settings || {}; },
    isReady:function () { return Boolean(state.loaded); },
    decorateReceiptReview:decorateReceiptReview,
    resolveCodeLocal:function (code) {
      code = normalizeCode(code);
      if (!code) return null;
      return (state.pro.identifiers || []).find(function (row) {
        return normalizeCode(row.code) === code;
      }) || null;
    },
    startCamera:startCamera,
    stopCamera:stopCamera
  };
}());
