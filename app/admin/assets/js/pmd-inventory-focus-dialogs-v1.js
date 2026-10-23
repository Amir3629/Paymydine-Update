/* PMD_INVENTORY_FOCUS_FORMS_V1
 * Menu > Inventory: reuse the existing R19 editor hosts and delegated handlers.
 * The presentation changes; purchase, waste, counting, and barcode writes do not.
 */
(function () {
  'use strict';
  if (window.PMDInventoryFocusDialogsV1) return;
  var root = document.querySelector('#pmd-inventory-v1[data-pmd-inventory-root]');
  var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
  if (!root || !workspace) return;

  var definitions = [
    {key:'stock', selector:'[data-r19-stock-editor]', close:'[data-r19-close-stock-editor]', label:'STOCK / ITEM SETTINGS', title:'Edit stock item'},
    {key:'purchase', selector:'[data-r19-purchase-editor]', close:'[data-r19-close-purchase-editor]', label:'PURCHASES / RECEIVING', title:'Receive stock', delivery:true},
    {key:'waste', selector:'[data-r19-waste-editor]', close:'[data-r19-close-waste-editor]', label:'WASTE / STOCK LOSS', title:'Record waste'},
    {key:'review', selector:'[data-r19-receipt-review]', close:'[data-r19-close-review]', label:'PURCHASES / REVIEW', title:'Review purchase', delivery:true,wide:true},
    {key:'count', selector:'[data-r19-count]', close:'[data-r19-cancel-count]', label:'STOCK / PHYSICAL COUNT', title:'Physical count', wide:true,locked:true},
    {key:'barcode', selector:'[data-r19-barcode-panel]', close:'[data-r19-barcode-close]', label:'PURCHASES / BARCODE', title:'Scan product codes', delivery:true,wide:true}
  ];
  var dialogs = Object.create(null);
  var stack = [];
  var delivery = null;
  var purchasePane = workspace.querySelector('[data-r19-pane="purchases"]');
  var lastFocused = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function buildDelivery() {
    if (!purchasePane) return;
    var meta = purchasePane.querySelector('.pmd-inv-r19-purchase-meta');
    var head = purchasePane.querySelector('.pmd-inv-r19-section-head');
    if (!meta || !head) return;

    var searchInput = meta.querySelector('[data-r19-purchase-search]');
    var searchLabel = searchInput && searchInput.closest('label');
    var actions = head.querySelector('.pmd-inv-r19-head-actions');
    if (searchLabel && actions) {
      searchLabel.classList.add('pmd-inv-r25-search');
      searchInput.setAttribute('aria-label', 'Search ingredient catalogue');
      actions.insertBefore(searchLabel, actions.firstChild);
    }

    delivery = el('details', 'pmd-inv-r25-delivery');
    var summary = el('summary', 'pmd-inv-r25-delivery__summary');
    var copy = el('span', 'pmd-inv-r25-delivery__copy');
    copy.appendChild(el('strong', '', 'Delivery details'));
    copy.appendChild(el('small', '', 'Supplier, date and invoice · optional'));
    summary.appendChild(copy);
    var arrow = el('span', 'pmd-inv-r25-delivery__arrow', '⌄');
    arrow.setAttribute('aria-hidden', 'true');
    summary.appendChild(arrow);
    delivery.appendChild(summary);
    meta.parentNode.insertBefore(delivery, meta);
    delivery.appendChild(meta);
  }

  function mountDelivery(activeKey) {
    if (!delivery || !purchasePane) return;
    var dialog = dialogs[activeKey];
    if (dialog && dialog.definition.delivery) {
      if (delivery.parentNode !== dialog.content) {
        dialog.content.insertBefore(delivery, dialog.host);
      }
    } else {
      var anchor = purchasePane.querySelector('[data-r19-purchase-main]');
      if (delivery.parentNode !== purchasePane) {
        if (anchor) purchasePane.insertBefore(delivery, anchor);
        else purchasePane.appendChild(delivery);
      }
    }
  }

  function enabledFocusables(container) {
    return Array.prototype.filter.call(
      container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
      function (node) {
        return !node.hidden && !node.closest('[hidden]') && node.getClientRects().length > 0;
      }
    );
  }

  function refresh() {
    var activeKey = stack.length ? stack[stack.length - 1] : null;
    Object.keys(dialogs).forEach(function (key) {
      dialogs[key].overlay.hidden = key !== activeKey;
    });
    mountDelivery(activeKey);
    document.body.classList.toggle('pmd-inv-r25-dialog-active', Boolean(activeKey));
    if (!activeKey && lastFocused && document.contains(lastFocused)) {
      var target = lastFocused;
      lastFocused = null;
      window.requestAnimationFrame(function () {
        if (document.contains(target)) {
          try { target.focus({preventScroll:true}); } catch (ignore) {}
        }
      });
    }
  }

  function renderHeading(dialog) {
    var original = dialog.host.querySelector('.pmd-inv-r19-editor-head h3, .pmd-inv-r19-count-head h3, .pmd-inv-r23-barcode__head h3');
    var title = original ? String(original.textContent || '').trim() : '';
    dialog.heading.textContent = title || dialog.definition.title;
    var sub = dialog.host.querySelector('.pmd-inv-r19-editor-head small, .pmd-inv-r19-count-head small, .pmd-inv-r23-barcode__head p');
    var context = sub ? String(sub.textContent || '').trim() : '';
    dialog.description.textContent = context || dialog.definition.title;
    dialog.description.hidden = !context;
  }

  function syncDialog(dialog) {
    var key = dialog.definition.key;
    var index = stack.indexOf(key);
    var nowOpen = !dialog.host.hidden;
    if (nowOpen) {
      renderHeading(dialog);
      if (index < 0) {
        if (!stack.length) lastFocused = document.activeElement;
        stack.push(key);
        refresh();
        window.requestAnimationFrame(function () {
          if (stack[stack.length - 1] !== key) return;
          var fields = enabledFocusables(dialog.sheet);
          var preferred = dialog.host.querySelector('input:not([readonly]):not([type="hidden"]):not([type="file"]),select,textarea');
          var target = preferred && !preferred.closest('[hidden]') ? preferred : (fields[0] || dialog.sheet);
          try { target.focus({preventScroll:true}); } catch (ignore) {}
        });
      }
    } else if (index >= 0) {
      stack.splice(index, 1);
      refresh();
      if (stack.length) {
        var previous = dialogs[stack[stack.length - 1]];
        if (previous) previous.sheet.focus({preventScroll:true});
      }
    }
  }

  function isSubmissionPending(dialog) {
    var button = dialog.host.querySelector('[data-r19-submit-purchase],[data-r19-submit-waste],[data-r19-save-stock-item],[data-r19-confirm-bulk]');
    return Boolean(button && button.disabled);
  }

  function requestClose(dialog) {
    if (dialog.definition.locked || isSubmissionPending(dialog)) return;
    var original = dialog.host.querySelector(dialog.definition.close);
    if (original) original.click(); // Existing handler cleans selections and barcode state.
  }

  function addDialog(definition) {
    var host = workspace.querySelector(definition.selector);
    if (!host) return;
    var overlay = el('div', 'pmd-inv-r25-overlay');
    overlay.hidden = true;
    overlay.setAttribute('data-pmd-inv-r25-dialog', definition.key);
    var backdrop = el('button', 'pmd-inv-r25-overlay__backdrop');
    backdrop.type = 'button';
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Close dialog');
    var sheet = el('section', 'pmd-inv-r25-sheet' + (definition.wide ? ' is-wide' : ''));
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.tabIndex = -1;
    var headingId = 'pmd-inv-r25-title-' + definition.key;
    sheet.setAttribute('aria-labelledby', headingId);
    var top = el('header', 'pmd-inv-r25-sheet__header');
    var names = el('div', 'pmd-inv-r25-sheet__names');
    names.appendChild(el('span', 'pmd-inv-r25-sheet__eyebrow', definition.label));
    var heading = el('h2', 'pmd-inv-r25-sheet__title', definition.title);
    heading.id = headingId;
    names.appendChild(heading);
    var description = el('p', 'pmd-inv-r25-sheet__description');
    names.appendChild(description);
    top.appendChild(names);
    var close = el('button', 'pmd-inv-r25-sheet__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close ' + definition.title.toLowerCase());
    if (definition.locked) close.hidden = true;
    top.appendChild(close);
    var content = el('div', 'pmd-inv-r25-sheet__content');
    overlay.appendChild(backdrop);
    sheet.appendChild(top);
    sheet.appendChild(content);
    overlay.appendChild(sheet);
    workspace.appendChild(overlay);
    content.appendChild(host); // Keeps existing workspace event delegation intact.
    var dialog = {definition:definition,host:host,overlay:overlay,sheet:sheet,heading:heading,description:description,content:content};
    dialogs[definition.key] = dialog;
    backdrop.addEventListener('click', function () { requestClose(dialog); });
    close.addEventListener('click', function () { requestClose(dialog); });
    var observer = new MutationObserver(function () { syncDialog(dialog); });
    observer.observe(host, {attributes:true,attributeFilter:['hidden'],childList:true});
    syncDialog(dialog);
  }

  function onKeydown(event) {
    if (!stack.length) return;
    var dialog = dialogs[stack[stack.length - 1]];
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      requestClose(dialog);
      return;
    }
    if (event.key !== 'Tab') return;
    var controls = enabledFocusables(dialog.sheet);
    if (!controls.length) {
      event.preventDefault();
      dialog.sheet.focus();
      return;
    }
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.sheet.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.sheet.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  buildDelivery();
  definitions.forEach(addDialog);
  root.classList.add('pmd-inv-r25-ready');
  document.addEventListener('keydown', onKeydown, true);
  window.PMDInventoryFocusDialogsV1 = {version:'1.0.0'};
}());