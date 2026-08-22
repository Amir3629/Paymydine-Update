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

    /* PMD_ADMIN_FAVICON_HEAD_AUTHORITY_V3
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
    sizes="any"
    href="/app/admin/assets/images/favicon.svg?v={{ $pmdAdminFaviconVersion }}-pmd-admin-v3"
>
<link
    id="pmd-admin-shortcut-favicon-authority-v3"
    rel="shortcut icon"
    type="image/svg+xml"
    sizes="any"
    href="/app/admin/assets/images/favicon.svg?v={{ $pmdAdminFaviconVersion }}-pmd-admin-v3"
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
     The shared Admin layout writes its <title> after this partial. The previous
     V1 waited for DOMContentLoaded, allowing the legacy/site title (including
     TastyIgniter) to be visible in the browser tab during first paint. V2 seeds
     the server-known page title immediately, removes the later duplicate title
     as the parser adds it, and keeps the existing smooth-navigation fallback.
     Public restaurant/site naming remains untouched. --}}
<script id="pmd-admin-title-authority-v2">
(function () {
    'use strict';

    var BRAND = 'PayMyDine';
    var LEGACY_SITE_NAME = @json((string)setting('site_name'));
    var INITIAL_PAGE_TITLE = @json(trim((string)\Admin\Facades\Template::getTitle()));
    var titleObserver = null;

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
        var next = normalize(document.title || INITIAL_PAGE_TITLE);
        if (document.title !== next) {
            document.title = next;
        }
        return next;
    }

    function seedFirstPaintTitle() {
        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return apply();

        var titles = head.getElementsByTagName('title');
        var primary = titles.length ? titles[0] : null;

        if (!primary) {
            primary = document.createElement('title');
            primary.setAttribute('data-pmd-admin-title-authority', 'v2');
            primary.textContent = normalize(INITIAL_PAGE_TITLE);
            head.insertBefore(primary, head.firstChild || null);
        } else {
            primary.textContent = normalize(primary.textContent || INITIAL_PAGE_TITLE);
        }

        // default.blade.php emits its legacy <title> after this partial. Keep
        // the seeded PMD title as the sole browser-title authority.
        for (var i = titles.length - 1; i > 0; i -= 1) {
            titles[i].parentNode.removeChild(titles[i]);
        }

        return apply();
    }

    function stopFirstPaintGuard() {
        seedFirstPaintTitle();
        if (titleObserver) {
            titleObserver.disconnect();
            titleObserver = null;
        }
    }

    seedFirstPaintTitle();

    if (window.MutationObserver && document.head) {
        titleObserver = new MutationObserver(seedFirstPaintTitle);
        titleObserver.observe(document.head, {
            childList: true
        });
    }

    window.PMDAdminTitleAuthorityV2 = {
        version: '2.0.0',
        brand: BRAND,
        legacySiteName: LEGACY_SITE_NAME,
        initialPageTitle: INITIAL_PAGE_TITLE,
        normalize: normalize,
        apply: seedFirstPaintTitle,
        audit: function () {
            var titleCount = document.head
                ? document.head.getElementsByTagName('title').length
                : 0;
            return {
                version: '2.0.0',
                brand: BRAND,
                legacySiteName: LEGACY_SITE_NAME,
                initialPageTitle: INITIAL_PAGE_TITLE,
                title: document.title,
                titleCount: titleCount,
                normalized: normalize(document.title || INITIAL_PAGE_TITLE),
                ok: titleCount === 1 && document.title === normalize(document.title || INITIAL_PAGE_TITLE)
            };
        }
    };

    // Compatibility alias for any console/QA snippets written against V1.
    window.PMDAdminTitleAuthorityV1 = window.PMDAdminTitleAuthorityV2;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stopFirstPaintGuard, { once: true });
    } else {
        stopFirstPaintGuard();
    }

    document.addEventListener('pageContentLoaded', seedFirstPaintTitle, false);
    window.addEventListener('pageshow', seedFirstPaintTitle, false);
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
