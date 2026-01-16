
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

<script>
// ============================================
// INLINE FALLBACK: Load widgets automatically
// This ensures widgets load even if the JavaScript plugin fails
// ============================================
(function() {
    var alias = {{ json_encode($this->alias) }};
    var containerId = {{ json_encode($this->getId("container")) }};
    var containerSelector = '#' + containerId;
    var $container = $(containerSelector);
    var $progressIndicator = $('.dashboard-widgets .progress-indicator');
    
    function loadWidgets() {
        console.log('🚀 DashboardContainer: Auto-loading widgets...', {
            alias: alias,
            containerId: containerId
        });
        
        // Hide progress indicator
        $progressIndicator.css({
            'display': 'none',
            'visibility': 'hidden',
            'opacity': '0'
        });
        
        // Ensure container is visible
        $container.css({
            'display': 'block',
            'visibility': 'visible',
            'opacity': '1',
            'min-height': '200px'
        });
        
        // Make AJAX request
        $.request(alias + '::onRenderWidgets', {
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
                    $container.html(htmlContent);
                    
                    // Force visibility
                    $container.css({
                        'display': 'block',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    // Make all widget elements visible
                    $container.find('.widget-container').css({
                        'display': 'block',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    $container.find('.widget-list, .row').css({
                        'display': 'flex',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    $container.find('.widget-item, .col').css({
                        'display': 'block',
                        'visibility': 'visible',
                        'opacity': '1'
                    });
                    
                    console.log('✅ DashboardContainer: Widgets inserted!', {
                        widgetCount: $container.find('.widget-item, .col[class*="col-sm"]').length
                    });
                    
                    // Trigger events
                    $(window).trigger('resize');
                    $(window).trigger('ajaxUpdateComplete');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('❌ DashboardContainer: Failed to load widgets', {
                    status: textStatus,
                    error: errorThrown,
                    statusCode: jqXHR.status
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
    
    // Load widgets when DOM is ready
    if (typeof jQuery !== 'undefined') {
        $(document).ready(function() {
            setTimeout(loadWidgets, 300);
        });
        
        // Also try on render event
        $(document).on('render', function() {
            setTimeout(loadWidgets, 300);
        });
    } else {
        // Fallback if jQuery loads later
        setTimeout(function() {
            if (typeof jQuery !== 'undefined') {
                loadWidgets();
            }
        }, 1000);
    }
})();
</script>


