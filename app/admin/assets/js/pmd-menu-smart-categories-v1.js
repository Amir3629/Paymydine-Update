(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-menu-manager]');
  if (!root) return;

  var state = null;
  var loading = false;
  var modal = null;
  var activeCategory = null;
  var activeKind = 'regular';
  var selectedIds = new Set();
  var busy = false;
  var lastTrigger = null;

  var copy = {
    en: {
      eyebrow: 'Menu categories',
      createTitle: 'Create category',
      editTitle: 'Edit category',
      name: 'Category name',
      nameHelp: 'Name the category exactly as guests should see it.',
      type: 'Category type',
      typeHelp: 'Choose what this category represents. Type is locked after creation.',
      regular: 'Regular',
      regularHelp: 'Normal menu category',
      chef: "Chef's recommendation",
      chefHelp: 'Curated food selection',
      bestseller: 'Bestsellers',
      bestsellerHelp: 'Manual bestseller selection',
      combos: 'Combinations',
      combosHelp: 'Bundle / combo products',
      locked: 'Category type is locked after creation. You can still rename and reorder it.',
      selectFoods: 'Select foods',
      selectFoodsHelp: 'Choose the foods that belong to this smart category.',
      search: 'Search foods...',
      noFoods: 'No matching published foods.',
      comboTitle: 'Combination foods',
      comboHelp: 'Combination products use the existing PMD combo builder. Create and edit them from this category.',
      noCombos: 'No combinations created yet.',
      createCombo: 'Create combination',
      cancel: 'Cancel',
      save: 'Save category',
      saving: 'Saving...',
      saved: 'Saved',
      deleteConfirm: 'Delete this smart category? Foods and combinations will not be deleted.',
      deleteFailed: 'Category could not be deleted.',
      loadFailed: 'Smart category data could not be loaded.',
      saveFailed: 'Category could not be saved.',
      alreadyExists: 'Already created',
      defaultChef: "Chef's Recommendations",
      defaultBest: 'Bestsellers',
      defaultCombos: 'Combinations'
    },
    de: {
      eyebrow: 'Menükategorien',
      createTitle: 'Kategorie erstellen',
      editTitle: 'Kategorie bearbeiten',
      name: 'Kategoriename',
      nameHelp: 'Der Name wird Gästen genau so angezeigt.',
      type: 'Kategorietyp',
      typeHelp: 'Wähle die Funktion der Kategorie. Der Typ ist nach dem Erstellen gesperrt.',
      regular: 'Normal',
      regularHelp: 'Normale Menükategorie',
      chef: 'Empfehlung des Küchenchefs',
      chefHelp: 'Kuratiere Speisen',
      bestseller: 'Bestseller',
      bestsellerHelp: 'Manuelle Bestseller-Auswahl',
      combos: 'Kombinationen',
      combosHelp: 'Bundles / Combo-Produkte',
      locked: 'Der Kategorietyp ist nach dem Erstellen gesperrt. Name und Reihenfolge bleiben bearbeitbar.',
      selectFoods: 'Speisen auswählen',
      selectFoodsHelp: 'Wähle die Speisen, die zu dieser Smart-Kategorie gehören.',
      search: 'Speisen suchen...',
      noFoods: 'Keine passenden veröffentlichten Speisen.',
      comboTitle: 'Kombinationen',
      comboHelp: 'Kombinationen verwenden den bestehenden PMD-Combo-Builder. Erstelle und bearbeite sie aus dieser Kategorie.',
      noCombos: 'Noch keine Kombination erstellt.',
      createCombo: 'Kombination erstellen',
      cancel: 'Abbrechen',
      save: 'Kategorie speichern',
      saving: 'Speichern...',
      saved: 'Gespeichert',
      deleteConfirm: 'Diese Smart-Kategorie löschen? Speisen und Kombinationen werden nicht gelöscht.',
      deleteFailed: 'Kategorie konnte nicht gelöscht werden.',
      loadFailed: 'Smart-Kategoriedaten konnten nicht geladen werden.',
      saveFailed: 'Kategorie konnte nicht gespeichert werden.',
      alreadyExists: 'Bereits erstellt',
      defaultChef: 'Empfehlungen des Küchenchefs',
      defaultBest: 'Bestseller',
      defaultCombos: 'Kombinationen'
    }
  };

  var locale = String(document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/)?.[1] || document.documentElement.lang || 'en').toLowerCase();
  var t = copy[locale.indexOf('de') === 0 ? 'de' : 'en'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csrf(formData) {
    if (formData.has('_token')) return;
    var meta = document.querySelector('meta[name="csrf-token"]');
    var hidden = document.querySelector('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) formData.append('_token', token);
  }

  async function backend(handler, formData) {
    var data = formData || new FormData();
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
    try { payload = raw ? JSON.parse(raw) : {}; }
    catch (error) { payload = { message: raw || 'Request failed.' }; }

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || ('Request failed (' + response.status + ')'));
    }

    return payload;
  }

  function categoryById(id) {
    if (!state) return null;
    var number = Number(id || 0);
    return (state.categories || []).find(function (category) {
      return Number(category.id) === number;
    }) || null;
  }

  function specialByKind(kind) {
    if (!state) return null;
    return (state.categories || []).find(function (category) {
      return category.kind === kind;
    }) || null;
  }

  function foodCards() {
    return Array.from(root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]'))
      .filter(function (card) { return card.dataset.published === '1'; })
      .map(function (card) {
        var image = card.querySelector('.pmd-menu-card__media img');
        var title = card.querySelector('.pmd-menu-card__title-row h2, h2');
        var category = card.querySelector('.pmd-menu-card__category');
        return {
          id: Number(card.dataset.menuId || 0),
          name: title ? title.textContent.trim() : ('Food #' + String(card.dataset.menuId || '')),
          image: image ? image.getAttribute('src') || '' : '',
          category: category ? category.textContent.trim() : '',
          card: card
        };
      })
      .filter(function (item) { return item.id > 0; });
  }

  function rebuildCardCategoryMembership() {
    if (!state) return;

    var chef = specialByKind('chef');
    var bestseller = specialByKind('bestseller');
    var combo = specialByKind('combos');
    var chefSet = new Set((state.selections && state.selections.chef || []).map(Number));
    var bestSet = new Set((state.selections && state.selections.bestseller || []).map(Number));

    root.querySelectorAll('[data-pmd-menu-card][data-item-type="food"]').forEach(function (card) {
      if (!card.dataset.pmdSmartBaseCategoryIds) {
        card.dataset.pmdSmartBaseCategoryIds = card.getAttribute('data-category-ids') || '';
      }

      var ids = String(card.dataset.pmdSmartBaseCategoryIds || '')
        .split(',')
        .map(function (value) { return value.trim(); })
        .filter(Boolean);

      var menuId = Number(card.dataset.menuId || 0);
      if (chef && chefSet.has(menuId)) ids.push(String(chef.id));
      if (bestseller && bestSet.has(menuId)) ids.push(String(bestseller.id));

      card.setAttribute('data-category-ids', Array.from(new Set(ids)).join(','));
    });

    var syntheticCombo = root.querySelector('[data-pmd-category-filter="combos"][data-pmd-category-fixed]');

    if (combo) {
      if (syntheticCombo) syntheticCombo.hidden = true;

      root.querySelectorAll('[data-pmd-menu-card][data-item-type="combo"]').forEach(function (card) {
        card.setAttribute('data-category-ids', String(combo.id));
        var badge = card.querySelector('.pmd-menu-card__category');
        if (badge) badge.textContent = combo.name;
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

      button.setAttribute('data-pmd-smart-kind', category.kind || 'regular');

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
      + '    <section class="pmd-smart-section" data-pmd-smart-food-section hidden>'
      + '      <div class="pmd-smart-section__head"><strong>' + escapeHtml(t.selectFoods) + '</strong><p>' + escapeHtml(t.selectFoodsHelp) + '</p></div>'
      + '      <div class="pmd-smart-food-toolbar"><input class="pmd-smart-food-search" type="search" autocomplete="off" placeholder="' + escapeHtml(t.search) + '" data-pmd-smart-food-search></div>'
      + '      <div class="pmd-smart-food-grid" data-pmd-smart-food-grid></div>'
      + '    </section>'
      + '    <section class="pmd-smart-section" data-pmd-smart-combo-section hidden>'
      + '      <div class="pmd-smart-section__head"><strong>' + escapeHtml(t.comboTitle) + '</strong><p>' + escapeHtml(t.comboHelp) + '</p></div>'
      + '      <div class="pmd-smart-combo-list" data-pmd-smart-combo-list></div>'
      + '      <button type="button" class="pmd-smart-btn pmd-smart-btn--combo" data-pmd-smart-create-combo>' + escapeHtml(t.createCombo) + '</button>'
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

      var kindButton = event.target.closest('[data-pmd-smart-kind]');
      if (kindButton && !kindButton.disabled) {
        event.preventDefault();
        chooseKind(kindButton.getAttribute('data-pmd-smart-kind') || 'regular');
        return;
      }

      var save = event.target.closest('[data-pmd-smart-save]');
      if (save) {
        event.preventDefault();
        saveCategory(false);
        return;
      }

      var createCombo = event.target.closest('[data-pmd-smart-create-combo]');
      if (createCombo) {
        event.preventDefault();
        saveCategory(true);
      }
    });

    modal.addEventListener('input', function (event) {
      if (!event.target.matches('[data-pmd-smart-food-search]')) return;
      renderFoods(event.target.value || '');
    });

    modal.addEventListener('change', function (event) {
      if (!event.target.matches('[data-pmd-smart-food-choice]')) return;
      var id = Number(event.target.value || 0);
      if (event.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      var label = event.target.closest('.pmd-smart-food-choice');
      if (label) label.classList.toggle('is-selected', event.target.checked);
    });

    return modal;
  }

  function renderKinds() {
    var host = ensureModal().querySelector('[data-pmd-smart-kinds]');
    var editing = Boolean(activeCategory && activeCategory.id);
    var kinds = [
      ['regular', t.regular, t.regularHelp],
      ['chef', t.chef, t.chefHelp],
      ['bestseller', t.bestseller, t.bestsellerHelp],
      ['combos', t.combos, t.combosHelp]
    ];

    host.innerHTML = kinds.map(function (entry) {
      var existing = specialByKind(entry[0]);
      var unavailable =
        (editing && activeCategory.kind !== entry[0])
        || (!editing && entry[0] !== 'regular' && existing)
        || (entry[0] === 'combos' && state && !state.can_manage_combos);
      var helper = (!editing && entry[0] !== 'regular' && existing) ? t.alreadyExists : entry[2];

      return '<button type="button" class="pmd-smart-kind ' + (activeKind === entry[0] ? 'is-active' : '') + '" data-pmd-smart-kind="' + entry[0] + '" ' + (unavailable ? 'disabled' : '') + '><strong>' + escapeHtml(entry[1]) + '</strong><small>' + escapeHtml(helper) + '</small></button>';
    }).join('');

    var lock = modal.querySelector('[data-pmd-smart-kind-lock]');
    lock.hidden = !editing;
  }

  function renderFoods(search) {
    var host = ensureModal().querySelector('[data-pmd-smart-food-grid]');
    var term = String(search || '').trim().toLowerCase();
    var items = foodCards().filter(function (item) {
      return !term || (item.name + ' ' + item.category).toLowerCase().indexOf(term) !== -1;
    });

    if (!items.length) {
      host.innerHTML = '<p class="pmd-smart-empty">' + escapeHtml(t.noFoods) + '</p>';
      return;
    }

    host.innerHTML = items.map(function (item) {
      var checked = selectedIds.has(item.id);
      var image = item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="">'
        : '<span>◇</span>';

      return '<label class="pmd-smart-food-choice ' + (checked ? 'is-selected' : '') + '">'
        + '<span class="pmd-smart-food-choice__image">' + image + '</span>'
        + '<span class="pmd-smart-food-choice__copy"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.category || '') + '</small></span>'
        + '<input type="checkbox" value="' + String(item.id) + '" data-pmd-smart-food-choice ' + (checked ? 'checked' : '') + '>'
        + '</label>';
    }).join('');
  }

  function renderCombos() {
    var host = ensureModal().querySelector('[data-pmd-smart-combo-list]');
    var combos = state && state.combos || [];
    host.innerHTML = combos.length
      ? combos.map(function (combo) { return '<span class="pmd-smart-combo-chip">' + escapeHtml(combo.name) + '</span>'; }).join('')
      : '<p class="pmd-smart-empty">' + escapeHtml(t.noCombos) + '</p>';
  }

  function chooseKind(kind) {
    activeKind = ['regular', 'chef', 'bestseller', 'combos'].indexOf(kind) !== -1 ? kind : 'regular';
    renderKinds();

    var foodSection = modal.querySelector('[data-pmd-smart-food-section]');
    var comboSection = modal.querySelector('[data-pmd-smart-combo-section]');
    foodSection.hidden = !(activeKind === 'chef' || activeKind === 'bestseller');
    comboSection.hidden = activeKind !== 'combos';

    if (activeKind === 'chef' || activeKind === 'bestseller') {
      selectedIds = new Set(((state.selections || {})[activeKind] || []).map(Number));
      var search = modal.querySelector('[data-pmd-smart-food-search]');
      if (search) search.value = '';
      renderFoods('');
    } else {
      selectedIds = new Set();
    }

    if (activeKind === 'combos') renderCombos();

    if (!activeCategory) {
      var input = modal.querySelector('[data-pmd-smart-name]');
      var current = input.value.trim();
      var defaults = [t.defaultChef, t.defaultBest, t.defaultCombos, '', t.createTitle];
      var canReplace = current === '' || defaults.indexOf(current) !== -1;
      if (canReplace) {
        if (activeKind === 'chef') input.value = t.defaultChef;
        else if (activeKind === 'bestseller') input.value = t.defaultBest;
        else if (activeKind === 'combos') input.value = t.defaultCombos;
        else input.value = '';
      }
    }
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
    modal.querySelectorAll('button, input').forEach(function (node) {
      if (node.matches('[data-pmd-smart-close]')) node.disabled = busy;
    });
    var save = modal.querySelector('[data-pmd-smart-save]');
    if (save) {
      save.disabled = busy;
      save.textContent = busy ? t.saving : t.save;
    }
  }

  function openModal(category, trigger) {
    if (!state) return;
    ensureModal();
    lastTrigger = trigger || null;
    activeCategory = category || null;
    activeKind = category ? category.kind : 'regular';

    var title = modal.querySelector('#pmd-smart-category-title');
    var name = modal.querySelector('[data-pmd-smart-name]');
    title.textContent = category ? t.editTitle : t.createTitle;
    name.value = category ? category.name : '';
    setStatus('');
    chooseKind(activeKind);
    renderKinds();

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-menu-manager-modal-open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { name.focus(); });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pmd-menu-manager-modal-open');
    document.body.style.removeProperty('overflow');
    activeCategory = null;
    activeKind = 'regular';
    selectedIds = new Set();
    setStatus('');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function currentUrlWithComboOpen() {
    var url = new URL(window.location.href);
    url.searchParams.delete('pmd_mode');
    url.searchParams.delete('pmd_id');
    url.searchParams.set('pmd_smart_combo_create', '1');
    return url.toString();
  }

  async function saveCategory(openComboAfter) {
    if (busy || !state) return;

    var nameInput = ensureModal().querySelector('[data-pmd-smart-name]');
    var name = nameInput.value.trim();
    if (name.length < 2) {
      nameInput.focus();
      return;
    }

    var data = new FormData();
    if (activeCategory) data.append('category_id', String(activeCategory.id));
    data.append('name', name);
    data.append('kind', activeKind);

    if (activeKind === 'chef' || activeKind === 'bestseller') {
      Array.from(selectedIds).forEach(function (id) {
        data.append('menu_ids[]', String(id));
      });
    }

    setBusy(true);
    setStatus(t.saving);

    try {
      await backend('onSave', data);
      setStatus(t.saved, 'ok');

      if (openComboAfter && activeKind === 'combos') {
        window.location.assign(currentUrlWithComboOpen());
      } else {
        window.location.reload();
      }
    } catch (error) {
      setStatus(error && error.message ? error.message : t.saveFailed, 'error');
      setBusy(false);
    }
  }

  async function deleteSpecial(category) {
    if (!category || category.kind === 'regular' || busy) return;
    if (!window.confirm(t.deleteConfirm)) return;

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

  function openExistingComboBuilderIfRequested() {
    var url = new URL(window.location.href);
    if (url.searchParams.get('pmd_smart_combo_create') !== '1') return;

    url.searchParams.delete('pmd_smart_combo_create');
    history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);

    var comboButton = root.querySelector('[data-pmd-combo-build]');
    if (comboButton) comboButton.click();
  }

  function wireEvents() {
    document.addEventListener('click', function (event) {
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
        var category = categoryById(edit.getAttribute('data-pmd-smart-category-edit'));
        if (category) openModal(category, edit);
        return;
      }

      var deleteHit = event.target.closest('[data-pmd-category-delete]');
      if (deleteHit && root.contains(deleteHit) && state) {
        var categoryToDelete = categoryById(deleteHit.getAttribute('data-pmd-category-delete'));
        if (categoryToDelete && categoryToDelete.kind !== 'regular') {
          event.preventDefault();
          event.stopImmediatePropagation();
          deleteSpecial(categoryToDelete);
        }
      }
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        event.preventDefault();
        closeModal();
      }
    });
  }

  async function load() {
    if (loading) return;
    loading = true;

    try {
      state = await backend('onBootstrap', new FormData());
      installCategoryMetadata();
      openExistingComboBuilderIfRequested();

      window.PMDMenuSmartCategoriesV1 = {
        ready: true,
        categories: state.categories || [],
        selections: state.selections || {},
        canManageCombos: Boolean(state.can_manage_combos),
        refresh: load
      };

      console.info('[PMD Menu Smart Categories V1] Ready', window.PMDMenuSmartCategoriesV1);
    } catch (error) {
      console.error('[PMD Menu Smart Categories V1]', error);
      var add = root.querySelector('[data-pmd-category-create]');
      if (add) add.title = (error && error.message) || t.loadFailed;
    } finally {
      loading = false;
    }
  }

  wireEvents();
  load();
})();
