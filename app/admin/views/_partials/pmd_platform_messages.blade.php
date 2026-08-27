{{--
    Canonical PMD/custom platform message payload.
    Native TastyIgniter strings continue to use native lang() keys.
--}}
@php
    $pmdPlatformLocale = \Admin\Classes\PmdPlatformI18n::currentLocale();
    $pmdPlatformMessages = \Admin\Classes\PmdPlatformI18n::messages($pmdPlatformLocale);
    $pmdPlatformRuntime = base_path('app/admin/assets/js/pmd-platform-messages.js');
    $pmdPlatformRuntimeVersion = is_file($pmdPlatformRuntime)
        ? (string)filemtime($pmdPlatformRuntime)
        : '1';
@endphp
<script id="pmd-platform-messages-boot">
window.PMD_PLATFORM_MESSAGES_LOCALE = @json($pmdPlatformLocale);
window.PMD_PLATFORM_MESSAGES = @json($pmdPlatformMessages);
</script>
<script src="/app/admin/assets/js/pmd-platform-messages.js?v={{ $pmdPlatformRuntimeVersion }}"></script>
