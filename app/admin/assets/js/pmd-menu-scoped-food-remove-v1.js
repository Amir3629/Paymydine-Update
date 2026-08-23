/* PMD_MENU_SCOPED_FOOD_REMOVE_V1
 *
 * Menu Edit-mode food removal semantics:
 * - All Foods: leave the click to V129 => permanent food deletion.
 * - One real category: remove there => backend deletes the food completely.
 * - Multiple real categories: remove only the active category membership;
 *   the food remains in All Foods and in every other category.
 *
 * This file owns only category-scoped FOOD removal. Combo deletion and the
 * permanent All Foods delete path remain owned by the existing V129 authority.
 */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/pmdmenus') return;

    var root = document.querySelector('[data-pmd-menu-manager]');
    if (!root) return;

    var inFlight = new Set();

    var localeMatch = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
    var locale = String(
        (localeMatch && localeMatch[1])
        || document.documentElement.lang
        || 'en'
    ).toLowerCase();
    var de = locale.indexOf('de') === 0;

    function csrf(data) {
        if (data.has('_token')) return;
        var meta = document.querySelector('meta[name="csrf-token"]');
        var hidden = document.querySelector('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
        if (token) data.append('_token', token);
    }

    function activeCategory() {
        var button = root.querySelector('[data-pmd-category-filter].is-active');
        if (!button) return null;

        var id = Number(button.getAttribute('data-pmd-category-id') || 0);
        if (!id) return null;

        var label = String(button.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();

        return {
            id: id,
            label: label || (de ? 'dieser Kategorie' : 'this category')
        };
    }

    function baseCategoryIds(card) {
        if (!card) return [];

        var raw = card.dataset.pmdSmartBaseCategoryIds;
        if (raw == null || raw === '') {
            raw = card.getAttribute('data-category-ids') || '';
        }

        return String(raw)
            .split(',')
            .map(function (value) { return Number(String(value).trim() || 0); })
            .filter(function (id) { return id > 0; })
            .filter(function (id, index, ids) { return ids.indexOf(id) === index; });
    }

    function foodName(card) {
        var heading = card && card.querySelector('.pmd-menu-card__title-row h2, h2');
        return String(heading && heading.textContent || '')
            .replace(/\s+/g, ' ')
            .trim() || (de ? 'diese Speise' : 'this food');
    }

    function confirmation(card, category) {
        var name = foodName(card);
        var ids = baseCategoryIds(card);
        var directlyInCategory = ids.indexOf(category.id) !== -1;
        var willRemain = directlyInCategory && ids.length > 1;

        if (de) {
            if (willRemain) {
                return '"' + name + '" aus "' + category.label
                    + '" entfernen? Die Speise bleibt in Alle Speisen und in ihren anderen Kategorien.';
            }
            return '"' + name + '" aus "' + category.label
                + '" entfernen? Wenn dies ihre einzige direkte Kategorie ist, wird die Speise vollständig gelöscht und verschwindet auch aus Alle Speisen.';
        }

        if (willRemain) {
            return 'Remove "' + name + '" from "' + category.label
                + '"? The food will stay in All Foods and in its other categories.';
        }

        return 'Remove "' + name + '" from "' + category.label
            + '"? If this is its only direct category, the food will be deleted completely and disappear from All Foods too.';
    }

    async function requestRemoval(menuId, categoryId) {
        var data = new FormData();
        data.append('menu_id', String(menuId));
        data.append('category_id', String(categoryId));
        csrf(data);

        var response = await fetch('/admin/pmdmenufoodmembership', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-IGNITER-REQUEST-HANDLER': 'onRemoveFromCategory',
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

    function applyDetachedState(card, payload) {
        var remaining = Array.isArray(payload.remaining_category_ids)
            ? payload.remaining_category_ids.map(Number).filter(function (id) { return id > 0; })
            : [];
        var text = remaining.join(',');

        card.setAttribute('data-category-ids', text);
        if (card.dataset.pmdSmartBaseCategoryIds != null) {
            card.dataset.pmdSmartBaseCategoryIds = text;
        }

        // We are still looking at the category that was just detached, so hide
        // the card now. V129's normal filter pass will show it again when the
        // user switches to All Foods or another remaining category.
        card.hidden = true;
        card.setAttribute('aria-hidden', 'true');
    }

    document.addEventListener('click', function (event) {
        var trigger = event.target.closest(
            '[data-pmd-edit-delete-kind="food"][data-pmd-edit-delete-id]'
        );
        if (!trigger || !root.contains(trigger)) return;

        var editMode = String(root.getAttribute('data-pmd-sort-mode') || '0');
        if (editMode === '0') return;

        var category = activeCategory();

        // All Foods (and non-category synthetic filters) intentionally keep the
        // existing V129 permanent-delete behavior.
        if (!category) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        var menuId = Number(trigger.getAttribute('data-pmd-edit-delete-id') || 0);
        if (!menuId || inFlight.has(menuId)) return;

        var card = trigger.closest('[data-pmd-menu-card][data-item-type="food"]');
        if (!card) return;

        if (!window.confirm(confirmation(card, category))) return;

        inFlight.add(menuId);
        trigger.disabled = true;
        trigger.classList.add('is-busy');

        requestRemoval(menuId, category.id)
            .then(function (payload) {
                if (payload.action === 'detached') {
                    applyDetachedState(card, payload);
                    console.info('[PMD Menu Scoped Food Remove V1] category detached', payload);
                    return;
                }

                // A last-category removal is a real product deletion. Reload so
                // KPIs, smart selections, combo references and every filter are
                // rebuilt from the canonical server state.
                if (payload.action === 'deleted') {
                    window.location.reload();
                    return;
                }

                throw new Error(payload.message || 'Unexpected removal result.');
            })
            .catch(function (error) {
                window.alert(
                    error && error.message
                        ? error.message
                        : (de
                            ? 'Die Speise konnte nicht aus der Kategorie entfernt werden.'
                            : 'The food could not be removed from this category.')
                );
            })
            .finally(function () {
                inFlight.delete(menuId);
                if (document.contains(trigger)) {
                    trigger.disabled = false;
                    trigger.classList.remove('is-busy');
                }
            });
    }, true);

    window.PMDMenuScopedFoodRemoveV1 = {
        version: '1.0.0',
        inspect: function () {
            var category = activeCategory();
            return {
                editMode: String(root.getAttribute('data-pmd-sort-mode') || '0'),
                category: category,
                inFlight: Array.from(inFlight)
            };
        }
    };

    console.info('[PMD Menu Scoped Food Remove V1] Ready');
})();
