<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_START -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="pos_configs-create">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'Create POS integration',
        'pmdSuiteBackUrl' => admin_url('pos_configs'),
    ])
    <div class="pmd-device-suite-content">
        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_START -->
<div class="row-fluid">
    {!! form_open([
        'id' => 'edit-form',
        'role' => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>

        <!-- PMD_DEVICE_SETTINGS_SUITE_V1_CANONICAL_CONTENT_END -->
    </div>
</div>
<!-- PMD_DEVICE_SETTINGS_SUITE_V1_WRAPPER_END -->
