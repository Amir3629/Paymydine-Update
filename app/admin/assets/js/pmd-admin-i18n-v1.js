(function () {
    'use strict';

    if (window.PMDAdminI18n && window.PMDAdminI18n.version) {
        window.PMDAdminI18n.run();
        return;
    }

    var html = document.documentElement;
    var locale = String(window.PMD_ADMIN_LOCALE || 'en').toLowerCase();
    var catalogue = window.PMD_ADMIN_I18N_DE || {};
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

    function addCatalogueEntries() {
        Object.keys(catalogue).forEach(function (source) {
            var target = catalogue[source];
            var cleanSource = normalize(source);

            if (!cleanSource || typeof target !== 'string' || !target.trim()) {
                return;
            }

            normalized[cleanSource] = target;
            normalized[cleanSource.replace(/\u2019/g, "'")] = target;
            normalized[cleanSource.replace(/'/g, '\u2019')] = target;
        });
    }

    function translatePattern(value) {
        var match;
        var result = value;

        match = result.match(/^Order\s+#?(\d+)$/i);
        if (match) return 'Bestellung #' + match[1];

        match = result.match(/^Table\s+(\d+)$/i);
        if (match) return 'Tisch ' + match[1];

        match = result.match(/^(\d+)\s+Guests?$/i);
        if (match) return match[1] + ' Gäste';

        match = result.match(/^(\d+)\s+Bookings?$/i);
        if (match) return match[1] + ' Reservierungen';

        match = result.match(/^(\d+)\s+Reservations?$/i);
        if (match) return match[1] + ' Reservierungen';

        match = result.match(/^(\d+)\s+Orders?$/i);
        if (match) return match[1] + ' Bestellungen';

        match = result.match(/^(\d+)\s+Tables?$/i);
        if (match) return match[1] + ' Tische';

        match = result.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
        if (match) return 'Seite ' + match[1] + ' von ' + match[2];

        if (result.indexOf(' • ') !== -1) {
            return result.split(' • ').map(function (part) {
                return lookup(normalize(part));
            }).join(' • ');
        }

        result = result.replace(/\bOrder\s+#?(\d+)\b/gi, 'Bestellung #$1');
        result = result.replace(/\bTable\s+(\d+)\b/gi, 'Tisch $1');

        return result;
    }

    function lookup(value) {
        var clean = normalize(value);
        var direct;

        if (!clean || locale !== 'de') return value;

        direct = normalized[clean];
        if (direct) return direct;

        direct = normalized[clean.replace(/\u2019/g, "'")];
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
            '[data-pmd-no-translate]'
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
        if (!translated || translated === clean) return;

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

        if (!root || locale !== 'de') return;

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
        if (!document.body || locale !== 'de') return;

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

    addCatalogueEntries();

    window.PMDAdminI18n = {
        version: '1.0.0',
        locale: function () { return locale; },
        entries: function () { return Object.keys(catalogue).length; },
        translate: lookup,
        run: run,
        reveal: reveal
    };

    if (locale !== 'de') {
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
        version: window.PMDAdminI18n.version,
        locale: locale,
        entries: Object.keys(catalogue).length,
        noFlash: true
    });
})();
