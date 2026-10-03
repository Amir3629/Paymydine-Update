/* PMD_MENU_CATEGORY_UI_RESTORE_R26
 * Restore the original Smart Categories UI as the only category presentation.
 * R25 backend/menu tenant baseline remains authoritative for schema parity and
 * server-side food category validation.
 *
 * This file intentionally creates NO category card and NO category modal.
 */
(function () {
    'use strict';

    var pagePath = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
    // PMD_MENU_CLEAN_ALIAS_R3_CLEAN
    if (pagePath !== '/admin/pmdmenus' && pagePath !== '/admin/menu') return;

    var state = null;
    var statePromise = null;
    var bypassCreateGuard = false;

    var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
    var locale = String((localeMatch && localeMatch[1]) || document.documentElement.lang || 'en').toLowerCase();
    var de = locale.indexOf('de') === 0;

    var copy = de ? {
        chooseCategory: 'Wahle mindestens eine normale Kategorie aus, bevor du die Speise speicherst.',
        createFirst: 'Erstelle zuerst eine Kategorie.'
    } : {
        chooseCategory: 'Choose at least one menu category before saving this food.',
        createFirst: 'Create a category first.'
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

    function categories() {
        return state && Array.isArray(state.categories) ? state.categories : [];
    }

    function regularCategories() {
        return categories().filter(function (category) {
            return String(category.kind || 'regular') === 'regular';
        });
    }

    function kindById() {
        var result = {};
        categories().forEach(function (category) {
            result[String(category.id)] = String(category.kind || 'regular');
        });
        return result;
    }

    function removeR25Presentation() {
        qa('[data-pmd-menu-category-manager-r25]').forEach(function (node) {
            node.remove();
        });

        qa('.pmd-menu-category-manager-r25').forEach(function (node) {
            if (node.matches('[data-pmd-menu-category-manager-r25]')) return;
            node.remove();
        });

        var add = q('[data-pmd-category-create]');
        if (add) {
            add.hidden = false;
            add.removeAttribute('hidden');
            add.removeAttribute('aria-hidden');
            add.removeAttribute('tabindex');
            add.style.removeProperty('display');
            add.style.removeProperty('visibility');
            add.style.removeProperty('opacity');
            add.style.removeProperty('pointer-events');
        }
    }

    function applyFoodCategoryChoices() {
        if (!state) return;

        var kinds = kindById();

        qa('[data-pmd-menu-category-choice]').forEach(function (input) {
            var kind = kinds[String(input.value)] || 'regular';
            var regular = kind === 'regular';
            var label = input.closest('label');

            input.disabled = !regular;
            if (!regular) input.checked = false;
            if (label) label.hidden = !regular;
        });
    }

    function loadState(force) {
        if (state && !force) return Promise.resolve(state);
        if (statePromise && !force) return statePromise;

        statePromise = backend('onBootstrap', new FormData())
            .then(function (payload) {
                state = payload || {};
                removeR25Presentation();
                applyFoodCategoryChoices();
                return state;
            })
            .catch(function (error) {
                statePromise = null;
                throw error;
            });

        return statePromise;
    }

    function oldCategoryCreateButton() {
        var menuRoot = root();
        return menuRoot ? q('[data-pmd-category-create]', menuRoot) : null;
    }

    function openOriginalCategoryCreate() {
        removeR25Presentation();
        var add = oldCategoryCreateButton();
        if (!add) return;
        add.click();
    }

    function selectedRegularCategoryCount() {
        var modal = q('[data-pmd-menu-modal]');
        if (!modal) return 0;

        return qa('[data-pmd-menu-category-choice]:checked', modal).filter(function (input) {
            return !input.disabled;
        }).length;
    }

    function foodModalIsOpen() {
        var modal = q('[data-pmd-menu-modal]');
        var food = modal && q('[data-pmd-food-modal-content]', modal);
        return Boolean(modal && !modal.hidden && food && !food.hidden);
    }

    function showFoodCategoryError() {
        var modal = q('[data-pmd-menu-modal]');
        var status = modal && q('[data-pmd-menu-modal-status]', modal);
        if (status) {
            status.textContent = copy.chooseCategory;
            status.classList.add('is-error');
            status.classList.remove('is-ok');
        }

        var first = modal && q('[data-pmd-menu-category-choice]:not(:disabled)', modal);
        if (first && typeof first.focus === 'function') first.focus({preventScroll: true});
    }

    function isNormalFoodActionCard(card) {
        if (!card) return false;
        if (card.hasAttribute('data-pmd-menu-category-manager-r25')) return false;

        var action = String(card.getAttribute('data-pmd-smart-action') || 'food');
        if (action === 'chef' || action === 'bestseller' || action === 'combos') return false;

        return true;
    }

    function guardFoodCreate(event, card) {
        if (bypassCreateGuard || !isNormalFoodActionCard(card)) return;

        if (!state) {
            event.preventDefault();
            event.stopImmediatePropagation();

            loadState(false).then(function () {
                if (regularCategories().length === 0) {
                    openOriginalCategoryCreate();
                    return;
                }

                var menuRoot = root();
                var primary = menuRoot && q('[data-pmd-menu-header-primary]', menuRoot);
                if (!primary) return;

                bypassCreateGuard = true;
                primary.click();
                bypassCreateGuard = false;
            }).catch(function () {
                // If category bootstrap is unavailable, server validation remains authoritative.
            });

            return;
        }

        if (regularCategories().length > 0) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        openOriginalCategoryCreate();
    }

    function install() {
        removeR25Presentation();
        loadState(false).catch(function () {});
    }

    document.addEventListener('click', function (event) {
        var menuRoot = root();
        if (!menuRoot) return;

        var card = event.target.closest && event.target.closest('.pmd-smart-add-card');
        if (card && menuRoot.contains(card)) {
            guardFoodCreate(event, card);
            return;
        }

        var save = event.target.closest && event.target.closest('[data-pmd-menu-save]');
        if (save && foodModalIsOpen()) {
            applyFoodCategoryChoices();
            if (selectedRegularCategoryCount() > 0) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            showFoodCategoryError();
        }
    }, true);

    document.addEventListener('submit', function (event) {
        var form = event.target;
        if (!form || !form.matches || !form.matches('[data-pmd-menu-form]')) return;

        applyFoodCategoryChoices();
        if (selectedRegularCategoryCount() > 0) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        showFoodCategoryError();
    }, true);

    document.addEventListener('click', function (event) {
        var closeOrCategory = event.target.closest && event.target.closest(
            '[data-pmd-category-create], [data-pmd-category-filter], [data-pmd-menu-edit]'
        );
        if (!closeOrCategory) return;
        requestAnimationFrame(function () {
            removeR25Presentation();
            applyFoodCategoryChoices();
        });
    }, false);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, {once: true});
    } else {
        install();
    }

    window.PMDMenuCategoryGuardR26 = {
        ready: true,
        version: '26.0.0-original-category-ui',
        refresh: function () {
            state = null;
            statePromise = null;
            return loadState(true);
        }
    };
})();
