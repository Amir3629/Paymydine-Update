/* PMD_INVENTORY_OPERATIONS_R24
 * Operational UI for suppliers, package identifiers, purchase orders,
 * receiving, lots/expiry, storage transfers, audited corrections and prep.
 * Deliberately event-driven: no intervals and no DOM MutationObserver loops.
 */
(function () {
  'use strict';

  if (window.PMDInventoryOperationsR24) return;

  var root = document.querySelector('[data-pmd-inventory-root]');
  var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
  var api = window.PMDInventoryControlR1;
  if (!root || !workspace || !api || typeof api.getSnapshot !== 'function') return;

  var cameraStream = null;
  var cameraFrame = 0;
  var cameraDetector = null;

  function snap() {
    return api.getSnapshot() || {};
  }

  function items() {
    return Array.isArray(snap().items) ? snap().items : [];
  }

  function suppliers() {
    return Array.isArray(snap().suppliers) ? snap().suppliers : [];
  }

  function storageLocations() {
    return Array.isArray(snap().storage_locations) ? snap().storage_locations : [];
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function number(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: typeof digits === 'number' ? digits : 2
    }).format(n);
  }

  function money(value) {
    var config = api.getConfig ? api.getConfig() : {};
    var currency = String(config.currency || 'EUR');
    try {
      return new Intl.NumberFormat(undefined, {
        style:'currency',
        currency:currency,
        maximumFractionDigits:2
      }).format(Number(value || 0));
    } catch (ignore) {
      return Number(value || 0).toFixed(2) + ' ' + currency;
    }
  }

  function toast(message, error) {
    var node = root.querySelector('[data-pmd-inv-toast]');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.toggle('is-error', Boolean(error));
    node.classList.add('is-visible');
    window.setTimeout(function () {
      node.classList.remove('is-visible');
    }, 2800);
  }

  function request(action, payload) {
    return api.request(action, payload || {}).then(function (json) {
      if (json && json.snapshot && api.applySnapshot) {
        api.applySnapshot(json.snapshot);
      }
      return json || {};
    });
  }

  function optionRows(rows, selected, labelFn) {
    return (rows || []).map(function (row) {
      var value = Number(row.id || 0);
      return '<option value="' + esc(value) + '"' +
        (Number(selected || 0) === value ? ' selected' : '') + '>' +
        esc(labelFn ? labelFn(row) : (row.name || ('#' + value))) +
        '</option>';
    }).join('');
  }

  function unitOptions(selected) {
    var config = api.getConfig ? api.getConfig() : {};
    var units = config.units || {};
    var html = '';
    Object.keys(units).forEach(function (key) {
      html += '<option value="' + esc(key) + '"' + (String(selected || '') === String(key) ? ' selected' : '') + '>' +
        esc(units[key] || key) + '</option>';
    });
    return html;
  }

  function itemOptions(selected) {
    return optionRows(items(), selected, function (row) {
      return row.name + ' · ' + number(row.estimated_on_hand, 2) + ' ' + row.unit;
    });
  }

  function supplierOptions(selected, allowEmpty) {
    return (allowEmpty ? '<option value="">Unassigned supplier</option>' : '') +
      optionRows(suppliers(), selected, function (row) {
        return row.name;
      });
  }

  function storageOptions(selected, allowEmpty) {
    return (allowEmpty ? '<option value="">Default storage</option>' : '') +
      optionRows(storageLocations(), selected, function (row) {
        return row.name;
      });
  }

  function statusLabel(status) {
    status = String(status || 'draft');
    return status.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function renderSuppliers() {
    var host = workspace.querySelector('[data-r24-supplier-list]');
    if (!host) return;

    var rows = suppliers();
    if (!rows.length) {
      host.innerHTML = '<div class="pmd-inv-r19-empty">No suppliers yet. Add the wholesaler or local supplier you buy from.</div>';
      return;
    }

    host.innerHTML = rows.map(function (supplier) {
      var offers = [];
      items().forEach(function (item) {
        (Array.isArray(item.supplier_offers) ? item.supplier_offers : []).forEach(function (offer) {
          if (Number(offer.supplier_id || 0) === Number(supplier.id)) {
            offers.push({item:item, offer:offer});
          }
        });
      });

      return '<article class="pmd-inv-r24-supplier-card">' +
        '<div class="pmd-inv-r24-supplier-card__head">' +
          '<div><strong>' + esc(supplier.name) + '</strong>' +
            '<small>' + esc((supplier.lead_time_days || 0) + ' day lead time' +
              (supplier.account_ref ? ' · ' + supplier.account_ref : '')) + '</small></div>' +
          '<button type="button" data-r24-edit-supplier="' + esc(supplier.id) + '">Edit</button>' +
        '</div>' +
        '<div class="pmd-inv-r24-supplier-meta">' +
          (supplier.email ? '<span>' + esc(supplier.email) + '</span>' : '') +
          (supplier.phone ? '<span>' + esc(supplier.phone) + '</span>' : '') +
          '<span>Minimum ' + esc(money(supplier.min_order_value || 0)) + '</span>' +
          '<span>90d spend ' + esc(money(supplier.spend_90d || 0)) + '</span>' +
          '<span>' + esc(number(supplier.receipt_count_90d || 0,0) + ' receipts') + '</span>' +
        '</div>' +
        '<div class="pmd-inv-r24-offer-list">' +
          (offers.length ? offers.map(function (entry) {
            var o = entry.offer;
            return '<div class="pmd-inv-r24-offer-row">' +
              '<div><strong>' + esc(entry.item.name) + '</strong><small>' +
                esc((o.supplier_sku ? o.supplier_sku + ' · ' : '') +
                  number(o.purchase_to_base, 2) + ' ' + entry.item.unit + ' / ' + o.purchase_unit) +
              '</small></div>' +
              '<span>' + esc(money(o.unit_cost)) + '</span>' +
              '<span>MOQ ' + esc(number(o.moq,2)) + '</span>' +
              '<span>' + (o.preferred ? 'Preferred' : 'Alternative') + '</span>' +
            '</div>';
          }).join('') : '<div class="pmd-inv-r19-empty">No stock products linked to this supplier yet.</div>') +
        '</div>' +
      '</article>';
    }).join('');

    var supplierSelect = workspace.querySelector('[data-r24-offer-supplier]');
    var itemSelect = workspace.querySelector('[data-r24-offer-item]');
    if (supplierSelect) supplierSelect.innerHTML = supplierOptions(supplierSelect.value, false);
    if (itemSelect) itemSelect.innerHTML = itemOptions(itemSelect.value);
  }

  function renderOrders() {
    var host = workspace.querySelector('[data-r24-orders-list]');
    if (!host) return;
    var orders = Array.isArray(snap().purchase_orders) ? snap().purchase_orders : [];

    host.innerHTML = orders.length ? orders.map(function (order) {
      var remaining = (order.lines || []).reduce(function (sum, line) {
        return sum + Number(line.remaining_qty || 0);
      }, 0);

      return '<article class="pmd-inv-r24-order-card">' +
        '<div class="pmd-inv-r24-order-card__head">' +
          '<div><strong>' + esc(order.order_number) + '</strong><small>' +
            esc((order.supplier_name || 'Unassigned supplier') +
              (order.expected_at ? ' · expected ' + order.expected_at : '')) +
          '</small></div>' +
          '<span class="pmd-inv-r24-status is-' + esc(order.status) + '">' + esc(statusLabel(order.status)) + '</span>' +
        '</div>' +
        '<div class="pmd-inv-r24-order-lines">' +
          (order.lines || []).map(function (line) {
            return '<div>' +
              '<strong>' + esc(line.item_name) + '</strong>' +
              '<span>' + esc(number(line.ordered_qty,2) + ' ' + line.unit + ' ordered') + '</span>' +
              '<span>' + esc(number(line.received_qty,2) + ' received') + '</span>' +
              '<span>' + esc(money(Number(line.ordered_qty || 0) * Number(line.unit_cost || 0))) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="pmd-inv-r24-order-card__foot">' +
          '<strong>' + esc(money(order.subtotal || 0)) + '</strong>' +
          (remaining > .00005 && ['cancelled','closed','received'].indexOf(String(order.status)) === -1
            ? '<button type="button" class="pmd-inv-r19-primary" data-r24-receive-po="' + esc(order.id) + '">Receive delivery</button>'
            : '') +
        '</div>' +
      '</article>';
    }).join('') : '<div class="pmd-inv-r19-empty">No purchase orders yet. Build one from the smart order suggestions.</div>';

    renderReceipts();
  }

  function renderReceipts() {
    var host = workspace.querySelector('[data-r24-receipt-list]');
    if (!host) return;
    var rows = Array.isArray(snap().recent_purchases) ? snap().recent_purchases : [];
    host.innerHTML = rows.length ? rows.map(function (row) {
      var reversed = Boolean(row.reversed_at);
      return '<div class="pmd-inv-r24-receipt-row' + (reversed ? ' is-reversed' : '') + '">' +
        '<div><strong>' + esc(row.supplier_name || 'Supplier purchase') + '</strong><small>' +
          esc((row.invoice_number ? 'Invoice ' + row.invoice_number + ' · ' : '') + (row.purchased_at || '')) +
        '</small></div>' +
        '<span>' + esc(money(row.total_amount || 0)) + '</span>' +
        '<span>' + (reversed ? 'Reversed' : (row.purchase_order_id ? 'PO linked' : statusLabel(row.source || 'manual'))) + '</span>' +
        (!reversed
          ? '<button type="button" data-r24-reverse-receipt="' + esc(row.id) + '">Reverse</button>'
          : '<span class="pmd-inv-r24-muted">' + esc(String(row.reversed_at || '')) + '</span>') +
      '</div>';
    }).join('') : '<div class="pmd-inv-r19-empty">No confirmed purchase receipts yet.</div>';
  }

  function renderAlerts() {
    var host = workspace.querySelector('[data-r24-alerts]');
    if (!host) return;
    var alerts = Array.isArray(snap().alerts) ? snap().alerts : [];

    host.innerHTML = alerts.length ? alerts.slice(0, 12).map(function (row) {
      return '<div class="pmd-inv-r24-alert is-' + esc(row.severity || 'info') + '">' +
        '<strong>' + esc(row.title || 'Inventory alert') + '</strong>' +
        '<span>' + esc(row.detail || '') + '</span>' +
      '</div>';
    }).join('') : '<div class="pmd-inv-r24-alert is-good"><strong>No urgent operational alerts</strong><span>Stock, expiry and supplier-order checks are clear.</span></div>';
  }

  function renderAnalytics() {
    var host = workspace.querySelector('[data-r24-analytics]');
    if (!host) return;
    var analytics = snap().analytics || {};
    var waste = Array.isArray(analytics.waste_by_reason_30d) ? analytics.waste_by_reason_30d : [];
    var variance = Array.isArray(analytics.variance_top) ? analytics.variance_top : [];
    var summary = snap().summary || {};

    host.innerHTML =
      '<article class="pmd-inv-r24-analytics-card">' +
        '<span>Estimated ingredient usage · 30d</span><strong>' + esc(money(analytics.estimated_food_cost_30d || 0)) + '</strong>' +
        '<small>Theoretical recipe consumption at current average unit cost.</small>' +
      '</article>' +
      '<article class="pmd-inv-r24-analytics-card">' +
        '<span>Waste · 30d</span><strong>' + esc(money(summary.waste_cost_30d || 0)) + '</strong>' +
        '<small>' + esc(waste.slice(0,3).map(function (row) { return row.reason + ' ' + money(row.cost); }).join(' · ') || 'No recorded waste') + '</small>' +
      '</article>' +
      '<article class="pmd-inv-r24-analytics-card">' +
        '<span>Latest count variance</span><strong>' + esc(money(summary.unexplained_loss_value || 0)) + '</strong>' +
        '<small>' + esc(variance.slice(0,3).map(function (row) {
          return row.item_name + ' ' + (row.variance_qty > 0 ? '+' : '') + number(row.variance_qty,2) + ' ' + row.unit;
        }).join(' · ') || 'No count variance') + '</small>' +
      '</article>' +
      '<article class="pmd-inv-r24-analytics-card">' +
        '<span>Operations readiness</span><strong>' + esc(number(summary.barcode_mapped_items || 0,0) + ' / ' + number(summary.tracked_items || 0,0)) + '</strong>' +
        '<small>Stock items with normalized package/barcode mappings.</small>' +
      '</article>';
  }

  function renderStorage() {
    var host = workspace.querySelector('[data-r24-storage-list]');
    if (host) {
      var rows = storageLocations();
      host.innerHTML = rows.length ? rows.map(function (row) {
        return '<div class="pmd-inv-r24-storage-row"><strong>' + esc(row.name) + '</strong><span>' +
          esc(statusLabel(row.type)) + '</span>' + (row.is_default ? '<b>Default</b>' : '') + '</div>';
      }).join('') : '<div class="pmd-inv-r19-empty">No storage locations.</div>';
    }

    [
      '[data-r24-transfer-from]',
      '[data-r24-transfer-to]',
      '[data-r24-setting-storage]',
      '[data-r24-produce-storage]'
    ].forEach(function (selector) {
      var node = workspace.querySelector(selector);
      if (!node) return;
      var current = node.value;
      node.innerHTML = storageOptions(current, selector.indexOf('setting') !== -1);
    });

    ['[data-r24-transfer-item]','[data-r24-adjust-item]','[data-r24-prep-output]'].forEach(function (selector) {
      var node = workspace.querySelector(selector);
      if (!node) return;
      var current = node.value;
      node.innerHTML = itemOptions(current);
    });
  }

  function renderLots() {
    var host = workspace.querySelector('[data-r24-lot-list]');
    if (!host) return;
    var rows = Array.isArray(snap().lots) ? snap().lots : [];

    host.innerHTML = rows.length ? rows.slice(0, 30).map(function (lot) {
      var expiry = lot.expiry_date
        ? (lot.expired ? 'Expired ' + lot.expiry_date : 'Expiry ' + lot.expiry_date)
        : 'No expiry';
      return '<div class="pmd-inv-r24-lot-row' +
        (lot.expired ? ' is-expired' : (lot.expiry_warning ? ' is-warning' : '')) + '">' +
        '<div><strong>' + esc(lot.item_name) + '</strong><small>' +
          esc((lot.lot_code ? 'Lot ' + lot.lot_code + ' · ' : '') + lot.storage_name) + '</small></div>' +
        '<span>' + esc(number(lot.qty_remaining,2) + ' ' + lot.base_unit) + '</span>' +
        '<span>' + esc(expiry) + '</span>' +
      '</div>';
    }).join('') : '<div class="pmd-inv-r19-empty">No tracked lots yet. Add an expiry or lot code while receiving stock.</div>';
  }

  function renderTransfers() {
    var host = workspace.querySelector('[data-r24-transfer-history]');
    if (!host) return;
    var rows = Array.isArray(snap().transfers) ? snap().transfers : [];
    host.innerHTML = rows.length ? rows.slice(0, 8).map(function (row) {
      return '<div class="pmd-inv-r24-activity-row"><strong>' +
        esc(row.from_storage_name + ' → ' + row.to_storage_name) + '</strong><span>' +
        esc((row.lines || []).map(function (line) {
          return line.item_name + ' ' + number(line.qty_base,2) + ' ' + line.unit;
        }).join(', ')) + '</span></div>';
    }).join('') : '<div class="pmd-inv-r24-muted">No transfers yet.</div>';
  }

  function renderSettings() {
    var settings = snap().inventory_settings || {};
    var trigger = workspace.querySelector('[data-r24-setting-trigger]');
    var expiry = workspace.querySelector('[data-r24-setting-expiry]');
    var storage = workspace.querySelector('[data-r24-setting-storage]');
    var blind = workspace.querySelector('[data-r24-setting-blind]');
    var low = workspace.querySelector('[data-r24-setting-low]');
    var menu = workspace.querySelector('[data-r24-setting-menu]');
    if (trigger) trigger.value = String(settings.consumption_trigger || 'paid');
    if (expiry) expiry.value = String(settings.expiry_warning_days || 7);
    if (storage) storage.value = String(settings.default_storage_id || '');
    if (blind) blind.checked = Boolean(settings.blind_counts);
    if (low) low.checked = Boolean(settings.low_stock_notifications);
    if (menu) menu.checked = Boolean(settings.auto_menu_availability);
  }

  function renderPreparations() {
    var host = workspace.querySelector('[data-r24-prep-list]');
    if (!host) return;
    var rows = Array.isArray(snap().preparations) ? snap().preparations : [];

    host.innerHTML = rows.length ? rows.map(function (row) {
      return '<div class="pmd-inv-r24-prep-row">' +
        '<div><strong>' + esc(row.name) + '</strong><small>' +
          esc(number(row.output_qty,2) + ' ' + row.output_unit + ' ' + row.output_item_name) + '</small></div>' +
        '<span>' + esc((row.lines || []).map(function (line) {
          return line.item_name + ' ' + number(line.qty_input,2) + ' ' + line.unit;
        }).join(' + ')) + '</span>' +
        '<button type="button" data-r24-produce-prep="' + esc(row.id) + '">Produce</button>' +
      '</div>';
    }).join('') : '<div class="pmd-inv-r19-empty">No prep recipes yet. Create sauces, doughs, broths or other produced stock.</div>';

    var output = workspace.querySelector('[data-r24-prep-output]');
    if (output) output.innerHTML = itemOptions(output.value);
  }

  function render() {
    renderSuppliers();
    renderOrders();
    renderAlerts();
    renderAnalytics();
    renderStorage();
    renderLots();
    renderTransfers();
    renderSettings();
    renderPreparations();
  }

  function openSupplierEditor(supplier) {
    var panel = workspace.querySelector('[data-r24-supplier-editor]');
    if (!panel) return;
    panel.hidden = false;
    supplier = supplier || {};
    var map = {
      '[data-r24-supplier-id]':supplier.id || '',
      '[data-r24-supplier-name]':supplier.name || '',
      '[data-r24-supplier-account]':supplier.account_ref || '',
      '[data-r24-supplier-contact]':supplier.contact_name || '',
      '[data-r24-supplier-email]':supplier.email || '',
      '[data-r24-supplier-phone]':supplier.phone || '',
      '[data-r24-supplier-lead]':supplier.lead_time_days == null ? 1 : supplier.lead_time_days,
      '[data-r24-supplier-min]':supplier.min_order_value || 0,
      '[data-r24-supplier-notes]':supplier.notes || ''
    };
    Object.keys(map).forEach(function (selector) {
      var node = panel.querySelector(selector);
      if (node) node.value = String(map[selector]);
    });
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function saveSupplier() {
    var panel = workspace.querySelector('[data-r24-supplier-editor]');
    if (!panel) return;
    var payload = {
      supplier_id:Number((panel.querySelector('[data-r24-supplier-id]') || {}).value || 0),
      name:String((panel.querySelector('[data-r24-supplier-name]') || {}).value || '').trim(),
      account_ref:String((panel.querySelector('[data-r24-supplier-account]') || {}).value || ''),
      contact_name:String((panel.querySelector('[data-r24-supplier-contact]') || {}).value || ''),
      email:String((panel.querySelector('[data-r24-supplier-email]') || {}).value || ''),
      phone:String((panel.querySelector('[data-r24-supplier-phone]') || {}).value || ''),
      lead_time_days:Number((panel.querySelector('[data-r24-supplier-lead]') || {}).value || 1),
      min_order_value:Number((panel.querySelector('[data-r24-supplier-min]') || {}).value || 0),
      notes:String((panel.querySelector('[data-r24-supplier-notes]') || {}).value || '')
    };
    if (!payload.name) return toast('Supplier name is required.', true);

    request('onSaveSupplier', payload)
      .then(function () {
        panel.hidden = true;
        toast('Supplier saved.');
      })
      .catch(function (error) { toast(error.message || 'Could not save supplier.', true); });
  }

  function openOfferEditor() {
    var panel = workspace.querySelector('[data-r24-offer-editor]');
    if (!panel) return;
    panel.hidden = false;
    var supplier = panel.querySelector('[data-r24-offer-supplier]');
    var item = panel.querySelector('[data-r24-offer-item]');
    if (supplier) supplier.innerHTML = supplierOptions(supplier.value, false);
    if (item) item.innerHTML = itemOptions(item.value);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function saveOffer() {
    var panel = workspace.querySelector('[data-r24-offer-editor]');
    if (!panel) return;
    var payload = {
      supplier_id:Number((panel.querySelector('[data-r24-offer-supplier]') || {}).value || 0),
      item_id:Number((panel.querySelector('[data-r24-offer-item]') || {}).value || 0),
      supplier_sku:String((panel.querySelector('[data-r24-offer-sku]') || {}).value || ''),
      purchase_unit:String((panel.querySelector('[data-r24-offer-unit]') || {}).value || 'piece'),
      purchase_to_base:Number((panel.querySelector('[data-r24-offer-factor]') || {}).value || 1),
      unit_cost:Number((panel.querySelector('[data-r24-offer-cost]') || {}).value || 0),
      moq:Number((panel.querySelector('[data-r24-offer-moq]') || {}).value || 1),
      pack_multiple:Number((panel.querySelector('[data-r24-offer-multiple]') || {}).value || 1),
      lead_time_days:String((panel.querySelector('[data-r24-offer-lead]') || {}).value || ''),
      preferred:Boolean((panel.querySelector('[data-r24-offer-preferred]') || {}).checked)
    };
    if (!payload.supplier_id || !payload.item_id) return toast('Choose supplier and stock item.', true);

    request('onSaveSupplierItem', payload)
      .then(function () {
        panel.hidden = true;
        toast('Supplier product offer saved.');
      })
      .catch(function (error) { toast(error.message || 'Could not save supplier product.', true); });
  }

  function buildPurchaseOrders() {
    var rows = items().filter(function (item) {
      return Number(item.smart_order_qty || 0) > .00005;
    });
    if (!rows.length) return toast('Nothing needs ordering based on current targets, usage and lead time.', true);

    var groups = {};
    rows.forEach(function (item) {
      var supplierId = Number(item.preferred_supplier_id || 0);
      var key = String(supplierId);
      if (!groups[key]) groups[key] = {supplierId:supplierId, lines:[]};
      var offer = item.preferred_supplier_offer || {};
      groups[key].lines.push({
        item_id:Number(item.id),
        supplier_item_id:Number(offer.id || 0),
        quantity:Number(item.smart_order_qty || 0),
        unit:String(item.smart_order_unit || item.purchase_unit || item.unit || 'piece'),
        unit_cost:Number(item.smart_order_unit_cost || item.purchase_unit_cost || 0),
        base_quantity_per_unit:Number(offer.purchase_to_base || item.purchase_to_base || 1)
      });
    });

    var keys = Object.keys(groups);
    var chain = Promise.resolve();
    var created = 0;
    keys.forEach(function (key) {
      chain = chain.then(function () {
        var group = groups[key];
        return request('onCreatePurchaseOrder', {
          supplier_id:group.supplierId,
          send:true,
          lines:group.lines
        }).then(function () { created += 1; });
      });
    });

    chain.then(function () {
      toast(created + ' purchase order' + (created === 1 ? '' : 's') + ' created.');
    }).catch(function (error) {
      toast(error.message || 'Could not create purchase orders.', true);
    });
  }

  function openReceiveOrder(orderId) {
    var order = (snap().purchase_orders || []).find(function (row) {
      return Number(row.id) === Number(orderId);
    });
    var panel = workspace.querySelector('[data-r24-receive-editor]');
    if (!order || !panel) return;

    var remaining = (order.lines || []).filter(function (line) {
      return Number(line.remaining_qty || 0) > .00005;
    });

    panel.hidden = false;
    panel.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>Receive ' + esc(order.order_number) + '</h3><small>' +
        esc(order.supplier_name || 'Supplier delivery') + '</small></div>' +
        '<button type="button" class="pmd-inv-r19-secondary" data-r24-close-editor>Close</button></div>' +
      '<div class="pmd-inv-r24-form-grid">' +
        '<label>Receive into<select data-r24-receive-storage>' + storageOptions((snap().inventory_settings || {}).default_storage_id, false) + '</select></label>' +
        '<label>Delivery date<input type="date" data-r24-receive-date value="' + esc(new Date().toISOString().slice(0,10)) + '"></label>' +
      '</div>' +
      '<div class="pmd-inv-r24-receive-lines">' +
        remaining.map(function (line) {
          var item = items().find(function (row) { return Number(row.id) === Number(line.item_id); }) || {};
          return '<div class="pmd-inv-r24-receive-line" data-r24-receive-line="' + esc(line.id) + '">' +
            '<div><strong>' + esc(line.item_name) + '</strong><small>' +
              esc(number(line.remaining_qty,2) + ' ' + line.unit + ' remaining') + '</small></div>' +
            '<label>Received<input type="number" min="0" max="' + esc(line.remaining_qty) + '" step="0.01" value="' + esc(line.remaining_qty) + '" data-r24-receive-qty></label>' +
            '<label>Lot / batch<input type="text" data-r24-receive-lot placeholder="Optional"></label>' +
            '<label>Expiry<input type="date" data-r24-receive-expiry' + (item.track_expiry ? ' required' : '') + '></label>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r24-receive-submit="' + esc(order.id) + '">Confirm received stock</button></div>';

    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function submitReceive(orderId) {
    var panel = workspace.querySelector('[data-r24-receive-editor]');
    if (!panel) return;
    var lines = Array.prototype.slice.call(panel.querySelectorAll('[data-r24-receive-line]')).map(function (row) {
      return {
        line_id:Number(row.getAttribute('data-r24-receive-line') || 0),
        quantity:Number((row.querySelector('[data-r24-receive-qty]') || {}).value || 0),
        lot_code:String((row.querySelector('[data-r24-receive-lot]') || {}).value || ''),
        expiry_date:String((row.querySelector('[data-r24-receive-expiry]') || {}).value || '')
      };
    }).filter(function (line) { return line.line_id && line.quantity > 0; });

    if (!lines.length) return toast('Enter at least one received quantity.', true);

    request('onReceivePurchaseOrder', {
      purchase_order_id:Number(orderId),
      storage_location_id:Number((panel.querySelector('[data-r24-receive-storage]') || {}).value || 0),
      purchased_at:String((panel.querySelector('[data-r24-receive-date]') || {}).value || ''),
      lines:lines
    }).then(function () {
      panel.hidden = true;
      toast('Delivery received and stock updated.');
    }).catch(function (error) {
      toast(error.message || 'Could not receive delivery.', true);
    });
  }

  function saveStorage() {
    var panel = workspace.querySelector('[data-r24-storage-editor]');
    if (!panel) return;
    var name = String((panel.querySelector('[data-r24-storage-name]') || {}).value || '').trim();
    if (!name) return toast('Storage location name is required.', true);

    request('onSaveStorageLocation', {
      name:name,
      type:String((panel.querySelector('[data-r24-storage-type]') || {}).value || 'storage'),
      is_default:Boolean((panel.querySelector('[data-r24-storage-default]') || {}).checked)
    }).then(function () {
      panel.hidden = true;
      panel.querySelector('[data-r24-storage-name]').value = '';
      toast('Storage location saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save storage location.', true);
    });
  }

  function saveSettings() {
    request('onSaveInventorySettings', {
      consumption_trigger:String((workspace.querySelector('[data-r24-setting-trigger]') || {}).value || 'paid'),
      expiry_warning_days:Number((workspace.querySelector('[data-r24-setting-expiry]') || {}).value || 7),
      default_storage_id:Number((workspace.querySelector('[data-r24-setting-storage]') || {}).value || 0),
      blind_counts:Boolean((workspace.querySelector('[data-r24-setting-blind]') || {}).checked),
      low_stock_notifications:Boolean((workspace.querySelector('[data-r24-setting-low]') || {}).checked),
      auto_menu_availability:Boolean((workspace.querySelector('[data-r24-setting-menu]') || {}).checked)
    }).then(function () {
      toast('Inventory settings saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save inventory settings.', true);
    });
  }

  function submitTransfer() {
    var from = Number((workspace.querySelector('[data-r24-transfer-from]') || {}).value || 0);
    var to = Number((workspace.querySelector('[data-r24-transfer-to]') || {}).value || 0);
    var itemId = Number((workspace.querySelector('[data-r24-transfer-item]') || {}).value || 0);
    var qty = Number((workspace.querySelector('[data-r24-transfer-qty]') || {}).value || 0);
    if (!from || !to || from === to || !itemId || !(qty > 0)) {
      return toast('Choose two storage locations, an item and a quantity.', true);
    }

    request('onTransferStock', {
      from_storage_id:from,
      to_storage_id:to,
      note:String((workspace.querySelector('[data-r24-transfer-note]') || {}).value || ''),
      lines:[{item_id:itemId, quantity:qty}]
    }).then(function () {
      var q = workspace.querySelector('[data-r24-transfer-qty]');
      if (q) q.value = '';
      toast('Stock transfer recorded.');
    }).catch(function (error) {
      toast(error.message || 'Could not transfer stock.', true);
    });
  }

  function submitAdjustment() {
    var itemId = Number((workspace.querySelector('[data-r24-adjust-item]') || {}).value || 0);
    var qty = Number((workspace.querySelector('[data-r24-adjust-qty]') || {}).value || 0);
    var reason = String((workspace.querySelector('[data-r24-adjust-reason]') || {}).value || '').trim();
    if (!itemId || Math.abs(qty) <= .00005 || !reason) {
      return toast('Choose an item, enter a non-zero correction and provide a reason.', true);
    }

    request('onRecordAdjustment', {
      item_id:itemId,
      quantity_delta:qty,
      reason:reason,
      note:String((workspace.querySelector('[data-r24-adjust-note]') || {}).value || '')
    }).then(function () {
      workspace.querySelector('[data-r24-adjust-qty]').value = '';
      workspace.querySelector('[data-r24-adjust-reason]').value = '';
      workspace.querySelector('[data-r24-adjust-note]').value = '';
      toast('Audited stock correction recorded.');
    }).catch(function (error) {
      toast(error.message || 'Could not record correction.', true);
    });
  }

  function reverseReceipt(receiptId) {
    if (!window.confirm('Reverse this confirmed purchase? Stock movements will be negated and the audit history will remain.')) return;
    request('onReversePurchase', {
      receipt_id:Number(receiptId),
      reason:'Purchase reversed from Inventory'
    }).then(function () {
      toast('Purchase reversed.');
    }).catch(function (error) {
      toast(error.message || 'Could not reverse purchase.', true);
    });
  }

  function ensureFloatingPanel(kind) {
    var selector = '[data-r24-floating="' + kind + '"]';
    var panel = workspace.querySelector(selector);
    if (panel) return panel;
    panel = document.createElement('section');
    panel.className = 'pmd-inv-r24-editor pmd-inv-r24-floating';
    panel.setAttribute('data-r24-floating', kind);
    panel.hidden = true;
    var stockEditor = workspace.querySelector('[data-r19-stock-editor]');
    if (stockEditor && stockEditor.parentNode) {
      stockEditor.parentNode.insertBefore(panel, stockEditor.nextSibling);
    } else {
      workspace.appendChild(panel);
    }
    return panel;
  }

  function openIdentifierEditor(itemId) {
    var item = items().find(function (row) { return Number(row.id) === Number(itemId); });
    if (!item) return;
    var panel = ensureFloatingPanel('identifier');
    panel.hidden = false;
    panel.setAttribute('data-r24-identifier-item', String(item.id));
    panel.innerHTML =
      '<div class="pmd-inv-r19-editor-head"><div><h3>Add barcode / package</h3><small>' +
        esc(item.name + ' · each code stores its own package conversion') + '</small></div>' +
        '<button type="button" class="pmd-inv-r19-secondary" data-r24-close-floating>Close</button></div>' +
      '<div class="pmd-inv-r24-form-grid">' +
        '<label>Barcode / GTIN / supplier code<input type="text" data-r24-code-value placeholder="Scan or type code"></label>' +
        '<label>Package unit<select data-r24-code-unit>' + unitOptions(item.purchase_unit || item.unit) + '</select></label>' +
        '<label>1 scan equals · base quantity<input type="number" min="0.0001" step="0.0001" value="' + esc(item.purchase_to_base || 1) + '" data-r24-code-factor></label>' +
        '<label>Supplier<select data-r24-code-supplier>' + supplierOptions(0, true) + '</select></label>' +
        '<label class="pmd-inv-r24-check"><input type="checkbox" data-r24-code-primary><span>Primary code</span></label>' +
      '</div>' +
      '<div class="pmd-inv-r19-editor-actions"><button type="button" class="pmd-inv-r19-primary" data-r24-code-save>Save code</button></div>';
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
    window.setTimeout(function () {
      var input = panel.querySelector('[data-r24-code-value]');
      if (input) input.focus();
    }, 50);
  }

  function saveIdentifier() {
    var panel = ensureFloatingPanel('identifier');
    var itemId = Number(panel.getAttribute('data-r24-identifier-item') || 0);
    var code = String((panel.querySelector('[data-r24-code-value]') || {}).value || '').trim();
    if (!itemId || !code) return toast('Enter or scan the package code.', true);
    request('onSaveIdentifier', {
      item_id:itemId,
      code:code,
      code_type:'auto',
      package_unit:String((panel.querySelector('[data-r24-code-unit]') || {}).value || 'piece'),
      package_quantity:1,
      base_quantity:Number((panel.querySelector('[data-r24-code-factor]') || {}).value || 1),
      supplier_id:Number((panel.querySelector('[data-r24-code-supplier]') || {}).value || 0),
      is_primary:Boolean((panel.querySelector('[data-r24-code-primary]') || {}).checked),
      source:'item_editor'
    }).then(function () {
      panel.hidden = true;
      toast('Barcode / package saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save package code.', true);
    });
  }

  function openLedger(itemId) {
    var panel = ensureFloatingPanel('ledger');
    panel.hidden = false;
    panel.innerHTML = '<div class="pmd-inv-r19-editor-head"><div><h3>Stock ledger</h3><small>Loading movement history…</small></div><button type="button" class="pmd-inv-r19-secondary" data-r24-close-floating>Close</button></div>';
    request('onItemLedger', {item_id:Number(itemId)})
      .then(function (json) {
        var ledger = json.ledger || {};
        var rows = Array.isArray(ledger.movements) ? ledger.movements : [];
        panel.innerHTML =
          '<div class="pmd-inv-r19-editor-head"><div><h3>' + esc((ledger.item || {}).name || 'Stock ledger') + '</h3><small>Purchase, waste, transfer, correction and production history</small></div><button type="button" class="pmd-inv-r19-secondary" data-r24-close-floating>Close</button></div>' +
          '<div class="pmd-inv-r24-ledger">' +
            (rows.length ? rows.map(function (row) {
              return '<div class="pmd-inv-r24-ledger-row">' +
                '<strong>' + esc(statusLabel(row.type)) + '</strong>' +
                '<span class="' + (Number(row.qty_delta) < 0 ? 'is-negative' : 'is-positive') + '">' +
                  esc((Number(row.qty_delta) > 0 ? '+' : '') + number(row.qty_delta,2) + ' ' + ((ledger.item || {}).unit || '')) +
                '</span>' +
                '<span>' + esc(row.storage_name || row.reason || '') + '</span>' +
                '<span>' + esc(row.lot_code ? 'Lot ' + row.lot_code : '') + '</span>' +
                '<small>' + esc(row.occurred_at || '') + '</small>' +
              '</div>';
            }).join('') : '<div class="pmd-inv-r19-empty">No movements yet.</div>') +
          '</div>';
      })
      .catch(function (error) {
        panel.innerHTML += '<div class="pmd-inv-r19-empty">' + esc(error.message || 'Could not load ledger.') + '</div>';
      });
  }

  function openPrepEditor() {
    var panel = workspace.querySelector('[data-r24-prep-editor]');
    if (!panel) return;
    panel.hidden = false;
    var id = panel.querySelector('[data-r24-prep-id]');
    var name = panel.querySelector('[data-r24-prep-name]');
    var output = panel.querySelector('[data-r24-prep-output]');
    var qty = panel.querySelector('[data-r24-prep-output-qty]');
    var lines = panel.querySelector('[data-r24-prep-lines]');
    if (id) id.value = '';
    if (name) name.value = '';
    if (qty) qty.value = '1';
    if (output) output.innerHTML = itemOptions('');
    if (lines) lines.innerHTML = '';
    addPrepLine();
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function addPrepLine() {
    var host = workspace.querySelector('[data-r24-prep-lines]');
    if (!host) return;
    var row = document.createElement('div');
    row.className = 'pmd-inv-r24-prep-line';
    row.innerHTML =
      '<select data-r24-prep-line-item>' + itemOptions('') + '</select>' +
      '<input type="number" min="0.0001" step="0.01" placeholder="Input qty · base unit" data-r24-prep-line-qty>' +
      '<button type="button" data-r24-prep-remove-line aria-label="Remove">×</button>';
    host.appendChild(row);
  }

  function savePreparation() {
    var panel = workspace.querySelector('[data-r24-prep-editor]');
    if (!panel) return;
    var lines = Array.prototype.slice.call(panel.querySelectorAll('.pmd-inv-r24-prep-line')).map(function (row) {
      return {
        item_id:Number((row.querySelector('[data-r24-prep-line-item]') || {}).value || 0),
        qty_input:Number((row.querySelector('[data-r24-prep-line-qty]') || {}).value || 0)
      };
    }).filter(function (line) { return line.item_id && line.qty_input > 0; });

    request('onSavePreparation', {
      preparation_id:Number((panel.querySelector('[data-r24-prep-id]') || {}).value || 0),
      name:String((panel.querySelector('[data-r24-prep-name]') || {}).value || '').trim(),
      output_item_id:Number((panel.querySelector('[data-r24-prep-output]') || {}).value || 0),
      output_qty:Number((panel.querySelector('[data-r24-prep-output-qty]') || {}).value || 0),
      lines:lines
    }).then(function () {
      panel.hidden = true;
      toast('Preparation recipe saved.');
    }).catch(function (error) {
      toast(error.message || 'Could not save preparation.', true);
    });
  }

  function openProduce(prepId) {
    var prep = (snap().preparations || []).find(function (row) {
      return Number(row.id) === Number(prepId);
    });
    var panel = workspace.querySelector('[data-r24-produce-editor]');
    if (!prep || !panel) return;
    panel.hidden = false;
    panel.querySelector('[data-r24-produce-prep]').value = String(prep.id);
    panel.querySelector('[data-r24-produce-qty]').value = String(prep.output_qty || 1);
    panel.querySelector('[data-r24-produce-storage]').innerHTML =
      storageOptions((snap().inventory_settings || {}).default_storage_id, false);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function submitProduction() {
    var panel = workspace.querySelector('[data-r24-produce-editor]');
    if (!panel) return;
    request('onProduceBatch', {
      preparation_id:Number((panel.querySelector('[data-r24-produce-prep]') || {}).value || 0),
      output_qty:Number((panel.querySelector('[data-r24-produce-qty]') || {}).value || 0),
      storage_location_id:Number((panel.querySelector('[data-r24-produce-storage]') || {}).value || 0),
      lot_code:String((panel.querySelector('[data-r24-produce-lot]') || {}).value || ''),
      expiry_date:String((panel.querySelector('[data-r24-produce-expiry]') || {}).value || ''),
      note:String((panel.querySelector('[data-r24-produce-note]') || {}).value || '')
    }).then(function () {
      panel.hidden = true;
      toast('Production batch recorded.');
    }).catch(function (error) {
      toast(error.message || 'Could not record production.', true);
    });
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv(filename, headers, rows) {
    var csv = [headers.map(csvCell).join(',')].concat(rows.map(function (row) {
      return row.map(csvCell).join(',');
    })).join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportStock() {
    downloadCsv(
      'paymydine-stock-' + new Date().toISOString().slice(0,10) + '.csv',
      ['Item','Category','On hand','Unit','Stock value','Supplier','Days left','Status'],
      items().map(function (item) {
        return [
          item.name,item.category,number(item.estimated_on_hand,4),item.unit,
          Number(item.stock_value || 0).toFixed(2),
          (item.preferred_supplier_offer || {}).supplier_name || item.supplier_name || '',
          item.days_left == null ? '' : item.days_left,
          item.status || ''
        ];
      })
    );
  }

  function exportPurchases() {
    var rows = Array.isArray(snap().recent_purchases) ? snap().recent_purchases : [];
    downloadCsv(
      'paymydine-purchases-' + new Date().toISOString().slice(0,10) + '.csv',
      ['Date','Supplier','Invoice','Source','Total','Reversed'],
      rows.map(function (row) {
        return [
          row.purchased_at || '',row.supplier_name || '',row.invoice_number || '',
          row.source || '',Number(row.total_amount || 0).toFixed(2),row.reversed_at || ''
        ];
      })
    );
  }

  function stopCamera() {
    if (cameraFrame) {
      window.cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) { track.stop(); });
      cameraStream = null;
    }
    var panel = workspace.querySelector('[data-r24-barcode-camera-panel]');
    var video = workspace.querySelector('[data-r24-barcode-video]');
    if (video) {
      try { video.pause(); } catch (ignore) {}
      video.srcObject = null;
    }
    if (panel) panel.hidden = true;
  }

  function emitScannedCode(code) {
    var input = workspace.querySelector('[data-r19-barcode-input]');
    if (!input) return;
    input.value = String(code || '');
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key:'Enter',
      code:'Enter',
      bubbles:true,
      cancelable:true
    }));
  }

  function startCamera() {
    if (!('BarcodeDetector' in window)) {
      return toast('Camera barcode detection is not supported by this browser. USB/Bluetooth scanner input still works.', true);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return toast('Camera access is unavailable on this device.', true);
    }

    var panel = workspace.querySelector('[data-r24-barcode-camera-panel]');
    var video = workspace.querySelector('[data-r24-barcode-video]');
    if (!panel || !video) return;
    stopCamera();
    panel.hidden = false;

    try {
      cameraDetector = new window.BarcodeDetector({
        formats:['ean_13','ean_8','upc_a','upc_e','code_128','qr_code','data_matrix','itf']
      });
    } catch (ignore) {
      cameraDetector = new window.BarcodeDetector();
    }

    navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'}},
      audio:false
    }).then(function (stream) {
      cameraStream = stream;
      video.srcObject = stream;
      return video.play();
    }).then(function () {
      var detect = function () {
        if (!cameraStream || !cameraDetector) return;
        cameraDetector.detect(video).then(function (codes) {
          if (codes && codes.length && codes[0].rawValue) {
            var code = codes[0].rawValue;
            stopCamera();
            emitScannedCode(code);
            return;
          }
          cameraFrame = window.requestAnimationFrame(detect);
        }).catch(function () {
          cameraFrame = window.requestAnimationFrame(detect);
        });
      };
      cameraFrame = window.requestAnimationFrame(detect);
    }).catch(function (error) {
      stopCamera();
      toast(error.message || 'Camera permission was not granted.', true);
    });
  }

  workspace.addEventListener('click', function (event) {
    var target = event.target;

    if (target.closest('[data-r24-new-supplier]')) {
      openSupplierEditor(null); return;
    }
    var editSupplier = target.closest('[data-r24-edit-supplier]');
    if (editSupplier) {
      var supplier = suppliers().find(function (row) {
        return Number(row.id) === Number(editSupplier.getAttribute('data-r24-edit-supplier'));
      });
      openSupplierEditor(supplier || null);
      return;
    }
    if (target.closest('[data-r24-save-supplier]')) { saveSupplier(); return; }
    if (target.closest('[data-r24-new-offer]')) { openOfferEditor(); return; }
    if (target.closest('[data-r24-save-offer]')) { saveOffer(); return; }

    if (target.closest('[data-r24-po-from-shopping]')) { buildPurchaseOrders(); return; }
    var receive = target.closest('[data-r24-receive-po]');
    if (receive) { openReceiveOrder(receive.getAttribute('data-r24-receive-po')); return; }
    var receiveSubmit = target.closest('[data-r24-receive-submit]');
    if (receiveSubmit) { submitReceive(receiveSubmit.getAttribute('data-r24-receive-submit')); return; }
    var reverse = target.closest('[data-r24-reverse-receipt]');
    if (reverse) { reverseReceipt(reverse.getAttribute('data-r24-reverse-receipt')); return; }

    if (target.closest('[data-r24-new-storage]')) {
      var storageEditor = workspace.querySelector('[data-r24-storage-editor]');
      if (storageEditor) storageEditor.hidden = false;
      return;
    }
    if (target.closest('[data-r24-save-storage]')) { saveStorage(); return; }
    if (target.closest('[data-r24-save-settings]')) { saveSettings(); return; }
    if (target.closest('[data-r24-transfer-submit]')) { submitTransfer(); return; }
    if (target.closest('[data-r24-adjust-submit]')) { submitAdjustment(); return; }

    var identifier = target.closest('[data-r24-item-identifier]');
    if (identifier) { openIdentifierEditor(identifier.getAttribute('data-r24-item-identifier')); return; }
    var ledger = target.closest('[data-r24-item-ledger]');
    if (ledger) { openLedger(ledger.getAttribute('data-r24-item-ledger')); return; }
    if (target.closest('[data-r24-code-save]')) { saveIdentifier(); return; }

    if (target.closest('[data-r24-new-prep]')) { openPrepEditor(); return; }
    if (target.closest('[data-r24-prep-add-line]')) { addPrepLine(); return; }
    var removePrep = target.closest('[data-r24-prep-remove-line]');
    if (removePrep) {
      var prepLine = removePrep.closest('.pmd-inv-r24-prep-line');
      if (prepLine) prepLine.remove();
      return;
    }
    if (target.closest('[data-r24-prep-save]')) { savePreparation(); return; }
    var produce = target.closest('[data-r24-produce-prep]');
    if (produce) { openProduce(produce.getAttribute('data-r24-produce-prep')); return; }
    if (target.closest('[data-r24-produce-submit]')) { submitProduction(); return; }

    if (target.closest('[data-r24-export-stock]')) { exportStock(); return; }
    if (target.closest('[data-r24-export-purchases]')) { exportPurchases(); return; }

    if (target.closest('[data-r24-barcode-camera]')) { startCamera(); return; }
    if (target.closest('[data-r24-barcode-camera-stop]')) { stopCamera(); return; }

    if (target.closest('[data-r24-close-floating]')) {
      var floating = target.closest('[data-r24-floating]');
      if (floating) floating.hidden = true;
      return;
    }

    if (target.closest('[data-r24-close-editor]')) {
      var editor = target.closest('.pmd-inv-r24-editor');
      if (editor) editor.hidden = true;
    }
  });

  root.addEventListener('pmd:inventory-snapshot', render);
  window.addEventListener('pagehide', stopCamera);

  window.PMDInventoryOperationsR24 = {
    version:'24.0.0',
    render:render,
    stopCamera:stopCamera
  };

  render();
}());
