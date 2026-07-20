<!DOCTYPE html>
<html lang="zxx" class="js">

<head>
    <base href="../../">
    <meta charset="utf-8">
    <meta name="author" content="Softnio">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="A powerful Super Admin dashboard for managing multiple tenants, each with its own restaurant management system. Efficiently handle tenants, databases, and domains in one place.">
    <!-- Fav Icon  -->
    <link rel="shortcut icon" href="./images/favicon.svg">
    <!-- Page Title  -->
    <title>PayMyDine Super Admin Dashboard</title>
    <!-- StyleSheets  -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dashboard.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-exact-match.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/active-menu-bright.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/force-seamless-connection.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-menu-position-fix.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-scrollbar-fix.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-spacing-fix.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-simple-fade.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-sidebar-inward-curve.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-mobile-sidebar-fix.css') }}?ver={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-sidebar-visibility-fix.css') }}?ver={{ time() }}">
    <!-- Blue Buttons Override - Replace all green buttons with login button style -->
    <!-- Smooth Corner - Replace Star Icon with Rounded Corner -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-corner-replace-star.css') }}?ver={{ time() }}">
    <!-- CRITICAL: Inject curve fix element IMMEDIATELY - runs before DOMContentLoaded -->
    
    <!-- Sidebar Star Icon - DISABLED (replaced by smooth corner) -->
    <!-- <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?ver={{ time() }}" defer></script> -->
    <!-- Mobile Sidebar Toggle -->
    <script src="{{ asset('app/admin/assets/js/mobile-sidebar-toggle.js') }}?ver={{ time() }}" defer></script>



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





</head>

<body class="nk-body bg-lighter npc-general has-sidebar ">
    <div class="nk-app-root">
        <!-- main @s -->
        <div class="nk-main ">
            <!-- sidebar @s -->
            <div class="nk-sidebar nk-sidebar-fixed is-dark " data-content="sidebarMenu">
                <div class="nk-sidebar-element nk-sidebar-head">
                    <div class="nk-menu-trigger">
                        <a href="#" class="nk-nav-toggle nk-quick-nav-icon d-xl-none" data-target="sidebarMenu"><em class="icon ni ni-arrow-left"></em></a>
                        <a href="#" class="nk-nav-compact nk-quick-nav-icon d-none d-xl-inline-flex" data-target="sidebarMenu"><em class="icon ni ni-menu"></em></a>
                    </div>
                    <div class="nk-sidebar-brand">
                        <a href="/superadmin/index" class="logo-link nk-sidebar-logo">
                            <img class="logo-light logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo">
                            <img class="logo-dark logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo-dark">
                        </a>
                    </div>
                </div><!-- .nk-sidebar-element -->
                <div class="nk-sidebar-element nk-sidebar-body">
                    <div class="nk-sidebar-content">
                        <div class="nk-sidebar-menu" data-simplebar>
                            <ul class="nk-menu">
                            <li class="nk-menu-item">
                                    <a href="/superadmin/index" class="nk-menu-link {{ request()->is('superadmin/index') ? 'active' : '' }}">
                                        <span class="nk-menu-icon"><em class="icon ni ni-dashboard-fill"></em></span>
                                        <span class="nk-menu-text">Dashboard</span>
                                    </a>
                                </li><!-- .nk-menu-item -->
                              
                                <li class="nk-menu-item">
                                    <a href="/superadmin/new" class="nk-menu-link {{ request()->is('superadmin/new') ? 'active' : '' }}">
                                        <span class="nk-menu-icon"><em class="icon ni ni-user-list-fill"></em></span>
                                        <span class="nk-menu-text">Restaurants</span>
                                    </a>
                                </li><!-- .nk-menu-item -->

                                <li class="nk-menu-item">
                                    <a href="/superadmin/location-requests" class="nk-menu-link {{ request()->is('superadmin/location-requests') ? 'active' : '' }}">
                                        <span class="nk-menu-icon"><em class="icon ni ni-map-pin-fill"></em></span>
                                        <span class="nk-menu-text">Location Requests</span>
                                    </a>
                                </li><!-- .nk-menu-item -->
                             
                            
                                <li class="nk-menu-item">
                                    <a href="/superadmin/settings" class="nk-menu-link {{ request()->is('superadmin/settings') ? 'active' : '' }}">
                                        <span class="nk-menu-icon"><em class="icon ni ni-setting-alt-fill"></em></span>
                                        <span class="nk-menu-text">Settings</span>
                                    </a>
                                </li><!-- .nk-menu-item -->
                                
                               
                            </ul><!-- .nk-menu -->
                        </div><!-- .nk-sidebar-menu -->
                    </div><!-- .nk-sidebar-content -->
                </div><!-- .nk-sidebar-element -->
            </div>
            <?php
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

$today = Carbon::today();
$yesterday = Carbon::yesterday();
$startOfWeek = Carbon::now()->startOfWeek();
$startOfLastWeek = Carbon::now()->subWeek()->startOfWeek();
$endOfLastWeek = Carbon::now()->subWeek()->endOfWeek();
$startOfMonth = Carbon::now()->startOfMonth();
$startOfLastMonth = Carbon::now()->subMonth()->startOfMonth();
$endOfLastMonth = Carbon::now()->subMonth()->endOfMonth();
$startOfYear = Carbon::now()->startOfYear();
$startOfLastYear = Carbon::now()->subYear()->startOfYear();
$endOfLastYear = Carbon::now()->subYear()->endOfYear();

// Fetch tenant counts from MySQL connection
$totalToday = DB::connection('mysql')->table('tenants')->whereDate('start', '=', $today)->count();
$totalYesterday = DB::connection('mysql')->table('tenants')->whereDate('start', '=', $yesterday)->count();

$totalThisWeek = DB::connection('mysql')->table('tenants')->whereDate('start', '>=', $startOfWeek)->count();
$totalLastWeek = DB::connection('mysql')->table('tenants')->whereBetween('start', [$startOfLastWeek, $endOfLastWeek])->count();

$totalThisMonth = DB::connection('mysql')->table('tenants')->whereDate('start', '>=', $startOfMonth)->count();
$totalLastMonth = DB::connection('mysql')->table('tenants')->whereBetween('start', [$startOfLastMonth, $endOfLastMonth])->count();

$totalThisYear = DB::connection('mysql')->table('tenants')->whereDate('start', '>=', $startOfYear)->count();
$totalLastYear = DB::connection('mysql')->table('tenants')->whereBetween('start', [$startOfLastYear, $endOfLastYear])->count();

// Calculate percentage changes (avoid division by zero)
function percentageChange($current, $previous) {
    if ($previous == 0) {
        return $current == 0 ? 0 : 100; // If previous is 0, return 100% increase if current > 0, else 0%
    }
    return round((($current - $previous) / $previous) * 100, 2);
}

$changeToday = percentageChange($totalToday, $totalYesterday);
$changeWeek = percentageChange($totalThisWeek, $totalLastWeek);
$changeMonth = percentageChange($totalThisMonth, $totalLastMonth);
$changeYear = percentageChange($totalThisYear, $totalLastYear);
?>
            <!-- sidebar @e -->
            <!-- wrap @s -->
            <div class="nk-wrap ">
                <!-- main header @s -->
                <div class="nk-header nk-header-fixed is-light">
                    <div class="container-fluid">
                        <div class="nk-header-wrap">
                            <!-- Logo in Header - LEFT SIDE (Always visible) -->
                            <div class="navbar-brand">
                                <a href="/superadmin/index" class="logo-link">
                                    <img class="logo-light logo-img" src="./images/logo.png" alt="logo">
                                </a>
                            </div>
                            
                            <div class="nk-menu-trigger d-xl-none ms-n1">
                                <a href="#" class="nk-nav-toggle nk-quick-nav-icon" data-target="sidebarMenu"><em class="icon ni ni-menu"></em></a>
                            </div>
                            
                            <!-- Page Title in Header - CENTER -->
                            <div class="page-title">
                                <span>Super Admin Dashboard</span>
                            </div>
                              
                            <div class="nk-header-tools">
                                <ul class="nk-quick-nav">
                         
                                    <li class="dropdown user-dropdown">
                                        <a href="#" class="dropdown-toggle" data-bs-toggle="dropdown">
                                            <div class="user-toggle">
                                                <div class="user-avatar sm">
                                                    <em class="icon ni ni-user-alt"></em>
                                                </div>
                                                <div class="user-info d-none d-md-block">
                                                    <div class="user-status">Administrator</div>
                                                    <div class="user-name dropdown-indicator">Super Admin</div>
                                                </div>
                                            </div>
                                        </a>
                                        <div class="dropdown-menu dropdown-menu-md dropdown-menu-end dropdown-menu-s1">
                                            <div class="dropdown-inner user-card-wrap bg-lighter d-none d-md-block">
                                                <div class="user-card">
                                                    <div class="user-avatar">
                                                        <span>SB</span>
                                                    </div>
                                                    <div class="user-info">
                                                        <span class="lead-text">super admin</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="dropdown-inner">
                                                <ul class="link-list">
                                                    <li><a href="/superadmin/settings"><em class="icon ni ni-setting-alt"></em><span>Account Setting</span></a></li>
                                                </ul>
                                            </div>
                                            <div class="dropdown-inner">
                                            <ul class="link-list">
    <li>
        <a href="{{ url('/superadmin/signout') }}">
           <em class="icon ni ni-signout"></em>
            <span>Sign out</span>
        </a>
    </li>
</ul>
 
                                            </div>
                                        </div>
                                    </li><!-- .dropdown -->
                                    <li class="dropdown notification-dropdown me-n1">
                                        <a href="#" class="dropdown-toggle nk-quick-nav-icon" data-bs-toggle="dropdown">
                                            <div class="icon-status icon-status-info"><em class="icon ni ni-bell"></em></div>
                                        </a>
                                        <?php

$today = now();
$thresholdDate = now()->addDays(15);

$tns = DB::connection('mysql')
    ->table('tenants')
    ->whereDate('end', '<=', $thresholdDate)
    ->get();

$totalTenants = $tns->count(); // ✅ Correct method
?>
                                        <div class="dropdown-menu dropdown-menu-xl dropdown-menu-end dropdown-menu-s1">
                                            <div class="dropdown-head">
                                                <span class="sub-title nk-dropdown-title">Notifications</span>
                                                <a >{{ $totalTenants }}</a>
                                            </div>
    
                                            <div class="dropdown-body">
                                                <div class="nk-notification">
                                                @foreach ($tns as $tn)

                                                    <div class="nk-notification-item dropdown-inner">
                                                        <div class="nk-notification-icon">
                                                            <em class="icon icon-circle bg-warning-dim ni ni-curve-down-right"></em>
                                                        </div>
                                                        <div class="nk-notification-content">
                                                            <div class="nk-notification-text">{{ $tn->name }}</div>
                                                            <div class="nk-notification-time">{{ \Carbon\Carbon::parse($tn->end)->diffInDays(now()) }} days left</div>
                                                        </div>
                                                    </div>
                                                    @endforeach

                                                   
                                               
                                                </div><!-- .nk-notification -->
                                            </div><!-- .nk-dropdown-body -->
                                        </div>
                                    </li><!-- .dropdown -->
                                </ul><!-- .nk-quick-nav -->
                            </div><!-- .nk-header-tools -->
                        </div><!-- .nk-header-wrap -->
                    </div><!-- .container-fliud -->
                </div>
                <!-- main header @e -->
                <!-- wrap @s -->
            <div class="nk-wrap ">
                <!-- content @s -->
                <div class="nk-content ">
                    <div class="container-fluid">
                        <div class="nk-content-inner">
                            <div class="nk-content-body">
                                <div class="nk-block-head nk-block-head-sm">
                                    <div class="nk-block-between">
                                        <div class="nk-block-head-content">
                                            <h3 class="nk-block-title page-title elegant-title">Super Admin Dashboard</h3>
                                            <div class="nk-block-des text-soft">
                                                <p class="welcome-text">Welcome to the Super Admin Dashboard.</p>
                                            </div>
                                        </div><!-- .nk-block-head-content -->
                                       
                                    </div><!-- .nk-block-between -->
                                </div>
                                <div class="nk-block">
                                    <div class="row g-gs">
                                       
                                     
                                        <div class="col-md-7 col-xxl-4">
                                            <div class="card card-bordered h-100">
                                                <div class="card-inner mb-n2">
                                                    <div class="card-title-group">
                                                        <div class="card-title card-title-sm">
                                                            <h6 class="tenant-title">Tenants</h6>
                                                            <p class="tenant-subtitle">Tenants Statistics</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="nk-tb-list is-loose traffic-channel-table">
                                                    <div class="nk-tb-item nk-tb-head">
                                                        <div class="nk-tb-col nk-tb-channel"><span>Duration</span></div>
                                                        <div class="nk-tb-col nk-tb-sessions"><span>Tenants </span></div>
                                                        <div class="nk-tb-col nk-tb-prev-sessions"><span>Prev Tenants </span></div>
                                                        <div class="nk-tb-col nk-tb-change"><span>Change</span></div>
                                                        <div class="nk-tb-col nk-tb-trend tb-col-sm text-end"><span>Statistics</span></div>
                                                    </div><!-- .nk-tb-head -->
                                                    <div class="nk-tb-item">
                                                        <div class="nk-tb-col nk-tb-channel">
                                                            <span class="tb-lead">Yearly</span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalThisYear}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-prev-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalLastYear}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-change">
                                                        <?php
$class1 = ($totalThisYear > $totalLastYear) ? 'change up' : 'change down';
?>
                                                            <span class="tb-sub"><span>{{$changeYear}}%</span> <span class="{{$class1}}"><em class="icon ni ni-arrow-long-up"></em></span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-trend text-end">
                                                            <div class="traffic-channel-ck ms-auto">
                                                                <canvas class="analytics-line-small" id="OrganicSearchData"></canvas>
                                                            </div>
                                                        </div>
                                                    </div><!-- .nk-tb-item -->
                                                    <div class="nk-tb-item">
                                                        <div class="nk-tb-col nk-tb-channel">
                                                            <span class="tb-lead">Monthly</span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalThisMonth}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-prev-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalLastMonth}}</span></span>
                                                        </div>
                                                        <?php
$class2 = ($totalThisMonth > $totalLastMonth) ? 'change up' : 'change down';
?>
                                                        <div class="nk-tb-col nk-tb-change">
                                                            <span class="tb-sub"><span>{{$changeMonth}}%</span> <span class="{{$class2}}"><em class="icon ni ni-arrow-long-down"></em></span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-trend text-end">
                                                            <div class="traffic-channel-ck ms-auto">
                                                                <canvas class="analytics-line-small" id="SocialMediaData"></canvas>
                                                            </div>
                                                        </div>
                                                    </div><!-- .nk-tb-item -->
                                                    <div class="nk-tb-item">
                                                        <div class="nk-tb-col nk-tb-channel">
                                                            <span class="tb-lead">Weekly</span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalThisWeek}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-prev-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalLastWeek}}</span></span>
                                                        </div>
                                                        <?php
$class3 = ($totalThisWeek > $totalLastWeek) ? 'change up' : 'change down';
?>
                                                        <div class="nk-tb-col nk-tb-change">
                                                            <span class="tb-sub"><span>{{$changeWeek}}%</span> <span class="{{$class3}}"><em class="icon ni ni-arrow-long-down"></em></span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-trend text-end">
                                                            <div class="traffic-channel-ck ms-auto">
                                                                <canvas class="analytics-line-small" id="ReferralsData"></canvas>
                                                            </div>
                                                        </div>
                                                    </div><!-- .nk-tb-item -->
                                                    <div class="nk-tb-item">
                                                        <div class="nk-tb-col nk-tb-channel">
                                                            <span class="tb-lead">Daily</span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalToday}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-prev-sessions">
                                                            <span class="tb-sub tb-amount"><span>{{$totalYesterday}}</span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-change">
                                                        <?php
$class4 = ($totalToday > $totalYesterday) ? 'change up' : 'change down';
?>
                                                            <span class="tb-sub"><span>{{$changeToday}}%</span> <span class="{{$class4}}"><em class="icon ni ni-arrow-long-up"></em></span></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-trend text-end">
                                                            <div class="traffic-channel-ck ms-auto">
                                                                <canvas class="analytics-line-small" id="OthersData"></canvas>
                                                            </div>
                                                        </div>
                                                    </div><!-- .nk-tb-item -->
                                                </div><!-- .nk-tb-list -->
                                            </div><!-- .card -->
                                        </div><!-- .col -->
                                        <div class="col-md-5">
                                            <div class="card card-bordered card-full">
                                                <div class="card-inner-group">
                                                    <div class="card-inner">
                                                        <div class="card-title-group">
                                                            <div class="card-title card-title-sm">
                                                            <?php

$recentTenants = DB::connection('mysql')
    ->table('tenants')
    ->orderBy('start', 'desc') // Order by the most recent start date
    ->limit(5) // Get the last 5 tenants
    ->get();
?>
                                                                <h6 class="tenant-title">Recent Tenants</h6>
                                                                <p class="tenant-subtitle">Latest Registered Restaurants</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="card-inner p-0">
                                                        <table class="nk-tb-list nk-tb-ulist">
                                                            <thead>
                                                                <tr class="nk-tb-item nk-tb-head">
                                                                    <th class="nk-tb-col"><span class="sub-text">Name</span></th>
                                                                    <th class="nk-tb-col"><span class="sub-text">Email</span></th>
                                                                    <th class="nk-tb-col"><span class="sub-text">Database</span></th>
                                                                    <th class="nk-tb-col tb-col-lg"><span class="sub-text">Status</span></th>
                                                                    <th class="nk-tb-col nk-tb-col-tools text-end">
                                                                      
                                                                    </th>
                                                                </tr><!-- .nk-tb-item -->
                                                            </thead>
                                                            <tbody>
                                                            <?php foreach ($recentTenants as $tenant): ?>

                                                                <tr class="nk-tb-item">
                                                                    <td class="nk-tb-col">
                                                                        <span><?= htmlspecialchars($tenant->name) ?></span>
                                                                    </td>
                                                                    <td class="nk-tb-col">
                                                                        <span><?= htmlspecialchars($tenant->email) ?><span class="dot dot-success d-lg-none ms-1"></span></span>
                                                                    </td>
                                                                    <td class="nk-tb-col">
                                                                        <span><?= htmlspecialchars($tenant->database) ?></span>
                                                                    </td>
                                                                    <td class="nk-tb-col tb-col-lg">
                                                                    <span class="badge badge-dot badge-dot-xs <?= $tenant->status === 'active' ? 'bg-success' : 'bg-danger' ?>">
    <?= htmlspecialchars($tenant->status) ?>
</span>
                                                                    </td>
                                                                    <td class="nk-tb-col nk-tb-col-tools">
                                                                       
                                                                    </td>
                                                                </tr><!-- .nk-tb-item -->
                                                                <?php endforeach; ?>

                                                            </tbody>
                                                        </table><!-- .nk-tb-list -->
                                                    </div><!-- .card-inner -->
                                                </div>
                                            </div><!-- .card -->
                                        </div><!-- .col -->
                                      

                                     
                                    
                                    </div><!-- .row -->
                                </div><!-- .nk-block -->
                            </div>
                        </div>
                    </div>
                </div>
                <!-- content @e -->
         
                <!-- footer @e -->
            </div>
            <!-- wrap @e -->
        </div>
        <!-- main @e -->
    </div>
    <!-- app-root @e -->
 
        </div><!-- .modla-dialog -->
    </div><!-- .modal -->
    <scrpit>
    <script>
    var tenantStats = {
        today: @json($totalToday),
        week: @json($totalThisWeek),
        month: @json($totalThisMonth),
        year: @json($totalThisYear)
    };
</script>
    <script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
   
   <script src=" {{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
   <script src=" {{ asset('app/admin/assets/js/charts/chart-crm.js?ver=3.2.3') }}"></script>

<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>

</html>