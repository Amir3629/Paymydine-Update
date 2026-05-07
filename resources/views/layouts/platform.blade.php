<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Terminal Devices Platform')</title>
    @php
        $platformStyles = [
            'app/admin/assets/css/admin.css',
            'app/admin/assets/css/custom-fixes.css',
            'app/admin/assets/css/daterangepicker-arrows.css',
            'app/admin/assets/vendor/pmd-mediafix/daterangepicker.css',
        ];
        $platformScripts = [
            'app/admin/assets/vendor/pmd-mediafix/jquery.min.js',
            'app/admin/assets/vendor/pmd-mediafix/moment.min.js',
            'app/admin/assets/vendor/pmd-mediafix/daterangepicker.js',
            'app/admin/assets/vendor/pmd-mediafix/force-blue-buttons.js',
            'app/admin/assets/vendor/pmd-mediafix/jquery-sortable.js',
        ];
    @endphp
    @foreach ($platformStyles as $style)
        @if (file_exists(base_path($style)) || file_exists(public_path($style)))
            <link rel="stylesheet" href="{{ asset($style) }}">
        @endif
    @endforeach
    <style>
        :root { --platform-blue: #2563eb; --platform-dark: #111827; --platform-muted: #6b7280; --platform-bg: #f3f6fb; --platform-card: #ffffff; --platform-border: #e5e7eb; }
        * { box-sizing: border-box; }
        body.platform-body { margin: 0; min-height: 100vh; background: var(--platform-bg); color: var(--platform-dark); font-family: Inter, Roboto, Arial, sans-serif; }
        .platform-shell { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
        .platform-sidebar { background: #0f172a; color: #dbeafe; padding: 24px 18px; position: sticky; top: 0; height: 100vh; }
        .platform-brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 800; font-size: 20px; margin-bottom: 28px; }
        .platform-brand-icon { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: var(--platform-blue); }
        .platform-nav-section { color: #93c5fd; text-transform: uppercase; letter-spacing: .08em; font-size: 11px; margin: 24px 12px 10px; }
        .platform-nav-link { display: flex; align-items: center; gap: 10px; color: #dbeafe; text-decoration: none; padding: 12px; border-radius: 12px; margin-bottom: 6px; }
        .platform-nav-link:hover, .platform-nav-link.active { background: rgba(37, 99, 235, .22); color: #fff; text-decoration: none; }
        .platform-main { min-width: 0; }
        .platform-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: rgba(255,255,255,.92); border-bottom: 1px solid var(--platform-border); padding: 16px 28px; position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px); }
        .platform-topbar h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .platform-topbar small { color: var(--platform-muted); }
        .platform-content { padding: 28px; }
        .platform-card { background: var(--platform-card); border: 1px solid var(--platform-border); border-radius: 18px; box-shadow: 0 16px 40px rgba(15, 23, 42, .07); }
        .platform-mobile-toggle { display: none; border: 0; background: var(--platform-blue); color: #fff; border-radius: 10px; padding: 9px 12px; }
        .platform-toast { position: fixed; right: 22px; bottom: 22px; max-width: 420px; padding: 15px 18px; border-radius: 14px; background: #111827; color: #fff; box-shadow: 0 18px 45px rgba(0,0,0,.25); transform: translateY(130%); transition: transform .22s ease; z-index: 100; }
        .platform-toast.show { transform: translateY(0); }
        .platform-toast.success { background: #047857; }
        .platform-toast.error { background: #b91c1c; }
        @media (max-width: 900px) { .platform-shell { grid-template-columns: 1fr; } .platform-sidebar { display: none; position: fixed; z-index: 20; width: 260px; } .platform-sidebar.open { display: block; } .platform-mobile-toggle { display: inline-flex; } .platform-content { padding: 18px; } .platform-topbar { padding: 14px 18px; } }
    </style>
    @stack('styles')
</head>
<body class="platform-body">
    <div class="platform-shell">
        <aside class="platform-sidebar" id="platformSidebar">
            <div class="platform-brand"><span class="platform-brand-icon">POS</span><span>Admin Platform</span></div>
            <div class="platform-nav-section">Management</div>
            <a class="platform-nav-link" href="{{ url('/admin') }}">Dashboard</a>
            <a class="platform-nav-link active" href="{{ route('terminal_devices_platform.index') }}">Terminal Devices</a>
            <div class="platform-nav-section">Payments</div>
            <a class="platform-nav-link" href="{{ url('/admin/payment-providers-admin') }}">Providers</a>
            <a class="platform-nav-link" href="{{ url('/admin/payment-methods-admin') }}">Methods</a>
        </aside>
        <main class="platform-main">
            <header class="platform-topbar">
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="platform-mobile-toggle" type="button" data-platform-sidebar-toggle>☰</button>
                    <div><h1>@yield('page-title', 'Terminal Devices')</h1><small>POS payment terminal management</small></div>
                </div>
                <div><strong>Admin</strong></div>
            </header>
            <section class="platform-content">
                @yield('main')
            </section>
        </main>
    </div>
    <div class="platform-toast" id="platformToast" role="status" aria-live="polite"></div>
    @foreach ($platformScripts as $script)
        @if (file_exists(base_path($script)) || file_exists(public_path($script)))
            <script src="{{ asset($script) }}"></script>
        @endif
    @endforeach
    <script>
        window.PlatformToast = function(message, type) {
            var toast = document.getElementById('platformToast');
            toast.textContent = message;
            toast.className = 'platform-toast show ' + (type || 'success');
            window.clearTimeout(window.__platformToastTimer);
            window.__platformToastTimer = window.setTimeout(function () { toast.className = 'platform-toast'; }, 4200);
        };
        document.querySelectorAll('[data-platform-sidebar-toggle]').forEach(function(button) {
            button.addEventListener('click', function() { document.getElementById('platformSidebar').classList.toggle('open'); });
        });
    </script>
    @stack('scripts')
</body>
</html>
