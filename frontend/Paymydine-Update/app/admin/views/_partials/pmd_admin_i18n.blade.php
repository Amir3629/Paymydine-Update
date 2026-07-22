{{--
    PMD_ADMIN_I18N_V1_1

    Clean global EN/DE browser boot layer.
    - Server locale is applied early by app/admin/i18n/pmd_admin_locale_bootstrap.php.
    - This partial reads the resolved request locale and keeps a safe view fallback.
    - German pages are hidden before first paint.
    - External catalogue/runtime reveal the page after the first translation.
--}}
@php
    $pmdAdminLocale = request()->attributes->get(
        'pmd_admin_locale',
        request()->cookie('pmd_admin_locale', app()->getLocale())
    );

    $pmdAdminLocale = strtolower(trim((string)$pmdAdminLocale));
    $pmdAdminLocale = str_replace('_', '-', $pmdAdminLocale);
    $pmdAdminLocale = explode('-', $pmdAdminLocale, 2)[0];

    if (!in_array($pmdAdminLocale, ['en', 'de'], true)) {
        $pmdAdminLocale = 'en';
    }

    // View-level fallback. The early bootstrap should already have done this
    // before the controller prepared translated page data.
    app()->setLocale($pmdAdminLocale);

    if (app()->bound('translator.localization')) {
        app('translator.localization')->setLocale(
            $pmdAdminLocale,
            false
        );
    }

    $pmdCataloguePath = base_path(
        'app/admin/assets/js/pmd-admin-i18n-catalog-de.js'
    );

    $pmdRuntimePath = base_path(
        'app/admin/assets/js/pmd-admin-i18n-v1.js'
    );

    $pmdCatalogueVersion = is_file($pmdCataloguePath)
        ? (string)filemtime($pmdCataloguePath)
        : 'missing';

    $pmdRuntimeVersion = is_file($pmdRuntimePath)
        ? (string)filemtime($pmdRuntimePath)
        : '1';
@endphp

<style id="pmd-admin-i18n-critical-style">
    html.pmd-i18n-pending {
        background: #f8fbfd !important;
    }

    html.pmd-i18n-pending body {
        visibility: hidden !important;
    }
</style>

<script id="pmd-admin-i18n-boot">
(function () {
    'use strict';

    window.PMD_ADMIN_LOCALE = @json($pmdAdminLocale);
    window.PMD_ADMIN_LOCALE_SOURCE = @json(
        request()->attributes->has('pmd_admin_locale')
            ? 'early-bootstrap'
            : 'view-fallback'
    );

    document.documentElement.setAttribute(
        'lang',
        window.PMD_ADMIN_LOCALE
    );

    if (window.PMD_ADMIN_LOCALE === 'de') {
        document.documentElement.classList.add(
            'pmd-i18n-pending'
        );
    }

    window.setTimeout(function () {
        document.documentElement.classList.remove(
            'pmd-i18n-pending'
        );
    }, 4500);
})();
</script>

<script
    src="/app/admin/assets/js/pmd-admin-i18n-catalog-de.js?v={{ $pmdCatalogueVersion }}"
    defer
></script>
<script
    src="/app/admin/assets/js/pmd-admin-i18n-v1.js?v={{ $pmdRuntimeVersion }}"
    defer
></script>
