@php
    $pmdStaffLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $pmdStaffLocale = in_array($pmdStaffLocale, ['en', 'de'], true) ? $pmdStaffLocale : 'en';
    $pmdStaffNextLocale = $pmdStaffLocale === 'de' ? 'en' : 'de';
    $pmdStaffCopy = $pmdStaffLocale === 'de'
        ? [
            'title' => 'Staff Portal · PayMyDine',
            'heading' => 'Staff Portal',
            'sub' => 'Dienstplan, Team-Chat und Anfragen mit deinem normalen PayMyDine Login.',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username' => 'Benutzername',
            'password' => 'Passwort',
            'username_placeholder' => 'Benutzername eingeben',
            'password_placeholder' => 'Passwort eingeben',
            'button' => 'Staff Portal öffnen',
            'account_note' => 'Gleiche Zugangsdaten wie im PayMyDine Workspace.',
            'switch_title' => 'Auf Englisch wechseln',
        ]
        : [
            'title' => 'Staff Portal · PayMyDine',
            'heading' => 'Staff Portal',
            'sub' => 'Shifts, team chat and requests with your normal PayMyDine login.',
            'workspace' => 'Workspace',
            'staff' => 'Staff Portal',
            'username' => 'Username',
            'password' => 'Password',
            'username_placeholder' => 'Enter your username',
            'password_placeholder' => 'Enter your password',
            'button' => 'Open Staff Portal',
            'account_note' => 'Use the same credentials as your PayMyDine Workspace account.',
            'switch_title' => 'Switch to German',
        ];
@endphp
<!doctype html>
<html lang="{{ $pmdStaffLocale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>{{ $pmdStaffCopy['title'] }}</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-staff-v3">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=3">
</head>
<body class="pmd-staff-login-page">
<main class="pmd-staff-login-shell">
    <section class="pmd-staff-login-card">
        <button type="button" class="pmd-staff-language" data-pmd-staff-language="{{ $pmdStaffNextLocale }}" title="{{ $pmdStaffCopy['switch_title'] }}" aria-label="{{ $pmdStaffCopy['switch_title'] }}">{{ strtoupper($pmdStaffNextLocale) }}</button>

        <div class="pmd-staff-login-brand"><img src="/app/admin/assets/images/pmd-login-logo.svg?v=pmd-staff-v3" alt="PayMyDine"></div>
        <h1>{{ $pmdStaffCopy['heading'] }}</h1>
        <p class="pmd-staff-login-sub">{{ $pmdStaffCopy['sub'] }}</p>

        <nav class="pmd-staff-login-mode" aria-label="Login destination">
            <a href="{{ admin_url('login') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path></svg>
                {{ $pmdStaffCopy['workspace'] }}
            </a>
            <span aria-current="page">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                {{ $pmdStaffCopy['staff'] }}
            </span>
        </nav>

        @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
        @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
        @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif
        @if(!empty($managementSession))<div class="pmd-staff-flash">Another PMD account is already signed in in this browser. Signing in here switches this browser to the account entered below.</div>@endif

        <form method="post" action="/staff/login" class="pmd-staff-login-form">
            @csrf
            <label><span>{{ $pmdStaffCopy['username'] }}</span><input name="username" value="{{ old('username') }}" autocomplete="username" placeholder="{{ $pmdStaffCopy['username_placeholder'] }}" required autofocus></label>
            <label><span>{{ $pmdStaffCopy['password'] }}</span><span class="pmd-staff-password-wrap"><input type="password" name="password" data-pmd-staff-password autocomplete="current-password" minlength="6" placeholder="{{ $pmdStaffCopy['password_placeholder'] }}" required><button type="button" data-pmd-staff-password-toggle aria-label="Show password"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></button></span></label>
            <button type="submit">{{ $pmdStaffCopy['button'] }}</button>
        </form>

        <small class="pmd-staff-login-note">{{ $pmdStaffCopy['account_note'] }}</small>
    </section>
</main>
<script>
(function(){
    var lang=document.querySelector('[data-pmd-staff-language]');
    if(lang)lang.addEventListener('click',function(){var code=String(lang.dataset.pmdStaffLanguage||'').toLowerCase();if(code!=='en'&&code!=='de')return;var cookie='pmd_admin_locale='+encodeURIComponent(code)+'; Path=/; Max-Age=31536000; SameSite=Lax';if(location.protocol==='https:')cookie+='; Secure';document.cookie=cookie;location.reload();});
    var input=document.querySelector('[data-pmd-staff-password]'),toggle=document.querySelector('[data-pmd-staff-password-toggle]');
    if(input&&toggle)toggle.addEventListener('click',function(){var show=input.type==='password';input.type=show?'text':'password';toggle.setAttribute('aria-label',show?'Hide password':'Show password');});
})();
</script>
</body>
</html>
