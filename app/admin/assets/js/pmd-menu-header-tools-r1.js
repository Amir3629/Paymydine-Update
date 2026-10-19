/* PMD_MENU_HEADER_TOOLS_R1
 * Original Menu controls remain in the same header and retain every existing
 * event handler. Tools items forward one genuine button click to those native
 * controls; this script owns ONLY disclosure and never edits Menu data.
 */
(function () {
  'use strict';
  if (window.PMDMenuHeaderToolsR1) return;

  function init() {
    var root = document.getElementById('pmd-menu-manager-main');
    var actions = root && root.querySelector('[data-pmd-menu-header-actions]');
    var tools = actions && actions.querySelector('[data-pmd-menu-tools-r1]');
    var toggle = tools && tools.querySelector('[data-pmd-menu-tools-toggle-r1]');
    var panel = tools && tools.querySelector('[data-pmd-menu-tools-panel-r1]');
    if (!root || !actions || !tools || !toggle || !panel) return;

    var sources = Object.freeze({
      stock: '[data-pmd-stock-usage-setup-r22]',
      capacity: '[data-pmd-menu-capacity-open]',
      timing: '[data-pmd-kitchen-settings-trigger]',
      ai: '[data-pmd-menu-ai-import-trigger]',
      sort: '[data-pmd-menu-sort-toggle]'
    });

    function original(kind) {
      var selector = sources[kind];
      if (!selector) return null;
      var node = actions.querySelector(selector);
      // Permission is server-rendered; placeholders must not be forwarded.
      return node && !node.disabled &&
        node.getAttribute('aria-hidden') !== 'true' &&
        !node.hasAttribute('hidden') ? node : null;
    }

    function sync() {
      var count = 0;
      panel.querySelectorAll('[data-pmd-menu-tool-r1]').forEach(function (item) {
        var source = original(item.getAttribute('data-pmd-menu-tool-r1'));
        item.hidden = !source;
        item.disabled = !source;
        var pressed = !!source && source.getAttribute('aria-pressed') === 'true';
        item.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        if (source) count++;
      });
      return count;
    }

    function close(restoreFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) toggle.focus();
    }

    function open() {
      if (!sync()) return;
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!panel.hidden) close(false);
      else open();
    });

    panel.addEventListener('click', function (event) {
      var item = event.target.closest('[data-pmd-menu-tool-r1]');
      if (!item || !panel.contains(item)) return;
      event.preventDefault();
      event.stopPropagation();
      var source = original(item.getAttribute('data-pmd-menu-tool-r1'));
      close(false);
      if (source) source.click();
    });

    document.addEventListener('pointerdown', function (event) {
      if (!panel.hidden && !tools.contains(event.target)) close(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        close(true);
      }
    });

    // Workspace and category transitions may disable the entire Tools rail.
    // No polling, DOM reparenting, or observer: refresh on every new opening.
    window.PMDMenuHeaderToolsR1 = {
      version: '1.0.0',
      isOpen: function () { return !panel.hidden; },
      close: function () { close(false); },
      audit: function () {
        return {
          availableActions: sync(),
          inventory: document.body.classList.contains('pmd-menu-r20-inventory-active'),
          groupScope: root.classList.contains('pmd-group-menu-scope-active')
        };
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once: true});
  } else {
    init();
  }
})();
