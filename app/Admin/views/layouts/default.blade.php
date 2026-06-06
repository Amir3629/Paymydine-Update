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
</body>
</html>
