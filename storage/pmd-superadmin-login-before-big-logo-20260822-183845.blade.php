<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Super Admin Login | PayMyDine</title>
<link rel="icon" href="/app/admin/assets/images/pmd-brand-mark.svg">
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#f8fbfd}
body{min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#16312a}
.login-card{width:min(420px,100%);background:#fff;border:1px solid #dfe9e5;border-radius:24px;padding:34px 30px 30px;box-shadow:0 18px 50px rgba(18,61,50,.09)}
.logo{display:flex;justify-content:center;align-items:center;margin:0 auto 30px}
.logo img{display:block;width:min(220px,72%);height:auto;max-height:72px;object-fit:contain}
.field{display:grid;gap:7px;margin-bottom:15px}
.field label{font-size:12px;font-weight:800;color:#29463e}
.field input{width:100%;border:1px solid #d8e5e0;border-radius:12px;background:#fff;padding:13px 14px;color:#16312a;outline:none;font:inherit}
.field input:focus{border-color:#67a391;box-shadow:0 0 0 3px rgba(44,111,89,.10)}
.btn{width:100%;border:0;background:#123d32;color:#fff;border-radius:12px;padding:13px 16px;font-weight:800;cursor:pointer;margin-top:4px}
.btn:hover{background:#0b2f2a}
.error{background:#fff1f0;border:1px solid #fecdca;color:#b42318;border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:12px;font-weight:700}
@media(max-width:520px){body{padding:14px}.login-card{padding:28px 20px 22px;border-radius:20px}.logo{margin-bottom:24px}.logo img{width:min(200px,76%)}}
</style>
</head>
<body>
<div class="login-card">
    <div class="logo">
        <img src="/app/admin/assets/images/pmd-login-logo.svg?v=1786106529" alt="PayMyDine">
    </div>

    @if($errors->any())
        <div class="error">{{ $errors->first() }}</div>
    @endif

    <form method="POST" action="/superadmin/sign">
        @csrf
        <div class="field">
            <label>Username</label>
            <input name="username" autocomplete="username" required autofocus>
        </div>
        <div class="field">
            <label>Password</label>
            <input type="password" name="password" autocomplete="current-password" required>
        </div>
        <button class="btn" type="submit">Sign in</button>
    </form>
</div>
</body>
</html>
