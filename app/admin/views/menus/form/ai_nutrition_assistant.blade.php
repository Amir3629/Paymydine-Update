<div class="form-group pmd-ai-nutrition-assistant" id="pmd-ai-nutrition-assistant">
    <label class="control-label" style="font-weight:600; margin-bottom:8px; display:block;">AI Nutrition Assistant</label>
    <p class="help-block" style="margin-bottom:10px;">AI nutrition values are estimates and should be reviewed before publishing.</p>

    <div class="btn-group" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        <button type="button" class="btn btn-light btn-sm" data-ai-action="use-name">Use item name</button>
        <button type="button" class="btn btn-light btn-sm" data-ai-action="use-description">Use description</button>
        <button type="button" class="btn btn-light btn-sm" data-ai-action="suggest-ingredients">Suggest ingredients</button>
        <button type="button" class="btn btn-primary btn-sm" data-ai-action="estimate">Estimate nutrition</button>
        <button type="button" class="btn btn-success btn-sm" data-ai-action="apply" disabled>Apply suggestion</button>
    </div>

    <div class="alert alert-info" data-ai-status>
        AI Nutrition Assistant is currently unavailable. Please enter estimates manually.
    </div>

    <div class="row" style="margin-bottom:10px;">
        <div class="col-md-12">
            <label class="control-label">Ingredients</label>
            <textarea class="form-control" rows="3" data-ai-input="ingredients" placeholder="List major ingredients, separated by commas"></textarea>
        </div>
    </div>

    <div class="row" style="margin-bottom:10px;">
        <div class="col-md-6">
            <label class="control-label">Portion / serving size</label>
            <input type="text" class="form-control" data-ai-input="portion" placeholder="e.g. 350g, 12 oz, 1 bowl">
        </div>
        <div class="col-md-6">
            <label class="control-label">Preparation notes</label>
            <input type="text" class="form-control" data-ai-input="notes" placeholder="e.g. grilled, fried, baked">
        </div>
    </div>
</div>

<script>
(function() {
    var root = document.getElementById('pmd-ai-nutrition-assistant');
    if (!root || root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';

    var state = {
        enabled: false,
        suggestion: null,
    };

    var statusEl = root.querySelector('[data-ai-status]');
    var applyBtn = root.querySelector('[data-ai-action="apply"]');

    function getFieldValue(name) {
        var field = document.querySelector('[name="Menu[' + name + ']"], [name="' + name + '"]');
        return field ? (field.value || '').trim() : '';
    }

    function setFieldValue(name, value) {
        var field = document.querySelector('[name="Menu[' + name + ']"], [name="' + name + '"]');
        if (!field) return;
        field.value = value;
        if (window.jQuery) window.jQuery(field).trigger('change');
    }

    function setStatus(message, type) {
        statusEl.className = 'alert alert-' + (type || 'info');
        statusEl.textContent = message;
    }

    function gatherPayload() {
        return {
            menu_name: getFieldValue('menu_name'),
            menu_description: getFieldValue('menu_description'),
            ingredients: (root.querySelector('[data-ai-input="ingredients"]') || {}).value || '',
            portion: (root.querySelector('[data-ai-input="portion"]') || {}).value || '',
            preparation_notes: (root.querySelector('[data-ai-input="notes"]') || {}).value || '',
            locale: (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'en',
        };
    }

    function setDraftFields(draft) {
        if (!draft || typeof draft !== 'object') return;
        if (draft.ingredients) root.querySelector('[data-ai-input="ingredients"]').value = draft.ingredients;
        if (draft.serving_size) root.querySelector('[data-ai-input="portion"]').value = draft.serving_size;
    }

    root.addEventListener('click', function(e) {
        var btn = e.target.closest('button[data-ai-action]');
        if (!btn) return;

        var action = btn.getAttribute('data-ai-action');
        var payload = gatherPayload();

        if (action === 'use-name') {
            if (payload.menu_name) root.querySelector('[data-ai-input="ingredients"]').value = payload.menu_name;
            return;
        }
        if (action === 'use-description') {
            if (payload.menu_description) root.querySelector('[data-ai-input="notes"]').value = payload.menu_description;
            return;
        }
        if (action === 'apply') {
            if (!state.suggestion) return;
            setFieldValue('calories', state.suggestion.calories ?? '');
            setFieldValue('protein', state.suggestion.protein ?? '');
            setFieldValue('carbs', state.suggestion.carbs ?? '');
            setFieldValue('fat', state.suggestion.fat ?? '');
            setFieldValue('sugar', state.suggestion.sugar ?? '');
            setFieldValue('serving_size', state.suggestion.serving_size ?? payload.portion);
            setStatus('Draft suggestion applied to form fields. Review values, then click Save to persist.', 'success');
            return;
        }

        setStatus('Contacting AI Nutrition Assistant…', 'info');
        btn.disabled = true;

        var requestData = Object.assign({}, payload, { action: action });

        if (window.jQuery && typeof window.jQuery.request === 'function') {
            window.jQuery.request('onEstimateNutritionAssistant', {
                data: requestData,
                success: function(response) {
                    btn.disabled = false;
                    var data = response && response.data ? response.data : {};
                    if (!response || response.success === false || data.enabled === false) {
                        setStatus((response && response.message) || 'AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning');
                        return;
                    }
                    state.enabled = true;
                    state.suggestion = data.suggestion || null;
                    if (action === 'suggest-ingredients') setDraftFields(data.suggestion || {});
                    if (state.suggestion) {
                        applyBtn.disabled = false;
                        setStatus('Draft suggestion ready. Review and click Apply suggestion to fill nutrition fields.', 'success');
                    } else {
                        setStatus('No suggestion was returned. Please refine the inputs and try again.', 'warning');
                    }
                },
                error: function() {
                    btn.disabled = false;
                    setStatus('AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning');
                }
            });
        } else {
            btn.disabled = false;
            setStatus('AI Nutrition Assistant is currently unavailable. Please enter estimates manually.', 'warning');
        }
    });
})();
</script>
