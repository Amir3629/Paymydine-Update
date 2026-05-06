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






<!-- ===== ADMIN HEADER FIRST PAINT STABILIZER ===== -->


<!-- ===== END ADMIN HEADER FIRST PAINT STABILIZER ===== -->


<style>

</style>


<style>

</style>


<style>

</style>














<style>
/* ===== PC AVATAR LAST GAP EXACT FIX ===== */
@media (min-width: 768px) {

  /* ریشه هدر */
  .navbar.navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 32px !important;
  }

  /* ul اصلی */
  .navbar.navbar-right > ul#menu-mainmenu,
  .navbar.navbar-right > ul.navbar-nav {
    display: flex !important;
    align-items: center !important;
    gap: 32px !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
  }

  /* li ها هیچ spacing اضافه نداشته باشند */
  .navbar.navbar-right > ul#menu-mainmenu > li,
  .navbar.navbar-right > ul.navbar-nav > li {
    margin: 0 !important;
    padding: 0 !important;
    flex: 0 0 auto !important;
  }

  /* wrapper های tooltip هم spacing خراب نکنند */
  .navbar.navbar-right .media-toolbar-tooltip-wrap {
    display: contents !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* همه لینک‌ها و دکمه‌های واقعی */
  .navbar.navbar-right #guide-tour-btn,
  .navbar.navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > span > a.nav-link {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* فقط آیتم آخر: هر spacing اضافه را صفر کن */
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child,
  .navbar.navbar-right > ul.navbar-nav > li:last-child,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child > a,
  .navbar.navbar-right > ul.navbar-nav > li:last-child > a,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child .nav-link,
  .navbar.navbar-right > ul.navbar-nav > li:last-child .nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child img,
  .navbar.navbar-right > ul.navbar-nav > li:last-child img {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  /* نوتیفیکیشن هم spacing داخلی اضافه نداشته باشد */
  .navbar.navbar-right #notif-root,
  .navbar.navbar-right li#notif-root,
  .navbar.navbar-right #notif-root > a,
  .navbar.navbar-right #notif-root > span,
  .navbar.navbar-right #notif-root > span > a {
    margin: 0 !important;
    padding: 0 !important;
  }
}
/* ===== END PC AVATAR LAST GAP EXACT FIX ===== */
</style>





<style>
/* ===== PC ONLY LAST GAP SURGICAL FIX ===== */
@media (min-width: 768px) {

  /* spacing پایه برای PC */
  .navbar.navbar-right,
  .navbar .navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 32px !important;
  }

  .navbar.navbar-right > ul#menu-mainmenu,
  .navbar.navbar-right > ul.navbar-nav,
  .navbar .navbar-right > ul#menu-mainmenu,
  .navbar .navbar-right > ul.navbar-nav {
    display: flex !important;
    align-items: center !important;
    gap: 32px !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
  }

  .navbar.navbar-right > ul#menu-mainmenu > li,
  .navbar.navbar-right > ul.navbar-nav > li,
  .navbar .navbar-right > ul#menu-mainmenu > li,
  .navbar .navbar-right > ul.navbar-nav > li {
    margin: 0 !important;
    padding: 0 !important;
    flex: 0 0 auto !important;
  }

  /* لینک‌های آیکن‌ها */
  .navbar.navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > span > a.nav-link,
  .navbar .navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar .navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar .navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar .navbar-right > ul.navbar-nav > li > span > a.nav-link {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    min-height: 42px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  /* مشکل واقعی: فقط آیتم بلافاصله بعد از notif-root */
  #menu-mainmenu > li#notif-root + li,
  .navbar-nav > li#notif-root + li {
    margin-left: -8px !important;
    padding-left: 0 !important;
  }

  #menu-mainmenu > li#notif-root + li > a.nav-link,
  #menu-mainmenu > li#notif-root + li > span > a.nav-link,
  .navbar-nav > li#notif-root + li > a.nav-link,
  .navbar-nav > li#notif-root + li > span > a.nav-link {
    margin-left: 0 !important;
    padding-left: 0 !important;
  }

  /* اگر avatar آخرین آیتم visible باشد */
  #menu-mainmenu > li:last-child,
  .navbar-nav > li:last-child {
    margin-left: -8px !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  #menu-mainmenu > li:last-child > a.nav-link,
  #menu-mainmenu > li:last-child > span > a.nav-link,
  .navbar-nav > li:last-child > a.nav-link,
  .navbar-nav > li:last-child > span > a.nav-link {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  /* عکس آواتار هم spacing اضافه نسازد */
  .navbar-profile-avatar,
  .navbar .navbar-profile-avatar {
    margin: 0 !important;
    display: block !important;
  }
}
/* ===== END PC ONLY LAST GAP SURGICAL FIX ===== */
</style>


<style>

</style>


<style>

</style>


<style>

</style>


<style>

</style>




<style>

</style>











<style id="mobile-header-one-final-fix">
/* ===== MOBILE HEADER ONE FINAL FIX ===== */
@media (max-width: 767.98px) {

  /* root */
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    width: 100% !important;
    min-height: 64px !important;
    padding: 0 8px !important;
    margin: 0 !important;
    gap: 0 !important;
    box-sizing: border-box !important;
    overflow: visible !important;
  }

  /* hamburger */
  .navbar-top .navbar-right > .navbar-toggler,
  .navbar.navbar-right > .navbar-toggler {
    flex: 0 0 52px !important;
    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;
    height: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    transform: none !important;
  }

  /* the 4 right icons area */
  .navbar-top .navbar-right > #menu-mainmenu,
  .navbar.navbar-right > #menu-mainmenu {
    display: flex !important;
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    list-style: none !important;
    align-items: center !important;
    justify-content: space-evenly !important;
    gap: 0 !important;
  }

  /* neutralize old per-item hacks */
  .navbar-top .navbar-right > #menu-mainmenu > li,
  .navbar.navbar-right > #menu-mainmenu > li,
  .navbar-top .navbar-nav > .nav-item,
  .navbar-top .navbar-nav > .nav-item:not(:last-child),
  .navbar-top .navbar-nav > .nav-item:last-child,
  .navbar-top #notif-root,
  .navbar-top li#notif-root,
  .navbar-top #menu-mainmenu > li#menuitem-preview,
  .navbar-top .mobile-profile-slot,
  .navbar-top .mobile-guide-slot {
    flex: 0 1 auto !important;
    margin: 0 !important;
    padding: 0 !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    transform: none !important;
  }

  /* kill the bad "push last item to far right" rule */
  .navbar-top .navbar-nav > .nav-item:last-child {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
  }

  /* hide settings on mobile */
  .navbar-top #menu-mainmenu > li.mobile-hidden-settings,
  .navbar.navbar-right #menu-mainmenu > li.mobile-hidden-settings {
    display: none !important;
  }

  /* equal icon hit area */
  .navbar-top #menu-mainmenu .nav-link,
  .navbar-top #menu-mainmenu .dropdown-toggle,
  .navbar-top #menu-mainmenu .navbar-tour-btn,
  .navbar-top #menu-mainmenu .mobile-guide-slot > button,
  .navbar.navbar-right #menu-mainmenu .nav-link,
  .navbar.navbar-right #menu-mainmenu .dropdown-toggle,
  .navbar.navbar-right #menu-mainmenu .navbar-tour-btn,
  .navbar.navbar-right #menu-mainmenu .mobile-guide-slot > button {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .navbar-top .navbar-profile-avatar,
  .navbar.navbar-right .navbar-profile-avatar {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    margin: 0 auto !important;
    display: block !important;
  }
}
/* ===== END MOBILE HEADER ONE FINAL FIX ===== */
</style>


<style id="mobile-header-first-paint-guard">
/* ===== MOBILE HEADER FIRST PAINT GUARD ===== */
@media (max-width: 767.98px) {
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    visibility: hidden !important;
  }

  html.mobile-header-ready .navbar-top .navbar-right,
  html.mobile-header-ready .navbar.navbar-right {
    visibility: visible !important;
  }
}
/* ===== END MOBILE HEADER FIRST PAINT GUARD ===== */
</style>

<script>
/* ===== MOBILE HEADER EARLY FIRST PAINT FIX ===== */
(function () {
  function ensureGuideInsideMenu(menu, guideBtn) {
    var guideLi = guideBtn ? guideBtn.closest('li') : null;

    if (!guideBtn) return null;

    if (!guideLi || guideLi.parentNode !== menu) {
      guideLi = document.createElement('li');
      guideLi.className = 'nav-item mobile-guide-slot';
      guideLi.appendChild(guideBtn);
      menu.appendChild(guideLi);
    }

    return guideLi;
  }

  function fixMobileHeaderEarly() {
    if (window.innerWidth > 767) {
      document.documentElement.classList.add('mobile-header-ready');
      return;
    }

    var menu = document.getElementById('menu-mainmenu');
    var preview = document.getElementById('menuitem-preview');
    var notif = document.getElementById('notif-root');
    var guideBtn = document.getElementById('guide-tour-btn');

    if (!menu || !preview || !notif || !guideBtn) return;

    var items = Array.prototype.slice.call(menu.children || []);
    var profileLi = items.find(function (li) {
      return li && li.querySelector && li.querySelector('.navbar-profile-avatar');
    });

    if (!profileLi) return;

    var guideLi = ensureGuideInsideMenu(menu, guideBtn);
    if (!guideLi) return;

    Array.prototype.slice.call(menu.children || []).forEach(function (li) {
      var isSettings = !!(li && li.querySelector && li.querySelector('a[aria-label="Settings"]'));
      var keep = li === preview || li === profileLi || li === notif || li === guideLi;

      if (isSettings || !keep) {
        li.classList.add('mobile-hidden-force');
        li.style.setProperty('display', 'none', 'important');
      } else {
        li.classList.remove('mobile-hidden-force');
        li.style.removeProperty('display');
      }
    });

    menu.innerHTML = '';
    menu.appendChild(preview);
    menu.appendChild(profileLi);
    menu.appendChild(notif);
    menu.appendChild(guideLi);

    document.documentElement.classList.add('mobile-header-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixMobileHeaderEarly, { once: true });
  } else {
    fixMobileHeaderEarly();
  }

  window.addEventListener('resize', fixMobileHeaderEarly, { passive: true });
})();
/* ===== END MOBILE HEADER EARLY FIRST PAINT FIX ===== */
</script>


<style>
/* ===== MOBILE HEADER HIDE UNTIL STABLE ===== */
@media (max-width: 767.98px) {
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    opacity: 0 !important;
    visibility: hidden !important;
    transition: none !important;
  }

  html.mobile-header-stable .navbar-top .navbar-right,
  html.mobile-header-stable .navbar.navbar-right {
    opacity: 1 !important;
    visibility: visible !important;
  }
}
/* ===== END MOBILE HEADER HIDE UNTIL STABLE ===== */
</style>

<script>
/* ===== MOBILE HEADER HIDE UNTIL STABLE ===== */
(function () {
  function revealWhenStable() {
    if (window.innerWidth > 767) {
      document.documentElement.classList.add('mobile-header-stable');
      return;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add('mobile-header-stable');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealWhenStable, { once: true });
  } else {
    revealWhenStable();
  }

  window.addEventListener('load', revealWhenStable, { once: true });
})();
 /* ===== END MOBILE HEADER HIDE UNTIL STABLE ===== */
</script>

    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-mediamanager-autofix.css') }}?v={{ time() }}">
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




<!-- PMD EARLY SORTABLE DROPZONE START -->
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/Sortable.min.js') }}?v={{ time() }}"></script>
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/dropzone.min.js') }}?v={{ time() }}"></script>
<!-- PMD EARLY SORTABLE DROPZONE END -->

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














<script id="pmd-wero-global-handler">
(function () {
  if (window.__PMD_WERO_HANDLER_INSTALLED__) return;
  window.__PMD_WERO_HANDLER_INSTALLED__ = true;

  function showWeroMessage(msg) {
    var text = msg || 'Wero is currently unavailable. Please choose another payment method.';
    try {
      if (window.Toastify) {
        Toastify({ text: text, duration: 5000, close: true, gravity: 'top', position: 'right' }).showToast();
        return;
      }
    } catch (e) {}
    try {
      if (window.Swal && typeof window.Swal.fire === 'function') {
        window.Swal.fire({ icon: 'warning', title: 'Payment unavailable', text: text });
        return;
      }
    } catch (e) {}
    alert(text);
  }

  function disableBusyState() {
    try {
      document.querySelectorAll('[data-payment-submit],[data-checkout-submit],button[type="submit"]').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('is-loading', 'loading', 'disabled');
      });
    } catch (e) {}
  }

  function hideWeroOptions() {
    try {
      document.querySelectorAll('[data-payment-method="wero"],[value="wero"],.payment-method-wero,.wero-option').forEach(function(el) {
        var row = el.closest('label,.payment-method,.payment-option,.form-check,.list-group-item') || el;
        if (row) row.style.opacity = '0.5';
      });
    } catch (e) {}
  }

  async function inspectResponse(response) {
    try {
      var url = response && response.url ? response.url : '';
      if (!url || url.indexOf('/payments/worldline/wero/create-session') === -1) return response;

      if (response.status === 422 || response.status === 503) {
        var clone = response.clone();
        var data = await clone.json().catch(function(){ return {}; });
        var msg = data.display_message || data.error || 'Wero is currently unavailable. Please choose another payment method.';
        showWeroMessage(msg);
        disableBusyState();
        hideWeroOptions();
      }
    } catch (e) {}
    return response;
  }

  if (window.fetch) {
    var _fetch = window.fetch;
    window.fetch = function() {
      return _fetch.apply(this, arguments).then(inspectResponse);
    };
  }

  if (window.XMLHttpRequest) {
    var OriginalXHR = window.XMLHttpRequest;
    function WrappedXHR() {
      var xhr = new OriginalXHR();
      var _open = xhr.open;
      xhr.open = function(method, url) {
        xhr.__pmd_url = url || '';
        return _open.apply(xhr, arguments);
      };
      xhr.addEventListener('load', function() {
        try {
          if ((xhr.status === 422 || xhr.status === 503) &&
              xhr.__pmd_url &&
              xhr.__pmd_url.indexOf('/payments/worldline/wero/create-session') !== -1) {
            var data = {};
            try { data = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
            var msg = data.display_message || data.error || 'Wero is currently unavailable. Please choose another payment method.';
            showWeroMessage(msg);
            disableBusyState();
            hideWeroOptions();
          }
        } catch (e) {}
      });
      return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;
  }
})();
</script>

    <script src="{{ asset('app/admin/assets/js/pmd-mediafinder-autofix.js') }}?v={{ time() }}"></script>
</body>
</html>
