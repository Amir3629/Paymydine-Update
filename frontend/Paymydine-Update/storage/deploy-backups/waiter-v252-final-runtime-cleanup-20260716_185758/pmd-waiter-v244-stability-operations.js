(function(){
  'use strict';
  if(window.PMDWaiterV244Stability)return;
  window.PMDWaiterV244Stability=true;

  var toastTimer=null;

  function toast(message,error){
    var n=document.querySelector('.v244-op-toast');
    if(!n){
      n=document.createElement('div');
      n.className='v244-op-toast';
      document.body.appendChild(n);
    }
    n.textContent=message;
    n.classList.toggle('error',!!error);
    n.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){n.classList.remove('show')},2800);
  }

  function validate(){
    var c=document.querySelector('.v243-ops-controls');
    if(!c)return false;
    return ['status','merge','transfer'].every(function(m){
      return !!c.querySelector('[data-v243-mode="'+m+'"]');
    });
  }

  function bind(){
    var c=document.querySelector('.v243-ops-controls');
    if(!c||c.getAttribute('data-v244-bound')==='1')return;
    c.setAttribute('data-v244-bound','1');
    c.addEventListener('click',function(e){
      var b=e.target.closest('[data-v243-mode]');
      if(!b)return;
      var m=b.getAttribute('data-v243-mode');
      setTimeout(function(){
        if(!b.classList.contains('is-active'))return;
        if(m==='status')toast('SELECT A TABLE TO CHANGE STATUS');
        if(m==='merge')toast('SELECT THE SOURCE TABLE TO MERGE');
        if(m==='transfer')toast('SELECT THE TABLE TO TRANSFER');
      },0);
    });
  }

  function boot(){
    bind();
    if(!validate()){
      console.error('[PMD V2.4.4] operation controls incomplete');
      toast('TABLE OPERATION CONTROLS DID NOT LOAD',true);
    }
    setInterval(bind,800);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  console.info('[PMD] Waiter V2.4.4 stability active');
})();
