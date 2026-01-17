
<div
    class=""
    data-control="dashboard-container"
    data-alias="{{ $this->alias }}"
    data-sortable-container="#{{ $this->getId('container-list') }}"
    data-date-range-format="{{ $dateRangeFormat }}"
>
    <div
        id="{{ $this->getId('container-toolbar') }}"
        class="toolbar dashboard-toolbar btn-toolbar"
        data-container-toolbar>
        {!! $this->makePartial('widget_toolbar') !!}
    </div>

    <div class="dashboard-widgets page-x-spacer">
        <div class="progress-indicator vh-100 d-flex flex-column">
            <div class="align-self-center text-center m-auto">
            @php
// Always use the base64 image from loaderimage file
use Illuminate\Support\Str;
$loaderImagePath = app_path('admin/assets/images/loaderimage');
$loader_logo = '';
if (file_exists($loaderImagePath)) {
    $loader_logo = file_get_contents($loaderImagePath);
    // Ensure it's a valid base64 data URI
    if (!Str::startsWith($loader_logo, 'data:')) {
        $loader_logo = 'data:image/png;base64,' . $loader_logo;
    }
}
@endphp
            <img src="{{ $loader_logo }}" alt="Loader Logo" style="max-width: 256px; max-height: 256px;">
                <i class="d-block" style="width: 256px;height: 256px;">
                </i>
                <br>
                <span class="spinner-border"></span>&nbsp;&nbsp;@lang('admin::lang.text_loading')
            </div>
        </div>
        <div id="{{ $this->getId('container') }}"></div>
    </div>
</div>

<style>
/* Permanent Dashboard Visibility Fix - Ensures widgets are always visible */
#{{ $this->getId('container') }},
#dashboardcontainer-container,
#dashboardContainer-container,
.dashboard-widgets > div[id*="container"]:not(.progress-indicator) {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-height: 200px !important;
}

.dashboard-widgets .widget-container {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
}

.dashboard-widgets .widget-list,
.dashboard-widgets .row {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
}

.dashboard-widgets .widget-item,
.dashboard-widgets .col[class*="col-sm"] {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
}

.dashboard-widgets .progress-indicator {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
}
</style>

<script>
// ============================================
// INLINE FALLBACK: Load widgets automatically
// This ensures widgets load even if the JavaScript plugin fails
// ============================================
(function() {
    var alias = {!! json_encode($this->alias) !!};
    var containerId = {!! json_encode($this->getId("container")) !!};
    var containerSelector = '#' + containerId;
    var hasLoaded = false; // Prevent multiple loads
    
    function loadWidgets() {
        // Prevent multiple simultaneous loads
        if (hasLoaded) {
            return;
        }
        
        // Check jQuery is available
        if (typeof jQuery === 'undefined') {
            console.warn('⚠️ DashboardContainer: jQuery not available, retrying...');
            setTimeout(loadWidgets, 500);
            return;
        }
        
        // Try to find container - check both exact ID and case-insensitive
        var $container = jQuery(containerSelector);
        if ($container.length === 0) {
            // Try case-insensitive search
            jQuery('[id]').each(function() {
                if (jQuery(this).attr('id').toLowerCase() === containerId.toLowerCase()) {
                    $container = jQuery(this);
                    containerSelector = '#' + jQuery(this).attr('id');
                    return false; // break
                }
            });
        }
        
        // If still not found, try finding any container in dashboard-widgets
        if ($container.length === 0) {
            $container = jQuery('.dashboard-widgets [id*="container"]:not([id*="container-list"]):not([id*="container-toolbar"])').first();
            if ($container.length > 0) {
                containerSelector = '#' + $container.attr('id');
                containerId = $container.attr('id');
            } else {
                // Container doesn't exist yet - create it
                const $dashboardWidgets = jQuery('.dashboard-widgets');
                if ($dashboardWidgets.length > 0) {
                    const actualId = containerId.toLowerCase();
                    $dashboardWidgets.append('<div id="' + actualId + '"></div>');
                    $container = jQuery('#' + actualId);
                    containerSelector = '#' + actualId;
                    containerId = actualId;
                    console.log('✅ Created missing container:', actualId);
                }
            }
        }
        
        var $progressIndicator = jQuery('.dashboard-widgets .progress-indicator');
        
        console.log('🚀 DashboardContainer: Auto-loading widgets...', {
            alias: alias,
            containerId: containerId,
            containerExists: $container.length > 0,
            containerSelector: containerSelector
        });
        
        // Hide progress indicator with !important
        $progressIndicator.css({
            'display': 'none !important',
            'visibility': 'hidden !important',
            'opacity': '0 !important',
            'height': '0 !important',
            'overflow': 'hidden !important'
        });
        
        // Ensure container is visible with !important
        if ($container.length > 0) {
            $container.css({
                'display': 'block !important',
                'visibility': 'visible !important',
                'opacity': '1 !important',
                'min-height': '200px !important'
            });
        }
        
        // Make AJAX request
        jQuery.request(alias + '::onRenderWidgets', {
            success: function(data) {
                console.log('✅ DashboardContainer: Widgets loaded', data);
                
                // Extract HTML from response
                var htmlContent = null;
                if (typeof data === 'object' && data !== null) {
                    // Try different selector formats
                    htmlContent = data[containerSelector] || 
                                 data['#' + containerId] ||
                                 data[containerId] ||
                                 Object.values(data)[0];
                } else if (typeof data === 'string') {
                    htmlContent = data;
                }
                
                // Insert HTML
                if (htmlContent && $container.length) {
                    hasLoaded = true; // Mark as loaded to prevent duplicate loads
                    $container.html(htmlContent);
                    
                    // Force visibility with !important
                    $container.css({
                        'display': 'block !important',
                        'visibility': 'visible !important',
                        'opacity': '1 !important',
                        'min-height': '200px !important'
                    });
                    
                    // Make all widget elements visible with !important
                    $container.find('.widget-container').css({
                        'display': 'block !important',
                        'visibility': 'visible !important',
                        'opacity': '1 !important'
                    });
                    
                    $container.find('.widget-list, .row').css({
                        'display': 'flex !important',
                        'visibility': 'visible !important',
                        'opacity': '1 !important'
                    });
                    
                    $container.find('.widget-item, .col').css({
                        'display': 'block !important',
                        'visibility': 'visible !important',
                        'opacity': '1 !important'
                    });
                    
                    // Hide progress indicator again after content is loaded
                    $progressIndicator.css({
                        'display': 'none !important',
                        'visibility': 'hidden !important',
                        'opacity': '0 !important',
                        'height': '0 !important',
                        'overflow': 'hidden !important'
                    });
                    
                    const widgetCount = $container.find('.widget-item, .col[class*="col-sm"]').length;
                    const visibleCount = $container.find('.widget-item:visible, .col[class*="col-sm"]:visible').length;
                    
                    console.log('✅ DashboardContainer: Widgets inserted!', {
                        widgetCount: widgetCount,
                        visibleCount: visibleCount,
                        containerId: containerId
                    });
                    
                    // If widgets exist but none are visible, force them visible
                    if (widgetCount > 0 && visibleCount === 0) {
                        console.warn('⚠️ Widgets exist but are hidden! Forcing visibility...');
                        $container.find('.widget-item, .col').show().css({
                            'display': 'block !important',
                            'visibility': 'visible !important',
                            'opacity': '1 !important'
                        });
                    }
                    
                    // Trigger events
                    jQuery(window).trigger('resize');
                    jQuery(window).trigger('ajaxUpdateComplete');
                } else {
                    console.warn('⚠️ DashboardContainer: No content to insert', {
                        hasContent: !!htmlContent,
                        containerExists: $container.length > 0,
                        containerSelector: containerSelector,
                        searchedId: containerId
                    });
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('❌ DashboardContainer: Failed to load widgets', {
                    status: textStatus,
                    error: errorThrown,
                    statusCode: jqXHR.status,
                    response: jqXHR.responseText?.substring(0, 200)
                });
            }
        }).always(function() {
            // Always hide progress indicator
            $progressIndicator.css({
                'display': 'none',
                'visibility': 'hidden',
                'opacity': '0'
            });
        });
    }
    
    // Wait for jQuery to be available
    function initWhenReady() {
        if (typeof jQuery !== 'undefined') {
            jQuery(document).ready(function() {
                // Only load once on document ready
                if (!hasLoaded) {
                    setTimeout(loadWidgets, 300);
                }
            });
            
            // Also try on render event (but only if not already loaded)
            jQuery(document).on('render', function() {
                if (!hasLoaded) {
                    setTimeout(loadWidgets, 300);
                }
            });
        } else {
            // Retry after a short delay
            setTimeout(initWhenReady, 100);
        }
    }
    
    // Start initialization
    initWhenReady();
})();
</script>


