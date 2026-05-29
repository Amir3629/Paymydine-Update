@php
    $fallbackImage = url('/app/admin/assets/images/default-image.png');
    $initialImage = $fallbackImage;
    try {
        if (isset($formModel) && $formModel && method_exists($formModel, 'getThumb')) {
            $resolvedThumb = $formModel->getThumb();
            if (is_string($resolvedThumb) && trim($resolvedThumb) !== '') {
                $initialImage = $resolvedThumb;
            }
        }
    } catch (\Throwable $e) {
        $initialImage = $fallbackImage;
    }
@endphp

<div class="pmd-menu-edit-preview-panel" id="pmd-live-preview-panel">
    <details class="pmd-live-preview-details" open>
        <summary>
            <span class="pmd-live-preview-title">Live Preview</span>
            <span class="pmd-live-preview-subtitle">Frontend card style</span>
        </summary>

        <div class="pmd-live-preview-card" id="pmd-live-preview">
            <div class="pmd-live-preview-image-wrap">
                <img id="pmd-prev-img" src="{{ $initialImage }}" alt="Preview image">
            </div>

            <h5 id="pmd-prev-name">{{ $formModel->menu_name ?: 'Item name' }}</h5>
            <p id="pmd-prev-desc">{{ $formModel->menu_description ?: 'Description preview will appear here.' }}</p>

            <div class="pmd-live-preview-meta-row">
                <div class="pmd-live-preview-price" id="pmd-prev-price">{{ currency_format($formModel->menu_price ?: 0) }}</div>
            </div>

            <div class="pmd-live-preview-badges" id="pmd-prev-badges"></div>

            <div class="pmd-live-preview-nutrition" id="pmd-prev-nutrition"></div>
        </div>
    </details>
</div>

<style>
.pmd-menu-edit-preview-panel { position: relative; }
.pmd-menu-edit-preview-panel .pmd-live-preview-details { border: 1px solid #dbe6f5; border-radius: 18px; background: linear-gradient(165deg, #f8fbff 0%, #f2f6fd 55%, #eef3fb 100%); box-shadow: 0 8px 30px rgba(37, 56, 88, 0.08); backdrop-filter: blur(6px); }
.pmd-menu-edit-preview-panel .pmd-live-preview-details > summary { list-style: none; cursor: pointer; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4ebf8; }
.pmd-menu-edit-preview-panel .pmd-live-preview-details > summary::-webkit-details-marker { display: none; }
.pmd-menu-edit-preview-title { font-size: 13px; font-weight: 700; color: #253858; letter-spacing: .01em; }
.pmd-menu-edit-preview-subtitle { font-size: 11px; color: #5a6b87; }
.pmd-live-preview-card { padding: 12px; border-radius: 0 0 18px 18px; }
.pmd-live-preview-image-wrap { height: 180px; border-radius: 16px; background: radial-gradient(circle at top right, rgba(255,255,255,.8), rgba(241,245,251,.9)); border: 1px solid #e4ebf8; display: flex; align-items: center; justify-content: center; overflow: hidden; }
#pmd-prev-img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
#pmd-prev-name { margin: 12px 0 6px; text-align: center !important; color: #2b3550; font-size: 21px; font-weight: 700; }
#pmd-prev-desc { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #55607a; text-align: left; }
.pmd-live-preview-meta-row { display: flex; justify-content: center; align-items: center; margin-bottom: 10px; }
.pmd-live-preview-price { padding: 6px 12px; border-radius: 999px; background: #fff7ed; border: 1px solid #fed7aa; color: #a04d12; font-weight: 700; font-size: 14px; }
.pmd-live-preview-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 10px; }
.pmd-live-preview-badge { font-size: 11px; border-radius: 999px; padding: 3px 9px; border: 1px solid #d6e1f3; background: #ffffff; color: #334663; }
.pmd-live-preview-nutrition { font-size: 12px; color: #435675; background: rgba(255,255,255,.72); border: 1px solid #dbe6f5; border-radius: 12px; padding: 8px 9px; }
.pmd-live-preview-nutrition small { display: block; margin-top: 4px; color: #7284a0; font-size: 10px; }

/* Positioning in admin form */
.form-fields .field-live_frontend_preview { order: -4; }
@media (min-width: 1100px) {
    .form-fields .field-live_frontend_preview { position: sticky; top: 14px; align-self: flex-start; z-index: 3; }
    .form-fields .field-live_frontend_preview .pmd-menu-edit-preview-panel,
    .form-fields .field-live_frontend_preview .pmd-live-preview-details { max-width: 370px; margin-left: auto; }
}
@media (max-width: 1099px) {
    .form-fields .field-live_frontend_preview { width: 100%; order: -30; }
    .pmd-menu-edit-preview-panel .pmd-live-preview-details:not([open]) .pmd-live-preview-card { display:none; }
}
</style>

<script>
(function () {
    function field(name) {
        return document.querySelector('[name="Menu[' + name + ']"],[name="' + name + '"]');
    }

    function val(name) {
        var el = field(name);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked ? '1' : '';
        return (el.value || '').trim();
    }

    function findAllergenLabels() {
        var values = [];
        var relationWrap = document.querySelector('[data-field-name="allergens"]');
        if (!relationWrap) return values;
        relationWrap.querySelectorAll('select option:checked').forEach(function (opt) {
            if (opt.value && opt.textContent.trim()) values.push(opt.textContent.trim());
        });
        relationWrap.querySelectorAll('.select2-selection__choice').forEach(function (chip) {
            var t = chip.getAttribute('title') || chip.textContent || '';
            t = t.replace(/^×\s*/, '').trim();
            if (t) values.push(t);
        });
        return Array.from(new Set(values));
    }

    function isRtlText(text) { return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text || ''); }
    function toNumber(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

    function renderBadges() {
        var badges = [];
        if (val('is_halal') === '1') badges.push('🕌 Halal');
        if (val('is_vegetarian') === '1') badges.push('🥗 Vegetarian');
        if (val('is_vegan') === '1') badges.push('🌱 Vegan');

        var spice = val('spice_level');
        if (spice !== '') badges.push('🌶 Spice ' + spice);

        findAllergenLabels().slice(0, 4).forEach(function (a) { badges.push('⚠ ' + a); });

        var holder = document.getElementById('pmd-prev-badges');
        if (!holder) return;
        holder.innerHTML = badges.map(function (b) {
            return '<span class="pmd-live-preview-badge">' + b.replace(/</g, '&lt;') + '</span>';
        }).join('');
    }

    function renderNutrition() {
        var calories = toNumber(val('calories'));
        var protein = toNumber(val('protein'));
        var carbs = toNumber(val('carbs'));
        var fat = toNumber(val('fat'));
        var sugar = toNumber(val('sugar'));
        var serving = val('serving_size');

        var facts = [];
        if (calories !== null) facts.push(calories + ' kcal');
        if (protein !== null) facts.push('Protein ' + protein + 'g');
        if (carbs !== null) facts.push('Carbs ' + carbs + 'g');
        if (fat !== null) facts.push('Fat ' + fat + 'g');
        if (sugar !== null) facts.push('Sugar ' + sugar + 'g');

        var el = document.getElementById('pmd-prev-nutrition');
        if (!el) return;
        if (!facts.length && !serving) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }

        var servingLine = serving ? ('<div>Serving: ' + serving.replace(/</g, '&lt;') + '</div>') : '';
        el.innerHTML = '<div><strong>Nutrition</strong> · ' + facts.join(' · ') + '</div>' + servingLine + '<small>Estimated values. Actual values may vary.</small>';
        el.style.display = 'block';
    }

    function renderImage() {
        var fallback = @json($initialImage);
        var img = document.querySelector('[data-control="mediafinder"] img');
        var src = img && img.getAttribute('src') ? img.getAttribute('src') : fallback;
        var prev = document.getElementById('pmd-prev-img');
        if (prev && src) prev.setAttribute('src', src);
    }

    function update() {
        var name = val('menu_name') || 'Item name';
        var desc = val('menu_description') || 'Description preview will appear here.';
        var price = val('menu_price');

        var nameEl = document.getElementById('pmd-prev-name');
        var descEl = document.getElementById('pmd-prev-desc');
        var priceEl = document.getElementById('pmd-prev-price');

        if (nameEl) {
            nameEl.textContent = name;
            nameEl.style.direction = 'ltr';
            nameEl.style.textAlign = 'center';
        }

        if (descEl) {
            descEl.textContent = desc;
            var rtl = isRtlText(desc);
            descEl.style.direction = rtl ? 'rtl' : 'ltr';
            descEl.style.textAlign = rtl ? 'right' : 'left';
        }

        if (priceEl) priceEl.textContent = price !== '' ? price : '{{ currency_format(0) }}';

        renderImage();
        renderBadges();
        renderNutrition();
    }

    ['menu_name','menu_description','menu_price','is_halal','is_vegetarian','is_vegan','calories','protein','carbs','fat','sugar','serving_size','spice_level'].forEach(function (f) {
        var el = field(f);
        if (el) {
            el.addEventListener('input', update);
            el.addEventListener('change', update);
        }
    });

    document.addEventListener('change', function (e) {
        if (e.target.closest('[data-control="mediafinder"]') || e.target.closest('[data-field-name="allergens"]')) {
            setTimeout(update, 60);
        }
    });

    var form = document.querySelector('form');
    if (form && window.MutationObserver) {
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].type === 'attributes' || mutations[i].addedNodes.length) {
                    update();
                    break;
                }
            }
        });
        observer.observe(form, {subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'value', 'checked']});
    }
    update();
})();
</script>
