(function () {
    'use strict';

    if (window.PMDAdminI18n && window.PMDAdminI18n.version) {
        window.PMDAdminI18n.run();
        return;
    }

    var VERSION = '2.0.0';
    var html = document.documentElement;
    var locale = String(window.PMD_ADMIN_LOCALE || 'en').trim().toLowerCase();
    var messages = window.PMD_PLATFORM_MESSAGES || {};
    var englishMessages = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var legacyGermanCatalogue = locale === 'de'
        ? (window.PMD_ADMIN_I18N_DE || {})
        : {};
    var normalized = Object.create(null);
    var observer = null;
    var translating = false;
    var revealTimer = null;

    function normalize(value) {
        return String(value || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function addEntry(source, target) {
        var cleanSource = normalize(source);

        if (!cleanSource || typeof target !== 'string' || !target.trim()) {
            return;
        }

        normalized[cleanSource] = target;
        normalized[cleanSource.replace(/\u2019/g, "'")] = target;
        normalized[cleanSource.replace(/'/g, '\u2019')] = target;
    }

    function addCanonicalEntries() {
        Object.keys(englishMessages).forEach(function (key) {
            var source = englishMessages[key];
            var target = messages[key];

            if (typeof source !== 'string' || typeof target !== 'string') return;
            if (!source.trim() || !target.trim() || source === target) return;

            addEntry(source, target);
        });

        // Locale files may own compatibility strings that originate in native
        // TastyIgniter or old PayMyDine markup and therefore have no PMD key yet.
        Object.keys(messages).forEach(function (key) {
            if (key.indexOf('literal::') !== 0) return;
            addEntry(key.slice('literal::'.length), messages[key]);
        });
    }

    function addLegacyGermanEntries() {
        Object.keys(legacyGermanCatalogue).forEach(function (source) {
            addEntry(source, legacyGermanCatalogue[source]);
        });
    }

    function exact(value) {
        var clean = normalize(value);

        if (!clean) return '';

        return normalized[clean]
            || normalized[clean.replace(/\u2019/g, "'")]
            || normalized[clean.replace(/'/g, '\u2019')]
            || '';
    }

    function replaceTokens(template, replacements) {
        var output = String(template || '');

        Object.keys(replacements || {}).forEach(function (token) {
            output = output.split(token).join(String(replacements[token]));
        });

        return output;
    }

    function compatPattern(key, replacements) {
        var template = messages[key];

        if (typeof template !== 'string' || !template.trim()) {
            return '';
        }

        return replaceTokens(template, replacements || {});
    }

    function translatePattern(value) {
        var match;
        var translatedBase;
        var counted;
        var pattern;

        match = value.match(/^Order\s+#?(\d+)$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.order_number', { ':id': match[1] });
            if (pattern) return pattern;
            translatedBase = exact('Order');
            if (translatedBase) return translatedBase + ' #' + match[1];
        }

        match = value.match(/^Table\s+(\d+)$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.table_number', { ':id': match[1] });
            if (pattern) return pattern;
            translatedBase = exact('Table');
            if (translatedBase) return translatedBase + ' ' + match[1];
        }

        match = value.match(/^(\d+)\s+Guests?$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.guest_count', { ':count': match[1] });
            if (pattern) return pattern;
            counted = exact('Guests') || exact('Guest');
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^(\d+)\s+Bookings?$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.booking_count', { ':count': match[1] });
            if (pattern) return pattern;
            counted = exact('Bookings') || exact('Booking');
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^(\d+)\s+Reservations?$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.reservation_count', { ':count': match[1] });
            if (pattern) return pattern;
            counted = exact('Reservations') || exact('Reservation');
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^(\d+)\s+Orders?$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.order_count', { ':count': match[1] });
            if (pattern) return pattern;
            counted = exact('Orders') || exact('Order');
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^(\d+)\s+Tables?$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.table_count', { ':count': match[1] });
            if (pattern) return pattern;
            counted = exact('Tables') || exact('Table');
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^(\d+)\s+(.+)$/);
        if (match) {
            counted = exact(match[2]);
            if (counted) return match[1] + ' ' + counted;
        }

        match = value.match(/^long open tables\s+\(>\s*(\d+)\s*min\)$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.long_open_minutes', {
                ':minutes': match[1]
            });
            if (pattern) return pattern;
        }

        match = value.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
        if (match) {
            pattern = compatPattern('compat.pattern.page_of', {
                ':page': match[1],
                ':pages': match[2]
            });
            if (pattern) return pattern;
        }

        if (value.indexOf(' · ') !== -1) {
            return value.split(' · ').map(function (part) {
                return lookup(normalize(part));
            }).join(' · ');
        }

        if (value.indexOf(' • ') !== -1) {
            return value.split(' • ').map(function (part) {
                return lookup(normalize(part));
            }).join(' • ');
        }

        return value;
    }

    function lookup(value) {
        var clean = normalize(value);
        var direct;

        if (!clean || locale === 'en') return value;

        direct = exact(clean);
        if (direct) return direct;

        return translatePattern(clean);
    }

    function shouldSkip(element) {
        if (!element || !element.closest) return true;

        return Boolean(element.closest([
            'script',
            'style',
            'textarea',
            'code',
            'pre',
            '[contenteditable="true"]',
            '[data-pmd-no-translate]',
            '[data-pmd-i18n-skip]'
        ].join(',')));
    }

    function translateTextNode(node) {
        var parent;
        var original;
        var clean;
        var translated;
        var leading;
        var trailing;

        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        parent = node.parentElement;
        if (!parent || shouldSkip(parent)) return;

        original = node.nodeValue;
        clean = normalize(original);
        if (!clean) return;

        translated = lookup(clean);
        if (!translated || translated === clean || translated === original) return;

        leading = (original.match(/^\s*/) || [''])[0];
        trailing = (original.match(/\s*$/) || [''])[0];
        node.nodeValue = leading + translated + trailing;
    }

    function translateAttributes(element) {
        var attributes;

        if (!element || element.nodeType !== Node.ELEMENT_NODE || shouldSkip(element)) {
            return;
        }

        attributes = [
            'placeholder',
            'title',
            'aria-label',
            'data-original-title',
            'data-title'
        ];

        attributes.forEach(function (attribute) {
            var current;
            var translated;

            if (!element.hasAttribute(attribute)) return;

            current = element.getAttribute(attribute);
            translated = lookup(current);

            if (translated && translated !== normalize(current)) {
                element.setAttribute(attribute, translated);
            }
        });

        if (
            element.tagName === 'INPUT' &&
            ['button', 'submit', 'reset'].indexOf(String(element.type).toLowerCase()) !== -1
        ) {
            var translatedValue = lookup(element.value);
            if (translatedValue && translatedValue !== normalize(element.value)) {
                element.value = translatedValue;
            }
        }
    }

    function translateRoot(root) {
        var walker;
        var node;

        if (!root || locale === 'en') return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }

        if (
            root.nodeType !== Node.ELEMENT_NODE &&
            root.nodeType !== Node.DOCUMENT_NODE
        ) {
            return;
        }

        if (root.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(root);
        }

        walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
        );

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                translateTextNode(node);
            } else {
                translateAttributes(node);
            }
        }
    }

    function observe() {
        if (!document.body || locale === 'en') return;

        if (!observer) {
            observer = new MutationObserver(function (mutations) {
                if (translating) return;

                observer.disconnect();
                translating = true;

                try {
                    mutations.forEach(function (mutation) {
                        if (mutation.type === 'characterData') {
                            translateTextNode(mutation.target);
                            return;
                        }

                        if (mutation.type === 'attributes') {
                            translateAttributes(mutation.target);
                        }

                        mutation.addedNodes.forEach(translateRoot);
                    });
                } finally {
                    translating = false;
                    observe();
                }
            });
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [
                'placeholder',
                'title',
                'aria-label',
                'data-original-title',
                'data-title',
                'value'
            ]
        });
    }

    function reveal() {
        if (revealTimer) {
            window.clearTimeout(revealTimer);
            revealTimer = null;
        }

        html.classList.remove('pmd-i18n-pending');
        html.classList.add('pmd-i18n-ready');
    }

    function run() {
        if (!document.body) return;

        if (locale === 'en') {
            reveal();
            return;
        }

        if (observer) observer.disconnect();

        translating = true;
        try {
            translateRoot(document.body);
        } finally {
            translating = false;
        }

        observe();

        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(reveal);
        });
    }

    addCanonicalEntries();
    addLegacyGermanEntries();

    window.PMDAdminI18n = {
        version: VERSION,
        locale: function () { return locale; },
        entries: function () { return Object.keys(normalized).length; },
        translate: lookup,
        run: run,
        reveal: reveal
    };

    if (locale === 'en') {
        reveal();
    } else {
        revealTimer = window.setTimeout(reveal, 4000);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }

    document.addEventListener('ajaxUpdateComplete', run, true);
    document.addEventListener('ajaxPromiseDone', run, true);
    window.addEventListener('load', run, { once: true });

    console.info('[PMD Admin I18n] Ready', {
        version: VERSION,
        locale: locale,
        entries: Object.keys(normalized).length,
        catalogueDriven: true,
        noFlash: true
    });
})();
