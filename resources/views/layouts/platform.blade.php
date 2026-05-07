<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>@yield('title','Terminal Devices Platform')</title>
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.css">
<style>
body{font-family:sans-serif; margin:20px; background:#f9f9f9;}
table{width:100%; border-collapse: collapse;}
table, th, td{border:1px solid #ccc;}
th, td{padding:8px; text-align:left;}
</style>
</head>
<body>
<h1>@yield('title','Terminal Devices Platform')</h1>
@yield('main')
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/moment.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/force-blue-buttons.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery-sortable.js"></script>
</body>
</html>