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
     * PayMyDine admin toolbar splitting.
     *
     * Keeps the first/primary toolbar action on the left and moves all other
     * direct toolbar actions into a right-aligned `.right-buttons` group. The
     * helper is intentionally defensive so it can run on DOMContentLoaded,
     * after AJAX refreshes, and on already-split toolbars without duplicating
     * wrappers or breaking modal/media-manager controls.
     */
    var PMD_TOOLBAR_SPLIT_STYLE_ID = 'pmd-toolbar-split-runtime-style';
    var PMD_TOOLBAR_SPLIT_PAGES = [
        {
            name: 'staffs-index',
            routePattern: /\/admin\/staffs$/,
            primarySelector: 'a.btn-primary[href*="staffs/create"], a[href*="staffs/create"]',
            splitClass: 'pmd-staff-toolbar-split',
            rightLabel: 'Secondary staff toolbar actions'
        },
        {
            name: 'payments-index',
            routePattern: /\/admin\/payments$/,
            primarySelector: '.pmd-toolbar-primary-action, [data-pmd-toolbar-primary]',
            secondarySelector: '.pmd-payments-mode-toggle, [data-pmd-toolbar-secondary]',
            splitClass: 'pmd-payments-toolbar-split',
            rightLabel: 'Payment view actions',
            allowRightOnly: true
        }
    ];

    function ensureToolbarSplitStyles() {
        if (document.getElementById(PMD_TOOLBAR_SPLIT_STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = PMD_TOOLBAR_SPLIT_STYLE_ID;
        style.textContent = [
            '.progress-indicator-container.pmd-toolbar-split,.toolbar-action.pmd-toolbar-split{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-width:0!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons,.toolbar-action.pmd-toolbar-split>.right-buttons{display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin-left:auto!important;flex:0 0 auto!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn,.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn-group,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn-group{margin-left:0!important;margin-right:0!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn,.pmd-toolbar-right-buttons>.btn,.pmd-toolbar-secondary-action{background:#f1f3f9!important;background-color:#f1f3f9!important;border:1px solid #c9d2e3!important;color:#364a63!important;box-shadow:none!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn:hover,.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn:focus,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn:hover,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn:focus,.pmd-toolbar-right-buttons>.btn:hover,.pmd-toolbar-right-buttons>.btn:focus,.pmd-toolbar-secondary-action:hover,.pmd-toolbar-secondary-action:focus{background:#e5ebf7!important;background-color:#e5ebf7!important;border-color:#b8c6dd!important;color:#364a63!important;box-shadow:none!important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function getActiveToolbarSplitConfig() {
        var path = (window.location.pathname || '').replace(/\/+$/, '');

        for (var i = 0; i < PMD_TOOLBAR_SPLIT_PAGES.length; i++) {
            if (PMD_TOOLBAR_SPLIT_PAGES[i].routePattern.test(path)) {
                return PMD_TOOLBAR_SPLIT_PAGES[i];
            }
        }

        return {
            name: 'generic-admin-toolbar',
            routePattern: /\/admin(?:\/|$)/,
            primarySelector: '.btn-primary, [data-primary-action], [data-toolbar-primary]',
            splitClass: 'pmd-toolbar-split',
            rightLabel: 'Secondary toolbar actions'
        };
    }

    function toolbarChildContains(child, selector) {
        if (!child || !selector) return false;
        return (child.matches && child.matches(selector)) ||
            (child.querySelector && child.querySelector(selector));
    }

    function getOrCreateRightButtons(container, config) {
        var children = Array.prototype.slice.call(container.children);
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('right-buttons')) {
                children[i].classList.add('pmd-toolbar-right-buttons');
                children[i].setAttribute('aria-label', config.rightLabel || 'Secondary toolbar actions');
                return children[i];
            }
        }

        var rightButtons = document.createElement('div');
        rightButtons.className = 'right-buttons pmd-toolbar-right-buttons';
        rightButtons.setAttribute('aria-label', config.rightLabel || 'Secondary toolbar actions');
        return rightButtons;
    }

    function isToolbarActionChild(child) {
        if (!child || child.nodeType !== 1) return false;
        if (child.tagName === 'INPUT' || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return false;
        if (child.classList && child.classList.contains('progress-indicator')) return false;
        if (child.classList && child.classList.contains('right-buttons')) return true;

        return (child.classList && (child.classList.contains('btn') || child.classList.contains('btn-group') || child.classList.contains('dropdown'))) ||
            (child.hasAttribute && (child.hasAttribute('data-pmd-toolbar-secondary') || child.hasAttribute('data-pmd-toolbar-primary'))) ||
            (child.querySelector && child.querySelector('.btn, .btn-group, [data-pmd-toolbar-secondary], [data-pmd-toolbar-primary]'));
    }

    function getToolbarContainers() {
        return document.querySelectorAll('.toolbar-action > .progress-indicator-container, .toolbar-action');
    }

    function shouldSkipToolbarContainer(container) {
        if (!container || container.closest('.modal, .media-manager, .media-toolbar, [data-control="media-manager"]')) return true;
        if (container.classList && container.classList.contains('right-buttons')) return true;
        if (container.closest('.right-buttons')) return true;
        return false;
    }

    function findPrimaryAction(children, config) {
        var primaryAction = null;

        children.forEach(function (child) {
            if (!primaryAction && toolbarChildContains(child, config.primarySelector)) {
                primaryAction = child;
            }
        });

        if (primaryAction) return primaryAction;

        if (config.allowRightOnly) return null;

        for (var i = 0; i < children.length; i++) {
            if (isToolbarActionChild(children[i]) && !(children[i].classList && children[i].classList.contains('right-buttons')) && !toolbarChildContains(children[i], config.secondarySelector)) {
                return children[i];
            }
        }

        return null;
    }

    function applyToolbarSplit(config) {
        ensureToolbarSplitStyles();

        Array.prototype.forEach.call(getToolbarContainers(), function (container) {
            if (shouldSkipToolbarContainer(container)) return;

            var children = Array.prototype.slice.call(container.children);
            var primaryAction = findPrimaryAction(children, config);
            if (!primaryAction && !config.allowRightOnly) return;

            var rightButtons = getOrCreateRightButtons(container, config);
            var secondaryActions = [];

            Array.prototype.slice.call(container.children).forEach(function (child) {
                if (!isToolbarActionChild(child) || child === rightButtons) return;
                if (child === primaryAction || toolbarChildContains(child, config.primarySelector)) return;
                if (config.secondarySelector && !primaryAction && !toolbarChildContains(child, config.secondarySelector)) return;
                secondaryActions.push(child);
            });

            if (!secondaryActions.length && rightButtons.parentElement !== container) return;

            container.classList.add('pmd-toolbar-split');
            if (config.splitClass) container.classList.add(config.splitClass);
            if (primaryAction) primaryAction.classList.add('pmd-toolbar-primary-action');

            if (rightButtons.parentElement !== container) {
                container.appendChild(rightButtons);
            }

            secondaryActions.forEach(function (button) {
                button.classList.add('pmd-toolbar-secondary-action');
                rightButtons.appendChild(button);
            });
        });
    }

    function applyScopedToolbarSplits() {
        var config = getActiveToolbarSplitConfig();
        if (!config || (config.routePattern && !config.routePattern.test((window.location.pathname || '').replace(/\/+$/, '')))) return;

        applyToolbarSplit(config);
    }

    function syncPaymentsModeToggleLabels() {
        var toggles = document.querySelectorAll('.pmd-payments-mode-toggle[data-methods-label][data-providers-label]');
        if (!toggles.length) return;

        var params = new URLSearchParams(window.location.search || '');
        var isProvidersMode = params.get('mode') === 'providers';

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

    function scheduleToolbarSplit() {
        syncPaymentsModeToggleLabels();
        applyScopedToolbarSplits();
        window.setTimeout(function () {
            syncPaymentsModeToggleLabels();
            applyScopedToolbarSplits();
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleToolbarSplit);
    }
    else {
        scheduleToolbarSplit();
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

