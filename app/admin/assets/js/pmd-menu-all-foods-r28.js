/* PMD_MENU_ALL_FOODS_CATEGORY_PARITY_R28
 *
 * Keeps R27's tenant-local virtual All Foods preference authority, but makes
 * the UX match normal/smart categories:
 * - All Foods gets the same pencil badge inside its own category pill in Edit.
 * - the old standalone R27 pencil remains only as a hidden compatibility hook.
 * - Create Category shows All Foods as the first special purpose alongside
 *   Chef's recommendation, Bestsellers and Combinations.
 * - if All Foods is hidden, selecting that purpose + Save restores it using
 *   the typed category name. If it already exists it is shown as unavailable,
 *   matching the other one-per-tenant smart purposes.
 *
 * No foods/categories are deleted by hiding All Foods.
 */
(function () {
    'use strict';

    var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
    if (path !== '/admin/pmdmenus') return;

    var root = document.querySelector('[data-pmd-menu-manager]');
    if (!root) return;

    var allButton = root.querySelector(
        '[data-pmd-category-filter="all"][data-pmd-category-fixed]'
    );
    if (!allButton) return;

    var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
    var locale = String(
        (localeMatch && localeMatch[1])
        || document.documentElement.lang
        || 'en'
    ).toLowerCase();
    var de = locale.indexOf('de') === 0;

    var copy = de ? {
        allFoods: 'Alle Speisen',
        alreadyExists: 'Bereits erstellt',
        edit: 'Kategorie bearbeiten',
        saving: 'Speichern...',
        failed: 'Die Alle-Speisen-Einstellung konnte nicht gespeichert werden.'
    } : {
        allFoods: 'All foods',
        alreadyExists: 'Already created',
        edit: 'Edit category',
        saving: 'Saving...',
        failed: 'All Foods preference could not be saved.'
    };

    var bodyObserver = null;
    var kindObserver = null;
    var allButtonObserver = null;
    var smartModal = null;
    var smartKinds = null;
    var saveBusy = false;

    function q(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function editMode() {
        return String(root.getAttribute('data-pmd-sort-mode') || '0') !== '0';
    }

    function currentPreference() {
        var labelNode = q('[data-pmd-all-foods-label-r27]', allButton);
        var label = String(
            labelNode ? labelNode.textContent : allButton.textContent
        ).trim();

        if (label.indexOf(' · ') !== -1) {
            label = label.split(' · ')[0].trim();
        }

        if (!label) label = copy.allFoods;

        return {
            label: label,
            visible: allButton.getAttribute('data-pmd-all-foods-visible-r27') !== '0'
        };
    }

    function lockVisibleAllFoodsAsInitialCategory() {
        var pref = currentPreference();
        if (!pref.visible) return;

        /*
         * Server Blade already renders All Foods first + active and V129 starts
         * with filterState.category = "all". Keep those two server-first truths
         * aligned. The canonical runtime must not replace that correct initial
         * state by clicking the next regular category after first paint.
         */
        root.setAttribute('data-pmd-menu-initial-category-v1', 'all');
        root.setAttribute(
            'data-pmd-menu-runtime-ready-reason-v1',
            'all-foods-server-first'
        );

        root.querySelectorAll(
            '.pmd-menu-manager__categories [data-pmd-category-filter]'
        ).forEach(function (button) {
            button.classList.toggle('is-active', button === allButton);
        });
    }

    function r27ManageButton() {
        return root.querySelector('[data-pmd-all-foods-manage-r27]');
    }

    function keepAllFoodsHostInteractive() {
        /*
         * V129 locks every data-pmd-category-fixed button with disabled=true
         * while category Edit mode is active. That is correct for a fixed
         * drag target, but a disabled button also suppresses pointer events for
         * the R28 pencil child in Safari. All Foods is already non-draggable;
         * keep the host enabled so only its explicit pencil remains actionable.
         * V129's sort-mode click branch still prevents category filtering.
         */
        allButton.draggable = false;
        if (allButton.disabled) allButton.disabled = false;
    }

    function normalizeAllFoodsLabel(pref) {
        var labelNode = q('[data-pmd-all-foods-label-r27]', allButton);
        if (!labelNode || !pref) return;

        // Hidden state is already expressed by visibility + styling. Do not add
        // a second textual "· Hidden" suffix to the category name.
        if (String(labelNode.textContent || '').trim() !== pref.label) {
            labelNode.textContent = pref.label;
        }
    }

    function ensureEditBadge() {
        var badge = q('[data-pmd-all-foods-edit-badge-r28]', allButton);
        var pref = currentPreference();

        keepAllFoodsHostInteractive();
        normalizeAllFoodsLabel(pref);

        if (!badge) {
            badge = document.createElement('span');
            badge.setAttribute('data-pmd-all-foods-edit-badge-r28', '');
            badge.setAttribute('draggable', 'false');
            badge.setAttribute('aria-hidden', 'true');
            badge.innerHTML = ''
                + '<svg viewBox="0 0 24 24" aria-hidden="true">'
                + '<path d="M12 20h9"></path>'
                + '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
                + '</svg>';
            allButton.appendChild(badge);
        }

        badge.setAttribute('title', copy.edit + ': ' + pref.label);
        badge.setAttribute('aria-label', copy.edit + ': ' + pref.label);
        badge.setAttribute('aria-hidden', editMode() ? 'false' : 'true');
        badge.tabIndex = editMode() ? 0 : -1;

        allButton.setAttribute('data-pmd-all-foods-category-parity-r28', '1');
        return badge;
    }

    function openR27Editor() {
        if (!editMode()) return false;

        var api = window.PMDMenuAllFoodsR27;
        if (api && typeof api.open === 'function') {
            return api.open() !== false;
        }

        var compatibilityButton = r27ManageButton();
        if (!compatibilityButton) return false;

        compatibilityButton.click();
        return true;
    }

    function csrf(data) {
        if (data.has('_token')) return;
        var meta = q('meta[name="csrf-token"]');
        var hidden = q('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
        if (token) data.append('_token', token);
    }

    async function saveAllFoodsFromSmartModal(modal) {
        if (saveBusy || !modal) return;

        var input = q('[data-pmd-smart-name]', modal);
        var status = q('[data-pmd-smart-status]', modal);
        var save = q('[data-pmd-smart-save]', modal);
        var label = String(input && input.value || '').trim();

        if (label.length < 2) {
            if (input) input.focus();
            return;
        }

        var data = new FormData();
        data.append('label', label);
        data.append('visible', '1');
        csrf(data);

        saveBusy = true;
        if (input) input.disabled = true;
        if (save) {
            save.disabled = true;
            save.textContent = copy.saving;
        }
        if (status) {
            status.textContent = copy.saving;
            status.classList.remove('is-error');
        }

        try {
            var response = await fetch('/admin/pmdallfoods', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-IGNITER-REQUEST-HANDLER': 'onSave',
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
                payload = {message: raw || copy.failed};
            }

            if (!response.ok || payload.ok === false) {
                throw new Error(payload.message || copy.failed);
            }

            var pref = payload.all_foods || {label: label, visible: true};
            try {
                window.localStorage.setItem(
                    'pmd_menu_all_foods_r27:' + String(window.location.host || 'tenant'),
                    JSON.stringify({
                        label: String(pref.label || label).trim() || label,
                        visible: true
                    })
                );
            } catch (error) {}

            window.location.reload();
        } catch (error) {
            saveBusy = false;
            if (input) input.disabled = false;
            if (save) {
                save.disabled = false;
                save.textContent = de ? 'Kategorie speichern' : 'Save category';
            }
            if (status) {
                status.textContent = error && error.message ? error.message : copy.failed;
                status.classList.add('is-error');
            }
        }
    }

    function deselectAllFoodsPurpose(modal) {
        if (!modal) return;
        modal.removeAttribute('data-pmd-all-foods-selected-r28');
        var choice = q('[data-pmd-all-foods-kind-r28]', modal);
        if (choice) {
            choice.classList.remove('is-active');
            choice.setAttribute('aria-pressed', 'false');
        }
    }

    function selectAllFoodsPurpose(modal, choice) {
        if (!modal || !choice) return;
        if (choice.getAttribute('aria-disabled') === 'true') return;

        modal.setAttribute('data-pmd-all-foods-selected-r28', '1');

        modal.querySelectorAll('[data-pmd-smart-kind]').forEach(function (node) {
            node.classList.remove('is-active');
            node.setAttribute('aria-pressed', 'false');
        });

        choice.classList.add('is-active');
        choice.setAttribute('aria-pressed', 'true');

        var input = q('[data-pmd-smart-name]', modal);
        var pref = currentPreference();
        if (input) {
            input.value = pref.label;
            input.focus({preventScroll: true});
        }
    }

    function ensureAllFoodsPurposeChoice() {
        if (!smartModal || !smartModal.isConnected) return;
        if (!smartKinds || !smartKinds.isConnected) return;

        if (smartKinds.classList.contains('is-readonly')) {
            var oldReadonlyChoice = q('[data-pmd-all-foods-kind-r28]', smartKinds);
            if (oldReadonlyChoice) oldReadonlyChoice.remove();
            smartKinds.removeAttribute('data-pmd-all-foods-purpose-grid-r28');
            deselectAllFoodsPurpose(smartModal);
            return;
        }

        var pref = currentPreference();
        var choice = q('[data-pmd-all-foods-kind-r28]', smartKinds);

        if (!choice) {
            choice = document.createElement('div');
            choice.setAttribute('role', 'button');
            choice.setAttribute('data-pmd-all-foods-kind-r28', '');
            choice.className = 'pmd-smart-kind pmd-smart-kind--all-foods-r28';
            choice.innerHTML = ''
                + '<span class="pmd-smart-kind__mark" aria-hidden="true"></span>'
                + '<strong data-pmd-all-foods-kind-label-r28></strong>';
            smartKinds.insertBefore(choice, smartKinds.firstChild || null);
        }

        var selected = smartModal.getAttribute('data-pmd-all-foods-selected-r28') === '1';
        var disabled = pref.visible;
        var label = pref.label + (disabled ? ' - ' + copy.alreadyExists : '');

        choice.classList.toggle('is-active', selected && !disabled);
        choice.classList.toggle('is-disabled', disabled);
        choice.setAttribute('aria-pressed', selected && !disabled ? 'true' : 'false');
        choice.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        choice.tabIndex = disabled ? -1 : 0;

        var labelNode = q('[data-pmd-all-foods-kind-label-r28]', choice);
        if (labelNode) labelNode.textContent = label;

        smartKinds.setAttribute('data-pmd-all-foods-purpose-grid-r28', '1');
    }

    function wireSmartModal(modal) {
        if (!modal || modal.getAttribute('data-pmd-all-foods-modal-bridge-r28') === '1') return;

        modal.setAttribute('data-pmd-all-foods-modal-bridge-r28', '1');

        modal.addEventListener('click', function (event) {
            var allChoice = event.target.closest('[data-pmd-all-foods-kind-r28]');
            if (allChoice) {
                event.preventDefault();
                event.stopImmediatePropagation();
                selectAllFoodsPurpose(modal, allChoice);
                return;
            }

            var baseKind = event.target.closest('[data-pmd-smart-kind]');
            if (baseKind) {
                deselectAllFoodsPurpose(modal);
                queueMicrotask(ensureAllFoodsPurposeChoice);
                return;
            }

            var save = event.target.closest('[data-pmd-smart-save]');
            if (
                save
                && modal.getAttribute('data-pmd-all-foods-selected-r28') === '1'
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                saveAllFoodsFromSmartModal(modal);
            }
        }, true);

        modal.addEventListener('keydown', function (event) {
            var allChoice = event.target.closest('[data-pmd-all-foods-kind-r28]');
            if (!allChoice) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            selectAllFoodsPurpose(modal, allChoice);
        }, true);
    }

    function connectSmartModalBridge() {
        var found = document.querySelector(
            '.pmd-smart-category-modal:not(.pmd-all-foods-modal-r27)'
        );
        if (!found) return false;

        smartModal = found;
        smartKinds = q('[data-pmd-smart-kinds]', smartModal);
        if (!smartKinds) return false;

        wireSmartModal(smartModal);
        ensureAllFoodsPurposeChoice();

        if (kindObserver) kindObserver.disconnect();
        kindObserver = new MutationObserver(function () {
            queueMicrotask(ensureAllFoodsPurposeChoice);
        });
        kindObserver.observe(smartKinds, {
            childList: true,
            subtree: false,
            attributes: true,
            attributeFilter: ['class']
        });

        return true;
    }

    document.addEventListener('click', function (event) {
        var badge = event.target.closest('[data-pmd-all-foods-edit-badge-r28]');
        if (!badge || !root.contains(badge)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        openR27Editor();
    }, true);

    document.addEventListener('keydown', function (event) {
        var badge = event.target.closest('[data-pmd-all-foods-edit-badge-r28]');
        if (!badge || !root.contains(badge)) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        event.stopImmediatePropagation();
        openR27Editor();
    }, true);

    lockVisibleAllFoodsAsInitialCategory();
    ensureEditBadge();

    allButtonObserver = new MutationObserver(function () {
        queueMicrotask(function () {
            ensureEditBadge();
            ensureAllFoodsPurposeChoice();
        });
    });
    allButtonObserver.observe(allButton, {
        attributes: true,
        attributeFilter: [
            'data-pmd-all-foods-visible-r27',
            'class',
            'hidden',
            'disabled'
        ],
        childList: true
    });

    if (!connectSmartModalBridge()) {
        bodyObserver = new MutationObserver(function () {
            if (connectSmartModalBridge() && bodyObserver) {
                bodyObserver.disconnect();
                bodyObserver = null;
            }
        });
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();