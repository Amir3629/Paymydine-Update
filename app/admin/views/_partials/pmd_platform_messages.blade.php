{{--
    Canonical PMD/custom platform message payload.
    One locale file owns PayMyDine wording; the browser runtime only consumes
    the active catalogue plus English source values.
--}}
@php
    $pmdPlatformLocale = \Admin\Classes\PmdPlatformI18n::currentLocale();
    $pmdPlatformMessages = \Admin\Classes\PmdPlatformI18n::messages($pmdPlatformLocale);
    // English values are source text for the locale-neutral DOM compatibility
    // layer. They are not a second translated catalogue.
    $pmdPlatformEnglishMessages = \Admin\Classes\PmdPlatformI18n::messages('en');
    $pmdPlatformRuntime = base_path('app/admin/assets/js/pmd-platform-messages.js');
    $pmdPlatformRuntimeVersion = is_file($pmdPlatformRuntime)
        ? (string)filemtime($pmdPlatformRuntime)
        : '1';
@endphp
<script id="pmd-platform-messages-boot">
window.PMD_PLATFORM_MESSAGES_LOCALE = @json($pmdPlatformLocale);
window.PMD_PLATFORM_MESSAGES = @json($pmdPlatformMessages);
window.PMD_PLATFORM_MESSAGES_ENGLISH = @json($pmdPlatformEnglishMessages);

// Prevent mixed-language first paint for every translated locale. The shared
// admin runtime removes this class immediately after its first translation.
if (window.PMD_PLATFORM_MESSAGES_LOCALE !== 'en') {
    document.documentElement.classList.add('pmd-i18n-pending');
}
</script>
<script src="/app/admin/assets/js/pmd-platform-messages.js?v={{ $pmdPlatformRuntimeVersion }}"></script>
