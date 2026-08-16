@include('admin::pmddevices._v2_boot')
@php $pmdFormWidget = $this->widgets['form'] ?? null; try { if ($pmdFormWidget) $pmdFormWidget->render(['useContainer'=>false]); } catch (\Throwable $e) {} @endphp
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="terminal-create">
    @include('admin::pmddevices._v2_header', ['pmdSuiteTitle'=>'Create payment terminal','pmdSuiteBackUrl'=>admin_url('terminal_devices'),'pmdSuiteSave'=>true])
    {!! form_open(['id'=>'pmd-restaurant-profile-form','role'=>'form','method'=>'POST']) !!}
    <section class="pmd-profile-section"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M8 6h8M8 10h8M8 14h8"></path></svg></div><div><h2>Terminal connection</h2><p>Provider, location and reader identity.</p></div></div><div class="pmd-profile-card__body"><div class="pmd-profile-grid pmd-profile-grid--2 pmd-device-native-form">
        @foreach(['provider_code','location_id','reader_label','reader_id','affiliate_key','pairing_state','terminal_status','is_active','metadata'] as $pmdName) @include('admin::pmddevices._v2_field',['pmdFormWidget'=>$pmdFormWidget,'pmdFieldName'=>$pmdName]) @endforeach
    </div></div></div></section>
    <div class="pmd-profile-bottom-save"><button type="button" class="pmd-profile-bottom-save__button" data-request="onSave" data-request-form="#pmd-restaurant-profile-form" data-request-flash><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Save terminal</span></button></div>
    {!! form_close() !!}
</div>
