<div class="pmd-ai-nutrition card" id="pmd-ai-nutrition-assistant" style="border:1px solid #e2e8f0; border-radius:12px; box-shadow:none; background:#fff;">
  <div class="card-body" style="padding:12px 14px;">
    <p class="mb-1" style="font-weight:600; color:#0f172a;">AI Assistant</p>
    <p class="help-block" style="margin:0 0 8px 0;">
      Enter a food name, then let AI draft the description and nutrition. Review before saving.
    </p>

    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary btn-sm" data-ai-action="auto-fill" data-idle-text="✨ AI Auto Fill" style="background:#1e3a8a; border-color:#1e3a8a;">
        ✨ AI Auto Fill
      </button>
      <a href="#" data-ai-toggle="advanced" style="font-size:12px; color:#475569;">Advanced options</a>
    </div>

    <div data-ai-advanced style="display:none; border-top:1px dashed #e5e7eb; padding-top:8px; margin-top:8px;">
      <div class="row" style="margin-bottom:8px;">
        <div class="col-md-6">
          <label class="control-label" style="font-weight:600;">Ingredients / hints</label>
          <textarea class="form-control" rows="2" data-ai-input="ingredients" placeholder="Optional: main ingredients, sauces, toppings"></textarea>
        </div>
        <div class="col-md-6">
          <label class="control-label" style="font-weight:600;">Preparation notes</label>
          <textarea class="form-control" rows="2" data-ai-input="preparation_notes" placeholder="Optional: grilled, baked, fried, spicy, etc."></textarea>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <label class="control-label" style="font-weight:600;">Language</label>
          <select class="form-control" data-ai-input="language">
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="de">German</option>
            <option value="fa">Persian</option>
            <option value="ar">Arabic</option>
            <option value="tr">Turkish</option>
          </select>
        </div>
      </div>
    </div>

    <div class="alert alert-info" data-ai-status style="margin:8px 0 0 0; padding:8px 10px;">
      AI assistant is unavailable. You can still enter values manually.
    </div>

    <div data-ai-replace style="display:none; margin-top:8px; font-size:12px;">
      <span class="text-muted">AI has new suggestions. Replace current values?</span>
      <button type="button" class="btn btn-xs btn-primary" data-ai-action="replace">Replace</button>
      <button type="button" class="btn btn-xs btn-default" data-ai-action="keep">Keep current</button>
    </div>

    <div style="margin-top:6px; display:none;" data-ai-undo-wrap>
      <a href="#" data-ai-action="undo" style="font-size:12px;">Undo AI changes</a>
    </div>
  </div>
</div>

<script>
(function() {
  var root = document.getElementById('pmd-ai-nutrition-assistant');
  if (!root || root.dataset.initialized === '1') return;
  root.dataset.initialized = '1';

  var state = { suggestions: null, previous: null, pendingReplace: false };
  var statusEl = root.querySelector('[data-ai-status]');
  var advanced = root.querySelector('[data-ai-advanced]');
  var replaceBox = root.querySelector('[data-ai-replace]');
  var undoWrap = root.querySelector('[data-ai-undo-wrap]');
  var autoBtn = root.querySelector('[data-ai-action="auto-fill"]');

  function formField(name) { return document.querySelector('[name="Menu['+name+']"], [name="'+name+'"]'); }
  function getValue(name) { var f=formField(name); return f ? (f.value || '').trim() : ''; }
  function setValue(name,val) { var f=formField(name); if(!f) return; f.value = val; if(window.jQuery) window.jQuery(f).trigger('change'); }
  function input(key) { return root.querySelector('[data-ai-input="'+key+'"]'); }
  function setStatus(msg,kind){ statusEl.className='alert alert-'+(kind||'info'); statusEl.textContent=msg; }
  function clearState(){ state.suggestions=null; state.pendingReplace=false; replaceBox.style.display='none'; }

  function snapshotFields(){
    return {
      menu_description:getValue('menu_description'),
      serving_size:getValue('serving_size'),
      calories:getValue('calories'), protein:getValue('protein'), carbs:getValue('carbs'), fat:getValue('fat'), sugar:getValue('sugar'),
      ingredients:(input('ingredients')?input('ingredients').value:'')
    };
  }

  function highlightField(name){
    var f=formField(name); if(!f) return;
    var oldBg=f.style.backgroundColor, oldBorder=f.style.borderColor;
    f.style.backgroundColor='#ecfdf3'; f.style.borderColor='#22c55e';
    setTimeout(function(){ f.style.backgroundColor=oldBg; f.style.borderColor=oldBorder; }, 1800);
  }

  function applySuggestions(forceReplace){
    var s=state.suggestions; if(!s) return;
    var changed=false;
    function maybeSet(field, value){
      if(value===null || value===undefined || value==='') return;
      var current=getValue(field);
      if(current!=='' && !forceReplace) { state.pendingReplace=true; return; }
      setValue(field, value); highlightField(field); changed=true;
    }
    maybeSet('menu_description', s.description);
    maybeSet('serving_size', s.serving_size);
    maybeSet('calories', s.calories);
    maybeSet('protein', s.protein);
    maybeSet('carbs', s.carbs);
    maybeSet('fat', s.fat);
    maybeSet('sugar', s.sugar);
    if(Array.isArray(s.ingredients) && input('ingredients')) {
      var joined=s.ingredients.join(', ');
      var curr=(input('ingredients').value||'').trim();
      if(curr!=='' && !forceReplace){ state.pendingReplace=true; }
      else { input('ingredients').value=joined; changed=true; }
    }
    if(state.pendingReplace && !forceReplace){ replaceBox.style.display='block'; }
    if(changed){
      undoWrap.style.display='block';
      setStatus('AI filled description and nutrition fields. Please review before saving.', 'success');
    }
  }

  function buildPayload(){
    return {
      action:'auto-fill',
      menu_name:getValue('menu_name'),
      description:getValue('menu_description'),
      serving_size:getValue('serving_size'),
      calories:getValue('calories'), protein:getValue('protein'), carbs:getValue('carbs'), fat:getValue('fat'), sugar:getValue('sugar'),
      ingredients:(input('ingredients')?input('ingredients').value:'').trim(),
      preparation_notes:(input('preparation_notes')?input('preparation_notes').value:'').trim(),
      language:(input('language')?input('language').value:'auto')
    };
  }

  root.addEventListener('click', function(e){
    var toggle=e.target.closest('[data-ai-toggle="advanced"]');
    if(toggle){ e.preventDefault(); advanced.style.display = advanced.style.display==='none' ? 'block' : 'none'; return; }

    var actionEl=e.target.closest('[data-ai-action]'); if(!actionEl) return;
    var action=actionEl.getAttribute('data-ai-action');

    if(action==='undo'){
      e.preventDefault(); if(!state.previous) return;
      Object.keys(state.previous).forEach(function(k){ if(k==='ingredients' && input('ingredients')) input('ingredients').value=state.previous[k]; else setValue(k, state.previous[k]); });
      undoWrap.style.display='none'; replaceBox.style.display='none'; setStatus('AI changes were undone.', 'info'); return;
    }

    if(action==='replace'){ state.pendingReplace=false; replaceBox.style.display='none'; applySuggestions(true); return; }
    if(action==='keep'){ state.pendingReplace=false; replaceBox.style.display='none'; setStatus('Kept current values. You can still Save manually.', 'info'); return; }
    if(action!=='auto-fill') return;

    clearState(); undoWrap.style.display='none';
    state.previous = snapshotFields();
    setStatus('Asking AI…', 'info');

    var payload=buildPayload();
    console.log('[AI Nutrition] Request start', { action: payload.action, keys:Object.keys(payload) });

    if(!(window.jQuery && typeof window.jQuery.request==='function')){
      setStatus('AI assistant is unavailable. You can still enter values manually.', 'warning');
      console.log('[AI Nutrition] jQuery.request unavailable');
      return;
    }

    autoBtn.disabled=true; autoBtn.textContent='Generating…';
    window.jQuery.request('onEstimateNutritionAssistant', {
      data: payload,
      success:function(resp){
        autoBtn.disabled=false; autoBtn.textContent=autoBtn.getAttribute('data-idle-text') || '✨ AI Auto Fill';
        console.log('[AI Nutrition] Response status', { enabled: !!(resp && resp.enabled) });
        if(!resp || resp.enabled===false || !resp.suggestions || typeof resp.suggestions!=='object'){
          setStatus('AI assistant is unavailable. You can still enter values manually.', 'warning');
          return;
        }
        state.suggestions=resp.suggestions;
        applySuggestions(false);
      },
      error:function(xhr){
        autoBtn.disabled=false; autoBtn.textContent=autoBtn.getAttribute('data-idle-text') || '✨ AI Auto Fill';
        setStatus('AI assistant is unavailable. You can still enter values manually.', 'warning');
        console.log('[AI Nutrition] Request error', { status: xhr && xhr.status ? xhr.status : 'unknown' });
      }
    });
  });
})();
</script>
