<div class="media-finder">
    <div class="grid">
        @if ($this->previewMode)
            <a>
                <div class="img-cover">
                    <img src="{{ $this->getMediaThumb($mediaItem) }}" class="img-responsive">
                </div>
            </a>
        @else
            @if (is_null($mediaItem))
                <a class="find-button blank-cover">
                    <i class="fa fa-plus"></i>
                </a>
            @else
                <i class="find-remove-button fa fa-times-circle" title="@lang('admin::lang.text_remove')" style="position: absolute; top: 8px; right: 8px; z-index: 9999; cursor: pointer;"></i>
                <div class="icon-container">
                    <span data-find-name title="{{ $this->getMediaName($mediaItem) }}">{{ $this->getMediaName($mediaItem) }}</span>
                </div>
                <a class="{{ $useAttachment ? 'find-config-button' : '' }}" style="position: relative; z-index: 1;">
                    <div class="img-cover">
                        @if(($mediaFileType = $this->getMediaFileType($mediaItem)) === 'image')
                            <img
                                data-find-image
                                src="{{ $this->getMediaThumb($mediaItem) }}"
                                class="img-responsive"
                                alt=""
                            />
                        @else
                            <div class="media-icon">
                                <i
                                    data-find-file
                                    class="fa fa-{{ $mediaFileType }} fa-3x text-muted mb-2"
                                ></i>
                            </div>
                        @endif
                    </div>
                </a>
            @endif
            <input
                type="hidden"
                {!! (!is_null($mediaItem) && !$useAttachment) ? 'name="'.$fieldName.'"' : '' !!}
                value="{{ $this->getMediaPath($mediaItem) }}"
                data-find-value
            />
            <input
                type="hidden"
                value="{{ $this->getMediaIdentifier($mediaItem) }}"
                data-find-identifier
            />
        @endif
    </div>
</div>
<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
            // Check direct storage/temp/public path first (most common)
            $possiblePaths[] = base_path('storage/temp/public/' . $relativePath);
            $possiblePaths[] = storage_path('temp/public/' . $relativePath);
            $possiblePaths[] = storage_path('app/public/temp/public/' . $relativePath);
            $possiblePaths[] = base_path('storage/app/public/temp/public/' . $relativePath);
            $possiblePaths[] = public_path('storage/temp/public/' . $relativePath);
        } elseif (strpos($path, 'storage/') === 0) {
            // Try storage path directly
            $relativePath = substr($path, strlen('storage/'));
            $possiblePaths[] = storage_path('app/public/' . $relativePath);
            $possiblePaths[] = base_path('storage/app/public/' . $relativePath);
            $possiblePaths[] = public_path('storage/' . $relativePath);
        } else {
            // Try public path
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

// Handle clearing dashboard_logo via POST
if (isset($_POST['clear_dashboard_logo'])) {
    DB::table('logos')->update(['dashboard_logo' => null]);
    DB::table('settings')->where('item', 'dashboard_logo')->update(['value' => '']);
    session()->forget('src_dashboard');
    exit;
}

// Handle clearing favicon_logo via POST
if (isset($_POST['clear_favicon_logo'])) {
    DB::table('settings')->where('item', 'favicon_logo')->update(['value' => '']);
    exit;
}

if (isset($_GET['dash'])) {
    $dashUrl = $_GET['dash'];
    
    // Validate that the image exists before saving
    if (validateImageExists($dashUrl)) {
        session()->forget('src_dashboard');
        session()->put('src_dashboard', $dashUrl);

        $exists = DB::table('logos')->exists();
        if ($exists) {
            DB::table('logos')->update(['dashboard_logo' => $dashUrl]);
        } else {
            DB::table('logos')->insert(['dashboard_logo' => $dashUrl]);
        }
    } else {
        // Image doesn't exist, clear the database entry
        DB::table('logos')->update(['dashboard_logo' => null]);
        session()->forget('src_dashboard');
    }
}

// Validate existing logo from database and clean up invalid ones
$invalidDashboardPatterns = [
    'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
    'ebb1d302c04621b99b053d0559077379'
];

if (!session()->has('src_dashboard')) {
    $imgSrcDashboard = DB::table('logos')->value('dashboard_logo');
    
    // Check for invalid patterns
    $isInvalid = false;
    if (!empty($imgSrcDashboard)) {
        foreach ($invalidDashboardPatterns as $pattern) {
            if (strpos($imgSrcDashboard, $pattern) !== false) {
                $isInvalid = true;
                break;
            }
        }
    }
    
    // Validate the image exists
    if (!empty($imgSrcDashboard) && ($isInvalid || !validateImageExists($imgSrcDashboard))) {
        // Image doesn't exist or is invalid, clear it from database
        DB::table('logos')->update(['dashboard_logo' => null]);
        DB::table('settings')->where('item', 'dashboard_logo')->update(['value' => '']);
        $imgSrcDashboard = null;
    }
    
    session()->put('src_dashboard', $imgSrcDashboard);
} else {
    $imgSrcDashboard = session('src_dashboard');
    
    // Check for invalid patterns
    $isInvalid = false;
    if (!empty($imgSrcDashboard)) {
        foreach ($invalidDashboardPatterns as $pattern) {
            if (strpos($imgSrcDashboard, $pattern) !== false) {
                $isInvalid = true;
                break;
            }
        }
    }
    
    // Validate session value
    if (!empty($imgSrcDashboard) && ($isInvalid || !validateImageExists($imgSrcDashboard))) {
        // Image doesn't exist or is invalid, clear it
        $imgSrcDashboard = null;
        session()->forget('src_dashboard');
        DB::table('logos')->update(['dashboard_logo' => null]);
        DB::table('settings')->where('item', 'dashboard_logo')->update(['value' => '']);
    }
}

// Also clean up loader_logo if it's invalid
$loaderLogo = DB::table('logos')->value('loader_logo');
if (!empty($loaderLogo) && !validateImageExists($loaderLogo)) {
    DB::table('logos')->update(['loader_logo' => null]);
}

// Clean up favicon_logo from settings table if it's invalid
$faviconLogo = DB::table('settings')->where('item', 'favicon_logo')->value('value');
if (!empty($faviconLogo)) {
    // Check for invalid patterns
    $invalidFaviconPatterns = [
        'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg',
        '4326f3e81f7e4c3b0ab60d3b5fa94f62'
    ];
    $isInvalidFavicon = false;
    foreach ($invalidFaviconPatterns as $pattern) {
        if (strpos($faviconLogo, $pattern) !== false) {
            $isInvalidFavicon = true;
            break;
        }
    }
    if ($isInvalidFavicon || !validateImageExists($faviconLogo)) {
        DB::table('settings')->where('item', 'favicon_logo')->update(['value' => '']);
    }
}

// Clean up dashboard_logo from settings table if it's invalid (in case it's stored there too)
$settingsDashboardLogo = DB::table('settings')->where('item', 'dashboard_logo')->value('value');
if (!empty($settingsDashboardLogo)) {
    // Check for invalid patterns
    $invalidDashboardPatterns = [
        'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
        'ebb1d302c04621b99b053d0559077379'
    ];
    $isInvalidDashboard = false;
    foreach ($invalidDashboardPatterns as $pattern) {
        if (strpos($settingsDashboardLogo, $pattern) !== false) {
            $isInvalidDashboard = true;
            break;
        }
    }
    if ($isInvalidDashboard || !validateImageExists($settingsDashboardLogo)) {
        DB::table('settings')->where('item', 'dashboard_logo')->update(['value' => '']);
    }
}
?>
<script>
(function() {
    // Direct click handler for remove button - works even if MediaFinder doesn't initialize
    function initRemoveButtons() {
        document.querySelectorAll('.find-remove-button').forEach(function(btn) {
            // Remove any existing listeners to avoid duplicates
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add direct click handler
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var mediaFinder = this.closest('.media-finder');
                if (!mediaFinder) return;
                
                // Check if using attachment mode
                var useAttachment = mediaFinder.getAttribute('data-use-attachment') === 'true';
                var alias = mediaFinder.getAttribute('data-alias') || 'media';
                var findId = mediaFinder.querySelector('[data-find-identifier]');
                
                if (useAttachment && findId && typeof jQuery !== 'undefined' && jQuery.ti && jQuery.ti.loadingIndicator) {
                    // Use MediaFinder's attachment removal
                    jQuery.ti.loadingIndicator.show();
                    jQuery.request(alias + '::onRemoveAttachment', {
                        data: {media_id: findId.value}
                    }).done(function() {
                        removeMediaItem(mediaFinder);
                    }).always(function() {
                        jQuery.ti.loadingIndicator.hide();
                    });
                } else {
                    // Simple removal - just remove the media-finder element
                    removeMediaItem(mediaFinder);
                }
            });
        });
    }
    
    function removeMediaItem(mediaFinder) {
        if (!mediaFinder) return;
        
        // Clear the hidden input value
        var findValue = mediaFinder.querySelector('[data-find-value]');
        if (findValue) {
            findValue.value = '';
            findValue.removeAttribute('name'); // Remove name so it doesn't submit
        }
        
        var findId = mediaFinder.querySelector('[data-find-identifier]');
        if (findId) {
            findId.value = '';
        }
        
        // Check if this is dashboard_logo and clear from database
        var fieldName = '';
        var nameAttr = findValue ? findValue.getAttribute('name') : '';
        if (nameAttr && nameAttr.indexOf('dashboard_logo') !== -1) {
            // Clear dashboard_logo from database via AJAX
            if (typeof jQuery !== 'undefined') {
                jQuery.post(window.location.href, {
                    'clear_dashboard_logo': true
                });
            }
        }
        
        // Find the grid and show blank state
        var grid = mediaFinder.querySelector('.grid');
        if (grid) {
            grid.innerHTML = '<a class="find-button blank-cover"><i class="fa fa-plus"></i></a>';
        }
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRemoveButtons);
    } else {
        initRemoveButtons();
    }
    
    // Also initialize on AJAX updates
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('ajaxUpdateComplete', initRemoveButtons);
        jQuery(document).on('render', initRemoveButtons);
    }
    
    // Function to clear invalid image from mediafinder
    function clearInvalidImage(img) {
        var mediaFinder = img.closest('.media-finder');
        if (mediaFinder) {
            var findValue = mediaFinder.querySelector('[data-find-value]');
            if (findValue) {
                findValue.value = '';
                findValue.removeAttribute('name');
            }
            var findId = mediaFinder.querySelector('[data-find-identifier]');
            if (findId) {
                findId.value = '';
            }
            var grid = mediaFinder.querySelector('.grid');
            if (grid) {
                grid.innerHTML = '<a class="find-button blank-cover"><i class="fa fa-plus"></i></a>';
            }
        }
    }
    
    // List of known invalid image patterns to remove immediately
    var invalidPatterns = [
        'vecteezy_fast-food-meal-with_25065315-removebg-preview-removebg-preview.jpg',
        'fresh-chicken-curry-isolated-on-transparent-background-free-png-removebg-preview.jpg',
        'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
        'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg',
        'ebb1d302c04621b99b053d0559077379',
        '4326f3e81f7e4c3b0ab60d3b5fa94f62'
    ];
    
    // Function to check and clear invalid images
    function checkAndClearInvalidImages() {
        document.querySelectorAll('.media-finder img').forEach(function(img) {
            var imgSrc = img.getAttribute("src") || '';
            
            // Check if image matches invalid patterns
            var isInvalid = invalidPatterns.some(function(pattern) {
                return imgSrc.indexOf(pattern) !== -1;
            });
            
            // Also check for thumbnail patterns that are likely invalid
            if (imgSrc.indexOf('thumb_') !== -1 && (imgSrc.indexOf('ebb1d302c04621b99b053d0559077379') !== -1 || imgSrc.indexOf('4326f3e81f7e4c3b0ab60d3b5fa94f62') !== -1)) {
                isInvalid = true;
            }
            
            if (isInvalid) {
                // Immediately clear invalid images
                clearInvalidImage(img);
                
                // Also clear from database via AJAX
                if (typeof jQuery !== 'undefined') {
                    var mediaFinder = img.closest('.media-finder');
                    if (mediaFinder) {
                        var findValue = mediaFinder.querySelector('[data-find-value]');
                        var fieldName = '';
                        if (findValue) {
                            fieldName = findValue.getAttribute('name') || '';
                        }
                        // Try to determine field from parent container
                        if (!fieldName) {
                            var container = mediaFinder.closest('[id*="dashboard"]');
                            if (container && container.id.indexOf('dashboard') !== -1) {
                                fieldName = 'dashboard_logo';
                            } else if (container && container.id.indexOf('favicon') !== -1) {
                                fieldName = 'favicon_logo';
                            }
                        }
                        
                        if (fieldName.indexOf('dashboard_logo') !== -1) {
                            jQuery.post(window.location.href, {'clear_dashboard_logo': true});
                        } else if (fieldName.indexOf('favicon_logo') !== -1) {
                            jQuery.post(window.location.href, {'clear_favicon_logo': true});
                        }
                    }
                }
                return;
            }
            
            // Check if image loads successfully
            img.onerror = function() {
                clearInvalidImage(this);
            };
            
            // For dashboard logo specifically
            if (img.closest('#mediafinder-formdashboardlogo-dashboard-logo')) {
                img.onload = function() {
                    let dashboardPath = this.getAttribute("src");
                    if (dashboardPath && dashboardPath.trim() !== '') {
                        let currentUrl = new URL(window.location.href);
                        let currentSrsDashboard = currentUrl.searchParams.get("dash");
                        if (!currentSrsDashboard || currentSrsDashboard !== dashboardPath) {
                            currentUrl.searchParams.set("dash", dashboardPath);
                            window.location.href = currentUrl;
                        }
                    }
                };
                
                // If image already loaded, trigger onload
                if (img.complete && img.naturalHeight !== 0) {
                    img.onload();
                }
            }
        });
    }
    
    // Dashboard logo handling with image validation
    document.addEventListener("DOMContentLoaded", function () {
        // Run immediately
        checkAndClearInvalidImages();
        
        // Also run after a short delay to catch dynamically loaded images
        setTimeout(checkAndClearInvalidImages, 500);
        setTimeout(checkAndClearInvalidImages, 1000);
    });
    
    // Also run on AJAX updates
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('ajaxUpdateComplete', checkAndClearInvalidImages);
        jQuery(document).on('render', checkAndClearInvalidImages);
    }
    
    // Ensure MediaFinder is initialized (for other functionality)
    if (typeof jQuery !== 'undefined' && jQuery.fn.mediaFinder) {
        function initMediaFinder() {
            jQuery('[data-control="mediafinder"]').each(function() {
                if (!jQuery(this).data('ti.mediaFinder')) {
                    jQuery(this).mediaFinder();
                }
            });
        }
        
        if (jQuery.fn.render) {
            jQuery(document).render(initMediaFinder);
        }
        jQuery(document).ready(initMediaFinder);
        if (typeof jQuery !== 'undefined') {
            jQuery(document).on('ajaxUpdateComplete', initMediaFinder);
        }
    }
})();
</script>



