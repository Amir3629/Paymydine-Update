@include('admin::pmddevices._v2_boot')
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="terminal-devices">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle' => 'Payment terminals', 'pmdSuiteBackUrl' => admin_url('pmddevices'), 'pmdSuiteActionUrl' => admin_url('terminal_devices/create'), 'pmdSuiteActionTitle' => 'Create terminal'])
    <section class="pmd-profile-section pmd-profile-section--blue"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h8"></path></svg></div><div><h2>Payment terminals</h2><p>Reader pairing, readiness and card-present terminal configuration.</p></div></div><div class="pmd-profile-card__body"><div class="pmd-device-native-list">{!! $this->renderList() !!}</div></div></div></section>
</div>
