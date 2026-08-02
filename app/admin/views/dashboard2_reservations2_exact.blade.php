<!--
  Dashboard2 reservation-card rendering is prevented at its source by the
  route guard in pmd-reservations2-floor-toolbar-v316.js. This view deliberately
  contains no competing CSS visibility override.
-->
<script id="pmd-dashboard2-r2-exact-route-class">
document.documentElement.classList.add('pmd-dashboard2-r2-exact');
</script>

<script id="pmd-dashboard2-kpi-boot-v2">
window.PMD_DASHBOARD2_KPIS = @json($pmdDashboard2Kpis ?? []);
window.PMD_DASHBOARD2_KPI_PAYLOAD = @json($pmdDashboard2KpiPayload ?? null);
</script>

@include('admin::reservations2.index')

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-dashboard2-kpis-v1.css?v=20260802-final-workspace-v1"
>
<script src="/app/admin/assets/js/pmd-dashboard2-kpis-v1.js?v=20260802-analytics-placement-v2"></script>
