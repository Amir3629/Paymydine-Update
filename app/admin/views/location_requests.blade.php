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
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/superadmin-mobile-sidebar-fix.css') }}?ver={{ time() }}">
    <!-- Blue Buttons Override - Replace all green buttons with login button style -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/blue-buttons-override.css') }}?ver={{ time() }}">
    <!-- Smooth Corner - Replace Star Icon with Rounded Corner -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-corner-replace-star.css') }}?ver={{ time() }}">
    <!-- CRITICAL: Inject curve fix element IMMEDIATELY - runs before DOMContentLoaded -->
    <script src="{{ asset('app/admin/assets/js/curve-fix-immediate.js') }}?ver={{ time() }}"></script>
    <!-- CRITICAL: Ensure curve fix element is visible immediately - no delays -->
    <style>
        .sidebar-curve-fix {
            position: fixed !important;
            left: 190px !important;
            top: 24px !important;
            width: 80px !important;
            height: 80px !important;
            background: #516584 !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 1031 !important;
            pointer-events: none !important;
            transition: none !important;
            animation: none !important;
            transform: none !important;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Smooth Transitions & Modern Interactions -->
    <script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?ver={{ time() }}" defer></script>
    
    <!-- Sidebar Star Icon -->
    <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?ver={{ time() }}" defer></script>
    <!-- Mobile Sidebar Toggle -->
    <script src="{{ asset('app/admin/assets/js/mobile-sidebar-toggle.js') }}?ver={{ time() }}" defer></script>
    <!-- Force Blue Buttons Override -->
    <script src="{{ asset('app/admin/assets/js/force-blue-buttons.js') }}?ver={{ time() }}"></script>

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
                                    <a href="/superadmin/index" class="nk-menu-link">
                                        <span class="nk-menu-icon"><em class="icon ni ni-dashboard-fill"></em></span>
                                        <span class="nk-menu-text">Dashboard</span>
                                    </a>
                                </li><!-- .nk-menu-item -->
                              
                                <li class="nk-menu-item">
                                    <a href="/superadmin/new" class="nk-menu-link">
                                        <span class="nk-menu-icon"><em class="icon ni ni-user-list-fill"></em></span>
                                        <span class="nk-menu-text">Restaurants</span>
                                    </a>
                                </li><!-- .nk-menu-item -->

                                <li class="nk-menu-item">
                                    <a href="/superadmin/location-requests" class="nk-menu-link">
                                        <span class="nk-menu-icon"><em class="icon ni ni-map-pin-fill"></em></span>
                                        <span class="nk-menu-text">Location Requests</span>
                                    </a>
                                </li><!-- .nk-menu-item -->
                             
                            
                                <li class="nk-menu-item">
                                    <a href="/superadmin/settings" class="nk-menu-link">
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

<!-- Decorative curve replacing star icon -->
<div class="sidebar-curve-fix" style="position: fixed !important; left: 190px !important; top: 24px !important; width: 80px !important; height: 80px !important; background: #516584 !important; display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1031 !important; pointer-events: none !important; transition: none !important; animation: none !important;"></div>

</body>

</html>

