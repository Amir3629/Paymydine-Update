/* PMD_MENU_HEADER_COMPACT_TOOLS_V1_20261020
   Native details/summary owns keyboard toggling and no-JS fallback.
   This tiny enhancement closes the disclosure after selecting a tool,
   when clicking elsewhere, or on Escape. Tool DOM/event handlers unchanged. */
(function () {
  'use strict';
  if (window.PMDMenuCompactToolsV1) return;
  window.PMDMenuCompactToolsV1 = true;
  function init() {
    var root = document.querySelector('#pmd-menu-manager-main > #pmd-r2-clean-header');
    var tools = root && root.querySelector('[data-pmd-menu-header-tools-v1]');
    if (!tools) return;
    var summary = tools.querySelector('summary');
    var panel = tools.querySelector('[data-pmd-menu-header-tools-panel-v1]');
    if (!summary || !panel) return;
    function close(refocus) {
      if (!tools.open) return;
      tools.open = false;
      if (refocus) summary.focus({preventScroll:true});
    }
    document.addEventListener('pointerdown', function(event) {
      if (tools.open && !tools.contains(event.target)) close(false);
    }, true);
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && tools.open) {
        event.preventDefault();
        close(true);
      }
      if (event.key === 'ArrowDown' && event.target === summary && !tools.open) {
        event.preventDefault();
        tools.open = true;
        var first = panel.querySelector('button:not([disabled]):not([aria-hidden="true"])');
        if (first) first.focus({preventScroll:true});
      }
    });
    panel.addEventListener('click', function(event) {
      var action = event.target.closest('button');
      if (!action || action.disabled) return;
      // Close in next animation frame, after the action's existing click
      // handler has run (modals, stock mode, sorting and AI import).
      window.requestAnimationFrame(function(){close(false);});
    });
    document.addEventListener('focusin',function(event) {
      if (tools.open && !tools.contains(event.target)) close(false);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();