<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_START -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="cash_drawers">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'Cash drawers',
        'pmdSuiteBackUrl' => admin_url('pmddevices'),
    ])
    <div class="pmd-device-suite-content">
        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_START -->
<div class="row-fluid">
    <div class="alert alert-info" style="margin-bottom: 15px;">
        Manage one drawer per location/terminal, then test connection and open drawer from the edit screen.
    </div>
    {!! $this->renderList() !!}
</div>

        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_END -->
    </div>
</div>
<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_END -->
