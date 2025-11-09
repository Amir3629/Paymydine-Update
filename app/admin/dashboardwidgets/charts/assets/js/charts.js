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
        this.chartJs = new Chart(this.$el.find('canvas'), this.options)
        this.chartJs.update()
        
        // Initialize time range slider
        this.initTimeRangeSlider()

        // Apply default 30-day filter once datasets are ready
        var self = this
        $(document).ready(function () {
            // Delay slightly to ensure Chart.js has populated internal datasets
            setTimeout(function () {
                self.filterChartData(30)
                var label = $('#' + self.options.alias + '-range-label')
                if (label.length) {
                    label.text('30 days')
                }
            }, 50)
        })
    }
    
    ChartControl.prototype.initTimeRangeSlider = function () {
        var self = this
        var slider = $('#' + this.options.alias + '-time-range')
        var label = $('#' + this.options.alias + '-range-label')
        
        if (!slider.length) return
        
        slider.addClass('dashboard-range-input')
        
        // Non-linear mapping: slower from 7-30, faster from 30-90
        // Slider goes 0-100, but maps to days non-linearly
        slider.attr('min', 0)
        slider.attr('max', 100)
        slider.attr('value', 50) // Middle = 30 days
        
        function sliderToDays(sliderValue) {
            if (sliderValue <= 50) {
                // Left half: 0-50 maps to 7-30 days (23 days range)
                return Math.round(7 + (sliderValue / 50) * 23)
            } else {
                // Right half: 50-100 maps to 30-90 days (60 days range)
                return Math.round(30 + ((sliderValue - 50) / 50) * 60)
            }
        }
        
        // Continuous slider with non-linear scale
        slider.on('input change', function() {
            var sliderValue = parseInt($(this).val())
            var days = sliderToDays(sliderValue)
            label.text(days + ' days')
            
            // Filter the chart data based on the selected range
            self.filterChartData(days)
        })
        
        // Set initial label
        label.text('30 days')
    }
    
    ChartControl.prototype.filterChartData = function (days) {
        if (!this.chartJs || !this.chartJs.data.datasets) return
        
        var self = this
        var today = new Date()
        var startDate = new Date()
        startDate.setDate(today.getDate() - days)
        
        // Store original data if not already stored
        if (!this.originalData) {
            this.originalData = JSON.parse(JSON.stringify(this.chartJs.data.datasets))
        }
        
        // Filter each dataset
        this.chartJs.data.datasets.forEach(function(dataset, index) {
            var originalDataset = self.originalData[index]
            dataset.data = originalDataset.data.filter(function(point) {
                var pointDate = new Date(point.x)
                return pointDate >= startDate && pointDate <= today
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

    $(document).render(function () {
        $('[data-control="chart"]').chartControl()
    })
}(window.jQuery)
