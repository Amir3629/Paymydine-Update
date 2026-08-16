@include('admin::pmddevices._v2_boot')
@php $pmdFormWidget = $this->widgets['form'] ?? null; try { if ($pmdFormWidget) $pmdFormWidget->render(['useContainer'=>false]); } catch (\Throwable $e) {} @endphp
<div id="pmd-restaurant-profile" data-pmd-restaurant-profile data-pmd-device-settings-v2="kds-create">
    @include('admin::pmddevices._v2_header',['pmdSuiteTitle'=>'Create KDS station','pmdSuiteBackUrl'=>admin_url('kds_stations'),'pmdSuiteSave'=>true])
    {!! form_open(['id'=>'pmd-restaurant-profile-form','role'=>'form','method'=>'POST']) !!}
    @php $pmdSections = [
      ['Basic information','Name, type, location and station state.','', ['name','station_type','location_id','is_active','priority','description']],
      ['Routing','Choose which menu categories reach this station.','pmd-profile-section--violet',['category_ids']],
      ['Workflow','Control KDS actions, reservation visibility and completion behavior.','pmd-profile-section--rose',['can_change_status','status_ids','show_reservations','reservation_window_minutes','ready_pickup_timeout_minutes','auto_hide_completed_minutes']],
      ['Display & sound','Screen density, sound, refresh cadence and order limit.','pmd-profile-section--cyan',['notification_sound','sound_enabled','refresh_interval','order_limit','theme_color','display_density']],
    ]; @endphp
    @foreach($pmdSections as $pmdSection)<section class="pmd-profile-section {{ $pmdSection[2] }}"><div class="pmd-profile-card"><div class="pmd-profile-card__header"><div class="pmd-profile-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg></div><div><h2>{{ $pmdSection[0] }}</h2><p>{{ $pmdSection[1] }}</p></div></div><div class="pmd-profile-card__body"><div class="pmd-profile-grid pmd-profile-grid--2 pmd-device-native-form">@foreach($pmdSection[3] as $pmdName) @include('admin::pmddevices._v2_field',['pmdFormWidget'=>$pmdFormWidget,'pmdFieldName'=>$pmdName]) @endforeach</div></div></div></section>@endforeach
    <div class="pmd-profile-bottom-save"><button type="button" class="pmd-profile-bottom-save__button" data-request="onSave" data-request-form="#pmd-restaurant-profile-form" data-request-flash><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Save KDS station</span></button></div>
    {!! form_close() !!}
</div>
