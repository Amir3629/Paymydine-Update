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
</body>
</html>
