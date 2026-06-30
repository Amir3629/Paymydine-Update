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
    <title>Location Requests - PayMyDine Super Admin Dashboard</title>
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
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Smooth Transitions & Modern Interactions -->
    <script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?ver={{ time() }}" defer></script>
    
    <!-- Sidebar Star Icon -->
    <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?ver={{ time() }}" defer></script>
    <!-- Mobile Sidebar Toggle -->
    <script src="{{ asset('app/admin/assets/js/mobile-sidebar-toggle.js') }}?ver={{ time() }}" defer></script>

    <style>
        /* FORCE dropdown white */
        .nk-header .dropdown-menu { background: #ffffff !important; border: 1px solid #e5e9f2 !important; }
        .dropdown-menu .dropdown-inner { background: #ffffff !important; }
        .dropdown-menu .link-list a { background: #ffffff !important; color: #364a63 !important; }
        .dropdown-menu .link-list a:hover { background: #f5f6fa !important; color: #049b68 !important; }

        .custom-alert {
            position: relative;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
        }

        .success {
            background-color: #28a745;
        }

        .error {
            background-color: #dc3545;
        }

        .close-alert {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-pending {
            background-color: rgba(255, 193, 7, 0.1);
            color: #ffc107;
        }

        .status-approved {
            background-color: rgba(40, 167, 69, 0.1);
            color: #28a745;
        }

        .status-rejected {
            background-color: rgba(220, 53, 69, 0.1);
            color: #dc3545;
        }

        .action-buttons {
            display: flex;
            gap: 8px;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        /* Reduce top spacing */
        .nk-content {
            padding-top: 0 !important;
            margin-top: -10px !important;
        }

        .nk-content-inner {
            padding-top: 0 !important;
        }

        .nk-content-body {
            padding-top: 0 !important;
        }

        .nk-block-head {
            margin-bottom: 0.75rem !important;
            padding-top: 0 !important;
        }

        .nk-block {
            margin-top: 0 !important;
        }

        .card-inner-group {
            padding-top: 0 !important;
        }
    </style>



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
                                <span>Location Requests</span>
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
                                        use Illuminate\Support\Facades\DB;

                                        $today = now();
                                        $thresholdDate = now()->addDays(15);

                                        $tns = DB::connection('mysql')
                                            ->table('tenants')
                                            ->whereDate('end', '<=', $thresholdDate)
                                            ->get();

                                        $totalTenants = $tns->count();
                                        ?>
                                        <div class="dropdown-menu dropdown-menu-xl dropdown-menu-end dropdown-menu-s1">
                                            <div class="dropdown-head">
                                                <span class="sub-title nk-dropdown-title">Notifications</span>
                                                <a>{{ $totalTenants }}</a>
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
                <!-- content @s -->
                <div class="nk-content" style="padding-top: 0;">
                    <div class="container-fluid" style="padding-top: 0;">
                        <div class="nk-content-inner" style="padding-top: 0;">
                            <div class="nk-content-body" style="padding-top: 0;">
                                <div class="nk-block-head nk-block-head-sm">
                                    <div class="nk-block-between">
                                        <div class="nk-block-head-content">
                                            <h3 class="nk-block-title page-title tenants-heading">Location Requests</h3>
                                            <div class="nk-block-des text-soft tenants-description">
                                                <p>Manage restaurant location expansion requests from customers.</p>
                                            </div>
                                            
                                            @if (request('success') || request('error'))
                                                <div class="custom-alert {{ request('success') ? 'success' : 'error' }}">
                                                    <span>{{ request('success') ?? request('error') }}</span>
                                                    <button class="close-alert" onclick="this.parentElement.style.display='none'">&times;</button>
                                                </div>
                                            @endif
                                        </div><!-- .nk-block-head-content -->
                                        <div class="nk-block-head-content">
                                            <div class="toggle-wrap nk-block-tools-toggle">
                                                <a href="#" class="btn btn-icon btn-trigger toggle-expand me-n1" data-target="pageMenu"><em class="icon ni ni-menu-alt-r"></em></a>
                                                <div class="toggle-expand-content" data-content="pageMenu">
                                                    <ul class="nk-block-tools g-3">
                                                        <li class="nk-block-tools-opt">
                                                            <a href="#" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#viewRequestModal" style="display: none;" id="viewRequestBtn">
                                                                <em class="icon ni ni-eye"></em>
                                                                <span>View Request</span>
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div><!-- .toggle-wrap -->
                                        </div><!-- .nk-block-head-content -->
                                    </div><!-- .nk-block-between -->
                                </div><!-- .nk-block-head -->
                                <div class="nk-block">
                                    <div class="card card-bordered card-stretch">
                                        <div class="card-inner-group">
                                            <div class="card-inner p-0">
                                                <div class="nk-tb-list nk-tb-ulist">
                                                    <div class="nk-tb-item nk-tb-head">
                                                        <div class="nk-tb-col"><span class="sub-text">Customer</span></div>
                                                        <div class="nk-tb-col tb-col-lg"><span class="sub-text">Location Name</span></div>
                                                        <div class="nk-tb-col tb-col-mb"><span class="sub-text">Database Name</span></div>
                                                        <div class="nk-tb-col tb-col-md"><span class="sub-text">Email</span></div>
                                                        <div class="nk-tb-col tb-col-md"><span class="sub-text">Phone</span></div>
                                                        <div class="nk-tb-col tb-col-md"><span class="sub-text">Status</span></div>
                                                        <div class="nk-tb-col nk-tb-col-tools text-end">
                                                            <span class="sub-text">Actions</span>
                                                        </div>
                                                    </div>
                                                    @forelse ($locationRequests as $request)
                                                        <div class="nk-tb-item">
                                                            <div class="nk-tb-col">
                                                                <div class="user-card">
                                                                    <div class="user-avatar bg-primary">
                                                                        <span>{{ $request->customer_id ?? 'N/A' }}</span>
                                                                    </div>
                                                                    <div class="user-info">
                                                                        <span class="tb-lead">{{ $request->customer_name ?? 'Unknown Customer' }}</span>
                                                                        <span>{{ $request->customer_number ?? 'N/A' }}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div class="nk-tb-col tb-col-lg">
                                                                <span class="tb-amount">{{ $request->location_name ?? 'N/A' }}</span>
                                                            </div>
                                                            <div class="nk-tb-col tb-col-mb">
                                                                <span class="tb-amount">{{ $request->database_name ?? 'N/A' }}</span>
                                                            </div>
                                                            <div class="nk-tb-col tb-col-md">
                                                                <span>{{ $request->email ?? 'N/A' }}</span>
                                                            </div>
                                                            <div class="nk-tb-col tb-col-md">
                                                                <span>{{ $request->phone ?? 'N/A' }}</span>
                                                            </div>
                                                            <div class="nk-tb-col tb-col-md">
                                                                @php
                                                                    $status = $request->status ?? 'pending';
                                                                    $statusClass = 'status-pending';
                                                                    if ($status === 'approved') $statusClass = 'status-approved';
                                                                    if ($status === 'rejected') $statusClass = 'status-rejected';
                                                                @endphp
                                                                <span class="status-badge {{ $statusClass }}">{{ ucfirst($status) }}</span>
                                                            </div>
                                                            <div class="nk-tb-col nk-tb-col-tools">
                                                                <ul class="nk-tb-actions gx-1">
                                                                    <li>
                                                                        <div class="drodown">
                                                                            <a href="#" class="dropdown-toggle btn btn-icon btn-trigger" data-bs-toggle="dropdown"><em class="icon ni ni-more-h"></em></a>
                                                                            <div class="dropdown-menu dropdown-menu-end">
                                                                                <ul class="link-list-opt no-bdr">
                                                                                    <li>
                                                                                        <a href="#" class="view-request" 
                                                                                           data-id="{{ $request->id }}"
                                                                                           data-customer-name="{{ $request->customer_name ?? 'N/A' }}"
                                                                                           data-customer-number="{{ $request->customer_number ?? 'N/A' }}"
                                                                                           data-location-name="{{ $request->location_name ?? 'N/A' }}"
                                                                                           data-database-name="{{ $request->database_name ?? 'N/A' }}"
                                                                                           data-email="{{ $request->email ?? 'N/A' }}"
                                                                                           data-phone="{{ $request->phone ?? 'N/A' }}"
                                                                                           data-status="{{ $request->status ?? 'pending' }}"
                                                                                           data-notes="{{ $request->notes ?? '' }}">
                                                                                            <em class="icon ni ni-eye"></em>
                                                                                            <span>View Details</span>
                                                                                        </a>
                                                                                    </li>
                                                                                    <li>
                                                                                        <a href="mailto:{{ $request->email ?? '#' }}">
                                                                                            <em class="icon ni ni-mail-fill"></em>
                                                                                            <span>Send Email</span>
                                                                                        </a>
                                                                                    </li>
                                                                                    <li>
                                                                                        <a href="#" class="approve-request" data-id="{{ $request->id }}">
                                                                                            <em class="icon ni ni-check-circle"></em>
                                                                                            <span>Approve</span>
                                                                                        </a>
                                                                                    </li>
                                                                                    <li>
                                                                                        <a href="#" class="reject-request" data-id="{{ $request->id }}">
                                                                                            <em class="icon ni ni-cross-circle"></em>
                                                                                            <span>Reject</span>
                                                                                        </a>
                                                                                    </li>
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    @empty
                                                        <div class="nk-tb-item">
                                                            <div class="nk-tb-col" colspan="7">
                                                                <div class="text-center py-5">
                                                                    <em class="icon ni ni-inbox" style="font-size: 48px; color: #ccc;"></em>
                                                                    <p class="mt-3 text-soft">No location requests found.</p>
                                                                    <p class="text-soft">Requests from the landing page will appear here.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    @endforelse
                                                </div><!-- .nk-tb-list -->
                                            </div><!-- .card-inner -->
                                            @if($locationRequests->hasPages())
                                                <div class="card-inner">
                                                    <div class="nk-block-between-md g-3">
                                                        <div class="g">
                                                            <ul class="pagination justify-content-center justify-content-md-start">
                                                                @if ($locationRequests->onFirstPage())
                                                                    <li class="page-item disabled"><span class="page-link">Prev</span></li>
                                                                @else
                                                                    <li class="page-item"><a class="page-link" href="{{ $locationRequests->previousPageUrl() }}">Prev</a></li>
                                                                @endif

                                                                @foreach ($locationRequests->getUrlRange(1, $locationRequests->lastPage()) as $page => $url)
                                                                    @if ($page == $locationRequests->currentPage())
                                                                        <li class="page-item active"><span class="page-link">{{ $page }}</span></li>
                                                                    @else
                                                                        <li class="page-item"><a class="page-link" href="{{ $url }}">{{ $page }}</a></li>
                                                                    @endif
                                                                @endforeach

                                                                @if ($locationRequests->hasMorePages())
                                                                    <li class="page-item"><a class="page-link" href="{{ $locationRequests->nextPageUrl() }}">Next</a></li>
                                                                @else
                                                                    <li class="page-item disabled"><span class="page-link">Next</span></li>
                                                                @endif
                                                            </ul><!-- .pagination -->
                                                        </div>
                                                    </div><!-- .nk-block-between -->
                                                </div><!-- .card-inner -->
                                            @endif
                                        </div><!-- .card-inner-group -->
                                    </div><!-- .card -->
                                </div><!-- .nk-block -->
                            </div>
                        </div>
                    </div>
                </div>
                <!-- content @e -->
            </div>
            <!-- wrap @e -->
        </div>
        <!-- main @e -->
    </div>
    <!-- app-root @e -->

    <!-- View Request Modal -->
    <div class="modal fade" id="viewRequestModal">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <a href="#" class="close" data-bs-dismiss="modal" aria-label="Close">
                    <em class="icon ni ni-cross-sm"></em>
                </a>
                <div class="modal-body modal-body-md">
                    <h5 class="modal-title">Location Request Details</h5>
                    <div class="mt-4">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label text-soft">Customer Name</label>
                                <div class="form-control-plaintext" id="modal-customer-name">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-soft">Customer Number</label>
                                <div class="form-control-plaintext" id="modal-customer-number">-</div>
                            </div>
                        </div>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label text-soft">Location Name</label>
                                <div class="form-control-plaintext" id="modal-location-name">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-soft">Database Name</label>
                                <div class="form-control-plaintext" id="modal-database-name">-</div>
                            </div>
                        </div>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label text-soft">Email Address</label>
                                <div class="form-control-plaintext" id="modal-email">-</div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-soft">Phone Number</label>
                                <div class="form-control-plaintext" id="modal-phone">-</div>
                            </div>
                        </div>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label text-soft">Status</label>
                                <div class="form-control-plaintext">
                                    <span class="status-badge" id="modal-status">-</span>
                                </div>
                            </div>
                        </div>
                        <div class="row g-3 mb-3">
                            <div class="col-12">
                                <label class="form-label text-soft">Additional Notes</label>
                                <div class="form-control-plaintext" id="modal-notes">-</div>
                            </div>
                        </div>
                        <div class="row g-3 mt-4">
                            <div class="col-12">
                                <div class="action-buttons">
                                    <button type="button" class="btn btn-success approve-request-modal" id="approve-btn">
                                        <em class="icon ni ni-check-circle"></em>
                                        <span>Approve Request</span>
                                    </button>
                                    <button type="button" class="btn btn-danger reject-request-modal" id="reject-btn">
                                        <em class="icon ni ni-cross-circle"></em>
                                        <span>Reject Request</span>
                                    </button>
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <span>Close</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
    <script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
            // Handle view request click
            document.querySelectorAll('.view-request').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const modal = new bootstrap.Modal(document.getElementById('viewRequestModal'));
                    
                    // Populate modal with data
                    document.getElementById('modal-customer-name').textContent = this.dataset.customerName || 'N/A';
                    document.getElementById('modal-customer-number').textContent = this.dataset.customerNumber || 'N/A';
                    document.getElementById('modal-location-name').textContent = this.dataset.locationName || 'N/A';
                    document.getElementById('modal-database-name').textContent = this.dataset.databaseName || 'N/A';
                    document.getElementById('modal-email').textContent = this.dataset.email || 'N/A';
                    document.getElementById('modal-phone').textContent = this.dataset.phone || 'N/A';
                    document.getElementById('modal-notes').textContent = this.dataset.notes || 'No additional notes.';
                    
                    const status = this.dataset.status || 'pending';
                    const statusBadge = document.getElementById('modal-status');
                    statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    statusBadge.className = 'status-badge ';
                    if (status === 'approved') statusBadge.className += 'status-approved';
                    else if (status === 'rejected') statusBadge.className += 'status-rejected';
                    else statusBadge.className += 'status-pending';
                    
                    // Store request ID for approve/reject actions
                    document.getElementById('approve-btn').dataset.requestId = this.dataset.id;
                    document.getElementById('reject-btn').dataset.requestId = this.dataset.id;
                    
                    modal.show();
                });
            });

            // Handle approve request
            document.querySelectorAll('.approve-request, .approve-request-modal').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const requestId = this.dataset.id || this.closest('[data-id]')?.dataset.id;
                    
                    Swal.fire({
                        title: "Approve Request?",
                        text: "This will approve the location request.",
                        icon: "question",
                        showCancelButton: true,
                        confirmButtonColor: "#28a745",
                        cancelButtonColor: "#aaa",
                        confirmButtonText: "Yes, approve it!"
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // TODO: Implement approve functionality
                            Swal.fire("Approved!", "The request has been approved.", "success");
                            setTimeout(() => location.reload(), 1500);
                        }
                    });
                });
            });

            // Handle reject request
            document.querySelectorAll('.reject-request, .reject-request-modal').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const requestId = this.dataset.id || this.closest('[data-id]')?.dataset.id;
                    
                    Swal.fire({
                        title: "Reject Request?",
                        text: "This will reject the location request.",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#dc3545",
                        cancelButtonColor: "#aaa",
                        confirmButtonText: "Yes, reject it!"
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // TODO: Implement reject functionality
                            Swal.fire("Rejected!", "The request has been rejected.", "success");
                            setTimeout(() => location.reload(), 1500);
                        }
                    });
                });
            });


            // Auto-hide alerts
            setTimeout(() => {
                document.querySelectorAll(".custom-alert").forEach(alert => {
                    alert.style.display = "none";
                });
            }, 5000);
        });
    </script>

<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>

</html>

