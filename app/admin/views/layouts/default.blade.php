<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('pageTitle', 'Admin Panel')</title>
    @styles
</head>
<body class="admin">
    @include('admin::partials.header')
    <div class="main-container">
        @yield('main')
    </div>
    @scripts
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>
</html>
