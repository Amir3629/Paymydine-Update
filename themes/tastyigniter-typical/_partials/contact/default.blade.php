{!! form_open([
'id' => 'contact-form',
'role' => 'form',
'method' => 'POST',
'data-request' => $__SELF__.'::onSubmit',
]) !!}
<div class="row">
    <div class="col-lg-6">
        <div class="form-floating mb-3">
            <select id="subject" name="subject" class="form-control input-lg">
                <option>@lang('igniter.frontend::default.contact.text_select_subject')</option>
                @foreach ($__SELF__->subjects as $subject)
                <option value="@lang($subject)">@lang($subject)</option>
                @endforeach
            </select>
            <label for="subject">Choose an option: </label>
            {!! form_error('subject', '<span class="text-danger">', '</span>') !!}
        </div>
        <div class="form-floating mb-3">
            <input id="email" type="text" name="email" class="form-control input-lg" value="{{ set_value('email') }}"
                placeholder="@lang('igniter.frontend::default.contact.label_email')" />
            <label for="email">@lang('igniter.frontend::default.contact.label_email')</label>
            {!! form_error('email', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
    <div class="col-lg-6">
        <div class="form-floating mb-3">
            <input id="full_name" type="text" name="full_name" class="form-control input-lg"
                value="{{ set_value('full_name') }}"
                placeholder="@lang('igniter.frontend::default.contact.label_full_name')" />
            <label for="full_name">@lang('igniter.frontend::default.contact.label_full_name')</label>
            {!! form_error('full_name', '<span class="text-danger">', '</span>') !!}
        </div>
        <div class="form-floating mb-3">
            <input id="telephone" type="text" name="telephone" class="form-control input-lg"
                data-control="country-code-picker" 
                data-initial-country="co"
                value="{{ set_value('telephone') }}"
                placeholder="@lang('igniter.frontend::default.contact.label_telephone')" />
            {!! form_error('telephone', '<span class="text-danger">', '</span>') !!}
        </div>
    </div>
</div>
<div class="form-floating mb-3">
    <textarea id="contact-comment" name="comment" class="form-control input-lg"
        placeholder="@lang('igniter.frontend::default.contact.label_comment')"
        style="height: 200px">{{ set_value('comment') }}</textarea>
    <label for="contact-comment">@lang('igniter.frontend::default.contact.label_comment')</label>
    {!! form_error('comment', '<span class="text-danger">', '</span>') !!}
</div>

<div class="row justify-content-md-center d-flex">
    <div class="col-sm-6 mb-3">
        <button type="submit"
            class="btn text-uppercase btn-primary col-12">@lang('igniter.frontend::default.contact.button_send')</button>
    </div>
</div>
{!! form_close() !!}