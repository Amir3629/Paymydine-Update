/* PMD_ADMIN_CONTROL_LANGUAGE_R29
 * Presentation-only control roles. All existing listeners, data-* actions,
 * native select options, classes and form submit behavior stay authoritative.
 * Canonical reference: Floor Create Table R32-R40 and Inventory R28.
 * Large interactive tiles, sidebar nav, KDS workflow and POS touch grids
 * intentionally keep their existing geometry and meanings.
 */
(function () {
  'use strict';
  if (window.PMDAdminControlLanguageR29) return;

  var selector = 'button,input[type="button"],input[type="submit"],a.btn,a[role="button"],a.kds-settings-btn,label.btn,select';
  var excluded = [
    '#pmd-side-menu2','#pmd-side-menu2-backdrop',
    '.pmd-side-menu2','.pmd-floor-table-manager',
    '[data-pmd-floor-table-manager-portal]',
    '#pmd-inventory-v1', // Local R28 already owns all its control geometry.
    '[data-pmd-inv-r27-native]',
    '.pmd-glass-stepper','.pmd-inv-r27-stepper',
    '.pmd-admin-kpi','.pmd-r2-kpi-v2401-card',
    '.pmd-inv-r19-owned-card','.pmd-inv-r19-product-card',
    '.pmd-inv-r19-custom-card',
    '.pmd-dashboard-lab-floor','.pmd-dashboard-lab-floorplan',
    '[data-pmd-floor-canvas]','[data-pmd-shared-floor-canvas]',
    '.pmd-reservation-calendar','.pmd-shifts-big-calendar',
    '.pmd-shifts-calendar-grid','.pmd-shifts-week-grid',
    '.pmd-pos-grid','.pmd-pos-keypad',
    '[data-pmd-pos-root]','#orders-grid','.order-card','.order-status-buttons',
    '#kds-zoom-in','#kds-zoom-out','.kds-undo-action',
    '.modal-backdrop','.offcanvas-backdrop',
    '.pmd-inv-r25-overlay__backdrop',
    '[data-pmd-admin-control-ignore]'
  ].join(',');

  function valid(node) {
    return Boolean(node && node.nodeType === 1 && node.matches && node.matches(selector));
  }
  function isExcluded(node) {
    if (!valid(node)) return true;
    if (node.closest(excluded)) return true;
    if (node.matches('[hidden],[aria-hidden="true"],[data-pmd-ui-ignore]')) return true;
    var role = (node.getAttribute('role') || '').toLowerCase();
    if (['gridcell','menuitem','switch','spinbutton','checkbox','radio','slider','treeitem'].indexOf(role) !== -1) return true;

    var klass = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    // These are functional controls, not conventional buttons; padding,
    // shadows and hover changes would compromise floor/table touch targets.
    if (/(^|[\s_-])(backdrop|handle|resizer|drag|resize|stepper|spinner|keypad|calendar-cell|day-cell|time-slot|table-card|product-card|owned-card|kpi-card|map-marker)([\s_-]|$)/.test(klass)) return true;
    return false;
  }

  function textOf(node) {
    return String(node.value || node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim();
  }
  function classify(node) {
    if (node.localName === 'select') {
      if (node.multiple || node.hasAttribute('multiple') || Number(node.getAttribute('size') || 0) > 1) return '';
      if (node.closest('.selectize-control,.select2-container,.choices,.ts-wrapper,[data-select2-id]')) return '';
      return 'select';
    }

    var klass = typeof node.className === 'string' ? node.className.toLowerCase() : '';
    var role = (node.getAttribute('role') || '').toLowerCase();
    var label = textOf(node).toLowerCase();
    var type = (node.getAttribute('type') || '').toLowerCase();
    var data = Array.prototype.map.call(node.attributes || [], function (attr) {
      return String(attr.name || '').toLowerCase();
    }).filter(function (name) { return name.indexOf('data-') === 0; }).join(' ');

    if (/(\bbtn-danger\b|\bdanger\b|\bdestructive\b|\bdelete\b|\barchive\b|\bremove\b|\btrash\b|\bvoid\b)/.test(klass) ||
        /\b(data-[\w-]*(?:delete|remove|archive|void|discard)[\w-]*)\b/.test(data) ||
        /^(delete|remove|archive|discard|void|löschen|entfernen|archivieren|حذف)(\s|$)/i.test(label)) return 'danger';

    if ((node.localName === 'label' && node.querySelector('input[type="radio"],input[type="checkbox"]')) ||
        role === 'tab' || node.hasAttribute('aria-pressed') ||
        node.hasAttribute('aria-selected') ||
        /(?:^|[\s_-])(tab|filter|chip|choice|option|segment|category|preset|pill)(?:[\s_-]|$)/.test(klass) ||
        /data-[\w-]*(?:filter|category|tab|preset|main-key|sub-key|days)\b/.test(data)) return 'choice';

    if (/(\bbtn-primary\b|\bbtn-success\b|\bbtn-save\b|\bprimary\b|\bsubmit\b|\bconfirm\b)/.test(klass) ||
        /data-[\w-]*(?:save|submit|confirm|create|complete|add|apply|publish)\b/.test(data) ||
        type === 'submit' ||
        /^(save|add|create|confirm|complete|apply|publish|send|record|generate|start|pay|speichern|hinzufügen|bestätigen|ذخیره|ثبت|تایید|تأیید)(\s|$)/i.test(label)) return 'primary';

    var visibleText = String(node.value || node.textContent || '').replace(/\s+/g,' ').trim();
    if ((!visibleText || /^[+\-−×✕⋮⋯⌄‹›]+$/.test(visibleText)) &&
        (node.querySelector('svg,i,[class*="icon"]') ||
         node.getAttribute('aria-label') ||
         /(?:^|[\s_-])(icon|close|menu|bell|collapse|expand)(?:[\s_-]|$)/.test(klass))) {
      return 'icon';
    }

    return 'secondary';
  }

  function tag(node) {
    if (isExcluded(node)) return;
    var kind = classify(node);
    if (!kind) return;
    if (kind === 'select') {
      node.setAttribute('data-pmd-admin-select-r29','1');
      return;
    }
    node.setAttribute('data-pmd-admin-action-r29',kind);
    // Do not insert an SVG or replace text nodes: handlers may inspect
    // textContent and Vue/Alpine/React may own the control's children.
    if (kind === 'primary' && node.localName !== 'input' &&
        !node.querySelector('svg, img, .icon, [class*="icon"]') &&
        /^(save|speichern|ذخیره)(\s|$)/i.test(textOf(node))) {
      node.setAttribute('data-pmd-admin-action-icon-r29','save');
    }
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (valid(node)) tag(node);
    if (node.querySelectorAll) node.querySelectorAll(selector).forEach(tag);
  }

  function start() {
    if (window.PMDAdminControlLanguageR29) return;
    if (!document.body) return;
    document.body.classList.add('pmd-admin-controls-r29-ready');
    // Maintain the older Admin UI Kit, but make visual roles explicit for
    // every standard actionable button, across page-specific Ajax renders.
    scan(document.body);
    var pending = new Set();
    var queued = false;
    var watcher = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node && node.nodeType === 1) pending.add(node);
        });
      });
      if (queued || !pending.size) return;
      queued = true;
      Promise.resolve().then(function () {
        queued = false;
        var nodes = Array.from(pending);
        pending.clear();
        nodes.forEach(scan);
      });
    });
    watcher.observe(document.body,{childList:true,subtree:true});
    window.PMDAdminControlLanguageR29 = {
      version:'1.0.0',
      // Diagnostics, not an API for mutating purchase/booking data.
      count:function () { return document.querySelectorAll('[data-pmd-admin-action-r29]').length; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else start();
}());