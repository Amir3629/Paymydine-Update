/* PMD_INVENTORY_TABLE_CARD_PARITY_R27
 * One browser top-layer dialog for all R25 inventory panels.
 * Unlike a body portal, this keeps all R19/R24 delegated events in workspace.
 * The browser owns viewport centering, sidebar coverage, and focus inertness.
 */
(function () {
  'use strict';
  if (window.PMDInventoryTableCardParityR27) return;

  function start() {
    if (window.PMDInventoryTableCardParityR27) return;
    var root = document.querySelector('#pmd-inventory-v1[data-pmd-inventory-root]');
    var workspace = root && root.querySelector('[data-pmd-inv-r19-workspace]');
    if (!root || !workspace ||
        !window.PMDInventoryFocusDialogsV1 ||
        !window.PMDInventoryUIPolishR26 ||
        !window.HTMLDialogElement ||
        !HTMLDialogElement.prototype.showModal) return;

    var kinds = ['stock', 'purchase', 'waste', 'review', 'count', 'barcode'];
    var overlays = kinds.map(function (kind) {
      return workspace.querySelector('[data-pmd-inv-r25-dialog="' + kind + '"]');
    });
    if (overlays.some(function (overlay) { return !overlay; })) return;

    // Exactly one native dialog = one full-window ::backdrop (also over sidebar).
    var portal = document.createElement('dialog');
    portal.className = 'pmd-inv-r27-native';
    portal.setAttribute('data-pmd-inv-r27-native', '1');
    workspace.appendChild(portal);
    overlays.forEach(function (overlay) {
      portal.appendChild(overlay);
      // The native <dialog> is now the sole semantic modal owner.
      var sheet = overlay.querySelector('.pmd-inv-r25-sheet');
      if (sheet) {
        sheet.removeAttribute('role');
        sheet.removeAttribute('aria-modal');
      }
    });

    function currentOverlay() {
      var opened = overlays.filter(function (overlay) { return !overlay.hidden; });
      return opened.length ? opened[opened.length - 1] : null;
    }

    function dismissActive() {
      var overlay = currentOverlay();
      if (!overlay || overlay.getAttribute('data-pmd-inv-r25-dialog') === 'count') return;
      // Use the existing close control: it checks busy state and cleans R19 data.
      var close = overlay.querySelector('.pmd-inv-r25-sheet__close');
      if (close && !close.hidden) close.click();
    }

    portal.addEventListener('cancel', function (event) {
      // Never let the browser bypass R19 count cancellation or pending saves.
      event.preventDefault();
      dismissActive();
    });
    portal.addEventListener('click', function (event) {
      if (event.target === portal ||
          (event.target.classList &&
           event.target.classList.contains('pmd-inv-r25-overlay'))) {
        dismissActive();
      }
    });

    var queued = false;
    function sync() {
      var active = currentOverlay();
      if (active) {
        var title = active.querySelector('.pmd-inv-r25-sheet__title');
        if (title && title.id) portal.setAttribute('aria-labelledby', title.id);
        // The original overlay was nested inside a transformed Inventory panel.
        // Native showModal promotes this unchanged subtree into the top layer.
        if (!portal.open) portal.showModal();
        document.documentElement.classList.add('pmd-inv-r27-modal-open');
      } else {
        if (portal.open) portal.close();
        document.documentElement.classList.remove('pmd-inv-r27-modal-open');
      }
    }
    function scheduleSync() {
      if (queued) return;
      queued = true;
      Promise.resolve().then(function () { queued = false; sync(); });
    }
    var observer = new MutationObserver(scheduleSync);
    overlays.forEach(function (overlay) {
      observer.observe(overlay, {attributes:true, attributeFilter:['hidden']});
    });

    // Match the Table Manager R34 numeric +/- controls without replacing inputs
    // or interfering with count blind-mode, existing receipt lines or quantities.
    function setNumericValue(input, direction) {
      if (input.disabled || input.readOnly) return;
      var step = Number(input.step);
      if (!Number.isFinite(step) || step <= 0) step = 1;
      var min = input.min === '' ? -Infinity : Number(input.min);
      var max = input.max === '' ? Infinity : Number(input.max);
      var current = input.value === '' ? (Number.isFinite(min) ? min : 0) : Number(input.value);
      if (!Number.isFinite(current)) current = 0;
      var digits = (String(step).split('.')[1] || '').length;
      var value = Number((current + direction * step).toFixed(Math.min(6, digits)));
      if (Number.isFinite(min)) value = Math.max(min, value);
      if (Number.isFinite(max)) value = Math.min(max, value);
      if (input.value !== String(value)) {
        input.value = String(value);
        input.dispatchEvent(new Event('input', {bubbles:true}));
        input.dispatchEvent(new Event('change', {bubbles:true}));
      }
      input.focus({preventScroll:true});
    }

    function formatNumberInputs(overlay) {
      overlay.querySelectorAll('.pmd-inv-r19-editor-fields input[type="number"]').forEach(function (input) {
        if (input.closest('.pmd-inv-r27-stepper') ||
            input.closest('.pmd-glass-stepper') ||
            input.hasAttribute('data-r19-count-input')) return;
        var parent = input.parentNode;
        if (!parent) return;

        var wrap = document.createElement('div');
        wrap.className = 'pmd-inv-r27-stepper';
        var center = document.createElement('div');
        center.className = 'pmd-inv-r27-stepper__field';
        function control(direction) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'pmd-inv-r27-stepper__control';
          button.setAttribute('aria-label', direction < 0 ? 'Decrease value' : 'Increase value');
          button.textContent = direction < 0 ? '\u2212' : '+';
          button.addEventListener('click', function (event) {
            event.preventDefault();
            setNumericValue(input, direction);
          });
          return button;
        }
        parent.insertBefore(wrap, input);
        center.appendChild(input);
        wrap.appendChild(control(-1));
        wrap.appendChild(center);
        wrap.appendChild(control(1));
      });
    }

    ['stock', 'purchase', 'waste'].forEach(function (kind) {
      var overlay = overlays[kinds.indexOf(kind)];
      formatNumberInputs(overlay);
      var watcher = new MutationObserver(function (records) {
        if (records.some(function (record) { return record.addedNodes.length; })) {
          formatNumberInputs(overlay);
        }
      });
      watcher.observe(overlay, {subtree:true,childList:true});
    });

    root.classList.add('pmd-inv-r27-ready');
    sync();
    window.PMDInventoryTableCardParityR27 = {
      version:'1.0.0',
      nativeDialog:portal,
      sync:sync
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
}());