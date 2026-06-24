(function(){
  if(!/\/admin\/dashboard/.test(location.pathname)) return;
  if(window.__PMD_WAITER_V127_LOADER__) return;
  window.__PMD_WAITER_V127_LOADER__ = true;

  function load(){
    if(window.__PMD_WAITER_V127_SCRIPT__) return;
    window.__PMD_WAITER_V127_SCRIPT__ = true;
    var s = document.createElement('script');
    s.src = '/app/admin/assets/js/pmd-waiter-final-clean-v127.js?v=' + Date.now();
    s.async = false;
    document.head.appendChild(s);
  }

  if(document.body || document.readyState === 'interactive' || document.readyState === 'complete'){
    setTimeout(load, 120);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(load, 120); }, {once:true});
  }
})();
