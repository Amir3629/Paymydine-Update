(function () {
    'use strict';

    // PMD_ADMIN_AR_COMPLETE_RUNTIME_R12_PERF
    // Arabic-only late authority. The canonical catalogue remains the wording
    // authority. R12 deliberately coalesces late re-apply work so dynamic Admin
    // pages do not repeatedly full-scan the DOM during clocks/AJAX updates.
    var VERSION = '12.0.0-perf';
    var locale = String(
        window.PMD_PLATFORM_MESSAGES_LOCALE ||
        window.PMD_ADMIN_LOCALE ||
        document.documentElement.lang ||
        ''
    ).toLowerCase();

    if (locale.split('-')[0] !== 'ar') return;

    var timers = [];
    var analyticsRefreshStarted = false;
    var runCount = 0;
    var requestedCount = 0;
    var coalescedCount = 0;
    var translateTimer = null;
    var lastTranslateAt = 0;
    var MIN_TRANSLATE_INTERVAL_MS = 220;

    function enforceDocumentLocale() {
        document.documentElement.setAttribute('lang', 'ar');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.classList.add('pmd-admin-rtl');
    }

    function translate() {
        enforceDocumentLocale();

        if (
            window.PMDAdminI18n &&
            typeof window.PMDAdminI18n.run === 'function'
        ) {
            window.PMDAdminI18n.run();
            runCount += 1;
            lastTranslateAt = Date.now();
            return true;
        }

        return false;
    }

    // PMD_ADMIN_AR_TRANSLATE_COALESCE_R12
    // One late full pass per burst at most. The canonical PMDAdminI18n
    // MutationObserver already translates individual added/changed nodes.
    function requestTranslate(delay) {
        var now = Date.now();
        var wait = Math.max(0, Number(delay || 0));
        var sinceLast = now - lastTranslateAt;

        requestedCount += 1;

        if (sinceLast < MIN_TRANSLATE_INTERVAL_MS) {
            wait = Math.max(wait, MIN_TRANSLATE_INTERVAL_MS - sinceLast);
        }

        if (translateTimer !== null) {
            coalescedCount += 1;
            return;
        }

        translateTimer = window.setTimeout(function () {
            translateTimer = null;
            translate();
        }, wait);
    }

    function refreshAnalyticsForArabicDates() {
        if (analyticsRefreshStarted) return;

        var path = String(
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
                .then(function () {
                    requestTranslate(80);
                })
                .catch(function (error) {
                    console.warn(
                        '[PMD Admin Arabic R12] analytics locale refresh skipped',
                        error
                    );
                });
        } catch (error) {
            console.warn(
                '[PMD Admin Arabic R12] analytics locale refresh skipped',
                error
            );
        }
    }

    function schedule(delay, callback) {
        timers.push(window.setTimeout(callback, delay));
    }

    function initialPass() {
        // One safety pass after the normal global translator has booted. R10
        // used eight full-body waves here; the shared observer makes them
        // redundant and very expensive on large Admin workspaces.
        requestTranslate(0);
        schedule(260, refreshAnalyticsForArabicDates);
    }

    function onAsyncContent() {
        // AJAX libraries may emit several completion events for one visual
        // update. Coalesce all of them into one delayed safety pass.
        requestTranslate(90);
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

    window.PMDAdminArabicR10 = {
        version: VERSION,
        run: function () {
            requestTranslate(0);
            refreshAnalyticsForArabicDates();
            return window.PMDAdminArabicR10.audit();
        },
        audit: function () {
            var canonical = (
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.auditVisible === 'function'
            ) ? window.PMDAdminI18n.auditVisible() : null;
            var visibleEnglish = visibleEnglishPlatformCopy();

            return {
                version: VERSION,
                locale: String(document.documentElement.lang || ''),
                direction: String(document.documentElement.dir || ''),
                runCount: runCount,
                requestedCount: requestedCount,
                coalescedCount: coalescedCount,
                analyticsRefreshStarted: analyticsRefreshStarted,
                canonicalAudit: canonical,
                criticalEnglishCount: visibleEnglish.length,
                criticalEnglish: visibleEnglish,
                ok: document.documentElement.lang.indexOf('ar') === 0 &&
                    document.documentElement.dir === 'rtl' &&
                    visibleEnglish.length === 0
            };
        }
    };

    enforceDocumentLocale();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialPass, {once: true});
    } else {
        initialPass();
    }

    document.addEventListener('ajaxUpdateComplete', onAsyncContent, true);
    document.addEventListener('ajaxPromiseDone', onAsyncContent, true);
    document.addEventListener('pageContentLoaded', onAsyncContent, true);
    window.addEventListener('pageshow', onAsyncContent, false);
    window.addEventListener('load', function () {
        requestTranslate(90);
        schedule(260, refreshAnalyticsForArabicDates);
    }, {once: true});

    console.info('[PMD Admin Arabic R12] Ready', {
        version: VERSION,
        locale: locale,
        catalogueDriven: true,
        rtl: true,
        coalescedLateTranslation: true
    });
})();
