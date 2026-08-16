<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_START -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="cash_drawers-create">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'Create cash drawer',
        'pmdSuiteBackUrl' => admin_url('cash_drawers'),
    ])
    <div class="pmd-device-suite-content">
        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_START -->
<div class="row-fluid cash-drawer-simple-page">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>

        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_END -->
    </div>
</div>
<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_END -->
