@php
    // PMD_PORTAL_MFA_LOGIN_VIEW_V1
    $security = isset($pmdPortalSecurity) && is_array($pmdPortalSecurity)
        ? $pmdPortalSecurity
        : [];
    $mode = (string)($security['mode'] ?? 'verify');
    $setup = $mode === 'setup';
    $locale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $locale = in_array($locale, ['en', 'de'], true) ? $locale : 'en';
    $nextLocale = $locale === 'de' ? 'en' : 'de';

    $copy = $locale === 'de'
        ? [
            'back' => 'Zurück',
            'eyebrow' => 'Mitarbeiterportal',
            'setup_title' => 'Deinen Authenticator verbinden',
            'setup_text' => 'Scanne diesen QR-Code einmal mit deinem eigenen Smartphone. Diese Anmeldung gehört nur zu deinem Portal-Konto.',
            'verify_title' => 'Portal-Sicherheitscode',
            'verify_text' => 'Gib den aktuellen 6-stelligen Code aus deiner persönlichen Authenticator-App ein.',
            'manual' => 'Manueller Schlüssel',
            'copy' => 'Kopieren',
            'copied' => 'Kopiert',
            'code' => '6-stelliger Code',
            'connect' => 'Verbinden & Portal öffnen',
            'verify' => 'Portal öffnen',
            'failed' => 'Sicherheitsprüfung fehlgeschlagen',
            'failed_text' => 'Prüfe den Code und versuche es erneut.',
            'note' => 'Keine Freigabe durch Restaurant-Admin erforderlich.',
        ]
        : [
            'back' => 'Back',
            'eyebrow' => 'Staff Portal',
            'setup_title' => 'Connect your Authenticator',
            'setup_text' => 'Scan this QR once with your own phone. This Authenticator belongs only to your personal Portal account.',
            'verify_title' => 'Portal security code',
            'verify_text' => 'Enter the current 6-digit code from your personal Authenticator app.',
            'manual' => 'Manual setup key',
            'copy' => 'Copy',
            'copied' => 'Copied',
            'code' => '6-digit code',
            'connect' => 'Connect & open Portal',
            'verify' => 'Open Portal',
            'failed' => 'Security check failed',
            'failed_text' => 'Check the code and try again.',
            'note' => 'No restaurant Admin approval is required.',
        ];
@endphp
<!doctype html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Staff Portal Security - PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-portal-mfa-v1">
    <style>
        :root{--jade:#0f6f59;--jade-dark:#095443;--line:#dfe9e6;--text:#142824;--muted:#71817d;--danger:#b42318;--gold:#c89b4a;--content:356px}
        *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}
        body{min-height:100vh;min-height:100dvh;padding:14px;overflow:auto;background:radial-gradient(circle at 50% 8%,rgba(200,155,74,.15),transparent 31%),linear-gradient(180deg,#011714 0%,#032c27 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
        .card{position:relative;width:min(470px,calc(100vw - 28px));min-height:570px;margin:max(14px,calc((100dvh - 650px)/2)) auto;padding:24px 32px 32px;border:1px solid rgba(200,155,74,.34);border-radius:23px;background:#fff;box-shadow:0 28px 80px rgba(0,25,22,.35)}
        .top{position:absolute;left:14px;right:14px;top:14px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.back,.lang{pointer-events:auto;width:43px;height:39px;border:1px solid #dfd1b8;border-radius:11px;background:#fffaf1;color:#0b5e4c;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.back{display:grid;place-items:center}.back svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lang:hover,.back:hover{background:#fff5e5}
        .brand{height:150px;display:grid;place-items:center;margin:0 42px 24px}.brand img{width:255px;max-width:100%;height:142px;object-fit:contain}
        .head,.form,.notice,.portal-note{width:min(var(--content),100%);margin-left:auto;margin-right:auto}.head{text-align:center;margin-bottom:20px}.eyebrow{display:inline-flex;margin-bottom:9px;padding:5px 9px;border:1px solid #cfe4dd;border-radius:999px;background:#f2faf7;color:#24745f;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.head h1{margin:0 0 8px;color:#0c2c28;font-size:23px;letter-spacing:-.035em}.head p{margin:0 auto;max-width:330px;color:var(--muted);font-size:13px;line-height:1.5}
        .form{display:grid;gap:13px}.qrbox{display:grid;place-items:center;min-height:218px;padding:10px;border:1px solid #d3e6e0;border-radius:16px;background:#f5fbf9}.qrbox svg{display:block;width:205px!important;height:205px!important;max-width:100%}.qr-fallback{padding:24px;text-align:center;color:var(--muted);font-size:12px}.secret{border:1px solid var(--line);border-radius:12px;background:#f8fbfa;padding:10px 12px}.secret summary{cursor:pointer;color:#536461;font-size:12px;font-weight:850}.secret-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.secret-row input{min-width:0;height:44px;padding:0 10px;border:1px solid var(--line);border-radius:11px;background:#fff;color:#263d38;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.copy{height:44px;padding:0 12px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--jade);font:inherit;font-size:11px;font-weight:900;cursor:pointer}
        .field{display:grid;gap:7px}.field>span{font-size:13px;font-weight:850}.code{width:100%;height:48px;padding:0 13px 0 calc(13px + .30em);border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--text);outline:none;text-align:center;font:900 25px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.30em;font-variant-numeric:tabular-nums}.code:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}
        .submit{height:48px;border:1px solid var(--jade);border-radius:13px;background:var(--jade);color:#fff;font:inherit;font-size:14px;font-weight:900;cursor:pointer}.submit:hover{background:var(--jade-dark)}.portal-note{margin-top:13px;text-align:center;color:#71807c;font-size:11px;font-weight:750}.notice{margin-bottom:14px;padding:11px 12px;border:1px solid #f0c6c1;border-radius:12px;background:#fff3f2;color:#8b2c25;font-size:12.5px;line-height:1.45}.notice strong{display:block;margin-bottom:2px}.error{color:var(--danger);font-size:11.5px;font-weight:750}
        @media(max-width:540px){body{padding:9px}.card{width:calc(100vw - 18px);min-height:calc(100dvh - 18px);margin:0 auto;padding:21px 18px 27px;border-radius:20px}.brand{height:137px;margin:4px 38px 21px}.brand img{height:132px}.qrbox{min-height:195px}.qrbox svg{width:185px!important;height:185px!important}.head p{font-size:12.5px}}
    </style>
</head>
<body>
<main class="card">
    <div class="top">
        <form data-request="onPortalMfaCancel" method="post">
            @csrf
            <button class="back" type="submit" aria-label="{{ $copy['back'] }}" title="{{ $copy['back'] }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
        </form>
        <button type="button" class="lang" data-lang="{{ $nextLocale }}">{{ strtoupper($nextLocale) }}</button>
    </div>

    <div class="brand"><img src="/brand/paymydine-logo.svg" alt="PayMyDine"></div>

    @if(session('error'))
        <div class="notice"><strong>{{ $copy['failed'] }}</strong><span>{{ session('error') }}</span></div>
    @endif
    <div id="pmd-portal-mfa-notice" class="notice" role="alert" aria-live="polite" hidden>
        <strong>{{ $copy['failed'] }}</strong><span>{{ $copy['failed_text'] }}</span>
    </div>

    <section class="head">
        <span class="eyebrow">{{ $copy['eyebrow'] }}</span>
        <h1>{{ $setup ? $copy['setup_title'] : $copy['verify_title'] }}</h1>
        <p>{{ $setup ? $copy['setup_text'] : $copy['verify_text'] }}</p>
    </section>

    <div class="form">
        @if($setup)
            <div class="qrbox" aria-label="Portal Authenticator QR">
                @if(!empty($security['qr_svg']))
                    {!! $security['qr_svg'] !!}
                @else
                    <div class="qr-fallback">QR unavailable</div>
                @endif
            </div>
            <details class="secret">
                <summary>{{ $copy['manual'] }}</summary>
                <div class="secret-row">
                    <input id="pmd-portal-secret" type="text" readonly value="{{ $security['secret'] ?? '' }}" onclick="this.select()">
                    <button class="copy" type="button" data-copy-secret data-copy-label="{{ $copy['copy'] }}" data-copied-label="{{ $copy['copied'] }}">{{ $copy['copy'] }}</button>
                </div>
            </details>
        @endif

        {!! form_open([
            'id' => 'pmd-portal-mfa-form',
            'class' => 'form',
            'role' => 'form',
            'method' => 'POST',
            'data-request' => $setup ? 'onPortalMfaConfirm' : 'onPortalMfaVerify',
        ]) !!}
            <label class="field">
                <span>{{ $copy['code'] }}</span>
                <input class="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                {!! form_error('code', '<small class="error">', '</small>') !!}
            </label>
            <button type="submit" class="submit" data-attach-loading>{{ $setup ? $copy['connect'] : $copy['verify'] }}</button>
        {!! form_close() !!}
    </div>

    <div class="portal-note">{{ $copy['note'] }}</div>
</main>

<script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin.js') }}"></script>
<script>
(function () {
    'use strict';

    var lang = document.querySelector('[data-lang]');
    if (lang) lang.addEventListener('click', function () {
        var code = String(lang.getAttribute('data-lang') || '').toLowerCase();
        if (code !== 'en' && code !== 'de') return;
        var cookie = 'pmd_admin_locale=' + encodeURIComponent(code) + '; Path=/; Max-Age=31536000; SameSite=Lax';
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
        window.location.reload();
    });

    var codeInput = document.querySelector('input[name="code"]');
    if (codeInput) codeInput.addEventListener('input', function () {
        codeInput.value = String(codeInput.value || '').replace(/\D+/g, '').slice(0, 6);
    });

    var copy = document.querySelector('[data-copy-secret]');
    var secret = document.getElementById('pmd-portal-secret');
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

    if (window.jQuery) {
        var notice = document.getElementById('pmd-portal-mfa-notice');
        var form = window.jQuery('#pmd-portal-mfa-form');
        if (form.length && notice) {
            var show = function (message) {
                var span = notice.querySelector('span');
                if (span && message) span.textContent = message;
                notice.hidden = false;
            };
            form.on('ajaxFail ajaxError ajaxInvalidField', function () { show(); });
            window.jQuery(document).on('ajaxErrorMessage', function (event, message) {
                if (event && event.preventDefault) event.preventDefault();
                show(message);
            });
        }
    }
})();
</script>
</body>
</html>
