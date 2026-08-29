<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>Staff · PayMyDine</title>
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=1">
</head>
<body class="pmd-staff-login-page">
<main class="pmd-staff-login">
    <section class="pmd-staff-login__card">
        <img src="/app/admin/assets/images/pmd-brand-full.svg" alt="PayMyDine" class="pmd-staff-login__brand">
        <span class="pmd-staff-eyebrow">Staff Portal</span>
        <h1>Your work, in one place.</h1>
        <p>See shifts, message your manager and send time-off or shift-change requests.</p>

        @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
        @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
        @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif
        @if(!empty($managementSession))<div class="pmd-staff-flash">A management account is signed in in this browser. Signing in below switches this browser to the staff account.</div>@endif

        <form method="post" action="/staff/login" class="pmd-staff-login__form">
            @csrf
            <label><span>Username</span><input name="username" value="{{ old('username') }}" autocomplete="username" required autofocus></label>
            <label><span>Password</span><input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
            <button type="submit">Sign in</button>
        </form>
        <small>Need access or a password reset? Ask your manager. They can manage it in PayMyDine → People.</small>
    </section>
</main>
</body>
</html>
