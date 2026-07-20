@if ($cart->count())
    <form
        id="coupon-form"
        method="POST"
        role="form"
        data-request="{{ $applyCouponEventHandler }}"
    >
        <div class="cart-coupon">
            <div
                class="input-group form-floating mb-4">
                <input
                    type="text"
                    name="code"
                    class="form-control input-lg"
                    value="{{ ($coupon = $cart->getCondition('coupon')) ? $coupon->getMetaData('code') : '' }}"
                    placeholder="@lang('igniter.cart::default.text_apply_coupon')"/>
                <label for="code">@lang('igniter.cart::default.text_apply_coupon')</label>
                <button
                    type="submit"
                    class="btn btn-primary"
                    data-replace-loading="spinner-border spinner-border-sm text-dark"
                    title="@lang('igniter.cart::default.button_apply_coupon')"
                ><i class="bi bi-check"></i></button>
            </div>
        </div>
    </form>
@endif
