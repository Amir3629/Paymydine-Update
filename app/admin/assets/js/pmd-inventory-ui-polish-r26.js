/* PMD_INVENTORY_UI_POLISH_R26
 * Presentation-only follow-up to the scoped R25 inventory dialogs.
 * Stock actions, count sessions, shopping math, and purchase/waste writes
 * remain under the original R19/R24 handlers.
 */
(function () {
  'use strict';
  if (window.PMDInventoryUIPolishR26) return;

  function initialise() {
    if (window.PMDInventoryUIPolishR26) return;
    var root = document.querySelector('#pmd-inventory-v1[data-pmd-inventory-root]');
    var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
    if (!root || !workspace || !window.PMDInventoryFocusDialogsV1) return;

    function node(tag, cls, content) {
      var element = document.createElement(tag);
      if (cls) element.className = cls;
      if (typeof content === 'string') element.textContent = content;
      return element;
    }

    // Remove editorial page headings, NOT search, scan, count or waste actions.
    ['stock', 'purchases', 'waste', 'shopping'].forEach(function (mode) {
      var pane = workspace.querySelector('[data-r19-pane="' + mode + '"]');
      var head = pane && pane.querySelector('.pmd-inv-r19-section-head');
      if (!head) return;
      if (mode === 'shopping') {
        head.remove();
        return;
      }
      var introduction = head.firstElementChild;
      if (introduction && introduction.tagName === 'DIV' && introduction.querySelector('h2')) {
        introduction.remove();
      }
      head.classList.add('pmd-inv-r26-toolbar');
    });

    // Keep all original metadata nodes available to the purchase handler, but
    // remove supplier/date/invoice/delivery controls from visible UI.
    var delivery = workspace.querySelector('.pmd-inv-r25-delivery');
    if (delivery) {
      delivery.hidden = true;
      delivery.inert = true;
      delivery.setAttribute('aria-hidden', 'true');
      delivery.setAttribute('data-pmd-inv-r26-retired-delivery', '1');
    }

    var modalConfigs = [
      {key:'stock', host:'[data-r19-stock-editor]', closer:'[data-r19-close-stock-editor]', icon:'box'},
      {key:'purchase', host:'[data-r19-purchase-editor]', closer:'[data-r19-close-purchase-editor]', icon:'receive'},
      {key:'waste', host:'[data-r19-waste-editor]', closer:'[data-r19-close-waste-editor]', icon:'waste'},
      {key:'review', host:'[data-r19-receipt-review]', closer:'[data-r19-close-review]', icon:'review'},
      {key:'count', host:'[data-r19-count]', closer:'[data-r19-cancel-count]', icon:'count'},
      {key:'barcode', host:'[data-r19-barcode-panel]', closer:'[data-r19-barcode-close]', icon:'barcode'}
    ];
    var icons = {
      box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4Z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
      receive:'<path d="M4 8h16v12H4zM8 4h8v4M12 11v6M9 14l3 3 3-3"/>',
      waste:'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
      review:'<path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6"/>',
      count:'<path d="M7 5h14M7 12h14M7 19h14M2 5h1M2 12h1M2 19h1"/>',
      barcode:'<path d="M4 4v16M7 4v16M11 4v16M14 4v16M18 4v16M21 4v16"/>'
    };

    function addCancel(host, actions, config) {
      if (config.key === 'barcode') return;
      if (config.key === 'count') {
        // The original Cancel action owns async count-session cancellation.
        var countCancel = host.querySelector(config.closer);
        if (countCancel && countCancel.parentNode !== actions) {
          countCancel.textContent = 'Cancel';
          countCancel.classList.add('pmd-inv-r19-secondary', 'pmd-inv-r26-cancel');
          actions.insertBefore(countCancel, actions.firstChild);
        }
        return;
      }
      if (!actions.querySelector('[data-pmd-inv-r26-cancel]')) {
        var cancel = node('button', 'pmd-inv-r19-secondary pmd-inv-r26-cancel', 'Cancel');
        cancel.type = 'button';
        cancel.setAttribute('data-pmd-inv-r26-cancel', config.key);
        cancel.addEventListener('click', function () {
          var original = host.querySelector(config.closer);
          if (original && !host.hidden) original.click();
        });
        actions.insertBefore(cancel, actions.firstChild);
      }
      if (config.key === 'stock') {
        var archive = actions.querySelector('[data-r19-archive-item]');
        var cancelControl = actions.querySelector('[data-pmd-inv-r26-cancel]');
        if (archive && cancelControl && archive.nextElementSibling !== cancelControl) {
          actions.insertBefore(archive, cancelControl);
        }
      }
    }

    function improveCount(host) {
      var list = host.querySelector('.pmd-inv-r19-count-list');
      if (!list) return;
      if (!list.previousElementSibling || !list.previousElementSibling.classList.contains('pmd-inv-r26-count-columns')) {
        var columns = node('div', 'pmd-inv-r26-count-columns');
        ['Stock item', 'Actual quantity', 'Status'].forEach(function (label) {
          columns.appendChild(node('span', '', label));
        });
        list.parentNode.insertBefore(columns, list);
      }
      list.querySelectorAll('[data-r19-count-row]').forEach(function (row) {
        var item = row.querySelector('strong');
        var input = row.querySelector('[data-r19-count-input]');
        if (input && item) {
          var name = item.firstChild ? String(item.firstChild.textContent || '').trim() : item.textContent.trim();
          input.setAttribute('aria-label', 'Actual counted quantity for ' + name);
        }
      });
    }

    function improveDialog(config, host) {
      var actions = host.querySelector('.pmd-inv-r19-editor-actions');
      if (actions) addCancel(host, actions, config);
      if (config.key === 'count') improveCount(host);
    }

    modalConfigs.forEach(function (config) {
      var overlay = workspace.querySelector('[data-pmd-inv-r25-dialog="' + config.key + '"]');
      var host = overlay && overlay.querySelector(config.host);
      var top = overlay && overlay.querySelector('.pmd-inv-r25-sheet__header');
      if (!host || !top) return;
      overlay.classList.add('pmd-inv-r26-refined');
      if (!top.querySelector('.pmd-inv-r26-dialog-icon')) {
        var icon = node('span', 'pmd-inv-r26-dialog-icon');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + icons[config.icon] + '</svg>';
        top.insertBefore(icon, top.firstChild);
      }
      improveDialog(config, host);
      // The R19 host replaces its children when a product is selected.
      // Observe only direct child replacement; the inserted footer controls
      // do not cause a recursive MutationObserver loop.
      var watcher = new MutationObserver(function (mutations) {
        if (mutations.some(function (record) { return record.type === 'childList'; })) {
          improveDialog(config, host);
        }
      });
      watcher.observe(host, {childList:true});
    });

    var shoppingPane = workspace.querySelector('[data-r19-pane="shopping"]');
    var shoppingList = shoppingPane && shoppingPane.querySelector('[data-r19-shopping-list]');

    function decorateShopping() {
      if (!shoppingList) return;
      // Hide the long forecasting formula while retaining it on hover.
      // The underlying quantities and calculated totals remain unchanged.
      var summary = shoppingPane.querySelector('[data-r19-shopping-summary] span');
      if (summary && summary.textContent.indexOf(' · ') !== -1) {
        var fullSummary = summary.textContent;
        summary.title = fullSummary;
        summary.textContent = fullSummary.split(' · ')[0];
      }
      var rows = shoppingList.querySelectorAll('[data-r19-shopping-row]');
      if (!rows.length) return;
      if (!shoppingList.querySelector('.pmd-inv-r26-shopping-columns')) {
        var columns = node('div', 'pmd-inv-r26-shopping-columns');
        ['Item', 'Suggested order', 'Adjust quantity', 'Estimated cost'].forEach(function (label) {
          columns.appendChild(node('span', '', label));
        });
        shoppingList.insertBefore(columns, shoppingList.firstChild);
      }
      shoppingList.querySelectorAll('.pmd-inv-r19-shopping-supplier').forEach(function (label) {
        if (label.textContent.trim().toLowerCase() === 'unassigned supplier') {
          label.hidden = true;
          label.setAttribute('aria-hidden', 'true');
        }
      });
      rows.forEach(function (row) {
        var input = row.querySelector('[data-r19-shopping-qty]');
        var name = row.querySelector('strong');
        var supporting = row.querySelector('small');
        if (input && name) input.setAttribute('aria-label', 'Order quantity for ' + name.textContent.trim());
        if (supporting && /^\s*-\d/.test(supporting.textContent || '')) {
          row.classList.add('pmd-inv-r26-negative-stock');
          supporting.title = 'Negative on-hand stock. Review earlier stock receipts and waste.';
        }
      });
    }

    if (shoppingList) {
      decorateShopping();
      var shoppingObserver = new MutationObserver(function (mutations) {
        if (mutations.some(function (record) { return record.type === 'childList'; })) decorateShopping();
      });
      shoppingObserver.observe(shoppingList, {childList:true});
    }

    root.classList.add('pmd-inv-r26-ready');
    window.PMDInventoryUIPolishR26 = {version:'1.0.0'};
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, {once:true});
  } else {
    initialise();
  }
}());