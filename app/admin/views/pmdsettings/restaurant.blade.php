@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
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

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-v1.css?v=20260809_2">
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
                        <h2>{{ $pmdSettingsText('Restaurant details') }}</h2>
                        <p>{{ $pmdSettingsText('Shown on your digital menu.') }}</p>
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

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Public email') }}</span>
                            <input type="email" name="profile[email]" value="{{ $pmdProfile['email'] ?? '' }}" maxlength="191">
                        </label>

                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Phone') }}</span>
                            <input type="text" name="profile[telephone]" value="{{ $pmdProfile['telephone'] ?? '' }}" maxlength="64">
                        </label>
                    </div>
                </div>
            </div>
        </section>

        <section class="pmd-profile-section pmd-profile-section--violet">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
                    </div>
                    <div>
                        <h2>{{ $pmdSettingsText('Address') }}</h2>
                        <p>{{ $pmdSettingsText('Physical location details shown to guests and staff.') }}</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-grid pmd-profile-grid--2">
                        <label class="pmd-profile-field">
                            <span>{{ $pmdSettingsText('Address line 1') }}</span>
                            <input type="text" name="profile[address_1]" value="{{ $pmdProfile['address_1'] ?? '' }}" maxlength="191">
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
                                </label>
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
