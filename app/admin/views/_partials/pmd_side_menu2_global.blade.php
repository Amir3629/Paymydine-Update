@php
    $pmdPath = trim(request()->path(), '/');

    $pmdSideMenuExcluded =
        $pmdPath === 'admin/login' ||
        str_starts_with($pmdPath, 'admin/dashboardwaiter') ||
        str_starts_with($pmdPath, 'admin/kds') ||
        str_starts_with($pmdPath, 'admin/dashboardkitchen') ||
        str_starts_with($pmdPath, 'admin/quick-mode');

    $pmdIsReservations2 =
        str_starts_with($pmdPath, 'admin/reservations2');

    $pmdActive = function ($paths) use ($pmdPath) {
        foreach ((array) $paths as $path) {
            if (
                $pmdPath === 'admin/'.$path ||
                str_starts_with($pmdPath, 'admin/'.$path.'/')
            ) {
                return true;
            }
        }

        return false;
    };
@endphp

@if(!$pmdSideMenuExcluded && !$pmdIsReservations2)
<script>
(function () {
    var state = 'collapsed';

    try {
        state =
            localStorage.getItem('pmd.sideMenu2.state') === 'expanded'
                ? 'expanded'
                : 'collapsed';
    } catch (error) {}

    document.documentElement.classList.add(
        state === 'expanded'
            ? 'pmd-sm2-expanded'
            : 'pmd-sm2-collapsed'
    );

    document.documentElement.classList.add(
        'pmd-side-menu2-global-page'
    );
})();
</script>

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-global-2"
>

<aside id="pmd-side-menu2" aria-label="Admin navigation">
    <a
        class="pmd-sm2__brand"
        href="{{ admin_url('dashboard') }}"
        aria-label="PayMyDine Dashboard"
    >
        <span
            id="pmd-side-menu2-logo"
            class="pmd-sm2__mark"
            aria-hidden="true"
        ></span>
    </a>

    <nav class="pmd-sm2__nav">
        <a
            class="pmd-sm2__item {{ $pmdActive(['dashboard']) ? 'is-active' : '' }}"
            href="{{ admin_url('dashboard') }}"
        >
            <svg viewBox="0 0 24 24">
                <path d="M3 11 12 4l9 7"/>
                <path d="M5 10v10h14V10"/>
                <path d="M9 20v-6h6v6"/>
            </svg>
            <span class="pmd-sm2__label">Dashboard</span>
        </a>

        <a
            class="pmd-sm2__item {{ $pmdActive(['orders']) ? 'is-active' : '' }}"
            href="{{ admin_url('orders') }}"
        >
            <svg viewBox="0 0 24 24">
                <path d="M6 7h12l1 13H5L6 7Z"/>
                <path d="M9 7V5a3 3 0 0 1 6 0v2"/>
            </svg>
            <span class="pmd-sm2__label">Orders</span>
        </a>

        <a
            class="pmd-sm2__item {{ $pmdActive(['reservations', 'reservations2']) ? 'is-active' : '' }}"
            href="{{ admin_url('reservations2') }}"
        >
            <svg viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <path d="M7 3v4M17 3v4M3 10h18"/>
                <path d="M8 14h3M13 14h3M8 17h3"/>
            </svg>
            <span class="pmd-sm2__label">Reservations</span>
        </a>

        <a
            class="pmd-sm2__item {{ $pmdActive(['coupons']) ? 'is-active' : '' }}"
            href="{{ admin_url('coupons') }}"
        >
            <svg viewBox="0 0 24 24">
                <path d="m3 12 9-9 9 9-9 9-9-9Z"/>
                <circle cx="9" cy="9" r="1.5"/>
            </svg>
            <span class="pmd-sm2__label">Coupons &amp; Gifts</span>
        </a>

        <div
            class="pmd-sm2__dropdown"
            data-pmd-sm2-dropdown="restaurant"
        >
            <button
                type="button"
                class="pmd-sm2__dropdown-toggle"
                data-pmd-sm2-dropdown-toggle
                aria-expanded="false"
            >
                <svg viewBox="0 0 24 24">
                    <path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/>
                </svg>
                <span class="pmd-sm2__label">Restaurant</span>
            </button>

            <div class="pmd-sm2__submenu">
                <div class="pmd-sm2__submenu-inner">
                    <a class="pmd-sm2__subitem" href="{{ admin_url('locations') }}">Locations</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('menus') }}">Menu Items</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('categories') }}">Categories</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('mealtimes') }}">Mealtimes</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('tables') }}">Tables</a>
                </div>
            </div>
        </div>

        <a class="pmd-sm2__item" href="{{ admin_url('dashboardkitchen') }}">
            <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="13" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
            </svg>
            <span class="pmd-sm2__label">Kitchen Display</span>
        </a>

        <div
            class="pmd-sm2__dropdown"
            data-pmd-sm2-dropdown="design"
        >
            <button
                type="button"
                class="pmd-sm2__dropdown-toggle"
                data-pmd-sm2-dropdown-toggle
                aria-expanded="false"
            >
                <svg viewBox="0 0 24 24">
                    <path d="m14 4 6 6L9 21H3v-6L14 4Z"/>
                    <path d="m12 6 6 6"/>
                </svg>
                <span class="pmd-sm2__label">Design</span>
            </button>

            <div class="pmd-sm2__submenu">
                <div class="pmd-sm2__submenu-inner">
                    <a class="pmd-sm2__subitem" href="{{ admin_url('themes') }}">Themes</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('mail_templates') }}">Mail Templates</a>
                </div>
            </div>
        </div>

        <div
            class="pmd-sm2__dropdown"
            data-pmd-sm2-dropdown="system"
        >
            <button
                type="button"
                class="pmd-sm2__dropdown-toggle"
                data-pmd-sm2-dropdown-toggle
                aria-expanded="false"
            >
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2H10V21a1.7 1.7 0 0 0-1-1.6"/>
                </svg>
                <span class="pmd-sm2__label">System</span>
            </button>

            <div class="pmd-sm2__submenu">
                <div class="pmd-sm2__submenu-inner">
                    <a class="pmd-sm2__subitem" href="{{ admin_url('settings') }}">Settings</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('staffs') }}">Staff</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('system_logs') }}">System Logs</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('pos_configs') }}">POS Sync Settings</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('terminal_devices') }}">Terminal Devices</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('statuses') }}">Statuses</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('payments') }}">Payments</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('tips') }}">Tips</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('languages') }}">Languages</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('currencies') }}">Currencies</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('countries') }}">Countries</a>
                </div>
            </div>
        </div>

        <div
            class="pmd-sm2__dropdown"
            data-pmd-sm2-dropdown="tools"
        >
            <button
                type="button"
                class="pmd-sm2__dropdown-toggle"
                data-pmd-sm2-dropdown-toggle
                aria-expanded="false"
            >
                <svg viewBox="0 0 24 24">
                    <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5"/>
                </svg>
                <span class="pmd-sm2__label">Tools</span>
            </button>

            <div class="pmd-sm2__submenu">
                <div class="pmd-sm2__submenu-inner">
                    <a class="pmd-sm2__subitem" href="{{ admin_url('kds_stations') }}">Manage KDS Stations</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('media_manager') }}">Media Manager</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('dashboardkitchen') }}">Main Kitchen</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('dashboardkitchen') }}?station=bar">Bar / Drinks</a>
                    <a class="pmd-sm2__subitem" href="{{ admin_url('reviews') }}">Customer Reviews</a>
                    <a class="pmd-sm2__subitem" href="/admin/quick-mode?preview=pmdquick2026">Quick Mode</a>
                </div>
            </div>
        </div>
    </nav>

    <div class="pmd-sm2__footer">
        <button
            type="button"
            class="pmd-sm2__toggle"
            data-pmd-sm2-toggle
            aria-expanded="false"
        >
            <svg viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6"/>
            </svg>
            <span>Collapse menu</span>
        </button>
    </div>
</aside>

<script
    src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260719-global-2"
    defer
></script>

<script
    src="/app/admin/assets/js/pmd-admin-exact-layout-v1.js?v=20260719-global-2"
    defer
></script>
@endif
