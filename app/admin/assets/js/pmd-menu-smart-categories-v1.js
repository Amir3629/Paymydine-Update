(function () {
  'use strict';

  // PMD_MENU_SMART_CATEGORY_CLEAN_UI_AND_SELECTION_V1_3
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

      if (!button.querySelector('[data-pmd-smart-category-edit]')) {
        var edit = document.createElement('span');
        edit.className = 'pmd-smart-category-edit-hit';
        edit.setAttribute('data-pmd-smart-category-edit', String(category.id));
        edit.setAttribute('title', t.editTitle);
        edit.setAttribute('aria-label', t.editTitle);
        edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4z"></path><path d="m13.5 6.5 4 4"></path></svg>';
        button.appendChild(edit);
      }
    });

    rebuildCardCategoryMembership();
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

  function keepSmartConfirmEnabled() {
    if (!smartSelectionCategory || !isSelectionShell() || smartSelectionBusy) return;
    var primary = headerControls().primary;
    if (primary) primary.disabled = false;
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
    renderActionCard();
  }

  function startCombinationFromCategory() {
    if (isSelectionShell()) return;

    var controls = headerControls();
    if (!state || !state.can_manage_combos || !controls.secondary) {
      window.alert(t.comboUnavailable);
      return;
    }

    controls.secondary.click();
    if (isSelectionShell()) moveSelectionShellToAllFoods();
  }

  function preselectSmartFoods() {
    if (!smartSelectionCategory || !isSelectionShell()) return;

    var wanted = new Set(((state.selections || {})[smartSelectionCategory.kind] || []).map(Number));

    root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]').forEach(function (card) {
      var id = Number(card.dataset.menuId || 0);
      if (id && wanted.has(id) && !card.classList.contains('is-combo-selected')) card.click();
    });

    keepSmartConfirmEnabled();
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
    requestAnimationFrame(renderActionCard);
  }

  async function saveSmartSelection() {
    if (!smartSelectionCategory || smartSelectionBusy || !isSelectionShell()) return;

    var category = smartSelectionCategory;
    var controls = headerControls();
    var ids = Array.from(root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"].is-combo-selected'))
      .map(function (card) { return Number(card.dataset.menuId || 0); })
      .filter(Boolean);

    smartSelectionBusy = true;
    if (controls.primary) controls.primary.disabled = true;
    if (controls.secondary) controls.secondary.disabled = true;

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
      window.alert(error && error.message ? error.message : t.selectionFailed);
    }
  }

  function cardGrid() {
    var first = root.querySelector('[data-pmd-menu-card]');
    return first ? first.parentElement : root.querySelector('.pmd-menu-manager__grid');
  }

  function actionCopy(category) {
    if (!category) return null;
    if (category.kind === 'chef') return {title: t.addChef, help: t.addHelpChef};
    if (category.kind === 'bestseller') return {title: t.addBest, help: t.addHelpBest};
    if (category.kind === 'combos') return {title: t.addCombo, help: t.addHelpCombo};
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
      + '<span class="pmd-smart-add-card__plus" aria-hidden="true">+</span>'
      + '<span class="pmd-smart-add-card__copy"><strong data-pmd-smart-add-title></strong><small data-pmd-smart-add-help></small></span>';

    grid.insertBefore(actionCard, grid.firstChild || null);

    function activate() {
      var category = categoryById(activeFilterId);
      if (!category) return;
      if (category.kind === 'chef' || category.kind === 'bestseller') startSmartSelection(category);
      else if (category.kind === 'combos') startCombinationFromCategory();
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

  function renderActionCard() {
    var card = ensureActionCard();
    if (!card) return;

    if (isSelectionShell()) {
      card.hidden = true;
      return;
    }

    var category = categoryById(activeFilterId);
    var content = actionCopy(category);

    if (!category || !content || (category.kind === 'combos' && !state.can_manage_combos)) {
      card.hidden = true;
      return;
    }

    card.querySelector('[data-pmd-smart-add-title]').textContent = content.title;
    card.querySelector('[data-pmd-smart-add-help]').textContent = content.help;
    card.hidden = false;
  }

  function inferActiveFilter() {
    var active = root.querySelector('[data-pmd-category-id].is-active');
    activeFilterId = active ? Number(active.getAttribute('data-pmd-category-id') || 0) : null;
    renderActionCard();
  }

  async function deleteSpecial(category) {
    if (!category || category.kind === 'regular' || busy || !window.confirm(t.deleteConfirm)) return;

    var data = new FormData();
    data.append('category_id', String(category.id));

    try {
      busy = true;
      await backend('onDelete', data);
      window.location.reload();
    } catch (error) {
      busy = false;
      window.alert(error && error.message ? error.message : t.deleteFailed);
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

      var add = event.target.closest('[data-pmd-category-create]');
      if (add && root.contains(add) && state) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openModal(null, add);
        return;
      }

      var edit = event.target.closest('[data-pmd-smart-category-edit]');
      if (edit && root.contains(edit) && state) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var editCategory = categoryById(edit.getAttribute('data-pmd-smart-category-edit'));
        if (editCategory) openModal(editCategory, edit);
        return;
      }

      var deleteHit = event.target.closest('[data-pmd-category-delete]');
      if (deleteHit && root.contains(deleteHit) && state) {
        var deleteCategory = categoryById(deleteHit.getAttribute('data-pmd-category-delete'));
        if (deleteCategory && deleteCategory.kind !== 'regular') {
          event.preventDefault();
          event.stopImmediatePropagation();
          deleteSpecial(deleteCategory);
          return;
        }
      }

      var categoryButton = event.target.closest('[data-pmd-category-id]');
      if (categoryButton && root.contains(categoryButton) && !event.target.closest('[data-pmd-smart-category-edit]')) {
        activeFilterId = Number(categoryButton.getAttribute('data-pmd-category-id') || 0) || null;
        requestAnimationFrame(renderActionCard);
        return;
      }

      var otherFilter = event.target.closest('[data-pmd-category-filter]');
      if (otherFilter && root.contains(otherFilter) && !otherFilter.hasAttribute('data-pmd-category-id')) {
        activeFilterId = null;
        requestAnimationFrame(renderActionCard);
      }
    }, true);

    // The existing Combo shell normally requires two selected foods. Chef and
    // Bestseller membership legitimately allow zero/one item, so after the
    // canonical card-selection handler updates its count, keep Confirm enabled
    // only for smart-selection mode. No observer/poller is introduced.
    document.addEventListener('click', function (event) {
      if (!smartSelectionCategory || !isSelectionShell()) return;
      var card = event.target.closest('[data-pmd-menu-card][data-item-type="food"]');
      if (card && root.contains(card)) requestAnimationFrame(keepSmartConfirmEnabled);
    }, false);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;

      if (modal && !modal.hidden) {
        event.preventDefault();
        closeModal();
        return;
      }

      if (smartSelectionCategory && isSelectionShell()) {
        var cancelled = smartSelectionCategory;
        cleanupSmartSelection(cancelled);
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
        version: '1.3-clean-ui-all-foods-selection',
        categories: state.categories || [],
        selections: state.selections || {},
        canManageCombos: Boolean(state.can_manage_combos),
        refresh: load
      };

      console.info('[PMD Menu Smart Categories V1.3] Ready', window.PMDMenuSmartCategoriesV1);
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
