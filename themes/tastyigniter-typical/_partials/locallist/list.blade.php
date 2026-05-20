<div class="row row-cols-1 row-cols-md-3">
    @foreach ($locationsList as $locationObject)
    <div class="restaurant-frames">
        <a class="card collection-item hover-effect"
            href="{{ page_url('local/menus', ['location' => $locationObject->permalink]) }}">
            
            <div class="card-image-local"
                style="{{$locationObject->openingSchedule->isOpen() ? '' : 'filter: grayscale(100%);'}} background-image: url('{{ site_url('/themes/typical/assets/images/backg-pattern.svg') }}')
                ">
            
                <div class="card-image-inner" style="background-image: url('{{ $locationObject->thumb }}');">
                </div>
                <div class="card-overlay">
                    <h3 class="card-title-local">{{ $locationObject->name }}</h3>
                </div>
            </div>
            <div class="card-content d-sm-flex no-gutters">
                <div class="d-sm-flex">
                    <dl class="no-spacing">
                        @if ($showReviews)
                        <dd>
                            <div class="rating rating-sm text-muted align-items-start ">
                                @php
                                $reviewScore = $locationObject->reviewsScore
                                @endphp
                                @if ($reviewScore > 0)
                                <span class="text-start small"><i class="fs-5 bi bi-hand-thumbs-up"></i>&nbsp;{{round(($reviewScore * (100/5)), 0) }}%&nbsp;&nbsp;({{ $locationObject->reviewsCount }})</span>
                                @else
                                <span class="text-start small badge bg-info p-2"><i class="bi bi-megaphone-fill"></i>&nbsp;&nbsp;Nuevo!</span>
                                @endif
                            </div>
                        </dd>
                        @endif
                        <dd class="d-none">
                            <span class="text-muted text-truncate">{!! format_address($locationObject->address)
                                !!}</span>
                        </dd>
                        @if ($locationObject->distance)
                        <dd>
                            <span class="text-muted small"><i
                                    class="bi bi-geo-alt"></i>&nbsp;&nbsp;{{ number_format($locationObject->distance, 1) }}
                                {{ $distanceUnit }}</span>
                        </dd>
                        @endif
                    </dl>
                </div>
                <div class="col">
                    <dl class="text-end no-spacing local-m">
                        @if ($locationObject->openingSchedule->isOpen())
                        <dt>@lang('igniter.local::default.text_is_opened')</dt>
                        @elseif ($locationObject->openingSchedule->isOpening())
                        <dt class="text-muted">{!! sprintf(lang('igniter.local::default.text_opening_time'),
                            $locationObject->openingTime->isoFormat($openingTimeFormat)) !!}</dt>
                        @else
                        <dt class="text-muted">@lang('igniter.local::default.text_closed')</dt>
                        @endif
                        @foreach($locationObject->orderTypes as $code => $orderType)
                        <dd class="small text text-muted">
                            @if ($orderType->isDisabled())
                            {!! $orderType->getDisabledDescription() !!}
                            @elseif ($orderType->getSchedule()->isOpen())
                            {!! $orderType->getOpenDescription()!!}                                    
                            @elseif ($orderType->getSchedule()->isOpening())
                            {!! $orderType->getOpeningDescription($openingTimeFormat) !!}
                            @else
                            {!! $orderType->getClosedDescription() !!}
                            @endif
                        </dd>
                        @endforeach
                    </dl>
                </div>
            </div>
        </a>
    </div>
    @endforeach
</div>