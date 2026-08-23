<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Super Admin Login | PayMyDine</title>
    <style>
        :root{
            --bg:#eef2f1;
            --card:#ffffff;
            --border:#dbe7e2;
            --input:#edf4f0;
            --text:#19352f;
            --muted:#5f746d;
            --btn:#0d4f3d;
            --btn-hover:#0b4535;
            --shadow:0 10px 30px rgba(20,40,35,.08);
            --radius:24px;
        }
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
            margin:0;
            font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
            background:var(--bg);
            color:var(--text);
        }
        .page{
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:32px 18px;
        }
        .card{
            width:min(560px,96vw);
            background:var(--card);
            border:1px solid var(--border);
            border-radius:32px;
            box-shadow:var(--shadow);
            padding:42px 34px 34px;
        }
        .logo{
            display:flex;
            justify-content:center;
            align-items:center;
            margin:0 0 28px;
        }
        .logo img{
            display:block;
            width:min(390px,96%);
            max-height:170px;
            height:auto;
            object-fit:contain;
        }
        .field{
            margin:0 0 18px;
        }
        .field label{
            display:block;
            margin:0 0 8px;
            font-size:15px;
            font-weight:700;
            color:var(--text);
        }
        .field input{
            width:100%;
            height:54px;
            border-radius:16px;
            border:1px solid #cfe0d9;
            background:#fff;
            color:var(--text);
            padding:0 16px;
            font-size:16px;
            outline:none;
            transition:border-color .15s ease, box-shadow .15s ease;
        }
        .field input:focus{
            border-color:#7fb39f;
            box-shadow:0 0 0 4px rgba(35,115,90,.10);
        }
        .btn{
            width:100%;
            height:54px;
            border:0;
            border-radius:16px;
            background:var(--btn);
            color:#fff;
            font-size:16px;
            font-weight:800;
            cursor:pointer;
            margin-top:6px;
        }
        .btn:hover{
            background:var(--btn-hover);
        }
        .alert{
            margin:0 0 18px;
            padding:14px 16px;
            border-radius:14px;
            font-size:14px;
            line-height:1.45;
        }
        .alert-danger{
            background:#fff3f1;
            border:1px solid #f4c9c2;
            color:#9b2f1f;
        }
        .alert-success{
            background:#edf9f1;
            border:1px solid #bfe6ca;
            color:#1f6d3a;
        }
        @media (max-width:640px){
            .card{
                width:min(520px,96vw);
                border-radius:24px;
                padding:32px 22px 24px;
            }
            .logo img{
                width:min(320px,94%);
                max-height:140px;
            }
        }
    </style>
</head>
<body>
<div class="page">
    <div class="card">
        <div class="logo">
            <img src="/app/admin/assets/images/pmd-login-logo.svg?v=1786106529" alt="PayMyDine">
        </div>

        @if(session('status'))
            <div class="alert alert-success">{{ session('status') }}</div>
        @endif

        @if(session('error'))
            <div class="alert alert-danger">{{ session('error') }}</div>
        @endif

        @if($errors->any())
            <div class="alert alert-danger">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="/superadmin/sign">
            <input type="hidden" name="_token" value="{{ csrf_token() }}">

            <div class="field">
                <label for="username">Username</label>
                <input id="username" name="username" type="text" autocomplete="username" required autofocus>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" required>
            </div>

            <button class="btn" type="submit">Sign in</button>
        </form>
    </div>
</div>
</body>
</html>
