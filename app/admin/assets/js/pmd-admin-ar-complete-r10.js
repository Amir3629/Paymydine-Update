(function () {
    'use strict';

    // PMD_ADMIN_AR_COMPLETE_RUNTIME_R10
    // Arabic-only late authority. The canonical catalogue remains the wording
    // authority; this runtime only re-applies the locale-neutral translator
    // after legacy PMD widgets inject stable English platform copy.
    var VERSION = '10.0.0';
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
            return true;
        }

        return false;
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
                    translate();
                })
                .catch(function (error) {
                    console.warn(
                        '[PMD Admin Arabic R10] analytics locale refresh skipped',
                        error
                    );
                });
        } catch (error) {
            console.warn(
                '[PMD Admin Arabic R10] analytics locale refresh skipped',
                error
            );
        }
    }

    function schedule(delay, callback) {
        timers.push(window.setTimeout(callback, delay));
    }

    function runWave() {
        [0, 60, 180, 400, 800, 1400, 2400, 3800].forEach(function (delay) {
            schedule(delay, function () {
                translate();
                if (delay >= 180) refreshAnalyticsForArabicDates();
            });
        });
    }

    function onAsyncContent() {
        schedule(0, translate);
        schedule(80, translate);
        schedule(260, translate);
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
            translate();
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
        document.addEventListener('DOMContentLoaded', runWave, {once: true});
    } else {
        runWave();
    }

    document.addEventListener('ajaxUpdateComplete', onAsyncContent, true);
    document.addEventListener('ajaxPromiseDone', onAsyncContent, true);
    document.addEventListener('pageContentLoaded', onAsyncContent, true);
    window.addEventListener('pageshow', onAsyncContent, false);
    window.addEventListener('load', function () {
        onAsyncContent();
        schedule(300, refreshAnalyticsForArabicDates);
    }, {once: true});

    console.info('[PMD Admin Arabic R10] Ready', {
        version: VERSION,
        locale: locale,
        catalogueDriven: true,
        rtl: true
    });
})();
