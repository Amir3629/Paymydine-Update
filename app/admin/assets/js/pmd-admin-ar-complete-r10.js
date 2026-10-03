(function () {
    'use strict';

    // PMD_ADMIN_AR_SINGLE_OBSERVER_PERF_R13
    // Arabic performance authority. Keep the canonical PMD catalogue and its
    // incremental MutationObserver, but prevent legacy translation layers from
    // registering repeated document-wide rescans on clocks/AJAX/tooltips.
    var VERSION = '13.0.0-single-observer';
    var locale = String(
        window.PMD_PLATFORM_MESSAGES_LOCALE ||
        window.PMD_ADMIN_LOCALE ||
        document.documentElement.lang ||
        ''
    ).toLowerCase();

    if (locale.split(/[-_]/)[0] !== 'ar') return;

    var analyticsRefreshStarted = false;
    var coverageBootstrapInstalled = false;
    var coverageReloadStarted = false;
    var canonicalRunWrapped = false;
    var registrationGuardInstalled = false;
    var timeoutGuardInstalled = false;
    var COVERAGE_BOOTSTRAP_VERSION = '13.0.0-ar-perf-bootstrap';

    var blockedRegistrations = 0;
    var blockedLegacyTimers = 0;
    var disconnectedAuthorities = 0;
    var removedLegacyListeners = 0;
    var suppressedPublicRuns = 0;

    var originalDocumentAddEventListener = document.addEventListener;
    var originalWindowAddEventListener = window.addEventListener;
    var originalSetTimeout = window.setTimeout;

    function sourceOf(listener) {
        if (typeof listener !== 'function') return '';
        try {
            return Function.prototype.toString.call(listener);
        } catch (error) {
            return '';
        }
    }

    function shouldBlockRegistration(scope, type, listener) {
        var source = sourceOf(listener);

        if (!source) return false;

        if (
            scope === 'document' &&
            (type === 'ajaxUpdateComplete' || type === 'ajaxPromiseDone')
        ) {
            // Canonical i18n legacy handler: run() -> translateRoot(document.body)
            if (source.indexOf('translateRoot(document.body)') !== -1) return true;

            // Coverage R12 legacy fallback. Its MutationObserver already owns
            // added/changed nodes, so a full run after every AJAX event is waste.
            if (source.indexOf('requestRun(40)') !== -1) return true;
        }

        if (scope === 'window' && type === 'load') {
            if (source.indexOf('translateRoot(document.body)') !== -1) return true;
            if (source.indexOf('requestRun(0)') !== -1) return true;
        }

        return false;
    }

    function installRegistrationGuard() {
        if (registrationGuardInstalled) return;

        try {
            document.addEventListener = function (type, listener, options) {
                if (shouldBlockRegistration('document', type, listener)) {
                    blockedRegistrations += 1;
                    return;
                }
                return originalDocumentAddEventListener.call(
                    document,
                    type,
                    listener,
                    options
                );
            };

            window.addEventListener = function (type, listener, options) {
                if (shouldBlockRegistration('window', type, listener)) {
                    blockedRegistrations += 1;
                    return;
                }
                return originalWindowAddEventListener.call(
                    window,
                    type,
                    listener,
                    options
                );
            };

            registrationGuardInstalled = true;
        } catch (error) {
            console.warn('[PMD Admin Arabic R13] registration guard unavailable', error);
        }
    }

    function restoreRegistrationGuard() {
        if (!registrationGuardInstalled) return;

        try {
            document.addEventListener = originalDocumentAddEventListener;
            window.addEventListener = originalWindowAddEventListener;
        } catch (error) {}

        registrationGuardInstalled = false;
    }

    function shouldBlockLegacyTimer(callback) {
        var source = sourceOf(callback);

        if (!source) return false;

        // Residual R7 repeated document rescans.
        if (source.indexOf('run(document)') !== -1) return true;

        // Residual R8 repeated full-document selector passes.
        if (
            source.indexOf('fixSettingsTooltip') !== -1 &&
            source.indexOf('fixBarControls') !== -1
        ) {
            return true;
        }

        return false;
    }

    function installTimeoutGuard() {
        if (timeoutGuardInstalled) return;

        try {
            window.setTimeout = function (callback, delay) {
                if (shouldBlockLegacyTimer(callback)) {
                    blockedLegacyTimers += 1;
                    return 0;
                }
                return originalSetTimeout.apply(window, arguments);
            };
            timeoutGuardInstalled = true;
        } catch (error) {
            console.warn('[PMD Admin Arabic R13] timeout guard unavailable', error);
        }
    }

    function restoreTimeoutGuard() {
        if (!timeoutGuardInstalled) return;
        try {
            window.setTimeout = originalSetTimeout;
        } catch (error) {}
        timeoutGuardInstalled = false;
    }

    // PMD_ADMIN_AR_COVERAGE_CACHE_GUARD_R13
    // Block the old fixed-query coverage asset before it can register an old
    // observer. A fresh R12 incremental coverage copy is loaded after defer boot.
    if (!window.PMDAdminCoverageR3) {
        window.PMDAdminCoverageR3 = {
            version: COVERAGE_BOOTSTRAP_VERSION,
            run: function () {},
            audit: function () {
                return {
                    version: COVERAGE_BOOTSTRAP_VERSION,
                    locale: locale,
                    bootstrap: true
                };
            }
        };
        coverageBootstrapInstalled = true;
    }

    function enforceDocumentLocale() {
        document.documentElement.setAttribute('lang', 'ar');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.classList.add('pmd-admin-rtl');
    }

    function disconnectAuthority(name, method) {
        var authority = window[name];
        if (!authority || typeof authority[method] !== 'function') return false;

        try {
            authority[method]();
            disconnectedAuthorities += 1;
            return true;
        } catch (error) {
            return false;
        }
    }

    function removePageAuthorityListeners() {
        var authority = window.PMDAdminI18nPageAuthorityV2;
        var refresh;

        if (!authority || typeof authority.refresh !== 'function') return false;
        refresh = authority.refresh;

        try {
            document.removeEventListener('ajaxUpdateComplete', refresh, true);
            document.removeEventListener('ajaxPromiseDone', refresh, true);
            window.removeEventListener('load', refresh, false);
            removedLegacyListeners += 3;
            return true;
        } catch (error) {
            return false;
        }
    }

    function disconnectLegacyAuthorities() {
        // Dashboard page-authority treats non-DE/TR as English and owns both a
        // full-document observer and AJAX/load full-scan listeners. Arabic is
        // already owned by canonical i18n, so remove both forms of authority.
        removePageAuthorityListeners();
        disconnectAuthority('PMDAdminI18nPageAuthorityV2', 'destroy');

        // Residual R7/R8 were useful during catalogue discovery, but their
        // document-level observers are redundant now that Arabic has complete
        // canonical/literal coverage.
        disconnectAuthority('PMDAdminResidualI18nR7', 'disconnect');
        disconnectAuthority('PMDAdminResidualI18nR8', 'disconnect');
    }

    function wrapCanonicalPublicRun() {
        var api = window.PMDAdminI18n;
        var originalRun;

        if (!api || canonicalRunWrapped) return false;
        if (typeof api.run !== 'function') return false;

        originalRun = api.run;

        try {
            // PMD_ADMIN_AR_CANONICAL_AJAX_LISTENER_REMOVAL_R13
            // Defensive removal in case the temporary registration guard was
            // not early enough in a browser. removeEventListener receives the
            // exact same canonical run() function object used at registration.
            document.removeEventListener('ajaxUpdateComplete', originalRun, true);
            document.removeEventListener('ajaxPromiseDone', originalRun, true);
            window.removeEventListener('load', originalRun, false);
            removedLegacyListeners += 3;

            api.runFull = function () {
                return originalRun.apply(api, arguments);
            };
            api.run = function () {
                suppressedPublicRuns += 1;
                if (typeof api.reveal === 'function') {
                    try { api.reveal(); } catch (error) {}
                }
                return true;
            };
            api.__pmdArabicR13PublicRunGuard = true;
            canonicalRunWrapped = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    function retryRuntimeGuards() {
        disconnectLegacyAuthorities();
        wrapCanonicalPublicRun();
    }

    function loadIncrementalCoverage() {
        var current;
        var script;

        if (!coverageBootstrapInstalled || coverageReloadStarted) return;

        current = window.PMDAdminCoverageR3;
        if (!current || current.version !== COVERAGE_BOOTSTRAP_VERSION) return;

        coverageReloadStarted = true;

        try {
            delete window.PMDAdminCoverageR3;
        } catch (error) {
            window.PMDAdminCoverageR3 = null;
        }

        script = document.createElement('script');
        script.src = '/app/admin/assets/js/pmd-admin-coverage-r3-v11b.js?v=20260901-r13-single-observer';
        script.async = true;
        script.setAttribute('data-pmd-admin-coverage-r13', '1');
        script.onload = function () {
            retryRuntimeGuards();
            restoreRegistrationGuard();
        };
        script.onerror = function () {
            console.warn('[PMD Admin Arabic R13] incremental coverage reload failed');
            restoreRegistrationGuard();
        };
        (document.head || document.documentElement).appendChild(script);
    }

    function refreshAnalyticsForArabicDates() {
        var path;

        if (analyticsRefreshStarted) return;

        path = String(
            window.PMDAdminCanonicalURLR81E
                ? window.PMDAdminCanonicalURLR81E.logicalPath()
                : window.location.pathname
        ).replace(/\/+$/, '');

        if (
            ['/admin/dashboardlab', '/admin/managerlab', '/admin/accountantlab']
                .indexOf(path) === -1
        ) {
            return;
        }

        if (
            !window.PMDDashboardLabAnalyticsV1 ||
            typeof window.PMDDashboardLabAnalyticsV1.refresh !== 'function'
        ) {
            return;
        }

        analyticsRefreshStarted = true;

        try {
            Promise.resolve(window.PMDDashboardLabAnalyticsV1.refresh())
                .catch(function (error) {
                    console.warn(
                        '[PMD Admin Arabic R13] analytics locale refresh skipped',
                        error
                    );
                });
        } catch (error) {
            console.warn(
                '[PMD Admin Arabic R13] analytics locale refresh skipped',
                error
            );
        }
    }

    function schedule(delay, callback) {
        return originalSetTimeout.call(window, callback, delay);
    }

    function boot() {
        enforceDocumentLocale();
        retryRuntimeGuards();

        // Let the remaining defer scripts finish first. The bootstrap object
        // makes the old fixed-query coverage runtime exit harmlessly.
        schedule(0, function () {
            retryRuntimeGuards();
            loadIncrementalCoverage();
        });

        schedule(80, retryRuntimeGuards);
        schedule(300, retryRuntimeGuards);
        schedule(350, refreshAnalyticsForArabicDates);

        // Registration guard only needs to survive canonical + coverage boot.
        // Keep a fallback so a failed asset request cannot leave it installed.
        schedule(2200, restoreRegistrationGuard);
    }

    function afterDomReady() {
        retryRuntimeGuards();
        restoreTimeoutGuard();
    }

    function visibleEnglishPlatformCopy() {
        var pattern = /\b(?:Revenue|Guests Served|Table Turnover|Dine In|Take Away|Kitchen Ticket Time|Table Occupancy|Menu Availability|Sales over time|Sales by category|Sales by hour|Payment methods|Recent transactions|Alerts|Live orders|Occupied tables|Needs attention|Upcoming reservations|Upcoming events|Top-selling(?: items)?|Tips summary|Latest reviews|Source unavailable|No tables match this view|Add table|Edit table|Add floor|failed payments|refunds|out of stock|negative reviews|No enabled categories sold in this period)\b/i;
        var results = [];

        if (!document.body) return results;

        Array.prototype.forEach.call(
            document.querySelectorAll('body *'),
            function (element) {
                if (element.children.length !== 0) return;
                if (element.closest('script, style, textarea, [contenteditable="true"], [data-pmd-i18n-skip], .pmd-i18n-skip')) return;

                var style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden') return;

                var rect = element.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return;

                var text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
                if (!text || !pattern.test(text)) return;

                results.push({
                    text: text,
                    tag: element.tagName,
                    id: element.id || '',
                    className: String(element.className || '').slice(0, 160)
                });
            }
        );

        return results.slice(0, 200);
    }

    installRegistrationGuard();
    installTimeoutGuard();
    enforceDocumentLocale();
    disconnectLegacyAuthorities();

    // For defer execution readyState is commonly "interactive". Boot now so
    // the registration guard is active before the next defer script executes.
    boot();

    if (document.readyState === 'loading' || document.readyState === 'interactive') {
        originalDocumentAddEventListener.call(
            document,
            'DOMContentLoaded',
            afterDomReady,
            {once: true}
        );
    } else {
        afterDomReady();
    }

    originalWindowAddEventListener.call(window, 'pageshow', function () {
        enforceDocumentLocale();
        retryRuntimeGuards();
    }, false);

    originalWindowAddEventListener.call(window, 'load', function () {
        retryRuntimeGuards();
        restoreTimeoutGuard();
        schedule(50, refreshAnalyticsForArabicDates);
    }, {once: true});

    window.PMDAdminArabicR10 = {
        version: VERSION,
        run: function () {
            enforceDocumentLocale();
            retryRuntimeGuards();
            refreshAnalyticsForArabicDates();
            return window.PMDAdminArabicR10.audit();
        },
        fullScan: function () {
            var api = window.PMDAdminI18n;
            if (api && typeof api.runFull === 'function') {
                return api.runFull();
            }
            return false;
        },
        audit: function () {
            var canonical = (
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.auditVisible === 'function'
            ) ? window.PMDAdminI18n.auditVisible() : null;
            var coveragePerf = null;
            var visibleEnglish = visibleEnglishPlatformCopy();

            if (
                window.PMDAdminCoverageR3 &&
                typeof window.PMDAdminCoverageR3.perf === 'function'
            ) {
                coveragePerf = window.PMDAdminCoverageR3.perf();
            }

            return {
                version: VERSION,
                locale: String(document.documentElement.lang || ''),
                direction: String(document.documentElement.dir || ''),
                blockedRegistrations: blockedRegistrations,
                blockedLegacyTimers: blockedLegacyTimers,
                disconnectedAuthorities: disconnectedAuthorities,
                removedLegacyListeners: removedLegacyListeners,
                suppressedPublicRuns: suppressedPublicRuns,
                canonicalRunWrapped: canonicalRunWrapped,
                coverageReloadStarted: coverageReloadStarted,
                coveragePerf: coveragePerf,
                canonicalAudit: canonical,
                criticalEnglishCount: visibleEnglish.length,
                criticalEnglish: visibleEnglish,
                ok: document.documentElement.lang.indexOf('ar') === 0 &&
                    document.documentElement.dir === 'rtl' &&
                    visibleEnglish.length === 0
            };
        }
    };

    console.info('[PMD Admin Arabic R13] Ready', {
        version: VERSION,
        locale: locale,
        singleObserverMode: true,
        coverageCacheGuarded: coverageBootstrapInstalled
    });
})();
