<div class="row">
    <div class="col-sm-6">
        <div class="form-floating mb-4">
            
            <input
                type="text"
                name="first_name"
                id="first-name"
                placeholder="@lang('igniter.cart::default.checkout.label_first_name')"
                class="form-control input-lg"
                value="{{ set_value('first_name', $order->first_name) }}"/>
                <label for="first-name">@lang('igniter.cart::default.checkout.label_first_name')</label>
            {!! form_error('first_name', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
    <div class="col-sm-6">
        <div class="form-floating mb-4">            
            <input
                type="text"
                name="last_name"
                id="last-name"
                placeholder="@lang('igniter.cart::default.checkout.label_last_name')"
                class="form-control input-lg"
                value="{{ set_value('last_name', $order->last_name) }}"/>
                <label for="last-name">@lang('igniter.cart::default.checkout.label_last_name')</label>
            {!! form_error('last_name', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
</div>

<div class="row">
    <div class="col-sm-6">
        <div class="form-floating mb-4">            
            <input
                type="text"
                name="email"
                id="email"
                placeholder="@lang('igniter.cart::default.checkout.label_email')"
                class="form-control input-lg"
                value="{{ set_value('email', $order->email) }}"
                {!! $customer ? 'disabled' : '' !!} />
            <label for="email">@lang('igniter.cart::default.checkout.label_email')</label>
            {!! form_error('email', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
    <div class="col-sm-6">
        <div class="form-floating mb-4">
            
            <input
                type="text"
                name="telephone"
                id="telephone"
                placeholder="@lang('igniter.cart::default.checkout.label_telephone')"
                class="form-control input-lg"
                data-control="country-code-picker"
                data-initial-country="co"
                value="{{ set_value('telephone', $order->telephone) }}"/>
            {!! form_error('telephone', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
</div>
