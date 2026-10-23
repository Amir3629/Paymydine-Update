@php
    // PMD_STAFF_MARKET_LOGIN_V2_20261022: resolve language from the tenant's
    // configured restaurant country, not from the staff device or geolocation.
    $pmdStaffMarket = '';
    try {
        $pmdCountryId = (int)setting('country_id');
        if ($pmdCountryId > 0) {
            $pmdStaffMarket = strtoupper((string)\Illuminate\Support\Facades\DB::table('countries')
                ->where('country_id', $pmdCountryId)->value('iso_code_2'));
        }
        if ($pmdStaffMarket === '') {
            $pmdStaffMarket = strtoupper((string)\Illuminate\Support\Facades\DB::table('locations as loc')
                ->join('countries as country', 'country.country_id', '=', 'loc.location_country_id')
                ->orderBy('loc.location_id')->value('country.iso_code_2'));
        }
    } catch (\Throwable $ignored) {}
    // PMD_STAFF_LANGUAGE_COUNTRY_FIX_V3_20261022: countries.iso_code_2.
    $pmdStaffOtherLocale = $pmdStaffMarket === 'DE' ? 'de' : ($pmdStaffMarket === 'TR' ? 'tr' : 'en');
    $pmdStaffAllowed = $pmdStaffOtherLocale === 'en' ? ['en'] : ['en', $pmdStaffOtherLocale];
    $pmdStaffCookie = strtolower(trim((string)request()->cookie('pmd_admin_locale', '')));
    $pmdStaffLocale = in_array($pmdStaffCookie, $pmdStaffAllowed, true) ? $pmdStaffCookie : $pmdStaffOtherLocale;
    $pmdStaffNextLocale = $pmdStaffLocale === 'en' ? $pmdStaffOtherLocale : 'en';
    $pmdStaffCopies = [
        'en' => [
            'title' => 'PayMyDine Staff · Sign in',
            'heading' => 'Welcome back',
            'sub' => 'Sign in to see your shifts.',
            'username' => 'Username',
            'password' => 'Password',
            'username_placeholder' => 'Your username',
            'password_placeholder' => 'Your password',
            'button' => 'Sign in',
            'account_note' => 'Use your restaurant PayMyDine account.',
            'switch_title' => 'Change language',
            'privacy_title' => 'Privacy & location',
            'privacy_desc' => 'Staff uses your restaurant account for schedules, requests and team messages. Precise location is requested only when starting or finishing a shift and the result may be recorded for manager review. Location is not tracked in the background. Request the full employee privacy notice from your employer.',
        ],
        'de' => [
            'title' => 'PayMyDine Staff · Anmelden',
            'heading' => 'Willkommen zurück',
            'sub' => 'Melde dich an und sieh deine Schichten.',
            'username' => 'Benutzername',
            'password' => 'Passwort',
            'username_placeholder' => 'Dein Benutzername',
            'password_placeholder' => 'Dein Passwort',
            'button' => 'Anmelden',
            'account_note' => 'Nutze dein PayMyDine-Konto vom Restaurant.',
            'switch_title' => 'Sprache wechseln',
            'privacy_title' => 'Datenschutz & Standort',
            'privacy_desc' => 'Staff nutzt dein Restaurantkonto für Schichten, Anfragen und Teamnachrichten. Der genaue Standort wird nur bei Schichtbeginn oder Schichtende abgefragt und kann zur Anwesenheitsprüfung durch die Restaurantleitung gespeichert werden. Keine Standortüberwachung im Hintergrund. Die vollständigen Datenschutzhinweise erhältst du von deinem Arbeitgeber.',
        ],
        'tr' => [
            'title' => 'PayMyDine Staff · Giriş',
            'heading' => 'Tekrar hoş geldin',
            'sub' => 'Vardiyalarını görmek için giriş yap.',
            'username' => 'Kullanıcı adı',
            'password' => 'Şifre',
            'username_placeholder' => 'Kullanıcı adın',
            'password_placeholder' => 'Şifren',
            'button' => 'Giriş yap',
            'account_note' => 'Restoran PayMyDine hesabını kullan.',
            'switch_title' => 'Dili değiştir',
            'privacy_title' => 'Gizlilik ve konum',
            'privacy_desc' => 'Staff; vardiyalar, talepler ve ekip mesajları için restoran hesabını kullanır. Hassas konum yalnızca vardiyaya başlarken veya vardiyayı bitirirken istenir; doğrulama sonucu yönetici incelemesi için kaydedilebilir. Arka planda konum takibi yoktur. Çalışan gizlilik bildiriminin tamamını işvereninden iste.',
        ],
    ];
    $pmdStaffCopy = $pmdStaffCopies[$pmdStaffLocale] ?? $pmdStaffCopies['en'];
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
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v4.css?v=1">
</head>
<body class="pmd-staff-login-page">
<main class="pmd-staff-login-shell">
    <section class="pmd-staff-login-card">
        @if($pmdStaffNextLocale !== $pmdStaffLocale)
        <button type="button" class="pmd-staff-language" data-pmd-staff-language="{{ $pmdStaffNextLocale }}" title="{{ $pmdStaffCopy['switch_title'] }}" aria-label="{{ $pmdStaffCopy['switch_title'] }}">{{ strtoupper($pmdStaffNextLocale) }}</button>
        @endif

        <div class="pmd-staff-login-brand"><img src="/app/admin/assets/images/pmd-login-logo.svg?v=pmd-staff-v3" alt="PayMyDine"></div>
        <h1>{{ $pmdStaffCopy['heading'] }}</h1>
        <p class="pmd-staff-login-sub">{{ $pmdStaffCopy['sub'] }}</p>



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
        <details class="pmd-staff-login-privacy">
            <summary>{{ $pmdStaffCopy['privacy_title'] }}</summary>
            <p>{{ $pmdStaffCopy['privacy_desc'] }}</p>
        </details>
    </section>
</main>
<script>
(function(){
    var lang=document.querySelector('[data-pmd-staff-language]');
    if(lang)lang.addEventListener('click',function(){var code=String(lang.dataset.pmdStaffLanguage||'').toLowerCase();if(code!=='en'&&code!=='de'&&code!=='tr')return;var cookie='pmd_admin_locale='+encodeURIComponent(code)+'; Path=/; Max-Age=31536000; SameSite=Lax';if(location.protocol==='https:')cookie+='; Secure';document.cookie=cookie;location.reload();});
    var input=document.querySelector('[data-pmd-staff-password]'),toggle=document.querySelector('[data-pmd-staff-password-toggle]');
    if(input&&toggle)toggle.addEventListener('click',function(){var show=input.type==='password';input.type=show?'text':'password';toggle.setAttribute('aria-label',show?'Hide password':'Show password');});
})();
</script>
</body>
</html>
