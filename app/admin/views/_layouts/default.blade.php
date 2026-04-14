<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    {!! get_metas() !!}
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {!! get_favicon() !!}
    @empty($pageTitle = Template::getTitle())
        <title>{{setting('site_name')}}</title>
    @else
        <title>{{ $pageTitle }}@lang('admin::lang.site_title_separator'){{setting('site_name')}}</title>
    @endempty
    {{-- Use asset combiner to ensure all widget CSS files are included --}}
    {!! get_style_tags() !!}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/push-notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/header-dropdowns.css') }}?v={{ time() }}">
    <!-- Remove Green Edges from Dropdowns -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/remove-green-edges.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-transitions.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/custom-fixes.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/calendar.css') }}?v={{ time() }}">
    <!-- Modern Admin Settings Styling -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-settings-modern.css') }}?v={{ time() }}">
    <!-- SweetAlert2 – match admin modal/card design -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/sweetalert2-modal-style.css') }}?v={{ time() }}">
    <!-- Admin confirm modal – rounder card, button spacing, Cancel style -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-confirm-modal.css') }}?v={{ time() }}">
    <!-- Unified modal design – round corners, nice buttons, consistent styling for all modals -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-modals-unified.css') }}?v={{ time() }}">
    <!-- Rounded corners for notification panel, settings menu, profile dropdown, toast -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-cards-rounded.css') }}?v={{ time() }}">
    <!-- Admin Tour Enhanced Styles -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/introjs.min.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-tour-enhanced.css') }}">
    <!-- Blue Buttons Override - Replace all green buttons with login button style -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/blue-buttons-override.css') }}?v={{ time() }}">
    <!-- Smooth Corner - Replace Star Icon with Rounded Corner -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-corner-replace-star.css') }}?v={{ time() }}">
    {{-- Dashboard Container Widget CSS is included via get_style_tags() combiner --}}
    <!-- Fix Menu-Grid Hover - Only icon scale, no green flashing -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-menu-grid-hover.css') }}?v={{ time() }}">
    <!-- Fix Footer Button - Remove green hover -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-footer-button-no-green.css') }}?v={{ time() }}">
    <!-- Fix Toggle Switches - Restore iOS-style appearance -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-toggle-switches.css') }}?v={{ time() }}">
    <!-- Fix Notification Header Border - Make it straight and full width -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-notification-header-border.css') }}?v={{ time() }}">
    <!-- Fix Notification Header Buttons - Fix z-index, spacing, padding, borders -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-notification-header-buttons.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown - Remove green hover effects and green text-muted color -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-green.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown Hover - Remove inline styles blocking hover effect -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-hover.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown Closed - Disable items when dropdown is closed -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-closed.css') }}?v={{ time() }}">
    <!-- Fix Green Buttons and Text - Change btn-default, btn-outline-default, and text-muted from green to dark blue/gray -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-green-buttons-and-text.css') }}?v={{ time() }}">
    <!-- Modern Media Finder - Elegant image uploader redesign -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/modern-media-finder.css') }}?v={{ time() }}">
    <!-- Media Finder Widget CSS - Required for image uploader fields -->
    <link rel="stylesheet" href="{{ asset('app/admin/formwidgets/mediafinder/assets/css/mediafinder.css') }}?v={{ time() }}">
    <!-- Date range picker: load last so overrides (bigger card, buttons, ranges) win over .btn-sm etc -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/daterangepicker-arrows.css') }}?v={{ time() }}">
    <!-- No green toolbar buttons - MUST load last so toolbar Save/Back stay blue -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/no-green-toolbar-buttons.css') }}?v={{ time() }}">
    <!-- Dropdown fields same size as text inputs - load after other form styles -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dropdown-field-same-size.css') }}?v={{ time() }}">
    {{-- Critical: prevent green flash on first paint - inline so it's in the first render --}}
    <style id="no-green-toolbar-critical">
        .toolbar-action,
        .progress-indicator-container {
            --bs-primary-rgb: 54, 74, 99 !important;
            --bs-btn-focus-shadow-rgb: 54, 74, 99 !important;
        }
        .toolbar-action .btn-primary,
        .toolbar-action .progress-indicator-container .btn-primary,
        .progress-indicator-container .btn-primary,
        .toolbar-action .progress-indicator-container .btn-group .btn-primary {
            background: linear-gradient(135deg, #1f2b3a 0%, #364a63 100%) !important;
            background-color: #364a63 !important;
            border-color: #364a63 !important;
            box-shadow: 0 4px 15px rgba(54, 74, 99, 0.35) !important;
        }
        .toolbar-action .progress-indicator-container .progress-indicator,
        .progress-indicator-container .progress-indicator {
            background: transparent !important;
        }
    </style>
</head>
<script>
    // SMART FIX: Force dropdown alignment WITHOUT breaking Bootstrap animations
    (function() {
        function forceDropdownAlignment() {
            // Fix ALL navbar dropdowns
            const dropdowns = document.querySelectorAll('.navbar-top .dropdown-menu, #notification-panel');
            dropdowns.forEach(dropdown => {
                // ONLY fix if dropdown is visible (has 'show' class)
                if (dropdown.classList.contains('show')) {
                    // Remove Popper.js LEFT positioning only
                    dropdown.style.removeProperty('left');
                    dropdown.style.removeProperty('inset');
                    
                    // Force right alignment
                    dropdown.style.setProperty('right', '0px', 'important');
                    dropdown.style.setProperty('left', 'auto', 'important');
                    
                    // DON'T touch transform (needed for animations)
                    // DON'T touch display (needed for show/hide)
                }
            });
        }
        
        // Fix on page load
        document.addEventListener('DOMContentLoaded', forceDropdownAlignment);
        
        // Fix when dropdown is shown (AFTER Bootstrap shows it)
        document.addEventListener('shown.bs.dropdown', function(e) {
            setTimeout(forceDropdownAlignment, 10);
        });
        
        // Fix when dropdown is being shown (DURING Bootstrap animation)
        document.addEventListener('show.bs.dropdown', function(e) {
            setTimeout(forceDropdownAlignment, 1);
            setTimeout(forceDropdownAlignment, 50);
        });
    })();
</script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        let imgElement = document.querySelector("#mediafinder-formdashboardlogo-dashboard-logo img");
        let logoElement = document.querySelector("a.logo img");
        if (imgElement && logoElement) {
            let imagePath = imgElement.getAttribute("src");
            logoElement.setAttribute("src", imagePath);
        }
    });
            </script>
<body class="page {{ $this->bodyClass }}">
@if(AdminAuth::isLogged())
    {!! $this->makePartial('top_nav') !!}
    {!! AdminMenu::render('side_nav') !!}
@endif

<div class="page-wrapper">
    <div class="page-content">
        {!! Template::getBlock('body') !!}
    </div>
</div>

<div id="notification">
    {!! $this->makePartial('flash') !!}
</div>
@if(AdminAuth::isLogged())
    {!! $this->makePartial('set_status_form') !!}
@endif
{!! $this->makePartial('confirm_modal') !!}
{!! Assets::getJsVars() !!}
{{-- Use asset combiner to ensure all widget JS files are included --}}
{!! get_script_tags() !!}
<!-- SlimSelect: dropdown inside form so it scrolls with page (must run before selectList is used) -->
<script src="{{ asset('app/admin/assets/js/slim-select-relative-position.js') }}?v={{ time() }}"></script>

<!-- Admin confirm modal (Cancel + Delete) – replaces SweetAlert for data-request-confirm -->
<script src="{{ asset('app/admin/assets/js/admin-confirm-modal.js') }}?v={{ time() }}"></script>

<!-- Notification System - ENABLED FOR CPU TESTING -->
<script src="{{ asset('app/admin/assets/js/notifications.js') }}?v={{ time() }}"></script>
<script src="{{ asset('app/admin/assets/js/push-notifications.js') }}?v={{ time() }}"></script>

<!-- Modal Performance Fix - MUST LOAD FIRST to prevent freeze -->
<script src="{{ asset('app/admin/assets/js/modal-performance-fix.js') }}?v={{ time() }}"></script>

<!-- Fix Bootstrap Dropdown _menu null (Folders/Filter/Sort dropdowns on Media Manager) -->
<script src="{{ asset('app/admin/assets/js/fix-bootstrap-dropdown-null.js') }}?v={{ time() }}"></script>

<!-- Smooth Page Transitions -->
<script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?v={{ time() }}"></script>

<!-- Force Button Alignment - MUST run before page-specific-fixes so Save button gets size once (no vibration) -->
<script src="{{ asset('app/admin/assets/js/force-button-alignment.js') }}?v={{ time() }}"></script>

<!-- Page-specific fixes -->
<script src="{{ asset('app/admin/assets/js/page-specific-fixes.js') }}?v={{ time() }}"></script>

<!-- Fix Media Finder Inline Styles -->
<script src="{{ asset('app/admin/assets/js/fix-media-finder-inline-styles.js') }}?v={{ time() }}"></script>
<!-- Fix History Button Text Centering - Removes inline styles that prevent flexbox centering -->
<script src="{{ asset('app/admin/assets/js/fix-history-button-centering.js') }}?v={{ time() }}"></script>
<!-- Fix Notification Buttons Bottom Border - Ensures bottom border is visible -->
<script src="{{ asset('app/admin/assets/js/fix-notification-buttons-border.js') }}?v={{ time() }}"></script>
<!-- Fix Profile Dropdown Green Hover - Removes green hover effect via JavaScript -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-green.js') }}?v={{ time() }}"></script>
<!-- Fix Tab Link Colors - Force dark blue instead of green -->
<script src="{{ asset('app/admin/assets/js/fix-tab-link-colors.js') }}?v={{ time() }}"></script>
<!-- Fix Suggestion Sentences Label - Remove underline and button shadow -->
<script src="{{ asset('app/admin/assets/js/fix-suggestion-sentences-label.js') }}?v={{ time() }}"></script>
<!-- Fix Form Field Focus Colors - Remove green, use dark blue -->
<script src="{{ asset('app/admin/assets/js/fix-form-field-focus-colors.js') }}?v={{ time() }}"></script>
<!-- Fix Profile Dropdown Closed - Disables items when dropdown is closed -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-closed.js') }}?v={{ time() }}"></script>
<!-- Fix Menu-Grid Hover - Ensures Tax and Advanced buttons hover works properly -->
<script src="{{ asset('app/admin/assets/js/fix-menu-grid-hover.js') }}?v={{ time() }}"></script>
<!-- Disable tooltips on Note, History, and settings menu-grid (redundant labels) -->
<script src="{{ asset('app/admin/assets/js/fix-disable-tooltips.js') }}?v={{ time() }}"></script>

<!-- Modal Blur Fix -->
<script src="{{ asset('app/admin/assets/js/modal-blur-fix.js') }}?v={{ time() }}"></script>

<!-- Media Manager Search Icon Fix -->
<script src="{{ asset('app/admin/assets/js/media-search-icon-fix.js') }}?v={{ time() }}"></script>

<!-- Image Preview Persistence Fix -->
<script src="{{ asset('app/admin/assets/js/image-preview-persistence.js') }}?v={{ time() }}"></script>

<!-- Debug Redirects (Remove this in production) -->
<script src="{{ asset('app/admin/assets/js/debug-redirects.js') }}?v={{ time() }}"></script>

<!-- Admin Tour Enhanced System -->
<script src="{{ asset('app/admin/assets/js/introjs.min.js') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin-tour-enhanced.js') }}?v={{ time() }}"></script>

<!-- Sidebar Star Icon - DISABLED (replaced by unified shell curve) -->
<!-- <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?v={{ time() }}" defer></script> -->

<!-- Folder Creation Dropdown Card -->
<script src="{{ asset('app/admin/assets/js/folder-dropdown-card.js') }}?v={{ time() }}"></script>

<!-- Global Button Width Fix - Enforces 48x48px buttons on all pages -->
<script src="{{ asset('app/admin/assets/js/fix-button-widths-global.js') }}?v={{ time() }}"></script>

<!-- SlimSelect: close dropdown on scroll (page-wrapper), match dropdown width -->
<script src="{{ asset('app/admin/assets/js/dynamic-dropdown-height.js') }}?v={{ time() }}"></script>

<!-- Guide Tour Button Handler -->
<script>
(function() {
    'use strict';
    
    function initGuideTourButton() {
        const guideBtn = document.getElementById('guide-tour-btn');
        if (!guideBtn) return;
        
        guideBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close all open dropdowns and modals before starting the tour
            closeAllOpenDropdowns();
            
            if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                window.PayMyDineTour.startTour(true);
            } else {
                console.warn('PayMyDineTour not available yet, retrying...');
                setTimeout(function() {
                    if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                        window.PayMyDineTour.startTour(true);
                    }
                }, 300);
            }
        });
    }
    
    // Function to close all open dropdowns and panels
    function closeAllOpenDropdowns() {
        // Close all Bootstrap dropdowns
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(function(dropdown) {
            dropdown.classList.remove('show');
            
            // Also remove show class from parent dropdown
            const parentDropdown = dropdown.closest('.dropdown');
            if (parentDropdown) {
                const toggle = parentDropdown.querySelector('[data-bs-toggle="dropdown"], [data-toggle="dropdown"]');
                if (toggle) {
                    toggle.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
        
        // Close notification panel specifically
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel) {
            notificationPanel.classList.remove('show');
        }
        
        // Close any open modals
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(function(modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        
        // Remove modal backdrop if exists
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function(backdrop) {
            backdrop.remove();
        });
        
        // Reset body styles that might have been set by modals
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGuideTourButton);
    } else {
        initGuideTourButton();
    }
    
    // Also try after a delay to ensure everything is loaded
    setTimeout(initGuideTourButton, 1000);
})();
</script>

</body>
</html>
