@if ($showLocalThumb)
    <img
        class="img-fluid pull-left"
        src="{{ $locationCurrent->getThumb(['width' => $localThumbWidth, 'height' => $localThumbHeight]) }}"
    />
@endif
<dl class="no-spacing">
    <dd><h1 class="h1">{{ $locationCurrent->getName() }}</h1></dd>
    <dd>
        <div class="rating rating-sm">
        @if ($showReviews)           
                @php $reviewScore = $locationCurrent->reviews_score() @endphp 
                @if ($reviewScore > 0)
                <span class="text-start small"><i class="fs-5 bi bi-hand-thumbs-up"></i>&nbsp;{{round(($reviewScore * (100/5)), 0) }}%&nbsp;&nbsp;({{ $locationCurrent->reviews_count ?? 0 }})</span>
                @else
                <span class="text-start small badge bg-danger p-2"><i class="poco-icon-store"></i>&nbsp;&nbsp;Nuevo!</span>
                @endif       
        @endif 
        <span display="block">•</span>
        @php
            $openingTime = make_carbon($locationCurrentSchedule->getOpenTime());
        @endphp
            <span class="small bi bi-clock"></span>
            @if ($locationCurrentSchedule->isOpen())
                <span>@lang('igniter.local::default.text_is_opened')</span>
            @elseif ($locationCurrentSchedule->isOpening())
                <span>{!! sprintf(lang('igniter.local::default.text_opening_time'), $openingTime->isoFormat($openingTimeFormat)) !!}</span>
            @else
                <span>@lang('igniter.local::default.text_closed')</span>
            @endif
            <span display="block">•</span>
        @if ($openingTime->isToday() && $locationCurrentSchedule->getPeriod($openingTime)->opensAllDay())
            <span>@lang('igniter.local::default.text_24_7_hour')</span>
        @elseif ($openingHours = $__SELF__->getOpeningHours($localBoxTimeFormat))
            {!! implode(', ', $openingHours) !!}
        @endif
        </div>
    </dd>
    <dd>
        <span>{!! format_address($locationCurrent->getAddress(), FALSE) !!}</span>
    </dd>
</dl>
