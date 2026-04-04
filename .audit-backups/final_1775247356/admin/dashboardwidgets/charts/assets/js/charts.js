/*
 * Charts plugin
 *
 * Data attributes:
 * - data-control="chart" - enables the plugin on an element
 */
+function ($) {
    "use strict"

    // FIELD CHART CONTROL CLASS DEFINITION
    // ============================

    var ChartControl = function (element, options) {
        this.options = options
        this.$el = $(element)
        this.$rangeEl = $(options.rangeSelector)
        this.chartJs = null

        // Init
        this.initChartJs();
    }

    ChartControl.DEFAULTS = {
        alias: undefined,
        type: 'line',
        rangeSelector: '[data-control="daterange"]',
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    }

    ChartControl.LINE_TYPE_OPTIONS = {
        plugins: {
            legend: {
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 14,
                    boxHeight: 14,
                    padding: 16,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        if (value % 1 === 0) {
                            return value;
                        }
                    }
                }
            },
            x: {
                type: 'time',
                time: {
                    unit: 'day'
                },
                gridLines: {
                    display: false
                }
            }
        }
    }

    ChartControl.PIE_TYPE_OPTIONS = {
        plugins: {
            legend: {
                display: false,
            },
        },
    }

    ChartControl.prototype.initChartJs = function () {
        var chartOptions = (this.options.type === 'line') ? ChartControl.LINE_TYPE_OPTIONS : ChartControl.PIE_TYPE_OPTIONS
        this.options.options = $.extend({}, this.options.options, chartOptions)
        this.originalData = null
        this.chartJs = new Chart(this.$el.find('canvas'), this.options)
        this.chartJs.update()

        this.captureDataRange()
        this.initTimeRangeSlider()
    }

    ChartControl.prototype.captureDataRange = function () {
        var meta = (this.options.data && this.options.data.meta) || {}

        var start = meta.startDate ? new Date(meta.startDate) : null
        var end = meta.endDate ? new Date(meta.endDate) : null

        if (!start || !end) {
            var dates = []
            var datasets = (this.options.data && this.options.data.datasets) || []

            datasets.forEach(function (dataset) {
                (dataset.data || []).forEach(function (point) {
                    if (point && point.x) {
                        dates.push(new Date(point.x))
                    }
                })
            })

            if (dates.length) {
                dates.sort(function (a, b) { return a - b })
                start = dates[0]
                end = dates[dates.length - 1]
            } else {
                start = new Date()
                end = new Date()
            }
        }

        this.dataStartDate = new Date(start.getTime())
        this.dataEndDate = new Date(end.getTime())

        var diff = Math.abs(this.dataEndDate - this.dataStartDate)
        this.totalDaysAvailable = Math.max(1, Math.round(diff / 86400000) + 1)
    }

    ChartControl.prototype.initTimeRangeSlider = function () {
        var self = this
        var slider = $('#' + this.options.alias + '-time-range')
        var label = $('#' + this.options.alias + '-range-label')

        if (!slider.length) return

        slider.addClass('dashboard-range-input')

        var totalDays = this.totalDaysAvailable || 1
        var defaultDays = totalDays

        slider.attr('min', 1)
        slider.attr('max', totalDays)
        slider.attr('step', 1)
        slider.attr('value', defaultDays)

        slider.prop('disabled', totalDays <= 1)

        slider.off('.chartRange').on('input.chartRange change.chartRange', function () {
            var days = parseInt($(this).val(), 10) || 1
            self.updateRangeLabel(label, days, totalDays)
            self.filterChartData(days)
        })

        this.updateRangeScale(slider, totalDays)
        this.updateRangeLabel(label, defaultDays, totalDays)
        this.filterChartData(defaultDays)
    }

    ChartControl.prototype.updateRangeLabel = function (labelEl, days, totalDays) {
        if (!labelEl || !labelEl.length) return

        if (days >= totalDays && totalDays > 1) {
            labelEl.text('Full range')
            return
        }

        labelEl.text(days + ' ' + (days === 1 ? 'day' : 'days'))
    }

    ChartControl.prototype.updateRangeScale = function (sliderEl, totalDays) {
        if (!sliderEl || !sliderEl.length) return

        var $scale = sliderEl.siblings('.range-scale')
        if (!$scale.length) return

        var spans = $scale.find('span')
        if (!spans.length) return

        var start = new Date(this.dataStartDate.getTime())
        var end = new Date(this.dataEndDate.getTime())
        var mid = new Date(start.getTime())
        mid.setDate(mid.getDate() + Math.floor((totalDays - 1) / 2))

        spans.eq(0).text(this.formatDateLabel(start))
        spans.eq(1).text(totalDays > 1 ? this.formatDateLabel(mid) : this.formatDateLabel(start))
        spans.eq(2).text(this.formatDateLabel(end))
    }

    ChartControl.prototype.formatDateLabel = function (date) {
        if (!date) return ''

        if (typeof moment === 'function') {
            return moment(date).format('MMM D')
        }

        return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
    }

    ChartControl.prototype.filterChartData = function (days) {
        if (!this.chartJs || !this.chartJs.data.datasets) return

        var self = this
        var endDate = this.dataEndDate ? new Date(this.dataEndDate.getTime()) : new Date()
        var startDate = new Date(endDate.getTime())
        startDate.setDate(endDate.getDate() - (parseInt(days, 10) || 1) + 1)

        if (this.dataStartDate && startDate < this.dataStartDate) {
            startDate = new Date(this.dataStartDate.getTime())
        }

        // Store original data if not already stored
        if (!this.originalData) {
            this.originalData = JSON.parse(JSON.stringify(this.chartJs.data.datasets))
        }

        // Filter each dataset
        this.chartJs.data.datasets.forEach(function(dataset, index) {
            var originalDataset = self.originalData[index]
            dataset.data = originalDataset.data.filter(function(point) {
                var pointDate = new Date(point.x)
                return pointDate >= startDate && pointDate <= endDate
            })
        })

        this.chartJs.update('none') // Update without animation for smooth sliding
    }

    ChartControl.prototype.unbind = function () {
        this.$el.chartControl('destroy')
        this.$el.removeData('ti.chartControl')
        this.chartJs = null

        this.$rangeEl.daterangepicker('destroy')
    }

    // FIELD CHART CONTROL PLUGIN DEFINITION
    // ============================

    var old = $.fn.chartControl

    $.fn.chartControl = function (option) {
        var args = Array.prototype.slice.call(arguments, 1), result
        this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.chartControl')
            var options = $.extend({}, ChartControl.DEFAULTS, $this.data(), typeof option === 'object' && option)
            
            // Ensure data attribute is parsed correctly
            if ($this.attr('data-data')) {
                try {
                    var jsonData = $this.attr('data-data');
                    // jQuery's .data() should parse JSON, but ensure it's an object
                    if (typeof options.data === 'string') {
                        options.data = JSON.parse(jsonData);
                    } else if (!options.data) {
                        options.data = JSON.parse(jsonData);
                    }
                } catch (e) {
                    console.error('Failed to parse chart data:', e);
                }
            }
            
            // Only initialize if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded yet, retrying chart initialization...');
                setTimeout(function() {
                    if (typeof Chart !== 'undefined') {
                        $this.chartControl(option);
                    }
                }, 200);
                return;
            }
            
            if (!data) $this.data('ti.chartControl', (data = new ChartControl(this, options)))
            if (typeof option === 'string') result = data[option].apply(data, args)
            if (typeof result !== 'undefined') return false
        })

        return result ? result : this
    }

    $.fn.chartControl.Constructor = ChartControl

    // FIELD CHART CONTROL NO CONFLICT
    // =================

    $.fn.chartControl.noConflict = function () {
        $.fn.chartControl = old
        return this
    }

    // FIELD CHART CONTROL DATA-API
    // ===============

    // Initialize charts on render event (AJAX updates)
    $(document).render(function () {
        $('[data-control="chart"]').each(function() {
            var $this = $(this);
            // Only initialize if not already initialized
            if (!$this.data('ti.chartControl')) {
                $this.chartControl();
            }
        });
    });
    
    // Initialize charts on document ready (initial page load)
    $(document).ready(function() {
        function initChartsOnReady() {
            // Check if Chart.js is loaded
            if (typeof Chart === 'undefined') {
                setTimeout(initChartsOnReady, 100);
                return;
            }
            
            // Initialize charts immediately - widgets may already be loaded
            function tryInitCharts() {
                $('[data-control="chart"]').each(function() {
                    var $this = $(this);
                    // Only initialize if not already initialized
                    if (!$this.data('ti.chartControl')) {
                        try {
                            $this.chartControl();
                            console.log('✅ Charts: Initialized on document ready', $this.attr('data-alias'));
                        } catch (e) {
                            console.error('❌ Charts: Failed to initialize', $this.attr('data-alias'), e);
                        }
                    }
                });
            }
            
            // Try immediately, then retry after widgets load
            tryInitCharts();
            setTimeout(tryInitCharts, 200); // Quick retry for AJAX-loaded widgets
        }
        initChartsOnReady();
        
        // Also try after widgets are loaded (listen for widget container updates)
        $(document).on('ajaxUpdateComplete', function() {
            setTimeout(function() {
                if (typeof Chart === 'undefined') return;
                
                $('[data-control="chart"]').each(function() {
                    var $this = $(this);
                    if (!$this.data('ti.chartControl')) {
                        try {
                            $this.chartControl();
                            console.log('✅ Charts: Initialized on ajaxUpdateComplete', $this.attr('data-alias'));
                        } catch (e) {
                            console.error('❌ Charts: Failed to initialize on ajaxUpdateComplete', $this.attr('data-alias'), e);
                        }
                    }
                });
            }, 200);
        });
    });
}(window.jQuery)
