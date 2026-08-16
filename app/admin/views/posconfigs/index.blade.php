@include('admin::pmddevices._v2_boot')
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="pos-configs">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle' => 'POS integrations', 'pmdSuiteBackUrl' => admin_url('pmddevices'), 'pmdSuiteActionUrl' => admin_url('pos_configs/create'), 'pmdSuiteActionTitle' => 'Create integration'])
    <section class="pmd-profile-section pmd-profile-section--cyan"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14"></path></svg></div><div><h2>POS integrations</h2><p>External POS synchronization and provider credentials.</p></div></div><div class="pmd-profile-card__body"><div class="pmd-device-native-list">{!! $this->renderList() !!}</div></div></div></section>
</div>
