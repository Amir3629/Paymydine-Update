<!DOCTYPE html>
<html lang="zxx" class="js">

<head>
    <base href="../../../">
    <meta charset="utf-8">
    <meta name="author" content="Softnio">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="A powerful and conceptual apps base dashboard template that especially build for developers and programmers.">
    <!-- Fav Icon  -->
    <link rel="shortcut icon" href="./images/favicon.svg">
    <!-- Page Title  -->
    <title>Login | {{setting('site_name')}}</title>
     <!-- StyleSheets  -->
     <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dashboard.css') }}?ver={{ time() }}">
     <link id="skin-default" rel="stylesheet" href="./assets/css/theme.css?ver=3.2.3">
     <meta name="csrf-token" content="{{ csrf_token() }}">
     <style>
         /* Ensure forgot password link is dark blue, not green */
         .nk-auth-container .form-group a,
         .pg-auth .form-group a,
         .nk-auth-container .text-right a,
         .pg-auth .text-right a {
             color: #364a63 !important;
         }
         .nk-auth-container .form-group a:hover,
         .pg-auth .form-group a:hover,
         .nk-auth-container .text-right a:hover,
         .pg-auth .text-right a:hover {
             color: #526484 !important;
         }
     </style>
</head>

<body class="nk-body bg-white npc-general pg-auth">
    <div class="nk-app-root">
        <!-- main @s -->
        <div class="nk-main ">
            <!-- wrap @s -->
            <div class="nk-wrap nk-wrap-nosidebar">
                <!-- content @s -->
                <div class="nk-content ">
                    <div class="nk-split nk-split-page nk-split-md">
                        <div class="nk-split-content nk-block-area nk-block-area-column nk-auth-container bg-white">
                            <div class="nk-block nk-block-middle nk-auth-body">
                                <div class="brand-logo pb-5">
                                    <a href="{{ admin_url('dashboard') }}" class="logo-link">
                                    <img class="logo-light logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo">
                                    <img class="logo-dark logo-img" src="./images/logo.png" srcset="./images/logo.png" alt="logo-dark">
                                    </a>
                                </div>
                                <div class="nk-block-head">
                                    <div class="nk-block-head-content">
                                        <h5 class="nk-block-title">@lang('admin::lang.login.text_title')</h5>
                                        <div class="nk-block-des">
                                            <p>Access using your username and password.</p>
                                        </div>
                                    </div>
                                </div><!-- .nk-block-head -->
                                
                                {!! form_open([
                                    'id' => 'edit-form',
                                    'role' => 'form',
                                    'method' => 'POST',
                                    'data-request' => 'onLogin',
                                ]) !!}

                                <div class="form-group">
                                    <div class="form-label-group">
                                        <label class="form-label" for="input-username">@lang('admin::lang.login.label_username')</label>
                                    </div>
                                    <div class="form-control-wrap">
                                        <input 
                                            type="text" 
                                            name="username" 
                                            id="input-username" 
                                            class="form-control form-control-lg" 
                                            placeholder="Enter your username"
                                            value="{{ old('username') }}"
                                        />
                                    </div>
                                    {!! form_error('username', '<span class="text-danger">', '</span>') !!}
                                </div><!-- .form-group -->
                                
                                <div class="form-group">
                                    <div class="form-label-group">
                                        <label class="form-label" for="input-password">@lang('admin::lang.login.label_password')</label>
                                    </div>
                                    <div class="form-control-wrap">
                                        <a tabindex="-1" href="#" class="form-icon form-icon-right passcode-switch lg" data-target="input-password">
                                            <em class="passcode-icon icon-show icon ni ni-eye"></em>
                                            <em class="passcode-icon icon-hide icon ni ni-eye-off"></em>
                                        </a>
                                        <input 
                                            type="password" 
                                            name="password" 
                                            id="input-password" 
                                            class="form-control form-control-lg" 
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                    {!! form_error('password', '<span class="text-danger">', '</span>') !!}
                                </div><!-- .form-group -->
                                
                                <div class="form-group">
                                    <button type="submit" class="btn btn-lg btn-primary btn-block" data-attach-loading="">
                                        <i class="fa fa-sign-in fa-fw"></i>&nbsp;&nbsp;&nbsp;@lang('admin::lang.login.button_login')
                                    </button>
                                </div>

                                <div class="form-group">
                                    <p class="text-right">
                                        <a href="{{ admin_url('login/reset') }}" style="color: #364a63 !important;">
                                            @lang('admin::lang.login.text_forgot_password')
                                        </a>
                                    </p>
                                </div>

                                {!! form_close() !!}
                                
                            </div><!-- .nk-block -->
                        </div><!-- .nk-split-content -->
                        <div class="nk-split-content nk-split-stretch bg-abstract"></div><!-- .nk-split-content -->
                    </div><!-- .nk-split -->
                </div>
                <!-- wrap @e -->
            </div>
            <!-- content @e -->
        </div>
        <!-- main @e -->
    </div>
    <!-- app-root @e -->
    <!-- JavaScript -->
    <script src="{{ asset('app/admin/assets/js/bundle.js?ver=3.2.3') }}"></script>
    <script src="{{ asset('app/admin/assets/js/scripts.js?ver=3.2.3') }}"></script>
    <script src="{{ asset('app/admin/assets/js/admin.js') }}"></script>
    
    <!-- Include admin JS for form handling -->
    <script>
        // Set up CSRF token for AJAX requests
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });
    </script>
</body>
</html>

