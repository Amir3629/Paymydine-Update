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
@if(AdminAuth::isLogged())
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

                @if(isset($this->widgets['mainmenu']))
                    {!! $this->widgets['mainmenu']->render() !!}
                @endif
            </div>
        </div>
    </nav>
@endif

