<div class="pmd-ai-nutrition card" id="pmd-ai-nutrition-assistant" style="border:1px solid #e2e8f0; border-radius:10px; box-shadow:none;">
    <div class="card-body" style="padding:12px;">
        <p class="help-block" style="margin:0 0 8px 0;">
            AI can draft a guest-facing description or estimate nutrition. Review before saving.
        </p>

        <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:8px;">
            <button type="button" class="btn btn-default btn-sm" data-ai-action="improve-description">Improve description</button>
            <button type="button" class="btn btn-primary btn-sm" data-ai-action="estimate-nutrition">Estimate nutrition</button>
            <a href="#" data-ai-toggle="advanced" style="font-size:12px; margin-left:4px;">Advanced ingredients</a>
        </div>

        <div data-ai-advanced style="display:none; border-top:1px dashed #e5e7eb; padding-top:8px; margin-top:4px;">
            <div class="row" style="margin-bottom:8px;">
                <div class="col-md-12">
                    <label class="control-label" style="font-weight:600;">Ingredients (optional)</label>
                    <textarea class="form-control" rows="2" data-ai-input="ingredients" placeholder="Optional: main ingredients, sauces, toppings"></textarea>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <label class="control-label" style="font-weight:600;">Preparation notes (optional)</label>
                    <textarea class="form-control" rows="2" data-ai-input="preparation_notes" placeholder="Optional: grilled, baked, fried, spicy, etc."></textarea>
                </div>
            </div>
        </div>

        <div class="alert alert-info" data-ai-status style="margin:8px 0 0 0; padding:8px 10px;">
            AI assistant is unavailable. You can still enter nutrition manually.
        </div>

        <div class="panel panel-default" data-ai-draft style="display:none; margin:8px 0 0 0;">
            <div class="panel-heading" style="padding:8px 12px;"><strong>Draft suggestion</strong></div>
            <div class="panel-body" style="padding:10px 12px;">
                <div><strong>Description:</strong> <span data-ai-draft-description class="text-muted">—</span></div>
                <div style="margin-top:6px;"><strong>Ingredients:</strong> <span data-ai-draft-ingredients class="text-muted">—</span></div>
                <div style="margin-top:6px;"><strong>Nutrition:</strong> <span data-ai-draft-nutrition class="text-muted">—</span></div>
                <div style="margin-top:8px;">
                    <button type="button" class="btn btn-success btn-sm" data-ai-action="apply" style="display:none;">Apply suggestion</button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
(function() {
    var root = document.getElementById('pmd-ai-nutrition-assistant');
    if (!root || root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';

    var state = { suggestions: null };
    var statusEl = root.querySelector('[data-ai-status]');
    var draftPanel = root.querySelector('[data-ai-draft]');
    var applyBtn = root.querySelector('[data-ai-action="apply"]');
    var advanced = root.querySelector('[data-ai-advanced]');

    function formField(name) { return document.querySelector('[name="Menu[' + name + ']"], [name="' + name + '"]'); }
    function getValue(name) { var f = formField(name); return f ? (f.value || '').trim() : ''; }
    function setValue(name, val) { var f = formField(name); if (!f) return; f.value = val; if (window.jQuery) window.jQuery(f).trigger('change'); }
    function input(key) { return root.querySelector('[data-ai-input="' + key + '"]'); }
    function setStatus(msg, kind) { statusEl.className = 'alert alert-' + (kind || 'info'); statusEl.textContent = msg; }

    function clearDraft() {
        state.suggestions = null;
        draftPanel.style.display = 'none';
        applyBtn.style.display = 'none';
        root.querySelector('[data-ai-draft-description]').textContent = '—';
        root.querySelector('[data-ai-draft-ingredients]').textContent = '—';
        root.querySelector('[data-ai-draft-nutrition]').textContent = '—';
    }

    function collectPayload(action) {
        var ingredients = (input('ingredients') ? input('ingredients').value : '').trim();
        var prep = (input('preparation_notes') ? input('preparation_notes').value : '').trim();

        return {
            action: action,
            menu_name: getValue('menu_name'),
            description: getValue('menu_description'),
            serving_size: getValue('serving_size'),
            calories: getValue('calories'),
            protein: getValue('protein'),
            carbs: getValue('carbs'),
            fat: getValue('fat'),
            sugar: getValue('sugar'),
            ingredients: ingredients,
            preparation_notes: prep,
            language: document.documentElement && document.documentElement.lang ? document.documentElement.lang : 'auto'
        };
    }

    function renderDraft(suggestions) {
        draftPanel.style.display = 'block';
        root.querySelector('[data-ai-draft-description]').textContent = suggestions.description || '—';

        var ing = suggestions.ingredients;
        var ingText = Array.isArray(ing) ? ing.join(', ') : (ing || '—');
        root.querySelector('[data-ai-draft-ingredients]').textContent = ingText || '—';

        var parts = [];
        ['calories', 'protein', 'carbs', 'fat', 'sugar', 'serving_size'].forEach(function(k) {
            if (suggestions[k] !== null && suggestions[k] !== undefined && suggestions[k] !== '') {
                parts.push(k + ': ' + suggestions[k]);
            }
        });
        root.querySelector('[data-ai-draft-nutrition]').textContent = parts.join(' | ') || '—';
        applyBtn.style.display = 'inline-block';
    }

    root.addEventListener('click', function(e) {
        var toggle = e.target.closest('[data-ai-toggle="advanced"]');
        if (toggle) {
            e.preventDefault();
            advanced.style.display = advanced.style.display === 'none' ? 'block' : 'none';
            return;
        }

        var btn = e.target.closest('button[data-ai-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-ai-action');

        if (action === 'apply') {
            if (!state.suggestions) return;
            var s = state.suggestions;
            if (s.description) setValue('menu_description', s.description);
            if (Array.isArray(s.ingredients) && s.ingredients.length && input('ingredients')) input('ingredients').value = s.ingredients.join(', ');
            if (s.calories !== null && s.calories !== undefined) setValue('calories', s.calories);
            if (s.protein !== null && s.protein !== undefined) setValue('protein', s.protein);
            if (s.carbs !== null && s.carbs !== undefined) setValue('carbs', s.carbs);
            if (s.fat !== null && s.fat !== undefined) setValue('fat', s.fat);
            if (s.sugar !== null && s.sugar !== undefined) setValue('sugar', s.sugar);
            if (s.serving_size) setValue('serving_size', s.serving_size);
            setStatus('Draft applied. Review fields and click Save to persist.', 'success');
            return;
        }

        clearDraft();
        setStatus('Asking AI…', 'info');

        var payload = collectPayload(action);
        console.log('[AI Nutrition] Request start', { action: action, keys: Object.keys(payload) });

        if (!(window.jQuery && typeof window.jQuery.request === 'function')) {
            setStatus('AI assistant is unavailable. You can still enter nutrition manually.', 'warning');
            console.log('[AI Nutrition] jQuery.request unavailable');
            return;
        }

        btn.disabled = true;
        window.jQuery.request('onEstimateNutritionAssistant', {
            data: payload,
            success: function(resp) {
                btn.disabled = false;
                console.log('[AI Nutrition] Response status', { enabled: !!(resp && resp.enabled) });

                if (!resp || resp.enabled === false || !resp.suggestions || typeof resp.suggestions !== 'object') {
                    clearDraft();
                    setStatus('AI assistant is unavailable. You can still enter nutrition manually.', 'warning');
                    return;
                }

                state.suggestions = resp.suggestions;
                renderDraft(state.suggestions);
                setStatus(resp.disclaimer || 'AI nutrition values are estimates and should be reviewed before publishing.', 'success');
            },
            error: function(xhr) {
                btn.disabled = false;
                clearDraft();
                setStatus('AI assistant is unavailable. You can still enter nutrition manually.', 'warning');
                console.log('[AI Nutrition] Request error', { status: xhr && xhr.status ? xhr.status : 'unknown' });
            }
        });
    });
})();
</script>
