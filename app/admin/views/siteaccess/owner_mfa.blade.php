@php
    $tenantHost = request()->getHost();
    $setup = ($mode ?? 'verify') === 'setup';
@endphp
<!doctype html>
<html lang="{{ app()->getLocale() ?: 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $setup ? 'Connect Authenticator' : 'Owner verification' }} · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-workplace-v3">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-workplace-access-v2.css?v=3">
</head>
<body class="pmd-workplace-access">
<header class="pmd-wa-top">
    <a class="pmd-wa-brand" href="{{ admin_url('login') }}">
        <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
        <span>Owner security</span>
    </a>
    <div class="pmd-wa-actions"><span class="pmd-wa-link">{{ $tenantHost }}</span></div>
</header>

<main class="pmd-wa-main is-login">
    <section class="pmd-wa-card">
        <header class="pmd-wa-head">
            <span class="pmd-wa-eyebrow">{{ $setup ? 'First owner setup' : 'Owner access' }}</span>
            <h1>{{ $setup ? 'Connect your Authenticator app' : 'Enter your Authenticator code' }}</h1>
            <p>
                @if($setup)
                    This is your personal Owner verification. It is separate from the restaurant Workplace Code and works without SMS fees.
                @else
                    Use the current 6-digit code from Google Authenticator, Microsoft Authenticator, 1Password or another standard TOTP app.
                @endif
            </p>
            <span class="pmd-wa-domain">Restaurant locked · {{ $tenantHost }}</span>
        </header>

        <div class="pmd-wa-body">
            @if(session('error'))
                <div class="pmd-wa-flash is-error">{{ session('error') }}</div>
            @endif

            @if($setup)
                <div class="pmd-wa-stack">
                    <div class="pmd-wa-note">
                        <strong>No SMS provider is required.</strong><br>
                        Scan this once with your Authenticator app. PMD stores the secret encrypted in this restaurant tenant.
                    </div>

                    <div class="pmd-wa-codebox" style="padding:18px">
                        <img src="{{ admin_url('siteaccess/owner-mfa/qr') }}" alt="Authenticator QR" style="display:block;width:min(260px,100%);height:auto;margin:0 auto;border-radius:12px;background:#fff">
                    </div>

                    <label class="pmd-wa-field">
                        <span>Manual setup key</span>
                        <input type="text" readonly value="{{ $secret ?? '' }}" onclick="this.select()" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;letter-spacing:.04em">
                    </label>

                    <form method="post" action="{{ admin_url('siteaccess/owner-mfa/confirm') }}" class="pmd-wa-form" autocomplete="off">
                        @csrf
                        <label class="pmd-wa-field">
                            <span>6-digit code from your app</span>
                            <input class="pmd-wa-code-input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                        </label>
                        <button class="pmd-wa-primary" type="submit">Connect Authenticator</button>
                    </form>
                </div>
            @else
                <form method="post" action="{{ admin_url('siteaccess/owner-mfa/verify') }}" class="pmd-wa-form" autocomplete="off">
                    @csrf
                    <label class="pmd-wa-field">
                        <span>Authenticator code</span>
                        <input class="pmd-wa-code-input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                    </label>
                    <button class="pmd-wa-primary" type="submit">Verify Owner</button>
                </form>

                <div class="pmd-wa-advanced">
                    <details>
                        <summary>Why am I seeing this?</summary>
                        <p class="pmd-wa-muted">Owner Authenticator proves your personal identity. Restaurant staff normally use the rotating Workplace Code shown on the trusted Cashier/POS device.</p>
                    </details>
                </div>
            @endif
        </div>
    </section>
</main>
</body>
</html>
