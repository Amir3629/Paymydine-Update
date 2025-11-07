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

    function applyDeleteIconColor(context) {
        var scope = context || document;

        $('a[data-request="onDelete"] i.fa-trash, a[data-request="onDelete"] i.fa-trash-o', scope)
            .each(function () {
                this.style.setProperty('color', '#dc3545', 'important');
            });
    }

    function applySaveButtonStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('[data-request="onSave"]').each(function () {
            this.style.setProperty('background', '#0f9d58', 'important');
            this.style.setProperty('background-color', '#0f9d58', 'important');
            this.style.setProperty('border', '1px solid #0c7d47', 'important');
            this.style.setProperty('border-color', '#0c7d47', 'important');
            this.style.setProperty('color', '#ffffff', 'important');
        });
    }

    $(document).render(function (event) {
        var context = event && event.target ? event.target : document;

        $('a[title], span[title], button[title]', document).not('[data-bs-toggle]').tooltip({placement: 'bottom'});
        $('.alert', document).alert();

        applyDeleteIconColor(context);
        applySaveButtonStyles(context);
    });

    $(document).on('ajaxDone ajaxComplete ajaxSuccess', function (event, context) {
        var scope = context && context.elements ? context.elements : context;
        applyDeleteIconColor(scope || document);
        applySaveButtonStyles(scope || document);
    });

    applyDeleteIconColor();
    applySaveButtonStyles();

    $(function () {
        applySaveButtonStyles();
    });

    var saveButtonStyleInterval = setInterval(function () {
        applySaveButtonStyles();
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

