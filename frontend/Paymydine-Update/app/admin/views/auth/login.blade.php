<div class="container-fluid">
    <div class="login-container">
        <div class="card">
            <div class="card-body">
                <!-- PMD_LOGIN_SIMPLE_LOGO_V58_START -->
                <div class="brand-logo pmd-login-simple-logo-v58">
                    <a href="{{ admin_url('login') }}" class="logo-link">
</a>
                </div>
                <!-- PMD_LOGIN_SIMPLE_LOGO_V58_END -->

                {!! form_open([
                    'id' => 'edit-form',
                    'role' => 'form',
                    'method' => 'POST',
                    'data-request' => 'onLogin',
                ]) !!}

                <div class="form-group mb-0">
                    <label
                        for="input-username"
                        class="form-label"
                    >@lang('admin::lang.login.label_username')</label>
                    <input name="username" type="text" id="input-username" class="form-control"/>
                    {!! form_error('username', '<span class="text-danger">', '</span>') !!}
                </div>
                <div class="form-group">
                    <label
                        for="input-password"
                        class="form-label"
                    >@lang('admin::lang.login.label_password')</label>
                    <input name="password" type="password" id="input-password" class="form-control"/>
                    {!! form_error('password', '<span class="text-danger">', '</span>') !!}
                </div>
                <div class="form-group">
                    <button
                        type="submit"
                        class="btn btn-primary btn-block"
                        data-attach-loading=""
                    ><i class="fa fa-sign-in fa-fw"></i>&nbsp;&nbsp;&nbsp;@lang('admin::lang.login.button_login')
                    </button>
                </div>

                <div class="form-group">
                    <p class="text-right">
                        <a href="{{ admin_url('login/reset') }}">
                            @lang('admin::lang.login.text_forgot_password')
                        </a>
                    </p>
                </div>

                {!! form_close() !!}
            </div>
        </div>
    </div>
</div>

<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

