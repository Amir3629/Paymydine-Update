@include('admin::pmddevices._v2_boot')
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="posdevices">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle' => 'POS devices', 'pmdSuiteBackUrl' => admin_url('pmddevices')])
    <section class="pmd-profile-section pmd-profile-section--cyan">
        <div class="pmd-profile-card">
            <div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg></div><div><h2>POS devices</h2><p>Configured POS device definitions and local terminals.</p></div></div>
            <div class="pmd-profile-card__body"><div class="pmd-device-native-list">{!! $this->renderList() !!}</div></div>
        </div>
    </section>
</div>
