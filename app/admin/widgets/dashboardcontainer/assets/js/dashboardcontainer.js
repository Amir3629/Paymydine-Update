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

            var alias = $('[data-widget-alias]', $btn.closest('div.widget-item')).val()
            var $col = $btn.closest('div.col')
            $col.addClass('pmd-dashboard-widget-removing')

            setTimeout(function () {
                $.ti.loadingIndicator.show()
                self.$requestTarget.request(self.options.alias + '::onRemoveWidget', {
                    data: {
                        'alias': alias
                    }
                }).done(function () {
                    $col.remove()
                    self.schedulePostRenderRefresh()
                }).always(function () {
                    $.ti.loadingIndicator.hide()
                })
            }, 190)
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
        this.$el.off('dragstart.dashboardHandle').on('dragstart.dashboardHandle', '.widget-item-action .handle, .widget-item-action .handle *', function (event) {
            event.preventDefault()
            event.stopPropagation()
        })
    }

    DashboardContainer.prototype.normalizeHandleElements = function () {
        var $handles = this.$el.find('#dashboardcontainer-container-list .widget-item-action .handle, .dashboard-widgets .widget-item-action .handle')
        $handles.attr('draggable', 'false')
        $handles.find('*').attr('draggable', 'false')
        $handles.each(function () {
            var $handle = $(this)
            if (!$handle.attr('href') || $handle.attr('href') === '#') {
                $handle.attr('href', 'javascript:void(0)')
            }
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
            var $sortableContainer = $('#dashboardcontainer-container-list', self.$el)
            if (!$sortableContainer.length) {
                $sortableContainer = $('[id*="container-list"]', self.$el).first()
            }
            if (!$sortableContainer.length) return

            if (!self.$el.hasClass('edit-mode') && !document.body.classList.contains('edit-mode-active') && !self._isEditMode) return

            self.destroySortableInstances()

            if (typeof $.fn.sortable === 'function') {
                $sortableContainer.sortable({
                    items: '> .col',
                    handle: '.widget-item-action .handle, .handle',
                    containment: 'parent',
                    tolerance: 'pointer',
                    placeholder: 'pmd-dashboard-widget-placeholder',
                    forcePlaceholderSize: true,
                    helper: 'original',
                    cursor: 'grabbing',
                    distance: 3,
                    delay: 0,
                    start: function () { document.body.classList.add('pmd-dashboard-dragging') },
                    stop: function () { document.body.classList.remove('pmd-dashboard-dragging') },
                    update: function (event, ui) { self.onSortWidgets(event) }
                })
                self._sortableInstance = $sortableContainer
                self._activeDragLibrary = 'jquery-ui'
                return
            }

            self.initPointerSortable($sortableContainer)
            self._activeDragLibrary = 'pointer-fallback'
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
        if (this._sortableInstance && this._sortableInstance.length && typeof this._sortableInstance.sortable === 'function') {
            try { this._sortableInstance.sortable('destroy') } catch (e) {}
        }
        this._sortableInstance = null
        this.destroyPointerSortable()
    }

    DashboardContainer.prototype.schedulePostRenderRefresh = function () {
        var self = this
        if (self._initScheduled) return
        self._initScheduled = true
        requestAnimationFrame(function () {
            self._initScheduled = false
            self.normalizePmdWidgetRoots()
            self.normalizeHandleElements()
            self.applyWidgetEnterAnimations()
            if (self.$el.hasClass('edit-mode') || document.body.classList.contains('edit-mode-active') || self._isEditMode) {
                self.ensureSortable()
            }
            window.PMDDashboardDragDebug = {
                activeLibrary: self._activeDragLibrary || 'none',
                containerId: self.$el.find('[id*="container-list"]').first().attr('id') || null,
                itemSelector: '> .col',
                handleSelector: '.widget-item-action .handle, .handle'
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
                }, 500)
            })
        })
    }

    DashboardContainer.prototype.initPointerSortable = function ($sortableContainer) {
        if (this._nativeSortableBound) return

        var self = this
        var $dragCol = null
        var $placeholder = null
        var grabOffsetX = 0
        var grabOffsetY = 0
        var pointerDown = null
        var dragStartThreshold = 5
        var dragActivated = false
        var pendingCol = null
        var pendingRect = null
        var originalWidth = 0
        var originalHeight = 0
        var $dragPreview = null

        function debugLog(payload) {
            if (!window.PMDDashboardDragDebug || !window.PMDDashboardDragDebug.enabled) return
            console.info('[PMD DASH DRAG]', payload)
        }

        function onMove(event) {
            var e = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event
            if (!dragActivated && pointerDown && pendingCol && pendingRect) {
                var dx = e.clientX - pointerDown.x
                var dy = e.clientY - pointerDown.y
                if (Math.sqrt((dx * dx) + (dy * dy)) < dragStartThreshold) {
                    return
                }

                dragActivated = true
                document.body.classList.add('pmd-dashboard-dragging')
                $placeholder = $('<div class="col pmd-dashboard-widget-placeholder"></div>')
                    .css({ width: originalWidth + 'px', height: originalHeight + 'px' })
                pendingCol.after($placeholder)
                $dragCol = pendingCol

                $dragPreview = $($dragCol.get(0).cloneNode(true))
                $dragPreview.addClass('pmd-dashboard-widget-dragging').css({
                    position: 'fixed',
                    width: originalWidth + 'px',
                    minHeight: originalHeight + 'px',
                    left: pendingRect.left + 'px',
                    top: pendingRect.top + 'px',
                    zIndex: 9999,
                    margin: 0,
                    boxSizing: 'border-box',
                    transform: 'none',
                    transition: 'none',
                    pointerEvents: 'none',
                    opacity: 0.96
                })
                $('body').append($dragPreview)
                $dragCol.css('visibility', 'hidden')
                debugLog({
                    phase: 'activate',
                    rectLeft: pendingRect.left,
                    rectTop: pendingRect.top,
                    grabOffsetX: grabOffsetX,
                    grabOffsetY: grabOffsetY,
                    firstLeft: (e.clientX - grabOffsetX),
                    firstTop: (e.clientY - grabOffsetY)
                })
            }
            if (!$dragCol || !$dragPreview || !dragActivated) return
            var nextLeft = e.clientX - grabOffsetX
            var nextTop = e.clientY - grabOffsetY
            $dragPreview.css({ left: nextLeft + 'px', top: nextTop + 'px' })
            debugLog({ phase: 'move', left: nextLeft, top: nextTop })

            var $target = $(document.elementFromPoint(e.clientX, e.clientY)).closest('#' + $sortableContainer.attr('id') + ' > .col')
            if (!$target.length || $target.is($dragCol) || $target.is($placeholder)) return
            var targetRect = $target.get(0).getBoundingClientRect()
            if (e.clientY > targetRect.top + targetRect.height / 2) {
                $target.after($placeholder)
            } else {
                $target.before($placeholder)
            }
            debugLog({ phase: 'placeholder', index: $placeholder.index() })
        }

        function onUp() {
            if (dragActivated && $dragCol && $placeholder) {
                $dragCol.css('visibility', '')
                $placeholder.replaceWith($dragCol)
                self.onSortWidgets()
            }
            if ($dragPreview) $dragPreview.remove()
            if ($placeholder) $placeholder.remove()
            $placeholder = null
            $dragPreview = null
            $dragCol = null
            pendingCol = null
            pendingRect = null
            pointerDown = null
            dragActivated = false
            $(document).off('.pmdPointerSort')
            document.body.classList.remove('pmd-dashboard-dragging')
        }

        this.$el.on('mousedown.nativeSortable touchstart.nativeSortable', '.widget-item-action .handle, .handle', function (event) {
            if (!self.$el.hasClass('edit-mode') && !document.body.classList.contains('edit-mode-active') && !self._isEditMode) return
            var e = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event
            var $col = $(this).closest('#' + $sortableContainer.attr('id') + ' > .col')
            if (!$col.length) return

            event.preventDefault()
            var rect = $col.get(0).getBoundingClientRect()
            grabOffsetX = e.clientX - rect.left
            grabOffsetY = e.clientY - rect.top
            pointerDown = { x: e.clientX, y: e.clientY }
            pendingCol = $col
            pendingRect = rect
            originalWidth = rect.width
            originalHeight = rect.height
            dragActivated = false
            debugLog({
                phase: 'pointerdown',
                rectLeft: rect.left,
                rectTop: rect.top,
                grabOffsetX: grabOffsetX,
                grabOffsetY: grabOffsetY
            })

            $(document)
                .on('mousemove.pmdPointerSort touchmove.pmdPointerSort', onMove)
                .on('mouseup.pmdPointerSort touchend.pmdPointerSort touchcancel.pmdPointerSort', onUp)
                .on('keydown.pmdPointerSort', function (keyEvent) {
                    if (keyEvent.key === 'Escape') onUp()
                })
        })

        this._nativeSortableBound = true
    }

    DashboardContainer.prototype.destroyPointerSortable = function () {
        this.$el.off('.nativeSortable')
        $(document).off('.pmdPointerSort')
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
