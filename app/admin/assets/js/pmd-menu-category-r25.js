/* PMD_MENU_CATEGORY_AUTHORITY_R25
 * Platform-wide Menu category authority.
 * - All Foods is a view/filter only.
 * - Food create requires at least one real regular category.
 * - Category management lives in a Menu-style card, not the tiny plus pill.
 * - Uses existing Pmdsmartcategories backend for create/edit/remove.
 */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/pmdmenus') return;

    var state = null;
    var statePromise = null;
    var managerModal = null;
    var editingCategory = null;
    var removeArmedId = null;
    var directObserver = null;
    var observedParent = null;
    var bypassFoodGuard = false;

    var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
    var locale = String((localeMatch && localeMatch[1]) || document.documentElement.lang || 'en').toLowerCase();
    var de = locale.indexOf('de') === 0;

    var copy = de ? {
        cardTitle: 'Kategorien erstellen / verwalten',
        cardHelp: 'Kategorien hinzufugen, auswahlen, bearbeiten oder entfernen.',
        modalEyebrow: 'Menu',
        modalTitle: 'Kategorien verwalten',
        allFoods: 'Alle Speisen',
        allFoodsHelp: 'Ansicht aller Speisen. Dies ist keine speicherbare Kategorie.',
        select: 'Auswahlen',
        edit: 'Bearbeiten',
        remove: 'Entfernen',
        confirmRemove: 'Entfernen bestatigen',
        createTitle: 'Kategorie erstellen',
        editTitle: 'Kategorie bearbeiten',
        name: 'Kategoriename',
        purpose: 'Zweck',
        normal: 'Normale Kategorie',
        chef: 'Chef-Empfehlung',
        bestseller: 'Bestseller',
        combos: 'Kombinationen',
        cancel: 'Abbrechen',
        save: 'Speichern',
        saving: 'Speichern...',
        loading: 'Kategorien werden geladen...',
        loadError: 'Kategorien konnten nicht geladen werden.',
        deleteError: 'Kategorie konnte nicht entfernt werden.',
        saveError: 'Kategorie konnte nicht gespeichert werden.',
        chooseCategory: 'Wahle mindestens eine Kategorie aus, bevor du die Speise speicherst.',
        createFirstTitle: 'Zuerst Kategorie erstellen',
        createFirstHelp: 'Erstelle mindestens eine Kategorie, bevor du eine Speise anlegst.',
        kindRegular: 'Normal',
        kindChef: 'Chef',
        kindBest: 'Bestseller',
        kindCombos: 'Kombinationen'
    } : {
        cardTitle: 'Create / manage categories',
        cardHelp: 'Add, select, edit or remove menu categories.',
        modalEyebrow: 'Menu',
        modalTitle: 'Manage categories',
        allFoods: 'All foods',
        allFoodsHelp: 'View every food. This is a filter, not a saved category.',
        select: 'Select',
        edit: 'Edit',
        remove: 'Remove',
        confirmRemove: 'Confirm remove',
        createTitle: 'Create category',
        editTitle: 'Edit category',
        name: 'Category name',
        purpose: 'Purpose',
        normal: 'Normal category',
        chef: "Chef's recommendation",
        bestseller: 'Bestsellers',
        combos: 'Combinations',
        cancel: 'Cancel',
        save: 'Save category',
        saving: 'Saving...',
        loading: 'Loading categories...',
        loadError: 'Categories could not be loaded.',
        deleteError: 'Category could not be removed.',
        saveError: 'Category could not be saved.',
        chooseCategory: 'Choose at least one menu category before saving this food.',
        createFirstTitle: 'Create a category first',
        createFirstHelp: 'Add at least one category before creating a food item.',
        kindRegular: 'Normal',
        kindChef: 'Chef',
        kindBest: 'Bestseller',
        kindCombos: 'Combinations'
    };

    function q(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function qa(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    function root() {
        return q('[data-pmd-menu-manager]');
    }

    function csrf(data) {
        if (data.has('_token')) return;
        var meta = q('meta[name="csrf-token"]');
        var hidden = q('input[name="_token"]');
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

    function loadState(force) {
        if (state && !force) return Promise.resolve(state);
        if (statePromise && !force) return statePromise;

        statePromise = backend('onBootstrap', new FormData())
            .then(function (payload) {
                state = payload || {};
                applyCategoryChoiceAuthority();
                syncFoodCard();
                return state;
            })
            .catch(function (error) {
                statePromise = null;
                throw error;
            });

        return statePromise;
    }

    function categories() {
        return state && Array.isArray(state.categories) ? state.categories : [];
    }

    function regularCategories() {
        return categories().filter(function (category) {
            return String(category.kind || 'regular') === 'regular';
        });
    }

    function kindLabel(kind) {
        if (kind === 'chef') return copy.kindChef;
        if (kind === 'bestseller') return copy.kindBest;
        if (kind === 'combos') return copy.kindCombos;
        return copy.kindRegular;
    }

    function categoryById(id) {
        id = Number(id || 0);
        return categories().find(function (category) {
            return Number(category.id || 0) === id;
        }) || null;
    }

    function currentFoodCard(menuRoot) {
        menuRoot = menuRoot || root();
        if (!menuRoot) return null;

        var grid = q('[data-pmd-menu-grid]', menuRoot);
        if (!grid) return null;

        return qa('.pmd-smart-add-card', grid).find(function (card) {
            return !card.hasAttribute('data-pmd-menu-category-manager-r25');
        }) || null;
    }

    function syncFoodCard() {
        var menuRoot = root();
        var card = currentFoodCard(menuRoot);
        if (!card || !state) return;

        var noRegular = regularCategories().length === 0;
        card.classList.toggle('pmd-menu-food-needs-category-r25', noRegular);
        card.setAttribute('aria-disabled', noRegular ? 'true' : 'false');

        if (!noRegular) return;

        var title = q('[data-pmd-smart-add-title]', card);
        var help = q('[data-pmd-smart-add-help]', card);
        if (title) title.textContent = copy.createFirstTitle;
        if (help) help.textContent = copy.createFirstHelp;
    }

    function applyCategoryChoiceAuthority() {
        if (!state) return;

        var kinds = {};
        categories().forEach(function (category) {
            kinds[String(category.id)] = String(category.kind || 'regular');
        });

        qa('[data-pmd-menu-category-choice]').forEach(function (input) {
            var kind = kinds[String(input.value)] || 'regular';
            var label = input.closest('label');
            var regular = kind === 'regular';

            input.disabled = !regular;
            if (!regular) input.checked = false;
            if (label) label.hidden = !regular;
        });
    }

    function buildManagerCard(menuRoot) {
        var card = document.createElement('div');
        card.className = 'pmd-menu-category-manager-card-r25';
        card.setAttribute('data-pmd-menu-category-manager-r25', '');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', copy.cardTitle);
        card.innerHTML = ''
            + '<span class="pmd-menu-category-manager-card-r25__plus" aria-hidden="true">+</span>'
            + '<span class="pmd-menu-category-manager-card-r25__copy">'
            + '<strong></strong><small></small></span>';

        q('strong', card).textContent = copy.cardTitle;
        q('small', card).textContent = copy.cardHelp;

        function activate() {
            openManager();
        }

        card.addEventListener('click', activate, false);
        card.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            activate();
        }, false);

        return card;
    }

    function install(menuRoot) {
        menuRoot = menuRoot || root();
        if (!menuRoot) return false;

        var legacyAdd = q('[data-pmd-category-create]', menuRoot);
        if (legacyAdd) {
            legacyAdd.hidden = true;
            legacyAdd.setAttribute('aria-hidden', 'true');
            legacyAdd.setAttribute('tabindex', '-1');
        }

        var grid = q('[data-pmd-menu-grid]', menuRoot);
        if (grid && legacyAdd) {
            var managerCard = q('[data-pmd-menu-category-manager-r25]', grid);
            if (!managerCard) {
                managerCard = buildManagerCard(menuRoot);
                var foodCard = currentFoodCard(menuRoot);
                grid.insertBefore(managerCard, foodCard || grid.firstChild || null);
            }
        }

        applyCategoryChoiceAuthority();
        syncFoodCard();
        observeDirectReplacement(menuRoot);

        return true;
    }

    function observeDirectReplacement(menuRoot) {
        var parent = menuRoot && menuRoot.parentNode;
        if (!parent || observedParent === parent) return;

        if (directObserver) directObserver.disconnect();
        observedParent = parent;

        directObserver = new MutationObserver(function (mutations) {
            var found = null;

            mutations.some(function (mutation) {
                return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
                    if (!node || node.nodeType !== 1) return false;
                    if (node.matches && node.matches('[data-pmd-menu-manager]')) {
                        found = node;
                        return true;
                    }
                    return false;
                });
            });

            if (!found) return;
            install(found);
            loadState(true).catch(function () {});
        });

        directObserver.observe(parent, {childList: true});
    }

    function ensureManagerModal() {
        if (managerModal && managerModal.isConnected) return managerModal;

        managerModal = document.createElement('div');
        managerModal.className = 'pmd-menu-category-manager-r25';
        managerModal.hidden = true;
        managerModal.setAttribute('aria-hidden', 'true');
        managerModal.innerHTML = ''
            + '<div class="pmd-menu-category-manager-r25__backdrop" data-pmd-category-manager-close-r25></div>'
            + '<section class="pmd-menu-category-manager-r25__card" role="dialog" aria-modal="true" aria-labelledby="pmd-category-manager-title-r25">'
            + '  <header class="pmd-menu-category-manager-r25__header">'
            + '    <div class="pmd-menu-category-manager-r25__heading"><span></span><h2 id="pmd-category-manager-title-r25"></h2></div>'
            + '    <button type="button" class="pmd-menu-category-manager-r25__close" data-pmd-category-manager-close-r25 aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'
            + '  </header>'
            + '  <div class="pmd-menu-category-manager-r25__body">'
            + '    <div class="pmd-menu-category-manager-r25__list" data-pmd-category-manager-list-r25></div>'
            + '    <section class="pmd-menu-category-manager-r25__editor">'
            + '      <h3 class="pmd-menu-category-manager-r25__editor-title" data-pmd-category-editor-title-r25></h3>'
            + '      <div class="pmd-menu-category-manager-r25__form-grid">'
            + '        <label class="pmd-menu-category-manager-r25__field"><span data-pmd-category-name-label-r25></span><input type="text" minlength="2" maxlength="128" autocomplete="off" data-pmd-category-name-r25></label>'
            + '        <label class="pmd-menu-category-manager-r25__field"><span data-pmd-category-purpose-label-r25></span><select data-pmd-category-kind-r25></select></label>'
            + '      </div>'
            + '      <div class="pmd-menu-category-manager-r25__status" data-pmd-category-manager-status-r25 aria-live="polite"></div>'
            + '      <div class="pmd-menu-category-manager-r25__editor-actions">'
            + '        <button type="button" class="pmd-menu-category-manager-r25__btn" data-pmd-category-editor-cancel-r25></button>'
            + '        <button type="button" class="pmd-menu-category-manager-r25__btn is-primary" data-pmd-category-editor-save-r25></button>'
            + '      </div>'
            + '    </section>'
            + '  </div>'
            + '</section>';

        q('.pmd-menu-category-manager-r25__heading span', managerModal).textContent = copy.modalEyebrow;
        q('#pmd-category-manager-title-r25', managerModal).textContent = copy.modalTitle;
        q('[data-pmd-category-name-label-r25]', managerModal).textContent = copy.name;
        q('[data-pmd-category-purpose-label-r25]', managerModal).textContent = copy.purpose;
        q('[data-pmd-category-editor-cancel-r25]', managerModal).textContent = copy.cancel;
        q('[data-pmd-category-editor-save-r25]', managerModal).textContent = copy.save;

        q('[data-pmd-category-kind-r25]', managerModal).innerHTML = ''
            + '<option value="regular"></option>'
            + '<option value="chef"></option>'
            + '<option value="bestseller"></option>'
            + '<option value="combos"></option>';
        var options = q('[data-pmd-category-kind-r25]', managerModal).options;
        options[0].textContent = copy.normal;
        options[1].textContent = copy.chef;
        options[2].textContent = copy.bestseller;
        options[3].textContent = copy.combos;

        managerModal.addEventListener('click', onManagerClick, false);
        document.body.appendChild(managerModal);

        return managerModal;
    }

    function setManagerStatus(message, error) {
        var modal = ensureManagerModal();
        var node = q('[data-pmd-category-manager-status-r25]', modal);
        if (!node) return;
        node.textContent = message || '';
        node.classList.toggle('is-error', Boolean(error));
    }

    function resetEditor() {
        editingCategory = null;
        removeArmedId = null;
        var modal = ensureManagerModal();
        q('[data-pmd-category-editor-title-r25]', modal).textContent = copy.createTitle;
        q('[data-pmd-category-name-r25]', modal).value = '';
        var kind = q('[data-pmd-category-kind-r25]', modal);
        kind.value = 'regular';
        kind.disabled = false;
        q('[data-pmd-category-editor-save-r25]', modal).textContent = copy.save;
        setManagerStatus('', false);
        renderManagerList();
    }

    function editCategory(category) {
        if (!category) return;
        editingCategory = category;
        removeArmedId = null;
        var modal = ensureManagerModal();
        q('[data-pmd-category-editor-title-r25]', modal).textContent = copy.editTitle;
        q('[data-pmd-category-name-r25]', modal).value = category.name || '';
        var kind = q('[data-pmd-category-kind-r25]', modal);
        kind.value = category.kind || 'regular';
        kind.disabled = true;
        setManagerStatus('', false);
        renderManagerList();
        q('[data-pmd-category-name-r25]', modal).focus({preventScroll: true});
    }

    function renderManagerList() {
        var modal = ensureManagerModal();
        var host = q('[data-pmd-category-manager-list-r25]', modal);
        if (!host) return;
        host.innerHTML = '';

        host.appendChild(categoryRow(null));

        categories().forEach(function (category) {
            host.appendChild(categoryRow(category));
        });
    }

    function categoryRow(category) {
        var row = document.createElement('div');
        var all = !category;
        row.className = 'pmd-menu-category-manager-r25__row' + (all ? ' is-all-foods' : '');
        if (category) row.setAttribute('data-pmd-category-row-r25', String(category.id));

        var text = document.createElement('div');
        text.className = 'pmd-menu-category-manager-r25__row-copy';
        var strong = document.createElement('strong');
        var small = document.createElement('small');
        strong.textContent = all ? copy.allFoods : category.name;
        small.textContent = all ? copy.allFoodsHelp : kindLabel(category.kind || 'regular');
        text.appendChild(strong);
        text.appendChild(small);

        var actions = document.createElement('div');
        actions.className = 'pmd-menu-category-manager-r25__actions';

        var select = document.createElement('button');
        select.type = 'button';
        select.className = 'pmd-menu-category-manager-r25__btn is-primary';
        select.textContent = copy.select;
        select.setAttribute('data-pmd-category-select-r25', all ? 'all' : String(category.id));
        actions.appendChild(select);

        if (!all) {
            var edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'pmd-menu-category-manager-r25__btn';
            edit.textContent = copy.edit;
            edit.setAttribute('data-pmd-category-edit-r25', String(category.id));
            actions.appendChild(edit);

            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'pmd-menu-category-manager-r25__btn is-danger';
            if (Number(removeArmedId) === Number(category.id)) {
                remove.classList.add('is-armed');
                remove.textContent = copy.confirmRemove;
            } else {
                remove.textContent = copy.remove;
            }
            remove.setAttribute('data-pmd-category-remove-r25', String(category.id));
            actions.appendChild(remove);
        }

        row.appendChild(text);
        row.appendChild(actions);
        return row;
    }

    function selectCategory(value) {
        var menuRoot = root();
        if (!menuRoot) return;
        var selector = value === 'all'
            ? '[data-pmd-category-filter="all"]'
            : '[data-pmd-category-filter="' + String(value) + '"]';
        var button = q(selector, menuRoot);
        if (button) button.click();
        closeManager();
    }

    async function removeCategory(id) {
        id = Number(id || 0);
        if (!id) return;

        if (Number(removeArmedId) !== id) {
            removeArmedId = id;
            renderManagerList();
            return;
        }

        var data = new FormData();
        data.append('category_id', String(id));
        setManagerStatus(copy.loading, false);

        try {
            await backend('onDelete', data);
            window.location.reload();
        } catch (error) {
            removeArmedId = null;
            renderManagerList();
            setManagerStatus(error && error.message ? error.message : copy.deleteError, true);
        }
    }

    async function saveEditor() {
        var modal = ensureManagerModal();
        var input = q('[data-pmd-category-name-r25]', modal);
        var kind = q('[data-pmd-category-kind-r25]', modal);
        var save = q('[data-pmd-category-editor-save-r25]', modal);
        var name = String(input.value || '').trim();

        if (name.length < 2) {
            input.focus();
            return;
        }

        var data = new FormData();
        if (editingCategory) data.append('category_id', String(editingCategory.id));
        data.append('name', name);
        data.append('kind', editingCategory ? String(editingCategory.kind || 'regular') : String(kind.value || 'regular'));

        save.disabled = true;
        save.textContent = copy.saving;
        setManagerStatus('', false);

        try {
            await backend('onSave', data);
            window.location.reload();
        } catch (error) {
            save.disabled = false;
            save.textContent = copy.save;
            setManagerStatus(error && error.message ? error.message : copy.saveError, true);
        }
    }

    function onManagerClick(event) {
        var close = event.target.closest('[data-pmd-category-manager-close-r25]');
        if (close) {
            event.preventDefault();
            closeManager();
            return;
        }

        var select = event.target.closest('[data-pmd-category-select-r25]');
        if (select) {
            event.preventDefault();
            selectCategory(select.getAttribute('data-pmd-category-select-r25'));
            return;
        }

        var edit = event.target.closest('[data-pmd-category-edit-r25]');
        if (edit) {
            event.preventDefault();
            editCategory(categoryById(edit.getAttribute('data-pmd-category-edit-r25')));
            return;
        }

        var remove = event.target.closest('[data-pmd-category-remove-r25]');
        if (remove) {
            event.preventDefault();
            removeCategory(remove.getAttribute('data-pmd-category-remove-r25'));
            return;
        }

        if (event.target.closest('[data-pmd-category-editor-cancel-r25]')) {
            event.preventDefault();
            resetEditor();
            return;
        }

        if (event.target.closest('[data-pmd-category-editor-save-r25]')) {
            event.preventDefault();
            saveEditor();
        }
    }

    function openManager() {
        var modal = ensureManagerModal();
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('pmd-menu-category-manager-open-r25');
        setManagerStatus(copy.loading, false);

        loadState(true)
            .then(function () {
                resetEditor();
                q('[data-pmd-category-name-r25]', modal).focus({preventScroll: true});
            })
            .catch(function (error) {
                setManagerStatus(error && error.message ? error.message : copy.loadError, true);
            });
    }

    function closeManager() {
        if (!managerModal) return;
        managerModal.hidden = true;
        managerModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('pmd-menu-category-manager-open-r25');
        editingCategory = null;
        removeArmedId = null;
    }

    function showFoodCategoryError() {
        var modal = q('[data-pmd-menu-modal]');
        if (!modal) return;
        var status = q('[data-pmd-menu-modal-status]', modal);
        if (status) {
            status.textContent = copy.chooseCategory;
            status.classList.add('is-error');
        }
        var choices = q('[data-pmd-menu-category-choices]', modal);
        if (choices) {
            choices.classList.add('pmd-menu-category-required-r25');
            choices.scrollIntoView({block: 'center', behavior: 'auto'});
        }
    }

    function selectedRegularCategoryCount() {
        if (!state) return 0;
        var allowed = new Set(regularCategories().map(function (category) {
            return String(category.id);
        }));

        return qa('[data-pmd-menu-category-choice]:checked').filter(function (input) {
            return allowed.has(String(input.value));
        }).length;
    }

    function foodModalActive() {
        var modal = q('[data-pmd-menu-modal]');
        var content = modal && q('[data-pmd-food-modal-content]', modal);
        return Boolean(modal && !modal.hidden && content && !content.hidden);
    }

    function triggerNativeFoodCreate(menuRoot) {
        menuRoot = menuRoot || root();
        if (!menuRoot) return;

        var active = q('[data-pmd-category-filter].is-active[data-pmd-category-id]', menuRoot);
        var activeId = active ? String(active.getAttribute('data-pmd-category-id') || '') : '';
        var activeCategory = activeId ? categoryById(activeId) : null;
        var primary = q('[data-pmd-menu-header-primary]', menuRoot);
        if (!primary) return;

        bypassFoodGuard = true;
        primary.click();
        bypassFoodGuard = false;

        if (activeCategory && String(activeCategory.kind || 'regular') === 'regular') {
            requestAnimationFrame(function () {
                var choice = q('[data-pmd-menu-category-choice][value="' + String(activeCategory.id) + '"]');
                if (choice) choice.checked = true;
            });
        }
    }

    document.addEventListener('click', function (event) {
        var menuRoot = root();
        if (!menuRoot) return;

        var foodCard = event.target.closest && event.target.closest('.pmd-smart-add-card');
        if (
            foodCard
            && menuRoot.contains(foodCard)
            && !foodCard.hasAttribute('data-pmd-menu-category-manager-r25')
            && !bypassFoodGuard
        ) {
            var action = String(foodCard.getAttribute('data-pmd-smart-action') || 'food');
            var serverCard = foodCard.hasAttribute('data-pmd-smart-server-action-card');

            if (action === 'food' || serverCard) {
                if (!state) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    loadState(false).then(function () {
                        if (regularCategories().length === 0) openManager();
                        else triggerNativeFoodCreate(root());
                    }).catch(function () {
                        openManager();
                    });
                    return;
                }

                if (regularCategories().length === 0) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    openManager();
                    return;
                }

                if (serverCard) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    triggerNativeFoodCreate(menuRoot);
                    return;
                }
            }
        }

        var save = event.target.closest && event.target.closest('[data-pmd-menu-save]');
        if (save && foodModalActive() && state && selectedRegularCategoryCount() < 1) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showFoodCategoryError();
        }
    }, true);

    document.addEventListener('submit', function (event) {
        if (!event.target.matches || !event.target.matches('[data-pmd-menu-form]')) return;
        if (!state || selectedRegularCategoryCount() > 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showFoodCategoryError();
    }, true);

    document.addEventListener('change', function (event) {
        if (!event.target.matches || !event.target.matches('[data-pmd-menu-category-choice]')) return;
        var choices = q('[data-pmd-menu-category-choices]');
        if (choices && selectedRegularCategoryCount() > 0) {
            choices.classList.remove('pmd-menu-category-required-r25');
        }
    }, true);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && managerModal && !managerModal.hidden) {
            event.preventDefault();
            closeManager();
        }
    }, true);

    install(root());
    loadState(false).catch(function () {});

    window.PMDMenuCategoryAuthorityR25 = {
        version: '25.0.0',
        open: openManager,
        install: function () { return install(root()); },
        refresh: function () { return loadState(true); }
    };
})();
