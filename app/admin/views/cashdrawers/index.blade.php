@include('admin::pmddevices._v2_boot')
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="cash-drawers">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle' => 'Cash drawers', 'pmdSuiteBackUrl' => admin_url('pmddevices'), 'pmdSuiteActionUrl' => admin_url('cash_drawers/create'), 'pmdSuiteActionTitle' => 'Create cash drawer'])
    <section class="pmd-profile-section pmd-profile-section--cyan"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"></rect><path d="M3 11h18M8 15h.01"></path></svg></div><div><h2>Cash drawers</h2><p>Drawer connections, local POS mapping and automatic cash opening.</p></div></div><div class="pmd-profile-card__body"><div class="pmd-device-native-list">{!! $this->renderList() !!}</div></div></div></section>
</div>
