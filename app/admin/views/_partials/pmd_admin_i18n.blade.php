{{--
    PMD_ADMIN_I18N_V1

    Clean global EN/DE boot layer.
    - Locale authority: pmd_admin_locale cookie, then current app locale.
    - German pages are hidden before first paint.
    - External catalogue/runtime reveal the page after the first translation.
--}}
@php
    $pmdAdminLocale = strtolower(trim((string)request()->cookie(
        'pmd_admin_locale',
        app()->getLocale()
    )));

    if (!in_array($pmdAdminLocale, ['en', 'de'], true)) {
        $pmdAdminLocale = 'en';
    }

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

    // PMD_I18N_PAGE_AUTHORITY_CONTENT_VERSION_V3
    // The previous loader used one permanent 20260803 URL, so browsers could
    // keep executing an old route list even after the file changed on disk.
    $pmdPageAuthorityPath = base_path(
        'app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js'
    );

    $pmdKpiOverlayPath = base_path(
        'app/admin/assets/css/pmd-kpi-overlay-order-v1.css'
    );

    $pmdKpiUniqueColorsPath = base_path(
        'app/admin/assets/css/pmd-kpi-unique-colors-v1.css'
    );

    $pmdFloorToolbarJsPath = base_path(
        'app/admin/assets/js/pmd-floor-toolbar-authority-v1.js'
    );

    /* PMD_ADMIN_FAVICON_HEAD_AUTHORITY_V2
     * This partial is in the common Admin <head>, including clean Lab pages.
     * Use the exact PMD favicon that is already correct on PmdSettings and
     * version it from the real file mtime so old tab icons cannot survive a
     * favicon asset replacement under a stale URL.
     */
    $pmdAdminFaviconPath = base_path(
        'app/admin/assets/images/favicon.svg'
    );

    $pmdAdminFaviconVersion = is_file($pmdAdminFaviconPath)
        ? (string)filemtime($pmdAdminFaviconPath)
        : 'pmd-admin-v2';

    $pmdCatalogueVersion = is_file($pmdCataloguePath)
        ? (string)filemtime($pmdCataloguePath)
        : 'missing';

    $pmdRuntimeVersion = is_file($pmdRuntimePath)
        ? (string)filemtime($pmdRuntimePath)
        : '1';

    $pmdPageAuthorityVersion = is_file($pmdPageAuthorityPath)
        ? (string)filemtime($pmdPageAuthorityPath)
        : '1';

    $pmdKpiOverlayVersion = is_file($pmdKpiOverlayPath)
        ? (string)filemtime($pmdKpiOverlayPath)
        : '1';

    $pmdKpiUniqueColorsVersion = is_file($pmdKpiUniqueColorsPath)
        ? (string)filemtime($pmdKpiUniqueColorsPath)
        : '1';

    $pmdFloorToolbarJsVersion = is_file($pmdFloorToolbarJsPath)
        ? (string)filemtime($pmdFloorToolbarJsPath)
        : '1';

    $pmdAdminCleanLabRoute = trim((string)request()->path(), '/');

    $pmdKpiOverlayRoute = in_array(
        $pmdAdminCleanLabRoute,
        [
            'admin/dashboardlab',
            'admin/managerlab',
            'admin/reservationslab',
            'admin/cashierlab',
            'admin/accountantlab',
        ],
        true
    );

    $pmdFloorToolbarRoute = in_array(
        $pmdAdminCleanLabRoute,
        [
            'admin/dashboardlab',
            'admin/managerlab',
            'admin/reservationslab',
            'admin/cashierlab',
        ],
        true
    );
@endphp

<link
    id="pmd-admin-favicon-authority-v2"
    rel="icon"
    type="image/svg+xml"
    href="/app/admin/assets/images/favicon.svg?v={{ $pmdAdminFaviconVersion }}"
>
<link
    rel="shortcut icon"
    type="image/x-icon"
    href="/favicon.ico?v={{ $pmdAdminFaviconVersion }}"
>

<style id="pmd-admin-i18n-critical-style">
    html.pmd-i18n-pending {
        background: #f8fbfd !important;
    }

    html.pmd-i18n-pending body {
        visibility: hidden !important;
    }
</style>

@if($pmdFloorToolbarRoute)
<style id="pmd-floor-toolbar-authority-v1-critical">
    /* PMD_FLOOR_TOOLBAR_AUTHORITY_V1: hide redundant Fit before first paint. */
    #pmd-r2-floor-toolbar-v316 [data-pmd-r2-tool="fit"] {
        display: none !important;
    }
</style>
@endif

<script id="pmd-admin-i18n-boot">
(function () {
    'use strict';

    window.PMD_ADMIN_LOCALE = @json($pmdAdminLocale);

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

{{-- PMD_ADMIN_TITLE_AUTHORITY_V1
     Core Admin layout still appends setting('site_name') to Template titles.
     That setting may be the restaurant/site identity or the old TastyIgniter
     default; neither is the PMD product identity for browser tabs. Keep public
     restaurant/site naming untouched and normalize only the Admin document
     title to "<page> - PayMyDine". Smooth transitions emit pageContentLoaded,
     so the same authority is re-applied after AJAX navigation without polling
     or a MutationObserver. --}}
<script id="pmd-admin-title-authority-v1">
(function () {
    'use strict';

    var BRAND = 'PayMyDine';
    var LEGACY_SITE_NAME = @json((string)setting('site_name'));

    function escapeRegExp(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function normalize(input) {
        var title = String(input || '').trim();
        var suffixes = [LEGACY_SITE_NAME, 'TastyIgniter', BRAND];
        var seen = {};

        suffixes.forEach(function (suffix) {
            suffix = String(suffix || '').trim();
            if (!suffix) return;

            var key = suffix.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;

            if (title.toLowerCase() === key) {
                title = '';
                return;
            }

            var pattern = new RegExp(
                '\\s*(?:-|–|—|\\||·)\\s*' + escapeRegExp(suffix) + '\\s*$',
                'i'
            );
            title = title.replace(pattern, '').trim();
        });

        return title ? title + ' - ' + BRAND : BRAND;
    }

    function apply() {
        var next = normalize(document.title);
        if (document.title !== next) {
            document.title = next;
        }
        return next;
    }

    window.PMDAdminTitleAuthorityV1 = {
        version: '1.0.0',
        brand: BRAND,
        legacySiteName: LEGACY_SITE_NAME,
        normalize: normalize,
        apply: apply,
        audit: function () {
            return {
                version: '1.0.0',
                brand: BRAND,
                legacySiteName: LEGACY_SITE_NAME,
                title: document.title,
                normalized: normalize(document.title),
                ok: document.title === normalize(document.title)
            };
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
        apply();
    }

    document.addEventListener('pageContentLoaded', apply, false);
    window.addEventListener('pageshow', apply, false);
})();
</script>

@if($pmdKpiOverlayRoute)
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-kpi-overlay-order-v1.css?v={{ $pmdKpiOverlayVersion }}"
>
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-kpi-unique-colors-v1.css?v={{ $pmdKpiUniqueColorsVersion }}"
>
@endif

@if($pmdFloorToolbarRoute)
<script
    src="/app/admin/assets/js/pmd-floor-toolbar-authority-v1.js?v={{ $pmdFloorToolbarJsVersion }}"
    defer
></script>
@endif

<script
    src="/app/admin/assets/js/pmd-admin-i18n-catalog-de.js?v={{ $pmdCatalogueVersion }}"
    defer
></script>
<script
    src="/app/admin/assets/js/pmd-admin-i18n-v1.js?v={{ $pmdRuntimeVersion }}"
    defer
></script>
<!-- PMD_I18N_PAGE_AUTHORITY_CONTENT_VERSION_V3 -->
<script src="/app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js?v={{ $pmdPageAuthorityVersion }}"></script>

{{-- PMD_ORDER_EDIT_V2_LOADER --}}
@php
    $pmdOrderEditV2Active = function_exists('request')
        && preg_match('#^admin/orders/edit/\d+$#', trim(request()->path(), '/'));
    $pmdOrderEditV2CssPath = base_path('app/admin/assets/css/pmd-order-edit-v2.css');
    $pmdOrderEditV2JsPath = base_path('app/admin/assets/js/pmd-order-edit-v2.js');
    $pmdOrderEditV2CssVersion = is_file($pmdOrderEditV2CssPath)
        ? (string)filemtime($pmdOrderEditV2CssPath)
        : '1';
    $pmdOrderEditV2JsVersion = is_file($pmdOrderEditV2JsPath)
        ? (string)filemtime($pmdOrderEditV2JsPath)
        : '1';
@endphp
@if ($pmdOrderEditV2Active)
<script>document.documentElement.classList.add('pmd-order-edit-v2');</script>
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-order-edit-v2.css?v={{ $pmdOrderEditV2CssVersion }}"
>
<script
    src="/app/admin/assets/js/pmd-order-edit-v2.js?v={{ $pmdOrderEditV2JsVersion }}"
    defer
></script>
@endif
