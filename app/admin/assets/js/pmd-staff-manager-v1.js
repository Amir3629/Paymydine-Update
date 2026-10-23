/* PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023
 * Management actions stay on the manager screen in the Staff WebView.
 * Server continues to enforce Owner/Manager and tenant scope on EVERY POST.
 */
(function(){
  'use strict';
  var root=document.querySelector('[data-pmd-manager-root]');
  if(!root)return;
  var tabs=['presence','requests','chat','activity'];
  var nav=root.querySelector('.pmd-staff-ops__tabs');
  var refresh=root.querySelector('[data-pmd-manager-refresh]');
  var busy=false;

  function setTab(name){
    if(tabs.indexOf(name)<0)name='presence';
    root.querySelectorAll('[data-pmd-staff-ops-tab]').forEach(function(tab){
      tab.setAttribute('aria-selected',String(tab.getAttribute('data-pmd-staff-ops-tab')===name));
    });
    root.querySelectorAll('[data-pmd-staff-ops-section]').forEach(function(section){
      section.hidden=section.getAttribute('data-pmd-staff-ops-section')!==name;
    });
    if(window.location.hash!=='#'+name)history.replaceState(null,'','#'+name);
  }
  setTab(window.location.hash.slice(1)||'presence');
  if(nav){
    nav.addEventListener('click',function(e){
      var tab=e.target.closest('[data-pmd-staff-ops-tab]');
      if(tab)setTab(tab.getAttribute('data-pmd-staff-ops-tab'));
    });
  }
  if(refresh)refresh.addEventListener('click',function(){window.location.reload();});
  window.addEventListener('hashchange',function(){setTab(location.hash.slice(1));});

  root.addEventListener('submit',async function(event){
    var form=event.target;
    if(!form||!form.matches('form'))return;
    var link;
    try{link=new URL(form.action,window.location.href);}catch(error){return;}
    if(link.origin!==location.origin ||
       !/\/shifts\/(?:handlerequest|sendteammessage|reviewactual)$/.test(link.pathname))return;
    event.preventDefault();
    if(busy)return;
    busy=true;
    var btns=[].slice.call(form.querySelectorAll('button[type="submit"]'));
    btns.forEach(function(btn){btn.disabled=true;});
    var report=document.createElement('p');
    report.className='pmd-staff-manager__message';
    report.setAttribute('role','status');
    report.textContent='Saving…';
    form.appendChild(report);
    try{
      var response=await fetch(link.href,{
        method:'POST',credentials:'same-origin',
        body:new FormData(form),
        headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'},
        cache:'no-store',redirect:'follow'
      });
      var url=new URL(response.url);
      if(!response.ok||!response.redirected||url.origin!==location.origin||
         !/\/shifts\/?$/.test(url.pathname))throw new Error('Save not confirmed.');
      location.reload();
    }catch(error){
      report.textContent='Could not save. Check your session and try again.';
      report.setAttribute('role','alert');
    }finally{
      busy=false;btns.forEach(function(btn){btn.disabled=false;});
    }
  });
})();
