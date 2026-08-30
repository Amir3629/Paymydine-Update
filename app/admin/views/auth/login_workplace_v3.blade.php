@php
    // PMD_LOGIN_WORKPLACE_V3
    $locale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $locale = in_array($locale, ['en', 'de'], true) ? $locale : 'en';
    $destination = input('destination') === 'staff' ? 'staff' : 'workspace';
    app()->setLocale($locale);
    if (app()->bound('translator.localization')) {
        app('translator.localization')->setLocale($locale, false);
    }

    $nextLocale = $locale === 'de' ? 'en' : 'de';
    $host = request()->getHost();
    $copy = $locale === 'de'
        ? [
            'title' => 'Anmelden - PayMyDine',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username' => 'Benutzername',
            'username_placeholder' => 'Benutzername eingeben',
            'password' => 'Passwort',
            'password_placeholder' => 'Passwort eingeben',
            'login' => 'Weiter',
            'forgot' => 'Passwort vergessen?',
            'failed_title' => 'Anmeldung fehlgeschlagen',
            'failed_text' => 'Prüfe Benutzername und Passwort und versuche es erneut.',
            'restaurant' => 'Restaurant',
            'locked' => 'Dieser Login ist fest mit diesem Restaurant verbunden.',
            'workplace' => 'Nach dem Passwort ist ein aktueller 6-stelliger Arbeitsplatz-Code vom Restaurant-Admin oder Kassengerät erforderlich.',
            'switch_title' => 'Auf Englisch wechseln',
            'reset' => 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.',
        ]
        : [
            'title' => 'Login - PayMyDine',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username' => 'Username',
            'username_placeholder' => 'Enter your username',
            'password' => 'Password',
            'password_placeholder' => 'Enter your password',
            'login' => 'Continue',
            'forgot' => 'Forgot password?',
            'failed_title' => 'Login failed',
            'failed_text' => 'Check your username and password and try again.',
            'restaurant' => 'Restaurant',
            'locked' => 'This login is locked to this restaurant.',
            'workplace' => 'After your password, a fresh 6-digit Workplace Code from the restaurant Admin or Cashier device is required.',
            'switch_title' => 'Switch to German',
            'reset' => 'Your password has been updated. You can now sign in.',
        ];
@endphp
<!doctype html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $copy['title'] }}</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-login-workplace-v3">
    <style>
        :root{--jade:#063f36;--jade-dark:#032d27;--gold:#c89b4a;--line:#e1e9e6;--text:#122321;--muted:#6d7b78;--danger:#b42318}
        *{box-sizing:border-box}html,body{margin:0;min-height:100%}
        body{min-height:100vh;display:grid;place-items:center;padding:22px 14px;background:radial-gradient(circle at 50% 8%,rgba(200,155,74,.17),transparent 31%),linear-gradient(180deg,#011714 0%,#032c27 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
        .card{position:relative;width:min(470px,100%);padding:24px 32px 30px;border:1px solid rgba(200,155,74,.35);border-radius:23px;background:#fff;box-shadow:0 28px 80px rgba(0,25,22,.35)}
        .lang{position:absolute;right:14px;top:14px;width:43px;height:39px;border:1px solid #dfd1b8;border-radius:11px;background:#fffaf1;color:var(--jade);font:inherit;font-size:12px;font-weight:900;cursor:pointer}
        .brand{height:155px;display:grid;place-items:center;margin:-10px 42px -2px}.brand img{width:260px;max-width:100%;height:150px;object-fit:contain}
        h1{margin:0 0 14px;text-align:center;color:#0c2c28;font-size:21px;letter-spacing:-.03em}
        .modes{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;margin-bottom:14px;border:1px solid var(--line);border-radius:13px;background:#f3f7f5}.modes a{height:40px;display:flex;align-items:center;justify-content:center;border-radius:10px;color:#677673;font-size:12px;font-weight:850;text-decoration:none}.modes a.active{background:#fff;color:var(--jade);box-shadow:0 2px 8px rgba(6,63,54,.08)}
        .tenant{margin-bottom:13px;padding:10px 12px;border:1px solid #dfe9e6;border-radius:12px;background:#f8fbfa}.tenant b{display:block;color:#28433e;font-size:11px}.tenant span{display:block;margin-top:3px;color:#75827f;font-size:10px}.tenant code{font-family:inherit;color:var(--jade);font-weight:900}
        .workplace{margin-bottom:16px;padding:11px 12px;border:1px solid #ead8b6;border-radius:12px;background:#fff9ef;color:#76531d;font-size:11px;line-height:1.45}
        .success,.notice{margin-bottom:14px;padding:11px 12px;border-radius:12px;font-size:11px;line-height:1.4}.success{border:1px solid #bfe4d4;background:#f1faf6;color:#146948}.notice{border:1px solid #f0c6c1;background:#fff3f2;color:#8b2c25}.notice strong{display:block;margin-bottom:2px}.form{display:grid;gap:14px}.field{display:grid;gap:6px}.field>span{font-size:11px;font-weight:850}.input{position:relative}.field input{width:100%;height:48px;padding:0 13px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--text);font:inherit;font-size:14px;outline:none}.field input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}.field input[type=password],.field input[data-visible="1"]{padding-right:46px}.toggle{position:absolute;right:5px;top:5px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#74827f;cursor:pointer}.toggle:hover{background:#f2f7f5}.error{color:var(--danger);font-size:10px;font-weight:750}.submit{height:49px;border:1px solid var(--jade);border-radius:13px;background:var(--jade);color:#fff;font:inherit;font-size:14px;font-weight:900;cursor:pointer}.submit:hover{background:var(--jade-dark)}.forgot{color:var(--jade);font-size:11px;font-weight:800;text-decoration:none}
        @media(max-width:540px){body{padding:12px 9px}.card{padding:21px 18px 25px;border-radius:20px}.brand{height:130px;margin:-4px 38px 0}.brand img{height:125px}.tenant,.workplace{font-size:10px}}
    </style>
</head>
<body>
<main class="card">
    <button type="button" class="lang" data-lang="{{ $nextLocale }}" title="{{ $copy['switch_title'] }}">{{ strtoupper($nextLocale) }}</button>

    <div class="brand"><img src="{{ asset('app/admin/assets/images/pmd-login-logo.svg') }}?v=pmd-login-workplace-v3" alt="PayMyDine"></div>
    <h1>@lang('admin::lang.login.text_title')</h1>

    <nav class="modes" aria-label="Login destination">
        <a href="{{ admin_url('login') }}" class="{{ $destination === 'workspace' ? 'active' : '' }}">{{ $copy['workspace'] }}</a>
        <a href="{{ admin_url('login') }}?destination=staff" class="{{ $destination === 'staff' ? 'active' : '' }}">{{ $copy['staff'] }}</a>
    </nav>

    <div class="tenant">
        <b>{{ $copy['restaurant'] }} · <code>{{ $host }}</code></b>
        <span>{{ $copy['locked'] }}</span>
    </div>
    <div class="workplace">{{ $copy['workplace'] }}</div>

    @if(input('reset') === 'success')<div class="success">{{ $copy['reset'] }}</div>@endif
    <div id="pmd-login-notice" class="notice" role="alert" aria-live="polite" hidden><strong>{{ $copy['failed_title'] }}</strong><span>{{ $copy['failed_text'] }}</span></div>

    {!! form_open(['id'=>'edit-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onLogin']) !!}
        <input type="hidden" name="destination" value="{{ $destination }}">
        <label class="field">
            <span>{{ $copy['username'] }}</span>
            <input type="text" name="username" id="input-username" autocomplete="username" placeholder="{{ $copy['username_placeholder'] }}" value="{{ old('username') }}" required autofocus>
            {!! form_error('username', '<small class="error">', '</small>') !!}
        </label>
        <label class="field">
            <span>{{ $copy['password'] }}</span>
            <span class="input">
                <input type="password" name="password" id="input-password" autocomplete="current-password" minlength="6" placeholder="{{ $copy['password_placeholder'] }}" required>
                <button type="button" class="toggle" data-password-toggle aria-label="Show password">◉</button>
            </span>
            {!! form_error('password', '<small class="error">', '</small>') !!}
        </label>
        <button type="submit" class="submit" data-attach-loading>{{ $copy['login'] }}</button>
        <a class="forgot" href="{{ admin_url('login/reset') }}">{{ $copy['forgot'] }}</a>
    {!! form_close() !!}
</main>

<script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin.js') }}"></script>
<script>
(function () {
    'use strict';
    var language = document.querySelector('[data-lang]');
    if (language) language.addEventListener('click', function () {
        var code = String(language.getAttribute('data-lang') || '').toLowerCase();
        if (code !== 'en' && code !== 'de') return;
        var cookie = 'pmd_admin_locale=' + encodeURIComponent(code) + '; Path=/; Max-Age=31536000; SameSite=Lax';
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
        window.location.reload();
    });

    var toggle = document.querySelector('[data-password-toggle]');
    var password = document.getElementById('input-password');
    if (toggle && password) toggle.addEventListener('click', function () {
        var reveal = password.type === 'password';
        password.type = reveal ? 'text' : 'password';
        password.setAttribute('data-visible', reveal ? '1' : '0');
        toggle.textContent = reveal ? '×' : '◉';
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
