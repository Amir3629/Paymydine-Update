<div class="pmd-ai-nutrition" data-ai-nutrition-assistant>
    <div class="pmd-ai-nutrition__header">
        <div>
            <div class="pmd-ai-nutrition__eyebrow">Admin-only helper</div>
            <h4>AI Nutrition Assistant</h4>
            <p>Use the item name, description, ingredients, portion size, and preparation notes to request a nutrition estimate.</p>
        </div>
        <span class="pmd-ai-nutrition__badge" data-ai-status>Pending setup</span>
    </div>

    <div class="pmd-ai-nutrition__notice">
        AI nutrition values are estimates and should be reviewed before publishing.
    </div>

    <div class="pmd-ai-nutrition__grid">
        <label>
            <span>Ingredients</span>
            <textarea data-ai-ingredients rows="2" placeholder="e.g., chicken, wrap bread, garlic sauce, lettuce, tomato"></textarea>
        </label>
        <label>
            <span>Portion / Serving Size</span>
            <input type="text" data-ai-portion placeholder="e.g., 1 wrap, 350g, 12 oz">
        </label>
        <label class="pmd-ai-nutrition__wide">
            <span>Preparation notes <em>(optional)</em></span>
            <input type="text" data-ai-prep placeholder="e.g., grilled, fried, extra sauce, no oil">
        </label>
    </div>

    <div class="pmd-ai-nutrition__chips" aria-label="AI Nutrition Assistant actions">
        <button type="button" class="btn btn-light btn-sm" data-ai-use-name>Use item name</button>
        <button type="button" class="btn btn-light btn-sm" data-ai-use-description>Use description</button>
        <button type="button" class="btn btn-light btn-sm" data-ai-suggest-ingredients>Suggest ingredients</button>
        <button type="button" class="btn btn-primary btn-sm" data-ai-estimate disabled>Estimate nutrition</button>
        <button type="button" class="btn btn-success btn-sm" data-ai-apply disabled>Apply suggestion</button>
    </div>

    <div class="pmd-ai-nutrition__message" data-ai-message>
        OpenAI nutrition estimation is not configured yet. You can prepare ingredients and portion notes, but estimates will stay disabled until an admin endpoint is enabled.
    </div>

    <div class="pmd-ai-nutrition__suggestion" data-ai-suggestion hidden>
        <div class="pmd-ai-nutrition__suggestion-title">Suggested values for review</div>
        <div class="pmd-ai-nutrition__values">
            <span><strong data-ai-preview="calories">—</strong><small>kcal</small></span>
            <span><strong data-ai-preview="protein">—</strong><small>protein g</small></span>
            <span><strong data-ai-preview="carbs">—</strong><small>carbs g</small></span>
            <span><strong data-ai-preview="fat">—</strong><small>fat g</small></span>
            <span><strong data-ai-preview="sugar">—</strong><small>sugar g</small></span>
            <span><strong data-ai-preview="serving_size">—</strong><small>serving</small></span>
        </div>
        <p>Review these suggestions, then click <strong>Apply suggestion</strong> to copy them into the real nutrition fields. Nothing is saved until the menu item is saved.</p>
    </div>
</div>

<style>
.pmd-ai-nutrition { border: 1px solid #dbeafe; border-radius: 16px; padding: 16px; margin: 4px 0 18px; background: linear-gradient(135deg, #f8fbff 0%, #ffffff 54%, #f7f5ff 100%); box-shadow: 0 10px 30px rgba(15, 23, 42, .06); }
.pmd-ai-nutrition__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.pmd-ai-nutrition__eyebrow { color: #4f46e5; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.pmd-ai-nutrition h4 { margin: 2px 0 4px; font-size: 18px; font-weight: 700; color: #0f172a; }
.pmd-ai-nutrition p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.45; }
.pmd-ai-nutrition__badge { white-space: nowrap; border-radius: 999px; padding: 5px 10px; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; font-size: 12px; font-weight: 700; }
.pmd-ai-nutrition__badge.is-ready { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
.pmd-ai-nutrition__notice { margin-top: 12px; border-radius: 12px; padding: 9px 12px; background: #eef2ff; color: #3730a3; font-size: 13px; font-weight: 600; }
.pmd-ai-nutrition__grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(180px, .75fr); gap: 12px; margin-top: 14px; }
.pmd-ai-nutrition label { margin: 0; font-weight: 600; color: #334155; }
.pmd-ai-nutrition label span { display: block; margin-bottom: 6px; font-size: 12px; }
.pmd-ai-nutrition label em { color: #94a3b8; font-style: normal; font-weight: 500; }
.pmd-ai-nutrition textarea, .pmd-ai-nutrition input { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; background: rgba(255,255,255,.9); color: #0f172a; font-size: 13px; }
.pmd-ai-nutrition textarea:focus, .pmd-ai-nutrition input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,.18); outline: none; }
.pmd-ai-nutrition__wide { grid-column: 1 / -1; }
.pmd-ai-nutrition__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pmd-ai-nutrition__chips .btn { border-radius: 999px; font-weight: 700; }
.pmd-ai-nutrition__message { margin-top: 10px; color: #64748b; font-size: 12px; }
.pmd-ai-nutrition__message.is-error { color: #b91c1c; }
.pmd-ai-nutrition__message.is-success { color: #047857; }
.pmd-ai-nutrition__suggestion { margin-top: 12px; border: 1px solid #e0e7ff; border-radius: 14px; padding: 12px; background: rgba(255,255,255,.82); }
.pmd-ai-nutrition__suggestion-title { margin-bottom: 10px; color: #1e293b; font-weight: 700; }
.pmd-ai-nutrition__values { display: grid; grid-template-columns: repeat(6, minmax(82px, 1fr)); gap: 8px; margin-bottom: 10px; }
.pmd-ai-nutrition__values span { border: 1px solid #e2e8f0; border-radius: 12px; padding: 9px 8px; background: #f8fafc; }
.pmd-ai-nutrition__values strong { display: block; color: #0f172a; font-size: 16px; }
.pmd-ai-nutrition__values small { color: #64748b; font-size: 11px; }
@media (max-width: 782px) { .pmd-ai-nutrition__header { display: block; } .pmd-ai-nutrition__badge { display: inline-block; margin-top: 10px; } .pmd-ai-nutrition__grid, .pmd-ai-nutrition__values { grid-template-columns: 1fr 1fr; } .pmd-ai-nutrition__wide { grid-column: auto; } }
@media (max-width: 520px) { .pmd-ai-nutrition__grid, .pmd-ai-nutrition__values { grid-template-columns: 1fr; } }
</style>

<script>
(function () {
    var root = document.querySelector('[data-ai-nutrition-assistant]');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';

    var config = window.PayMyDineNutritionAssistant || {};
    var endpoint = config.endpoint || '';
    var enabled = Boolean(config.enabled && endpoint);
    var fields = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'serving_size'];
    var latestSuggestion = null;

    function findField(name) {
        return document.querySelector('[name="' + name + '"]') ||
            document.querySelector('[name$="[' + name + ']"]') ||
            document.querySelector('#' + name) ||
            document.querySelector('#Form-field-Menus_model-' + name) ||
            document.querySelector('[data-field-name="' + name + '"] input, [data-field-name="' + name + '"] textarea');
    }

    function valueOf(name) {
        var field = findField(name);
        return field ? String(field.value || '').trim() : '';
    }

    function setMessage(text, state) {
        var el = root.querySelector('[data-ai-message]');
        el.textContent = text;
        el.classList.toggle('is-error', state === 'error');
        el.classList.toggle('is-success', state === 'success');
    }

    function appendText(target, text) {
        if (!target || !text) return;
        var current = target.value.trim();
        target.value = current ? current + (current.slice(-1) === ',' ? ' ' : ', ') + text : text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function normalizedSuggestion(payload) {
        var source = payload && (payload.nutrition || payload.suggestion || payload);
        if (!source) return null;
        return {
            calories: source.calories !== undefined && source.calories !== null ? Math.round(Number(source.calories)) : '',
            protein: source.protein !== undefined && source.protein !== null ? Number(source.protein) : '',
            carbs: source.carbs !== undefined && source.carbs !== null ? Number(source.carbs) : '',
            fat: source.fat !== undefined && source.fat !== null ? Number(source.fat) : '',
            sugar: source.sugar !== undefined && source.sugar !== null ? Number(source.sugar) : '',
            serving_size: source.serving_size || source.servingSize || root.querySelector('[data-ai-portion]').value.trim()
        };
    }

    function showSuggestion(suggestion) {
        latestSuggestion = suggestion;
        fields.forEach(function (field) {
            var preview = root.querySelector('[data-ai-preview="' + field + '"]');
            if (preview) preview.textContent = suggestion[field] !== '' && suggestion[field] !== null && suggestion[field] !== undefined ? suggestion[field] : '—';
        });
        root.querySelector('[data-ai-suggestion]').hidden = false;
        root.querySelector('[data-ai-apply]').disabled = false;
    }

    var status = root.querySelector('[data-ai-status]');
    var estimateButton = root.querySelector('[data-ai-estimate]');
    if (enabled) {
        status.textContent = 'Ready';
        status.classList.add('is-ready');
        estimateButton.disabled = false;
        setMessage('Ready. Estimates use the configured AI endpoint and remain staged until you apply them. Supports English, German, Persian, Arabic, and Turkish menu text.', 'success');
    }

    root.querySelector('[data-ai-use-name]').addEventListener('click', function () {
        appendText(root.querySelector('[data-ai-ingredients]'), valueOf('menu_name'));
    });

    root.querySelector('[data-ai-use-description]').addEventListener('click', function () {
        appendText(root.querySelector('[data-ai-ingredients]'), valueOf('menu_description'));
    });

    root.querySelector('[data-ai-suggest-ingredients]').addEventListener('click', function () {
        var combined = [valueOf('menu_name'), valueOf('menu_description')].filter(Boolean).join(', ');
        appendText(root.querySelector('[data-ai-ingredients]'), combined);
        setMessage(enabled ? 'Ingredient prompt updated. Review it, add portion details, then estimate nutrition.' : 'Ingredient prompt prepared. Nutrition estimation is disabled until the AI endpoint is configured.');
    });

    estimateButton.addEventListener('click', function () {
        if (!enabled) return;
        estimateButton.disabled = true;
        setMessage('Requesting staged nutrition estimate…');

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            body: JSON.stringify({
                menu_name: valueOf('menu_name'),
                menu_description: valueOf('menu_description'),
                ingredients: root.querySelector('[data-ai-ingredients]').value.trim(),
                serving_size: root.querySelector('[data-ai-portion]').value.trim(),
                preparation_notes: root.querySelector('[data-ai-prep]').value.trim(),
                languages_supported: ['en', 'de', 'fa', 'ar', 'tr']
            })
        }).then(function (response) {
            if (!response.ok) throw new Error('Nutrition estimate is unavailable.');
            return response.json();
        }).then(function (data) {
            var suggestion = normalizedSuggestion(data);
            if (!suggestion) throw new Error('The AI response did not include nutrition values.');
            showSuggestion(suggestion);
            setMessage('Suggestion is staged for review. Click Apply suggestion to copy it into the real nutrition fields.', 'success');
        }).catch(function (error) {
            setMessage(error.message || 'Nutrition estimate is unavailable. Please enter values manually.', 'error');
        }).finally(function () {
            estimateButton.disabled = false;
        });
    });

    root.querySelector('[data-ai-apply]').addEventListener('click', function () {
        if (!latestSuggestion) return;
        fields.forEach(function (field) {
            var input = findField(field);
            if (input && latestSuggestion[field] !== '' && latestSuggestion[field] !== null && latestSuggestion[field] !== undefined) {
                input.value = latestSuggestion[field];
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        setMessage('Suggestion applied to the editable nutrition fields. Review and save the menu item when ready.', 'success');
    });
})();
</script>
