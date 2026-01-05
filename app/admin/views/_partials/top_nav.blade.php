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

$imgSrcDashboard = DB::table('logos')->orderBy('id', 'desc')->value('dashboard_logo');

// Check for invalid thumbnail patterns
$invalidThumbPatterns = [
    'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
    'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg'
];

// Validate the image exists, if not clear it from database
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
        $isInvalid = true;
    }
    
    if ($isInvalid) {
        DB::table('logos')->update(['dashboard_logo' => null]);
        DB::table('settings')->where('item', 'dashboard_logo')->update(['value' => '']);
        $imgSrcDashboard = null;
    }
}
@endphp
@if(AdminAuth::isLogged())
    <nav class="navbar navbar-top navbar-expand navbar-fixed-top" role="navigation">
        <div class="container-fluid">
            <div class="navbar-brand" style="height:63px;">
                <a class="logo" href="{{ admin_url('dashboard') }}">
                    @if(!empty($imgSrcDashboard))
                        <img src="{{ $imgSrcDashboard }}?t={{ time() }}" alt="Dashboard Logo" style="max-height: 50px; max-width: 200px; object-fit: contain;">
                    @endif
                    <i class="logo-svg"></i>
                </a>
            </div>

            <div class="page-title">
                <span>{!! Template::getHeading() !!}</span>
            </div>

            <div class="navbar navbar-right">
                <!-- Guide Tour Icon Button -->
                <button
                    type="button"
                    id="guide-tour-btn"
                    class="navbar-tour-btn"
                    title="Show page guide"
                    aria-label="Show page guide">
                    <i class="fa fa-info-circle"></i>
                </button>

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

