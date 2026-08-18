(function () {
    'use strict';

    // PMD_CLEAN_ROLE_WORKSPACE_I18N_PAGE_SKIP_V1
    // These role workspaces render their EN/DE copy server-first. Do not boot
    // the observer/RAF page-translator that owns Dashboard2/Reservations2/DashboardLab.
    if (/^\/admin\/(?:managerlab|accountantlab|cashierlab|reservationslab)(?:\/|$)/.test(String(location.pathname || ''))) {
        return;
    }

    if (
        window.PMDAdminI18nPageAuthorityV2 &&
        window.PMDAdminI18nPageAuthorityV2.version
    ) {
        window.PMDAdminI18nPageAuthorityV2.refresh();
        return;
    }

    var VERSION = '2.1.0-dashboardlab';

    var allowedRoutes = [
        '/admin/dashboard2',
        '/admin/reservations2',
        '/admin/dashboardlab'
    ];

    var running = false;
    var scheduled = false;
    var applyCount = 0;
    var changedNodes = 0;
    var changedAttributes = 0;
    var observer = null;

    var deCatalogueAdditions = {
        'Calendar': 'Kalender',
        'Hour': 'Stunde',
        'Floor': 'Tischplan',
        'Full Floor': 'Gesamter Tischplan',
        'Full Floor map': 'Gesamter Tischplan',
        'Open calendar view': 'Kalenderansicht öffnen',
        'Open hour timeline': 'Stundenansicht öffnen',

        'Live Tables & Orders': 'Live-Tische und Bestellungen',
        'Live tables and orders': 'Live-Tische und Bestellungen',

        'Kitchen Ticket Time': 'Küchenbon-Zeit',
        'Menu Availability': 'Menüverfügbarkeit',
        'Dine In / Take Away': 'Vor Ort / Zum Mitnehmen',

        'Real-time overview': 'Echtzeitübersicht',
        'REAL-TIME OVERVIEW': 'ECHTZEITÜBERSICHT',
        'Analytics': 'Analysen',
        'Analytics period': 'Analysezeitraum',
        'Chart type': 'Diagrammtyp',

        'Today': 'Heute',
        'Week': 'Woche',
        'Month': 'Monat',
        'Last 30 days': 'Letzte 30 Tage',
        'Last 30 Days': 'Letzte 30 Tage',

        'Sales over time': 'Umsatzverlauf',
        'Sales by category': 'Umsatz nach Kategorie',
        'Sales by hour': 'Umsatz nach Stunde',
        'Payment methods': 'Zahlungsmethoden',
        'Recent transactions': 'Letzte Transaktionen',
        'Live orders / active tables':
            'Live-Bestellungen / aktive Tische',
        'Alerts': 'Warnungen',
        'Top-selling items': 'Meistverkaufte Artikel',
        'Latest reviews': 'Neueste Bewertungen',
        'Tips summary': 'Trinkgeldübersicht',
        'Upcoming events': 'Bevorstehende Ereignisse',
        'Order channels': 'Bestellkanäle',
        'Source unavailable': 'Quelle nicht verfügbar',

        'Line': 'Linie',
        'Bar': 'Balken',
        'Sales over time bar chart':
            'Balkendiagramm des Umsatzverlaufs',
        'Sales by hour bar chart':
            'Balkendiagramm des Umsatzes nach Stunde',

        'Reservations': 'Reservierungen',
        'Reservation date': 'Reservierungsdatum',
        'Reservation date range': 'Reservierungszeitraum',
        'Table': 'Tisch',
        'Tables': 'Tische',
        'Guest': 'Gast',
        'Guests': 'Gäste',
        'guests': 'Gäste',
        'Open': 'Geöffnet',
        'One row': 'Eine Reihe',
        'One Row': 'Eine Reihe',

        'active tables': 'aktive Tische',
        'long open tables': 'lange offene Tische',
        'open orders': 'offene Bestellungen',
        'unassigned reservations':
            'nicht zugewiesene Reservierungen',
        'No data available': 'Keine Daten verfügbar',
        'No reservations': 'Keine Reservierungen'
    };

    var exactGermanToEnglish = {
        'Übersicht': 'Dashboard',
        'Reservierungen': 'Reservations',
        'Kalender': 'Calendar',
        'Stunde': 'Hour',
        'Tischplan': 'Floor',
        'Gesamter Tischplan': 'Full Floor',

        'Live-Tische und Bestellungen':
            'Live Tables & Orders',

        'Küchenbon-Zeit': 'Kitchen Ticket Time',
        'Menüverfügbarkeit': 'Menu Availability',
        'Vor Ort / Zum Mitnehmen':
            'Dine In / Take Away',

        'Echtzeitübersicht': 'Real-time overview',
        'ECHTZEITÜBERSICHT': 'REAL-TIME OVERVIEW',
        'Analysen': 'Analytics',
        'Analysezeitraum': 'Analytics period',
        'Diagrammtyp': 'Chart type',

        'Heute': 'Today',
        'Woche': 'Week',
        'Monat': 'Month',
        'Letzte 30 Tage': 'Last 30 days',

        'Umsatzverlauf': 'Sales over time',
        'Umsatz nach Kategorie': 'Sales by category',
        'Umsatz nach Stunde': 'Sales by hour',
        'Zahlungsmethoden': 'Payment methods',
        'Letzte Transaktionen': 'Recent transactions',
        'Live-Bestellungen / aktive Tische':
            'Live orders / active tables',
        'Warnungen': 'Alerts',
        'Meistverkaufte Artikel': 'Top-selling items',
        'Neueste Bewertungen': 'Latest reviews',
        'Trinkgeldübersicht': 'Tips summary',
        'Bevorstehende Ereignisse': 'Upcoming events',
        'Bestellkanäle': 'Order channels',
        'Quelle nicht verfügbar': 'Source unavailable',

        'Linie': 'Line',
        'Balken': 'Bar',

        'Reservierungsdatum': 'Reservation date',
        'Reservierungszeitraum': 'Reservation date range',
        'Tisch': 'Table',
        'Tische': 'Tables',
        'Gast': 'Guest',
        'Gäste': 'Guests',
        'Geöffnet': 'Open',
        'Eine Reihe': 'One row',

        'aktive Tische': 'active tables',
        'lange offene Tische': 'long open tables',
        'offene Bestellungen': 'open orders',
        'nicht zugewiesene Reservierungen':
            'unassigned reservations',
        'Keine Daten verfügbar': 'No data available',
        'Keine Reservierungen': 'No reservations'
    };

    function routeAllowed() {
        return allowedRoutes.indexOf(location.pathname) !== -1;
    }

    function locale() {
        var value = String(
            window.PMD_ADMIN_LOCALE ||
            document.documentElement.lang ||
            'en'
        ).toLowerCase();

        return value.indexOf('de') === 0 ? 'de' : 'en';
    }

    function installCatalogueEntries() {
        window.PMD_ADMIN_I18N_DE =
            window.PMD_ADMIN_I18N_DE || {};

        Object.keys(deCatalogueAdditions).forEach(function (source) {
            window.PMD_ADMIN_I18N_DE[source] =
                deCatalogueAdditions[source];
        });
    }

    function normalizeEnglishText(value) {
        var text = String(value || '');

        if (!text.trim()) return text;

        var trimmed = text.trim();

        if (
            Object.prototype.hasOwnProperty.call(
                exactGermanToEnglish,
                trimmed
            )
        ) {
            return text.replace(
                trimmed,
                exactGermanToEnglish[trimmed]
            );
        }

        text = text.replace(
            /\bTisch\s+(\d+)\b/g,
            'Table $1'
        );

        text = text.replace(
            /\b(\d+)\s+Gäste\b/g,
            '$1 guests'
        );

        text = text.replace(
            /\bReservierungsdatum\s*:/g,
            'Reservation date:'
        );

        text = text.replace(
            /\bReservierungszeitraum\b/g,
            'Reservation date range'
        );

        text = text.replace(
            /\baktive Tische\b/g,
            'active tables'
        );

        text = text.replace(
            /\blange offene Tische\b/g,
            'long open tables'
        );

        text = text.replace(
            /\bGeöffnet\b/g,
            'Open'
        );

        return text;
    }

    function normalizeGermanText(value) {
        var text = String(value || '');

        if (!text.trim()) return text;

        var trimmed = text.trim();

        if (
            Object.prototype.hasOwnProperty.call(
                deCatalogueAdditions,
                trimmed
            )
        ) {
            return text.replace(
                trimmed,
                deCatalogueAdditions[trimmed]
            );
        }

        text = text.replace(
            /\bTable\s+(\d+)\b/g,
            'Tisch $1'
        );

        text = text.replace(
            /\b(\d+)\s+guests?\b/gi,
            '$1 Gäste'
        );

        text = text.replace(
            /\bReservation date\s*:/g,
            'Reservierungsdatum:'
        );

        text = text.replace(
            /\bReservation date range\b/g,
            'Reservierungszeitraum'
        );

        text = text.replace(
            /\bactive tables\b/gi,
            'aktive Tische'
        );

        text = text.replace(
            /\blong open tables\b/gi,
            'lange offene Tische'
        );

        return text;
    }

    function translateValue(value) {
        if (locale() === 'de') {
            return normalizeGermanText(value);
        }

        return normalizeEnglishText(value);
    }

    function skipElement(element) {
        if (!element || element.nodeType !== 1) return false;

        return Boolean(
            element.closest(
                'script, style, textarea, input, select, option, ' +
                '[contenteditable="true"], ' +
                '[data-pmd-i18n-skip], ' +
                '.pmd-i18n-skip'
            )
        );
    }

    function translateTextNode(node) {
        if (
            !node ||
            node.nodeType !== Node.TEXT_NODE ||
            !node.parentElement ||
            skipElement(node.parentElement)
        ) {
            return;
        }

        var before = node.nodeValue;
        var after = translateValue(before);

        if (after !== before) {
            node.nodeValue = after;
            changedNodes += 1;
        }
    }

    function translateAttributes(element) {
        if (
            !element ||
            element.nodeType !== 1 ||
            skipElement(element)
        ) {
            return;
        }

        [
            'aria-label',
            'title',
            'placeholder',
            'data-original-title'
        ].forEach(function (attribute) {
            if (!element.hasAttribute(attribute)) return;

            var before = element.getAttribute(attribute);
            var after = translateValue(before);

            if (after !== before) {
                element.setAttribute(attribute, after);
                changedAttributes += 1;
            }
        });
    }

    function translateRoot(root) {
        if (!root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (skipElement(root)) return;

        translateAttributes(root);

        var walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT |
            NodeFilter.SHOW_TEXT
        );

        var node;

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                translateTextNode(node);
            } else {
                translateAttributes(node);
            }
        }
    }

    function apply() {
        scheduled = false;

        if (
            running ||
            !routeAllowed() ||
            !document.body
        ) {
            return false;
        }

        running = true;

        try {
            installCatalogueEntries();

            if (
                locale() === 'de' &&
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.run === 'function'
            ) {
                window.PMDAdminI18n.run();
            }

            translateRoot(document.body);
            applyCount += 1;
        } finally {
            running = false;
        }

        return true;
    }

    function schedule() {
        if (scheduled || !routeAllowed()) return;

        scheduled = true;

        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(apply);
        });
    }

    function startObserver() {
        if (
            observer ||
            !document.body ||
            !routeAllowed()
        ) {
            return;
        }

        observer = new MutationObserver(function (mutations) {
            if (running) return;

            var relevant = mutations.some(function (mutation) {
                return (
                    mutation.type === 'characterData' ||
                    mutation.addedNodes.length > 0
                );
            });

            if (relevant) schedule();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function destroy() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function audit() {
        var mixedPattern = locale() === 'de'
            ? /\b(?:Dashboard|Revenue|Guests Served|Table Turnover|Dine In|Take Away|Kitchen Ticket Time|Table Occupancy|Menu Availability|Tips|Today|Current|Connected|samples?|Choose KPI|Calendar|Hour|Floor|Full Floor|Sales over time|Sales by category|Sales by hour|Payment methods|Recent transactions|Alerts|live orders|Order channels|Top-selling items|Tips summary|reviews today|Upcoming events|Source unavailable|No completed table visits|Table\s+\d+|\d+\s+guests|Open)\b/i
            : /\b(?:Übersicht|Umsatzverlauf|Umsatz nach Stunde|Zahlungsarten|Letzte Transaktionen|Warnungen|Meistverkaufte Artikel|Trinkgeldübersicht|Bevorstehende Termine|KPI auswählen|Tisch\s+\d+|\d+\s+Gäste|Geöffnet|aktive Tische|lange offene Tische)\b/i;

        var visibleMixed = [];

        Array.prototype.forEach.call(
            document.querySelectorAll('body *'),
            function (element) {
                if (
                    element.children.length !== 0 ||
                    skipElement(element)
                ) {
                    return;
                }

                var rect = element.getBoundingClientRect();
                var style = getComputedStyle(element);
                var text = String(
                    element.textContent || ''
                ).replace(/\s+/g, ' ').trim();

                if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    rect.width > 0 &&
                    rect.height > 0 &&
                    text &&
                    mixedPattern.test(text)
                ) {
                    visibleMixed.push({
                        text: text,
                        tag: element.tagName,
                        id: element.id || '',
                        className: String(
                            element.className || ''
                        ).slice(0, 140)
                    });
                }
            }
        );

        return {
            version: VERSION,
            route: location.pathname,
            routeAllowed: routeAllowed(),
            locale: locale(),
            runtimeLocale:
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.locale === 'function'
                    ? window.PMDAdminI18n.locale()
                    : null,
            catalogueEntries:
                Object.keys(
                    window.PMD_ADMIN_I18N_DE || {}
                ).length,
            applyCount: applyCount,
            changedNodes: changedNodes,
            changedAttributes: changedAttributes,
            observerActive: Boolean(observer),
            recurringInterval: false,
            visibleMixedCount: visibleMixed.length,
            visibleMixed: visibleMixed
        };
    }

    installCatalogueEntries();

    window.PMDAdminI18nPageAuthorityV2 = {
        version: VERSION,
        apply: apply,
        refresh: schedule,
        audit: audit,
        destroy: destroy
    };

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            function () {
                apply();
                startObserver();
            },
            { once: true }
        );
    } else {
        apply();
        startObserver();
    }

    document.addEventListener(
        'ajaxUpdateComplete',
        schedule,
        true
    );

    document.addEventListener(
        'ajaxPromiseDone',
        schedule,
        true
    );

    window.addEventListener(
        'load',
        schedule,
        { once: true }
    );

    console.info(
        '[PMD Admin I18n Page Authority V2] Ready',
        audit()
    );
})();
