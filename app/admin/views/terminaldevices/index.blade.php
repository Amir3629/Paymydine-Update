<!-- PMD_DEVICE_SETTINGS_SUITE_V1_TERMINALS_INDEX -->
<div class="pmd-owner-page pmd-device-suite-page" data-pmd-owner-page data-pmd-device-suite="terminal_devices">
    @include('admin::pmddevices._suite_header', [
        'pmdSuiteTitle' => 'Payment terminals',
        'pmdSuiteBackUrl' => admin_url('pmddevices'),
    ])
    <div class="pmd-device-suite-content">
        <div class="row-fluid">{!! $this->renderList() !!}</div>
    </div>
</div>
