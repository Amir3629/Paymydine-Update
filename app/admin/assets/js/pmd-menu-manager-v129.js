(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-menu-manager]');
  var modal = document.querySelector('[data-pmd-menu-modal]');
  if (!root || !modal) return;

  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  var foodForm = modal.querySelector('[data-pmd-menu-form]');
  var comboForm = modal.querySelector('[data-pmd-combo-form]');
  var categoryForm = modal.querySelector('[data-pmd-category-form]');
  var foodContent = modal.querySelector('[data-pmd-food-modal-content]');
  var comboContent = modal.querySelector('[data-pmd-combo-modal-content]');
  var categoryContent = modal.querySelector('[data-pmd-category-modal-content]');
  var title = modal.querySelector('[data-pmd-menu-modal-title]');
  var eyebrow = modal.querySelector('[data-pmd-menu-modal-eyebrow]');
  var saveButton = modal.querySelector('[data-pmd-menu-save]');
  var deleteButton = modal.querySelector('[data-pmd-menu-delete]');
  var deleteLabel = modal.querySelector('[data-pmd-menu-delete-label]');
  var statusNode = modal.querySelector('[data-pmd-menu-modal-status]');
  var imageInput = modal.querySelector('[data-pmd-menu-image-input]');
  var imagePreviewBox = modal.querySelector('[data-pmd-menu-image-preview]');
  var imagePreview = imagePreviewBox && imagePreviewBox.querySelector('img');
  var comboItemsHost = modal.querySelector('[data-pmd-combo-form-items]');
  var comboCover = modal.querySelector('[data-pmd-combo-cover]');
  var comboImageInput = modal.querySelector('[data-pmd-combo-image-input]');
  var comboDerivedAllergens = modal.querySelector('[data-pmd-combo-derived-allergens]');
  var comboDerivedNutrition = modal.querySelector('[data-pmd-combo-derived-nutrition]');

  var modalMode = 'food';
  var deleteArmed = false;
  var lastTrigger = null;
  var busy = false;
  var previewObjectUrl = null;
  var comboPreviewObjectUrl = null;
  var comboExistingImage = '';
  var scrollState = null;
  var filterState = {search: '', category: 'all', stock: 'all'};
  var selectedComboFoodIds = new Set();
  var comboDraftItems = [];
  var comboBuilderRestoreCategory = null;
  var catalog = readJson('pmd-menu-manager-catalog');
  var comboCatalog = readJson('pmd-menu-manager-combo-catalog');
  var i18n = readJson('pmd-menu-manager-i18n');
  var sortMode = false;
  var sortKind = 'food';
  var dragCard = null;
  var dragSnapshot = [];
  var sortSaving = false;
  var sortFlipAnimations = new Map();
  var sortReorderRaf = 0;
  var pendingSortReorder = null;
  var categoryDrag = null;
  var categorySnapshot = [];
  var categorySaving = false;
  var categoryDeleteBusy = false;

  // PMD_MENU_EDIT_ORDER_CATEGORY_MANAGE_V131

  // PMD_MENU_EDIT_MODE_DESTRUCTIVE_AND_SCOPED_SORT_V132
  // PMD_MENU_LEGACY_CARD_DRAG_PARITY_V138
  var sortScopeCategory = 'all';
  var sortScopeGlobalOrder = [];
  var sortScopeFoodIds = [];
  var editDeleteBusy = false;

  // PMD_MENU_DRAG_SESSION_JIGGLE_FREEZE_V141_11D
  // PMD_MENU_DROP_WHITE_FLASH_FIX_V141_11E
  // PMD_MENU_DROP_TRANSFORM_ONLY_V141_11F
  //
  // Idle Edit:
  //   Card Jiggle runs normally.
  //
  // Active Card drag:
  //   all sortable Card Jiggles are frozen exactly like the
  //   successful browser console test.
  //
  // They remain frozen through neighbour FLIP and final Drop.
  //
  // Category Jiggle is not involved.
  var cardDragJiggleFreezeActiveV14111D = false;
  var cardDragJiggleDragEndedV14111D = false;

  // PMD_MENU_NATIVE_DROP_FINAL_SLOT_V141_11G
  // PMD_MENU_OVERLAP_SWAP_60_V141_11G
  // PMD_MENU_SOFT_NATIVE_SETTLE_V141_11H
  // PMD_MENU_GHOST_EXIT_HANDOFF_V141_11I
  // PMD_MENU_ZERO_GAP_DRAGEND_HANDOFF_V141_11J
  // PMD_MENU_RASTER_CONTINUITY_V141_11K
  //
  // One stable final-slot paint is held between the native
  // browser drag ghost and normal Edit-mode Jiggle.
  var pmdPostDropStableFrameV14111G = false;

  // The Card itself, not the pointer, is the swap authority.
  var pmdOverlapSwapLockV14111G = null;

  var PMD_OVERLAP_SWAP_RATIO_V14111G = .60;
  var PMD_OVERLAP_UNLOCK_RATIO_V14111G = .35;

  function manager() {
    return document.querySelector('[data-pmd-menu-manager]');
  }

  // PMD_MENU_COMBO_CATEGORY_SINGLE_AUTHORITY_V1
  // Combination products belong to the one real pmd_kind=combos category.
  // Keep a legacy-string fallback only for rollback/backward-compatible DOM.
  function comboCategoryFilter() {
    var node = manager();
    if (!node) return 'all';
    var id = String(node.dataset.pmdComboCategoryId || '').trim();
    if (id) return id;
    return node.querySelector('[data-pmd-category-filter="combos"]') ? 'combos' : 'all';
  }

  function isComboCategory(value) {
    var text = String(value == null ? '' : value);
    var current = comboCategoryFilter();
    return text === 'combos' || (current !== 'all' && text === current);
  }

  function readJson(id) {
    var node = document.getElementById(id);
    if (!node) return {};
    try { return JSON.parse(node.textContent || '{}') || {}; }
    catch (error) { return {}; }
  }

  function tr(key, fallback) {
    var value = i18n && i18n[key];
    return typeof value === 'string' && value !== '' ? value : (fallback || key);
  }

  function allergenIconMarkup(name) {
    var key = String(name || '').trim().toLowerCase();
    if (key.indexOf('celery') !== -1) return '<path d="M12 21V9"></path><path d="M12 13c-4 0-7-2.5-7-6 4 0 7 2.5 7 6z"></path><path d="M12 10c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z"></path>';
    if (key.indexOf('crust') !== -1) return '<path d="M4 14c2-5 6-8 11-8 3 0 5 2 5 5 0 4-4 7-9 7H6"></path><path d="M8 10 5 7M12 8 10 4M16 8l2-3"></path><circle cx="16.5" cy="11" r=".8"></circle>';
    if (key.indexOf('egg') !== -1) return '<path d="M12 3c3 0 6 6 6 10a6 6 0 0 1-12 0c0-4 3-10 6-10z"></path>';
    if (key.indexOf('fish') !== -1) return '<path d="M4 12c3-4 7-6 12-4l4-3v14l-4-3c-5 2-9 0-12-4z"></path><circle cx="15.5" cy="11" r=".7"></circle>';
    if (key.indexOf('gluten') !== -1 || key.indexOf('wheat') !== -1) return '<path d="M12 21V5"></path><path d="M12 8c-3 0-5-2-5-4 3 0 5 2 5 4zM12 12c-3 0-5-2-5-4 3 0 5 2 5 4zM12 16c-3 0-5-2-5-4 3 0 5 2 5 4z"></path><path d="M12 8c3 0 5-2 5-4-3 0-5 2-5 4zM12 12c3 0 5-2 5-4-3 0-5 2-5 4zM12 16c3 0 5-2 5-4-3 0-5 2-5 4z"></path>';
    if (key.indexOf('milk') !== -1 || key.indexOf('lactose') !== -1) return '<path d="M8 3h8l1 4v14H7V7z"></path><path d="M7 8h10M10 3v4"></path>';
    if (key.indexOf('mollusc') !== -1) return '<path d="M4 18c1-6 4-10 8-12 4 2 7 6 8 12z"></path><path d="M12 6v12M8 8l2 10M16 8l-2 10M5 14h14"></path>';
    if (key.indexOf('peanut') !== -1) return '<path d="M9 3c3 0 4 2 4 4 3 0 5 2 5 5 0 5-4 9-8 9-3 0-5-2-5-5 0-2 1-4 3-5-2-1-3-2-3-4 0-2 2-4 4-4z"></path><path d="m8 8 6 6M7 13l4 4M11 5l5 5"></path>';
    if (key.indexOf('nut') !== -1) return '<path d="M12 4c4 0 7 3 7 7 0 5-3 9-7 9s-7-4-7-9c0-4 3-7 7-7z"></path><path d="M8 7c2 1 6 1 8 0M9 11c2 1 4 1 6 0M10 15c1 .5 3 .5 4 0"></path>';
    if (key.indexOf('sesame') !== -1) return '<ellipse cx="8" cy="9" rx="2" ry="3"></ellipse><ellipse cx="15.5" cy="7" rx="2" ry="3"></ellipse><ellipse cx="13" cy="15" rx="2" ry="3"></ellipse><ellipse cx="18" cy="14" rx="1.5" ry="2.3"></ellipse>';
    if (key.indexOf('soy') !== -1) return '<path d="M5 15c4-7 9-9 14-7-1 7-6 11-14 7z"></path><circle cx="9" cy="13" r="1"></circle><circle cx="13" cy="11" r="1"></circle><circle cx="17" cy="9" r="1"></circle>';
    if (key.indexOf('mustard') !== -1) return '<path d="M9 3h6l1 4 2 4v10H6V11l2-4z"></path><path d="M8 11h8M10 3v4h4V3"></path>';
    if (key.indexOf('sulph') !== -1 || key.indexOf('sulf') !== -1) return '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3"></path><path d="M8 15h8"></path>';
    if (key.indexOf('lupin') !== -1) return '<path d="M12 21V7"></path><path d="M12 8c-3 0-5-2-5-5 3 0 5 2 5 5z"></path><path d="M12 12c3 0 5-2 5-5-3 0-5 2-5 5z"></path><path d="M12 16c-3 0-5-2-5-5 3 0 5 2 5 5z"></path>';
    return '<path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path>';
  }

  function ensureCsrf(formData) {
    if (!formData || formData.has('_token')) return;
    var meta = document.querySelector('meta[name="csrf-token"]');
    var hidden = document.querySelector('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) formData.append('_token', token);
  }

  async function backend(endpoint, handler, formData) {
    ensureCsrf(formData);
    var response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-IGNITER-REQUEST-HANDLER': handler,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: formData
    });

    var text = await response.text();
    var data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (error) { data = {message: text || 'Request failed'}; }

    var message = data.message || data.error || data.X_IGNITER_ERROR_MESSAGE || '';
    if (!response.ok || data.ok === false || data.X_IGNITER_ERROR_MESSAGE) {
      throw new Error(message || ('Request failed (' + response.status + ')'));
    }
    return data;
  }

  function setStatus(text, type) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.classList.toggle('is-error', type === 'error');
    statusNode.classList.toggle('is-ok', type === 'ok');
  }

  function setBusy(next) {
    busy = Boolean(next);
    modal.querySelectorAll('[data-pmd-menu-close]').forEach(function (button) {
      button.disabled = busy;
    });
    if (deleteButton) deleteButton.disabled = busy;
    updateSaveAvailability();
  }

  function updateSaveAvailability() {
    if (saveButton) {
      var comboInvalid = modalMode === 'combo' && comboDraftItems.length < 2;
      saveButton.disabled = busy || comboInvalid;
    }
    syncDeleteAction();
  }

  function currentDeleteTarget() {
    if (modalMode === 'food' && foodForm) {
      var menuId = Number((foodForm.querySelector('[data-pmd-menu-id]') || {}).value || 0);
      return menuId > 0 ? {kind: 'food', id: menuId} : null;
    }
    if (modalMode === 'combo' && comboForm) {
      var comboId = Number((comboForm.querySelector('[data-pmd-combo-id]') || {}).value || 0);
      return comboId > 0 ? {kind: 'combo', id: comboId} : null;
    }
    return null;
  }

  function resetDeleteAction() {
    deleteArmed = false;
    if (deleteButton) deleteButton.classList.remove('is-armed');
    syncDeleteAction();
  }

  function syncDeleteAction() {
    if (!deleteButton) return;
    var target = currentDeleteTarget();
    deleteButton.hidden = !target;
    deleteButton.disabled = busy || !target;
    if (!target || !deleteLabel) return;
    if (deleteArmed) deleteLabel.textContent = tr('delete_permanently', 'Delete permanently');
    else deleteLabel.textContent = target.kind === 'combo' ? tr('delete_combo', 'Delete combo') : tr('delete_food', 'Delete food');
  }

  function lockPage() {
    if (scrollState) return;
    var body = document.body;
    var y = window.scrollY || window.pageYOffset || 0;
    scrollState = {
      y: y,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow
    };
    document.documentElement.classList.add('pmd-menu-manager-modal-open');
    body.style.position = 'fixed';
    body.style.top = '-' + y + 'px';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  function unlockPage() {
    if (!scrollState) return;
    var body = document.body;
    var state = scrollState;
    scrollState = null;
    document.documentElement.classList.remove('pmd-menu-manager-modal-open');
    body.style.position = state.position;
    body.style.top = state.top;
    body.style.left = state.left;
    body.style.right = state.right;
    body.style.width = state.width;
    body.style.overflow = state.overflow;
    window.scrollTo(0, state.y);
  }

  function clearPreviewObjectUrl() {
    if (!previewObjectUrl) return;
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  function markImageLoaded(image) {
    if (!image) return;
    var box = image.closest('.pmd-menu-card__media, .pmd-menu-form__preview');
    if (box) box.classList.add('has-image');
  }

  function markImageFailed(image) {
    if (!image) return;
    var box = image.closest('.pmd-menu-card__media, .pmd-menu-form__preview');
    if (box) box.classList.remove('has-image');
    image.style.setProperty('display', 'none', 'important');
  }

  function wireImage(image) {
    if (!image || image.dataset.pmdImageWired === '1') return;
    image.dataset.pmdImageWired = '1';
    image.addEventListener('load', function () {
      image.style.removeProperty('display');
      markImageLoaded(image);
    });
    image.addEventListener('error', function () { markImageFailed(image); });
    if (image.complete) {
      if (image.naturalWidth > 0) markImageLoaded(image);
      else if (image.getAttribute('src')) markImageFailed(image);
    }
  }

  function wireCardImages(scope) {
    (scope || document).querySelectorAll('img[data-pmd-menu-image]').forEach(wireImage);
  }

  if (imagePreview) {
    imagePreview.addEventListener('load', function () {
      imagePreview.style.removeProperty('display');
      markImageLoaded(imagePreview);
    });
    imagePreview.addEventListener('error', function () { markImageFailed(imagePreview); });
  }

  function setImagePreview(src) {
    clearPreviewObjectUrl();
    if (!imagePreview) return;
    if (imagePreviewBox) imagePreviewBox.classList.remove('has-image');
    imagePreview.style.removeProperty('display');
    if (src) {
      imagePreview.src = src;
      imagePreview.hidden = false;
      if (imagePreview.complete && imagePreview.naturalWidth > 0) markImageLoaded(imagePreview);
    } else {
      imagePreview.removeAttribute('src');
      imagePreview.hidden = true;
    }
  }

  function setCheckboxes(selector, values) {
    var wanted = new Set((values || []).map(function (value) { return String(value); }));
    foodForm.querySelectorAll(selector).forEach(function (input) {
      input.checked = wanted.has(String(input.value));
    });
  }

  function setField(selector, value) {
    var field = foodForm.querySelector(selector);
    if (field) field.value = value === null || typeof value === 'undefined' ? '' : String(value);
  }

  function resetFoodForm() {
    if (!foodForm) return;
    foodForm.reset();
    setField('[data-pmd-menu-id]', '');
    var prep = foodForm.querySelector('[data-pmd-menu-prep-time]');
    if (prep) prep.value = '15';
    if (imageInput) imageInput.value = '';
    setImagePreview('');
    setStatus('');
  }

  function fillFoodForm(item) {
    resetFoodForm();
    setField('[data-pmd-menu-id]', item.id || '');
    setField('[data-pmd-menu-name]', item.name || '');
    setField('[data-pmd-menu-price]', Number(item.price || 0).toFixed(2).replace(/\.00$/, ''));
    setField('[data-pmd-menu-description]', item.description || '');
    setField('[data-pmd-menu-calories]', item.calories);
    setField('[data-pmd-menu-serving-size]', item.serving_size || '');
    setField('[data-pmd-menu-protein]', item.protein);
    setField('[data-pmd-menu-carbs]', item.carbs);
    setField('[data-pmd-menu-fat]', item.fat);
    setField('[data-pmd-menu-sugar]', item.sugar);
    setField('[data-pmd-menu-prep-time]', item.prep_time_minutes === null ? 15 : item.prep_time_minutes);
    setCheckboxes('[data-pmd-menu-category-choice]', item.category_ids || []);
    setCheckboxes('[data-pmd-menu-allergen-choice]', item.allergen_ids || []);

    var halal = foodForm.querySelector('[data-pmd-menu-halal]');
    var vegetarian = foodForm.querySelector('[data-pmd-menu-vegetarian]');
    var vegan = foodForm.querySelector('[data-pmd-menu-vegan]');
    if (halal) halal.checked = Boolean(item.is_halal);
    if (vegetarian) vegetarian.checked = Boolean(item.is_vegetarian);
    if (vegan) vegan.checked = Boolean(item.is_vegan);
    setImagePreview(item.image || '');
  }

  function setModalMode(mode) {
    modalMode = mode;
    deleteArmed = false;
    if (foodContent) foodContent.hidden = mode !== 'food';
    if (comboContent) comboContent.hidden = mode !== 'combo';
    if (categoryContent) categoryContent.hidden = mode !== 'category';
    if (saveButton) {
      saveButton.textContent = mode === 'combo'
        ? tr('save_combo', 'Save combo')
        : (mode === 'category' ? tr('save_category', 'Save category') : tr('save_food', 'Save food'));
    }
    updateSaveAvailability();
  }

  function showModal(trigger) {
    lastTrigger = trigger || document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    lockPage();
    requestAnimationFrame(function () {
      var first = modalMode === 'combo'
        ? (comboForm && comboForm.querySelector('[data-pmd-combo-name]'))
        : (modalMode === 'category'
          ? (categoryForm && categoryForm.querySelector('[data-pmd-category-name]'))
          : (foodForm && foodForm.querySelector('[data-pmd-menu-name]')));
      if (first) first.focus({preventScroll: true});
    });
  }

  function openFoodCreate(trigger) {
    resetFoodForm();
    setModalMode('food');
    if (eyebrow) eyebrow.textContent = tr('menu_item', 'Menu item');
    if (title) title.textContent = tr('create_food', 'Create food');
    showModal(trigger);
  }

  function openCategoryCreate(trigger) {
    if (!categoryForm) return;
    setModalMode('category');
    categoryForm.reset();
    setStatus('');
    if (eyebrow) eyebrow.textContent = tr('categories', 'Categories');
    if (title) title.textContent = tr('create_category', 'Create category');
    showModal(trigger);
  }

  function openFoodEdit(id, trigger) {
    var item = catalog[String(id)];
    if (!item) return;
    setModalMode('food');
    fillFoodForm(item);
    if (eyebrow) eyebrow.textContent = tr('menu_item', 'Menu item');
    if (title) title.textContent = tr('edit_food', 'Edit food');
    showModal(trigger);
  }

  function resetComboForm() {
    if (!comboForm) return;
    comboForm.reset();
    var id = comboForm.querySelector('[data-pmd-combo-id]');
    if (id) id.value = '';
    if (comboPreviewObjectUrl) {
      URL.revokeObjectURL(comboPreviewObjectUrl);
      comboPreviewObjectUrl = null;
    }
    comboExistingImage = '';
    comboDraftItems = [];
    renderComboDraftItems();
    setStatus('');
  }

  function normalizeComboItems(items) {
    var seen = new Set();
    var result = [];
    (items || []).forEach(function (entry) {
      var id = Number(entry.menu_id || entry.id || 0);
      if (!id || seen.has(id) || !catalog[String(id)]) return;
      seen.add(id);
      result.push({menu_id: id, quantity: Math.max(1, Number(entry.quantity || 1) || 1)});
    });
    return result;
  }

  function comboProfile() {
    var foods = comboDraftItems.map(function (entry) {
      var item = catalog[String(entry.menu_id)];
      return item ? {item: item, quantity: Math.max(1, Number(entry.quantity || 1) || 1)} : null;
    }).filter(Boolean);

    var profile = {
      images: [],
      halal: foods.length > 0,
      vegetarian: foods.length > 0,
      vegan: foods.length > 0,
      allergens: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sugar: 0,
      prep_time_minutes: 0
    };
    var nutritionComplete = {calories: true, protein: true, carbs: true, fat: true, sugar: true};
    var allergenSet = new Set();
    var imageSet = new Set();

    foods.forEach(function (entry) {
      var item = entry.item;
      var qty = entry.quantity;
      if (item.image && !imageSet.has(item.image)) {
        imageSet.add(item.image);
        profile.images.push(item.image);
      }
      profile.halal = profile.halal && Boolean(item.is_halal);
      profile.vegetarian = profile.vegetarian && Boolean(item.is_vegetarian || item.is_vegan);
      profile.vegan = profile.vegan && Boolean(item.is_vegan);
      (item.allergen_names || []).forEach(function (name) {
        name = String(name || '').trim();
        if (name) allergenSet.add(name);
      });
      ['calories', 'protein', 'carbs', 'fat', 'sugar'].forEach(function (field) {
        var value = item[field];
        if (value === null || value === '' || typeof value === 'undefined' || !isFinite(Number(value))) {
          nutritionComplete[field] = false;
          return;
        }
        profile[field] += Number(value) * qty;
      });
      if (item.prep_time_minutes !== null && item.prep_time_minutes !== '' && isFinite(Number(item.prep_time_minutes))) {
        profile.prep_time_minutes = Math.max(profile.prep_time_minutes, Number(item.prep_time_minutes));
      }
    });

    profile.images = profile.images.slice(0, 4);
    profile.allergens = Array.from(allergenSet).sort(function (a, b) { return a.localeCompare(b); });
    Object.keys(nutritionComplete).forEach(function (field) {
      if (!foods.length || !nutritionComplete[field]) profile[field] = null;
      else profile[field] = field === 'calories' ? Math.round(profile[field]) : Math.round(profile[field] * 10) / 10;
    });
    if (!foods.length || !profile.prep_time_minutes) profile.prep_time_minutes = null;
    return profile;
  }

  function comboCoverPlaceholder() {
    return '<div class="pmd-combo-cover__placeholder">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path></svg>' +
      '<span>' + tr('select_foods_cover', 'Select foods to build the cover') + '</span></div>';
  }

  function renderComboCover(profile) {
    if (!comboCover) return;
    comboCover.innerHTML = '';
    var customImage = comboPreviewObjectUrl || comboExistingImage;
    if (customImage) {
      comboCover.classList.add('has-image', 'has-custom-image');
      var custom = document.createElement('img');
      custom.className = 'pmd-combo-cover__custom-image';
      custom.src = customImage;
      custom.alt = tr('combo_cover_preview', 'Combo cover preview');
      custom.decoding = 'async';
      comboCover.appendChild(custom);
      return;
    }
    comboCover.classList.remove('has-custom-image');
    if (!profile.images.length) {
      comboCover.innerHTML = comboCoverPlaceholder();
      comboCover.classList.remove('has-image');
      return;
    }
    comboCover.classList.add('has-image');
    var mosaic = document.createElement('div');
    mosaic.className = 'pmd-combo-cover__mosaic pmd-combo-cover__mosaic--' + String(Math.min(4, profile.images.length));
    profile.images.forEach(function (src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      mosaic.appendChild(img);
    });
    comboCover.appendChild(mosaic);
  }

  function renderComboDerivedProfile() {
    var profile = comboProfile();
    renderComboCover(profile);

    modal.querySelectorAll('[data-pmd-combo-derived-choice]').forEach(function (choice) {
      var key = choice.getAttribute('data-pmd-combo-derived-choice');
      var active = Boolean(profile[key]);
      choice.classList.toggle('is-active', active);
      choice.classList.toggle('is-inactive', !active);
      choice.setAttribute('aria-label', key + ': ' + (active ? tr('yes', 'yes') : tr('not_confirmed_all', 'not confirmed for all foods')));
    });

    if (comboDerivedAllergens) {
      comboDerivedAllergens.innerHTML = '';
      if (!profile.allergens.length) {
        var none = document.createElement('span');
        none.className = 'pmd-combo-derived__none';
        none.textContent = tr('no_declared_allergens', 'No declared allergens in the selected foods.');
        comboDerivedAllergens.appendChild(none);
      } else {
        profile.allergens.forEach(function (name) {
          var chip = document.createElement('span');
          chip.className = 'pmd-combo-derived__allergen';
          chip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + allergenIconMarkup(name) + '</svg>';
          var text = document.createElement('b');
          text.textContent = name;
          chip.appendChild(text);
          comboDerivedAllergens.appendChild(chip);
        });
      }
    }

    if (comboDerivedNutrition) {
      comboDerivedNutrition.innerHTML = '';
      [
        [tr('calories', 'Calories (kcal)').replace(/\s*\(kcal\)\s*$/i, ''), profile.calories, 'kcal'],
        [tr('protein', 'Protein (g)').replace(/\s*\(g\)\s*$/i, ''), profile.protein, 'g'],
        [tr('carbs', 'Carbs (g)').replace(/\s*\(g\)\s*$/i, ''), profile.carbs, 'g'],
        [tr('fat', 'Fat (g)').replace(/\s*\(g\)\s*$/i, ''), profile.fat, 'g'],
        [tr('sugar', 'Sugar (g)').replace(/\s*\(g\)\s*$/i, ''), profile.sugar, 'g'],
        [tr('prep_time', 'Prep time (min)').replace(/\s*\(min\.?(?:utes)?\)\s*$/i, ''), profile.prep_time_minutes, 'min']
      ].forEach(function (metric) {
        var tile = document.createElement('div');
        tile.className = 'pmd-combo-derived__metric';
        var label = document.createElement('span');
        label.textContent = metric[0];
        var value = document.createElement('strong');
        value.textContent = metric[1] === null ? '—' : String(metric[1]) + (metric[2] ? ' ' + metric[2] : '');
        tile.appendChild(label);
        tile.appendChild(value);
        comboDerivedNutrition.appendChild(tile);
      });
    }
  }

  function renderComboDraftItems() {
    if (!comboItemsHost) return;
    comboItemsHost.innerHTML = '';

    if (comboDraftItems.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'pmd-combo-form__empty';
      empty.textContent = tr('no_foods_selected', 'No foods selected.');
      comboItemsHost.appendChild(empty);
      renderComboDerivedProfile();
      updateSaveAvailability();
      return;
    }

    comboDraftItems.forEach(function (entry, index) {
      var item = catalog[String(entry.menu_id)] || {};
      var row = document.createElement('div');
      row.className = 'pmd-combo-form__item';
      row.setAttribute('data-pmd-combo-draft-row', String(entry.menu_id));

      var media = document.createElement('div');
      media.className = 'pmd-combo-form__item-media';
      if (item.image) {
        var image = document.createElement('img');
        image.src = item.image;
        image.alt = '';
        image.decoding = 'async';
        media.appendChild(image);
      } else {
        media.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"></path><circle cx="9" cy="10" r="2"></circle><path d="m5 17 4-4 3 3 2-2 5 4"></path></svg>';
      }

      var copy = document.createElement('div');
      copy.className = 'pmd-combo-form__item-copy';
      var name = document.createElement('div');
      name.className = 'pmd-combo-form__item-name';
      name.textContent = item.name || (tr('food_number', 'Food #') + entry.menu_id);
      var meta = document.createElement('small');
      var metaParts = [];
      if (item.category_name) metaParts.push(item.category_name === 'Uncategorized' ? tr('uncategorized', 'Uncategorized') : item.category_name);
      if (typeof item.price !== 'undefined') metaParts.push('€' + Number(item.price || 0).toFixed(2));
      meta.textContent = metaParts.join(' · ');
      copy.appendChild(name);
      copy.appendChild(meta);

      var qty = document.createElement('div');
      qty.className = 'pmd-combo-form__qty';
      qty.innerHTML = '<button type="button" data-pmd-combo-qty="minus" aria-label="' + tr('decrease_quantity', 'Decrease quantity') + '">−</button>' +
        '<input type="number" min="1" max="99" step="1" value="' + String(entry.quantity) + '" data-pmd-combo-qty-input aria-label="' + tr('quantity', 'Quantity') + '">' +
        '<button type="button" data-pmd-combo-qty="plus" aria-label="' + tr('increase_quantity', 'Increase quantity') + '">+</button>';

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'pmd-combo-form__remove';
      remove.setAttribute('data-pmd-combo-remove-item', String(entry.menu_id));
      remove.setAttribute('aria-label', 'Remove ' + (item.name || 'food'));
      remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

      row.appendChild(media);
      row.appendChild(copy);
      row.appendChild(qty);
      row.appendChild(remove);
      comboItemsHost.appendChild(row);
      row.dataset.index = String(index);
    });

    renderComboDerivedProfile();
    updateSaveAvailability();
  }

  function openComboCreate(ids, trigger) {
    resetComboForm();
    comboDraftItems = normalizeComboItems((ids || []).map(function (id) { return {menu_id: id, quantity: 1}; }));
    renderComboDraftItems();
    setModalMode('combo');
    if (eyebrow) eyebrow.textContent = tr('combos', 'Combos');
    if (title) title.textContent = tr('create_combo', 'Create combo');
    showModal(trigger);
  }

  function openComboEdit(id, trigger) {
    var combo = comboCatalog[String(id)];
    if (!combo) return;
    resetComboForm();
    var comboId = comboForm.querySelector('[data-pmd-combo-id]');
    var name = comboForm.querySelector('[data-pmd-combo-name]');
    var price = comboForm.querySelector('[data-pmd-combo-price]');
    var description = comboForm.querySelector('[data-pmd-combo-description]');
    if (comboId) comboId.value = String(combo.id || '');
    if (name) name.value = combo.name || '';
    if (price) price.value = Number(combo.price || 0).toFixed(2).replace(/\.00$/, '');
    if (description) description.value = combo.description || '';
    comboExistingImage = combo.image || '';
    comboDraftItems = normalizeComboItems(combo.items || []);
    renderComboDraftItems();
    setModalMode('combo');
    if (eyebrow) eyebrow.textContent = tr('combos', 'Combos');
    if (title) title.textContent = tr('edit_combo_title', 'Edit combo');
    showModal(trigger);
  }

  function closeModal() {
    if (busy || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    unlockPage();
    clearPreviewObjectUrl();
    if (comboPreviewObjectUrl) {
      URL.revokeObjectURL(comboPreviewObjectUrl);
      comboPreviewObjectUrl = null;
    }
    setStatus('');
    resetDeleteAction();
    if (lastTrigger && document.contains(lastTrigger) && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus({preventScroll: true});
    }
    lastTrigger = null;
  }

  function isComboBuilder() {
    var node = manager();
    return Boolean(node && node.dataset.pmdComboBuilder === '1');
  }

  var headerGlyphs = {
    create: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    build: '<path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path><path d="M18 3v6"></path><path d="M15 6h6"></path>',
    confirm: '<path d="m5 12 4 4L19 6"></path>',
    cancel: '<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>'
  };

  function setHeaderGlyph(button, kind) {
    if (!button || !headerGlyphs[kind]) return;
    var glyph = button.querySelector('.pmd-menu-header-glyph');
    if (!glyph || glyph.dataset.pmdGlyph === kind) return;
    glyph.innerHTML = headerGlyphs[kind];
    glyph.dataset.pmdGlyph = kind;
  }

  function updateHeaderState() {
    var node = manager();
    if (!node) return;
    var primary = node.querySelector('[data-pmd-menu-header-primary]');
    var secondary = node.querySelector('[data-pmd-menu-header-secondary]');
    var count = node.querySelector('[data-pmd-combo-selection-count]');
    var builder = isComboBuilder();

    if (builder) {
      if (primary) {
        setHeaderGlyph(primary, 'confirm');
        primary.removeAttribute('data-pmd-menu-create');
        primary.setAttribute('aria-label', 'Confirm selected foods');
        primary.setAttribute('title', 'Confirm selected foods');
        primary.disabled = selectedComboFoodIds.size < 2;
      }
      if (secondary) {
        setHeaderGlyph(secondary, 'cancel');
        secondary.setAttribute('aria-label', tr('cancel', 'Cancel'));
        secondary.setAttribute('title', tr('cancel', 'Cancel'));
      }
      if (count) {
        count.textContent = String(selectedComboFoodIds.size);
        count.hidden = false;
      }
      return;
    }

    if (count) count.hidden = true;
    if (primary) {
      primary.disabled = false;
      setHeaderGlyph(primary, 'create');
      primary.setAttribute('data-pmd-menu-create', '');
      primary.setAttribute('aria-label', tr('create_food', 'Create food'));
      primary.setAttribute('title', tr('create_food', 'Create food'));
    }
    if (secondary) {
      setHeaderGlyph(secondary, 'build');
      secondary.setAttribute('aria-label', tr('create_combo', 'Create combo'));
      secondary.setAttribute('title', tr('create_combo', 'Create combo'));
    }
    // PMD_MENU_HEADER_ACTION_VISIBILITY_AUTHORITY_V1_6_6A
    // Normal header actions are intentionally hidden.
    // The nodes remain as internal V129 builder hooks.
    if (primary) {
      primary.style.setProperty('display', 'none', 'important');
      primary.setAttribute('aria-hidden', 'true');
      primary.setAttribute('tabindex', '-1');
    }

    if (secondary) {
      if (builder) {
        secondary.style.setProperty('display', 'grid', 'important');
        secondary.removeAttribute('aria-hidden');
        secondary.removeAttribute('tabindex');
      } else {
        secondary.style.setProperty('display', 'none', 'important');
        secondary.setAttribute('aria-hidden', 'true');
        secondary.setAttribute('tabindex', '-1');
      }
    }

  }

  function startComboBuilder(trigger) {
    var node = manager();
    if (!node || node.dataset.pmdCanManageCombos === '0') return;
    comboBuilderRestoreCategory = filterState.category;
    if (isComboCategory(filterState.category)) filterState.category = 'all';
    selectedComboFoodIds.clear();
    node.dataset.pmdComboBuilder = '1';
    node.querySelectorAll('[data-pmd-menu-card]').forEach(function (card) { card.classList.remove('is-combo-selected'); });
    lastTrigger = trigger || null;
    restoreFilters();
    applyFilters();
    updateHeaderState();
  }

  function cancelComboBuilder(restoreCategory) {
    var node = manager();
    if (!node) return;
    node.dataset.pmdComboBuilder = '0';
    selectedComboFoodIds.clear();
    node.querySelectorAll('[data-pmd-menu-card]').forEach(function (card) { card.classList.remove('is-combo-selected'); });
    if (restoreCategory !== false && comboBuilderRestoreCategory) filterState.category = comboBuilderRestoreCategory;
    comboBuilderRestoreCategory = null;
    restoreFilters();
    applyFilters();
    updateHeaderState();
  }

  function toggleComboFood(card) {
    if (!card || card.dataset.comboSelectable !== '1') return;
    var id = Number(card.dataset.menuId || 0);
    if (!id) return;
    if (selectedComboFoodIds.has(id)) selectedComboFoodIds.delete(id);
    else selectedComboFoodIds.add(id);
    card.classList.toggle('is-combo-selected', selectedComboFoodIds.has(id));
    updateHeaderState();
  }

  function confirmComboSelection(trigger) {
    if (selectedComboFoodIds.size < 2) return;
    var ids = Array.from(selectedComboFoodIds);
    cancelComboBuilder(true);
    openComboCreate(ids, trigger);
  }

  function replaceJsonFromDocument(doc, id) {
    var next = doc.getElementById(id);
    var current = document.getElementById(id);
    if (!next || !current) throw new Error(tr('refresh_incomplete', 'Menu refresh payload is incomplete.'));
    current.replaceWith(next);
  }

  async function refreshManager(targetCategory) {
    var response = await fetch('/admin/pmdmenus', {
      credentials: 'same-origin',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(tr('refresh_error', 'Saved, but the Menu page could not refresh.'));

    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nextMain = doc.querySelector('[data-pmd-menu-manager]');
    var currentMain = manager();
    if (!nextMain || !currentMain) throw new Error(tr('refresh_incomplete', 'Menu refresh payload is incomplete.'));

    var liveNotification = document.getElementById('notif-root');
    currentMain.replaceWith(nextMain);
    if (liveNotification) {
      var nextNotificationSlot = nextMain.querySelector('[data-pmd-menu-notif-slot]');
      if (nextNotificationSlot) nextNotificationSlot.replaceWith(liveNotification);
    }

    replaceJsonFromDocument(doc, 'pmd-menu-manager-i18n');
    replaceJsonFromDocument(doc, 'pmd-menu-manager-catalog');
    replaceJsonFromDocument(doc, 'pmd-menu-manager-combo-catalog');
    catalog = readJson('pmd-menu-manager-catalog');
    comboCatalog = readJson('pmd-menu-manager-combo-catalog');
    i18n = readJson('pmd-menu-manager-i18n');
    var nextCategoryChoices = doc.querySelector('[data-pmd-menu-category-choices]');
    var liveCategoryChoices = modal && modal.querySelector('[data-pmd-menu-category-choices]');
    if (nextCategoryChoices && liveCategoryChoices) liveCategoryChoices.innerHTML = nextCategoryChoices.innerHTML;
    selectedComboFoodIds.clear();
    comboBuilderRestoreCategory = null;
    if (targetCategory && nextMain.querySelector('[data-pmd-category-filter="' + String(targetCategory) + '"]')) {
      filterState.category = String(targetCategory);
    } else if (!nextMain.querySelector('[data-pmd-category-filter="' + String(filterState.category) + '"]')) {
      filterState.category = 'all';
    }
    wireCardImages(nextMain);
    restoreFilters();
    applyFilters();
    updateHeaderState();

    if (sortMode) {
      resetSortScopeFromCurrent();
    }

    syncSortMode();
  }

  async function saveFood() {
    if (busy || !foodForm) return;
    if (typeof foodForm.reportValidity === 'function' && !foodForm.reportValidity()) return;
    var formData = new FormData(foodForm);
    setBusy(true);
    setStatus(tr('saving', 'Saving...'));
    try {
      var result = await backend('/admin/menus', 'onPmdMenuManagerSaveV1', formData);
      await refreshManager(filterState.category);
      setStatus(tr('saved', 'Saved'), 'ok');
      setBusy(false);
      closeModal();
    } catch (error) {
      setStatus(error && error.message ? error.message : tr('save_food_error', 'Could not save food.'), 'error');
      setBusy(false);
    }
  }

  async function saveCombo() {
    if (busy || !comboForm || comboDraftItems.length < 2) return;
    if (typeof comboForm.reportValidity === 'function' && !comboForm.reportValidity()) return;

    var formData = new FormData(comboForm);
    comboDraftItems.forEach(function (entry, index) {
      formData.append('items[' + index + '][menu_id]', String(entry.menu_id));
      formData.append('items[' + index + '][quantity]', String(entry.quantity));
    });

    setBusy(true);
    setStatus(tr('saving', 'Saving...'));
    try {
      var result = await backend('/admin/combos', 'onPmdMenuManagerSaveV12', formData);
      await refreshManager(comboCategoryFilter());
      setStatus(tr('saved', 'Saved'), 'ok');
      setBusy(false);
      closeModal();
    } catch (error) {
      setStatus(error && error.message ? error.message : tr('save_combo_error', 'Could not save combo.'), 'error');
      setBusy(false);
    }
  }

  async function saveCategory() {
    if (busy || !categoryForm) return;
    if (typeof categoryForm.reportValidity === 'function' && !categoryForm.reportValidity()) return;
    var formData = new FormData(categoryForm);
    setBusy(true);
    setStatus(tr('saving', 'Saving...'));
    try {
      var result = await backend('/admin/menus', 'onPmdMenuManagerCreateCategoryV125', formData);
      var categoryId = String(result.category_id || '');
      await refreshManager(categoryId || 'all');
      setStatus(tr('category_created', 'Category created'), 'ok');
      setBusy(false);
      closeModal();
    } catch (error) {
      setStatus(error && error.message ? error.message : tr('category_create_error', 'Could not create category.'), 'error');
      setBusy(false);
    }
  }

  async function deleteCurrent() {
    if (busy) return;
    var target = currentDeleteTarget();
    if (!target) return;

    if (!deleteArmed) {
      deleteArmed = true;
      syncDeleteAction();
      setStatus(target.kind === 'combo'
        ? tr('delete_combo_confirm', 'Delete this combo permanently? This cannot be undone.')
        : tr('delete_food_confirm', 'Delete this food permanently? This cannot be undone.'), 'error');
      return;
    }

    var formData = new FormData();
    formData.append(target.kind === 'combo' ? 'combo_id' : 'menu_id', String(target.id));
    setBusy(true);
    setStatus(tr('deleting', 'Deleting...'));
    try {
      await backend(target.kind === 'combo' ? '/admin/combos' : '/admin/menus', 'onPmdMenuManagerDeleteV129', formData);
      var refreshTarget = target.kind === 'combo' && isComboCategory(filterState.category) ? comboCategoryFilter() : filterState.category;
      await refreshManager(refreshTarget);
      setStatus(target.kind === 'combo' ? tr('combo_deleted', 'Combo deleted') : tr('food_deleted', 'Food deleted'), 'ok');
      setBusy(false);
      closeModal();
    } catch (error) {
      setStatus(error && error.message ? error.message : (target.kind === 'combo'
        ? tr('delete_combo_error', 'Could not delete combo.')
        : tr('delete_food_error', 'Could not delete food.')), 'error');
      setBusy(false);
      deleteArmed = false;
      syncDeleteAction();
    }
  }

  function saveCurrent() {
    if (modalMode === 'combo') saveCombo();
    else if (modalMode === 'category') saveCategory();
    else saveFood();
  }

  function updateStockCard(card, stockOut) {
    if (!card) return;
    card.dataset.stockOut = stockOut ? '1' : '0';
    card.classList.toggle('is-stock-out', stockOut);
    var state = card.querySelector('[data-pmd-stock-state] span');
    if (state) state.textContent = stockOut ? tr('stock_out', 'Stock out') : tr('in_stock', 'In stock');
    var button = card.querySelector('[data-pmd-menu-stock]');
    if (button) button.textContent = stockOut ? tr('stock_in', 'Stock in') : tr('stock_out', 'Stock out');
    var id = String(card.dataset.menuId || '');
    if (catalog[id]) catalog[id].is_stock_out = stockOut;
    recalcStats();
    applyFilters();
  }

  async function toggleStock(button) {
    if (!button || button.disabled || isComboBuilder()) return;
    var id = Number(button.getAttribute('data-menu-id') || 0);
    if (!id) return;
    var card = button.closest('[data-pmd-menu-card]');
    var formData = new FormData();
    formData.append('menu_id', String(id));
    button.disabled = true;
    try {
      var result = await backend('/admin/menus', 'onToggleMenuStock', formData);
      updateStockCard(card, Boolean(Number(result.is_stock_out || 0)));
    } catch (error) {
      console.error('[PMD Menu Manager] stock toggle failed', error);
    } finally {
      button.disabled = false;
    }
  }

  function recalcStats() {
    var node = manager();
    if (!node) return;
    var cards = Array.from(node.querySelectorAll('[data-pmd-menu-card]'));
    var stockOut = cards.filter(function (card) { return card.dataset.stockOut === '1'; }).length;
    var published = cards.filter(function (card) { return card.dataset.published === '1'; }).length;
    var disabled = Math.max(0, cards.length - published);
    var totalNode = node.querySelector('[data-pmd-stat-total]');
    var stockNode = node.querySelector('[data-pmd-stat-stockout]');
    var disabledNode = node.querySelector('[data-pmd-stat-disabled]');
    if (totalNode) totalNode.textContent = String(cards.length);
    if (stockNode) stockNode.textContent = String(stockOut);
    if (disabledNode) disabledNode.textContent = String(disabled);
  }

  function restoreFilters() {
    var node = manager();
    if (!node) return;
    if (!node.querySelector('[data-pmd-category-filter="' + String(filterState.category) + '"]')) filterState.category = 'all';
    var search = node.querySelector('[data-pmd-menu-search]');
    if (search) search.value = filterState.search;
    node.dataset.pmdCategoryContext = filterState.category === 'all' ? 'all' : 'specific';
    node.querySelectorAll('[data-pmd-category-filter]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-pmd-category-filter') === filterState.category);
    });
    node.querySelectorAll('[data-pmd-stock-filter]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-pmd-stock-filter') === filterState.stock);
    });
  }

  function cardHasCategory(card, category) {
    if (category === 'all') return true;
    var values = String(card.dataset.categoryIds || '').split(',').filter(Boolean);
    return values.indexOf(String(category)) !== -1;
  }

  // PMD_MENU_CATEGORY_DELETE_OWNER_MANAGER_V130
  function canDeleteCategories() {
    var node = manager();
    return Boolean(
      node
      && node.dataset.pmdCanDeleteCategories === '1'
    );
  }

  function categoryFoodCount(categoryId) {
    var node = manager();
    if (!node) return 0;

    var wanted = String(categoryId || '');

    return Array.from(
      node.querySelectorAll(
        '[data-pmd-menu-card][data-item-type="food"]'
      )
    ).filter(function (card) {
      return cardHasCategory(card, wanted);
    }).length;
  }

  async function deleteCategoryById(categoryId, trigger) {
    if (
      categoryDeleteBusy
      || !sortMode
      || sortSaving
      || categorySaving
      || categoryDrag
      || dragCard
      || editDeleteBusy
      || isComboBuilder()
      || !canDeleteCategories()
    ) {
      return;
    }

    categoryId = Number(categoryId || 0);
    if (!categoryId) return;

    var node = manager();
    if (!node) return;

    var categoryButton = node.querySelector(
      '[data-pmd-category-filter="'
      + String(categoryId)
      + '"][data-pmd-category-id]'
    );

    if (!categoryButton) return;

    var label = categoryButton.querySelector(
      '.pmd-menu-manager__category-label'
    );

    var name = String(
      label
        ? label.textContent
        : categoryButton.textContent
    ).trim();

    var foodCount = categoryFoodCount(categoryId);

    var message;

    if (foodCount > 0) {
      message = tr(
        'delete_category_confirm',
        'Delete "{name}" and permanently delete all {count} '
        + 'foods assigned to it, including foods also used in '
        + 'other categories? This cannot be undone.'
      )
        .replace('{name}', name)
        .replace('{count}', String(foodCount));
    } else {
      message = tr(
        'delete_empty_category_confirm',
        'Delete "{name}"? This cannot be undone.'
      ).replace('{name}', name);
    }

    if (!window.confirm(message)) return;

    categoryDeleteBusy = true;

    categoryButton.disabled = true;

    if (trigger) {
      trigger.classList.add('is-busy');
    }

    try {
      var formData = new FormData();

      formData.append(
        'category_id',
        String(categoryId)
      );

      await backend(
        '/admin/menus',
        'onPmdMenuManagerDeleteCategoryV130',
        formData
      );

      var categoryRefreshTarget =
        String(filterState.category)
          === String(categoryId)
          ? 'all'
          : filterState.category;

      filterState.category =
        categoryRefreshTarget;

      await refreshManager(
        categoryRefreshTarget
      );

      sortStatus(
        tr(
          'category_deleted',
          'Category deleted'
        ),
        'ok'
      );
    } catch (error) {
      window.alert(
        error && error.message
          ? error.message
          : tr(
              'delete_category_error',
              'Could not delete category.'
            )
      );
    } finally {
      categoryDeleteBusy = false;

      if (
        categoryButton
        && document.contains(categoryButton)
      ) {
        categoryButton.disabled = false;
      }

      if (
        trigger
        && document.contains(trigger)
      ) {
        trigger.classList.remove('is-busy');
      }
    }
  }


  async function deleteEditModeCard(
    kind,
    rawId,
    trigger
  ) {
    if (
      !sortMode
      || editDeleteBusy
      || sortSaving
      || categorySaving
      || categoryDeleteBusy
      || dragCard
      || categoryDrag
      || isComboBuilder()
    ) {
      return;
    }

    var node = manager();

    if (!node) return;

    kind =
      kind === 'combo'
        ? 'combo'
        : 'food';

    if (
      kind === 'combo'
      && node.dataset.pmdCanManageCombos
        !== '1'
    ) {
      return;
    }

    var id =
      Number(rawId || 0);

    if (!id) return;

    var confirmation =
      kind === 'combo'
        ? tr(
            'delete_combo_confirm',
            'Delete this combo permanently? '
            + 'This cannot be undone.'
          )
        : tr(
            'delete_food_confirm',
            'Delete this food permanently? '
            + 'This cannot be undone.'
          );

    if (!window.confirm(confirmation)) {
      return;
    }

    editDeleteBusy = true;

    if (trigger) {
      trigger.disabled = true;
      trigger.classList.add(
        'is-busy'
      );
    }

    try {
      var formData =
        new FormData();

      formData.append(
        kind === 'combo'
          ? 'combo_id'
          : 'menu_id',
        String(id)
      );

      await backend(
        kind === 'combo'
          ? '/admin/combos'
          : '/admin/menus',
        'onPmdMenuManagerDeleteV129',
        formData
      );

      var refreshTarget =
        filterState.category;

      await refreshManager(
        refreshTarget
      );

      sortStatus(
        kind === 'combo'
          ? tr(
              'combo_deleted',
              'Combo deleted'
            )
          : tr(
              'food_deleted',
              'Food deleted'
            ),
        'ok'
      );
    } catch (error) {
      window.alert(
        error && error.message
          ? error.message
          : (
              kind === 'combo'
                ? tr(
                    'delete_combo_error',
                    'Could not delete combo.'
                  )
                : tr(
                    'delete_food_error',
                    'Could not delete food.'
                  )
            )
      );
    } finally {
      editDeleteBusy = false;

      if (
        trigger
        && document.contains(trigger)
      ) {
        trigger.disabled = false;

        trigger.classList.remove(
          'is-busy'
        );
      }
    }
  }

  function applyFilters() {
    var node = manager();
    if (!node) return;
    node.dataset.pmdCategoryContext = filterState.category === 'all' ? 'all' : 'specific';
    var query = String(filterState.search || '').trim().toLocaleLowerCase();
    var shown = 0;
    node.querySelectorAll('[data-pmd-menu-card]').forEach(function (card) {
      var searchOk = !query || String(card.dataset.search || '').indexOf(query) !== -1;
      var categoryOk = cardHasCategory(card, filterState.category);
      var stockOut = card.dataset.stockOut === '1';
      var stockOk = filterState.stock === 'all' || (filterState.stock === 'out' ? stockOut : !stockOut);
      var builderOk = !isComboBuilder() || card.dataset.itemType === 'food';
      var visible = searchOk && categoryOk && stockOk && builderOk;
      card.hidden = !visible;
      if (visible) shown += 1;
    });
    var noResults = node.querySelector('[data-pmd-menu-no-results]');
    if (noResults) noResults.hidden = shown !== 0 || node.querySelectorAll('[data-pmd-menu-card]').length === 0;
  }

  function sortStatus(text, type) {
    var node = manager();
    var status = node && node.querySelector('[data-pmd-menu-sort-status]');
    if (!status) return;
    status.textContent = text || '';
    status.classList.toggle('is-error', type === 'error');
    status.classList.toggle('is-ok', type === 'ok');
  }

  function sortTargetCards(kind) {
    var node = manager();
    if (!node) return [];
    var selector = kind === 'combo'
      ? '[data-pmd-menu-card][data-item-type="combo"]'
      : '[data-pmd-menu-card][data-item-type="food"]';
    return Array.from(node.querySelectorAll(selector));
  }

  function categorySortButtons() {
    var node = manager();
    return node ? Array.from(node.querySelectorAll('[data-pmd-category-sortable][data-pmd-category-id]')) : [];
  }

  function setExplicitJiggle(element, enabled, index) {
    if (!element) return;
    if (!enabled) {
      element.style.removeProperty('animation');
      element.style.removeProperty('animation-delay');
      element.style.removeProperty('animation-play-state');
      element.style.removeProperty('transform-origin');
      element.style.removeProperty('will-change');
      element.style.removeProperty('rotate');
      return;
    }
    var even = Number(index || 0) % 2 === 1;

    var isCategory =
      Boolean(
        element.matches
        && element.matches(
          '[data-pmd-category-sortable]'
        )
      );

    var name = isCategory
      ? (
          even
            ? 'pmd-menu-v132-category-jiggle-b'
            : 'pmd-menu-v132-category-jiggle-a'
        )
      : (
          even
            ? 'pmd-menu-v128-jiggle-b'
            : 'pmd-menu-v128-jiggle-a'
        );

    var duration = isCategory
      ? (even ? '.47s' : '.43s')
      : (even ? '.57s' : '.52s');
    element.style.setProperty('animation', name + ' ' + duration + ' ease-in-out infinite', 'important');
    element.style.setProperty('animation-delay', even ? '-.19s' : '-.11s', 'important');
    element.style.setProperty('animation-play-state', 'running', 'important');
    element.style.setProperty('transform-origin', '50% 50%', 'important');
    element.style.setProperty('will-change', 'rotate, translate', 'important');
  }

  function syncExplicitJiggle() {
    var node = manager();
    if (!node) return;
    var index = 0;
    node.querySelectorAll('[data-pmd-menu-card]').forEach(function (card) {
      var cardIndex = index++;

      /*
       * PMD_MENU_DROP_TRANSFORM_ONLY_V141_11F
       *
       * settleSortCard() owns the landing Card completely.
       *
       * Do not remove/reinstall:
       *   animation
       *   rotate
       *   will-change
       * while the Drop compositor transition is active.
       */
      if (
        card.classList.contains(
          'is-drop-settling'
        )
      ) {
        return;
      }

      var enabled = sortMode && card.classList.contains('is-sortable') && !card.classList.contains('is-dragging') && !card.classList.contains('is-drop-settling');

      setExplicitJiggle(
        card,
        enabled,
        cardIndex
      );

      if (
        enabled
        && cardDragJiggleFreezeActiveV14111D
      ) {
        /*
         * Same exact values proven in the browser test.
         *
         * Any syncSortMode()/syncExplicitJiggle call occurring
         * during the drag must NOT accidentally restart Card
         * Jiggle before Drop/FLIP is finished.
         */
        card.style.setProperty(
          'animation-play-state',
          'paused',
          'important'
        );

        card.style.setProperty(
          'rotate',
          '0deg',
          'important'
        );
      }
    });
    categorySortButtons().forEach(function (button, categoryIndex) {
      var enabled = sortMode && button.classList.contains('is-category-sortable') && !button.classList.contains('is-category-dragging');
      setExplicitJiggle(button, enabled, categoryIndex + index);
    });
  }

  function freezeCardJigglesForDragV14111D() {
    var node =
      manager();

    if (!node) {
      return;
    }


    cardDragJiggleFreezeActiveV14111D =
      true;

    cardDragJiggleDragEndedV14111D =
      false;


    /*
     * Exact successful browser-test behaviour.
     *
     * Freeze ALL sortable Cards at once.
     * Category pills are deliberately excluded.
     */
    node
      .querySelectorAll(
        '[data-pmd-menu-card].is-sortable'
      )
      .forEach(
        function (card) {
          card.style.setProperty(
            'animation-play-state',
            'paused',
            'important'
          );

          card.style.setProperty(
            'rotate',
            '0deg',
            'important'
          );
        }
      );
  }


  function cardMotionStillActiveV14111D() {
    var node =
      manager();

    if (!node) {
      return false;
    }


    /*
     * V141.11G:
     *
     * Even after the Card is already in its final DOM slot,
     * keep Jiggle frozen through one complete stable paint.
     *
     * This prevents native-drag -> Jiggle compositor handoff
     * from happening in the same frame.
     */
    if (
      pmdPostDropStableFrameV14111G
    ) {
      return true;
    }


    /*
     * Final Drop authority.
     */
    if (
      node.querySelector(
        '[data-pmd-menu-card].is-drop-settling'
      )
    ) {
      return true;
    }


    /*
     * V141/V141.11B neighbour FLIP authority.
     *
     * During the first inverse frame the transition may still
     * be "none", but inline translate already exists.
     *
     * Keep Jiggle frozen until FLIP cleanup removes it.
     */
    return Array
      .from(
        node.querySelectorAll(
          '[data-pmd-menu-card].is-sortable'
        )
      )
      .some(
        function (card) {
          var inlineTranslate =
            String(
              card.style.getPropertyValue(
                'translate'
              )
              || ''
            );

          if (inlineTranslate) {
            return true;
          }


          var inlineTransition =
            String(
              card.style.getPropertyValue(
                'transition'
              )
              || ''
            );

          return (
            inlineTransition.indexOf(
              'translate'
            ) !== -1
            || inlineTransition.indexOf(
              'transform'
            ) !== -1
          );
        }
      );
  }


  function resumeCardJigglesAfterDragV14111D() {
    if (
      !cardDragJiggleFreezeActiveV14111D
      || !cardDragJiggleDragEndedV14111D
      || cardMotionStillActiveV14111D()
    ) {
      return;
    }


    var node =
      manager();


    cardDragJiggleFreezeActiveV14111D =
      false;

    cardDragJiggleDragEndedV14111D =
      false;


    if (
      !node
      || !sortMode
    ) {
      return;
    }


    /*
     * Resume ONLY Card Jiggle.
     *
     * Existing neighbour Cards still have their original
     * inline animation and therefore continue from the paused
     * phase.
     *
     * The dragged Card itself may have had its animation
     * removed by is-dragging/is-drop-settling, so reinstall
     * it only when needed.
     *
     * Categories are not touched.
     */
    var index =
      0;


    node
      .querySelectorAll(
        '[data-pmd-menu-card]'
      )
      .forEach(
        function (card) {
          var cardIndex =
            index++;

          var enabled =
            sortMode
            && card.classList.contains(
              'is-sortable'
            )
            && !card.classList.contains(
              'is-dragging'
            )
            && !card.classList.contains(
              'is-drop-settling'
            );


          if (!enabled) {
            setExplicitJiggle(
              card,
              false,
              cardIndex
            );

            return;
          }


          /*
           * Remove the browser-test neutral rotate in the SAME
           * task that resumes the animation, so Safari never
           * paints an intermediate frame.
           */
          card.style.removeProperty(
            'rotate'
          );


          var inlineAnimation =
            String(
              card.style.getPropertyValue(
                'animation'
              )
              || ''
            );


          if (
            !inlineAnimation
            || inlineAnimation === 'none'
          ) {
            /*
             * Typically the dragged Card itself.
             */
            setExplicitJiggle(
              card,
              true,
              cardIndex
            );

            return;
          }


          /*
           * Neighbour Card:
           * keep its existing animation definition/phase.
           * Just resume the paused animation.
           */
          card.style.setProperty(
            'animation-play-state',
            'running',
            'important'
          );
        }
      );
  }


  function queueCardJiggleResumeV14111D() {
    requestAnimationFrame(
      function () {
        resumeCardJigglesAfterDragV14111D();
      }
    );
  }


  /*
   * Capture phase is intentional:
   *
   * Freeze Jiggle BEFORE the existing Card dragstart handler
   * begins changing Card/FLIP visual state.
   */
  document.addEventListener(
    'dragstart',
    function (event) {
      var target =
        event.target;

      var card =
        target
        && target.closest
          ? target.closest(
              '[data-pmd-menu-card].is-sortable'
            )
          : null;


      if (!card) {
        return;
      }


      var node =
        manager();

      if (
        !node
        || !node.contains(card)
      ) {
        return;
      }


      freezeCardJigglesForDragV14111D();
    },
    true
  );


  /*
   * Do NOT resume immediately on dragend.
   *
   * The REAL Card can still be completing:
   *   - neighbour FLIP cleanup
   *   - V141.11 final transform Drop
   *
   * The motion detector below decides when it is safe.
   */
  document.addEventListener(
    'dragend',
    function () {
      if (
        !cardDragJiggleFreezeActiveV14111D
      ) {
        return;
      }


      cardDragJiggleDragEndedV14111D =
        true;


      queueCardJiggleResumeV14111D();
    },
    true
  );


  /*
   * Final Drop uses transform.
   * Neighbour FLIP uses translate.
   *
   * Wait for their own existing cleanup, then inspect again on
   * the next paint frame.
   */
  document.addEventListener(
    'transitionend',
    function (event) {
      if (
        !cardDragJiggleFreezeActiveV14111D
        || !cardDragJiggleDragEndedV14111D
      ) {
        return;
      }


      var target =
        event.target;

      var card =
        target
        && target.closest
          ? target.closest(
              '[data-pmd-menu-card]'
            )
          : null;


      if (!card) {
        return;
      }


      if (
        event.propertyName !== 'translate'
        && event.propertyName !== 'transform'
      ) {
        return;
      }


      queueCardJiggleResumeV14111D();
    },
    true
  );


  document.addEventListener(
    'transitioncancel',
    function (event) {
      if (
        !cardDragJiggleFreezeActiveV14111D
        || !cardDragJiggleDragEndedV14111D
      ) {
        return;
      }


      var target =
        event.target;

      var card =
        target
        && target.closest
          ? target.closest(
              '[data-pmd-menu-card]'
            )
          : null;


      if (!card) {
        return;
      }


      if (
        event.propertyName !== 'translate'
        && event.propertyName !== 'transform'
      ) {
        return;
      }


      queueCardJiggleResumeV14111D();
    },
    true
  );


  function startAllEditJigglesNow() {
    var node = manager();
    if (!node || !sortMode) return;

    var targets = [];
    node.querySelectorAll('[data-pmd-menu-card].is-sortable').forEach(function (card) {
      if (!card.classList.contains('is-dragging') && !card.classList.contains('is-drop-settling')) targets.push(card);
    });
    categorySortButtons().forEach(function (button) {
      if (button.classList.contains('is-category-sortable') && !button.classList.contains('is-category-dragging')) targets.push(button);
    });

    /* WebKit can coalesce class + animation changes made in the same click task.
       Explicitly clear, flush once, then start every jiggle on the next paint frame.
       This is user-triggered, one-shot work: no timer, polling or observer loop. */
    targets.forEach(function (element) {
      element.style.setProperty('animation', 'none', 'important');
      element.style.removeProperty('animation-delay');
      element.style.removeProperty('animation-play-state');
    });
    void node.offsetWidth;

    requestAnimationFrame(function () {
      if (!sortMode) return;
      syncExplicitJiggle();
    });
  }

  function syncSortMode() {
    var node = manager();
    if (!node) return;
    var sortBusy = sortSaving || categorySaving;
    node.dataset.pmdSortMode = sortMode ? sortKind : '0';
    var toggle = node.querySelector('[data-pmd-menu-sort-toggle]');
    var label = node.querySelector('[data-pmd-menu-sort-label]');
    if (toggle) {
      toggle.classList.toggle('is-active', sortMode);
      toggle.setAttribute('aria-pressed', sortMode ? 'true' : 'false');
      toggle.disabled = sortBusy || isComboBuilder();
    }
    if (label) label.textContent = sortMode ? tr('sort_done', 'Done') : tr('sort_edit', 'Edit order');

    node.querySelectorAll('[data-pmd-menu-card]').forEach(function (card) {
      var target = sortMode && card.dataset.itemType === sortKind;

      /*
       * V141.11F:
       * keep the native drag source attribute stable until the
       * REAL Card has completed its visual Drop.
       */
      if (
        !card.classList.contains(
          'is-drop-settling'
        )
      ) {
        card.draggable = Boolean(
          target && !sortBusy
        );
      }

      card.classList.toggle('is-sortable', Boolean(target));
      card.classList.toggle('is-sort-locked', sortMode && !target);
    });

    categorySortButtons().forEach(function (button) {
      button.draggable = Boolean(sortMode && !sortBusy);
      button.classList.toggle('is-category-sortable', sortMode);
      button.setAttribute('aria-disabled', sortMode ? 'true' : 'false');
      button.disabled = false;
    });
    node.querySelectorAll('[data-pmd-category-fixed]').forEach(function (button) {
      button.draggable = false;
      button.classList.toggle('is-category-sort-locked', sortMode);
      button.disabled = sortMode;
    });
    var categoryCreate = node.querySelector('[data-pmd-category-create]');
    if (categoryCreate) categoryCreate.disabled = sortMode || sortBusy;

    var search = node.querySelector('[data-pmd-menu-search]');
    if (search) search.disabled = sortMode;
    node.querySelectorAll('[data-pmd-stock-filter]').forEach(function (button) {
      button.disabled = sortMode;
    });
    node.querySelectorAll('[data-pmd-menu-header-primary], [data-pmd-menu-header-secondary]').forEach(function (button) {
      button.disabled = sortMode || sortBusy;
    });
    syncExplicitJiggle();
  }

  function enterSortMode() {
    if (isComboBuilder() || sortSaving) return;
    var node = manager();
    if (!node) return;
    sortStatus('');

    if (
      isComboCategory(filterState.category)
    ) {
      sortKind = 'combo';
    } else {
      sortKind = 'food';
    }

    /*
     * Keep the currently selected category.
     * We only clear secondary filters so every food in that
     * category is available for canonical ordering.
     */
    filterState.stock = 'all';
    filterState.search = '';

    restoreFilters();
    applyFilters();

    sortMode = true;

    resetSortScopeFromCurrent();

    syncSortMode();
    startAllEditJigglesNow();
    var itemHint = sortKind === 'combo' ? tr('sort_combo_hint', 'Drag combos to set their order.') : tr('sort_food_hint', 'Drag foods to set the frontend order.');
    var categoryHint = categorySortButtons().length ? ' ' + tr('sort_category_hint', 'Drag categories to set their frontend order.') : '';
    sortStatus(itemHint + categoryHint);
  }

  function exitSortMode() {
    sortMode = false;

    sortScopeCategory = 'all';
    sortScopeGlobalOrder = [];
    sortScopeFoodIds = [];
    dragCard = null;
    dragSnapshot = [];
    categoryDrag = null;
    categorySnapshot = [];
    pendingSortReorder = null;
    if (sortReorderRaf) {
      cancelAnimationFrame(sortReorderRaf);
      sortReorderRaf = 0;
    }
    cancelSortFlipAnimations();
    sortTargetCards('food').concat(sortTargetCards('combo')).forEach(function (card) {
      card.draggable = false;
      card.classList.remove('is-sortable', 'is-sort-locked', 'is-dragging', 'is-drag-over', 'is-drop-settling');
      setExplicitJiggle(card, false);
      card.style.removeProperty('translate');
      card.style.removeProperty('transition');
    });
    categorySortButtons().forEach(function (button) {
      button.draggable = false;
      button.classList.remove('is-category-sortable', 'is-category-dragging', 'is-category-drop-settling');
      button.removeAttribute('aria-disabled');
      setExplicitJiggle(button, false);
      button.style.removeProperty('translate');
      button.style.removeProperty('transition');
    });
    syncSortMode();
    sortStatus('');
  }

  function captureSortOrder(kind) {
    return sortTargetCards(kind).map(function (card) {
      return kind === 'combo' ? String(card.dataset.comboId || '') : String(card.dataset.menuId || '');
    }).filter(Boolean);
  }

  function currentVisibleFoodOrder() {
    return visibleSortTargetCards(
      'food'
    ).map(function (card) {
      return String(
        card.dataset.menuId || ''
      );
    }).filter(Boolean);
  }

  function resetSortScopeFromCurrent() {
    sortScopeCategory =
      String(
        filterState.category || 'all'
      );

    sortScopeGlobalOrder =
      captureSortOrder('food');

    if (
      sortScopeCategory === 'all'
      || isComboCategory(sortScopeCategory)
    ) {
      sortScopeFoodIds = [];
      return;
    }

    sortScopeFoodIds =
      currentVisibleFoodOrder();
  }

  function capturePersistSortOrder(kind) {
    if (kind !== 'food') {
      return captureSortOrder(kind);
    }

    if (
      sortScopeCategory === 'all'
      || isComboCategory(sortScopeCategory)
      || !sortScopeFoodIds.length
    ) {
      return captureSortOrder('food');
    }

    var base =
      sortScopeGlobalOrder.length
        ? sortScopeGlobalOrder.slice()
        : captureSortOrder('food');

    var scopedSet =
      new Set(sortScopeFoodIds);

    var orderedScoped =
      currentVisibleFoodOrder().filter(
        function (id) {
          return scopedSet.has(id);
        }
      );

    if (
      orderedScoped.length
      !== sortScopeFoodIds.length
    ) {
      /*
       * Never persist a partial category sequence.
       */
      return base;
    }

    var queue =
      orderedScoped.slice();

    return base.map(function (id) {
      if (!scopedSet.has(id)) {
        return id;
      }

      return queue.shift();
    });
  }


  function restoreSortOrder(kind, ids) {
    var node = manager();
    var grid = node && node.querySelector('[data-pmd-menu-grid]');
    if (!grid || !Array.isArray(ids)) return;
    var byId = {};
    sortTargetCards(kind).forEach(function (card) {
      var id = kind === 'combo' ? String(card.dataset.comboId || '') : String(card.dataset.menuId || '');
      if (id) byId[id] = card;
    });
    if (kind === 'food') {
      var firstCombo = grid.querySelector('[data-pmd-menu-card][data-item-type="combo"]');
      ids.forEach(function (id) {
        if (!byId[id]) return;
        if (firstCombo) grid.insertBefore(byId[id], firstCombo);
        else grid.appendChild(byId[id]);
      });
    } else {
      ids.forEach(function (id) { if (byId[id]) grid.appendChild(byId[id]); });
    }
  }

  async function persistSortOrder() {
    if (!sortMode || sortSaving) return;
    var ids = capturePersistSortOrder(sortKind);
    if (!ids.length) return;
    sortSaving = true;
    sortStatus(tr('sort_saving', 'Saving order...'));
    syncSortMode();
    var formData = new FormData();
    if (sortKind === 'combo') ids.forEach(function (id) { formData.append('ordered_combo_ids[]', id); });
    else ids.forEach(function (id) { formData.append('ordered_ids[]', id); });
    try {
      if (sortKind === 'combo') await backend('/admin/combos', 'onPmdMenuManagerSaveOrderV123', formData);
      else await backend('/admin/menus', 'onSaveCardOrder', formData);
      sortStatus(tr('sort_saved', 'Order saved'), 'ok');
      if (
        sortKind === 'food'
        && sortScopeCategory !== 'all'
        && !isComboCategory(sortScopeCategory)
      ) {
        /*
         * Normalize the live DOM to the exact sequence that
         * was persisted. Hidden foods keep their original slots.
         */
        restoreSortOrder(
          'food',
          ids
        );

        sortScopeGlobalOrder =
          ids.slice();
      }

      dragSnapshot = ids.slice();
    } catch (error) {
      restoreSortOrder(sortKind, dragSnapshot);
      sortStatus((error && error.message) || tr('sort_failed', 'Could not save order.'), 'error');
    } finally {
      sortSaving = false;
      syncSortMode();
    }
  }

  function captureCategoryOrder() {
    return categorySortButtons().map(function (button) {
      return String(button.getAttribute('data-pmd-category-id') || '');
    }).filter(Boolean);
  }

  function restoreCategoryOrder(ids) {
    var node = manager();
    var host = node && node.querySelector('[data-pmd-food-categories]');
    if (!host || !Array.isArray(ids)) return;
    var map = {};
    categorySortButtons().forEach(function (button) {
      var id = String(button.getAttribute('data-pmd-category-id') || '');
      if (id) map[id] = button;
    });
    var anchor = host.querySelector('[data-pmd-category-filter="combos"], [data-pmd-category-create]');
    ids.forEach(function (id) {
      if (!map[id]) return;
      if (anchor) host.insertBefore(map[id], anchor);
      else host.appendChild(map[id]);
    });
  }

  async function persistCategoryOrder() {
    if (!sortMode || categorySaving) return;
    var ids = captureCategoryOrder();
    if (!ids.length) return;
    categorySaving = true;
    sortStatus(tr('sort_saving', 'Saving order...'));
    syncSortMode();
    var formData = new FormData();
    ids.forEach(function (id) { formData.append('ordered_category_ids[]', id); });
    try {
      await backend('/admin/menus', 'onSaveCategoryOrder', formData);
      categorySnapshot = ids.slice();
      sortStatus(tr('sort_saved', 'Order saved'), 'ok');
    } catch (error) {
      restoreCategoryOrder(categorySnapshot);
      sortStatus((error && error.message) || tr('sort_failed', 'Could not save order.'), 'error');
    } finally {
      categorySaving = false;
      syncSortMode();
    }
  }

  function categorySortRects() {
    var rects = new Map();
    categorySortButtons().forEach(function (button) {
      var rect = button.getBoundingClientRect();
      rects.set(button, {left: rect.left, top: rect.top});
    });
    return rects;
  }

  function animateFlipElements(beforeRects, elements) {
    // PMD_MENU_MOTION_POLISH_V141_3_FLIP
    //
    // Timing polish only.
    // Reorder / target / persistence authority is unchanged.
    var moved = [];
    elements.forEach(function (element) {
      var before = beforeRects.get(element);
      if (!before) return;
      var rect = element.getBoundingClientRect();
      var dx = before.left - rect.left;
      var dy = before.top - rect.top;
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
      moved.push({element: element, dx: dx, dy: dy});
    });
    if (!moved.length) return;

    var individualTranslate = !window.CSS || !CSS.supports || CSS.supports('translate', '1px 1px');
    if (individualTranslate) {
      moved.forEach(function (entry) {
        var element = entry.element;

        var isNeighbourCard =
          Boolean(
            element.matches
            && element.matches(
              '[data-pmd-menu-card].is-sortable'
            )
            && !element.classList.contains(
              'is-dragging'
            )
            && !element.classList.contains(
              'is-drop-settling'
            )
          );


        entry.__pmdNeighbourCardV14111B =
          isNeighbourCard;


        if (isNeighbourCard) {
          /*
           * PMD_MENU_NEIGHBOUR_BLINK_GUARD_V141_11B
           *
           * Freeze the Jiggle at its CURRENT frame.
           *
           * Do not remove animation.
           * Do not restart animation.
           * Do not change opacity.
           * Do not change transform/rotate.
           *
           * This leaves translate FLIP as the only motion
           * changing during the neighbour displacement.
           */
          var generation =
            Number(
              element
                .__pmdNeighbourFlipGenerationV14111B
              || 0
            )
            + 1;


          element
            .__pmdNeighbourFlipGenerationV14111B =
            generation;


          entry.__pmdNeighbourGenerationV14111B =
            generation;


          element.style.setProperty(
            'animation-play-state',
            'paused',
            'important'
          );
        }


        element.style.setProperty(
          'transition',
          'none',
          'important'
        );

        element.style.setProperty(
          'translate',
          entry.dx
            + 'px '
            + entry.dy
            + 'px',
          'important'
        );
      });
      void moved[0].element.offsetWidth;
      requestAnimationFrame(function () {
        moved.forEach(function (entry) {
          var element = entry.element;
          element.style.setProperty('transition', 'translate 260ms cubic-bezier(.18,.82,.22,1)', 'important');
          element.style.setProperty('translate', '0px 0px', 'important');
          var cleanup = function (event) {
            if (
              event
              && event.propertyName
              && event.propertyName !== 'translate'
            ) {
              return;
            }


            if (
              entry.__pmdNeighbourCardV14111B
              && element
                .__pmdNeighbourFlipGenerationV14111B
                !== entry
                  .__pmdNeighbourGenerationV14111B
            ) {
              /*
               * A newer FLIP already owns this Card.
               * This old listener must not touch it.
               */
              element.removeEventListener(
                'transitionend',
                cleanup
              );

              element.removeEventListener(
                'transitioncancel',
                cleanup
              );

              return;
            }


            element.style.removeProperty(
              'translate'
            );

            element.style.removeProperty(
              'transition'
            );


            if (
              entry.__pmdNeighbourCardV14111B
            ) {
              /*
               * Resume the SAME Jiggle animation.
               *
               * Because it was paused, not removed,
               * there is no animation restart frame.
               */
              /*
               * V141.11E:
               *
               * V141.11D global drag-session freeze outranks
               * the older neighbour-local V141.11B resume.
               */
              if (
                cardDragJiggleFreezeActiveV14111D
              ) {
                element.style.setProperty(
                  'animation-play-state',
                  'paused',
                  'important'
                );
              } else if (
                sortMode
                && element.classList.contains(
                  'is-sortable'
                )
                && !element.classList.contains(
                  'is-dragging'
                )
                && !element.classList.contains(
                  'is-drop-settling'
                )
              ) {
                element.style.setProperty(
                  'animation-play-state',
                  'running',
                  'important'
                );
              } else {
                element.style.removeProperty(
                  'animation-play-state'
                );
              }
            }


            element.removeEventListener(
              'transitionend',
              cleanup
            );

            element.removeEventListener(
              'transitioncancel',
              cleanup
            );
          };


          element.addEventListener(
            'transitionend',
            cleanup
          );

          element.addEventListener(
            'transitioncancel',
            cleanup
          );
        });
      });
      return;
    }

    moved.forEach(function (entry) {
      var element = entry.element;
      setExplicitJiggle(element, false);
      if (typeof element.animate !== 'function') return;
      var animation = element.animate([
        {transform: 'translate(' + entry.dx + 'px,' + entry.dy + 'px)'},
        {transform: 'translate(0,0)'}
      ], {duration: 260, easing: 'cubic-bezier(.18,.82,.22,1)'});
      var done = function () { if (sortMode) syncExplicitJiggle(); };
      animation.addEventListener('finish', done, {once: true});
      animation.addEventListener('cancel', done, {once: true});
    });
  }

  function reorderCategoryRelative(source, target, clientX) {
    if (!source || !target || source === target) return false;
    var buttons = categorySortButtons();
    var sourceIndex = buttons.indexOf(source);
    var targetIndex = buttons.indexOf(target);
    if (sourceIndex < 0 || targetIndex < 0) return false;
    var rect = target.getBoundingClientRect();
    var after = clientX > rect.left + rect.width / 2;
    if (after && sourceIndex === targetIndex + 1) return false;
    if (!after && sourceIndex === targetIndex - 1) return false;
    var beforeRects = categorySortRects();
    if (after) target.after(source);
    else target.before(source);
    animateFlipElements(beforeRects, categorySortButtons());
    return true;
  }

  function visibleSortTargetCards(kind) {
    return sortTargetCards(kind).filter(function (card) {
      return !card.hidden && card.getClientRects().length > 0;
    });
  }

  function captureSortRects(kind) {
    var rects = new Map();
    visibleSortTargetCards(kind).forEach(function (card) {
      var rect = card.getBoundingClientRect();
      rects.set(card, {left: rect.left, top: rect.top});
    });
    return rects;
  }

  function cancelSortFlipAnimations() {
    sortFlipAnimations.forEach(function (animation) {
      try { animation.cancel(); } catch (error) {}
    });
    sortFlipAnimations.clear();
  }

  function animateSortFlip(beforeRects, kind) {
    animateFlipElements(beforeRects, visibleSortTargetCards(kind));
  }

  function reorderRelativeToTarget(
    source,
    target,
    clientX,
    clientY
  ) {
    if (
      !source
      || !target
      || source === target
      || source.dataset.itemType
        !== target.dataset.itemType
    ) {
      return false;
    }

    var cards =
      visibleSortTargetCards(
        sortKind
      );

    var sourceIndex =
      cards.indexOf(
        source
      );

    var targetIndex =
      cards.indexOf(
        target
      );

    if (
      sourceIndex < 0
      || targetIndex < 0
    ) {
      return false;
    }

    // PMD_MENU_STABLE_TARGET_DROP_V141_2_HYSTERESIS
    // PMD_MENU_OVERLAP_SWAP_60_V141_11G
    //
    // V141.2's pointer-center/dead-zone decision is RETIRED.
    //
    // The Card rectangle is now the sole swap threshold.
    //
    // A target reaches this function only when at least 60%
    // of the dragged Card is visibly overlapping that target.
    var draggedRectV14111G =
      pmdDraggedVisualRectV14111G(
        source,
        clientX,
        clientY
      );

    if (!draggedRectV14111G) {
      return false;
    }


    var overlapRatioV14111G =
      pmdCardOverlapRatioV14111G(
        draggedRectV14111G,
        target.getBoundingClientRect()
      );


    if (
      overlapRatioV14111G
      < PMD_OVERLAP_SWAP_RATIO_V14111G
    ) {
      return false;
    }


    /*
     * Swap in the direction implied by current canonical DOM
     * order.
     *
     * The 35% lock prevents the same target from instantly
     * swapping back while FLIP is still settling.
     */
    var sourceBeforeTarget =
      sourceIndex < targetIndex;


    var beforeRects =
      captureSortRects(
        sortKind
      );

    cancelSortFlipAnimations();

    if (sourceBeforeTarget) {
      target.after(
        source
      );
    } else {
      target.before(
        source
      );
    }


    /*
     * Lock this exact target until overlap drops below 35%.
     */
    pmdOverlapSwapLockV14111G =
      target;


    animateSortFlip(
      beforeRects,
      sortKind
    );

    return true;
  }

  function queueSortReorder(source, target, clientX, clientY) {
    pendingSortReorder = {source: source, target: target, clientX: clientX, clientY: clientY};
    if (sortReorderRaf) return;
    sortReorderRaf = requestAnimationFrame(function () {
      sortReorderRaf = 0;
      var pending = pendingSortReorder;
      pendingSortReorder = null;
      if (!pending || !sortMode || !dragCard) return;
      reorderRelativeToTarget(pending.source, pending.target, pending.clientX, pending.clientY);
    });
  }

  function flushQueuedSortReorder() {
    if (sortReorderRaf) {
      cancelAnimationFrame(sortReorderRaf);
      sortReorderRaf = 0;
    }
    var pending = pendingSortReorder;
    pendingSortReorder = null;
    if (!pending || !sortMode || !dragCard) return;
    reorderRelativeToTarget(pending.source, pending.target, pending.clientX, pending.clientY);
  }

  // PMD_MENU_REAL_DROP_TRAVEL_V141_6_STATE
  //
  // Pointer offset inside the native dragged Card.
  // Used only to make the REAL Card continue from the exact
  // visual release point into its already-decided final slot.
  var pmdDropGrabV1416 = {
    x: 0,
    y: 0,
    valid: false
  };



  /*
   * ============================================================
   * V141.11G CARD-OVERLAP SWAP AUTHORITY
   * ============================================================
   *
   * The browser native drag image follows:
   *
   *   pointer clientX/clientY
   *   minus the original grab offset inside the Card.
   *
   * Reconstruct that actual visual Card rectangle and compare
   * it with every visible destination Card.
   *
   * 60% of the DRAGGED Card surface overlapping one target
   * means that target becomes eligible to swap.
   *
   * The just-swapped target stays locked until overlap falls
   * below 35%, preventing immediate reverse/ping-pong while
   * neighbour FLIP is still visually moving.
   * ============================================================
   */


  function pmdDraggedVisualRectV14111G(
    source,
    clientX,
    clientY
  ) {
    if (
      !source
      || !pmdDropGrabV1416.valid
      || !Number.isFinite(clientX)
      || !Number.isFinite(clientY)
    ) {
      return null;
    }


    var width =
      Number(
        source.offsetWidth || 0
      );

    var height =
      Number(
        source.offsetHeight || 0
      );


    if (
      width <= 0
      || height <= 0
    ) {
      var fallback =
        source.getBoundingClientRect();

      width =
        Number(fallback.width || 0);

      height =
        Number(fallback.height || 0);
    }


    if (
      width <= 0
      || height <= 0
    ) {
      return null;
    }


    var left =
      clientX
      - pmdDropGrabV1416.x;

    var top =
      clientY
      - pmdDropGrabV1416.y;


    return {
      left: left,
      top: top,
      right: left + width,
      bottom: top + height,
      width: width,
      height: height
    };
  }


  function pmdCardOverlapRatioV14111G(
    draggedRect,
    targetRect
  ) {
    if (
      !draggedRect
      || !targetRect
    ) {
      return 0;
    }


    var overlapWidth =
      Math.max(
        0,
        Math.min(
          draggedRect.right,
          targetRect.right
        )
        - Math.max(
          draggedRect.left,
          targetRect.left
        )
      );

    var overlapHeight =
      Math.max(
        0,
        Math.min(
          draggedRect.bottom,
          targetRect.bottom
        )
        - Math.max(
          draggedRect.top,
          targetRect.top
        )
      );


    if (
      overlapWidth <= 0
      || overlapHeight <= 0
    ) {
      return 0;
    }


    var draggedArea =
      draggedRect.width
      * draggedRect.height;


    if (draggedArea <= 0) {
      return 0;
    }


    return (
      overlapWidth
      * overlapHeight
    ) / draggedArea;
  }


  function pmdFindOverlapTargetV14111G(
    source,
    clientX,
    clientY
  ) {
    var draggedRect =
      pmdDraggedVisualRectV14111G(
        source,
        clientX,
        clientY
      );

    if (!draggedRect) {
      return null;
    }


    /*
     * Unlock the previous target only after the Card has moved
     * clearly away from it.
     */
    if (
      pmdOverlapSwapLockV14111G
    ) {
      if (
        !pmdOverlapSwapLockV14111G
          .isConnected
      ) {
        pmdOverlapSwapLockV14111G =
          null;
      } else {
        var lockedRatio =
          pmdCardOverlapRatioV14111G(
            draggedRect,
            pmdOverlapSwapLockV14111G
              .getBoundingClientRect()
          );

        if (
          lockedRatio
          <= PMD_OVERLAP_UNLOCK_RATIO_V14111G
        ) {
          pmdOverlapSwapLockV14111G =
            null;
        }
      }
    }


    var bestCard =
      null;

    var bestRatio =
      0;


    visibleSortTargetCards(
      sortKind
    ).forEach(
      function (candidate) {
        if (
          !candidate
          || candidate === source
          || candidate.dataset.itemType
            !== source.dataset.itemType
        ) {
          return;
        }


        /*
         * Do not instantly reverse the swap against the same
         * target while their FLIP visuals still overlap.
         */
        if (
          candidate
          === pmdOverlapSwapLockV14111G
        ) {
          return;
        }


        var ratio =
          pmdCardOverlapRatioV14111G(
            draggedRect,
            candidate
              .getBoundingClientRect()
          );


        if (
          ratio
          >= PMD_OVERLAP_SWAP_RATIO_V14111G
          && ratio > bestRatio
        ) {
          bestRatio =
            ratio;

          bestCard =
            candidate;
        }
      }
    );


    return bestCard;
  }


  function settleSortCard(
    card,
    fromX,
    fromY
  ) {
    if (!card) return;

    /*
     * PMD_MENU_NATIVE_DROP_FINAL_SLOT_V141_11G
     * PMD_MENU_SOFT_NATIVE_SETTLE_V141_11H
     * PMD_MENU_GHOST_EXIT_HANDOFF_V141_11I
     * PMD_MENU_ZERO_GAP_DRAGEND_HANDOFF_V141_11J
     *
     * Screenshot-proven J fix:
     *
     * I waited until a future rAF to reveal the real Card.
     * That produced:
     *
     *   native ghost disappears
     *   EMPTY FRAME
     *   real Card appears
     *
     * J reveals the real Card synchronously DURING dragend.
     *
     * The browser cannot paint between the end of the native
     * drag representation and our same-task real Card reveal.
     *
     * The Card then settles on the NEXT frame.
     */


    pmdPostDropStableFrameV14111G =
      true;


    card.classList.add(
      'is-drop-settling'
    );

    card.classList.remove(
      'is-dragging',
      'is-drag-over'
    );


    var dx =
      Number.isFinite(fromX)
        ? fromX
        : 0;

    var dy =
      Number.isFinite(fromY)
        ? fromY
        : 0;


    var maxX =
      Math.max(
        480,
        window.innerWidth * 1.1
      );

    var maxY =
      Math.max(
        480,
        window.innerHeight * 1.1
      );

    dx =
      Math.max(
        -maxX,
        Math.min(
          maxX,
          dx
        )
      );

    dy =
      Math.max(
        -maxY,
        Math.min(
          maxY,
          dy
        )
      );


    var distance =
      Math.sqrt(
        dx * dx
        + dy * dy
      );


    /*
     * KEEP I'S USER-APPROVED SPEED.
     */
    var duration =
      Math.round(
        Math.max(
          300,
          Math.min(
            380,
            300
              + distance * .16
          )
        )
      );


    /*
     * Card must remain the TOP visual while moving through
     * neighbouring Grid cells.
     *
     * V138's z-index:20 disappears when is-dragging is removed.
     * J explicitly carries that stacking ownership throughout
     * settle.
     */
    /*
     * PMD_MENU_RASTER_CONTINUITY_V141_11K
     *
     * Exact top-layer behavior proven by console test.
     */
    card.style.setProperty(
      'z-index',
      '9999',
      'important'
    );

    card.style.setProperty(
      'isolation',
      'isolate',
      'important'
    );

    card.style.setProperty(
      'pointer-events',
      'none',
      'important'
    );


    /*
     * Keep Jiggle frozen throughout.
     */
    card.style.setProperty(
      'animation-play-state',
      'paused',
      'important'
    );

    card.style.setProperty(
      'rotate',
      '0deg',
      'important'
    );


    /*
     * Prepare the REAL Card at the exact native release
     * position while V140.2 quiet-source still hides children.
     */
    card.style.setProperty(
      'transition',
      'none',
      'important'
    );

    card.style.setProperty(
      'translate',
      dx + 'px ' + dy + 'px',
      'important'
    );

    card.style.setProperty(
      'will-change',
      'translate, rotate',
      'important'
    );


    /*
     * Resolve geometry invisibly.
     */
    void card.offsetWidth;


    var finished =
      false;

    var nativeDragEnded =
      false;


    function prepareZeroPhaseJiggleV14111J() {
      var node =
        manager();

      if (
        !node
        || !sortMode
      ) {
        return;
      }


      var cards =
        Array.from(
          node.querySelectorAll(
            '[data-pmd-menu-card]'
          )
        );

      var cardIndex =
        cards.indexOf(
          card
        );

      if (cardIndex < 0) {
        cardIndex =
          0;
      }


      var even =
        cardIndex % 2 === 1;

      var name =
        even
          ? 'pmd-menu-v128-jiggle-b'
          : 'pmd-menu-v128-jiggle-a';

      var seconds =
        even
          ? .57
          : .52;


      /*
       * Start close to the first zero crossing instead of
       * restarting from +/- .3deg.
       */
      var zeroPhaseDelay =
        -seconds * .132;


      card.style.setProperty(
        'animation',
        name
          + ' '
          + seconds
          + 's ease-in-out infinite',
        'important'
      );

      card.style.setProperty(
        'animation-delay',
        zeroPhaseDelay.toFixed(3)
          + 's',
        'important'
      );

      card.style.setProperty(
        'animation-play-state',
        'paused',
        'important'
      );

      card.style.setProperty(
        'transform-origin',
        '50% 50%',
        'important'
      );

      card.style.setProperty(
        'will-change',
        'rotate, translate',
        'important'
      );

      card.style.setProperty(
        'rotate',
        '0deg',
        'important'
      );
    }


    function finishSoftSettleV14111J() {
      if (finished) return;

      finished =
        true;


      card.removeEventListener(
        'transitionend',
        onSoftSettleEndV14111J
      );

      card.removeEventListener(
        'transitioncancel',
        onSoftSettleEndV14111J
      );


      card.style.setProperty(
        'translate',
        '0px 0px',
        'important'
      );

      card.style.removeProperty(
        'transition'
      );


      requestAnimationFrame(
        function () {
          if (!card.isConnected) {
            pmdPostDropStableFrameV14111G =
              false;

            return;
          }


          card.style.removeProperty(
            'translate'
          );

          card.classList.remove(
            'is-drop-settling'
          );


          /*
           * The journey is finished now.
           * Only NOW return the Card to normal Grid stacking.
           */
          card.style.removeProperty(
            'z-index'
          );

          card.style.removeProperty(
            'isolation'
          );

          card.style.removeProperty(
            'pointer-events'
          );


          prepareZeroPhaseJiggleV14111J();


          requestAnimationFrame(
            function () {
              pmdPostDropStableFrameV14111G =
                false;


              if (!sortMode) {
                card.style.removeProperty(
                  'animation'
                );

                card.style.removeProperty(
                  'animation-delay'
                );

                card.style.removeProperty(
                  'animation-play-state'
                );

                card.style.removeProperty(
                  'rotate'
                );

                card.style.removeProperty(
                  'will-change'
                );

                return;
              }


              queueCardJiggleResumeV14111D();
            }
          );
        }
      );
    }


    function onSoftSettleEndV14111J(
      event
    ) {
      if (
        event
        && event.propertyName
        && event.propertyName !== 'translate'
      ) {
        return;
      }

      finishSoftSettleV14111J();
    }


    function beginRealCardSettleV14111J() {
      if (
        nativeDragEnded
        || !card.isConnected
      ) {
        return;
      }


      nativeDragEnded =
        true;


      /*
       * ======================================================
       * ZERO-GAP HANDOFF
       * ======================================================
       *
       * This executes synchronously inside native dragend.
       *
       * Do NOT put this reveal inside requestAnimationFrame.
       */
      pmdClearNativeSourceV1402(
        card
      );


      if (
        pmdNativeSourceV1402 === card
      ) {
        pmdNativeSourceV1402 =
          null;
      }


      /*
       * Real Card is now visible at the SAME release position
       * and z-index:80.
       *
       * Browser finishes dragend with an already-present visual
       * underneath the retiring native ghost.
       */
      void card.offsetWidth;


      if (distance < 1.5) {
        requestAnimationFrame(
          finishSoftSettleV14111J
        );

        return;
      }


      /*
       * Movement begins only on the following paint.
       */
      requestAnimationFrame(
        function () {
          if (!card.isConnected) {
            pmdPostDropStableFrameV14111G =
              false;

            return;
          }


          card.addEventListener(
            'transitionend',
            onSoftSettleEndV14111J
          );

          card.addEventListener(
            'transitioncancel',
            onSoftSettleEndV14111J
          );


          card.style.setProperty(
            'transition',
            'translate '
              + duration
              + 'ms '
              + 'cubic-bezier(.18,.76,.22,1)',
            'important'
          );

          card.style.setProperty(
            'translate',
            '0px 0px',
            'important'
          );
        }
      );
    }


    /*
     * Drop occurs before dragend.
     *
     * Register now so dragend itself becomes the visual
     * ownership handoff point.
     *
     * Capture phase means our real Card is revealed before the
     * later V140.2 bubble-phase cleanup listener executes.
     */
    document.addEventListener(
      'dragend',
      beginRealCardSettleV14111J,
      {
        capture: true,
        once: true
      }
    );
  }


  function installNotificationOnce() {
    var node = manager();
    var slot = node && node.querySelector('[data-pmd-menu-notif-slot]');
    var notificationRoot = document.getElementById('notif-root');
    if (!slot || !notificationRoot) return;
    notificationRoot.classList.remove('show');
    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (toggle) {
      toggle.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    }
    slot.replaceWith(notificationRoot);
  }

  function changeComboQuantity(row, delta) {
    var id = Number(row && row.getAttribute('data-pmd-combo-draft-row') || 0);
    var entry = comboDraftItems.find(function (candidate) { return candidate.menu_id === id; });
    if (!entry) return;
    entry.quantity = Math.max(1, Math.min(99, Number(entry.quantity || 1) + delta));
    var input = row.querySelector('[data-pmd-combo-qty-input]');
    if (input) input.value = String(entry.quantity);
    renderComboDerivedProfile();
  }

  document.addEventListener('click', function (event) {
    var node = manager();
    if (!node) return;

    var editCardDelete =
      event.target.closest(
        '[data-pmd-edit-delete-kind]'
        + '[data-pmd-edit-delete-id]'
      );

    if (
      editCardDelete
      && node.contains(editCardDelete)
    ) {
      event.preventDefault();
      event.stopPropagation();

      deleteEditModeCard(
        editCardDelete.getAttribute(
          'data-pmd-edit-delete-kind'
        ),
        editCardDelete.getAttribute(
          'data-pmd-edit-delete-id'
        ),
        editCardDelete
      );

      return;
    }

    var categoryDelete = event.target.closest(
      '[data-pmd-category-delete]'
    );

    if (
      categoryDelete
      && node.contains(categoryDelete)
    ) {
      event.preventDefault();
      event.stopPropagation();

      deleteCategoryById(
        categoryDelete.getAttribute(
          'data-pmd-category-delete'
        ),
        categoryDelete
      );

      return;
    }

    var sortToggle = event.target.closest('[data-pmd-menu-sort-toggle]');
    if (sortToggle && node.contains(sortToggle)) {
      event.preventDefault();
      if (sortMode) exitSortMode();
      else enterSortMode();
      return;
    }

    if (sortMode && event.target.closest('[data-pmd-menu-card]')) {
      event.preventDefault();
      return;
    }

    var primary = event.target.closest('[data-pmd-menu-header-primary]');
    if (primary && node.contains(primary)) {
      event.preventDefault();
      if (isComboBuilder()) confirmComboSelection(primary);
      else openFoodCreate(primary);
      return;
    }

    var secondary = event.target.closest('[data-pmd-menu-header-secondary]');
    if (secondary && node.contains(secondary)) {
      event.preventDefault();
      if (isComboBuilder()) cancelComboBuilder(true);
      else startComboBuilder(secondary);
      return;
    }

    var create = event.target.closest('[data-pmd-menu-create]');
    if (create && node.contains(create)) {
      event.preventDefault();
      openFoodCreate(create);
      return;
    }

    if (isComboBuilder()) {
      var selectableCard = event.target.closest('[data-pmd-menu-card]');
      if (selectableCard && node.contains(selectableCard)) {
        event.preventDefault();
        toggleComboFood(selectableCard);
        return;
      }
    }

    var edit = event.target.closest('[data-pmd-menu-edit]');
    if (edit && node.contains(edit)) {
      event.preventDefault();
      openFoodEdit(edit.getAttribute('data-pmd-menu-edit'), edit);
      return;
    }

    var comboEdit = event.target.closest('[data-pmd-combo-edit]');
    if (comboEdit && node.contains(comboEdit)) {
      event.preventDefault();
      openComboEdit(comboEdit.getAttribute('data-pmd-combo-edit'), comboEdit);
      return;
    }

    var stock = event.target.closest('[data-pmd-menu-stock]');
    if (stock && node.contains(stock)) {
      event.preventDefault();
      toggleStock(stock);
      return;
    }

    var categoryCreate = event.target.closest('[data-pmd-category-create]');
    if (categoryCreate && node.contains(categoryCreate)) {
      event.preventDefault();
      if (!sortMode) openCategoryCreate(categoryCreate);
      return;
    }

    var category = event.target.closest('[data-pmd-category-filter]');
    if (category && node.contains(category)) {
      if (sortMode) return;
      var categoryValue = category.getAttribute('data-pmd-category-filter') || 'all';
      if (isComboBuilder() && isComboCategory(categoryValue)) return;
      filterState.category = categoryValue;
      node.querySelectorAll('[data-pmd-category-filter]').forEach(function (button) {
        button.classList.toggle('is-active', button === category);
      });
      applyFilters();
      return;
    }

    var stockFilter = event.target.closest('[data-pmd-stock-filter]');
    if (stockFilter && node.contains(stockFilter)) {
      if (sortMode) return;
      filterState.stock = stockFilter.getAttribute('data-pmd-stock-filter') || 'all';
      node.querySelectorAll('[data-pmd-stock-filter]').forEach(function (button) {
        button.classList.toggle('is-active', button === stockFilter);
      });
      applyFilters();
      return;
    }

    var qtyButton = event.target.closest('[data-pmd-combo-qty]');
    if (qtyButton && modal.contains(qtyButton)) {
      event.preventDefault();
      var row = qtyButton.closest('[data-pmd-combo-draft-row]');
      changeComboQuantity(row, qtyButton.getAttribute('data-pmd-combo-qty') === 'plus' ? 1 : -1);
      return;
    }

    var removeComboItem = event.target.closest('[data-pmd-combo-remove-item]');
    if (removeComboItem && modal.contains(removeComboItem)) {
      event.preventDefault();
      var removeId = Number(removeComboItem.getAttribute('data-pmd-combo-remove-item') || 0);
      comboDraftItems = comboDraftItems.filter(function (entry) { return entry.menu_id !== removeId; });
      renderComboDraftItems();
      return;
    }

    var destructive = event.target.closest('[data-pmd-menu-delete]');
    if (destructive && modal.contains(destructive)) {
      event.preventDefault();
      deleteCurrent();
      return;
    }

    if (event.target.closest('[data-pmd-menu-close]') && modal.contains(event.target)) {
      event.preventDefault();
      closeModal();
    }
  });

  document.addEventListener('dragstart', function (event) {
    if (!sortMode) return;
    var node = manager();
    if (!node) return;

    var categoryButton = event.target.closest('[data-pmd-category-sortable].is-category-sortable');
    if (categoryButton && node.contains(categoryButton)) {
      var categoryDeleteHit =
        categoryButton.querySelector(
          '[data-pmd-category-delete]'
        );

      if (categoryDeleteHit) {
        var deleteRect =
          categoryDeleteHit.getBoundingClientRect();

        var pointerOnDelete =
          event.clientX >= deleteRect.left
          && event.clientX <= deleteRect.right
          && event.clientY >= deleteRect.top
          && event.clientY <= deleteRect.bottom;

        if (pointerOnDelete) {
          event.preventDefault();
          return;
        }
      }

      categoryDrag = categoryButton;
      categorySnapshot = captureCategoryOrder();
      categoryButton.classList.add('is-category-dragging');
      setExplicitJiggle(categoryButton, false);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
        try {
          var categoryRect = categoryButton.getBoundingClientRect();
          event.dataTransfer.setDragImage(categoryButton, Math.max(12, event.clientX - categoryRect.left), Math.max(12, event.clientY - categoryRect.top));
        } catch (e) {}
        try { event.dataTransfer.setData('text/plain', 'category:' + String(categoryButton.getAttribute('data-pmd-category-id') || '')); } catch (e) {}
      }
      return;
    }

    var card = event.target.closest('[data-pmd-menu-card].is-sortable');
    if (!card || !node.contains(card)) return;

    var editCardDelete =
      card.querySelector(
        '[data-pmd-edit-delete-kind]'
      );

    if (editCardDelete) {
      var editDeleteRect =
        editCardDelete.getBoundingClientRect();

      var pointerOnEditDelete =
        event.clientX >= editDeleteRect.left
        && event.clientX <= editDeleteRect.right
        && event.clientY >= editDeleteRect.top
        && event.clientY <= editDeleteRect.bottom;

      if (pointerOnEditDelete) {
        event.preventDefault();
        return;
      }
    }

    dragCard = card;

    pmdOverlapSwapLockV14111G =
      null;

    dragSnapshot =
      capturePersistSortOrder(sortKind);
    pendingSortReorder = null;
    cancelSortFlipAnimations();
    // PMD_MENU_REAL_DROP_TRAVEL_V141_6_GRAB
    //
    // Capture the exact pointer position INSIDE the Card.
    //
    // Safari's native ghost keeps this same grab offset,
    // allowing the real Card to continue from the same point
    // on Drop.
    var pmdGrabRectV1416 =
      card.getBoundingClientRect();

    pmdDropGrabV1416.x =
      Math.max(
        0,
        Math.min(
          pmdGrabRectV1416.width,
          event.clientX
            - pmdGrabRectV1416.left
        )
      );

    pmdDropGrabV1416.y =
      Math.max(
        0,
        Math.min(
          pmdGrabRectV1416.height,
          event.clientY
            - pmdGrabRectV1416.top
        )
      );

    pmdDropGrabV1416.valid =
      Number.isFinite(
        pmdDropGrabV1416.x
      )
      && Number.isFinite(
        pmdDropGrabV1416.y
      );

    setExplicitJiggle(card, false);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      /*
       * PMD V138:
       * Match the proven old /admin/menus gesture.
       *
       * Do NOT call setDragImage().
       * Safari/browser owns one native drag representation.
       */
      try { event.dataTransfer.setData('text/plain', sortKind === 'combo' ? String(card.dataset.comboId || '') : String(card.dataset.menuId || '')); } catch (e) {}
    }
    card.classList.add('is-dragging');
  });

  document.addEventListener('dragover', function (event) {
    if (!sortMode) return;
    var node = manager();
    if (!node) return;

    if (categoryDrag) {
      var categoryTarget = event.target.closest('[data-pmd-category-sortable].is-category-sortable');
      if (!categoryTarget || !node.contains(categoryTarget) || categoryTarget === categoryDrag) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      reorderCategoryRelative(categoryDrag, categoryTarget, event.clientX);
      return;
    }

    if (!dragCard) return;

    // PMD_MENU_OVERLAP_SWAP_60_V141_11G
    //
    // Do not ask which DOM Card the POINTER is over.
    //
    // Ask which Card the dragged CARD itself overlaps >= 60%.
    var target =
      pmdFindOverlapTargetV14111G(
        dragCard,
        event.clientX,
        event.clientY
      );


    // PMD_MENU_STABLE_TARGET_DROP_V141_2_GRID_DROP
    //
    // The Grid remains a legal Drop surface even when no Card
    // has reached the 60% swap threshold yet.
    var sortGrid =
      node.querySelector(
        '[data-pmd-menu-grid]'
      );


    if (!target) {
      if (
        sortGrid
        && sortGrid.contains(
          event.target
        )
      ) {
        event.preventDefault();

        if (event.dataTransfer) {
          event.dataTransfer.dropEffect =
            'move';
        }
      }

      return;
    }


    /*
     * PMD_MENU_LIVE_FLIP_REORDER_V141_DRAGOVER
     *
     * Reuse the existing V132/V128 FLIP queue.
     *
     * The native moving Card remains browser-owned.
     * Only neighbouring Grid Cards move in the live DOM.
     */
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect =
        'move';
    }

    queueSortReorder(
      dragCard,
      target,
      event.clientX,
      event.clientY
    );
  });

  document.addEventListener('drop', function (event) {
    if (!sortMode) return;
    var node = manager();
    if (!node || !node.contains(event.target)) return;

    if (categoryDrag) {
      event.preventDefault();
      var droppedCategory = categoryDrag;
      categoryDrag = null;
      droppedCategory.classList.remove('is-category-dragging');
      droppedCategory.classList.add('is-category-drop-settling');
      requestAnimationFrame(function () {
        droppedCategory.classList.remove('is-category-drop-settling');
        syncExplicitJiggle();
      });
      var categoryCurrent = captureCategoryOrder();
      if (categorySnapshot.length && categoryCurrent.join(',') !== categorySnapshot.join(',')) persistCategoryOrder();
      return;
    }

    if (!dragCard) return;

    event.preventDefault();

    var droppedCard =
      dragCard;

    var target =
      event.target.closest(
        '[data-pmd-menu-card].is-sortable'
      );

    /*
     * PMD_MENU_LIVE_FLIP_REORDER_V141_DROP
     * PMD_MENU_STABLE_TARGET_DROP_V141_2_COMMIT
     *
     * DO NOT calculate a new destination at mouse-up.
     *
     * During dragover the live Grid already represents the
     * user's intended order.
     *
     * A new release-time target calculation can reverse the
     * order because the target Card itself is still finishing
     * its FLIP animation.
     *
     * Therefore:
     *
     *   WHAT YOU SEE BEFORE RELEASE
     *   =
     *   WHAT GETS SAVED
     *
     * Flush only an already queued dragover frame.
     */
    flushQueuedSortReorder();

    // PMD_MENU_REAL_DROP_TRAVEL_V141_6_RELEASE
    //
    // DOM order is final now.
    //
    // Find the transform required to paint the REAL Card at
    // the same visual position where Safari's native ghost
    // currently sits under the pointer.
    var pmdDropFromXV1416 =
      0;

    var pmdDropFromYV1416 =
      0;

    if (
      pmdDropGrabV1416.valid
      && Number.isFinite(
        event.clientX
      )
      && Number.isFinite(
        event.clientY
      )
    ) {
      var pmdFinalRectV1416 =
        droppedCard
          .getBoundingClientRect();

      pmdDropFromXV1416 =
        event.clientX
        - pmdDropGrabV1416.x
        - pmdFinalRectV1416.left;

      pmdDropFromYV1416 =
        event.clientY
        - pmdDropGrabV1416.y
        - pmdFinalRectV1416.top;
    }

    pmdDropGrabV1416.valid =
      false;

    pmdOverlapSwapLockV14111G =
      null;

    dragCard =
      null;

    /*
     * Keep V132's small final settle.
     * No clone/proxy is involved.
     */
    settleSortCard(
      droppedCard,
      pmdDropFromXV1416,
      pmdDropFromYV1416
    );

    var finalOrder =
      capturePersistSortOrder(
        sortKind
      );

    if (
      dragSnapshot.length
      && finalOrder.join(',')
        !== dragSnapshot.join(',')
    ) {
      persistSortOrder();
    } else {
      syncSortMode();
    }
  });

  document.addEventListener('dragend', function () {
    if (categoryDrag) {
      var endedCategory = categoryDrag;
      categoryDrag = null;
      endedCategory.classList.remove('is-category-dragging');
      syncExplicitJiggle();
      var categoryCurrent = captureCategoryOrder();
      if (categorySnapshot.length && categoryCurrent.join(',') !== categorySnapshot.join(',')) persistCategoryOrder();
      return;
    }

    if (!dragCard) return;

    /*
     * PMD_MENU_LIVE_FLIP_REORDER_V141_CANCEL
     *
     * A dragend reaching this block means no valid Drop
     * committed the preview order.
     *
     * Restore the original canonical snapshot with the same
     * FLIP animation used during drag.
     */
    var cancelBeforeRects =
      captureSortRects(
        sortKind
      );

    pendingSortReorder =
      null;

    if (sortReorderRaf) {
      cancelAnimationFrame(
        sortReorderRaf
      );

      sortReorderRaf =
        0;
    }

    // PMD_MENU_REAL_DROP_TRAVEL_V141_6_CANCEL
    pmdDropGrabV1416.valid =
      false;

    pmdOverlapSwapLockV14111G =
      null;

    var endedCard =
      dragCard;

    dragCard =
      null;

    if (
      dragSnapshot.length
    ) {
      restoreSortOrder(
        sortKind,
        dragSnapshot
      );

      animateSortFlip(
        cancelBeforeRects,
        sortKind
      );
    }

    endedCard.classList.remove(
      'is-dragging',
      'is-drag-over'
    );

    if (sortMode) {
      syncExplicitJiggle();
    }
  });

  document.addEventListener('input', function (event) {
    var node = manager();
    if (event.target.matches('[data-pmd-menu-search]') && node && node.contains(event.target)) {
      if (sortMode) return;
      filterState.search = event.target.value || '';
      applyFilters();
      return;
    }

    if (event.target.matches('[data-pmd-combo-qty-input]')) {
      var row = event.target.closest('[data-pmd-combo-draft-row]');
      var id = Number(row && row.getAttribute('data-pmd-combo-draft-row') || 0);
      var entry = comboDraftItems.find(function (candidate) { return candidate.menu_id === id; });
      if (!entry) return;
      var quantity = Math.max(1, Math.min(99, Number(event.target.value || 1) || 1));
      entry.quantity = quantity;
      renderComboDerivedProfile();
    }
  });

  document.addEventListener('change', function (event) {
    if (!event.target.matches('[data-pmd-combo-qty-input]')) return;
    var value = Math.max(1, Math.min(99, Number(event.target.value || 1) || 1));
    event.target.value = String(value);
    var row = event.target.closest('[data-pmd-combo-draft-row]');
    var id = Number(row && row.getAttribute('data-pmd-combo-draft-row') || 0);
    var entry = comboDraftItems.find(function (candidate) { return candidate.menu_id === id; });
    if (entry) entry.quantity = value;
    renderComboDerivedProfile();
  });

  if (comboImageInput) {
    comboImageInput.addEventListener('change', function () {
      if (comboPreviewObjectUrl) {
        URL.revokeObjectURL(comboPreviewObjectUrl);
        comboPreviewObjectUrl = null;
      }
      var file = comboImageInput.files && comboImageInput.files[0];
      if (!file) {
        renderComboDerivedProfile();
        return;
      }
      comboPreviewObjectUrl = URL.createObjectURL(file);
      renderComboDerivedProfile();
    });
  }

  if (imageInput) {
    imageInput.addEventListener('change', function () {
      clearPreviewObjectUrl();
      var file = imageInput.files && imageInput.files[0];
      if (!file) return;
      previewObjectUrl = URL.createObjectURL(file);
      if (imagePreviewBox) imagePreviewBox.classList.remove('has-image');
      imagePreview.style.removeProperty('display');
      imagePreview.src = previewObjectUrl;
      imagePreview.hidden = false;
    });
  }

  if (saveButton) saveButton.addEventListener('click', saveCurrent);
  if (foodForm) foodForm.addEventListener('submit', function (event) { event.preventDefault(); saveFood(); });
  if (comboForm) comboForm.addEventListener('submit', function (event) { event.preventDefault(); saveCombo(); });
  if (categoryForm) categoryForm.addEventListener('submit', function (event) { event.preventDefault(); saveCategory(); });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
      return;
    }
    if (event.key === 'Escape' && isComboBuilder()) cancelComboBuilder(true);
  });

  installNotificationOnce();
  wireCardImages(root);
  updateHeaderState();
  syncSortMode();

  (function openFromRedirect() {
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('pmd_mode');
    var id = params.get('pmd_id');
    if (mode === 'create') openFoodCreate(null);
    if (mode === 'edit' && id) openFoodEdit(id, null);
    if (mode) history.replaceState(null, '', window.location.pathname + window.location.hash);
  })();

  window.PMDMenuManagerV1 = {
    ready: true,
    version: '1.2.9-delete-actions',
    route: '/admin/pmdmenus',
    headerContract: 'DashboardLab/ReservationsLab 64px + 46px actions',
    singleHeaderGlyphPerAction: true,
    canonicalFirstPaintShell: true,
    nativeHeaderHiddenBeforePaint: true,
    canonicalBackground: '#f8fbfd',
    kpiCards: ['menu-items', 'categories', 'stock-out', 'disabled'],
    noInitialPageAnimation: true,
    imageAuthority: 'route-scoped full-cover',
    multiCategory: true,
    categoryPillOnlyInAllFoods: true,
    publishedToggle: false,
    missingImageFallbackRequest: false,
    comboSchemaSafeStockDefault: true,
    dietarySelectors: ['halal', 'vegetarian', 'vegan'],
    allergenSelectors: true,
    allergenSpecificIcons: true,
    nutritionFields: ['calories', 'serving_size', 'protein', 'carbs', 'fat', 'sugar', 'prep_time_minutes'],
    combosAsSyntheticCategory: true,
    separateComboView: false,
    comboBuilder: Boolean(root.dataset.pmdCanManageCombos === '1'),
    comboCustomImageOrAutoCover: true,
    comboCoverFromSelectedFoods: true,
    comboDerivedDietAndAllergens: true,
    comboDerivedNutrition: true,
    tableFeatureSelectorLanguage: true,
    samePageCreateEdit: true,
    directStockToggle: true,
    dragDropOrdering: true,
    reorderAuthority: 'menu_priority / combo_priority / category priority',
    frontendMenuOrdering: true,
    iosEditJiggle: true,
    jiggleOverridesStaticFirstPaintReset: true,
    smoothFlipReorder: true,
    reorderAnimationMs: 230,
    dragImageAnchoredToPointer: true,
    categoryCreateSamePage: true,
    categoryDragDropOrdering: true,
    categoryOrderAuthority: 'categories.priority via Menus::onSaveCategoryOrder',
    explicitInlineJiggle: true,
    gentleJiggle: true,
    jiggleCycleMs: [520, 570],
    jiggleStartsImmediatelyOnEditMode: true,
    sameCardDeleteActions: true,
    deleteRequiresSecondClick: true,
    jiggleUsesIndividualRotateProperty: true,
    webkitEditModeRestartFrame: true,
    cacheBustedAssetAuthority: 'pmd-menu-manager-v128.js',
    dropSettleAnimation: false,
    nativeDropFinalSlotV14111G: true,
    cardOverlapSwapRatioV14111G: 0.60,
    cardOverlapUnlockRatioV14111G: 0.35,
    serverRenderedEnDeTranslations: true,
    modalPortal: modal.parentElement === document.body,
    oneModalAuthority: true,
    backdropBlurPx: 8,
    backgroundScrollLock: 'fixed-position-restore',
    ajaxSave: true,
    partialRefresh: true,
    noPolling: true,
    noMutationObserver: true,
    noResizeObserver: true,
    noLayoutRepairTimer: true
  };

  console.info('[PMD Menu Manager V1.2.9] Ready', window.PMDMenuManagerV1);

  // PMD_MENU_NATIVE_GHOST_SINGLE_VISUAL_V140_2

  /*
   * PMD V140.2
   *
   * V138 remains sole drag/reorder authority.
   *
   * Browser creates the native Card drag representation.
   * On the first subsequent native drag event, the source
   * Card contents are hidden while its Grid footprint stays.
   *
   * No custom Card drag-image call.
   * No clone.
   * No proxy.
   * No Pointer engine.
   */

  var pmdNativeSourceV1402 =
    null;


  function pmdClearNativeSourceV1402(
    card
  ) {
    if (!card) return;

    card.classList.remove(
      'is-pmd-drag-source-quiet-v1402'
    );
  }


  function pmdClearAllNativeSourcesV1402() {
    var node =
      manager();

    if (!node) {
      pmdNativeSourceV1402 =
        null;

      return;
    }

    node.querySelectorAll(
      '.is-pmd-drag-source-quiet-v1402'
    ).forEach(
      function (card) {
        pmdClearNativeSourceV1402(
          card
        );
      }
    );

    pmdNativeSourceV1402 =
      null;
  }


  document.addEventListener(
    'dragstart',
    function (event) {
      if (!sortMode) return;

      var node =
        manager();

      if (!node) return;

      /*
       * Category pills retain their existing authority.
       */
      if (
        event.target.closest(
          '[data-pmd-category-sortable]'
        )
      ) {
        return;
      }

      var card =
        event.target.closest(
          '[data-pmd-menu-card].is-sortable'
        );

      if (
        !card
        || !node.contains(card)
      ) {
        return;
      }

      /*
       * Do not visually modify Card during dragstart.
       * Safari first captures its native moving image.
       */
      pmdNativeSourceV1402 =
        card;
    }
  );


  document.addEventListener(
    'drag',
    function () {
      var card =
        pmdNativeSourceV1402;

      if (!card) return;

      /*
       * Native moving representation already exists now.
       */
      if (
        !card.classList.contains(
          'is-pmd-drag-source-quiet-v1402'
        )
      ) {
        card.classList.add(
          'is-pmd-drag-source-quiet-v1402'
        );
      }
    }
  );


  /*
   * PMD_MENU_GHOST_EXIT_HANDOFF_V141_11I
   *
   * During a committed Card Drop, settleSortCard() owns the
   * source reveal.
   *
   * Keep that one source quiet through BOTH drop and dragend
   * so Safari can fully retire its native drag representation
   * before the real Card is revealed.
   *
   * Cancelled drags and all non-settling sources still clear
   * immediately.
   */
  function pmdClearNativeSourcesExceptSettlingV14111I() {
    var node =
      manager();


    if (!node) {
      pmdNativeSourceV1402 =
        null;

      return;
    }


    var retained =
      null;


    node.querySelectorAll(
      '.is-pmd-drag-source-quiet-v1402'
    ).forEach(
      function (card) {
        if (
          card.classList.contains(
            'is-drop-settling'
          )
        ) {
          retained =
            card;

          return;
        }


        pmdClearNativeSourceV1402(
          card
        );
      }
    );


    pmdNativeSourceV1402 =
      retained;
  }


  document.addEventListener(
    'drop',
    function () {
      pmdClearNativeSourcesExceptSettlingV14111I();
    }
  );


  document.addEventListener(
    'dragend',
    function () {
      pmdClearNativeSourcesExceptSettlingV14111I();
    }
  );



})();
