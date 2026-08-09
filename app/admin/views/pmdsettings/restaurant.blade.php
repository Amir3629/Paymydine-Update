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

<div id="pmd-restaurant-profile" class="pmd-restaurant-profile" data-pmd-restaurant-profile>
    <header class="pmd-profile-header" id="pmd-profile-header">
        <div class="pmd-profile-header__left">
            <a class="pmd-profile-header-button pmd-profile-back" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings" title="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>Restaurant profile</h1>
        </div>

        <div class="pmd-profile-header__actions" data-pmd-profile-header-actions>
            <span id="pmd-profile-save-status"></span>
            <button
                type="submit"
                form="pmd-restaurant-profile-form"
                class="pmd-profile-header-button pmd-profile-save-icon"
                aria-label="Save changes"
                title="Save changes"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
        </div>
    </header>

    <form
        id="pmd-restaurant-profile-form"
        class="pmd-profile-form"
        data-request="onSaveRestaurantProfile"
        data-request-flash
        data-request-validate
    >
        <section class="pmd-profile-section pmd-profile-section--blue">
            <div class="pmd-profile-card">
                <div class="pmd-profile-card__header">
                    <div class="pmd-profile-section-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 11h.01M15 11h.01M9 15h.01M15 15h.01"></path></svg>
                    </div>
                    <div>
                        <h2>Restaurant details</h2>
                        <p>The core information used across PayMyDine.</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-grid pmd-profile-grid--2">
                        <label class="pmd-profile-field pmd-profile-field--wide">
                            <span>Restaurant name</span>
                            <input type="text" name="profile[name]" value="{{ $pmdProfile['name'] ?? '' }}" maxlength="191" required>
                        </label>

                        <label class="pmd-profile-field">
                            <span>Public email</span>
                            <input type="email" name="profile[email]" value="{{ $pmdProfile['email'] ?? '' }}" maxlength="191">
                        </label>

                        <label class="pmd-profile-field">
                            <span>Phone</span>
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
                        <h2>Address</h2>
                        <p>Physical location details shown to guests and staff.</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body">
                    <div class="pmd-profile-grid pmd-profile-grid--2">
                        <label class="pmd-profile-field">
                            <span>Address line 1</span>
                            <input type="text" name="profile[address_1]" value="{{ $pmdProfile['address_1'] ?? '' }}" maxlength="191">
                        </label>

                        <label class="pmd-profile-field">
                            <span>Address line 2</span>
                            <input type="text" name="profile[address_2]" value="{{ $pmdProfile['address_2'] ?? '' }}" maxlength="191">
                        </label>

                        <label class="pmd-profile-field">
                            <span>City</span>
                            <input type="text" name="profile[city]" value="{{ $pmdProfile['city'] ?? '' }}" maxlength="120">
                        </label>

                        <label class="pmd-profile-field">
                            <span>State / region</span>
                            <input type="text" name="profile[state]" value="{{ $pmdProfile['state'] ?? '' }}" maxlength="120">
                        </label>

                        <label class="pmd-profile-field">
                            <span>Postcode</span>
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
                        <h2>Opening hours</h2>
                        <p>The shared restaurant schedule for reservations and availability.</p>
                    </div>
                </div>

                <div class="pmd-profile-card__body pmd-profile-card__body--hours">
                    <div class="pmd-profile-hours-grid">
                        @foreach(($pmdProfileHours ?? []) as $day)
                            <div class="pmd-profile-day-card" data-pmd-hours-row>
                                <div class="pmd-profile-day-card__top">
                                    <div>
                                        <strong>{{ $day['label'] }}</strong>
                                        <span data-pmd-hours-state>{{ !empty($day['enabled']) ? 'Open' : 'Closed' }}</span>
                                    </div>

                                    <label class="pmd-profile-switch" aria-label="{{ $day['label'] }} open">
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
                                        <span>Opens</span>
                                        <input
                                            type="time"
                                            name="hours[{{ $day['weekday'] }}][opening_time]"
                                            value="{{ $day['opening_time'] ?: '09:00' }}"
                                            step="900"
                                            data-pmd-hours-time
                                        >
                                    </label>

                                    <label class="pmd-profile-time">
                                        <span>Closes</span>
                                        <input
                                            type="time"
                                            name="hours[{{ $day['weekday'] }}][closing_time]"
                                            value="{{ $day['closing_time'] ?: '22:00' }}"
                                            step="900"
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
                        <h2>Website & social links</h2>
                        <p>Public links reused across the guest-facing experience.</p>
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
                                        <strong>{{ $social['label'] }}</strong>
                                    </div>

                                    <label class="pmd-profile-switch" aria-label="Enable {{ $social['label'] }}">
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
                                    <span class="sr-only">{{ $social['label'] }} URL</span>
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
                <span>Save changes</span>
            </button>
        </div>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-restaurant-v1.js?v=20260809_2"></script>
