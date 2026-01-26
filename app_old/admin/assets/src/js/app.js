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

    var GREEN_BUTTON_BASE_GRADIENT = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)'; // Dark blue instead of green
    var GREEN_BUTTON_HOVER_GRADIENT = 'linear-gradient(135deg, #364a63 0%, #526484 100%)'; // Dark blue instead of green

    function applyDeleteIconColor(context) {
        var scope = context || document;

        $('a[data-request="onDelete"] i.fa-trash, a[data-request="onDelete"] i.fa-trash-o', scope)
            .each(function () {
                this.style.setProperty('color', '#dc3545', 'important');
            });
    }

    function applyGreenButtonBase(element) {
        element.style.setProperty('background', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('background-image', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('border', '1px solid #364a63', 'important'); // Dark blue border instead of green
        element.style.setProperty('border-color', '#364a63', 'important'); // Dark blue border instead of green
        element.style.setProperty('color', '#ffffff', 'important');
        element.style.setProperty('box-shadow', '0 6px 16px rgba(54, 74, 99, 0.25)', 'important'); // Dark blue shadow instead of green
        element.style.setProperty('transition', 'transform 0.2s ease, box-shadow 0.2s ease', 'important');
        element.style.setProperty('transform', 'translateY(0)', 'important');
        element.style.setProperty('min-width', '90px', 'important');
        element.style.setProperty('width', 'auto', 'important');
        element.style.setProperty('padding', '0.4rem 0.9rem', 'important');
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
            this.style.setProperty('width', '90px', 'important');
            this.style.setProperty('min-width', '90px', 'important');
            this.style.setProperty('padding', '0.4rem 0.9rem', 'important');
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

    $(document).render(function (event) {
        var context = event && event.target ? event.target : document;

        $('a[title], span[title], button[title]', document).not('[data-bs-toggle]').tooltip({placement: 'bottom'});
        $('.alert', document).alert();

        applyDeleteIconColor(context);
        applySaveButtonStyles(context);
        applyCloseButtonStyles(context);
        applyWidgetModalStyles(context);
    });

    $(document).on('ajaxDone ajaxComplete ajaxSuccess', function (event, context) {
        var scope = context && context.elements ? context.elements : context;
        applyDeleteIconColor(scope || document);
        applySaveButtonStyles(scope || document);
        applyCloseButtonStyles(scope || document);
        applyWidgetModalStyles(scope || document);
    });

    applyDeleteIconColor();
    applySaveButtonStyles();
    applyCloseButtonStyles();
    applyWidgetModalStyles();

    $(function () {
        applySaveButtonStyles();
        applyCloseButtonStyles();
        applyWidgetModalStyles();
    });

    var saveButtonStyleInterval = setInterval(function () {
        applySaveButtonStyles();
        applyCloseButtonStyles();
        applyWidgetModalStyles();
    }, 500);

    setTimeout(function () {
        clearInterval(saveButtonStyleInterval);
    }, 5000);

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

