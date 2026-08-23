<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Super Admin') | PayMyDine</title>
    <link rel="icon" href="/app/admin/assets/images/pmd-brand-mark.svg">

    <script>
    (function () {
        var state = 'collapsed';
        try {
            state = localStorage.getItem('pmd.sideMenu2.state') === 'expanded' ? 'expanded' : 'collapsed';
        } catch (error) {}
        document.documentElement.classList.add('pmd-side-menu2-global-page');
        document.documentElement.classList.add(state === 'expanded' ? 'pmd-sm2-expanded' : 'pmd-sm2-collapsed');
    })();
    </script>

    {{-- Exact Side Menu 2 visual/runtime authority used by the normal Admin panel. --}}
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260822-superadmin-r2">

    <style>
        :root{
            --bg:#f8fbfd;--ink:#16312a;--muted:#6f827b;--green:#123d32;--green2:#1d5b4a;
            --line:#dfe9e5;--card:#fff;--danger:#b42318;--warn:#b54708;--ok:#067647;
            --shadow:0 14px 34px rgba(18,61,50,.08);--pmd-sm2-gap:14px;
            --pmd-sm2-collapsed:72px;--pmd-sm2-expanded:184px;
            --pmd-content-collapsed:100px;--pmd-content-expanded:212px;
        }
        *{box-sizing:border-box}
        html,body{margin:0;min-height:100%;background:var(--bg);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
        body{overflow-x:hidden}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}

        /* Exact outer geometry + color authority from the current Admin Side Menu 2. */
        #pmd-side-menu2{
            position:fixed!important;left:14px!important;top:14px!important;bottom:14px!important;height:auto!important;
            z-index:12000!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;
            visibility:visible!important;opacity:1!important;pointer-events:auto!important;border-radius:22px!important;
            background:linear-gradient(180deg,#06120f 0%,#003d34 100%)!important;
            transition:none!important;
        }
        html.pmd-sm2-collapsed #pmd-side-menu2{width:72px!important}
        html.pmd-sm2-expanded #pmd-side-menu2{width:184px!important}
        html.pmd-sm2-runtime-ready #pmd-side-menu2{transition:width 220ms cubic-bezier(.22,.75,.24,1)!important}

        .pmd-main{min-height:100vh;padding:14px 14px 28px;transition:none}
        html.pmd-sm2-collapsed .pmd-main{margin-left:var(--pmd-content-collapsed)}
        html.pmd-sm2-expanded .pmd-main{margin-left:var(--pmd-content-expanded)}
        html.pmd-sm2-runtime-ready .pmd-main{transition:margin-left 220ms cubic-bezier(.22,.75,.24,1)!important}

        .topbar{height:64px;background:#fff;border:1px solid var(--line);border-radius:18px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;box-shadow:0 8px 24px rgba(18,61,50,.05);position:sticky;top:14px;z-index:20}
        .top-left h1{font-size:19px;margin:0}.top-left p{margin:4px 0 0;color:var(--muted);font-size:12px}
        .user-pill{display:flex;align-items:center;gap:10px;background:#f4f8f6;border:1px solid var(--line);border-radius:999px;padding:7px 11px}
        .avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;font-weight:800;font-size:11px}
        .user-pill strong{font-size:12px}.user-pill small{display:block;color:var(--muted);font-size:10px}

        .content{padding-top:14px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin:6px 0 16px}
        .hero h2{font-size:28px;margin:0 0 5px}.hero p{margin:0;color:var(--muted);font-size:13px}
        .btn{border:0;border-radius:12px;padding:10px 14px;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .btn-primary{background:#123d32;color:#fff}.btn-primary:hover{background:#0b2f2a}
        .btn-soft{background:#eef5f2;color:#17372f}.btn-soft:hover{background:#e4efeb}
        .btn-danger{background:#fff1f0;color:var(--danger);border:1px solid #ffd5d2}.btn[disabled]{opacity:.55;cursor:not-allowed}

        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}
        .stat,.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 24px rgba(18,61,50,.045)}
        .stat{padding:18px}.stat .label{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}
        .stat .value{font-size:30px;font-weight:850;margin-top:8px}.stat .hint{font-size:11px;color:var(--muted);margin-top:3px}
        .card{padding:18px}.card-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.card-head h3{margin:0;font-size:16px}.card-head p{margin:4px 0 0;color:var(--muted);font-size:11px}

        .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}table{border-collapse:collapse;width:100%;min-width:760px}
        th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #edf2f0;font-size:12px}th{background:#f7faf9;color:#60756d;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        tr:last-child td{border-bottom:0}.tenant-name{font-weight:800}.sub{display:block;color:var(--muted);font-size:10px;margin-top:3px}
        .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800;background:#eef5f2;color:var(--green)}
        .badge.ok{background:#ecfdf3;color:var(--ok)}.badge.warn{background:#fff7ed;color:var(--warn)}.badge.bad{background:#fff1f0;color:var(--danger)}

        .grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}
        .field label{font-size:11px;font-weight:800;color:#526961}.field input,.field select,.field textarea{width:100%;border:1px solid #d8e5e0;border-radius:11px;background:#fff;padding:10px 11px;color:var(--ink);outline:none}
        .field textarea{min-height:90px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#67a391;box-shadow:0 0 0 3px rgba(44,111,89,.10)}
        .flash{padding:12px 14px;border-radius:12px;margin-bottom:14px;font-size:12px;font-weight:700}.flash.success{background:#ecfdf3;color:#067647;border:1px solid #abefc6}.flash.warning{background:#fff7ed;color:#b54708;border:1px solid #fed7aa}.flash.error{background:#fff1f0;color:#b42318;border:1px solid #fecdca}
        .filters{display:flex;gap:8px;flex-wrap:wrap}.filters input,.filters select{border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;font-size:12px}.empty{text-align:center;padding:30px;color:var(--muted);font-size:12px}
        .health-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#98a2b3}.health-dot.ok{background:#12b76a}.health-dot.bad{background:#f04438}
        .mobile-menu{display:none;border:0;width:42px;height:42px;border-radius:12px;background:#eef5f2;color:#17372f;place-items:center;cursor:pointer}.mobile-menu svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}

        @media(max-width:820px){
            .pmd-main,html.pmd-sm2-collapsed .pmd-main,html.pmd-sm2-expanded .pmd-main{margin-left:0!important;padding:10px!important}
            #pmd-side-menu2,html.pmd-sm2-collapsed #pmd-side-menu2,html.pmd-sm2-expanded #pmd-side-menu2{
                left:14px!important;top:14px!important;bottom:14px!important;width:220px!important;min-width:220px!important;max-width:220px!important;
                height:auto!important;border-radius:24px!important;transform:translate3d(-260px,0,0)!important;pointer-events:none!important;
                transition:transform 320ms cubic-bezier(.22,.75,.24,1)!important;
            }
            html.pmd-sm2-mobile-open #pmd-side-menu2{transform:translate3d(0,0,0)!important;pointer-events:auto!important}
            #pmd-side-menu2-backdrop{display:block!important;position:fixed!important;inset:0!important;z-index:11999!important;opacity:0!important;pointer-events:none!important;background:rgba(5,18,16,0)!important;backdrop-filter:blur(0)!important;transition:opacity 320ms ease,background-color 320ms ease,backdrop-filter 320ms ease!important}
            html.pmd-sm2-mobile-open #pmd-side-menu2-backdrop{opacity:1!important;pointer-events:auto!important;background:rgba(5,18,16,.28)!important;backdrop-filter:blur(7px)!important}
            .topbar{top:10px}.stats{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}.mobile-menu{display:grid}.hero{align-items:flex-start;flex-direction:column}.field-grid{grid-template-columns:1fr}.field.full{grid-column:auto}
        }
        @media(max-width:560px){.stats{display:flex;overflow:auto}.stat{min-width:165px}.top-left p{display:none}.user-pill .user-copy{display:none}}
    </style>
    @stack('head')
</head>
<body>
@include('admin::superadmin_r2.side_menu')

<main class="pmd-main">
    <header class="topbar">
        <div style="display:flex;align-items:center;gap:10px">
            <button class="mobile-menu" type="button" data-pmd-super-mobile-menu aria-label="Open navigation" aria-expanded="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div class="top-left"><h1>@yield('page_title','Super Admin')</h1><p>@yield('page_subtitle','PayMyDine platform control plane')</p></div>
        </div>
        <div class="user-pill"><div class="avatar">SA</div><div class="user-copy"><strong>{{ session('superadmin_username','Super Admin') }}</strong><small>Platform administrator</small></div></div>
    </header>

    <section class="content">
        @if(session('success'))<div class="flash success">{{ session('success') }}</div>@endif
        @if(session('warning'))<div class="flash warning">{{ session('warning') }}</div>@endif
        @if($errors->any())<div class="flash error">{{ $errors->first() }}</div>@endif
        @yield('content')
    </section>
</main>

<script src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260822-superadmin-r2"></script>
<script>
(function () {
    var html = document.documentElement;
    var backdrop = document.getElementById('pmd-side-menu2-backdrop');
    function trigger(){ return document.querySelector('[data-pmd-super-mobile-menu]'); }
    function setOpen(open){
        html.classList.toggle('pmd-sm2-mobile-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
        var button = trigger();
        if(button){ button.setAttribute('aria-expanded', open ? 'true' : 'false'); button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); }
    }
    document.addEventListener('click', function(event){
        var button = event.target.closest('[data-pmd-super-mobile-menu]');
        if(button){ event.preventDefault(); setOpen(!html.classList.contains('pmd-sm2-mobile-open')); return; }
        if(backdrop && event.target === backdrop){ setOpen(false); return; }
        if(window.innerWidth <= 820 && event.target.closest('#pmd-side-menu2 a[href]')) setOpen(false);
    });
    document.addEventListener('keydown', function(event){ if(event.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', function(){ if(window.innerWidth > 820) setOpen(false); }, {passive:true});
})();
</script>
@stack('scripts')
</body>
</html>
