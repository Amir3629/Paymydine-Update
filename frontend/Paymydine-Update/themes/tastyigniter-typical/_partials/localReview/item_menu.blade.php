<div class="item-review">
    <b>{{ $review->customer->full_name }}</b>    
<div class="rating-row row">
    <div class="col-4 d-flex align-items-center align-content-center">            
        <div
            class="item-review-stars"
            data-control="star-rating"
            data-score="{{ round(($review->quality + $review->delivery + $review->service) / 3), 0}}"
            data-hints='@json($reviewRatingHints)'
            data-score-name="Quality"
            data-read-only="true"
        ></div>
    </div>
    <div class="col-8 m-36 text-review-up">
        &nbsp;•&nbsp;{{ $review->created_at->isoFormat('M/D/YY') }}
        &nbsp;•&nbsp;{{ $review->customer->address ? $review->customer->address->city : '' }}
    </div>      
</div>
<div>
    <p class="review-text">{{ ($review->review_text) }}</p>
</div>


</div>
