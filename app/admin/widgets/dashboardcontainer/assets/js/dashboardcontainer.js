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

    // DASHBOARDCONTAINER CLASS DEFINITION
    // ============================

    var DashboardContainer = function (element, options) {
        this.options = options
        this.$el = $(element)
        this.$form = this.$el.closest('form')
        this.$toolbar = $('[data-container-toolbar]')
        this.$dateRangeEl = $(options.dateRangeSelector, this.$toolbar)

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
        startDate: moment().subtract(29, 'days'),
        endDate: moment(),
        timePicker: true,
        locale: {
            format: 'MM/DD/YYYY'
        },
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        parentEl: '.dashboard-toolbar',
    }

    DashboardContainer.prototype.init = function () {
        var self = this

        this.fetchWidgets()

        this.$el.on('click', '[data-control="remove-widget"]', function () {
            var $btn = $(this)
            if (!confirm('Are you sure you want to do this?'))
                return false;

            $.ti.loadingIndicator.show()
            self.$form.request(self.options.alias + '::onRemoveWidget', {
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
        this.$el.on('click', '[data-control="duplicate-widget"]', function () {
            var $btn = $(this)
            var alias = $('[data-widget-alias]', $btn.closest('div.widget-item')).val()
            
            if (!alias) {
                console.error('Widget alias not found');
                return false;
            }
            
            $.ti.loadingIndicator.show()
            self.$form.request(self.options.alias + '::onDuplicateWidget', {
                data: {
                    'alias': alias
                }
            }).always(function () {
                $.ti.loadingIndicator.hide()
            })
        })
    }

    DashboardContainer.prototype.initSortable = function () {
        var self = this,
            $sortableContainer

        $(window).on('ajaxUpdateComplete', function () {
            $sortableContainer = $(self.options.sortableContainer, self.$el)
            if ($sortableContainer.length) {
                Sortable.create($sortableContainer.get(0), {
                    handle: '.handle',
                    onSort: $.proxy(self.onSortWidgets, self)
                })
            }
        })
    }

    DashboardContainer.prototype.initDateRange = function () {
        var options = $.extend({}, DashboardContainer.DATE_RANGE_DEFAULTS, this.$dateRangeEl.data())
        this.$dateRangeEl.daterangepicker(options, $.proxy(this.onDateRangeSelected, this))
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

        this.$form.request(self.options.alias + '::onSetWidgetPriorities', {
            data: {
                'aliases': aliases,
                'priorities': sortOrders
            }
        })
    }

    DashboardContainer.prototype.onDateRangeSelected = function (start, end, label) {
        $('span', this.$dateRangeEl).html(start.format(this.options.dateRangeFormat)
            + ' - ' + end.format(this.options.dateRangeFormat));

        $('.dashboard-widgets .progress-indicator').show()

        this.$dateRangeEl.request(this.options.alias + '::onSetDateRange', {
            data: {start: start.toISOString(), end: end.toISOString()}
        }).always(function () {
            $('.dashboard-widgets .progress-indicator').attr('style', 'display: none !important;');
        })
    }

    DashboardContainer.prototype.fetchWidgets = function () {
        var self = this;
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
                console.log('✅ DashboardContainer: Widgets loaded successfully', data);
                
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
                    $container.css({
                        'display': 'block',
                        'visibility': 'visible',
                        'opacity': '1',
                        'min-height': '100px'
                    });
                    
                    // Hide progress indicator immediately
                    $('.dashboard-widgets .progress-indicator', self.$el).css({
                        'display': 'none',
                        'visibility': 'hidden',
                        'opacity': '0',
                        'height': '0',
                        'overflow': 'hidden'
                    });
                    
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
                console.error('❌ DashboardContainer: Failed to load widgets', {
                    status: textStatus,
                    error: errorThrown,
                    response: jqXHR.responseText,
                    statusCode: jqXHR.status
                });
            }
        }).always(function (response) {
            console.log('🔄 DashboardContainer: Request completed');
            
            // Hide progress indicator after a delay to ensure HTML is inserted
            setTimeout(function() {
                $('.dashboard-widgets .progress-indicator', self.$el).css({
                    'display': 'none',
                    'visibility': 'hidden',
                    'opacity': '0'
                });
                
                // Final check and visibility fix
                var $container = $(containerSelector);
                if ($container.length) {
                    var hasContent = $container.html().trim().length > 0;
                    var widgetCount = $container.find('.widget-item, .col[class*="col-sm"]').length;
                    
                    $container.css({
                        'display': 'block',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    // Ensure widget-list is visible
                    $container.find('.widget-list').css({
                        'display': 'flex',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    console.log('✅ DashboardContainer: Final visibility check', {
                        hasContent: hasContent,
                        widgetCount: widgetCount,
                        containerHeight: $container.height(),
                        progressHidden: !$('.dashboard-widgets .progress-indicator', self.$el).is(':visible')
                    });
                    
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
