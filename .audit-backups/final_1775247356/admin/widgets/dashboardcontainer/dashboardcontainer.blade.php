
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
        <div class="progress-indicator d-flex flex-column">
            <div class="align-self-center text-center m-auto">
            @php
use Illuminate\Support\Facades\DB;
$loader_logo = DB::table('logos')->orderBy('id', 'desc')->value('loader_logo');
@endphp
            <img src="<?php echo $loader_logo ? $loader_logo . '?t=' . time() : ''; ?>" alt="Loader Logo">
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
// Minimal fallback: Ensure widgets load if plugin fails
(function() {
    var alias = {!! json_encode($this->alias) !!};
    var containerId = {!! json_encode($this->getId("container")) !!};
    var containerSelector = '#' + containerId;
    var hasLoaded = false;
    
    function loadWidgets() {
        if (hasLoaded || typeof jQuery === 'undefined') {
            if (typeof jQuery === 'undefined') {
                setTimeout(loadWidgets, 100);
            }
            return;
        }
        
        var $container = jQuery(containerSelector);
        if ($container.length === 0) {
            setTimeout(loadWidgets, 100);
            return;
        }
        
        // Check if already has content
        if ($container.html().trim().length > 0) {
            hasLoaded = true;
            jQuery('.dashboard-widgets .progress-indicator').hide();
            return;
        }
        
        console.log('🚀 DashboardContainer: Loading widgets via fallback...', { alias: alias, containerId: containerId });
        
        jQuery.request(alias + '::onRenderWidgets', {
            success: function(data) {
                hasLoaded = true;
                var htmlContent = null;
                
                if (typeof data === 'object' && data !== null) {
                    htmlContent = data[containerSelector] || data['#' + containerId] || Object.values(data)[0];
                } else if (typeof data === 'string') {
                    htmlContent = data;
                }
                
                if (htmlContent && $container.length) {
                    $container.html(htmlContent);
                    // Hide progress indicator immediately - remove from layout flow
                    jQuery('.dashboard-widgets .progress-indicator').css({
                        'display': 'none',
                        'visibility': 'hidden',
                        'opacity': '0',
                        'height': '0',
                        'overflow': 'hidden',
                        'position': 'absolute'
                    });
                    console.log('✅ DashboardContainer: Widgets loaded via fallback');
                    
                    // Initialize charts immediately after widgets are loaded
                    function initChartsFallback() {
                        if (typeof Chart === 'undefined' || typeof jQuery.fn.chartControl !== 'function') {
                            setTimeout(initChartsFallback, 50); // Faster retry
                            return;
                        }
                        
                        $container.find('[data-control="chart"]').each(function() {
                            var $chart = jQuery(this);
                            if (!$chart.data('ti.chartControl')) {
                                try {
                                    $chart.chartControl();
                                    console.log('✅ DashboardContainer: Chart initialized via fallback', $chart.attr('data-alias'));
                                } catch (e) {
                                    console.error('❌ DashboardContainer: Failed to initialize chart via fallback', $chart.attr('data-alias'), e);
                                }
                            }
                        });
                    }
                    // Start chart initialization immediately, with minimal delay
                    setTimeout(initChartsFallback, 50);
                }
            },
            error: function(jqXHR) {
                console.error('❌ DashboardContainer: Failed to load widgets', jqXHR.status);
            }
        });
    }
    
    // Wait for jQuery and DOM - start immediately, no delay
    if (typeof jQuery !== 'undefined') {
        jQuery(document).ready(function() {
            loadWidgets(); // Start immediately
        });
    } else {
        var checkJQuery = setInterval(function() {
            if (typeof jQuery !== 'undefined') {
                clearInterval(checkJQuery);
                jQuery(document).ready(function() {
                    loadWidgets(); // Start immediately
                });
            }
        }, 50); // Check faster
    }
})();

// AGGRESSIVE FIX: Continuously monitor and disable profile dropdown when calendar is open
(function() {
    function runCalendarFix() {
        if (typeof jQuery === 'undefined') return;
        var $calendar = jQuery('.daterangepicker.show-calendar, .daterangepicker:visible');
        var $profileDropdown = jQuery('.profile-dropdown-menu');
        
        if ($calendar.length > 0) {
            // Calendar is open - aggressively disable profile dropdown
            if ($profileDropdown.length) {
                $profileDropdown.removeClass('show');
                $profileDropdown.css({
                    'display': 'none',
                    'visibility': 'hidden',
                    'opacity': '0',
                    'pointer-events': 'none',
                    'z-index': '-1'
                });
                
                // Disable all interactive elements inside
                $profileDropdown.find('a, button, .dropdown-item, [href]').css({
                    'pointer-events': 'none',
                    'cursor': 'default'
                }).off('click.profile-disable');
            }
            
            // Ensure calendar is on top
            $calendar.css({
                'z-index': '99999',
                'pointer-events': 'auto'
            });
        } else {
            // Calendar is closed - restore profile dropdown (remove forced styles)
            if ($profileDropdown.length && !$profileDropdown.hasClass('show')) {
                // Only remove our forced styles if dropdown is not supposed to be open
                var wasForced = $profileDropdown.data('calendar-forced-close');
                if (wasForced) {
                    $profileDropdown.css({
                        'display': '',
                        'visibility': '',
                        'opacity': '',
                        'pointer-events': '',
                        'z-index': ''
                    });
                    $profileDropdown.find('a, button, .dropdown-item, [href]').css({
                        'pointer-events': '',
                        'cursor': ''
                    });
                    $profileDropdown.removeData('calendar-forced-close');
                }
            }
        }
    }
    
    var calendarCheckInterval;
    function startCalendarFix() {
        if (typeof jQuery === 'undefined') return;
        calendarCheckInterval = setInterval(runCalendarFix, 100);
        jQuery(window).on('beforeunload.calendarFix', function() {
            clearInterval(calendarCheckInterval);
        });
    }
    if (typeof jQuery !== 'undefined') {
        jQuery(document).ready(startCalendarFix);
    } else {
        var check = setInterval(function() {
            if (typeof jQuery !== 'undefined') {
                clearInterval(check);
                jQuery(document).ready(startCalendarFix);
            }
        }, 50);
    }
})();
</script>

