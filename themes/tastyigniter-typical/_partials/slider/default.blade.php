<div
    id="{{ $sliderSelectorId }}"
    class="carousel slide carousel-fade"
    data-bs-ride="carousel"
>
    @if ($showSliderIndicators)
        <div class="carousel-indicators">
            @foreach ($__SELF__->slides() as $slide)
                <button
                    type="button"
                    class="{{ $loop->first ? 'active' : '' }}"
                    data-bs-target="#{{ $sliderSelectorId }}"
                    data-bs-slide-to="{{ $loop->index }}"
                ></button>
            @endforeach
        </div>
    @endif

    <div class="carousel-inner">
        @foreach ($__SELF__->slides() as $slide)
            <div
                class="carousel-item {{ $loop->first ? 'active' : '' }}"
                style="max-height:{{ $sliderHeight }};"
            >
                <img
                    src="{{ $slide->getThumb() }}"
                    class="d-block w-100"
                    alt="{{ $slide->getCustomProperty('title') }}"
                />

                @if ($showSliderCaptions && strlen($slide->getCustomProperty('description')))
                    <div class="carousel-caption-typical  div-slider">
                        <h2 class="title_slide">{{ $slide->getCustomProperty('title') }}</h2>
                        <h2 class="text-sup text-uppercase">{{ $slide->getCustomProperty('description') }}</h2>
                        <a href="{{ restaurant_url('local/menus') }}" type="button" class="text-uppercase btn btn-primary btn-lg d-none d-md-inline-block">Order Now!</a>
                    </div>
                @endif
            </div>
        @endforeach
    </div>
    @if ($showSliderControls && count($__SELF__->slides()) > 1)
        <button
            type="button"
            class="carousel-control-prev"
            data-bs-target="#{{ $sliderSelectorId }}"
            data-bs-slide="prev"
        ><span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">Previous</span></button>
        <button
            type="button"
            class="carousel-control-next"
            data-bs-target="#{{ $sliderSelectorId }}"
            data-bs-slide="next"
        ><span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Next</span></button>
    @endif
</div>