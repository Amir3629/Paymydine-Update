{{--
    PMD_ADMIN_KEYED_MESSAGES

    One server-rendered EN/DE message payload for PMD-owned UI.
    No DOM scanning and no locale mutation happens here.
--}}
@php
    $pmdAdminMessagesLocale = \Admin\Classes\PmdAdminI18n::currentLocale();
    $pmdAdminMessages = \Admin\Classes\PmdAdminI18n::messages($pmdAdminMessagesLocale);
    $pmdAdminMessagesRuntimePath = base_path(
        'app/admin/assets/js/pmd-admin-messages-v1.js'
    );
    $pmdAdminMessagesRuntimeVersion = is_file($pmdAdminMessagesRuntimePath)
        ? (string)filemtime($pmdAdminMessagesRuntimePath)
        : '1';
@endphp
<script id="pmd-admin-keyed-messages-boot">
window.PMD_ADMIN_MESSAGES_LOCALE = @json($pmdAdminMessagesLocale);
window.PMD_ADMIN_MESSAGES = @json($pmdAdminMessages);
window.PMD_ADMIN_LOCALE = window.PMD_ADMIN_LOCALE || window.PMD_ADMIN_MESSAGES_LOCALE;
</script>
<script
    src="/app/admin/assets/js/pmd-admin-messages-v1.js?v={{ $pmdAdminMessagesRuntimeVersion }}"
></script>
