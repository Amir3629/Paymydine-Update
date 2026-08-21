(function () {
  'use strict';

  // PMD_MENU_SMART_CATEGORY_CLEAN_UI_AND_SELECTION_V1_3
  // PMD_MENU_SMART_CONTEXT_ACTION_V1_4
  // PMD_MENU_HEADER_ACTION_CARD_AUTHORITY_V1_5
  // PMD_MENU_ALL_FOODS_CATEGORY_ORDER_AND_CATEGORY_MODAL_V1_6
  // PMD_MENU_CATEGORY_EDIT_BADGE_AND_CLEAN_TOOLBAR_V1_6_2
  //
  // Category creation owns only name + optional special purpose.
  // A normal category is the implicit default, so there is no Regular button.
  // Chef/Bestseller membership and Combination composition continue to reuse
  // the proven All Foods selection shell. No second card-selection authority.

  var root = document.querySelector('[data-pmd-menu-manager]');
  if (!root) return;

  var state = null;
  var loading = false;
  var busy = false;
  var modal = null;
  var activeCategory = null;
  var activeKind = 'regular';
  var activeFilterId = null;
  var actionCard = null;
  var lastTrigger = null;
  var smartSelectionCategory = null;
  var smartSelectionBusy = false;
  var combinationSelectionCategory = null;

  var copy = {
    en: {
      eyebrow: 'Menu categories',
      createTitle: 'Create category',
      editTitle: 'Edit category',
      name: 'Category name',
      nameHelp: 'Name the category exactly as guests should see it.',
      type: 'Category purpose',
      typeHelp: 'Normal category is the default. Choose a special purpose only when you need one.',
      chef: "Chef's recommendation",
      bestseller: 'Bestsellers',
      combos: 'Combinations',
      locked: 'Category purpose is locked after creation. Name and order stay editable.',
      alreadyExists: 'Already created',
      defaultChef: "Chef's Recommendations",
      defaultBest: 'Bestsellers',
      defaultCombos: 'Combinations',
      addChef: 'Add chef recommendation',
      addBest: 'Add bestseller',
      addCombo: 'Add combination',
      addHelpChef: 'Choose foods from All Foods.',
      addHelpBest: 'Choose foods from All Foods.',
      addHelpCombo: 'Build a combination from All Foods.',
      addFood: 'Add new food item',
      addFoodHelp: 'Create a new food item.',
      addFoodHelpCategory: 'Create a new food item in {category}.',
      selectFoods: 'Select foods',
      selectFoodsHelp: 'Choose one or more foods, then add the selection.',
      addSelected: 'Add selected',
      addingSelected: 'Adding selected...',
      selectedCount: '{count} selected - add to {category}',
      selectComboFoodsHelp: 'Choose at least 2 foods, then build the combination.',
      buildCombination: 'Build combination',
      comboSelectedCount: '{count} selected - continue to combination details',
      removeCategory: 'Remove category',
      editCategory: 'Edit category',
      removingCategory: 'Removing...',
      removeConfirm: 'Remove \"{name}\"? Foods and combinations will stay in the menu. Only this category will be removed.',
      allFoodsSortHint: '',
      cancel: 'Cancel',
      save: 'Save category',
      saving: 'Saving...',
      saved: 'Saved',
      saveFailed: 'Category could not be saved.',
      selectionFailed: 'Selection could not be saved.',
      selectionUnavailable: 'All Foods selection is not available for this account yet.',
      comboUnavailable: 'Combination tools are not available for this account yet.',
      deleteConfirm: 'Delete this special category? Foods and combinations will not be deleted.',
      deleteFailed: 'Category could not be deleted.',
      loadFailed: 'Smart category data could not be loaded.'
    },
    de: {
      eyebrow: 'Menukategorien',
      createTitle: 'Kategorie erstellen',
      editTitle: 'Kategorie bearbeiten',
      name: 'Kategoriename',
      nameHelp: 'Der Name wird Gasten genau so angezeigt.',
      type: 'Kategoriezweck',
      typeHelp: 'Eine normale Kategorie ist der Standard. Wahle nur bei Bedarf einen speziellen Zweck.',
      chef: 'Empfehlung des Kuchenchefs',
      bestseller: 'Bestseller',
      combos: 'Kombinationen',
      locked: 'Der Kategoriezweck ist nach dem Erstellen gesperrt. Name und Reihenfolge bleiben bearbeitbar.',
      alreadyExists: 'Bereits erstellt',
      defaultChef: 'Empfehlungen des Kuchenchefs',
      defaultBest: 'Bestseller',
      defaultCombos: 'Kombinationen',
      addChef: 'Chef-Empfehlung hinzufugen',
      addBest: 'Bestseller hinzufugen',
      addCombo: 'Kombination hinzufugen',
      addHelpChef: 'Speisen aus Alle Speisen auswahlen.',
      addHelpBest: 'Speisen aus Alle Speisen auswahlen.',
      addHelpCombo: 'Eine Kombination aus Alle Speisen erstellen.',
      addFood: 'Neue Speise hinzufugen',
      addFoodHelp: 'Erstelle eine neue Speise.',
      addFoodHelpCategory: 'Erstelle eine neue Speise in {category}.',
      selectFoods: 'Speisen auswahlen',
      selectFoodsHelp: 'Wahle eine oder mehrere Speisen und fuge die Auswahl hinzu.',
      addSelected: 'Auswahl hinzufugen',
      addingSelected: 'Auswahl wird hinzugefugt...',
      selectedCount: '{count} ausgewahlt - zu {category} hinzufugen',
      selectComboFoodsHelp: 'Wahle mindestens 2 Speisen und erstelle danach die Kombination.',
      buildCombination: 'Kombination erstellen',
      comboSelectedCount: '{count} ausgewahlt - weiter zu den Kombinationsdetails',
      removeCategory: 'Kategorie entfernen',
      editCategory: 'Kategorie bearbeiten',
      removingCategory: 'Wird entfernt...',
      removeConfirm: 'Kategorie \"{name}\" entfernen? Speisen und Kombinationen bleiben erhalten. Nur diese Kategorie wird entfernt.',
      allFoodsSortHint: '',
      cancel: 'Abbrechen',
      save: 'Kategorie speichern',
      saving: 'Speichern...',
      saved: 'Gespeichert',
      saveFailed: 'Kategorie konnte nicht gespeichert werden.',
      selectionFailed: 'Auswahl konnte nicht gespeichert werden.',
      selectionUnavailable: 'Die Auswahl Alle Speisen ist fur dieses Konto noch nicht verfugbar.',
      comboUnavailable: 'Kombinationswerkzeuge sind fur dieses Konto noch nicht verfugbar.',
      deleteConfirm: 'Diese spezielle Kategorie loschen? Speisen und Kombinationen werden nicht geloscht.',
      deleteFailed: 'Kategorie konnte nicht geloscht werden.',
      loadFailed: 'Smart-Kategoriedaten konnten nicht geladen werden.'
    }
  };

  var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
  var locale = String((localeMatch && localeMatch[1]) || document.documentElement.lang || 'en').toLowerCase();
  var t = copy[locale.indexOf('de') === 0 ? 'de' : 'en'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csrf(data) {
    if (data.has('_token')) return;
    var meta = document.querySelector('meta[name="csrf-token"]');
    var hidden = document.querySelector('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) data.append('_token', token);
  }

  async function backend(handler, data) {
    data = data || new FormData();
    csrf(data);

    var response = await fetch('/admin/pmdsmartcategories', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-IGNITER-REQUEST-HANDLER': handler,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: data
    });

    var raw = await response.text();
    var payload = {};

    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      payload = {message: raw || 'Request failed.'};
    }

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || ('Request failed (' + response.status + ')'));
    }

    return payload;
  }

  function categoryById(id) {
    var wanted = Number(id || 0);
    return state && (state.categories || []).find(function (category) {
      return Number(category.id) === wanted;
    }) || null;
  }

  function specialByKind(kind) {
    return state && (state.categories || []).find(function (category) {
      return category.kind === kind;
    }) || null;
  }

  function kindLabel(kind) {
    if (kind === 'chef') return t.chef;
    if (kind === 'bestseller') return t.bestseller;
    if (kind === 'combos') return t.combos;
    return '';
  }

  function preserveSelection(data, kind) {
    if (kind !== 'chef' && kind !== 'bestseller') return;

    ((state.selections || {})[kind] || []).forEach(function (id) {
      data.append('menu_ids[]', String(id));
    });
  }

  function rebuildCardCategoryMembership() {
    if (!state) return;

    var chef = specialByKind('chef');
    var bestseller = specialByKind('bestseller');
    var combos = specialByKind('combos');
    var chefIds = new Set(((state.selections || {}).chef || []).map(Number));
    var bestIds = new Set(((state.selections || {}).bestseller || []).map(Number));

    root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]').forEach(function (card) {
      if (!card.dataset.pmdSmartBaseCategoryIds) {
        card.dataset.pmdSmartBaseCategoryIds = card.getAttribute('data-category-ids') || '';
      }

      var ids = String(card.dataset.pmdSmartBaseCategoryIds || '')
        .split(',')
        .map(function (value) { return value.trim(); })
        .filter(Boolean);

      var menuId = Number(card.dataset.menuId || 0);
      if (chef && chefIds.has(menuId)) ids.push(String(chef.id));
      if (bestseller && bestIds.has(menuId)) ids.push(String(bestseller.id));

      card.setAttribute('data-category-ids', Array.from(new Set(ids)).join(','));
    });

    var syntheticCombo = root.querySelector('[data-pmd-category-filter="combos"][data-pmd-category-fixed]');

    if (combos) {
      if (syntheticCombo) syntheticCombo.hidden = true;

      root.querySelectorAll('[data-pmd-menu-card][data-item-type="combo"]').forEach(function (card) {
        card.setAttribute('data-category-ids', String(combos.id));
        var badge = card.querySelector('.pmd-menu-card__category');
        if (badge) badge.textContent = combos.name;
      });
    } else if (syntheticCombo) {
      syntheticCombo.hidden = false;
    }
  }

  function installCategoryMetadata() {
    if (!state) return;

    (state.categories || []).forEach(function (category) {
      var button = root.querySelector('[data-pmd-category-id="' + String(category.id) + '"]');
      if (!button) return;

      button.removeAttribute('data-pmd-smart-kind');
      button.setAttribute('data-pmd-smart-editable-category', '1');

      /*
       * PMD V1.6:
       * Category destructive/edit affordance belongs to the category modal.
       * Do not leave a minus or pencil inside the draggable category strip.
       */
      button.querySelectorAll(
        '[data-pmd-category-delete], [data-pmd-smart-category-edit], [data-pmd-smart-category-edit-badge]'
      ).forEach(function (control) {
        control.remove();
      });

      var editBadge = document.createElement('span');
      editBadge.setAttribute('data-pmd-smart-category-edit-badge', '1');
      editBadge.setAttribute('draggable', 'false');
      editBadge.setAttribute('title', t.editCategory + ': ' + category.name);
      editBadge.setAttribute('aria-hidden', 'true');
      editBadge.innerHTML = ''
        + '<svg viewBox="0 0 24 24" aria-hidden="true">'
        + '<path d="M12 20h9"></path>'
        + '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
        + '</svg>';
      button.appendChild(editBadge);
    });

    rebuildCardCategoryMembership();
    requestAnimationFrame(reorderAllFoodsCardsByCategoryOrder);
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'pmd-smart-category-modal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = ''
      + '<div class="pmd-smart-category-modal__backdrop" data-pmd-smart-close></div>'
      + '<section class="pmd-smart-category-modal__card" role="dialog" aria-modal="true" aria-labelledby="pmd-smart-category-title">'
      + '  <header class="pmd-smart-category-modal__header">'
      + '    <div class="pmd-smart-category-modal__heading"><span>' + escapeHtml(t.eyebrow) + '</span><h2 id="pmd-smart-category-title"></h2></div>'
      + '    <button type="button" class="pmd-smart-category-modal__close" data-pmd-smart-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'
      + '  </header>'
      + '  <div class="pmd-smart-category-modal__body">'
      + '    <label class="pmd-smart-field"><span>' + escapeHtml(t.name) + '</span><input type="text" maxlength="128" minlength="2" required data-pmd-smart-name><small>' + escapeHtml(t.nameHelp) + '</small></label>'
      + '    <section class="pmd-smart-section">'
      + '      <div class="pmd-smart-section__head"><strong>' + escapeHtml(t.type) + '</strong><p>' + escapeHtml(t.typeHelp) + '</p></div>'
      + '      <div class="pmd-smart-kind-grid" data-pmd-smart-kinds></div>'
      + '      <p class="pmd-smart-kind-lock" data-pmd-smart-kind-lock hidden>' + escapeHtml(t.locked) + '</p>'
      + '    </section>'
      + '  </div>'
      + '  <footer class="pmd-smart-category-modal__footer">'
      + '    <span class="pmd-smart-status" data-pmd-smart-status aria-live="polite"></span>'
      + '    <button type="button" class="pmd-smart-btn pmd-smart-btn--danger" data-pmd-smart-remove hidden>' + escapeHtml(t.removeCategory) + '</button>'
      + '    <button type="button" class="pmd-smart-btn" data-pmd-smart-close>' + escapeHtml(t.cancel) + '</button>'
      + '    <button type="button" class="pmd-smart-btn pmd-smart-btn--primary" data-pmd-smart-save>' + escapeHtml(t.save) + '</button>'
      + '  </footer>'
      + '</section>';

    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      var close = event.target.closest('[data-pmd-smart-close]');
      if (close) {
        event.preventDefault();
        closeModal();
        return;
      }

      var kind = event.target.closest('[data-pmd-smart-kind]');
      if (kind && kind.getAttribute('aria-disabled') !== 'true') {
        event.preventDefault();
        chooseKind(kind.getAttribute('data-pmd-smart-kind') || 'regular');
        return;
      }

      var remove = event.target.closest('[data-pmd-smart-remove]');
      if (remove) {
        event.preventDefault();
        removeCategory(activeCategory);
        return;
      }

      var save = event.target.closest('[data-pmd-smart-save]');
      if (save) {
        event.preventDefault();
        saveCategory();
      }
    });

    modal.addEventListener('keydown', function (event) {
      var kind = event.target.closest && event.target.closest('[data-pmd-smart-kind]');
      if (!kind || kind.getAttribute('aria-disabled') === 'true') return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      chooseKind(kind.getAttribute('data-pmd-smart-kind') || 'regular');
    });

    return modal;
  }

  function renderKinds() {
    var host = ensureModal().querySelector('[data-pmd-smart-kinds]');
    var editing = Boolean(activeCategory && activeCategory.id);

    if (editing) {
      host.classList.add('is-readonly');
      host.innerHTML = '<div class="pmd-smart-kind-readonly"><span class="pmd-smart-kind__mark" aria-hidden="true"></span><strong>'
        + escapeHtml(kindLabel(activeCategory.kind) || 'Normal category')
        + '</strong></div>';
    } else {
      host.classList.remove('is-readonly');

      var kinds = [
        ['chef', t.chef],
        ['bestseller', t.bestseller],
        ['combos', t.combos]
      ];

      host.innerHTML = kinds.map(function (entry) {
        var existing = specialByKind(entry[0]);
        var unavailable = Boolean(existing) || (entry[0] === 'combos' && state && !state.can_manage_combos);
        var active = activeKind === entry[0];
        var label = entry[1];

        if (existing) label += ' - ' + t.alreadyExists;

        return '<div role="button" tabindex="' + (unavailable ? '-1' : '0') + '" class="pmd-smart-kind '
          + (active ? 'is-active ' : '')
          + (unavailable ? 'is-disabled' : '')
          + '" data-pmd-smart-kind="' + entry[0]
          + '" aria-pressed="' + (active ? 'true' : 'false')
          + '" aria-disabled="' + (unavailable ? 'true' : 'false') + '">'
          + '<span class="pmd-smart-kind__mark" aria-hidden="true"></span>'
          + '<strong>' + escapeHtml(label) + '</strong>'
          + '</div>';
      }).join('');
    }

    var lock = modal.querySelector('[data-pmd-smart-kind-lock]');
    if (lock) lock.hidden = !editing;
  }

  function chooseKind(kind) {
    if (activeCategory) return;
    if (['chef', 'bestseller', 'combos'].indexOf(kind) === -1) kind = 'regular';

    var previous = activeKind;
    activeKind = previous === kind && kind !== 'regular' ? 'regular' : kind;

    var input = modal.querySelector('[data-pmd-smart-name]');
    var current = input.value.trim();
    var defaults = ['', t.defaultChef, t.defaultBest, t.defaultCombos];

    if (defaults.indexOf(current) !== -1) {
      if (activeKind === 'chef') input.value = t.defaultChef;
      else if (activeKind === 'bestseller') input.value = t.defaultBest;
      else if (activeKind === 'combos') input.value = t.defaultCombos;
      else input.value = '';
    }

    renderKinds();
  }

  function setStatus(message, type) {
    if (!modal) return;
    var node = modal.querySelector('[data-pmd-smart-status]');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', type === 'error');
    node.classList.toggle('is-ok', type === 'ok');
  }

  function setBusy(next) {
    busy = Boolean(next);
    if (!modal) return;

    var name = modal.querySelector('[data-pmd-smart-name]');
    if (name) name.disabled = busy;

    modal.querySelectorAll('[data-pmd-smart-close]').forEach(function (node) {
      node.disabled = busy;
    });

    var remove = modal.querySelector('[data-pmd-smart-remove]');
    if (remove) remove.disabled = busy;

    var save = modal.querySelector('[data-pmd-smart-save]');
    if (save) {
      save.disabled = busy;
      save.textContent = busy ? t.saving : t.save;
    }

    if (!busy) renderKinds();
  }

  function openModal(category, trigger) {
    if (!state) return;

    ensureModal();
    activeCategory = category || null;
    activeKind = category ? category.kind : 'regular';
    lastTrigger = trigger || null;

    modal.querySelector('#pmd-smart-category-title').textContent = category ? t.editTitle : t.createTitle;
    modal.querySelector('[data-pmd-smart-name]').value = category ? category.name : '';

    var remove = modal.querySelector('[data-pmd-smart-remove]');
    if (remove) remove.hidden = !category;

    setStatus('');
    renderKinds();

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-menu-manager-modal-open');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      modal.querySelector('[data-pmd-smart-name]').focus();
    });
  }

  function closeModal() {
    if (!modal || modal.hidden || busy) return;

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pmd-menu-manager-modal-open');
    document.body.style.removeProperty('overflow');

    activeCategory = null;
    activeKind = 'regular';
    setStatus('');

    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  async function saveCategory() {
    if (busy || !state) return;

    var input = ensureModal().querySelector('[data-pmd-smart-name]');
    var name = input.value.trim();
    if (name.length < 2) {
      input.focus();
      return;
    }

    var data = new FormData();
    if (activeCategory) data.append('category_id', String(activeCategory.id));
    data.append('name', name);
    data.append('kind', activeKind);
    preserveSelection(data, activeKind);

    setBusy(true);
    setStatus(t.saving);

    try {
      await backend('onSave', data);
      setStatus(t.saved, 'ok');
      window.location.reload();
    } catch (error) {
      setStatus(error && error.message ? error.message : t.saveFailed, 'error');
      setBusy(false);
    }
  }

  function isSelectionShell() {
    return root.dataset.pmdComboBuilder === '1';
  }

  function headerControls() {
    return {
      primary: root.querySelector('[data-pmd-menu-header-primary]'),
      secondary: root.querySelector('[data-pmd-menu-header-secondary]')
    };
  }

  function selectedSmartFoodIds() {
    return Array.from(root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"].is-combo-selected'))
      .map(function (card) { return Number(card.dataset.menuId || 0); })
      .filter(Boolean);
  }

  function keepSmartConfirmEnabled() {
    if (!smartSelectionCategory || !isSelectionShell() || smartSelectionBusy) return;
    var primary = headerControls().primary;
    if (primary) primary.disabled = false;
  }

  function activeFilterSnapshot() {
    var active = root.querySelector('[data-pmd-category-filter].is-active');
    var value = active ? (active.getAttribute('data-pmd-category-filter') || 'all') : 'all';
    var category = active && active.hasAttribute('data-pmd-category-id')
      ? categoryById(active.getAttribute('data-pmd-category-id'))
      : null;

    activeFilterId = category ? Number(category.id) : null;

    return {
      button: active,
      value: value,
      category: category
    };
  }

  function baseCategoryIdsForCard(card) {
    if (!card) return [];

    var raw = card.dataset.pmdSmartBaseCategoryIds;
    if (raw == null || raw === '') {
      raw = card.getAttribute('data-category-ids') || '';
    }

    return String(raw)
      .split(',')
      .map(function (value) { return Number(String(value).trim() || 0); })
      .filter(Boolean);
  }

  function reorderAllFoodsCardsByCategoryOrder() {
    if (isSelectionShell()) return;

    var snapshot = activeFilterSnapshot();
    if (snapshot.value !== 'all') return;

    var grid = cardGrid();
    if (!grid) return;

    var foods = Array.from(
      grid.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]')
    );

    if (foods.length < 2) return;

    var categoryOrder = Array.from(
      root.querySelectorAll('[data-pmd-category-id]')
    ).map(function (button) {
      return Number(button.getAttribute('data-pmd-category-id') || 0);
    }).filter(Boolean);

    var seen = new Set();
    var ordered = [];

    categoryOrder.forEach(function (categoryId) {
      foods.forEach(function (card) {
        var menuId = String(card.dataset.menuId || '');
        if (!menuId || seen.has(menuId)) return;

        if (baseCategoryIdsForCard(card).indexOf(categoryId) === -1) return;

        seen.add(menuId);
        ordered.push(card);
      });
    });

    /* Uncategorized / unmatched foods are always last. */
    foods.forEach(function (card) {
      var menuId = String(card.dataset.menuId || '');
      if (!menuId || seen.has(menuId)) return;
      seen.add(menuId);
      ordered.push(card);
    });

    var comboAnchor = grid.querySelector(
      '[data-pmd-menu-card][data-item-type="combo"]'
    );

    ordered.forEach(function (card) {
      grid.insertBefore(card, comboAnchor || null);
    });
  }

  function syncAllFoodsEditLock() {
    var snapshot = activeFilterSnapshot();
    var sortMode = String(root.getAttribute('data-pmd-sort-mode') || '0');
    var locked = sortMode === 'food'
      && snapshot.value === 'all'
      && !isSelectionShell();

    if (locked) {
      root.setAttribute('data-pmd-smart-all-foods-edit-lock', '1');

      root.querySelectorAll(
        '[data-pmd-menu-card][data-item-type="food"]'
      ).forEach(function (card) {
        card.draggable = false;
        card.classList.remove('is-sortable');
        card.classList.add('is-sort-locked');
      });

      var status = root.querySelector('[data-pmd-menu-sort-status]');
      if (status) status.textContent = '';
      return;
    }

    root.removeAttribute('data-pmd-smart-all-foods-edit-lock');

    if (sortMode === '0' && snapshot.value === 'all') {
      reorderAllFoodsCardsByCategoryOrder();
    }
  }

  function moveSelectionShellToAllFoods() {
    var search = root.querySelector('[data-pmd-menu-search]');
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', {bubbles: true}));
    }

    var stockAll = root.querySelector('[data-pmd-stock-filter="all"]');
    if (stockAll && !stockAll.classList.contains('is-active')) stockAll.click();

    var allFoods = root.querySelector('[data-pmd-category-filter="all"]');
    if (allFoods) allFoods.click();

    activeFilterId = null;
    requestAnimationFrame(renderActionCard);
  }

  function startFoodCreate(category) {
    if (isSelectionShell()) return;

    var controls = headerControls();
    if (!controls.primary) return;

    controls.primary.click();

    if (category && category.kind === 'regular') {
      var menuModal = document.querySelector('[data-pmd-menu-modal]');
      var choice = menuModal && menuModal.querySelector(
        '[data-pmd-menu-category-choice][value="' + String(category.id) + '"]'
      );
      if (choice) choice.checked = true;
    }
  }

  function clearCombinationSelectionContext() {
    combinationSelectionCategory = null;
    root.removeAttribute('data-pmd-smart-combination-selection-category');
  }

  function startCombinationFromCategory(category) {
    if (isSelectionShell()) return;

    var controls = headerControls();
    if (!state || !state.can_manage_combos || !controls.secondary) {
      window.alert(t.comboUnavailable);
      return;
    }

    combinationSelectionCategory = category || specialByKind('combos');
    if (combinationSelectionCategory) {
      root.setAttribute(
        'data-pmd-smart-combination-selection-category',
        String(combinationSelectionCategory.id)
      );
    }

    controls.secondary.click();

    if (!isSelectionShell()) {
      clearCombinationSelectionContext();
      window.alert(t.comboUnavailable);
      return;
    }

    moveSelectionShellToAllFoods();
    requestAnimationFrame(renderActionCard);
  }

  function preselectSmartFoods() {
    if (!smartSelectionCategory || !isSelectionShell()) return;

    var wanted = new Set(((state.selections || {})[smartSelectionCategory.kind] || []).map(Number));

    root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]').forEach(function (card) {
      var id = Number(card.dataset.menuId || 0);
      if (id && wanted.has(id) && !card.classList.contains('is-combo-selected')) card.click();
    });

    keepSmartConfirmEnabled();
    requestAnimationFrame(renderActionCard);
  }

  function startSmartSelection(category) {
    if (!category || (category.kind !== 'chef' && category.kind !== 'bestseller') || smartSelectionBusy || isSelectionShell()) return;

    var controls = headerControls();
    if (!controls.secondary) {
      window.alert(t.selectionUnavailable);
      return;
    }

    smartSelectionCategory = category;
    root.dataset.pmdSmartSelectionKind = category.kind;
    root.dataset.pmdSmartSelectionCategory = String(category.id);

    controls.secondary.click();

    if (!isSelectionShell()) {
      smartSelectionCategory = null;
      root.removeAttribute('data-pmd-smart-selection-kind');
      root.removeAttribute('data-pmd-smart-selection-category');
      window.alert(t.selectionUnavailable);
      return;
    }

    moveSelectionShellToAllFoods();
    keepSmartConfirmEnabled();
    requestAnimationFrame(preselectSmartFoods);
  }

  function cleanupSmartSelection(category) {
    smartSelectionCategory = null;
    smartSelectionBusy = false;
    root.removeAttribute('data-pmd-smart-selection-kind');
    root.removeAttribute('data-pmd-smart-selection-category');
    activeFilterId = category ? Number(category.id) : null;
    requestAnimationFrame(inferActiveFilter);
  }

  async function saveSmartSelection() {
    if (!smartSelectionCategory || smartSelectionBusy || !isSelectionShell()) return;

    var category = smartSelectionCategory;
    var controls = headerControls();
    var ids = selectedSmartFoodIds();

    smartSelectionBusy = true;
    if (controls.primary) controls.primary.disabled = true;
    if (controls.secondary) controls.secondary.disabled = true;
    renderActionCard();

    var data = new FormData();
    data.append('category_id', String(category.id));
    data.append('name', category.name);
    data.append('kind', category.kind);
    ids.forEach(function (id) { data.append('menu_ids[]', String(id)); });

    try {
      await backend('onSave', data);

      if (!state.selections) state.selections = {};
      state.selections[category.kind] = ids;
      rebuildCardCategoryMembership();

      if (controls.secondary) controls.secondary.disabled = false;
      cleanupSmartSelection(category);
      if (controls.secondary && isSelectionShell()) controls.secondary.click();
    } catch (error) {
      smartSelectionBusy = false;
      if (controls.primary) controls.primary.disabled = false;
      if (controls.secondary) controls.secondary.disabled = false;
      renderActionCard();
      window.alert(error && error.message ? error.message : t.selectionFailed);
    }
  }

  function cardGrid() {
    var first = root.querySelector('[data-pmd-menu-card]');
    return first ? first.parentElement : root.querySelector('.pmd-menu-manager__grid');
  }

  function actionCopy(category, filterValue) {
    if (category && category.kind === 'chef') {
      return {action: 'chef', title: t.addChef, help: t.addHelpChef};
    }
    if (category && category.kind === 'bestseller') {
      return {action: 'bestseller', title: t.addBest, help: t.addHelpBest};
    }
    if (category && category.kind === 'combos') {
      return {action: 'combos', title: t.addCombo, help: t.addHelpCombo};
    }

    if (filterValue === 'combos') return null;

    if (!category || category.kind === 'regular') {
      var help = category
        ? t.addFoodHelpCategory.replace('{category}', category.name)
        : t.addFoodHelp;
      return {action: 'food', title: t.addFood, help: help};
    }

    return null;
  }

  function ensureActionCard() {
    if (actionCard && actionCard.isConnected) return actionCard;

    var grid = cardGrid();
    if (!grid) return null;

    actionCard = document.createElement('div');
    actionCard.className = 'pmd-smart-add-card';
    actionCard.hidden = true;
    actionCard.setAttribute('role', 'button');
    actionCard.setAttribute('tabindex', '0');
    actionCard.innerHTML = ''
      + '<span class="pmd-smart-add-card__plus" data-pmd-smart-add-icon aria-hidden="true">+</span>'
      + '<span class="pmd-smart-add-card__copy"><strong data-pmd-smart-add-title></strong><small data-pmd-smart-add-help></small></span>';

    grid.insertBefore(actionCard, grid.firstChild || null);

    function activate() {
      if (smartSelectionCategory && isSelectionShell()) {
        if (smartSelectionBusy || selectedSmartFoodIds().length < 1) return;
        saveSmartSelection();
        return;
      }

      if (combinationSelectionCategory && isSelectionShell()) {
        if (selectedSmartFoodIds().length < 2) return;

        var comboControls = headerControls();
        if (!comboControls.primary || comboControls.primary.disabled) return;

        clearCombinationSelectionContext();
        comboControls.primary.click();
        requestAnimationFrame(renderActionCard);
        return;
      }

      var snapshot = activeFilterSnapshot();
      var category = snapshot.category;

      if (category && (category.kind === 'chef' || category.kind === 'bestseller')) {
        startSmartSelection(category);
      } else if (category && category.kind === 'combos') {
        startCombinationFromCategory(category);
      } else if (snapshot.value !== 'combos') {
        startFoodCreate(category);
      }
    }

    actionCard.addEventListener('click', function (event) {
      event.preventDefault();
      activate();
    });

    actionCard.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });

    return actionCard;
  }

  function setActionIcon(card, kind) {
    var icon = card && card.querySelector('[data-pmd-smart-add-icon]');
    if (!icon) return;

    if (kind === 'check') {
      icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';
      return;
    }

    icon.textContent = '+';
  }

  function renderActionCard() {
    var card = ensureActionCard();
    if (!card) return;

    card.classList.remove('is-smart-selection', 'is-combination-selection', 'is-selection-ready', 'is-selection-empty', 'is-selection-saving');
    card.removeAttribute('aria-busy');
    card.setAttribute('aria-disabled', 'false');
    card.setAttribute('tabindex', '0');

    var sortValue = String(root.getAttribute('data-pmd-sort-mode') || '0');
    if (sortValue !== '0') {
      card.hidden = true;
      return;
    }

    if (isSelectionShell()) {
      var selectedCount = selectedSmartFoodIds().length;

      if (smartSelectionCategory) {
        var ready = selectedCount > 0;

        card.hidden = false;
        card.classList.add('is-smart-selection');
        card.classList.add(ready ? 'is-selection-ready' : 'is-selection-empty');

        if (smartSelectionBusy) {
          card.classList.add('is-selection-saving');
          card.setAttribute('aria-busy', 'true');
        }

        card.setAttribute('aria-disabled', (!ready || smartSelectionBusy) ? 'true' : 'false');
        card.setAttribute('tabindex', (!ready || smartSelectionBusy) ? '-1' : '0');

        card.querySelector('[data-pmd-smart-add-title]').textContent = smartSelectionBusy
          ? t.addingSelected
          : (ready ? t.addSelected : t.selectFoods);

        card.querySelector('[data-pmd-smart-add-help]').textContent = ready
          ? t.selectedCount
              .replace('{count}', String(selectedCount))
              .replace('{category}', smartSelectionCategory.name)
          : t.selectFoodsHelp;

        setActionIcon(card, ready ? 'check' : 'plus');
        return;
      }

      if (combinationSelectionCategory) {
        var comboReady = selectedCount >= 2;

        card.hidden = false;
        card.classList.add('is-smart-selection', 'is-combination-selection');
        card.classList.add(comboReady ? 'is-selection-ready' : 'is-selection-empty');
        card.setAttribute('aria-disabled', comboReady ? 'false' : 'true');
        card.setAttribute('tabindex', comboReady ? '0' : '-1');

        card.querySelector('[data-pmd-smart-add-title]').textContent = comboReady
          ? t.buildCombination
          : t.selectFoods;

        card.querySelector('[data-pmd-smart-add-help]').textContent = comboReady
          ? t.comboSelectedCount.replace('{count}', String(selectedCount))
          : t.selectComboFoodsHelp;

        setActionIcon(card, comboReady ? 'check' : 'plus');
        return;
      }

      card.hidden = true;
      return;
    }

    var snapshot = activeFilterSnapshot();
    var category = snapshot.category;
    var content = actionCopy(category, snapshot.value);

    if (!content || (category && category.kind === 'combos' && !state.can_manage_combos)) {
      card.hidden = true;
      return;
    }

    card.dataset.pmdSmartAction = content.action;
    card.querySelector('[data-pmd-smart-add-title]').textContent = content.title;
    card.querySelector('[data-pmd-smart-add-help]').textContent = content.help;
    setActionIcon(card, 'plus');
    card.hidden = false;
  }

  function inferActiveFilter() {
    activeFilterSnapshot();
    renderActionCard();
  }

  async function removeCategory(category) {
    if (!category || busy) return;

    var message = t.removeConfirm.replace('{name}', category.name || '');
    if (!window.confirm(message)) return;

    var data = new FormData();
    data.append('category_id', String(category.id));

    try {
      setBusy(true);
      setStatus(t.removingCategory);
      await backend('onDelete', data);
      window.location.reload();
    } catch (error) {
      setBusy(false);
      setStatus(error && error.message ? error.message : t.deleteFailed, 'error');
    }
  }

  function wireEvents() {
    document.addEventListener('click', function (event) {
      var primary = event.target.closest('[data-pmd-menu-header-primary]');
      if (primary && root.contains(primary) && smartSelectionCategory && isSelectionShell()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveSmartSelection();
        return;
      }

      var secondary = event.target.closest('[data-pmd-menu-header-secondary]');
      if (secondary && root.contains(secondary) && smartSelectionCategory && isSelectionShell()) {
        var cancelled = smartSelectionCategory;
        cleanupSmartSelection(cancelled);
        return;
      }

      if (secondary && root.contains(secondary) && combinationSelectionCategory && isSelectionShell()) {
        clearCombinationSelectionContext();
        requestAnimationFrame(renderActionCard);
        return;
      }

      var add = event.target.closest('[data-pmd-category-create]');
      if (add && root.contains(add) && state) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openModal(null, add);
        return;
      }

      var categoryEditBadge = event.target.closest(
        '[data-pmd-smart-category-edit-badge]'
      );

      if (categoryEditBadge && root.contains(categoryEditBadge)) {
        var editHost = categoryEditBadge.closest('[data-pmd-category-id]');
        var editCategory = editHost
          ? categoryById(editHost.getAttribute('data-pmd-category-id'))
          : null;
        var editMode = String(root.getAttribute('data-pmd-sort-mode') || '0');

        if (editCategory && editMode !== '0') {
          event.preventDefault();
          event.stopImmediatePropagation();
          openModal(editCategory, editHost);
          return;
        }
      }

      var sortToggle = event.target.closest('[data-pmd-menu-sort-toggle]');
      if (sortToggle && root.contains(sortToggle)) {
        requestAnimationFrame(function () {
          syncAllFoodsEditLock();
          renderActionCard();
        });
        return;
      }

      var categoryFilter = event.target.closest('[data-pmd-category-filter]');
      if (categoryFilter && root.contains(categoryFilter)) {
        var category = categoryFilter.hasAttribute('data-pmd-category-id')
          ? categoryById(categoryFilter.getAttribute('data-pmd-category-id'))
          : null;
        var sortMode = String(root.getAttribute('data-pmd-sort-mode') || '0');

        /*
         * In Edit mode the category card itself becomes Edit Category.
         * Drag still belongs to V129; a normal click opens this modal.
         */
        if (category && sortMode !== '0') {
          /*
           * V1.6.2: the category body remains V129's native drag surface.
           * Edit is explicit and belongs only to the circular pencil badge.
           */
          return;
        }

        requestAnimationFrame(function () {
          inferActiveFilter();
          syncAllFoodsEditLock();
          reorderAllFoodsCardsByCategoryOrder();
        });
      }
    }, true);

    document.addEventListener('dragstart', function (event) {
      var categoryEditBadge = event.target.closest
        ? event.target.closest('[data-pmd-smart-category-edit-badge]')
        : null;

      if (categoryEditBadge && root.contains(categoryEditBadge)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (root.getAttribute('data-pmd-smart-all-foods-edit-lock') !== '1') return;

      var card = event.target.closest(
        '[data-pmd-menu-card][data-item-type="food"]'
      );

      if (!card || !root.contains(card)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    /*
     * Post-V129 bubble phase ownership. V129 is loaded before this file, so its
     * Edit toggle handler has already updated data-pmd-sort-mode when this runs.
     * Lock All Foods food cards in the same click task; no one-frame draggable
     * window and no timer/observer/poller.
     */
    document.addEventListener('click', function (event) {
      var sortToggle = event.target.closest('[data-pmd-menu-sort-toggle]');
      if (!sortToggle || !root.contains(sortToggle)) return;
      syncAllFoodsEditLock();
      renderActionCard();
    }, false);

    // The existing Combo shell remains the single selection authority.
    document.addEventListener('click', function (event) {
      if ((!smartSelectionCategory && !combinationSelectionCategory) || !isSelectionShell()) return;

      var card = event.target.closest('[data-pmd-menu-card][data-item-type="food"]');
      if (!card || !root.contains(card)) return;

      requestAnimationFrame(function () {
        if (smartSelectionCategory) keepSmartConfirmEnabled();
        renderActionCard();
      });
    }, false);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;

      if (modal && !modal.hidden) {
        event.preventDefault();
        closeModal();
        return;
      }

      if (smartSelectionCategory && isSelectionShell()) {
        event.preventDefault();
        var cancelled = smartSelectionCategory;
        var controls = headerControls();
        cleanupSmartSelection(cancelled);
        if (controls.secondary && isSelectionShell()) controls.secondary.click();
        return;
      }

      if (combinationSelectionCategory && isSelectionShell()) {
        event.preventDefault();
        var comboControls = headerControls();
        clearCombinationSelectionContext();
        if (comboControls.secondary && isSelectionShell()) comboControls.secondary.click();
      }
    }, true);
  }

  async function load() {
    if (loading) return;
    loading = true;

    try {
      state = await backend('onBootstrap', new FormData());
      installCategoryMetadata();
      inferActiveFilter();

      window.PMDMenuSmartCategoriesV1 = {
        ready: true,
        version: '1.6.2-edit-badge-clean-toolbar-authority',
        categories: state.categories || [],
        selections: state.selections || {},
        canManageCombos: Boolean(state.can_manage_combos),
        refresh: load
      };

      console.info('[PMD Menu Smart Categories V1.6.2] Ready', window.PMDMenuSmartCategoriesV1);
    } catch (error) {
      console.error('[PMD Menu Smart Categories V1.3]', error);
      var add = root.querySelector('[data-pmd-category-create]');
      if (add) add.title = (error && error.message) || t.loadFailed;
    } finally {
      loading = false;
    }
  }

  wireEvents();
  load();
})();
