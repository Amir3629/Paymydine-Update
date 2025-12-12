<div class="container-fluid">
    <div class="login-container">
        <div class="card">
            <div class="card-body">
                @foreach(Flash::all() as $message)
                    @if(!$message['overlay'])
                        <div
                            class="alert alert-{{ $message['level'] }} flash-message animated fadeInDown alert-dismissible show"
                            data-control="flash-message"
                            data-allow-dismiss="{{ $message['important'] ? 'false' : 'true' }}"
                            role="alert"
                            style="margin-bottom: 20px;"
                        >
                            {!! $message['message'] !!}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button>
                        </div>
                    @endif
                @endforeach
                <h5>@lang('admin::lang.login.text_reset_password_title')</h5>
                {!! form_open(current_url(),
                    [
                        'id' => 'edit-form',
                        'role' => 'form',
                        'method' => 'POST',
                        'data-request' => empty($resetCode) ? 'onRequestResetPassword' : 'onResetPassword',
                    ]
                ) !!}

                @empty($resetCode)
                    <div class="form-group">
                        <label
                            for="input-user"
                            class="form-label"
                        >@lang('admin::lang.label_email')</label>
                        <div class="">
                            <input name="email" type="text" id="input-user" class="form-control"/>
                            {!! form_error('email', '<span class="text-danger">', '</span>') !!}
                        </div>
                    </div>
                @else
                    <input type="hidden" name="code" value="{{ $resetCode }}">
                    <div class="form-group">
                        <input
                            type="password"
                            id="password"
                            class="form-control"
                            name="password"
                            placeholder="@lang('admin::lang.login.label_password')"
                        />
                        {!! form_error('password', '<span class="text-danger">', '</span>') !!}
                    </div>
                    <div class="form-group">
                        <input
                            type="password"
                            id="password-confirm"
                            class="form-control"
                            name="password_confirm"
                            placeholder="@lang('admin::lang.login.label_password_confirm')"
                        />
                        {!! form_error('password_confirm', '<span class="text-danger">', '</span>') !!}
                    </div>
                @endempty
                <div class="form-group" style="display: flex; gap: 10px; justify-content: space-between; align-items: center;">
                    <a
                        class="btn btn-light"
                        href="{{ admin_url('login') }}"
                        style="pointer-events: auto !important; display: inline-flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 99999 !important; padding: 0.55rem 1.75rem !important; border-radius: 12px !important; font-weight: 600 !important; align-items: center !important; justify-content: center !important; min-height: 40px !important; height: 40px !important; line-height: 1.3 !important; width: auto !important; background: rgb(241, 244, 251) !important; color: rgb(32, 41, 56) !important; border: 1px solid rgb(201, 210, 227) !important; box-shadow: none !important; flex: 1; min-width: 140px; text-decoration: none;"
                    >@lang('admin::lang.login.text_back_to_login')</a>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        data-attach-loading=""
                        style="flex: 1; min-width: 140px;"
                    >@lang('admin::lang.login.button_reset_password')</button>
                </div>
                {!! form_close() !!}
            </div>
        </div>
    </div>
</div>
