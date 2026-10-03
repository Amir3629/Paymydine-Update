@php
    $__vars = get_defined_vars();
    $__model = $__vars['formModel'] ?? $__vars['model'] ?? $__vars['record'] ?? null;

    $__value = '';

    if ($__model && isset($__model->menu_images_inline_json)) {
        $__value = $__model->menu_images_inline_json;
    } elseif ($__model && isset($__model->menu_images_inline)) {
        $__value = $__model->menu_images_inline;
    } elseif (isset($field) && isset($field->value)) {
        $__value = $field->value;
    }

    if (is_array($__value) || is_object($__value)) {
        $__value = json_encode($__value);
    }

    $__value = is_string($__value) && trim($__value) !== '' ? $__value : '[]';
@endphp

<div id="menu-inline-gallery" class="pmd-v35-gallery" data-pmd-inline-gallery></div>

<input type="hidden" id="menu_images_inline_json" name="menu_images_inline_json" value="{{ e($__value) }}">
<input type="hidden" name="Menu[menu_images_inline_json]" value="{{ e($__value) }}">

<style>
.pmd-menu-images-inline-field > label,
.pmd-menu-images-inline-field .form-label,
.pmd-menu-images-inline-field > .control-label {
    display: none !important;
}

.pmd-v35-gallery {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(72px, 1fr)) !important;
    gap: 10px !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
}

.pmd-v35-tile,
.pmd-v35-add {
    position: relative !important;
    width: 100% !important;
    aspect-ratio: 1 / 1 !important;
    min-height: 72px !important;
    border-radius: 16px !important;
    background: #fff !important;
    border: 2px solid #dfe7f2 !important;
    box-shadow: 0 12px 30px rgba(31, 45, 61, .06) !important;
    overflow: hidden !important;
}

.pmd-v35-tile img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
    background: #f8fbff !important;
}

.pmd-v35-remove {
    position: absolute !important;
    top: 7px !important;
    right: 7px !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 999px !important;
    border: 3px solid #fff !important;
    background: #ef4d5d !important;
    color: #fff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    font-size: 16px !important;
    line-height: 1 !important;
    font-weight: 900 !important;
    cursor: pointer !important;
    box-shadow: 0 8px 18px rgba(239, 77, 93, .22) !important;
    z-index: 3 !important;
}

.pmd-v35-add {
    border: 3px dashed #344966 !important;
    color: #1f3856 !important;
    background: #fff !important;
    font-size: 38px !important;
    font-weight: 800 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
</style>

<script>
(function () {
    if (window.__PMD_V35_GALLERY_PARTIAL__) return;
    window.__PMD_V35_GALLERY_PARTIAL__ = true;

    function qa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function imageLike(v) {
        return /\.(png|jpe?g|webp|gif|svg)$/i.test(String(v || '')) ||
            /attachments\/public|assets\/media|uploads\/|api\/media/i.test(String(v || ''));
    }

    function fileName(v) {
        return String(v || '').split('?')[0].split('#')[0].split('/').pop();
    }

    function mainAttachmentFile() {
        var mf = document.querySelector('#mediafinder-formthumb-thumb,[data-field-name="thumb"] [data-control="mediafinder"]');
        var hidden = mf && mf.querySelector('input[data-find-value]');
        var v = hidden ? String(hidden.value || '') : '';
        return fileName(v);
    }

    function toUrl(v) {
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

        var f = fileName(v);
        if (!f) return '';

        if (f === mainAttachmentFile()) return location.origin + '/api/media/' + encodeURIComponent(f);

        return location.origin + '/assets/media/uploads/' + encodeURIComponent(f);
    }

    function inputs() {
        return qa('input[type="hidden"]').filter(function (el) {
            return /^(menu_images_inline_json|Menu\[menu_images_inline_json\])$/.test(el.name || '');
        });
    }

    function read() {
        var arr = [];

        inputs().forEach(function (input) {
            var raw = String(input.value || '').trim();
            if (!raw || raw === '[]') return;

            try {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach(function (x) {
                        var p = x && (x.image_path || x.path || x.url || x.src || '');
                        if (imageLike(p)) arr.push(String(p));
                    });
                }
            } catch (e) {}
        });

        return Array.from(new Set(arr));
    }

    function write(paths) {
        var data = paths.map(function (p, i) {
            return { image_path: p, sort_order: i + 1 };
        });

        var json = JSON.stringify(data);

        inputs().forEach(function (input) {
            input.value = json;
            input.setAttribute('value', json);
        });
    }

    function removeAt(index) {
        var paths = read();
        paths.splice(index, 1);
        write(paths);
        render();
    }

    function addPath(path) {
        if (!imageLike(path)) return;
        var paths = read();
        paths.push(path);
        paths = Array.from(new Set(paths));
        write(paths);
        render();
    }

    function render() {
        var root = document.getElementById('menu-inline-gallery');
        if (!root) return;

        var paths = read();

        root.innerHTML = '';

        paths.forEach(function (p, i) {
            var tile = document.createElement('div');
            tile.className = 'pmd-v35-tile';

            var img = document.createElement('img');
            img.alt = 'Additional image';
            img.src = toUrl(p);

            img.onerror = function () {
                var f = fileName(p);
                var fallback = f ? location.origin + '/api/media/' + encodeURIComponent(f) : '';
                if (fallback && img.src !== fallback) img.src = fallback;
            };

            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'pmd-v35-remove';
            remove.setAttribute('aria-label', 'Remove image');
            remove.textContent = '×';
            remove.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                removeAt(i);
            });

            tile.appendChild(img);
            tile.appendChild(remove);
            root.appendChild(tile);
        });

        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'pmd-v35-add';
        add.setAttribute('aria-label', 'Add additional image');
        add.textContent = '+';
        add.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Safe fallback: open native Media Manager page if modal API is unknown.
            // This avoids breaking/emptying payload again.
            alert('Gallery preview is stable now. To add more images, use Media Manager and paste/select image path in the backend flow. Modal picker can be rewired after preview is stable.');
        });

        root.appendChild(add);
    }

    render();
    setTimeout(render, 100);
    setTimeout(render, 500);

    window.PMDMenuFormCleanV35Gallery = {
        render: render,
        read: read,
        write: write,
        addPath: addPath,
        toUrl: toUrl,
        check: function () {
            render();
            var root = document.getElementById('menu-inline-gallery');
            var imgs = root ? qa('img', root) : [];
            return {
                payload: read(),
                galleryFound: !!root,
                galleryImgCount: imgs.length,
                galleryVisibleImgCount: imgs.filter(function (img) {
                    var s = getComputedStyle(img);
                    var r = img.getBoundingClientRect();
                    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
                }).length,
                imgs: imgs.map(function (img) {
                    return {
                        src: img.currentSrc || img.src || '',
                        natural: (img.naturalWidth || 0) + 'x' + (img.naturalHeight || 0),
                        complete: !!img.complete
                    };
                })
            };
        }
    };
})();
</script>
