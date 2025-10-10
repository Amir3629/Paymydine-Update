<figure>
    <blockquote class="blockquote">
        <p class="review-text">{{ $review->review_text }}</p>
        <div class="rating-row row">
            <div class="col-12 col-md-4">
                <span class="text-muted"><b>@lang('igniter.local::default.review.label_quality'):</b></span>
                <div
                    data-control="star-rating"
                    data-score="{{ $review->quality }}"
                    data-hints='@json($reviewRatingHints)'
                    data-score-name="Quality"
                    data-read-only="true"
                ></div>
            </div>
            <div class="col-12 col-md-4">
                <span class="text-muted"><b>@lang('admin::lang.dashboard.text_delivery'):</b></span>
                <div
                    data-control="star-rating"
                    data-score="{{ $review->delivery }}"
                    data-hints='@json($reviewRatingHints)'
                    data-score-name="Delivery"
                    data-read-only="true"
                ></div>
            </div>
            <div class="col-12 col-md-4">
                <span class="text-muted"><b>@lang('igniter.local::default.review.label_service'):</b></span>
                <div
                    data-control="star-rating"
                    data-score="{{ $review->service }}"
                    data-hints='@json($reviewRatingHints)'
                    data-score-name="Service"
                    data-read-only="true"
                ></div>
            </div>
        </div>
        <figcaption class="blockquote-footer">
        {{ $review->customer->full_name }} @lang('igniter.local::default.text_from')
        <cite title="@lang('igniter.local::default.text_source')">
            {{ $review->customer->address ? $review->customer->address->city : '' }}
        </cite>
        @lang('igniter.local::default.text_on')
        {{ $review->created_at->isoFormat($reviewDateFormat) }}
    </figcaption>
    </blockquote>
    
</figure>
