+function ($) {
    "use strict";

    $("#side-nav-menu").metisMenu({
        toggle: true,
        collapseInClass: 'show'
    })

    $("#navSidebar").on('show.bs.collapse', function () {
        $('.sidebar').addClass('show')
    }).on('hide.bs.collapse', function () {
        $('.sidebar').removeClass('show')
    })

    const AUTO_ADMIN_BUTTON_INLINE_STYLING = false;
    var GREEN_BUTTON_BASE_GRADIENT = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)'; // Dark blue instead of green
    var GREEN_BUTTON_HOVER_GRADIENT = 'linear-gradient(135deg, #364a63 0%, #526484 100%)'; // Dark blue instead of green

    function applyDeleteIconColor(context) {
        var scope = context || document;

        $('a[data-request="onDelete"] i.fa-trash, a[data-request="onDelete"] i.fa-trash-o', scope)
            .each(function () {
                this.style.setProperty('color', '#dc3545', 'important');
            });
    }



    /**
     * PayMyDine admin toolbar normalization.
     *
     * This is intentionally conservative: every toolbar gets safe Back/primary
     * ordering and shared marker classes, but a `.right-buttons` split is only
     * created when a toolbar actually has multiple secondary actions. That keeps
     * one-button toolbars (for example Payments mode toggle) on the left and
     * avoids the unsafe generic splitter that previously reprocessed every form.
     */
    var PMD_TOOLBAR_SPLIT_STYLE_ID = 'pmd-toolbar-split-runtime-style';
    var PMD_TOOLBAR_SPLIT_OBSERVER = null;
    var PMD_TOOLBAR_SPLIT_PENDING = false;
    var PMD_TOOLBAR_FORCE_SPLIT_PAGES = [
        {
            name: 'staffs-index',
            routePattern: /\/admin\/staffs$/,
            rightLabel: 'Secondary staff toolbar actions'
        }
    ];

    function ensureToolbarSplitStyles() {
        if (document.getElementById(PMD_TOOLBAR_SPLIT_STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = PMD_TOOLBAR_SPLIT_STYLE_ID;
        style.textContent = [
            '.progress-indicator-container.pmd-toolbar-normalized,.progress-indicator-container.pmd-toolbar-split{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;width:100%!important;min-width:0!important;flex-wrap:nowrap!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons{display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin-left:auto!important;flex:0 0 auto!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized>.btn,.progress-indicator-container.pmd-toolbar-normalized>.btn-group,.progress-indicator-container.pmd-toolbar-normalized>.btn-group>.btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:0!important;max-width:none!important;height:42px!important;min-height:42px!important;max-height:42px!important;padding:0.55rem 0.95rem!important;line-height:1!important;text-align:center!important;white-space:nowrap!important;box-sizing:border-box!important;flex:0 0 auto!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized>.btn-group{padding:0!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized>.right-buttons>.btn,.progress-indicator-container.pmd-toolbar-normalized>.right-buttons>.btn-group,.progress-indicator-container.pmd-toolbar-normalized>.right-buttons>.btn-group>.btn{margin-left:0!important;margin-right:0!important;}',
            '.pmd-toolbar-secondary-action,.pmd-toolbar-right-buttons>.btn,.pmd-toolbar-right-buttons>.btn-group>.btn{background:#f1f3f9!important;background-color:#f1f3f9!important;border:1px solid #c9d2e3!important;color:#364a63!important;box-shadow:none!important;}',
            '.pmd-toolbar-secondary-action:hover,.pmd-toolbar-secondary-action:focus,.pmd-toolbar-right-buttons>.btn:hover,.pmd-toolbar-right-buttons>.btn:focus,.pmd-toolbar-right-buttons>.btn-group>.btn:hover,.pmd-toolbar-right-buttons>.btn-group>.btn:focus{background:#e5ebf7!important;background-color:#e5ebf7!important;border-color:#b8c6dd!important;color:#364a63!important;box-shadow:none!important;}',
            '.pmd-toolbar-back-action{background:#364a63!important;background-color:#364a63!important;border:1px solid #364a63!important;color:#fff!important;margin-right:8px!important;margin-left:0!important;box-shadow:0 4px 12px rgba(54,74,99,.24)!important;order:0!important;width:40px!important;min-width:40px!important;max-width:40px!important;height:40px!important;min-height:40px!important;max-height:40px!important;padding:0!important;flex:0 0 40px!important;transform:none!important;}',
            '.pmd-toolbar-primary-action{order:1!important;margin-left:0!important;margin-right:0!important;}',

            '.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-back-action,.progress-indicator-container.pmd-toolbar-normalized>a.btn.pmd-toolbar-back-action,.progress-indicator-container.pmd-toolbar-normalized>button.btn.pmd-toolbar-back-action,.progress-indicator-container.pmd-toolbar-normalized>[data-pmd-toolbar-back=\"true\"],.progress-indicator-container.pmd-toolbar-normalized>a.btn.btn-outline-secondary:has(.fa-arrow-left){order:0!important;margin-left:0!important;margin-right:8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:40px!important;min-width:40px!important;max-width:40px!important;height:40px!important;min-height:40px!important;max-height:40px!important;padding:0!important;flex:0 0 40px!important;background:#364a63!important;background-color:#364a63!important;background-image:none!important;border:1px solid #364a63!important;color:#fff!important;box-shadow:0 4px 12px rgba(54,74,99,.24)!important;transform:none!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-primary-action,.progress-indicator-container.pmd-toolbar-normalized>a.btn.pmd-toolbar-primary-action,.progress-indicator-container.pmd-toolbar-normalized>button.btn.pmd-toolbar-primary-action,.progress-indicator-container.pmd-toolbar-normalized>.btn-group.pmd-toolbar-primary-action,.progress-indicator-container.pmd-toolbar-normalized>.btn-group.pmd-toolbar-primary-action>.btn{order:1!important;margin-left:0!important;margin-right:0!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.pmd-toolbar-secondary-action,.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.btn-default.pmd-toolbar-secondary-action,.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.btn-light.pmd-toolbar-secondary-action,.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.btn-danger.pmd-toolbar-secondary-action,.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-secondary-action:not(.pmd-toolbar-back-action):not([data-pmd-toolbar-back=\"true\"]):not(:has(.fa-arrow-left)){display:inline-flex!important;align-items:center!important;justify-content:center!important;order:10!important;height:42px!important;min-height:42px!important;max-height:42px!important;padding:.55rem .95rem!important;line-height:1!important;border-radius:12px!important;background:#f1f3f9!important;background-color:#f1f3f9!important;background-image:none!important;border-color:#f1f3f9!important;color:#364a63!important;box-shadow:none!important;transform:none!important;}',
            '.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.pmd-toolbar-secondary-action:hover,.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.pmd-toolbar-secondary-action:focus,.progress-indicator-container.pmd-toolbar-normalized.pmd-toolbar-split .pmd-toolbar-right-buttons>.btn.pmd-toolbar-secondary-action:active,.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-secondary-action:not(.pmd-toolbar-back-action):hover,.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-secondary-action:not(.pmd-toolbar-back-action):focus,.progress-indicator-container.pmd-toolbar-normalized>.btn.pmd-toolbar-secondary-action:not(.pmd-toolbar-back-action):active{background:#f1f3f9!important;background-color:#f1f3f9!important;border-color:#f1f3f9!important;color:#364a63!important;box-shadow:none!important;transform:none!important;}',
            '.pmd-toolbar-back-action:hover,.pmd-toolbar-back-action:focus,.pmd-toolbar-back-action:active{background:#364a63!important;background-color:#364a63!important;border-color:#364a63!important;color:#fff!important;box-shadow:0 4px 12px rgba(54,74,99,.24)!important;transform:none!important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function getForcedSplitConfig() {
        var path = (window.location.pathname || '').replace(/\/+$/, '');
        for (var i = 0; i < PMD_TOOLBAR_FORCE_SPLIT_PAGES.length; i++) {
            if (PMD_TOOLBAR_FORCE_SPLIT_PAGES[i].routePattern.test(path)) {
                return PMD_TOOLBAR_FORCE_SPLIT_PAGES[i];
            }
        }
        return null;
    }

    function toolbarChildContains(child, selector) {
        if (!child || !selector) return false;
        return (child.matches && child.matches(selector)) ||
            (child.querySelector && child.querySelector(selector));
    }

    function isToolbarBackAction(child) {
        if (!child || child.nodeType !== 1) return false;
        if (child.matches && child.matches('[data-pmd-toolbar-back], .pmd-toolbar-back-action')) return true;

        var icon = child.querySelector && child.querySelector('.fa-arrow-left, .fa-arrow-circle-left, .fa-chevron-left, i[class*="fa-arrow-left"], i[class*="fa-chevron-left"]');
        if (!icon) return false;

        return (child.matches && child.matches('a.btn, button.btn, .btn, .btn-group')) ||
            (child.classList && child.classList.contains('pmd-toolbar-secondary-action'));
    }

    function getToolbarActionText(child) {
        if (!child || child.nodeType !== 1) return '';
        return (child.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function hasPrimaryToolbarLabel(child) {
        var text = getToolbarActionText(child);
        return /^(new|save|create|add)(\b|\s|$)/.test(text) || /\b(save|create|add)\b/.test(text);
    }

    function isToolbarPrimaryAction(child) {
        return toolbarChildContains(child, '.pmd-toolbar-primary-action, [data-pmd-toolbar-primary], .btn-primary, .btn-success, [data-request="onSave"]') ||
            hasPrimaryToolbarLabel(child);
    }

    function normalizeToolbarBackAction(child) {
        if (!child || child.nodeType !== 1) return;
        child.classList.add('pmd-toolbar-back-action', 'pmd-toolbar-secondary-action');
        child.setAttribute('data-pmd-toolbar-back', 'true');
    }

    function normalizeToolbarPrimaryAction(child) {
        if (!child || child.nodeType !== 1) return;
        child.classList.add('pmd-toolbar-primary-action');
    }

    function findDirectProgressContainer(toolbarAction) {
        if (!toolbarAction || !toolbarAction.children) return null;
        for (var i = 0; i < toolbarAction.children.length; i++) {
            if (toolbarAction.children[i].classList && toolbarAction.children[i].classList.contains('progress-indicator-container')) {
                return toolbarAction.children[i];
            }
        }
        return null;
    }

    function getToolbarContainers() {
        var containers = [];
        var seen = [];

        function add(container) {
            if (!container || seen.indexOf(container) !== -1) return;
            seen.push(container);
            containers.push(container);
        }

        Array.prototype.forEach.call(document.querySelectorAll('.toolbar-action'), function (toolbarAction) {
            add(findDirectProgressContainer(toolbarAction) || toolbarAction);
        });

        Array.prototype.forEach.call(document.querySelectorAll('.progress-indicator-container'), function (container) {
            if (!container.closest('.toolbar-action')) add(container);
        });

        return containers;
    }

    function shouldSkipToolbarContainer(container) {
        if (!container || container.closest('.modal, .media-manager, .media-toolbar, [data-control="media-manager"]')) return true;
        if (container.classList && container.classList.contains('right-buttons')) return true;
        if (container.closest('.right-buttons')) return true;
        return false;
    }

    function getOrCreateRightButtons(container, label) {
        var children = Array.prototype.slice.call(container.children);
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('right-buttons')) {
                children[i].classList.add('pmd-toolbar-right-buttons');
                children[i].setAttribute('aria-label', label || 'Secondary toolbar actions');
                return children[i];
            }
        }

        var rightButtons = document.createElement('div');
        rightButtons.className = 'right-buttons pmd-toolbar-right-buttons';
        rightButtons.setAttribute('aria-label', label || 'Secondary toolbar actions');
        return rightButtons;
    }

    function isHiddenToolbarAction(child) {
        if (!child || child.nodeType !== 1) return true;
        if (child.hidden || child.getAttribute('aria-hidden') === 'true') return true;
        if (child.matches && child.matches('[type="hidden"], .d-none, .hide, [hidden]')) return true;
        if (child.style && child.style.display === 'none') return true;
        return false;
    }

    function isToolbarActionChild(child) {
        if (!child || child.nodeType !== 1) return false;
        if (isHiddenToolbarAction(child)) return false;
        if (child.tagName === 'INPUT' || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return false;
        if (child.classList && child.classList.contains('progress-indicator')) return false;
        if (child.classList && child.classList.contains('right-buttons')) return true;

        return (child.classList && (child.classList.contains('btn') || child.classList.contains('btn-group') || child.classList.contains('dropdown'))) ||
            (child.hasAttribute && (child.hasAttribute('data-pmd-toolbar-secondary') || child.hasAttribute('data-pmd-toolbar-primary'))) ||
            (child.querySelector && child.querySelector('.btn, .btn-group, [data-pmd-toolbar-secondary], [data-pmd-toolbar-primary], [data-request="onSave"]'));
    }

    function unwrapRightButtonsIfSingle(container, rightButtons, primaryAction) {
        if (!rightButtons || rightButtons.parentElement !== container) return;
        var actions = Array.prototype.slice.call(rightButtons.children).filter(isToolbarActionChild);
        if (actions.length > 1) return;

        var reference = rightButtons;
        actions.forEach(function (action) {
            action.classList.remove('pmd-toolbar-secondary-action');
            container.insertBefore(action, reference);
        });
        container.removeChild(rightButtons);
        container.classList.remove('pmd-toolbar-split', 'pmd-staff-toolbar-split');

        if (primaryAction && primaryAction.parentElement === container) {
            placeToolbarBackActions(container, primaryAction, null);
        }
    }

    function collectToolbarState(container) {
        var state = {
            children: Array.prototype.slice.call(container.children),
            rightButtons: null,
            primaryAction: null,
            backActions: [],
            secondaryActions: []
        };

        state.children.forEach(function (child) {
            if (child.classList && child.classList.contains('right-buttons')) {
                state.rightButtons = child;
                return;
            }
            if (!isToolbarActionChild(child)) return;
            if (isToolbarBackAction(child)) {
                state.backActions.push(child);
                return;
            }
            if (!state.primaryAction && isToolbarPrimaryAction(child)) {
                state.primaryAction = child;
                return;
            }
        });


        state.children.forEach(function (child) {
            if (!isToolbarActionChild(child) || child === state.rightButtons || isToolbarBackAction(child) || child === state.primaryAction) return;
            state.secondaryActions.push(child);
        });

        if (state.rightButtons) {
            Array.prototype.forEach.call(state.rightButtons.children, function (child) {
                if (isToolbarBackAction(child)) state.backActions.push(child);
                else if (isToolbarActionChild(child)) state.secondaryActions.push(child);
            });
        }

        return state;
    }

    function placeToolbarBackActions(container, primaryAction, rightButtons) {
        var state = collectToolbarState(container);
        var backActions = state.backActions;
        if (!backActions.length) return;

        var referenceNode = null;
        if (primaryAction && primaryAction.parentElement === container) {
            referenceNode = primaryAction;
        }
        else if (rightButtons && rightButtons.parentElement === container) {
            referenceNode = rightButtons;
        }
        else {
            referenceNode = container.firstElementChild || null;
        }

        backActions.slice().reverse().forEach(function (backAction) {
            normalizeToolbarBackAction(backAction);
            if (backAction.parentElement !== container || backAction.nextElementSibling !== referenceNode) {
                container.insertBefore(backAction, referenceNode);
            }
            referenceNode = backAction;
        });
    }

    function shouldSplitToolbar(state, forceConfig) {
        var leftActions = (state.primaryAction ? 1 : 0) + state.backActions.length;
        var totalActions = leftActions + state.secondaryActions.length;

        if (state.secondaryActions.length < 1) return false;
        if (leftActions < 1) return false;
        if (totalActions <= state.secondaryActions.length) return false;

        return true;
    }

    function normalizeToolbar(container, forceConfig) {
        if (shouldSkipToolbarContainer(container)) return;
        ensureToolbarSplitStyles();

        container.classList.add('pmd-toolbar-normalized');

        var state = collectToolbarState(container);
        if (state.primaryAction) normalizeToolbarPrimaryAction(state.primaryAction);
        placeToolbarBackActions(container, state.primaryAction, state.rightButtons);

        state = collectToolbarState(container);
        if (state.rightButtons && !shouldSplitToolbar(state, forceConfig)) {
            unwrapRightButtonsIfSingle(container, state.rightButtons, state.primaryAction);
            state = collectToolbarState(container);
        }

        state.secondaryActions.forEach(function (button) {
            if (!isToolbarBackAction(button)) button.classList.add('pmd-toolbar-secondary-action');
        });

        if (!shouldSplitToolbar(state, forceConfig)) return;

        var rightButtons = getOrCreateRightButtons(container, forceConfig && forceConfig.rightLabel);
        if (rightButtons.parentElement !== container) {
            container.appendChild(rightButtons);
        }

        container.classList.add('pmd-toolbar-split');
        if (forceConfig && forceConfig.name === 'staffs-index') {
            container.classList.add('pmd-staff-toolbar-split');
        }

        state.secondaryActions.forEach(function (button) {
            if (button === rightButtons || isToolbarBackAction(button)) return;
            button.classList.add('pmd-toolbar-secondary-action');
            rightButtons.appendChild(button);
        });

        placeToolbarBackActions(container, state.primaryAction, rightButtons);
    }

    function applyScopedToolbarSplits() {
        var forceConfig = getForcedSplitConfig();
        Array.prototype.forEach.call(getToolbarContainers(), function (container) {
            normalizeToolbar(container, forceConfig);
        });
    }

    function syncPaymentsModeToggleLabels() {
        var toggles = document.querySelectorAll('.pmd-payments-mode-toggle[data-methods-label][data-providers-label]');
        if (!toggles.length) return;

        var search = window.location.search || '';
        var isProvidersMode = /(?:^|[?&])mode=providers(?:&|$)/.test(search);

        Array.prototype.forEach.call(toggles, function (toggle) {
            var nextLabel = isProvidersMode ? toggle.getAttribute('data-methods-label') : toggle.getAttribute('data-providers-label');
            var nextHref = isProvidersMode ? toggle.getAttribute('data-methods-href') : toggle.getAttribute('data-providers-href');

            if (nextLabel) toggle.textContent = nextLabel;
            if (nextHref) toggle.setAttribute('href', nextHref);

            if (toggle.dataset.paymentsToggleBound === '1') return;
            toggle.dataset.paymentsToggleBound = '1';
            toggle.addEventListener('click', function () {
                var pendingLabel = isProvidersMode ? toggle.getAttribute('data-providers-label') : toggle.getAttribute('data-methods-label');
                if (pendingLabel) toggle.textContent = pendingLabel;
            });
        });
    }

    function queueToolbarSplitRefresh() {
        if (PMD_TOOLBAR_SPLIT_PENDING) return;
        PMD_TOOLBAR_SPLIT_PENDING = true;

        window.setTimeout(function () {
            PMD_TOOLBAR_SPLIT_PENDING = false;
            syncPaymentsModeToggleLabels();
            applyScopedToolbarSplits();
        }, 50);
    }

    function mutationMayContainToolbar(mutation) {
        if (!mutation.addedNodes || !mutation.addedNodes.length) return false;

        for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            if (!node || node.nodeType !== 1) continue;
            if (node.matches && node.matches('.toolbar-action, .progress-indicator-container, .right-buttons, .btn, .btn-group')) return true;
            if (node.querySelector && node.querySelector('.toolbar-action, .progress-indicator-container, .right-buttons, .btn, .btn-group')) return true;
        }

        return false;
    }

    function initToolbarSplitObserver() {
        if (PMD_TOOLBAR_SPLIT_OBSERVER || !window.MutationObserver || !document.body) return;

        PMD_TOOLBAR_SPLIT_OBSERVER = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutationMayContainToolbar(mutations[i])) {
                    queueToolbarSplitRefresh();
                    return;
                }
            }
        });

        var observerTarget = document.querySelector('.page-content') || document.querySelector('.page-wrapper') || document.body;
        PMD_TOOLBAR_SPLIT_OBSERVER.observe(observerTarget, { childList: true, subtree: true });
    }

    function scheduleToolbarSplit() {
        syncPaymentsModeToggleLabels();
        applyScopedToolbarSplits();
        window.setTimeout(function () {
            syncPaymentsModeToggleLabels();
            applyScopedToolbarSplits();
            initToolbarSplitObserver();
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleToolbarSplit);
    }
    else {
        scheduleToolbarSplit();
    }

    if (window.jQuery) {
        window.jQuery(document).on('ajaxComplete render', queueToolbarSplitRefresh);
    }
    function applyGreenButtonBase(element) {
        // Never overwrite while hovered/focused so hover effect stays until mouse out
        if (element.matches && (element.matches(':hover') || document.activeElement === element)) return;
        element.style.setProperty('background', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('background-image', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('border', '1px solid #364a63', 'important'); // Dark blue border instead of green
        element.style.setProperty('border-color', '#364a63', 'important'); // Dark blue border instead of green
        element.style.setProperty('color', '#ffffff', 'important');
        element.style.setProperty('box-shadow', '0 6px 16px rgba(54, 74, 99, 0.25)', 'important'); // Dark blue shadow instead of green
        element.style.setProperty('transition', 'transform 0.2s ease, box-shadow 0.2s ease', 'important');
        element.style.setProperty('transform', 'translateY(0)', 'important');
        element.style.setProperty('min-width', '110px', 'important');
        element.style.setProperty('width', 'auto', 'important');
        element.style.setProperty('padding', '0.55rem 1.75rem', 'important');
        element.style.setProperty('display', 'inline-block', 'important');
        element.style.setProperty('text-align', 'center', 'important');
        // Fix full-width issue: prevent button from growing in btn-group
        element.style.setProperty('flex', '0 0 auto', 'important');
        element.style.setProperty('flex-grow', '0', 'important');
        element.style.setProperty('flex-shrink', '0', 'important');
        element.style.setProperty('flex-basis', 'auto', 'important');
        element.style.removeProperty('align-items');
        element.style.removeProperty('justify-content');
        element.style.removeProperty('gap');
        
        // Also fix the parent btn-group to use inline-flex if it exists
        var parent = element.parentElement;
        if (parent && parent.classList.contains('btn-group')) {
            parent.style.setProperty('display', 'inline-flex', 'important');
        }
    }

    function handleGreenButtonHover(event) {
        var element = event.currentTarget;
        element.style.setProperty('background', GREEN_BUTTON_HOVER_GRADIENT, 'important');
        element.style.setProperty('background-image', GREEN_BUTTON_HOVER_GRADIENT, 'important');
        element.style.setProperty('transform', 'translateY(-1px)', 'important');
        element.style.setProperty('box-shadow', '0 6px 16px rgba(54, 74, 99, 0.35)', 'important'); // Dark blue shadow instead of green
    }

    function handleGreenButtonLeave(event) {
        applyGreenButtonBase(event.currentTarget);
    }

    function decorateGreenButton(element) {
        applyGreenButtonBase(element);

        if (element.dataset.greenButtonBound === '1')
            return;

        element.addEventListener('mouseenter', handleGreenButtonHover);
        element.addEventListener('mouseleave', handleGreenButtonLeave);
        element.addEventListener('focus', handleGreenButtonHover);
        element.addEventListener('blur', handleGreenButtonLeave);

        element.dataset.greenButtonBound = '1';
    }

    function applySaveButtonStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('[data-request="onSave"], .btn-add-widget').each(function () {
            decorateGreenButton(this);
        });
    }

    function applyCloseButtonStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('.btn-close-modal').each(function () {
            this.style.setProperty('background', '#f1f4fb', 'important');
            this.style.setProperty('border', '1px solid #c9d2e3', 'important');
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('width', '110px', 'important');
            this.style.setProperty('min-width', '110px', 'important');
            this.style.setProperty('padding', '0.55rem 1.75rem', 'important');
            this.style.setProperty('border-radius', '12px', 'important');
            this.style.setProperty('display', 'inline-block', 'important');
            this.style.setProperty('text-align', 'center', 'important');
        });
    }

    function applyWidgetModalStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('#newWidgetModal .modal-content, .dashboard-widget-modal').each(function () {
            this.style.setProperty('border', '2px solid #edeff5', 'important');
            this.style.setProperty('border-radius', '18px', 'important');
            this.style.setProperty('background', '#ffffff', 'important');
            this.style.setProperty('box-shadow', '0 24px 48px rgba(32, 41, 56, 0.14)', 'important');
        });

        $scope.find('#newWidgetModal .modal-header, .dashboard-widget-modal .modal-header').each(function () {
            this.style.setProperty('border', 'none', 'important');
            this.style.setProperty('padding', '1.5rem 1.75rem', 'important');
        });

        $scope.find('#newWidgetModal .modal-body, .dashboard-widget-modal .modal-body').each(function () {
            this.style.setProperty('padding', '1.5rem 1.75rem', 'important');
            this.style.setProperty('border-bottom', '1px solid rgba(201, 210, 227, 0.5)', 'important');
        });

        $scope.find('#newWidgetModal .modal-footer, .dashboard-widget-modal .modal-footer').each(function () {
            this.style.setProperty('border', 'none', 'important');
            this.style.setProperty('padding', '1rem 1.75rem 1.25rem', 'important');
            this.style.setProperty('gap', '0.75rem', 'important');
        });

        $scope.find('#newWidgetModal select, #newWidgetModal .form-control, #newWidgetModal .ss-main, .dashboard-widget-modal select, .dashboard-widget-modal .form-control, .dashboard-widget-modal .ss-main').each(function () {
            this.style.setProperty('border', '1px solid #c9d2e3', 'important');
            this.style.setProperty('border-radius', '12px', 'important');
            this.style.setProperty('padding', '0.65rem 0.75rem', 'important');
            this.style.setProperty('box-shadow', 'none', 'important');
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('background', '#ffffff', 'important');
        });

        $scope.find('#newWidgetModal .help-block, .dashboard-widget-modal .help-block').each(function () {
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('font-weight', '400', 'important');
            this.style.setProperty('opacity', '0.9', 'important');
        });
    }

    function runAdminButtonInlineStyling(context) {
        applySaveButtonStyles(context);
        applyCloseButtonStyles(context);
        applyWidgetModalStyles(context);
    }

    window.PMDAdminButtonStyling = {
        applySaveButtonStyles: applySaveButtonStyles,
        applyCloseButtonStyles: applyCloseButtonStyles,
        applyWidgetModalStyles: applyWidgetModalStyles,
        run: runAdminButtonInlineStyling
    };

    if (!AUTO_ADMIN_BUTTON_INLINE_STYLING) {
        console.log('ℹ️ Automatic admin button inline styling disabled; use window.PMDAdminButtonStyling.run() manually for legacy debugging.');
    }

    $(document).render(function (event) {
        var context = event && event.target ? event.target : document;

        $('a[title], span[title], button[title], label[title]', document).not('[data-bs-toggle]').not('[data-no-tooltip]').tooltip({placement: 'bottom'});
        $('.alert', document).alert();

        applyDeleteIconColor(context);
        applyScopedToolbarSplits();
        if (AUTO_ADMIN_BUTTON_INLINE_STYLING) {
            runAdminButtonInlineStyling(context);
        }
    });

    $(document).on('ajaxDone ajaxComplete ajaxSuccess', function (event, context) {
        var scope = context && context.elements ? context.elements : context;
        applyDeleteIconColor(scope || document);
        applyScopedToolbarSplits();
        if (AUTO_ADMIN_BUTTON_INLINE_STYLING) {
            runAdminButtonInlineStyling(scope || document);
        }
    });

    applyDeleteIconColor();
    applyScopedToolbarSplits();

    $(function () {
        applyScopedToolbarSplits();
        setTimeout(applyScopedToolbarSplits, 100);
    });

    if (AUTO_ADMIN_BUTTON_INLINE_STYLING) {
        runAdminButtonInlineStyling();

        $(function () {
            runAdminButtonInlineStyling();
        });

        var saveButtonStyleInterval = setInterval(function () {
            runAdminButtonInlineStyling();
        }, 500);

        setTimeout(function () {
            clearInterval(saveButtonStyleInterval);
        }, 5000);
    }

    // Multiple Modal Fix
    $(document).on('show.bs.modal', '.modal', function () {
        var zIndex = 1040 + (10 * $('.modal:visible').length + 1)
        $(this).css('z-index', zIndex)
        $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 2).addClass('modal-stack')
        setTimeout(function () {
            $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack')
        }, 0)
    })

    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open')
    })

    // Varying modal content
    $(document).on('show.bs.modal', '.modal', function (event) {
        var $modal = $(this),
            $button = $(event.relatedTarget)

        if (!$button.length)
            return

        $.each($button.get(0).attributes, function(index, attribute) {
            if (/^data-modal-/.test(attribute.name)) {
                var attrName = attribute.name.substr(11),
                    attrValue = attribute.value

                $modal.find('[data-modal-html="'+attrName+'"]').html(attrValue)
                $modal.find('[data-modal-text="'+attrName+'"]').text(attrValue)
                $modal.find('[data-modal-input="'+attrName+'"]').val(attrValue)
            }
        });
    })

    $(window).on('ajaxErrorMessage', function (event, message) {
        if (!message) return

        $.ti.flashMessage({class: 'danger', text: message, allowDismiss: false})

        event.preventDefault()
    })

    /*
     * Handle CSRF token failures and authentication errors
     */
    $(window).on('ajaxError', function (event, context, textStatus, jqXHR) {
        // Handle 403 (CSRF failure) and 419 (token expired)
        if (jqXHR.status === 403 || jqXHR.status === 419) {
            var errorMessage = jqXHR.responseText || 'Security token expired. Reloading page...'
            
            console.error('CSRF/Auth Error:', errorMessage)
            
            $.ti.flashMessage({
                class: 'danger', 
                text: errorMessage,
                allowDismiss: false
            })
            
            // Auto-reload page after 2 seconds to get fresh CSRF token
            setTimeout(function() {
                console.log('Reloading page to refresh security token...')
                window.location.reload()
            }, 2000)
            
            event.preventDefault()
            return false
        }
        
        // Handle 401 (unauthenticated) - redirect to login
        if (jqXHR.status === 401) {
            console.warn('Session expired, redirecting to login...')
            window.location.href = '/admin/login'
            event.preventDefault()
            return false
        }
    })

    /*
     * Ensure the CSRF token is added to all AJAX requests.
     */
    $.ajaxPrefilter(function(options) {
        var token = $('meta[name="csrf-token"]').attr('content')

        if (token) {
            if (!options.headers) options.headers = {}
            options.headers['X-CSRF-TOKEN'] = token
        }
    })
}(window.jQuery);

