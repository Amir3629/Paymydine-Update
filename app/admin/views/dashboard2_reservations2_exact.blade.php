<!-- PMD_DASHBOARD2_REMOVE_REAL_RESERVATION_CARDS_V381 -->
<style id="pmd-dashboard2-remove-real-reservation-cards-v381">
/*
 * This Blade view is used only by /admin/dashboard2.
 * No html/body class dependency.
 * Push notifications and all JavaScript remain untouched.
 */
#pmd-r2-reservation-cards-v320,
#pmd-r2-reservation-grid-v320 {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}
</style>
<script id="pmd-dashboard2-r2-exact-route-class">
document.documentElement.classList.add('pmd-dashboard2-r2-exact');
</script>

<script id="pmd-dashboard2-kpi-boot-v2">
window.PMD_DASHBOARD2_KPIS = @json($pmdDashboard2Kpis ?? []);
</script>

@include('admin::reservations2.index')

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-dashboard2-kpis-v1.css?v=20260802-14"
>
<script src="/app/admin/assets/js/pmd-dashboard2-kpis-v1.js?v=20260802-17"></script>
