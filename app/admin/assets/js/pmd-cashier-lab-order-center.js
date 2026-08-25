(function () {
  'use strict';

  // PMD_CASHIER_ORDER_CENTER_UI_R50

  // PMD_CASHIER_ORDER_CENTER_R37C
  // Operational/payment separation + inline documents.

  // PMD_CASHIER_ORDER_MUTATION_R39
  // Existing bill mutation is allowed only before payment starts.

  if (window.PMDCashierOrderCenter) return;

  var state = {
    shell: null,
    card: null,
    trigger: null,
    orderId: 0,
    payment: null,
    operations: null,
    posHost: null,
    posApi: null,
    documentFrame: null,
    voidDialog: null,
    voidTarget: null,
    dirty: false
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c];
    });
  }

  function num(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function money(value, symbol) {
    return String(symbol || '€') + num(value).toFixed(2);
  }

  async function fetchJson(url, options) {
    var response = await fetch(url, Object.assign({
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, options || {}));

    var json = await response.json().catch(function () {
      return {};
    });

    if (!response.ok || json.ok === false) {
      throw new Error(
        json.message ||
        json.error ||
        ('HTTP ' + response.status)
      );
    }

    return json;
  }

  function cardText(selector) {
    var el = state.card ? state.card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
  }

  function ensureShell() {
    if (state.shell) return state.shell;

    var shell = document.createElement('div');
    shell.className = 'pmd-cashier-order-center';
    shell.hidden = true;
    shell.setAttribute('aria-hidden', 'true');

    shell.innerHTML = [
      '<section class="pmd-cashier-order-center__dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-cashier-r37-title">',
        '<header class="pmd-cashier-order-center__header">',
          '<div class="pmd-cashier-order-center__identity">',
            '<span class="pmd-cashier-order-center__eyebrow">Cashier · Order center</span>',
            '<h2 id="pmd-cashier-r37-title" data-pmd-r37-title>Order</h2>',
            '<p data-pmd-r37-subtitle></p>',
          '</div>',
          '<button type="button" class="pmd-cashier-order-center__close" data-pmd-r37-close aria-label="Close">×</button>',
        '</header>',
        '<div class="pmd-cashier-order-center__body" data-pmd-r37-body></div>',
        '<footer class="pmd-cashier-order-center__footer" data-pmd-r37-footer></footer>',
      '</section>'
    ].join('');

    document.body.appendChild(shell);
    state.shell = shell;

    shell.addEventListener('click', function (event) {
      var close = event.target.closest('[data-pmd-r37-close]');
      if (close) {
        event.preventDefault();
        closeCenter();
        return;
      }

      var action = event.target.closest('[data-pmd-r37-action]');
      if (!action) return;

      var type = action.getAttribute('data-pmd-r37-action');

      if (type === 'refresh') {
        event.preventDefault();
        loadDetails();
        return;
      }

      if (type === 'items') {
        event.preventDefault();
        openPos('items');
        return;
      }

      if (type === 'payment') {
        event.preventDefault();
        openPos('payment');
        return;
      }

      if (
        type === 'void-one'
        || type === 'void-all'
      ) {
        event.preventDefault();
        openVoidDialog(action, type);
        return;
      }

      if (type === 'void-cancel') {
        event.preventDefault();
        closeVoidDialog();
        return;
      }

      if (type === 'void-confirm') {
        event.preventDefault();
        submitVoid();
        return;
      }

      if (type === 'receipt' || type === 'invoice') {
        event.preventDefault();
        openDocument(type);
        return;
      }

      if (type === 'document-back') {
        event.preventDefault();
        renderDetails();
        return;
      }

      if (type === 'document-print') {
        event.preventDefault();
        printDocument();
      }
    });

    return shell;
  }

  function openShell() {
    var shell = ensureShell();
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-cashier-order-center-open');
    document.body.classList.add('pmd-cashier-order-center-open');

    var close = shell.querySelector('.pmd-cashier-order-center__close');
    if (close) close.focus();
  }

  function closeCenter() {
    closeVoidDialog();

    if (state.posApi) {
      state.posApi.close();
      return;
    }

    if (!state.shell) return;

    state.shell.hidden = true;
    state.shell.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pmd-cashier-order-center-open');
    document.body.classList.remove('pmd-cashier-order-center-open');

    if (state.trigger && typeof state.trigger.focus === 'function') {
      state.trigger.focus();
    }
  }

  function renderLoading() {
    var body = ensureShell().querySelector('[data-pmd-r37-body]');
    var footer = ensureShell().querySelector('[data-pmd-r37-footer]');

    body.innerHTML =
      '<div class="pmd-cashier-order-center__loading">' +
        '<div><strong>Loading order #' + esc(state.orderId) + '…</strong><br><small>Reading live order and payment data</small></div>' +
      '</div>';

    footer.innerHTML = '';
  }

  function renderError(error) {
    var body = ensureShell().querySelector('[data-pmd-r37-body]');
    var footer = ensureShell().querySelector('[data-pmd-r37-footer]');

    body.innerHTML =
      '<div class="pmd-cashier-order-center__error">' +
        '<div><strong>Order details could not be loaded.</strong><br><small>' +
          esc(error && error.message ? error.message : 'Unknown error') +
        '</small></div>' +
      '</div>';

    footer.innerHTML =
      '<button type="button" class="pmd-cashier-order-center__action" data-pmd-r37-action="refresh">Retry</button>' +
      '<button type="button" class="pmd-cashier-order-center__action" data-pmd-r37-close>Close</button>';
  }

  function paymentLabel(status) {
    status = String(status || 'unpaid').toLowerCase();

    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Part paid';
    return 'Unpaid';
  }

  function cleanInternalTags(value) {
    return String(value == null ? '' : value)
      .replace(
        /\[(?:guest_session|table_session|table_draft_id|submitted_by):[^\]]*\]/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanOrderNote(value) {
    var text = cleanInternalTags(value);

    text = text
      .replace(/(^|\|\s*)Table Round(?=\s*\||$)/gi, '$1')
      .replace(/(^|\|\s*)Table ID:\s*[^|]*/gi, '$1')
      .replace(/(^|\|\s*)Table:\s*[^|]*/gi, '$1')
      .replace(/\s*\|\s*\|\s*/g, ' | ')
      .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return text;
  }

  function paymentMethodLabel(value) {
    var raw = String(value || '').toLowerCase();

    if (raw === 'cod' || raw === 'cash') {
      return 'Cash';
    }

    if (raw === 'external_terminal') {
      return 'External terminal';
    }

    if (raw === 'manual_card') {
      return 'Manual card';
    }

    return raw
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      }) || 'Payment';
  }

  function displayMoney(value, symbol) {
    var amount = num(value);
    var sign = amount < 0 ? '-' : '';

    return sign
      + String(symbol || '€')
      + Math.abs(amount).toFixed(2);
  }

  function latestReceiptUrl() {
    var transactions =
      state.payment
      && Array.isArray(state.payment.transactions)
        ? state.payment.transactions
        : [];

    var row = transactions.find(function (transaction) {
      return transaction && transaction.receipt_url;
    });

    return row ? String(row.receipt_url) : '';
  }

  function parseVoidAudit(value) {
    var raw = String(value == null ? '' : value);
    var totalVoided = 0;
    var reasons = [];

    raw = raw.replace(
      /\[VOID\s+([0-9.]+)\]\s*([^\r\n]*)/gi,
      function (_, qty, reason) {
        totalVoided += num(qty);

        reason = String(reason || '').trim();

        if (reason) {
          reasons.push(reason);
        }

        return '';
      }
    );

    return {
      note: cleanInternalTags(raw)
        .replace(/\s+/g, ' ')
        .trim(),

      voided: totalVoided,

      reason: reasons.length
        ? reasons[reasons.length - 1]
        : ''
    };
  }

  function itemMutationState() {
    var operations = state.operations || {};

    return operations.item_mutation || {
      allowed: false,
      locked: true,
      reason: 'Item mutation state is unavailable.'
    };
  }

  function ensureVoidDialog() {
    if (state.voidDialog) {
      return state.voidDialog;
    }

    var shell = ensureShell();

    var dialog = document.createElement('div');

    dialog.className =
      'pmd-cashier-order-center__void-dialog';

    dialog.hidden = true;

    dialog.innerHTML = [
      '<button type="button" ',
        'class="pmd-cashier-order-center__void-backdrop" ',
        'data-pmd-r37-action="void-cancel" ',
        'aria-label="Cancel">',
      '</button>',

      '<section ',
        'class="pmd-cashier-order-center__void-panel" ',
        'role="dialog" ',
        'aria-modal="true" ',
        'aria-labelledby="pmd-r39-void-title">',

        '<span class="pmd-cashier-order-center__eyebrow">',
          'ORDER CHANGE',
        '</span>',

        '<h3 id="pmd-r39-void-title">',
          'Remove item',
        '</h3>',

        '<p data-pmd-r39-void-copy></p>',

        '<label ',
          'class="pmd-cashier-order-center__void-field">',
          '<span>Reason</span>',
          '<select data-pmd-r39-void-reason>',
            '<option value="">Choose a reason</option>',
            '<option value="Customer changed mind">',
              'Customer changed mind',
            '</option>',
            '<option value="Entered by mistake">',
              'Entered by mistake',
            '</option>',
            '<option value="Kitchen issue">',
              'Kitchen issue',
            '</option>',
            '<option value="Item unavailable">',
              'Item unavailable',
            '</option>',
            '<option value="other">',
              'Other…',
            '</option>',
          '</select>',
        '</label>',

        '<label ',
          'class="pmd-cashier-order-center__void-field" ',
          'data-pmd-r39-void-custom-wrap hidden>',
          '<span>Other reason</span>',
          '<input ',
            'type="text" ',
            'maxlength="190" ',
            'data-pmd-r39-void-custom ',
            'placeholder="Enter reason">',
        '</label>',

        '<div class="pmd-cashier-order-center__void-warning">',
          'This change is recorded in the order audit history.',
        '</div>',

        '<footer ',
          'class="pmd-cashier-order-center__void-actions">',
          '<button type="button" ',
            'class="pmd-cashier-order-center__action" ',
            'data-pmd-r37-action="void-cancel">',
            'Cancel',
          '</button>',
          '<button type="button" ',
            'class="pmd-cashier-order-center__action is-danger" ',
            'data-pmd-r37-action="void-confirm" disabled>',
            'Confirm removal',
          '</button>',
        '</footer>',

      '</section>'
    ].join('');

    shell.appendChild(dialog);

    var select = dialog.querySelector(
      '[data-pmd-r39-void-reason]'
    );

    var customWrap = dialog.querySelector(
      '[data-pmd-r39-void-custom-wrap]'
    );

    var custom = dialog.querySelector(
      '[data-pmd-r39-void-custom]'
    );

    var confirm = dialog.querySelector(
      '[data-pmd-r37-action="void-confirm"]'
    );

    function update() {
      var value = String(
        select ? select.value : ''
      );

      var isOther = value === 'other';

      if (customWrap) {
        customWrap.hidden = !isOther;
      }

      var valid = value !== '';

      if (isOther) {
        valid = !!String(
          custom ? custom.value : ''
        ).trim();
      }

      if (confirm) {
        confirm.disabled = !valid;
      }
    }

    if (select) {
      select.addEventListener(
        'change',
        update
      );
    }

    if (custom) {
      custom.addEventListener(
        'input',
        update
      );
    }

    state.voidDialog = dialog;

    return dialog;
  }

  function openVoidDialog(button, type) {
    var mutation = itemMutationState();

    if (!mutation.allowed) {
      renderError(
        new Error(
          mutation.reason
          || 'Order items are locked after payment starts.'
        )
      );

      return;
    }

    var itemId = Number(
      button.getAttribute(
        'data-pmd-r39-order-menu-id'
      ) || 0
    );

    var currentQty = Number(
      button.getAttribute(
        'data-pmd-r39-current-qty'
      ) || 0
    );

    var name = String(
      button.getAttribute(
        'data-pmd-r39-item-name'
      ) || 'Item'
    );

    if (!itemId || currentQty <= 0) {
      return;
    }

    state.voidTarget = {
      itemId: itemId,
      quantity: type === 'void-all'
        ? currentQty
        : 1,
      currentQty: currentQty,
      name: name
    };

    var dialog = ensureVoidDialog();

    var copy = dialog.querySelector(
      '[data-pmd-r39-void-copy]'
    );

    var reason = dialog.querySelector(
      '[data-pmd-r39-void-reason]'
    );

    var custom = dialog.querySelector(
      '[data-pmd-r39-void-custom]'
    );

    var customWrap = dialog.querySelector(
      '[data-pmd-r39-void-custom-wrap]'
    );

    var confirm = dialog.querySelector(
      '[data-pmd-r37-action="void-confirm"]'
    );

    if (copy) {
      copy.textContent =
        type === 'void-all'
          ? (
              'Remove all remaining '
              + currentQty
              + ' × '
              + name
              + ' from this bill?'
            )
          : (
              'Reduce '
              + name
              + ' from '
              + currentQty
              + ' to '
              + Math.max(0, currentQty - 1)
              + '?'
            );
    }

    if (reason) {
      reason.value = '';
    }

    if (custom) {
      custom.value = '';
    }

    if (customWrap) {
      customWrap.hidden = true;
    }

    if (confirm) {
      confirm.disabled = true;
      confirm.textContent =
        type === 'void-all'
          ? 'Remove item'
          : 'Reduce quantity';
    }

    dialog.hidden = false;

    if (reason) {
      reason.focus();
    }
  }

  function closeVoidDialog() {
    if (state.voidDialog) {
      state.voidDialog.hidden = true;
    }

    state.voidTarget = null;
  }

  async function submitVoid() {
    if (
      !state.voidTarget
      || !state.voidDialog
    ) {
      return;
    }

    var mutation = itemMutationState();

    if (!mutation.allowed) {
      closeVoidDialog();
      await loadDetails();
      return;
    }

    var select = state.voidDialog.querySelector(
      '[data-pmd-r39-void-reason]'
    );

    var custom = state.voidDialog.querySelector(
      '[data-pmd-r39-void-custom]'
    );

    var confirm = state.voidDialog.querySelector(
      '[data-pmd-r37-action="void-confirm"]'
    );

    var reason = String(
      select ? select.value : ''
    );

    if (reason === 'other') {
      reason = String(
        custom ? custom.value : ''
      ).trim();
    }

    if (!reason) {
      return;
    }

    var target = Object.assign(
      {},
      state.voidTarget
    );

    var operations = state.operations || {};
    var order = operations.order || {};

    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = 'Saving…';
    }

    try {
      await fetchJson(
        '/admin/pmd-waiter-pos-v22/operations/'
        + encodeURIComponent(state.orderId)
        + '/void-item',
        {
          method: 'POST',

          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': (
              (
                document.querySelector(
                  'meta[name="csrf-token"]'
                )
                || {}
              ).content
              || ''
            )
          },

          body: JSON.stringify({
            order_menu_id: target.itemId,
            quantity: target.quantity,
            reason: reason,
            expected_updated_at:
              order.updated_at || ''
          })
        }
      );

      state.dirty = true;

      closeVoidDialog();

      await loadDetails();

      window.dispatchEvent(
        new CustomEvent(
          'pmd:cashier-order-mutated',
          {
            detail: {
              order_id: state.orderId,
              order_menu_id: target.itemId
            }
          }
        )
      );

    } catch (error) {
      if (confirm) {
        confirm.disabled = false;
        confirm.textContent = 'Try again';
      }

      var copy = state.voidDialog.querySelector(
        '[data-pmd-r39-void-copy]'
      );

      if (copy) {
        copy.textContent =
          error.message
          || 'The order item could not be changed.';

        copy.classList.add('is-error');
      }
    }
  }

  function renderDetails() {
    var payment = state.payment || {};
    var operations = state.operations || {};

    var mutation =
      operations.item_mutation || {};

    var itemsMutable =
      mutation.allowed === true;

    var settlement = payment.settlement || {};
    var currency = payment.currency || {};
    var symbol = currency.symbol || '€';

    var operationalOrder = operations.order || {};
    var paymentOrder = payment.order || {};

    var table = payment.table || operations.table || {};

    var items = Array.isArray(payment.items)
      ? payment.items
      : (
          Array.isArray(operations.items)
            ? operations.items
            : []
        );

    var operationalItems =
      Array.isArray(operations.items)
        ? operations.items
        : [];

    var operationalItemMap = {};

    operationalItems.forEach(function (row) {
      operationalItemMap[
        String(row.order_menu_id || '')
      ] = row;
    });

    items = items.map(function (row) {
      var operational =
        operationalItemMap[
          String(row.order_menu_id || '')
        ] || {};

      return Object.assign(
        {},
        operational,
        row
      );
    });

    var visibleItems = items.filter(
      function (row) {
        return num(row.quantity) > 0.0001;
      }
    );

    var transactions = Array.isArray(payment.transactions)
      ? payment.transactions
      : [];

    var totals = Array.isArray(operations.totals)
      ? operations.totals
      : [];

    var tableLabel =
      cardText('.pmd-ops-card__title')
      || table.name
      || (
        table.number
          ? ('Table ' + table.number)
          : 'Table'
      );

    var operationalStatus = String(
      operationalOrder.status_name || ''
    ).trim();

    if (!operationalStatus) {
      operationalStatus = operationalOrder.status_id
        ? ('Status #' + operationalOrder.status_id)
        : 'Order';
    }

    var cardMeta = cardText(
      '.pmd-ops-card__meta'
    )
      .replace(/\bNote\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    var settlementStatus = String(
      settlement.status
      || paymentOrder.settlement_status
      || operationalOrder.settlement_status
      || 'unpaid'
    ).toLowerCase();

    var total = num(
      settlement.order_total != null
        ? settlement.order_total
        : operationalOrder.order_total
    );

    var paid = num(
      settlement.settled_amount != null
        ? settlement.settled_amount
        : operationalOrder.settled_amount
    );

    var due = num(
      settlement.remaining_amount != null
        ? settlement.remaining_amount
        : Math.max(0, total - paid)
    );

    var shell = ensureShell();

    shell.classList.remove('is-document');
    state.documentFrame = null;

    var title = shell.querySelector(
      '[data-pmd-r37-title]'
    );

    var subtitle = shell.querySelector(
      '[data-pmd-r37-subtitle]'
    );

    var body = shell.querySelector(
      '[data-pmd-r37-body]'
    );

    var footer = shell.querySelector(
      '[data-pmd-r37-footer]'
    );

    title.textContent =
      tableLabel + ' · Order #' + state.orderId;

    subtitle.textContent =
      cardMeta || ('Order #' + state.orderId);

    var itemHtml = visibleItems.length
      ? visibleItems.map(function (item) {
          var qty = num(item.quantity);
          var paidQty = num(
            item.paid_quantity
          );

          var orderMenuId = Number(
            item.order_menu_id || 0
          );

          var audit = parseVoidAudit(
            item.comment
          );

          var detail = [];

          if (audit.note) {
            detail.push(audit.note);
          }

          if (audit.voided > 0) {
            detail.push(
              audit.voided.toFixed(
                Number.isInteger(audit.voided)
                  ? 0
                  : 2
              )
              + ' voided'
              + (
                audit.reason
                  ? ' · ' + audit.reason
                  : ''
              )
            );
          }

          if (
            paidQty > 0
            && paidQty < qty
          ) {
            detail.push(
              paidQty.toFixed(
                Number.isInteger(paidQty)
                  ? 0
                  : 2
              )
              + ' already paid'
            );
          }

          var qtyText = qty.toFixed(
            Number.isInteger(qty)
              ? 0
              : 2
          );

          var quantityCell =
            itemsMutable
            && orderMenuId > 0
              ? [
                  '<div ',
                    'class="pmd-cashier-order-center__qty-control">',
                    '<button type="button" ',
                      'class="pmd-cashier-order-center__qty-button" ',
                      'data-pmd-r37-action="void-one" ',
                      'data-pmd-r39-order-menu-id="',
                        esc(orderMenuId),
                      '" ',
                      'data-pmd-r39-current-qty="',
                        esc(qty),
                      '" ',
                      'data-pmd-r39-item-name="',
                        esc(item.name || 'Item'),
                      '" ',
                      'aria-label="Decrease quantity">',
                      '−',
                    '</button>',
                    '<b>',
                      esc(qtyText),
                      '×',
                    '</b>',
                  '</div>'
                ].join('')
              : [
                  '<span ',
                    'class="pmd-cashier-order-center__qty">',
                    esc(qtyText),
                    '×',
                  '</span>'
                ].join('');

          var removeButton =
            itemsMutable
            && orderMenuId > 0
              ? [
                  '<button type="button" ',
                    'class="pmd-cashier-order-center__remove-item" ',
                    'data-pmd-r37-action="void-all" ',
                    'data-pmd-r39-order-menu-id="',
                      esc(orderMenuId),
                    '" ',
                    'data-pmd-r39-current-qty="',
                      esc(qty),
                    '" ',
                    'data-pmd-r39-item-name="',
                      esc(item.name || 'Item'),
                    '">',
                    'Remove',
                  '</button>'
                ].join('')
              : '';

          return [
            '<div ',
              'class="pmd-cashier-order-center__item">',
              quantityCell,

              '<div ',
                'class="pmd-cashier-order-center__item-name">',
                esc(item.name || 'Item'),

                detail.length
                  ? [
                      '<small>',
                        esc(detail.join(' · ')),
                      '</small>'
                    ].join('')
                  : '',
              '</div>',

              '<div ',
                'class="pmd-cashier-order-center__item-end">',
                '<span ',
                  'class="pmd-cashier-order-center__item-price">',
                  displayMoney(
                    item.line_subtotal != null
                      ? item.line_subtotal
                      : item.subtotal,
                    symbol
                  ),
                '</span>',
                removeButton,
              '</div>',
            '</div>'
          ].join('');
        }).join('')
      : (
          '<div '
          + 'class="pmd-cashier-order-center__loading" '
          + 'style="min-height:100px">'
          + 'No active order items.'
          + '</div>'
        );

    var orderNote = cleanOrderNote(
      operationalOrder.comment
      || paymentOrder.comment
      || ''
    );

    var historyHtml = transactions.length
      ? transactions.map(function (row) {
          var method = paymentMethodLabel(
            row.payment_method
          );

          var reference = String(
            row.payment_reference || ''
          ).trim();

          var payer = String(
            row.payer_label || ''
          ).trim();

          var paidAt = String(
            row.paid_at || ''
          ).trim();

          var meta = [
            payer,
            reference,
            paidAt
          ]
            .filter(Boolean)
            .join(' · ');

          return [
            '<div class="pmd-cashier-order-center__history-row">',
              '<div>',
                '<strong>',
                  esc(method),
                '</strong>',
                meta
                  ? '<small>'
                    + esc(meta)
                    + '</small>'
                  : '',
              '</div>',
              '<b>',
                displayMoney(
                  row.amount,
                  symbol
                ),
              '</b>',
            '</div>'
          ].join('');
        }).join('')
      : (
          '<p class="pmd-cashier-order-center__note">'
          + 'No payment transaction history.'
          + '</p>'
        );

    var breakdownRows = totals
      .filter(function (row) {
        return String(
          row.code || ''
        ).toLowerCase() !== 'total';
      })
      .map(function (row) {
        var value = num(row.value);

        return [
          '<div class="pmd-cashier-order-center__breakdown-row',
          value < 0 ? ' is-negative' : '',
          '">',
            '<span>',
              esc(
                row.title
                || row.code
                || 'Amount'
              ),
            '</span>',
            '<strong>',
              displayMoney(
                value,
                symbol
              ),
            '</strong>',
          '</div>'
        ].join('');
      })
      .join('');

    var breakdownHtml = totals.length
      ? [
          '<div class="pmd-cashier-order-center__breakdown">',
            breakdownRows,
            '<div class="pmd-cashier-order-center__breakdown-row is-total">',
              '<span>Total</span>',
              '<strong>',
                displayMoney(
                  total,
                  symbol
                ),
              '</strong>',
            '</div>',
          '</div>'
        ].join('')
      : '';

    var mutationNotice =
      !itemsMutable
      && mutation.locked
        ? [
            '<div ',
              'class="pmd-cashier-order-center__mutation-lock">',
              '<strong>Items locked</strong>',
              '<span>',
                esc(
                  mutation.reason
                  || 'Payment has started, so this bill can no longer be structurally changed.'
                ),
              '</span>',
            '</div>'
          ].join('')
        : '';

    body.innerHTML = [
      '<div class="pmd-cashier-order-center__status-row">',
        '<span class="pmd-cashier-order-center__pill">',
          'Order status · ',
          esc(operationalStatus),
        '</span>',
        '<span class="pmd-cashier-order-center__pill is-',
          esc(settlementStatus),
        '">',
          'Payment · ',
          esc(
            paymentLabel(
              settlementStatus
            )
          ),
        '</span>',
      '</div>',

      mutationNotice,

      '<div class="pmd-cashier-order-center__money">',
        '<div>',
          '<span>Total</span>',
          '<strong>',
            displayMoney(total, symbol),
          '</strong>',
        '</div>',
        '<div>',
          '<span>Paid</span>',
          '<strong>',
            displayMoney(paid, symbol),
          '</strong>',
        '</div>',
        '<div class="is-due">',
          '<span>Due</span>',
          '<strong>',
            displayMoney(due, symbol),
          '</strong>',
        '</div>',
      '</div>',

      breakdownHtml,

      '<section class="pmd-cashier-order-center__section">',
        '<div class="pmd-cashier-order-center__section-head">',
          '<strong>Order items</strong>',
          '<span>',
            esc(visibleItems.length),
            ' lines',
          '</span>',
        '</div>',
        '<div class="pmd-cashier-order-center__items">',
          itemHtml,
        '</div>',
      '</section>',

      '<section class="pmd-cashier-order-center__section">',
        '<div class="pmd-cashier-order-center__section-head">',
          '<strong>Order note</strong>',
        '</div>',
        '<p class="pmd-cashier-order-center__note">',
          esc(
            orderNote
            || 'No customer/service note.'
          ),
        '</p>',
      '</section>',

      '<section class="pmd-cashier-order-center__section">',
        '<div class="pmd-cashier-order-center__section-head">',
          '<strong>Payment history</strong>',
          '<span>',
            esc(transactions.length),
            transactions.length === 1
              ? ' transaction'
              : ' transactions',
          '</span>',
        '</div>',
        '<div class="pmd-cashier-order-center__history">',
          historyHtml,
        '</div>',
      '</section>'
    ].join('');

    var tableKey =
      table.number != null
      && String(table.number) !== ''
        ? String(table.number)
        : String(table.id || '');

    var canOpenPos = !!tableKey;
    var receiptUrl = latestReceiptUrl();

    footer.innerHTML = [
      '<button type="button" ',
        'class="pmd-cashier-order-center__action" ',
        'data-pmd-r37-action="refresh">',
        'Refresh',
      '</button>',

      canOpenPos
      && itemsMutable
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action" ',
              'data-pmd-r37-action="items">',
              'Add / increase items',
            '</button>'
          ].join('')
        : '',

      canOpenPos
      && due > 0.0001
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action is-payment" ',
              'data-pmd-r37-action="payment">',
              'Take payment',
            '</button>'
          ].join('')
        : '',

      receiptUrl
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action" ',
              'data-pmd-r37-action="receipt">',
              'Receipt',
            '</button>'
          ].join('')
        : '',

      settlementStatus === 'paid'
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action is-primary" ',
              'data-pmd-r37-action="invoice">',
              'Invoice',
            '</button>'
          ].join('')
        : '',

      '<button type="button" ',
        'class="pmd-cashier-order-center__action" ',
        'data-pmd-r37-close>',
        'Close',
      '</button>'
    ].join('');

    syncCardFinancials(
      total,
      paid,
      due,
      symbol
    );

    syncCardItemCount(
      visibleItems.length
    );
  }

  function htmlErrorMessage(html) {
    try {
      var parsed =
        new DOMParser().parseFromString(
          String(html || ''),
          'text/html'
        );

      return String(
        parsed.body
          ? parsed.body.textContent
          : ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
    } catch (error) {
      return '';
    }
  }

  async function openDocument(kind) {
    var shell = ensureShell();

    var title = shell.querySelector(
      '[data-pmd-r37-title]'
    );

    var subtitle = shell.querySelector(
      '[data-pmd-r37-subtitle]'
    );

    var body = shell.querySelector(
      '[data-pmd-r37-body]'
    );

    var footer = shell.querySelector(
      '[data-pmd-r37-footer]'
    );

    var isReceipt = kind === 'receipt';

    var url = isReceipt
      ? latestReceiptUrl()
      : (
          '/admin/pmd-cashier-order-center/invoice/'
          + encodeURIComponent(state.orderId)
        );

    if (!url) {
      body.innerHTML =
        '<div class="pmd-cashier-order-center__error">'
        + '<div><strong>Document unavailable.</strong>'
        + '<br><small>No document URL is available.</small>'
        + '</div></div>';
      return;
    }

    shell.classList.add('is-document');
    state.documentFrame = null;

    title.textContent =
      (
        isReceipt
          ? 'Receipt'
          : 'Invoice'
      )
      + ' · Order #'
      + state.orderId;

    subtitle.textContent =
      'Cashier Order Center · stays on this page';

    body.innerHTML = [
      '<div class="pmd-cashier-order-center__loading">',
        '<div>',
          '<strong>Loading ',
            isReceipt
              ? 'receipt'
              : 'invoice',
            '…',
          '</strong>',
          '<br>',
          '<small>',
            'Opening the canonical document inside Cashier',
          '</small>',
        '</div>',
      '</div>'
    ].join('');

    footer.innerHTML = [
      '<button type="button" ',
        'class="pmd-cashier-order-center__action" ',
        'data-pmd-r37-action="document-back">',
        'Back to order',
      '</button>',
      '<button type="button" ',
        'class="pmd-cashier-order-center__action is-primary" ',
        'data-pmd-r37-action="document-print" disabled>',
        'Print',
      '</button>',
      '<button type="button" ',
        'class="pmd-cashier-order-center__action" ',
        'data-pmd-r37-close>',
        'Close',
      '</button>'
    ].join('');

    try {
      var response = await fetch(
        url,
        {
          credentials: 'same-origin',
          headers: {
            'Accept': 'text/html',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      var html = await response.text();

      if (!response.ok) {
        throw new Error(
          htmlErrorMessage(html)
          || (
            'Document request failed: HTTP '
            + response.status
          )
        );
      }

      var wrap = document.createElement('div');

      wrap.className =
        'pmd-cashier-order-center__document';

      var frame = document.createElement('iframe');

      frame.className =
        'pmd-cashier-order-center__document-frame';

      frame.title = isReceipt
        ? 'Receipt preview'
        : 'Invoice preview';

      frame.setAttribute(
        'sandbox',
        'allow-same-origin allow-scripts allow-modals'
      );

      frame.srcdoc = html;

      wrap.appendChild(frame);

      body.innerHTML = '';
      body.appendChild(wrap);

      state.documentFrame = frame;

      var printButton = shell.querySelector(
        '[data-pmd-r37-action="document-print"]'
      );

      if (printButton) {
        printButton.disabled = false;
      }
    } catch (error) {
      body.innerHTML = [
        '<div class="pmd-cashier-order-center__error">',
          '<div>',
            '<strong>',
              isReceipt
                ? 'Receipt could not be loaded.'
                : 'Invoice could not be loaded.',
            '</strong>',
            '<br>',
            '<small>',
              esc(
                error
                && error.message
                  ? error.message
                  : 'Unknown document error'
              ),
            '</small>',
          '</div>',
        '</div>'
      ].join('');
    }
  }

  function printDocument() {
    if (
      !state.documentFrame
      || !state.documentFrame.contentWindow
    ) {
      return;
    }

    try {
      state.documentFrame.contentWindow.focus();
      state.documentFrame.contentWindow.print();
    } catch (error) {
      console.error(
        '[PMD] Cashier document print failed',
        error
      );
    }
  }

  function syncCardFinancials(total, paid, due, symbol) {
    if (!state.card) return;

    var values = state.card.querySelectorAll(
      '.pmd-ops-card__facts--money dd'
    );

    if (values.length >= 3) {
      values[0].textContent = money(total, symbol);
      values[1].textContent = money(paid, symbol);
      values[2].textContent = money(due, symbol);
    }
  }

  function syncCardItemCount(count) {
    if (!state.card) {
      return;
    }

    var meta = state.card.querySelector(
      '.pmd-ops-card__meta'
    );

    if (!meta) {
      return;
    }

    var text = String(
      meta.textContent || ''
    );

    var replacement =
      String(count)
      + (
          Number(count) === 1
            ? ' Item'
            : ' Items'
        );

    if (/\b\d+\s+Items?\b/i.test(text)) {
      meta.textContent = text.replace(
        /\b\d+\s+Items?\b/i,
        replacement
      );
    }
  }

  async function loadDetails() {
    if (!state.orderId) return;

    renderLoading();

    try {
      var results = await Promise.allSettled([
        fetchJson(
          '/admin/pmd-waiter-pos-v1/payment-summary/' +
          encodeURIComponent(state.orderId) +
          '?_=' + Date.now()
        ),
        fetchJson(
          '/admin/pmd-waiter-pos-v22/operations/' +
          encodeURIComponent(state.orderId) +
          '?_=' + Date.now()
        )
      ]);

      state.payment =
        results[0].status === 'fulfilled'
          ? results[0].value
          : null;

      state.operations =
        results[1].status === 'fulfilled'
          ? results[1].value
          : null;

      if (!state.payment && !state.operations) {
        throw (
          results[0].reason ||
          results[1].reason ||
          new Error('Order details unavailable.')
        );
      }

      renderDetails();
    } catch (error) {
      renderError(error);
    }
  }

  async function injectScript(path) {
    var current = Array.prototype.slice.call(document.scripts)
      .find(function (script) {
        return String(script.src || '').indexOf(path) !== -1;
      });

    if (current) {
      return;
    }

    await new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = path + '?v=27';
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Could not load ' + path));
      };
      document.head.appendChild(script);
    });
  }

  function injectStyle(path) {
    var exists = Array.prototype.slice.call(
      document.querySelectorAll('link[rel="stylesheet"]')
    ).some(function (link) {
      return String(link.href || '').indexOf(path) !== -1;
    });

    if (exists) return;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path + '?v=27';
    link.setAttribute('data-pmd-r37-pos-style', '1');
    document.head.appendChild(link);
  }

  async function ensurePosAssets() {
    [
      '/app/admin/assets/css/pmd-waiter-pos-v1.css',
      '/app/admin/assets/css/pmd-waiter-pos-product-details-v3.css',
      '/app/admin/assets/css/pmd-waiter-pos-polish-v26.css',
      '/app/admin/assets/css/pmd-waiter-pos-simple-v27.css'
    ].forEach(injectStyle);

    if (!window.PMDWaiterPOSPaymentV2) {
      await injectScript(
        '/app/admin/assets/js/pmd-waiter-pos-payment-v2.js'
      );
    }

    if (
      window.PMDWaiterPOSPaymentV2 &&
      !window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped
    ) {
      await injectScript(
        '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js'
      );
    }

    if (!window.PMDWaiterPOSApp) {
      await injectScript(
        '/app/admin/assets/js/pmd-waiter-pos-v1.js'
      );
    }

    if (!window.PMDWaiterPOSProductDetailsV3) {
      await injectScript(
        '/app/admin/assets/js/pmd-waiter-pos-product-details-v3.js'
      );
    }

    if (!window.PMDWaiterPOSSimpleV27) {
      await injectScript(
        '/app/admin/assets/js/pmd-waiter-pos-simple-v27.js'
      );
    }

    if (!window.PMDWaiterPOSApp) {
      throw new Error('Waiter POS engine did not load.');
    }
  }

  function destroyPosHost() {
    if (state.posApi && typeof state.posApi.destroy === 'function') {
      try {
        state.posApi.destroy();
      } catch (error) {
      }
    }

    state.posApi = null;

    if (state.posHost) {
      state.posHost.remove();
      state.posHost = null;
    }
  }

  async function closePos(refresh) {
    destroyPosHost();

    if (refresh) {
      await loadDetails();
    }
  }

  async function openPos(mode) {
    var payment = state.payment || {};
    var operations = state.operations || {};
    var table = payment.table || operations.table || {};

    var tableKey =
      (table.number != null && String(table.number) !== '')
        ? String(table.number)
        : String(table.id || '');

    if (!tableKey) {
      renderError(
        new Error(
          'This order has no resolvable table reference for the POS overlay.'
        )
      );
      return;
    }

    try {
      await ensurePosAssets();

      var overlay = await fetchJson(
        '/admin/pmd-waiter-pos-v1/overlay/' +
        encodeURIComponent(tableKey) +
        '?_=' + Date.now()
      );

      var boot = overlay.bootstrap || {};
      var openOrders = Array.isArray(boot.open_orders)
        ? boot.open_orders
        : [];

      var selected = openOrders.find(function (order) {
        return String(order.order_id) === String(state.orderId);
      });

      if (!selected) {
        throw new Error(
          'This order is no longer editable in the active waiter POS. ' +
          'Paid or closed orders remain available as read-only Cashier details.'
        );
      }

      boot.active_order_id = Number(state.orderId);

      var host = document.createElement('div');
      host.className = 'pmd-cashier-pos-overlay';

      host.innerHTML = [
        '<div class="pmd-cashier-pos-overlay__panel" data-pmd-r37-pos-panel></div>'
      ].join('');

      document.body.appendChild(host);
      state.posHost = host;

      var panel = host.querySelector('[data-pmd-r37-pos-panel]');
      panel.innerHTML = overlay.html || '';

      var root = panel.querySelector('[data-pmd-pos-root]');

      if (!root) {
        throw new Error('Waiter POS overlay root is missing.');
      }

      state.posApi = window.PMDWaiterPOSApp.mount(
        root,
        boot,
        {
          embedded: true,
          onClose: function () {
            closePos(true);
          }
        }
      );

      if (window.PMDWaiterPOSProductDetailsV3) {
        window.PMDWaiterPOSProductDetailsV3.install(
          root,
          state.posApi
        );
      }

      if (window.PMDWaiterPOSSimpleV27) {
        window.PMDWaiterPOSSimpleV27.install(
          root,
          state.posApi
        );
      }

      host.addEventListener('click', function (event) {
        if (!event.target.closest('[data-pmd-r37-pos-close]')) {
          return;
        }

        event.preventDefault();

        if (state.posApi && typeof state.posApi.close === 'function') {
          state.posApi.close();
        } else {
          closePos(true);
        }
      });

      if (
        mode === 'payment' &&
        state.posApi &&
        typeof state.posApi.openPayment === 'function'
      ) {
        setTimeout(function () {
          state.posApi.openPayment();
        }, 0);
      }
    } catch (error) {
      destroyPosHost();
      renderError(error);
    }
  }

  function openOrder(card, trigger) {
    var id = Number(
      card.getAttribute('data-pmd-cashier-order') || 0
    );

    if (!id) return;

    state.card = card;
    state.trigger = trigger;
    state.orderId = id;
    state.payment = null;
    state.operations = null;

    openShell();
    loadDetails();
  }

  document.addEventListener(
    'click',
    function (event) {
      var link = event.target.closest(
        '#pmd-cashier-current-orders-v2 ' +
        '[data-pmd-cashier-order] ' +
        '.pmd-ops-card__footer a[data-pmd-r37-order-center="1"]'
      );

      if (!link) return;

      var card = link.closest('[data-pmd-cashier-order]');
      if (!card) return;

      event.preventDefault();
      event.stopPropagation();

      openOrder(card, link);
    },
    true
  );

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    if (
      state.voidDialog
      && !state.voidDialog.hidden
    ) {
      closeVoidDialog();
      return;
    }

    if (state.posApi) {
      state.posApi.close();
      return;
    }

    if (
      state.shell &&
      !state.shell.hidden
    ) {
      closeCenter();
    }
  });

  window.addEventListener(
    'pmd:waiter-pos-order-updated',
    function (event) {
      if (
        event &&
        event.detail &&
        Number(event.detail.order_id) === Number(state.orderId)
      ) {
        state.dirty = true;
      }
    }
  );

  function markLinks() {
    document
      .querySelectorAll(
        '#pmd-cashier-current-orders-v2 ' +
        '[data-pmd-cashier-order] ' +
        '.pmd-ops-card__footer a[href*="/admin/orders/edit/"]'
      )
      .forEach(function (link) {
        // PMD_CASHIER_OPEN_ORDER_AUTHORITY_R44
        // Edit-capable Cashier cards belong to the native Composer. R37 is
        // still used by Details/Documents and by paid/read-only fallback.
        if (link.getAttribute('data-pmd-cashier-open-composer') === '1') {
          return;
        }

        if (!link.getAttribute('data-pmd-r37-legacy-href')) {
          link.setAttribute(
            'data-pmd-r37-legacy-href',
            link.getAttribute('href') || ''
          );
        }

        link.setAttribute(
          'data-pmd-r37-order-center',
          '1'
        );

        link.setAttribute(
          'aria-haspopup',
          'dialog'
        );

        link.setAttribute(
          'href',
          '#pmd-cashier-order-center'
        );

        link.removeAttribute('target');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      markLinks,
      { once: true }
    );
  } else {
    markLinks();
  }

  window.PMDCashierOrderCenter = {
    open: function (orderId) {
      var card = document.querySelector(
        '[data-pmd-cashier-order="' +
        String(Number(orderId)) +
        '"]'
      );

      if (!card) {
        throw new Error(
          'Cashier order card #' + orderId + ' was not found.'
        );
      }

      openOrder(card, null);
    },

    close: closeCenter,

    refresh: loadDetails,

    inspect: function () {
      return {
        orderId: state.orderId,
        open: !!(
          state.shell &&
          !state.shell.hidden
        ),
        posOpen: !!state.posApi,
        paymentLoaded: !!state.payment,
        operationsLoaded: !!state.operations,
        itemsMutable: !!(
          state.operations
          && state.operations.item_mutation
          && state.operations.item_mutation.allowed
        ),
        itemMutation:
          state.operations
          && state.operations.item_mutation
            ? state.operations.item_mutation
            : null,
        legacyNavigationIntercepted: true
      };
    }
  };

  console.info(
    '[PMD] Cashier Order Center R37A ready'
  );
})();
