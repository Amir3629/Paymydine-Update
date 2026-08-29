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
                    <input name="username" type="text" id="input-username" class="form-control" autocomplete="username"/>
                    {!! form_error('username', '<span class="text-danger">', '</span>') !!}
                </div>
                <div class="form-group">
                    <label
                        for="input-password"
                        class="form-label"
                    >@lang('admin::lang.login.label_password')</label>
                    <input name="password" type="password" id="input-password" class="form-control" autocomplete="current-password"/>
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

                <div class="pmd-login-workspace-switch" aria-label="Login destination">
                    <span>Need your shifts, team chat or requests?</span>
                    <a href="{{ url('/staff/login') }}">Open Staff Portal</a>
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

<style id="pmd-login-workspace-switch-v1">
.pmd-login-workspace-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-2px 0 18px;padding:10px 11px;border:1px solid #dbe7eb;border-radius:10px;background:#f8fbfd;color:#69808a;font-size:10px;line-height:1.35}.pmd-login-workspace-switch a{flex:0 0 auto;color:#075f4f;font-weight:850;text-decoration:none}@media(max-width:430px){.pmd-login-workspace-switch{align-items:flex-start;flex-direction:column}}
</style>

<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

