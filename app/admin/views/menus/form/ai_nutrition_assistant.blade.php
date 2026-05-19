<div class="pmd-ai-nutrition card" id="pmd-ai-nutrition-assistant" style="border:1px solid #e2e8f0; border-radius:10px; box-shadow:none;">
    <div class="card-body" style="padding:14px;">
        <p class="help-block" style="margin:0 0 10px 0;">AI nutrition values are estimates and should be reviewed before publishing.</p>

        <div class="row" style="margin-bottom:10px;">
            <div class="col-md-12">
                <label class="control-label" style="font-weight:600;">Ingredients (internal)</label>
                <textarea class="form-control" rows="3" data-ai-input="ingredients" placeholder="chicken, tortilla, lettuce, tomato, garlic sauce, yogurt, oil"></textarea>
            </div>
        </div>

        <div class="row" style="margin-bottom:10px;">
            <div class="col-md-6">
                <label class="control-label" style="font-weight:600;">Portion / serving size</label>
                <input type="text" class="form-control" data-ai-input="serving_size" placeholder="e.g. 350g, 12 oz, 1 bowl">
            </div>
            <div class="col-md-6">
                <label class="control-label" style="font-weight:600;">Preparation notes</label>
                <textarea class="form-control" rows="3" data-ai-input="preparation_notes" placeholder="grilled, pan-seared, fried, baked"></textarea>
            </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
            <button type="button" class="btn btn-default btn-sm" data-ai-action="use-name">Use item name</button>
            <button type="button" class="btn btn-default btn-sm" data-ai-action="use-description">Use description</button>
            <button type="button" class="btn btn-default btn-sm" data-ai-action="suggest-ingredients">Suggest ingredients</button>
            <button type="button" class="btn btn-default btn-sm" data-ai-action="improve-description">Improve description</button>
            <button type="button" class="btn btn-primary btn-sm" data-ai-action="estimate-nutrition">Estimate nutrition</button>
            <button type="button" class="btn btn-success btn-sm" data-ai-action="apply" disabled>Apply selected suggestion</button>
        </div>

        <div class="alert alert-info" data-ai-status style="margin-bottom:10px;">
            AI Nutrition Assistant is currently unavailable. Please enter estimates manually.
        </div>

        <div class="panel panel-default" data-ai-draft style="display:none; margin-bottom:0;">
            <div class="panel-heading" style="padding:8px 12px;"><strong>Draft suggestions</strong></div>
            <div class="panel-body" style="padding:10px 12px;">
                <div><strong>Description:</strong> <span data-ai-draft-description class="text-muted">—</span></div>
                <div style="margin-top:6px;"><strong>Ingredients:</strong> <span data-ai-draft-ingredients class="text-muted">—</span></div>
                <div style="margin-top:6px;"><strong>Nutrition:</strong> <span data-ai-draft-nutrition class="text-muted">—</span></div>
            </div>
        </div>
    </div>
</div>

<script>
(function() {
    var root = document.getElementById('pmd-ai-nutrition-assistant');
    if (!root || root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';

    var state = { suggestions: null, lastAction: null };
    var statusEl = root.querySelector('[data-ai-status]');
    var applyBtn = root.querySelector('[data-ai-action="apply"]');
    var draftPanel = root.querySelector('[data-ai-draft]');

    function formField(name) { return document.querySelector('[name="Menu[' + name + ']"], [name="' + name + '"]'); }
    function get(name) { var f=formField(name); return f ? (f.value || '').trim() : ''; }
    function set(name, val) { var f=formField(name); if (!f) return; f.value = val; if (window.jQuery) window.jQuery(f).trigger('change'); }
    function input(key) { return root.querySelector('[data-ai-input="' + key + '"]'); }
    function setStatus(msg, kind) { statusEl.className = 'alert alert-' + (kind || 'info'); statusEl.textContent = msg; }

    function renderDraft() {
        if (!state.suggestions) return;
        draftPanel.style.display = 'block';
        root.querySelector('[data-ai-draft-description]').textContent = state.suggestions.description || '—';
        var ing = state.suggestions.ingredients;
        root.querySelector('[data-ai-draft-ingredients]').textContent = Array.isArray(ing) ? (ing.join(', ') || '—') : (ing || '—');
        var n = [];
        ['calories','protein','carbs','fat','sugar','serving_size'].forEach(function(k){ if(state.suggestions[k]!==null && state.suggestions[k]!==undefined && state.suggestions[k]!=='') n.push(k+': '+state.suggestions[k]); });
        root.querySelector('[data-ai-draft-nutrition]').textContent = n.join(' | ') || '—';
    }

    function payload(action) {
        return {
            action: action,
            menu_name: get('menu_name'),
            description: get('menu_description'),
            ingredients: (input('ingredients')?.value || '').trim(),
            serving_size: (input('serving_size')?.value || '').trim(),
            preparation_notes: (input('preparation_notes')?.value || '').trim(),
            language: document.documentElement?.lang || 'auto'
        };
    }

    root.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-ai-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-ai-action');

        if (action === 'use-name') { if (get('menu_name')) input('ingredients').value = get('menu_name'); return; }
        if (action === 'use-description') { if (get('menu_description')) input('ingredients').value = get('menu_description'); return; }
        if (action === 'apply') {
            if (!state.suggestions) return;
            var s = state.suggestions;
            if (s.description) set('menu_description', s.description);
            if (Array.isArray(s.ingredients) && s.ingredients.length) input('ingredients').value = s.ingredients.join(', ');
            if (s.calories !== undefined && s.calories !== null) set('calories', s.calories);
            if (s.protein !== undefined && s.protein !== null) set('protein', s.protein);
            if (s.carbs !== undefined && s.carbs !== null) set('carbs', s.carbs);
            if (s.fat !== undefined && s.fat !== null) set('fat', s.fat);
            if (s.sugar !== undefined && s.sugar !== null) set('sugar', s.sugar);
            if (s.serving_size) { set('serving_size', s.serving_size); input('serving_size').value = s.serving_size; }
            setStatus('Draft suggestions applied to form fields. Review and click Save to persist.', 'success');
            return;
        }

        setStatus('Contacting AI Nutrition Assistant…', 'info');
        btn.disabled = true;
        if (!(window.jQuery && typeof window.jQuery.request === 'function')) { btn.disabled = false; setStatus('AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning'); return; }

        window.jQuery.request('onEstimateNutritionAssistant', {
            data: payload(action),
            success: function(resp){
                btn.disabled = false;
                if (!resp || resp.enabled === false) { setStatus((resp && resp.message) || 'AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning'); return; }
                state.suggestions = resp.suggestions || null;
                state.lastAction = action;
                if (!state.suggestions) { setStatus('No draft suggestions returned. Please refine input and retry.', 'warning'); return; }
                renderDraft();
                applyBtn.disabled = false;
                setStatus((resp.disclaimer || 'AI nutrition values are estimates and should be reviewed before publishing.'), 'success');
            },
            error: function(){ btn.disabled = false; setStatus('AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning'); }
        });
    });
})();
</script>
