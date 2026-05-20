{!! form_open([
'id' => 'booking-form',
'role' => 'form',
'method' => 'POST',
'data-request' => $bookingEventHandler,
]) !!}

<div class="row">
    <div class="col-sm-6">
        <div class="form-floating mb-3">
            <input type="text" name="first_name" id="first-name" class="form-control input-lg"
                placeholder="@lang('igniter.reservation::default.label_first_name')"
                value="{{ set_value('first_name', $reservation->first_name) }}" />
            <label for="first-name">@lang('igniter.reservation::default.label_first_name')</label>
            {!! form_error('first_name', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>

    <div class="col-sm-6">
        <div class="form-floating mb-3">
            <input type="text" name="last_name" id="last-name" class="form-control input-lg"
                placeholder="@lang('igniter.reservation::default.label_last_name')"
                value="{{ set_value('last_name', $reservation->last_name) }}" />
            <label for="last-name">@lang('igniter.reservation::default.label_last_name')</label>
            {!! form_error('last_name', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
</div>

<div class="row">
    <div class="col-sm-6">
        <div class="form-floating mb-3">
            <input type="text" name="email" id="email" class="form-control input-lg"
                placeholder="@lang('igniter.reservation::default.label_email')"
                value="{{ set_value('email', $reservation->email) }}" />
            <label for="email">@lang('igniter.reservation::default.label_email')</label>
            {!! form_error('email', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
    <div class="col-sm-6">
        <div class="form-floating mb-3">
            <input type="text" name="telephone" id="telephone" class="form-control input-lg"
                placeholder="@lang('igniter.reservation::default.label_telephone')"
                data-control="country-code-picker" 
                data-initial-country="co"
                value="{{ set_value('telephone', $reservation->telephone) }}" />
            {!! form_error('telephone', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
</div>

<div class="form-floating mb-3">
    <textarea name="comment" id="comment" class="form-control input-lg" style="height: 100px"
        placeholder="@lang('igniter.reservation::default.label_comment')">{{ set_value('comment', $reservation->comment) }}</textarea>
    <label for="comment">@lang('igniter.reservation::default.label_comment')</label>
    {!! form_error('comment', '<span class="text-danger">', '</span>') !!}
</div>
<div class="row justify-content-md-center d-flex">
    <button type="submit" class="btn btn-primary col-12 col-sm-6 text-uppercase btn-lg"
        data-attach-loading="disabled">@lang('igniter.reservation::default.button_reservation')</button>
</div>

{!! form_close() !!}