{{--
    Reservationsnew phase 1 mirror.

    This intentionally renders the currently proven Reservations2 workspace
    from a separate route. The old page remains untouched. Subsequent cleanup
    work will replace this include with isolated markup/assets on this route.
--}}
<script>
(function () {
    document.documentElement.classList.add('pmd-reservationsnew-route');
})();
</script>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservationsnew-layout-v1.css?v=20260725-1">
@include('admin::reservations2.index')
