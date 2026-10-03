<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * PMD_ADMIN_LEGACY_REDIRECT_R77B
 *
 * Purpose:
 * - keep all legacy/shared source code and backend authorities
 * - keep /admin/pmdmenus accessible
 * - keep /admin/pmdsmartcategories accessible
 * - redirect retired browser/document pages to /admin/dashboardlab
 * - never redirect POST/PUT/PATCH/DELETE
 * - never interfere with XHR/JSON backend calls
 */
class PmdAdminRetiredPagesR77
{
    /**
     * H01-H48.
     *
     * Exact legacy page URLs.
     *
     * IMPORTANT:
     * These are exact paths, not prefixes.
     * Therefore backend/action descendants remain untouched.
     */
    private const LEGACY_EXACT = [
        'locations',
        'locations/settings',
        'menus',
        'categories',
        'mealtimes',
        'tables',
        'reservations2',
        'statuses',
        'payments',
        'tips',
        'themes',
        'mail_templates',
        'languages',
        'currencies',
        'countries',
        'kds_stations',
        'media_manager',
        'reviews',
        'settings/edit/setup',
        'settings/edit/tax',
        'settings/edit/user',
        'settings/edit/panel',
        'settings/edit/review_social',
        'settings/edit/biometric_devices',
        'settings/edit/fiskaly',
        'settings/edit/mail',
        'activities',
        'cash_drawers',
        'staffs',
        'staff_groups',
        'staff_roles',
        'system_logs',
        'pos_configs',
        'terminal_devices',
        'customers',
        'customer_groups',
        'allergens',
        'combos',
        'extensions',
        'updates',
        'mail_layouts',
        'mail_partials',
        'request_logs',
        'history',
        'notifications',
    ];

    /**
     * Old experimental/page generations.
     *
     * Browser/document access is redirected.
     * Source code is NOT deleted.
     */
    private const LEGACY_PAGE_PREFIXES = [
        'dashboard2',
        'ownerboard',
        'quick-mode',
        'pmd-ui-kit',
        'floor',
        'dashboardwaiternew',
        'dashboardwaiternew2',
        'waiter',
        'dashboardwaiternewfinal',
        'waiter-final',
        'reservations-waiter-final',
        'dashboardwaiter-final-operations',
        'dashboardwaiternewfinal2',
        'waiter-final2',
        'dashboardwaiternewfinal3',
        'dashboardwaiterworkstation',
        'waiter-workstation',
        'reservations3',
        'reservationsnew',

        /*
         * All Foods has active POST authority for pmdmenus,
         * but its standalone browser GET page is unnecessary.
         */
        'pmdallfoods',
    ];

    public function handle(
        Request $request,
        Closure $next
    ) {
        /*
         * Backend/write authorities are never touched.
         */
        if (
            !in_array(
                strtoupper((string)$request->method()),
                ['GET', 'HEAD'],
                true
            )
        ) {
            return $next($request);
        }

        /*
         * Backend/AJAX/JSON GETs are not browser pages.
         */
        if (!$this->isDocumentRequest($request)) {
            return $next($request);
        }

        $adminUri = strtolower(
            trim(
                (string)config(
                    'system.adminUri',
                    'admin'
                ),
                '/'
            )
        );

        $path = strtolower(
            trim(
                (string)$request->path(),
                '/'
            )
        );

        if (
            $path === $adminUri
            || strpos(
                $path,
                $adminUri.'/'
            ) !== 0
        ) {
            return $next($request);
        }

        $relative = substr(
            $path,
            strlen($adminUri) + 1
        );

        // PMD_ADMIN_SERVER_NATIVE_URLS_R81E
        //
        // Old CURRENT implementation URLs are document compatibility
        // entrances only. POST/AJAX/backend traffic was already excluded
        // above by isDocumentRequest().
        $pmdCanonicalR81E =
            $this->canonicalCurrentCleanR81E(
                $relative
            );

        if (
            $pmdCanonicalR81E
            !== null
        ) {
            $target =
                '/'.$adminUri.'/'.
                $pmdCanonicalR81E;

            $query =
                trim(
                    (string)$request
                        ->getQueryString()
                );

            if ($query !== '') {
                $target .=
                    '?'.$query;
            }

            return redirect(
                $target,
                302
            )
                ->header(
                    'Cache-Control',
                    'no-store, no-cache, must-revalidate, max-age=0'
                )
                ->header(
                    'X-PMD-Canonical-Redirect',
                    'R81E'
                );
        }

        /*
         * Explicitly protected CURRENT surfaces.
         *
         * These must remain directly accessible.
         */
        if (
            $relative === 'dashboardlab'
            || $relative === 'pmdmenus'
            || $relative === 'pmdsmartcategories'
            || strpos(
                $relative,
                'pmdmenus/'
            ) === 0
            || strpos(
                $relative,
                'pmdsmartcategories/'
            ) === 0
        ) {
            return $next($request);
        }

        if (
            in_array(
                $relative,
                self::LEGACY_EXACT,
                true
            )
        ) {
            return $this->dashboardRedirect(
                $adminUri
            );
        }

        foreach (
            self::LEGACY_PAGE_PREFIXES
            as $prefix
        ) {
            if (
                $relative === $prefix
                || strpos(
                    $relative,
                    $prefix.'/'
                ) === 0
            ) {
                return $this->dashboardRedirect(
                    $adminUri
                );
            }
        }

        /*
         * X09:
         * old standalone waiter POS URL.
         *
         * Embedded/current pmd-waiter-pos-v1 endpoints are NOT matched.
         */
        if (
            preg_match(
                '#^waiter-pos/[0-9]+(?:/.*)?$#',
                $relative
            ) === 1
        ) {
            return $this->dashboardRedirect(
                $adminUri
            );
        }

        // PMD_ADMIN_ROLE_404_R80A
        //
        // At this point the request is already:
        // - GET/HEAD
        // - an HTML document
        // - inside /admin/*
        //
        // Valid Admin pages are returned untouched.
        // A genuine unknown page is redirected through /admin/dashboard,
        // which is the existing role-aware landing authority.
        try {
            $response = $next($request);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $error) {
            if ((int)$error->getStatusCode() === 404) {
                return $this->dashboardRedirect(
                    $adminUri
                );
            }

            throw $error;
        }

        if (
            method_exists($response, 'getStatusCode')
            && (int)$response->getStatusCode() === 404
        ) {
            return $this->dashboardRedirect(
                $adminUri
            );
        }

        return $response;
    }

    // PMD_ADMIN_SERVER_NATIVE_URLS_R81E
    private function canonicalCurrentCleanR81E(
        string $relative
    ): ?string {
        $relative = strtolower(
            trim(
                $relative,
                '/'
            )
        );

        $exact = [
            'dashboardlab' =>
                'ownerdashboard',

            'managerlab' =>
                'managerdashboard',

            'accountantlab' =>
                'accountantdashboard',

            'cashierlab' =>
                'orders',

            'reservationslab' =>
                'reservations',

            'pmdmenus' =>
                'menu',

            'pmdsettings' =>
                'settings',

            'pmdsettings/restaurant' =>
                'settings/restaurant',

            'pmdsettings/frontend' =>
                'settings/customer-menu',

            'pmdmenu' =>
                'settings/menu-checkout',

            'pmdcustomer' =>
                'settings/customers',

            // PMD_SHIFTS_SINGLE_TEAM_AUTHORITY_V1
            'pmdteam' =>
                'shifts',

            'people' =>
                'shifts',

            'settings/team' =>
                'shifts',

            'pmddevices' =>
                'settings/devices',

            'pmdfinance' =>
                'settings/finance',

            'pmdbrand' =>
                'settings/brand',

            'pmdadvanced' =>
                'settings/advanced',

            'pmdsmartcategories' =>
                'smartcategories',

            'pmdreports' =>
                'reports/sales',

            'pmdreporttips' =>
                'reports/tips',

            'pmdreportchannels' =>
                'reports/channels',
        ];

        if (
            isset(
                $exact[$relative]
            )
        ) {
            return
                $exact[$relative];
        }

        $prefixMap = [
            'pmdmenus/' =>
                'menu/',

            'pmdmenu/' =>
                'settings/menu-checkout/',

            'pmdcustomer/' =>
                'settings/customers/',

            'pmdteam/' =>
                'settings/team/',

            'pmddevices/' =>
                'settings/devices/',

            'pmdfinance/' =>
                'settings/finance/',

            'pmdbrand/' =>
                'settings/brand/',

            'pmdadvanced/' =>
                'settings/advanced/',

            'pmdsmartcategories/' =>
                'smartcategories/',

            'pmdreports/' =>
                'reports/',
        ];

        foreach (
            $prefixMap
            as $old => $new
        ) {
            if (
                strpos(
                    $relative,
                    $old
                ) === 0
            ) {
                return
                    $new.
                    substr(
                        $relative,
                        strlen($old)
                    );
            }
        }

        if (
            strpos(
                $relative,
                'pmdsettings/restaurant/'
            ) === 0
        ) {
            return
                'settings/restaurant/'.
                substr(
                    $relative,
                    strlen(
                        'pmdsettings/restaurant/'
                    )
                );
        }

        if (
            strpos(
                $relative,
                'pmdsettings/frontend/'
            ) === 0
        ) {
            return
                'settings/customer-menu/'.
                substr(
                    $relative,
                    strlen(
                        'pmdsettings/frontend/'
                    )
                );
        }

        return null;
    }

    private function isDocumentRequest(
        Request $request
    ): bool {
        if ($request->isMethod('HEAD')) {
            return true;
        }

        if ($request->ajax()) {
            return false;
        }

        $fetchDest = strtolower(
            trim(
                (string)$request->headers->get(
                    'Sec-Fetch-Dest',
                    ''
                )
            )
        );

        if (
            in_array(
                $fetchDest,
                ['document', 'iframe'],
                true
            )
        ) {
            return true;
        }

        $accept = strtolower(
            (string)$request->headers->get(
                'Accept',
                ''
            )
        );

        /*
         * Explicit JSON/API requests remain backend requests.
         */
        if (
            strpos(
                $accept,
                'application/json'
            ) !== false
            && strpos(
                $accept,
                'text/html'
            ) === false
        ) {
            return false;
        }

        return
            strpos(
                $accept,
                'text/html'
            ) !== false
            || strpos(
                $accept,
                'application/xhtml+xml'
            ) !== false;
    }

    private function dashboardRedirect(
        string $adminUri
    ) {
        $target =
            '/'.$adminUri.'/dashboard';

        // PMD_ADMIN_ROLE_404_R80A
        // /admin/dashboard resolves the authenticated user's workspace.
        return redirect(
            $target,
            302
        )
            ->header(
                'Cache-Control',
                'no-store, no-cache, must-revalidate, max-age=0'
            )
            ->header(
                'Pragma',
                'no-cache'
            )
            ->header(
                'X-PMD-Legacy-Redirect',
                'R77B'
            )
            ->header(
                'X-PMD-Admin-Role-Fallback',
                'R80A'
            );
    }
}
