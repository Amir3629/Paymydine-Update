<script>
(function () {
    var state = 'collapsed';
    try { state = localStorage.getItem('pmd.sideMenu2.state') === 'expanded' ? 'expanded' : 'collapsed'; } catch (error) {}
    document.documentElement.classList.add(state === 'expanded' ? 'pmd-sm2-expanded' : 'pmd-sm2-collapsed');
})();
</script>

@include('admin::_partials.pmd_side_menu2_single_style')
<link rel="stylesheet" href="/app/admin/assets/css/pmd-side-menu2-v1.css?v=pmd-floor-v1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-v1.css?v=pmd-floor-v1">

@include('admin::_partials.pmd_side_menu2_single_menu')

<main class="pmd-floor-page-v1">
    @include('admin::_partials.pmd_floor_map_v1', [
        'floorId' => 'pmd-floor-page-map',
        'floorSize' => 'large',
        'floorMode' => 'full',
        'dataUrl' => $dataUrl,
        'layoutUrl' => $layoutUrl,
        'stateUrl' => $stateUrl,
        'orderUrl' => $orderUrl,
    ])
</main>

<script src="/app/admin/assets/js/pmd-side-menu2-v1.js?v=pmd-floor-v1"></script>
<script src="/app/admin/assets/js/pmd-floor-v1.js?v=pmd-floor-v1" defer></script>


<!-- PMD_FLOOR_STABLE_V11_START -->
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-floor-v1-stable-v11.css?v=20260721_163105"
>
<script
    src="/app/admin/assets/js/pmd-floor-v1-stable-v11.js?v=20260721_163105"
    defer
></script>
<!-- PMD_FLOOR_STABLE_V11_END -->


<!-- PMD_FLOOR_NATIVE_SMART_V20_START -->
<link
  rel="stylesheet"
  href="/app/admin/assets/css/pmd-floor-v1-native-smart-v20.css?v=20260721_171617"
>
<!-- PMD_FLOOR_NATIVE_SMART_V20_END -->

