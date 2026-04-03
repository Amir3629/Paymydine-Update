{!! form_open($__SELF__->getFormAction(), [
'id' => 'picker-form',
'role' => 'form',
'method' => 'GET',
]) !!}
<input type="hidden" name="picker_step" value="2">
<input type="hidden" name="location" value="{{ optional($__SELF__->location)->getKey() }}">

<div class="row justify-content-center d-flex progress-indicator-container">
    @if ($useCalendarView)
    <div class="col-md-12 my-4">
        <div data-control="datepicker" data-start-date="{{ $__SELF__->getStartDate()->format('Y-m-d') }}"
            data-end-date="{{ $__SELF__->getEndDate()->format('Y-m-d') }}"
            data-days-of-week-disabled='@json($disabledDaysOfWeek ?? [])'
            data-dates-disabled='@json($disabledDates ?? [])' data-format="yyyy-mm-dd"
            data-language={{ setting('default_language') }} style=></div>
        <input type="hidden" name="date" value="{{ $__SELF__->getSelectedDate()->format('Y-m-d') }}" />
    </div>
    <div class="row" id="ti-datepicker-options">
        <div class="col-sm-6">
            <div class="form-floating mb-3">
                @partial('@input_guest')
                <label for="noOfGuests">@lang('igniter.reservation::default.label_guest_num')</label>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="form-floating mb-3">
                @partial('@input_time')
                <label for="time">@lang('igniter.reservation::default.label_time')</label>
            </div>
        </div>
        @if (count($timeOptions))
        <div class="col-12 justify-content-center d-flex">
            <div class="mb-3 ">
                <button type="submit"
                    class="btn btn-primary text-uppercase col-12">@lang('igniter.reservation::default.button_find_table')</button>
            </div>
        </div>
        @endif
    </div>
    @else
    <div class="col-sm-6 mb-3">
        <label class="sr-only" for="noOfGuests">@lang('igniter.reservation::default.label_guest_num')</label>
        @partial('@input_guest')
    </div>
    <div class="col-sm-6 mb-3">
        <label class="sr-only" for="date">@lang('igniter.reservation::default.label_date')</label>
        @partial('@input_date')
    </div>
    <div class="col-sm-12 mb-3">
        <label class="sr-only" for="time">@lang('igniter.reservation::default.label_time')</label>
        @partial('@input_time')
    </div>
    <div class="row justify-content-md-center d-flex">
        <div class="col-sm-6 mb-3">
            <button type="submit"
                class="btn btn-primary text-uppercase col-12"><?= lang('igniter.reservation::default.button_find_table'); ?></button>
        </div>
    </div>
    @endif
</div>
<div class="row">
    <div class="col m-2">
        {!! form_error('guest', '<span class="help-block text-danger">', '</span>') !!}
        {!! form_error('date', '<span class="help-block text-danger">', '</span>') !!}
        {!! form_error('time', '<span class="help-block text-danger">', '</span>') !!}
    </div>
</div>

{!! form_close() !!}