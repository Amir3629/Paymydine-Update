{!! form_open([
    'id' => 'checkout-form',
    'role' => 'form',
    'method' => 'POST',
    'data-handler' => $confirmCheckoutEventHandler,
]) !!}

@partial('@customer_fields')

@if ($order->isDeliveryType())
    @partial('@address_fields')
@endif

<div data-partial="checkoutPayments">
    @partial('@payments')
</div>

@if ($showCommentField)
<div class="form-floating">    
    <textarea
        name="comment"
        id="comment"
        style="height: 100px"
        placeholder="@lang('igniter.cart::default.checkout.label_comment')"
        class="form-control"
    >{!! set_value('comment', $order->comment) !!}</textarea>
    <label for="comment">@lang('igniter.cart::default.checkout.label_comment')</label>
</div>
@endif

@if ($showDeliveryCommentField)
<div class="form-floating">    
    <textarea
        name="delivery_comment"
        id="delivery_comment"
        style="height: 100px"
        placeholder="@lang('igniter.cart::default.checkout.label_delivery_comment')"
        class="form-control"
    >{!! set_value('delivery_comment', $order->delivery_comment) !!}</textarea>
    <label for="delivery_comment">@lang('igniter.cart::default.checkout.label_delivery_comment')</label>
</div>
@endif

@if ($agreeTermsSlug)
    <div class="form-group">
        <div class="form-check">
            <input
                id="terms-condition"
                type="checkbox"
                name="terms_condition"
                value="1"
                class="form-check-input" {!! set_checkbox('terms_condition', '1') !!}
            >
            <label class="form-check-label ms-2" for="terms-condition">
                {!! sprintf(lang('igniter.cart::default.checkout.label_terms'), url($agreeTermsSlug)) !!}
            </label>
        </div>
        {!! form_error('terms_condition', '<span class="text-danger col-xs-12">', '</span>') !!}
    </div>
@endif

{!! form_close() !!}
