/* PMD_INVENTORY_OPERATIONS_R24
 * Supplier/product master, purchase orders, storage/expiry, prep/production,
 * reports/settings and camera-assisted barcode scanning.
 * No observers, timers or second Menu runtime ownership.
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
  var cameraRunning = false;
  var lastCameraCode = '';
  var lastCameraAt = 0;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function snapshot() {
    return api.getSnapshot ? (api.getSnapshot() || {}) : {};
  }

  function ops() {
    var value = snapshot().operations;
    return value && typeof value === 'object' ? value : {};
  }

  function items() {
    return Array.isArray(snapshot().items) ? snapshot().items : [];
  }

  function money(value) {
    var cfg = api.getConfig ? api.getConfig() : {};
    var currency = String(cfg.currency || 'EUR');
    var n = Number(value || 0);
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

  function num(value, digits) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: typeof digits === 'number' ? digits : 2
    }).format(n);
  }

  function dateLabel(value) {
    if (!value) return '—';
    var d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat(undefined, {
        year:'numeric', month:'short', day:'2-digit'
      }).format(d);
    } catch (ignore) {
      return String(value);
    }
  }

  function dateTimeLabel(value) {
    if (!value) return '—';
    var d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat(undefined, {
        month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'
      }).format(d);
    } catch (ignore) {
      return String(value);
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

  function apply(json) {
    if (json && json.snapshot && api.applySnapshot) {
      api.applySnapshot(json.snapshot);
    }
    renderAll();
    return json;
  }

  function action(handler, payload, success) {
    return api.request(handler, payload || {})
      .then(apply)
      .then(function (json) {
        if (success) toast(success, false);
        return json;
      })
      .catch(function (error) {
        toast(error && error.message ? error.message : 'Inventory action failed.', true);
        throw error;
      });
  }

  function options(rows, valueKey, labelFn, selected, emptyLabel) {
    var html = emptyLabel != null
      ? '<option value="">' + esc(emptyLabel) + '</option>'
      : '';
    rows.forEach(function (row) {
      var value = row[valueKey];
      html += '<option value="' + esc(value) + '"' +
        (String(selected || '') === String(value) ? ' selected' : '') + '>' +
        esc(labelFn(row)) + '</option>';
    });
    return html;
  }

  function itemOptions(selected, emptyLabel) {
    return options(items().slice().sort(function (a,b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    }), 'id', function (row) {
      return String(row.name || '') + ' · ' + String(row.unit || 'piece');
    }, selected, emptyLabel == null ? 'Choose item' : emptyLabel);
  }

  function supplierOptions(selected, emptyLabel) {
    var rows = Array.isArray(ops().suppliers) ? ops().suppliers : [];
    return options(rows, 'id', function (row) {
      return String(row.name || '');
    }, selected, emptyLabel == null ? 'Choose supplier' : emptyLabel);
  }

  function storageOptions(selected, emptyLabel) {
    var rows = Array.isArray(ops().storage_locations) ? ops().storage_locations : [];
    return options(rows, 'id', function (row) {
      return String(row.name || '');
    }, selected, emptyLabel == null ? 'Choose storage' : emptyLabel);
  }

  function setSelect(selector, html, keepValue) {
    var node = workspace.querySelector(selector);
    if (!node) return;
    var current = keepValue ? node.value : '';
    node.innerHTML = html;
    if (keepValue && current) node.value = current;
  }

  function showR24Mode(mode) {
    workspace.querySelectorAll('[data-r19-pane]').forEach(function (pane) {
      pane.hidden = true;
      pane.classList.remove('is-active');
    });
    workspace.querySelectorAll('[data-r19-mode]').forEach(function (button) {
      button.classList.remove('is-active');
    });
    workspace.querySelectorAll('[data-r24-pane]').forEach(function (pane) {
      var active = pane.getAttribute('data-r24-pane') === mode;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });
    workspace.querySelectorAll('[data-r24-mode]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-r24-mode') === mode);
    });
    renderAll();
  }

  function leaveR24Modes() {
    workspace.querySelectorAll('[data-r24-pane]').forEach(function (pane) {
      pane.hidden = true;
      pane.classList.remove('is-active');
    });
    workspace.querySelectorAll('[data-r24-mode]').forEach(function (button) {
      button.classList.remove('is-active');
    });
  }

  function renderPurchaseMeta() {
    var select = workspace.querySelector('[data-r24-purchase-supplier-id]');
    if (select) {
      var current = select.value;
      select.innerHTML = supplierOptions(current, 'Choose supplier');
      if (current) select.value = current;
    }
  }

  function renderSuppliers() {
    var suppliers = Array.isArray(ops().suppliers) ? ops().suppliers : [];
    var host = workspace.querySelector('[data-r24-supplier-list]');
    if (host) {
      host.innerHTML = suppliers.length
        ? suppliers.map(function (row) {
            return '<article class="pmd-inv-r24-list-row">' +
              '<div><strong>' + esc(row.name) + '</strong><small>' +
              esc([
                row.order_email || row.email || '',
                row.lead_time_days ? row.lead_time_days + 'd lead time' : '',
                row.minimum_order_value ? 'Min ' + money(row.minimum_order_value) : ''
              ].filter(Boolean).join(' · ') || 'Supplier') +
              '</small></div><b>' + esc(row.phone || '') + '</b>' +
            '</article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No suppliers yet.</div>';
    }

    setSelect('[data-r24-si-supplier]', supplierOptions('', 'Choose supplier'), true);
    setSelect('[data-r24-si-item]', itemOptions('', 'Choose stock item'), true);
    setSelect('[data-r24-po-supplier]', supplierOptions('', 'Choose supplier'), true);

    var identifiers = Array.isArray(ops().identifiers) ? ops().identifiers : [];
    var idHost = workspace.querySelector('[data-r24-identifier-list]');
    if (idHost) {
      idHost.innerHTML = identifiers.length
        ? identifiers.map(function (row) {
            return '<article class="pmd-inv-r24-list-row pmd-inv-r24-list-row--code">' +
              '<div><strong>' + esc(row.item_name) + '</strong>' +
              '<small>' + esc((row.package_quantity || 1) + ' ' + row.package_unit +
                ' · ' + num(row.base_quantity,4) + ' ' + row.base_unit +
                (row.supplier_name ? ' · ' + row.supplier_name : '')) + '</small></div>' +
              '<code>' + esc(row.code) + '</code>' +
            '</article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No product codes linked yet.</div>';
    }
  }

  function poLineHtml(data) {
    data = data || {};
    return '<div class="pmd-inv-r24-line" data-r24-po-line>' +
      '<select data-r24-po-line-item>' + itemOptions(data.item_id || '', 'Choose item') + '</select>' +
      '<input type="number" min="0.0001" step="0.0001" value="' + esc(data.quantity || 1) + '" data-r24-po-line-qty aria-label="Quantity">' +
      '<input value="' + esc(data.package_unit || 'case') + '" data-r24-po-line-unit aria-label="Package unit">' +
      '<input type="number" min="0.0001" step="0.0001" value="' + esc(data.base_quantity || 1) + '" data-r24-po-line-base aria-label="Base quantity">' +
      '<input type="number" min="0" step="0.01" value="' + esc(data.unit_cost || 0) + '" data-r24-po-line-cost aria-label="Unit cost">' +
      '<button type="button" data-r24-po-remove-line aria-label="Remove">×</button>' +
    '</div>';
  }

  function addPoLine(data) {
    var host = workspace.querySelector('[data-r24-po-lines]');
    if (!host) return;
    host.insertAdjacentHTML('beforeend', poLineHtml(data));
    updatePoTotal();
  }

  function updatePoTotal() {
    var total = 0;
    workspace.querySelectorAll('[data-r24-po-line]').forEach(function (row) {
      var qty = Number((row.querySelector('[data-r24-po-line-qty]') || {}).value || 0);
      var cost = Number((row.querySelector('[data-r24-po-line-cost]') || {}).value || 0);
      total += Math.max(0, qty) * Math.max(0, cost);
    });
    var out = workspace.querySelector('[data-r24-po-total]');
    if (out) out.textContent = money(total);
  }

  function collectPoLines() {
    return Array.prototype.slice.call(workspace.querySelectorAll('[data-r24-po-line]')).map(function (row) {
      return {
        item_id:Number((row.querySelector('[data-r24-po-line-item]') || {}).value || 0),
        quantity:Number((row.querySelector('[data-r24-po-line-qty]') || {}).value || 0),
        package_unit:String((row.querySelector('[data-r24-po-line-unit]') || {}).value || 'piece'),
        base_quantity:Number((row.querySelector('[data-r24-po-line-base]') || {}).value || 1),
        unit_cost:Number((row.querySelector('[data-r24-po-line-cost]') || {}).value || 0),
        supplier_item_id:Number(row.getAttribute('data-r24-supplier-item-id') || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.quantity > 0;
    });
  }

  function renderOrders() {
    var host = workspace.querySelector('[data-r24-po-lines]');
    if (host && !host.children.length) addPoLine({});

    var orders = Array.isArray(ops().purchase_orders) ? ops().purchase_orders : [];
    var list = workspace.querySelector('[data-r24-po-list]');
    if (!list) return;

    list.innerHTML = orders.length
      ? orders.map(function (po) {
          var status = String(po.status || 'draft');
          var open = ['draft','sent','partially_received'].indexOf(status) !== -1;
          var lines = Array.isArray(po.lines) ? po.lines : [];
          var lineHtml = lines.map(function (line) {
            var remaining = Math.max(0, Number(line.quantity_ordered || 0) - Number(line.quantity_received || 0));
            var item = items().find(function (row) {
              return Number(row.id) === Number(line.item_id);
            });
            var storageId = Number(item && item.default_storage_location_id || 0);

            return '<div class="pmd-inv-r24-po-line pmd-inv-r24-po-line--receive" data-r24-receive-line="' + esc(line.id) + '">' +
              '<span><strong>' + esc(line.item_name) + '</strong><small>' +
              esc(num(line.quantity_received,2) + '/' + num(line.quantity_ordered,2) + ' ' + line.package_unit +
                ' · ' + num(line.base_quantity,4) + ' ' + line.base_unit + ' / ' + line.package_unit) +
              '</small></span>' +
              (open && remaining > 0
                ? '<div class="pmd-inv-r24-receive-line-fields">' +
                    '<input type="number" min="0" max="' + esc(remaining) + '" step="0.01" value="' + esc(remaining) + '" data-r24-receive-qty aria-label="Quantity to receive">' +
                    '<input type="number" min="0" step="0.01" value="' + esc(line.unit_cost || 0) + '" data-r24-receive-cost aria-label="Actual cost per package">' +
                    '<select data-r24-receive-storage aria-label="Storage">' + storageOptions(storageId, 'Default storage') + '</select>' +
                    '<input type="text" placeholder="Lot / batch" data-r24-receive-lot aria-label="Lot or batch">' +
                    '<input type="date" data-r24-receive-expiry aria-label="Expiry date">' +
                  '</div>'
                : '<b>' + esc(money(line.line_total)) + '</b>') +
            '</div>';
          }).join('');

          var lifecycle = '<div class="pmd-inv-r24-po-actions">';
          if (status === 'draft') {
            lifecycle += '<button type="button" class="pmd-inv-r19-secondary" data-r24-po-status="sent" data-r24-po-status-id="' + esc(po.id) + '">Mark sent</button>';
            lifecycle += '<button type="button" class="pmd-inv-r19-secondary" data-r24-po-status="cancelled" data-r24-po-status-id="' + esc(po.id) + '">Cancel PO</button>';
          } else if (status === 'sent' || status === 'partially_received') {
            lifecycle += '<button type="button" class="pmd-inv-r19-secondary" data-r24-po-status="cancelled" data-r24-po-status-id="' + esc(po.id) + '">Cancel remaining</button>';
          } else if (status === 'received') {
            lifecycle += '<button type="button" class="pmd-inv-r19-secondary" data-r24-po-status="closed" data-r24-po-status-id="' + esc(po.id) + '">Close PO</button>';
          }
          lifecycle += '</div>';

          return '<article class="pmd-inv-r24-po" data-r24-po="' + esc(po.id) + '">' +
            '<header><div><strong>' + esc(po.po_number) + '</strong><small>' +
            esc((po.supplier_name || 'Supplier not set') + ' · ' + (po.expected_at ? 'Expected ' + dateLabel(po.expected_at) : 'No expected date')) +
            '</small></div><span class="is-' + esc(status) + '">' + esc(status.replace(/_/g,' ')) + '</span></header>' +
            '<div class="pmd-inv-r24-po-lines">' + lineHtml + '</div>' +
            (open ? '<div class="pmd-inv-r24-receive-meta">' +
              '<input placeholder="Invoice number" data-r24-receive-invoice>' +
              '<input placeholder="Delivery note" data-r24-receive-delivery>' +
              '<button type="button" class="pmd-inv-r19-primary" data-r24-receive-po="' + esc(po.id) + '">Receive selected</button>' +
            '</div>' : '') +
            lifecycle +
          '</article>';
        }).join('')
      : '<div class="pmd-inv-r19-empty">No purchase orders yet.</div>';
  }

  function renderStorage() {
    setSelect('[data-r24-transfer-item]', itemOptions('', 'Choose item'), true);
    setSelect('[data-r24-transfer-from]', storageOptions('', 'From'), true);
    setSelect('[data-r24-transfer-to]', storageOptions('', 'To'), true);
    setSelect('[data-r24-prod-storage]', storageOptions('', 'Default storage'), true);
    setSelect('[data-r24-return-item]', itemOptions('', 'Choose item'), true);
    setSelect('[data-r24-return-supplier]', supplierOptions('', 'Supplier / optional'), true);
    setSelect('[data-r24-return-storage]', storageOptions('', 'Default storage'), true);

    var locations = Array.isArray(ops().storage_locations) ? ops().storage_locations : [];
    var locationHost = workspace.querySelector('[data-r24-storage-list]');
    if (locationHost) {
      locationHost.innerHTML = locations.length
        ? locations.map(function (row) {
            return '<article class="pmd-inv-r24-list-row"><div><strong>' +
              esc(row.name) + '</strong><small>' + esc(row.kind) +
              '</small></div><code>' + esc(row.code) + '</code></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No storage locations.</div>';
    }

    var batches = Array.isArray(ops().batches) ? ops().batches : [];
    var batchHost = workspace.querySelector('[data-r24-batch-list]');
    if (batchHost) {
      batchHost.innerHTML = batches.length
        ? batches.map(function (row) {
            var expiryClass = '';
            if (row.expiry_date) {
              var today = new Date();
              today.setHours(0,0,0,0);
              var exp = new Date(String(row.expiry_date) + 'T00:00:00');
              var days = Math.round((exp.getTime() - today.getTime()) / 86400000);
              if (days < 0) expiryClass = ' is-expired';
              else if (days <= Number((ops().settings || {}).expiry_alert_days || 3)) expiryClass = ' is-soon';
            }
            return '<tr class="' + expiryClass + '"><td><strong>' + esc(row.item_name) + '</strong></td>' +
              '<td>' + esc(row.lot_code || '—') + '</td>' +
              '<td>' + esc(row.expiry_date ? dateLabel(row.expiry_date) : '—') + '</td>' +
              '<td>' + esc(num(row.qty_remaining,2) + ' ' + row.base_unit) + '</td>' +
              '<td>' + esc(row.storage_name || 'Main storage') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="5">No tracked lots yet. Add a lot/expiry while receiving stock.</td></tr>';
    }

    var expiring = Array.isArray(ops().expiring_batches) ? ops().expiring_batches : [];
    var expCount = workspace.querySelector('[data-r24-expiry-count]');
    if (expCount) expCount.textContent = String(expiring.length) + ' due soon';

    var transfers = Array.isArray(ops().transfers) ? ops().transfers : [];
    var transferHost = workspace.querySelector('[data-r24-transfer-list]');
    if (transferHost) {
      transferHost.innerHTML = transfers.length
        ? transfers.map(function (row) {
            return '<article class="pmd-inv-r24-list-row"><div><strong>' + esc(row.item_name) +
              '</strong><small>' + esc(row.from_name + ' → ' + row.to_name + ' · ' + dateTimeLabel(row.occurred_at)) +
              '</small></div><b>' + esc(num(row.quantity_base,2) + ' ' + row.base_unit) + '</b></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No storage transfers yet.</div>';
    }
  }

  function productionInputHtml(data) {
    data = data || {};
    return '<div class="pmd-inv-r24-line pmd-inv-r24-line--production" data-r24-prod-input>' +
      '<select data-r24-prod-input-item>' + itemOptions(data.item_id || '', 'Ingredient') + '</select>' +
      '<input type="number" min="0.0001" step="0.0001" value="' + esc(data.qty_base || 1) + '" data-r24-prod-input-qty aria-label="Base quantity">' +
      '<button type="button" data-r24-prod-remove-input aria-label="Remove">×</button>' +
    '</div>';
  }

  function addProductionInput(data) {
    var host = workspace.querySelector('[data-r24-prod-inputs]');
    if (!host) return;
    host.insertAdjacentHTML('beforeend', productionInputHtml(data));
  }

  function renderProduction() {
    setSelect('[data-r24-prod-output]', itemOptions('', 'Prepared stock item'), true);
    var inputs = workspace.querySelector('[data-r24-prod-inputs]');
    if (inputs && !inputs.children.length) addProductionInput({});

    var rows = Array.isArray(ops().production_batches) ? ops().production_batches : [];
    var host = workspace.querySelector('[data-r24-production-list]');
    if (host) {
      host.innerHTML = rows.length
        ? rows.map(function (row) {
            var detail = Array.isArray(row.inputs)
              ? row.inputs.map(function (input) {
                  return num(input.qty_base,2) + ' ' + input.base_unit + ' ' + input.item_name;
                }).join(' · ')
              : '';
            return '<article class="pmd-inv-r24-list-row pmd-inv-r24-list-row--tall"><div><strong>' +
              esc(row.output_name + ' · ' + num(row.quantity_output,2) + ' ' + row.output_unit) +
              '</strong><small>' + esc(detail || 'Production inputs') + '</small><small>' +
              esc(dateTimeLabel(row.produced_at) + (row.staff_name ? ' · ' + row.staff_name : '')) +
              '</small></div><b>' + esc(money(row.quantity_output * row.unit_cost)) + '</b></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No prep batches recorded yet.</div>';
    }
  }

  function renderSettings() {
    var settings = ops().settings || {};
    var consumption = workspace.querySelector('[data-r24-setting-consumption]');
    var valuation = workspace.querySelector('[data-r24-setting-valuation]');
    var safety = workspace.querySelector('[data-r24-setting-safety-days]');
    var expiry = workspace.querySelector('[data-r24-setting-expiry-days]');
    var notifications = workspace.querySelector('[data-r24-setting-notifications]');
    if (consumption) consumption.value = settings.consumption_event || 'paid';
    if (valuation) valuation.value = settings.valuation_method || 'weighted_average';
    if (safety) safety.value = Number(settings.default_safety_days == null ? 2 : settings.default_safety_days);
    if (expiry) expiry.value = Number(settings.expiry_alert_days == null ? 3 : settings.expiry_alert_days);
    if (notifications) notifications.checked = settings.notifications_enabled !== false;
  }

  function renderReports() {
    var analytics = ops().analytics || {};
    var metrics = workspace.querySelector('[data-r24-report-metrics]');
    if (metrics) {
      var summary = snapshot().summary || {};
      var rows = [
        ['Purchases · 30d', money(analytics.purchases_30d || 0)],
        ['Waste · 30d', money(analytics.waste_30d || 0)],
        ['Count variance · 30d', money(analytics.variance_value_30d || 0)],
        ['Theoretical usage · 14d', money(summary.theoretical_usage_cost_14d || 0)],
        ['Forecast usage · next 7d', money(summary.forecast_usage_cost_7d || 0)],
        ['Expiring value', money(analytics.expiring_value || 0)],
        ['Open POs', String(analytics.open_purchase_orders || 0)],
        ['Menu items at risk', String(summary.menu_items_at_risk || 0)]
      ];
      metrics.innerHTML = rows.map(function (row) {
        return '<article><span>' + esc(row[0]) + '</span><strong>' + esc(row[1]) + '</strong></article>';
      }).join('');
    }

    var wasteReasons = Array.isArray(analytics.waste_by_reason) ? analytics.waste_by_reason : [];
    var wasteHost = workspace.querySelector('[data-r24-waste-reasons]');
    if (wasteHost) {
      wasteHost.innerHTML = wasteReasons.length
        ? wasteReasons.map(function (row) {
            return '<article class="pmd-inv-r24-list-row"><div><strong>' +
              esc(row.reason || 'Unspecified') + '</strong><small>Recorded waste value</small></div><b>' +
              esc(money(row.value || 0)) + '</b></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No waste recorded in the last 30 days.</div>';
    }

    var menuRisk = Array.isArray(snapshot().menu_availability_alerts)
      ? snapshot().menu_availability_alerts
      : [];
    var menuRiskHost = workspace.querySelector('[data-r24-menu-risk]');
    if (menuRiskHost) {
      menuRiskHost.innerHTML = menuRisk.length
        ? menuRisk.map(function (row) {
            var blocking = Array.isArray(row.blocking_items) ? row.blocking_items : [];
            var warning = Array.isArray(row.warning_items) ? row.warning_items : [];
            var detail = blocking.length
              ? 'Out: ' + blocking.join(', ')
              : 'Critical: ' + warning.join(', ');
            return '<article class="pmd-inv-r24-list-row"><div><strong>' +
              esc(row.menu_name || ('Menu #' + row.menu_id)) + '</strong><small>' +
              esc(detail) + '</small></div><b>' +
              esc(row.level === 'out' ? 'Stock out' : 'At risk') + '</b></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No recipe-driven menu availability risks.</div>';
    }

    var changes = Array.isArray(analytics.price_changes) ? analytics.price_changes : [];
    var priceHost = workspace.querySelector('[data-r24-price-changes]');
    if (priceHost) {
      priceHost.innerHTML = changes.length
        ? changes.map(function (row) {
            var sign = Number(row.change_pct || 0) > 0 ? '+' : '';
            return '<article class="pmd-inv-r24-list-row"><div><strong>' + esc(row.item_name) +
              '</strong><small>' + esc(row.supplier_name || 'Supplier') + '</small></div><b>' +
              esc(sign + num(row.change_pct,1) + '%') + '</b></article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No supplier price changes recorded yet.</div>';
    }

    var receipts = Array.isArray(snapshot().recent_purchases) ? snapshot().recent_purchases : [];
    var receiptHost = workspace.querySelector('[data-r24-receipt-corrections]');
    if (receiptHost) {
      receiptHost.innerHTML = receipts.length
        ? receipts.map(function (row) {
            var reversed = String(row.status || '') === 'reversed' || Boolean(row.reversed_at);
            var detail = [
              row.supplier_name || 'Supplier',
              row.invoice_number ? 'Invoice ' + row.invoice_number : '',
              row.purchased_at ? dateLabel(row.purchased_at) : '',
              money(row.total_amount || 0)
            ].filter(Boolean).join(' · ');
            return '<article class="pmd-inv-r24-list-row pmd-inv-r24-list-row--receipt">' +
              '<div><strong>Receipt #' + esc(row.id) + (reversed ? ' · reversed' : '') + '</strong>' +
              '<small>' + esc(detail) + '</small></div>' +
              (!reversed
                ? '<button type="button" class="pmd-inv-r24-danger-action" data-r24-reverse-receipt="' + esc(row.id) + '">Reverse</button>'
                : '<b>Reversed</b>') +
            '</article>';
          }).join('')
        : '<div class="pmd-inv-r19-empty">No confirmed purchase receipts yet.</div>';
    }

    var ledger = Array.isArray(ops().ledger) ? ops().ledger : [];
    var ledgerHost = workspace.querySelector('[data-r24-ledger]');
    if (ledgerHost) {
      ledgerHost.innerHTML = ledger.length
        ? ledger.map(function (row) {
            var sign = Number(row.qty_delta || 0) > 0 ? '+' : '';
            return '<tr><td>' + esc(dateTimeLabel(row.occurred_at)) + '</td><td><strong>' +
              esc(row.item_name) + '</strong></td><td>' + esc(String(row.movement_type || '').replace(/_/g,' ')) +
              '</td><td>' + esc(sign + num(row.qty_delta,3) + ' ' + row.base_unit) +
              '</td><td>' + esc(money(row.value || 0)) + '</td><td>' +
              esc(row.storage_name || '—') + '</td><td>' + esc(row.staff_name || '—') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="7">No inventory movements yet.</td></tr>';
    }

    renderSettings();
  }

  function renderAll() {
    renderPurchaseMeta();
    renderSuppliers();
    renderOrders();
    renderStorage();
    renderProduction();
    renderReports();
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv(name, rows) {
    var csv = rows.map(function (row) {
      return row.map(csvCell).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportStock() {
    var rows = [['Item','Category','On hand','Base unit','Stock value','Supplier','Days left','Status']];
    items().forEach(function (item) {
      rows.push([
        item.name || '',
        item.category || '',
        item.estimated_on_hand || 0,
        item.unit || '',
        item.stock_value || 0,
        item.supplier_name || '',
        item.days_left == null ? '' : item.days_left,
        item.status || ''
      ]);
    });
    downloadCsv('paymydine-stock.csv', rows);
  }

  function exportLedger() {
    var rows = [['Time','Item','Movement','Quantity','Unit','Value','Storage','Staff','Reason']];
    (ops().ledger || []).forEach(function (row) {
      rows.push([
        row.occurred_at || '', row.item_name || '', row.movement_type || '',
        row.qty_delta || 0, row.base_unit || '', row.value || 0,
        row.storage_name || '', row.staff_name || '', row.reason || ''
      ]);
    });
    downloadCsv('paymydine-inventory-ledger.csv', rows);
  }

  function triggerBarcode(code) {
    var input = workspace.querySelector('[data-r19-barcode-input]');
    if (!input) return;
    input.value = String(code || '');
    input.focus();
    var event;
    try {
      event = new KeyboardEvent('keydown', {key:'Enter', code:'Enter', bubbles:true});
    } catch (ignore) {
      event = document.createEvent('Event');
      event.initEvent('keydown', true, true);
      event.key = 'Enter';
    }
    input.dispatchEvent(event);
  }

  function stopCamera() {
    cameraRunning = false;
    if (cameraFrame) {
      cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) { track.stop(); });
      cameraStream = null;
    }
    var wrap = workspace.querySelector('[data-r24-camera]');
    var start = workspace.querySelector('[data-r24-camera-start]');
    var stop = workspace.querySelector('[data-r24-camera-stop]');
    if (wrap) wrap.hidden = true;
    if (start) start.hidden = false;
    if (stop) stop.hidden = true;
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Camera scanning is not supported in this browser. Use the USB/Bluetooth scanner input.', true);
      return;
    }
    if (!('BarcodeDetector' in window)) {
      toast('This browser does not expose BarcodeDetector. Use Chrome/Android or a USB/Bluetooth scanner.', true);
      return;
    }

    var formats = ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code','data_matrix'];
    var detector;
    try {
      detector = new BarcodeDetector({formats:formats});
    } catch (error) {
      detector = new BarcodeDetector();
    }

    navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'}},
      audio:false
    }).then(function (stream) {
      cameraStream = stream;
      cameraRunning = true;
      var video = workspace.querySelector('[data-r24-camera-video]');
      var wrap = workspace.querySelector('[data-r24-camera]');
      var start = workspace.querySelector('[data-r24-camera-start]');
      var stop = workspace.querySelector('[data-r24-camera-stop]');
      if (video) {
        video.srcObject = stream;
        video.play().catch(function () {});
      }
      if (wrap) wrap.hidden = false;
      if (start) start.hidden = true;
      if (stop) stop.hidden = false;

      var scan = function () {
        if (!cameraRunning || !video) return;
        if (video.readyState >= 2) {
          detector.detect(video).then(function (codes) {
            if (!codes || !codes.length) return;
            var raw = String(codes[0].rawValue || '');
            var now = Date.now();
            if (!raw || (raw === lastCameraCode && now - lastCameraAt < 1800)) return;
            lastCameraCode = raw;
            lastCameraAt = now;
            triggerBarcode(raw);
          }).catch(function () {});
        }
        cameraFrame = requestAnimationFrame(scan);
      };
      scan();
    }).catch(function (error) {
      toast(error && error.message ? error.message : 'Could not open the camera.', true);
      stopCamera();
    });
  }

  workspace.addEventListener('click', function (event) {
    var r24 = event.target.closest('[data-r24-mode]');
    if (r24) {
      event.preventDefault();
      showR24Mode(r24.getAttribute('data-r24-mode'));
      return;
    }

    if (event.target.closest('[data-r19-mode]')) {
      leaveR24Modes();
      return;
    }

    if (event.target.closest('[data-r24-po-add-line]')) {
      addPoLine({});
      return;
    }

    var removePo = event.target.closest('[data-r24-po-remove-line]');
    if (removePo) {
      var poLine = removePo.closest('[data-r24-po-line]');
      if (poLine) poLine.remove();
      if (!workspace.querySelector('[data-r24-po-line]')) addPoLine({});
      updatePoTotal();
      return;
    }

    if (event.target.closest('[data-r24-prod-add-input]')) {
      addProductionInput({});
      return;
    }

    var removeInput = event.target.closest('[data-r24-prod-remove-input]');
    if (removeInput) {
      var inputRow = removeInput.closest('[data-r24-prod-input]');
      if (inputRow) inputRow.remove();
      if (!workspace.querySelector('[data-r24-prod-input]')) addProductionInput({});
      return;
    }

    var receive = event.target.closest('[data-r24-receive-po]');
    if (receive) {
      var poNode = receive.closest('[data-r24-po]');
      var poId = Number(receive.getAttribute('data-r24-receive-po') || 0);
      var lines = [];
      if (poNode) {
        poNode.querySelectorAll('[data-r24-receive-line]').forEach(function (lineNode) {
          var input = lineNode.querySelector('[data-r24-receive-qty]');
          var qty = Number(input && input.value || 0);
          if (qty > 0) {
            lines.push({
              line_id:Number(lineNode.getAttribute('data-r24-receive-line') || 0),
              quantity:qty,
              unit_cost:Number((lineNode.querySelector('[data-r24-receive-cost]') || {}).value || 0),
              storage_location_id:Number((lineNode.querySelector('[data-r24-receive-storage]') || {}).value || 0),
              lot_code:String((lineNode.querySelector('[data-r24-receive-lot]') || {}).value || ''),
              expiry_date:String((lineNode.querySelector('[data-r24-receive-expiry]') || {}).value || '')
            });
          }
        });
      }
      if (!lines.length) {
        toast('Enter at least one quantity to receive.', true);
        return;
      }
      action('onReceivePurchaseOrder', {
        purchase_order_id:poId,
        invoice_number:poNode ? String((poNode.querySelector('[data-r24-receive-invoice]') || {}).value || '') : '',
        delivery_note_number:poNode ? String((poNode.querySelector('[data-r24-receive-delivery]') || {}).value || '') : '',
        lines:lines
      }, 'Purchase order received into stock.');
      return;
    }

    var poStatus = event.target.closest('[data-r24-po-status]');
    if (poStatus) {
      var nextStatus = String(poStatus.getAttribute('data-r24-po-status') || '');
      var poStatusId = Number(poStatus.getAttribute('data-r24-po-status-id') || 0);
      if (nextStatus === 'cancelled' && !window.confirm('Cancel the remaining quantity on this purchase order? Already received stock stays in the ledger.')) return;
      action('onUpdatePurchaseOrderStatus', {
        purchase_order_id:poStatusId,
        status:nextStatus
      }, nextStatus === 'sent' ? 'Purchase order marked as sent.' : 'Purchase order updated.');
      return;
    }

    var reverseReceipt = event.target.closest('[data-r24-reverse-receipt]');
    if (reverseReceipt) {
      var receiptId = Number(reverseReceipt.getAttribute('data-r24-reverse-receipt') || 0);
      if (!receiptId || !window.confirm('Reverse this confirmed purchase? PayMyDine will create opposite ledger movements; the audit history remains visible.')) return;
      action('onReversePurchase', {receipt_id:receiptId}, 'Purchase reversed with an audit trail.');
      return;
    }

    if (event.target.closest('[data-r24-export-stock]')) {
      exportStock();
      return;
    }
    if (event.target.closest('[data-r24-export-ledger]')) {
      exportLedger();
      return;
    }
    if (event.target.closest('[data-r24-camera-start]')) {
      startCamera();
      return;
    }
    if (event.target.closest('[data-r24-camera-stop]')) {
      stopCamera();
      return;
    }
  });

  workspace.addEventListener('input', function (event) {
    if (event.target.matches('[data-r24-po-line-qty],[data-r24-po-line-cost]')) {
      updatePoTotal();
    }
  });

  workspace.addEventListener('change', function (event) {
    if (event.target.matches('[data-r24-purchase-supplier-id]')) {
      var suppliers = Array.isArray(ops().suppliers) ? ops().suppliers : [];
      var row = suppliers.find(function (supplier) {
        return Number(supplier.id) === Number(event.target.value || 0);
      });
      var input = workspace.querySelector('[data-r19-purchase-supplier]');
      if (input && row) input.value = row.name || '';
    }

    if (event.target.matches('[data-r24-po-line-item]')) {
      var line = event.target.closest('[data-r24-po-line]');
      var itemId = Number(event.target.value || 0);
      var supplierId = Number((workspace.querySelector('[data-r24-po-supplier]') || {}).value || 0);
      var packages = Array.isArray(ops().supplier_items) ? ops().supplier_items : [];
      var match = packages.find(function (row) {
        return Number(row.item_id) === itemId && (!supplierId || Number(row.supplier_id) === supplierId) && row.is_preferred;
      }) || packages.find(function (row) {
        return Number(row.item_id) === itemId && (!supplierId || Number(row.supplier_id) === supplierId);
      });
      if (line && match) {
        var unit = line.querySelector('[data-r24-po-line-unit]');
        var base = line.querySelector('[data-r24-po-line-base]');
        var cost = line.querySelector('[data-r24-po-line-cost]');
        line.setAttribute('data-r24-supplier-item-id', String(match.id || ''));
        if (unit) unit.value = match.package_unit || 'piece';
        if (base) base.value = Number(match.base_quantity || 1);
        if (cost) cost.value = Number(match.price || 0);
        updatePoTotal();
      }
    }
  });

  workspace.addEventListener('submit', function (event) {
    var form = event.target;

    if (form.matches('[data-r24-supplier-form]')) {
      event.preventDefault();
      action('onSaveSupplier', {
        name:String((form.querySelector('[data-r24-supplier-name]') || {}).value || ''),
        contact_name:String((form.querySelector('[data-r24-supplier-contact]') || {}).value || ''),
        email:String((form.querySelector('[data-r24-supplier-email]') || {}).value || ''),
        order_email:String((form.querySelector('[data-r24-supplier-order-email]') || {}).value || ''),
        phone:String((form.querySelector('[data-r24-supplier-phone]') || {}).value || ''),
        lead_time_days:Number((form.querySelector('[data-r24-supplier-lead]') || {}).value || 0),
        minimum_order_value:Number((form.querySelector('[data-r24-supplier-min-value]') || {}).value || 0)
      }, 'Supplier saved.').then(function () { form.reset(); });
      return;
    }

    if (form.matches('[data-r24-supplier-item-form]')) {
      event.preventDefault();
      action('onSaveSupplierItem', {
        supplier_id:Number((form.querySelector('[data-r24-si-supplier]') || {}).value || 0),
        item_id:Number((form.querySelector('[data-r24-si-item]') || {}).value || 0),
        supplier_sku:String((form.querySelector('[data-r24-si-sku]') || {}).value || ''),
        barcode:String((form.querySelector('[data-r24-si-barcode]') || {}).value || ''),
        package_unit:String((form.querySelector('[data-r24-si-unit]') || {}).value || 'piece'),
        package_quantity:Number((form.querySelector('[data-r24-si-package-qty]') || {}).value || 1),
        base_quantity:Number((form.querySelector('[data-r24-si-base-qty]') || {}).value || 1),
        price:Number((form.querySelector('[data-r24-si-price]') || {}).value || 0),
        minimum_order_qty:Number((form.querySelector('[data-r24-si-min]') || {}).value || 0),
        order_multiple:Number((form.querySelector('[data-r24-si-multiple]') || {}).value || 1),
        is_preferred:Boolean((form.querySelector('[data-r24-si-preferred]') || {}).checked)
      }, 'Supplier package and code saved.');
      return;
    }

    if (form.matches('[data-r24-storage-form]')) {
      event.preventDefault();
      action('onSaveStorageLocation', {
        name:String((form.querySelector('[data-r24-storage-name]') || {}).value || ''),
        code:String((form.querySelector('[data-r24-storage-code]') || {}).value || ''),
        kind:String((form.querySelector('[data-r24-storage-kind]') || {}).value || 'storage')
      }, 'Storage location added.').then(function () { form.reset(); });
      return;
    }

    if (form.matches('[data-r24-transfer-form]')) {
      event.preventDefault();
      action('onTransferStock', {
        item_id:Number((form.querySelector('[data-r24-transfer-item]') || {}).value || 0),
        from_storage_location_id:Number((form.querySelector('[data-r24-transfer-from]') || {}).value || 0),
        to_storage_location_id:Number((form.querySelector('[data-r24-transfer-to]') || {}).value || 0),
        quantity_base:Number((form.querySelector('[data-r24-transfer-qty]') || {}).value || 0),
        note:String((form.querySelector('[data-r24-transfer-note]') || {}).value || '')
      }, 'Stock transferred.').then(function () { form.reset(); renderAll(); });
      return;
    }

    if (form.matches('[data-r24-po-form]')) {
      event.preventDefault();
      var lines = collectPoLines();
      if (!lines.length) {
        toast('Add at least one purchase-order item.', true);
        return;
      }
      action('onSavePurchaseOrder', {
        supplier_id:Number((form.querySelector('[data-r24-po-supplier]') || {}).value || 0),
        expected_at:String((form.querySelector('[data-r24-po-expected]') || {}).value || ''),
        notes:String((form.querySelector('[data-r24-po-notes]') || {}).value || ''),
        status:'draft',
        lines:lines
      }, 'Purchase order created.').then(function () {
        var lineHost = form.querySelector('[data-r24-po-lines]');
        if (lineHost) lineHost.innerHTML = '';
        addPoLine({});
        form.reset();
        renderAll();
      });
      return;
    }

    if (form.matches('[data-r24-production-form]')) {
      event.preventDefault();
      var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-r24-prod-input]')).map(function (row) {
        return {
          item_id:Number((row.querySelector('[data-r24-prod-input-item]') || {}).value || 0),
          qty_base:Number((row.querySelector('[data-r24-prod-input-qty]') || {}).value || 0)
        };
      }).filter(function (line) { return line.item_id > 0 && line.qty_base > 0; });

      action('onRecordProduction', {
        output_item_id:Number((form.querySelector('[data-r24-prod-output]') || {}).value || 0),
        quantity_output:Number((form.querySelector('[data-r24-prod-output-qty]') || {}).value || 0),
        storage_location_id:Number((form.querySelector('[data-r24-prod-storage]') || {}).value || 0),
        note:String((form.querySelector('[data-r24-prod-note]') || {}).value || ''),
        inputs:inputs
      }, 'Production batch recorded.').then(function () {
        var inputHost = form.querySelector('[data-r24-prod-inputs]');
        if (inputHost) inputHost.innerHTML = '';
        addProductionInput({});
        form.reset();
        renderAll();
      });
      return;
    }

    if (form.matches('[data-r24-return-form]')) {
      event.preventDefault();
      action('onReturnToSupplier', {
        item_id:Number((form.querySelector('[data-r24-return-item]') || {}).value || 0),
        supplier_id:Number((form.querySelector('[data-r24-return-supplier]') || {}).value || 0),
        storage_location_id:Number((form.querySelector('[data-r24-return-storage]') || {}).value || 0),
        quantity_base:Number((form.querySelector('[data-r24-return-qty]') || {}).value || 0),
        note:String((form.querySelector('[data-r24-return-note]') || {}).value || '')
      }, 'Supplier return recorded in the inventory ledger.').then(function () {
        form.reset();
        renderAll();
      });
      return;
    }

    if (form.matches('[data-r24-settings-form]')) {
      event.preventDefault();
      action('onSaveInventorySettings', {
        consumption_event:String((form.querySelector('[data-r24-setting-consumption]') || {}).value || 'paid'),
        valuation_method:String((form.querySelector('[data-r24-setting-valuation]') || {}).value || 'weighted_average'),
        default_safety_days:Number((form.querySelector('[data-r24-setting-safety-days]') || {}).value || 2),
        expiry_alert_days:Number((form.querySelector('[data-r24-setting-expiry-days]') || {}).value || 3),
        notifications_enabled:Boolean((form.querySelector('[data-r24-setting-notifications]') || {}).checked)
      }, 'Inventory settings saved.');
    }
  });

  root.addEventListener('pmd:inventory-snapshot', function () {
    renderAll();
  });

  window.addEventListener('beforeunload', stopCamera);

  renderAll();

  window.PMDInventoryOperationsR24 = {
    version:'24.0.0',
    render:renderAll,
    show:showR24Mode,
    startCamera:startCamera,
    stopCamera:stopCamera
  };
}());
