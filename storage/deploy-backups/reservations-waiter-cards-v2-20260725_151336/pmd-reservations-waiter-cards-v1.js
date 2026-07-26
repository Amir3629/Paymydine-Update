(function () {
    'use strict';

    if (window.PMDReservationsWaiterCardsV1) {
        return;
    }

    var path = String(window.location.pathname || '')
        .replace(/\/+$/, '');

    if (
        path !== '/admin/reservations' &&
        path !== '/admin/reservations2'
    ) {
        return;
    }

    var ROOT_ID = 'pmd-r2-waiter-cards-v1';
    var FRAME_ID = 'pmd-r2-waiter-cards-frame-v1';

    var root = null;
    var frame = null;
    var viewport = null;
    var loading = null;
    var errorBox = null;

    var frameWindow = null;
    var frameDocument = null;
    var cardRoot = null;

    var observer = null;
    var resizeObserver = null;
    var loadTimeout = null;
    var preparing = false;
    var ready = false;

    var supportedSelectors = [
        '.pmd-w5-board',
        '[data-pmd-w5-board]',
        '.pmd-v2-table-stage',
        '[data-v2-table-grid]',
        '.pmd-final-table-stage',
        '[data-final-table-grid]',
        '.pmd-waiter-floor-board',
        '[data-waiter-table-grid]',
        '[data-table-grid]'
    ];

    function clean(value) {
        return String(value == null ? '' : value)
            .replace(/\s+/g, ' ')
            .trim();
    }

    function findCardRoot(doc) {
        var match = null;

        supportedSelectors.some(function (selector) {
            match = doc.querySelector(selector);
            return Boolean(match);
        });

        if (!match) {
            return null;
        }

        if (match.matches('[data-v2-table-grid]')) {
            return (
                match.closest('.pmd-v2-table-stage') ||
                match.parentElement ||
                match
            );
        }

        if (match.matches('[data-final-table-grid]')) {
            return (
                match.closest('.pmd-final-table-stage') ||
                match.parentElement ||
                match
            );
        }

        if (
            match.matches('[data-waiter-table-grid]') ||
            match.matches('[data-table-grid]')
        ) {
            return (
                match.closest('section') ||
                match.parentElement ||
                match
            );
        }

        return match;
    }

    function removeElement(element) {
        if (
            element &&
            element.parentNode
        ) {
            element.parentNode.removeChild(element);
        }
    }

    function setImportant(element, property, value) {
        if (!element) {
            return;
        }

        element.style.setProperty(
            property,
            value,
            'important'
        );
    }

    function injectIsolationStyle(doc) {
        var oldStyle = doc.getElementById(
            'pmd-r2-waiter-cards-frame-isolation-v1'
        );

        if (oldStyle) {
            oldStyle.remove();
        }

        var style = doc.createElement('style');

        style.id =
            'pmd-r2-waiter-cards-frame-isolation-v1';

        style.textContent = [
            'html.pmd-r2-waiter-cards-embed-v1,',
            'html.pmd-r2-waiter-cards-embed-v1 body {',
            '  width: 100% !important;',
            '  min-width: 0 !important;',
            '  max-width: none !important;',
            '  height: auto !important;',
            '  min-height: 0 !important;',
            '  margin: 0 !important;',
            '  padding: 0 !important;',
            '  overflow: hidden !important;',
            '  background: #f8fafc !important;',
            '}',

            'html.pmd-r2-waiter-cards-embed-v1 body > * {',
            '  display: none !important;',
            '}',

            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"],',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] * {',
            '  visibility: visible !important;',
            '}',

            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] {',
            '  display: block !important;',
            '  position: relative !important;',
            '  inset: auto !important;',
            '  float: none !important;',
            '  width: 100% !important;',
            '  min-width: 0 !important;',
            '  max-width: none !important;',
            '  height: auto !important;',
            '  min-height: 0 !important;',
            '  margin: 0 !important;',
            '  padding: 16px !important;',
            '  box-sizing: border-box !important;',
            '  transform: none !important;',
            '  overflow: visible !important;',
            '  background: #f8fafc !important;',
            '}',

            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] ' +
            '.pmd-v2-table-grid,',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] ' +
            '.pmd-final-table-grid,',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] ' +
            '[data-v2-table-grid],',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-pmd-r2-waiter-cards-kept="1"] ' +
            '[data-final-table-grid] {',
            '  width: 100% !important;',
            '  min-width: 0 !important;',
            '  max-width: none !important;',
            '}',

            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '.pmd-v2-footer,',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '.pmd-final-footer,',
            'html.pmd-r2-waiter-cards-embed-v1 ' +
            '[data-v2-updated] {',
            '  display: none !important;',
            '}'
        ].join('\n');

        doc.head.appendChild(style);
    }

    function preserveAncestors(element) {
        var current = element;

        while (
            current &&
            current !== frameDocument.body
        ) {
            current.setAttribute(
                'data-pmd-r2-waiter-cards-kept',
                '1'
            );

            current = current.parentElement;
        }
    }

    function isolateCardArea() {
        if (
            !frameDocument ||
            !cardRoot
        ) {
            return;
        }

        frameDocument.documentElement.classList.add(
            'pmd-r2-waiter-cards-embed-v1'
        );

        frameDocument.body.classList.add(
            'pmd-r2-waiter-cards-embed-v1'
        );

        preserveAncestors(cardRoot);

        cardRoot.setAttribute(
            'data-pmd-r2-waiter-cards-kept',
            '1'
        );

        injectIsolationStyle(frameDocument);

        setImportant(
            frameDocument.documentElement,
            'overflow',
            'hidden'
        );

        setImportant(
            frameDocument.body,
            'overflow',
            'hidden'
        );

        try {
            frameWindow.scrollTo(0, 0);
        } catch (ignored) {}
    }

    function measuredHeight() {
        if (!cardRoot) {
            return 420;
        }

        var rect = cardRoot.getBoundingClientRect();

        var height = Math.max(
            rect.height || 0,
            cardRoot.scrollHeight || 0,
            cardRoot.offsetHeight || 0
        );

        if (
            frameDocument &&
            frameDocument.body
        ) {
            height = Math.max(
                height,
                frameDocument.body.scrollHeight || 0
            );
        }

        height = Math.ceil(height + 4);

        return Math.max(
            310,
            Math.min(height, 2400)
        );
    }

    function syncHeight() {
        if (
            !frame ||
            !viewport ||
            !ready
        ) {
            return;
        }

        var height = measuredHeight();

        frame.style.height = height + 'px';
        viewport.style.height = height + 'px';
    }

    function showError(message) {
        ready = false;

        if (loading) {
            loading.hidden = true;
        }

        if (errorBox) {
            errorBox.hidden = false;

            var messageNode = errorBox.querySelector(
                '[data-pmd-waiter-cards-error-message]'
            );

            if (messageNode) {
                messageNode.textContent =
                    clean(message) ||
                    'The waiter card area could not be loaded.';
            }
        }
    }

    function markReady() {
        ready = true;

        if (loading) {
            loading.hidden = true;
        }

        if (errorBox) {
            errorBox.hidden = true;
        }

        root.setAttribute(
            'data-pmd-waiter-cards-ready',
            '1'
        );

        syncHeight();

        window.setTimeout(syncHeight, 100);
        window.setTimeout(syncHeight, 500);
        window.setTimeout(syncHeight, 1200);

        console.info(
            '[PMD Reservations Waiter Cards V1] Ready',
            debug()
        );
    }

    function watchCardArea() {
        if (!cardRoot) {
            return;
        }

        if (
            typeof ResizeObserver === 'function'
        ) {
            resizeObserver = new ResizeObserver(
                function () {
                    syncHeight();
                }
            );

            resizeObserver.observe(cardRoot);
        }

        observer = new MutationObserver(function () {
            syncHeight();
        });

        observer.observe(cardRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    }

    function waitForCards(attempt) {
        attempt = attempt || 0;

        if (
            !frameDocument ||
            !frameDocument.body
        ) {
            if (attempt < 100) {
                window.setTimeout(function () {
                    waitForCards(attempt + 1);
                }, 100);

                return;
            }

            showError(
                'The embedded waiter document was not available.'
            );

            return;
        }

        cardRoot = findCardRoot(frameDocument);

        if (!cardRoot) {
            if (attempt < 120) {
                window.setTimeout(function () {
                    waitForCards(attempt + 1);
                }, 100);

                return;
            }

            showError(
                'No waiter table/card board was found on ' +
                '/admin/dashboardwaiter.'
            );

            return;
        }

        isolateCardArea();
        watchCardArea();
        markReady();
    }

    function prepareFrame() {
        if (
            preparing ||
            !frame
        ) {
            return;
        }

        preparing = true;

        try {
            frameWindow = frame.contentWindow;
            frameDocument =
                frame.contentDocument ||
                frameWindow.document;

            if (
                !frameDocument ||
                !frameDocument.body
            ) {
                throw new Error(
                    'Waiter Dashboard document is unavailable.'
                );
            }

            window.clearTimeout(loadTimeout);

            waitForCards(0);
        } catch (error) {
            console.error(
                '[PMD Reservations Waiter Cards V1]',
                error
            );

            showError(
                error && error.message
                    ? error.message
                    : error
            );
        } finally {
            preparing = false;
        }
    }

    function reload() {
        if (!frame) {
            return;
        }

        ready = false;
        cardRoot = null;

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        root.removeAttribute(
            'data-pmd-waiter-cards-ready'
        );

        loading.hidden = false;
        errorBox.hidden = true;

        frame.src =
            '/admin/dashboardwaiter' +
            '?pmd_reservations_cards=1' +
            '&_=' + Date.now();

        loadTimeout = window.setTimeout(function () {
            if (!ready) {
                showError(
                    'The Waiter Dashboard took too long to load.'
                );
            }
        }, 20000);
    }

    function debug() {
        return {
            version: '1.0.0',
            route: window.location.pathname,
            root: Boolean(root),
            frame: Boolean(frame),
            sameOriginDocument: Boolean(frameDocument),
            ready: ready,
            cardRoot: cardRoot
                ? (
                    cardRoot.className ||
                    cardRoot.tagName
                )
                : null,
            cards: cardRoot
                ? cardRoot.querySelectorAll(
                    'button, [data-table], ' +
                    '[data-table-number]'
                ).length
                : 0,
            frameHeight: frame
                ? frame.style.height
                : null
        };
    }

    function boot() {
        root = document.getElementById(ROOT_ID);

        if (!root) {
            return;
        }

        frame = document.getElementById(FRAME_ID);

        viewport = root.querySelector(
            '[data-pmd-r2-waiter-cards-viewport]'
        );

        loading = root.querySelector(
            '[data-pmd-r2-waiter-cards-loading]'
        );

        errorBox = root.querySelector(
            '[data-pmd-r2-waiter-cards-error]'
        );

        var refreshButton = root.querySelector(
            '[data-pmd-r2-waiter-cards-refresh]'
        );

        if (
            !frame ||
            !viewport ||
            !loading ||
            !errorBox
        ) {
            console.error(
                '[PMD Reservations Waiter Cards V1] ' +
                'Required markup is missing.'
            );

            return;
        }

        frame.addEventListener(
            'load',
            prepareFrame
        );

        if (refreshButton) {
            refreshButton.addEventListener(
                'click',
                reload
            );
        }

        loadTimeout = window.setTimeout(function () {
            if (!ready) {
                showError(
                    'The Waiter Dashboard took too long to load.'
                );
            }
        }, 20000);

        window.addEventListener(
            'resize',
            syncHeight,
            {passive: true}
        );

        console.info(
            '[PMD Reservations Waiter Cards V1] Booting'
        );
    }

    window.PMDReservationsWaiterCardsV1 = {
        version: '1.0.0',
        reload: reload,
        resize: syncHeight,
        debug: debug
    };

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            {once: true}
        );
    } else {
        boot();
    }
})();
