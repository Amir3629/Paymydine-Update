@include('admin::pmddevices._v2_boot')
@php $pmdFormWidget = $this->widgets['form'] ?? null; try { if ($pmdFormWidget) $pmdFormWidget->render(['useContainer'=>false]); } catch (\Throwable $e) {} $pmdOpenKds = (isset($formModel) && !empty($formModel->slug)) ? admin_url('kitchendisplay/'.$formModel->slug) : null; @endphp
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="kds-edit">
    @include('admin::pmddevices._v2_header',['pmdSuiteTitle'=>'Edit KDS station','pmdSuiteBackUrl'=>admin_url('kds_stations'),'pmdSuiteSave'=>true,'pmdSuiteDelete'=>true,'pmdSuiteActionUrl'=>$pmdOpenKds,'pmdSuiteActionTitle'=>'Open KDS','pmdSuiteActionTarget'=>'_blank'])
    {!! form_open(['id'=>'pmd-restaurant-profile-form','role'=>'form','method'=>'PATCH']) !!}
    @php $pmdSections = [
      ['Basic information','Name this kitchen display.','', ['name']],
      ['Routing','Choose which menu categories reach this KDS.','pmd-profile-section--violet',['category_ids']],
    ]; @endphp
    @foreach($pmdSections as $pmdSection)<section class="pmd-profile-section {{ $pmdSection[2] }}"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg></div><div><h2>{{ $pmdSection[0] }}</h2><p>{{ $pmdSection[1] }}</p></div></div><div class="pmd-profile-card__body"><div class="pmd-profile-grid pmd-profile-grid--2 pmd-device-native-form">@foreach($pmdSection[3] as $pmdName) @include('admin::pmddevices._v2_field',['pmdFormWidget'=>$pmdFormWidget,'pmdFieldName'=>$pmdName]) @endforeach</div></div></div></section>@endforeach
    <div class="pmd-profile-bottom-save"><button type="button" class="pmd-profile-bottom-save__button" data-request="onSave" data-request-form="#pmd-restaurant-profile-form" data-request-flash><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Save changes</span></button></div>
    {!! form_close() !!}
</div>
