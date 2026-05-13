/*
 * Dashboard container widget
 *
 * Data attributes:
 * - data-control="dashboard-container" - enables the dashboard container plugin
 *
 * JavaScript API:
 * $('#container').dashboardContainer()
 */
+function ($) {
    "use strict";

    function getDashboardContainerState(alias) {
        window.PMDDashboardContainerState = window.PMDDashboardContainerState || {};
        if (!window.PMDDashboardContainerState[alias]) {
            window.PMDDashboardContainerState[alias] = {};
        }
        return window.PMDDashboardContainerState[alias];
    }

    function updateDashboardContainerState(alias, values) {
        var state = getDashboardContainerState(alias);
        $.extend(state, values);
        return state;
    }

    // DASHBOARDCONTAINER CLASS DEFINITION
    // ============================

    var DashboardContainer = function (element, options) {
        this.options = options
        this.$el = $(element)
        this.$form = this.$el.closest('form')
        this.$requestTarget = this.$form.length ? this.$form : this.$el
        this.$toolbar = $('[data-container-toolbar]')
        this.$dateRangeEl = $(options.dateRangeSelector, this.$toolbar)
        updateDashboardContainerState(options.alias, {pluginActive: true});
        window.PMDDashboardContainerPluginActive = true

        this.init();
        this.initSortable()
        this.initDateRange();
    }

    DashboardContainer.DEFAULTS = {
        alias: undefined,
        breakpoint: 768,
        columns: 10,
        sortableContainer: '.is-sortable',
        dateRangeFormat: 'MMMM D, YYYY',
        dateRangeSelector: '[data-control="daterange"]',
    }

    DashboardContainer.DATE_RANGE_DEFAULTS = {
        opens: 'left',
        startDate: (typeof moment === 'function')
            ? moment().subtract(29, 'days')
            : new Date(Date.now() - (29 * 24 * 60 * 60 * 1000)),
        endDate: (typeof moment === 'function')
            ? moment()
            : new Date(),
        timePicker: true,
        locale: {
            format: 'MM/DD/YYYY'
        },
        ranges: {
            'Today': (typeof moment === 'function')
                ? [moment(), moment()]
                : [new Date(), new Date()],
            'Yesterday': (typeof moment === 'function')
                ? [moment().subtract(1, 'days'), moment().subtract(1, 'days')]
                : [new Date(Date.now() - (24 * 60 * 60 * 1000)), new Date(Date.now() - (24 * 60 * 60 * 1000))],
            'Last 7 Days': (typeof moment === 'function')
                ? [moment().subtract(6, 'days'), moment()]
                : [new Date(Date.now() - (6 * 24 * 60 * 60 * 1000)), new Date()],
            'This Month': (typeof moment === 'function')
                ? [moment().startOf('month'), moment().endOf('month')]
                : [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()],
            'Last Month': (typeof moment === 'function')
                ? [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                : [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)]
        },
        parentEl: '.dashboard-toolbar',
    }

    DashboardContainer.prototype.init = function () {
        var self = this

        this.fetchWidgets()

        this.$el.on('click', '[data-control="remove-widget"]', function (event) {
            event.preventDefault()
            event.stopPropagation()
            var $btn = $(this)
            if (!confirm('Are you sure you want to do this?'))
                return false;

            $.ti.loadingIndicator.show()
            self.$requestTarget.request(self.options.alias + '::onRemoveWidget', {
                data: {
                    'alias': $('[data-widget-alias]', $btn.closest('div.widget-item')).val()
                }
            }).done(function () {
                $btn.closest('div.col').remove()
            }).always(function () {
                $.ti.loadingIndicator.hide()
            })
        })
        
        // Duplicate widget handler
        this.$el.on('click', '[data-control="duplicate-widget"]', function (event) {
            event.preventDefault()
            event.stopPropagation()
            var $btn = $(this)
            var alias = $('[data-widget-alias]', $btn.closest('div.widget-item')).val()
            
            if (!alias) {
                console.error('Widget alias not found');
                return false;
            }
            
            $.ti.loadingIndicator.show()
            self.$requestTarget.request(self.options.alias + '::onDuplicateWidget', {
                data: {
                    'alias': alias
                }
            }).always(function () {
                $.ti.loadingIndicator.hide()
            })
        })
    }

    DashboardContainer.prototype.initSortable = function () {
        var self = this

        // Destroy existing Sortable instance before creating a new one (avoids duplicate handlers)
        self._sortableInstance = null
        self._nativeSortableBound = false

        self.ensureSortable = function () {
            var $sortableContainer = $(self.options.sortableContainer, self.$el)
            if (!$sortableContainer.length) {
                $sortableContainer = $('[id*="container-list"]', self.$el).first()
            }
            if (!$sortableContainer.length) {
                $sortableContainer = $('.widget-container', self.$el).first()
            }
            if (!$sortableContainer.length) return
            // Only enable when in edit mode (widget action handles visible)
            if (!self.$el.hasClass('edit-mode') && !document.body.classList.contains('edit-mode-active')) return
            if (self._sortableInstance) {
                self._sortableInstance.destroy()
                self._sortableInstance = null
            }
            if (typeof Sortable !== 'undefined' && Sortable && typeof Sortable.create === 'function') {
                self._sortableInstance = Sortable.create($sortableContainer.get(0), {
                    handle: '.handle',
                    onSort: $.proxy(self.onSortWidgets, self)
                })
                return
            }

            self.initNativeSortable($sortableContainer)
        }

        $(window).on('ajaxUpdateComplete', function () {
            self.ensureSortable()
        })

        // Create sortable as soon as user enters edit mode (fixes "move button works only after clicking something else")
        self.$el.on('dashboard-edit-mode-entered', function () {
            setTimeout(function () { self.ensureSortable() }, 0)
        })

        // Destroy sortable when leaving edit mode
        self.$el.on('dashboard-edit-mode-exited', function () {
            if (self._sortableInstance) {
                self._sortableInstance.destroy()
                self._sortableInstance = null
            }
            self.destroyNativeSortable()
        })

        // Also try once after widgets load (in case ajaxUpdateComplete didn't fire)
        setTimeout(function () { self.ensureSortable() }, 150)
    }

    DashboardContainer.prototype.initNativeSortable = function ($sortableContainer) {
        if (this._nativeSortableBound) return

        var self = this
        var dragSourceEl = null
        var dragArmedEl = null
        var $sortItems = $sortableContainer.find('> .col')
        var selector = self.options.sortableContainer + ' > .col'
        if (!$sortItems.length) {
            $sortItems = $sortableContainer.find('> .widget-item')
            selector = '.widget-container > .widget-item'
        }
        if (!$sortItems.length) {
            $sortItems = $sortableContainer.find('.widget-item')
            selector = '.widget-item'
        }
        if (!$sortItems.length) return

        // Arm dragging only when pressing the move handle, so normal button clicks still work.
        this.$el.on('mousedown.nativeSortable', '.handle', function () {
            var $item = $(this).closest(selector)
            if (!$item.length) return
            dragArmedEl = $item.get(0)
            $item.attr('draggable', 'true')
        })

        this.$el.on('mouseup.nativeSortable mouseleave.nativeSortable', selector, function () {
            if (dragArmedEl === this && dragSourceEl !== this) {
                $(this).removeAttr('draggable')
                dragArmedEl = null
            }
        })

        this.$el.on('dragstart.nativeSortable', selector, function (event) {
            var originalEvent = event.originalEvent || event
            if (dragArmedEl !== this) {
                originalEvent.preventDefault()
                return
            }

            dragSourceEl = this
            originalEvent.dataTransfer.effectAllowed = 'move'
            originalEvent.dataTransfer.setData('text/plain', 'dashboard-widget')
            $(this).addClass('native-dragging')
        })

        this.$el.on('dragover.nativeSortable', selector, function (event) {
            event.preventDefault()
            var originalEvent = event.originalEvent || event
            originalEvent.dataTransfer.dropEffect = 'move'
        })

        this.$el.on('drop.nativeSortable', selector, function (event) {
            event.preventDefault()
            if (!dragSourceEl || dragSourceEl === this) return

            var $container = $sortableContainer
            var $dragSource = $(dragSourceEl)
            var $dropTarget = $(this)

            if ($dragSource.parent().get(0) !== $dropTarget.parent().get(0)) {
                $container = $dropTarget.parent()
            }

            if ($dragSource.index() < $dropTarget.index()) {
                $dropTarget.after($dragSource)
            } else {
                $dropTarget.before($dragSource)
            }

            self.onSortWidgets()
        })

        this.$el.on('dragend.nativeSortable', selector, function () {
            $(this).removeAttr('draggable')
            $(this).removeClass('native-dragging')
            dragSourceEl = null
            dragArmedEl = null
        })

        $sortItems.removeAttr('draggable')
        this._nativeSortableBound = true
    }

    DashboardContainer.prototype.destroyNativeSortable = function () {
        this.$el.off('.nativeSortable')
        $(this.options.sortableContainer + ' > .col', this.$el).removeAttr('draggable')
        $('.widget-container > .widget-item, .widget-item', this.$el).removeAttr('draggable')
        this._nativeSortableBound = false
    }

    
    function isMobileDashboardDateRange() {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    }

    function cleanupDashboardDateRangePicker() {
        jQuery('.daterangepicker').removeClass('ti-visible open-active show-calendar show-ranges opensleft opensright openscenter drop-up').hide();
    }

    function buildDashboardDateRangeOptions(startDate, endDate, localeFormat) {
        var isMobile = isMobileDashboardDateRange();

        var options = {
            startDate: startDate,
            endDate: endDate,
            autoUpdateInput: false,
            alwaysShowCalendars: false,
            showCustomRangeLabel: true,
            linkedCalendars: true,
            opens: isMobile ? 'center' : 'left',
            drops: isMobile ? 'down' : 'auto',
            locale: {
                format: localeFormat || 'MM/DD/YYYY',
                cancelLabel: 'Cancel',
                applyLabel: 'Apply',
                customRangeLabel: 'Custom Range'
            },
            ranges: isMobile ? undefined : {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [
                    moment().subtract(1, 'month').startOf('month'),
                    moment().subtract(1, 'month').endOf('month')
                ]
            }
        };

        if (isMobile) {
            options.singleDatePicker = false;
            options.showDropdowns = false;
            options.timePicker = false;
        } else {
            options.showDropdowns = true;
        }

        return options;
    }

DashboardContainer.prototype.initDateRange = function () {
        cleanupDashboardDateRangePicker();

        if (!this.$dateRangeEl.length) {
            return
        }

        if (typeof this.$dateRangeEl.daterangepicker !== 'function') {
            this.initDateRangeFallback()
            return
        }

        var options = $.extend({}, DashboardContainer.DATE_RANGE_DEFAULTS, this.$dateRangeEl.data())
        if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
            options.opens = 'center'
            options.drops = 'auto'
            options.showDropdowns = true
        }
        this.$dateRangeEl.daterangepicker(options, $.proxy(this.onDateRangeSelected, this))
        this.bindMobileDateRangeViewportFix()
    }

    DashboardContainer.prototype.initDateRangeFallback = function () {
        var self = this
        this.$dateRangeEl.off('click.dashboardDateFallback').on('click.dashboardDateFallback', function (event) {
            event.preventDefault()

            var startDefault = $(this).data('startDate') || $(this).attr('data-start-date') || ''
            var endDefault = $(this).data('endDate') || $(this).attr('data-end-date') || ''

            var startInput = window.prompt('Start date (YYYY-MM-DD)', startDefault ? String(startDefault).slice(0, 10) : '')
            if (!startInput) return
            var endInput = window.prompt('End date (YYYY-MM-DD)', endDefault ? String(endDefault).slice(0, 10) : '')
            if (!endInput) return

            var start = new Date(startInput + 'T00:00:00')
            var end = new Date(endInput + 'T23:59:59')
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return

            $('span', self.$dateRangeEl).text(startInput + ' - ' + endInput)
            self.$dateRangeEl.attr('data-start-date', startInput).attr('data-end-date', endInput)

            $('.dashboard-widgets .progress-indicator').prop('hidden', false)
            self.$dateRangeEl.request(self.options.alias + '::onSetDateRange', {
                data: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                }
            }).always(function () {
                $('.dashboard-widgets .progress-indicator').prop('hidden', true)
            })
        })
    }

    DashboardContainer.prototype.bindMobileDateRangeViewportFix = function () {
        if (!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches)) return

        this.$dateRangeEl.off('show.daterangepicker.dashboardFix').on('show.daterangepicker.dashboardFix', function (event, picker) {
            var $container = picker && picker.container ? picker.container : $('.daterangepicker:visible').last()
            if (!$container || !$container.length) return

            $container.css({
                left: '8px',
                right: '8px',
                width: 'auto',
                maxWidth: (window.innerWidth - 16) + 'px'
            })
        })
    }

    DashboardContainer.prototype.onSortWidgets = function (event) {
        var aliases = [],
            sortOrders = [],
            self = this

        $('[data-widget-alias]', this.$el).each(function () {
            aliases.push($(this).val())
        })

        $('[data-widget-priority]', this.$el).each(function () {
            sortOrders.push($(this).val())
        })

        this.$requestTarget.request(self.options.alias + '::onSetWidgetPriorities', {
            data: {
                'aliases': aliases,
                'priorities': sortOrders
            }
        })
    }

    DashboardContainer.prototype.onDateRangeSelected = function (start, end, label) {
        $('span', this.$dateRangeEl).html(start.format(this.options.dateRangeFormat)
            + ' - ' + end.format(this.options.dateRangeFormat));

        $('.dashboard-widgets .progress-indicator').prop('hidden', false)

        this.$dateRangeEl.request(this.options.alias + '::onSetDateRange', {
            data: {start: start.toISOString(), end: end.toISOString()}
        }).always(function () {
            $('.dashboard-widgets .progress-indicator').prop('hidden', true);
        })
    }

    DashboardContainer.prototype.fetchWidgets = function () {
        var self = this;
        var widgetState = getDashboardContainerState(self.options.alias);
        if (self._widgetsRequestStarted || (widgetState.requestStarted && !widgetState.requestFailed)) {
            console.log('ℹ️ DashboardContainer: widget request already started, skipping duplicate fetch');
            return;
        }
        self._widgetsRequestStarted = true;
        updateDashboardContainerState(self.options.alias, {
            requestStarted: true,
            requestComplete: false,
            requestFailed: false,
            widgetsLoaded: false
        });
        window.PMDDashboardContainerWidgetRequestStarted = true;
        // The container ID is generated as: alias + '-' + 'container'
        // e.g., 'dashboardContainer-container'
        var containerId = self.options.alias + '-container';
        var containerSelector = '#' + containerId;
        
        // Try to find the container within the dashboard-widgets area
        var $dashboardWidgets = $('.dashboard-widgets', self.$el);
        var $container = $dashboardWidgets.find('#' + containerId);
        
        // If not found, try finding any div with id containing 'container' in dashboard-widgets
        if ($container.length === 0) {
            $container = $dashboardWidgets.find('[id*="container"]:not([id*="container-list"]):not([id*="container-toolbar"])');
            if ($container.length > 0) {
                containerId = $container.first().attr('id');
                containerSelector = '#' + containerId;
            }
        }
        
        console.log('🔍 DashboardContainer: Fetching widgets...', {
            alias: self.options.alias,
            containerSelector: containerSelector,
            containerExists: $(containerSelector).length > 0,
            dashboardWidgetsExists: $dashboardWidgets.length > 0
        });
        
        // Start request immediately - no delay
        $.request(self.options.alias + '::onRenderWidgets', {
            success: function(data) {
                console.log('✅ DashboardContainer: Widgets response received successfully', data);
                
                // TastyIgniter's AJAX handler should automatically insert HTML,
                // but manually ensure it happens if needed - check immediately
                var $container = $(containerSelector);
                
                // Check if HTML was inserted by TastyIgniter's handler
                var hasContent = $container.length > 0 && $container.html().trim().length > 0;
                
                if (!hasContent && data) {
                    console.log('⚠️ DashboardContainer: Container empty, manually inserting HTML...');
                    
                    // Extract HTML from response
                    var htmlContent = null;
                    if (typeof data === 'object') {
                        // TastyIgniter returns { '#selector': 'html' }
                        htmlContent = data[containerSelector] || data['#' + containerId] || Object.values(data)[0];
                    } else if (typeof data === 'string') {
                        htmlContent = data;
                    }
                    
                    if (htmlContent && $container.length) {
                        $container.html(htmlContent);
                        console.log('✅ DashboardContainer: HTML manually inserted', {
                            contentLength: htmlContent.length,
                            containerId: containerId
                        });
                    } else {
                        console.warn('⚠️ DashboardContainer: Could not extract HTML from response', {
                            dataType: typeof data,
                            dataKeys: typeof data === 'object' ? Object.keys(data) : 'N/A',
                            containerExists: $container.length > 0
                        });
                    }
                }
                
                // Ensure container is visible immediately
                if ($container.length) {
                    $container.prop('hidden', false);
                    
                    // Hide progress indicator immediately without writing inline styles.
                    $('.dashboard-widgets .progress-indicator', self.$el).prop('hidden', true);
                    
                    var finalContentLength = $container.html().trim().length;
                    var widgetCount = $container.find('.widget-item, .col[class*="col-sm"]').length;
                    
                    console.log('✅ DashboardContainer: Container status after insertion', {
                        hasContent: finalContentLength > 0,
                        contentLength: finalContentLength,
                        widgetCount: widgetCount,
                        height: $container.height()
                    });
                    
                    // Initialize charts immediately after widgets are loaded
                    function initCharts() {
                        if (typeof Chart === 'undefined' || typeof $.fn.chartControl !== 'function') {
                            setTimeout(initCharts, 50); // Faster retry
                            return;
                        }
                        
                        $container.find('[data-control="chart"]').each(function() {
                            var $chart = $(this);
                            if (!$chart.data('ti.chartControl')) {
                                try {
                                    $chart.chartControl();
                                    console.log('✅ DashboardContainer: Chart initialized', $chart.attr('data-alias'));
                                } catch (e) {
                                    console.error('❌ DashboardContainer: Failed to initialize chart', $chart.attr('data-alias'), e);
                                }
                            }
                        });
                    }
                    // Start chart initialization immediately
                    setTimeout(initCharts, 50);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                updateDashboardContainerState(self.options.alias, {requestFailed: true});
                console.error('❌ DashboardContainer: Failed to load widgets', {
                    status: textStatus,
                    error: errorThrown,
                    response: jqXHR.responseText,
                    statusCode: jqXHR.status
                });
            }
        }).always(function (response) {
            updateDashboardContainerState(self.options.alias, {requestComplete: true});
            console.log('🔄 DashboardContainer: Request completed');
            
            // Hide progress indicator after a delay to ensure HTML is inserted
            setTimeout(function() {
                $('.dashboard-widgets .progress-indicator', self.$el).prop('hidden', true);
                
                // Final check and visibility fix
                var $container = $(containerSelector);
                if ($container.length) {
                    var hasContent = $container.html().trim().length > 0;
                    var widgetCount = $container.find('.widget-item, .col[class*="col-sm"]').length;
                    
                    $container.prop('hidden', false);
                    
                    // Ensure widget-list remains available without inline style mutations.
                    $container.find('.widget-list').prop('hidden', false);
                    
                    console.log('✅ DashboardContainer: Final visibility check', {
                        hasContent: hasContent,
                        widgetCount: widgetCount,
                        containerHeight: $container.height(),
                        progressHidden: !$('.dashboard-widgets .progress-indicator', self.$el).is(':visible')
                    });
                    
                    updateDashboardContainerState(self.options.alias, {
                        requestComplete: true,
                        widgetsLoaded: hasContent
                    });
                    window.PMDDashboardContainerWidgetsLoaded = hasContent;

                    if (!hasContent) {
                        console.error('❌ DashboardContainer: Container is STILL empty after all attempts!');
                    }
                }
            }, 400);
        });
    }

    // DASHBOARDCONTAINER PLUGIN DEFINITION
    // ============================

    var old = $.fn.dashboardContainer

    $.fn.dashboardContainer = function (option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.dashboardContainer')
            var options = $.extend({}, DashboardContainer.DEFAULTS, $this.data(), typeof option === 'object' && option)
            if (!data) $this.data('ti.dashboardContainer', (data = new DashboardContainer(this, options)))
            if (typeof option === 'string') data[option].call($this)
        })
    }

    $.fn.dashboardContainer.Constructor = DashboardContainer

    // DASHBOARDCONTAINER NO CONFLICT
    // =================

    $.fn.dashboardContainer.noConflict = function () {
        $.fn.dashboardContainer = old
        return this
    }

    // DASHBOARDCONTAINER DATA-API
    // ===============

    // Initialize on document ready - immediately
    $(document).ready(function() {
        console.log('🚀 DashboardContainer: Document ready, initializing...');
        $('[data-control="dashboard-container"]').dashboardContainer();
    });
    
    // Also initialize on render event (for AJAX updates)
    $(document).render(function () {
        console.log('🚀 DashboardContainer: Render event triggered, initializing...');
        $('[data-control="dashboard-container"]').each(function() {
            // Only initialize if not already initialized
            if (!$(this).data('ti.dashboardContainer')) {
                $(this).dashboardContainer();
            }
        });
    });
    
    // Fallback: Initialize immediately if DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(function() {
            $('[data-control="dashboard-container"]').each(function() {
                if (!$(this).data('ti.dashboardContainer')) {
                    console.log('🚀 DashboardContainer: Fallback initialization...');
                    $(this).dashboardContainer();
                }
            });
        }, 50); // Minimal delay
    }
}(window.jQuery);
