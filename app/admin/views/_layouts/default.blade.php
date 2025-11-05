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
    {!! get_style_tags() !!}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/push-notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/header-dropdowns.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-transitions.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/custom-fixes.css') }}?v={{ time() }}">
    <!-- Admin Tour Enhanced Styles -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/introjs.min.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-tour-enhanced.css') }}">
    <style>
        /* FORCE dropdown alignment - override Popper.js positioning */
        .navbar-top .dropdown-menu,
        .navbar-top .nav-item .dropdown-menu,
        #notification-panel {
            right: 0 !important;
            left: auto !important;
        }
        
        /* SIMPLE SCROLLBAR ARROW HIDING */
        *::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
        }
        
        *::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
        }
        
        * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        
        /* Target calendar specifically */
        .daterangepicker,
        .daterangepicker *,
        .daterangepicker .drp-calendar,
        .daterangepicker .calendar-table,
        .daterangepicker .ranges {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        
        .daterangepicker::-webkit-scrollbar,
        .daterangepicker *::-webkit-scrollbar,
        .daterangepicker .drp-calendar::-webkit-scrollbar,
        .daterangepicker .calendar-table::-webkit-scrollbar,
        .daterangepicker .ranges::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
        }
        
        .daterangepicker::-webkit-scrollbar-button,
        .daterangepicker *::-webkit-scrollbar-button,
        .daterangepicker .drp-calendar::-webkit-scrollbar-button,
        .daterangepicker .calendar-table::-webkit-scrollbar-button,
        .daterangepicker .ranges::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        
        /* HIDE THE WHITE ARROW - IT'S A ::before PSEUDO-ELEMENT */
        .daterangepicker::before,
        .daterangepicker::after {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            content: none !important;
        }
        
        /* FIX BUTTON TEXT ALIGNMENT */
        .daterangepicker .cancelBtn,
        .daterangepicker .applyBtn {
            display: inline-block !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            line-height: 1 !important;
            vertical-align: middle !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 99999 !important;
        }
        
        /* FIX RANGE LIST TEXT ALIGNMENT */
        .daterangepicker .ranges li {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            line-height: 1 !important;
            vertical-align: middle !important;
        }
        
        /* AMAZING CALENDAR OPENING ANIMATIONS */
        .daterangepicker {
            transform: scale(0.8) translateY(-20px) !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            transform-origin: top center !important;
            backdrop-filter: blur(0px) !important;
            box-shadow: 0 0 0 rgba(0, 0, 0, 0) !important;
        }
        
        .daterangepicker.show-calendar,
        .daterangepicker.positioned {
            transform: scale(1) translateY(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
            backdrop-filter: blur(8px) !important;
            box-shadow: 
                0 25px 50px rgba(0, 0, 0, 0.15),
                0 10px 20px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.05) !important;
        }
        
        /* BACKDROP EFFECT */
        .daterangepicker::before {
            content: '' !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.1) !important;
            backdrop-filter: blur(4px) !important;
            z-index: -1 !important;
            opacity: 0 !important;
            transition: opacity 0.4s ease !important;
        }
        
        .daterangepicker.show-calendar::before,
        .daterangepicker.positioned::before {
            opacity: 1 !important;
        }
        
        /* ENHANCED SHADOW EFFECT */
        .daterangepicker.show-calendar,
        .daterangepicker.positioned {
            box-shadow: 
                0 25px 50px rgba(0, 0, 0, 0.15),
                0 10px 20px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.05) !important;
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
    document.addEventListener("DOMContentLoaded", function () {
                    let imgElementDash = document.querySelector("#mediafinder-formloaderlogo-loader-logo img");
                    let logoElementDash = document.querySelector(".progress-indicator img");
                    if (imgElementDash && logoElementDash) {
                        let imagePathDash = imgElement.getAttribute("src");
                        logoElement.setAttribute("src", imagePathDash);
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
{!! Assets::getJsVars() !!}
{!! get_script_tags() !!}

<!-- Notification System -->
<script src="{{ asset('app/admin/assets/js/notifications.js') }}"></script>
<script src="{{ asset('app/admin/assets/js/push-notifications.js') }}"></script>

<!-- Smooth Page Transitions -->
<script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?v={{ time() }}"></script>

<!-- Page-specific fixes -->
<script src="{{ asset('app/admin/assets/js/page-specific-fixes.js') }}?v={{ time() }}"></script>

<!-- Force Button Alignment -->
<script src="{{ asset('app/admin/assets/js/force-button-alignment.js') }}?v={{ time() }}"></script>

<!-- Modal Blur Fix -->
<script src="{{ asset('app/admin/assets/js/modal-blur-fix.js') }}?v={{ time() }}"></script>

<!-- Debug Redirects (Remove this in production) -->
<script src="{{ asset('app/admin/assets/js/debug-redirects.js') }}?v={{ time() }}"></script>

<!-- Admin Tour Enhanced System -->
<script src="{{ asset('app/admin/assets/js/introjs.min.js') }}"></script>
<script src="{{ asset('app/admin/assets/js/admin-tour-enhanced.js') }}?v={{ time() }}"></script>

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
            
            // Wait a bit to ensure tour system is loaded
            setTimeout(function() {
                if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                    // Start tour for current page - force start (bypass skip/completion checks)
                    window.PayMyDineTour.startTour(true);
                } else {
                    console.warn('PayMyDineTour not available yet, retrying...');
                    setTimeout(function() {
                        if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                            window.PayMyDineTour.startTour(true);
                        }
                    }, 500);
                }
            }, 100);
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