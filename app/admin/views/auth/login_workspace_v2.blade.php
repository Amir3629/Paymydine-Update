@php
    // PMD_LOGIN_WORKSPACE_V3
    // Logged-out language is browser-local. After successful login the saved
    // staff language remains authoritative in Admin\Controllers\Login.
    $pmdLoginLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $pmdLoginLocale = in_array($pmdLoginLocale, ['en', 'de'], true) ? $pmdLoginLocale : 'en';
    $pmdLoginDestination = input('destination') === 'staff' ? 'staff' : 'workspace';
    app()->setLocale($pmdLoginLocale);
    if (app()->bound('translator.localization')) {
        app('translator.localization')->setLocale($pmdLoginLocale, false);
    }

    $pmdLoginNextLocale = $pmdLoginLocale === 'de' ? 'en' : 'de';
    $pmdLoginCopy = $pmdLoginLocale === 'de'
        ? [
            'title' => 'Anmelden - PayMyDine',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username_placeholder' => 'Benutzername eingeben',
            'password_placeholder' => 'Passwort eingeben',
            'password_updated' => 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.',
            'failed_title' => 'Anmeldung fehlgeschlagen',
            'failed_text' => 'Prüfe Benutzername und Passwort und versuche es erneut.',
            'switch_title' => 'Auf Englisch wechseln',
            'staff_hint' => 'Dienstplan, Team-Chat und Anfragen',
        ]
        : [
            'title' => 'Login - PayMyDine',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username_placeholder' => 'Enter your username',
            'password_placeholder' => 'Enter your password',
            'password_updated' => 'Your password has been updated. You can now sign in.',
            'failed_title' => 'Login failed',
            'failed_text' => 'Check your username and password and try again.',
            'switch_title' => 'Switch to German',
            'staff_hint' => 'Shifts, team chat and requests',
        ];
@endphp
<!doctype html>
<html lang="{{ $pmdLoginLocale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-login-workspace-v3">
    <title>{{ $pmdLoginCopy['title'] }}</title>
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dashboard.css') }}?ver=3.2.3">
    <style>
        :root{--pmd-jade:#062f2a;--pmd-jade-dark:#021f1c;--pmd-gold:#c89b4a;--pmd-line:#e8e2d8;--pmd-text:#0d1b1e;--pmd-muted:#6b7280;--pmd-danger:#b42318}
        *{box-sizing:border-box}
        html,body{min-height:100%;margin:0}
        body{min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:radial-gradient(circle at 50% 9%,rgba(200,155,74,.17),transparent 31%),linear-gradient(180deg,#011714 0%,#021a17 42%,#062f2a 100%);color:var(--pmd-text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
        .pmd-login-card{position:relative;width:min(480px,100%);padding:25px 34px 32px;border:1px solid rgba(200,155,74,.38);border-radius:24px;background:rgba(255,255,255,.98);box-shadow:0 26px 72px rgba(1,23,20,.38)}
        .pmd-login-language{position:absolute;right:16px;top:16px;width:46px;height:42px;display:grid;place-items:center;border:1px solid #d7c7a8;border-radius:13px;background:#fff9ee;color:var(--pmd-jade);font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 5px 16px rgba(6,47,42,.08)}
        .pmd-login-language:hover{border-color:var(--pmd-gold);background:#f5e8d0}
        .pmd-login-brand{height:202px;display:grid;place-items:center;margin:-20px 36px -8px;overflow:visible}
        .pmd-login-brand img{display:block;width:300px;max-width:100%;height:190px;object-fit:contain}
        .pmd-login-title{margin:0 0 16px;text-align:center;font-size:20px;font-weight:850;letter-spacing:-.025em}
        .pmd-login-mode{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 auto 22px;padding:4px;border:1px solid #e2e9e6;border-radius:13px;background:#f3f7f5}
        .pmd-login-mode a{min-height:40px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 10px;border-radius:10px;color:#60706e;font-size:12px;font-weight:850;text-decoration:none}
        .pmd-login-mode a.is-active{background:#fff;color:var(--pmd-jade);box-shadow:0 2px 9px rgba(6,47,42,.08)}
        .pmd-login-mode a:hover{background:#e9f4ef;color:var(--pmd-jade)}
        .pmd-login-mode svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
        .pmd-login-notice{margin:0 0 16px;padding:12px 14px;border:1px solid rgba(180,35,24,.22);border-left:4px solid var(--pmd-danger);border-radius:13px;background:#fff2f1;color:#7a271a;font-size:12px;line-height:1.45}
        .pmd-login-notice strong{display:block;margin-bottom:2px;color:var(--pmd-danger)}
        .pmd-login-success{margin:0 0 16px;padding:11px 13px;border:1px solid rgba(21,128,61,.2);border-radius:13px;background:rgba(21,128,61,.07);color:#15803d;font-size:12px;font-weight:700}
        .pmd-login-form{display:grid;gap:15px}
        .pmd-login-field{display:grid;gap:7px;margin:0}
        .pmd-login-field>span{color:#172b2c;font-size:12px;font-weight:800}
        .pmd-login-input{position:relative}
        .pmd-login-field input{width:100%;height:48px;padding:0 13px;border:1px solid var(--pmd-line);border-radius:14px;background:#fff;color:var(--pmd-text);font:inherit;font-size:14px;outline:none;box-shadow:0 7px 19px rgba(6,47,42,.05)}
        .pmd-login-field input:focus{border-color:var(--pmd-gold);box-shadow:0 0 0 3px rgba(200,155,74,.14),0 7px 19px rgba(6,47,42,.06)}
        .pmd-login-field input::placeholder{color:#9aa1ad}
        .pmd-login-field input[type=password],.pmd-login-field input[data-pmd-password-visible="1"]{padding-right:48px}
        .pmd-login-password-toggle{position:absolute;right:5px;top:5px;width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:10px;background:transparent;color:#7d8da0;cursor:pointer}
        .pmd-login-password-toggle:hover{background:#f3f7f5;color:var(--pmd-jade)}
        .pmd-login-password-toggle svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .pmd-login-error{color:var(--pmd-danger);font-size:11px;font-weight:700}
        .pmd-login-submit{width:100%;height:49px;margin-top:2px;border:1px solid var(--pmd-jade);border-radius:14px;background:var(--pmd-jade);color:#fff;font:inherit;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 12px 27px rgba(6,47,42,.2)}
        .pmd-login-submit:hover{border-color:var(--pmd-gold);background:var(--pmd-jade-dark)}
        .pmd-login-forgot{display:inline-block;margin-top:1px;color:var(--pmd-jade);font-size:12px;font-weight:800;text-decoration:none}
        .pmd-login-forgot:hover{color:#9a6d1f}
        .pmd-login-staff-note{display:flex;align-items:center;justify-content:center;gap:6px;margin:18px 0 0;color:#83908f;font-size:10px;text-align:center}
        .pmd-login-staff-note b{color:#60706e;font-weight:800}
        @media(max-width:560px){body{padding:14px 10px}.pmd-login-card{padding:22px 19px 27px;border-radius:21px}.pmd-login-language{right:12px;top:12px}.pmd-login-brand{height:170px;margin:-13px 34px -4px}.pmd-login-brand img{width:260px;height:160px}.pmd-login-mode{margin-bottom:19px}.pmd-login-field input{height:47px}}
    </style>
</head>
<body>
<main class="pmd-login-card">
    <button type="button" class="pmd-login-language" data-pmd-login-language="{{ $pmdLoginNextLocale }}" title="{{ $pmdLoginCopy['switch_title'] }}" aria-label="{{ $pmdLoginCopy['switch_title'] }}">{{ strtoupper($pmdLoginNextLocale) }}</button>

    <div class="pmd-login-brand">
        <img src="{{ asset('app/admin/assets/images/pmd-login-logo.svg') }}?v=pmd-login-workspace-v3" alt="PayMyDine">
    </div>

    <h1 class="pmd-login-title">@lang('admin::lang.login.text_title')</h1>

    <nav class="pmd-login-mode" aria-label="Login destination">
        <a href="{{ admin_url('login') }}" class="{{ $pmdLoginDestination === 'workspace' ? 'is-active' : '' }}" @if($pmdLoginDestination === 'workspace') aria-current="page" @endif>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path></svg>
            {{ $pmdLoginCopy['workspace'] }}
        </a>
        <a href="{{ admin_url('login') }}?destination=staff" class="{{ $pmdLoginDestination === 'staff' ? 'is-active' : '' }}" @if($pmdLoginDestination === 'staff') aria-current="page" @endif>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
            {{ $pmdLoginCopy['staff'] }}
        </a>
    </nav>

    @if(input('reset') === 'success')
        <div class="pmd-login-success">{{ $pmdLoginCopy['password_updated'] }}</div>
    @endif

    <div id="pmd-login-notice" class="pmd-login-notice" role="alert" aria-live="polite" hidden>
        <strong>{{ $pmdLoginCopy['failed_title'] }}</strong>
        <span>{{ $pmdLoginCopy['failed_text'] }}</span>
    </div>

    {!! form_open([
        'id' => 'edit-form',
        'class' => 'pmd-login-form',
        'role' => 'form',
        'method' => 'POST',
        'data-request' => 'onLogin',
    ]) !!}
        <input type="hidden" name="destination" value="{{ $pmdLoginDestination }}">

        <label class="pmd-login-field">
            <span>@lang('admin::lang.login.label_username')</span>
            <input type="text" name="username" id="input-username" autocomplete="username" placeholder="{{ $pmdLoginCopy['username_placeholder'] }}" value="{{ old('username') }}" required autofocus>
            {!! form_error('username', '<small class="pmd-login-error">', '</small>') !!}
        </label>

        <label class="pmd-login-field">
            <span>@lang('admin::lang.login.label_password')</span>
            <span class="pmd-login-input">
                <input type="password" name="password" id="input-password" autocomplete="current-password" minlength="6" placeholder="{{ $pmdLoginCopy['password_placeholder'] }}" required>
                <button type="button" class="pmd-login-password-toggle" data-pmd-password-toggle aria-label="Show password">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>
                </button>
            </span>
            {!! form_error('password', '<small class="pmd-login-error">', '</small>') !!}
        </label>

        <button type="submit" class="pmd-login-submit" data-attach-loading>@lang('admin::lang.login.button_login')</button>
        <a class="pmd-login-forgot" href="{{ admin_url('login/reset') }}">@lang('admin::lang.login.text_forgot_password')</a>
    {!! form_close() !!}

    <p class="pmd-login-staff-note"><b>{{ $pmdLoginCopy['staff'] }}</b> · {{ $pmdLoginCopy['staff_hint'] }}</p>
</main>

<script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin.js') }}"></script>
<script>
(function () {
    'use strict';
    var language = document.querySelector('[data-pmd-login-language]');
    if (language) language.addEventListener('click', function () {
        var code = String(language.getAttribute('data-pmd-login-language') || '').toLowerCase();
        if (code !== 'en' && code !== 'de') return;
        var cookie = 'pmd_admin_locale=' + encodeURIComponent(code) + '; Path=/; Max-Age=31536000; SameSite=Lax';
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
        window.location.reload();
    });

    var toggle = document.querySelector('[data-pmd-password-toggle]');
    var password = document.getElementById('input-password');
    if (toggle && password) toggle.addEventListener('click', function () {
        var reveal = password.type === 'password';
        password.type = reveal ? 'text' : 'password';
        password.setAttribute('data-pmd-password-visible', reveal ? '1' : '0');
        toggle.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    });
})();

if (window.jQuery) {
    jQuery.ajaxSetup({headers:{'X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').getAttribute('content')}});
    (function ($) {
        var form = $('#edit-form');
        var notice = document.getElementById('pmd-login-notice');
        if (!form.length || !notice) return;
        function show(message) {
            var span = notice.querySelector('span');
            if (span && message) span.textContent = message;
            notice.hidden = false;
        }
        form.on('ajaxFail ajaxError ajaxInvalidField', function () { show(); });
        $(document).on('ajaxErrorMessage', function (event, message) {
            if (event && event.preventDefault) event.preventDefault();
            show(message);
        });
    })(window.jQuery);
}
</script>
</body>
</html>