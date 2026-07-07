<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>

<!-- PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_START -->
<script>
(function () {
  try {
    var p = String(location.pathname || '').replace(/\/+$/, '');
    if (p === '/admin/dashboard' || p.indexOf('/admin/dashboard/') === 0) {
      var h = document.documentElement;
      h.classList.add(
        'pmd-owner-v69-no-loader',
        'pmd-admin-toolbar-ready',
        'pmd-role-owner-v30',
        'pmd-role-owner-v31',
        'pmd-v21-role-owner',
        'pmd-sidebar-icons-only'
      );
      window.PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST = true;
    }
  } catch (e) {}
})();
</script>
<style id="pmd-owner-dashboard-v69-no-loader-critical">
/*
  V69: no loader, no hide.
  Lock final geometry before dashboard JS paints cards.
*/

html.pmd-owner-v69-no-loader,
html.pmd-owner-v69-no-loader * {
  box-sizing: border-box !important;
}

html.pmd-owner-v69-no-loader .content,
html.pmd-owner-v69-no-loader .main-container,
html.pmd-owner-v69-no-loader .page-content,
html.pmd-owner-v69-no-loader [class*="pmd-v15"],
html.pmd-owner-v69-no-loader [class*="pmd-v19"],
html.pmd-owner-v69-no-loader [class*="pmd-v21"],
html.pmd-owner-v69-no-loader [class*="pmd-v36"],
html.pmd-owner-v69-no-loader .pmd-owner-floor-v60 {
  transition: none !important;
  animation: none !important;
  scroll-behavior: auto !important;
}

html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 18px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 118px !important;
}

html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 18px !important;
  align-items: stretch !important;
  width: 100% !important;
  max-width: 100% !important;
}

html.pmd-owner-v69-no-loader .pmd-owner-floor-v60,
html.pmd-owner-v69-no-loader .pmd-owner-floor-v60.pmd-v62-after-kpi {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 213px !important;
}

html.pmd-owner-v69-no-loader .pmd-v15-card--alerts,
html.pmd-owner-v69-no-loader .pmd-v15-card--timeline,
html.pmd-owner-v69-no-loader .pmd-v19-area-alerts,
html.pmd-owner-v69-no-loader .pmd-v19-area-timeline,
html.pmd-owner-v69-no-loader .pmd-v36-span-2 {
  grid-column: span 2 !important;
  min-height: 396px !important;
}

@media (max-width: 1180px) {
  html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  html.pmd-owner-v69-no-loader .pmd-v15-card--alerts,
  html.pmd-owner-v69-no-loader .pmd-v15-card--timeline,
  html.pmd-owner-v69-no-loader .pmd-v19-area-alerts,
  html.pmd-owner-v69-no-loader .pmd-v19-area-timeline,
  html.pmd-owner-v69-no-loader .pmd-v36-span-2 {
    grid-column: 1 / -1 !important;
  }
}

@media (max-width: 720px) {
  html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
<!-- PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_END -->

<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_EARLY_START -->
<script>
(function(){
  try {
    document.documentElement.classList.remove(
      'pmd-ui-fouc-shield-v58',
      'pmd-dashboard-jank-lock-v59',
      'pmd-shell-loading-v60',
      'pmd-shell-ready-v60',
      'pmd-sidebar-logo-locking-v60',
      'pmd-sidebar-logo-ready-v60',
      'pmd-sidebar-logo-locking-v62',
      'pmd-sidebar-logo-ready-v62'
    );
    if (document.body) document.body.classList.remove('pmd-page-leaving-v60');
  } catch(e) {}
})();
</script>
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_EARLY_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_PRELOAD_START -->
<link rel="prefetch" as="image" href="{{ asset('app/admin/assets/images/pmd-logo-final.png') }}">
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<link rel="prefetch" as="image" href="{{ asset('app/admin/assets/images/pmd-logo-final.png') }}">
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_PRELOAD_END -->
@php
    $pmdIsNativeMediaContext = request()->is('admin/settings*') || request()->is('admin/media_manager*');
@endphp

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
    @unless($pmdIsNativeMediaContext)
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/modern-media-finder.css') }}?v={{ time() }}">
    @endunless
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
        body:not(.pmd-admin-theme-v1) .toolbar-action,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container {
            --bs-primary-rgb: 54, 74, 99 !important;
            --bs-btn-focus-shadow-rgb: 54, 74, 99 !important;
        }
        body:not(.pmd-admin-theme-v1) .toolbar-action .btn-primary,
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .btn-primary,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container .btn-primary,
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .btn-group .btn-primary {
            background: linear-gradient(135deg, #1f2b3a 0%, #364a63 100%) !important;
            background-color: #364a63 !important;
            border-color: #364a63 !important;
            box-shadow: 0 4px 15px rgba(54, 74, 99, 0.35) !important;
        }
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .progress-indicator,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container .progress-indicator {
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
    max-width: 190px !important;
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

    @unless($pmdIsNativeMediaContext)
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-mediamanager-autofix.css') }}?v={{ time() }}">
    @endunless
    {{-- Final admin toolbar button override: keep after legacy/admin/page CSS because older files override toolbar button sizing and colors. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin/components/toolbar-buttons.css') }}?v={{ time() }}">

<!-- PMD_DASHBOARD_LOGO_SIZE_FIX_START -->
<style id="pmd-dashboard-logo-size-fix">
    /* Keep admin/dashboard logos inside the header frame */
    .navbar-top,
    .navbar-fixed-top {
        overflow: visible !important;
    }

    .navbar-top .navbar-brand,
    .navbar-fixed-top .navbar-brand,
    .navbar-top .navbar-brand a,
    .navbar-fixed-top .navbar-brand a {
        display: flex !important;
        align-items: center !important;
        min-height: 56px !important;
        max-height: 48px !important;
        overflow: hidden !important;
    }

    .navbar-top .navbar-brand img,
    .navbar-fixed-top .navbar-brand img,
    .navbar-top img.dashboard-logo,
    .navbar-fixed-top img.dashboard-logo,
    .navbar-top .dashboard-logo img,
    .navbar-fixed-top .dashboard-logo img,
    .navbar-top img[src*="/assets/media/"]:not(.navbar-profile-avatar):not(.rounded-circle),
    .navbar-fixed-top img[src*="/assets/media/"]:not(.navbar-profile-avatar):not(.rounded-circle) {
        max-height: 48px !important;
        max-width: 190px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        object-position: center center !important;
        display: block !important;
    }

    /* Settings page media previews should never explode layout */
    body[class*="settings"] img[src*="/assets/media/"],
    .page-content img[src*="/assets/media/uploads/"],
    .form-widget img[src*="/assets/media/uploads/"],
    .field-mediafinder img,
    [data-control="mediafinder"] img {
        max-width: 190px !important;
        max-height: 48px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
    }

    /* But do not shrink table-map background because it is CSS background, not img */
</style>
<!-- PMD_DASHBOARD_LOGO_SIZE_FIX_END -->

<style id="pmd-force-dashboard-logo-right-style">

/* PMD_FORCE_DASHBOARD_LOGO_RIGHT_START */
.navbar-top .navbar-brand a.logo,
.navbar-fixed-top .navbar-brand a.logo {
    margin-left: 44px !important;
    transform: translateX(0) !important;
    display: inline-flex !important;
    align-items: center !important;
}

.navbar-top .navbar-brand a.logo img.pmd-dashboard-logo-img,
.navbar-fixed-top .navbar-brand a.logo img.pmd-dashboard-logo-img {
    max-height: 48px !important;
    max-width: 190px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
}
/* PMD_FORCE_DASHBOARD_LOGO_RIGHT_END */

</style>
<style id="pmd-media-manager-preview-toolbar-fix">
/* PMD_MEDIA_MANAGER_PREVIEW_TOOLBAR_FIX_START */
/* Fix broken large square action buttons in Media Manager right preview sidebar.
   Scoped only to native media manager preview toolbar. */
body .media-manager .media-sidebar .sidebar-preview-toolbar {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 8px 0 10px 0 !important;
    margin: 0 !important;
    width: 100% !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar .btn-group,
body .media-manager .media-sidebar .sidebar-preview-toolbar .btn-group-sm {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 auto !important;
    box-shadow: none !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar .media-toolbar-tooltip-wrap {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 auto !important;
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 34px !important;

    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    max-width: 190px !important;
    max-height: 48px !important;

    padding: 0 !important;
    margin: 0 !important;
    border-radius: 9px !important;

    line-height: 1 !important;
    font-size: 14px !important;
    box-shadow: none !important;
    transform: none !important;
    position: relative !important;
    inset: auto !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn i {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 15px !important;
    line-height: 1 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-default {
    background: #fff !important;
    border: 1px solid #dbe3f0 !important;
    color: #334155 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-default:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-danger {
    background: #fff !important;
    border: 1px solid #dc3545 !important;
    color: #dc3545 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-danger:hover {
    background: #fff5f6 !important;
    border-color: #dc3545 !important;
    color: #dc3545 !important;
}
/* PMD_MEDIA_MANAGER_PREVIEW_TOOLBAR_FIX_END */
</style>
    <!-- PayMyDine Admin Theme v1 - centralized final general visual layer (intentionally last CSS include) -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-theme-v1.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-sidebar-clean-v4.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-svg-mask-icons.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-ref-icons.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-active-state-fix.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-parent-open-v5.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-button-size-v6.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-system-lock-v7.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-column-flow-v8.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-submenu-active-v9.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-child-icons-v10.css') }}?v={{ time() }}">
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-modern-v1.css') }}?v={{ time() }}"> --}}

    {{-- PMD all-pages toolbar guard: hide only legacy buttons, never the header/proxy containers --}}
    <script>
        (function () {
            document.documentElement.classList.add('pmd-admin-toolbar-preboot');
            window.setTimeout(function () {
                document.documentElement.classList.remove('pmd-admin-toolbar-preboot');
                document.documentElement.classList.add('pmd-admin-toolbar-ready');
            }, 1200);
        })();
    </script>
    <style id="pmd-toolbar-all-pages-no-flash-guard">
        /*
          Important:
          Do NOT hide the whole toolbar container.
          Hide only old direct buttons/groups, so PMD proxy/header buttons can appear instantly.
        */
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1
        :is(.toolbar-action, .progress-indicator-container, .form-toolbar, .control-toolbar, .page-actions, .page-title-section .pull-right, .list-toolbar, .toolbar.btn-toolbar, .btn-toolbar)
        > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1
        :is(.toolbar-action, .progress-indicator-container, .form-toolbar, .control-toolbar, .page-actions, .page-title-section .pull-right, .list-toolbar, .toolbar.btn-toolbar, .btn-toolbar)
        > .pmd-toolbar-right-buttons > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),

        body.pmd-admin-theme-v1 [data-pmd-legacy-toolbar-source="1"],
        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),
        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source > .pmd-toolbar-right-buttons > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn) {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        body.pmd-admin-theme-v1 .pmd-header-action-btn,
        body.pmd-admin-theme-v1 .pmd-header-action-enter,
        body.pmd-admin-theme-v1 .pmd-header-action-visible,
        body.pmd-admin-theme-v1 .pmd-header-title-back,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-action-btn,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-title-back {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
            transition-property: background-color, border-color, color, box-shadow !important;
        }

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .navbar-nav,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .nav-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .nav-link,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-topbar-settings-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-topbar-user-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-tooltip-target {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
    </style>

    {{-- PMD header actions: load early with defer to reduce proxy delay --}}
    <script defer src="{{ asset('app/admin/assets/js/pmd-admin-header-actions.js') }}?v={{ time() }}"></script>

    <style id="pmd-toolbar-collapse-legacy-actions">
        /*
          PMD final no-jump rule:
          The old toolbar is only a hidden source for proxy clicks.
          It must not occupy layout space, otherwise page content jumps.
          Header/proxy buttons are not inside these old page toolbar containers.
        */

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 :is(
            .toolbar-action,
            .progress-indicator-container,
            .form-toolbar,
            .control-toolbar,
            .page-actions,
            .page-title-section .pull-right,
            .list-toolbar,
            .toolbar.btn-toolbar,
            .btn-toolbar
        ) {
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            overflow: hidden !important;
        }

        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source {
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            overflow: hidden !important;
        }

        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source * {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        body.pmd-admin-theme-v1 .pmd-header-action-btn,
        body.pmd-admin-theme-v1 .pmd-header-title-back,
        body.pmd-admin-theme-v1 .pmd-header-tooltip-target,
        body.pmd-admin-theme-v1 .navbar-top,
        body.pmd-admin-theme-v1 .navbar-top .nav-link,
        body.pmd-admin-theme-v1 .navbar-top .nav-item {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
    </style>

{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-remove-hero-v3.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-kpi-polish-v4.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-real-data-v53.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-role-preview-v9.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner2-v11.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v12.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v13-polish.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v14-compact.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v15-rolebar.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-w3-quick-icons-v16.css') }}?v={{ time() }}"> --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-icons-only-v15.css') }}?v={{ time() }}">
<!-- PMD_DASHBOARD_NO_JUMP_V17_START -->
<script>
(function () {
  try {
    document.documentElement.classList.add('pmd-dashboard-booting');
  } catch (e) {}
})();
</script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-no-jump-v17.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_NO_JUMP_V17_END -->
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner-match-v13.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_CSS_END -->
<!-- PMD_OWNER_BLACK_HEADER_V24_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner-black-header-v24.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_BLACK_HEADER_V24_CSS_END -->
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-universal-layout-editor-v35.css') }}?v={{ time() }}">
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_CSS_END -->
<!-- PMD_LOGO_SWITCHER_FINAL_V38_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-logo-switcher-final-v38.css') }}?v={{ time() }}">
<!-- PMD_LOGO_SWITCHER_FINAL_V38_CSS_END -->
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-manager-ops-dashboard-v29.css') }}?v={{ time() }}"> --}}
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_CSS_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_EARLY_START -->
<script>
(function(){try{
  ['pmdSidebarCollapsedV49','pmdSidebarCollapsedV48','pmdSidebarCollapsedV47','pmdSidebarCollapsedV46','pmdSidebarCollapsedV45','pmdSidebarCollapsedV44','pmdSidebarCollapsedV43','pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'].forEach(function(k){localStorage.setItem(k,'0');});
  document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v49','pmd-sidebar-persist-collapsed-v48','pmd-sidebar-persist-collapsed-v47','pmd-sidebar-persist-collapsed-v46','pmd-sidebar-persist-collapsed-v45','pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41');
}catch(e){}})();
</script>
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_EARLY_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-recover-native-v50.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_TUNE_V51_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-logo-tune-v51.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_LOGO_TUNE_V51_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_RAISE_V52_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-raise-v52.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_RAISE_V52_CSS_END -->
<!-- PMD_SIDEBAR_RAISE_ALL_V53_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-raise-all-v53.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_RAISE_ALL_V53_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_ICONS_LOWER_V54_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-icons-lower-v54.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_ICONS_LOWER_V54_CSS_END -->
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-logo-last-toggle-v55.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_CSS_END -->
<!-- PMD_SIDEBAR_MENU_LOWER_V56_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-menu-lower-v56.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_MENU_LOWER_V56_CSS_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-loader-hard-reset-v64.css') }}?v={{ time() }}">
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_CSS_END -->
<!-- PMD_STABLE_LOGO_KPI_V65_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-stable-logo-kpi-v65.css') }}?v={{ time() }}">
<!-- PMD_STABLE_LOGO_KPI_V65_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-logo-mode-v66.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_CSS_END -->
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-toggle-top-gap-v70.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_CSS_END -->
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CONTEXT_START -->
@php
    $__pmdRoleDash = [
        'logged_in' => false,
        'username' => null,
        'staff_id' => null,
        'staff_name' => null,
        'role_code' => null,
        'role_name' => null,
    ];

    try {
        $__pmdUser = null;

        if (class_exists('\Admin\Facades\AdminAuth')) {
            $__pmdUser = \Admin\Facades\AdminAuth::getUser();
        } elseif (class_exists('AdminAuth')) {
            $__pmdUser = \AdminAuth::getUser();
        }

        if ($__pmdUser) {
            $__pmdRoleDash['logged_in'] = true;
            $__pmdRoleDash['username'] = $__pmdUser->username ?? null;
            $__pmdRoleDash['staff_id'] = $__pmdUser->staff_id ?? null;

            if (!empty($__pmdRoleDash['staff_id'])) {
                $__pmdStaffRole = \Illuminate\Support\Facades\DB::table('staffs as s')
                    ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                    ->where('s.staff_id', $__pmdRoleDash['staff_id'])
                    ->select('s.staff_name', 'r.code as role_code', 'r.name as role_name')
                    ->first();

                if ($__pmdStaffRole) {
                    $__pmdRoleDash['staff_name'] = $__pmdStaffRole->staff_name ?? null;
                    $__pmdRoleDash['role_code'] = $__pmdStaffRole->role_code ?? null;
                    $__pmdRoleDash['role_name'] = $__pmdStaffRole->role_name ?? null;
                }
            }
        }
    } catch (\Throwable $e) {
        $__pmdRoleDash['error'] = $e->getMessage();
    }
@endphp
<script>
window.PMD_ROLE_DASHBOARD_CONTEXT_V72 = @json($__pmdRoleDash);
</script>
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CONTEXT_END -->
<!-- PMD_KDS_SERVER_FAST_V82_BLADE_FLAG_START -->
@php
    $__pmdIsKdsDashboardV82 = false;
    try {
        $__pmdCtxUserV82 = strtolower((string)($__pmdRoleDash['username'] ?? ''));
        $__pmdCtxRoleCodeV82 = strtolower((string)($__pmdRoleDash['role_code'] ?? ''));
        $__pmdCtxRoleNameV82 = strtolower((string)($__pmdRoleDash['role_name'] ?? ''));
        $__pmdIsKdsDashboardV82 = (request()->is('admin') || request()->is('admin/dashboard')) && (
            $__pmdCtxUserV82 === 'kds' || $__pmdCtxRoleCodeV82 === 'kds' || $__pmdCtxRoleNameV82 === 'kds' || strpos($__pmdCtxRoleNameV82, 'kitchen') !== false
        );
    } catch (\Throwable $e) {
        $__pmdIsKdsDashboardV82 = false;
    }
@endphp
<!-- PMD_KDS_SERVER_FAST_V82_BLADE_FLAG_END -->

<!-- PMD_KDS_SERVER_FAST_V82_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-kds-server-fast-v82.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_KDS_SERVER_FAST_V82_JS_END -->
<!-- PMD_KDS_ULTRA_FAST_V83_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-kds-ultra-fast-v83.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_KDS_ULTRA_FAST_V83_JS_END -->
<!-- PMD_DASHBOARD_ROLE_PREBOOT_V78_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-preboot-v78.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_ROLE_PREBOOT_V78_JS_END -->

<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-role-dashboard-lock-v72.css') }}?v={{ time() }}"> --}}
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CSS_END -->
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-role-no-sidebar-v73.css') }}?v={{ time() }}"> --}}
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_CSS_END -->
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-role-stability-v78.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_CSS_END -->

<!-- PMD_DASHBOARD_STABILITY_V77_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-stability-v77.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_STABILITY_V77_CSS_END -->




<!-- PMD_KDS_SERVER_FAST_V82_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-kds-server-fast-v82.css') }}?v={{ time() }}"> --}}
<!-- PMD_KDS_SERVER_FAST_V82_CSS_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-kds-ultra-fast-v83.css') }}?v={{ time() }}"> --}}
<!-- PMD_KDS_ULTRA_FAST_V83_CSS_END -->

<!-- PMD_WAITER_STABLE_MOBILE_V97_CSS_START -->
<!-- PMD_WAITER_STABLE_MOBILE_V97_CSS_END -->

<!-- PMD_WAITER_DATA_REPAIR_V100_CSS_START -->
<!-- PMD_WAITER_DATA_REPAIR_V100_CSS_END -->
    {{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-v161-direct-renderer.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-v162-fix-mount-position.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-owner-dashboard-clean-v23.css') }}?v={{ time() }}">
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_CSS_END -->



<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v130-inline-advanced-no-flash-style">
/* PMD KDS v130: kill Advanced table flash before paint */

/* Original server list/table: hidden but readable by JS */
.table-responsive,
.control-list,
.list-widget,
.list-table,
.list-footer,
.pagination,
.pagination-bar,
table {
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Duplicate hero / advanced wrappers */
.pmd962-hero,
section.pmd962-hero,
.pmd962-advanced,
.pmd962-advanced-table,
.pmd962-table-panel,
.pmd962-table-toggle,
.pmd962-original-table-wrap,
[data-pmd-kds-v130-hidden="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Modern cards/stats must stay visible */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap,
.pmd962-stats,
.pmd962-stats-grid,
.pmd962-grid,
.pmd962-cards,
.pmd962-card,
.pmd962-station-card,
[class*="station-card"] {
  visibility: visible !important;
  opacity: 1 !important;
  max-height: none !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
</style>

<script id="pmd-kds-index-v130-inline-advanced-no-flash-script">
(function () {
  var MARK = 'PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH';

  function isKdsIndex() {
    return location.pathname.replace(/\/+$/, '') === '/admin/kds_stations';
  }

  if (!isKdsIndex()) return;

  function qsa(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    catch (e) { return []; }
  }

  function text(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hasCardInside(el) {
    if (!el || !el.querySelector) return false;
    return !!el.querySelector('a[href*="/admin/kds_stations/edit/"]') ||
      text(el).indexOf('Edit station') !== -1 ||
      text(el).indexOf('Open display') !== -1;
  }

  function hardHide(el) {
    if (!el || !el.style) return false;

    el.setAttribute('data-pmd-kds-v130-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    return true;
  }

  function hideAdvancedAndHero(root) {
    root = root || document;

    qsa('.pmd962-hero, section.pmd962-hero, .pmd962-advanced, .pmd962-advanced-table, .pmd962-table-panel, .pmd962-table-toggle, .pmd962-original-table-wrap', root)
      .forEach(hardHide);

    qsa('section,article,div', root).forEach(function (el) {
      var t = text(el);

      if (
        t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }

      if (
        t.indexOf('Manage KDS Stations') !== -1 &&
        t.indexOf('Create, review, and manage kitchen display stations') !== -1 &&
        t.indexOf('New KDS Station') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }
    });
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity || 1) > 0.01 &&
      r.width > 2 &&
      r.height > 2;
  }

  function findCards() {
    var out = [];
    var seen = [];

    qsa('a[href*="/admin/kds_stations/edit/"]').forEach(function (link) {
      var n = link;
      var best = null;

      for (var i = 0; i < 10 && n && n !== document.body; i++, n = n.parentElement) {
        var t = text(n);
        var r = n.getBoundingClientRect ? n.getBoundingClientRect() : { width: 0, height: 0 };

        if (
          r.width > 160 &&
          r.height > 70 &&
          t.indexOf('TYPE') !== -1 &&
          t.indexOf('ROUTING') !== -1
        ) {
          best = n;
        }
      }

      if (best && seen.indexOf(best) === -1) {
        seen.push(best);
        out.push(best);
      }
    });

    return out;
  }

  function check() {
    hideAdvancedAndHero(document);

    var advancedVisible = qsa('section,article,div').filter(function (el) {
      var t = text(el);
      return t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        visible(el);
    }).length;

    var cards = findCards();

    var summary = {
      mark: MARK,
      styleLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-style'),
      scriptLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-script'),
      oldTablesVisible: qsa('table,.table-responsive,.control-list,.list-widget,.list-table').filter(visible).length,
      heroVisible: qsa('.pmd962-hero,section.pmd962-hero').filter(visible).length,
      advancedVisible: advancedVisible,
      cardsDetected: cards.length,
      cardsVisible: cards.filter(visible).length
    };

    summary.status = summary.oldTablesVisible === 0 &&
      summary.heroVisible === 0 &&
      summary.advancedVisible === 0 &&
      summary.cardsVisible > 0 ? 'OK' : 'CHECK';

    window.PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_REPORT = summary;

    try {
      console.log('✅ PMD KDS INDEX v130 INLINE ADVANCED NO-FLASH');
      console.table([summary]);
    } catch (e) {}

    return summary;
  }

  hideAdvancedAndHero(document);

  try {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target) hideAdvancedAndHero(m.target);
        Array.prototype.slice.call(m.addedNodes || []).forEach(function (n) {
          if (n && n.nodeType === 1) hideAdvancedAndHero(n);
        });
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    window.PMD_KDS_INDEX_V130_OBSERVER = observer;
  } catch (e) {}

  window.PMDKdsIndexV130AdvancedNoFlash = {
    check: check
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hideAdvancedAndHero(document);
      setTimeout(check, 50);
    }, true);
  } else {
    check();
  }

  window.addEventListener('load', function () {
    hideAdvancedAndHero(document);
    setTimeout(check, 100);
    setTimeout(check, 700);
    setTimeout(check, 1600);
  }, true);
})();
</script>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_END -->






<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v133-clean-css-stability">
/* PMD KDS v133: clean CSS-only stability. No JS. No observer. */

/* Reserve stable workspace so the page does not jump while v96 builds cards */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap {
  min-height: 560px !important;
}

/* Stable stats/top summary area */
.pmd962-stats,
.pmd962-stats-grid {
  min-height: 112px !important;
  box-sizing: border-box !important;
}

/* Stable card grid */
.pmd962-grid,
.pmd962-cards {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important;
  gap: 18px !important;
  align-items: stretch !important;
  box-sizing: border-box !important;
}

/* Stop layout resize animations inside the KDS modern area */
.pmd962-shell *,
.pmd962-page *,
.pmd962-wrap * {
  box-sizing: border-box !important;
  animation: none !important;
  transition-property: background-color, border-color, color, box-shadow !important;
  transition-duration: 120ms !important;
}

/* Station cards only */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
.pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
[class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
[class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
  min-height: 258px !important;
  height: 100% !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  transform: none !important;
  backface-visibility: hidden !important;
}

/* Keep text stable */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h1,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h2,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h3,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) p,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) span,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) small,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  line-height: 1.35 !important;
}

/* Keep actions from wrapping during font/layout load */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  .pmd962-shell,
  .pmd962-page,
  .pmd962-wrap {
    min-height: 640px !important;
  }

  .pmd962-grid,
  .pmd962-cards {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
  .pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
  [class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
  [class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
    min-height: 246px !important;
    border-radius: 18px !important;
  }
}
</style>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_END -->





    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-mobile-shell-v1.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-page-contract-v1.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-universal-client-list-v1.css?v=50">





<!-- PMD New Pages Anti-Flash Opacity v40 -->
<script>
(function () {
  try {
    var supported = [
      '/admin/menus',
      '/admin/mail_templates',
      '/admin/reviews',
      '/admin/countries',
      '/admin/currencies',
      '/admin/languages',
      '/admin/tips',
      '/admin/payments'
    ];

    var path = window.location.pathname.replace(/\/+$/, '');

    if (supported.indexOf(path) !== -1) {
      document.documentElement.classList.add('pmd-new-pages-antiflash-v40');
      document.documentElement.setAttribute('data-pmd-new-page-path-v40', path);

      window.PMDNewPagesAntiFlashV40Start = Date.now();

      setTimeout(function () {
        document.documentElement.classList.add('pmd-new-pages-antiflash-timeout-v40');
      }, 2600);
    }
  } catch (e) {}
})();
</script>
<style>
/*
 * v40 IMPORTANT:
 * Do NOT use visibility:hidden or display:none here.
 * v30 renderer must still be able to find the table.
 */
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .table-responsive,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) table,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .control-list,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-widget,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-table,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-footer,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .pagination,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .pagination-bar {
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
<!-- /PMD New Pages Anti-Flash Opacity v40 -->


<!-- PMD Universal Admin Forms v1 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-universal-forms-v1.css?v=10">
<script defer src="/app/admin/assets/js/pmd-admin-universal-forms-v1.js?v=10"></script>
<!-- /PMD Universal Admin Forms v1 -->

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
<body class="page pmd-admin-theme-v1 {{ $this->bodyClass }}">
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
@php
    $pmdIsNativeMediaContext = request()->is('admin/settings*') || request()->is('admin/media_manager*');
@endphp

<!-- PMD_KDS_SERVER_FAST_V82_EARLY_MEDIA_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
<!-- PMD EARLY SORTABLE DROPZONE START -->
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/Sortable.min.js') }}?v={{ time() }}"></script>
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/dropzone.min.js') }}?v={{ time() }}"></script>
<!-- PMD EARLY SORTABLE DROPZONE END -->
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_EARLY_MEDIA_GUARD_END -->

{!! get_script_tags() !!}
<!-- SlimSelect: dropdown inside form so it scrolls with page (must run before selectList is used) -->
<script src="{{ asset('app/admin/assets/js/slim-select-relative-position.js') }}?v={{ time() }}"></script>

<!-- Admin confirm modal (Cancel + Delete) – replaces SweetAlert for data-request-confirm -->
<script src="{{ asset('app/admin/assets/js/admin-confirm-modal.js') }}?v={{ time() }}"></script>

<!-- Notification System - ENABLED FOR CPU TESTING -->
<!-- PMD_KDS_SERVER_FAST_V82_NOTIFICATIONS_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/notifications.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_NOTIFICATIONS_JS_GUARD_END -->
<!-- PMD_KDS_SERVER_FAST_V82_PUSH_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/push-notifications.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_SERVER_FAST_V82_PUSH_JS_GUARD_END -->
<!-- Modal Performance Fix - MUST LOAD FIRST to prevent freeze -->
@unless($pmdIsNativeMediaContext)
<!-- PMD_KDS_SERVER_FAST_V82_MODAL_FIX_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/modal-performance-fix.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_MODAL_FIX_JS_GUARD_END -->
@endunless

<!-- Fix Bootstrap Dropdown _menu null (Folders/Filter/Sort dropdowns on Media Manager) -->
<script src="{{ asset('app/admin/assets/js/fix-bootstrap-dropdown-null.js') }}?v={{ time() }}"></script>

<!-- Smooth Page Transitions -->
<!-- PMD_KDS_ULTRA_FAST_V83_SMOOTH_TRANSITIONS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_SMOOTH_TRANSITIONS_GUARD_END -->
<!-- Force Button Alignment - MUST run before page-specific-fixes so Save button gets size once (no vibration) -->
<!-- PMD_KDS_ULTRA_FAST_V83_FORCE_ALIGN_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/force-button-alignment.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_FORCE_ALIGN_GUARD_END -->
<!-- Page-specific fixes -->
<!-- PMD_KDS_ULTRA_FAST_V83_PAGE_SPECIFIC_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/page-specific-fixes.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_PAGE_SPECIFIC_GUARD_END -->
<!-- Fix Media Finder Inline Styles -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/fix-media-finder-inline-styles.js') }}?v={{ time() }}"></script>
@endunless
<!-- Fix History Button Text Centering - Removes inline styles that prevent flexbox centering -->
<script src="{{ asset('app/admin/assets/js/fix-history-button-centering.js') }}?v={{ time() }}"></script>
<!-- Fix Notification Buttons Bottom Border - Ensures bottom border is visible -->
<script src="{{ asset('app/admin/assets/js/fix-notification-buttons-border.js') }}?v={{ time() }}"></script>
<!-- Fix Profile Dropdown Green Hover - Removes green hover effect via JavaScript -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-green.js') }}?v={{ time() }}"></script>
<!-- Fix Tab Link Colors - Force dark blue instead of green -->
<!-- PMD_KDS_ULTRA_FAST_V83_TAB_COLOR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-tab-link-colors.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_TAB_COLOR_GUARD_END -->
<!-- Fix Suggestion Sentences Label - Remove underline and button shadow -->
<!-- PMD_KDS_ULTRA_FAST_V83_SUGGESTION_LABEL_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-suggestion-sentences-label.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_SUGGESTION_LABEL_GUARD_END -->
<!-- Fix Form Field Focus Colors - Remove green, use dark blue -->
<!-- PMD_KDS_ULTRA_FAST_V83_FOCUS_COLOR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-form-field-focus-colors.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_FOCUS_COLOR_GUARD_END -->
<!-- Fix Profile Dropdown Closed - Disables items when dropdown is closed -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-closed.js') }}?v={{ time() }}"></script>
<!-- Fix Menu-Grid Hover - Ensures Tax and Advanced buttons hover works properly -->
<!-- PMD_KDS_ULTRA_FAST_V83_MENU_GRID_HOVER_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-menu-grid-hover.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_MENU_GRID_HOVER_GUARD_END -->
<!-- Disable tooltips on Note, History, and settings menu-grid (redundant labels) -->
<script src="{{ asset('app/admin/assets/js/fix-disable-tooltips.js') }}?v={{ time() }}"></script>

<!-- Modal Blur Fix -->
<!-- PMD_KDS_ULTRA_FAST_V83_MODAL_BLUR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/modal-blur-fix.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_MODAL_BLUR_GUARD_END -->
<!-- Media Manager Search Icon Fix -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/media-search-icon-fix.js') }}?v={{ time() }}"></script>
@endunless

<!-- Image Preview Persistence Fix -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/image-preview-persistence.js') }}?v={{ time() }}"></script>
@endunless

<!-- Debug Redirects (Remove this in production) -->
<!-- PMD_KDS_ULTRA_FAST_V83_DEBUG_REDIRECTS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/debug-redirects.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_DEBUG_REDIRECTS_GUARD_END -->
<!-- Sidebar Star Icon - DISABLED (replaced by unified shell curve) -->
<!-- <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?v={{ time() }}" defer></script> -->

<!-- Folder Creation Dropdown Card -->
<script src="{{ asset('app/admin/assets/js/folder-dropdown-card.js') }}?v={{ time() }}"></script>

<!-- Global Button Width Fix - Enforces 48x48px buttons on all pages -->
<!-- PMD_KDS_ULTRA_FAST_V83_BUTTON_WIDTH_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-button-widths-global.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_BUTTON_WIDTH_GUARD_END -->
<!-- SlimSelect: close dropdown on scroll (page-wrapper), match dropdown width -->
<!-- PMD_KDS_ULTRA_FAST_V83_DYNAMIC_DROPDOWN_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/dynamic-dropdown-height.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_DYNAMIC_DROPDOWN_GUARD_END -->
<!-- PMD Admin Toolbar Auto Normalizer -->
<script src="{{ asset('app/admin/assets/js/pmd-admin-toolbar-normalizer.js') }}?v={{ time() }}"></script>
<script src="{{ asset('app/admin/assets/js/pmd-admin-responsive-shell.js') }}?v={{ time() }}"></script>

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

    @unless($pmdIsNativeMediaContext)
<!-- PMD_KDS_SERVER_FAST_V82_MEDIAFIX_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/pmd-mediafinder-autofix.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_MEDIAFIX_JS_GUARD_END -->
@endunless

<!-- PMD_DASHBOARD_LOGO_INVOICE_SYNC_PROMPT_V1_START -->
<script id="pmd-dashboard-logo-invoice-sync-prompt-v1">
(function () {
    if (!/\/admin\/settings\/edit\/general(?:$|[?#\/])/.test(window.location.pathname)) {
        return;
    }

    var initialDashboardLogo = null;
    var alreadyAskedForThisSave = false;

    function normalizeLogoValue(value) {
        value = String(value || '').trim();
        if (!value) return '';

        try {
            var url = new URL(value, window.location.origin);
            value = url.pathname || value;
        } catch (e) {}

        value = value.split('?')[0];

        var match = value.match(/\/assets\/media\/uploads\/([^\/]+)$/);
        if (match) return '/' + match[1];

        return value;
    }

    function basename(value) {
        value = normalizeLogoValue(value);
        return value.split('/').pop().toLowerCase();
    }

    function isBrokenPlaceholder(value) {
        var b = basename(value);
        return !b || [
            'images.png',
            'images.jpeg',
            'image.png',
            'image.jpeg',
            'placeholder.svg',
            'no-image.png'
        ].indexOf(b) !== -1;
    }

    function getFieldValue(key) {
        var selectors = [
            'input[name="setting[' + key + ']"]',
            'input[name="' + key + '"]',
            'input[data-field-name="' + key + '"]'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el && el.value) {
                return normalizeLogoValue(el.value);
            }
        }

        return '';
    }

    function setHiddenSetting(form, key, value) {
        var name = 'setting[' + key + ']';
        var input = form.querySelector('input[name="' + name + '"]');

        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.setAttribute('data-pmd-injected', '1');
            form.appendChild(input);
        }

        input.value = normalizeLogoValue(value);
    }

    function findMainSettingsForm(el) {
        var form = el && el.closest ? el.closest('form') : null;
        if (form) return form;

        return document.querySelector('form') || document.body;
    }

    function maybePromptAndInject(form) {
        var current = normalizeLogoValue(getFieldValue('dashboard_logo'));

        if (!current || isBrokenPlaceholder(current)) return;
        if (initialDashboardLogo === null) initialDashboardLogo = current;
        if (current === initialDashboardLogo) return;
        if (alreadyAskedForThisSave) return;

        alreadyAskedForThisSave = true;

        var useForInvoice = window.confirm(
            'Do you also want to use this Dashboard Logo for the Invoice logo?'
        );

        if (useForInvoice) {
            setHiddenSetting(form, 'invoice_logo', current);
            setHiddenSetting(form, 'pmd_sync_dashboard_logo_to_invoice', '1');
        }
    }

    function captureInitialLogo() {
        initialDashboardLogo = normalizeLogoValue(getFieldValue('dashboard_logo'));
    }

    window.addEventListener('load', function () {
        setTimeout(captureInitialLogo, 600);
        setTimeout(captureInitialLogo, 1600);
    });

    document.addEventListener('submit', function (event) {
        maybePromptAndInject(event.target);
    }, true);

    document.addEventListener('click', function (event) {
        var target = event.target && event.target.closest
            ? event.target.closest('button, a, input[type="submit"]')
            : null;

        if (!target) return;

        var text = String(target.textContent || target.value || '').toLowerCase();
        var looksLikeSave =
            text.indexOf('save') !== -1 ||
            target.matches('[data-request*="onSave"], [data-request*="save"], .btn-primary, button[type="submit"], input[type="submit"]');

        if (!looksLikeSave) return;

        maybePromptAndInject(findMainSettingsForm(target));
    }, true);
})();
</script>
<!-- PMD_DASHBOARD_LOGO_INVOICE_SYNC_PROMPT_V1_END -->

<script>
(function(){
 if(!/admin\/settings\/edit\/setup/.test(window.location.pathname)) return;
 function v(n){var e=document.querySelector('[name="setting['+n+']"]'); return e?e.value:'';}
 function on(){
  var p=document.getElementById('pmd-invoice-preview'); if(!p) return;
  var preset=document.querySelector('[name="setting[invoice_prefix_preset]"]'); var prefix=document.querySelector('[name="setting[invoice_prefix]"]');
  if(preset && prefix){ if(preset.value && preset.value!=='custom'){ prefix.value=preset.value; } }
  var showLogo=(v('invoice_show_logo')==='1'||v('invoice_show_logo')==='true'||v('invoice_show_logo')==='on');
  var logo=v('invoice_logo'); var l=document.getElementById('pmd-prev-logo'); if(l){ l.textContent=(showLogo && !logo)?'LOGO':''; if(showLogo&&logo){l.innerHTML='<small>Logo selected</small>';} }
  var no=document.getElementById('pmd-prev-no'); if(no){ no.textContent='#'+(v('invoice_prefix')||'')+'2026-001180'; }
  var f=document.getElementById('pmd-prev-footer'); if(f) f.textContent=v('invoice_customer_footer_text')||'';
 }
 document.addEventListener('change',on,true); document.addEventListener('input',on,true); setTimeout(on,300);
})();
</script>
    
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-system-lock-v7.js') }}?v={{ time() }}"></script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-modern-v1.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-real-api-v3.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-preview-v9.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-owner2-v11.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v12.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v13-polish.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v14-compact.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v15-rolebar.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-w3-quick-icons-v16.js') }}?v={{ time() }}"></script> --}}
    <script src="{{ asset('app/admin/assets/js/pmd-sidebar-icons-only-v15.js') }}?v={{ time() }}"></script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-no-jump-v17.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-owner-match-v13.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_JS_END -->
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-universal-layout-editor-v35.js') }}?v={{ time() }}"></script>
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_JS_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-recover-native-v50.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_JS_END -->
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-manager-ops-dashboard-v29.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_JS_END -->
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-logo-last-toggle-v55.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_JS_END -->
<!-- PMD_STABLE_LOGO_KPI_V65_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-stable-logo-switcher-v65.js') }}?v={{ time() }}"></script>
<!-- PMD_STABLE_LOGO_KPI_V65_JS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-closed-logo-mode-v66.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_JS_END -->
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-toggle-top-gap-v70.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_JS_END -->
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-role-dashboard-lock-v72.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_JS_END -->
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-role-no-sidebar-v73.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_JS_END -->
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-stability-v78.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_JS_END -->

<!-- PMD_DASHBOARD_STABILITY_V77_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-stability-v77.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_STABILITY_V77_JS_END -->

<!-- PMD_WAITER_STABLE_MOBILE_V97_JS_START -->
<!-- PMD_WAITER_STABLE_MOBILE_V97_JS_END -->

<!-- PMD_WAITER_DATA_REPAIR_V100_JS_START -->
<!-- PMD_WAITER_DATA_REPAIR_V100_JS_END -->
<!-- PMD_WAITER_PORTAL_V114_ASSETS_START -->
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
<!-- PMD_WAITER_PORTAL_V114_ASSETS_END -->


<!-- PMD_STABLE_FLOOR_PLAN_ASSETS_START -->
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
<!-- PMD_STABLE_FLOOR_PLAN_ASSETS_END -->
<!-- PMD_FLOOR_V146_SAFE_VISUAL_STATUS_START -->
<!-- PMD_FLOOR_V146_SAFE_VISUAL_STATUS_END -->

    {{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-v161-direct-renderer.js') }}?v={{ time() }}" defer></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-v162-fix-mount-position.js') }}?v={{ time() }}" defer></script> --}}







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-owner-dashboard-clean-v23.js') }}?v={{ time() }}" defer></script>
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_JS_END -->
    <script src="/app/admin/assets/js/pmd-admin-universal-client-list-v1.js?v=50" defer></script>
</body>
</html>
