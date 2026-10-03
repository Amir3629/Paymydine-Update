// PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;

  var modal = document.querySelector('[data-pmd-menu-modal]');
  var form = modal && modal.querySelector('[data-pmd-menu-form]');
  if (!modal || !form) return;

  var imageInput = form.querySelector('[data-pmd-menu-image-input]');
  var categoryChoices = form.querySelector('[data-pmd-menu-category-choices]');
  var galleryHost = null;
  var optionHost = null;
  var optionEmpty = null;
  var optionAdd = null;
  var objectUrls = [];
  var stagedFiles = [];
  var removedPaths = new Set();
  var currentImages = [];
  var optionGroups = [];
  var loadToken = 0;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function ensureHidden(name, value, marker) {
    var input = form.querySelector('input[' + marker + ']');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.setAttribute(marker, '');
      form.appendChild(input);
    }
    input.name = name;
    input.value = value;
    return input;
  }

  function installUi() {
    ensureHidden('pmd_menu_enhancements_v1', '1', 'data-pmd-menu-enhancements-v1');

    if (imageInput) {
      imageInput.name = 'images[]';
      imageInput.multiple = true;
      imageInput.setAttribute('multiple', 'multiple');
      var upload = imageInput.closest('.pmd-menu-form__upload');
      if (upload) {
        var label = upload.querySelector('span');
        if (label) label.textContent = 'Add images';
        if (!upload.parentElement.querySelector('[data-pmd-gallery-help]')) {
          var help = document.createElement('small');
          help.setAttribute('data-pmd-gallery-help', '');
          help.className = 'pmd-menu-gallery-editor__hint';
          help.textContent = 'Add up to 8 photos. The first new photo becomes the cover. Guests can swipe left or right through all photos.';
          upload.insertAdjacentElement('afterend', help);
        }
      }
      var imageSection = imageInput.closest('.pmd-menu-form__section');
      if (imageSection && !imageSection.querySelector('[data-pmd-menu-gallery-editor]')) {
        galleryHost = document.createElement('div');
        galleryHost.className = 'pmd-menu-gallery-editor';
        galleryHost.setAttribute('data-pmd-menu-gallery-editor', '');
        galleryHost.setAttribute('aria-live', 'polite');
        imageSection.appendChild(galleryHost);
      } else if (imageSection) {
        galleryHost = imageSection.querySelector('[data-pmd-menu-gallery-editor]');
      }
    }

    if (categoryChoices) {
      var categorySection = categoryChoices.closest('.pmd-menu-form__section');
      if (categorySection && !form.querySelector('[data-pmd-menu-options-builder]')) {
        var section = document.createElement('section');
        section.className = 'pmd-menu-form__section pmd-menu-options-builder';
        section.setAttribute('data-pmd-menu-options-builder', '');
        section.innerHTML = '<div class="pmd-menu-form__section-head pmd-menu-options-builder__head"><div><h3>Sides &amp; options</h3><p>Create choices such as Burger size, Sauces or Steak doneness. Each choice can add to the food price.</p></div><button type="button" class="pmd-menu-options-builder__add" data-pmd-option-group-add>+ Add option</button></div><div class="pmd-menu-options-builder__groups" data-pmd-option-groups></div><div class="pmd-menu-options-builder__empty" data-pmd-option-empty><strong>No options yet</strong><span>This food can be ordered as-is. Add an option only when guests need to choose something.</span></div>';
        categorySection.parentNode.insertBefore(section, categorySection);
      }
    }

    optionHost = form.querySelector('[data-pmd-option-groups]');
    optionEmpty = form.querySelector('[data-pmd-option-empty]');
    optionAdd = form.querySelector('[data-pmd-option-group-add]');
  }

  function revokeObjectUrls() {
    objectUrls.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (error) {} });
    objectUrls = [];
  }

  function selectedFiles() {
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

  function visibleExistingImages() {
    return currentImages.filter(function (entry) { return !removedPaths.has(String(entry.path || '')); });
  }

  function imagePath(url) {
    var raw = String(url || '').split('?')[0].split('#')[0].replace(/\\/g, '/');
    try { raw = decodeURIComponent(raw); } catch (error) {}
    var parts = raw.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function normalizeImages(item) {
    var out = [];
    var visit = function (value) {
      if (!value) return;
      if (Array.isArray(value)) { value.forEach(visit); return; }
      if (typeof value === 'object') { visit(value.url || value.image || value.src || value.path || value.name || value.image_path); return; }
      var url = String(value || '').trim();
      if (!url || url.indexOf('/brand/paymydine-logo.svg') !== -1) return;
      var key = imagePath(url);
      if (!key || out.some(function (entry) { return entry.url === url; })) return;
      out.push({url: url, path: key});
    };
    if (item) {
      visit(item.image); visit(item.image_url); visit(item.images); visit(item.gallery); visit(item.media); visit(item.additional_images);
    }
    return out.slice(0, 8);
  }

  function syncRemoveInputs() {
    form.querySelectorAll('input[data-pmd-gallery-remove-input]').forEach(function (node) { node.remove(); });
    removedPaths.forEach(function (value) {
      var input = document.createElement('input');
      input.type = 'hidden'; input.name = 'remove_images[]'; input.value = value;
      input.setAttribute('data-pmd-gallery-remove-input', '');
      form.appendChild(input);
    });
  }

  function validateGalleryLimit() {
    if (!imageInput) return true;
    var total = visibleExistingImages().length + selectedFiles().length;
    if (total > 8) {
      imageInput.setCustomValidity('A food can have up to 8 images. Remove an image or select fewer files.');
      if (typeof imageInput.reportValidity === 'function') imageInput.reportValidity();
      return false;
    }
    imageInput.setCustomValidity('');
    return true;
  }

  function renderGallery(message) {
    if (!galleryHost) return;
    revokeObjectUrls();
    var existing = visibleExistingImages();
    var files = selectedFiles();
    var items = [];
    existing.forEach(function (entry, index) {
      items.push('<div class="pmd-menu-gallery-editor__item"><img src="' + esc(entry.url) + '" alt="Food image ' + (index + 1) + '"><span>' + (index === 0 && !files.length ? 'Cover' : 'Saved') + '</span><button type="button" data-pmd-gallery-remove="' + esc(entry.path) + '" aria-label="Remove image">×</button></div>');
    });
    files.forEach(function (file, index) {
      var url = URL.createObjectURL(file); objectUrls.push(url);
      items.push('<div class="pmd-menu-gallery-editor__item is-new"><img src="' + esc(url) + '" alt="New food image ' + (index + 1) + '"><span>' + (index === 0 ? 'New cover' : 'New') + '</span><button type="button" data-pmd-gallery-remove-new="' + index + '" aria-label="Remove new image">×</button></div>');
    });
    if (message && !items.length) {
      galleryHost.innerHTML = '<div class="pmd-menu-gallery-editor__blank is-warning"><strong>Gallery could not be loaded</strong><span>' + esc(message) + '</span></div>';
    } else {
      galleryHost.innerHTML = items.length ? '<div class="pmd-menu-gallery-editor__title"><strong>Food gallery</strong><small>' + items.length + ' / 8 images</small></div><div class="pmd-menu-gallery-editor__grid">' + items.join('') + '</div>' : '<div class="pmd-menu-gallery-editor__blank"><strong>No gallery photos yet</strong><span>Add one or more images above.</span></div>';
    }
    syncRemoveInputs(); validateGalleryLimit();
  }

  function normalizeOptions(item) {
    return (Array.isArray(item && item.options) ? item.options : []).map(function (group) {
      var type = String(group && (group.display_type || group.displayType) || 'radio').toLowerCase();
      if (['radio','checkbox','select'].indexOf(type) === -1) type = 'radio';
      return {
        name: String(group && (group.name || group.option_name) || ''),
        display_type: type,
        required: Boolean(group && group.required),
        values: (Array.isArray(group && (group.values || group.option_values)) ? (group.values || group.option_values) : []).map(function (value) {
          return {name:String(value && (value.value || value.name || value.label) || ''), price:Math.max(0, Number(value && (value.price || value.price_delta) || 0) || 0), is_default:Boolean(value && (value.is_default || value.default))};
        })
      };
    }).filter(function (group) { return group.name || group.values.length; });
  }

  function ensureValue(group) { if (!group.values.length) group.values.push({name:'', price:0, is_default:false}); }

  function groupMarkup(group, groupIndex) {
    ensureValue(group);
    var rows = group.values.map(function (value, valueIndex) {
      return '<div class="pmd-menu-option-value" data-option-value-index="' + valueIndex + '"><input type="text" name="options[' + groupIndex + '][values][' + valueIndex + '][name]" maxlength="128" required placeholder="Choice name (e.g. Medium)" value="' + esc(value.name) + '" data-option-value-name><label class="pmd-menu-option-value__price"><span>+ price</span><input type="number" name="options[' + groupIndex + '][values][' + valueIndex + '][price]" min="0" max="9999999" step="0.01" inputmode="decimal" value="' + esc(Number(value.price || 0).toFixed(2).replace(/\.00$/, '')) + '" data-option-value-price></label><label class="pmd-menu-option-value__default"><input type="checkbox" ' + (value.is_default ? 'checked' : '') + ' data-option-value-default><span>Default</span></label><button type="button" class="pmd-menu-option-value__remove" data-option-value-remove aria-label="Remove choice">×</button></div>';
    }).join('');
    return '<article class="pmd-menu-option-group" data-option-group-index="' + groupIndex + '"><div class="pmd-menu-option-group__top"><label class="pmd-menu-field"><span>Option name</span><input type="text" name="options[' + groupIndex + '][name]" maxlength="128" required placeholder="e.g. Burger size" value="' + esc(group.name) + '" data-option-group-name></label><label class="pmd-menu-field"><span>Choice type</span><select name="options[' + groupIndex + '][display_type]" data-option-group-type><option value="radio"' + (group.display_type === 'radio' ? ' selected' : '') + '>Choose one</option><option value="checkbox"' + (group.display_type === 'checkbox' ? ' selected' : '') + '>Choose multiple</option><option value="select"' + (group.display_type === 'select' ? ' selected' : '') + '>Dropdown</option></select></label><label class="pmd-menu-option-group__required" title="Customer must select at least one choice before ordering."><input type="hidden" name="options[' + groupIndex + '][required]" value="0"><input type="checkbox" name="options[' + groupIndex + '][required]" value="1" ' + (group.required ? 'checked' : '') + ' data-option-group-required><span>Must choose</span></label><button type="button" class="pmd-menu-option-group__remove" data-option-group-remove>Remove option</button></div><div class="pmd-menu-option-group__values">' + rows + '</div><button type="button" class="pmd-menu-option-group__add-value" data-option-value-add>+ Add choice</button></article>';
  }

  function syncDefaultHiddenInputs() {
    form.querySelectorAll('input[data-option-default-hidden]').forEach(function (node) { node.remove(); });
    optionGroups.forEach(function (group, groupIndex) {
      group.values.forEach(function (value, valueIndex) {
        var input = document.createElement('input'); input.type = 'hidden'; input.name = 'options[' + groupIndex + '][values][' + valueIndex + '][is_default]'; input.value = value.is_default ? '1' : '0'; input.setAttribute('data-option-default-hidden', ''); form.appendChild(input);
      });
    });
  }

  function renderOptions(message) {
    if (!optionHost) return;
    optionHost.innerHTML = optionGroups.map(groupMarkup).join('');
    if (optionEmpty) {
      optionEmpty.hidden = optionGroups.length > 0;
      optionEmpty.innerHTML = message ? '<strong>Existing options could not be loaded</strong><span>' + esc(message) + ' Saving this food will keep its current options unless you add a new option.</span>' : '<strong>No options yet</strong><span>This food can be ordered as-is. Add an option only when guests need to choose something.</span>';
    }
    syncDefaultHiddenInputs();
  }

  function captureOptions() {
    if (!optionHost) return;
    optionHost.querySelectorAll('[data-option-group-index]').forEach(function (groupNode) {
      var gi = Number(groupNode.getAttribute('data-option-group-index')); var group = optionGroups[gi]; if (!group) return;
      group.name = (groupNode.querySelector('[data-option-group-name]') || {}).value || '';
      group.display_type = (groupNode.querySelector('[data-option-group-type]') || {}).value || 'radio';
      group.required = Boolean(groupNode.querySelector('[data-option-group-required]') && groupNode.querySelector('[data-option-group-required]').checked);
      groupNode.querySelectorAll('[data-option-value-index]').forEach(function (valueNode) {
        var vi = Number(valueNode.getAttribute('data-option-value-index')); var value = group.values[vi]; if (!value) return;
        value.name = (valueNode.querySelector('[data-option-value-name]') || {}).value || '';
        value.price = Math.max(0, Number((valueNode.querySelector('[data-option-value-price]') || {}).value || 0) || 0);
        value.is_default = Boolean(valueNode.querySelector('[data-option-value-default]') && valueNode.querySelector('[data-option-value-default]').checked);
      });
    });
    syncDefaultHiddenInputs();
  }

  function findItems(payload) {
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (payload.data) {
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.data.items)) return payload.data.items;
    }
    return [];
  }

  function loadExistingItem(id, token) {
    return fetch('/api/v1/menu', {credentials:'same-origin', headers:{'Accept':'application/json'}})
      .then(function (response) { if (!response.ok) throw new Error('The live menu API returned ' + response.status + '.'); return response.json(); })
      .then(function (payload) {
        if (token !== loadToken) return;
        var item = findItems(payload).find(function (row) { return String(row && (row.id || row.menu_id)) === String(id); });
        if (!item) throw new Error('This food was not found in the live menu API.');
        currentImages = normalizeImages(item); optionGroups = normalizeOptions(item);
        ensureHidden('pmd_menu_options_present', '1', 'data-pmd-menu-options-present');
        renderGallery(); renderOptions();
      });
  }

  function syncFromCurrentForm() {
    var token = ++loadToken;
    removedPaths.clear(); currentImages = []; optionGroups = []; stagedFiles = [];
    if (imageInput) { imageInput.value = ''; imageInput.setCustomValidity(''); syncStagedFilesToInput(); }
    var present = form.querySelector('input[data-pmd-menu-options-present]'); if (present) present.remove();
    renderGallery(); renderOptions();
    var idField = form.querySelector('[data-pmd-menu-id]'); var id = idField ? String(idField.value || '') : '';
    if (!id) { ensureHidden('pmd_menu_options_present', '1', 'data-pmd-menu-options-present'); return; }
    loadExistingItem(id, token).catch(function (error) {
      if (token !== loadToken) return;
      currentImages = []; optionGroups = [];
      renderGallery(error.message || 'Please retry.'); renderOptions(error.message || 'Please retry.');
    });
  }

  installUi();
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
  if (optionAdd) optionAdd.addEventListener('click', function () {
    captureOptions(); if (optionGroups.length >= 12) return;
    optionGroups.push({name:'', display_type:'radio', required:false, values:[{name:'', price:0, is_default:false}]});
    ensureHidden('pmd_menu_options_present', '1', 'data-pmd-menu-options-present'); renderOptions();
    var nodes = optionHost.querySelectorAll('[data-option-group-index]'); var last = nodes[nodes.length - 1]; var input = last && last.querySelector('[data-option-group-name]'); if (input) input.focus();
  });
  if (optionHost) {
    optionHost.addEventListener('input', captureOptions);
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
    optionHost.addEventListener('click', function (event) {
      var groupNode = event.target.closest('[data-option-group-index]'); if (!groupNode) return;
      var gi = Number(groupNode.getAttribute('data-option-group-index')); captureOptions();
      if (event.target.closest('[data-option-group-remove]')) { event.preventDefault(); optionGroups.splice(gi,1); renderOptions(); return; }
      if (event.target.closest('[data-option-value-add]')) { event.preventDefault(); if (optionGroups[gi] && optionGroups[gi].values.length < 30) optionGroups[gi].values.push({name:'',price:0,is_default:false}); renderOptions(); return; }
      var valueNode = event.target.closest('[data-option-value-index]');
      if (valueNode && event.target.closest('[data-option-value-remove]')) { event.preventDefault(); var vi = Number(valueNode.getAttribute('data-option-value-index')); if (optionGroups[gi] && optionGroups[gi].values.length > 1) optionGroups[gi].values.splice(vi,1); renderOptions(); }
    });
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-menu-edit], [data-pmd-menu-create], [data-pmd-menu-header-primary]')) window.setTimeout(syncFromCurrentForm, 0);
  });
  form.addEventListener('formdata', function (event) {
    if (!event.formData) return;
    event.formData.delete('images[]');
    stagedFiles.forEach(function (file) { event.formData.append('images[]', file, file.name); });
  });
  form.addEventListener('submit', function () { captureOptions(); validateGalleryLimit(); }, true);
  window.setTimeout(syncFromCurrentForm, 0);
})();
