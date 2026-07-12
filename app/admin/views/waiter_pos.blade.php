<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Waiter POS · {{ $bootstrap['table']['name'] ?? 'Table' }}</title>
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-pos-v1.css') }}?v=2">
</head>
<body class="pmd-waiter-pos-page">
{!! $shell !!}
<script>window.PMD_WAITER_POS_BOOTSTRAP = @json($bootstrap);</script>
<script src="{{ asset('app/admin/assets/js/pmd-waiter-pos-v1.js') }}?v=2"></script>
<script>
(function () {
    function start() {
        if (window.PMDWaiterPOSApp && window.PMD_WAITER_POS_BOOTSTRAP) {
            window.PMDWaiterPOSApp.mount(document.querySelector('[data-pmd-pos-root]'), window.PMD_WAITER_POS_BOOTSTRAP, { embedded: false });
        }
    }
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
})();
</script>
</body>
</html>
