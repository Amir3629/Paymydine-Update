@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $pmdGuestCommunications = $pmdGuestCommunications ?? [];
    $pmdCommunicationEvents = $pmdGuestCommunications['events'] ?? [
        'created' => true,
        'updated' => true,
        'canceled' => true,
    ];
@endphp

<style id="pmd-restaurant-profile-critical-v2">
html,
body,
.page,
.page-wrapper,
.page-content,
.content-wrapper,
.container-fluid,
#pmd-restaurant-profile {
    background: #f8fbfd !important;
}

.navbar-top,
.navbar-fixed-top {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
}

html.pmd-restaurant-profile-booting #notif-root {
    visibility: hidden !important;
    opacity: 0 !important;
}
</style>

<script>
document.documentElement.classList.add('pmd-restaurant-profile-booting');
</script>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-v1.css?v=20261009_r28">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-platform-header-v4.css?v=20260809_4">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-spacing-v7.css?v=20260809_10">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-unified-r19.css?v=20260815_r19">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-logo-authority-r20.css?v=20260815_r20">

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-restaurant-profile" class="pmd-restaurant-profile" data-pmd-restaurant-profile>
    <header class="pmd-profile-header" id="pmd-profile-header">
        <div class="pmd-profile-header__left">
            <a class="pmd-profile-header-button pmd-profile-back" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back to Settings') }}" title="{{ $pmdSettingsText('Back to Settings') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>{{ $pmdSettingsText('Restaurant profile') }}</h1>
        </div>

        <div class="pmd-profile-header__actions" data-pmd-profile-header-actions>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')

            <span id="pmd-profile-save-status"></span>
            <button
                type="submit"
                form="pmd-restaurant-profile-form"
                class="pmd-profile-header-button pmd-profile-save-icon"
                aria-label="{{ $pmdSettingsText('Save changes') }}"
                title="{{ $pmdSettingsText('Save changes') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
        </div>
    </header>

    <form
        id="pmd-restaurant-profile-form"
        class="pmd-profile-form"
    
        enctype="multipart/form-data"
    
        method="POST"
    
        action="{{ admin_url('pmdsettings/restaurant') }}"
    
        data-pmd-native-multipart-r22="1"
    >
        {{-- PMD_NATIVE_MULTIPART_LOGO_UPLOAD_R22 --}}
        <input type="hidden" name="_token" value="{{ csrf_token() }}">

        <section class="pmd-profile-section pmd-profile-section--blue">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 11h.01M15 11h.01M9 15h.01M15 15h.01"></path></svg>
                    </div>
                    <div>
                        <h2>{{ $pmdSettingsText('Restaurant identity') }}</h2>
                        <p>{{ $pmdSettingsText('Name and logo used across PayMyDine.') }}</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-grid pmd-profile-grid--2">
                        <label class="pmd-profile-field pmd-profile-field--wide">
                            <span>{{ $pmdSettingsText('Restaurant name') }}</span>
                            <input type="text" name="profile[name]" value="{{ $pmdProfile['name'] ?? '' }}" maxlength="191" required>
                        </label>

                        {{-- PMD_RESTAURANT_IDENTITY_UNIFIED_R19 --}}
                        <label class="pmd-profile-field pmd-profile-field--wide pmd-profile-logo-field-r19">
                            <span>{{ $pmdSettingsText('Restaurant logo') }}</span>
                            <div class="pmd-profile-logo-uploader-r19">
                                <div class="pmd-profile-logo-input-r19">
                                    <input
                                        id="pmd-restaurant-logo-r19"
                                        type="file"
                                        name="pmd_restaurant_logo"
                                        accept="image/png,image/jpeg,image/webp"
                                    >
                                    <small class="pmd-profile-logo-help-r19">{{ $pmdSettingsText('PNG, JPG or WEBP · max 5 MB.') }}</small>
                                    {{-- PMD_RESTAURANT_LOGO_REMOVE_R20 --}}
                                    <label class="pmd-profile-logo-remove-r20">
                                        <input type="checkbox" name="profile[remove_logo]" value="1">
                                        <span>{{ $pmdSettingsText('Remove logo') }}</span>
                                    </label>
                                    @if(!empty($pmdProfile['site_logo']))
                                        <small class="pmd-profile-logo-source-r20">Current backend value: {{ $pmdProfile['site_logo'] }}</small>
                                    @endif
                                </div>
                                <div id="pmd-restaurant-logo-preview-r19" class="pmd-profile-logo-preview-r19" data-pmd-logo-preview-r24="{{ $pmdProfile['site_logo_preview'] ?? '' }}">
                                    @if(!empty($pmdProfile['site_logo_preview']))
                                        <img src="{{ $pmdProfile['site_logo_preview'] }}" alt="{{ $pmdSettingsText('Current restaurant logo') }}" data-pmd-current-restaurant-logo="r24">
                                    @else
                                        <span class="pmd-profile-logo-empty-r19">{{ $pmdSettingsText('No restaurant logo selected') }}</span>
                                    @endif
                                </div>
                            </div>
                        </label>

                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-profile-section pmd-profile-section--booking">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"></path><path d="m4 7 8 6 8-6"></path><path d="M18 17.5c0 1.9-3 4.5-3 4.5s-3-2.6-3-4.5a3 3 0 1 1 6 0Z"></path></svg>
                    </div>
                    <div class="pmd-profile-card__header-copy">
                        <h2>{{ $pmdSettingsText('Public booking contact') }}</h2>
                        <p>{{ $pmdSettingsText('Address, email and phone shown to guests on the booking page.') }}</p>
                    </div>
                    <a
                        class="pmd-profile-booking-preview"
                        href="{{ url('/book') }}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span>{{ $pmdSettingsText('Open booking page') }}</span>
                        <span aria-hidden="true">↗</span>
                    </a>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-booking-note" data-pmd-public-booking-contact="r25">
                        <strong>{{ $pmdSettingsText('Used on /book') }}</strong>
                        <span>{{ $pmdSettingsText('These details power the address, call and email links guests see while reserving.') }}</span>
                    </div>

                    <div class="pmd-profile-grid pmd-profile-grid--2">
                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Restaurant email') }}</span>
                            <input type="email" name="profile[email]" value="{{ $pmdProfile['email'] ?? '' }}" maxlength="191" autocomplete="email">
                            <small>{{ $pmdSettingsText('Used for the “Email restaurant” link.') }}</small>
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Phone') }}</span>
                            <input type="text" name="profile[telephone]" value="{{ $pmdProfile['telephone'] ?? '' }}" maxlength="64" autocomplete="tel">
                            <small>{{ $pmdSettingsText('Used for the “Call restaurant” link.') }}</small>
                        </label>
                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Street & number') }}</span>
                            <input type="text" name="profile[address_1]" value="{{ $pmdProfile['address_1'] ?? '' }}" maxlength="191" autocomplete="street-address">
                            <small>{{ $pmdSettingsText('Main address shown on the booking page.') }}</small>
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Address line 2') }}</span>
                            <input type="text" name="profile[address_2]" value="{{ $pmdProfile['address_2'] ?? '' }}" maxlength="191">
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('City') }}</span>
                            <input type="text" name="profile[city]" value="{{ $pmdProfile['city'] ?? '' }}" maxlength="120">
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('State / region') }}</span>
                            <input type="text" name="profile[state]" value="{{ $pmdProfile['state'] ?? '' }}" maxlength="120">
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Postcode') }}</span>
                            <input type="text" name="profile[postcode]" value="{{ $pmdProfile['postcode'] ?? '' }}" maxlength="32">
                        </label>
                    </div>
                </div>
            </div>
        </section>

        {{-- PMD_GUEST_COMMUNICATIONS_R28 --}}
        <section class="pmd-profile-section pmd-profile-section--communications">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H7l-3 3Z"></path><path d="m5 7 7 5 7-5"></path></svg>
                    </div>
                    <div class="pmd-profile-card__header-copy">
                        <h2>{{ $pmdSettingsText('Guest communications') }}</h2>
                        <p>{{ $pmdSettingsText('Send reservation messages by email and WhatsApp without slowing down the booking page.') }}</p>
                    </div>
                    <div class="pmd-communication-readiness">
                        <span class="pmd-communication-status {{ !empty($pmdGuestCommunications['email_ready']) ? 'is-ready' : '' }}">
                            {{ $pmdSettingsText('Email') }} · {{ $pmdSettingsText(!empty($pmdGuestCommunications['email_ready']) ? 'Ready' : 'Setup needed') }}
                        </span>
                        <span class="pmd-communication-status {{ !empty($pmdGuestCommunications['whatsapp_ready']) ? 'is-ready' : '' }}">
                            WhatsApp · {{ $pmdSettingsText(!empty($pmdGuestCommunications['whatsapp_ready']) ? 'Ready' : 'Setup needed') }}
                        </span>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-booking-note pmd-communication-note">
                        <strong>{{ $pmdSettingsText('Reservation messages') }}</strong>
                        <span>{{ $pmdSettingsText('Transactional reservation messages only. Marketing messages require separate consent.') }}</span>
                    </div>

                    <div class="pmd-communication-events">
                        <span>{{ $pmdSettingsText('Send when') }}</span>
                        <label>
                            <input type="checkbox" name="communication[event_created]" value="1" {{ !empty($pmdCommunicationEvents['created']) ? 'checked' : '' }}>
                            <b>{{ $pmdSettingsText('New reservation') }}</b>
                        </label>
                        <label>
                            <input type="checkbox" name="communication[event_updated]" value="1" {{ !empty($pmdCommunicationEvents['updated']) ? 'checked' : '' }}>
                            <b>{{ $pmdSettingsText('Reservation changed') }}</b>
                        </label>
                        <label>
                            <input type="checkbox" name="communication[event_canceled]" value="1" {{ !empty($pmdCommunicationEvents['canceled']) ? 'checked' : '' }}>
                            <b>{{ $pmdSettingsText('Reservation canceled') }}</b>
                        </label>
                    </div>

                    <div class="pmd-communication-grid">
                        <article class="pmd-communication-channel">
                            <div class="pmd-communication-channel__top">
                                <div>
                                    <span class="pmd-communication-kicker">{{ $pmdSettingsText('Channel') }}</span>
                                    <h3>{{ $pmdSettingsText('Email') }}</h3>
                                    <p>{{ $pmdSettingsText('Confirmation, changes and cancellation messages go to the guest email address.') }}</p>
                                </div>
                                <label class="pmd-profile-switch" aria-label="{{ $pmdSettingsText('Enable guest reservation emails') }}">
                                    <input type="checkbox" name="communication[email_enabled]" value="1" {{ !empty($pmdGuestCommunications['email_enabled']) ? 'checked' : '' }}>
                                    <span></span>
                                </label>
                            </div>

                            <div class="pmd-profile-grid pmd-profile-grid--2">
                                <label class="pmd-profile-field">
                                    <span>{{ $pmdSettingsText('Sender name') }}</span>
                                    <input type="text" name="communication[sender_name]" value="{{ $pmdGuestCommunications['sender_name'] ?? ($pmdProfile['name'] ?? '') }}" maxlength="191" autocomplete="organization">
                                </label>
                                <label class="pmd-profile-field">
                                    <span>{{ $pmdSettingsText('Sender email') }}</span>
                                    <input type="email" name="communication[sender_email]" value="{{ $pmdGuestCommunications['sender_email'] ?? ($pmdProfile['email'] ?? '') }}" maxlength="191" autocomplete="email">
                                    <small>{{ $pmdSettingsText('Guest replies still go to the Restaurant email above.') }}</small>
                                </label>
                            </div>

                            <details class="pmd-communication-details">
                                <summary>{{ $pmdSettingsText('Email delivery setup') }}</summary>
                                <div class="pmd-profile-grid pmd-profile-grid--2">
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Mail protocol') }}</span>
                                        <select name="communication[protocol]">
                                            @foreach(['mail'=>'PHP Mail','smtp'=>'SMTP','sendmail'=>'Sendmail','mailgun'=>'Mailgun','postmark'=>'Postmark','ses'=>'Amazon SES'] as $value=>$label)
                                                <option value="{{ $value }}" {{ ($pmdGuestCommunications['protocol'] ?? 'mail') === $value ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>
                                            @endforeach
                                        </select>
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Test email address') }}</span>
                                        <input type="email" name="communication[test_email]" value="{{ $pmdGuestCommunications['test_email'] ?? '' }}" maxlength="191">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>SMTP {{ $pmdSettingsText('Host') }}</span>
                                        <input type="text" name="communication[smtp_host]" value="{{ $pmdGuestCommunications['smtp_host'] ?? '' }}" maxlength="255">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>SMTP {{ $pmdSettingsText('Port') }}</span>
                                        <input type="number" name="communication[smtp_port]" value="{{ $pmdGuestCommunications['smtp_port'] ?? 587 }}" min="1" max="65535">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Encryption') }}</span>
                                        <input type="text" name="communication[smtp_encryption]" value="{{ $pmdGuestCommunications['smtp_encryption'] ?? 'tls' }}" maxlength="20">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Username') }}</span>
                                        <input type="text" name="communication[smtp_user]" value="{{ $pmdGuestCommunications['smtp_user'] ?? '' }}" maxlength="255" autocomplete="username">
                                    </label>
                                    <label class="pmd-profile-field pmd-profile-field--wide">
                                        <span>{{ $pmdSettingsText('Password') }}</span>
                                        <input type="password" name="communication[smtp_pass]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_smtp_pass']) ? 'Stored — leave blank to keep' : 'Enter password') }}">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Mailgun domain') }}</span>
                                        <input type="text" name="communication[mailgun_domain]" value="{{ $pmdGuestCommunications['mailgun_domain'] ?? '' }}" maxlength="255">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Mailgun secret') }}</span>
                                        <input type="password" name="communication[mailgun_secret]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_mailgun_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Postmark token') }}</span>
                                        <input type="password" name="communication[postmark_token]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_postmark_token']) ? 'Stored — leave blank to keep' : 'Enter token') }}">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Amazon SES region') }}</span>
                                        <input type="text" name="communication[ses_region]" value="{{ $pmdGuestCommunications['ses_region'] ?? '' }}" maxlength="100">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Amazon SES access key') }}</span>
                                        <input type="password" name="communication[ses_key]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_ses_key']) ? 'Stored — leave blank to keep' : 'Enter key') }}">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Amazon SES secret') }}</span>
                                        <input type="password" name="communication[ses_secret]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_ses_secret']) ? 'Stored — leave blank to keep' : 'Enter secret') }}">
                                    </label>
                                </div>

                                <div class="pmd-communication-test-row">
                                    <button type="button" class="pmd-profile-booking-preview" data-request="onTestReservationEmail" data-request-form="#pmd-restaurant-profile-form" data-request-flash>
                                        {{ $pmdSettingsText('Send test email') }}
                                    </button>
                                    <span id="pmd-guest-email-test-status"></span>
                                </div>
                            </details>
                        </article>

                        <article class="pmd-communication-channel">
                            <div class="pmd-communication-channel__top">
                                <div>
                                    <span class="pmd-communication-kicker">{{ $pmdSettingsText('Channel') }}</span>
                                    <h3>WhatsApp</h3>
                                    <p>{{ $pmdSettingsText('Reservation updates can also be sent to the guest phone number through your WhatsApp Business route.') }}</p>
                                </div>
                                <label class="pmd-profile-switch" aria-label="{{ $pmdSettingsText('Enable WhatsApp reservation messages') }}">
                                    <input type="checkbox" name="communication[whatsapp_enabled]" value="1" {{ !empty($pmdGuestCommunications['whatsapp_enabled']) ? 'checked' : '' }}>
                                    <span></span>
                                </label>
                            </div>

                            <div class="pmd-profile-grid pmd-profile-grid--2">
                                <label class="pmd-profile-field">
                                    <span>{{ $pmdSettingsText('WhatsApp provider') }}</span>
                                    <select name="communication[whatsapp_provider]">
                                        <option value="meta_cloud" {{ ($pmdGuestCommunications['whatsapp_provider'] ?? 'meta_cloud') === 'meta_cloud' ? 'selected' : '' }}>Meta WhatsApp Cloud API</option>
                                        <option value="webhook" {{ ($pmdGuestCommunications['whatsapp_provider'] ?? '') === 'webhook' ? 'selected' : '' }}>{{ $pmdSettingsText('Webhook / bot gateway') }}</option>
                                    </select>
                                </label>
                                <label class="pmd-profile-field">
                                    <span>{{ $pmdSettingsText('Business / sender reference') }}</span>
                                    <input type="text" name="communication[whatsapp_sender_reference]" value="{{ $pmdGuestCommunications['whatsapp_sender_reference'] ?? '' }}" maxlength="255" placeholder="tomo / WABA / sender id">
                                </label>
                                <label class="pmd-profile-field pmd-profile-field--wide">
                                    <span>{{ $pmdSettingsText('WhatsApp API endpoint') }}</span>
                                    <input type="url" name="communication[whatsapp_endpoint]" value="{{ $pmdGuestCommunications['whatsapp_endpoint'] ?? '' }}" maxlength="1000" placeholder="https://graph.facebook.com/vXX.X/PHONE_NUMBER_ID/messages">
                                    <small>{{ $pmdSettingsText('Use the full HTTPS message endpoint from your provider. Webhook mode may point to your own WhatsApp bot gateway.') }}</small>
                                </label>
                                <label class="pmd-profile-field pmd-profile-field--wide">
                                    <span>{{ $pmdSettingsText('Access token / webhook token') }}</span>
                                    <input type="password" name="communication[whatsapp_token]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(!empty($pmdGuestCommunications['has_whatsapp_token']) ? 'Stored — leave blank to keep' : 'Enter token') }}">
                                </label>
                                <label class="pmd-profile-field pmd-profile-field--wide">
                                    <span>{{ $pmdSettingsText('WhatsApp test recipient') }}</span>
                                    <input type="tel" name="communication[whatsapp_test_recipient]" value="{{ $pmdGuestCommunications['whatsapp_test_recipient'] ?? '' }}" maxlength="64" placeholder="+491701234567">
                                    <small>{{ $pmdSettingsText('Use an international number with country code.') }}</small>
                                </label>
                            </div>

                            <details class="pmd-communication-details">
                                <summary>{{ $pmdSettingsText('Approved WhatsApp templates') }}</summary>
                                <p class="pmd-communication-template-help">
                                    {{ $pmdSettingsText('For proactive WhatsApp messages, configure approved Meta template names. Each template receives restaurant name, booking reference, date, time, guest count and manage link in that order.') }}
                                </p>
                                <div class="pmd-profile-grid pmd-profile-grid--2">
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('New reservation template') }}</span>
                                        <input type="text" name="communication[whatsapp_template_created]" value="{{ $pmdGuestCommunications['whatsapp_template_created'] ?? '' }}" maxlength="512" placeholder="reservation_created">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Reservation changed template') }}</span>
                                        <input type="text" name="communication[whatsapp_template_updated]" value="{{ $pmdGuestCommunications['whatsapp_template_updated'] ?? '' }}" maxlength="512" placeholder="reservation_updated">
                                    </label>
                                    <label class="pmd-profile-field">
                                        <span>{{ $pmdSettingsText('Reservation canceled template') }}</span>
                                        <input type="text" name="communication[whatsapp_template_canceled]" value="{{ $pmdGuestCommunications['whatsapp_template_canceled'] ?? '' }}" maxlength="512" placeholder="reservation_canceled">
                                    </label>
                                </div>
                            </details>

                            <div class="pmd-communication-test-row">
                                <button type="button" class="pmd-profile-booking-preview" data-request="onTestReservationWhatsApp" data-request-form="#pmd-restaurant-profile-form" data-request-flash>
                                    {{ $pmdSettingsText('Send test WhatsApp') }}
                                </button>
                                <span id="pmd-guest-whatsapp-test-status"></span>
                            </div>
                        </article>
                    </div>

                    <div class="pmd-communication-footnote">
                        {{ $pmdSettingsText('Secrets are never rendered back into the page. Save the page before running a delivery test.') }}
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-profile-section pmd-profile-section--rose">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                    </div>
                    <div>
                        <h2>{{ $pmdSettingsText('Opening hours') }}</h2>
                        <p>{{ $pmdSettingsText('The shared restaurant schedule for reservations and availability.') }}</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body pmd-profile-card__body--hours">
                    <div class="pmd-profile-hours-grid">
                        @foreach(($pmdProfileHours ?? []) as $day)
                            <div class="pmd-profile-day-card" data-pmd-hours-row>
                                <div class="pmd-profile-day-card__top">
                                    <div>
                                        <strong>{{ $pmdSettingsText($day['label']) }}</strong>
                                        <span data-pmd-hours-state>{{ !empty($day['enabled']) ? 'Open' : 'Closed' }}</span>
                                    </div>

                                    <label class="pmd-profile-switch" aria-label="{{ $pmdSettingsText($day['label']) }} open">
                                        <input
                                            type="checkbox"
                                            name="hours[{{ $day['weekday'] }}][enabled]"
                                            value="1"
                                            data-pmd-hours-enabled
                                            {{ !empty($day['enabled']) ? 'checked' : '' }}
                                        >
                                        <span></span>
                                    </label>
                                </div>

                                <div class="pmd-profile-day-card__times">
                                    <label class="pmd-profile-time">
                                        <span>{{ $pmdSettingsText('Opens') }}</span>
                                        <input
                                            type="time"
                                            name="hours[{{ $day['weekday'] }}][opening_time]"
                                            value="{{ $day['opening_time'] ?: '09:00' }}"
                                            step="60"
                                            data-pmd-hours-time
                                        >
                                    </label>

                                    <label class="pmd-profile-time">
                                        <span>{{ $pmdSettingsText('Closes') }}</span>
                                        <input
                                            type="time"
                                            name="hours[{{ $day['weekday'] }}][closing_time]"
                                            value="{{ $day['closing_time'] ?: '22:00' }}"
                                            step="60"
                                            data-pmd-hours-time
                                        >
                                    </label>
                                </div>
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-profile-section pmd-profile-section--cyan">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg>
                    </div>
                    <div>
                        <h2>{{ $pmdSettingsText('Website & social links') }}</h2>
                        <p>{{ $pmdSettingsText('Shown to guests on your digital menu.') }}</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    @php
                        $socialRows = [
                            ['key' => 'website', 'label' => 'Website', 'placeholder' => 'https://yourrestaurant.com', 'icon' => 'globe'],
                            ['key' => 'instagram', 'label' => 'Instagram', 'placeholder' => 'https://instagram.com/...', 'icon' => 'instagram'],
                            ['key' => 'google', 'label' => 'Google / Maps', 'placeholder' => 'https://maps.google.com/...', 'icon' => 'pin'],
                            ['key' => 'trustpilot', 'label' => 'Trustpilot', 'placeholder' => 'https://trustpilot.com/...', 'icon' => 'star'],
                        ];
                    @endphp

                    <div class="pmd-profile-social-grid">
                        @foreach($socialRows as $social)
                            <div class="pmd-profile-social-card">
                                <div class="pmd-profile-social-card__top">
                                    <div class="pmd-profile-social-card__identity">
                                        <div class="pmd-profile-social-mini-icon">
                                            @if($social['icon'] === 'instagram')
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle></svg>
                                            @elseif($social['icon'] === 'pin')
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
                                            @elseif($social['icon'] === 'star')
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"></path></svg>
                                            @else
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path></svg>
                                            @endif
                                        </div>
                                        <strong>{{ $pmdSettingsText($social['label']) }}</strong>
                                    </div>

                                    <label class="pmd-profile-switch" aria-label="Enable {{ $pmdSettingsText($social['label']) }}">
                                        <input
                                            type="checkbox"
                                            name="profile[{{ $social['key'] }}_enabled]"
                                            value="1"
                                            {{ !empty($pmdProfile[$social['key'].'_enabled']) ? 'checked' : '' }}
                                        >
                                        <span></span>
                                    </label>
                                </div>

                                <label class="pmd-profile-field">
                                    <span class="sr-only">{{ $pmdSettingsText($social['label']) }} URL</span>
                                    <input
                                        type="url"
                                        name="profile[{{ $social['key'] }}_url]"
                                        value="{{ $pmdProfile[$social['key'].'_url'] ?? '' }}"
                                        placeholder="{{ $social['placeholder'] }}"
                                        maxlength="500"
                                    >
                                    @if($social['key'] === 'google')
                                        <small style="display:block;margin-top:.45rem;color:#6b7280;">
                                            {{ $pmdSettingsText('Manual Google Maps URL (fallback). A connected Google Business Profile takes priority for reviews.') }}
                                        </small>
                                    @endif
                                </label>

                                @if($social['key'] === 'google')
                                    @php
                                        $googleBusiness = (array)($pmdGoogleBusiness ?? []);
                                        $googleConfigured = !empty($googleBusiness['configured']);
                                        $googleConnected = !empty($googleBusiness['connected']);
                                        $googlePending = !empty($googleBusiness['pending_location']);
                                    @endphp

                                    {{-- PMD_GOOGLE_BUSINESS_COMPACT_MODAL_V8 --}}
                                    <div class="pmd-google-business-row-v7">
                                        <div class="pmd-google-business-row-v7__copy">
                                            <strong>{{ $pmdSettingsText('Google Business Profile') }}</strong>
                                            <small>
                                                {{ $googleConnected
                                                    ? ($googleBusiness['google_location_title'] ?? $pmdSettingsText('Connected Google location'))
                                                    : $pmdSettingsText('Connect reviews, replies and the official Google review link.')
                                                }}
                                            </small>
                                        </div>

                                        <div class="pmd-google-business-row-v7__actions">
                                            @if($googleConnected)
                                                <span class="pmd-provider-status is-connected">{{ $pmdSettingsText('Connected') }}</span>
                                            @elseif($googlePending)
                                                <span class="pmd-provider-status is-partial">{{ $pmdSettingsText('Choose location') }}</span>
                                            @elseif($googleConfigured)
                                                <span class="pmd-provider-status is-partial">{{ $pmdSettingsText('Ready') }}</span>
                                            @else
                                                <span class="pmd-provider-status">{{ $pmdSettingsText('Not connected') }}</span>
                                            @endif

                                            <button
                                                type="button"
                                                class="pmd-provider-configure"
                                                data-pmd-google-business-open-v8
                                            >
                                                {{ $pmdSettingsText('Configure') }}
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        class="pmd-provider-modal pmd-google-business-modal-v8"
                                        data-pmd-google-business-modal-v8
                                        aria-hidden="true"
                                        hidden
                                    >
                                        <div
                                            class="pmd-provider-modal__backdrop"
                                            data-pmd-google-business-close-v8
                                            aria-hidden="true"
                                        ></div>

                                        <section
                                            class="pmd-provider-modal__dialog"
                                            role="dialog"
                                            aria-modal="true"
                                            aria-labelledby="pmd-google-business-title-v8"
                                        >
                                            <header class="pmd-provider-modal__header">
                                                <div>
                                                    <span class="pmd-provider-modal__kicker">
                                                        {{ $pmdSettingsText('GOOGLE BUSINESS PROFILE') }}
                                                    </span>
                                                    <h2 id="pmd-google-business-title-v8">
                                                        {{ $pmdSettingsText('Google Business Profile') }}
                                                    </h2>
                                                </div>

                                                <button
                                                    type="button"
                                                    class="pmd-provider-modal__close"
                                                    data-pmd-google-business-close-v8
                                                    aria-label="{{ $pmdSettingsText('Close') }}"
                                                >×</button>
                                            </header>

                                            <div class="pmd-provider-modal__body">
                                                <p class="pmd-google-business-security-v8">
                                                    {{ $pmdSettingsText('Credentials are stored only for this restaurant and encrypted in its tenant database.') }}
                                                </p>

                                                <div class="pmd-provider-modal-fields pmd-google-business-primary-grid-v8">
                                                    <label class="pmd-provider-modal-field">
                                                        <span>{{ $pmdSettingsText('OAuth Client ID') }}</span>
                                                        <input
                                                            type="text"
                                                            name="google_business[client_id]"
                                                            form="pmd-restaurant-profile-form"
                                                            value="{{ $googleBusiness['client_id'] ?? '' }}"
                                                            placeholder="123456789.apps.googleusercontent.com"
                                                            maxlength="500"
                                                            autocomplete="off"
                                                        >
                                                    </label>

                                                    <label class="pmd-provider-modal-field">
                                                        <span>{{ $pmdSettingsText('OAuth Client Secret') }}</span>
                                                        <input
                                                            type="password"
                                                            name="google_business[client_secret]"
                                                            form="pmd-restaurant-profile-form"
                                                            value=""
                                                            placeholder="{{ !empty($googleBusiness['client_secret_set']) ? $pmdSettingsText('Saved — leave blank to keep') : $pmdSettingsText('Enter client secret') }}"
                                                            maxlength="1000"
                                                            autocomplete="new-password"
                                                        >
                                                    </label>

                                                    <label class="pmd-provider-modal-field">
                                                        <span>{{ $pmdSettingsText('Places API Key') }}</span>
                                                        <input
                                                            type="password"
                                                            name="google_business[places_api_key]"
                                                            form="pmd-restaurant-profile-form"
                                                            value=""
                                                            placeholder="{{ !empty($googleBusiness['places_api_key_set']) ? $pmdSettingsText('Saved — leave blank to keep') : $pmdSettingsText('Enter Places API key') }}"
                                                            maxlength="1000"
                                                            autocomplete="new-password"
                                                        >
                                                    </label>

                                                    <label class="pmd-provider-modal-field">
                                                        <span>{{ $pmdSettingsText('Authorized redirect URI') }}</span>
                                                        <input
                                                            type="text"
                                                            value="{{ $googleBusiness['redirect_uri'] ?? '' }}"
                                                            readonly
                                                            onclick="this.select()"
                                                        >
                                                    </label>
                                                </div>

                                                <button
                                                    type="button"
                                                    class="pmd-google-business-advanced-toggle-v8"
                                                    data-pmd-google-business-advanced-toggle-v8
                                                    aria-expanded="false"
                                                >
                                                    <span>
                                                        <strong>{{ $pmdSettingsText('Advanced') }}</strong>
                                                        <small>{{ $pmdSettingsText('Real-time review notifications (optional)') }}</small>
                                                    </span>
                                                    <b aria-hidden="true">+</b>
                                                </button>

                                                <div
                                                    class="pmd-google-business-advanced-v8"
                                                    data-pmd-google-business-advanced-v8
                                                    hidden
                                                >
                                                    <div class="pmd-provider-modal-fields">
                                                        <label class="pmd-provider-modal-field">
                                                            <span>{{ $pmdSettingsText('Cloud Pub/Sub Topic') }}</span>
                                                            <input
                                                                type="text"
                                                                name="google_business[pubsub_topic]"
                                                                form="pmd-restaurant-profile-form"
                                                                value="{{ $googleBusiness['pubsub_topic'] ?? '' }}"
                                                                placeholder="projects/PROJECT_ID/topics/paymydine-reviews"
                                                                maxlength="500"
                                                                autocomplete="off"
                                                            >
                                                        </label>

                                                        <label class="pmd-provider-modal-field">
                                                            <span>{{ $pmdSettingsText('Verification Token') }}</span>
                                                            <input
                                                                type="password"
                                                                name="google_business[pubsub_token]"
                                                                form="pmd-restaurant-profile-form"
                                                                value=""
                                                                placeholder="{{ !empty($googleBusiness['pubsub_token_set']) ? $pmdSettingsText('Saved — leave blank to keep') : $pmdSettingsText('Enter a long random token') }}"
                                                                maxlength="1000"
                                                                autocomplete="new-password"
                                                            >
                                                        </label>
                                                    </div>

                                                    @if(!empty($googleBusiness['pubsub_push_uri']))
                                                        <p class="pmd-provider-modal-security">
                                                            <strong>{{ $pmdSettingsText('Push endpoint') }}:</strong>
                                                            <code>{{ $googleBusiness['pubsub_push_uri'] }}?token=YOUR_VERIFICATION_TOKEN</code>
                                                        </p>
                                                    @endif
                                                </div>

                                                @if(!$googleConfigured)
                                                    <div class="pmd-provider-modal-message">
                                                        {{ $pmdSettingsText('Enter Client ID and Client Secret, then save before connecting Google.') }}
                                                    </div>
                                                @endif

                                                @if($googleConnected)
                                                    <div class="pmd-provider-modal-message">
                                                        {{ $pmdSettingsText('Connected') }}:
                                                        {{ $googleBusiness['google_location_title'] ?? $pmdSettingsText('Google Business Profile') }}
                                                        @if($googleBusiness['average_rating'] !== null)
                                                            · {{ number_format((float)$googleBusiness['average_rating'], 1) }}/5
                                                            · {{ (int)($googleBusiness['total_review_count'] ?? 0) }} {{ $pmdSettingsText('reviews') }}
                                                        @endif
                                                    </div>
                                                @endif

                                                @if(!empty($googleBusiness['last_error']))
                                                    <div class="pmd-provider-modal-message is-error">
                                                        {{ $googleBusiness['last_error'] }}
                                                    </div>
                                                @endif
                                            </div>

                                            <footer class="pmd-provider-modal__footer">
                                                <div class="pmd-provider-modal__footer-left">
                                                    @if($googleConnected)
                                                        <button
                                                            type="button"
                                                            class="pmd-provider-secondary"
                                                            data-request="onGoogleBusinessSync"
                                                            data-request-success="window.location.reload()"
                                                        >
                                                            {{ $pmdSettingsText('Sync reviews') }}
                                                        </button>

                                                        @if(!empty($googleBusiness['places_configured']))
                                                            <button
                                                                type="button"
                                                                class="pmd-provider-secondary"
                                                                data-request="onGoogleBusinessRefreshLinks"
                                                                data-request-success="window.location.reload()"
                                                            >
                                                                {{ $pmdSettingsText('Refresh links') }}
                                                            </button>
                                                        @endif

                                                        <button
                                                            type="button"
                                                            class="pmd-provider-secondary"
                                                            data-request="onGoogleBusinessDisconnect"
                                                            data-request-confirm="{{ $pmdSettingsText('Disconnect Google Business Profile from this restaurant? Saved Google API credentials will be kept.') }}"
                                                            data-request-success="window.location.reload()"
                                                        >
                                                            {{ $pmdSettingsText('Disconnect') }}
                                                        </button>
                                                    @elseif($googleConfigured || !empty($googleBusiness['client_secret_set']) || !empty($googleBusiness['places_api_key_set']))
                                                        <button
                                                            type="button"
                                                            class="pmd-provider-secondary"
                                                            data-request="onGoogleBusinessClearCredentials"
                                                            data-request-confirm="{{ $pmdSettingsText('Clear this restaurant saved Google API credentials?') }}"
                                                            data-request-success="window.location.reload()"
                                                        >
                                                            {{ $pmdSettingsText('Clear credentials') }}
                                                        </button>
                                                    @endif
                                                </div>

                                                <div class="pmd-provider-modal__footer-right">
                                                    <button
                                                        type="button"
                                                        class="pmd-provider-secondary"
                                                        data-pmd-google-business-close-v8
                                                    >
                                                        {{ $pmdSettingsText('Cancel') }}
                                                    </button>

                                                    @if($googleConfigured && !$googleConnected && !$googlePending)
                                                        <a class="pmd-provider-secondary" href="{{ admin_url('pmdgooglebusiness/connect') }}">
                                                            {{ $pmdSettingsText('Connect Google') }}
                                                        </a>
                                                    @elseif($googlePending || $googleConnected)
                                                        <a class="pmd-provider-secondary" href="{{ admin_url('pmdgooglebusiness/locations') }}">
                                                            {{ $googleConnected ? $pmdSettingsText('Change location') : $pmdSettingsText('Choose location') }}
                                                        </a>
                                                    @endif

                                                    <button
                                                        type="submit"
                                                        class="pmd-provider-primary"
                                                        form="pmd-restaurant-profile-form"
                                                    >
                                                        {{ $pmdSettingsText('Save changes') }}
                                                    </button>
                                                </div>
                                            </footer>
                                        </section>
                                    </div>

                                    <script id="pmd-google-business-provider-modal-v8">
                                    (function () {
                                        var modal = document.querySelector('[data-pmd-google-business-modal-v8]');
                                        var opener = document.querySelector('[data-pmd-google-business-open-v8]');
                                        if (!modal || !opener || modal.dataset.pmdBoundV8 === '1') return;

                                        // Provider modals must live directly under <body>. Keeping a
                                        // fixed modal inside the Restaurant Settings card makes it
                                        // inherit that card's clipping/containing block and breaks the
                                        // full-screen backdrop and dialog width.
                                        if (modal.parentNode !== document.body) {
                                            document.body.appendChild(modal);
                                        }

                                        modal.dataset.pmdBoundV8 = '1';
                                        var previousBodyOverflow = '';
                                        var advancedToggle = modal.querySelector('[data-pmd-google-business-advanced-toggle-v8]');
                                        var advancedPanel = modal.querySelector('[data-pmd-google-business-advanced-v8]');

                                        if (advancedToggle && advancedPanel) {
                                            advancedToggle.addEventListener('click', function () {
                                                var opening = advancedPanel.hidden;
                                                advancedPanel.hidden = !opening;
                                                advancedToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
                                                var mark = advancedToggle.querySelector('b');
                                                if (mark) mark.textContent = opening ? '−' : '+';
                                            });
                                        }

                                        function openModal() {
                                            previousBodyOverflow = document.body.style.overflow;
                                            document.body.style.overflow = 'hidden';
                                            modal.hidden = false;
                                            modal.setAttribute('aria-hidden', 'false');

                                            window.setTimeout(function () {
                                                var close = modal.querySelector('.pmd-provider-modal__close');
                                                if (close) close.focus({preventScroll:true});
                                            }, 0);
                                        }

                                        function closeModal() {
                                            modal.hidden = true;
                                            modal.setAttribute('aria-hidden', 'true');
                                            document.body.style.overflow = previousBodyOverflow;
                                            opener.focus({preventScroll:true});
                                        }

                                        opener.addEventListener('click', function (event) {
                                            event.preventDefault();
                                            openModal();
                                        });

                                        modal.querySelectorAll('[data-pmd-google-business-close-v8]').forEach(function (button) {
                                            button.addEventListener('click', function (event) {
                                                event.preventDefault();
                                                closeModal();
                                            });
                                        });

                                        document.addEventListener('keydown', function (event) {
                                            if (event.key === 'Escape' && !modal.hidden) {
                                                event.preventDefault();
                                                closeModal();
                                            }
                                        });
                                    })();
                                    </script>
                                @endif
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </section>

        <div class="pmd-profile-bottom-save">
            <button type="submit" class="pmd-profile-bottom-save__button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                <span>{{ $pmdSettingsText('Save changes') }}</span>
            </button>
        </div>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-restaurant-v1.js?v=20260809_2"></script>

<script id="pmd-restaurant-native-multipart-r22">
// PMD_NATIVE_MULTIPART_LOGO_UPLOAD_R22
(function () {
    var form = document.getElementById('pmd-restaurant-profile-form');
    if (!form || !window.fetch || !window.FormData) return;

    function setBusy(busy) {
        var buttons = document.querySelectorAll('[form="pmd-restaurant-profile-form"], #pmd-restaurant-profile-form button[type="submit"]');
        for (var i = 0; i < buttons.length; i++) buttons[i].disabled = !!busy;
    }

    function showError(message) {
        var text = String(message || 'Restaurant settings could not be saved.');
        window.alert(text);
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (form.dataset.pmdSubmittingR22 === '1') return false;
        form.dataset.pmdSubmittingR22 = '1';
        setBusy(true);

        var payload = new FormData(form);
        fetch(form.getAttribute('action') || window.location.href, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-IGNITER-REQUEST-HANDLER': 'onSaveRestaurantProfile',
                'Accept': 'application/json'
            },
            body: payload
        }).then(function (response) {
            return response.text().then(function (text) {
                var data = null;
                try { data = text ? JSON.parse(text) : {}; } catch (ignore) {}
                if (!response.ok) {
                    var msg = data && (data.X_IGNITER_ERROR_MESSAGE || data.message) || text || ('HTTP ' + response.status);
                    throw new Error(msg);
                }
                return data || {};
            });
        }).then(function () {
            window.location.reload();
        }).catch(function (error) {
            form.dataset.pmdSubmittingR22 = '0';
            setBusy(false);
            showError(error && error.message);
        });
        return false;
    }, true);
})();
</script>

<script id="pmd-restaurant-logo-preview-script-r24">
// PMD_RESTAURANT_LOGO_PREVIEW_DB_AUTHORITY_R24
(function () {
    var input = document.getElementById('pmd-restaurant-logo-r19');
    var preview = document.getElementById('pmd-restaurant-logo-preview-r19');
    if (!input || !preview) return;

    var canonical = String(preview.getAttribute('data-pmd-logo-preview-r24') || '').trim();
    var localPreview = '';

    function isPlaceholder(url) {
        var clean = String(url || '').split('?')[0].toLowerCase();
        return /\/(images?|placeholder|no-image)\.(png|jpe?g|svg)$/.test(clean);
    }

    function enforceCanonical() {
        if (localPreview) return;
        var img = preview.querySelector('img');
        if (!canonical) {
            if (img && isPlaceholder(img.getAttribute('src') || img.src)) img.remove();
            return;
        }
        if (!img) {
            preview.innerHTML = '';
            img = document.createElement('img');
            img.alt = 'Current restaurant logo';
            img.setAttribute('data-pmd-current-restaurant-logo', 'r24');
            preview.appendChild(img);
        }
        var current = String(img.getAttribute('src') || '').trim();
        if (!current || isPlaceholder(current) || current !== canonical) {
            img.src = canonical;
        }
    }

    input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) {
            localPreview = '';
            enforceCanonical();
            return;
        }
        var reader = new FileReader();
        reader.onload = function (event) {
            localPreview = String(event.target && event.target.result || '');
            preview.innerHTML = '';
            var img = document.createElement('img');
            img.alt = 'New restaurant logo preview';
            img.setAttribute('data-pmd-local-restaurant-logo-preview', 'r24');
            img.src = localPreview;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });

    // A narrow observer protects this preview from legacy global media helpers.
    // It does not observe or rewrite the rest of Admin.
    var observer = new MutationObserver(function () { enforceCanonical(); });
    observer.observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    enforceCanonical();
})();
</script>
