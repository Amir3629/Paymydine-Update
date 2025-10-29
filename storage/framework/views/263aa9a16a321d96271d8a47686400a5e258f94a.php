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
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/dashboard.css')); ?>?ver=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/superadmin-exact-match.css')); ?>?ver=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/superadmin-scrollbar-fix.css')); ?>?ver=<?php echo e(time()); ?>">
    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/superadmin-spacing-fix.css')); ?>?ver=<?php echo e(time()); ?>">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    
    <!-- Smooth Transitions & Modern Interactions -->
    <script src="<?php echo e(asset('app/admin/assets/js/smooth-transitions.js')); ?>?ver=<?php echo e(time()); ?>" defer></script>
    
    <!-- Sidebar Star Icon -->
    <script src="<?php echo e(asset('app/admin/assets/js/sidebar-star-icon.js')); ?>?ver=<?php echo e(time()); ?>" defer></script>

    <style>
    /* FORCE dropdown white */
    .nk-header .dropdown-menu { background: #ffffff !important; border: 1px solid #e5e9f2 !important; }
    .dropdown-menu .dropdown-inner { background: #ffffff !important; }
    .dropdown-menu .link-list a { background: #ffffff !important; color: #364a63 !important; }
    .dropdown-menu .link-list a:hover { background: #f5f6fa !important; color: #049b68 !important; }
    </style>

    <style>
        .toggle-status {
    font-size: 12px; /* Smaller text */
    padding: 6px 10px; /* Adjust padding for a smaller button */
    border-radius: 5px; /* Rounded edges for a sleek look */
    transition: all 0.3s ease-in-out; /* Smooth hover effect */
}

.toggle-status[data-status="activate"] {
    color: #28a745; /* Light green */
    background-color: rgba(40, 167, 69, 0.1); /* Subtle green background */
    border: 1px solid #28a745;
}

.toggle-status[data-status="disable"] {
    color: #dc3545; /* Light red */
    background-color: rgba(220, 53, 69, 0.1); /* Subtle red background */
    border: 1px solid #dc3545;
}

.toggle-status:hover {
    opacity: 0.8; /* Slight fade effect on hover */
}

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
    background-color: #28a745; /* Green */
}

.error {
    background-color: #dc3545; /* Red */
}

.close-alert {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
}
</style>

    </head>

<body class="nk-body bg-lighter npc-general has-sidebar ">
    <div class="nk-app-root">
          <!-- main @s  -->
          <div class="nk-main ">
            <!-- sidebar @s  -->
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
            <!-- sidebar @e  -->
            <!-- wrap @s  -->
            <div class="nk-wrap ">
                <!-- main header @s  -->
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
                                <span>Restaurants List</span>
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
        <a href="<?php echo e(url('/superadmin/signout')); ?>">
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

$totalTenants = $tns->count(); // ✅ Correct method
?>
                                        <div class="dropdown-menu dropdown-menu-xl dropdown-menu-end dropdown-menu-s1">
                                            <div class="dropdown-head">
                                                <span class="sub-title nk-dropdown-title">Notifications</span>
                                                <a ><?php echo e($totalTenants); ?></a>
                                            </div>
    
                                            <div class="dropdown-body">
                                                <div class="nk-notification">
                                                <?php $__currentLoopData = $tns; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $tn): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>

                                                    <div class="nk-notification-item dropdown-inner">
                                                        <div class="nk-notification-icon">
                                                            <em class="icon icon-circle bg-warning-dim ni ni-curve-down-right"></em>
                                                        </div>
                                                        <div class="nk-notification-content">
                                                            <div class="nk-notification-text"><?php echo e($tn->name); ?></div>
                                                            <div class="nk-notification-time"><?php echo e(\Carbon\Carbon::parse($tn->end)->diffInDays(now())); ?> days left</div>
                                                        </div>
                                                    </div>
                                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                                   
                                               
                                                </div><!-- .nk-notification -->
                                            </div><!-- .nk-dropdown-body -->
                                         
                                        </div>
                                    </li><!-- .dropdown -->
                                </ul><!-- .nk-quick-nav -->
                            </div><!-- .nk-header-tools -->
                        </div><!-- .nk-header-wrap -->
                    </div><!-- .container-fliud -->
                </div>
                <!-- content @s  -->
                <div class="nk-content ">
                    <div class="container-fluid">
                        <div class="nk-content-inner">
                            <div class="nk-content-body">
                                <div class="nk-block-head nk-block-head-sm">
                                    <div class="nk-block-between">
                                        <div class="nk-block-head-content">
                                            <h3 class="nk-block-title page-title tenants-heading">Restaurants List</h3>
                                            <div class="nk-block-des text-soft tenants-description">
                                            <p>You have a total of <span class="tenant-count"><?php echo e($tenants->total()); ?></span> Restaurants.</p>
                                            </div>
                                            
                                            <?php if(request('success') || request('error')): ?>
    <div class="custom-alert <?php echo e(request('success') ? 'success' : 'error'); ?>">
        <span><?php echo e(request('success') ?? request('error')); ?></span>
        <button class="close-alert" onclick="this.parentElement.style.display='none'">&times;</button>
    </div>
<?php endif; ?>




                                        </div><!-- .nk-block-head-content -->
                                        <div class="nk-block-head-content">
                                            <div class="toggle-wrap nk-block-tools-toggle">
                                                <a href="#" class="btn btn-icon btn-trigger toggle-expand me-n1" data-target="pageMenu"><em class="icon ni ni-menu-alt-r"></em></a>
                                                <div class="toggle-expand-content" data-content="pageMenu">
                                                    <ul class="nk-block-tools g-3">
                                                        <li class="nk-block-tools-opt">
                                                            <div class="drodown">
                                                                <a href="#" class="dropdown-toggle btn btn-icon btn-primary" data-bs-toggle="dropdown"><em class="icon ni ni-plus"></em></a>
                                                                <div class="dropdown-menu dropdown-menu-end">
                                                                    <ul class="link-list-opt no-bdr">
                                                                        <li><a data-bs-toggle="modal" href="#addCustomer"><span>Add Restaurant</span></a></li>
                                                                    </ul>
                                                                </div>
                                                            </div>
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
                                            <div class="card-inner position-relative card-tools-toggle">
                                                <div class="card-title-group">
                                                    <div class="card-tools">
                                                   
                                                    </div><!-- .card-tools -->
                                                    <div class="card-tools me-n1">
                                                        <ul class="btn-toolbar gx-1">
                                                            <li>
                                                                <!-- Settings Button - First -->
                                                                <div class="dropdown">
                                                                    <a href="#" class="btn btn-trigger btn-icon dropdown-toggle" data-bs-toggle="dropdown">
                                                                        <em class="icon ni ni-setting"></em>
                                                                    </a>
                                                                    <div class="dropdown-menu dropdown-menu-xs dropdown-menu-end">
                                                                        <ul class="link-check">
                                                                            <li><span>Order</span></li>
                                                                            <li><a href="#" class="order-by" data-value="DESC">DESC</a></li>
                                                                            <li><a href="#" class="order-by" data-value="ASC">ASC</a></li>
                                                                        </ul>
                                                                    </div>
                                                                </div><!-- .dropdown -->
                                                            </li><!-- li -->
                                                            <li class="btn-toolbar-sep"></li><!-- li -->
                                                            <li>
                                                                <!-- Add Restaurant Button - Second -->
                                                                <a href="#" class="btn btn-icon btn-primary" data-bs-toggle="modal" data-bs-target="#addCustomer">
                                                                    <em class="icon ni ni-plus"></em>
                                                                </a>
                                                            </li><!-- li -->
                                                            <li>
                                                                <div class="toggle-wrap">
                                                                    <a href="#" class="btn btn-icon btn-trigger toggle" data-target="cardTools"><em class="icon ni ni-menu-right"></em></a>
                                                                    <div class="toggle-content" data-content="cardTools">
                                                                        <ul class="btn-toolbar gx-1">
                                                                            <li class="toggle-close">
                                                                                <a href="#" class="btn btn-icon btn-trigger toggle" data-target="cardTools"><em class="icon ni ni-arrow-left"></em></a>
                                                                            </li><!-- li -->
                                                                            <li>
                                                                           
                                                                            </li><!-- li -->
                                                                            <li>

                                                                            </li><!-- li -->
                                                                        </ul><!-- .btn-toolbar -->
                                                                    </div><!-- .toggle-content -->
                                                                </div><!-- .toggle-wrap -->
                                                            </li><!-- li -->
                                                        </ul><!-- .btn-toolbar -->
                                                    </div><!-- .card-tools -->
                                                </div><!-- .card-title-group -->
                                             
                                            </div><!-- .card-inner -->
                                            <div class="card-inner p-0">
                                                <div class="nk-tb-list nk-tb-ulist">
                                                    <div class="nk-tb-item nk-tb-head">
                                                        <div class="nk-tb-col"><span class="sub-text">Restaurant</span></div>
                                                        <div class="nk-tb-col tb-col-lg"><span class="sub-text">Phone</span></div>
                                                        <div class="nk-tb-col tb-col-mb"><span class="sub-text">Restaurant Database</span></div>
                                                        <div class="nk-tb-col tb-col-md"><span class="sub-text">Domain</span></div>
                                                        <div class="nk-tb-col tb-col-md"><span class="sub-text">End date</span></div>
                                                        <div class="nk-tb-col nk-tb-col-tools text-end">
                                                          
                                                        </div>
                                                    </div>
                                                    <?php $__currentLoopData = $tenants; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $tenant): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                    <?php
                                                        $tenantStatus = DB::connection('mysql')->table('tenants')->where('id', $tenant->id)->value('status');
                                                        $isDisabled = ($tenantStatus !== 'active');
                                                    ?>

                                                    <!-- .nk-tb-item -->
                                                    <div class="nk-tb-item <?php echo e($isDisabled ? 'restaurant-disabled' : ''); ?>" data-status="<?php echo e($tenantStatus); ?>">
                                                        <div class="nk-tb-col">
                                                            <div class="user-card">
                                                                <div class="user-avatar bg-primary tenant-id-avatar">
                                                                    <span><?php echo e($tenant->id); ?></span>
                                                                </div>
                                                                <div class="user-info">
                                                                    <span class="tb-lead"><?php echo e($tenant->name); ?> <span class="dot dot-success d-md-none ms-1"></span></span>
                                                                    <span><?php echo e($tenant->email); ?></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="nk-tb-col tb-col-lg">
                                                            <span><?php echo e($tenant->phone); ?></span>
                                                        </div>
                                                        <div class="nk-tb-col tb-col-mb">
                                                            <span class="tb-amount"><?php echo e($tenant->database); ?> </span>
                                                        </div>
                                                        <div class="nk-tb-col tb-col-md">
                                                            <span class="tb-amount"><?php echo e($tenant->domain); ?> </span>
                                                        </div>
                                                    
                                                        <div class="nk-tb-col tb-col-md">
                                                            <span class="tb-status text-success"><?php echo e($tenant->end); ?></span>
                                                        </div>
                                                        <div class="nk-tb-col nk-tb-col-tools">
                                                            <ul class="nk-tb-actions gx-1">
                                                                <li>
                                                                    <div class="drodown">
                                                                        <a href="#" class="dropdown-toggle btn btn-icon btn-trigger" data-bs-toggle="dropdown"><em class="icon ni ni-more-h"></em></a>
                                                                        <div class="dropdown-menu dropdown-menu-end">
                                                                            <ul class="link-list-opt no-bdr">
                                                                                <!-- Send Email -->
                                                                                <li>
                                                                                    <a href="mailto:<?php echo e($tenant->email); ?>">
                                                                                        <em class="icon ni ni-mail-fill"></em>
                                                                                        <span>Send Email</span>
                                                                                    </a>
                                                                                </li>
                                                                                <!-- Activate/Disable -->
                                                                                <li>
                                                                                    <?php
                                                                                        $tenantStatus = DB::connection('mysql')->table('tenants')->where('id', $tenant->id)->value('status');
                                                                                        $isActive = ($tenantStatus === 'active');
                                                                                    ?>
                                                                                    <a href="javascript:void(0);" 
                                                                                        class="toggle-status" 
                                                                                        data-id="<?php echo e($tenant->id); ?>" 
                                                                                        data-status="<?php echo e($isActive ? 'disable' : 'activate'); ?>">
                                                                                        <em class="icon ni <?php echo e($isActive ? 'ni-user-cross' : 'ni-user-check'); ?>"></em>
                                                                                        <span><?php echo e($isActive ? 'Disable Restaurant' : 'Activate Restaurant'); ?></span>
                                                                                    </a>
                                                                                </li>
                                                                                <!-- Edit -->
                                                                                <li>
                                                                                    <a data-bs-toggle="modal"  
                                                                                        data-id="<?php echo e($tenant->id); ?>" 
                                                                                        data-name="<?php echo e($tenant->name); ?>" 
                                                                                        data-email="<?php echo e($tenant->email); ?>" 
                                                                                        data-phone="<?php echo e($tenant->phone); ?>" 
                                                                                        data-domain="<?php echo e($tenant->domain); ?>" 
                                                                                        data-start="<?php echo e($tenant->start); ?>" 
                                                                                        data-end="<?php echo e($tenant->end); ?>"
                                                                                        data-type="<?php echo e($tenant->type); ?>" 
                                                                                        data-description="<?php echo e($tenant->description); ?>"
                                                                                        data-country="<?php echo e($tenant->country); ?>"
                                                                                        href="#editCustomer">
                                                                                        <em class="icon ni ni-edit"></em>
                                                                                        <span>Edit Restaurant</span>
                                                                                    </a>
                                                                                </li>
                                                                                <!-- Delete -->
                                                                                <li>
                                                                                    <a href="javascript:void(0);" 
                                                                                        class="delete-button"
                                                                                        data-url="<?php echo e(url('/tenants/delete/' . $tenant->id)); ?>">
                                                                                        <em class="icon ni ni-trash"></em>
                                                                                        <span>Delete Restaurant</span>
                                                                                    </a>
                                                                                </li>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
 
                                                </div><!-- .nk-tb-list -->
                                            </div><!-- .card-inner -->
                                            <div class="card-inner">
                                                <div class="nk-block-between-md g-3">
                                                    <div class="g">
                                                    <ul class="pagination justify-content-center justify-content-md-start">
    <!-- Prev Button -->
    <?php if($tenants->onFirstPage()): ?>
        <li class="page-item disabled"><span class="page-link">Prev</span></li>
    <?php else: ?>
        <li class="page-item"><a class="page-link" href="<?php echo e($tenants->previousPageUrl()); ?>">Prev</a></li>
    <?php endif; ?>

    <!-- Page Numbers -->
    <?php $__currentLoopData = $tenants->getUrlRange(1, $tenants->lastPage()); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php if($page == $tenants->currentPage()): ?>
            <li class="page-item active"><span class="page-link"><?php echo e($page); ?></span></li>
        <?php else: ?>
            <li class="page-item"><a class="page-link" href="<?php echo e($url); ?>"><?php echo e($page); ?></a></li>
        <?php endif; ?>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

    <!-- Next Button -->
    <?php if($tenants->hasMorePages()): ?>
        <li class="page-item"><a class="page-link" href="<?php echo e($tenants->nextPageUrl()); ?>">Next</a></li>
    <?php else: ?>
        <li class="page-item disabled"><span class="page-link">Next</span></li>
    <?php endif; ?>
</ul><!-- .pagination -->

                                                    </div>
                                                 
                                                </div><!-- .nk-block-between -->
                                            </div><!-- .card-inner -->
                                        </div><!-- .card-inner-group -->
                                    </div><!-- .card -->
                                </div><!-- .nk-block -->
                            </div>
                        </div>
                    </div>
                </div>
                <!-- content @e  -->
         
                <!-- footer @e  -->
            </div>
            <!-- wrap @e  -->
        </div>
        <!-- main @e  -->
    </div>
    <!-- app-root @e  -->
    
        </div><!-- .modla-dialog -->
    </div><!-- .modal -->
    <div class="modal fade" id="editCustomer">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <a href="#" class="close" data-bs-dismiss="modal" aria-label="Close">
                    <em class="icon ni ni-cross-sm"></em>
                </a>
                <div class="modal-body modal-body-md">
                    <h5 class="modal-title">Edit Restaurant </h5>
                    <form action="#" method="POST" class="mt-2" id="editTenantForm">
                        
                    <?php echo csrf_field(); ?>
                        <div class="row g-gs">
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="edit-name">Restaurant Name</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="name"  class="form-control" id="edit-name" required>
                                    </div>
                                </div>
                            </div>
                            <input type="hidden" name="id" id="edit-tenant-id">

                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="edit-email">Email</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="email"  class="form-control" id="edit-email" value="Tenant@gmail.com" required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="edit-phone">Phone</label>
                                    <div class="form-control-wrap">
                                        <input type="text"  name="phone" class="form-control" id="edit-phone" value="+342 675-6578" required>
                                    </div>
                                </div>
                            </div>
                           
                          
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="edit-billing-address">Restaurant Domain</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="domain" class="form-control" id="edit-billing-address" value="Tenant.com" required>
                                    </div>
                                </div>
                            </div>
                                                        <div class="col-12">

                            <div class="date-container">
    <label for="start">Start Date:</label>
    <input type="date" name="start" id="start" class="start-date" required>

    <label for="end">End Date:</label>
    <input type="date"  name="end" id="end" class="end-date" required>
</div>
</div>
                           
<div class="col-12">
    <div class="form-group">
        <label class="form-label">Type</label>
        <ul class="custom-control-group g-3 align-center">
            <li>
                <div class="custom-control custom-radio">
                    <input type="radio" id="edit-people" name="type" class="custom-control-input" required>
                    <label class="custom-control-label" for="edit-people">People</label>
                </div>
            </li>
            <li>
                <div class="custom-control custom-radio">
                    <input type="radio" id="edit-org" name="type" class="custom-control-input" required>
                    <label class="custom-control-label" for="edit-org">Organization</label>
                </div>
            </li>
        </ul>
    </div>
</div>

                            <div class="col-12">
    <div class="form-group">
        <label class="form-label" for="edit-description">Description</label>
        <div class="form-control-wrap">
            <textarea name="description" class="form-control" id="edit-description" rows="4" placeholder="Enter description..." required></textarea>
        </div>
    </div>
</div>
<div class="col-12">
    <div class="form-group">
        <label class="form-label" for="edit-country">Country</label>
        <div class="form-control-wrap">
            <input type="text" name="country" class="form-control" id="edit-country" placeholder="Enter country..." maxlength="255" required>
        </div>
    </div>
</div>


                            <div class="col-12">
                                <div class="form-group">
                                    <button  type="submit" class="btn btn-primary">Update Restaurant</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div><!-- .Edit Modal-Content -->
    <div class="modal fade" id="addCustomer">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <a href="#" class="close" data-bs-dismiss="modal" aria-label="Close">
                    <em class="icon ni ni-cross-sm"></em>
                </a>
                <div class="modal-body modal-body-md">
                    <h5 class="modal-title">Add New Restaurant</h5>
                    <form action="<?php echo e(url('/new/store')); ?>" method="POST" class="mt-2">
                         <?php echo csrf_field(); ?>
                        <div class="row g-gs">
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="add-name"> Restaurant Name</label>
                                    <div class="form-control-wrap">
                                        <input type="text" class="form-control" name="name" id="add-name" placeholder="e.g.Tenant 1"required>
                                    </div>
                                </div>
                            </div>

                            
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="add-email">Email</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="email" class="form-control" id="add-email" placeholder="e.g.Tenant@gmail.com"required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="add-phone">Phone</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="phone" class="form-control" id="add-phone" placeholder="e.g.+463 471-7173"required>
                                    </div>
                                </div>
                            </div>
                          
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="shipping-address">Restaurant Database</label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="database" class="form-control" id="shipping-address" placeholder="e.g.dbTenant"required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="form-group">
                                    <label class="form-label" for="billing-address">Restaurant Domain </label>
                                    <div class="form-control-wrap">
                                        <input type="text" name="domain" class="form-control" id="billing-address" placeholder="e.g.Tenant.com" required>
                                    </div>
                                </div>
                            </div>
                                                                        <div class="col-12">

                            <div class="date-container">
    <label for="start">Start Date:</label>
    <input type="date" name="start" id="start" class="start-date" required>

    <label for="end">End Date:</label>
    <input type="date" name="end" id="end" class="end-date" required>
</div>
</div>
                          
<div class="col-12">
    <div class="form-group">
        <label class="form-label">Type</label>
        <ul class="custom-control-group g-3 align-center">
            <li>
                <div class="custom-control custom-radio">
                    <input type="radio" id="people" name="type" value="People" class="custom-control-input"required >
                    <label class="custom-control-label" for="people">People</label>
                </div>
            </li>
            <li>
                <div class="custom-control custom-radio">
                    <input type="radio" id="org" name="type" value="Organization" class="custom-control-input" required>
                    <label class="custom-control-label" for="org">Organization</label>
                </div>
            </li>
        </ul>
    </div>
</div>
<div class="col-12">
    <div class="form-group">
        <label class="form-label" for="edit-description">Description</label>
        <div class="form-control-wrap">
            <textarea name="description" class="form-control" id="edit-description" rows="4" placeholder="Enter description..."required></textarea>
        </div>
    </div>
</div>
<div class="col-12">
    <div class="form-group">
        <label class="form-label" for="edit-country">Country</label>
        <div class="form-control-wrap">
            <input type="text" name="country" class="form-control" id="edit-country" placeholder="Enter country..." maxlength="255"required>
        </div>
    </div>
</div>
                    <div class="col-12">
                                <div class="form-group">
                                    <button  type="submit" class="btn btn-primary">Add Restaurant</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div><!-- .Add Modal-Content -->
    <!-- JavaScript -->
    
    <script src="<?php echo e(asset('app/admin/assets/js/bundle.js?ver=3.2.3')); ?>"></script>
   
    <script src=" <?php echo e(asset('app/admin/assets/js/scripts.js?ver=3.2.3')); ?>"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll('a[data-bs-toggle="modal"]').forEach(button => {
        button.addEventListener("click", function () {
            let modal = document.getElementById("editCustomer");
            
            // Set form action dynamically
            let form = document.getElementById("editTenantForm");
            let tenantId = this.getAttribute("data-id");
            form.action = `<?php echo e(url('/tenants/update')); ?>`;
            document.getElementById("edit-tenant-id").value = tenantId;

            // Populate fields
            document.getElementById("edit-name").value = this.getAttribute("data-name");
            document.getElementById("edit-email").value = this.getAttribute("data-email");
            document.getElementById("edit-phone").value = this.getAttribute("data-phone");
            document.getElementById("edit-billing-address").value = this.getAttribute("data-domain");
            document.getElementById("start").value = this.getAttribute("data-start");
            document.getElementById("end").value = this.getAttribute("data-end");
            document.getElementById("edit-description").value = this.getAttribute("data-description");
            document.getElementById("edit-country").value = this.getAttribute("data-country");

            // Set Type (radio button)
            let type = this.getAttribute("data-type");
            document.getElementById("edit-people").checked = type === "People";
            document.getElementById("edit-org").checked = type === "Organization";
        });
    });
});
</script>

<script>
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".delete-button").forEach(button => {
        button.addEventListener("click", function () {
            const deleteUrl = this.getAttribute("data-url");

            Swal.fire({
                title: "Are you sure?",
                text: "This action cannot be undone!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#e3342f",
                cancelButtonColor: "#aaa",
                confirmButtonText: "Yes, delete it!"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = deleteUrl;
                }
            });
        });
    });
});
</script>
<script>
document.addEventListener("DOMContentLoaded", function () {
    // Handle per-page selection
    document.querySelectorAll(".per-page").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const perPage = this.getAttribute("data-value");
            updateQueryParam("per_page", perPage);
        });
    });

    // Handle order selection
    document.querySelectorAll(".order-by").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const order = this.getAttribute("data-value");
            updateQueryParam("order", order);
        });
    });

    // Function to update URL parameters and reload page
    function updateQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.location.href = url.toString();
    }
});
</script>
<script>

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        document.querySelectorAll(".custom-alert").forEach(alert => {
            alert.style.display = "none";
        });
    }, 5000); // Hides after 5 seconds
});

</script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".toggle-status").forEach(button => {
        button.addEventListener("click", function() {
            let tenantId = this.dataset.id;
            let newStatus = this.dataset.status; // 'activate' or 'disable'
            
            console.log(`Clicked: Tenant ID = ${tenantId}, New Status = ${newStatus}`); // Debugging

            fetch("<?php echo e(url('/tenant/update-status')); ?>", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').getAttribute("content"),
                },
                body: JSON.stringify({ id: tenantId, status: newStatus })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(`Success: Status changed to ${newStatus}`);

                    // Get the button element and the table row
                    let button = this;
                    let icon = button.querySelector("em");
                    let span = button.querySelector("span");
                    let tableRow = button.closest('.nk-tb-item');

                    // Toggle status and update UI
                    if (newStatus === "disable") {
                        button.dataset.status = "activate";
                        icon.className = "icon ni ni-user-check";
                        span.textContent = "Activate Restaurant";
                        // Add disabled class to table row (red effect)
                        tableRow.classList.add('restaurant-disabled');
                        tableRow.setAttribute('data-status', 'disabled');
                    } else {
                        button.dataset.status = "disable";
                        icon.className = "icon ni ni-user-cross";
                        span.textContent = "Disable Restaurant";
                        // Remove disabled class from table row
                        tableRow.classList.remove('restaurant-disabled');
                        tableRow.setAttribute('data-status', 'active');
                    }
                    
                    // Show success message
                    console.log("Status updated successfully!");
                } else {
                    console.error("Server Error:", data.error);
                    alert("Error updating status!");
                }
            })
            .catch(error => {
                console.error("Fetch Error:", error);
                alert("Error updating status!");
            });
        });
    });
});

</script>
</body>

</html>


<?php /**PATH /Users/amir/Downloads/paymydine-main/app/admin/views/new.blade.php ENDPATH**/ ?>