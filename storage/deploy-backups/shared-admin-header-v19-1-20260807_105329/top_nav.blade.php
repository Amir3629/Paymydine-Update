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

{{-- ============================================================
     PMD_SHARED_ADMIN_HEADER_V18

     First shared-header consumer:
       /admin/orders/edit/*

     This is NOT the old .navbar-top.
     Dashboard2 / Reservations2 visual language is reused here.

     Future pages should consume this same component instead of
     creating page-specific headers.
     ============================================================ --}}
@if(
    AdminAuth::isLogged()
    && request()->is('admin/orders/edit/*')
)
    <style id="pmd-shared-admin-header-v18-style">
        html,
        body {
            --pmd-shared-header-bg: #ffffff;
            --pmd-shared-header-ink: #101f2a;
            --pmd-shared-header-muted: #647b91;
            --pmd-shared-header-line: #dce5eb;
            --pmd-shared-header-hover: #f1f7fb;
        }

        body .pmd-shared-admin-header-v18 {
            position: fixed !important;
            top: 0 !important;
            left: var(--pmd-side-menu-width, 92px) !important;
            right: 0 !important;
            z-index: 1035 !important;

            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;

            height: 68px !important;
            min-height: 68px !important;

            margin: 0 !important;
            padding: 0 24px !important;

            box-sizing: border-box !important;

            background: var(--pmd-shared-header-bg) !important;
            border: 0 !important;
            border-bottom:
                1px solid var(--pmd-shared-header-line) !important;

            border-radius: 0 !important;
            box-shadow: none !important;
        }

        body .pmd-shared-admin-header-v18__title {
            display: flex !important;
            align-items: center !important;

            min-width: 0 !important;
            height: 68px !important;

            margin: 0 !important;
            padding: 0 !important;

            color: var(--pmd-shared-header-ink) !important;

            font-family: inherit !important;
            font-size: 21px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            letter-spacing: -0.02em !important;

            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        /*
         * TastyIgniter can place "Bearbeiten" inside <small>.
         * Shared header only shows the actual page title.
         */
        body
        .pmd-shared-admin-header-v18__title
        small {
            display: none !important;
        }

        body .pmd-shared-admin-header-v18__actions {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;

            gap: 9px !important;

            min-width: 0 !important;
            height: 68px !important;

            margin: 0 0 0 auto !important;
            padding: 0 !important;
        }

        /*
         * Native main-menu wrapper stays functional,
         * but loses all legacy navbar geometry.
         */
        body
        .pmd-shared-admin-header-v18__actions
        #menu-mainmenu,
        body
        .pmd-shared-admin-header-v18__actions
        .navbar-nav {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;

            gap: 9px !important;

            height: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;

            list-style: none !important;
        }

        body
        .pmd-shared-admin-header-v18__actions
        li {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;

            margin: 0 !important;
            padding: 0 !important;
        }

        /*
         * Same clean Dashboard2 / Reservations2 button geometry.
         */
        body
        .pmd-shared-admin-header-v18__actions
        .nav-link,
        body
        .pmd-shared-admin-header-v18__actions
        .pmd-header-action-btn,
        body
        .pmd-shared-admin-header-v18__actions
        #notifDropdown {
            position: relative !important;

            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;

            flex: 0 0 42px !important;

            width: 42px !important;
            min-width: 42px !important;
            max-width: 42px !important;

            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;

            margin: 0 !important;
            padding: 0 !important;

            box-sizing: border-box !important;

            border:
                1px solid var(--pmd-shared-header-line) !important;

            border-radius: 12px !important;

            background: #ffffff !important;
            color: var(--pmd-shared-header-ink) !important;

            box-shadow: none !important;
            text-decoration: none !important;

            line-height: 1 !important;

            transform: none !important;
        }

        body
        .pmd-shared-admin-header-v18__actions
        .nav-link:hover,
        body
        .pmd-shared-admin-header-v18__actions
        .nav-link:focus-visible,
        body
        .pmd-shared-admin-header-v18__actions
        .pmd-header-action-btn:hover,
        body
        .pmd-shared-admin-header-v18__actions
        #notifDropdown:hover {
            background:
                var(--pmd-shared-header-hover) !important;

            border-color: #aac9da !important;

            color:
                var(--pmd-shared-header-ink) !important;

            outline: none !important;
            box-shadow: none !important;
        }

        /*
         * Remove Bootstrap caret.
         */
        body
        .pmd-shared-admin-header-v18__actions
        .dropdown-toggle::after,
        body
        .pmd-shared-admin-header-v18__actions
        #notifDropdown::after {
            display: none !important;
            content: none !important;

            width: 0 !important;
            height: 0 !important;

            margin: 0 !important;
            border: 0 !important;
        }

        /*
         * Notification wrapper.
         */
        body
        .pmd-shared-admin-header-v18__actions
        #notif-root {
            position: relative !important;

            display: flex !important;
            align-items: center !important;
            justify-content: center !important;

            width: 42px !important;
            min-width: 42px !important;
            height: 42px !important;

            margin: 0 !important;
            padding: 0 !important;

            list-style: none !important;
        }

        body
        .pmd-shared-admin-header-v18__actions
        #notification-count {
            position: absolute !important;

            top: -6px !important;
            right: -7px !important;
            left: auto !important;

            z-index: 5 !important;

            min-width: 18px !important;
            height: 18px !important;

            margin: 0 !important;
            padding: 0 4px !important;

            border: 2px solid #ffffff !important;
            border-radius: 999px !important;

            background: #d83a31 !important;
            color: #ffffff !important;

            font-size: 9px !important;
            font-weight: 800 !important;
            line-height: 14px !important;
            text-align: center !important;
        }

        /*
         * Keep dropdowns below the header.
         */
        body
        .pmd-shared-admin-header-v18__actions
        .dropdown-menu {
            top: calc(100% + 8px) !important;
            right: 0 !important;
            left: auto !important;

            margin: 0 !important;
        }

        /*
         * Order Edit content starts below the shared fixed header.
         */
        body:has(.pmd-shared-admin-header-v18)
        .page-wrapper {
            padding-top: 68px !important;
        }

        /*
         * V11/V12/V13 already force this page canvas.
         * Keep it explicitly aligned.
         */
        body:has(.pmd-shared-admin-header-v18),
        body:has(.pmd-shared-admin-header-v18)
        .page-wrapper,
        body:has(.pmd-shared-admin-header-v18)
        .page-content {
            background: #f5f7fa !important;
        }

        @media (max-width: 820px) {
            body .pmd-shared-admin-header-v18 {
                left: 0 !important;

                height: 60px !important;
                min-height: 60px !important;

                padding: 0 14px !important;
            }

            body
            .pmd-shared-admin-header-v18__title {
                height: 60px !important;
                font-size: 19px !important;
            }

            body
            .pmd-shared-admin-header-v18__actions {
                height: 60px !important;
                gap: 6px !important;
            }

            body
            .pmd-shared-admin-header-v18__actions
            .nav-link,
            body
            .pmd-shared-admin-header-v18__actions
            .pmd-header-action-btn,
            body
            .pmd-shared-admin-header-v18__actions
            #notifDropdown {
                flex-basis: 40px !important;

                width: 40px !important;
                min-width: 40px !important;
                max-width: 40px !important;

                height: 40px !important;
                min-height: 40px !important;
                max-height: 40px !important;

                border-radius: 11px !important;
            }

            body:has(.pmd-shared-admin-header-v18)
            .page-wrapper {
                padding-top: 60px !important;
            }
        }
    </style>

    <header
        id="pmd-shared-admin-header"
        class="pmd-shared-admin-header-v18"
        role="banner"
    >
        <h1 class="pmd-shared-admin-header-v18__title">
            {!! Template::getHeading() !!}
        </h1>

        <div class="pmd-shared-admin-header-v18__actions">
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

