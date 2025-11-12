/*
 * Datepicker plugin
 *
 * Data attributes:
 * - data-control="datepicker" - enables the plugin on an element
 */
+function ($) {
    "use strict"

    // FIELD CHART CONTROL CLASS DEFINITION
    // ============================

    var DatePickerControl = function (element, options) {
        this.options = options
        this.$el = $(element)

        // Init
        this.initPicker();
    }

    DatePickerControl.DEFAULTS = {
        opens: 'right',
        autoUpdateInput: false,
        singleDatePicker: true,
        showDropdowns: true,
        autoApply: true,
        timePicker: false,
        locale: {
            format: 'MMM D, YYYY',
        }
    }

    DatePickerControl.prototype.initPicker = function () {
        var options = this.options,
            $el = this.$el.find('[data-datepicker-trigger]')

        if (!options.singleDatePicker) {
            options.autoApply = false;
            options.alwaysShowCalendars = true;

            options.ranges = {
                'Today': [moment().startOf('day'), moment().endOf('day')],
                'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
                'Last 7 Days': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
                'Last 30 Days': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
                'This Month': [moment().startOf('month').startOf('day'), moment().endOf('month').endOf('day')],
                'Last Month': [moment().subtract(1, 'month').startOf('month').startOf('day'), moment().subtract(1, 'month').endOf('month').endOf('day')],
                'Lifetime': ['', ''],
            }

            if (this.$el.find('[data-datepicker-range-start]').val() == '')
                options.startDate = '';

            if (this.$el.find('[data-datepicker-range-end]').val() == '')
                options.endDate = '';
        }

        $el.daterangepicker(options, $.proxy(this.onDateSelected, this))
        $el.on('showCalendar.daterangepicker', $.proxy(this.onShowCalendar, this));

        var daterangepicker = $el.data('daterangepicker');

        $el.on('show.daterangepicker', $.proxy(function(event, picker) {
            this.ensureCalendarsVisible(picker || daterangepicker);
        }, this));

        if (daterangepicker && daterangepicker.container) {
            daterangepicker.container.on('click', '.ranges li', $.proxy(function() {
                this.ensureCalendarsVisible(daterangepicker);
            }, this));
        }
    }

    DatePickerControl.prototype.onDateSelected = function (start, end, label, initialize) {
        var format = this.options.timePicker ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'

        if (!this.options.singleDatePicker) {
            this.$el.find('[data-datepicker-range-start]').val(start.isValid() ? start.format(format) : '');
            this.$el.find('[data-datepicker-range-end]').val(end.isValid() ? end.format(format) : '');
        } else {
            this.$el.find('[data-datepicker-input]').val(start.format(format));
        }

        if (!initialize) this.$el.closest('form').submit();
    }

    DatePickerControl.prototype.onShowCalendar = function (event, daterangepicker) {
        var valueChanged = false;

        if (! daterangepicker.startDate.isValid()) {
            daterangepicker.setStartDate(moment().startOf('day'));
            valueChanged = true;
        }

        if (! daterangepicker.endDate.isValid()) {
            daterangepicker.setEndDate(moment().endOf('day'));
            valueChanged = true;
        }

        if (valueChanged) {
            daterangepicker.updateCalendars();
        }

        this.ensureCalendarsVisible(daterangepicker);
    }

    DatePickerControl.prototype.ensureCalendarsVisible = function (picker) {
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        picker.container.addClass('show-calendar');
        picker.container.find('.drp-calendar').css('display', 'block');
        picker.container.find('.drp-calendar.left').css('display', 'none');
        this.ensureNavigationArrows(picker);
    }

    DatePickerControl.prototype.ensureNavigationArrows = function (picker) {
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        var headerRow = picker.container.find('.drp-calendar.right .calendar-table thead tr:first-child');
        if (!headerRow.length) return;

        var headerCells = headerRow.children('th');

        var prev = headerRow.find('.prev').first();
        var prev = headerRow.find('.prev');
        if (!prev.length && headerCells.length) {
            prev = $(headerCells.get(0));
        }
        if (!prev.length) {
            prev = $('<th></th>');
            headerRow.prepend(prev);
        }
        prev.attr('class', 'prev available').attr('role', 'button');

        var next = headerRow.find('.next');
        if (!next.length && headerCells.length > 1) {
            next = $(headerCells.get(headerCells.length - 1));
        }
        if (!next.length) {
            next = $('<th></th>');
            headerRow.append(next);
        }
        next.attr('class', 'next available').attr('role', 'button');

        if (!prev.children('span').length) {
            prev.empty().append('<span></span>');
        }

        if (!next.children('span').length) {
            next.empty().append('<span></span>');
        }

        prev.children('span').text('‹');
        next.children('span').text('›');

        if (!prev.data('custom-nav-bound')) {
            prev.data('custom-nav-bound', true);
            prev.on('click', function (event) {
                event.preventDefault();
                if (typeof picker.clickPrev === 'function') {
                    picker.clickPrev();
                } else {
                    picker.container.find('.calendar-table thead tr:first-child th.prev').not(prev).first().trigger('click');
                }
            });
        }

        if (!next.data('custom-nav-bound')) {
            next.data('custom-nav-bound', true);
            next.on('click', function (event) {
                event.preventDefault();
                if (typeof picker.clickNext === 'function') {
                    picker.clickNext();
                } else {
                    picker.container.find('.calendar-table thead tr:first-child th.next').not(next).first().trigger('click');
                }
            });
        }
    }

    DatePickerControl.prototype.unbind = function () {
        this.$el.datePickerControl('destroy')
        this.$el.removeData('ti.datePickerControl')
    }

    // FIELD DATEPICKER CONTROL PLUGIN DEFINITION
    // ============================

    var old = $.fn.datePickerControl

    $.fn.datePickerControl = function (option) {
        var args = Array.prototype.slice.call(arguments, 1), result
        this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.datePickerControl')
            var options = $.extend({}, DatePickerControl.DEFAULTS, $this.data(), typeof option === 'object' && option)
            if (!data) $this.data('ti.datePickerControl', (data = new DatePickerControl(this, options)))
            if (typeof option === 'string') result = data[option].apply(data, args)
            if (typeof result !== 'undefined') return false
        })

        return result ? result : this
    }

    $.fn.datePickerControl.Constructor = DatePickerControl

    // FIELD DATEPICKER CONTROL NO CONFLICT
    // =================

    $.fn.datePickerControl.noConflict = function () {
        $.fn.datePickerControl = old
        return this
    }

    // FIELD DATEPICKER CONTROL DATA-API
    // ===============

    $(document).render(function () {
        $('[data-control="datepicker"]').datePickerControl()
    })
}(window.jQuery)
