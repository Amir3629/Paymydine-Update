<!DOCTYPE html>
<html lang="en" class="js">
<head>
    <base href="../../../">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Super Admin Login | PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dashboard.css') }}?ver={{ time() }}">
    <link id="skin-default" rel="stylesheet" href="./assets/css/theme.css?ver=3.2.3">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-login-fouc-v58.css') }}?v={{ time() }}">
    <style>
        :root{
            --pmd-login-bg:#FAF9F4;
            --pmd-login-surface:#FFFFFF;
            --pmd-login-border:#E8E2D8;
            --pmd-login-text:#0D1B1E;
            --pmd-login-muted:#6B7280;
            --pmd-login-jade:#062F2A;
            --pmd-login-jade-dark:#021F1C;
            --pmd-login-gold:#C89B4A;
            --pmd-login-danger:#B42318;
            --pmd-login-shadow:0 8px 24px rgba(6,47,42,.06);
        }
        html,body.pg-auth,.nk-body.pg-auth,.nk-app-root,.nk-main,.nk-wrap,.nk-content,.nk-split{
            min-height:100%;
            background:var(--pmd-login-bg)!important;
            color:var(--pmd-login-text)!important;
        }
        body.pg-auth{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .nk-split-page{
            min-height:100vh;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            padding:18px 16px!important;
        }
        .nk-auth-container,.nk-split-content.nk-auth-container{
            width:min(100%,540px)!important;
            max-width:540px!important;
            min-height:auto!important;
            margin:0 auto!important;
            padding:30px 34px 34px!important;
            border:1px solid var(--pmd-login-border)!important;
            border-radius:24px!important;
            background:var(--pmd-login-surface)!important;
            box-shadow:var(--pmd-login-shadow)!important;
        }
        .nk-auth-body{
            width:100%!important;
            max-width:100%!important;
            margin:0!important;
            display:flex!important;
            flex-direction:column!important;
            align-items:center!important;
        }
        .brand-logo,.brand-logo.pb-5{
            width:100%!important;
            height:150px!important;
            min-height:150px!important;
            max-height:150px!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            overflow:visible!important;
            padding:0!important;
            margin:0 auto 6px!important;
            text-align:center!important;
        }
        .brand-logo .logo-link{
            width:360px!important;
            height:150px!important;
            max-width:100%!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            overflow:visible!important;
            padding:0!important;
            margin:0 auto!important;
            background:transparent!important;
            border:0!important;
            box-shadow:none!important;
        }
        .brand-logo .pmd-login-main-logo,
        .brand-logo img.pmd-login-main-logo{
            display:block!important;
            width:260px!important;
            max-width:260px!important;
            height:auto!important;
            max-height:120px!important;
            object-fit:contain!important;
            object-position:center center!important;
            margin:0 auto!important;
            position:static!important;
            transform:scale(2.35)!important;
            transform-origin:center center!important;
        }
        .nk-auth-body form{width:min(100%,430px)!important;margin:0 auto!important}
        .form-group{margin-bottom:18px!important}
        .form-label{color:var(--pmd-login-muted)!important;font-weight:700!important}
        .form-control,.form-control-lg{
            min-height:48px!important;
            border:1px solid var(--pmd-login-border)!important;
            border-radius:14px!important;
            background:var(--pmd-login-surface)!important;
            color:var(--pmd-login-text)!important;
            box-shadow:none!important;
        }
        .form-control:focus,.form-control-lg:focus{
            border-color:var(--pmd-login-gold)!important;
            box-shadow:0 0 0 .18rem rgba(200,155,74,.18)!important;
        }
        .btn.btn-primary,.btn.btn-primary:focus{
            width:100%!important;
            min-height:48px!important;
            border:1px solid var(--pmd-login-jade)!important;
            border-radius:14px!important;
            background:var(--pmd-login-jade)!important;
            color:#fff!important;
            font-weight:800!important;
            box-shadow:0 8px 22px rgba(6,47,42,.16)!important;
        }
        .btn.btn-primary:hover,.btn.btn-primary:active{
            border-color:var(--pmd-login-jade-dark)!important;
            background:var(--pmd-login-jade-dark)!important;
        }
        .pmd-superadmin-error{
            width:min(100%,430px);
            margin:0 auto 18px;
            padding:11px 13px;
            border:1px solid #FECACA;
            border-radius:12px;
            color:var(--pmd-login-danger);
            background:#FFF7F7;
            font-weight:700;
            font-size:13px;
        }
        .bg-abstract,.nk-split-stretch.bg-abstract{display:none!important}
        @media(max-width:575.98px){
            .nk-split-page{padding:14px 12px!important}
            .nk-auth-container,.nk-split-content.nk-auth-container{width:min(100%,94vw)!important;padding:26px 20px 30px!important;border-radius:22px!important}
            .brand-logo,.brand-logo.pb-5{height:135px!important;min-height:135px!important;max-height:135px!important}
            .brand-logo .logo-link{width:310px!important;height:135px!important}
            .brand-logo .pmd-login-main-logo,.brand-logo img.pmd-login-main-logo{width:225px!important;max-width:225px!important;max-height:105px!important;transform:scale(2.15)!important}
        }
    </style>
</head>
<body class="nk-body bg-white npc-general pg-auth">
<div class="nk-app-root">
    <div class="nk-main">
        <div class="nk-wrap nk-wrap-nosidebar">
            <div class="nk-content">
                <div class="nk-split nk-split-page nk-split-md">
                    <div class="nk-split-content nk-block-area nk-block-area-column nk-auth-container bg-white">
                        <div class="nk-block nk-block-middle nk-auth-body">
                            <div class="brand-logo pb-5">
                                <span class="logo-link">
                                    <img class="logo-img pmd-login-main-logo" src="/app/admin/assets/images/pmd-login-logo.svg?v=1786106529" alt="PayMyDine">
                                </span>
                            </div>

                            @if($errors->any())
                                <div class="pmd-superadmin-error">{{ $errors->first() }}</div>
                            @endif

                            <form method="POST" action="/superadmin/sign">
                                @csrf
                                <div class="form-group">
                                    <div class="form-label-group">
                                        <label class="form-label" for="superadmin-username">Username</label>
                                    </div>
                                    <div class="form-control-wrap">
                                        <input type="text" name="username" class="form-control form-control-lg" id="superadmin-username" autocomplete="username" required autofocus>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="form-label-group">
                                        <label class="form-label" for="superadmin-password">Password</label>
                                    </div>
                                    <div class="form-control-wrap">
                                        <input type="password" name="password" class="form-control form-control-lg" id="superadmin-password" autocomplete="current-password" required>
                                    </div>
                                </div>
                                <div class="form-group mb-0">
                                    <button type="submit" class="btn btn-lg btn-primary btn-block">Sign in</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
