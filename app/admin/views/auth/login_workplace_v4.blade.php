@php
    // PMD_LOGIN_PIN_STABLE_MODE_V15
    // PMD_LOGIN_PIN_DEVICE_ENROLLMENT_CTA_V14
    // PMD_LOGIN_PIN_MODE_SWITCH_V13
    // PMD_LOGIN_WORKPLACE_V12
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

    // PMD_STAFF_QUICK_PIN_LOGIN_VIEW_V1
    // Quick PIN is the default Staff surface on a trusted restaurant terminal.
    // It remains visible even before the first employee PIN is configured so the
    // POS login experience is stable from day one. Remote/untrusted browsers keep
    // full username/password as their primary surface.
    $pinLoginAvailable = false;
    $hasMobileHandoff = request()->filled(\App\Services\PmdMobileSync\PmdMobilePairingService::HANDOFF_PARAM);
    // PMD_LOGIN_PIN_PAIRING_SESSION_BOUNDARY_V13B
    // The PIN controller blocks both an explicit handoff and a session with
    // a live signed mobile-pairing intent. The view must enforce both, too.
    if (!$hasMobileHandoff) {
        try {
            $hasMobileHandoff = app(\App\Services\PmdMobileSync\PmdMobilePairingService::class)
                ->hasFreshIntent(request());
        } catch (\Throwable $error) {
            // The server will still reject PIN authentication during pairing.
        }
    }
    if (!$securityActive && !$hasMobileHandoff) {
        try {
            $siteAccess = app(\App\Services\PmdSiteAccessService::class);
            $pinLoginAvailable = $siteAccess->ready()
                && (bool)$siteAccess->currentHub(request());
        } catch (\Throwable $error) {
            $pinLoginAvailable = false;
        }
    }
    $requestedLoginMode = strtolower(trim((string)request()->input('mode', '')));
    // Honor an explicit PIN mode even if the hub cookie is unavailable,
    // so a failed PIN attempt never silently falls back to Password.
    // Authentication remains restricted to a verified site hub.
    $pinDefault = !$securityActive && !$hasMobileHandoff
        && ($requestedLoginMode === 'pin'
            || ($pinLoginAvailable && $requestedLoginMode !== 'password'));

    app()->setLocale($locale);
    if (app()->bound('translator.localization')) {
        app('translator.localization')->setLocale($locale, false);
    }

    $nextLocale = $locale === 'de' ? 'en' : 'de';
    $copy = $locale === 'de'
        ? [
            'back' => 'Zurück',
            'username' => 'Benutzername',
            'username_placeholder' => 'Benutzername eingeben',
            'password' => 'Passwort',
            'password_placeholder' => 'Passwort eingeben',
            'pin_title' => 'Mitarbeiter-PIN',
            'pin_text' => '6-stellige Quick PIN eingeben.',
            'pin_label' => '6-stellige PIN',
            'pin_submit' => 'Anmelden',
            'use_password' => 'Mit Benutzername & Passwort',
            'use_pin' => 'Mitarbeiter-PIN',
            'pin_switch_subtitle' => 'Schnell mit 6 Ziffern anmelden',
            'pin_failure' => 'PIN-Anmeldung nicht abgeschlossen. PIN und Gerätefreigabe prüfen.',
            'pin_clear' => 'Löschen',
            'pin_delete' => 'Letzte Ziffer löschen',
            'pin_setup' => 'PIN auf diesem Gerät aktivieren',
            'continue' => 'Weiter',
            'forgot' => 'Passwort vergessen?',
            'reset_title' => 'Passwort zurücksetzen',
            'reset_help' => 'E-Mail-Adresse eingeben. Wir senden einen Link zum Zurücksetzen.',
            'reset_email' => 'E-Mail-Adresse',
            'reset_email_placeholder' => 'Deine E-Mail-Adresse',
            'reset_send' => 'Link zum Zurücksetzen senden',
            'reset_sent' => 'Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhältst du eine Nachricht mit weiteren Schritten.',
            'reset_failed' => 'Die Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.',
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
            'recovery_use' => 'Kein Zugriff auf Authenticator? Notfallcode verwenden',
            'recovery_title' => 'Notfallzugang',
            'recovery_text' => 'Gib einen gespeicherten Einmalcode ein. Dein Handy wird dafür nicht benötigt.',
            'recovery_code' => 'Notfallcode',
            'recovery_back' => 'Authenticator verwenden',
            'recovery_save_title' => 'Notfallcodes speichern',
            'recovery_save_text' => '',
            'recovery_copy' => 'Codes kopieren',
            'recovery_copied' => 'Kopiert',
            'recovery_saved' => 'Ich habe sie gespeichert',
        ]
        : [
            'back' => 'Back',
            'username' => 'Username',
            'username_placeholder' => 'Enter your username',
            'password' => 'Password',
            'password_placeholder' => 'Enter your password',
            'pin_title' => 'Staff PIN',
            'pin_text' => 'Enter your 6-digit Quick PIN.',
            'pin_label' => '6-digit PIN',
            'pin_submit' => 'Sign in',
            'use_password' => 'Sign in with username & password',
            'use_pin' => 'Staff PIN',
            'pin_switch_subtitle' => 'Quick sign-in with 6 digits',
            'pin_failure' => 'PIN sign-in did not complete. Check the PIN and device approval.',
            'pin_clear' => 'Clear',
            'pin_delete' => 'Delete last digit',
            'pin_setup' => 'Enable PIN on this device',
            'continue' => 'Continue',
            'forgot' => 'Forgot password?',
            'reset_title' => 'Reset your password',
            'reset_help' => 'Enter your email address to receive a password reset link.',
            'reset_email' => 'Email address',
            'reset_email_placeholder' => 'Your email address',
            'reset_send' => 'Send reset link',
            'reset_sent' => 'If an account exists for this email, reset instructions will be sent.',
            'reset_failed' => 'Unable to send your request. Please try again.',
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
            'recovery_use' => "Can't access Authenticator? Use an emergency code",
            'recovery_title' => 'Emergency access',
            'recovery_text' => 'Enter one of your saved single-use emergency codes. No phone is needed.',
            'recovery_code' => 'Emergency code',
            'recovery_back' => 'Use Authenticator',
            'recovery_save_title' => 'Save emergency codes',
            'recovery_save_text' => '',
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
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-login-v12">
    <style>
        :root{--jade:#063f36;--jade-dark:#032d27;--gold:#c89b4a;--line:#e1e9e6;--text:#122321;--muted:#6d7b78;--danger:#b42318;--content:350px}
        *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}
        body{min-height:100vh;min-height:100dvh;overflow:auto;padding:14px;background:radial-gradient(circle at 50% 8%,rgba(200,155,74,.16),transparent 31%),linear-gradient(180deg,#011714 0%,#032c27 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
        .card{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(470px,calc(100vw - 28px));max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px);overflow:auto;padding:24px 32px 32px;border:1px solid rgba(200,155,74,.35);border-radius:23px;background:#fff;box-shadow:0 28px 80px rgba(0,25,22,.35)}
        .card.is-security{min-height:590px;padding-top:26px;padding-bottom:36px}
        .lang,.back{width:43px;height:39px;border:1px solid #dfd1b8;border-radius:11px;background:#fffaf1;color:var(--jade);font:inherit;font-size:12px;font-weight:900;cursor:pointer}.lang{position:absolute;right:14px;top:14px}.back-form{position:absolute;left:14px;top:14px;margin:0}.back{display:grid;place-items:center;padding:0}.back svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lang:hover,.back:hover{background:#fff5e5}
        .brand{height:166px;display:grid;place-items:center;margin:-8px 42px 24px}.brand img{width:260px;max-width:100%;height:156px;object-fit:contain}
        .card.is-security .brand{height:178px;margin:-6px 42px 40px}.card.is-security .brand img{height:166px}
        .form,.security-head,.recovery-list,.recovery-actions,.wait{width:min(var(--content),100%);margin-left:auto;margin-right:auto}
        .form{display:grid;gap:14px}.field{display:grid;gap:7px}.field>span{font-size:13px;font-weight:850}.input{position:relative}.field input{width:100%;height:46px;padding:0 13px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--text);font:inherit;font-size:15px;outline:none}.field input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,155,74,.13)}.field input[type=password]{padding-right:44px}.toggle{position:absolute;right:4px;top:4px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#74827f;cursor:pointer}.toggle:hover{background:#f2f7f5}
        .submit,.secondary{height:46px;display:flex;align-items:center;justify-content:center;border-radius:13px;font:inherit;font-size:15px;font-weight:900;cursor:pointer;text-decoration:none}.submit{border:1px solid var(--jade);background:var(--jade);color:#fff}.submit:hover{background:var(--jade-dark)}.secondary{border:1px solid var(--line);background:#f8fbfa;color:var(--jade)}
        /* Keep the reset request on the exact existing login surface. */
        [data-login-panel][hidden]{display:none!important}
        .reset-panel{width:min(var(--content),100%);margin:0 auto}
        .reset-panel .security-head{margin-bottom:22px}
        .reset-panel .reset-feedback{margin:0;padding:11px 12px;border:1px solid #bfe4d4;border-radius:12px;background:#f1faf6;color:#146948;font-size:12.5px;line-height:1.45}
        .reset-panel .reset-feedback.is-error{border-color:#f0c6c1;background:#fff3f2;color:#8b2c25}
        .reset-panel .reset-back{margin-top:14px}
        .card.is-reset .brand{margin-bottom:28px}
        .forgot{color:var(--jade);font-size:12.5px;font-weight:800;text-decoration:none}.error{color:var(--danger);font-size:11.5px;font-weight:750}.success,.notice{width:min(var(--content),100%);margin:0 auto 14px;padding:11px 12px;border-radius:12px;font-size:12.5px;line-height:1.45}.success{border:1px solid #bfe4d4;background:#f1faf6;color:#146948}.notice{border:1px solid #f0c6c1;background:#fff3f2;color:#8b2c25}.notice strong{display:block;margin-bottom:2px}
        .security-head{text-align:center;margin-top:0;margin-bottom:22px}.security-head h1{margin:0 0 8px;color:#0c2c28;font-size:23px;letter-spacing:-.035em}.security-head p{margin:0 auto;max-width:320px;color:var(--muted);font-size:13px;line-height:1.5}.qrbox{display:grid;place-items:center;min-height:218px;padding:10px;border:1px solid #d3e6e0;border-radius:16px;background:#f5fbf9}.qrbox svg{display:block;width:205px!important;height:205px!important;max-width:100%}.qr-fallback{padding:24px;text-align:center;color:var(--muted);font-size:12px}.code-input{text-align:center;font-size:25px!important;font-weight:900;letter-spacing:.3em;font-variant-numeric:tabular-nums;padding-left:calc(13px + .3em)!important}.secret{border:1px solid var(--line);border-radius:12px;background:#f8fbfa;padding:10px 12px}.secret summary{cursor:pointer;color:#536461;font-size:12px;font-weight:850}.secret-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.secret-row input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.copy{height:46px;padding:0 12px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--jade);font:inherit;font-size:11px;font-weight:900;cursor:pointer}
        .security-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.wait{min-height:20px;text-align:center;color:#71807c;font-size:12px;font-weight:750}.text-action{width:100%;margin-top:14px;padding:6px;border:0;background:transparent;color:#536b65;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.text-action:hover{color:var(--jade);text-decoration:underline}.recovery-panel[hidden]{display:none}.recovery-input{text-align:center;text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:20px!important;font-weight:850;letter-spacing:.12em}.recovery-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.recovery-item{padding:10px 9px;border:1px solid #dce7e4;border-radius:11px;background:#f8fbfa;text-align:center;color:#183a33;font:800 13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}.recovery-actions{display:grid;gap:9px}.copy-recovery{height:44px;border:1px solid var(--line);border-radius:12px;background:#f8fbfa;color:var(--jade);font:inherit;font-size:12px;font-weight:900;cursor:pointer}
        /* PMD_OWNER_EMERGENCY_CODE_ENTRY_R3: visible and keyboard accessible. */
        .recovery-trigger{min-height:46px;padding:11px 12px;margin-top:16px;border:1px solid #c9dfd5;border-radius:12px;background:#f3faf6;color:var(--jade);font-size:12.5px;font-weight:850;line-height:1.4}
        .recovery-trigger:hover{background:#e7f4ed;text-decoration:none;border-color:#9bc9b6}
        .recovery-trigger:focus-visible,.recovery-panel .text-action:focus-visible{outline:2px solid var(--jade);outline-offset:3px}
        .recovery-panel .field input{font-variant-numeric:tabular-nums}
        .scanner{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:18px;background:rgba(0,22,19,.82);backdrop-filter:blur(7px)}.scanner[hidden]{display:none}.scanner-card{width:min(430px,100%);padding:15px;border-radius:18px;background:#fff}.scanner video{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:13px;background:#071d1a}.scanner-foot{display:grid;gap:9px;margin-top:11px}.scanner-message{color:var(--muted);font-size:12px;text-align:center}
        .card.is-pin{padding-bottom:24px}.card.is-pin .brand{height:112px;margin:-4px 42px 10px}.card.is-pin .brand img{height:108px}.pin-panel,.password-panel{width:min(var(--content),100%);margin:0 auto}.pin-head{text-align:center;margin:0 0 14px}.pin-head h1{margin:0 0 5px;color:#0c2c28;font-size:21px;letter-spacing:-.03em}.pin-head p{margin:0;color:var(--muted);font-size:12.5px}.pin-form{display:grid;gap:12px}.pin-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;opacity:0}.pin-dots{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;width:min(284px,100%);margin:0 auto 2px}.pin-dot{height:44px;display:grid;place-items:center;border:1px solid #dbe5e2;border-radius:12px;background:#f8fbfa;color:var(--jade);font-size:24px;font-weight:900}.pin-dot.is-filled{border-color:#cbb27c;background:#fffaf0}.pin-dot.is-filled::after{content:'•';line-height:1}.pin-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:min(284px,100%);margin:0 auto}.pin-key{height:54px;border:1px solid #dce7e4;border-radius:14px;background:#fff;color:#16332e;font:inherit;font-size:21px;font-weight:850;cursor:pointer;box-shadow:0 2px 0 rgba(6,63,54,.04)}.pin-key:hover{background:#f3f8f6}.pin-key:active{transform:translateY(1px)}.pin-key.is-action{font-size:14px;color:#60706d;background:#f7faf9}.pin-form .submit:disabled{opacity:.45;cursor:not-allowed}.mode-switch{width:100%;margin:12px 0 0;padding:7px;border:0;background:transparent;color:#536b65;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.mode-switch:hover{color:var(--jade);text-decoration:underline}
        /* PMD_LOGIN_PIN_MODE_SWITCH_V13 */
        .pin-setup-action{width:min(var(--content),100%);margin:12px auto 0;text-align:center;font-size:13px;line-height:1.25}
        .mode-switch{display:flex;align-items:center;justify-content:center;min-height:40px;margin:12px 0 0;padding:8px 12px;border:1px solid #d8e6e1;border-radius:12px;background:#f7fbf9;color:var(--jade);font-size:12px;font-weight:850;text-align:center}
        .mode-switch:focus-visible{outline:2px solid var(--jade);outline-offset:2px}
        .mode-switch:hover{background:#eef7f2;text-decoration:none}
        /* PMD_LOGIN_PIN_STABLE_MODE_V15: raised secondary action, compact icon */
        .mode-switch{min-height:55px;padding:7px 10px;gap:10px;justify-content:flex-start;text-align:left;border:1px solid #cadfd6;border-radius:14px;background:linear-gradient(145deg,#f2faf5,#e7f4ed);color:#064439;box-shadow:0 3px 11px rgba(0,55,42,.065);transition:background-color .14s,border-color .14s,box-shadow .14s,transform .14s}
        .mode-switch:hover{background:#e6f6ed;border-color:#91bfad;box-shadow:0 6px 14px rgba(0,55,42,.1);transform:translateY(-1px)}
        .mode-switch:active{transform:translateY(0)}
        .mode-switch__icon{width:35px;height:35px;flex:0 0 35px;display:grid;place-items:center;border-radius:10px;background:#d9efe4;color:#075845}
        .mode-switch__icon svg{width:20px;height:20px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
        .mode-switch__copy{flex:1;min-width:0;display:grid;gap:2px}
        .mode-switch__copy strong{font-size:12.5px;line-height:1.15;font-weight:850;color:#063f36}
        .mode-switch__copy small{font-size:10.5px;color:#527368;font-weight:650;line-height:1.2}
        .mode-switch__arrow{flex:0 0 auto;display:grid;place-items:center;color:#4d7466;font-size:19px;line-height:1}
        .mode-switch--password{min-height:46px;background:#f8fbf9;box-shadow:none}
        .mode-switch--password .mode-switch__icon{width:30px;height:30px;flex-basis:30px;background:#e9f1ed}
        .mode-switch--password .mode-switch__icon svg{width:17px;height:17px}
        .pin-error[hidden]{display:none!important}
        .pin-error{margin:0;padding:9px 11px;border:1px solid #ebc6c3;background:#fff5f4;color:#8b2d27;border-radius:11px;font-size:12px;line-height:1.4;font-weight:700}
        @media(max-width:540px){body{padding:10px}.card{width:calc(100vw - 18px);max-height:calc(100dvh - 18px);padding:21px 18px 27px;border-radius:20px}.card.is-security{min-height:min(570px,calc(100dvh - 18px));padding-bottom:28px}.brand{height:140px;margin:-3px 38px 20px}.brand img{height:134px}.card.is-security .brand{height:150px;margin:-2px 38px 30px}.card.is-security .brand img{height:143px}.qrbox{min-height:195px}.qrbox svg{width:185px!important;height:185px!important}.security-actions{grid-template-columns:1fr}.recovery-list{grid-template-columns:1fr 1fr}.field>span{font-size:12.5px}.security-head p{font-size:12.5px}.card.is-pin .brand{height:96px;margin:0 38px 8px}.card.is-pin .brand img{height:92px}.pin-key{height:50px}.pin-dot{height:40px}}
    </style>
</head>
<body>
<main class="card{{ $securityActive ? ' is-security' : ($pinDefault ? ' is-pin' : '') }}" @if($securityMode === 'workplace' && !empty($security['expires_at'])) data-pmd-workplace-login data-expires-at="{{ $security['expires_at'] }}" @endif>
    <button type="button" class="lang" data-lang="{{ $nextLocale }}">{{ strtoupper($nextLocale) }}</button>
    @if($securityActive)
        <form class="back-form" method="post" action="{{ admin_url('siteaccess/login-cancel') }}">
            @csrf
            <button type="submit" class="back" aria-label="{{ $copy['back'] }}" title="{{ $copy['back'] }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>
            </button>
        </form>
    @endif
    <div class="brand"><img src="{{ asset('app/admin/assets/images/pmd-login-logo.svg') }}?v=pmd-login-v12" alt="PayMyDine"></div>

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
        {{-- Always offer the PIN mode switch on normal web login.
             Keep the PIN POST disabled unless this browser is a trusted hub. --}}
        @if(!$hasMobileHandoff)
            <div id="pmd-login-pin-panel" class="pin-panel" data-login-panel="pin" data-pin-authorized="{{ $pinLoginAvailable ? '1' : '0' }}" @if(!$pinDefault) hidden @endif>
                <section class="pin-head">
                    <h1>{{ $copy['pin_title'] }}</h1>
                    <p>{{ $copy['pin_text'] }}</p>
                </section>
                {!! form_open(['id'=>'pmd-pin-form','class'=>'pin-form','role'=>'form','method'=>'POST','data-request'=>'onStaffPinLogin']) !!}
                    <label for="pmd-staff-pin" class="pin-hidden">{{ $copy['pin_label'] }}</label>
                    <input id="pmd-staff-pin" class="pin-hidden" data-pin-input type="password" name="pin" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" minlength="6" maxlength="6" required @if($pinDefault) autofocus @endif>
                    <div class="pin-dots" aria-hidden="true">
                        @for($i = 0; $i < 6; $i++)<span class="pin-dot" data-pin-dot></span>@endfor
                    </div>
                    <div class="pin-keypad" aria-label="{{ $copy['pin_label'] }}">
                        @foreach([1,2,3,4,5,6,7,8,9] as $digit)
                            <button class="pin-key" type="button" data-pin-key="{{ $digit }}">{{ $digit }}</button>
                        @endforeach
                        <button class="pin-key is-action" type="button" data-pin-clear aria-label="{{ $copy['pin_clear'] }}">C</button>
                        <button class="pin-key" type="button" data-pin-key="0">0</button>
                        <button class="pin-key is-action" type="button" data-pin-delete aria-label="{{ $copy['pin_delete'] }}">⌫</button>
                    </div>
                    {!! form_error('pin', '<small class="error">', '</small>') !!}
                    <p class="pin-error" data-pin-login-error role="alert" aria-live="polite" hidden></p>
                    @if($pinLoginAvailable)
                        <button type="submit" class="submit" data-pin-submit data-attach-loading disabled>{{ $copy['pin_submit'] }}</button>
                    @endif
                {!! form_close() !!}
                @unless($pinLoginAvailable)
                    <a href="{{ admin_url('siteaccess/hub/enroll') }}" class="submit pin-setup-action" data-pin-setup-action>{{ $copy['pin_setup'] }}</a>
                @endunless
                <button type="button" class="mode-switch mode-switch--password" data-login-mode="password" aria-controls="pmd-login-password-panel">
                    <span class="mode-switch__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="12" rx="2"></rect><path d="M8 9V6a4 4 0 0 1 8 0v3"></path></svg></span>
                    <span class="mode-switch__copy"><strong>{{ $copy['use_password'] }}</strong></span>
                    <span class="mode-switch__arrow" aria-hidden="true">›</span>
                </button>
            </div>
        @endif

        <div id="pmd-login-password-panel" class="password-panel" data-login-panel="password" @if($pinDefault) hidden @endif>
            {!! form_open(['id'=>'edit-form','class'=>'form','role'=>'form','method'=>'POST','data-request'=>'onLogin']) !!}
                {{-- PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3 --}}
                @if(request()->filled(\App\Services\PmdMobileSync\PmdMobilePairingService::HANDOFF_PARAM))
                    <input
                        type="hidden"
                        name="{{ \App\Services\PmdMobileSync\PmdMobilePairingService::HANDOFF_PARAM }}"
                        value="{{ request()->input(\App\Services\PmdMobileSync\PmdMobilePairingService::HANDOFF_PARAM) }}"
                    >
                @endif
                <label class="field">
                    <span>{{ $copy['username'] }}</span>
                    <input type="text" name="username" id="input-username" autocomplete="username" placeholder="{{ $copy['username_placeholder'] }}" value="{{ old('username') }}" required @if(!$pinDefault) autofocus @endif>
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
                <a class="forgot" data-pmd-reset-open aria-controls="pmd-login-reset-panel" href="{{ admin_url('login/reset') }}">{{ $copy['forgot'] }}</a>
            {!! form_close() !!}
            @if(!$hasMobileHandoff)
                <button type="button" class="mode-switch mode-switch--pin" data-login-mode="pin" aria-controls="pmd-login-pin-panel">
                    <span class="mode-switch__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"></path></svg></span>
                    <span class="mode-switch__copy"><strong>{{ $copy['use_pin'] }}</strong><small>{{ $copy['pin_switch_subtitle'] }}</small></span>
                    <span class="mode-switch__arrow" aria-hidden="true">›</span>
                </button>
            @endif
        </div>

        {{-- PMD_INLINE_PASSWORD_RESET_V1: the request stays inside the login card.
             The emailed token still uses the canonical reset page. --}}
        <div id="pmd-login-reset-panel" class="reset-panel" data-login-panel="reset" hidden>
            <section class="security-head">
                <h1>{{ $copy['reset_title'] }}</h1>
                <p>{{ $copy['reset_help'] }}</p>
            </section>
            {!! form_open(['id' => 'pmd-inline-reset-form', 'class' => 'form', 'role' => 'form', 'method' => 'POST', 'data-request' => 'onRequestResetPassword']) !!}
                <input type="hidden" name="pmd_inline_reset" value="1">
                <label class="field" for="pmd-reset-email">
                    <span>{{ $copy['reset_email'] }}</span>
                    <input id="pmd-reset-email" name="email" type="email" autocomplete="email" maxlength="96" placeholder="{{ $copy['reset_email_placeholder'] }}" required>
                </label>
                <p class="reset-feedback" data-pmd-reset-feedback role="status" aria-live="polite" hidden></p>
                <button type="submit" class="submit" data-attach-loading>{{ $copy['reset_send'] }}</button>
            {!! form_close() !!}
            <button type="button" class="text-action reset-back" data-pmd-reset-back>{{ $copy['back'] }}</button>
        </div>

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
        <div data-owner-totp-panel @if(session("pmd_owner_recovery_retry")) hidden @endif>
            <section class="security-head"><h1>{{ $copy['verify_title'] }}</h1><p>{{ $copy['verify_text'] }}</p></section>
            <form id="pmd-security-form" class="form" method="post" action="{{ admin_url('siteaccess/owner-security/verify') }}">
                @csrf
                <label class="field">
                    <span>{{ $copy['code'] }}</span>
                    <input class="code-input" data-security-code name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                </label>
                <button type="submit" class="submit">{{ $copy['verify'] }}</button>
            </form>
            <button type="button" class="text-action recovery-trigger" data-owner-recovery-open aria-controls="pmd-owner-recovery-panel" aria-expanded="{{ session('pmd_owner_recovery_retry') ? 'true' : 'false' }}">{{ $copy['recovery_use'] }}</button>
        </div>

        <div id="pmd-owner-recovery-panel" class="recovery-panel" data-owner-recovery-panel @unless(session('pmd_owner_recovery_retry')) hidden @endunless>
            <section class="security-head"><h1>{{ $copy['recovery_title'] }}</h1><p>{{ $copy['recovery_text'] }}</p></section>
            <form class="form" method="post" action="{{ admin_url('siteaccess/owner-security/recover') }}">
                @csrf
                <label class="field">
                    <span>{{ $copy['recovery_code'] }}</span>
                    <input class="recovery-input" data-owner-recovery-input name="recovery_code" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" autocomplete="off" pattern="[0-9A-Fa-f]{4}-?[0-9A-Fa-f]{4}" maxlength="9" placeholder="XXXX-XXXX" required @if(session('pmd_owner_recovery_retry')) autofocus @endif>
                </label>
                <button type="submit" class="submit">{{ $copy['continue'] }}</button>
            </form>
            <button type="button" class="text-action" data-owner-recovery-back>{{ $copy['recovery_back'] }}</button>
        </div>

    @elseif($securityMode === 'recovery_codes')
        <section class="security-head"><h1>{{ $copy['recovery_save_title'] }}</h1></section>
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

    // PMD_STAFF_QUICK_PIN_KEYPAD_V1
    var loginCard = document.querySelector('main.card');
    var pinInput = document.querySelector('[data-pin-input]');
    var pinSubmit = document.querySelector('[data-pin-submit]');
    var pinDots = Array.prototype.slice.call(document.querySelectorAll('[data-pin-dot]'));
    var pinPanel = document.querySelector('[data-login-panel="pin"]');
    // UI hint only. The server repeats the trusted-hub gate on PIN POST.
    var pinAuthorized = !!(pinPanel && pinPanel.getAttribute('data-pin-authorized') === '1');
    function renderPin() {
        if (!pinInput) return;
        var clean = String(pinInput.value || '').replace(/\D+/g, '').slice(0, 6);
        if (pinInput.value !== clean) pinInput.value = clean;
        pinDots.forEach(function (dot, index) {
            dot.classList.toggle('is-filled', index < clean.length);
        });
        if (pinSubmit) pinSubmit.disabled = !pinAuthorized || clean.length !== 6;
    }
    function focusPin() {
        if (!pinInput) return;
        window.setTimeout(function () { pinInput.focus({preventScroll:true}); }, 0);
    }
    if (pinInput) {
        pinInput.addEventListener('input', renderPin);
        pinInput.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                pinInput.value = '';
                renderPin();
            }
        });
        renderPin();
    }
    document.querySelectorAll('[data-pin-key]').forEach(function (button) {
        button.addEventListener('click', function () {
            if (!pinInput || pinInput.value.length >= 6) return focusPin();
            pinInput.value += String(button.getAttribute('data-pin-key') || '').replace(/\D+/g, '').slice(0, 1);
            renderPin();
            focusPin();
        });
    });
    var pinDelete = document.querySelector('[data-pin-delete]');
    if (pinDelete) pinDelete.addEventListener('click', function () {
        if (!pinInput) return;
        pinInput.value = String(pinInput.value || '').slice(0, -1);
        renderPin();
        focusPin();
    });
    var pinClear = document.querySelector('[data-pin-clear]');
    if (pinClear) pinClear.addEventListener('click', function () {
        if (!pinInput) return;
        pinInput.value = '';
        renderPin();
        focusPin();
    });
    // PMD_LOGIN_PIN_STABLE_MODE_V15
    // Remember only the selected interface mode. Never store PINs/passwords.
    var pinModeStorageKey = 'pmd_login_selected_mode_v15';
    function rememberLoginMode(mode) {
        try { window.sessionStorage.setItem(pinModeStorageKey, mode); } catch (error) {}
    }
    function selectedModeFromStorage() {
        try { return window.sessionStorage.getItem(pinModeStorageKey); } catch (error) { return null; }
    }
    function showPinFailure(message) {
        var errorNode = document.querySelector('[data-pin-login-error]');
        if (errorNode && pinPanel && !pinPanel.hidden) {
            errorNode.textContent = String(message || @json($copy['pin_failure']));
            errorNode.hidden = false;
        }
        if (pinInput) {
            pinInput.value = '';
            renderPin();
        }
    }
    function showLoginMode(mode, focus, updateAddress) {
        mode = mode === 'pin' ? 'pin' : 'password';
        // Never expose PIN login inside Owner MFA or mobile pairing states.
        if (mode === 'pin' && !pinPanel) return;
        document.querySelectorAll('[data-login-panel]').forEach(function (panel) {
            panel.hidden = panel.getAttribute('data-login-panel') !== mode;
        });
        if (loginCard) {
            loginCard.classList.toggle('is-pin', mode === 'pin');
            loginCard.classList.remove('is-reset');
        }
        rememberLoginMode(mode);
        if (updateAddress) {
            try {
                var modeUrl = new URL(window.location.href);
                modeUrl.searchParams.set('mode', mode);
                window.history.replaceState(window.history.state, '', modeUrl.pathname + modeUrl.search + modeUrl.hash);
            } catch (error) {}
        }
        if (focus) {
            var target = mode === 'pin' ? pinInput : document.getElementById('input-username');
            if (target) window.setTimeout(function () { target.focus({preventScroll:true}); }, 0);
        }
    }
    // In-card password reset: no route change, no duplicate reset backend.
    var resetPanel = document.getElementById('pmd-login-reset-panel');
    var resetOpen = document.querySelector('[data-pmd-reset-open]');
    var resetBack = document.querySelector('[data-pmd-reset-back]');
    var resetForm = document.getElementById('pmd-inline-reset-form');
    var resetFeedback = document.querySelector('[data-pmd-reset-feedback]');
    function showResetPanel() {
        if (!resetPanel) return;
        document.querySelectorAll('[data-login-panel]').forEach(function (panel) {
            panel.hidden = panel !== resetPanel;
        });
        if (loginCard) {
            loginCard.classList.remove('is-pin');
            loginCard.classList.add('is-reset');
        }
        if (resetFeedback) resetFeedback.hidden = true;
        var email = document.getElementById('pmd-reset-email');
        if (email) email.focus({preventScroll:true});
    }
    if (resetOpen) resetOpen.addEventListener('click', function (event) {
        if (!resetPanel || !window.jQuery || !window.jQuery.fn || !window.jQuery.fn.request) return;
        event.preventDefault();
        showResetPanel();
    });
    if (resetBack) resetBack.addEventListener('click', function () {
        showLoginMode('password', true, false);
    });
    if (resetForm && window.jQuery) {
        var $reset = window.jQuery(resetForm);
        function resetMessage(message, failed) {
            if (!resetFeedback) return;
            resetFeedback.textContent = message;
            resetFeedback.classList.toggle('is-error', !!failed);
            resetFeedback.hidden = false;
        }
        $reset.on('ajaxSuccess', function () {
            resetMessage(@json($copy['reset_sent']), false);
        });
        $reset.on('ajaxFail ajaxInvalidField', function () {
            resetMessage(@json($copy['reset_failed']), true);
        });
    }

    var pinForm = document.getElementById('pmd-pin-form');
    if (pinForm) pinForm.addEventListener('submit', function (event) {
        if (!pinAuthorized || !pinInput || String(pinInput.value || '').length !== 6) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showPinFailure(@json($copy['pin_failure']));
            focusPin();
            return;
        }
        rememberLoginMode('pin');
    });
    document.querySelectorAll('[data-login-mode]').forEach(function (button) {
        button.addEventListener('click', function () {
            showLoginMode(button.getAttribute('data-login-mode'), true, true);
        });
    });
    if (pinPanel) {
        var requestedLoginMode = new URLSearchParams(window.location.search).get('mode');
        // Explicit URLs win; otherwise recover the previous mode if login
        // returns after a failed PIN POST or the page reloads.
        var preferred = requestedLoginMode === 'pin' || requestedLoginMode === 'password'
            ? requestedLoginMode : selectedModeFromStorage();
        if (preferred === 'pin' || preferred === 'password') {
            showLoginMode(preferred, false, false);
        }
    }

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
        recoveryOpen.setAttribute('aria-expanded','true');
        if (recoveryInput) recoveryInput.focus();
    });
    if (recoveryBack && ownerTotpPanel && ownerRecoveryPanel) recoveryBack.addEventListener('click', function () {
        ownerRecoveryPanel.hidden = true;
        if (recoveryOpen) recoveryOpen.setAttribute('aria-expanded','false');
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
        var form = $('#edit-form, #pmd-pin-form');
        var notice = document.getElementById('pmd-login-notice');
        var pinPanel = document.querySelector('[data-login-panel="pin"]');
        var pinInput = document.querySelector('[data-pin-input]');
        var pinError = document.querySelector('[data-pin-login-error]');
        var pinDefaultError = @json($copy['pin_failure']);
        if (!form.length || !notice) return;
        function pinShown() { return !!(pinPanel && !pinPanel.hidden); }
        function show(message) {
            var span = notice.querySelector('span');
            if (span && message) span.textContent = String(message);
            notice.hidden = false;
        }
        function pinFailure(message) {
            notice.hidden = true;
            // Clear the digits before revealing the error: dispatching input
            // afterwards would immediately hide the new message.
            if (pinInput) {
                pinInput.value = '';
                pinInput.dispatchEvent(new Event('input', {bubbles:true}));
            }
            if (pinError) {
                pinError.textContent = String(message || pinDefaultError);
                pinError.hidden = false;
            }
        }
        var pinRequest = $('#pmd-pin-form');
        // The request plugin otherwise follows X_IGNITER_REDIRECT unconditionally.
        // PIN login has no Owner MFA stage. A redirect back to Login is a failed
        // PIN sign-in, not permission to discard the visible PIN keypad.
        pinRequest.on('ajaxBeforeUpdate', function (event, context, data) {
            var redirect = data && data['X_IGNITER_REDIRECT'];
            if (!redirect) return;
            try {
                var attemptedUrl = new URL(String(redirect), window.location.href);
                var loginUrl = new URL(@json(admin_url('login')), window.location.href);
                if (attemptedUrl.origin !== loginUrl.origin
                    || attemptedUrl.pathname.replace(/\/+$/, '') !== loginUrl.pathname.replace(/\/+$/, '')) return;
                event.preventDefault();
                pinFailure(pinDefaultError);
            } catch (error) {}
        });
        form.on('ajaxFail ajaxError ajaxInvalidField', function () {
            if (this.id === 'pmd-pin-form' || pinShown()) pinFailure(pinDefaultError);
            else show();
        });
        $(document).on('ajaxErrorMessage', function (event, message) {
            if (event && event.preventDefault) event.preventDefault();
            if (pinShown()) pinFailure(message || pinDefaultError);
            else show(message);
        });
        pinRequest.on('ajaxSuccess', function (event, context, data) {
            // A valid PIN handler always returns a workspace redirect.
            // A 200/HTML response with no redirect must not fail silently.
            if (data && data['X_IGNITER_REDIRECT']) {
                if (pinError) pinError.hidden = true;
                return;
            }
            if (pinShown()) pinFailure(pinDefaultError);
        });
        pinRequest.on('input', function () {
            if (pinError) pinError.hidden = true;
        });
    })(window.jQuery);
}
</script>
</body>
</html>