<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Super Admin') | PayMyDine</title>
    <link rel="icon" href="/app/admin/assets/images/pmd-brand-mark.svg">
    <style>
        :root{--bg:#f8fbfd;--ink:#16312a;--muted:#6f827b;--green:#123d32;--green2:#1d5b4a;--line:#dfe9e5;--card:#fff;--danger:#b42318;--warn:#b54708;--ok:#067647;--shadow:0 14px 34px rgba(18,61,50,.08)}
        *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}
        .pmd-shell{min-height:100vh}.pmd-side{position:fixed;inset:14px auto 14px 14px;width:184px;background:linear-gradient(180deg,#103a30,#0d3028);border-radius:22px;padding:18px 12px;color:#fff;display:flex;flex-direction:column;z-index:30;box-shadow:var(--shadow)}
        .brand{display:flex;align-items:center;gap:10px;padding:4px 8px 18px}.brand img{width:34px;height:34px}.brand strong{font-size:17px;line-height:1.05}.brand small{display:block;color:#b9cec7;font-size:10px;margin-top:3px}
        .nav{display:grid;gap:7px}.nav a{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:13px;color:#d9e8e3;font-size:13px;font-weight:700}.nav a:hover,.nav a.active{background:rgba(255,255,255,.12);color:#fff}.nav svg{width:18px;height:18px;stroke-width:1.8;fill:none;stroke:currentColor}.side-foot{margin-top:auto;border-top:1px solid rgba(255,255,255,.12);padding-top:12px}
        .pmd-main{margin-left:212px;padding:14px 14px 28px}.topbar{height:66px;background:#fff;border:1px solid var(--line);border-radius:18px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-shadow:0 8px 24px rgba(18,61,50,.05);position:sticky;top:14px;z-index:20}.top-left h1{font-size:19px;margin:0}.top-left p{margin:4px 0 0;color:var(--muted);font-size:12px}.user-pill{display:flex;align-items:center;gap:10px;background:#f4f8f6;border:1px solid var(--line);border-radius:999px;padding:7px 11px}.avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;font-weight:800;font-size:11px}.user-pill strong{font-size:12px}.user-pill small{display:block;color:var(--muted);font-size:10px}
        .content{padding-top:14px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin:6px 0 16px}.hero h2{font-size:28px;margin:0 0 5px}.hero p{margin:0;color:var(--muted);font-size:13px}.btn{border:0;border-radius:12px;padding:10px 14px;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.btn-primary{background:var(--green);color:#fff}.btn-soft{background:#eef5f2;color:var(--green)}.btn-danger{background:#fff1f0;color:var(--danger);border:1px solid #ffd5d2}.btn[disabled]{opacity:.55;cursor:not-allowed}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}.stat,.card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 24px rgba(18,61,50,.045)}.stat{padding:18px}.stat .label{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}.stat .value{font-size:30px;font-weight:850;margin-top:8px}.stat .hint{font-size:11px;color:var(--muted);margin-top:3px}.card{padding:18px}.card-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.card-head h3{margin:0;font-size:16px}.card-head p{margin:4px 0 0;color:var(--muted);font-size:11px}
        .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}table{border-collapse:collapse;width:100%;min-width:760px}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #edf2f0;font-size:12px}th{background:#f7faf9;color:#60756d;font-size:10px;text-transform:uppercase;letter-spacing:.05em}tr:last-child td{border-bottom:0}.tenant-name{font-weight:800}.sub{display:block;color:var(--muted);font-size:10px;margin-top:3px}.badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800;background:#eef5f2;color:var(--green)}.badge.ok{background:#ecfdf3;color:var(--ok)}.badge.warn{background:#fff7ed;color:var(--warn)}.badge.bad{background:#fff1f0;color:var(--danger)}
        .grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:11px;font-weight:800;color:#526961}.field input,.field select,.field textarea{width:100%;border:1px solid #d8e5e0;border-radius:11px;background:#fff;padding:10px 11px;color:var(--ink);outline:none}.field textarea{min-height:90px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#67a391;box-shadow:0 0 0 3px rgba(44,111,89,.10)}
        .flash{padding:12px 14px;border-radius:12px;margin-bottom:14px;font-size:12px;font-weight:700}.flash.success{background:#ecfdf3;color:#067647;border:1px solid #abefc6}.flash.warning{background:#fff7ed;color:#b54708;border:1px solid #fed7aa}.flash.error{background:#fff1f0;color:#b42318;border:1px solid #fecdca}.filters{display:flex;gap:8px;flex-wrap:wrap}.filters input,.filters select{border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;font-size:12px}.empty{text-align:center;padding:30px;color:var(--muted);font-size:12px}.health-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#98a2b3}.health-dot.ok{background:#12b76a}.health-dot.bad{background:#f04438}
        .mobile-menu{display:none}.backdrop{display:none}
        @media(max-width:900px){.pmd-side{transform:translateX(-220px);transition:.2s}.pmd-side.open{transform:translateX(0)}.pmd-main{margin-left:0;padding:10px}.topbar{top:10px}.stats{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}.mobile-menu{display:inline-flex}.backdrop.show{display:block;position:fixed;inset:0;background:rgba(9,28,23,.35);backdrop-filter:blur(3px);z-index:25}.hero{align-items:flex-start;flex-direction:column}.field-grid{grid-template-columns:1fr}.field.full{grid-column:auto}}
        @media(max-width:560px){.stats{display:flex;overflow:auto}.stat{min-width:165px}.top-left p{display:none}.user-pill .user-copy{display:none}}
    </style>
    @stack('head')
</head>
<body>
<div class="backdrop" id="pmdBackdrop"></div>
<aside class="pmd-side" id="pmdSide">
    <a class="brand" href="/superadmin/index">
        <img src="/app/admin/assets/images/pmd-brand-mark.svg" alt="PMD">
        <span><strong>Pay My Dine</strong><small>Super Admin</small></span>
    </a>
    @php($path = trim(request()->path(), '/'))
    <nav class="nav">
        <a href="/superadmin/index" class="{{ $path === 'superadmin/index' ? 'active' : '' }}"><svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>Overview</a>
        <a href="/superadmin/new" class="{{ $path === 'superadmin/new' ? 'active' : '' }}"><svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>Restaurants</a>
        <a href="/superadmin/health" class="{{ $path === 'superadmin/health' ? 'active' : '' }}"><svg viewBox="0 0 24 24"><path d="M4 13h4l2-6 4 12 2-6h4"/></svg>Tenant Health</a>
        <a href="/superadmin/location-requests" class="{{ $path === 'superadmin/location-requests' ? 'active' : '' }}"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.3 6-11a6 6 0 10-12 0c0 5.7 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></svg>Location Requests</a>
        <a href="/superadmin/settings" class="{{ $path === 'superadmin/settings' ? 'active' : '' }}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2h-4V21a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 00.3-1.9A1.7 1.7 0 003 14H2.8v-4H3a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 001.9.3A1.7 1.7 0 0010 3V2.8h4V3a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 00-.3 1.9A1.7 1.7 0 0021 10h.2v4H21a1.7 1.7 0 00-1.6 1z"/></svg>Settings</a>
    </nav>
    <div class="side-foot nav"><a href="/superadmin/signout"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5"/></svg>Sign out</a></div>
</aside>
<main class="pmd-main">
    <header class="topbar">
        <div style="display:flex;align-items:center;gap:10px"><button class="btn btn-soft mobile-menu" id="pmdMenuBtn" type="button">☰</button><div class="top-left"><h1>@yield('page_title','Super Admin')</h1><p>@yield('page_subtitle','PayMyDine platform control plane')</p></div></div>
        <div class="user-pill"><div class="avatar">SA</div><div class="user-copy"><strong>{{ session('superadmin_username','Super Admin') }}</strong><small>Platform administrator</small></div></div>
    </header>
    <section class="content">
        @if(session('success'))<div class="flash success">{{ session('success') }}</div>@endif
        @if(session('warning'))<div class="flash warning">{{ session('warning') }}</div>@endif
        @if($errors->any())<div class="flash error">{{ $errors->first() }}</div>@endif
        @yield('content')
    </section>
</main>
<script>
(function(){var side=document.getElementById('pmdSide'),btn=document.getElementById('pmdMenuBtn'),back=document.getElementById('pmdBackdrop');function close(){side&&side.classList.remove('open');back&&back.classList.remove('show')}if(btn)btn.addEventListener('click',function(){side.classList.toggle('open');back.classList.toggle('show')});if(back)back.addEventListener('click',close)})();
</script>
@stack('scripts')
</body>
</html>
