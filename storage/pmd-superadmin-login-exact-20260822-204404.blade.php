<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Super Admin Login | PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <style>
        :root{--ink:#16312a;--muted:#6b7f78;--line:#dbe7e3;--bg:#f5faf8;--green:#0e4b3e;--green2:#08715a;--focus:#64a995}
        *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink)}
        body{min-height:100vh}.pmd-auth-stage{min-height:100vh;display:grid;place-items:center;padding:32px}.pmd-auth-card{width:min(1140px,100%);min-height:700px;display:grid;grid-template-columns:.9fr 1.1fr;overflow:hidden;border:1px solid #dfe9e5;border-radius:32px;background:#fff;box-shadow:0 28px 80px rgba(20,61,50,.13)}
        .pmd-auth-brand{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:56px;background:linear-gradient(155deg,#061b16 0%,#0b4d3f 54%,#0b7b60 100%);color:#fff;overflow:hidden}.pmd-auth-brand:before{content:"";position:absolute;width:360px;height:360px;border-radius:50%;right:-160px;top:-110px;background:rgba(255,255,255,.055)}.pmd-auth-brand:after{content:"";position:absolute;width:280px;height:280px;border-radius:50%;left:-130px;bottom:-120px;background:rgba(255,255,255,.045)}
        .pmd-brand-logo{position:relative;z-index:1;width:250px;min-height:112px;display:grid;place-items:center;padding:18px;border-radius:22px;background:#fff;box-shadow:0 18px 45px rgba(0,0,0,.14)}.pmd-brand-logo img{display:block;width:100%;max-height:78px;object-fit:contain}.pmd-brand-copy{position:relative;z-index:1}.pmd-brand-copy h2{margin:0 0 12px;font-size:42px;line-height:1.02;letter-spacing:-.035em}.pmd-brand-copy p{margin:0;max-width:360px;font-size:18px;line-height:1.5;color:rgba(255,255,255,.82)}
        .pmd-auth-form-pane{display:flex;align-items:center;justify-content:center;padding:64px 72px;background:#fff}.pmd-auth-form{width:min(470px,100%)}.pmd-auth-form h1{margin:0;font-size:38px;line-height:1.06;font-weight:850;letter-spacing:-.035em;color:var(--ink)}.pmd-auth-form .lead{margin:12px 0 44px;color:var(--muted);font-size:18px;line-height:1.5}
        .pmd-auth-field{margin-bottom:24px}.pmd-auth-field label{display:block;margin-bottom:10px;font-size:15px;font-weight:800;color:#35534a}.pmd-auth-control{position:relative}.pmd-auth-control input{width:100%;height:60px;border:1px solid var(--line);border-radius:15px;background:#fbfdfc;padding:0 52px 0 17px;font-size:17px;color:var(--ink);outline:0;box-shadow:0 4px 14px rgba(18,61,50,.045);transition:border-color .14s ease,box-shadow .14s ease,background .14s ease}.pmd-auth-control input::placeholder{color:#8aa097}.pmd-auth-control input:focus{background:#fff;border-color:var(--focus);box-shadow:0 0 0 4px rgba(59,137,113,.10),0 4px 14px rgba(18,61,50,.05)}
        .pmd-pass-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;background:transparent;color:#6f8d82;display:grid;place-items:center;cursor:pointer;border-radius:10px}.pmd-pass-toggle:hover{background:#edf6f2}.pmd-pass-toggle svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8}
        .pmd-auth-submit{width:100%;height:60px;margin-top:6px;border:0;border-radius:15px;background:var(--green);color:#fff;font-size:18px;font-weight:850;cursor:pointer;box-shadow:0 12px 28px rgba(14,75,62,.20);transition:background .14s ease,transform .14s ease,box-shadow .14s ease}.pmd-auth-submit:hover{background:#0a3c32;box-shadow:0 14px 30px rgba(14,75,62,.24)}.pmd-auth-submit:active{transform:translateY(1px)}
        .pmd-auth-error{margin:0 0 22px;padding:13px 14px;border:1px solid #f0c3c0;border-radius:12px;background:#fff6f5;color:#a53229;font-size:14px;font-weight:750}
        @media(max-width:900px){.pmd-auth-stage{padding:0}.pmd-auth-card{min-height:100vh;border:0;border-radius:0;grid-template-columns:1fr}.pmd-auth-brand{display:none}.pmd-auth-form-pane{min-height:100vh;padding:36px 22px}.pmd-auth-form h1{font-size:34px}.pmd-auth-form .lead{font-size:17px;margin-bottom:36px}}
    </style>
</head>
<body>
<div class="pmd-auth-stage">
    <div class="pmd-auth-card">
        <aside class="pmd-auth-brand" aria-label="PayMyDine Super Admin">
            <div class="pmd-brand-logo"><img src="/app/admin/assets/images/pmd-login-logo.svg?v=1786106529" alt="PayMyDine"></div>
            <div class="pmd-brand-copy"><h2>Super Admin</h2><p>Manage PayMyDine restaurants and platform operations from one place.</p></div>
        </aside>
        <main class="pmd-auth-form-pane">
            <div class="pmd-auth-form">
                <h1>Welcome back</h1>
                <p class="lead">Sign in to continue to Super Admin.</p>
                @if($errors->any())<div class="pmd-auth-error">{{ $errors->first() }}</div>@endif
                <form method="POST" action="/superadmin/sign">
                    @csrf
                    <div class="pmd-auth-field"><label for="superadmin-username">Username</label><div class="pmd-auth-control"><input type="text" name="username" id="superadmin-username" autocomplete="username" placeholder="Email address or username" required autofocus></div></div>
                    <div class="pmd-auth-field"><label for="superadmin-password">Passcode</label><div class="pmd-auth-control"><input type="password" name="password" id="superadmin-password" autocomplete="current-password" placeholder="Enter your passcode" required><button class="pmd-pass-toggle" type="button" data-pmd-password-toggle aria-label="Show passcode" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>
                    <button class="pmd-auth-submit" type="submit">Sign in</button>
                </form>
            </div>
        </main>
    </div>
</div>
<script>
(function(){var button=document.querySelector('[data-pmd-password-toggle]');var input=document.getElementById('superadmin-password');if(!button||!input)return;button.addEventListener('click',function(){var show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-pressed',show?'true':'false');button.setAttribute('aria-label',show?'Hide passcode':'Show passcode');input.focus();});})();
</script>
</body>
</html>
