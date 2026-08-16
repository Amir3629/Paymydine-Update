<!-- PMD_DEVICE_SETTINGS_SUITE_V1_TERMINALS_CREATE -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="terminal_devices-create">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'Create payment terminal',
        'pmdSuiteBackUrl' => admin_url('terminal_devices'),
    ])
    <div class="pmd-device-suite-content">
        {!! form_open(['id' => 'edit-form', 'role' => 'form', 'method' => 'POST']) !!}
        {!! $this->renderForm() !!}
        {!! form_close() !!}
    </div>
</div>
