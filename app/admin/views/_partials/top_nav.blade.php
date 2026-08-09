@php
use Illuminate\Support\Facades\DB;

// Helper function to validate if image file exists
if (!function_exists('validateImageExists')) {
    function validateImageExists($imageUrl) {
        if (empty($imageUrl)) {
            return false;
        }
        
        // Extract relative path from URL
        $parsedUrl = parse_url($imageUrl);
        if (!isset($parsedUrl['path'])) {
            return false;
        }
        
        $path = $parsedUrl['path'];
        $path = ltrim($path, '/');
        
        // List of possible storage paths to check
        $possiblePaths = [];
        
        // Check if it's a storage/temp/public path
        if (strpos($path, 'storage/temp/public/') === 0) {
            $relativePath = substr($path, strlen('storage/temp/public/'));
            $possiblePaths[] = base_path('storage/temp/public/' . $relativePath);
            $possiblePaths[] = storage_path('temp/public/' . $relativePath);
            $possiblePaths[] = storage_path('app/public/temp/public/' . $relativePath);
            $possiblePaths[] = base_path('storage/app/public/temp/public/' . $relativePath);
            $possiblePaths[] = public_path('storage/temp/public/' . $relativePath);
        } elseif (strpos($path, 'storage/') === 0) {
            $relativePath = substr($path, strlen('storage/'));
            $possiblePaths[] = storage_path('app/public/' . $relativePath);
            $possiblePaths[] = base_path('storage/app/public/' . $relativePath);
            $possiblePaths[] = public_path('storage/' . $relativePath);
        } else {
            $possiblePaths[] = public_path($path);
            $possiblePaths[] = base_path($path);
        }
        
        // Check each possible path
        foreach ($possiblePaths as $fullPath) {
            if (file_exists($fullPath) && is_file($fullPath)) {
                $imageInfo = @getimagesize($fullPath);
                if ($imageInfo !== false && $imageInfo[0] > 0 && $imageInfo[1] > 0) {
                    return true;
                }
            }
        }
        
        return false;
    }
}



// Check for invalid thumbnail patterns
$invalidThumbPatterns = [
    'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
    'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg'
];

// Validate the image exists, if not clear it from database
// PMD_TOPNAV_DASHBOARD_LOGO_RENDER_FIX_START
// Read Dashboard Logo from the current tenant DB and normalize it for browser rendering.
// IMPORTANT: Do not fallback to site_logo. If dashboard_logo is empty, no dashboard logo should show.
try {
    $pmdHost = (string)request()->getHost();
    $pmdTenant = strtolower(explode('.', $pmdHost)[0] ?? '');

    $pmdNormalizeDashboardLogo = function ($value) use ($pmdTenant) {
        $value = trim((string)$value);
        if ($value === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $value)) {
            $path = parse_url($value, PHP_URL_PATH) ?: '';
            if (strpos($path, '/assets/media/uploads/') !== false) {
                return 'https://' . $pmdTenant . '.paymydine.com' . $path;
            }
            return $value;
        }

        if (strpos($value, '/assets/media/uploads/') === 0) {
            return 'https://' . $pmdTenant . '.paymydine.com' . $value;
        }

        if (strpos($value, '/storage/temp/') === 0) {
            return 'https://' . $pmdTenant . '.paymydine.com' . $value;
        }

        return 'https://' . $pmdTenant . '.paymydine.com/assets/media/uploads/' . ltrim($value, '/');
    };

    if ($pmdTenant !== '' && !in_array($pmdTenant, ['www', 'paymydine'], true) && preg_match('/^[A-Za-z0-9_]+$/', $pmdTenant)) {
        $safeDb = str_replace('`', '``', $pmdTenant);

        $pmdRow = DB::selectOne("SELECT value FROM `{$safeDb}`.`ti_settings` WHERE item = ? ORDER BY setting_id DESC LIMIT 1", ['dashboard_logo']);
        $pmdValue = $pmdRow ? trim((string)$pmdRow->value) : '';

        if ($pmdValue === '') {
            $pmdRow = DB::selectOne("SELECT dashboard_logo FROM `{$safeDb}`.`ti_logos` ORDER BY id DESC LIMIT 1");
            $pmdValue = $pmdRow ? trim((string)$pmdRow->dashboard_logo) : '';
        }

        $imgSrcDashboard = $pmdNormalizeDashboardLogo($pmdValue);
    }
} catch (\Throwable $pmdLogoError) {
    // Keep existing value if this fallback fails.
}
// PMD_TOPNAV_DASHBOARD_LOGO_RENDER_FIX_END

if (!empty($imgSrcDashboard)) {
    // Check if it matches invalid patterns
    $isInvalid = false;
    foreach ($invalidThumbPatterns as $pattern) {
        if (strpos($imgSrcDashboard, $pattern) !== false) {
            $isInvalid = true;
            break;
        }
    }
    
    // Also validate file existence
    if (!$isInvalid && !validateImageExists($imgSrcDashboard)) {
        // PMD fix: never clear dashboard_logo from DB during navbar render.
        // Rendering should not mutate settings. If validation fails, still allow browser to try the normalized URL.
        // This prevents Dashboard Logo from disappearing after save.
    }
    
    if ($isInvalid) {
        // PMD disabled: never clear dashboard_logo during navbar render.
        // PMD disabled: never clear dashboard_logo setting during navbar render.
        $imgSrcDashboard = null;
    }
}
@endphp


{{-- PMD_SHARED_HEADER_V20_EXACT_CLEAN
     Order Edit uses the same visual/header contract as Dashboard2:
     #pmd-r2-clean-header
     .pmd-r2-clean-title
     .pmd-r2-clean-actions

     No legacy navbar.
     No fake secondary header.
     No client-side header creation.
--}}

@php
    /* PMD_MODERN_ADMIN_PAGES_V21 */
    $pmdSharedHeaderV20OrderEdit =
        request()->is('admin/orders/edit/*')
        || request()->is('admin/coupons/edit/*')
        || request()->is('admin/themes')
        || request()->is('admin/themes/edit/frontend-theme');

    $pmdSharedHeaderV20Title = 'Bestellung';

    if (request()->is('admin/coupons/edit/*')) {
        $pmdSharedHeaderV20Title = 'Coupon / Gift Card';
    } elseif (request()->is('admin/themes/edit/frontend-theme')) {
        $pmdSharedHeaderV20Title = 'Theme';
    } elseif (request()->is('admin/themes')) {
        $pmdSharedHeaderV20Title = 'Themes';
    }
@endphp

@if(AdminAuth::isLogged() && $pmdSharedHeaderV20OrderEdit)

<style id="pmd-shared-header-v20-style">

    /*
     * Dashboard2 exact header shell.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20 {
        position: relative !important;

        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;

        width: calc(100% - 124px) !important;
        max-width: none !important;

        height: 64px !important;
        min-height: 64px !important;

        margin:
            11px
            24px
            0
            100px !important;

        padding: 0 !important;

        box-sizing: border-box !important;

        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;

        overflow: visible !important;

        z-index: 120 !important;
    }

    /*
     * EXACT clean title language used by Dashboard2.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    .pmd-r2-clean-title {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #17231f !important;

        font-size: 22px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;

        letter-spacing: 0 !important;

        white-space: nowrap !important;
    }

    /*
     * Real Dashboard2 actions layout.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    .pmd-r2-clean-actions {
        display: flex !important;
        flex-direction: row !important;

        align-items: center !important;
        justify-content: flex-end !important;

        gap: 10px !important;

        margin: 0 0 0 auto !important;
        padding: 0 !important;

        min-width: 0 !important;

        overflow: visible !important;
    }

    /*
     * The existing real admin mainmenu stays alive because it owns
     * notification functionality.
     *
     * But on Order Edit we expose ONLY notification from it.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    #menu-mainmenu {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;

        gap: 10px !important;

        margin: 0 !important;
        padding: 0 !important;

        list-style: none !important;

        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
    }

    #pmd-r2-clean-header.pmd-shared-header-v20
    #menu-mainmenu > li {
        display: none !important;
    }

    #pmd-r2-clean-header.pmd-shared-header-v20
    #menu-mainmenu > #notif-root {
        display: block !important;

        position: relative !important;

        margin: 0 !important;
        padding: 0 !important;

        list-style: none !important;

        overflow: visible !important;
    }

    /*
     * Calendar + Notification:
     * exact same dimensions and visual geometry as Dashboard2.
     */
    #pmd-shared-calendar-v20,
    #pmd-r2-clean-header.pmd-shared-header-v20
    #notifDropdown {
        position: relative !important;

        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;

        flex: 0 0 46px !important;

        width: 46px !important;
        min-width: 46px !important;
        max-width: 46px !important;

        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;

        margin: 0 !important;
        padding: 0 !important;

        box-sizing: border-box !important;

        border: 1px solid #cfe0ec !important;
        border-radius: 14px !important;

        background: #ffffff !important;

        color: #173752 !important;

        box-shadow:
            0 3px 10px
            rgba(23, 55, 82, .05) !important;

        text-decoration: none !important;

        cursor: pointer !important;

        overflow: visible !important;

        opacity: 1 !important;
        visibility: visible !important;

        transform: none !important;
    }

    #pmd-shared-calendar-v20:hover,
    #pmd-r2-clean-header.pmd-shared-header-v20
    #notifDropdown:hover {
        background: #f4f8fb !important;

        border-color: #9fc2d8 !important;

        box-shadow:
            0 8px 20px
            rgba(23, 55, 82, .12) !important;
    }

    /*
     * Remove Bootstrap dropdown triangle.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    #notifDropdown::after {
        display: none !important;
        content: none !important;

        margin: 0 !important;
        border: 0 !important;
    }

    /*
     * Calendar SVG.
     */
    #pmd-shared-calendar-v20 svg {
        display: block !important;

        width: 21px !important;
        height: 21px !important;

        min-width: 21px !important;
        min-height: 21px !important;

        fill: none !important;
        stroke: currentColor !important;

        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;

        pointer-events: none !important;
    }

    /*
     * Notification bell.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    #bell-icon {
        display: inline-flex !important;

        align-items: center !important;
        justify-content: center !important;

        width: 21px !important;
        height: 21px !important;

        color: #173752 !important;

        pointer-events: none !important;
    }

    #pmd-r2-clean-header.pmd-shared-header-v20
    #bell-icon svg {
        display: block !important;

        width: 21px !important;
        height: 21px !important;

        fill: none !important;
        stroke: currentColor !important;
    }

    /*
     * Dashboard2 badge placement.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    #notification-count {
        position: absolute !important;

        top: -7px !important;
        right: -8px !important;

        z-index: 5 !important;
    }

    /*
     * IMPORTANT:
     * do not alter the real notification dropdown panel itself.
     */
    #pmd-r2-clean-header.pmd-shared-header-v20
    #notification-panel {
        right: 0 !important;
        left: auto !important;

        top: calc(100% + 8px) !important;

        z-index: 10050 !important;
    }

    /*
     * Header and page share ONE canvas.
     * No white toolbar frame.
     */
    html,
    body,
    .page-wrapper,
    .page-content {
        background-color: #f5f7fa !important;
    }

    /*
     * No legacy topbar height / white stripe.
     */
    body:has(.order-info-header)
    nav.navbar.navbar-top {
        display: none !important;
    }

    /*
     * Responsive.
     */
    @media (max-width: 820px) {
        #pmd-r2-clean-header.pmd-shared-header-v20 {
            width:
                calc(100% - 90px) !important;

            height: 58px !important;
            min-height: 58px !important;

            margin:
                8px
                12px
                0
                78px !important;
        }

        #pmd-r2-clean-header.pmd-shared-header-v20
        .pmd-r2-clean-title {
            font-size: 19px !important;
        }

        #pmd-shared-calendar-v20,
        #pmd-r2-clean-header.pmd-shared-header-v20
        #notifDropdown {
            width: 42px !important;
            min-width: 42px !important;
            max-width: 42px !important;

            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;

            border-radius: 11px !important;
        }
    }

/* PMD_SHARED_HEADER_V20_1_NOTIFICATION_ICON */

<style id="pmd-shared-header-v20-1-notification-icon-style">

    #pmd-r2-clean-header
    #notifDropdown
    .pmd-v20-notification-bell {
        display: inline-flex !important;

        align-items: center !important;
        justify-content: center !important;

        width: 21px !important;
        height: 21px !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #173752 !important;

        pointer-events: none !important;
    }

    #pmd-r2-clean-header
    #notifDropdown
    .pmd-v20-notification-bell svg {
        display: block !important;

        width: 21px !important;
        height: 21px !important;

        margin: 0 !important;
        padding: 0 !important;

        fill: none !important;

        stroke: currentColor !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;

        overflow: visible !important;

        pointer-events: none !important;
    }

</style>

<script>
(function () {
    'use strict';

    var MARK =
        'PMD_SHARED_HEADER_V20_1_NOTIFICATION_ICON';

    if (
        !/^\/admin\/orders\/edit\/\d+\/?$/.test(
            String(window.location.pathname || '')
        )
    ) {
        return;
    }

    function installBell() {
        var trigger =
            document.getElementById(
                'notifDropdown'
            );

        if (!trigger) {
            return false;
        }

        /*
         * Existing notification functionality stays untouched.
         *
         * We only ensure that one visible bell SVG exists.
         */
        var existing =
            trigger.querySelector(
                '.pmd-v20-notification-bell'
            );

        if (existing) {
            return true;
        }

        /*
         * Hide legacy icon wrappers only if they exist.
         * Badge / count is NOT touched.
         */
        trigger
            .querySelectorAll(
                '#bell-icon, .fa-bell, .ti-bell, .icon-bell'
            )
            .forEach(function (node) {
                node.style.setProperty(
                    'display',
                    'none',
                    'important'
                );
            });

        var bell =
            document.createElement('span');

        bell.className =
            'pmd-v20-notification-bell';

        bell.setAttribute(
            'aria-hidden',
            'true'
        );

        bell.innerHTML =
            '<svg viewBox="0 0 24 24">' +
                '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
                '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' +
            '</svg>';

        /*
         * Put the bell before the badge so the badge keeps
         * its absolute-position authority.
         */
        trigger.insertBefore(
            bell,
            trigger.firstChild
        );

        trigger.setAttribute(
            'data-pmd-v20-notification-icon',
            '1'
        );

        return true;
    }

    /*
     * Finite retries only.
     * No MutationObserver.
     * No interval.
     */
    [
        0,
        80,
        220,
        500,
        900
    ].forEach(function (delay) {
        window.setTimeout(
            installBell,
            delay
        );
    });

    window.PMDSharedHeaderV20_1 = {
        version: '20.1.0',

        apply: installBell,

        audit: function () {
            var trigger =
                document.getElementById(
                    'notifDropdown'
                );

            var bell =
                trigger &&
                trigger.querySelector(
                    '.pmd-v20-notification-bell'
                );

            var badge =
                document.getElementById(
                    'notification-count'
                );

            return {
                marker: MARK,

                notificationTrigger:
                    !!trigger,

                bellVisible:
                    !!bell &&
                    getComputedStyle(
                        bell
                    ).display !== 'none',

                bellSvg:
                    !!bell?.querySelector(
                        'svg'
                    ),

                badgeVisible:
                    !!badge &&
                    getComputedStyle(
                        badge
                    ).display !== 'none',

                badgeText:
                    badge
                        ? badge.textContent.trim()
                        : null
            };
        }
    };

    console.info(
        '[PMD Shared Header V20.1] notification icon ready',
        window.PMDSharedHeaderV20_1.audit()
    );
})();
</script>



</style>

<header
    id="pmd-r2-clean-header"
    class="pmd-shared-header-v20"
    aria-label="Admin page header"
>

    <h1 class="pmd-r2-clean-title">
        {{ $pmdSharedHeaderV20Title }}
    </h1>

    <div
        class="pmd-r2-clean-actions"
        data-pmd-header-actions
    >

        <a
            id="pmd-shared-calendar-v20"
            href="{{ admin_url('dashboard2') }}"
            aria-label="Kalender öffnen"
            title="Kalender öffnen"
        >
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="2"
                ></rect>

                <path d="M16 3v4"></path>
                <path d="M8 3v4"></path>
                <path d="M3 11h18"></path>
            </svg>
        </a>

        @if(isset($this->widgets['mainmenu']))
            {!! $this->widgets['mainmenu']->render() !!}
        @endif

    </div>

</header>

@endif


{{-- PMD_ORDER_EDIT_NO_NATIVE_TOPNAV_V17
     Order Edit uses its own page workspace.
     Do not render the legacy/global fixed top navbar on this route.
     This prevents header flash/recreation at the HTML source.
--}}
@if(
    AdminAuth::isLogged()
    && !request()->is('admin/orders/edit/*')
    && !request()->is('admin/coupons/edit/*')
    && !request()->is('admin/themes')
    && !request()->is('admin/themes/edit/frontend-theme')
)
    <nav class="navbar navbar-top navbar-expand navbar-fixed-top" role="navigation">
        <div class="container-fluid">
            
<?php
// PMD_TOPLEFT_DASHBOARD_LOGO_RENDER_FINAL_START
// Final source of truth for top-left dashboard logo.
// Read from tenant DB by host. Never fallback to site_logo/images.jpeg/images.png.
try {
    $pmdHost = (string)request()->getHost();
    $pmdTenant = strtolower(explode('.', $pmdHost)[0] ?? '');
    $pmdBadLogoNames = ['images.jpeg', 'image.jpeg', 'images.jpg', 'image.jpg', 'images.png', 'image.png'];

    $pmdNormalizeTopLeftDashboardLogo = function ($value) use ($pmdTenant, $pmdBadLogoNames) {
        $value = trim((string)$value);

        if ($value === '') {
            return '';
        }

        $pathForName = parse_url($value, PHP_URL_PATH) ?: $value;
        $baseName = strtolower(basename($pathForName));

        if (in_array($baseName, $pmdBadLogoNames, true)) {
            return '';
        }

        if (preg_match('#^https?://#i', $value)) {
            return $value;
        }

        $value = ltrim($value, '/');

        if (strpos($value, 'assets/media/') === 0) {
            return 'https://' . $pmdTenant . '.paymydine.com/' . $value;
        }

        if (strpos($value, 'uploads/') === 0) {
            return 'https://' . $pmdTenant . '.paymydine.com/assets/media/' . $value;
        }

        if (strpos($value, 'attachments/public/') === 0) {
            return 'https://' . $pmdTenant . '.paymydine.com/assets/media/' . $value;
        }

        return 'https://' . $pmdTenant . '.paymydine.com/assets/media/uploads/' . $value;
    };

    $pmdValue = '';

    if ($pmdTenant !== '' && !in_array($pmdTenant, ['www', 'paymydine'], true) && preg_match('/^[A-Za-z0-9_]+$/', $pmdTenant)) {
        $schemaExists = DB::selectOne(
            'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
            [$pmdTenant]
        );

        if ($schemaExists) {
            $safeDb = str_replace('`', '``', $pmdTenant);

            $row = DB::selectOne(
                "SELECT value FROM `{$safeDb}`.`ti_settings` WHERE item = ? ORDER BY setting_id DESC LIMIT 1",
                ['dashboard_logo']
            );

            $pmdValue = $row ? trim((string)$row->value) : '';

            if ($pmdValue === '') {
                $row = DB::selectOne(
                    "SELECT dashboard_logo FROM `{$safeDb}`.`ti_logos` ORDER BY id DESC LIMIT 1"
                );

                $pmdValue = $row ? trim((string)$row->dashboard_logo) : '';
            }
        }
    }

    $imgSrcDashboard = $pmdNormalizeTopLeftDashboardLogo($pmdValue);
} catch (\Throwable $e) {
    $imgSrcDashboard = '';
}
// PMD_TOPLEFT_DASHBOARD_LOGO_RENDER_FINAL_END
?>

<div class="navbar-brand" style="height:88px;">
                <a class="logo" href="{{ admin_url('dashboard') }}" style="margin-left: 44px; margin-top: 4px;">
                    @if(!empty($imgSrcDashboard))
                        <img src="{{ $imgSrcDashboard }}?t={{ time() }}" alt="Dashboard Logo" class="pmd-dashboard-logo-img" style="max-height: 48px; max-width: 190px; width: auto; height: auto; object-fit: contain;">
                    @endif
                    <i class="logo-svg"></i>
                </a>
            </div>

            <div class="page-title">
                <span>{!! Template::getHeading() !!}</span>
            </div>

            <div class="navbar navbar-right">
                <button
                    type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navSidebar"
                    aria-controls="navSidebar" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="fa fa-bars"></span>
                </button>

                @if(request()->is('admin/settings*'))
                    <label class="pmd-header-search" for="pmd-header-settings-search" aria-label="Search settings">
                        <i class="fa fa-search" aria-hidden="true"></i>
                        <input id="pmd-header-settings-search" type="search" placeholder="Search settings..." autocomplete="off" data-pmd-header-settings-search>
                    </label>
                @endif

                @if(isset($this->widgets['mainmenu']))
                    {!! $this->widgets['mainmenu']->render() !!}
                @endif
            </div>
        </div>
    </nav>
@endif

