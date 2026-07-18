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

<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V4_START -->
<style>
  /*
   * These rules are intentionally inline.
   * They determine the first painted frame before
   * the external Side Menu stylesheet finishes loading.
   */

  html.pmd-side-menu2-global-page {
    --pmd-admin-gap: 14px;
    --pmd-sm2-panel: 72px;
    --pmd-sm2-speed: 220ms;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-expanded {
    --pmd-sm2-panel: 198px;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2 {
    position: fixed !important;
    left: 14px !important;
    top: 14px !important;
    bottom: 14px !important;
    width: var(--pmd-sm2-panel) !important;
    z-index: 12000 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    border-radius: 22px !important;
    background:
      linear-gradient(
        180deg,
        #06120f 0%,
        #003d34 100%
      ) !important;
    transition:
      width var(--pmd-sm2-speed)
      cubic-bezier(.22,.75,.24,1) !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .pmd-sm2__brand {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    height: 116px !important;
    min-height: 116px !important;
    padding: 4px 8px 8px !important;
    border: 0 !important;
    overflow: hidden !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2-logo {
    display: block !important;
    width: 50px !important;
    min-width: 50px !important;
    height: 58px !important;
    flex: 0 0 50px !important;
    margin: 0 auto !important;
    background-image:
      url("/app/admin/assets/images/paymydine-logo.svg?v=20260719-global-symbol-1")
      !important;
    background-repeat: no-repeat !important;
    background-position: center top !important;
    background-size: 50px auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  html.pmd-side-menu2-global-page.pmd-sm2-expanded
    #pmd-side-menu2-logo {
    width: 116px !important;
    min-width: 116px !important;
    height: 116px !important;
    flex-basis: 116px !important;
    background-size: 116px auto !important;
  }

  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    img,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    picture,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .logo,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    .logo-svg,
  html.pmd-side-menu2-global-page
    #pmd-side-menu2
    [class*="single-logo"] {
    display: none !important;
  }
</style>
<!-- PMD_GLOBAL_MENU_CRITICAL_GEOMETRY_V4_END -->

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=20260719-global-4"
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
    src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=20260719-global-4"
    defer
></script>

<script
    src="/app/admin/assets/js/pmd-admin-exact-layout-v1.js?v=20260719-global-4"
    defer
></script>
@endif
