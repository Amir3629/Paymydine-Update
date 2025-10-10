<div class="row mb-4">
    @if ($bookingLocation->hasMedia())
        <div class="col-sm-2">
            <img class="img-responsive" src="{{ $bookingLocation->getThumb() }}">
        </div>
    @endif
    <div class="col-sm-3">
        <h5 class="text-muted text-center">@lang('igniter.reservation::default.label_guest_num')</h5>
        <h6 class="font-weight-normal text-center">{{ $__SELF__->getGuestSizeOptions($guestSize) }}</h6>
    </div>
    <div class="col-sm-2">
        <h5 class="text-muted text-center">@lang('igniter.reservation::default.label_date')</h5>
        <h6 class="font-weight-normal text-center">{{ $selectedDate->isoFormat($bookingDateFormat) }}</h6>
    </div>
    <div class="col-sm-2">
        <h5 class="text-muted text-center">@lang('igniter.reservation::default.label_time')</h5>
        <h6 class="font-weight-normal text-center">{{ $selectedDate->isoFormat($bookingTimeFormat) }}</h6>
    </div>
    <div class="col-sm-3">
        <h5 class="text-muted text-center">@lang('igniter.reservation::default.label_location')</h5>
        <h6 class="font-weight-normal text-center">{{ $bookingLocation->getName() }}</h6>
    </div>
</div>