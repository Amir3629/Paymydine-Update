<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <?php echo get_metas(); ?>

    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <?php echo get_favicon(); ?>

    <?php if(empty($pageTitle = Template::getTitle())): ?>
        <title><?php echo e(setting('site_name')); ?></title>
    <?php else: ?>
        <title><?php echo e($pageTitle); ?><?php echo app('translator')->get('admin::lang.site_title_separator'); ?><?php echo e(setting('site_name')); ?></title>
    <?php endif; ?>
    
    <?php echo get_style_tags(); ?>

    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/notifications.css')); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/push-notifications.css')); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/header-dropdowns.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Remove Green Edges from Dropdowns -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/remove-green-edges.css')); ?>?v=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/smooth-transitions.css')); ?>?v=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/custom-fixes.css')); ?>?v=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/calendar.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Modern Admin Settings Styling -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/admin-settings-modern.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- SweetAlert2 – match admin modal/card design -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/sweetalert2-modal-style.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Admin confirm modal – rounder card, button spacing, Cancel style -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/admin-confirm-modal.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Unified modal design – round corners, nice buttons, consistent styling for all modals -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/admin-modals-unified.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Rounded corners for notification panel, settings menu, profile dropdown, toast -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/admin-cards-rounded.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Admin Tour Enhanced Styles -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/introjs.min.css')); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/admin-tour-enhanced.css')); ?>">
    <!-- Blue Buttons Override - Replace all green buttons with login button style -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/blue-buttons-override.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Smooth Corner - Replace Star Icon with Rounded Corner -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/smooth-corner-replace-star.css')); ?>?v=<?php echo e(time()); ?>">
    
    <!-- Fix Menu-Grid Hover - Only icon scale, no green flashing -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-menu-grid-hover.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Footer Button - Remove green hover -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-footer-button-no-green.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Toggle Switches - Restore iOS-style appearance -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-toggle-switches.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Notification Header Border - Make it straight and full width -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-notification-header-border.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Notification Header Buttons - Fix z-index, spacing, padding, borders -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-notification-header-buttons.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Profile Dropdown - Remove green hover effects and green text-muted color -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-profile-dropdown-green.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Profile Dropdown Hover - Remove inline styles blocking hover effect -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-profile-dropdown-hover.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Profile Dropdown Closed - Disable items when dropdown is closed -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-profile-dropdown-closed.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Fix Green Buttons and Text - Change btn-default, btn-outline-default, and text-muted from green to dark blue/gray -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/fix-green-buttons-and-text.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Modern Media Finder - Elegant image uploader redesign -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/modern-media-finder.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Media Finder Widget CSS - Required for image uploader fields -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/formwidgets/mediafinder/assets/css/mediafinder.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Date range picker: load last so overrides (bigger card, buttons, ranges) win over .btn-sm etc -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/daterangepicker-arrows.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- No green toolbar buttons - MUST load last so toolbar Save/Back stay blue -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/no-green-toolbar-buttons.css')); ?>?v=<?php echo e(time()); ?>">
    <!-- Dropdown fields same size as text inputs - load after other form styles -->
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/dropdown-field-same-size.css')); ?>?v=<?php echo e(time()); ?>">
    
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
<body class="page <?php echo e($this->bodyClass); ?>">
<?php if(AdminAuth::isLogged()): ?>
    <?php echo $this->makePartial('top_nav'); ?>

    <?php echo AdminMenu::render('side_nav'); ?>

<?php endif; ?>

<div class="page-wrapper">
    <div class="page-content">
        <?php echo Template::getBlock('body'); ?>

    </div>
</div>

<div id="notification">
    <?php echo $this->makePartial('flash'); ?>

</div>
<?php if(AdminAuth::isLogged()): ?>
    <?php echo $this->makePartial('set_status_form'); ?>

<?php endif; ?>
<?php echo $this->makePartial('confirm_modal'); ?>

<?php echo Assets::getJsVars(); ?>


<?php echo get_script_tags(); ?>

<!-- SlimSelect: dropdown inside form so it scrolls with page (must run before selectList is used) -->
<script src="<?php echo e(asset('app/admin/assets/js/slim-select-relative-position.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Admin confirm modal (Cancel + Delete) – replaces SweetAlert for data-request-confirm -->
<script src="<?php echo e(asset('app/admin/assets/js/admin-confirm-modal.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Notification System - ENABLED FOR CPU TESTING -->
<script src="<?php echo e(asset('app/admin/assets/js/notifications.js')); ?>?v=<?php echo e(time()); ?>"></script>
<script src="<?php echo e(asset('app/admin/assets/js/push-notifications.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Modal Performance Fix - MUST LOAD FIRST to prevent freeze -->
<script src="<?php echo e(asset('app/admin/assets/js/modal-performance-fix.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Fix Bootstrap Dropdown _menu null (Folders/Filter/Sort dropdowns on Media Manager) -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-bootstrap-dropdown-null.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Smooth Page Transitions -->
<script src="<?php echo e(asset('app/admin/assets/js/smooth-transitions.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Force Button Alignment - MUST run before page-specific-fixes so Save button gets size once (no vibration) -->
<script src="<?php echo e(asset('app/admin/assets/js/force-button-alignment.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Page-specific fixes -->
<script src="<?php echo e(asset('app/admin/assets/js/page-specific-fixes.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Fix Media Finder Inline Styles -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-media-finder-inline-styles.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix History Button Text Centering - Removes inline styles that prevent flexbox centering -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-history-button-centering.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Notification Buttons Bottom Border - Ensures bottom border is visible -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-notification-buttons-border.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Profile Dropdown Green Hover - Removes green hover effect via JavaScript -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-profile-dropdown-green.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Tab Link Colors - Force dark blue instead of green -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-tab-link-colors.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Suggestion Sentences Label - Remove underline and button shadow -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-suggestion-sentences-label.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Form Field Focus Colors - Remove green, use dark blue -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-form-field-focus-colors.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Profile Dropdown Closed - Disables items when dropdown is closed -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-profile-dropdown-closed.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Fix Menu-Grid Hover - Ensures Tax and Advanced buttons hover works properly -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-menu-grid-hover.js')); ?>?v=<?php echo e(time()); ?>"></script>
<!-- Disable tooltips on Note, History, and settings menu-grid (redundant labels) -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-disable-tooltips.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Modal Blur Fix -->
<script src="<?php echo e(asset('app/admin/assets/js/modal-blur-fix.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Media Manager Search Icon Fix -->
<script src="<?php echo e(asset('app/admin/assets/js/media-search-icon-fix.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Image Preview Persistence Fix -->
<script src="<?php echo e(asset('app/admin/assets/js/image-preview-persistence.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Debug Redirects (Remove this in production) -->
<script src="<?php echo e(asset('app/admin/assets/js/debug-redirects.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Admin Tour Enhanced System -->
<script src="<?php echo e(asset('app/admin/assets/js/introjs.min.js')); ?>"></script>
<script src="<?php echo e(asset('app/admin/assets/js/admin-tour-enhanced.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Sidebar Star Icon - DISABLED (replaced by unified shell curve) -->
<!-- <script src="<?php echo e(asset('app/admin/assets/js/sidebar-star-icon.js')); ?>?v=<?php echo e(time()); ?>" defer></script> -->

<!-- Force Blue Buttons Override -->
<script src="<?php echo e(asset('app/admin/assets/js/force-blue-buttons.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Folder Creation Dropdown Card -->
<script src="<?php echo e(asset('app/admin/assets/js/folder-dropdown-card.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- Global Button Width Fix - Enforces 48x48px buttons on all pages -->
<script src="<?php echo e(asset('app/admin/assets/js/fix-button-widths-global.js')); ?>?v=<?php echo e(time()); ?>"></script>

<!-- SlimSelect: close dropdown on scroll (page-wrapper), match dropdown width -->
<script src="<?php echo e(asset('app/admin/assets/js/dynamic-dropdown-height.js')); ?>?v=<?php echo e(time()); ?>"></script>

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

<!-- Decorative curve replacing star icon -->
<div class="sidebar-curve-fix"></div>

</body>
</html>
<?php /**PATH /var/www/paymydine/app/admin/views/_layouts/default.blade.php ENDPATH**/ ?>