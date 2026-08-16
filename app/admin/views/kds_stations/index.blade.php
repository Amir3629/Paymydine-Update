@include('admin::pmddevices._v2_boot')
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="kds-stations">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle' => 'Kitchen display stations', 'pmdSuiteBackUrl' => admin_url('pmddevices'), 'pmdSuiteActionUrl' => admin_url('kds_stations/create'), 'pmdSuiteActionTitle' => 'Create KDS station'])
    <section class="pmd-profile-section pmd-profile-section--violet"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M7 21h10M12 17v4"></path></svg></div><div><h2>KDS stations</h2><p>Kitchen, bar, grill, dessert and pass screens.</p></div></div><div class="pmd-profile-card__body"><div class="pmd-device-native-list">{!! $this->renderList() !!}</div></div></div></section>
</div>
