/* PMD_INVENTORY_EXACT_TABLE_CARD_R28
 * Presentation adapters for the live Inventory R19/R24/R25/R26/R27 controls.
 * Reference is the REAL Create Table R32-R40 structure (icon-labelled fields,
 * no title-band chrome, compact steppers, gradient icon Save actions).
 * Never create replacement buttons/inputs, alter a data-r19 attribute or
 * change a form writer. R19 event delegation remains authoritative.
 */
(function () {
  'use strict';
  if (window.PMDInventoryExactTableCardR28) return;

  var savePath = '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>';
  var paths = {
    grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
    package: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
    bars: '<path d="M6 20v-8M12 20V5M18 20v-5M3 20h18"/>',
    sliders: '<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
    tag: '<path d="M20 13 12 21 3 12V4h8z"/><circle cx="7.5" cy="8" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    box: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M9 12h6M9 16h6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-2-2-7-1.5-7 1 0 2.5 7 1 7 4s-5 3-7 1M12 5v14"/>',
    note: '<path d="M7 3h8l4 4v14H7zM15 3v5h4M10 12h6M10 16h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    drinks: '<path d="M5 3h14l-2 9-5 3-5-3zM12 15v6M8 21h8"/>',
    utensils: '<path d="M4 3v8M7 3v8M10 3v8M7 11v10M16 3c-3 5-4 10 2 10v8"/>',
    sparkles: '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM8 8h8M8 12h8"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || paths.grid) + '</svg>';
  }

  function iconForField(name) {
    var x = String(name || '').trim().toLowerCase();
    if (/quantity|qty|par|reorder|safety stock|lead time|multiple|minimum order|contains/.test(x)) return 'bars';
    if (/price|cost|amount/.test(x)) return 'money';
    if (/category|name|sku|code|barcode/.test(x)) return 'tag';
    if (/storage|supplier/.test(x)) return 'box';
    if (/lot|batch/.test(x)) return 'layers';
    if (/expir|date/.test(x)) return 'calendar';
    if (/unit|conversion|factor|costing/.test(x)) return 'package';
    if (/note|reason|image/.test(x)) return 'note';
    return 'sliders';
  }

  function decorateLabel(label) {
    if (!label || label.hasAttribute('data-pmd-inv-r28-label') ||
        label.matches('.pmd-inv-r24-check') ||
        !label.querySelector('input:not([type="checkbox"]),select,textarea')) return;
    var directText = Array.prototype.filter.call(label.childNodes, function (node) {
      return node.nodeType === 3 && String(node.textContent).trim();
    });
    if (!directText.length) return;
    var name = directText.map(function (node) { return String(node.textContent).trim(); }).join(' ').trim();
    if (!name) return;

    // The original R19 label is still the accessible control owner. Only its
    // loose text nodes move into an icon/title wrapper; inputs remain untouched.
    var title = document.createElement('span');
    title.className = 'pmd-inv-r28-field-title';
    title.setAttribute('data-pmd-inv-r28-field-title', '');
    title.innerHTML = icon(iconForField(name));
    var text = document.createElement('b');
    text.textContent = name;
    title.appendChild(text);
    directText.forEach(function (node) { node.parentNode.removeChild(node); });
    label.insertBefore(title, label.firstChild);
    label.setAttribute('data-pmd-inv-r28-label', '1');
  }

  function decorateSave(button) {
    if (!button || button.getAttribute('data-pmd-inv-r28-save') === '1') return;
    var label = String(button.textContent || '').trim();
    if (!label) return;
    // Exact 16x16 SVG structure of pmd-floor-table-manager__save.
    // Keep the original R19 data-* attribute and button instance for handlers.
    var symbol = document.createElement('span');
    symbol.className = 'pmd-inv-r28-save-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      savePath + '</svg>';
    var text = document.createElement('span');
    text.setAttribute('data-pmd-inv-r28-save-text', '');
    text.textContent = label;
    button.textContent = '';
    button.appendChild(symbol);
    button.appendChild(text);
    button.setAttribute('data-pmd-inv-r28-save', '1');
  }

  function decorateHost(host) {
    if (!host) return;
    host.querySelectorAll('.pmd-inv-r19-editor-fields > label, .pmd-inv-r19-editor-fields label, [data-r19-bulk-line] > label').forEach(decorateLabel);
    host.querySelectorAll('.pmd-inv-r19-editor-actions button.pmd-inv-r19-primary').forEach(decorateSave);
    host.querySelectorAll('.pmd-inv-r19-editor-actions button.pmd-inv-r26-cancel').forEach(function (button) {
      button.classList.add('pmd-inv-r28-cancel');
    });
  }

  function decorateCategoryButton(button) {
    if (!button || button.getAttribute('data-pmd-inv-r28-category') === '1') return;
    var key = button.getAttribute('data-r19-stock-main-key') ||
      button.getAttribute('data-r19-purchase-main-key') ||
      button.getAttribute('data-r19-waste-main-key');
    if (!key) return;

    var raw = String(button.textContent || '').trim();
    var count = (raw.match(/·\s*([\d.,]+)\s*$/) || [,''])[1];
    var display = {
      Food: {text:'Food',icon:'utensils'},
      Drinks: {text:'Drinks',icon:'drinks'},
      Alcohol: {text:'Alcohol',icon:'receipt'},
      Supplies: {text:'Supplies',icon:'package'}
    }[key];
    if (!display) return;
    // This is a FILTER, not a Save action: same table-feature visual family
    // and selected jade fill, but no Save icon/handler/class.
    button.textContent = '';
    var symbol = document.createElement('span');
    symbol.className = 'pmd-inv-r28-category-icon';
    symbol.setAttribute('aria-hidden','true');
    symbol.innerHTML = icon(display.icon);
    var name = document.createElement('span');
    name.className = 'pmd-inv-r28-category-name';
    name.textContent = display.text;
    var number = document.createElement('small');
    number.className = 'pmd-inv-r28-category-count';
    number.textContent = count;
    button.appendChild(symbol);
    button.appendChild(name);
    if (count) button.appendChild(number);
    button.setAttribute('data-pmd-inv-r28-category','1');
    button.setAttribute('aria-pressed',button.classList.contains('is-active')?'true':'false');
  }

  function start() {
    if (window.PMDInventoryExactTableCardR28) return;
    var root = document.querySelector('#pmd-inventory-v1[data-pmd-inventory-root]');
    if (!root || !window.PMDInventoryTableCardParityR27 ||
        !window.PMDInventoryUIPolishR26 ||
        !window.PMDInventoryFocusDialogsV1) return;
    var workspace = root.querySelector('[data-pmd-inv-r19-workspace]');
    if (!workspace) return;

    ['stock','purchase','waste','review','count','barcode'].forEach(function (key) {
      var overlay = workspace.querySelector('[data-pmd-inv-r25-dialog="' + key + '"]');
      if (!overlay) return;
      var host = overlay.querySelector([
        '[data-r19-stock-editor]','[data-r19-purchase-editor]',
        '[data-r19-waste-editor]','[data-r19-receipt-review]',
        '[data-r19-count]','[data-r19-barcode-panel]'
      ].join(','));
      if (!host) return;
      decorateHost(host);
      // R19 replaces the form's direct children on every item selection.
      // R26 and R27 already watch this same host: only listen to direct
      // replacement here, never subtree icon/label additions (loop guard).
      var pending = false;
      new MutationObserver(function (changes) {
        if (!changes.some(function (x) { return x.type === 'childList'; }) || pending) return;
        pending = true;
        Promise.resolve().then(function () { pending = false; decorateHost(host); });
      }).observe(host,{childList:true});
    });

    ['[data-r19-stock-main]','[data-r19-purchase-main]','[data-r19-waste-main]'].forEach(function (selector) {
      var holder = workspace.querySelector(selector);
      if (!holder) return;
      function update() {
        holder.querySelectorAll('button').forEach(decorateCategoryButton);
      }
      update();
      new MutationObserver(update).observe(holder,{childList:true});
    });

    // Shopping is a related Inventory action surface, not a Table dialog.
    // Give the primary Open Purchases the exact Save-action treatment.
    decorateSave(workspace.querySelector('[data-r19-shopping-purchases]'));

    root.classList.add('pmd-inv-r28-ready');
    window.PMDInventoryExactTableCardR28 = {version:'1.0.0'};
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else start();
}());