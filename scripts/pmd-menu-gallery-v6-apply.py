from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
V5_JS = ROOT / 'app/admin/assets/js/pmd-menu-gallery-options-v5.js'
V5_CSS = ROOT / 'app/admin/assets/css/pmd-menu-gallery-options-v5.css'
V6_JS = ROOT / 'app/admin/assets/js/pmd-menu-gallery-options-v6.js'
V6_CSS = ROOT / 'app/admin/assets/css/pmd-menu-gallery-options-v6.css'
ASSETS = ROOT / 'app/admin/views/_meta/assets.json'
TRAIT = ROOT / 'app/admin/traits/PmdMenuGalleryOptionsV1.php'

for path in [V5_JS, V5_CSS, ASSETS, TRAIT]:
    if not path.exists():
        raise SystemExit(f'missing required file: {path}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, got {count}')
    return updated


# ---------------------------------------------------------------------------
# Admin JS V6: owner-first photo editor + explicit persistent cover selection.
# ---------------------------------------------------------------------------
js = V5_JS.read_text()
js = replace_once(
    js,
    '// PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST\n',
    '// PMD_MENU_GALLERY_OPTIONS_V6_OWNER_PHOTOS\n',
    'js marker',
)
js = replace_once(
    js,
    '  var loadToken = 0;\n',
    "  var loadToken = 0;\n  var coverSelection = null;\n  var imagePreviewBox = modal.querySelector('[data-pmd-menu-image-preview]');\n  var imagePreview = imagePreviewBox && imagePreviewBox.querySelector('img');\n",
    'js gallery state',
)
js = replace_once(js, "        if (label) label.textContent = 'Add images';", "        if (label) label.textContent = 'Add photos';", 'upload label')
js = replace_once(
    js,
    "    if (imageInput) {\n      imageInput.name = 'images[]';",
    "    if (imageInput) {\n      var imageCopy = imageInput.closest('.pmd-menu-form__image-copy');\n      if (imageCopy) {\n        var imageHeading = imageCopy.querySelector('h3');\n        var imageHelp = imageCopy.querySelector('p');\n        if (imageHeading) imageHeading.textContent = 'Photos';\n        if (imageHelp) imageHelp.hidden = true;\n      }\n      imageInput.name = 'images[]';",
    'simplify image copy',
)

js = sub_once(
    js,
    r"        section\.innerHTML = '.*?';\n",
    "        section.innerHTML = '<div class=\"pmd-menu-form__section-head pmd-menu-options-builder__head\"><div><h3>Sides &amp; options</h3></div><button type=\"button\" class=\"pmd-menu-options-builder__add\" data-pmd-option-group-add>+ Add option</button></div><div class=\"pmd-menu-options-builder__groups\" data-pmd-option-groups></div><div class=\"pmd-menu-options-builder__empty\" data-pmd-option-empty hidden></div>';\n",
    'simplify options intro',
)

js = sub_once(
    js,
    r"  function stageSelectedFiles\(files\) \{.*?\n  \}\n\n  function removeStagedFile",
    """  function stageSelectedFiles(files) {
    var seen = new Set(stagedFiles.map(fileKey));
    Array.prototype.slice.call(files || []).forEach(function (file) {
      var key = fileKey(file);
      if (!file || !key || seen.has(key)) return;
      stagedFiles.push(file);
      seen.add(key);
    });
    if (!coverSelection && stagedFiles.length) coverSelection = 'new:' + fileKey(stagedFiles[0]);
    syncStagedFilesToInput();
    syncCoverInput();
  }

  function removeStagedFile""",
    'stage files',
)

js = sub_once(
    js,
    r"  function removeStagedFile\(index\) \{.*?\n  \}\n\n  function visibleExistingImages",
    """  function removeStagedFile(index) {
    if (!Number.isFinite(index) || index < 0 || index >= stagedFiles.length) return;
    var removedKey = 'new:' + fileKey(stagedFiles[index]);
    stagedFiles.splice(index, 1);
    if (coverSelection === removedKey) coverSelection = firstAvailableCover();
    syncStagedFilesToInput();
    syncCoverInput();
  }

  function visibleExistingImages""",
    'remove staged file',
)

new_gallery_block = r'''  function savedCoverKey(entry) {
    return 'saved:' + String(entry && entry.path || '');
  }

  function newCoverKey(file) {
    return 'new:' + fileKey(file);
  }

  function firstAvailableCover() {
    var existing = visibleExistingImages();
    if (existing.length) return savedCoverKey(existing[0]);
    if (stagedFiles.length) return newCoverKey(stagedFiles[0]);
    return null;
  }

  function syncCoverInput() {
    if (!coverSelection) coverSelection = firstAvailableCover();
    var value = '';
    if (coverSelection && coverSelection.indexOf('saved:') === 0) {
      value = coverSelection;
    } else if (coverSelection && coverSelection.indexOf('new:') === 0) {
      var stagedKey = coverSelection.slice(4);
      var stagedIndex = stagedFiles.findIndex(function (file) { return fileKey(file) === stagedKey; });
      if (stagedIndex >= 0) value = 'new:' + stagedIndex;
    }
    ensureHidden('pmd_menu_gallery_cover', value, 'data-pmd-gallery-cover-input');
  }

  function updatePrimaryPreview(url) {
    if (!imagePreviewBox || !imagePreview) return;
    var placeholder = imagePreviewBox.querySelector('.pmd-menu-form__preview-placeholder');
    if (url) {
      imagePreview.src = url;
      imagePreview.hidden = false;
      if (placeholder) placeholder.hidden = true;
      return;
    }
    imagePreview.removeAttribute('src');
    imagePreview.hidden = true;
    if (placeholder) placeholder.hidden = false;
  }

  function renderGallery(message) {
    if (!galleryHost) return;
    revokeObjectUrls();
    var existing = visibleExistingImages();
    var files = selectedFiles();
    if (!coverSelection) coverSelection = firstAvailableCover();
    var items = [];
    var selectedUrl = '';

    existing.forEach(function (entry, index) {
      var key = savedCoverKey(entry);
      var isCover = key === coverSelection;
      if (isCover) selectedUrl = entry.url;
      items.push('<div class="pmd-menu-gallery-editor__item' + (isCover ? ' is-cover' : '') + '" role="button" tabindex="0" data-pmd-gallery-cover-key="' + esc(key) + '" title="' + (isCover ? 'Cover image' : 'Set as cover') + '"><img src="' + esc(entry.url) + '" alt="Food photo ' + (index + 1) + '"><span class="pmd-menu-gallery-editor__cover-action">' + (isCover ? 'Cover' : 'Set cover') + '</span><button type="button" class="pmd-menu-gallery-editor__remove" data-pmd-gallery-remove="' + esc(entry.path) + '" aria-label="Remove photo"><span aria-hidden="true">×</span></button></div>');
    });

    files.forEach(function (file, index) {
      var url = URL.createObjectURL(file);
      objectUrls.push(url);
      var key = newCoverKey(file);
      var isCover = key === coverSelection;
      if (isCover) selectedUrl = url;
      items.push('<div class="pmd-menu-gallery-editor__item is-new' + (isCover ? ' is-cover' : '') + '" role="button" tabindex="0" data-pmd-gallery-cover-key="' + esc(key) + '" title="' + (isCover ? 'Cover image' : 'Set as cover') + '"><img src="' + esc(url) + '" alt="New food photo ' + (index + 1) + '"><span class="pmd-menu-gallery-editor__cover-action">' + (isCover ? 'Cover' : 'Set cover') + '</span><button type="button" class="pmd-menu-gallery-editor__remove" data-pmd-gallery-remove-new="' + index + '" aria-label="Remove photo"><span aria-hidden="true">×</span></button></div>');
    });

    if (message && !items.length) {
      galleryHost.innerHTML = '<div class="pmd-menu-gallery-editor__blank">Images unavailable.</div>';
    } else {
      galleryHost.innerHTML = items.length ? '<div class="pmd-menu-gallery-editor__grid">' + items.join('') + '</div>' : '';
    }

    syncRemoveInputs();
    syncCoverInput();
    validateGalleryLimit();
    if (selectedUrl) updatePrimaryPreview(selectedUrl);
    else if (!message && !items.length) updatePrimaryPreview('');
  }

  function normalizeOptions'''
js = sub_once(
    js,
    r"  function renderGallery\(message\) \{.*?\n  \}\n\n  function normalizeOptions",
    new_gallery_block,
    'gallery renderer',
)

js = sub_once(
    js,
    r"  function renderOptions\(message\) \{.*?\n  \}\n\n  function captureOptions",
    """  function renderOptions(message) {
    if (!optionHost) return;
    optionHost.innerHTML = optionGroups.map(groupMarkup).join('');
    if (optionEmpty) {
      optionEmpty.hidden = true;
      optionEmpty.innerHTML = '';
    }
    syncDefaultHiddenInputs();
  }

  function captureOptions""",
    'options empty state',
)

js = replace_once(
    js,
    "        currentImages = normalizeImages(item); optionGroups = normalizeOptions(item);\n",
    "        currentImages = normalizeImages(item); optionGroups = normalizeOptions(item);\n        if (!coverSelection && currentImages.length) coverSelection = savedCoverKey(currentImages[0]);\n",
    'initial cover',
)
js = replace_once(
    js,
    "    removedPaths.clear(); currentImages = []; optionGroups = []; stagedFiles = [];\n",
    "    removedPaths.clear(); currentImages = []; optionGroups = []; stagedFiles = []; coverSelection = null;\n",
    'reset cover',
)

js = sub_once(
    js,
    r"  if \(galleryHost\) galleryHost\.addEventListener\('click', function \(event\) \{.*?\n  \}\);\n  if \(optionAdd\)",
    r'''  if (galleryHost) {
    galleryHost.addEventListener('click', function (event) {
      var removeNew = event.target.closest('[data-pmd-gallery-remove-new]');
      if (removeNew) {
        event.preventDefault();
        event.stopPropagation();
        removeStagedFile(Number(removeNew.getAttribute('data-pmd-gallery-remove-new')));
        renderGallery();
        return;
      }

      var remove = event.target.closest('[data-pmd-gallery-remove]');
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        var image = String(remove.getAttribute('data-pmd-gallery-remove') || '');
        if (image) {
          var removedCoverKey = 'saved:' + image;
          removedPaths.add(image);
          if (coverSelection === removedCoverKey) coverSelection = firstAvailableCover();
          syncCoverInput();
          renderGallery();
        }
        return;
      }

      var cover = event.target.closest('[data-pmd-gallery-cover-key]');
      if (!cover) return;
      event.preventDefault();
      coverSelection = String(cover.getAttribute('data-pmd-gallery-cover-key') || '') || firstAvailableCover();
      syncCoverInput();
      renderGallery();
    });

    galleryHost.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var cover = event.target.matches && event.target.matches('[data-pmd-gallery-cover-key]') ? event.target : null;
      if (!cover) return;
      event.preventDefault();
      coverSelection = String(cover.getAttribute('data-pmd-gallery-cover-key') || '') || firstAvailableCover();
      syncCoverInput();
      renderGallery();
    });
  }
  if (optionAdd)''',
    'gallery interactions',
)

V6_JS.write_text(js)

# ---------------------------------------------------------------------------
# Admin CSS V6: compact photo cards, neutral remove control, cleaner options.
# ---------------------------------------------------------------------------
css = V5_CSS.read_text()
css = css.replace('/* PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST */\n', '/* PMD_MENU_GALLERY_OPTIONS_V6_OWNER_PHOTOS */\n', 1)

gallery_css = '''.pmd-menu-gallery-editor { margin-top:12px; }
.pmd-menu-gallery-editor__hint { display:none!important; }
.pmd-menu-gallery-editor__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(118px,132px)); gap:12px; align-items:start; }
.pmd-menu-gallery-editor__item { position:relative!important; box-sizing:border-box!important; width:100%; height:108px; min-height:108px!important; overflow:hidden!important; border:1px solid #d8e6e2!important; border-radius:14px!important; padding:0!important; margin:0!important; background:#f6faf8!important; box-shadow:none!important; cursor:pointer; transition:border-color .14s ease, box-shadow .14s ease, transform .14s ease; }
.pmd-menu-gallery-editor__item:hover { border-color:#9ccdc0!important; transform:translateY(-1px); }
.pmd-menu-gallery-editor__item:focus-visible { outline:3px solid rgba(8,112,93,.16)!important; outline-offset:2px; }
.pmd-menu-gallery-editor__item.is-cover { border-color:#17866f!important; box-shadow:0 0 0 2px rgba(23,134,111,.14)!important; }
.pmd-menu-gallery-editor__item img { display:block!important; width:100%!important; height:108px!important; min-height:108px!important; object-fit:cover!important; border:0!important; border-radius:0!important; margin:0!important; }
.pmd-menu-gallery-editor__cover-action { position:absolute!important; left:8px!important; bottom:8px!important; z-index:2; display:inline-flex!important; align-items:center!important; min-height:25px!important; border:1px solid rgba(255,255,255,.68)!important; border-radius:999px!important; padding:0 9px!important; background:rgba(255,255,255,.90)!important; color:#31524b!important; font-size:10px!important; font-weight:800!important; line-height:1!important; box-shadow:0 1px 3px rgba(15,45,38,.10)!important; pointer-events:none!important; }
.pmd-menu-gallery-editor__item.is-cover .pmd-menu-gallery-editor__cover-action { border-color:#0c6e5b!important; background:#0c6e5b!important; color:#fff!important; }
button.pmd-menu-gallery-editor__remove { position:absolute!important; top:7px!important; right:7px!important; left:auto!important; bottom:auto!important; z-index:4!important; display:grid!important; place-items:center!important; box-sizing:border-box!important; width:28px!important; min-width:28px!important; max-width:28px!important; height:28px!important; min-height:28px!important; max-height:28px!important; margin:0!important; padding:0!important; border:1px solid rgba(255,255,255,.55)!important; border-radius:999px!important; background:rgba(20,32,29,.72)!important; color:#fff!important; box-shadow:0 1px 4px rgba(0,0,0,.14)!important; font:700 17px/1 Arial,sans-serif!important; cursor:pointer!important; opacity:.90; transform:none!important; }
button.pmd-menu-gallery-editor__remove:hover { background:#263c36!important; opacity:1; }
button.pmd-menu-gallery-editor__remove span { display:block!important; width:auto!important; height:auto!important; margin:0!important; padding:0!important; line-height:1!important; transform:translateY(-1px); }
.pmd-menu-gallery-editor__blank { padding:8px 0; color:#64748b; font-size:12px; }

'''
css = sub_once(
    css,
    r"\.pmd-menu-gallery-editor \{.*?\n\n(?=\.pmd-menu-options-builder__head)",
    gallery_css,
    'gallery css',
)
css += '''\n/* V6: destructive controls stay quiet until the owner points at them. */
.pmd-menu-option-group__remove,
.pmd-menu-option-value__remove { border-color:#d8e3e0!important; background:#fff!important; color:#64748b!important; box-shadow:none!important; }
.pmd-menu-option-group__remove:hover,
.pmd-menu-option-value__remove:hover { border-color:#e7bcbc!important; background:#fffafa!important; color:#a33a3a!important; }
.pmd-menu-option-value__remove { width:38px!important; height:38px!important; min-width:38px!important; min-height:38px!important; border-radius:10px!important; }
.pmd-menu-options-builder__head { align-items:center!important; }
.pmd-menu-options-builder__head p,
.pmd-menu-options-builder__empty { display:none!important; }

@media (max-width:760px) {
  .pmd-menu-gallery-editor__grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  .pmd-menu-gallery-editor__item,
  .pmd-menu-gallery-editor__item img { height:96px!important; min-height:96px!important; }
}
'''
V6_CSS.write_text(css)

# ---------------------------------------------------------------------------
# Admin manifest: hard filename cache bust again, now V6.
# ---------------------------------------------------------------------------
assets = ASSETS.read_text()
if assets.count('pmd-menu-gallery-options-v5') != 4:
    raise SystemExit('asset manifest did not contain the expected V5 style/script refs')
assets = assets.replace('pmd-menu-gallery-options-v5', 'pmd-menu-gallery-options-v6')
ASSETS.write_text(assets)

# ---------------------------------------------------------------------------
# Persistence: cover-only saves and cover reorder via canonical sort_order.
# ---------------------------------------------------------------------------
trait = TRAIT.read_text()
new_upload_method = r'''    protected function syncPmdMenuGalleryUploadsV1($request, $connection, $schema, int $menuId): void
    {
        $incoming = $request->file('images', []);
        if (!$incoming) $incoming = [];
        if (!is_array($incoming)) $incoming = [$incoming];
        $incoming = array_values(array_filter($incoming));
        $remove = array_values(array_unique(array_filter(array_map(static function ($path) {
            $path = trim((string)$path);
            return $path === '' ? '' : basename(str_replace('\\', '/', $path));
        }, (array)$request->input('remove_images', [])))));
        $coverRequest = trim((string)$request->input('pmd_menu_gallery_cover', ''));

        if (!$incoming && !$remove && $coverRequest === '') return;
        if (!$schema->hasTable('menu_images')) throw new \RuntimeException('Menu image storage is unavailable for this restaurant.');
        if (count($incoming) > 8 || count($remove) > 8) throw new \RuntimeException('A food can have up to 8 images.');

        $existingQuery = $connection->table('menu_images')->where('menu_id', $menuId);
        if ($schema->hasColumn('menu_images', 'sort_order')) {
            $existingQuery->orderBy('sort_order');
        }
        $existingRows = $existingQuery->get(['image_path']);
        $existing = $existingRows->pluck('image_path')->map(static function ($path) {
            return trim((string)$path);
        })->filter()->values()->all();

        $removeActual = [];
        foreach ($existing as $path) {
            if (in_array(basename(str_replace('\\', '/', $path)), $remove, true)) $removeActual[] = $path;
        }
        if ((count(array_diff($existing, $removeActual)) + count($incoming)) > 8) {
            throw new \RuntimeException('A food can have up to 8 images. Remove an image before adding another one.');
        }

        foreach ($incoming as $file) {
            if (!$file || !$file->isValid()) throw new \RuntimeException('One of the selected food images could not be uploaded.');
            if ((int)$file->getSize() > 5 * 1024 * 1024) throw new \RuntimeException('Each food image must be 5 MB or smaller.');
            if (!in_array(strtolower((string)$file->getMimeType()), ['image/jpeg', 'image/png', 'image/webp'], true)) {
                throw new \RuntimeException('Food images must be JPG, PNG or WEBP.');
            }
        }

        if ($removeActual) {
            $connection->table('menu_images')->where('menu_id', $menuId)->whereIn('image_path', $removeActual)->delete();
        }

        $newPaths = [];
        if ($incoming) {
            $directory = base_path('assets/media/uploads');
            if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
                throw new \RuntimeException('Unable to create the menu image directory.');
            }
            if ($schema->hasColumn('menu_images', 'sort_order')) {
                $connection->table('menu_images')->where('menu_id', $menuId)->increment('sort_order', count($incoming));
            }

            $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            foreach ($incoming as $index => $file) {
                $mime = strtolower((string)$file->getMimeType());
                $filename = 'pmdmenu_'.date('Ymd_His').'_'.bin2hex(random_bytes(6)).'.'.$extensions[$mime];
                $file->move($directory, $filename);
                $newPaths[] = $filename;
                $row = ['menu_id' => $menuId, 'image_path' => $filename];
                if ($schema->hasColumn('menu_images', 'sort_order')) $row['sort_order'] = $index + 1;
                if ($schema->hasColumn('menu_images', 'created_at')) $row['created_at'] = now();
                if ($schema->hasColumn('menu_images', 'updated_at')) $row['updated_at'] = now();
                $connection->table('menu_images')->insert($row);
            }
        }

        // PMD_MENU_GALLERY_COVER_V6
        // The public menu already treats the lowest sort_order as the first/cover
        // image. Reorder that canonical list instead of adding a second cover field.
        if ($schema->hasColumn('menu_images', 'sort_order')) {
            $paths = $connection->table('menu_images')
                ->where('menu_id', $menuId)
                ->orderBy('sort_order')
                ->get(['image_path'])
                ->pluck('image_path')
                ->map(static function ($path) { return trim((string)$path); })
                ->filter()
                ->values()
                ->all();

            $coverPath = null;
            if (strpos($coverRequest, 'saved:') === 0) {
                $requestedBase = basename(str_replace('\\', '/', substr($coverRequest, 6)));
                foreach ($paths as $path) {
                    if (basename(str_replace('\\', '/', $path)) === $requestedBase) {
                        $coverPath = $path;
                        break;
                    }
                }
            } elseif (preg_match('/^new:(\d+)$/', $coverRequest, $matches)) {
                $newIndex = (int)$matches[1];
                if (array_key_exists($newIndex, $newPaths)) $coverPath = $newPaths[$newIndex];
            }

            if ($coverPath === null && $paths) $coverPath = $paths[0];
            if ($coverPath !== null) {
                $ordered = array_values(array_unique(array_merge(
                    [$coverPath],
                    array_values(array_filter($paths, static function ($path) use ($coverPath) {
                        return $path !== $coverPath;
                    }))
                )));
                foreach ($ordered as $position => $path) {
                    $connection->table('menu_images')
                        ->where('menu_id', $menuId)
                        ->where('image_path', $path)
                        ->update(['sort_order' => $position + 1]);
                }
            }
        }
    }

    protected function normalizePmdMenuOptionGroupsV1'''
trait = sub_once(
    trait,
    r"    protected function syncPmdMenuGalleryUploadsV1\(\$request, \$connection, \$schema, int \$menuId\): void\n    \{.*?\n    \}\n\n    protected function normalizePmdMenuOptionGroupsV1",
    new_upload_method,
    'gallery persistence method',
)
TRAIT.write_text(trait)

# Guardrails.
for marker, path in [
    ('PMD_MENU_GALLERY_OPTIONS_V6_OWNER_PHOTOS', V6_JS),
    ('PMD_MENU_GALLERY_OPTIONS_V6_OWNER_PHOTOS', V6_CSS),
    ('PMD_MENU_GALLERY_COVER_V6', TRAIT),
]:
    if marker not in path.read_text():
        raise SystemExit(f'missing marker {marker} in {path}')

if 'pmd-menu-gallery-options-v5' in ASSETS.read_text():
    raise SystemExit('V5 references remain in Admin asset manifest')
if ASSETS.read_text().count('pmd-menu-gallery-options-v6') != 4:
    raise SystemExit('V6 Admin manifest references are incomplete')

print('PMD Menu Gallery V6 patch applied')
