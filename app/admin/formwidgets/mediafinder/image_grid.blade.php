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
                {!! !$useAttachment ? 'name="'.$fieldName.'"' : '' !!}
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
// COMPLETE STANDALONE SOLUTION - No plugin dependencies
(function() {
    // CRITICAL: Remove invalid images IMMEDIATELY before anything else
    function removeInvalidImagesImmediately() {
        var invalidPatterns = [
            'vecteezy_fast-food-meal-with_25065315-removebg-preview-removebg-preview.jpg',
            'fresh-chicken-curry-isolated-on-transparent-background-free-png-removebg-preview.jpg',
            'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
            'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg',
            'ebb1d302c04621b99b053d0559077379',
            '4326f3e81f7e4c3b0ab60d3b5fa94f62'
        ];
        
        // Check all media-finder elements
        document.querySelectorAll('.media-finder').forEach(function(mediaFinder) {
            var findValue = mediaFinder.querySelector('[data-find-value]');
            var findImage = mediaFinder.querySelector('[data-find-image]');
            var imgSrc = findImage ? findImage.getAttribute('src') : '';
            var value = findValue ? findValue.value : '';
            
            // Check if value or image src matches invalid patterns
            var isInvalid = false;
            var checkString = imgSrc + ' ' + value;
            
            invalidPatterns.forEach(function(pattern) {
                if (checkString.indexOf(pattern) !== -1) {
                    isInvalid = true;
                }
            });
            
            if (isInvalid) {
                // Clear immediately
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
                
                // Clear from database
                var container = mediaFinder.closest('[id*="dashboard"]');
                if (container && container.id.indexOf('dashboard') !== -1) {
                    if (typeof jQuery !== 'undefined') {
                        jQuery.post(window.location.href, {'clear_dashboard_logo': true});
                    }
                } else if (container && container.id.indexOf('favicon') !== -1) {
                    if (typeof jQuery !== 'undefined') {
                        jQuery.post(window.location.href, {'clear_favicon_logo': true});
                    }
                }
            }
        });
    }
    
    // Run IMMEDIATELY - don't wait for DOMContentLoaded
    removeInvalidImagesImmediately();
    
    // Direct click handler for PLUS button - completely standalone
    function initPlusButtons() {
        document.querySelectorAll('.find-button, .blank-cover').forEach(function(btn) {
            // Remove existing handler if any
            if (btn.dataset.plusHandler) return;
            btn.dataset.plusHandler = 'true';
            
            // Use capture phase to ensure we catch the click
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('PLUS BUTTON CLICKED!', this);
                
                var mediaFinder = this.closest('[data-control="mediafinder"]');
                if (!mediaFinder) {
                    mediaFinder = this.closest('.media-finder');
                }
                
                if (!mediaFinder) {
                    console.error('MediaFinder container not found');
                    return;
                }
                
                // Get options from data attributes
                var alias = mediaFinder.getAttribute('data-alias') || 'mediamanager';
                // Only use attachment mode if explicitly set to 'true', not just present
                var useAttachmentAttr = mediaFinder.getAttribute('data-use-attachment');
                var useAttachment = useAttachmentAttr === 'true' || useAttachmentAttr === '1';
                var chooseButtonText = mediaFinder.getAttribute('data-choose-button-text') || 'Choose';
                console.log('useAttachment attribute value:', useAttachmentAttr);
                console.log('useAttachment resolved to:', useAttachment);
                var findValue = mediaFinder.querySelector('[data-find-value]');
                var currentValue = findValue ? findValue.value : null;
                
                console.log('Opening media manager with alias:', alias);
                
                // Open media manager modal manually
                openMediaManagerModal({
                    alias: 'mediamanager',
                    selectMode: 'single',
                    chooseButton: true,
                    chooseButtonText: chooseButtonText,
                    goToItem: !useAttachment ? currentValue : null,
                    onInsert: function(items) {
                        console.log('🎯🎯🎯 onInsert CALLBACK FIRED!');
                        console.log('Items selected:', items);
                        if (!items || !items.length) {
                            console.warn('No items in onInsert callback');
                            return;
                        }
                        
                        var item = items[0];
                        console.log('First item:', item);
                        var itemData = {
                            identifier: item.identifier || item.id || '',
                            path: item.path || item.publicUrl || '',
                            publicUrl: item.publicUrl || item.path || '',
                            fileType: item.fileType || 'image',
                            name: item.name || ''
                        };
                        console.log('ItemData prepared:', itemData);
                        console.log('useAttachment value:', useAttachment);
                        console.log('mediaFinder element:', mediaFinder);
                        console.log('mediaFinder ID:', mediaFinder ? mediaFinder.id : 'NO ID');
                        
                        if (useAttachment) {
                            console.log('⚠️ Entering ATTACHMENT mode');
                            // Attachment mode
                            if (typeof jQuery !== 'undefined' && jQuery.ti && jQuery.ti.loadingIndicator) {
                                jQuery.ti.loadingIndicator.show();
                                jQuery.request(alias + '::onAddAttachment', {
                                    data: {items: [itemData]}
                                }).done(function(response) {
                                    console.log('Attachment response:', response);
                                    if (response && response.length) {
                                        console.log('Calling updateMediaFinder from attachment mode');
                                        updateMediaFinder(mediaFinder, response[0]);
                                    } else {
                                        console.warn('⚠️ Attachment mode failed - falling back to SIMPLE mode');
                                        // Fallback to simple mode if attachment fails
                                        if (typeof updateMediaFinder === 'function') {
                                            updateMediaFinder(mediaFinder, itemData);
                                        } else {
                                            console.error('updateMediaFinder not available, using manual fallback');
                                            // Manual fallback
                                            var findValue = mediaFinder.querySelector('[data-find-value]');
                                            if (!findValue) {
                                                var grid = mediaFinder.querySelector('.grid');
                                                if (grid) {
                                                    findValue = document.createElement('input');
                                                    findValue.type = 'hidden';
                                                    findValue.setAttribute('data-find-value', '');
                                                    grid.appendChild(findValue);
                                                }
                                            }
                                            if (findValue) {
                                                var path = itemData.path || itemData.publicUrl || '';
                                                if (path && path.indexOf('/') === 0 && path.indexOf('http') !== 0) {
                                                    path = path.substring(1);
                                                }
                                                findValue.value = path;
                                                var mediaFinderId = mediaFinder.id || '';
                                                var fieldName = '';
                                                if (mediaFinderId.indexOf('mediafinder-') === 0) {
                                                    var parts = mediaFinderId.split('-');
                                                    if (parts.length >= 3) {
                                                        fieldName = parts.slice(2).join('_');
                                                    }
                                                }
                                                if (fieldName) {
                                                    findValue.setAttribute('name', 'setting[' + fieldName + ']');
                                                }
                                                console.log('✅ Fallback update complete - Value:', findValue.value, 'Name:', findValue.getAttribute('name'));
                                            }
                                        }
                                    }
                                }).fail(function(xhr, status, error) {
                                    console.error('❌ Attachment mode AJAX failed:', error);
                                    console.warn('⚠️ Falling back to SIMPLE mode');
                                    // Fallback to simple mode
                                    if (typeof updateMediaFinder === 'function') {
                                        updateMediaFinder(mediaFinder, itemData);
                                    }
                                }).always(function() {
                                    if (jQuery.ti && jQuery.ti.loadingIndicator) {
                                        jQuery.ti.loadingIndicator.hide();
                                    }
                                });
                            } else {
                                console.error('jQuery.ti.loadingIndicator not available - falling back to SIMPLE mode');
                                // Fallback to simple mode
                                if (typeof updateMediaFinder === 'function') {
                                    updateMediaFinder(mediaFinder, itemData);
                                }
                            }
                        } else {
                            console.log('✅ Entering SIMPLE mode - calling updateMediaFinder');
                            console.log('   - mediaFinder:', mediaFinder);
                            console.log('   - itemData:', itemData);
                            
                            // Check if updateMediaFinder is defined
                            if (typeof updateMediaFinder === 'function') {
                                console.log('   ✅ updateMediaFinder function is defined');
                                // Simple mode
                                try {
                                    updateMediaFinder(mediaFinder, itemData);
                                    console.log('✅ updateMediaFinder call completed');
                                } catch (error) {
                                    console.error('❌ ERROR calling updateMediaFinder:', error);
                                    console.error('Stack trace:', error.stack);
                                }
                            } else {
                                console.error('❌ updateMediaFinder is NOT a function!');
                                console.error('   typeof updateMediaFinder:', typeof updateMediaFinder);
                                console.error('   updateMediaFinder value:', updateMediaFinder);
                                
                                // Fallback: manually update the form field
                                console.log('🔄 Attempting manual fallback update...');
                                try {
                                    var findValue = mediaFinder.querySelector('[data-find-value]');
                                    if (!findValue) {
                                        console.log('   Creating findValue input...');
                                        var grid = mediaFinder.querySelector('.grid');
                                        if (grid) {
                                            findValue = document.createElement('input');
                                            findValue.type = 'hidden';
                                            findValue.setAttribute('data-find-value', '');
                                            grid.appendChild(findValue);
                                        }
                                    }
                                    
                                    if (findValue) {
                                        var path = itemData.path || itemData.publicUrl || '';
                                        if (path && path.indexOf('/') === 0 && path.indexOf('http') !== 0) {
                                            path = path.substring(1);
                                        }
                                        findValue.value = path;
                                        
                                        // Set name attribute
                                        var mediaFinderId = mediaFinder.id || '';
                                        var fieldName = '';
                                        if (mediaFinderId.indexOf('mediafinder-') === 0) {
                                            var parts = mediaFinderId.split('-');
                                            if (parts.length >= 3) {
                                                fieldName = parts.slice(2).join('_');
                                            }
                                        }
                                        if (fieldName) {
                                            findValue.setAttribute('name', 'setting[' + fieldName + ']');
                                        }
                                        
                                        console.log('   ✅ Manual update complete');
                                        console.log('   - Value:', findValue.value);
                                        console.log('   - Name:', findValue.getAttribute('name'));
                                    }
                                } catch (fallbackError) {
                                    console.error('❌ Fallback update also failed:', fallbackError);
                                }
                            }
                        }
                    }
                });
            }, true); // Use capture phase
        });
    }
    
    // Function to open media manager modal manually
    function openMediaManagerModal(options) {
        if (typeof jQuery === 'undefined') {
            console.error('jQuery not available');
            return;
        }
        
        // Check if mediaManager.modal exists (preferred method)
        if (jQuery.ti && jQuery.ti.mediaManager && jQuery.ti.mediaManager.modal) {
            try {
                new jQuery.ti.mediaManager.modal(options);
                return;
            } catch (e) {
                console.warn('MediaManager.modal failed, using manual method:', e);
            }
        }
        
        // Manual fallback - create modal ourselves
        var handler = (options.alias || 'mediamanager') + '::onLoadPopup';
        var data = {
            selectMode: options.selectMode || 'single',
            goToItem: options.goToItem || null,
            chooseButton: options.chooseButton ? 1 : 0,
            chooseButtonText: options.chooseButtonText || 'Choose',
        };
        
        // Show loading
        if (jQuery.ti && jQuery.ti.loadingIndicator) {
            jQuery.ti.loadingIndicator.show();
        }
        
        // Make AJAX request to load popup
        jQuery.request(handler, {data: data})
            .done(function(json) {
                // Create modal element
                var $modal = jQuery('<div/>', {
                    id: 'media-manager',
                    class: 'media-modal modal fade',
                    role: 'dialog',
                    tabindex: -1
                });
                
                $modal.html(json.result || json);
                jQuery('body').append($modal);
                
                // CRITICAL: Load MediaManager assets if not already loaded
                // These are required for upload button to work
                function loadScript(src, callback) {
                    if (document.querySelector('script[src="' + src + '"]')) {
                        if (callback) callback();
                        return;
                    }
                    var script = document.createElement('script');
                    script.src = src;
                    script.onload = callback;
                    document.head.appendChild(script);
                }
                
                // Load Dropzone first (required by MediaManager)
                if (typeof Dropzone === 'undefined') {
                    loadScript('{{ asset("app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js") }}', function() {
                        console.log('✅ Dropzone loaded');
                        // Then load MediaManager scripts
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js") }}');
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js") }}');
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.js") }}', function() {
                            console.log('✅ MediaManager plugin loaded');
                            loadScript('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.modal.js") }}');
                        });
                    });
                } else {
                    // Dropzone already loaded, just load MediaManager scripts
                    if (typeof jQuery.fn.mediaManager === 'undefined') {
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js") }}');
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js") }}');
                        loadScript('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.js") }}', function() {
                            console.log('✅ MediaManager plugin loaded');
                            loadScript('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.modal.js") }}');
                        });
                    }
                }
                
                // Initialize Bootstrap modal
                var modal = new bootstrap.Modal($modal[0]);
                
                // CRITICAL: Initialize MediaManager plugin AFTER modal is shown
                // This ensures upload button (Dropzone) and other controls work
                $modal.one('shown.bs.modal', function() {
                    console.log('🔵 Modal shown, initializing MediaManager...');
                    
                    var $mediaManager = $modal.find('[data-control="media-manager"]');
                    console.log('MediaManager element found:', $mediaManager.length > 0);
                    
                    if ($mediaManager.length) {
                        // Check if Dropzone is available
                        if (typeof Dropzone === 'undefined') {
                            console.error('❌ Dropzone is not loaded! Upload will not work.');
                        } else {
                            console.log('✅ Dropzone is available');
                        }
                        
                        // Function to initialize MediaManager
                        function initMediaManager() {
                            if (typeof jQuery.fn.mediaManager !== 'undefined') {
                                try {
                                    // Initialize MediaManager plugin if not already initialized
                                    if (!$mediaManager.data('ti.mediaManager')) {
                                        $mediaManager.mediaManager();
                                        console.log('✅ MediaManager plugin initialized');
                                        
                                        // Verify upload button exists
                                        var $uploadBtn = $mediaManager.find('[data-media-control="upload"]');
                                        console.log('Upload button found:', $uploadBtn.length > 0);
                                        
                                        // Add fallback click handler if Dropzone isn't ready
                                        $uploadBtn.off('click.manual-upload').on('click.manual-upload', function(e) {
                                            var mediaManagerInstance = $mediaManager.data('ti.mediaManager');
                                            if (mediaManagerInstance && mediaManagerInstance.dropzone) {
                                                // Dropzone is ready, let it handle the click
                                                console.log('Dropzone is ready, allowing normal click');
                                                return true;
                                            } else {
                                                // Dropzone not ready yet, show upload zone manually
                                                console.log('Dropzone not ready, showing upload zone manually');
                                                e.preventDefault();
                                                e.stopPropagation();
                                                
                                                var $uploadZone = $mediaManager.find('[data-control="media-upload"]');
                                                if ($uploadZone.length) {
                                                    $uploadZone.slideDown();
                                                    
                                                    // Try to initialize Dropzone manually if possible
                                                    setTimeout(function() {
                                                        if (mediaManagerInstance && typeof mediaManagerInstance.initUploader === 'function') {
                                                            try {
                                                                mediaManagerInstance.initUploader();
                                                                console.log('Manually initialized uploader');
                                                            } catch (err) {
                                                                console.error('Failed to manually initialize uploader:', err);
                                                            }
                                                        }
                                                    }, 100);
                                                }
                                                return false;
                                            }
                                        });
                                        
                                        // Check if Dropzone was initialized
                                        setTimeout(function() {
                                            var mediaManagerInstance = $mediaManager.data('ti.mediaManager');
                                            if (mediaManagerInstance && mediaManagerInstance.dropzone) {
                                                console.log('✅ Dropzone initialized - upload button should work!');
                                            } else {
                                                console.warn('⚠️ Dropzone not initialized yet - fallback handler active');
                                            }
                                        }, 500);
                                    } else {
                                        console.log('MediaManager already initialized');
                                    }
                                } catch (e) {
                                    console.error('❌ Failed to initialize MediaManager:', e);
                                }
                                return true;
                            } else {
                                return false; // Plugin not loaded yet
                            }
                        }
                        
                        // Try to initialize immediately
                        if (!initMediaManager()) {
                            // Wait for plugin to load (up to 10 seconds)
                            var attempts = 0;
                            var checkPlugin = setInterval(function() {
                                attempts++;
                                if (initMediaManager()) {
                                    clearInterval(checkPlugin);
                                } else if (attempts > 100) {
                                    clearInterval(checkPlugin);
                                    console.error('❌ MediaManager plugin not found after 10 seconds - upload will NOT work');
                                    console.log('Available jQuery plugins:', Object.keys(jQuery.fn).filter(function(k) { return k.indexOf('media') !== -1; }));
                                }
                            }, 100);
                        }
                    } else {
                        console.error('❌ MediaManager element not found in modal');
                    }
                });
                
                modal.show();
                
                // Handle insert button click
                $modal.on('click', '[data-control="media-choose"]', function() {
                    var $mediaManager = $modal.find('[data-control="media-manager"]');
                    var selectedItems = [];
                    
                    // Try to get selected items from MediaManager plugin first (most reliable)
                    if ($mediaManager.data('ti.mediaManager')) {
                        try {
                            var mediaManagerInstance = $mediaManager.data('ti.mediaManager');
                            var selectedElements = mediaManagerInstance.getSelectedItems() || [];
                            
                            console.log('Selected elements from plugin:', selectedElements.length);
                            
                            // Extract data from selected DOM elements
                            for (var i = 0; i < selectedElements.length; i++) {
                                var element = selectedElements[i];
                                console.log('Processing element #' + (i + 1) + ':', element);
                                
                                var path = '';
                                var publicUrl = '';
                                var name = '';
                                var identifier = '';
                                
                                // Method 1: Find [data-media-item] element (most reliable)
                                var dataItem = element.querySelector ? element.querySelector('[data-media-item]') : null;
                                if (dataItem) {
                                    path = dataItem.getAttribute('data-media-item-path') || '';
                                    publicUrl = dataItem.getAttribute('data-media-item-url') || '';
                                    name = dataItem.getAttribute('data-media-item-name') || '';
                                    identifier = dataItem.getAttribute('data-media-item-id') || '';
                                    console.log('   Method 1: Found [data-media-item], path=' + path + ', url=' + publicUrl);
                                }
                                
                                // Method 2: Check if element itself is [data-media-item]
                                if (!path && !publicUrl && element.getAttribute) {
                                    if (element.getAttribute('data-media-item') !== null || element.hasAttribute('data-media-item-path')) {
                                        path = element.getAttribute('data-media-item-path') || '';
                                        publicUrl = element.getAttribute('data-media-item-url') || '';
                                        name = element.getAttribute('data-media-item-name') || '';
                                        identifier = element.getAttribute('data-media-item-id') || '';
                                        console.log('   Method 2: Element is [data-media-item], path=' + path + ', url=' + publicUrl);
                                    }
                                }
                                
                                // Method 3: Extract from img src (works for already-uploaded images)
                                if (!path && !publicUrl) {
                                    var img = null;
                                    // Try multiple ways to find img
                                    if (element.querySelector) {
                                        img = element.querySelector('img');
                                    }
                                    if (!img && element.getElementsByTagName) {
                                        var imgs = element.getElementsByTagName('img');
                                        if (imgs.length > 0) {
                                            img = imgs[0];
                                        }
                                    }
                                    
                                    if (img && img.src) {
                                        publicUrl = img.src;
                                        console.log('   Method 3: Found img, src=' + publicUrl);
                                        
                                        // Extract path from URL - try multiple patterns
                                        var urlMatch = img.src.match(/\/assets\/media\/uploads\/(.+)$/);
                                        if (urlMatch) {
                                            path = '/' + urlMatch[1];
                                        } else {
                                            urlMatch = img.src.match(/\/storage\/temp\/public\/(.+)$/);
                                            if (urlMatch) {
                                                path = '/' + urlMatch[1];
                                            } else {
                                                // Just extract filename
                                                var filenameMatch = img.src.match(/\/([^\/]+\.(jpg|jpeg|png|gif|svg|ico|webp))(\?|$)/i);
                                                if (filenameMatch) {
                                                    path = filenameMatch[1];
                                                }
                                            }
                                        }
                                        
                                        if (!name) {
                                            name = img.getAttribute('alt') || img.getAttribute('title') || '';
                                            if (!name && path) {
                                                name = path.split('/').pop();
                                            }
                                        }
                                        
                                        console.log('   Method 3: Extracted path=' + path);
                                    } else {
                                        console.warn('   Method 3: No img found in element');
                                    }
                                }
                                
                                // Build itemData
                                var itemData = {
                                    identifier: identifier,
                                    path: path,
                                    publicUrl: publicUrl || (path ? 'http://127.0.0.1:8000/assets/media/uploads/' + path.replace(/^\//, '') : ''),
                                    fileType: 'image',
                                    name: name || (path ? path.split('/').pop() : '')
                                };
                                
                                // Only add if we have at least a path or publicUrl
                                if (itemData.path || itemData.publicUrl) {
                                    selectedItems.push(itemData);
                                    console.log('   ✅ EXTRACTION SUCCESS:', itemData);
                                } else {
                                    console.error('   ❌ EXTRACTION FAILED - No path or URL found');
                                    console.error('   Element HTML:', element.outerHTML ? element.outerHTML.substring(0, 500) : 'N/A');
                                }
                            }
                        } catch (e) {
                            console.warn('Could not get selected items from plugin:', e);
                        }
                    }
                    
                    // Fallback: try to get from DOM directly with improved extraction
                    if (selectedItems.length === 0) {
                        console.log('⚠️ No items from plugin, trying fallback extraction...');
                        $mediaManager.find('.media-item.selected, .media-item.is-selected').each(function() {
                            var $item = jQuery(this);
                            console.log('   Checking selected item:', this);
                            
                            // Try multiple methods to get the data
                            var path = '';
                            var publicUrl = '';
                            var name = '';
                            var identifier = '';
                            
                            // Method 1: Check for data-media-item element
                            var dataItem = $item.find('[data-media-item]').get(0);
                            if (dataItem) {
                                path = dataItem.getAttribute('data-media-item-path') || '';
                                publicUrl = dataItem.getAttribute('data-media-item-url') || '';
                                name = dataItem.getAttribute('data-media-item-name') || '';
                                identifier = dataItem.getAttribute('data-media-item-id') || '';
                                console.log('   Found data-media-item element');
                            }
                            
                            // Method 2: Check the item itself for data attributes
                            if (!path && !publicUrl) {
                                path = this.getAttribute('data-media-item-path') || this.getAttribute('data-path') || '';
                                publicUrl = this.getAttribute('data-media-item-url') || this.getAttribute('data-url') || '';
                                name = this.getAttribute('data-media-item-name') || this.getAttribute('title') || '';
                                identifier = this.getAttribute('data-media-item-id') || this.getAttribute('data-id') || '';
                                console.log('   Checked item element attributes');
                            }
                            
                            // Method 3: Extract from img src (most reliable for already-uploaded images)
                            if (!path && !publicUrl) {
                                var img = $item.find('img').get(0) || this.querySelector('img');
                                if (img && img.src) {
                                    publicUrl = img.src;
                                    console.log('   Found img src:', publicUrl);
                                    
                                    // Extract path from URL - try multiple patterns
                                    var urlMatch = img.src.match(/\/assets\/media\/uploads\/(.+)$/);
                                    if (urlMatch) {
                                        path = '/' + urlMatch[1];
                                    } else {
                                        // Try other URL patterns
                                        urlMatch = img.src.match(/\/storage\/temp\/public\/(.+)$/);
                                        if (urlMatch) {
                                            path = '/' + urlMatch[1];
                                        } else {
                                            // Just use the filename
                                            var filenameMatch = img.src.match(/\/([^\/]+\.(jpg|jpeg|png|gif|svg|ico|webp))$/i);
                                            if (filenameMatch) {
                                                path = filenameMatch[1];
                                            }
                                        }
                                    }
                                    
                                    // Get name from img alt or title
                                    if (!name) {
                                        name = img.getAttribute('alt') || img.getAttribute('title') || '';
                                        // Extract filename from src if no alt/title
                                        if (!name && filenameMatch) {
                                            name = filenameMatch[1];
                                        }
                                    }
                                } else {
                                    console.warn('   No img element found in item');
                                }
                            }
                            
                            // Method 4: Check for any nested element with src or data attributes
                            if (!path && !publicUrl) {
                                var anyElement = $item.find('[src], [data-path], [data-url]').first().get(0);
                                if (anyElement) {
                                    publicUrl = anyElement.getAttribute('src') || anyElement.getAttribute('data-url') || '';
                                    path = anyElement.getAttribute('data-path') || '';
                                    console.log('   Found element with src/data:', anyElement);
                                }
                            }
                            
                            // If we found at least a path or URL, add it
                            if (path || publicUrl) {
                                var itemData = {
                                    identifier: identifier,
                                    path: path,
                                    publicUrl: publicUrl || (path ? 'http://127.0.0.1:8000/assets/media/uploads/' + path.replace(/^\//, '') : ''),
                                    fileType: 'image',
                                    name: name || path.split('/').pop() || ''
                                };
                                selectedItems.push(itemData);
                                console.log('   ✅ Extracted from fallback:', itemData);
                            } else {
                                console.error('   ❌ Could not extract path/url from item:', this);
                                console.log('   Item HTML:', this.outerHTML.substring(0, 200));
                            }
                        });
                    }
                    
                    console.log('Final selectedItems:', selectedItems);
                    
                    if (selectedItems.length > 0 && options.onInsert) {
                        options.onInsert(selectedItems);
                    } else {
                        console.warn('No items selected or onInsert callback not available');
                    }
                    
                    modal.hide();
                    setTimeout(function() {
                        $modal.remove();
                    }, 300);
                });
                
                // Handle double-click on media items
                $modal.on('dblclick', '[data-media-item]', function() {
                    var itemElement = this;
                    var itemData = {
                        identifier: itemElement.getAttribute('data-media-item-id') || '',
                        path: itemElement.getAttribute('data-media-item-path') || '',
                        publicUrl: itemElement.getAttribute('data-media-item-url') || itemElement.getAttribute('data-media-item-path') || '',
                        fileType: itemElement.getAttribute('data-media-item-file-type') || 'image',
                        name: itemElement.getAttribute('data-media-item-name') || ''
                    };
                    
                    console.log('Double-click item data:', itemData);
                    
                    if (options.onInsert) {
                        options.onInsert([itemData]);
                    }
                    
                    modal.hide();
                    setTimeout(function() {
                        $modal.remove();
                    }, 300);
                });
            })
            .always(function() {
                if (jQuery.ti && jQuery.ti.loadingIndicator) {
                    jQuery.ti.loadingIndicator.hide();
                }
            });
    }
    
    // Function to update media finder display
    function updateMediaFinder(mediaFinder, item) {
        console.log('🎯 updateMediaFinder CALLED!');
        console.log('   MediaFinder element:', mediaFinder);
        console.log('   MediaFinder ID:', mediaFinder ? mediaFinder.id : 'NO ID');
        console.log('   Item data:', item);
        
        if (!mediaFinder) {
            console.error('❌ MediaFinder element is null!');
            return;
        }
        
        var grid = mediaFinder.querySelector('.grid');
        if (!grid) {
            console.error('❌ Grid element not found!');
            return;
        }
        
        // Normalize path - keep the path as provided, but ensure it's relative
        var path = item.path || '';
        var publicUrl = item.publicUrl || '';
        
        // If path starts with /, keep it (it's a relative path from root)
        // If path doesn't start with / and doesn't start with http, it's already relative
        // If we only have publicUrl, extract the path from it
        if (!path && publicUrl) {
            // Extract path from full URL
            var urlMatch = publicUrl.match(/\/assets\/media\/uploads\/(.+)$/);
            if (urlMatch) {
                path = urlMatch[1]; // Don't add leading slash - keep it relative
            } else {
                path = publicUrl;
            }
        }
        
        // If path starts with http, it's a full URL - extract relative path
        if (path && path.indexOf('http') === 0) {
            var urlMatch = path.match(/\/assets\/media\/uploads\/(.+)$/);
            if (urlMatch) {
                path = urlMatch[1]; // Relative path without leading slash
            }
        }
        
        // Remove leading slash if present (for relative paths)
        if (path && path.indexOf('/') === 0 && path.indexOf('http') !== 0) {
            path = path.substring(1);
        }
        
        // Use publicUrl for display, path for value
        var displayUrl = publicUrl || (path ? 'http://127.0.0.1:8000/assets/media/uploads/' + path : '');
        var valuePath = path || '';
        
        console.log('   Setting value to:', valuePath);
        console.log('   Setting image src to:', displayUrl);
        
        // Extract field name from MediaFinder ID
        var mediaFinderId = mediaFinder.id || '';
        var fieldName = '';
        if (mediaFinderId.indexOf('mediafinder-') === 0) {
            var parts = mediaFinderId.split('-');
            if (parts.length >= 3) {
                // Skip "mediafinder" and "form", get the rest
                fieldName = parts.slice(2).join('_');
            }
        }
        console.log('   Extracted field name:', fieldName);
        
        // CRITICAL: Find or create the input FIRST, before any DOM manipulation
        var findValue = mediaFinder.querySelector('[data-find-value]');
        if (!findValue) {
            console.log('   ⚠️ findValue not found, creating it...');
            findValue = document.createElement('input');
            findValue.type = 'hidden';
            findValue.setAttribute('data-find-value', '');
            grid.appendChild(findValue);
            console.log('   ✅ Created findValue input');
        }
        
        // Set the value and name IMMEDIATELY
        findValue.value = valuePath;
        var findValueName = fieldName ? 'setting[' + fieldName + ']' : '';
        if (findValueName) {
            findValue.setAttribute('name', findValueName);
        }
        
        // CRITICAL: Verify the input is in the form
        var form = grid.closest('form');
        console.log('   ✅ findValue updated - name:', findValue.getAttribute('name'), 'value:', findValue.value);
        console.log('   ✅ Input is inside form:', form !== null);
        console.log('   ✅ Input parent is grid:', findValue.parentNode === grid);
        console.log('   ✅ Grid is inside form:', form && form.contains(grid));
        
        // Double-check: ensure the input is actually attached to the DOM
        if (!form || !form.contains(findValue)) {
            console.error('   ❌ INPUT IS NOT IN THE FORM! Attempting to fix...');
            // Find the form and re-append if needed
            var actualForm = grid.closest('form');
            if (actualForm && findValue.parentNode !== grid) {
                grid.appendChild(findValue);
                console.log('   ✅ Re-appended input to grid');
            }
        }
        
        // Find or create findId
        var findId = mediaFinder.querySelector('[data-find-identifier]');
        if (!findId) {
            findId = document.createElement('input');
            findId.type = 'hidden';
            findId.setAttribute('data-find-identifier', '');
            grid.appendChild(findId);
        }
        findId.value = item.identifier || '';
        
        // NOW update the visual elements (but preserve the inputs we just set)
        // CRITICAL: Store input references and values BEFORE any DOM manipulation
        var inputName = findValue.getAttribute('name');
        var inputValue = findValue.value;
        var inputIdValue = findId ? findId.value : '';
        
        // Remove existing visual elements (but keep hidden inputs)
        var childrenToRemove = [];
        var allInputs = grid.querySelectorAll('input[type="hidden"]');
        var inputRefs = Array.from(allInputs);
        
        for (var i = 0; i < grid.children.length; i++) {
            var child = grid.children[i];
            var isInput = child.hasAttribute('data-find-value') || child.hasAttribute('data-find-identifier') || child.tagName === 'INPUT';
            if (!isInput) {
                childrenToRemove.push(child);
            }
        }
        childrenToRemove.forEach(function(el) { el.remove(); });
        
        // CRITICAL: Re-verify inputs exist after removal
        findValue = grid.querySelector('[data-find-value]');
        if (!findValue) {
            console.error('   ❌ findValue was removed! Recreating...');
            findValue = document.createElement('input');
            findValue.type = 'hidden';
            findValue.setAttribute('data-find-value', '');
            findValue.setAttribute('name', inputName);
            findValue.value = inputValue;
            grid.appendChild(findValue);
        } else {
            // Ensure it still has the correct attributes
            if (inputName && !findValue.getAttribute('name')) {
                findValue.setAttribute('name', inputName);
            }
            if (inputValue && !findValue.value) {
                findValue.value = inputValue;
            }
        }
        
        findId = grid.querySelector('[data-find-identifier]');
        if (!findId) {
            findId = document.createElement('input');
            findId.type = 'hidden';
            findId.setAttribute('data-find-identifier', '');
            findId.value = inputIdValue;
            grid.appendChild(findId);
        } else if (inputIdValue) {
            findId.value = inputIdValue;
        }
        
        // Create new visual elements
        var removeIcon = document.createElement('i');
        removeIcon.className = 'find-remove-button fa fa-times-circle';
        removeIcon.setAttribute('title', 'Remove');
        removeIcon.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 9999; cursor: pointer;';
        
        var iconDiv = document.createElement('div');
        iconDiv.className = 'icon-container';
        var nameSpan = document.createElement('span');
        nameSpan.setAttribute('data-find-name', '');
        nameSpan.setAttribute('title', item.name || valuePath || '');
        nameSpan.textContent = item.name || valuePath || '';
        iconDiv.appendChild(nameSpan);
        
        var configLink = document.createElement('a');
        configLink.className = 'find-config-button';
        configLink.style.cssText = 'position: relative; z-index: 1;';
        var coverDiv = document.createElement('div');
        coverDiv.className = 'img-cover';
        var img = document.createElement('img');
        img.setAttribute('data-find-image', '');
        img.className = 'img-responsive';
        img.src = displayUrl;
        img.alt = '';
        coverDiv.appendChild(img);
        configLink.appendChild(coverDiv);
        
        // Insert new visual elements before the inputs
        if (findValue && findValue.parentNode) {
            grid.insertBefore(removeIcon, findValue);
            grid.insertBefore(iconDiv, findValue);
            grid.insertBefore(configLink, findValue);
        } else {
            // Fallback: append to grid
            grid.appendChild(removeIcon);
            grid.appendChild(iconDiv);
            grid.appendChild(configLink);
        }
        
        console.log('   ✅ Visual elements updated');
        console.log('   ✅ Final value:', findValue.value);
        console.log('   ✅ Final name:', findValue.getAttribute('name'));
        
        // Update image and name
        var findImage = grid.querySelector('[data-find-image]');
        if (findImage && displayUrl) {
            findImage.setAttribute('src', displayUrl);
            console.log('   ✅ Image src set to:', findImage.getAttribute('src'));
        }
        
        var findName = grid.querySelector('[data-find-name]');
        if (findName) {
            findName.textContent = item.name || valuePath || '';
            findName.setAttribute('title', item.name || valuePath || '');
        }
        
        // Re-initialize remove button handler
        setTimeout(function() {
            initRemoveButtons();
        }, 100);
        
        // Trigger change event
        if (findValue) {
            var changeEvent = new Event('change', { bubbles: true });
            findValue.dispatchEvent(changeEvent);
            console.log('   ✅ Change event dispatched');
        }
        
        // Final verification - check multiple times to ensure it persists
        setTimeout(function() {
            console.log('   📊 FINAL VERIFICATION:');
            var finalFindValue = mediaFinder.querySelector('[data-find-value]');
            if (finalFindValue) {
                console.log('     - Value:', finalFindValue.value);
                console.log('     - Name:', finalFindValue.getAttribute('name'));
                console.log('     - Is in DOM:', finalFindValue.parentNode !== null);
                console.log('     - Is in form:', grid.closest('form') && grid.closest('form').contains(finalFindValue));
                
                // If name or value is missing, fix it
                if (!finalFindValue.getAttribute('name') && findValueName) {
                    finalFindValue.setAttribute('name', findValueName);
                    console.log('     - ⚠️ Name was missing, re-added:', findValueName);
                }
                if (!finalFindValue.value && valuePath) {
                    finalFindValue.value = valuePath;
                    console.log('     - ⚠️ Value was missing, re-added:', valuePath);
                }
            } else {
                console.error('     - ❌ findValue still not found! Recreating...');
                // Last resort: recreate the input
                var emergencyInput = document.createElement('input');
                emergencyInput.type = 'hidden';
                emergencyInput.setAttribute('data-find-value', '');
                emergencyInput.value = valuePath;
                if (findValueName) {
                    emergencyInput.setAttribute('name', findValueName);
                }
                grid.appendChild(emergencyInput);
                console.log('     - ✅ Emergency input created');
            }
        }, 200);
        
        // CRITICAL: Intercept form submission BEFORE serialization
        if (typeof jQuery !== 'undefined') {
            // Remove any existing handlers to avoid duplicates
            jQuery(document).off('submit.mediafinder-fix ajaxSend.mediafinder-fix');
            
            // Intercept form submission BEFORE it's serialized
            jQuery(document).on('submit.mediafinder-fix', 'form', function(e) {
                var $form = jQuery(this);
                // Only intercept settings form
                if ($form.attr('action') && $form.attr('action').indexOf('settings/edit/general') !== -1) {
                    console.log('🔧 Intercepting form submit BEFORE serialization...');
                    
                    // Ensure all MediaFinder inputs have name and value
                    jQuery('[data-control="mediafinder"]').each(function() {
                        var $mf = jQuery(this);
                        var $findValue = $mf.find('[data-find-value]');
                        
                        if ($findValue.length) {
                            var name = $findValue.attr('name');
                            var value = $findValue.val();
                            
                            // If missing name, derive it
                            if (!name && value) {
                                var mfId = this.id || '';
                                if (mfId.indexOf('mediafinder-') === 0) {
                                    var parts = mfId.split('-');
                                    if (parts.length >= 3) {
                                        var fieldName = parts.slice(2).join('_');
                                        name = 'setting[' + fieldName + ']';
                                        $findValue.attr('name', name);
                                        console.log('   ✅ Fixed name before submit:', name);
                                    }
                                }
                            }
                            
                            // Verify it's in the form
                            if (!$form[0].contains($findValue[0])) {
                                console.error('   ❌ Input not in form! Moving it...');
                                $form.append($findValue);
                            }
                            
                            console.log('   Pre-submit check:', name, '=', value, '- In form:', $form[0].contains($findValue[0]));
                        }
                    });
                }
            });
            
            // Intercept ALL AJAX requests (backup)
            jQuery(document).on('ajaxSend.mediafinder-fix', function(event, xhr, settings) {
                // Only intercept POST requests to settings/edit/general
                if (settings.type === 'POST' && settings.url && settings.url.indexOf('settings/edit/general') !== -1) {
                    console.log('🔧 Intercepting form submission to ensure MediaFinder inputs are included...');
                    
                    // Find all MediaFinder inputs and ensure they're in the form
                    jQuery('[data-control="mediafinder"]').each(function() {
                        var $mf = jQuery(this);
                        var $findValue = $mf.find('[data-find-value]');
                        
                        if ($findValue.length) {
                            var name = $findValue.attr('name');
                            var value = $findValue.val();
                            
                            console.log('   MediaFinder input:', name, '=', value);
                            
                            // If input has value but no name, try to derive it
                            if (value && !name) {
                                var mfId = this.id || '';
                                if (mfId.indexOf('mediafinder-') === 0) {
                                    var parts = mfId.split('-');
                                    if (parts.length >= 3) {
                                        var fieldName = parts.slice(2).join('_');
                                        name = 'setting[' + fieldName + ']';
                                        $findValue.attr('name', name);
                                        console.log('   ✅ Fixed: added name', name);
                                    }
                                }
                            }
                            
                            // CRITICAL: Always ensure the input is in the form data
                            if (name && value) {
                                // Handle different data formats
                                if (typeof settings.data === 'string') {
                                    // It's already a string - append our field
                                    var nameEncoded = encodeURIComponent(name);
                                    var valueEncoded = encodeURIComponent(value);
                                    var fieldPair = nameEncoded + '=' + valueEncoded;
                                    
                                    // Check if already present (case-insensitive)
                                    if (settings.data.indexOf(nameEncoded + '=') === -1) {
                                        settings.data += (settings.data ? '&' : '') + fieldPair;
                                        console.log('   ✅ Added to string data:', name, '=', value);
                                    } else {
                                        // Replace existing value
                                        var regex = new RegExp('(' + nameEncoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=)[^&]*', 'g');
                                        settings.data = settings.data.replace(regex, '$1' + valueEncoded);
                                        console.log('   ✅ Updated existing in string data:', name, '=', value);
                                    }
                                } else if (typeof settings.data === 'object' && settings.data !== null) {
                                    // It's an object - add our field
                                    settings.data[name] = value;
                                    console.log('   ✅ Added to object data:', name, '=', value);
                                } else {
                                    // No existing data - create new string
                                    settings.data = encodeURIComponent(name) + '=' + encodeURIComponent(value);
                                    console.log('   ✅ Created new data string:', name, '=', value);
                                }
                            } else if (name && !value) {
                                console.warn('   ⚠️ Input has name but empty value:', name);
                            } else if (!name && value) {
                                console.warn('   ⚠️ Input has value but no name:', value.substring(0, 50));
                            }
                        }
                    });
                }
            });
        }
        
        console.log('   ✅✅✅ updateMediaFinder COMPLETE!');
    }
    
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
    
    // Dashboard logo handling with image validation
    function checkAndClearInvalidImages() {
        var invalidPatterns = [
            'vecteezy_fast-food-meal-with_25065315-removebg-preview-removebg-preview.jpg',
            'fresh-chicken-curry-isolated-on-transparent-background-free-png-removebg-preview.jpg',
            'thumb_ebb1d302c04621b99b053d0559077379__122x122_contain.jpg',
            'thumb_4326f3e81f7e4c3b0ab60d3b5fa94f62__122x122_contain.jpg',
            'ebb1d302c04621b99b053d0559077379',
            '4326f3e81f7e4c3b0ab60d3b5fa94f62'
        ];
        
        document.querySelectorAll('.media-finder img').forEach(function(img) {
            var imgSrc = img.getAttribute("src") || '';
            
            // Check if image matches invalid patterns
            var isInvalid = invalidPatterns.some(function(pattern) {
                return imgSrc.indexOf(pattern) !== -1;
            });
            
            if (isInvalid) {
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
        });
    }
    
    // Run immediately and repeatedly
    removeInvalidImagesImmediately();
    checkAndClearInvalidImages();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            removeInvalidImagesImmediately();
            checkAndClearInvalidImages();
        });
    }
    
    setTimeout(function() {
        removeInvalidImagesImmediately();
        checkAndClearInvalidImages();
    }, 100);
    setTimeout(function() {
        removeInvalidImagesImmediately();
        checkAndClearInvalidImages();
    }, 500);
    
    // Also run on AJAX updates
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('ajaxUpdateComplete', function() {
            removeInvalidImagesImmediately();
            checkAndClearInvalidImages();
        });
        jQuery(document).on('render', function() {
            removeInvalidImagesImmediately();
            checkAndClearInvalidImages();
        });
    }
    
    // Initialize plus buttons - run immediately and on ready
    function initAll() {
        initPlusButtons();
        initRemoveButtons();
    }
    
    // Run immediately
    initAll();
    
    // Also run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    }
    
    // Run multiple times to catch dynamically added elements
    setTimeout(initAll, 100);
    setTimeout(initAll, 500);
    setTimeout(initAll, 1000);
    
    // Re-initialize on AJAX updates
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('ajaxUpdateComplete', initAll);
        jQuery(document).on('render', initAll);
    }
})();
</script>
