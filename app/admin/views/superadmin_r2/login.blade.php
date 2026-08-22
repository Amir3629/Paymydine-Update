@php
    $pmdLoginLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', 'en')));
    $pmdLoginLocale = in_array($pmdLoginLocale, ['en', 'de'], true) ? $pmdLoginLocale : 'en';

    $copy = $pmdLoginLocale === 'de'
        ? [
            'title' => 'Anmelden - PayMyDine',
            'heading' => 'Anmelden',
            'username' => 'Benutzername',
            'username_placeholder' => 'Benutzername eingeben',
            'password' => 'Passwort',
            'password_placeholder' => 'Passwort eingeben',
            'submit' => 'Anmelden',
            'show' => 'Passwort anzeigen',
            'hide' => 'Passwort ausblenden',
        ]
        : [
            'title' => 'Login - PayMyDine',
            'heading' => 'Sign-In',
            'username' => 'Username',
            'username_placeholder' => 'Enter your username',
            'password' => 'Passcode',
            'password_placeholder' => 'Enter your passcode',
            'submit' => 'Sign in',
            'show' => 'Show passcode',
            'hide' => 'Hide passcode',
        ];
@endphp
<!DOCTYPE html>
<html lang="{{ $pmdLoginLocale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ $copy['title'] }}</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <style>
        :root{
            --pmd-login-bg-1:#011817;
            --pmd-login-bg-2:#003b34;
            --pmd-login-bg-glow:rgba(122,112,53,.24);
            --pmd-login-card:#f8f8f7;
            --pmd-login-border:#e7dfd2;
            --pmd-login-text:#0d1b1e;
            --pmd-login-muted:#9aa4b6;
            --pmd-login-jade:#073f37;
            --pmd-login-jade-dark:#052f2a;
            --pmd-login-eye:#7f94b2;
        }
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        body{
            min-height:100vh;
            color:var(--pmd-login-text);
            background:
                radial-gradient(circle at 50% 8%,var(--pmd-login-bg-glow) 0,rgba(46,78,55,.12) 24%,rgba(0,0,0,0) 50%),
                linear-gradient(180deg,var(--pmd-login-bg-1) 0%,var(--pmd-login-bg-2) 100%);
        }
        .pmd-login-stage{
            min-height:100vh;
            display:grid;
            place-items:center;
            padding:36px 18px;
        }
        .pmd-login-card{
            width:min(430px,calc(100vw - 36px));
            min-height:640px;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-start;
            padding:30px 48px 46px;
            border:1px solid var(--pmd-login-border);
            border-radius:26px;
            background:var(--pmd-login-card);
            box-shadow:0 26px 70px rgba(0,18,16,.28);
        }
        .pmd-login-logo{
            width:100%;
            height:210px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 0 2px;
            overflow:visible;
        }
        .pmd-login-logo img{
            display:block;
            width:190px;
            max-width:82%;
            height:auto;
            max-height:190px;
            object-fit:contain;
        }
        .pmd-login-heading{
            margin:8px 0 32px;
            font-size:21px;
            line-height:1.2;
            font-weight:850;
            letter-spacing:-.02em;
            text-align:center;
        }
        .pmd-login-form{width:100%}
        .pmd-login-field{margin-bottom:20px}
        .pmd-login-field label{
            display:block;
            margin:0 0 9px;
            font-size:14px;
            line-height:1.2;
            font-weight:800;
            color:#111f21;
        }
        .pmd-login-control{position:relative}
        .pmd-login-control input{
            width:100%;
            height:50px;
            border:1px solid #e0d7cb;
            border-radius:13px;
            background:#fff;
            padding:0 48px 0 14px;
            color:#17292b;
            font-size:15px;
            outline:none;
            box-shadow:0 10px 20px rgba(22,38,34,.06);
            transition:border-color .15s ease,box-shadow .15s ease;
        }
        .pmd-login-control input::placeholder{color:var(--pmd-login-muted);opacity:1}
        .pmd-login-control input:focus{
            border-color:#c79c50;
            box-shadow:0 0 0 3px rgba(199,156,80,.14),0 10px 20px rgba(22,38,34,.06);
        }
        .pmd-login-eye{
            position:absolute;
            right:8px;
            top:50%;
            transform:translateY(-50%);
            width:34px;
            height:34px;
            display:grid;
            place-items:center;
            border:0;
            border-radius:9px;
            background:transparent;
            color:var(--pmd-login-eye);
            cursor:pointer;
        }
        .pmd-login-eye:hover{background:#f0f3f4}
        .pmd-login-eye svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8}
        .pmd-login-submit{
            width:100%;
            height:50px;
            margin-top:1px;
            border:1px solid var(--pmd-login-jade);
            border-radius:13px;
            background:var(--pmd-login-jade);
            color:#fff;
            font-size:16px;
            font-weight:850;
            cursor:pointer;
            box-shadow:0 13px 28px rgba(7,63,55,.18);
            transition:background .15s ease,box-shadow .15s ease,transform .15s ease;
        }
        .pmd-login-submit:hover{background:var(--pmd-login-jade-dark);box-shadow:0 15px 30px rgba(7,63,55,.22)}
        .pmd-login-submit:active{transform:translateY(1px)}
        .pmd-login-error{
            width:100%;
            margin:0 0 18px;
            padding:11px 13px;
            border:1px solid #f0c3c0;
            border-radius:11px;
            background:#fff6f5;
            color:#a53229;
            font-size:13px;
            font-weight:750;
        }
        @media(max-width:560px){
            .pmd-login-stage{padding:18px 12px}
            .pmd-login-card{width:min(430px,100%);min-height:0;padding:24px 24px 32px;border-radius:22px}
            .pmd-login-logo{height:190px}.pmd-login-logo img{width:175px}.pmd-login-heading{margin-top:2px;margin-bottom:28px}
        }
    </style>
</head>
<body>
<div class="pmd-login-stage">
    <main class="pmd-login-card">
        <div class="pmd-login-logo">
            <img src="/app/admin/assets/images/pmd-login-logo.svg?v=1786106529" alt="PayMyDine">
        </div>

        <h1 class="pmd-login-heading">{{ $copy['heading'] }}</h1>

        @if($errors->any())
            <div class="pmd-login-error">{{ $errors->first() }}</div>
        @endif

        <form class="pmd-login-form" method="POST" action="/superadmin/sign">
            @csrf
            <div class="pmd-login-field">
                <label for="superadmin-username">{{ $copy['username'] }}</label>
                <div class="pmd-login-control">
                    <input type="text" name="username" id="superadmin-username" autocomplete="username" placeholder="{{ $copy['username_placeholder'] }}" required autofocus>
                </div>
            </div>

            <div class="pmd-login-field">
                <label for="superadmin-password">{{ $copy['password'] }}</label>
                <div class="pmd-login-control">
                    <input type="password" name="password" id="superadmin-password" autocomplete="current-password" placeholder="{{ $copy['password_placeholder'] }}" required>
                    <button class="pmd-login-eye" type="button" data-pmd-password-toggle aria-label="{{ $copy['show'] }}" aria-pressed="false">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                    </button>
                </div>
            </div>

            <button class="pmd-login-submit" type="submit">{{ $copy['submit'] }}</button>
        </form>
    </main>
</div>
<script>
(function(){
    var button=document.querySelector('[data-pmd-password-toggle]');
    var input=document.getElementById('superadmin-password');
    if(!button||!input)return;
    var showLabel=@json($copy['show']);
    var hideLabel=@json($copy['hide']);
    button.addEventListener('click',function(){
        var show=input.type==='password';
        input.type=show?'text':'password';
        button.setAttribute('aria-pressed',show?'true':'false');
        button.setAttribute('aria-label',show?hideLabel:showLabel);
        input.focus();
    });
})();
</script>
</body>
</html>
