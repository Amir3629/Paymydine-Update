/* PMD_MENU_RUNTIME_STABILITY_V1
 *
 * One owner for /admin/pmdmenus runtime continuity after mutations and first
 * paint stabilization.
 *
 * V129 refreshManager() replaces the whole [data-pmd-menu-manager] root after
 * create/edit/delete. Page-specific authorities (All Foods R27/R28 and Smart
 * Categories) intentionally keep references to the original root/children, so
 * replacing that root can resurrect server-side legacy markup while the active
 * JS authorities are still attached to detached DOM.
 *
 * Contract:
 * - intercept only a whole PMD menu-manager root replacement and finish that
 *   mutation with a clean same-page reload;
 * - if another authority bypasses the interceptor, detect the root swap and
 *   reload immediately instead of leaving mixed old/new authorities alive;
 * - quarantine legacy category minus/delete hits; category remove belongs to
 *   the current category editor modal;
 * - remove the legacy notification divider/spacer from the live header;
 * - a hidden All Foods preference stays absent in Edit mode too;
 * - initial page state opens the first real category, never All Foods when a
 *   real category exists;
 * - category strip + grid remain paint-gated until Smart Categories hydration
 *   and that first-category filter are complete, preventing the old 0.1s flash;
 * - selection shells (Chef/Bestseller/Combination) keep all real categories
 *   visible so staff can filter the available foods while selecting.
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
    var firstPaintStartedAt = Date.now();

    function currentRoot() {
        return document.querySelector('[data-pmd-menu-manager]');
    }

    function requestCleanReload(reason) {
        if (reloadPending) return;
        reloadPending = true;

        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload-v1',
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

        // Removing the virtual All Foods category means it is absent from the
        // strip everywhere, including Edit. Restore stays available from the
        // Create Category flow. Guard every write so our observer never loops.
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

    function firstRealCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        return Array.prototype.find.call(
            node.querySelectorAll(
                '.pmd-menu-manager__categories [data-pmd-category-id]'
            ),
            function (button) {
                return !button.hidden
                    && button.getAttribute('aria-hidden') !== 'true'
                    && !button.disabled;
            }
        ) || null;
    }

    function selectInitialCategory(node) {
        node = node || currentRoot();
        if (!node) return null;

        var existing = node.getAttribute(
            'data-pmd-menu-initial-category-v1'
        );
        if (existing) return existing;

        var first = firstRealCategory(node);

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
            // V129 owns filtering. A real click through its existing handler is
            // safer than creating a second filter implementation here.
            first.click();
        }

        node.setAttribute(
            'data-pmd-menu-initial-category-v1',
            categoryId || 'all'
        );

        return categoryId || 'all';
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

        // Pmdmenus only renders enabled real categories here. Keep every one of
        // them available as a food filter during Chef/Bestseller/Combination
        // selection. The deliberately-hidden virtual All Foods preference is
        // handled separately above and is never forced back into the strip.
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

        // The initial catalogue must always open on the first existing real
        // category. All Foods remains available as a user-selectable filter.
        if (node.dataset.pmdComboBuilder !== '1') {
            selectInitialCategory(node);
        }

        stabilize(node);

        node.setAttribute('data-pmd-menu-runtime-ready-v1', '1');
        node.setAttribute(
            'data-pmd-menu-runtime-ready-reason-v1',
            String(reason || 'ready')
        );

        firstPaintReleased = true;
    }

    function waitForHydratedFirstPaint() {
        function check() {
            if (firstPaintReleased || reloadPending) return;

            var smart = window.PMDMenuSmartCategoriesV1;
            if (smart && smart.ready) {
                // One frame lets all click/document handlers finish updating
                // the action card and card filtering before they become visible.
                selectInitialCategory(currentRoot());
                requestAnimationFrame(function () {
                    releaseFirstPaint('smart-ready');
                });
                return;
            }

            if (Date.now() - firstPaintStartedAt >= 1800) {
                // Never leave the catalogue invisible if the smart-category
                // bootstrap endpoint fails. V129 can still filter real categories.
                releaseFirstPaint('smart-timeout-fallback');
                return;
            }

            requestAnimationFrame(check);
        }

        requestAnimationFrame(check);
    }

    function installRootReplacementGuard() {
        if (root.__pmdMenuRuntimeReplaceGuardV1) return;
        root.__pmdMenuRuntimeReplaceGuardV1 = true;

        var guardedReplaceWith = function () {
            var args = Array.prototype.slice.call(arguments);
            var replacement = args.length === 1 ? args[0] : null;

            if (
                replacement
                && replacement.nodeType === 1
                && replacement.matches
                && replacement.matches('[data-pmd-menu-manager]')
            ) {
                // Do not paint server-first legacy markup into the current live
                // session while newer authorities still reference this root.
                // A clean reload is the single safe refresh boundary.
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
                stabilize(currentRoot());
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
    stabilize(root);
    observeRuntime();
    waitForHydratedFirstPaint();

    window.PMDMenuRuntimeStabilityV1 = {
        version: '1.1.0',
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

            return {
                sameRoot: liveRoot === initialRoot,
                reloadPending: reloadPending,
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

    console.info(
        '[PMD Menu Runtime Stability V1.1] Ready',
        window.PMDMenuRuntimeStabilityV1.inspect()
    );
})();