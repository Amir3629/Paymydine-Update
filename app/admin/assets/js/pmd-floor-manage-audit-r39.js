/* PMD_EDIT_FLOOR_R39_AUDIT: read-only, never reveals an unauthorized action */
(function(){
 'use strict';
 function audit(){
   var root=document.getElementById('pmd-r2-shared-floor-canvas-v310');
   if(!root)return {ready:false,reason:'No shared Floor on this route'};
   var authorized=root.getAttribute('data-pmd-floor-table-manager')==='true';
   var switcher=root.querySelector('[data-pmd-floor-switcher]');
   var edit=root.querySelector('[data-pmd-floor-manage]');
   var addTable=root.querySelector('[data-pmd-floor-table-add]');
   var editTable=root.querySelector('[data-pmd-floor-table-edit]');
   var panels=document.querySelectorAll('[data-pmd-floor-manage-panel]').length;
   function size(el){
     if(!el)return null;
     var r=el.getBoundingClientRect();
     var st=window.getComputedStyle(el);
     return {width:Math.round(r.width),height:Math.round(r.height),fontSize:st.fontSize,display:st.display,visibility:st.visibility,disabled:!!el.disabled,hidden:el.hidden};
   }
   var registry=null;
   try{
     registry=window.PMDSharedFloorMultiFloorV1&&window.PMDSharedFloorMultiFloorV1.audit();
   }catch(e){registry={error:String(e)};}
   return {
     ready:true,
     authorized:authorized,
     floorCount:registry&&registry.floorCount,
     activeId:root.getAttribute('data-pmd-active-floor-id'),
     activeFloorName:root.getAttribute('data-pmd-active-floor-name'),
     switcherHidden:!!(switcher&&switcher.hidden),
     editFloorPresent:!!edit,
     editFloorVisible:!!(authorized&&edit&&!edit.hidden&&size(edit).display!=='none'),
     editFloorPanelPresent:panels===1,
     floorTabs:switcher?Array.prototype.slice.call(switcher.querySelectorAll('[data-pmd-floor-switch]')).map(function(btn){
       var style=window.getComputedStyle(btn);
       return {
         name:btn.textContent.trim(),
         isSelected:btn.classList.contains('is-active')||btn.getAttribute('aria-selected')==='true',
         size:size(btn),
         backgroundColor:style.backgroundColor,
         backgroundImage:style.backgroundImage,
         textColor:style.color
       };
     }):[],
     editFloor:size(edit),
     addTable:size(addTable),
     editTable:size(editTable)
   };
 }
 window.PMDEditFloorR39={version:'39.1.0',audit:audit};
 window.PMDFloorR40={version:'40.0.0',audit:audit};
})();
