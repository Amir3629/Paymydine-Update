@php
    // PMD_LOGIN_WORKPLACE_V10
    $locale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $locale = in_array($locale, ['en', 'de'], true) ? $locale : 'en';
    $security = isset($pmdLoginSecurity) && is_array($pmdLoginSecurity) ? $pmdLoginSecurity : null;
    $securityMode = $security ? (string)($security['mode'] ?? '') : '';

    // PMD_OWNER_RECOVERY_CODES_INLINE_V1
    // The controller keeps the canonical Owner security session in a valid
    // verify state and stores plaintext recovery codes only in this short-lived
    // server session package so they can be shown once on the same Login card.
    $recoveryDisplay = (array)session()->get('pmd_owner_recovery_codes_once_v1', []);
    $recoveryDisplayValid = !empty($recoveryDisplay['codes'])
        && hash_equals((string)($recoveryDisplay['session_id'] ?? ''), (string)session()->getId())
        && (int)($recoveryDisplay['created_at'] ?? 0) > (time() - 900);
    if ($recoveryDisplayValid) {
        $security = is_array($security) ? $security : [];
        $securityMode = 'recovery_codes';
        $security['recovery_codes'] = array_values((array)$recoveryDisplay['codes']);
    }

    $securityActive = in_array($securityMode, ['setup', 'verify', 'workplace', 'recovery_codes'], true);

    app()->setLocale($locale);
    if (app()->bound('translator.localization')) {
        app('translator.localization')->setLocale($locale, false);
    }

    $nextLocale = $locale === 'de' ? 'en' : 'de';
    $copy = $locale === 'de'
        ? [
            'username' => 'Benutzername',
            'username_placeholder' => 'Benutzername eingeben',
            'password' => 'Passwort',
            'password_placeholder' => 'Passwort eingeben',
            'continue' => 'Weiter',
            'forgot' => 'Passwort vergessen?',
            'failed_title' => 'Anmeldung fehlgeschlagen',
            'failed_text' => 'Prüfe deine Eingabe und versuche es erneut.',
            'reset' => 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.',
            'setup_title' => 'Authenticator verbinden',
            'setup_text' => 'Scanne diesen QR-Code einmal mit deiner Authenticator-App.',
            'verify_title' => 'Sicherheitscode',
            'verify_text' => 'Gib den aktuellen 6-stelligen Code aus deiner Authenticator-App ein.',
            'manual_key' => 'Manueller Schlüssel',
            'copy' => 'Kopieren',
            'copied' => 'Kopiert',
            'code' => '6-stelliger Code',
            'connect' => 'Verbinden',
            'verify' => 'Bestätigen',
            'workplace_title' => 'Restaurant-Freigabe',
            'workplace_text' => 'Code eingeben oder QR scannen.',
            'scan' => 'QR scannen',
            'stop_scan' => 'Kamera schließen',
            'camera_unavailable' => 'Der QR-Scanner ist in diesem Browser nicht verfügbar. Nutze den 6-stelligen Code.',
            'waiting' => 'Oder auf Freigabe warten.',
            'expired' => 'Diese Anfrage ist abgelaufen. Bitte erneut anmelden.',
            'recovery_use' => 'Notfallcode verwenden',
            'recovery_title' => 'Notfallzugang',
            'recovery_text' => 'Gespeicherten Einmalcode eingeben.',
            'recovery_code' => 'Notfallcode',
            'recovery_back' => 'Authenticator verwenden',
            'recovery_save_title' => 'Notfallcodes speichern',
            'recovery_save_text' => 'Offline aufbewahren. Jeder Code gilt einmal.',
            'recovery_copy' => 'Codes kopieren',
            'recovery_copied' => 'Kopiert',
            'recovery_saved' => 'Ich habe sie gespeichert',
        ]
        : [
            'username' => 'Username',
            'username_placeholder' => 'Enter your username',
            'password' => 'Password',
            'password_placeholder' => 'Enter your password',
            'continue' => 'Continue',
            'forgot' => 'Forgot password?',
            'failed_title' => 'Login failed',
            'failed_text' => 'Check your entry and try again.',
            'reset' => 'Your password was updated. You can sign in now.',
            'setup_title' => 'Connect Authenticator',
            'setup_text' => 'Scan this QR once with your Authenticator app.',
            'verify_title' => 'Security code',
            'verify_text' => 'Enter the current 6-digit code from your Authenticator app.',
            'manual_key' => 'Manual setup key',
            'copy' => 'Copy',
            'copied' => 'Copied',
            'code' => '6-digit code',
            'connect' => 'Connect',
            'verify' => 'Verify',
            'workplace_title' => 'Restaurant approval',
            'workplace_text' => 'Enter code or scan QR.',
            'scan' => 'Scan QR',
            'stop_scan' => 'Close camera',
            'camera_unavailable' => 'QR scanning is not available in this browser. Use the 6-digit code instead.',
            'waiting' => 'Or wait for approval.',
            'expired' => 'This request expired. Sign in again.',
            'recovery_use' => 'Use emergency code',
            'recovery_title' => 'Emergency access',
            'recovery_text' => 'Enter one saved one-time code.',
            'recovery_code' => 'Emergency code',
            'recovery_back' => 'Use Authenticator',
            'recovery_save_title' => 'Save emergency codes',
            'recovery_save_text' => 'Keep them offline. Each code works once.',
            'recovery_copy' => 'Copy codes',
            'recovery_copied' => 'Copied',
            'recovery_saved' => 'I saved them',
        ];
@endphp
<!doctype html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Login - PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-login-v10">
    <style>
        :root{--jade:#063f36;--jade-dark:#032d27;--gold:#c89b4a;--line:#e1e9e6;--text:#122321;--muted:#6d7b78;--danger:#b42318}
        *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}
        body{min-height:100vh;min-height:100dvh;overflow:auto;padding:14px;background:radial-gradient(circle at 50% 8%,rgba(200,155,74,.16),transparent 31%),linear-gradient(180deg,#011714 0%,#032c27 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
        .card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(470px,calc(100vw - 28px));max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px);overflow:auto;padding:22px 32px 30px;border:1px solid rgba(200,155,74,.35);border-radius:23px;background:#fff;box-shadow:0 28px 80px rgba(0,25,22,.35)}
        .card.is-security{min-height:560px;padding-top:24px;padding-bottom:34px}
        .lang{position:absolute;right:14px;top:14px;width:43px;height:39px;border:1px solid #dfd1b8;border-radius:11px;background:#fffaf1;color:var(--jade);font:inherit;font-size:12px;font-weight:900;cursor:pointer}
        .brand{height:160px;display:grid;place-items:center;margin:-12px 42px 4px}.brand img{width:260px;max-width:100%;height:154px;object-fit:contain}
        .card.is-security .brand{height:180px;margin:-8px 42px 28px}.card.is-security .brand img{height:166px}
        .form{display:grid;gap:14px}.field{display:grid;gap:6px}.field>span{font-size:11px;font-weight:850}.input{position:relative}.field input{width:100%;height:48px;padding:0 13px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--text);font:inherit;font-size:14px;outline:none}.field input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}.field input[type=password]{padding-right:46px}.toggle{position:absolute;right:5px;top:5px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#74827f;cursor:pointer}.toggle:hover{background:#f2f7f5}
        .submit,.secondary{height:49px;display:flex;align-items:center;justify-content:center;border-radius:13px;font:inherit;font-size:14px;font-weight:900;cursor:pointer;text-decoration:none}.submit{border:1px solid var(--jade);background:var(--jade);color:#fff}.submit:hover{background:var(--jade-dark)}.secondary{border:1px solid var(--line);background:#f8fbfa;color:var(--jade)}
        .forgot{color:var(--jade);font-size:11px;font-weight:800;text-decoration:none}.error{color:var(--danger);font-size:10px;font-weight:750}.success,.notice{margin-bottom:14px;padding:11px 12px;border-radius:12px;font-size:11px;line-height:1.4}.success{border:1px solid #bfe4d4;background:#f1faf6;color:#146948}.notice{border:1px solid #f0c6c1;background:#fff3f2;color:#8b2c25}.notice strong{display:block;margin-bottom:2px}
        .security-head{text-align:center;margin:-2px 0 20px}.security-head h1{margin:0 0 6px;color:#0c2c28;font-size:22px;letter-spacing:-.035em}.security-head p{margin:0 auto;max-width:300px;color:var(--muted);font-size:11px;line-height:1.45}.qrbox{display:grid;place-items:center;min-height:218px;padding:10px;border:1px solid #d3e6e0;border-radius:16px;background:#f5fbf9}.qrbox svg{display:block;width:205px!important;height:205px!important;max-width:100%}.qr-fallback{padding:24px;text-align:center;color:var(--muted);font-size:11px}.code-input{text-align:center;font-size:25px!important;font-weight:900;letter-spacing:.3em;font-variant-numeric:tabular-nums;padding-left:calc(13px + .3em)!important}.secret{border:1px solid var(--line);border-radius:12px;background:#f8fbfa;padding:10px 12px}.secret summary{cursor:pointer;color:#536461;font-size:10px;font-weight:850}.secret-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.secret-row input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.copy{height:48px;padding:0 12px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--jade);font:inherit;font-size:10px;font-weight:900;cursor:pointer}
        .security-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.wait{min-height:18px;text-align:center;color:#71807c;font-size:10px;font-weight:750}.text-action{width:100%;margin-top:13px;padding:5px;border:0;background:transparent;color:#536b65;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.text-action:hover{color:var(--jade);text-decoration:underline}.recovery-panel[hidden]{display:none}.recovery-input{text-align:center;text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:20px!important;font-weight:850;letter-spacing:.12em}.recovery-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.recovery-item{padding:10px 9px;border:1px solid #dce7e4;border-radius:11px;background:#f8fbfa;text-align:center;color:#183a33;font:800 13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.recovery-actions{display:grid;gap:9px}.copy-recovery{height:44px;border:1px solid var(--line);border-radius:12px;background:#f8fbfa;color:var(--jade);font:inherit;font-size:11px;font-weight:900;cursor:pointer}
        .scanner{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:18px;background:rgba(0,22,19,.82);backdrop-filter:blur(7px)}.scanner[hidden]{display:none}.scanner-card{width:min(430px,100%);padding:15px;border-radius:18px;background:#fff}.scanner video{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:13px;background:#071d1a}.scanner-foot{display:grid;gap:9px;margin-top:11px}.scanner-message{color:var(--muted);font-size:11px;text-align:center}
        @media(max-width:540px){body{padding:10px}.card{width:calc(100vw - 18px);max-height:calc(100dvh - 18px);padding:20px 18px 25px;border-radius:20px}.card.is-security{min-height:min(540px,calc(100dvh - 18px));padding-bottom:27px}.brand{height:135px;margin:-5px 38px 3px}.brand img{height:130px}.card.is-security .brand{height:145px;margin:-3px 38px 20px}.card.is-security .brand img{height:138px}.qrbox{min-height:195px}.qrbox svg{width:185px!important;height:185px!important}.security-actions{grid-template-columns:1fr}.recovery-list{grid-template-columns:1fr 1fr}}
    </style>
</head>
<body>
<main class="card{{ $securityActive ? ' is-security' : '' }}" @if($securityMode === 'workplace' && !empty($security['expires_at'])) data-pmd-workplace-login data-expires-at="{{ $security['expires_at'] }}" @endif>
    <button type="button" class="lang" data-lang="{{ $nextLocale }}">{{ strtoupper($nextLocale) }}</button>
    <div class="brand"><img src="{{ asset('app/admin/assets/images/pmd-login-logo.svg') }}?v=pmd-login-v10" alt="PayMyDine"></div>

    @if(input('reset') === 'success')
        <div class="success">{{ $copy['reset'] }}</div>
    @endif

    @if(input('session') === 'work-expired')
        <div class="notice"><strong>Session ended</strong><span>Sign in again.</span></div>
    @endif

    @if(session('error'))
        <div class="notice"><strong>{{ $copy['failed_title'] }}</strong><span>{{ session('error') }}</span></div>
    @endif

    <div id="pmd-login-notice" class="notice" role="alert" aria-live="polite" hidden>
        <strong>{{ $copy['failed_title'] }}</strong><span>{{ $copy['failed_text'] }}</span>
    </div>

    @if(!$securityActive)
        {!! form_open(['id'=>'edit-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onLogin']) !!}
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
            <button type="submit" class="submit" data-attach-loading>{{ $copy['continue'] }}</button>
            <a class="forgot" href="{{ admin_url('login/reset') }}">{{ $copy['forgot'] }}</a>
        {!! form_close() !!}

    @elseif($securityMode === 'setup')
        <section class="security-head"><h1>{{ $copy['setup_title'] }}</h1><p>{{ $copy['setup_text'] }}</p></section>
        <div class="form">
            <div class="qrbox" aria-label="Authenticator QR">
                @if(!empty($security['qr_svg']))
                    {!! $security['qr_svg'] !!}
                @else
                    <div class="qr-fallback">QR unavailable</div>
                @endif
            </div>
            <details class="secret">
                <summary>{{ $copy['manual_key'] }}</summary>
                <div class="secret-row">
                    <input id="pmd-owner-secret" type="text" readonly value="{{ $security['secret'] ?? '' }}" onclick="this.select()">
                    <button class="copy" type="button" data-copy-secret data-copy-label="{{ $copy['copy'] }}" data-copied-label="{{ $copy['copied'] }}">{{ $copy['copy'] }}</button>
                </div>
            </details>
            <form id="pmd-security-form" class="form" method="post" action="{{ admin_url('siteaccess/owner-security/setup-confirm') }}">
                @csrf
                <label class="field">
                    <span>{{ $copy['code'] }}</span>
                    <input class="code-input" data-security-code name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                </label>
                <button type="submit" class="submit">{{ $copy['connect'] }}</button>
            </form>
        </div>

    @elseif($securityMode === 'verify')
        <div data-owner-totp-panel>
            <section class="security-head"><h1>{{ $copy['verify_title'] }}</h1><p>{{ $copy['verify_text'] }}</p></section>
            <form id="pmd-security-form" class="form" method="post" action="{{ admin_url('siteaccess/owner-security/verify') }}">
                @csrf
                <label class="field">
                    <span>{{ $copy['code'] }}</span>
                    <input class="code-input" data-security-code name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                </label>
                <button type="submit" class="submit">{{ $copy['verify'] }}</button>
            </form>
            <button type="button" class="text-action" data-owner-recovery-open>{{ $copy['recovery_use'] }}</button>
        </div>

        <div class="recovery-panel" data-owner-recovery-panel hidden>
            <section class="security-head"><h1>{{ $copy['recovery_title'] }}</h1><p>{{ $copy['recovery_text'] }}</p></section>
            <form class="form" method="post" action="{{ admin_url('siteaccess/owner-security/recover') }}">
                @csrf
                <label class="field">
                    <span>{{ $copy['recovery_code'] }}</span>
                    <input class="recovery-input" data-owner-recovery-input name="recovery_code" type="text" autocomplete="one-time-code" maxlength="9" placeholder="XXXX-XXXX" required>
                </label>
                <button type="submit" class="submit">{{ $copy['continue'] }}</button>
            </form>
            <button type="button" class="text-action" data-owner-recovery-back>{{ $copy['recovery_back'] }}</button>
        </div>

    @elseif($securityMode === 'recovery_codes')
        <section class="security-head"><h1>{{ $copy['recovery_save_title'] }}</h1><p>{{ $copy['recovery_save_text'] }}</p></section>
        <div class="recovery-list" data-owner-recovery-codes>
            @foreach((array)($security['recovery_codes'] ?? []) as $recoveryCode)
                <div class="recovery-item" data-recovery-code>{{ $recoveryCode }}</div>
            @endforeach
        </div>
        <div class="recovery-actions">
            <button type="button" class="copy-recovery" data-copy-recovery data-copy-label="{{ $copy['recovery_copy'] }}" data-copied-label="{{ $copy['recovery_copied'] }}">{{ $copy['recovery_copy'] }}</button>
            <form method="post" action="{{ admin_url('siteaccess/owner-security/recovery-codes-saved') }}">
                @csrf
                <button type="submit" class="submit" style="width:100%">{{ $copy['recovery_saved'] }}</button>
            </form>
        </div>

    @else
        <section class="security-head"><h1>{{ $copy['workplace_title'] }}</h1><p>{{ $copy['workplace_text'] }}</p></section>
        <form id="pmd-workplace-form" method="post" action="{{ admin_url('siteaccess/login-verify') }}" class="form" autocomplete="one-time-code">
            @csrf
            <label class="field">
                <span>{{ $copy['code'] }}</span>
                <input id="pmd-workplace-code" class="code-input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
            </label>
            <div class="security-actions">
                <button type="submit" class="submit">{{ $copy['verify'] }}</button>
                <button type="button" class="secondary" data-pmd-scan>{{ $copy['scan'] }}</button>
            </div>
        </form>
        <div class="wait" data-pmd-workplace-status>{{ $copy['waiting'] }}</div>
    @endif
</main>

<div class="scanner" data-pmd-scanner hidden>
    <div class="scanner-card">
        <video data-pmd-scanner-video playsinline muted></video>
        <div class="scanner-foot">
            <div class="scanner-message" data-pmd-scanner-message></div>
            <button type="button" class="secondary" data-pmd-scan-close>{{ $copy['stop_scan'] }}</button>
        </div>
    </div>
</div>

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
        toggle.textContent = reveal ? '×' : '◉';
    });

    document.querySelectorAll('[data-security-code],#pmd-workplace-code').forEach(function (input) {
        input.addEventListener('input', function () {
            input.value = String(input.value || '').replace(/\D+/g, '').slice(0, 6);
        });
    });

    var recoveryInput = document.querySelector('[data-owner-recovery-input]');
    if (recoveryInput) recoveryInput.addEventListener('input', function () {
        var clean = String(recoveryInput.value || '').toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
        recoveryInput.value = clean.length > 4 ? clean.slice(0, 4) + '-' + clean.slice(4) : clean;
    });

    var ownerTotpPanel = document.querySelector('[data-owner-totp-panel]');
    var ownerRecoveryPanel = document.querySelector('[data-owner-recovery-panel]');
    var recoveryOpen = document.querySelector('[data-owner-recovery-open]');
    var recoveryBack = document.querySelector('[data-owner-recovery-back]');
    if (recoveryOpen && ownerTotpPanel && ownerRecoveryPanel) recoveryOpen.addEventListener('click', function () {
        ownerTotpPanel.hidden = true;
        ownerRecoveryPanel.hidden = false;
        if (recoveryInput) recoveryInput.focus();
    });
    if (recoveryBack && ownerTotpPanel && ownerRecoveryPanel) recoveryBack.addEventListener('click', function () {
        ownerRecoveryPanel.hidden = true;
        ownerTotpPanel.hidden = false;
        var input = ownerTotpPanel.querySelector('[data-security-code]');
        if (input) input.focus();
    });

    var copy = document.querySelector('[data-copy-secret]');
    var secret = document.getElementById('pmd-owner-secret');
    if (copy && secret) copy.addEventListener('click', function () {
        var done = function () {
            copy.textContent = copy.getAttribute('data-copied-label') || 'Copied';
            window.setTimeout(function () {
                copy.textContent = copy.getAttribute('data-copy-label') || 'Copy';
            }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(String(secret.value || '')).then(done).catch(function () { secret.select(); });
        } else {
            secret.select();
        }
    });

    var copyRecovery = document.querySelector('[data-copy-recovery]');
    if (copyRecovery) copyRecovery.addEventListener('click', function () {
        var values = Array.prototype.map.call(document.querySelectorAll('[data-recovery-code]'), function (node) {
            return String(node.textContent || '').trim();
        }).filter(Boolean);
        if (!values.length) return;
        var done = function () {
            copyRecovery.textContent = copyRecovery.getAttribute('data-copied-label') || 'Copied';
            window.setTimeout(function () {
                copyRecovery.textContent = copyRecovery.getAttribute('data-copy-label') || 'Copy codes';
            }, 1300);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(values.join('\n')).then(done).catch(function () {});
        }
    });

    var workplaceRoot = document.querySelector('[data-pmd-workplace-login]');
    if (workplaceRoot) {
        var status = document.querySelector('[data-pmd-workplace-status]');
        var csrfNode = document.querySelector('meta[name="csrf-token"]');
        var csrf = csrfNode ? csrfNode.getAttribute('content') : '';
        var finished = false;

        // PMD_CASHIER_TRUSTED_DEVICE_RESUME_CLIENT_V1
        // Only a Cashier on a remembered Main Restaurant Device can succeed here.
        // 403/409 simply means use the normal code/QR/direct-approval flow.
        function tryCashierResume() {
            if (!csrf || finished) return;
            fetch('{{ admin_url('siteaccess/cashier-resume') }}', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(function (response) {
                if (!response.ok) return null;
                return response.json();
            }).then(function (payload) {
                if (!payload || !payload.ok || !payload.redirect) return;
                finished = true;
                window.location.assign(payload.redirect);
            }).catch(function () {});
        }

        function finalize() {
            if (finished) return;
            finished = true;
            fetch('{{ admin_url('siteaccess/finalize') }}', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(function (response) {
                return response.json();
            }).then(function (payload) {
                if (!payload || !payload.ok) {
                    throw new Error(payload && payload.message ? payload.message : 'Verification failed.');
                }
                window.location.assign(payload.redirect);
            }).catch(function (error) {
                finished = false;
                if (status) status.textContent = error.message || 'Verification failed.';
            });
        }

        function poll() {
            if (finished) return;
            fetch('{{ admin_url('siteaccess/status') }}', {
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(function (response) {
                return response.ok ? response.json() : null;
            }).then(function (payload) {
                if (!payload || !payload.ok) return;
                if (payload.status === 'approved') return finalize();
                if (payload.status === 'declined' || payload.status === 'expired') {
                    if (status) status.textContent = @json($copy['expired']);
                    window.setTimeout(function () {
                        window.location.assign('{{ admin_url('login') }}');
                    }, 700);
                }
            }).catch(function () {});
        }

        tryCashierResume();
        poll();
        window.setInterval(poll, 1600);
    }

    var scanButton = document.querySelector('[data-pmd-scan]');
    var scanner = document.querySelector('[data-pmd-scanner]');
    var video = document.querySelector('[data-pmd-scanner-video]');
    var scannerMessage = document.querySelector('[data-pmd-scanner-message]');
    var closeButton = document.querySelector('[data-pmd-scan-close]');
    var stream = null;
    var scanning = false;

    function stopScanner() {
        scanning = false;
        if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
        stream = null;
        if (video) video.srcObject = null;
        if (scanner) scanner.hidden = true;
    }

    if (closeButton) closeButton.addEventListener('click', stopScanner);

    if (scanButton) scanButton.addEventListener('click', async function () {
        if (!scanner || !video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !('BarcodeDetector' in window)) {
            if (scannerMessage) scannerMessage.textContent = @json($copy['camera_unavailable']);
            if (scanner) scanner.hidden = false;
            return;
        }

        try {
            var formats = await BarcodeDetector.getSupportedFormats();
            if (formats.indexOf('qr_code') === -1) throw new Error('qr');
            var detector = new BarcodeDetector({formats:['qr_code']});
            stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
            video.srcObject = stream;
            await video.play();
            scanner.hidden = false;
            scanning = true;
            if (scannerMessage) scannerMessage.textContent = '';

            var detect = async function () {
                if (!scanning) return;
                try {
                    var codes = await detector.detect(video);
                    if (codes && codes.length) {
                        var raw = String(codes[0].rawValue || '').replace(/\D+/g, '').slice(0, 6);
                        if (/^[0-9]{6}$/.test(raw)) {
                            var input = document.getElementById('pmd-workplace-code');
                            var form = document.getElementById('pmd-workplace-form');
                            if (input) input.value = raw;
                            stopScanner();
                            if (form) {
                                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                                else form.submit();
                            }
                            return;
                        }
                    }
                } catch (error) {}
                window.setTimeout(detect, 250);
            };
            detect();
        } catch (error) {
            if (scannerMessage) scannerMessage.textContent = @json($copy['camera_unavailable']);
            if (scanner) scanner.hidden = false;
        }
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
