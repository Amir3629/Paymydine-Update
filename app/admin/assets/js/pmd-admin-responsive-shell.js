(function(){
  'use strict';
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  ready(function(){
    if(!document.body.classList.contains('pmd-admin-theme-v1')) return;
    var body=document.body;
    var sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    var toggler=document.querySelector('.navbar-top .navbar-toggler, .navbar-toggler[data-bs-toggle="collapse"]');
    var backdrop=document.querySelector('.pmd-sidebar-backdrop');
    if(!backdrop){ backdrop=document.createElement('div'); backdrop.className='pmd-sidebar-backdrop'; body.appendChild(backdrop); }
    function close(){ body.classList.remove('pmd-sidebar-open'); }
    function toggle(){ body.classList.toggle('pmd-sidebar-open'); }
    if(toggler){ toggler.addEventListener('click', function(e){ if(window.innerWidth<1200){ e.preventDefault(); toggle(); } }); }
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); });
    sidebar.querySelectorAll('a.nav-link').forEach(function(a){ a.addEventListener('click', function(){ if(window.innerWidth<1200) close(); }); });
    window.addEventListener('resize', function(){ if(window.innerWidth>=1200) close(); });
  });
})();
