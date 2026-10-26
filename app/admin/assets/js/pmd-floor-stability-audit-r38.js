/* PMD_FLOOR_R38_AUDIT
   Read-only production diagnostics; no timers/DOM observers/changes. */
(function(){
  'use strict';
  function audit(){
    var root=document.getElementById('pmd-r2-shared-floor-canvas-v310');
    if(!root)return {ready:false,reason:'Floor not present on this page'};
    var switcher=root.querySelector('[data-pmd-floor-switcher]');
    var buttons=switcher?Array.prototype.slice.call(switcher.querySelectorAll('[data-pmd-floor-switch]')):[];
    var cards=Array.prototype.slice.call(root.querySelectorAll('[data-floor-canvas] > [data-floor-table]'));
    var registry=window.PMDSharedFloorMultiFloorV1;
    var registryState=null;
    try {registryState=registry&&typeof registry.audit==='function'?registry.audit():null;}catch(e){registryState={error:String(e)};}
    return {
      ready:true,
      serverBoot:root.getAttribute('data-pmd-floor-boot-source'),
      hydrated:root.getAttribute('data-pmd-floor-hydrated'),
      management:root.getAttribute('data-pmd-floor-table-manager')==='true',
      activeId:root.getAttribute('data-pmd-active-floor-id'),
      serverButtonCount:buttons.length,
      floorButtons:buttons.map(function(b){
        var st=getComputedStyle(b);
        var rc=b.getBoundingClientRect();
        return {name:b.textContent.trim(),selected:b.getAttribute('aria-selected'),hidden:b.hidden,display:st.display,width:Math.round(rc.width)};
      }),
      switcherHidden:switcher?switcher.hidden:null,
      switcherDisplay:switcher?getComputedStyle(switcher).display:null,
      floorCount:registryState&&registryState.floorCount,
      registeredFloors:registryState&&registryState.floors,
      tableNodes:cards.length,
      reusedRows:root.__pmdR38PreservedRowRenderCount||0,
      tableGeometry:cards.map(function(node){
        var rect=node.getBoundingClientRect();
        return {
          id:node.getAttribute('data-floor-table'),
          status:node.getAttribute('data-status'),
          x:node.style.left,y:node.style.top,
          width:Math.round(rect.width),height:Math.round(rect.height)
        };
      })
    };
  }
  window.PMDFloorR38={audit:audit,version:'38.0.0'};
})();
