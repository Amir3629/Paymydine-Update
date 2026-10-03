{{-- PMD_SETTINGS_FAMILY_NOTIFICATION_PLACEHOLDER_V18 --}}
@php
    try {
        $pmdSettingsFamilyNotificationCountV18 =
            (int)app(
                \Admin\Services\PmdNotificationCountV1::class
            )->currentNewCount();
    } catch (\Throwable $error) {
        $pmdSettingsFamilyNotificationCountV18 = 0;
    }
@endphp

<span
    class="pmd-settings-family-notif-slot-v18"
    data-pmd-settings-family-notif-slot-v18
    aria-label="Notifications"
>
    <span
        class="pmd-settings-family-notif-visual-v18"
        data-pmd-settings-family-notif-visual-v18
        aria-hidden="true"
    >
        <span class="pmd-settings-family-notif-bell-v18">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        </span>

        
        <span
            class="pmd-settings-family-notif-count-v18{{ $pmdSettingsFamilyNotificationCountV18 > 0 ? '' : ' d-none' }}"
            data-pmd-settings-family-notification-count-v18
            aria-hidden="true"
        >
            {{ $pmdSettingsFamilyNotificationCountV18 }}
        </span>

    </span>
</span>
