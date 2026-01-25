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
            options.linkedCalendars = false;

            options.ranges = {
                'Today': [moment().startOf('day'), moment().endOf('day')],
                'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
                'Last 7 Days': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
                'This Month': [moment().startOf('month').startOf('day'), moment().endOf('month').endOf('day')],
                'Last Month': [moment().subtract(1, 'month').startOf('month').startOf('day'), moment().subtract(1, 'month').endOf('month').endOf('day')],
            }

            if (this.$el.find('[data-datepicker-range-start]').val() == '')
                options.startDate = '';

            if (this.$el.find('[data-datepicker-range-end]').val() == '')
                options.endDate = '';
        }

        $el.daterangepicker(options, $.proxy(this.onDateSelected, this))
        $el.on('showCalendar.daterangepicker', $.proxy(this.onShowCalendar, this));
        $el.on('hide.daterangepicker', $.proxy(this.onHideCalendar, this));
        $el.on('apply.daterangepicker', $.proxy(this.onApplyCalendar, this));

        var daterangepicker = $el.data('daterangepicker');

        $el.on('show.daterangepicker', $.proxy(function(event, picker) {
            var instance = picker || daterangepicker;
            this.ensureCalendarsVisible(instance);
            var self = this;
            setTimeout(function () {
                self.ensureCalendarsVisible(instance);
            }, 0);
        }, this));

        if (daterangepicker && daterangepicker.container) {
            daterangepicker.container.on('click', '.ranges li', $.proxy(function() {
                var self = this;
                this.ensureCalendarsVisible(daterangepicker);
                setTimeout(function () {
                    self.ensureCalendarsVisible(daterangepicker);
                }, 0);
            }, this));
        }

        this.updateSelectedLabel(daterangepicker);
    }

    DatePickerControl.prototype.onDateSelected = function (start, end, label, initialize) {
        var format = this.options.timePicker ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'

        if (!this.options.singleDatePicker) {
            this.$el.find('[data-datepicker-range-start]').val(start.isValid() ? start.format(format) : '');
            this.$el.find('[data-datepicker-range-end]').val(end.isValid() ? end.format(format) : '');
        } else {
            this.$el.find('[data-datepicker-input]').val(start.format(format));
        }

        this.updateSelectedLabel();

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

        var pickerInstance = daterangepicker;
        $('.daterangepicker').not(pickerInstance && pickerInstance.container ? pickerInstance.container : []).remove();
        this.ensureCalendarsVisible(pickerInstance);
    }

    DatePickerControl.prototype.onHideCalendar = function (event, daterangepicker) {
        daterangepicker = daterangepicker || this.$el.data('daterangepicker');
        if (!daterangepicker || !daterangepicker.container) return;

        var containerNode = daterangepicker.container.get(0);
        if (containerNode && containerNode.__tiLayoutObserver) {
            containerNode.__tiLayoutObserver.disconnect();
            containerNode.__tiLayoutObserver = null;
        }

        daterangepicker.container.removeClass('show-calendar ti-visible open-active tm-active-instance');
        daterangepicker.container.css('display', 'none');
        daterangepicker.container.removeClass('tm-active-instance');
        daterangepicker.container.find('.drp-calendar.left').css('display', '');
        daterangepicker.container.find('.drp-calendar.right').css('display', '');
    }

    DatePickerControl.prototype.onApplyCalendar = function (event, daterangepicker) {
        daterangepicker = daterangepicker || this.$el.data('daterangepicker');
        if (!daterangepicker || !daterangepicker.container) return;

        var containerNode = daterangepicker.container.get(0);
        if (containerNode && containerNode.__tiLayoutObserver) {
            containerNode.__tiLayoutObserver.disconnect();
            containerNode.__tiLayoutObserver = null;
        }

        daterangepicker.container.removeClass('show-calendar ti-visible open-active tm-active-instance');
        daterangepicker.container.removeClass('show-ranges');
        daterangepicker.container.css('display', 'none');
        daterangepicker.container.removeClass('tm-active-instance');
        daterangepicker.container.find('.drp-calendar.left').css('display', '');
        daterangepicker.container.find('.drp-calendar.right').css('display', '');
    }

    DatePickerControl.prototype.ensureCalendarsVisible = function (picker) {
        var self = this;
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        $('.daterangepicker').not(picker.container).remove();

        picker.container.addClass('show-calendar ti-visible open-active tm-active-instance');
        picker.container.css('display', 'grid');
        var $header = picker.container.find('.drp-buttons');
        if ($header.length) {
            $header.css('display', 'grid');
            $header.css('grid-template-columns', '1fr auto auto');
        }

        var $left = picker.container.find('.drp-calendar.left');
        var $right = picker.container.find('.drp-calendar.right');

        var focusDate = null;
        if (picker.endDate && picker.endDate.isValid()) {
            focusDate = picker.endDate.clone();
        } else if (picker.startDate && picker.startDate.isValid()) {
            focusDate = picker.startDate.clone();
        } else {
            focusDate = moment();
        }

        if (focusDate && picker.leftCalendar && picker.rightCalendar) {
            var baseMonth = focusDate.clone().startOf('month');
            picker.leftCalendar.month = baseMonth.clone();
            picker.rightCalendar.month = baseMonth.clone().add(1, 'month');
            picker.updateCalendars();
        }

        this.forceSingleCalendarLayout(picker, $left, $right);

        this.ensureNavigationArrows(picker);
        this.updateSelectedLabel(picker, true);
        this.ensureVisibleClass(picker);

        var containerNode = picker.container.get(0);
        if (containerNode && !containerNode.__tiLayoutObserver) {
            var observer = new MutationObserver(function () {
                if (!picker.container.is(':visible')) {
                    observer.disconnect();
                    containerNode.__tiLayoutObserver = null;
                    return;
                }

                if (!picker.container.hasClass('show-calendar')) {
                    picker.container.addClass('show-calendar');
                }
                picker.container.addClass('ti-visible open-active tm-active-instance');
                picker.container.css('display', 'grid');
                self.forceSingleCalendarLayout(picker);
                var $header = picker.container.find('.drp-buttons');
                if ($header.length) {
                    $header.css('display', 'grid');
                    $header.css('grid-template-columns', '1fr auto auto');
                }
            });
            observer.observe(containerNode, { attributes: true, attributeFilter: ['class', 'style'] });
            containerNode.__tiLayoutObserver = observer;
        }
    }

    DatePickerControl.prototype.forceSingleCalendarLayout = function (picker, $left, $right) {
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        $left = $left || picker.container.find('.drp-calendar.left');
        $right = $right || picker.container.find('.drp-calendar.right');

        picker.container.removeClass('single tm-single-calendar');
        picker.container.addClass('show-ranges tm-single-calendar');

        if ($left.length) {
            $left
                .attr('aria-hidden', 'true')
                .addClass('tm-hidden-calendar')
                .css({
                    display: 'none',
                    visibility: 'hidden',
                    height: 0,
                    overflow: 'hidden',
                    padding: 0,
                    margin: 0
                });
            $left.find('.calendar-time').css({
                display: 'none',
                visibility: 'hidden'
            });
        }

        if ($right.length) {
            $right
                .attr('aria-hidden', 'false')
                .css({
                    display: 'block',
                    visibility: '',
                    height: '',
                    overflow: ''
                });
        }
    }

    DatePickerControl.prototype.ensureNavigationArrows = function (picker) {
        var self = this;
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

        prev.children('span').text('');
        next.children('span').text('');

        prev.off('.customNav').removeData('custom-nav-bound');
        prev.on('click.customNav', function (event) {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                var mockEvent = {
                    target: this,
                    currentTarget: this,
                    preventDefault: function () {}
                };
                if (typeof picker.clickPrev === 'function') {
                    picker.clickPrev(mockEvent);
                } else {
                    picker.container.find('.calendar-table thead tr:first-child th.prev').not(prev).first().trigger('click');
                }
            });
        prev.data('custom-nav-bound', true);

        next.off('.customNav').removeData('custom-nav-bound');
        next.on('click.customNav', function (event) {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                var mockEvent = {
                    target: this,
                    currentTarget: this,
                    preventDefault: function () {}
                };
                if (typeof picker.clickNext === 'function') {
                    picker.clickNext(mockEvent);
                } else {
                    picker.container.find('.calendar-table thead tr:first-child th.next').not(next).first().trigger('click');
                }
            });
        next.data('custom-nav-bound', true);

        var headerNode = headerRow.get(0);
        var observerTarget = headerNode ? headerNode.parentNode || headerNode : null;
        if (observerTarget && !observerTarget.__customNavObserver) {
            var observer = new MutationObserver(function () {
                observer.disconnect();
                observerTarget.__customNavObserver = null;
                self.ensureNavigationArrows(picker);
                self.updateSelectedLabel(picker, true);
                self.ensureVisibleClass(picker);
            });
            observer.observe(observerTarget, { childList: true, subtree: true });
            observerTarget.__customNavObserver = observer;
        }
    }

    DatePickerControl.prototype.updateSelectedLabel = function (picker, forceVisibility) {
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        var $label = picker.container.find('.drp-selected');
        if (!$label.length) return;

        var format = 'MM/DD/YY';
        var startText = picker.startDate && picker.startDate.isValid() ? picker.startDate.format(format) : '';
        var endText = picker.endDate && picker.endDate.isValid() ? picker.endDate.format(format) : '';

        if (startText && endText) {
            $label.text(startText + ' - ' + endText);
        } else if (startText) {
            $label.text(startText);
        } else {
            $label.text('');
        }

        if (forceVisibility) {
            this.ensureVisibleClass(picker);
        }
    }

    DatePickerControl.prototype.ensureVisibleClass = function (picker) {
        picker = picker || this.$el.data('daterangepicker');
        if (!picker || !picker.container) return;

        var $container = picker.container;
        if (typeof picker.showCalendars === 'function' && picker.container && !picker.container.hasClass('show-calendar')) {
            picker.showCalendars();
        }
        $container.addClass('ti-visible open-active tm-active-instance');
        $container.css('display', 'grid');
        var $header = $container.find('.drp-buttons');
        if ($header.length) {
            $header.css('display', 'grid');
            $header.css('grid-template-columns', '1fr auto auto');
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
        $('.daterangepicker').not('.tm-active-instance').remove();
    })
}(window.jQuery)
