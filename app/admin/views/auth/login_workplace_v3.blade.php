@php
    // PMD_LOGIN_WORKPLACE_V5
    $locale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $locale = in_array($locale, ['en', 'de'], true) ? $locale : 'en';
    $security = isset($pmdLoginSecurity) && is_array($pmdLoginSecurity) ? $pmdLoginSecurity : null;
    $securityMode = $security ? (string)($security['mode'] ?? '') : '';
    $securityActive = in_array($securityMode, ['setup', 'verify'], true);
    $destination = $securityActive
        ? ((string)($security['destination'] ?? 'workspace') === 'staff' ? 'staff' : 'workspace')
        : (input('destination') === 'staff' ? 'staff' : 'workspace');

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
            'failed_text' => 'Prüfe deine Eingabe und versuche es erneut.',
            'restaurant' => 'Restaurant',
            'locked' => 'Dieser Login ist fest mit diesem Restaurant verbunden.',
            'workplace' => 'Nach dem Passwort folgt die Sicherheitsprüfung: Team-Mitglieder nutzen den aktuellen 6-stelligen Workplace Code vom Restaurant-Admin/Kassengerät. Der Owner kann alternativ seine persönliche Authenticator-App verwenden.',
            'switch_title' => 'Auf Englisch wechseln',
            'reset' => 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.',
            'owner_security' => 'Owner-Sicherheit',
            'step_two' => 'Schritt 2 von 2',
            'setup_title' => 'Authenticator verbinden',
            'setup_text' => 'Scanne diesen QR-Code einmal mit Google Authenticator, Microsoft Authenticator, 1Password oder einer kompatiblen TOTP-App.',
            'verify_title' => 'Authenticator-Code eingeben',
            'verify_text' => 'Gib den aktuellen 6-stelligen Code aus deiner persönlichen Authenticator-App ein.',
            'no_sms' => 'Keine SMS und kein externer OTP-Anbieter erforderlich.',
            'manual_key' => 'Manueller Einrichtungsschlüssel',
            'copy' => 'Kopieren',
            'copied' => 'Kopiert',
            'code_label' => '6-stelliger Code aus deiner App',
            'connect' => 'Authenticator verbinden',
            'verify' => 'Owner bestätigen',
            'use_workplace' => 'Stattdessen Workplace Code verwenden',
            'qr_unavailable' => 'QR konnte nicht angezeigt werden. Nutze den manuellen Schlüssel unten.',
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
            'failed_text' => 'Check your entry and try again.',
            'restaurant' => 'Restaurant',
            'locked' => 'This login is locked to this restaurant.',
            'workplace' => 'After your password comes security verification: team members use the fresh 6-digit Workplace Code from the restaurant Admin/Cashier. The Owner may alternatively use their personal Authenticator app.',
            'switch_title' => 'Switch to German',
            'reset' => 'Your password has been updated. You can now sign in.',
            'owner_security' => 'Owner security',
            'step_two' => 'Step 2 of 2',
            'setup_title' => 'Connect your Authenticator',
            'setup_text' => 'Scan this QR once with Google Authenticator, Microsoft Authenticator, 1Password, or another compatible TOTP app.',
            'verify_title' => 'Enter your Authenticator code',
            'verify_text' => 'Enter the current 6-digit code from your personal Authenticator app.',
            'no_sms' => 'No SMS or external OTP provider is required.',
            'manual_key' => 'Manual setup key',
            'copy' => 'Copy',
            'copied' => 'Copied',
            'code_label' => '6-digit code from your app',
            'connect' => 'Connect Authenticator',
            'verify' => 'Verify Owner',
            'use_workplace' => 'Use Workplace Code instead',
            'qr_unavailable' => 'QR could not be displayed. Use the manual setup key below.',
        ];
@endphp
<!doctype html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $securityActive ? $copy['owner_security'].' - PayMyDine' : $copy['title'] }}</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-login-workplace-v5">
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
        .success,.notice{margin-bottom:14px;padding:11px 12px;border-radius:12px;font-size:11px;line-height:1.4}.success{border:1px solid #bfe4d4;background:#f1faf6;color:#146948}.notice{border:1px solid #f0c6c1;background:#fff3f2;color:#8b2c25}.notice strong{display:block;margin-bottom:2px}
        .form{display:grid;gap:14px}.field{display:grid;gap:6px}.field>span,.field>label{font-size:11px;font-weight:850}.input{position:relative}.field input{width:100%;height:48px;padding:0 13px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--text);font:inherit;font-size:14px;outline:none}.field input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}.field input[type=password],.field input[data-visible="1"]{padding-right:46px}.toggle{position:absolute;right:5px;top:5px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#74827f;cursor:pointer}.toggle:hover{background:#f2f7f5}.error{color:var(--danger);font-size:10px;font-weight:750}.submit{height:49px;border:1px solid var(--jade);border-radius:13px;background:var(--jade);color:#fff;font:inherit;font-size:14px;font-weight:900;cursor:pointer}.submit:hover{background:var(--jade-dark)}.forgot,.secondary-link{color:var(--jade);font-size:11px;font-weight:800;text-decoration:none}
        .security-head{text-align:center;margin:-2px 0 15px}.security-step{display:inline-flex;align-items:center;height:25px;padding:0 9px;margin-bottom:8px;border:1px solid #ead8b6;border-radius:999px;background:#fff9ef;color:#8a621f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.security-head h1{margin:0 0 6px}.security-head p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.security-note{padding:10px 12px;border:1px solid #cde4dc;border-radius:12px;background:#f3faf7;color:#315b52;font-size:10px;font-weight:750;line-height:1.45}.qrbox{display:grid;place-items:center;min-height:220px;padding:12px;border:1px solid #d3e6e0;border-radius:16px;background:#f5fbf9}.qrbox svg{display:block;width:210px!important;height:210px!important;max-width:100%}.qr-fallback{padding:24px;text-align:center;color:var(--muted);font-size:11px;line-height:1.5}.secret-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.secret-row input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;letter-spacing:.03em}.copy{height:48px;padding:0 12px;border:1px solid var(--line);border-radius:13px;background:#f8fbfa;color:var(--jade);font:inherit;font-size:10px;font-weight:900;cursor:pointer}.code-input{text-align:center;font-size:24px!important;font-weight:850;letter-spacing:.32em;font-variant-numeric:tabular-nums;padding-left:calc(13px + .32em)!important}.security-actions{display:grid;gap:10px;text-align:center}
        @media(max-width:540px){body{padding:12px 9px}.card{padding:21px 18px 25px;border-radius:20px}.brand{height:130px;margin:-4px 38px 0}.brand img{height:125px}.tenant,.workplace{font-size:10px}.qrbox{min-height:200px}.qrbox svg{width:190px!important;height:190px!important}}
    </style>
</head>
<body>
<main class="card">
    <button type="button" class="lang" data-lang="{{ $nextLocale }}" title="{{ $copy['switch_title'] }}">{{ strtoupper($nextLocale) }}</button>

    <div class="brand"><img src="{{ asset('app/admin/assets/images/pmd-login-logo.svg') }}?v=pmd-login-workplace-v5" alt="PayMyDine"></div>

    @if($securityActive)
        <section class="security-head">
            <span class="security-step">{{ $copy['step_two'] }}</span>
            <h1>{{ $copy['owner_security'] }}</h1>
            <p>{{ $securityMode === 'setup' ? $copy['setup_text'] : $copy['verify_text'] }}</p>
        </section>
    @else
        <h1>@lang('admin::lang.login.text_title')</h1>
        <nav class="modes" aria-label="Login destination">
            <a href="{{ admin_url('login') }}" class="{{ $destination === 'workspace' ? 'active' : '' }}">{{ $copy['workspace'] }}</a>
            <a href="{{ admin_url('login') }}?destination=staff" class="{{ $destination === 'staff' ? 'active' : '' }}">{{ $copy['staff'] }}</a>
        </nav>
    @endif

    <div class="tenant">
        <b>{{ $copy['restaurant'] }} · <code>{{ $host }}</code></b>
        <span>{{ $copy['locked'] }}</span>
    </div>

    @if(!$securityActive)
        <div class="workplace">{{ $copy['workplace'] }}</div>
    @endif

    @if(input('reset') === 'success')
        <div class="success">{{ $copy['reset'] }}</div>
    @endif

    @if(input('session') === 'work-expired')
        <div class="notice"><strong>Work session ended</strong><span>Please sign in again to continue working.</span></div>
    @endif

    @if(session('error'))
        <div class="notice"><strong>{{ $copy['failed_title'] }}</strong><span>{{ session('error') }}</span></div>
    @endif

    <div id="pmd-login-notice" class="notice" role="alert" aria-live="polite" hidden>
        <strong>{{ $copy['failed_title'] }}</strong><span>{{ $copy['failed_text'] }}</span>
    </div>

    @if(!$securityActive)
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
    @elseif($securityMode === 'setup')
        <div class="form">
            <div class="security-note">{{ $copy['no_sms'] }}</div>

            <div class="qrbox" aria-label="Authenticator QR">
                @if(!empty($security['qr_svg']))
                    {!! $security['qr_svg'] !!}
                @else
                    <div class="qr-fallback">{{ $copy['qr_unavailable'] }}</div>
                @endif
            </div>

            <label class="field">
                <span>{{ $copy['manual_key'] }}</span>
                <span class="secret-row">
                    <input id="pmd-owner-secret" type="text" readonly value="{{ $security['secret'] ?? '' }}" onclick="this.select()">
                    <button class="copy" type="button" data-copy-secret data-copy-label="{{ $copy['copy'] }}" data-copied-label="{{ $copy['copied'] }}">{{ $copy['copy'] }}</button>
                </span>
            </label>

            {!! form_open(['id'=>'pmd-security-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onOwnerMfaConfirm']) !!}
                <label class="field">
                    <span>{{ $copy['code_label'] }}</span>
                    <input class="code-input" data-security-code name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                    {!! form_error('code', '<small class="error">', '</small>') !!}
                </label>
                <button type="submit" class="submit" data-attach-loading>{{ $copy['connect'] }}</button>
            {!! form_close() !!}
        </div>
    @else
        {!! form_open(['id'=>'pmd-security-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onOwnerMfaVerify']) !!}
            <label class="field">
                <span>{{ $copy['code_label'] }}</span>
                <input class="code-input" data-security-code name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                {!! form_error('code', '<small class="error">', '</small>') !!}
            </label>
            <div class="security-actions">
                <button type="submit" class="submit" data-attach-loading>{{ $copy['verify'] }}</button>
                @if(!empty($security['can_use_workplace']))
                    <a class="secondary-link" href="{{ admin_url('siteaccess') }}">{{ $copy['use_workplace'] }}</a>
                @endif
            </div>
        {!! form_close() !!}
    @endif
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

    var securityCode = document.querySelector('[data-security-code]');
    if (securityCode) securityCode.addEventListener('input', function () {
        securityCode.value = String(securityCode.value || '').replace(/\D+/g, '').slice(0, 6);
    });

    var copy = document.querySelector('[data-copy-secret]');
    var secret = document.getElementById('pmd-owner-secret');
    if (copy && secret) copy.addEventListener('click', function () {
        var value = String(secret.value || '');
        var done = function () {
            copy.textContent = copy.getAttribute('data-copied-label') || 'Copied';
            window.setTimeout(function () {
                copy.textContent = copy.getAttribute('data-copy-label') || 'Copy';
            }, 1200);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(done).catch(function () {
                secret.select();
            });
        } else {
            secret.select();
        }
    });
})();

if (window.jQuery) {
    jQuery.ajaxSetup({headers:{'X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').getAttribute('content')}});
    (function ($) {
        var form = $('#edit-form, #pmd-security-form');
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
