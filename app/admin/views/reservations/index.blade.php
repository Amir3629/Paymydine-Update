<link rel="stylesheet" href="/app/admin/assets/css/pmd-new-reservation-floor-v1.css?v=1-20260718">
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-reservation-layout-v3.css?v=363-20260717"
>

<div class="row-fluid">
    {!! $this->renderList() !!}
</div>

<!--
The native reservation floor registers its authority first.
V3 still builds the reservation workspace/cards, but it must not
load, clone, or mount the waiter floor.
-->
<script>
window.PMDReservationFloorV41Authority = {
    version: 'native-reservation-floor-v1',
    route: '/admin/reservations',
    legacyFloorDisabled: true
};
</script>
<script src="/app/admin/assets/js/pmd-new-reservation-floor-v1.js?v=3-hard-isolation-20260718"></script>
<script
    src="/app/admin/assets/js/pmd-reservation-layout-v3.js?v=43-hard-isolation-20260718"
></script>
