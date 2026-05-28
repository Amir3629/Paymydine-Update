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
        this.$requestTarget = this.$form.length ? this.$form : this.$el
        this.$toolbar = $('[data-container-toolbar]')
        this.$dateRangeEl = $(options.dateRangeSelector, this.$toolbar)
        this._sortableInstance = null
        this._nativeSortableBound = false
        this._initScheduled = false
        this._isEditMode = false

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
        this.normalizePmdWidgetRoots()
        this.bindHandleSafety()

        this.$el.off('click.dashboardRemoveWidget').on('click.dashboardRemoveWidget', '[data-control="remove-widget"]', function (event) {
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
                var $col = $btn.closest('div.col')
                $col.addClass('pmd-dashboard-widget-removing')
                setTimeout(function () {
                    $col.remove()
                    self.schedulePostRenderRefresh()
                }, 180)
            }).always(function () {
                $.ti.loadingIndicator.hide()
            })
        })
        
        // Duplicate widget handler
        this.$el.off('click.dashboardDuplicateWidget').on('click.dashboardDuplicateWidget', '[data-control="duplicate-widget"]', function (event) {
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
            }).done(function () {
                self.schedulePostRenderRefresh()
            }).always(function () {
                $.ti.loadingIndicator.hide()
            })
        })
    }


    DashboardContainer.prototype.bindHandleSafety = function () {
        this.$el.off('click.dashboardHandle').on('click.dashboardHandle', '.widget-item-action .handle', function (event) {
            event.preventDefault()
        })
    }

    DashboardContainer.prototype.normalizePmdWidgetRoots = function () {
        if (!document.body || !document.body.classList.contains('pmd-admin-theme-v1')) return

        var $roots = this.$el.find('#dashboardcontainer-container-list .widget-item.card.bg-light, .dashboard-widgets .widget-item.card.bg-light')
        if (!$roots.length) return

        $roots.each(function () {
            var $root = $(this)
            $root.removeClass('card bg-light shadow-sm p-3 no-padding')
            $root.addClass('pmd-dashboard-widget-root')
        })
    }

    DashboardContainer.prototype.initSortable = function () {
        var self = this

        self.ensureSortable = function () {
            var $sortableContainer = $(self.options.sortableContainer, self.$el)
            if (!$sortableContainer.length) {
                $sortableContainer = $('[id*="container-list"]', self.$el).first()
            }
            if (!$sortableContainer.length) {
                $sortableContainer = $('.widget-container', self.$el).first()
            }
            if (!$sortableContainer.length) return

            if (!self.$el.hasClass('edit-mode') && !document.body.classList.contains('edit-mode-active') && !self._isEditMode) return

            self.destroySortableInstances()

            if (typeof Sortable !== 'undefined' && Sortable && typeof Sortable.create === 'function') {
                self._sortableInstance = Sortable.create($sortableContainer.get(0), {
                    draggable: '> .col',
                    handle: '.widget-item-action .handle, .handle',
                    animation: 180,
                    easing: 'cubic-bezier(0.2, 0, 0, 1)',
                    ghostClass: 'pmd-dashboard-widget-ghost',
                    chosenClass: 'pmd-dashboard-widget-chosen',
                    dragClass: 'pmd-dashboard-widget-dragging',
                    fallbackOnBody: true,
                    swapThreshold: 0.65,
                    onStart: function () { document.body.classList.add('pmd-dashboard-dragging') },
                    onEnd: function (event) {
                        document.body.classList.remove('pmd-dashboard-dragging')
                        self.onSortWidgets(event)
                    }
                })
                return
            }

            self.initNativeSortable($sortableContainer)
        }

        $(window).off('ajaxUpdateComplete.dashboardContainer').on('ajaxUpdateComplete.dashboardContainer', function () {
            self.schedulePostRenderRefresh()
        })

        self.$el.off('dashboard-edit-mode-entered.dashboardContainer').on('dashboard-edit-mode-entered.dashboardContainer', function () {
            self._isEditMode = true
            self.ensureSortable()
        })

        self.$el.off('dashboard-edit-mode-exited.dashboardContainer').on('dashboard-edit-mode-exited.dashboardContainer', function () {
            self._isEditMode = false
            self.destroySortableInstances()
        })

        self.schedulePostRenderRefresh()
    }

    DashboardContainer.prototype.destroySortableInstances = function () {
        if (this._sortableInstance && typeof this._sortableInstance.destroy === 'function') {
            this._sortableInstance.destroy()
        }
        this._sortableInstance = null
        this.destroyNativeSortable()
    }

    DashboardContainer.prototype.schedulePostRenderRefresh = function () {
        var self = this
        if (self._initScheduled) return
        self._initScheduled = true
        requestAnimationFrame(function () {
            self._initScheduled = false
            self.normalizePmdWidgetRoots()
            self.applyWidgetEnterAnimations()
            if (self.$el.hasClass('edit-mode') || document.body.classList.contains('edit-mode-active') || self._isEditMode) {
                self.ensureSortable()
            }
        })
    }

    DashboardContainer.prototype.applyWidgetEnterAnimations = function () {
        this.$el.find('#dashboardcontainer-container-list > .col').each(function () {
            var $col = $(this)
            if ($col.data('pmdEnterAnimated')) return
            $col.data('pmdEnterAnimated', true).addClass('pmd-dashboard-widget-enter')
            requestAnimationFrame(function () {
                $col.addClass('pmd-dashboard-widget-enter-active')
                setTimeout(function () {
                    $col.removeClass('pmd-dashboard-widget-enter pmd-dashboard-widget-enter-active')
                }, 200)
            })
        })
    }

    DashboardContainer.prototype.initNativeSortable = function ($sortableContainer) {
        if (this._nativeSortableBound) return

        var self = this
        var dragSourceEl = null
        var dragArmedEl = null
        var containerId = $sortableContainer.attr('id')
        var $sortItems = $sortableContainer.find('> .col')
        var selector = containerId ? ('#' + containerId + ' > .col') : '.widget-list > .col'
        if (!$sortItems.length) {
            $sortItems = $sortableContainer.find('> .widget-item')
            selector = containerId ? ('#' + containerId + ' > .widget-item') : '.widget-container > .widget-item'
        }
        if (!$sortItems.length) {
            $sortItems = $sortableContainer.find('.widget-item')
            selector = containerId ? ('#' + containerId + ' .widget-item') : '.widget-item'
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

            $('.dashboard-widgets .progress-indicator').show()
            self.$dateRangeEl.request(self.options.alias + '::onSetDateRange', {
                data: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                }
            }).always(function () {
                $('.dashboard-widgets .progress-indicator').attr('style', 'display: none !important;')
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
                        self.schedulePostRenderRefresh();
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
                    self.schedulePostRenderRefresh();
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
                    self.schedulePostRenderRefresh();
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

    function initDashboardContainers() {
        $('[data-control="dashboard-container"]').each(function () {
            var $el = $(this)
            var instance = $el.data('ti.dashboardContainer')
            if (!instance) {
                $el.dashboardContainer()
                instance = $el.data('ti.dashboardContainer')
            }
            if (instance && typeof instance.schedulePostRenderRefresh === 'function') {
                instance.schedulePostRenderRefresh()
            }
        })
    }

    $(document).ready(initDashboardContainers)
    $(document).render(initDashboardContainers)
}(window.jQuery);
