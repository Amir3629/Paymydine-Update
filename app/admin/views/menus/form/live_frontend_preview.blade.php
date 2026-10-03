<div class="pmd-v35-preview-panel" id="pmd-live-preview-panel">
    <div class="pmd-v35-preview-headline">
        <span class="pmd-v35-preview-title">Live Preview</span>
        <span class="pmd-v35-preview-subtitle">Frontend card style</span>
    </div>

    <div class="pmd-v35-card" id="pmd-live-preview">
        <div class="pmd-v35-image-wrap" id="pmd-v35-main-image-wrap">
            <img id="pmd-prev-img" alt="Preview image" src="">
            <button type="button" class="pmd-v35-edit-main" data-pmd-main-image-upload="1" aria-label="Edit main image">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 20h4.7L19.1 9.6a2.1 2.1 0 0 0 0-3L17.4 4.9a2.1 2.1 0 0 0-3 0L4 15.3V20Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"></path>
                    <path d="M13.5 5.8l4.7 4.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>
                </svg>
            </button>
        </div>

        <h5 id="pmd-prev-name">Item name</h5>
        <p id="pmd-prev-desc">Description preview will appear here.</p>

        <div class="pmd-v35-price" id="pmd-prev-price">€0.00</div>
        <div class="pmd-v35-bar"></div>
        <div id="pmd-prev-badges" class="pmd-v35-badges"></div>
        <div id="pmd-prev-nutrition" class="pmd-v35-nutrition"></div>
    </div>
</div>

<style>
.pmd-v35-preview-panel {
    position: relative !important;
    width: 100% !important;
}

.pmd-v35-preview-headline {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 12px !important;
    margin: 0 0 10px !important;
    padding: 0 !important;
}

.pmd-v35-preview-title {
    font-size: 13px !important;
    font-weight: 800 !important;
    color: #1d3146 !important;
}

.pmd-v35-preview-subtitle {
    font-size: 12px !important;
    color: #60718c !important;
}

.pmd-v35-card {
    width: 100% !important;
    border-radius: 22px !important;
    padding: 14px !important;
    background: linear-gradient(180deg, #f6fbff 0%, #eef7ff 100%) !important;
    border: 1px solid #bee0ff !important;
    box-shadow: 0 16px 40px rgba(31, 55, 82, .08) !important;
    overflow: hidden !important;
}

.pmd-v35-image-wrap {
    position: relative !important;
    width: 100% !important;
    height: 170px !important;
    min-height: 170px !important;
    max-height: 170px !important;
    border-radius: 18px !important;
    overflow: hidden !important;
    border: 1px solid #b8dcff !important;
    background: #f8fbff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#pmd-prev-img {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;
    object-fit: cover !important;
    opacity: 1 !important;
    visibility: visible !important;
    border-radius: 18px !important;
}

.pmd-v35-image-wrap:not(.has-image)::before {
    content: "+" !important;
    width: 72px !important;
    height: 72px !important;
    border-radius: 18px !important;
    border: 3px dashed #344966 !important;
    color: #1f3856 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 34px !important;
    font-weight: 800 !important;
}

.pmd-v35-image-wrap:not(.has-image) #pmd-prev-img {
    display: none !important;
}

.pmd-v35-edit-main {
    position: absolute !important;
    top: 12px !important;
    right: 12px !important;
    width: 54px !important;
    height: 54px !important;
    border-radius: 18px !important;
    border: 2px solid #bde3ff !important;
    background: rgba(255,255,255,.92) !important;
    color: #1f3b5d !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 12px 28px rgba(22, 44, 72, .10) !important;
    cursor: pointer !important;
    z-index: 5 !important;
}

.pmd-v35-edit-main svg {
    width: 25px !important;
    height: 25px !important;
}

#pmd-prev-name {
    margin: 16px 0 6px !important;
    text-align: center !important;
    color: #062f2a !important;
    font-size: 24px !important;
    font-weight: 900 !important;
    line-height: 1.1 !important;
}

#pmd-prev-desc {
    margin: 0 auto 12px !important;
    max-width: 95% !important;
    text-align: center !important;
    color: #65748d !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1.35 !important;
    overflow-wrap: anywhere !important;
}

.pmd-v35-price {
    width: fit-content !important;
    margin: 0 auto 12px !important;
    padding: 8px 18px !important;
    border-radius: 999px !important;
    border: 1px solid #ffc878 !important;
    background: #fff7ed !important;
    color: #a64c0f !important;
    font-size: 15px !important;
    font-weight: 900 !important;
}

.pmd-v35-bar {
    width: 100% !important;
    height: 16px !important;
    border-radius: 999px !important;
    border: 1px solid #c4e2ff !important;
    background: #fff !important;
}

.pmd-v35-badges {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    gap: 6px !important;
    margin-top: 10px !important;
}

.pmd-v35-badge {
    font-size: 11px !important;
    border-radius: 999px !important;
    padding: 4px 9px !important;
    border: 1px solid #d6e1f3 !important;
    background: #ffffff !important;
    color: #334663 !important;
}

.pmd-v35-nutrition {
    display: none !important;
    margin-top: 10px !important;
    font-size: 12px !important;
    color: #435675 !important;
    background: rgba(255,255,255,.75) !important;
    border: 1px solid #dbe6f5 !important;
    border-radius: 12px !important;
    padding: 8px 9px !important;
}
</style>

<script>
(function () {
    if (window.__PMD_V35_PREVIEW_PARTIAL__) return;
    window.__PMD_V35_PREVIEW_PARTIAL__ = true;

    function qa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function field(name) {
        return document.querySelector('[name="Menu[' + name + ']"],[name="' + name + '"],[name*="[' + name + ']"]');
    }

    function val(name) {
        var el = field(name);
        if (!el) return '';
        if (el.type === 'checkbox') return el.checked ? '1' : '';
        return String(el.value || '').trim();
    }

    function imageLike(v) {
        return /(attachments\/public|assets\/media|uploads\/|api\/media|\.png|\.jpe?g|\.webp|\.gif|\.svg)/i.test(String(v || ''));
    }

    function fileName(v) {
        return String(v || '').split('?')[0].split('#')[0].split('/').pop();
    }

    function toUrl(v, mode) {
        v = String(v || '').trim();
        if (!v || !imageLike(v)) return '';

        if (/^https?:\/\//i.test(v)) {
            try { v = new URL(v).pathname.replace(/^\/+/, ''); }
            catch (e) { return v; }
        } else {
            v = v.replace(/^\/+/, '');
        }

        if (v.indexOf('assets/media/attachments/public/') === 0) return location.origin + '/' + v;
        if (v.indexOf('attachments/public/') === 0) return location.origin + '/assets/media/' + v;
        if (v.indexOf('assets/media/uploads/') === 0) return location.origin + '/' + v;
        if (v.indexOf('uploads/') === 0) return location.origin + '/assets/media/' + v;

        if (v.indexOf('api/media/') === 0) {
            var apiFile = fileName(v);
            if (mode === 'gallery') return location.origin + '/assets/media/uploads/' + encodeURIComponent(apiFile);
            return location.origin + '/' + v;
        }

        var f = fileName(v);
        if (!f) return '';

        if (mode === 'main') return location.origin + '/api/media/' + encodeURIComponent(f);
        return location.origin + '/assets/media/uploads/' + encodeURIComponent(f);
    }

    function mainMediaValue() {
        var mf = document.querySelector('#mediafinder-formthumb-thumb,[data-field-name="thumb"] [data-control="mediafinder"],[data-control="mediafinder"][data-alias="formThumb"]');

        if (mf) {
            var hidden = mf.querySelector('input[data-find-value]');
            if (hidden && imageLike(hidden.value)) return hidden.value;

            var img = mf.querySelector('img[data-find-image], img');
            if (img && imageLike(img.getAttribute('src') || img.src)) return img.getAttribute('src') || img.src;
        }

        var hiddenCandidates = qa('input[type="hidden"],input')
            .map(function (el) {
                return {
                    key: ((el.name || '') + ' ' + (el.id || '')).toLowerCase(),
                    value: String(el.value || '')
                };
            })
            .filter(function (x) {
                return /thumb|image|media/.test(x.key) && imageLike(x.value);
            });

        var attachment = hiddenCandidates.filter(function (x) {
            return /attachments\/public/i.test(x.value);
        })[0];

        return attachment ? attachment.value : (hiddenCandidates[0] ? hiddenCandidates[0].value : '');
    }

    function renderImage() {
        var img = document.getElementById('pmd-prev-img');
        var wrap = document.getElementById('pmd-v35-main-image-wrap');
        if (!img || !wrap) return;

        var raw = mainMediaValue();
        var src = toUrl(raw, 'main');

        if (src) {
            if (img.getAttribute('src') !== src) img.setAttribute('src', src);
            wrap.classList.add('has-image');
        } else {
            img.removeAttribute('src');
            wrap.classList.remove('has-image');
        }

        img.onerror = function () {
            var f = fileName(raw || img.getAttribute('src') || '');
            if (!f) return;

            var next = location.origin + '/assets/media/uploads/' + encodeURIComponent(f);
            if (img.src !== next) img.src = next;
        };
    }

    function renderText() {
        var name = val('menu_name') || val('name') || 'Item name';
        var desc = val('menu_description') || val('description') || 'Description preview will appear here.';
        var price = val('menu_price') || val('price') || '';

        var nameEl = document.getElementById('pmd-prev-name');
        var descEl = document.getElementById('pmd-prev-desc');
        var priceEl = document.getElementById('pmd-prev-price');

        if (nameEl) nameEl.textContent = name;
        if (descEl) descEl.textContent = desc;
        if (priceEl) priceEl.textContent = price ? price : '€0.00';
    }

    function update() {
        renderText();
        renderImage();
    }

    function openMainNative() {
        var mf = document.querySelector('#mediafinder-formthumb-thumb,[data-field-name="thumb"] [data-control="mediafinder"],[data-control="mediafinder"][data-alias="formThumb"]');
        if (!mf) return;

        var find = mf.querySelector('a.find-button.blank-cover,button.find-button.blank-cover');
        if (find) {
            find.click();
            return;
        }

        mf.scrollIntoView({behavior: 'smooth', block: 'center'});
        mf.classList.add('pmd-v35-native-image-focus');
        setTimeout(function () { mf.classList.remove('pmd-v35-native-image-focus'); }, 1500);
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.pmd-v35-edit-main,[data-pmd-main-image-upload]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        openMainNative();
    }, true);

    document.addEventListener('input', update, true);
    document.addEventListener('change', update, true);

    var timer = null;
    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(update, 40);
    }

    if (window.MutationObserver) {
        new MutationObserver(schedule).observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['src', 'value', 'class', 'style']
        });
    }

    update();
    setTimeout(update, 100);
    setTimeout(update, 400);
    setTimeout(update, 1200);

    window.PMDMenuFormCleanV35Preview = {
        update: update,
        toUrl: toUrl,
        check: function () {
            update();
            var img = document.getElementById('pmd-prev-img');
            var r = img ? img.getBoundingClientRect() : null;
            return {
                mainRaw: mainMediaValue(),
                mainUrl: toUrl(mainMediaValue(), 'main'),
                imgFound: !!img,
                imgSrc: img ? (img.currentSrc || img.src || img.getAttribute('src') || '') : '',
                imgVisible: !!img && getComputedStyle(img).display !== 'none' && r.width > 0 && r.height > 0,
                imgNatural: img ? ((img.naturalWidth || 0) + 'x' + (img.naturalHeight || 0)) : '0x0'
            };
        }
    };
})();
</script>
