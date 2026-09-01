@php
  // PMD_RESERVATION_COMPOSER_TR_FEATURES_R2A
  $pmdComposerFeatureLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(app()->getLocale());
  $pmdComposerFeatureGerman = $pmdComposerFeatureLocale === 'de';
  $pmdComposerFeatureText = $pmdComposerFeatureGerman ? [
    'title' => 'Tischwünsche',
    'near_window' => 'Am Fenster',
    'quiet_area' => 'Ruhiger Bereich',
    'accessible' => 'Barrierefrei',
    'use_suggestion' => 'Vorschlag übernehmen',
  ] : [
    'title' => 'Table preferences',
    'near_window' => 'Near window',
    'quiet_area' => 'Quiet area',
    'accessible' => 'Accessible',
    'use_suggestion' => 'Use suggestion',
  ];

  if ($pmdComposerFeatureLocale === 'tr') {
    $pmdComposerFeatureText = \Admin\Classes\PmdPlatformI18n::translateStructure(
      $pmdComposerFeatureText,
      '',
      'tr'
    );
  }
@endphp
<div class="modal fade pmd-reservation-composer-v1" id="pmd-reservation-composer-v1" tabindex="-1" aria-labelledby="pmd-reservation-composer-title-v1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl" id="pmd-reservation-composer-dialog-v1">
    <div class="modal-content">
      <form id="pmd-reservation-composer-form-v1" novalidate>
        <header class="pmd-reservation-composer-v1__header">
          <div><small data-pmd-composer-kicker>Reservation</small><h2 id="pmd-reservation-composer-title-v1" data-pmd-composer-title>New reservation</h2></div>
          <button type="button" data-pmd-composer-close aria-label="@lang('admin::lang.button_close')"><svg aria-hidden="true"><use href="#pmd-composer-icon-x"/></svg></button>
        </header>
        <div class="pmd-reservation-composer-v1__loading" data-pmd-composer-loading role="status">Loading reservation…</div>
        <div class="pmd-reservation-composer-v1__content" data-pmd-composer-content hidden>
          <div class="pmd-reservation-composer-v1__summary" data-pmd-composer-summary hidden tabindex="-1"></div>
          <section class="pmd-reservation-composer-v1__grid">
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-user"/></svg>@lang('admin::lang.reservations.label_first_name')</span><input name="first_name" autocomplete="given-name"><em data-error-for="first_name"></em></label>
            <label><span>@lang('admin::lang.reservations.label_last_name')</span><input name="last_name" autocomplete="family-name"><em data-error-for="last_name"></em></label>
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-phone"/></svg>@lang('admin::lang.reservations.label_customer_telephone')</span><input name="telephone" type="tel" autocomplete="tel"><em data-error-for="telephone"></em></label>
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-mail"/></svg>@lang('admin::lang.label_email')</span><input name="email" type="email" autocomplete="email"><em data-error-for="email"></em></label>
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-users"/></svg>@lang('admin::lang.reservations.label_guest')</span><input name="guest_num" type="number" min="1" step="1"><em data-error-for="guest_num"></em></label>
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-calendar"/></svg>@lang('admin::lang.reservations.label_reservation_date')</span><input name="reserve_date" type="date"><em data-error-for="reserve_date"></em></label>
            <label><span><svg aria-hidden="true"><use href="#pmd-composer-icon-clock"/></svg>@lang('admin::lang.reservations.label_reservation_time')</span><input name="reserve_time" type="time"><em data-error-for="reserve_time"></em></label>
            <label><span>@lang('admin::lang.reservations.label_reservation_duration')</span><input name="duration" type="number" min="1" step="1"><em data-error-for="duration"></em></label>
          </section>
          <section class="pmd-reservation-composer-v1__assignment" aria-labelledby="pmd-composer-assignment-title">
            <h3 id="pmd-composer-assignment-title"><svg aria-hidden="true"><use href="#pmd-composer-icon-table"/></svg>Table assignment</h3>
            <div class="pmd-reservation-composer-v1__modes">
              <label><input type="radio" name="assignment_mode" value="auto"><span>Auto assign</span></label>
              <label><input type="radio" name="assignment_mode" value="choose"><span>Choose table(s)</span></label>
              <label><input type="radio" name="assignment_mode" value="later"><span>Assign later</span></label>
            </div>
            <div class="pmd-reservation-composer-v1__feature-preferences" data-pmd-composer-feature-preferences hidden>
              <span class="pmd-reservation-composer-v1__feature-title">{{ $pmdComposerFeatureText['title'] }}</span>
              <div class="pmd-reservation-composer-v1__feature-options">
                <label data-pmd-composer-feature-option="near_window" hidden>
                  <input type="checkbox" name="pmd_table_features[]" value="near_window">
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 12h16M12 4v16"></path></svg>
                    <b>{{ $pmdComposerFeatureText['near_window'] }}</b>
                  </span>
                </label>
                <label data-pmd-composer-feature-option="quiet_area" hidden>
                  <input type="checkbox" name="pmd_table_features[]" value="quiet_area">
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m16 9 5 6M21 9l-5 6"></path></svg>
                    <b>{{ $pmdComposerFeatureText['quiet_area'] }}</b>
                  </span>
                </label>
                <label data-pmd-composer-feature-option="accessible" hidden>
                  <input type="checkbox" name="pmd_table_features[]" value="accessible">
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="2"></circle><path d="M7 9h5l2 5h3M9 9v5a4 4 0 1 0 4 4M13 14l2 6h4"></path></svg>
                    <b>{{ $pmdComposerFeatureText['accessible'] }}</b>
                  </span>
                </label>
              </div>
            </div>
            <div class="pmd-reservation-composer-v1__policy-notice" data-pmd-composer-policy-notice hidden>
              <span data-pmd-composer-policy-message></span>
              <button type="button" data-pmd-composer-use-suggestion hidden>{{ $pmdComposerFeatureText['use_suggestion'] }}</button>
            </div>
            <label class="pmd-reservation-composer-v1__tables"><span>Tables</span><select name="tables[]" multiple></select><em data-error-for="tables"></em></label>
            <div class="pmd-reservation-composer-v1__availability" data-pmd-composer-availability aria-live="polite"></div>
          </section>
          <label class="pmd-reservation-composer-v1__notes"><span><svg aria-hidden="true"><use href="#pmd-composer-icon-notes"/></svg>@lang('admin::lang.statuses.label_comment')</span><textarea name="comment" rows="3"></textarea><em data-error-for="comment"></em></label>
          <!-- PMD_COMPOSER_MORE_OPTIONS_REMOVED_V17 -->
          <input type="hidden" name="occasion_id" value="0">
          <input type="hidden" name="location_id" value="">
          <input type="hidden" name="notify" value="0">
          <input type="hidden" name="pmd_floor_id" value="">
          <input type="hidden" name="pmd_floor_name" value="">
          <input type="hidden" name="pmd_floor_locked" value="0">

        </div>
        <footer class="pmd-reservation-composer-v1__footer">
          <button type="button" data-pmd-composer-cancel>@lang('admin::lang.button_close')</button>
          <button type="submit" data-pmd-composer-save><svg aria-hidden="true"><use href="#pmd-composer-icon-device-floppy"/></svg><span>@lang('admin::lang.button_save')</span></button>
        </footer>
      </form>
    </div>
  </div>
</div>
<svg class="pmd-reservation-composer-v1__sprite" aria-hidden="true" width="0" height="0"><defs>
  <symbol id="pmd-composer-icon-calendar" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16"/></symbol>
  <symbol id="pmd-composer-icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
  <symbol id="pmd-composer-icon-users" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/></symbol>
  <symbol id="pmd-composer-icon-user" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></symbol>
  <symbol id="pmd-composer-icon-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2"/></symbol>
  <symbol id="pmd-composer-icon-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
  <symbol id="pmd-composer-icon-table" viewBox="0 0 24 24"><path d="M3 10h18M5 10v8M19 10v8M4 6h16a1 1 0 0 1 1 1v3H3V7a1 1 0 0 1 1-1"/></symbol>
  <symbol id="pmd-composer-icon-map-pin" viewBox="0 0 24 24"><circle cx="12" cy="11" r="3"/><path d="M17.7 16.7 12 22l-5.7-5.3a8 8 0 1 1 11.4 0"/></symbol>
  <symbol id="pmd-composer-icon-notes" viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M7 7h10M7 11h10M7 15h4"/></symbol>
  <symbol id="pmd-composer-icon-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></symbol>
  <symbol id="pmd-composer-icon-x" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></symbol>
  <symbol id="pmd-composer-icon-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="pmd-composer-icon-device-floppy" viewBox="0 0 24 24"><path d="M6 4h11l3 3v13H4V6a2 2 0 0 1 2-2M8 4v6h8V4M8 20v-6h8v6"/></symbol>
</defs></svg>
