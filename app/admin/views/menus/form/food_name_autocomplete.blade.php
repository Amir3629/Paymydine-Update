<div class="pmd-food-autocomplete" id="pmd-food-autocomplete" data-handler="onSuggestFoodNames">
    <div class="pmd-food-autocomplete-loading" hidden>Loading suggestions…</div>
    <div class="pmd-food-autocomplete-chips" hidden></div>
</div>

<style>
.pmd-food-autocomplete{margin-top:6px}
.pmd-food-autocomplete-loading{font-size:11px;color:#7a879c;margin-bottom:5px}
.pmd-food-autocomplete-chips{display:flex;flex-wrap:wrap;gap:6px}
.pmd-food-chip{display:inline-flex;align-items:center;border:1px solid #d7deea;background:#fff;color:#30415f;font-size:12px;line-height:1;padding:7px 10px;border-radius:999px;cursor:pointer}
.pmd-food-chip:hover,.pmd-food-chip.active{background:#f5f8fe;border-color:#c7d3ea}
</style>

<script>
(function(){
 const wrap=document.getElementById('pmd-food-autocomplete'); if(!wrap) return;
 const loading=wrap.querySelector('.pmd-food-autocomplete-loading');
 const chips=wrap.querySelector('.pmd-food-autocomplete-chips');
 const input=document.querySelector('[name="Menu[menu_name]"],[name="menu_name"]');
 const category=document.querySelector('[name="Menu[categories][]"],[name="categories[]"]');
 if(!input||!chips||!window.$||!window.$.request) return;
 let t=null,items=[],active=-1;
 const close=()=>{chips.hidden=true;chips.innerHTML='';loading.hidden=true;items=[];active=-1;};
 const esc=(s)=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 const render=()=>{ if(!items.length){close();return;} chips.innerHTML=items.map((s,i)=>`<button type="button" class="pmd-food-chip" data-i="${i}" title="${esc(s.source||'')}">${esc(s.name||'')}</button>`).join(''); chips.hidden=false; loading.hidden=true; };
 const select=(i)=>{if(!items[i]) return; input.value=items[i].name||''; input.dispatchEvent(new Event('input',{bubbles:true})); close();};
 const fetchSuggestions=()=>{
   const q=(input.value||'').trim();
   if(q.length<2){close();return;}
   loading.hidden=false;
   window.$.request(wrap.dataset.handler,{data:{query:q,category_id:category?category.value:''},success:(res)=>{items=(res&&Array.isArray(res.suggestions))?res.suggestions:[];active=-1;render();},error:()=>close()});
 };
 input.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(fetchSuggestions,360);});
 input.addEventListener('keydown',(e)=>{if(chips.hidden||!items.length)return; if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,items.length-1);} else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();active=Math.max(active-1,0);} else if(e.key==='Enter'&&active>=0){e.preventDefault();select(active);} else if(e.key==='Escape'){close();}
   [...chips.children].forEach((el,idx)=>el.classList.toggle('active',idx===active));
 });
 chips.addEventListener('click',(e)=>{const chip=e.target.closest('.pmd-food-chip'); if(!chip) return; select(Number(chip.dataset.i));});
 input.addEventListener('blur',()=>setTimeout(close,180));
})();
</script>
