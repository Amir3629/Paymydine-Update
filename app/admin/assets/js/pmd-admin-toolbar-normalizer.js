(function () {
  'use strict';

  var ROOT_SELECTORS = [
    '#toolbar.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container',
    '.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container',
    '.toolbar-action > .progress-indicator-container',
    '.form-toolbar .progress-indicator-container',
    '.page-title-section > .pull-right',
    '.page-actions',
    '.control-toolbar',
    '.pmd-toolbar-main',
    '.page-title-section',
    '.page-content',
    '.content-wrapper',
    '.main-content'
  ].join(',');

  var EXCLUDED = [
    'table','thead','tbody','tr','th','td','.fixed-table-container','.list-container','.list-setup','.bulk-actions',
    '.dropdown-menu','.modal','.modal-content','.media-manager','.media-toolbar','.select2-container','#notification-panel',
    '.editor-toolbar','.EasyMDEContainer','.CodeMirror','.category-btn','.menu-card','.pmd-category-buttons','.profile-dropdown-menu'
  ].join(',');

  var BOUNDARY = '.form-widget, .list-container, .fixed-table-container, .table-responsive, .dashboard-widgets, .card, .control-list, .datatable, .pmd-menu-grid';

  function inExcluded(n){return !!(n && (n.matches(EXCLUDED)||n.closest(EXCLUDED)));}
  function txt(n){return (n.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();}

  function isDanger(btn){
    return btn.classList.contains('btn-danger')||btn.classList.contains('btn-outline-danger')||/\b(delete|remove|trash|destroy|disable|stock out)\b/.test(txt(btn))||!!btn.querySelector('.fa-trash');
  }
  function isPrimary(btn){
    var t=txt(btn), req=(btn.getAttribute('data-request')||'').toLowerCase(), plus=!!btn.querySelector('.fa-plus'), save=!!btn.querySelector('.fa-save');
    return btn.classList.contains('btn-primary')||btn.classList.contains('btn-success')||req==='onsave'||save||
      (plus && /\b(add|new|create|add item)\b/.test(t))||/\b(save|new|create|add|enable|stock in)\b/.test(t);
  }
  function isSecondary(btn){return /\b(back|select|edit layout|switch to calendar view|move|merge|cancel)\b/.test(txt(btn));}

  function validButton(btn){
    if(!btn||!btn.classList.contains('btn')) return false;
    if(inExcluded(btn)) return false;
    if(btn.classList.contains('btn-edit')||btn.classList.contains('sort-col')) return false;
    if(btn.closest('table')) return false;
    return true;
  }

  function boundaryBefore(btn){
    var root=btn.closest('.page-content, .content-wrapper, .main-content')||document.body;
    var b=root.querySelector(BOUNDARY);
    if(!b) return true;
    return !!(b.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  function candidates(container){
    var out=[]; var seen=new Set();
    container.querySelectorAll('.btn').forEach(function(btn){
      if(!validButton(btn)) return;
      if(!(btn.closest('.toolbar-action, .progress-indicator-container, .form-toolbar, .control-toolbar, .page-actions, .page-title-section, .page-content, .content-wrapper, .main-content'))) return;
      if(!boundaryBefore(btn) && !isPrimary(btn) && !isDanger(btn) && !isSecondary(btn)) return;
      if(seen.has(btn)) return; seen.add(btn); out.push(btn);
    });
    return out;
  }

  function ensureRight(c){
    var r=c.querySelector(':scope > .pmd-toolbar-right-buttons');
    if(!r){r=document.createElement('div');r.className='right-buttons pmd-toolbar-right-buttons';r.setAttribute('aria-label','Secondary toolbar actions');c.appendChild(r);} return r;
  }

  function normalizeContainer(c){
    if(!c||inExcluded(c)) return;
    var btns=candidates(c); if(!btns.length) return;
    c.classList.add('pmd-toolbar-normalized','pmd-admin-top-actions');
    var primary=null, secondary=[];
    btns.forEach(function(b){
      b.classList.remove('pmd-toolbar-primary-action','pmd-toolbar-secondary-action','pmd-toolbar-danger-action');
      if(isDanger(b)){b.classList.add('pmd-toolbar-danger-action'); secondary.push(b); return;}
      if(!primary && isPrimary(b)){primary=b; b.classList.add('pmd-toolbar-primary-action');}
      else {b.classList.add('pmd-toolbar-secondary-action'); secondary.push(b);} 
    });
    var existing=c.querySelector(':scope > .pmd-toolbar-right-buttons');
    var hasRight=!!(existing && existing.querySelector('.btn'));
    if(primary && (secondary.length>0 || hasRight)){
      c.classList.add('pmd-toolbar-split');
      var r=ensureRight(c);
      secondary.forEach(function(b){if(b!==primary && b.parentElement!==r) r.appendChild(b);});
      if(primary.parentElement!==c) c.insertBefore(primary,c.firstChild);
    } else if(!hasRight){c.classList.remove('pmd-toolbar-split');}
  }

  function run(){ if(!document.body.classList.contains('pmd-admin-theme-v1')) return; document.querySelectorAll(ROOT_SELECTORS).forEach(normalizeContainer); }
  var t=null; function sched(){clearTimeout(t); t=setTimeout(run,80);} 
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true}); setTimeout(run,300);
  var scope=document.querySelector('.page-content')||document.body; new MutationObserver(sched).observe(scope,{childList:true,subtree:true});
})();
