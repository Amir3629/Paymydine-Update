<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_START -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="pos_configs">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'POS integrations',
        'pmdSuiteBackUrl' => admin_url('pmddevices'),
    ])
    <div class="pmd-device-suite-content">
        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_START -->
<div class="row-fluid">
    {!! $this->renderList() !!}
</div>

        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_END -->
    </div>
</div>
<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_END -->
