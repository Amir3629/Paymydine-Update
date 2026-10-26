/* PMD_DASHBOARD_EMPTY_ENHANCEMENT_R36. Never write data; reuse the Table Manager button. */
(function(){
  'use strict';
  function enhanceFloor(root){
    if(!root)return;
    var empty=root.querySelector('[data-pmd-floor-empty-r36]');
    if(!empty)return;
    var heading=empty.querySelector('[data-pmd-floor-empty-title-r36]');
    var canvas=root.querySelector('[data-floor-canvas]');
    function update(){
      if(empty.hidden)return;
      var hasTables=!!(canvas&&canvas.querySelector('[data-floor-table],.pmd-floor-v1__table'));
      if(heading)heading.textContent=hasTables?'No tables match this view':'No tables on this floor yet';
    }
    update();
    if(typeof MutationObserver!=='undefined'){
      var observer=new MutationObserver(update);
      observer.observe(empty,{attributes:true,attributeFilter:['hidden']});
      if(canvas)observer.observe(canvas,{childList:true,subtree:false});
      root.addEventListener('pmd:floor-updated',update);
    }
  }
  function enhanceAnalytics(){
    var parent=document.getElementById('pmd-dashboard-lab-analytics-v1');
    if(!parent)return;
    function apply(body){
      if(!body)return;
      var note=body.querySelector('.pmd-dashboard-lab-empty');
      if(!note||note.classList.contains('pmd-r36-empty-notice'))return;
      note.classList.add('pmd-r36-empty-notice');
      var message=document.createElement('span');
      message.className='pmd-r36-empty-notice__message';
      message.textContent=note.textContent.trim();
      note.textContent='';
      var icon=document.createElement('span');
      icon.className='pmd-r36-empty-notice__icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 14l3-3 3 2 4-5"/></svg>';
      note.appendChild(icon);note.appendChild(message);
    }
    parent.querySelectorAll('[data-pmd-lab-widget-body]').forEach(function(body){
      apply(body);
      if(typeof MutationObserver==='undefined')return;
      new MutationObserver(function(){apply(body)}).observe(body,{childList:true});
    });
  }
  function boot(){
    enhanceFloor(document.getElementById('pmd-r2-shared-floor-canvas-v310'));
    enhanceAnalytics();
    window.PMDDashboardR36={ready:true};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
