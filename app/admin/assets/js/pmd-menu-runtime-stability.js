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

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/pmdmenus') return;

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

    function requestCleanReload(reason) {
        if (reloadPending) return;
        reloadPending = true;

        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload',
                String(reason || 'refresh')
            );
        } catch (error) {}

        window.location.reload();
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

    function selectInitialCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        var existing = node.getAttribute(
            'data-pmd-menu-initial-category-v1'
        );
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
            // V129 is still the only card-filtering authority.
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

    function currentLocaleIsGerman() {
        var match = document.cookie.match(
            /(?:^|; )pmd_admin_locale=([^;]+)/
        );
        var locale = String(
            (match && match[1])
            || document.documentElement.lang
            || 'en'
        ).toLowerCase();
        return locale.indexOf('de') === 0;
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
        var de = currentLocaleIsGerman();
        var nextTitle = de
            ? 'Neue Speise hinzufugen'
            : 'Add new food item';
        var nextHelp = categoryLabel
            ? (
                de
                    ? 'Erstelle eine neue Speise in ' + categoryLabel + '.'
                    : 'Create a new food item in ' + categoryLabel + '.'
            )
            : (
                de
                    ? 'Erstelle eine neue Speise.'
                    : 'Create a new food item.'
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
                requestCleanReload('root-replace');
                return;
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
        version: '1.3.0-canonical',
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