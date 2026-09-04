from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADMIN_JS = ROOT / 'app/admin/assets/js/pmd-menu-gallery-options-v1.js'
ADMIN_CSS = ROOT / 'app/admin/assets/css/pmd-menu-gallery-options-v1.css'
FRONTEND = ROOT / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/OptionConfiguratorRuntimeEnhancer.tsx'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Admin JS: persistent multi-pick gallery + clearer/unselectable option defaults
# ---------------------------------------------------------------------------
js = ADMIN_JS.read_text()
js = replace_once(
    js,
    "  var objectUrls = [];\n",
    "  var objectUrls = [];\n  var stagedFiles = [];\n",
    'admin stagedFiles state',
)

js = replace_once(
    js,
    """  function selectedFiles() {
    return imageInput && imageInput.files ? Array.prototype.slice.call(imageInput.files) : [];
  }
""",
    """  function selectedFiles() {
    return stagedFiles.slice();
  }

  function fileKey(file) {
    return [String(file && file.name || ''), Number(file && file.size || 0), Number(file && file.lastModified || 0), String(file && file.type || '')].join('::');
  }

  function syncStagedFilesToInput() {
    if (!imageInput || typeof DataTransfer === 'undefined') return;
    try {
      var transfer = new DataTransfer();
      stagedFiles.forEach(function (file) { transfer.items.add(file); });
      imageInput.files = transfer.files;
    } catch (error) {}
  }

  function stageSelectedFiles(files) {
    var seen = new Set(stagedFiles.map(fileKey));
    Array.prototype.slice.call(files || []).forEach(function (file) {
      var key = fileKey(file);
      if (!file || !key || seen.has(key)) return;
      stagedFiles.push(file);
      seen.add(key);
    });
    syncStagedFilesToInput();
  }

  function removeStagedFile(index) {
    if (!Number.isFinite(index) || index < 0 || index >= stagedFiles.length) return;
    stagedFiles.splice(index, 1);
    syncStagedFilesToInput();
  }
""",
    'admin selectedFiles helpers',
)

js = replace_once(
    js,
    """      items.push('<div class="pmd-menu-gallery-editor__item is-new"><img src="' + esc(url) + '" alt="New food image ' + (index + 1) + '"><span>' + (index === 0 ? 'New cover' : 'New') + '</span></div>');
""",
    """      items.push('<div class="pmd-menu-gallery-editor__item is-new"><img src="' + esc(url) + '" alt="New food image ' + (index + 1) + '"><span>' + (index === 0 ? 'New cover' : 'New') + '</span><button type="button" data-pmd-gallery-remove-new="' + index + '" aria-label="Remove new image">×</button></div>');
""",
    'admin new image remove button',
)

js = replace_once(
    js,
    """    removedPaths.clear(); currentImages = []; optionGroups = [];
    if (imageInput) { imageInput.value = ''; imageInput.setCustomValidity(''); }
""",
    """    removedPaths.clear(); currentImages = []; optionGroups = []; stagedFiles = [];
    if (imageInput) { imageInput.value = ''; imageInput.setCustomValidity(''); syncStagedFilesToInput(); }
""",
    'admin reset staged gallery',
)

js = replace_once(
    js,
    """  installUi();
  if (imageInput) imageInput.addEventListener('change', function () { renderGallery(); });
  if (galleryHost) galleryHost.addEventListener('click', function (event) {
    var remove = event.target.closest('[data-pmd-gallery-remove]'); if (!remove) return;
    event.preventDefault(); var image = String(remove.getAttribute('data-pmd-gallery-remove') || ''); if (image) removedPaths.add(image); renderGallery();
  });
""",
    """  installUi();
  if (imageInput) {
    imageInput.addEventListener('click', function () {
      // A native file input replaces its FileList on every picker visit. Clear the
      // native value before opening and keep the real pending list in stagedFiles.
      imageInput.value = '';
    });
    imageInput.addEventListener('change', function () {
      stageSelectedFiles(imageInput.files);
      renderGallery();
    });
  }
  if (galleryHost) galleryHost.addEventListener('click', function (event) {
    var removeNew = event.target.closest('[data-pmd-gallery-remove-new]');
    if (removeNew) {
      event.preventDefault();
      removeStagedFile(Number(removeNew.getAttribute('data-pmd-gallery-remove-new')));
      renderGallery();
      return;
    }
    var remove = event.target.closest('[data-pmd-gallery-remove]'); if (!remove) return;
    event.preventDefault(); var image = String(remove.getAttribute('data-pmd-gallery-remove') || ''); if (image) removedPaths.add(image); renderGallery();
  });
""",
    'admin gallery event handlers',
)

js = replace_once(
    js,
    "<input type=\"radio\" name=\"pmd-option-default-' + groupIndex + '\" ",
    "<input type=\"checkbox\" ",
    'admin default checkbox',
)
js = replace_once(
    js,
    'class="pmd-menu-option-group__required">',
    'class="pmd-menu-option-group__required" title="Customer must select at least one choice before ordering.">',
    'admin must choose tooltip',
)
js = replace_once(js, '<span>Required</span>', '<span>Must choose</span>', 'admin must choose label')

js = replace_once(
    js,
    """    optionHost.addEventListener('input', captureOptions); optionHost.addEventListener('change', captureOptions);
""",
    """    optionHost.addEventListener('input', captureOptions);
    optionHost.addEventListener('change', function (event) {
      var target = event.target;
      if (target && target.matches && target.matches('[data-option-value-default]') && target.checked) {
        var groupNode = target.closest('[data-option-group-index]');
        if (groupNode) {
          groupNode.querySelectorAll('[data-option-value-default]').forEach(function (other) {
            if (other !== target) other.checked = false;
          });
        }
      }
      captureOptions();
    });
""",
    'admin default change behavior',
)

js = replace_once(
    js,
    """  form.addEventListener('submit', function () { captureOptions(); validateGalleryLimit(); }, true);
""",
    """  form.addEventListener('formdata', function (event) {
    if (!event.formData) return;
    event.formData.delete('images[]');
    stagedFiles.forEach(function (file) { event.formData.append('images[]', file, file.name); });
  });
  form.addEventListener('submit', function () { captureOptions(); validateGalleryLimit(); }, true);
""",
    'admin formdata staged files',
)

ADMIN_JS.write_text(js)


# ---------------------------------------------------------------------------
# Admin CSS: normalize every option control to the existing 46px form system
# ---------------------------------------------------------------------------
ADMIN_CSS.write_text(r'''/* PMD_MENU_GALLERY_OPTIONS_V4 */
.pmd-menu-gallery-editor { margin-top:14px; }
.pmd-menu-gallery-editor__hint { display:block; margin-top:8px; color:#64748b; line-height:1.45; }
.pmd-menu-gallery-editor__title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:9px; color:#0f3d35; }
.pmd-menu-gallery-editor__title small { color:#64748b; font-weight:700; }
.pmd-menu-gallery-editor__grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:10px; }
.pmd-menu-gallery-editor__item { position:relative; min-height:92px; overflow:hidden; border:1px solid #cfe8e2; border-radius:14px; background:#f5faf8; }
.pmd-menu-gallery-editor__item img { display:block; width:100%; height:92px; object-fit:cover; }
.pmd-menu-gallery-editor__item > span { position:absolute; left:7px; bottom:7px; border-radius:999px; padding:3px 7px; background:rgba(6,48,42,.82); color:#fff; font-size:10px; font-weight:800; }
.pmd-menu-gallery-editor__item.is-new { border-color:#43a78d; box-shadow:0 0 0 1px rgba(67,167,141,.16); }
.pmd-menu-gallery-editor__item > button { position:absolute; top:6px; right:6px; display:grid; width:28px; height:28px; place-items:center; border:0; border-radius:999px; padding:0; background:rgba(111,32,32,.92); color:#fff; font:700 18px/1 Arial,sans-serif; cursor:pointer; }
.pmd-menu-gallery-editor__blank { display:grid; gap:2px; border:1px dashed #cbd5e1; border-radius:14px; padding:13px 15px; color:#64748b; }
.pmd-menu-gallery-editor__blank.is-warning { border-color:#f2c879; background:#fffaf0; color:#8a5a12; }
.pmd-menu-gallery-editor__blank strong { color:#334155; font-size:13px; }

.pmd-menu-options-builder__head { display:flex!important; align-items:flex-start; justify-content:space-between; gap:18px; }
.pmd-menu-options-builder__add,
.pmd-menu-option-group__add-value { display:inline-flex; min-height:42px; flex:0 0 auto; align-items:center; justify-content:center; border:1px solid #8ccbb9; border-radius:10px; padding:0 14px; background:#edf8f4; color:#075d4c; font-weight:800; line-height:1; cursor:pointer; }
.pmd-menu-options-builder__groups { display:grid; gap:14px; }
.pmd-menu-options-builder__empty { display:grid; gap:3px; border:1px dashed #cbd5e1; border-radius:14px; padding:15px; color:#64748b; }
.pmd-menu-options-builder__empty strong { color:#334155; }
.pmd-menu-option-group { border:1px solid #cfe8e2; border-radius:16px; padding:14px; background:#fbfefd; }
.pmd-menu-option-group__top { display:grid; grid-template-columns:minmax(220px,1.5fr) minmax(190px,.8fr) 142px 150px; gap:10px; align-items:end; }
.pmd-menu-option-group__top .pmd-menu-field { margin:0; }
.pmd-menu-option-group__top .pmd-menu-field input,
.pmd-menu-option-group__top .pmd-menu-field select { box-sizing:border-box; width:100%; height:46px!important; min-height:46px!important; border:1px solid #d3e1de; border-radius:12px; padding:0 13px; background:#fff; color:#163b34; font:inherit; font-size:14px; }
.pmd-menu-option-group__required { box-sizing:border-box; display:flex; height:46px; min-height:46px; align-items:center; justify-content:center; gap:8px; margin:0; padding:0 10px; border:1px solid #d9e7e4; border-radius:12px; background:#fff; color:#334155; font-size:13px; font-weight:800; white-space:nowrap; cursor:pointer; }
.pmd-menu-option-group__required input[type=checkbox],
.pmd-menu-option-value__default input[type=checkbox] { width:20px; height:20px; flex:0 0 20px; margin:0; accent-color:#08705d; cursor:pointer; }
.pmd-menu-option-group__remove { box-sizing:border-box; display:flex; height:46px; min-height:46px; align-items:center; justify-content:center; border:1px solid #f0c9c9; border-radius:12px; padding:0 12px; background:#fff7f7; color:#9b2c2c; font-weight:800; line-height:1; cursor:pointer; }
.pmd-menu-option-group__values { display:grid; gap:9px; margin:13px 0 10px; }
.pmd-menu-option-value { display:grid; grid-template-columns:minmax(220px,1fr) minmax(160px,190px) 122px 46px; gap:9px; align-items:center; }
.pmd-menu-option-value > input[type=text],
.pmd-menu-option-value__price input { box-sizing:border-box; width:100%; height:46px!important; min-height:46px!important; border:1px solid #d3e1de; border-radius:12px; padding:0 13px; background:#fff; color:#163b34; font:inherit; font-size:14px; }
.pmd-menu-option-value__price { display:grid; grid-template-columns:auto minmax(86px,1fr); height:46px; align-items:center; gap:7px; margin:0; }
.pmd-menu-option-value__price span { color:#64748b; font-size:11px; font-weight:800; white-space:nowrap; }
.pmd-menu-option-value__default { box-sizing:border-box; display:flex; height:46px; align-items:center; justify-content:center; gap:8px; margin:0; border:1px solid #d9e7e4; border-radius:12px; background:#fff; color:#475569; font-size:12px; font-weight:800; white-space:nowrap; cursor:pointer; }
.pmd-menu-option-value__remove { display:grid; width:42px; height:42px; place-items:center; justify-self:center; border:1px solid #f0c9c9; border-radius:12px; padding:0; background:#fff7f7; color:#9b2c2c; font:800 19px/1 Arial,sans-serif; cursor:pointer; }
.pmd-menu-option-group__top input:focus,
.pmd-menu-option-group__top select:focus,
.pmd-menu-option-value input:focus { border-color:#8ebcaf; outline:none; box-shadow:0 0 0 3px rgba(7,95,79,.08); }

@media (max-width:1050px) {
  .pmd-menu-option-group__top { grid-template-columns:minmax(0,1fr) minmax(180px,.8fr); }
  .pmd-menu-option-group__required,
  .pmd-menu-option-group__remove { width:100%; }
  .pmd-menu-option-value { grid-template-columns:minmax(0,1fr) minmax(150px,190px) 122px 46px; }
}
@media (max-width:760px) {
  .pmd-menu-options-builder__head { display:grid!important; }
  .pmd-menu-options-builder__add { width:100%; }
  .pmd-menu-option-group__top { grid-template-columns:1fr; }
  .pmd-menu-option-value { grid-template-columns:1fr; border-top:1px solid #e6efec; padding-top:10px; }
  .pmd-menu-option-value__price { grid-template-columns:70px minmax(0,1fr); }
  .pmd-menu-option-value__default { justify-content:flex-start; padding:0 12px; }
  .pmd-menu-option-value__remove { justify-self:end; }
}
''')


# ---------------------------------------------------------------------------
# Frontend V2: remove noisy copy/calculations and force-hide duplicate fieldsets
# ---------------------------------------------------------------------------
ts = FRONTEND.read_text()
ts = replace_once(
    ts,
    '  if (!pending) return null\n',
    '  if (!pending) {\n    return <style>{`fieldset[data-pmd-option-deferred="v3"] { display: none !important; }`}</style>\n  }\n',
    'frontend persistent detail-fieldset hide',
)
ts = replace_once(
    ts,
    '  const totalOptionsImpact = optionsTotal * pending.quantity\n  const scopeText = copy.appliesAll.replace(\'{count}\', String(pending.quantity))\n',
    '',
    'frontend remove noisy totals state',
)
ts = replace_once(
    ts,
    '        .pmd-option-configurator-v3 * { box-sizing: border-box; }\n',
    '        .pmd-option-configurator-v3 * { box-sizing: border-box; }\n        fieldset[data-pmd-option-deferred="v3"] { display: none !important; }\n',
    'frontend modal-time fieldset hide',
)
ts = replace_once(
    ts,
    '            <p>{copy.subtitle} · {item.name}</p>\n',
    '',
    'frontend remove configurator subtitle',
)
ts = replace_once(
    ts,
    "{value.name}{value.price > 0 ? ` (+${runtime.formatCurrency(value.price)} ${copy.each})` : ''}",
    "{value.name}{value.price > 0 ? ` (+${runtime.formatCurrency(value.price)})` : ''}",
    'frontend simplify select price',
)
ts = replace_once(
    ts,
    '''                            <strong className="pmd-option-configurator-v3__choicePrice">
                              <span>+{runtime.formatCurrency(value.price)}</span>
                              {pending.quantity > 1 && (
                                <small>× {pending.quantity} = +{runtime.formatCurrency(value.price * pending.quantity)}</small>
                              )}
                            </strong>
''',
    '''                            <strong className="pmd-option-configurator-v3__choicePrice">+{runtime.formatCurrency(value.price)}</strong>
''',
    'frontend remove per-choice multiplication copy',
)
ts = replace_once(
    ts,
    '''          {pending.quantity > 1 && (
            <div className="pmd-option-configurator-v3__scope">
              <strong>{scopeText}</strong>
              <span>{copy.separate}</span>
            </div>
          )}

''',
    '',
    'frontend remove quantity scope paragraph',
)
ts = replace_once(
    ts,
    '''              {pending.quantity > 1 && totalOptionsImpact > 0 && (
                <em>+{runtime.formatCurrency(totalOptionsImpact)} options</em>
              )}
''',
    '',
    'frontend remove extra options-total copy',
)

FRONTEND.write_text(ts)

print('Applied PMD menu gallery/options V4 polish')
