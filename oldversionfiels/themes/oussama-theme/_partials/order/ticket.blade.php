@if (!$order)
    <div class="panel mb-1">
        <div class="panel-body text-center" id="ti-order-status">
            No order found
        </div>
    </div>
@else
    <div class="panel mb-1">
        <div class="panel-body text-center" id="ti-order-status">
            @partial('orderPage::status')
        </div>
    </div>

    @if ($session && !$session->customer())
        <div class="panel mb-1">
            <div class="panel-body text-center">
                <a
                    href="{{ $session->loginUrl() }}"
                >@lang('igniter.cart::default.orders.text_login_to_view_more')</a>
            </div>
        </div>
    @else
        @if ($showReviews && !empty($reviewable))
            <div class="panel mb-1">
                <div class="panel-body">
                    @partial('localReview::form')
                </div>
            </div>
        @endif

        <div class="row g-0">
            <div class="col-sm-7 pe-sm-1">
                <div class="panel mb-1">
                    <div class="card-body">
                        @partial('orderPage::restaurant', ['location' => $order->location])
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-body p-2">
                        @partial('orderPage::items')
                    </div>
                </div>
            </div>

            <div class="col-sm-5">
                @partial('orderPage::details')
            </div>
        </div>
    @endif
@endif