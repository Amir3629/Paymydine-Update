(function(){
'use strict';

var c=window.PMD_ROLE_DASHBOARD_CONTEXT_V72||window.PMD_ROLE_DASHBOARD_CONTEXT_V73||{};
var u=String(c.username||'').toLowerCase();
var r=String(c.role_code||c.role_name||'').toLowerCase();

var target=null,noSide=false;
if(u==='waiter'||r==='waiter'){target='W3';noSide=true}
else if(u==='kds'||r==='kds'||r.indexOf('kitchen')!==-1){target='K';noSide=true}
else if(u==='manager'||r==='manager'){target='M'}

var labs=['O','O2','M','W1','W2','W3','K'];

function cls(){
 if(!target)return;
 document.documentElement.classList.add('pmd-role-dashboard-locked-v73');
 if(document.body)document.body.classList.add('pmd-role-dashboard-locked-v73');
 if(noSide){
  document.documentElement.classList.add('pmd-no-sidebar-role-v73');
  if(document.body)document.body.classList.add('pmd-no-sidebar-role-v73');
 }
}

function clean(x){return String(x||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}

function lab(e){
 var d=clean(e.getAttribute('data-dashboard')||e.getAttribute('data-dashboard-mode')||e.getAttribute('data-pmd-dashboard')||e.getAttribute('data-pmd-dashboard-mode')||e.getAttribute('data-value')||'').toUpperCase();
 if(labs.indexOf(d)!==-1)return d;
 var t=clean(e.innerText||e.textContent||'').toUpperCase();
 if(labs.indexOf(t)!==-1)return t;
 var p=t.split(' ').filter(Boolean);
 for(var i=p.length-1;i>=0;i--)if(labs.indexOf(p[i])!==-1)return p[i];
 return null;
}

function btns(){
 return Array.prototype.slice.call(document.querySelectorAll('button,a,[role="button"],.btn,[data-dashboard],[data-dashboard-mode],[data-pmd-dashboard],[data-pmd-dashboard-mode]')).filter(function(e){
  return labs.indexOf(lab(e))!==-1;
 });
}

function clickTarget(){
 var b=btns();
 for(var i=0;i<b.length;i++){
  if(lab(b[i])===target){
   try{b[i].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}
   catch(e){try{b[i].click()}catch(e2){}}
   return;
  }
 }
}

function root(b){
 if(!b.length)return null;
 var n=b[0].parentElement;
 while(n&&n!==document.body&&n!==document.documentElement){
  var f=Array.prototype.slice.call(n.querySelectorAll('button,a,[role="button"],.btn,[data-dashboard],[data-dashboard-mode],[data-pmd-dashboard],[data-pmd-dashboard-mode]')).filter(function(e){
   return labs.indexOf(lab(e))!==-1;
  });
  if(f.length>=4&&clean(n.innerText||n.textContent).length<300)return n;
  n=n.parentElement;
 }
 return b[0].parentElement;
}

function hideSwitch(){
 var b=btns();
 b.forEach(function(x){
  var l=lab(x);
  if(l&&l!==target)x.setAttribute('data-pmd-hide-dash-btn-v73','1');
 });
 var rr=root(b);
 if(rr)rr.classList.add('pmd-dashboard-switcher-hide-v73');
}

function hideSide(){
 if(!noSide)return;
 ['.sidebar','#navSidebar','.navbar-side','.sidebar-left','.pmd-sidebar-icons-toggle'].forEach(function(s){
  document.querySelectorAll(s).forEach(function(e){
   e.style.setProperty('display','none','important');
   e.style.setProperty('visibility','hidden','important');
   e.style.setProperty('opacity','0','important');
   e.style.setProperty('pointer-events','none','important');
  });
 });
 ['.page-wrapper','#page-wrapper','.content-wrapper','.main-content','.layout-content','.page-content'].forEach(function(s){
  document.querySelectorAll(s).forEach(function(e){
   e.style.setProperty('margin-left','0','important');
   e.style.setProperty('left','0','important');
   e.style.setProperty('width','100%','important');
   e.style.setProperty('max-width','none','important');
  });
 });
}

function store(){
 if(!target)return;
 try{
  ['pmdDashboardVariant','pmd-dashboard-variant','pmdAdminDashboardVariant','pmdDashboardMode','PMD_DASHBOARD_VARIANT'].forEach(function(k){
   localStorage.setItem(k,target);
  });
  sessionStorage.setItem('pmdRoleDashboardTargetV73',target);
 }catch(e){}
}

function run(){
 if(!target)return;
 cls();
 store();
 hideSide();
 clickTarget();
 setTimeout(function(){hideSwitch();hideSide()},150);
}

window.PMDRoleNoSidebarLockV73={context:c,target:target,noSidebar:noSide,run:run,buttons:btns};

cls();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
else run();

[50,150,350,700,1200,2200,3600].forEach(function(ms){setTimeout(run,ms)});
try{
 new MutationObserver(function(){
  clearTimeout(window.__pmdV73);
  window.__pmdV73=setTimeout(run,100);
 }).observe(document.documentElement,{childList:true,subtree:true});
}catch(e){}
})();
