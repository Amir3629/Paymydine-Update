@php
$galleryRows = collect($formModel->menu_images ?? [])->sortBy('sort_order')->values();
$isPreview = method_exists($this, 'previewMode') ? $this->previewMode : false;
@endphp

<div id="menu-inline-gallery" class="menu-inline-gallery" data-pmd-inline-gallery>
    <div class="menu-inline-gallery__list" data-gallery-list>
        @foreach($galleryRows as $index => $row)
            @php
                $path = (string)($row->image_path ?? '');
                $sortOrder = (int)($row->sort_order ?: ($index + 1));
                $thumb = '';
                if ($path !== '') {
                    $cleanPath = trim($path);

                    if (preg_match('#^https?://#i', $cleanPath)) {
                        $thumb = $cleanPath;
                    } else {
                        $cleanPath = ltrim($cleanPath, '/');

                        if (strpos($cleanPath, 'assets/media/') === 0) {
                            $thumb = url('/'.$cleanPath);
                        } elseif (strpos($cleanPath, 'attachments/public/') === 0) {
                            $thumb = url('/assets/media/'.$cleanPath);
                        } elseif (strpos($cleanPath, 'uploads/') === 0) {
                            $thumb = url('/assets/media/'.$cleanPath);
                        } else {
                            $thumb = url('/assets/media/uploads/'.$cleanPath);
                        }
                    }
                }
            @endphp
            <div class="menu-inline-gallery__item" data-gallery-item>
                <div class="menu-inline-gallery__thumb-wrap">
                    <img class="menu-inline-gallery__thumb" src="{{ $thumb }}" alt="Additional image">
                    @unless($isPreview)
                        <button type="button" class="menu-inline-gallery__remove-overlay" data-gallery-remove title="Remove image" aria-label="Remove image">
                            <i class="fa fa-times"></i>
                        </button>
                    @endunless
                </div>
                <div class="menu-inline-gallery__controls">
                    <input type="number" min="1" class="form-control form-control-sm" data-gallery-order name="menu_images_inline[{{ $index }}][sort_order]" value="{{ $sortOrder }}" {{ $isPreview ? 'disabled' : '' }}>
                    @unless($isPreview)
                        <button type="button" class="btn btn-outline-danger btn-sm" data-gallery-remove title="Remove image">
                            <i class="fa fa-times"></i>
                        </button>
                    @endunless
                </div>
                <input type="hidden" data-gallery-path name="menu_images_inline[{{ $index }}][image_path]" value="{{ $path }}">
            </div>
        @endforeach
    </div>

    @unless($isPreview)
        <button type="button" class="menu-inline-gallery__add" data-gallery-add title="Add additional image" aria-label="Add additional image">
            <i class="fa fa-plus"></i>
        </button>
    @endunless
</div>

<style>
/* PMD inline menu gallery: compact add-on beside the main menu image uploader */
.pmd-menu-images-inline-field > label,
.pmd-menu-images-inline-field .form-label,
.pmd-menu-images-inline-field > .control-label {
    display: none !important;
}

.pmd-menu-images-inline-field {
    margin-top: -6px !important;
}

.pmd-main-thumb-gallery-wrap {
    display: flex !important;
    align-items: flex-start !important;
    gap: 10px !important;
    flex-wrap: wrap !important;
}

#menu-inline-gallery.menu-inline-gallery {
    display: flex !important;
    align-items: flex-start !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
    margin: 0 !important;
    padding: 0 !important;
}

#menu-inline-gallery .menu-inline-gallery__list {
    display: flex !important;
    align-items: flex-start !important;
    gap: 12px !important;
    flex-wrap: wrap !important;
    margin: 0 !important;
}

#menu-inline-gallery .menu-inline-gallery__item {
    width: 136px !important;
    min-width: 136px !important;
    border: 1px solid #dce4ef !important;
    border-radius: 14px !important;
    padding: 8px !important;
    background: #fff !important;
    box-shadow: 0 4px 14px rgba(31, 45, 61, .06) !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb-wrap {
    width: 120px !important;
    height: 120px !important;
    overflow: hidden !important;
    border-radius: 10px !important;
    background: #f7f9fc !important;
    margin-bottom: 8px !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    display: block !important;
}

#menu-inline-gallery .menu-inline-gallery__controls {
    display: flex !important;
    gap: 6px !important;
    align-items: center !important;
}

#menu-inline-gallery .menu-inline-gallery__controls input {
    flex: 1 1 auto !important;
    width: 64px !important;
    height: 30px !important;
    min-height: 30px !important;
    padding: 1px 4px !important;
    font-size: 12px !important;
    border-radius: 10px !important;
}

#menu-inline-gallery .menu-inline-gallery__controls button {
    width: 24px !important;
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#menu-inline-gallery .menu-inline-gallery__add {
    width: 136px !important;
    height: 74px !important;
    min-width: 136px !important;
    border: 2px dashed #344966 !important;
    border-radius: 14px !important;
    background: #fff !important;
    color: #344966 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 16px !important;
    cursor: pointer !important;
    box-shadow: 0 4px 14px rgba(31, 45, 61, .04) !important;
}

#menu-inline-gallery .menu-inline-gallery__add:hover {
    background: #f8fafc !important;
}

/* PMD_ADMIN_INLINE_GALLERY_FRAME_POLISH_START
   Make selected additional image feel like a real preview card.
   Keep the plus button compact. */
#menu-inline-gallery .menu-inline-gallery__item {
    width: 170px !important;
    min-width: 170px !important;
    border: 2px solid #dfe7f2 !important;
    border-radius: 22px !important;
    padding: 10px !important;
    background: #fff !important;
    box-shadow: 0 14px 35px rgba(31, 45, 61, .08) !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb-wrap {
    width: 148px !important;
    height: 148px !important;
    overflow: hidden !important;
    border-radius: 18px !important;
    background: #f8fafc !important;
    margin: 0 0 10px 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    display: block !important;
}

#menu-inline-gallery .menu-inline-gallery__controls {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    width: 100% !important;
}

#menu-inline-gallery .menu-inline-gallery__controls input[data-gallery-order] {
    width: 82px !important;
    height: 42px !important;
    min-height: 42px !important;
    padding: 6px 10px !important;
    border-radius: 14px !important;
    font-size: 18px !important;
    text-align: center !important;
}

#menu-inline-gallery .menu-inline-gallery__controls button[data-gallery-remove] {
    width: 42px !important;
    height: 42px !important;
    min-height: 42px !important;
    border-radius: 14px !important;
    padding: 0 !important;
    font-size: 18px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#menu-inline-gallery .menu-inline-gallery__add {
    width: 86px !important;
    height: 86px !important;
    min-width: 86px !important;
    align-self: flex-start !important;
    border-radius: 18px !important;
    font-size: 24px !important;
}
/* PMD_ADMIN_INLINE_GALLERY_FRAME_POLISH_END */


/* PMD_GALLERY_REMOVE_VISIBLE_CONTROLS_START
   Hide the bottom order/delete control bar and make the + frame match image cards. */
#menu-inline-gallery .menu-inline-gallery__controls {
    display: none !important;
}

#menu-inline-gallery .menu-inline-gallery__item,
#menu-inline-gallery .menu-inline-gallery__add {
    width: 170px !important;
    height: 170px !important;
    min-width: 170px !important;
    min-height: 170px !important;
    border-radius: 22px !important;
}

#menu-inline-gallery .menu-inline-gallery__item {
    padding: 10px !important;
    border: 2px solid #dfe7f2 !important;
    background: #fff !important;
    box-shadow: 0 14px 35px rgba(31, 45, 61, .08) !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb-wrap {
    width: 148px !important;
    height: 148px !important;
    margin: 0 !important;
    border-radius: 18px !important;
    background: #f8fafc !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#menu-inline-gallery .menu-inline-gallery__thumb {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
}

#menu-inline-gallery .menu-inline-gallery__add {
    padding: 0 !important;
    align-self: flex-start !important;
    border: 3px dashed #344966 !important;
    background: #fff !important;
    color: #344966 !important;
    font-size: 34px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}
/* PMD_GALLERY_REMOVE_VISIBLE_CONTROLS_END */


/* PMD_GALLERY_REMOVE_OVERLAY_START
   Keep controls hidden, but show a compact X button on each additional image frame. */
#menu-inline-gallery .menu-inline-gallery__thumb-wrap {
    position: relative !important;
}

#menu-inline-gallery .menu-inline-gallery__remove-overlay {
    position: absolute !important;
    top: 10px !important;
    right: 10px !important;
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    min-height: 38px !important;
    border-radius: 999px !important;
    border: 3px solid #fff !important;
    background: #e94458 !important;
    color: #fff !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    font-size: 16px !important;
    line-height: 1 !important;
    box-shadow: 0 10px 24px rgba(233, 68, 88, .28) !important;
    z-index: 5 !important;
    cursor: pointer !important;
}

#menu-inline-gallery .menu-inline-gallery__remove-overlay:hover {
    background: #d92d45 !important;
    transform: translateY(-1px) !important;
}
/* PMD_GALLERY_REMOVE_OVERLAY_END */


/* PMD_SMALL_ADDITIONAL_IMAGE_REMOVE_X_START
   Final override: keep the additional image remove button small like the native mediafinder X. */
#menu-inline-gallery .menu-inline-gallery__remove-overlay {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    min-height: 30px !important;
    top: 8px !important;
    right: 8px !important;
    border-radius: 999px !important;
    border: 3px solid #fff !important;
    background: #e84d5b !important;
    color: #fff !important;
    font-size: 13px !important;
    line-height: 1 !important;
    box-shadow: 0 8px 18px rgba(232, 77, 91, .22) !important;
    padding: 0 !important;
}

#menu-inline-gallery .menu-inline-gallery__remove-overlay i {
    font-size: 13px !important;
    line-height: 1 !important;
}
/* PMD_SMALL_ADDITIONAL_IMAGE_REMOVE_X_END */


/* PMD_FINAL_TINY_GALLERY_X_START */
#menu-inline-gallery .menu-inline-gallery__remove-overlay {
    width: 26px !important;
    height: 26px !important;
    min-width: 26px !important;
    min-height: 26px !important;
    top: 8px !important;
    right: 8px !important;
    border-radius: 999px !important;
    border: 3px solid #fff !important;
    background: #e84d5b !important;
    color: #fff !important;
    font-size: 11px !important;
    line-height: 1 !important;
    padding: 0 !important;
    box-shadow: 0 6px 16px rgba(232, 77, 91, .22) !important;
}

#menu-inline-gallery .menu-inline-gallery__remove-overlay i {
    font-size: 11px !important;
    line-height: 1 !important;
}
/* PMD_FINAL_TINY_GALLERY_X_END */

</style>

@unless($isPreview)
<script>
(function() {
    var root = document.getElementById('menu-inline-gallery');
    if (!root || root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';

    function removeVisibleGalleryControls() {
        root.querySelectorAll('.menu-inline-gallery__controls').forEach(function(el) {
            el.remove();
        });
    }

    removeVisibleGalleryControls();

    function getJQ() {
        return window.jQuery || window.$ || null;
    }

    function reindex() {
        root.querySelectorAll('[data-gallery-item]').forEach(function(item, idx) {
            var path = item.querySelector('[data-gallery-path]');
            var order = item.querySelector('[data-gallery-order]');

            if (path) path.name = 'menu_images_inline[' + idx + '][image_path]';

            if (order) {
                order.name = 'menu_images_inline[' + idx + '][sort_order]';
                if (!order.value || Number(order.value) < 1) order.value = idx + 1;
            }
        });

        syncHiddenFallbackPayload();
    }

    function syncHiddenFallbackPayload() {
        var form = root.closest('form') || document.querySelector('form');
        if (!form) return;

        form.querySelectorAll('[data-pmd-gallery-json]').forEach(function(el) {
            el.remove();
        });

        var rows = [];
        root.querySelectorAll('[data-gallery-item]').forEach(function(item, idx) {
            var path = item.querySelector('[data-gallery-path]');
            var order = item.querySelector('[data-gallery-order]');
            var imagePath = path ? String(path.value || '').trim() : '';

            if (!imagePath) return;

            rows.push({
                image_path: imagePath,
                sort_order: order && order.value ? parseInt(order.value, 10) || (idx + 1) : (idx + 1)
            });
        });

        // Top-level JSON fallback, read directly by Menus_model::afterSave().
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'menu_images_inline_json';
        hidden.value = JSON.stringify(rows);
        hidden.setAttribute('data-pmd-gallery-json', '1');
        form.appendChild(hidden);

        // Common model-array fallback, in case the form controller only passes model-scoped input.
        var hiddenModel = document.createElement('input');
        hiddenModel.type = 'hidden';
        hiddenModel.name = 'Menu[menu_images_inline_json]';
        hiddenModel.value = JSON.stringify(rows);
        hiddenModel.setAttribute('data-pmd-gallery-json', '1');
        form.appendChild(hiddenModel);

        console.log('[PMD inline gallery] synced hidden payload:', rows);
    }

    function flashError(message) {
        var $ = getJQ();

        if ($ && $.ti && $.ti.flashMessage) {
            $.ti.flashMessage({ text: message, class: 'danger' });
            return;
        }

        console.warn('[PMD inline gallery] ' + message);
        alert(message);
    }

    function looksLikeImage(value) {
        if (!value) return false;
        value = String(value);
        return /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)(\?|#|$)/i.test(value)
            || /\/assets\/media\//i.test(value)
            || /\/api\/media\//i.test(value)
            || /attachments\/public\//i.test(value);
    }

    function normalizePath(value) {
        if (!value) return '';

        value = String(value).trim();
        if (!value) return '';

        try {
            var u = new URL(value, window.location.origin);
            value = u.pathname;
        } catch (e) {}

        value = value
            .replace(/^https?:\/\/[^/]+/i, '')
            .replace(/^\/assets\/media\/uploads\//i, '')
            .replace(/^\/assets\/media\//i, '')
            .replace(/^\/api\/media\//i, '')
            .replace(/^\/+/, '');

        return value;
    }

    function publicUrlFromPath(path, fallbackUrl) {
        if (fallbackUrl) {
            fallbackUrl = String(fallbackUrl).trim();
            if (fallbackUrl[0] === '/') return window.location.origin + fallbackUrl;
            if (/^https?:\/\//i.test(fallbackUrl)) return fallbackUrl;
        }

        if (!path) return '';

        if (/^https?:\/\//i.test(path)) return path;

        path = String(path).replace(/^\/+/, '');

        if (/^attachments\/public\//i.test(path)) {
            return window.location.origin + '/assets/media/' + path;
        }

        return window.location.origin + '/assets/media/uploads/' + path;
    }

    function collectStringsDeep(input, output, depth) {
        if (!input || depth > 4) return output;

        if (typeof input === 'string') {
            output.push(input);
            return output;
        }

        if (input.jquery && input.length) {
            input.each(function() {
                collectStringsDeep(this, output, depth + 1);
            });
            return output;
        }

        if (input.nodeType === 1) {
            output.push(input.getAttribute('src') || '');
            output.push(input.getAttribute('href') || '');
            output.push(input.getAttribute('data-path') || '');
            output.push(input.getAttribute('data-media-item-path') || '');
            output.push(input.getAttribute('data-media-item-url') || '');
            output.push(input.getAttribute('data-url') || '');
            output.push(input.getAttribute('title') || '');
            output.push(input.getAttribute('alt') || '');

            if (input.dataset) {
                Object.keys(input.dataset).forEach(function(k) {
                    output.push(input.dataset[k]);
                });
            }

            var img = input.matches && input.matches('img') ? input : input.querySelector && input.querySelector('img');
            if (img) {
                output.push(img.src || '');
                output.push(img.getAttribute('src') || '');
                output.push(img.getAttribute('alt') || '');
                output.push(img.getAttribute('title') || '');
            }

            var link = input.querySelector && input.querySelector('a[href]');
            if (link) output.push(link.href || link.getAttribute('href') || '');

            output.push(input.innerText || input.textContent || '');
            return output;
        }

        if (typeof input === 'object') {
            [
                'path', 'image_path', 'url', 'publicUrl', 'public_url', 'src',
                'thumb', 'thumbnail', 'file', 'fileName', 'filename', 'file_name',
                'name', 'media', 'location'
            ].forEach(function(k) {
                if (input[k]) collectStringsDeep(input[k], output, depth + 1);
            });

            // Also scan other object values, because TI media payload shapes differ.
            Object.keys(input).forEach(function(k) {
                if (k === 'parentNode' || k === 'ownerDocument') return;
                try {
                    collectStringsDeep(input[k], output, depth + 1);
                } catch (e) {}
            });
        }

        return output;
    }

    function selectedDomFallback() {
        var selectors = [
            '.modal.show .media-item.selected',
            '.modal.show .selectonic-selected',
            '.modal.show [aria-selected="true"]',
            '.media-manager .media-item.selected',
            '.media-manager .selectonic-selected',
            '.media-list .media-item.selected',
            '.media-list .selected'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) return el;
        }

        return null;
    }

    function normalizeSelectedMedia(items, selected, holder) {
        var strings = [];

        collectStringsDeep(items, strings, 0);
        collectStringsDeep(selected, strings, 0);
        collectStringsDeep(holder && holder.length ? holder[0] : holder, strings, 0);

        var fallbackEl = selectedDomFallback();
        collectStringsDeep(fallbackEl, strings, 0);

        var candidates = strings
            .filter(Boolean)
            .map(function(v) { return String(v).trim(); })
            .filter(function(v) { return v && looksLikeImage(v); });

        console.log('[PMD inline gallery] media candidates:', candidates.slice(0, 20));

        if (!candidates.length) {
            console.warn('[PMD inline gallery] raw selected payload:', {
                items: items,
                selected: selected,
                holder: holder && holder.length ? holder[0] : holder,
                fallbackEl: fallbackEl
            });
            return { path: '', publicUrl: '' };
        }

        var best = candidates.find(function(v) {
            return /\/assets\/media\/uploads\//i.test(v) || /\/api\/media\//i.test(v) || /attachments\/public\//i.test(v);
        }) || candidates[0];

        var path = normalizePath(best);
        var publicUrl = publicUrlFromPath(path, best);

        return {
            path: path,
            publicUrl: publicUrl
        };
    }

    function appendImage(path, publicUrl) {
        if (!path) return;

        var idx = root.querySelectorAll('[data-gallery-item]').length;
        var div = document.createElement('div');

        div.className = 'menu-inline-gallery__item';
        div.setAttribute('data-gallery-item', '1');

        div.innerHTML =
            '<div class="menu-inline-gallery__thumb-wrap">' +
                '<img class="menu-inline-gallery__thumb" src="' + publicUrl + '" alt="Additional image">' +
                '<button type="button" class="menu-inline-gallery__remove-overlay" data-gallery-remove title="Remove image" aria-label="Remove image"><i class="fa fa-times"></i></button>' +
            '</div>' +
            '<div class="menu-inline-gallery__controls">' +
                '<input type="number" min="1" class="form-control form-control-sm" data-gallery-order name="menu_images_inline[' + idx + '][sort_order]" value="' + (idx + 1) + '">' +
                '<button type="button" class="btn btn-outline-danger btn-sm" data-gallery-remove title="Remove image"><i class="fa fa-times"></i></button>' +
            '</div>' +
            '<input type="hidden" data-gallery-path name="menu_images_inline[' + idx + '][image_path]" value="' + path + '">';

        root.querySelector('[data-gallery-list]').appendChild(div);
        reindex();
        removeVisibleGalleryControls();
    }

    function moveBesideMainThumb() {
        if (root.dataset.moved === '1') return;

        var originalField = root.closest('.form-group, .field, .form-group-container, .pmd-menu-images-inline-field');

        var finders = Array.prototype.slice.call(document.querySelectorAll(
            'a.find-config-button[data-media-finder-cover], a.find-config-button'
        )).filter(function(el) {
            return !root.contains(el);
        });

        if (!finders.length) return;

        var thumbFinder = finders[finders.length - 1];
        var thumbGrid = thumbFinder.closest('.grid') || thumbFinder.parentElement;

        if (!thumbGrid || !thumbGrid.parentElement) return;

        var parent = thumbGrid.parentElement;
        var wrap = parent.querySelector('.pmd-main-thumb-gallery-wrap');

        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'pmd-main-thumb-gallery-wrap';
            parent.insertBefore(wrap, thumbGrid);
            wrap.appendChild(thumbGrid);
        }

        wrap.appendChild(root);
        root.dataset.moved = '1';

        if (originalField && !originalField.contains(root)) {
            originalField.style.display = 'none';
        }
    }

    root.addEventListener('click', function(e) {
        var removeBtn = e.target.closest('[data-gallery-remove]');
        if (removeBtn) {
            removeBtn.closest('[data-gallery-item]').remove();
            reindex();
            return;
        }

        var addBtn = e.target.closest('[data-gallery-add]');
        if (!addBtn) return;

        var $ = getJQ();

        if (!$) {
            flashError('jQuery is not loaded yet. Please refresh the page and try again.');
            return;
        }

        if ($.ti && $.ti.mediaManager && $.ti.mediaManager.modal) {
            new $.ti.mediaManager.modal({
                alias: 'mediamanager',
                selectMode: 'single',
                chooseButton: true,
                chooseButtonText: 'Select',
                onInsert: function(items) {
                    if (!items || !items.length) {
                        flashError('No image was selected.');
                        return;
                    }

                    var selected = items[0];
                    var holder = null;

                    try {
                        holder = $(selected).closest('.media-item');
                    } catch (e) {
                        holder = $();
                    }

                    var media = normalizeSelectedMedia(items, selected, holder);

                    if (!media.path) {
                        flashError('Could not read selected image path. Check console for PMD inline gallery debug output.');
                        return;
                    }

                    appendImage(media.path, media.publicUrl);

                    if (this.hide) this.hide();
                }
            });
            return;
        }

        flashError('Media manager widget is not loaded on this page.');
    });

    var form = root.closest('form') || document.querySelector('form');
    if (form && !form.dataset.pmdGallerySubmitHook) {
        form.dataset.pmdGallerySubmitHook = '1';
        form.addEventListener('submit', syncHiddenFallbackPayload, true);
    }

    document.addEventListener('ajaxBeforeSend', syncHiddenFallbackPayload, true);
    document.addEventListener('ajaxSetup', syncHiddenFallbackPayload, true);

    setTimeout(moveBesideMainThumb, 0);
    setTimeout(moveBesideMainThumb, 300);
    setTimeout(moveBesideMainThumb, 1000);
    setTimeout(syncHiddenFallbackPayload, 1200);
})();
</script>
@endunless
