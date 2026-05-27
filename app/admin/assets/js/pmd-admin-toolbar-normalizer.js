(function () {
  'use strict';

  var SAFE_CONTAINERS = [
    '.pmd-toolbar-main',
    '.toolbar-action > .progress-indicator-container',
    '.progress-indicator-container',
    '.form-toolbar',
    '.control-toolbar',
    '.page-actions',
    '.page-title-section > .pull-right'
  ].join(',');

  var DISCOVERY_ROOTS = [
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


  function isSafeContainer(node){ return !!(node && node.matches(SAFE_CONTAINERS) && !node.matches('.page-content, .content-wrapper, .main-content')); }

  function ensureRight(container){
    if(!isSafeContainer(container)) return null;
    var right=container.querySelector(':scope > .pmd-toolbar-right-buttons');
    if(!right){
      right=document.createElement('div');
      right.className='right-buttons pmd-toolbar-right-buttons';
      right.setAttribute('aria-label','Secondary toolbar actions');
      container.appendChild(right);
    }
    return right;
  }

  function getToolbarButtons(container){
    var selectors=[':scope > .btn',':scope > .btn-group > .btn',':scope > .pmd-toolbar-right-buttons > .btn',':scope > .pmd-toolbar-right-buttons > .btn-group > .btn'];
    var seen=new Set(), out=[];
    selectors.forEach(function(sel){
      container.querySelectorAll(sel).forEach(function(btn){ if(validButton(btn)&&!seen.has(btn)){seen.add(btn); out.push(btn);} });
    });
    return out;
  }

  function classify(container){
    if(!container||inExcluded(container)||!isSafeContainer(container)) return;
    var buttons=getToolbarButtons(container); if(!buttons.length) return;

    container.classList.add('pmd-toolbar-normalized','pmd-admin-top-actions');

    var primary=null, secondary=[];
    buttons.forEach(function(btn){
      btn.classList.remove('pmd-toolbar-primary-action','pmd-toolbar-secondary-action','pmd-toolbar-danger-action');
      if(isDanger(btn)){btn.classList.add('pmd-toolbar-danger-action'); secondary.push(btn); return;}
      if(!primary && isPrimary(btn)){primary=btn; btn.classList.add('pmd-toolbar-primary-action');}
      else {btn.classList.add('pmd-toolbar-secondary-action'); secondary.push(btn);} 
    });

    var existingRight=container.querySelector(':scope > .pmd-toolbar-right-buttons');
    var rightHasButtons=!!(existingRight && existingRight.querySelector('.btn'));

    if(primary && (secondary.length>0 || rightHasButtons)){
      container.classList.add('pmd-toolbar-split');
      var right=ensureRight(container);
      if(!right) return;
      secondary.forEach(function(btn){ if(btn!==primary && btn.parentElement!==right) right.appendChild(btn); });
      if(primary.parentElement!==container) container.insertBefore(primary, container.firstChild);
    } else if(!rightHasButtons){
      container.classList.remove('pmd-toolbar-split');
    }
  }

  function discoverAndNormalize(root){
    if(!root||inExcluded(root)) return;
    root.querySelectorAll('.btn').forEach(function(btn){
      if(!validButton(btn)) return;
      if(!(isPrimary(btn)||isDanger(btn)||isSecondary(btn)||btn.classList.contains('btn-primary')||btn.classList.contains('btn-success')||btn.classList.contains('btn-default')||btn.classList.contains('btn-secondary')||btn.className.includes('btn-outline'))) return;
      var container=btn.closest(SAFE_CONTAINERS);
      if(!container||inExcluded(container)||!isSafeContainer(container)) return;
      classify(container);
    });
  }

  function run(){
    if(!document.body.classList.contains('pmd-admin-theme-v1')) return;
    document.querySelectorAll(SAFE_CONTAINERS).forEach(classify);
    document.querySelectorAll(DISCOVERY_ROOTS).forEach(discoverAndNormalize);
  }

  var timer=null;
  function schedule(){ clearTimeout(timer); timer=setTimeout(run,80); }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  setTimeout(run,300);

  var scope=document.querySelector('.page-content')||document.body;
  new MutationObserver(schedule).observe(scope,{childList:true,subtree:true});
})();
