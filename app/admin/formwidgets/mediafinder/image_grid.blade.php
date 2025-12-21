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
                var useAttachment = mediaFinder.getAttribute('data-use-attachment') === 'true' || mediaFinder.getAttribute('data-use-attachment') === '';
                var chooseButtonText = mediaFinder.getAttribute('data-choose-button-text') || 'Choose';
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
                        console.log('Items selected:', items);
                        if (!items || !items.length) return;
                        
                        var item = items[0];
                        var itemData = {
                            identifier: item.identifier || item.id || '',
                            path: item.path || item.publicUrl || '',
                            publicUrl: item.publicUrl || item.path || '',
                            fileType: item.fileType || 'image'
                        };
                        
                        if (useAttachment) {
                            // Attachment mode
                            if (typeof jQuery !== 'undefined' && jQuery.ti && jQuery.ti.loadingIndicator) {
                                jQuery.ti.loadingIndicator.show();
                                jQuery.request(alias + '::onAddAttachment', {
                                    data: {items: [itemData]}
                                }).done(function(response) {
                                    if (response && response.length) {
                                        updateMediaFinder(mediaFinder, response[0]);
                                    } else {
                                        location.reload();
                                    }
                                }).always(function() {
                                    jQuery.ti.loadingIndicator.hide();
                                });
                            }
                        } else {
                            // Simple mode
                            updateMediaFinder(mediaFinder, itemData);
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
                
                // Initialize Bootstrap modal
                var modal = new bootstrap.Modal($modal[0]);
                
                // CRITICAL: Initialize MediaManager plugin AFTER modal is shown
                // This ensures upload button (Dropzone) and other controls work
                $modal.one('shown.bs.modal', function() {
                    var $mediaManager = $modal.find('[data-control="media-manager"]');
                    if ($mediaManager.length) {
                        // Function to initialize MediaManager
                        function initMediaManager() {
                            if (typeof jQuery.fn.mediaManager !== 'undefined') {
                                try {
                                    // Initialize MediaManager plugin if not already initialized
                                    if (!$mediaManager.data('ti.mediaManager')) {
                                        $mediaManager.mediaManager();
                                        console.log('✅ MediaManager plugin initialized - upload button should work now');
                                    } else {
                                        console.log('MediaManager already initialized');
                                    }
                                } catch (e) {
                                    console.error('❌ Failed to initialize MediaManager:', e);
                                }
                            } else {
                                return false; // Plugin not loaded yet
                            }
                            return true;
                        }
                        
                        // Try to initialize immediately
                        if (!initMediaManager()) {
                            // Wait for plugin to load (up to 5 seconds)
                            var attempts = 0;
                            var checkPlugin = setInterval(function() {
                                attempts++;
                                if (initMediaManager()) {
                                    clearInterval(checkPlugin);
                                } else if (attempts > 50) {
                                    clearInterval(checkPlugin);
                                    console.warn('⚠️ MediaManager plugin not found after 5 seconds - upload may not work');
                                }
                            }, 100);
                        }
                    } else {
                        console.warn('⚠️ MediaManager element not found in modal');
                    }
                });
                
                modal.show();
                
                // Handle insert button click
                $modal.on('click', '[data-control="media-choose"]', function() {
                    var $mediaManager = $modal.find('[data-control="media-manager"]');
                    var selectedItems = [];
                    
                    // Get selected items
                    $mediaManager.find('[data-media-item].selected, [data-media-item].is-selected').each(function() {
                        var $item = jQuery(this);
                        selectedItems.push({
                            identifier: $item.data('media-identifier') || $item.data('media-id') || '',
                            path: $item.data('media-path') || '',
                            publicUrl: $item.data('media-url') || $item.data('media-path') || '',
                            fileType: $item.data('media-type') || 'image'
                        });
                    });
                    
                    // If no selected, try to get from mediaManager plugin
                    if (selectedItems.length === 0 && $mediaManager.data('ti.mediaManager')) {
                        try {
                            selectedItems = $mediaManager.mediaManager('getSelectedItems') || [];
                        } catch (e) {
                            console.warn('Could not get selected items from plugin:', e);
                        }
                    }
                    
                    if (selectedItems.length > 0 && options.onInsert) {
                        options.onInsert(selectedItems);
                    }
                    
                    modal.hide();
                    setTimeout(function() {
                        $modal.remove();
                    }, 300);
                });
                
                // Handle double-click on media items
                $modal.on('dblclick', '[data-media-item]', function() {
                    var $item = jQuery(this);
                    var itemData = {
                        identifier: $item.data('media-identifier') || $item.data('media-id') || '',
                        path: $item.data('media-path') || '',
                        publicUrl: $item.data('media-url') || $item.data('media-path') || '',
                        fileType: $item.data('media-type') || 'image'
                    };
                    
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
        var findValue = mediaFinder.querySelector('[data-find-value]');
        var findId = mediaFinder.querySelector('[data-find-identifier]');
        var findImage = mediaFinder.querySelector('[data-find-image]');
        var findName = mediaFinder.querySelector('[data-find-name]');
        var grid = mediaFinder.querySelector('.grid');
        
        if (findValue) {
            findValue.value = item.path || item.publicUrl || '';
            // Ensure name attribute is set for form submission
            if (!findValue.hasAttribute('name')) {
                var fieldContainer = mediaFinder.closest('[id*="form-field"]');
                if (fieldContainer) {
                    var fieldId = fieldContainer.id;
                    var fieldName = fieldId.replace('form-field-', '').replace(/-group$/, '');
                    if (fieldName) {
                        findValue.setAttribute('name', 'setting[' + fieldName + ']');
                    }
                }
            }
        }
        
        if (findId) {
            findId.value = item.identifier || '';
        }
        
        if (findImage && item.publicUrl) {
            findImage.setAttribute('src', item.publicUrl);
            findImage.style.display = 'block';
        }
        
        if (findName) {
            findName.textContent = item.path || '';
            findName.setAttribute('title', item.path || '');
        }
        
        // Hide plus button, show image container
        if (grid) {
            var blankCover = grid.querySelector('.blank-cover');
            if (blankCover) {
                blankCover.style.display = 'none';
            }
            
            // Show image container if it exists
            var imgContainer = grid.querySelector('.img-cover');
            if (imgContainer && imgContainer.parentElement) {
                imgContainer.parentElement.style.display = 'block';
            }
        }
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
