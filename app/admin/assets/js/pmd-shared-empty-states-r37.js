/* PMD_SHARED_EMPTY_STATES_R37 — presentation only, no records/actions created. */
(function () {
  'use strict';
  if (window.PMDDashboardR37) return;
  function nativeFloor(root) {
    if (!root || root.id === 'pmd-r2-shared-floor-canvas-v310') return;
    var empty = root.querySelector('[data-pmd-r37-floor-empty]');
    if (!empty) return;
    var title = empty.querySelector('[data-pmd-r37-floor-empty-text]');
    var canvas = root.querySelector('[data-floor-canvas]');
    function update() {
      if (empty.hidden || !title) return;
      var hasTables = Boolean(canvas && canvas.querySelector('.pmd-floor-v1__table,[data-floor-table]'));
      var message = hasTables ? 'No tables match this view' : 'No tables on this floor yet';
      if (title.textContent !== message) title.textContent = message;
    }
    update();
    if (typeof MutationObserver === 'undefined') return;
    var observer = new MutationObserver(update);
    observer.observe(empty,{attributes:true,attributeFilter:['hidden']});
    if (canvas) observer.observe(canvas,{childList:true});
  }
  function boot() {
    document.querySelectorAll('.pmd-floor-v1').forEach(nativeFloor);
  }
  window.PMDDashboardR37 = {
    version:'37.0.0',
    audit:function(){
      var switcher = document.querySelector('#pmd-r2-shared-floor-canvas-v310 [data-pmd-floor-switcher]');
      var buttons = switcher ? Array.prototype.slice.call(switcher.querySelectorAll('[data-pmd-floor-switch]')) : [];
      return {
        floorControlsExcludedFromR29:Boolean(switcher && switcher.hasAttribute('data-pmd-admin-control-ignore')),
        unexpectedlyR29Tagged:buttons.filter(function(button){return button.hasAttribute('data-pmd-admin-action-r29');}).length,
        floorSizes:buttons.map(function(button){
          var rect=button.getBoundingClientRect();
          var style=window.getComputedStyle(button);
          return {floor:button.textContent.trim(),width:Math.round(rect.width),height:Math.round(rect.height),font:style.fontFamily,letterSpacing:style.letterSpacing};
        }),
        emptyFloorHasDuplicateCTA:Boolean(document.querySelector('[data-pmd-floor-empty-add-r36]'))
      };
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
