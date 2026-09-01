@php
    // PMD_PORTAL_MFA_LOGIN_VIEW_V2
    $security = isset($pmdPortalSecurity) && is_array($pmdPortalSecurity)
        ? $pmdPortalSecurity
        : [];
    $mode = (string)($security['mode'] ?? 'verify');
    $setup = $mode === 'setup';
    $verify = $mode === 'verify';
    $recover = $mode === 'recover';
    $showRecoveryCodes = $mode === 'recovery_codes';

    $locale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $locale = in_array($locale, ['en', 'de'], true) ? $locale : 'en';
    $nextLocale = $locale === 'de' ? 'en' : 'de';

    $copy = $locale === 'de'
        ? [
            'back' => 'Zurück',
            'eyebrow' => 'Mitarbeiterportal',
            'setup_title' => 'Deinen Authenticator verbinden',
            'setup_text' => 'Scanne diesen QR-Code einmal mit deinem eigenen Smartphone. Dieser Authenticator gehört zu deinem persönlichen Portal-Konto.',
            'verify_title' => 'Portal-Sicherheitscode',
            'verify_text' => 'Gib den aktuellen 6-stelligen Code aus deiner persönlichen Authenticator-App ein.',
            'recover_title' => 'Authenticator wiederherstellen',
            'recover_text' => 'Gib einen deiner persönlichen Wiederherstellungscodes ein. Der alte Authenticator wird danach sofort ungültig und du verbindest einen neuen.',
            'codes_title' => 'Wiederherstellungscodes speichern',
            'codes_text' => 'Speichere diese Codes an einem sicheren Ort. Jeder Code funktioniert nur einmal. Sie werden danach nicht noch einmal angezeigt.',
            'manual' => 'Manueller Schlüssel',
            'reveal' => 'Anzeigen',
            'hide' => 'Verbergen',
            'copy' => 'Kopieren',
            'copy_all' => 'Alle kopieren',
            'copied' => 'Kopiert',
            'code' => '6-stelliger Code',
            'recovery_code' => 'Wiederherstellungscode',
            'connect' => 'Verbinden & Portal öffnen',
            'verify' => 'Portal öffnen',
            'lost_phone' => 'Telefon verloren oder Authenticator nicht verfügbar?',
            'use_recovery' => 'Wiederherstellungscode verwenden',
            'back_verify' => 'Zurück zum Authenticator-Code',
            'saved_codes' => 'Ich habe die Codes sicher gespeichert',
            'failed' => 'Sicherheitsprüfung fehlgeschlagen',
            'failed_text' => 'Prüfe den Code und versuche es erneut.',
            'note' => 'Keine Freigabe durch Restaurant-Admin erforderlich.',
            'one_account' => 'Ein persönlicher Authenticator gilt für dieses Portal-Konto auch über mehrere Restaurant-Standorte hinweg.',
        ]
        : [
            'back' => 'Back',
            'eyebrow' => 'Staff Portal',
            'setup_title' => 'Connect your Authenticator',
            'setup_text' => 'Scan this QR once with your own phone. This Authenticator belongs to your personal Portal account.',
            'verify_title' => 'Portal security code',
            'verify_text' => 'Enter the current 6-digit code from your personal Authenticator app.',
            'recover_title' => 'Recover your Authenticator',
            'recover_text' => 'Enter one of your personal recovery codes. Your old Authenticator is revoked immediately and you will connect a new one.',
            'codes_title' => 'Save your recovery codes',
            'codes_text' => 'Store these somewhere safe. Each code works once. These codes will not be shown again after you continue.',
            'manual' => 'Manual setup key',
            'reveal' => 'Reveal',
            'hide' => 'Hide',
            'copy' => 'Copy',
            'copy_all' => 'Copy all',
            'copied' => 'Copied',
            'code' => '6-digit code',
            'recovery_code' => 'Recovery code',
            'connect' => 'Connect & open Portal',
            'verify' => 'Open Portal',
            'lost_phone' => 'Lost your phone or cannot access Authenticator?',
            'use_recovery' => 'Use a recovery code',
            'back_verify' => 'Back to Authenticator code',
            'saved_codes' => 'I saved these codes securely',
            'failed' => 'Security check failed',
            'failed_text' => 'Check the code and try again.',
            'note' => 'No restaurant Admin approval is required.',
            'one_account' => 'One personal Authenticator follows this Portal account across restaurant locations.',
        ];
@endphp
<!doctype html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="referrer" content="no-referrer">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, private">
    <meta http-equiv="Pragma" content="no-cache">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Staff Portal Security - PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-portal-mfa-v2">
    <style>
        :root{--jade:#0f6f59;--jade-dark:#095443;--line:#dfe9e6;--text:#142824;--muted:#71817d;--danger:#b42318;--gold:#c89b4a;--content:356px}
        *{box-sizing:border-box}
        html{margin:0;width:100%;min-height:100%;background:#011714}
        body{margin:0;width:100%;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:12px;overflow:hidden;background:radial-gradient(circle at 50% 8%,rgba(200,155,74,.14),transparent 29%),linear-gradient(180deg,#011714 0%,#032c27 100%);background-attachment:fixed;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
        .card{position:relative;width:min(450px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:16px 28px 19px;border:1px solid rgba(200,155,74,.34);border-radius:22px;background:#fff;box-shadow:0 28px 80px rgba(0,25,22,.35)}
        .top{position:absolute;left:13px;right:13px;top:13px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
        .back,.lang{pointer-events:auto;width:40px;height:36px;border:1px solid #dfd1b8;border-radius:10px;background:#fffaf1;color:#0b5e4c;font:inherit;font-size:11px;font-weight:900;cursor:pointer}
        .back{display:grid;place-items:center}.back svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lang:hover,.back:hover{background:#fff5e5}
        .brand{height:88px;display:grid;place-items:center;margin:0 52px 5px}.brand img{width:178px;max-width:100%;height:84px;object-fit:contain}
        .head,.form,.notice,.portal-note,.account-note{width:min(var(--content),100%);margin-left:auto;margin-right:auto}.head{text-align:center;margin-bottom:11px}.eyebrow{display:inline-flex;margin-bottom:6px;padding:4px 8px;border:1px solid #cfe4dd;border-radius:999px;background:#f2faf7;color:#24745f;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.head h1{margin:0 0 5px;color:#0c2c28;font-size:20px;line-height:1.12;letter-spacing:-.035em}.head p{margin:0 auto;max-width:335px;color:var(--muted);font-size:12px;line-height:1.4}
        .form{display:grid;gap:9px}.qrbox{display:grid;place-items:center;min-height:172px;padding:7px;border:1px solid #d3e6e0;border-radius:15px;background:#f5fbf9}.qrbox svg{display:block;width:168px!important;height:168px!important;max-width:100%}.qr-fallback{padding:20px;text-align:center;color:var(--danger);font-size:12px}
        .secret{border:1px solid var(--line);border-radius:11px;background:#f8fbfa;padding:8px 10px}.secret summary{cursor:pointer;color:#536461;font-size:11px;font-weight:850}.secret-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;margin-top:7px}.secret-row input{min-width:0;height:38px;padding:0 9px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#263d38;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.mini{height:38px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--jade);font:inherit;font-size:10px;font-weight:900;cursor:pointer}
        .field{display:grid;gap:5px}.field>span{font-size:12px;font-weight:850}.code,.recovery-input{width:100%;height:44px;padding:0 13px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--text);outline:none;text-align:center;font:900 22px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}.code{padding-left:calc(13px + .28em);letter-spacing:.28em}.recovery-input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;letter-spacing:.08em;text-transform:uppercase}.code:focus,.recovery-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}
        .submit{height:44px;border:1px solid var(--jade);border-radius:12px;background:var(--jade);color:#fff;font:inherit;font-size:13px;font-weight:900;cursor:pointer}.submit:hover{background:var(--jade-dark)}.secondary{width:100%;height:40px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--jade);font:inherit;font-size:11px;font-weight:900;cursor:pointer}.recovery-help{margin:0;text-align:center;color:var(--muted);font-size:10.5px;line-height:1.35}
        .codes{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:10px;border:1px solid #d3e6e0;border-radius:14px;background:#f5fbf9}.codes code{display:grid;place-items:center;min-height:38px;border:1px solid #dfe9e6;border-radius:9px;background:#fff;color:#173b34;font:800 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.account-note{margin-top:8px;text-align:center;color:#81918d;font-size:9.5px;line-height:1.35}.portal-note{margin-top:8px;text-align:center;color:#71807c;font-size:10px;font-weight:750}.notice{margin-bottom:9px;padding:9px 10px;border:1px solid #f0c6c1;border-radius:11px;background:#fff3f2;color:#8b2c25;font-size:11.5px;line-height:1.4}.notice strong{display:block;margin-bottom:2px}.error{color:var(--danger);font-size:10.5px;font-weight:750}
        @media(max-height:650px) and (min-width:541px){body{padding:7px}.card{max-height:calc(100dvh - 14px);padding:12px 25px 14px}.brand{height:64px;margin-bottom:1px}.brand img{height:62px;width:145px}.head{margin-bottom:7px}.head h1{font-size:18px}.head p{font-size:10.5px}.qrbox{min-height:140px}.qrbox svg{width:136px!important;height:136px!important}.form{gap:6px}.portal-note,.account-note{margin-top:5px}}
        @media(max-width:540px){html{min-height:100%;background:#011714}body{display:block;min-height:100dvh;padding:8px;overflow:auto;background-attachment:scroll}.card{width:100%;max-height:none;min-height:calc(100dvh - 16px);margin:0 auto;padding:16px 17px 22px;border-radius:19px}.brand{height:79px;margin:0 42px 5px}.brand img{height:76px}.qrbox{min-height:165px}.qrbox svg{width:160px!important;height:160px!important}.codes{grid-template-columns:1fr}}
    </style>
</head>
<body>
<main class="card">
    <div class="top">
        <form data-request="onPortalMfaCancel" method="post">@csrf<button class="back" type="submit" aria-label="{{ $copy['back'] }}" title="{{ $copy['back'] }}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button></form>
        <button type="button" class="lang" data-lang="{{ $nextLocale }}">{{ strtoupper($nextLocale) }}</button>
    </div>

    <div class="brand"><img src="/brand/paymydine-logo.svg" alt="PayMyDine"></div>

    @if(session('error'))<div class="notice"><strong>{{ $copy['failed'] }}</strong><span>{{ session('error') }}</span></div>@endif
    <div id="pmd-portal-mfa-notice" class="notice" role="alert" aria-live="polite" hidden><strong>{{ $copy['failed'] }}</strong><span>{{ $copy['failed_text'] }}</span></div>

    <section class="head">
        <span class="eyebrow">{{ $copy['eyebrow'] }}</span>
        <h1>{{ $setup ? $copy['setup_title'] : ($verify ? $copy['verify_title'] : ($recover ? $copy['recover_title'] : $copy['codes_title'])) }}</h1>
        <p>{{ $setup ? $copy['setup_text'] : ($verify ? $copy['verify_text'] : ($recover ? $copy['recover_text'] : $copy['codes_text'])) }}</p>
    </section>

    @if($setup)
        <div class="form">
            <div class="qrbox" aria-label="Portal Authenticator QR">@if(!empty($security['qr_svg'])){!! $security['qr_svg'] !!}@else<div class="qr-fallback">QR unavailable — use the manual key below.</div>@endif</div>
            <details class="secret"><summary>{{ $copy['manual'] }}</summary><div class="secret-row"><input id="pmd-portal-secret" type="password" readonly autocomplete="off" autocapitalize="off" spellcheck="false" value="{{ $security['manual_secret'] ?? '' }}" onclick="this.select()"><button class="mini" type="button" data-reveal-secret data-reveal-label="{{ $copy['reveal'] }}" data-hide-label="{{ $copy['hide'] }}">{{ $copy['reveal'] }}</button><button class="mini" type="button" data-copy-secret data-copy-label="{{ $copy['copy'] }}" data-copied-label="{{ $copy['copied'] }}">{{ $copy['copy'] }}</button></div></details>
            {!! form_open(['id'=>'pmd-portal-mfa-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onPortalMfaConfirm']) !!}<label class="field"><span>{{ $copy['code'] }}</span><input class="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>{!! form_error('code', '<small class="error">', '</small>') !!}</label><button type="submit" class="submit" data-attach-loading>{{ $copy['connect'] }}</button>{!! form_close() !!}
            <div class="account-note">{{ $copy['one_account'] }}</div>
        </div>
    @elseif($verify)
        <div class="form">
            {!! form_open(['id'=>'pmd-portal-mfa-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onPortalMfaVerify']) !!}<label class="field"><span>{{ $copy['code'] }}</span><input class="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>{!! form_error('code', '<small class="error">', '</small>') !!}</label><button type="submit" class="submit" data-attach-loading>{{ $copy['verify'] }}</button>{!! form_close() !!}
            <p class="recovery-help">{{ $copy['lost_phone'] }}</p><form data-request="onPortalMfaBeginRecovery" method="post">@csrf<button type="submit" class="secondary">{{ $copy['use_recovery'] }}</button></form>
        </div>
    @elseif($recover)
        <div class="form">
            {!! form_open(['id'=>'pmd-portal-mfa-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onPortalMfaRecover']) !!}<label class="field"><span>{{ $copy['recovery_code'] }}</span><input class="recovery-input" name="recovery_code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="ABCDE-23456" required autofocus>{!! form_error('recovery_code', '<small class="error">', '</small>') !!}</label><button type="submit" class="submit" data-attach-loading>{{ $copy['use_recovery'] }}</button>{!! form_close() !!}
            <form data-request="onPortalMfaBackToVerify" method="post">@csrf<button type="submit" class="secondary">{{ $copy['back_verify'] }}</button></form>
        </div>
    @elseif($showRecoveryCodes)
        <div class="form">
            <div class="codes" id="pmd-portal-recovery-codes">@foreach(($security['recovery_codes'] ?? []) as $code)<code>{{ $code }}</code>@endforeach</div>
            <button class="secondary" type="button" data-copy-recovery data-copy-label="{{ $copy['copy_all'] }}" data-copied-label="{{ $copy['copied'] }}">{{ $copy['copy_all'] }}</button>
            <form data-request="onPortalMfaRecoveryCodesContinue" method="post">@csrf<button type="submit" class="submit">{{ $copy['saved_codes'] }}</button></form>
        </div>
    @endif

    <div class="portal-note">{{ $copy['note'] }}</div>
</main>

<script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin.js') }}"></script>
<script>
(function(){'use strict';
var lang=document.querySelector('[data-lang]');if(lang)lang.addEventListener('click',function(){var code=String(lang.getAttribute('data-lang')||'').toLowerCase();if(code!=='en'&&code!=='de')return;var cookie='pmd_admin_locale='+encodeURIComponent(code)+'; Path=/; Max-Age=31536000; SameSite=Lax';if(window.location.protocol==='https:')cookie+='; Secure';document.cookie=cookie;window.location.reload();});
var codeInput=document.querySelector('input[name="code"]');if(codeInput)codeInput.addEventListener('input',function(){codeInput.value=String(codeInput.value||'').replace(/\D+/g,'').slice(0,6);});
var recoveryInput=document.querySelector('input[name="recovery_code"]');if(recoveryInput)recoveryInput.addEventListener('input',function(){var value=String(recoveryInput.value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);recoveryInput.value=value.length>5?value.slice(0,5)+'-'+value.slice(5):value;});
var secret=document.getElementById('pmd-portal-secret'),reveal=document.querySelector('[data-reveal-secret]');if(secret&&reveal)reveal.addEventListener('click',function(){var hidden=secret.type==='password';secret.type=hidden?'text':'password';reveal.textContent=hidden?(reveal.getAttribute('data-hide-label')||'Hide'):(reveal.getAttribute('data-reveal-label')||'Reveal');});
var copy=document.querySelector('[data-copy-secret]');if(copy&&secret)copy.addEventListener('click',function(){copyText(String(secret.value||''),copy);});var copyRecovery=document.querySelector('[data-copy-recovery]');if(copyRecovery)copyRecovery.addEventListener('click',function(){var values=Array.prototype.map.call(document.querySelectorAll('#pmd-portal-recovery-codes code'),function(node){return String(node.textContent||'').trim();}).filter(Boolean);copyText(values.join('\n'),copyRecovery);});
function copyText(text,button){var done=function(){button.textContent=button.getAttribute('data-copied-label')||'Copied';window.setTimeout(function(){button.textContent=button.getAttribute('data-copy-label')||'Copy';},1200);};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done).catch(function(){});}
if(window.jQuery){var notice=document.getElementById('pmd-portal-mfa-notice'),form=window.jQuery('#pmd-portal-mfa-form');if(form.length&&notice){var show=function(message){var span=notice.querySelector('span');if(span&&message)span.textContent=message;notice.hidden=false;};form.on('ajaxFail ajaxError ajaxInvalidField',function(){show();});window.jQuery(document).on('ajaxErrorMessage',function(event,message){if(event&&event.preventDefault)event.preventDefault();show(message);});}}
})();
</script>
</body>
</html>