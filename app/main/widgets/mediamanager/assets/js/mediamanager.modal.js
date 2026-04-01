+function ($) {
    "use strict";

    if ($.ti.mediaManager === undefined)
        $.ti.mediaManager = {}

    var MediaManagerModal = function (options) {
        this.modal = null
        this.$modalRootElement = null

        this.options = $.extend({}, MediaManagerModal.DEFAULTS, options)

        this.init()
        this.show()
    }

    MediaManagerModal.prototype.dispose = function () {
        this.modal.hide()
        this.$modalRootElement.remove()
        this.$modalElement = null
        this.$modalRootElement = null
    }

    MediaManagerModal.prototype.init = function () {
        if (this.options.alias === undefined)
            throw new Error('Media Manager modal option "alias" is not set.')

        this.$modalRootElement = $('<div/>', {
            id: 'media-manager',
            class: 'media-modal modal fade',
            role: 'dialog',
            tabindex: -1,
            ariaLabelled: '#media-manager',
            ariaHidden: true,
        })

        this.$modalRootElement.one('hide.bs.modal', $.proxy(this.onModalHidden, this))
        this.$modalRootElement.one('shown.bs.modal', $.proxy(this.onModalShown, this))
    }

    MediaManagerModal.prototype.show = function () {
        var self = this,
            handler = this.options.alias + '::onLoadPopup'

        var data = {
            selectMode: this.options.selectMode,
            goToItem: this.options.goToItem,
            chooseButton: this.options.chooseButton ? 1 : 0,
            chooseButtonText: this.options.chooseButtonText,
        }

        $.ti.loadingIndicator.show()
        $.request(handler, {data: data})
            .done(function (json) {
                self.$modalRootElement.html(json.result);
                $('body').append(self.$modalRootElement)
                
                // Apply rounded corners to modal content immediately
                var $modalContent = self.$modalRootElement.find('.modal-content');
                if ($modalContent.length) {
                    $modalContent.each(function() {
                        this.style.setProperty('border-radius', '16px', 'important');
                        this.style.setProperty('overflow', 'hidden', 'important');
                    });
                }
                
                // Add search icon to search input - INSIDE the button frame
                function addSearchIcon() {
                    // Try multiple times with delay to catch the input
                    var attempts = 0;
                    var maxAttempts = 10;
                    
                    function tryAddIcon() {
                        var $searchInput = self.$modalRootElement.find('input[data-media-control="search"]');
                        
                        if ($searchInput.length) {
                            $searchInput.each(function() {
                                var $input = $(this);
                                var inputEl = this;
                                
                                // Check if icon already exists
                                if ($input.siblings('.search-icon-fa').length === 0 && 
                                    $input.parent().find('.search-icon-fa').length === 0 &&
                                    !inputEl._iconAdded) {
                                    
                                    inputEl._iconAdded = true;
                                    
                                    // Wrap input in a container if not already wrapped
                                    var $wrapper = $input.parent();
                                    if (!$wrapper.hasClass('search-input-wrapper')) {
                                        $input.wrap('<div class="search-input-wrapper"></div>');
                                        $wrapper = $input.parent();
                                    }
                                    
                                    // Ensure wrapper has position relative and proper styling
                                    $wrapper.css({
                                        'position': 'relative',
                                        'display': 'inline-block',
                                        'vertical-align': 'middle'
                                    });
                                    
                                    // Check if Font Awesome is available
                                    var useFontAwesome = typeof window.FontAwesome !== 'undefined' || 
                                                         document.querySelector('link[href*="font-awesome"]') || 
                                                         document.querySelector('link[href*="fontawesome"]');
                                    
                                    // Create icon element - use Font Awesome if available, otherwise use SVG
                                    var $icon;
                                    if (useFontAwesome) {
                                        $icon = $('<i class="fa fa-search search-icon-fa"></i>');
                                    } else {
                                        // Fallback: Use SVG search icon
                                        $icon = $('<span class="search-icon-fa">' +
                                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                                            '<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04 2.092 2.092 2.092 2.092l3.262 3.261a1 1 0 0 0 1.415-1.415l-3.261-3.261a6.471 6.471 0 0 0 .001-.001zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="#364a63"/>' +
                                            '</svg>' +
                                            '</span>');
                                    }
                                    
                                    $icon.css({
                                        'position': 'absolute',
                                        'top': '50%',
                                        'left': '50%',
                                        'transform': 'translate(-50%, -50%)',
                                        'color': '#364a63',
                                        'font-size': '16px',
                                        'pointer-events': 'none',
                                        'z-index': '10',
                                        'display': 'block !important',
                                        'visibility': 'visible !important',
                                        'opacity': '1 !important',
                                        'line-height': '1',
                                        'width': '16px',
                                        'height': '16px',
                                        'text-align': 'center',
                                        'margin': '0',
                                        'padding': '0'
                                    });
                                    
                                    // Style SVG if used
                                    if (!useFontAwesome) {
                                        $icon.find('svg').css({
                                            'width': '16px',
                                            'height': '16px',
                                            'display': 'block'
                                        });
                                        $icon.find('path').css({
                                            'fill': '#364a63'
                                        });
                                    }
                                    
                                    // Insert icon BEFORE the input so it's inside the wrapper
                                    $input.before($icon);
                                    
                                    console.log('✅ Search icon added to input');
                                    
                                    // Update icon position on focus - move to left side but stay inside
                                    $input.on('focus.searchicon', function() {
                                        $icon.css({
                                            'left': '14px',
                                            'transform': 'translateY(-50%)'
                                        });
                                    });
                                    
                                    // Reset icon position on blur - back to center
                                    $input.on('blur.searchicon', function() {
                                        if (!$input.val()) {
                                            $icon.css({
                                                'left': '50%',
                                                'transform': 'translate(-50%, -50%)'
                                            });
                                        } else {
                                            // If there's text, keep icon on left
                                            $icon.css({
                                                'left': '14px',
                                                'transform': 'translateY(-50%)'
                                            });
                                        }
                                    });
                                    
                                    // Also check on input event
                                    $input.on('input.searchicon', function() {
                                        if ($input.val()) {
                                            $icon.css({
                                                'left': '14px',
                                                'transform': 'translateY(-50%)'
                                            });
                                        } else {
                                            $icon.css({
                                                'left': '50%',
                                                'transform': 'translate(-50%, -50%)'
                                            });
                                        }
                                    });
                                }
                            });
                            return true; // Success
                        }
                        return false; // Not found yet
                    }
                    
                    // Try immediately
                    if (!tryAddIcon()) {
                        // Try with delays
                        var interval = setInterval(function() {
                            attempts++;
                            if (tryAddIcon() || attempts >= maxAttempts) {
                                clearInterval(interval);
                                if (attempts >= maxAttempts) {
                                    console.warn('⚠️ Search input not found after', maxAttempts, 'attempts');
                                }
                            }
                        }, 200);
                    }
                }
                
                // Add icon immediately
                addSearchIcon();
                
                self.modal = new bootstrap.Modal(self.$modalRootElement)
                
                // Also apply on shown event as backup
                self.$modalRootElement.on('shown.bs.modal', function() {
                    var $modalContent = self.$modalRootElement.find('.modal-content');
                    if ($modalContent.length) {
                        $modalContent.each(function() {
                            this.style.setProperty('border-radius', '16px', 'important');
                            this.style.setProperty('overflow', 'hidden', 'important');
                        });
                    }
                    // Add search icon again in case it wasn't added
                    addSearchIcon();
                });
                
                self.modal.show()

            })
            .always(function () {
                $.ti.loadingIndicator.hide()
            })
    }

    MediaManagerModal.prototype.hide = function () {
        if (this.$modalElement)
            this.modal.hide()
    }

    MediaManagerModal.prototype.getMediaManagerElement = function () {
        return this.$modalElement.find('[data-control="media-manager"]')
    }

    MediaManagerModal.prototype.insertMedia = function () {
        var items = this.getMediaManagerElement().mediaManager('getSelectedItems')

        if (this.options.onInsert !== undefined)
            this.options.onInsert.call(this, items)
    }

    MediaManagerModal.prototype.onModalHidden = function (event) {
        var mediaManager = this.$modalElement.find('[data-control="media-manager"]')

        this.dispose()

        mediaManager.mediaManager('dispose')
        mediaManager.remove()

        if (this.options.onClose !== undefined)
            this.options.onClose.call(this)
    }

    MediaManagerModal.prototype.onModalShown = function (event) {
        this.$modalElement = $(event.target)

        this.$modalElement.on('insert.media.ti.mediamanager', $.proxy(this.insertMedia, this))

        this.$modalElement.find('[data-control="media-manager"]').mediaManager('selectMarkedItem')
    }

    MediaManagerModal.DEFAULTS = {
        alias: undefined,
        selectMode: undefined,
        onInsert: undefined,
        onClose: undefined
    }

    $.ti.mediaManager.modal = MediaManagerModal
}(window.jQuery);

