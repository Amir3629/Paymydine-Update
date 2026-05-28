@php
    $pmdLoginLogoPath = base_path('assets/media/uploads/Paymydinelogo.png');
    $pmdLoginLogoUrl = file_exists($pmdLoginLogoPath)
        ? asset('assets/media/uploads/Paymydinelogo.png')
        : asset('images/logo.png');
@endphp
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
         :root {
             --pmd-login-bg: #FAF9F4;
             --pmd-login-surface: #FFFFFF;
             --pmd-login-border: #E8E2D8;
             --pmd-login-text: #0D1B1E;
             --pmd-login-muted: #6B7280;
             --pmd-login-jade: #062F2A;
             --pmd-login-jade-dark: #021F1C;
             --pmd-login-gold: #C89B4A;
             --pmd-login-gold-soft: #F5E8D0;
             --pmd-login-danger: #B42318;
             --pmd-login-shadow: 0 8px 24px rgba(6, 47, 42, 0.06);
         }

         html,
         body.pg-auth,
         .nk-body.pg-auth,
         .nk-app-root,
         .nk-main,
         .nk-wrap,
         .nk-content,
         .nk-split {
             min-height: 100%;
             background: var(--pmd-login-bg) !important;
             color: var(--pmd-login-text) !important;
         }

         body.pg-auth {
             font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         }

         .nk-split-page {
             min-height: 100vh;
             align-items: center;
             justify-content: center;
             padding: 28px 16px;
         }

         .nk-auth-container {
             width: min(100%, 940px) !important;
             min-height: auto !important;
             margin: 0 auto !important;
             padding: 34px !important;
             border: 1px solid var(--pmd-login-border) !important;
             border-radius: 28px !important;
             background: var(--pmd-login-surface) !important;
             box-shadow: var(--pmd-login-shadow) !important;
         }

         .nk-auth-body {
             width: 100%;
             max-width: 100% !important;
             margin: 0 !important;
         }

         .brand-logo {
             width: 100%;
             display: flex;
             justify-content: center;
             padding-bottom: 24px !important;
             text-align: center;
         }

         .brand-logo .logo-link {
             width: min(100%, 860px);
             min-height: 0;
             display: flex;
             align-items: center;
             justify-content: center;
             padding: 0;
             border: 0;
             border-radius: 0;
             background: transparent;
             box-shadow: none;
             overflow: visible;
         }

         .brand-logo .logo-img {
             display: block;
             width: min(100%, 820px) !important;
             height: auto !important;
             max-width: none !important;
             max-height: 310px !important;
             margin: 0 auto;
             object-fit: contain;
             transform: scale(1.18);
             transform-origin: center center;
         }

         .brand-logo .logo-dark {
             display: none !important;
         }

         .nk-block-title {
             color: var(--pmd-login-text) !important;
             font-size: 1.35rem !important;
             font-weight: 800 !important;
             letter-spacing: -0.02em;
             text-align: center;
         }

         .nk-block-des p,
         .form-label,
         .form-label-group,
         .nk-auth-container .text-right {
             color: var(--pmd-login-muted) !important;
         }

         .nk-block-des p {
             text-align: center;
         }

         .form-label {
             font-weight: 700 !important;
         }

         .form-control,
         .form-control-lg {
             min-height: 48px;
             border: 1px solid var(--pmd-login-border) !important;
             border-radius: 14px !important;
             background: var(--pmd-login-surface) !important;
             color: var(--pmd-login-text) !important;
             box-shadow: none !important;
         }

         .form-control:focus,
         .form-control-lg:focus {
             border-color: var(--pmd-login-gold) !important;
             box-shadow: 0 0 0 0.18rem rgba(200, 155, 74, 0.18) !important;
         }

         .form-control::placeholder {
             color: #9CA3AF !important;
         }

         .passcode-switch,
         .passcode-switch em {
             color: var(--pmd-login-muted) !important;
         }

         .btn.btn-primary,
         .btn.btn-primary:focus {
             min-height: 48px;
             border: 1px solid var(--pmd-login-jade) !important;
             border-radius: 14px !important;
             background: var(--pmd-login-jade) !important;
             color: #FFFFFF !important;
             font-weight: 800 !important;
             box-shadow: 0 8px 22px rgba(6, 47, 42, 0.16) !important;
         }

         .btn.btn-primary:hover,
         .btn.btn-primary:active {
             border-color: var(--pmd-login-jade-dark) !important;
             background: var(--pmd-login-jade-dark) !important;
             color: #FFFFFF !important;
         }

         .nk-auth-container .form-group a,
         .pg-auth .form-group a,
         .nk-auth-container .text-right a,
         .pg-auth .text-right a {
             color: var(--pmd-login-jade) !important;
             font-weight: 700;
         }

         .nk-auth-container .form-group a:hover,
         .pg-auth .form-group a:hover,
         .nk-auth-container .text-right a:hover,
         .pg-auth .text-right a:hover {
             color: var(--pmd-login-gold) !important;
         }

         .text-danger {
             color: var(--pmd-login-danger) !important;
         }

         .bg-abstract,
         .nk-split-stretch.bg-abstract {
             display: none !important;
         }

         @media (max-width: 575.98px) {
             .nk-split-page {
                 padding: 18px 12px;
             }

             .nk-auth-container {
                 padding: 24px 18px !important;
                 border-radius: 22px !important;
             }

             .brand-logo .logo-link {
                 width: min(100%, 460px);
             }

             .brand-logo .logo-img {
                 width: min(100%, 460px) !important;
                 max-height: 185px !important;
                 transform: scale(1.12);
             }
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
                                    <img class="logo-light logo-img" src="{{ $pmdLoginLogoUrl }}" alt="PayMyDine logo">
                                    <img class="logo-dark logo-img" src="{{ $pmdLoginLogoUrl }}" alt="PayMyDine logo">
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
                                        <a href="{{ admin_url('login/reset') }}">
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

