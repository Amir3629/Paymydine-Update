@php
    $pmdLoginLogoOriginalPath = base_path('assets/media/uploads/Paymydinelogo.png');
    $pmdLoginLogoTrimmedPath = base_path('assets/media/uploads/Paymydinelogo-login.png');

    $pmdLoginLogoUrl = file_exists($pmdLoginLogoTrimmedPath)
        ? asset('assets/media/uploads/Paymydinelogo-login.png')
        : (file_exists($pmdLoginLogoOriginalPath)
            ? asset('assets/media/uploads/Paymydinelogo.png')
            : asset('images/logo.png'));

    // PMD_LOGIN_LOGO_V58_START
    $pmdLoginLogoCandidateV58Path = base_path('app/admin/assets/images/pmd-logo-final.png');
    if (file_exists($pmdLoginLogoCandidateV58Path)) {
        $pmdLoginLogoUrl = asset('app/admin/assets/images/pmd-logo-final.png');
        $pmdLoginLogoVersion = filemtime($pmdLoginLogoCandidateV58Path);
    }
    // PMD_LOGIN_LOGO_V58_END
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



         /* PMD real login logo fix: cropped asset, centered logo, normal card */
         .nk-auth-container {
             width: min(100%, 620px) !important;
             max-width: 620px !important;
             padding: 44px 42px 42px !important;
         }

         .nk-auth-body {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
             justify-content: center !important;
         }

         .brand-logo,
         .brand-logo.pb-5 {
             width: 100% !important;
             display: flex !important;
             justify-content: center !important;
             align-items: center !important;
             padding: 0 !important;
             margin: 0 auto 34px auto !important;
             text-align: center !important;
         }

         .brand-logo .logo-link {
             width: 100% !important;
             max-width: 100% !important;
             display: flex !important;
             justify-content: center !important;
             align-items: center !important;
             padding: 0 !important;
             margin: 0 auto !important;
             border: 0 !important;
             border-radius: 0 !important;
             background: transparent !important;
             box-shadow: none !important;
             overflow: visible !important;
             text-align: center !important;
         }

         .brand-logo .pmd-login-main-logo,
         .brand-logo img.pmd-login-main-logo {
             display: block !important;
             width: auto !important;
             height: auto !important;
             max-width: min(92vw, 360px) !important;
             max-height: 180px !important;
             margin: 0 auto !important;
             object-fit: contain !important;
             object-position: center center !important;
             transform: scale(1.28) !important;
             transform-origin: center center !important;
             position: static !important;
         }

         .brand-logo .logo-img,
         .brand-logo .logo-light,
         .brand-logo .logo-dark {
             max-width: none !important;
         }

         .nk-block-head,
         .nk-auth-body form {
             width: min(100%, 430px) !important;
             margin-left: auto !important;
             margin-right: auto !important;
         }

         @media (max-width: 575.98px) {
             .nk-auth-container {
                 width: min(100%, 94vw) !important;
                 padding: 34px 20px 32px !important;
             }

             .brand-logo,
             .brand-logo.pb-5 {
                 margin-bottom: 28px !important;
             }

             .brand-logo .pmd-login-main-logo,
             .brand-logo img.pmd-login-main-logo {
                 max-width: min(88vw, 310px) !important;
                 max-height: 150px !important;
                 transform: scale(1.18) !important;
             }
         }


         /* PMD emergency final override: visually bigger centered login logo + compact card */
         .nk-split-page {
             padding: 18px 16px !important;
         }

         .nk-auth-container,
         .nk-split-content.nk-auth-container {
             width: min(100%, 540px) !important;
             max-width: 540px !important;
             min-height: auto !important;
             padding: 30px 34px 34px !important;
             border-radius: 24px !important;
         }

         .nk-auth-body {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
         }

         .brand-logo,
         .brand-logo.pb-5 {
             width: 100% !important;
             height: 150px !important;
             min-height: 150px !important;
             max-height: 150px !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto 6px auto !important;
             text-align: center !important;
         }

         .brand-logo .logo-link {
             width: 360px !important;
             height: 150px !important;
             max-width: 100% !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto !important;
             background: transparent !important;
             border: 0 !important;
             box-shadow: none !important;
         }

         .brand-logo .pmd-login-main-logo,
         .brand-logo img.pmd-login-main-logo {
             display: block !important;
             width: 260px !important;
             max-width: 260px !important;
             height: auto !important;
             max-height: 120px !important;
             object-fit: contain !important;
             object-position: center center !important;
             margin: 0 auto !important;
             position: static !important;
             transform: scale(2.35) !important;
             transform-origin: center center !important;
             will-change: transform !important;
         }

         .nk-block-head {
             width: min(100%, 430px) !important;
             margin: 0 auto 22px auto !important;
             padding: 0 !important;
         }

         .nk-block-title {
             margin-top: 0 !important;
             margin-bottom: 8px !important;
         }

         .nk-block-des {
             margin-bottom: 0 !important;
         }

         .nk-auth-body form {
             width: min(100%, 430px) !important;
             margin: 0 auto !important;
         }

         @media (max-width: 575.98px) {
             .nk-split-page {
                 padding: 14px 10px !important;
             }

             .nk-auth-container,
             .nk-split-content.nk-auth-container {
                 width: min(100%, 92vw) !important;
                 max-width: 92vw !important;
                 padding: 24px 18px 28px !important;
                 border-radius: 22px !important;
             }

             .brand-logo,
             .brand-logo.pb-5 {
                 height: 130px !important;
                 min-height: 130px !important;
                 max-height: 130px !important;
                 margin-bottom: 4px !important;
             }

             .brand-logo .logo-link {
                 width: 320px !important;
                 height: 130px !important;
             }

             .brand-logo .pmd-login-main-logo,
             .brand-logo img.pmd-login-main-logo {
                 width: 220px !important;
                 max-width: 220px !important;
                 max-height: 100px !important;
                 transform: scale(2.15) !important;
             }
         }


         /* PMD FINAL login logo override: 50 percent bigger + centered + less empty gap */
         body.pg-auth .nk-split-page {
             padding: 18px 16px !important;
         }

         body.pg-auth .nk-auth-container,
         body.pg-auth .nk-split-content.nk-auth-container {
             width: min(100%, 500px) !important;
             max-width: 500px !important;
             min-height: auto !important;
             padding: 26px 34px 32px !important;
             border-radius: 24px !important;
         }

         body.pg-auth .nk-auth-body {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
             justify-content: flex-start !important;
         }

         body.pg-auth .brand-logo,
         body.pg-auth .brand-logo.pb-5 {
             width: 100% !important;
             height: 128px !important;
             min-height: 128px !important;
             max-height: 128px !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto 2px auto !important;
             text-align: center !important;
         }

         body.pg-auth .brand-logo .logo-link {
             width: 360px !important;
             height: 128px !important;
             max-width: 100% !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto !important;
             background: transparent !important;
             border: 0 !important;
             border-radius: 0 !important;
             box-shadow: none !important;
             text-align: center !important;
         }

         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             display: block !important;
             width: 260px !important;
             max-width: 260px !important;
             height: auto !important;
             max-height: 120px !important;
             object-fit: contain !important;
             object-position: center center !important;
             margin: 0 auto !important;
             position: static !important;
             transform: scale(3.55) !important;
             transform-origin: center center !important;
             will-change: transform !important;
         }

         body.pg-auth .nk-block-head {
             width: min(100%, 430px) !important;
             margin: -4px auto 20px auto !important;
             padding: 0 !important;
         }

         body.pg-auth .nk-block-title {
             margin-top: 0 !important;
             margin-bottom: 8px !important;
         }

         body.pg-auth .nk-block-des {
             margin-bottom: 0 !important;
         }

         body.pg-auth .nk-auth-body form {
             width: min(100%, 430px) !important;
             margin: 0 auto !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .nk-auth-container,
             body.pg-auth .nk-split-content.nk-auth-container {
                 width: min(100%, 92vw) !important;
                 max-width: 92vw !important;
                 padding: 22px 18px 28px !important;
             }

             body.pg-auth .brand-logo,
             body.pg-auth .brand-logo.pb-5 {
                 height: 118px !important;
                 min-height: 118px !important;
                 max-height: 118px !important;
                 margin-bottom: 0 !important;
             }

             body.pg-auth .brand-logo .logo-link {
                 width: 320px !important;
                 height: 118px !important;
             }

             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 width: 230px !important;
                 max-width: 230px !important;
                 max-height: 105px !important;
                 transform: scale(3.15) !important;
             }

             body.pg-auth .nk-block-head {
                 margin-top: -2px !important;
             }
         }


         /* PMD REAL FINAL login logo size: centered, bigger, no overlap */
         body.pg-auth .nk-split-page {
             padding: 18px 16px !important;
         }

         body.pg-auth .nk-auth-container,
         body.pg-auth .nk-split-content.nk-auth-container {
             width: min(100%, 500px) !important;
             max-width: 500px !important;
             min-height: auto !important;
             padding: 28px 34px 34px !important;
             border-radius: 24px !important;
         }

         body.pg-auth .nk-auth-body {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
             justify-content: flex-start !important;
         }

         body.pg-auth .brand-logo,
         body.pg-auth .brand-logo.pb-5 {
             width: 100% !important;
             height: 210px !important;
             min-height: 210px !important;
             max-height: 210px !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto 8px auto !important;
             text-align: center !important;
         }

         body.pg-auth .brand-logo .logo-link {
             width: 360px !important;
             height: 210px !important;
             max-width: 100% !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
             padding: 0 !important;
             margin: 0 auto !important;
             background: transparent !important;
             border: 0 !important;
             border-radius: 0 !important;
             box-shadow: none !important;
             text-align: center !important;
         }

         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             display: block !important;
             width: 260px !important;
             max-width: 260px !important;
             height: auto !important;
             max-height: 120px !important;
             object-fit: contain !important;
             object-position: center center !important;
             margin: 0 auto !important;
             position: static !important;
             transform: scale(2.15) !important;
             transform-origin: center center !important;
             will-change: transform !important;
         }

         body.pg-auth .nk-block-head {
             width: min(100%, 430px) !important;
             margin: 0 auto 20px auto !important;
             padding: 0 !important;
         }

         body.pg-auth .nk-auth-body form {
             width: min(100%, 430px) !important;
             margin: 0 auto !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .nk-auth-container,
             body.pg-auth .nk-split-content.nk-auth-container {
                 width: min(100%, 92vw) !important;
                 max-width: 92vw !important;
                 padding: 24px 18px 28px !important;
             }

             body.pg-auth .brand-logo,
             body.pg-auth .brand-logo.pb-5 {
                 height: 175px !important;
                 min-height: 175px !important;
                 max-height: 175px !important;
                 margin-bottom: 6px !important;
             }

             body.pg-auth .brand-logo .logo-link {
                 width: 320px !important;
                 height: 175px !important;
             }

             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 width: 230px !important;
                 max-width: 230px !important;
                 max-height: 105px !important;
                 transform: scale(1.95) !important;
             }
         }


         /* PMD final micro-adjust: login logo slightly smaller and higher */
         body.pg-auth .brand-logo,
         body.pg-auth .brand-logo.pb-5 {
             height: 190px !important;
             min-height: 190px !important;
             max-height: 190px !important;
             margin: -10px auto 4px auto !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
         }

         body.pg-auth .brand-logo .logo-link {
             height: 190px !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
         }

         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             transform: translateY(-14px) scale(1.88) !important;
             transform-origin: center center !important;
         }

         body.pg-auth .nk-block-head {
             margin-top: -4px !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .brand-logo,
             body.pg-auth .brand-logo.pb-5 {
                 height: 160px !important;
                 min-height: 160px !important;
                 max-height: 160px !important;
                 margin: -8px auto 4px auto !important;
             }

             body.pg-auth .brand-logo .logo-link {
                 height: 160px !important;
             }

             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 transform: translateY(-10px) scale(1.72) !important;
             }
         }


         /* PMD final position fix: move login logo higher only */
         body.pg-auth .brand-logo,
         body.pg-auth .brand-logo.pb-5 {
             margin: -34px auto -4px auto !important;
         }

         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             transform: translateY(-34px) scale(1.88) !important;
             transform-origin: center center !important;
         }

         body.pg-auth .nk-block-head {
             margin-top: -18px !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .brand-logo,
             body.pg-auth .brand-logo.pb-5 {
                 margin: -28px auto -2px auto !important;
             }

             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 transform: translateY(-28px) scale(1.72) !important;
             }

             body.pg-auth .nk-block-head {
                 margin-top: -14px !important;
             }
         }


         /* PMD final spacing fix: move login text/form down only */
         body.pg-auth .nk-block-head {
             margin-top: 20px !important;
             margin-bottom: 24px !important;
             transform: translateY(18px) !important;
         }

         body.pg-auth .nk-auth-body form {
             transform: translateY(18px) !important;
         }

         body.pg-auth .nk-auth-container,
         body.pg-auth .nk-split-content.nk-auth-container {
             padding-bottom: 52px !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .nk-block-head {
                 margin-top: 16px !important;
                 margin-bottom: 22px !important;
                 transform: translateY(14px) !important;
             }

             body.pg-auth .nk-auth-body form {
                 transform: translateY(14px) !important;
             }

             body.pg-auth .nk-auth-container,
             body.pg-auth .nk-split-content.nk-auth-container {
                 padding-bottom: 44px !important;
             }
         }


         /* PMD final logo size correction: make login logo smaller only */
         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             transform: translateY(-30px) scale(1.55) !important;
             transform-origin: center center !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 transform: translateY(-24px) scale(1.38) !important;
             }
         }


         /* PMD final style: dark jade login page + smaller premium card */
         html,
         body.pg-auth,
         .nk-body.pg-auth,
         .nk-app-root,
         .nk-main,
         .nk-wrap,
         .nk-content,
         .nk-split {
             background:
                 radial-gradient(circle at 50% 12%, rgba(200, 155, 74, 0.16), transparent 30%),
                 linear-gradient(180deg, #011714 0%, #021A17 38%, #021F1C 68%, #062F2A 100%) !important;
             color: #0D1B1E !important;
         }

         body.pg-auth .nk-split-page {
             min-height: 100vh !important;
             padding: 20px 16px !important;
         }

         body.pg-auth .nk-auth-container,
         body.pg-auth .nk-split-content.nk-auth-container {
             width: min(100%, 460px) !important;
             max-width: 460px !important;
             min-height: auto !important;
             padding: 24px 30px 34px !important;
             border: 1px solid rgba(200, 155, 74, 0.36) !important;
             border-radius: 24px !important;
             background: rgba(255, 255, 255, 0.97) !important;
             box-shadow: 0 24px 70px rgba(1, 23, 20, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.16) inset !important;
             backdrop-filter: blur(10px) !important;
         }

         body.pg-auth .nk-auth-body {
             width: 100% !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
         }

         body.pg-auth .brand-logo,
         body.pg-auth .brand-logo.pb-5 {
             height: 176px !important;
             min-height: 176px !important;
             max-height: 176px !important;
             margin: -26px auto -2px auto !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
         }

         body.pg-auth .brand-logo .logo-link {
             height: 176px !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             overflow: visible !important;
         }

         body.pg-auth .brand-logo .pmd-login-main-logo,
         body.pg-auth .brand-logo img.pmd-login-main-logo {
             transform: translateY(-28px) scale(1.52) !important;
             transform-origin: center center !important;
         }

         body.pg-auth .nk-block-head {
             width: min(100%, 390px) !important;
             margin: 12px auto 24px auto !important;
             transform: translateY(14px) !important;
         }

         body.pg-auth .nk-block-title {
             color: #0D1B1E !important;
             font-size: 1.28rem !important;
             font-weight: 800 !important;
         }

         body.pg-auth .nk-block-des p {
             color: #6B7280 !important;
         }

         body.pg-auth .nk-auth-body form {
             width: min(100%, 390px) !important;
             margin: 0 auto !important;
             transform: translateY(14px) !important;
         }

         body.pg-auth .form-label,
         body.pg-auth .form-label-group {
             color: #0D1B1E !important;
             font-weight: 750 !important;
         }

         body.pg-auth .form-control,
         body.pg-auth .form-control-lg {
             min-height: 46px !important;
             border: 1px solid #E8E2D8 !important;
             border-radius: 14px !important;
             background: #FFFFFF !important;
             color: #0D1B1E !important;
             box-shadow: 0 8px 20px rgba(6, 47, 42, 0.06) !important;
         }

         body.pg-auth .form-control:focus,
         body.pg-auth .form-control-lg:focus {
             border-color: #C89B4A !important;
             box-shadow: 0 0 0 0.18rem rgba(200, 155, 74, 0.18), 0 8px 20px rgba(6, 47, 42, 0.08) !important;
         }

         body.pg-auth .btn.btn-primary,
         body.pg-auth .btn.btn-primary:focus {
             min-height: 48px !important;
             border-radius: 14px !important;
             border: 1px solid #062F2A !important;
             background: #062F2A !important;
             color: #FFFFFF !important;
             box-shadow: 0 12px 28px rgba(6, 47, 42, 0.22) !important;
         }

         body.pg-auth .btn.btn-primary:hover,
         body.pg-auth .btn.btn-primary:active {
             background: #021F1C !important;
             border-color: #C89B4A !important;
             color: #FFFFFF !important;
         }

         body.pg-auth .nk-auth-container .form-group a,
         body.pg-auth .pg-auth .form-group a,
         body.pg-auth .nk-auth-container .text-right a {
             color: #062F2A !important;
             font-weight: 800 !important;
         }

         body.pg-auth .nk-auth-container .form-group a:hover,
         body.pg-auth .nk-auth-container .text-right a:hover {
             color: #C89B4A !important;
         }

         @media (max-width: 575.98px) {
             body.pg-auth .nk-auth-container,
             body.pg-auth .nk-split-content.nk-auth-container {
                 width: min(100%, 92vw) !important;
                 max-width: 92vw !important;
                 padding: 22px 18px 30px !important;
                 border-radius: 22px !important;
             }

             body.pg-auth .brand-logo,
             body.pg-auth .brand-logo.pb-5 {
                 height: 154px !important;
                 min-height: 154px !important;
                 max-height: 154px !important;
                 margin: -22px auto -2px auto !important;
             }

             body.pg-auth .brand-logo .logo-link {
                 height: 154px !important;
             }

             body.pg-auth .brand-logo .pmd-login-main-logo,
             body.pg-auth .brand-logo img.pmd-login-main-logo {
                 transform: translateY(-22px) scale(1.34) !important;
             }

             body.pg-auth .nk-block-head,
             body.pg-auth .nk-auth-body form {
                 width: min(100%, 100%) !important;
             }
         }


         /* PMD final login fix: remove inner white label/text gaps */
         body.pg-auth .nk-auth-container,
         body.pg-auth .nk-split-content.nk-auth-container {
             background: rgba(255, 255, 255, 0.97) !important;
         }

         body.pg-auth .nk-auth-body,
         body.pg-auth .nk-block,
         body.pg-auth .nk-block-middle,
         body.pg-auth .nk-block-head,
         body.pg-auth .nk-block-head-content,
         body.pg-auth .nk-block-des,
         body.pg-auth .nk-auth-body form,
         body.pg-auth .form-group,
         body.pg-auth .form-label-group,
         body.pg-auth .form-control-wrap,
         body.pg-auth .text-right,
         body.pg-auth .form-label,
         body.pg-auth label,
         body.pg-auth p {
             background: transparent !important;
             background-color: transparent !important;
             box-shadow: none !important;
         }

         body.pg-auth .form-label-group {
             display: block !important;
             margin-bottom: 8px !important;
             padding: 0 !important;
         }

         body.pg-auth .form-group {
             margin-bottom: 18px !important;
         }

         body.pg-auth .nk-auth-container .text-right,
         body.pg-auth .pg-auth .text-right {
             margin-top: 4px !important;
             padding: 0 !important;
         }

         body.pg-auth .nk-auth-container .text-right a,
         body.pg-auth .pg-auth .text-right a {
             display: inline-block !important;
             background: transparent !important;
             background-color: transparent !important;
         }

         body.pg-auth .form-control,
         body.pg-auth .form-control-lg {
             background: #FFFFFF !important;
             background-color: #FFFFFF !important;
         }


         /* PMD auth messages */
         body.pg-auth .pmd-login-feedback,
         body.pg-auth .pmd-login-help {
             width: 100%;
             max-width: 332px;
             border-radius: 16px;
             padding: 11px 13px;
             font-size: 0.84rem;
             line-height: 1.42;
             font-weight: 650;
             text-align: left;
             background: transparent;
         }

         body.pg-auth .pmd-login-feedback {
             margin: 0 auto 14px;
         }

         body.pg-auth .pmd-login-feedback-success {
             border: 1px solid rgba(21, 128, 61, 0.22);
             background: rgba(21, 128, 61, 0.08);
             color: #15803D;
         }

         body.pg-auth .pmd-login-help {
             margin: 0 auto 18px;
             border: 1px solid rgba(215, 169, 80, 0.30);
             background: rgba(245, 232, 208, 0.46) !important;
             color: #062F2A !important;
         }


         /* PMD auth final cleanup: hide old login helper copy */
         body.pg-auth .nk-block-des,
         body.pg-auth .nk-block-des p,
         body.pg-auth .pmd-auth-login-help,
         body.pg-auth [class*="pmd-auth-login-help"] {
             display: none !important;
             visibility: hidden !important;
             height: 0 !important;
             min-height: 0 !important;
             max-height: 0 !important;
             margin: 0 !important;
             padding: 0 !important;
             overflow: hidden !important;
         }

         body.pg-auth .nk-block-head {
             margin-bottom: 22px !important;
         }


         /* PMD final login notice */
         body.pg-auth .pmd-login-notice {
             width: 100% !important;
             margin: 0 0 18px 0 !important;
             padding: 14px 16px !important;
             border: 1px solid rgba(180, 35, 24, 0.22) !important;
             border-left: 4px solid #B42318 !important;
             border-radius: 16px !important;
             background: rgba(254, 242, 242, 0.96) !important;
             color: #7A271A !important;
             box-shadow: 0 12px 28px rgba(180, 35, 24, 0.10) !important;
             font-size: 0.88rem !important;
             line-height: 1.45 !important;
             opacity: 0 !important;
             transform: translateY(-6px) !important;
             transition: opacity 180ms ease, transform 180ms ease !important;
         }

         body.pg-auth .pmd-login-notice.is-visible {
             opacity: 1 !important;
             transform: translateY(0) !important;
         }

         body.pg-auth .pmd-login-notice strong {
             display: block !important;
             margin-bottom: 4px !important;
             color: #B42318 !important;
             font-weight: 850 !important;
         }

         body.pg-auth .pmd-login-notice span {
             display: block !important;
             color: #7A271A !important;
         }

     </style>
<!-- PMD_LOGIN_LOGO_V58_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-login-fouc-v58.css') }}?v={{ time() }}">
<!-- PMD_LOGIN_LOGO_V58_CSS_END -->



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
                                    <img class="pmd-login-main-logo pmd-login-main-logo-v58" src="{{ $pmdLoginLogoUrl }}?v={{ $pmdLoginLogoVersion ?? time() }}" alt="PayMyDine logo">
                                    </a>
                                </div>
                                <div class="nk-block-head">
                                    <div class="nk-block-head-content">
                                        <h5 class="nk-block-title">@lang('admin::lang.login.text_title')</h5>
                                        <div class="nk-block-des">
                                            <p></p>
                                        </div>
                                    </div>
                                </div><!-- .nk-block-head -->


                                @if (input('reset') === 'success')
                                    <div class="pmd-login-feedback pmd-login-feedback-success">
                                        Your password has been updated. You can now sign in.
                                    </div>
                                @endif

                                <div id="pmd-login-notice" class="pmd-login-notice" role="alert" aria-live="polite" hidden>
                                    <strong>Login failed</strong>
                                    <span>Check your username and password. If you forgot your password, use the reset link below.</span>
                                </div>

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

    <script>
        (function ($) {
            if (!$) return;

            function showPmdLoginNotice(message) {
                var notice = document.getElementById('pmd-login-notice');
                if (!notice) return;

                var text = message || 'Check your username and password. If you forgot your password, use the reset link below.';
                var span = notice.querySelector('span');

                if (span) span.textContent = text;

                notice.hidden = false;
                requestAnimationFrame(function () {
                    notice.classList.add('is-visible');
                });
            }

            function isLoginRequest(settings) {
                var data = settings && settings.data ? String(settings.data) : '';
                var url = settings && settings.url ? String(settings.url) : '';
                return data.indexOf('onLogin') !== -1 || url.indexOf('/admin/login') !== -1;
            }

            $('#edit-form').on('submit', function () {
                window.__pmdLastLoginSubmitAt = Date.now();
            });

            $('#edit-form').on('ajaxFail ajaxError ajaxInvalidField', function () {
                showPmdLoginNotice();
            });

            $(document).on('ajaxErrorMessage', function (event, message) {
                var recentlySubmitted = window.__pmdLastLoginSubmitAt && (Date.now() - window.__pmdLastLoginSubmitAt < 12000);
                if (!recentlySubmitted) return;

                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }

                showPmdLoginNotice(message);
            });

            $(document).ajaxError(function (_event, jqXHR, settings) {
                var recentlySubmitted = window.__pmdLastLoginSubmitAt && (Date.now() - window.__pmdLastLoginSubmitAt < 12000);
                if (!recentlySubmitted && !isLoginRequest(settings)) return;

                var msg = null;

                try {
                    if (jqXHR && jqXHR.responseJSON) {
                        msg = jqXHR.responseJSON.message || jqXHR.responseJSON.error || null;
                    }
                } catch (e) {}

                showPmdLoginNotice(msg);
            });
        })(window.jQuery);
    </script>

<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>
</html>

