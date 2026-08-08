<style id="pmd-restaurant-profile-critical-v1">
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

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-restaurant-v1.css?v=20260808_1">

<div id="pmd-restaurant-profile" class="pmd-restaurant-profile" data-pmd-restaurant-profile>
    <header class="pmd-profile-header" id="pmd-profile-header">
        <div class="pmd-profile-header__left">
            <a class="pmd-profile-back" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <h1>Restaurant profile</h1>
                <p>Identity, contact details, opening hours and online presence.</p>
            </div>
        </div>

        <div class="pmd-profile-header__actions" data-pmd-profile-header-actions>
            <span id="pmd-profile-save-status"></span>
            <button
                type="submit"
                form="pmd-restaurant-profile-form"
                class="pmd-profile-save"
            >
                Save changes
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
        <section class="pmd-profile-section">
            <div class="pmd-profile-section__heading">
                <h2>Restaurant details</h2>
                <p>The information customers and staff use to identify this restaurant.</p>
            </div>

            <div class="pmd-profile-card">
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
        </section>

        <section class="pmd-profile-section">
            <div class="pmd-profile-section__heading">
                <h2>Address</h2>
                <p>Keep the physical restaurant address in one place.</p>
            </div>

            <div class="pmd-profile-card">
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
        </section>

        <section class="pmd-profile-section">
            <div class="pmd-profile-section__heading">
                <h2>Opening hours</h2>
                <p>This becomes the single restaurant schedule used by reservations and customer-facing availability.</p>
            </div>

            <div class="pmd-profile-card pmd-profile-hours-card">
                <div class="pmd-profile-hours">
                    @foreach(($pmdProfileHours ?? []) as $day)
                        <div class="pmd-profile-hours__row" data-pmd-hours-row>
                            <div class="pmd-profile-hours__day">
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

                            <span class="pmd-profile-hours__dash">–</span>

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
                    @endforeach
                </div>
            </div>
        </section>

        <section class="pmd-profile-section">
            <div class="pmd-profile-section__heading">
                <h2>Website & social links</h2>
                <p>Public links that can be reused across the menu, checkout and restaurant pages.</p>
            </div>

            <div class="pmd-profile-card">
                @php
                    $socialRows = [
                        ['key' => 'website', 'label' => 'Website', 'placeholder' => 'https://yourrestaurant.com'],
                        ['key' => 'instagram', 'label' => 'Instagram', 'placeholder' => 'https://instagram.com/...'],
                        ['key' => 'google', 'label' => 'Google / Maps', 'placeholder' => 'https://maps.google.com/...'],
                        ['key' => 'trustpilot', 'label' => 'Trustpilot', 'placeholder' => 'https://trustpilot.com/...'],
                    ];
                @endphp

                <div class="pmd-profile-social-list">
                    @foreach($socialRows as $social)
                        <div class="pmd-profile-social-row">
                            <div class="pmd-profile-social-row__name">
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

                            <label class="pmd-profile-field pmd-profile-social-row__url">
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
        </section>

        <div class="pmd-profile-bottom-save">
            <button type="submit" class="pmd-profile-save">Save changes</button>
        </div>
    </form>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-restaurant-v1.js?v=20260808_1"></script>
