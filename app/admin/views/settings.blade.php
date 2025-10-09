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
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dashboard.css') }}?ver=3.2.3">

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
                                        <span class="nk-menu-text">Tenants</span>
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
                        <div class="nk-menu-trigger d-xl-none ms-n1">
                            <a href="#" class="nk-nav-toggle nk-quick-nav-icon" data-target="sidebarMenu"><em class="icon ni ni-menu"></em></a>
                        </div>
                        <div class="nk-header-brand d-xl-none">
                            <a href="/superadmin/index" class="logo-link">
                                <img class="logo-light logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo">
                                <img class="logo-dark logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo-dark">
                              </a>
                        </div><!-- .nk-header-brand -->
                       
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
                <!-- content @s -->
                <div class="nk-content ">
                    <div class="container-fluid">
                        <div class="nk-content-inner">
                            <div class="nk-content-body">
                                <div class="nk-block-head nk-block-head-sm">
                                    <div class="nk-block-between">
                                        <div class="nk-block-head-content">
                                            <h3 class="nk-block-title tenants-heading">Settings</h3>
                                        </div><!-- .nk-block-head-content -->
                                    </div><!-- .nk-block-between -->
                                </div><!-- .nk-block-head -->
                                <div class="nk-block nk-block-lg">
                                    <div class="card card-bordered card-stretch">
                                        <ul class="nav nav-tabs nav-tabs-mb-icon nav-tabs-card">
                                            <li class="nav-item">
                                                <a class="nav-link active" data-bs-toggle="tab" href="#site"><em class="icon ni ni-laptop"></em><span>General settings</span></a>
                                            </li>
                                            
                                        </ul>
                                        <div class="tab-content">
                                            <div class="tab-pane active" id="site">
                                                <div class="card-inner pt-0">
                                                    <h4 class="title nk-block-title">General setting</h4>
                                                    <p>Here is your basic store setting of your app.</p>
                                                    <form action="{{ url('/superadmin/settings/update') }}" method="POST" class="gy-3 form-settings">
                                                    @csrf

                                                        <div class="row g-3 align-center">
                                                            <div class="col-lg-5">
                                                                <div class="form-group">
                                                                    <label class="form-label" for="comp-name">Company Name</label>
                                                                    <span class="form-note">Specify the name of your Company.</span>
                                                                </div>
                                                            </div>
                                                            <div class="col-lg-7">
                                                                <div class="form-group">
                                                                    <div class="form-control-wrap">
                                                                        <input type="text" name="company_name" class="form-control" id="comp-name" value="{{ old('company_name', $superadmin->company_name) }}">
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="row g-3 align-center">
                                                            <div class="col-lg-5">
                                                                <div class="form-group">
                                                                    <label class="form-label" for="comp-email">Company Email</label>
                                                                    <span class="form-note">Specify the email address of your Company.</span>
                                                                </div>
                                                            </div>
                                                            <div class="col-lg-7">
                                                                <div class="form-group">
                                                                    <div class="form-control-wrap">
                                                                        <input type="text" name="email"  class="form-control" id="comp-email"value="{{ old('email', $superadmin->email) }}" >
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                      
                                                     
                                                        <div class="row g-3 align-center">
                                                            <div class="col-lg-5">
                                                                <div class="form-group">
                                                                    <label class="form-label">Main Website</label>
                                                                    <span class="form-note">Specify the URL if your main website is external.</span>
                                                                </div>
                                                            </div>
                                                            <div class="col-lg-7">
                                                                <div class="form-group">
                                                                    <div class="form-control-wrap">
                                                                        <input type="text" name="company_website" class="form-control" name="site-url"  value="{{ old('company_website', $superadmin->company_website) }}">
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    
                                                     
                                                        <div class="row g-3">
                                                            <div class="col-lg-7">
                                                                <div class="form-group mt-2">
                                                                    <button type="submit" class="btn btn-lg btn-primary">Update</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                    </div><!--card-->
                                </div><!--nk-block-->
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
    <!-- select region modal -->
   
    <!-- JavaScript -->
    <script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
   
   <script src=" {{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
</body>

</html>