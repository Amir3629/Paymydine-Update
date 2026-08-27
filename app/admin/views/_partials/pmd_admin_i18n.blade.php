{{--
    PMD_ADMIN_I18N_V1

    Clean global EN/DE boot layer.
    - Locale authority: pmd_admin_locale cookie, then current app locale.
    - German pages are hidden before first paint.
    - External catalogue/runtime reveal the page after the first translation.
--}}
{{-- PMD_PLATFORM_MESSAGES_GLOBAL_V1 --}}
@include('admin::_partials.pmd_platform_messages')
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

    /* PMD_ADMIN_FAVICON_HEAD_AUTHORITY_V3
     * This partial is in the common Admin <head>, including clean Lab pages.
     * Expose one favicon authority only. The old /favicon.ico declaration was
     * a competing icon source and could win from browser cache on some routes.
     */
    $pmdAdminFaviconPath = base_path(
        'app/admin/assets/images/pmd-favicon-final-20260822.svg'
    );

    $pmdAdminFaviconVersion = is_file($pmdAdminFaviconPath)
        ? (string)filemtime($pmdAdminFaviconPath)
        : 'pmd-admin-v3';

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

    // PMD_KPI_INFO_LOADER_V1
    $pmdKpiInfoCssPath = base_path('app/admin/assets/css/pmd-kpi-info-v1.css');
    $pmdKpiInfoJsPath = base_path('app/admin/assets/js/pmd-kpi-info-v1.js');
    $pmdKpiInfoCssVersion = is_file($pmdKpiInfoCssPath) ? (string)filemtime($pmdKpiInfoCssPath) : '1';
    $pmdKpiInfoJsVersion = is_file($pmdKpiInfoJsPath) ? (string)filemtime($pmdKpiInfoJsPath) : '1';

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
    id="pmd-admin-favicon-authority-v3"
    rel="icon"
    type="image/svg+xml"
    href="/app/admin/assets/images/pmd-favicon-final-20260822.svg?v={{ $pmdAdminFaviconVersion }}"
>

<!-- PMD_ADMIN_ROBOTO_FIRST_PAINT_V2 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
    id="pmd-admin-global-roboto-v1"
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;800;900&display=optional"
>

@if($pmdKpiOverlayRoute)
<style id="pmd-kpi-first-paint-stability-v1">
    #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-title,
    #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-value,
    #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-description {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        visibility: visible !important;
    }
</style>
@endif

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

{{-- PMD_ADMIN_TITLE_AUTHORITY_V2
     The common Admin branding partial is parsed before the layout's <title>.
     The old authority waited for DOMContentLoaded, which allowed the legacy
     TastyIgniter/site title to appear in the browser tab for a visible moment.
     Observe the head while the parser creates <title>, normalize it immediately
     to "<page> - PayMyDine", then keep the existing AJAX/pageshow safety net.
     Public restaurant/site naming remains untouched. --}}
<script id="pmd-admin-title-authority-v2">
(function () {
    'use strict';

    var BRAND = 'PayMyDine';
    var LEGACY_SITE_NAME = @json((string)setting('site_name'));
    var firstPaintObserver = null;

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
        var titleNode = document.querySelector('head > title, title');
        if (!titleNode) return '';

        var next = normalize(titleNode.textContent || document.title);
        if (titleNode.textContent !== next) {
            titleNode.textContent = next;
        }
        if (document.title !== next) {
            document.title = next;
        }
        return next;
    }

    function stopFirstPaintObserver() {
        if (!firstPaintObserver) return;
        firstPaintObserver.disconnect();
        firstPaintObserver = null;
    }

    function startFirstPaintObserver() {
        if (!window.MutationObserver || firstPaintObserver) return;

        var root = document.head || document.documentElement;
        if (!root) return;

        firstPaintObserver = new MutationObserver(function () {
            if (!document.querySelector('head > title, title')) return;
            apply();
            stopFirstPaintObserver();
        });

        firstPaintObserver.observe(root, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    window.PMDAdminTitleAuthorityV1 = {
        version: '2.0.0',
        brand: BRAND,
        legacySiteName: LEGACY_SITE_NAME,
        normalize: normalize,
        apply: apply,
        audit: function () {
            return {
                version: '2.0.0',
                brand: BRAND,
                legacySiteName: LEGACY_SITE_NAME,
                title: document.title,
                normalized: normalize(document.title),
                ok: document.title === normalize(document.title)
            };
        }
    };

    // This partial is intentionally before <title>; arm the observer now so
    // the parser-generated legacy title is corrected before first paint.
    startFirstPaintObserver();

    if (document.querySelector('head > title, title')) {
        apply();
        stopFirstPaintObserver();
    }

    document.addEventListener('DOMContentLoaded', function () {
        apply();
        stopFirstPaintObserver();
    }, { once: true });

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
<!-- PMD_KPI_INFO_LOADER_V1 -->
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-kpi-info-v1.css?v={{ $pmdKpiInfoCssVersion }}"
>
<script
    src="/app/admin/assets/js/pmd-kpi-info-v1.js?v={{ $pmdKpiInfoJsVersion }}"
    defer
></script>
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
