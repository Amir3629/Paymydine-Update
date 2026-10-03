<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Super Admin Login | PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <style>
        :root{
            --pmd-auth-ink:#314763;
            --pmd-auth-muted:#6d87aa;
            --pmd-auth-line:#cfd7e2;
            --pmd-auth-panel:#3f5875;
            --pmd-auth-panel-dark:#314a68;
            --pmd-auth-focus:#92a9c4;
        }
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:var(--pmd-auth-ink)}
        .pmd-auth-shell{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;background:#fff}
        .pmd-auth-left{display:flex;align-items:center;justify-content:center;background:#fff;padding:40px}
        .pmd-auth-right{background:linear-gradient(135deg,var(--pmd-auth-panel-dark),var(--pmd-auth-panel))}
        .pmd-auth-form{width:min(445px,100%)}
        .pmd-auth-form h1{margin:0 0 8px;font-size:25px;line-height:1.15;font-weight:750;letter-spacing:-.02em;color:var(--pmd-auth-ink)}
        .pmd-auth-form .lead{margin:0 0 62px;color:var(--pmd-auth-muted);font-size:16px;line-height:1.45}
        .pmd-auth-field{margin-bottom:24px}
        .pmd-auth-field label{display:block;margin-bottom:11px;font-size:14px;font-weight:750;color:var(--pmd-auth-ink)}
        .pmd-auth-control{position:relative}
        .pmd-auth-control input{width:100%;height:54px;border:2px solid var(--pmd-auth-line);border-radius:14px;background:#fff;padding:0 48px 0 16px;font-size:16px;color:#243b57;outline:0;box-shadow:0 3px 10px rgba(49,71,99,.08);transition:border-color .14s ease,box-shadow .14s ease}
        .pmd-auth-control input::placeholder{color:#6f89ac;opacity:1}
        .pmd-auth-control input:focus{border-color:var(--pmd-auth-focus);box-shadow:0 0 0 4px rgba(103,132,168,.12),0 3px 10px rgba(49,71,99,.08)}
        .pmd-pass-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;color:#6983a7;display:grid;place-items:center;cursor:pointer;border-radius:8px}
        .pmd-pass-toggle:hover{background:#f3f6fa}.pmd-pass-toggle svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8}
        .pmd-auth-submit{width:100%;height:56px;margin-top:6px;border:0;border-radius:14px;background:#354f6c;color:#fff;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(49,71,99,.18);transition:background .14s ease,transform .14s ease}
        .pmd-auth-submit:hover{background:#2f4865}.pmd-auth-submit:active{transform:translateY(1px)}
        .pmd-auth-error{margin:0 0 22px;padding:11px 13px;border:1px solid #f0c3c0;border-radius:11px;background:#fff6f5;color:#a53229;font-size:13px;font-weight:700}
        @media(max-width:900px){.pmd-auth-shell{grid-template-columns:1fr}.pmd-auth-right{display:none}.pmd-auth-left{min-height:100vh;padding:28px 20px}.pmd-auth-form .lead{margin-bottom:42px}}
    </style>
</head>
<body>
<div class="pmd-auth-shell">
    <main class="pmd-auth-left">
        <div class="pmd-auth-form">
            <h1>Sign-In</h1>
            <p class="lead">Access using your User Name and passcode.</p>

            @if($errors->any())
                <div class="pmd-auth-error">{{ $errors->first() }}</div>
            @endif

            <form method="POST" action="/superadmin/sign">
                @csrf
                <div class="pmd-auth-field">
                    <label for="superadmin-username">Username</label>
                    <div class="pmd-auth-control">
                        <input type="text" name="username" id="superadmin-username" autocomplete="username" placeholder="Enter your email address or username" required autofocus>
                    </div>
                </div>

                <div class="pmd-auth-field">
                    <label for="superadmin-password">Passcode</label>
                    <div class="pmd-auth-control">
                        <input type="password" name="password" id="superadmin-password" autocomplete="current-password" placeholder="Enter your passcode" required>
                        <button class="pmd-pass-toggle" type="button" data-pmd-password-toggle aria-label="Show passcode" aria-pressed="false">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                        </button>
                    </div>
                </div>

                <button class="pmd-auth-submit" type="submit">Sign in</button>
            </form>
        </div>
    </main>
    <aside class="pmd-auth-right" aria-hidden="true"></aside>
</div>
<script>
(function(){
    var button=document.querySelector('[data-pmd-password-toggle]');
    var input=document.getElementById('superadmin-password');
    if(!button||!input)return;
    button.addEventListener('click',function(){
        var show=input.type==='password';
        input.type=show?'text':'password';
        button.setAttribute('aria-pressed',show?'true':'false');
        button.setAttribute('aria-label',show?'Hide passcode':'Show passcode');
        input.focus();
    });
})();
</script>
</body>
</html>
