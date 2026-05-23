<div class="pmd-food-autocomplete" id="pmd-food-autocomplete" data-handler="onSuggestFoodNames">
    <div class="pmd-food-autocomplete-list" hidden></div>
</div>

<style>
.pmd-food-autocomplete{position:relative;margin-top:-8px}
.pmd-food-autocomplete-list{position:absolute;z-index:1200;top:0;left:0;right:0;background:#fff;border:1px solid #dbe4f3;border-radius:12px;box-shadow:0 12px 24px rgba(41,60,97,.12);max-height:260px;overflow:auto;padding:4px}
.pmd-food-autocomplete-item{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer}
.pmd-food-autocomplete-item:hover,.pmd-food-autocomplete-item.active{background:#f4f8ff}
.pmd-food-autocomplete-meta{font-size:11px;color:#637392}
</style>

<script>
(function(){
 const wrap=document.getElementById('pmd-food-autocomplete'); if(!wrap) return;
 const list=wrap.querySelector('.pmd-food-autocomplete-list');
 const input=document.querySelector('[name="Menu[menu_name]"],[name="menu_name"]');
 const category=document.querySelector('[name="Menu[categories][]"],[name="categories[]"]');
 if(!input||!list) return;
 let t=null,items=[],active=-1;
 const norm=s=>(s||'').trim();
 const close=()=>{list.hidden=true;list.innerHTML='';items=[];active=-1;};
 const render=(data)=>{
   items=data||[];active=-1;
   if(!items.length){close();return;}
   list.innerHTML=items.map((s,i)=>`<div class="pmd-food-autocomplete-item" data-i="${i}"><strong>${(s.name||'').replace(/</g,'&lt;')}</strong><span class="pmd-food-autocomplete-meta">${s.source==='tenant_existing'?'Existing item':'Template'} · ${(s.cuisine||'').replace('_',' ')}</span></div>`).join('');
   list.hidden=false;
 };
 const select=(i)=>{if(!items[i]) return; input.value=items[i].name||''; input.dispatchEvent(new Event('input',{bubbles:true})); close();};
 const fetchSuggestions=()=>{
   const q=norm(input.value); if(q.length<2){close();return;}
   const data={query:q,category_id:category?category.value:''};
   window.$.request(wrap.dataset.handler,{data,success:function(res){render((res&&res.suggestions)||[]);}});
 };
 input.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(fetchSuggestions,240);});
 input.addEventListener('keydown',(e)=>{if(list.hidden) return; if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,items.length-1);} else if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(active-1,0);} else if(e.key==='Enter'){if(active>=0){e.preventDefault();select(active);}} else if(e.key==='Escape'){close();}
   [...list.children].forEach((el,idx)=>el.classList.toggle('active',idx===active));
 });
 list.addEventListener('mousedown',(e)=>{const row=e.target.closest('.pmd-food-autocomplete-item'); if(!row) return; e.preventDefault();select(Number(row.dataset.i));});
 input.addEventListener('blur',()=>setTimeout(close,150));
})();
</script>
