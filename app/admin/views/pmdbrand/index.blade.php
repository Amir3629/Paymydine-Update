@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $brand = $pmdBrand ?? [];
    $media = $brand['image_manager'] ?? [];
    $checked = fn($value) => !in_array(strtolower((string)$value), ['0','false','off','no',''], true);
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-brand-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back') }}"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>{{ $pmdSettingsText('Brand & communication') }}</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span id="pmd-owner-save-status"></span>
            <button type="submit" form="pmd-brand-form" class="pmd-owner-header-button pmd-owner-save" data-pmd-owner-save aria-label="{{ $pmdSettingsText('Save changes') }}" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></button>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    <form id="pmd-brand-form" data-pmd-owner-form data-request="onSaveBrand" data-request-flash data-request-validate>
        <section class="pmd-owner-section" id="brand-assets">
            <div class="pmd-owner-card" data-accent="indigo">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M12 3 4 7v10l8 4 8-4V7z"></path><path d="m4 7 8 4 8-4M12 11v10"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Brand assets') }}</h2><p>{{ $pmdSettingsText('Restaurant, dashboard, favicon, invoice, mail and floor-map artwork in one place.') }}</p></div>
                    <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('media_manager') }}">{{ $pmdSettingsText('Media library') }}</a></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-form-grid">
                        @foreach([
                            'site_logo'=>'Restaurant logo',
                            'dashboard_logo'=>'Dashboard logo',
                            'favicon_logo'=>'Favicon',
                            'invoice_logo'=>'Invoice logo',
                            'mail_logo'=>'Email logo',
                            'table_map_background_image'=>'Floor-map background'
                        ] as $key=>$label)
                            <div class="pmd-owner-field">
                                <label>{{ $pmdSettingsText($label) }}</label>
                                <input type="text" name="brand[{{ $key }}]" value="{{ $brand[$key] ?? '' }}" placeholder="/filename.png">
                                <small>{{ $pmdSettingsText('Media-library relative path. Existing asset authority is preserved.') }}</small>
                            </div>
                        @endforeach
                    </div>
                    <div class="pmd-owner-setting-row"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText('Show social icons on homepage') }}</strong><small>{{ $pmdSettingsText('Controls the homepage social-icon area. Individual social URLs remain in Restaurant profile.') }}</small></div><label class="pmd-owner-switch"><input type="checkbox" name="brand[pmd_home_social_icons_enabled]" value="1" {{ $checked($brand['pmd_home_social_icons_enabled'] ?? 1) ? 'checked' : '' }}><span></span></label></div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="email-delivery">
            <div class="pmd-owner-card" data-accent="indigo">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Email delivery') }}</h2><p>{{ $pmdSettingsText('Sender identity and delivery-provider credentials.') }}</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-form-grid">
                        <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Sender name') }}</label><input type="text" name="brand[sender_name]" value="{{ $brand['sender_name'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Sender email') }}</label><input type="email" name="brand[sender_email]" value="{{ $brand['sender_email'] ?? '' }}"></div>
                        <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Mail protocol') }}</label><select name="brand[protocol]">@foreach(['mail'=>'PHP Mail','smtp'=>'SMTP','sendmail'=>'Sendmail','mailgun'=>'Mailgun','postmark'=>'Postmark','ses'=>'Amazon SES'] as $value=>$label)<option value="{{ $value }}" {{ ($brand['protocol'] ?? 'mail') === $value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>@endforeach</select></div>
                        <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Test email address') }}</label><input type="email" name="brand[test_email]" value="{{ $brand['test_email'] ?? '' }}"></div>
                    </div>
                    <div class="pmd-owner-divider"></div>
                    <div class="pmd-owner-grid">
                        <div class="pmd-owner-panel">
                            <h3>SMTP</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Host') }}</label><input type="text" name="brand[smtp_host]" value="{{ $brand['smtp_host'] ?? '' }}"></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Port') }}</label><input type="number" name="brand[smtp_port]" value="{{ $brand['smtp_port'] ?? 587 }}"></div>
                                <div class="pmd-owner-field"><label>{{ $pmdSettingsText('Encryption') }}</label><input type="text" name="brand[smtp_encryption]" value="{{ $brand['smtp_encryption'] ?? 'tls' }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Username') }}</label><input type="text" name="brand[smtp_user]" value="{{ $brand['smtp_user'] ?? '' }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Password') }}</label><input type="password" name="brand[smtp_pass]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($brand['has_smtp_pass']) ? 'Stored — leave blank to keep' : 'Enter password') }}"></div>
                            </div>
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>Mailgun / Postmark</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Mailgun domain') }}</label><input type="text" name="brand[mailgun_domain]" value="{{ $brand['mailgun_domain'] ?? '' }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Mailgun secret') }}</label><input type="password" name="brand[mailgun_secret]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($brand['has_mailgun_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Postmark token') }}</label><input type="password" name="brand[postmark_token]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($brand['has_postmark_token']) ? 'Stored — leave blank to keep' : 'Enter token') }}"></div>
                            </div>
                        </div>
                        <div class="pmd-owner-panel">
                            <h3>{{ $pmdSettingsText('Amazon SES') }}</h3>
                            <div class="pmd-owner-form-grid">
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Access key') }}</label><input type="password" name="brand[ses_key]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($brand['has_ses_key']) ? 'Stored — leave blank to keep' : 'Enter key') }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Secret') }}</label><input type="password" name="brand[ses_secret]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($brand['has_ses_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}"></div>
                                <div class="pmd-owner-field pmd-owner-field--full"><label>{{ $pmdSettingsText('Region') }}</label><input type="text" name="brand[ses_region]" value="{{ $brand['ses_region'] ?? '' }}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="pmd-owner-secret-note">{{ $pmdSettingsText('Passwords, API secrets and tokens are not rendered back into the page. Leave them blank to keep existing values.') }}</div>
                </div>
            </div>
        </section>

        <section class="pmd-owner-section" id="media-rules">
            <div class="pmd-owner-card" data-accent="indigo">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m21 15-5-5L5 20"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Media library rules') }}</h2><p>{{ $pmdSettingsText('Upload size and the actions owners can perform on reusable media.') }}</p></div>
                    <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('media_manager') }}">{{ $pmdSettingsText('Open media library') }}</a></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-field" style="max-width:320px"><label>{{ $pmdSettingsText('Maximum upload size') }}</label><input type="number" min="1" max="2048" name="brand[media_max_size]" value="{{ $media['max_size'] ?? 10 }}"><small>{{ $pmdSettingsText('Uses the existing image_manager maximum-size setting.') }}</small></div>
                    <div class="pmd-owner-grid pmd-owner-grid--3" style="margin-top:12px">
                        @foreach(['media_uploads'=>'Upload files','media_new_folder'=>'Create folders','media_copy'=>'Copy files','media_move'=>'Move files','media_rename'=>'Rename files','media_delete'=>'Delete files'] as $key=>$label)
                            @php $source = str_replace('media_', '', $key); @endphp
                            <div class="pmd-owner-panel"><div class="pmd-owner-setting-row" style="padding:0;border:0"><div class="pmd-owner-setting-copy"><strong>{{ $pmdSettingsText($label) }}</strong></div><label class="pmd-owner-switch"><input type="checkbox" name="brand[{{ $key }}]" value="1" {{ $checked($media[$source] ?? 1) ? 'checked' : '' }}><span></span></label></div></div>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>
    </form>
</div>
