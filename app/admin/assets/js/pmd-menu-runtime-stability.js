/* PMD_MENU_RUNTIME_STABILITY_CANONICAL
 *
 * Single runtime-continuity owner for /admin/pmdmenus.
 *
 * Contract:
 * - never leave mixed old/new menu roots alive after a mutation;
 * - quarantine legacy category minus controls and old header separator;
 * - keep removed All Foods absent until explicitly restored;
 * - default normal Menu view to the first regular food category, not a
 *   Chef/Bestseller/Combination smart category;
 * - identify that regular category before Smart bootstrap from canonical
 *   server-rendered food/category membership;
 * - wait only for synchronous V129 readiness before releasing first paint;
 * - keep the Add Food action usable during Smart Categories bootstrap;
 * - relinquish temporary action-card ownership as soon as Smart Categories
 *   becomes ready;
 * - selection shells keep all real categories visible as filters.
 */
(function () {
    'use strict';

    var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
    // PMD_MENU_CLEAN_ALIAS_R3_CLEAN
    if (path !== '/admin/pmdmenus' && path !== '/admin/menu') return;

    var root = document.querySelector('[data-pmd-menu-manager]');
    if (!root) return;

    var initialRoot = root;
    var reloadPending = false;
    var bodyObserver = null;
    var rootObserver = null;
    var nativeReplaceWith = Element.prototype.replaceWith;
    var firstPaintReleased = false;
    var managerWaitStartedAt = Date.now();
    var earlyActionBridgeInstalled = false;

    function currentRoot() {
        return document.querySelector('[data-pmd-menu-manager]');
    }

    function isSmartReady() {
        return Boolean(
            window.PMDMenuSmartCategoriesV1
            && window.PMDMenuSmartCategoriesV1.ready
        );
    }

    // PMD_MENU_ROOT_ADOPTION_R3_CLEAN
    function requestCleanReload(reason) {
        if (reloadPending) return;
        reloadPending = true;

        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload',
                String(reason || 'refresh')
            );
        } catch (error) {}

        var key = 'pmd.menu.runtime.reload.r3';
        var now = Date.now();
        var previous = 0;
        try { previous = Number(sessionStorage.getItem(key) || 0); } catch (error) {}

        // PMD_MENU_NO_RELOAD_R4
        // Root replacement is an in-page lifecycle event. Reloading the whole
        // document can create a tenant-specific reload loop, so always adopt
        // the current server-rendered root instead.
        try { sessionStorage.setItem(key, String(now)); } catch (error) {}

        var liveRoot = currentRoot();
        if (liveRoot) {
            if (rootObserver) rootObserver.disconnect();
            if (bodyObserver) bodyObserver.disconnect();
            root = liveRoot;
            initialRoot = liveRoot;
            firstPaintReleased = false;
            managerWaitStartedAt = Date.now();
            reloadPending = false;
            installRootReplacementGuard();
            stabilize(liveRoot);
            observeRuntime();
            releaseFirstPaint('root-adopted-' + String(reason || 'refresh'));
            try {
                document.documentElement.setAttribute(
                    'data-pmd-menu-runtime-reload-suppressed-r3',
                    String(reason || 'refresh')
                );
            } catch (error) {}
            return;
        }

        reloadPending = false;
        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload-suppressed-r3',
                String(reason || 'refresh')
            );
        } catch (error) {}
    }

    function quarantineLegacyCategoryControls(scope) {
        var node = scope || currentRoot();
        if (!node) return;

        node.querySelectorAll(
            '[data-pmd-category-delete], .pmd-menu-manager__category-delete-hit'
        ).forEach(function (control) {
            control.remove();
        });
    }

    function removeLegacyHeaderSeparator(scope) {
        var node = scope || currentRoot();
        if (!node) return;

        node.querySelectorAll(
            '[data-pmd-main-header-notification-gap-r67], '
            + '[data-pmd-main-header-notification-divider-r67]'
        ).forEach(function (control) {
            control.remove();
        });
    }

    function syncAllFoodsVisibility(node) {
        node = node || currentRoot();
        if (!node) return;

        var allFoods = node.querySelector(
            '[data-pmd-category-filter="all"][data-pmd-category-fixed]'
        );
        if (!allFoods) return;

        var visible = allFoods.getAttribute(
            'data-pmd-all-foods-visible-r27'
        ) !== '0';

        if (visible) return;

        if (!allFoods.hidden) allFoods.hidden = true;
        if (allFoods.getAttribute('aria-hidden') !== 'true') {
            allFoods.setAttribute('aria-hidden', 'true');
        }
        if (allFoods.classList.contains('is-active')) {
            allFoods.classList.remove('is-active');
        }

        var badge = allFoods.querySelector(
            '[data-pmd-all-foods-edit-badge-r28]'
        );
        if (badge) {
            if (badge.getAttribute('aria-hidden') !== 'true') {
                badge.setAttribute('aria-hidden', 'true');
            }
            if (badge.tabIndex !== -1) badge.tabIndex = -1;
        }
    }

    function smartCategoryKind(categoryId) {
        if (!isSmartReady()) return null;

        var categories = window.PMDMenuSmartCategoriesV1.categories || [];
        var wanted = Number(categoryId || 0);
        var match = categories.find(function (category) {
            return Number(category && category.id || 0) === wanted;
        });

        return match
            ? String(match.kind || 'regular').toLowerCase()
            : null;
    }

    function cardHasServerCategory(node, categoryId) {
        var wanted = String(categoryId || '').trim();
        if (!wanted) return false;

        return Array.prototype.some.call(
            node.querySelectorAll(
                '[data-pmd-menu-card][data-item-type="food"]'
            ),
            function (card) {
                var raw = card.dataset.pmdSmartBaseCategoryIds;
                if (raw == null || raw === '') {
                    raw = card.getAttribute('data-category-ids') || '';
                }

                return String(raw)
                    .split(',')
                    .map(function (value) {
                        return String(value).trim();
                    })
                    .filter(Boolean)
                    .indexOf(wanted) !== -1;
            }
        );
    }

    function firstRegularCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        var buttons = Array.prototype.filter.call(
            node.querySelectorAll(
                '.pmd-menu-manager__categories [data-pmd-category-id]'
            ),
            function (button) {
                return !button.hidden
                    && button.getAttribute('aria-hidden') !== 'true'
                    && !button.disabled;
            }
        );

        if (!buttons.length) return null;

        if (isSmartReady()) {
            var regular = buttons.find(function (button) {
                return smartCategoryKind(
                    button.getAttribute('data-pmd-category-id')
                ) === 'regular';
            });

            if (regular) return regular;
        }

        // Before smart bootstrap, special categories have no canonical
        // menu_categories membership. Prefer the first category already used
        // by at least one server-rendered food card.
        var withServerFood = buttons.find(function (button) {
            return cardHasServerCategory(
                node,
                button.getAttribute('data-pmd-category-id')
            );
        });

        return withServerFood || buttons[0] || null;
    }

    function visibleAllFoodsButton(node) {
        node = node || currentRoot();
        if (!node) return null;

        var allFoods = node.querySelector(
            '[data-pmd-category-filter="all"]'
            + '[data-pmd-category-fixed]'
        );

        if (!allFoods) return null;

        var preferenceVisible = allFoods.getAttribute(
            'data-pmd-all-foods-visible-r27'
        ) !== '0';

        if (
            !preferenceVisible
            || allFoods.hidden
            || allFoods.getAttribute('aria-hidden') === 'true'
        ) {
            return null;
        }

        return allFoods;
    }

    function enforceVisibleAllFoods(node) {
        node = node || currentRoot();
        if (!node) return false;

        var allFoods = visibleAllFoodsButton(node);
        if (!allFoods) return false;

        node.setAttribute(
            'data-pmd-menu-initial-category-v1',
            'all'
        );

        var active = node.querySelector(
            '.pmd-menu-manager__categories '
            + '[data-pmd-category-filter].is-active'
        );

        if (active !== allFoods) {
            var managerReady = Boolean(
                window.PMDMenuManagerV1
                && window.PMDMenuManagerV1.ready
            );

            if (managerReady) {
                /*
                 * V129 owns filterState + card visibility.
                 * Once it is ready, use its existing click authority so
                 * DOM active state and actual food filtering cannot diverge.
                 */
                allFoods.click();
            } else {
                /*
                 * Before V129 is ready only normalize first-paint classes.
                 * Server markup already represents the All Foods dataset.
                 */
                node.querySelectorAll(
                    '.pmd-menu-manager__categories '
                    + '[data-pmd-category-filter]'
                ).forEach(function (button) {
                    button.classList.toggle(
                        'is-active',
                        button === allFoods
                    );
                });
            }
        }

        return true;
    }

    function selectInitialCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        /*
         * Product contract:
         * visible All Foods is first in the strip and is the default view.
         * Do not allow a later bootstrap authority to replace it with the
         * first regular/smart category.
         */
        if (enforceVisibleAllFoods(node)) {
            return 'all';
        }

        var existing = node.getAttribute(
            'data-pmd-menu-initial-category-v1'
        );

        if (existing === 'all') {
            node.removeAttribute(
                'data-pmd-menu-initial-category-v1'
            );
            existing = '';
        }

        if (existing) return existing;

        var first = firstRegularCategory(node);

        if (!first) {
            node.setAttribute(
                'data-pmd-menu-initial-category-v1',
                'all'
            );
            return 'all';
        }

        var categoryId = String(
            first.getAttribute('data-pmd-category-id') || ''
        );

        if (!first.classList.contains('is-active')) {
            first.click();
        }

        node.setAttribute(
            'data-pmd-menu-initial-category-v1',
            categoryId || 'all'
        );

        return categoryId || 'all';
    }

    function activeRealCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        return node.querySelector(
            '.pmd-menu-manager__categories '
            + '[data-pmd-category-id].is-active'
        );
    }

    // PMD_MENU_RUNTIME_CATALOGUE_COPY_R4_1
    function platformMenuText(key, fallback) {
        var runtime = window.PMDPlatformMessages;
        if (runtime && typeof runtime.t === 'function') {
            return runtime.t(key, {}, fallback || key);
        }

        var messages = window.PMD_PLATFORM_MESSAGES || {};
        var value = messages[key];
        return typeof value === 'string' && value.trim()
            ? value
            : (fallback || key);
    }

    function syncServerActionCardCopy(node) {
        node = node || currentRoot();
        if (!node || node.dataset.pmdComboBuilder === '1') return;

        // Smart Categories becomes the sole action-card copy/behavior owner
        // after bootstrap. Do not overwrite Chef/Bestseller/Combination copy.
        if (isSmartReady()) return;

        var card = node.querySelector(
            '[data-pmd-smart-server-action-card], .pmd-smart-add-card'
        );
        if (!card) return;

        var title = card.querySelector('[data-pmd-smart-add-title]');
        var help = card.querySelector('[data-pmd-smart-add-help]');
        var category = activeRealCategory(node);
        var categoryLabel = category
            ? String(category.textContent || '').trim()
            : '';
        var nextTitle = platformMenuText(
            'menu.smart.add_food',
            'Add new food item'
        );
        var nextHelp = categoryLabel
            ? platformMenuText(
                'menu.smart.add_food_help_category',
                'Create a new food item in {category}.'
            ).replace('{category}', categoryLabel)
            : platformMenuText(
                'menu.smart.add_food_help',
                'Create a new food item.'
            );

        if (title && title.textContent !== nextTitle) {
            title.textContent = nextTitle;
        }
        if (help && help.textContent !== nextHelp) {
            help.textContent = nextHelp;
        }
    }

    function preselectActiveCategoryInFoodModal(node) {
        node = node || currentRoot();
        if (!node) return;

        var category = activeRealCategory(node);
        if (!category) return;

        var id = String(
            category.getAttribute('data-pmd-category-id') || ''
        );
        if (!id) return;

        requestAnimationFrame(function () {
            var modal = document.querySelector('[data-pmd-menu-modal]');
            var choice = modal && modal.querySelector(
                '[data-pmd-menu-category-choice][value="'
                + id
                + '"]'
            );
            if (choice) choice.checked = true;
        });
    }

    function installEarlyActionCardBridge() {
        if (earlyActionBridgeInstalled) return;
        earlyActionBridgeInstalled = true;

        function activate(event) {
            var node = currentRoot();
            if (!node || node.dataset.pmdComboBuilder === '1') return;

            if (isSmartReady()) return;

            var card = event.target.closest('.pmd-smart-add-card');
            if (!card || !node.contains(card)) return;

            if (
                event.type === 'keydown'
                && event.key !== 'Enter'
                && event.key !== ' '
            ) {
                return;
            }

            var primary = node.querySelector(
                '[data-pmd-menu-header-primary][data-pmd-menu-create]'
            );
            if (!primary) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            primary.click();
            preselectActiveCategoryInFoodModal(node);
        }

        document.addEventListener('click', activate, true);
        document.addEventListener('keydown', activate, true);
    }

    function syncSelectionCategoryStrip(node) {
        node = node || currentRoot();
        if (!node || node.dataset.pmdComboBuilder !== '1') return;

        var host = node.querySelector('.pmd-menu-manager__categories');
        if (host) {
            if (host.hidden) host.hidden = false;
            host.removeAttribute('aria-hidden');
            host.style.removeProperty('display');
            host.style.removeProperty('visibility');
        }

        node.querySelectorAll(
            '.pmd-menu-manager__categories [data-pmd-category-id]'
        ).forEach(function (button) {
            if (button.hidden) button.hidden = false;
            button.removeAttribute('aria-hidden');
            button.style.removeProperty('display');
            button.style.removeProperty('visibility');
        });

        syncAllFoodsVisibility(node);
    }

    function stabilize(node) {
        node = node || currentRoot();
        if (!node) return;
        quarantineLegacyCategoryControls(node);
        removeLegacyHeaderSeparator(node);
        syncAllFoodsVisibility(node);
        syncSelectionCategoryStrip(node);
    }

    function releaseFirstPaint(reason) {
        if (firstPaintReleased) return;

        var node = currentRoot();
        if (!node || node !== initialRoot) return;

        if (node.dataset.pmdComboBuilder !== '1') {
            selectInitialCategory(node);
            syncServerActionCardCopy(node);
        }

        stabilize(node);

        node.setAttribute('data-pmd-menu-runtime-ready-v1', '1');
        node.setAttribute(
            'data-pmd-menu-runtime-ready-reason-v1',
            String(reason || 'ready')
        );

        firstPaintReleased = true;
    }

    function waitForManagerFirstPaint() {
        function check() {
            if (firstPaintReleased || reloadPending) return;

            var managerReady = Boolean(
                window.PMDMenuManagerV1
                && window.PMDMenuManagerV1.ready
            );

            if (managerReady) {
                selectInitialCategory(currentRoot());
                syncServerActionCardCopy(currentRoot());
                requestAnimationFrame(function () {
                    releaseFirstPaint('manager-ready');
                });
                return;
            }

            if (Date.now() - managerWaitStartedAt >= 400) {
                releaseFirstPaint('manager-timeout-fallback');
                return;
            }

            requestAnimationFrame(check);
        }

        requestAnimationFrame(check);
    }

    function installRootReplacementGuard() {
        if (root.__pmdMenuRuntimeReplaceGuard) return;
        root.__pmdMenuRuntimeReplaceGuard = true;

        var guardedReplaceWith = function () {
            var args = Array.prototype.slice.call(arguments);
            var replacement = args.length === 1 ? args[0] : null;

            if (
                replacement
                && replacement.nodeType === 1
                && replacement.matches
                && replacement.matches('[data-pmd-menu-manager]')
            ) {
                var result = nativeReplaceWith.apply(this, args);
                queueMicrotask(function () {
                    requestCleanReload('root-replace');
                });
                return result;
            }

            return nativeReplaceWith.apply(this, args);
        };

        try {
            Object.defineProperty(root, 'replaceWith', {
                configurable: true,
                writable: true,
                value: guardedReplaceWith
            });
        } catch (error) {
            try {
                root.replaceWith = guardedReplaceWith;
            } catch (ignored) {}
        }
    }

    function observeRuntime() {
        if (rootObserver) rootObserver.disconnect();
        rootObserver = new MutationObserver(function () {
            queueMicrotask(function () {
                var node = currentRoot();
                stabilize(node);
                syncServerActionCardCopy(node);
            });
        });
        rootObserver.observe(root, {
            attributes: true,
            attributeFilter: [
                'data-pmd-sort-mode',
                'data-pmd-combo-builder',
                'data-pmd-all-foods-visible-r27',
                'hidden'
            ],
            childList: true,
            subtree: true
        });

        if (bodyObserver) bodyObserver.disconnect();
        bodyObserver = new MutationObserver(function () {
            var liveRoot = currentRoot();
            if (!liveRoot) return;

            if (liveRoot !== initialRoot) {
                requestCleanReload('root-swapped');
                return;
            }

            stabilize(liveRoot);
        });
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    installRootReplacementGuard();
    installEarlyActionCardBridge();
    stabilize(root);
    observeRuntime();
    waitForManagerFirstPaint();

    window.PMDMenuRuntimeStability = {
        ready: true,
        version: '1.3.1-canonical-allfoods',
        stabilize: function () {
            stabilize(currentRoot());
        },
        releaseFirstPaint: function () {
            releaseFirstPaint('manual');
        },
        inspect: function () {
            var liveRoot = currentRoot();
            var allFoods = liveRoot && liveRoot.querySelector(
                '[data-pmd-category-filter="all"][data-pmd-category-fixed]'
            );
            var activeCategory = liveRoot && liveRoot.querySelector(
                '.pmd-menu-manager__categories [data-pmd-category-filter].is-active'
            );
            var preferred = firstRegularCategory(liveRoot);

            return {
                sameRoot: liveRoot === initialRoot,
                reloadPending: reloadPending,
                managerReady: Boolean(
                    window.PMDMenuManagerV1
                    && window.PMDMenuManagerV1.ready
                ),
                smartReady: isSmartReady(),
                earlyActionBridge: earlyActionBridgeInstalled,
                firstPaintReady: Boolean(
                    liveRoot
                    && liveRoot.getAttribute(
                        'data-pmd-menu-runtime-ready-v1'
                    ) === '1'
                ),
                initialCategory: liveRoot
                    ? liveRoot.getAttribute(
                        'data-pmd-menu-initial-category-v1'
                    )
                    : null,
                preferredRegularCategory: preferred
                    ? preferred.getAttribute('data-pmd-category-filter')
                    : null,
                activeCategory: activeCategory
                    ? activeCategory.getAttribute('data-pmd-category-filter')
                    : null,
                editMode: liveRoot
                    ? String(liveRoot.getAttribute('data-pmd-sort-mode') || '0')
                    : null,
                selectionMode: Boolean(
                    liveRoot && liveRoot.dataset.pmdComboBuilder === '1'
                ),
                allFoodsVisiblePreference: allFoods
                    ? allFoods.getAttribute('data-pmd-all-foods-visible-r27') !== '0'
                    : null,
                allFoodsHiddenInStrip: allFoods ? Boolean(allFoods.hidden) : null,
                legacyCategoryDeleteHits: liveRoot
                    ? liveRoot.querySelectorAll(
                        '[data-pmd-category-delete], .pmd-menu-manager__category-delete-hit'
                    ).length
                    : null,
                legacyHeaderSeparators: liveRoot
                    ? liveRoot.querySelectorAll(
                        '[data-pmd-main-header-notification-gap-r67], '
                        + '[data-pmd-main-header-notification-divider-r67]'
                    ).length
                    : null,
                visibleRealCategories: liveRoot
                    ? Array.prototype.filter.call(
                        liveRoot.querySelectorAll('[data-pmd-category-id]'),
                        function (button) {
                            return !button.hidden;
                        }
                    ).length
                    : null
            };
        }
    };

    // Compatibility alias for any open console/session that still references
    // the previous object name. Only this canonical file is loaded by assets.
    window.PMDMenuRuntimeStabilityV1 = window.PMDMenuRuntimeStability;

    console.info(
        '[PMD Menu Runtime Stability canonical] Ready',
        window.PMDMenuRuntimeStability.inspect()
    );
})();