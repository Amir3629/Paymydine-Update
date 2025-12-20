<h1 class="panel-title h4">
    {{ sprintf(lang('igniter.local::default.review.text_review_heading'), $locationCurrent->location_name) }}
</h1>
<div class="box-two">
    <dl class="no-spacing">
        <dd>
            <div class="rating rating-sm">
            @if ($showReviews)           
                    @php $reviewScore = $locationCurrent->reviews_score() @endphp 
                    @if ($reviewScore > 0)
                    <b><span class="text-start small"><i class="fs-5 bi bi-hand-thumbs-up"></i>&nbsp;{{round(($reviewScore * (100/5)), 0) }}%&nbsp;&nbsp;{{ $locationCurrent->reviews_count ?? 0 }}&nbsp;@lang('admin::lang.side_menu.rating')</span></b>
                    @else
                    <span class="text-start small badge bg-danger p-2"><i class="poco-icon-store"></i>&nbsp;&nbsp;Nuevo!</span>
                    @endif       
            @endif         
            </div>
        </dd>    
    </dl>
    <div class="gbuttons">
        
        <div class="btn-info-full">
            <a type="button" class="p-0 btn-more-info text-truncate" href="{{ restaurant_url('local/reviews') }}">
                <div class="p-0-12">
                    
                    <span class="text-capitalize fw-bold">@lang('main::lang.account.reviews.title')</span>&nbsp;
                    <i class="poco-icon-angle-right"></i>
                </div>                                
            </a>
        </div>
        
        <div class="btn-icon-info">
            <a type="button" class="btn-more-info-round  text-truncate" href="{{ restaurant_url('local/reviews') }}">
                <div class="p-0-12">
                    <i class="poco-icon-angle-right"></i>
                </div>                                
            </a>
        </div>                  
    
</div>                                
</div>
@if (count($reviewList))
    <ul>
        @foreach ($reviewList as $review)
            <li>
                <a href="{{ restaurant_url('local/reviews') }}">@partial('@item_menu', ['review' => $review])</a>
            </li>
        @endforeach
    </ul>
@else
    <div class="panel-body">
        <p>@lang('igniter.local::default.review.text_no_review')</p>
    </div>
@endif