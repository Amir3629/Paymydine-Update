<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>Staff Portal · PayMyDine</title>
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=2">
</head>
<body class="pmd-staff-login-page">
<main class="pmd-staff-login">
    <section class="pmd-staff-login__card">
        <img src="/app/admin/assets/images/pmd-brand-full.svg" alt="PayMyDine" class="pmd-staff-login__brand">
        <span class="pmd-staff-eyebrow">Staff Portal</span>
        <h1>Your team, shifts and chat.</h1>
        <p>Use the same PMD username and password to see your shifts, team conversations, open shifts and requests.</p>

        @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
        @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
        @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif
        @if(!empty($managementSession))<div class="pmd-staff-flash">A PMD account is already signed in in this browser. Signing in here switches this browser to the account entered below.</div>@endif

        <form method="post" action="/staff/login" class="pmd-staff-login__form">
            @csrf
            <label><span>Username</span><input name="username" value="{{ old('username') }}" autocomplete="username" required autofocus></label>
            <label><span>Password</span><input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
            <button type="submit">Open Staff Portal</button>
        </form>

        <div class="pmd-staff-login-switch"><a href="{{ admin_url('login') }}">Open PMD workspace instead</a></div>
        <small>Need a login or password reset? Ask the Owner or Manager. Team access is managed in PayMyDine → Settings → Team.</small>
    </section>
</main>
</body>
</html>
