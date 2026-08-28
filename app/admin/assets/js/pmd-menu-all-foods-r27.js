/* PMD_MENU_ALL_FOODS_PREFERENCE_R27
 * Tenant-local All Foods view management for /admin/pmdmenus.
 * All Foods remains a virtual filter: rename/hide never changes food membership.
 */
(function () {
    'use strict';

    var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
    if (path !== '/admin/pmdmenus') return;

    var root = document.querySelector('[data-pmd-menu-manager]');
    if (!root) return;

    var allButton = root.querySelector('[data-pmd-category-filter="all"][data-pmd-category-fixed]');
    if (!allButton) return;

    var initialLabel = String(allButton.textContent || '').trim() || 'All foods';
    var preference = {
        label: initialLabel,
        visible: true
    };
    var loaded = false;
    var busy = false;
    var modal = null;
    var manageButton = null;
    var observer = null;
    var cacheKey = 'pmd_menu_all_foods_r27:' + String(window.location.host || 'tenant');

    var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
    var locale = String((localeMatch && localeMatch[1]) || document.documentElement.lang || 'en').toLowerCase();
    var de = locale.indexOf('de') === 0;

    var copy = de ? {
        eyebrow: 'Menukategorien',
        title: 'Kategorie bearbeiten',
        name: 'Kategoriename',
        nameHelp: 'Benenne die Ansicht so, wie sie in der Kategorienleiste erscheinen soll.',
        viewTitle: 'Alle-Speisen-Ansicht',
        viewHelp: 'Dies ist nur eine Ansicht und keine gespeicherte Kategorie. Entfernen blendet sie aus und löscht keine Speisen.',
        hidden: 'Ausgeblendet',
        edit: 'Bearbeiten',
        remove: 'Kategorie entfernen',
        restore: 'Kategorie wiederherstellen',
        cancel: 'Abbrechen',
        save: 'Kategorie speichern',
        saving: 'Speichern...',
        saved: 'Gespeichert',
        failed: 'Die Alle-Speisen-Einstellung konnte nicht gespeichert werden.'
    } : {
        eyebrow: 'Menu categories',
        title: 'Edit category',
        name: 'Category name',
        nameHelp: 'Name this view exactly as it should appear in the category strip.',
        viewTitle: 'All Foods view',
        viewHelp: 'This is a view, not a stored category. Removing it only hides the view and never deletes foods.',
        hidden: 'Hidden',
        edit: 'Edit',
        remove: 'Remove category',
        restore: 'Restore category',
        cancel: 'Cancel',
        save: 'Save category',
        saving: 'Saving...',
        saved: 'Saved',
        failed: 'All Foods preference could not be saved.'
    };

    function q(selector, scope) {
        return (scope || document).querySelector(selector);
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

        var response = await fetch('/admin/pmdallfoods', {
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

    function readCache() {
        try {
            var raw = window.localStorage.getItem(cacheKey);
            if (!raw) return;
            var cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') return;
            if (typeof cached.label === 'string' && cached.label.trim() !== '') {
                preference.label = cached.label.trim();
            }
            if (typeof cached.visible === 'boolean') {
                preference.visible = cached.visible;
            }
        } catch (error) {}
    }

    function writeCache() {
        try {
            window.localStorage.setItem(cacheKey, JSON.stringify({
                label: preference.label,
                visible: Boolean(preference.visible)
            }));
        } catch (error) {}
    }

    function editMode() {
        return String(root.getAttribute('data-pmd-sort-mode') || '0') !== '0';
    }

    function ensureLabelNode() {
        var label = q('[data-pmd-all-foods-label-r27]', allButton);
        if (label) return label;

        allButton.textContent = '';
        label = document.createElement('span');
        label.setAttribute('data-pmd-all-foods-label-r27', '');
        allButton.appendChild(label);
        return label;
    }

    function ensureManageButton() {
        if (manageButton && manageButton.isConnected) return manageButton;

        manageButton = document.createElement('button');
        manageButton.type = 'button';
        manageButton.className = 'pmd-all-foods-manage-r27';
        manageButton.setAttribute('data-pmd-all-foods-manage-r27', '');
        manageButton.setAttribute('aria-label', copy.edit + ' ' + preference.label);
        manageButton.innerHTML = ''
            + '<svg viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M12 20h9"></path>'
            + '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
            + '</svg>';

        allButton.insertAdjacentElement('afterend', manageButton);

        manageButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openModal();
        }, true);

        return manageButton;
    }

    function selectFallbackCategory() {
        if (!allButton.classList.contains('is-active')) return;

        var candidates = Array.prototype.slice.call(
            root.querySelectorAll('[data-pmd-category-filter][data-pmd-category-id]')
        ).filter(function (button) {
            return !button.hidden && !button.disabled;
        });

        if (candidates.length) {
            candidates[0].click();
        }
    }

    function render() {
        var label = ensureLabelNode();
        var manage = ensureManageButton();
        var editing = editMode();

        label.textContent = preference.label + (!preference.visible && editing ? ' · ' + copy.hidden : '');
        allButton.setAttribute('data-pmd-all-foods-visible-r27', preference.visible ? '1' : '0');
        allButton.classList.toggle('is-pmd-all-foods-hidden-r27', !preference.visible);

        if (preference.visible) {
            allButton.hidden = false;
            allButton.removeAttribute('aria-hidden');
        } else if (editing) {
            allButton.hidden = false;
            allButton.removeAttribute('aria-hidden');
        } else {
            allButton.hidden = true;
            allButton.setAttribute('aria-hidden', 'true');
            selectFallbackCategory();
        }

        manage.hidden = !editing;
        manage.setAttribute('aria-hidden', editing ? 'false' : 'true');
        manage.tabIndex = editing ? 0 : -1;
        manage.setAttribute('aria-label', copy.edit + ' ' + preference.label);

        root.setAttribute('data-pmd-all-foods-ready-r27', loaded ? '1' : '0');
    }

    function ensureModal() {
        if (modal && modal.isConnected) return modal;

        modal = document.createElement('div');
        modal.className = 'pmd-smart-category-modal pmd-all-foods-modal-r27';
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = ''
            + '<div class="pmd-smart-category-modal__backdrop" data-pmd-all-foods-close-r27></div>'
            + '<section class="pmd-smart-category-modal__card" role="dialog" aria-modal="true" aria-labelledby="pmd-all-foods-title-r27">'
            + '  <header class="pmd-smart-category-modal__header">'
            + '    <div class="pmd-smart-category-modal__heading"><span></span><h2 id="pmd-all-foods-title-r27"></h2></div>'
            + '    <button type="button" class="pmd-smart-category-modal__close" data-pmd-all-foods-close-r27 aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'
            + '  </header>'
            + '  <div class="pmd-smart-category-modal__body">'
            + '    <label class="pmd-smart-field"><span data-pmd-all-foods-name-label-r27></span><input type="text" maxlength="64" minlength="2" required data-pmd-all-foods-name-r27><small data-pmd-all-foods-name-help-r27></small></label>'
            + '    <section class="pmd-smart-section pmd-all-foods-modal-r27__note"><div class="pmd-smart-section__head"><strong data-pmd-all-foods-view-title-r27></strong><p data-pmd-all-foods-view-help-r27></p></div></section>'
            + '  </div>'
            + '  <footer class="pmd-smart-category-modal__footer">'
            + '    <span class="pmd-smart-status" data-pmd-all-foods-status-r27 aria-live="polite"></span>'
            + '    <button type="button" class="pmd-smart-btn pmd-smart-btn--danger" data-pmd-all-foods-remove-r27></button>'
            + '    <button type="button" class="pmd-smart-btn pmd-smart-btn--primary" data-pmd-all-foods-restore-r27 hidden></button>'
            + '    <button type="button" class="pmd-smart-btn pmd-all-foods-cancel-r27" data-pmd-all-foods-close-r27></button>'
            + '    <button type="button" class="pmd-smart-btn pmd-smart-btn--primary" data-pmd-all-foods-save-r27></button>'
            + '  </footer>'
            + '</section>';

        q('.pmd-smart-category-modal__heading > span', modal).textContent = copy.eyebrow;
        q('#pmd-all-foods-title-r27', modal).textContent = copy.title;
        q('[data-pmd-all-foods-name-label-r27]', modal).textContent = copy.name;
        q('[data-pmd-all-foods-name-help-r27]', modal).textContent = copy.nameHelp;
        q('[data-pmd-all-foods-view-title-r27]', modal).textContent = copy.viewTitle;
        q('[data-pmd-all-foods-view-help-r27]', modal).textContent = copy.viewHelp;
        q('[data-pmd-all-foods-remove-r27]', modal).textContent = copy.remove;
        q('[data-pmd-all-foods-restore-r27]', modal).textContent = copy.restore;
        q('.pmd-all-foods-cancel-r27', modal).textContent = copy.cancel;
        q('[data-pmd-all-foods-save-r27]', modal).textContent = copy.save;

        modal.addEventListener('click', function (event) {
            if (event.target.closest('[data-pmd-all-foods-close-r27]')) {
                event.preventDefault();
                if (!busy) closeModal();
                return;
            }

            if (event.target.closest('[data-pmd-all-foods-save-r27]')) {
                event.preventDefault();
                savePreference();
                return;
            }

            if (event.target.closest('[data-pmd-all-foods-remove-r27]')) {
                event.preventDefault();
                hidePreference();
                return;
            }

            if (event.target.closest('[data-pmd-all-foods-restore-r27]')) {
                event.preventDefault();
                restorePreference();
            }
        }, false);

        document.body.appendChild(modal);
        return modal;
    }

    function setStatus(message, error) {
        var node = q('[data-pmd-all-foods-status-r27]', ensureModal());
        if (!node) return;
        node.textContent = message || '';
        node.classList.toggle('is-error', Boolean(error));
        node.classList.toggle('is-ok', Boolean(message) && !error);
    }

    function syncModalButtons() {
        var node = ensureModal();
        var remove = q('[data-pmd-all-foods-remove-r27]', node);
        var restore = q('[data-pmd-all-foods-restore-r27]', node);
        var save = q('[data-pmd-all-foods-save-r27]', node);

        remove.hidden = !preference.visible;
        restore.hidden = preference.visible;
        remove.disabled = busy;
        restore.disabled = busy;
        save.disabled = busy;
        save.textContent = busy ? copy.saving : copy.save;
    }

    function openModal() {
        var node = ensureModal();
        q('[data-pmd-all-foods-name-r27]', node).value = preference.label;
        setStatus('');
        syncModalButtons();
        node.hidden = false;
        node.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('pmd-menu-manager-modal-open');
        document.body.style.setProperty('overflow', 'hidden');
        requestAnimationFrame(function () {
            var input = q('[data-pmd-all-foods-name-r27]', node);
            if (input) input.focus({preventScroll: true});
        });
    }

    function closeModal() {
        var node = ensureModal();
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('pmd-menu-manager-modal-open');
        document.body.style.removeProperty('overflow');
        setStatus('');
        if (manageButton && !manageButton.hidden) manageButton.focus({preventScroll: true});
    }

    async function savePreference() {
        if (busy) return;
        var input = q('[data-pmd-all-foods-name-r27]', ensureModal());
        var label = String(input && input.value || '').trim();
        if (label.length < 2) {
            setStatus(copy.failed, true);
            if (input) input.focus();
            return;
        }

        var data = new FormData();
        data.append('label', label);
        data.append('visible', preference.visible ? '1' : '0');

        busy = true;
        syncModalButtons();
        setStatus(copy.saving, false);

        try {
            var payload = await backend('onSave', data);
            preference = payload.all_foods || {label: label, visible: preference.visible};
            preference.label = String(preference.label || label).trim() || label;
            preference.visible = Boolean(preference.visible);
            loaded = true;
            writeCache();
            render();
            setStatus(copy.saved, false);
            window.setTimeout(closeModal, 180);
        } catch (error) {
            setStatus(error && error.message ? error.message : copy.failed, true);
        } finally {
            busy = false;
            syncModalButtons();
        }
    }

    async function hidePreference() {
        if (busy) return;
        busy = true;
        syncModalButtons();
        setStatus(copy.saving, false);

        try {
            var payload = await backend('onHide', new FormData());
            preference = payload.all_foods || preference;
            preference.visible = false;
            loaded = true;
            writeCache();
            render();
            closeModal();
        } catch (error) {
            setStatus(error && error.message ? error.message : copy.failed, true);
        } finally {
            busy = false;
            syncModalButtons();
        }
    }

    async function restorePreference() {
        if (busy) return;
        busy = true;
        syncModalButtons();
        setStatus(copy.saving, false);

        try {
            var payload = await backend('onRestore', new FormData());
            preference = payload.all_foods || preference;
            preference.visible = true;
            loaded = true;
            writeCache();
            render();
            setStatus(copy.saved, false);
        } catch (error) {
            setStatus(error && error.message ? error.message : copy.failed, true);
        } finally {
            busy = false;
            syncModalButtons();
        }
    }

    async function loadPreference() {
        try {
            var payload = await backend('onBootstrap', new FormData());
            if (payload && payload.all_foods) {
                preference.label = String(payload.all_foods.label || preference.label).trim() || preference.label;
                preference.visible = Boolean(payload.all_foods.visible);
            }
            loaded = true;
            writeCache();
            render();
        } catch (error) {
            loaded = true;
            render();
        }
    }

    function observeEditMode() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(function (mutations) {
            var changed = mutations.some(function (mutation) {
                return mutation.type === 'attributes' && mutation.attributeName === 'data-pmd-sort-mode';
            });
            if (changed) requestAnimationFrame(render);
        });
        observer.observe(root, {attributes: true, attributeFilter: ['data-pmd-sort-mode']});
    }

    function installPublicApi() {
        window.PMDMenuAllFoodsR27 = {
            version: '27.1.0',
            open: function () {
                if (!editMode()) return false;
                openModal();
                return true;
            },
            close: function () {
                if (busy) return false;
                closeModal();
                return true;
            },
            hide: function () {
                return hidePreference();
            },
            restore: function () {
                return restorePreference();
            },
            inspect: function () {
                return {
                    loaded: loaded,
                    busy: busy,
                    editMode: editMode(),
                    label: preference.label,
                    visible: Boolean(preference.visible),
                    modalOpen: Boolean(modal && !modal.hidden)
                };
            }
        };
    }

    readCache();
    ensureLabelNode();
    ensureManageButton();
    render();
    observeEditMode();
    installPublicApi();
    loadPreference();
})();