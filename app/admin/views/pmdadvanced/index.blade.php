@php
    $data = $pmdAdvanced ?? [];
    $s = $data['settings'] ?? [];
    $orderStatuses = $data['order_statuses'] ?? [];
    $reservationStatuses = $data['reservation_statuses'] ?? [];
    $checked = fn($value) => !in_array(strtolower((string)$value), ['0','false','off','no',''], true);
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-advanced-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>Advanced settings</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span id="pmd-owner-save-status"></span>
            <button type="submit" form="pmd-advanced-form" class="pmd-owner-header-button pmd-owner-save" data-pmd-owner-save aria-label="Save changes" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></button>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    <form id="pmd-advanced-form" data-pmd-owner-form data-request="onSaveAdvanced" data-request-flash data-request-validate>
        <section class="pmd-owner-section" id="platform-regional">
            <div class="pmd-owner-card" data-accent="slate">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Platform & regional</h2><p>Low-frequency language, currency, routing, maps and service settings.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-form-grid">
                        <div class="pmd-owner-field"><label>Default language</label><input type="text" name="advanced[default_language]" value="{{ $s['default_language'] ?? 'en' }}"></div>
                        <div class="pmd-owner-field"><label>Timezone</label><input type="text" name="advanced[timezone]" value="{{ $s['timezone'] ?? 'UTC' }}" placeholder="Europe/Berlin"></div>
                        <div class="pmd-owner-field"><label>Default currency</label><input type="text" name="advanced[default_currency_code]" value="{{ $s['default_currency_code'] ?? 'EUR' }}"></div>
                        <div class="pmd-owner-field"><label>Distance unit</label><input type="text" name="advanced[distance_unit]" value="{{ $s['distance_unit'] ?? 'km' }}"></div>
                        <div class="pmd-owner-field"><label>Menu page</label><input type="text" name="advanced[menus_page]" value="{{ $s['menus_page'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Reservation page</label><input type="text" name="advanced[reservation_page]" value="{{ $s['reservation_page'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Default geocoder</label><input type="text" name="advanced[default_geocoder]" value="{{ $s['default_geocoder'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Maps API key</label><input type="text" name="advanced[maps_api_key]" value="{{ $s['maps_api_key'] ?? '' }}"></div>
                    </div>
                    <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Detect language automatically</strong><small>Use browser/request language when available.</small></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[detect_language]" value="1" {{ $checked($s['detect_language'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                    <div class="pmd-owner-divider"></div>
                    <h3 class="pmd-owner-subtitle">Currency conversion</h3>
                    <div class="pmd-owner-form-grid">
                        <div class="pmd-owner-field"><label>Converter API</label><input type="text" name="advanced[currency_converter_api]" value="{{ $s['currency_converter_api'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Refresh interval</label><input type="number" name="advanced[currency_refresh_interval]" value="{{ $s['currency_refresh_interval'] ?? 60 }}"></div>
                        <div class="pmd-owner-field"><label>Open Exchange Rates API key</label><input type="text" name="advanced[currency_oer_api_key]" value="{{ $s['currency_oer_api_key'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>Fixer API key</label><input type="text" name="advanced[currency_fixer_api_key]" value="{{ $s['currency_fixer_api_key'] ?? '' }}"></div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="orders-eta">
            <div class="pmd-owner-card" data-accent="slate">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M6 3h12l2 5-8 13L4 8z"></path><path d="M4 8h16M9 8l3 13 3-13"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Ordering & Smart ETA</h2><p>Legacy Setup settings consolidated without losing order-status or ETA controls.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>Order behaviour</h3>
                            @foreach(['guest_order'=>'Allow guest orders','location_order'=>'Allow restaurant/location orders','order_email'=>'Send order emails'] as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $label }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[{{ $key }}]" value="1" {{ $checked($s[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                            <div class="pmd-owner-form-grid">
                                @foreach(['default_order_status'=>'Default status','processing_order_status'=>'Processing status','completed_order_status'=>'Completed status','canceled_order_status'=>'Canceled status'] as $key=>$label)
                                    <div class="pmd-owner-field"><label>{{ $label }}</label><select name="advanced[{{ $key }}]"><option value="0">—</option>@foreach($orderStatuses as $id=>$name)<option value="{{ $id }}" {{ (int)($s[$key] ?? 0)===(int)$id ? 'selected' : '' }}>{{ $name }}</option>@endforeach</select></div>
                                @endforeach
                            </div>
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>Smart ETA</h3>
                            @foreach(['enable_customer_eta'=>'Show ETA to customers','smart_eta_enabled'=>'Enable Smart ETA','eta_use_staff_attendance'=>'Use staff attendance'] as $key=>$label)
                                <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $label }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[{{ $key }}]" value="1" {{ $checked($s[$key] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            @endforeach
                            <div class="pmd-owner-form-grid">
                                @foreach([
                                    'eta_default_prep_minutes'=>'Default prep min','eta_order_load_window_minutes'=>'Load window min','eta_busy_item_threshold'=>'Busy item threshold','eta_very_busy_item_threshold'=>'Very busy threshold','eta_busy_extra_minutes'=>'Busy extra min','eta_very_busy_extra_minutes'=>'Very busy extra min','eta_expected_kitchen_staff'=>'Expected kitchen staff','eta_understaffed_extra_minutes'=>'Understaffed extra min','eta_round_to_nearest_minutes'=>'Round to min','eta_max_minutes'=>'Maximum ETA min'
                                ] as $key=>$label)
                                    <div class="pmd-owner-field"><label>{{ $label }}</label><input type="number" name="advanced[{{ $key }}]" value="{{ $s[$key] ?? 0 }}"></div>
                                @endforeach
                                <div class="pmd-owner-field pmd-owner-field--full"><label>ETA hint text</label><textarea name="advanced[eta_hint_text]">{{ $s['eta_hint_text'] ?? '' }}</textarea></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="reservation-defaults">
            <div class="pmd-owner-card" data-accent="slate">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Reservation defaults</h2><p>Email and status defaults retained from the old Setup settings. Opening hours remain in Restaurant profile.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Reservation email</strong><small>Send reservation notification emails.</small></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[reservation_email]" value="1" {{ $checked($s['reservation_email'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                    <div class="pmd-owner-form-grid">
                        @foreach(['default_reservation_status'=>'Default reservation status','confirmed_reservation_status'=>'Confirmed status','canceled_reservation_status'=>'Canceled status'] as $key=>$label)
                            <div class="pmd-owner-field"><label>{{ $label }}</label><select name="advanced[{{ $key }}]"><option value="0">—</option>@foreach($reservationStatuses as $id=>$name)<option value="{{ $id }}" {{ (int)($s[$key] ?? 0)===(int)$id ? 'selected' : '' }}>{{ $name }}</option>@endforeach</select></div>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="admin-system">
            <div class="pmd-owner-card" data-accent="slate">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path><path d="M19 12h3M2 12h3M12 2v3M12 19v3"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Admin panel & maintenance</h2><p>Rarely changed panel behaviour, staff note helpers, logs and maintenance controls.</p></div>
                    <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('activities') }}">Activity history</a><a class="pmd-owner-action" href="{{ admin_url('settings/edit/about') }}">About content</a></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>Admin behaviour</h3>
                            <div class="pmd-owner-field"><label>After save action</label><select name="advanced[admin_after_save_action]">@foreach(['continue'=>'Continue editing','close'=>'Close','new'=>'Create new'] as $value=>$label)<option value="{{ $value }}" {{ ($s['admin_after_save_action'] ?? 'continue') === $value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                            <div class="pmd-owner-field" style="margin-top:12px"><label>General staff note suggestions</label><textarea name="advanced[note_suggestions]" placeholder="One suggestion per line">{{ $s['note_suggestions'] ?? '' }}</textarea></div>
                            <div class="pmd-owner-field" style="margin-top:12px"><label>KDS notification sound</label><input type="text" name="advanced[kds_notification_sound]" value="{{ $s['kds_notification_sound'] ?? '' }}" placeholder="doorbell"></div>
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>Logging</h3>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Request logging</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[enable_request_log]" value="1" {{ $checked($s['enable_request_log'] ?? 1) ? 'checked' : '' }}><span></span></label></div>
                            <div class="pmd-owner-field"><label>Activity log retention / timeout</label><input type="number" name="advanced[activity_log_timeout]" value="{{ $s['activity_log_timeout'] ?? 60 }}"></div>
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>Maintenance</h3>
                            <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>Maintenance mode</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="advanced[maintenance_mode]" value="1" {{ $checked($s['maintenance_mode'] ?? 0) ? 'checked' : '' }}><span></span></label></div>
                            <div class="pmd-owner-field"><label>Maintenance message</label><textarea name="advanced[maintenance_message]">{{ $s['maintenance_message'] ?? '' }}</textarea></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </form>
</div>
