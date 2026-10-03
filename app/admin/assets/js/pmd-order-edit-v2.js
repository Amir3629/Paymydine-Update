/* PMD_ORDER_EDIT_V7_REFERENCE_MATCH — finite, route-scoped, no observers or polling. */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) return;

    var ROOT = 'pmd-order-edit-v7';
    document.documentElement.classList.remove('pmd-order-edit-v6');
    document.documentElement.classList.add(ROOT);

    function compactText(node) {
        return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
    }

    /* Tabler Icons SVG paths — consistent outline set used across PMD admin. */
    function icon(name) {
        var map = {
            target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
            userPlus: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0"/><path d="M16 19h6"/><path d="M19 16v6"/><path d="M6 21v-2a4 4 0 0 1 4-4h3.5"/>',
            edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
            receipt: '<path d="M5 21v-16a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M13 15h2"/>',
            mail: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2Z"/><path d="m3 7 9 6 9-6"/>',
            plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
            minus: '<path d="M5 12h14"/>',
            clipboard: '<path d="M9 5h6"/><path d="M9 3h6a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h2v-1a2 2 0 0 1 2-2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
            cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M7 9h.01"/><path d="M17 15h.01"/>'
        };
        var paths = map[name] || map.target;
        return '<span class="pmd-oe-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg></span>';
    }

    function replaceIcon(node, name) {
        if (!node || node.dataset.pmdOeIcon === name) return;
        node.innerHTML = icon(name);
        node.dataset.pmdOeIcon = name;
    }

    function cleanComment(value) {
        return String(value || '')
            .split('|')
            .map(function (part) { return part.trim(); })
            .filter(function (part) {
                return part &&
                    !/^Table Draft Basket$/i.test(part) &&
                    !/^(Table ID|Table)\s*:/i.test(part) &&
                    !/^\[(table_draft_id|submitted_by|guest_session|guest_session_id):/i.test(part);
            })
            .join(' · ');
    }

    function normalizeHeader() {
        document.querySelectorAll('.order-info-item.table-number .order-info-value').forEach(function (node) {
            if (/^(N\/A|--)?$/i.test(compactText(node))) node.textContent = '—';
        });
        document.querySelectorAll('.header-status-clickable').forEach(function (node) { replaceIcon(node, 'target'); });
        document.querySelectorAll('.header-assignee-clickable').forEach(function (node) { replaceIcon(node, 'userPlus'); });
        document.querySelectorAll('.note-icon-btn').forEach(function (node) { replaceIcon(node, 'edit'); });
        document.querySelectorAll('.invoice-icon-btn').forEach(function (node) { replaceIcon(node, 'receipt'); });
        document.querySelectorAll('.send-invoice-icon-btn').forEach(function (node) { replaceIcon(node, 'mail'); });
    }

    function normalizeItems() {
        document.querySelectorAll('.qty-btn.qty-minus').forEach(function (node) { replaceIcon(node, 'minus'); });
        document.querySelectorAll('.qty-btn.qty-plus').forEach(function (node) { replaceIcon(node, 'plus'); });
        document.querySelectorAll('#btn-add-item, .btn-add-item').forEach(function (node) {
            if (node.dataset.pmdOeAdd === '1') return;
            node.innerHTML = icon('plus') + '<span>Add item</span>';
            node.dataset.pmdOeAdd = '1';
        });

        document.querySelectorAll('.pmd-oe-items').forEach(function (surface) {
            if (surface.querySelector('.pmd-oe-section-title')) return;
            var heading = document.createElement('h2');
            heading.className = 'pmd-oe-section-title';
            heading.innerHTML = icon('clipboard') + '<span>Bestellübersicht</span>';
            surface.insertBefore(heading, surface.firstChild);
        });
    }

    function normalizePayment() {
        document.querySelectorAll('.order-details-table tr').forEach(function (row) {
            var cells = row.querySelectorAll('th, td');
            if (cells.length < 2) return;
            var label = compactText(cells[0]);
            var valueCell = cells[cells.length - 1];

            if (/^(items|payments?|zahlungen?)$/i.test(label)) {
                cells[0].textContent = 'Payments';
                row.classList.add('pmd-oe-payments-row');
                Array.prototype.forEach.call(valueCell.children, function (card) {
                    card.classList.add('pmd-oe-payment-card');
                    card.removeAttribute('style');
                    card.querySelectorAll('ul').forEach(function (list) { list.hidden = true; });
                    if (!card.querySelector('.pmd-oe-payment-icon')) {
                        var paymentIcon = document.createElement('span');
                        paymentIcon.className = 'pmd-oe-payment-icon';
                        paymentIcon.innerHTML = icon('cash');
                        card.insertBefore(paymentIcon, card.firstChild);
                    }
                });
            }

            if (/coupon|discount|rabatt|gutschein/i.test(label)) {
                valueCell.textContent = compactText(valueCell).replace(/^--+/, '-');
            }
        });
    }

    function normalizeNotes() {
        document.querySelectorAll('[data-pmd-oe-machine-note] p').forEach(function (node) {
            var cleaned = cleanComment(node.textContent);
            var card = node.closest('[data-pmd-oe-machine-note]');
            if (!cleaned) {
                if (card) card.hidden = true;
            } else {
                node.textContent = cleaned;
            }
        });
    }

    function hasUsefulContent(node) {
        if (!node) return false;
        var clone = node.cloneNode(true);
        clone.querySelectorAll('script, style, template, [data-pmd-oe-empty]').forEach(function (child) { child.remove(); });
        return Boolean(compactText(clone) || clone.querySelector('table, form, input, select, textarea, button, .card, .list-group, [data-record-id]'));
    }

    function installTabs() {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-pmd-oe-tab]'));
        var panes = Array.prototype.slice.call(document.querySelectorAll('.pmd-oe-pane[id]'));
        if (!tabs.length || !panes.length) return;

        function activate(button, updateHash) {
            var selector = button.getAttribute('data-pmd-oe-tab');
            var pane = selector ? document.querySelector(selector) : null;
            if (!pane) return;

            tabs.forEach(function (candidate) {
                var active = candidate === button;
                candidate.classList.toggle('is-active', active);
                candidate.setAttribute('aria-selected', active ? 'true' : 'false');
                candidate.tabIndex = active ? 0 : -1;
            });
            panes.forEach(function (candidate) {
                var active = candidate === pane;
                candidate.hidden = !active;
                candidate.classList.toggle('is-active', active);
                candidate.setAttribute('aria-hidden', active ? 'false' : 'true');
            });

            var content = pane.querySelector('[data-pmd-oe-secondary-content]');
            var empty = pane.querySelector('[data-pmd-oe-empty]');
            if (empty) empty.hidden = hasUsefulContent(content);

            if (updateHash && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search + selector);
            }
        }

        tabs.forEach(function (button, index) {
            if (button.dataset.pmdOeBound === '1') return;
            button.dataset.pmdOeBound = '1';
            button.addEventListener('click', function () { activate(button, true); });
            button.addEventListener('keydown', function (event) {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                var next = index;
                if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = tabs.length - 1;
                tabs[next].focus();
                activate(tabs[next], true);
            });
        });

        var initial = tabs.find(function (button) { return button.getAttribute('data-pmd-oe-tab') === window.location.hash; }) ||
            tabs.find(function (button) { return button.classList.contains('is-active'); }) || tabs[0];
        activate(initial, false);
    }

    function removeBladeTokens() {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var remove = [];
        while (walker.nextNode()) {
            if (/^\s*@(styles|scripts)\s*$/.test(walker.currentNode.nodeValue || '')) remove.push(walker.currentNode);
        }
        remove.forEach(function (node) { node.nodeValue = ''; });
    }

    function apply() {
        normalizeHeader();
        normalizeItems();
        normalizePayment();
        normalizeNotes();
        installTabs();
        removeBladeTokens();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply, { once:true });
    } else {
        apply();
    }
    window.addEventListener('load', apply, { once:true });
    window.PMDOrderEditV7 = { run:apply, cleanComment:cleanComment };
})();

/* PMD_ORDER_EDIT_V8_FLAT_REFERENCE
   Finite Order Edit authority. No observer / polling. */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) return;

    document.documentElement.classList.add('pmd-order-edit-v8');

    function text(node) {
        return String((node && node.textContent) || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cashIcon() {
        return '<span class="pmd-oe-payment-icon-v8" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="6" width="18" height="12" rx="2"/>' +
            '<circle cx="12" cy="12" r="2"/>' +
            '<path d="M7 9h.01"/>' +
            '<path d="M17 15h.01"/>' +
            '</svg></span>';
    }

    function apply() {
        var heading = document.querySelector(
            '.pmd-oe-summary-payment > h2, .pmd-oe-summary h2'
        );

        if (heading) {
            heading.textContent = 'Rechnung & Zahlung';
        }

        document.querySelectorAll(
            '.pmd-oe-summary .order-details-table tr'
        ).forEach(function (row) {

            var cells = row.querySelectorAll('th, td');
            if (cells.length < 2) return;

            var label = text(cells[0]);
            var valueCell = cells[cells.length - 1];

            if (/^(rechnung|invoice)$/i.test(label)) {
                row.hidden = true;
                return;
            }

            if (!/^(items|payments?|zahlungen?)$/i.test(label)) {
                return;
            }

            cells[0].textContent = 'Zahlungen';
            row.classList.add('pmd-oe-payments-row');

            Array.from(valueCell.children).forEach(function (card) {

                if (card.dataset.pmdOeV8 === '1') return;

                var raw = text(card);

                var id =
                    (raw.match(/#\s*\d+/) || [''])[0]
                        .replace(/\s+/g, '');

                var method =
                    (
                        raw.match(
                            /\b(CASH|CARD|STRIPE|PAYPAL|SUMUP|WORLDLINE|APPLE\s*PAY|GOOGLE\s*PAY)\b/i
                        ) || ['Payment']
                    )[0].toUpperCase();

                var amount =
                    (
                        raw.match(
                            /[€$£]\s?\d+(?:[.,]\d{1,2})?/
                        ) || ['']
                    )[0].replace(/\s+/g, '');

                var link = card.querySelector('a[href]');
                var href = link ? link.getAttribute('href') : '';

                card.className = 'pmd-oe-payment-card-v8';
                card.removeAttribute('style');

                card.innerHTML =
                    cashIcon() +
                    '<div class="pmd-oe-payment-meta-v8">' +
                        '<strong>' +
                            (id ? id + ' · ' : '') +
                            method +
                        '</strong>' +
                        '<span>' + amount + '</span>' +
                    '</div>' +
                    (
                        href
                            ? '<a class="pmd-oe-receipt-v8" href="' +
                              href.replace(/"/g, '&quot;') +
                              '" target="_blank" rel="noopener">' +
                              'Beleg anzeigen</a>'
                            : ''
                    );

                card.dataset.pmdOeV8 = '1';
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            apply,
            { once: true }
        );
    } else {
        apply();
    }

    window.addEventListener(
        'load',
        apply,
        { once: true }
    );

    window.PMDOrderEditV8 = {
        run: apply
    };
})();

/* PMD_ORDER_EDIT_V9_REFERENCE_FINAL */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) {
        return;
    }

    function cleanText(node) {
        return String((node && node.textContent) || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function paymentIcon() {
        return (
            '<span class="pmd-oe-v9-payment-icon" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" ' +
                    'stroke="currentColor" stroke-width="1.8" ' +
                    'stroke-linecap="round" stroke-linejoin="round">' +
                    '<rect x="3" y="6" width="18" height="12" rx="2"></rect>' +
                    '<circle cx="12" cy="12" r="2"></circle>' +
                    '<path d="M7 9h.01"></path>' +
                    '<path d="M17 15h.01"></path>' +
                '</svg>' +
            '</span>'
        );
    }

    function normalizeSummaryHeading(summary) {
        if (!summary) return;

        var headings = Array.from(
            summary.querySelectorAll(
                ':scope > h1, :scope > h2, :scope > h3, ' +
                '.pmd-oe-summary-payment > h1, ' +
                '.pmd-oe-summary-payment > h2, ' +
                '.pmd-oe-summary-payment > h3'
            )
        );

        var matching = headings.filter(function (node) {
            return /rechnung\s*&\s*zahlung/i.test(cleanText(node));
        });

        matching.forEach(function (node, index) {
            if (index === 0) {
                node.textContent = 'Rechnung & Zahlung';
                node.classList.add('pmd-oe-v9-summary-title');
            } else {
                node.style.setProperty('display', 'none', 'important');
            }
        });
    }

    function normalizePaymentCard(summary) {
        if (!summary) return;

        var paymentRow =
            summary.querySelector('.pmd-oe-payments-row') ||
            Array.from(
                summary.querySelectorAll(
                    '.order-details-table tr, table tr'
                )
            ).find(function (row) {
                return /^(payments?|zahlungen?)$/i.test(
                    cleanText(row.querySelector('th, td'))
                );
            });

        if (!paymentRow) return;

        paymentRow.classList.add('pmd-oe-v9-payments-row');

        var cells = paymentRow.querySelectorAll('th, td');

        if (cells.length < 2) return;

        var labelCell = cells[0];
        var valueCell = cells[cells.length - 1];

        labelCell.textContent = 'Zahlungen';

        var source =
            valueCell.querySelector('.pmd-oe-payment-card-v8') ||
            valueCell.firstElementChild ||
            valueCell;

        var raw = cleanText(source);

        var orderMatch = raw.match(/#\s*(\d+)/);
        var methodMatch = raw.match(
            /\b(CASH|CARD|STRIPE|PAYPAL|SUMUP|WORLDLINE|APPLE\s*PAY|GOOGLE\s*PAY)\b/i
        );

        var amountMatches = raw.match(
            /[€$£]\s?\d+(?:[.,]\d{1,2})?/g
        ) || [];

        var orderId = orderMatch ? orderMatch[1] : '';
        var method = methodMatch
            ? methodMatch[1].replace(/\s+/g, ' ').toUpperCase()
            : 'PAYMENT';

        var amount = amountMatches.length
            ? amountMatches[amountMatches.length - 1]
                .replace(/\s+/g, '')
            : '';

        var receipt =
            valueCell.querySelector('a[href*="receipt"]') ||
            valueCell.querySelector('a[href]');

        var href = receipt
            ? receipt.getAttribute('href')
            : '';

        valueCell.innerHTML =
            '<div class="pmd-oe-v9-payment-card">' +
                paymentIcon() +

                '<div class="pmd-oe-v9-payment-copy">' +
                    '<strong>' +
                        (orderId ? '#' + orderId + ' · ' : '') +
                        method +
                    '</strong>' +
                    (amount
                        ? '<span>' + amount + '</span>'
                        : '') +
                '</div>' +

                (href
                    ? '<a class="pmd-oe-v9-receipt" ' +
                      'href="' + href.replace(/"/g, '&quot;') + '" ' +
                      'target="_blank" rel="noopener">' +
                        '<svg viewBox="0 0 24 24" fill="none" ' +
                            'stroke="currentColor" stroke-width="1.8" ' +
                            'stroke-linecap="round" stroke-linejoin="round" ' +
                            'aria-hidden="true">' +
                            '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"></path>' +
                            '<path d="M9 8h6"></path>' +
                            '<path d="M9 12h6"></path>' +
                        '</svg>' +
                        '<span>Beleg anzeigen</span>' +
                      '</a>'
                    : '') +
            '</div>';
    }

    function apply() {
        document.documentElement.classList.add(
            'pmd-order-edit-v9'
        );

        var summary =
            document.querySelector('.pmd-oe-summary') ||
            document.querySelector('.pmd-oe-side');

        normalizeSummaryHeading(summary);
        normalizePaymentCard(summary);
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            apply,
            { once: true }
        );
    } else {
        apply();
    }

    window.addEventListener(
        'load',
        apply,
        { once: true }
    );

    window.PMDOrderEditV9 = {
        run: apply
    };
})();

/* =========================================================
   PMD_ORDER_EDIT_V10_DASHBOARD2_SHELL
   ========================================================= */

(function () {
    'use strict';

    var path = String(
        window.location.pathname || ''
    ).replace(/\/+$/, '');

    if (!/^\/admin\/orders\/edit\/\d+$/.test(path)) {
        return;
    }

    var HEADER_ID =
        'pmd-order-edit-dashboard2-header-v10';

    function svgBack() {
        return (
            '<svg viewBox="0 0 24 24" ' +
            'fill="none" stroke="currentColor" ' +
            'stroke-width="2" ' +
            'stroke-linecap="round" ' +
            'stroke-linejoin="round" ' +
            'aria-hidden="true">' +
                '<path d="M19 12H5"></path>' +
                '<path d="M12 19l-7-7 7-7"></path>' +
            '</svg>'
        );
    }

    function nativeHeader() {
        var selectors = [
            '.page-header',
            '.content-header',
            '.main-header + .page-header',
            '[data-page-header]',
            '.page-heading'
        ];

        for (var i = 0; i < selectors.length; i += 1) {
            var node = document.querySelector(selectors[i]);

            if (node) {
                return node;
            }
        }

        return null;
    }

    function findWorkspace() {
        return (
            document.querySelector('.form-widget') ||
            document.querySelector('form[data-request]') ||
            document.querySelector('.content-wrapper .content') ||
            document.querySelector('.content-wrapper') ||
            document.querySelector('main')
        );
    }

    function collectHeaderControls(oldHeader) {
        if (!oldHeader) {
            return [];
        }

        var candidates = Array.from(
            oldHeader.querySelectorAll(
                'a, button, [role="button"]'
            )
        ).filter(function (node) {
            if (!node) {
                return false;
            }

            if (
                node.closest(
                    '.breadcrumb, .page-title, .page-heading'
                )
            ) {
                return false;
            }

            var rect = node.getBoundingClientRect();

            return (
                rect.width > 20 &&
                rect.height > 20
            );
        });

        /*
         * Current Admin header has its action buttons at
         * the right side. Preserve the real DOM nodes so
         * native listeners/actions remain intact.
         */
        return candidates.slice(-3);
    }

    function buildHeader(oldHeader) {
        var existing =
            document.getElementById(HEADER_ID);

        if (existing) {
            return existing;
        }

        var header = document.createElement('section');

        header.id = HEADER_ID;
        header.className =
            'pmd-order-edit-dashboard2-header-v10';

        var left = document.createElement('div');
        left.className =
            'pmd-order-edit-dashboard2-header-v10__left';

        var back = document.createElement('button');
        back.type = 'button';
        back.className =
            'pmd-order-edit-dashboard2-back-v10';
        back.setAttribute(
            'aria-label',
            'Back'
        );
        back.innerHTML = svgBack();

        back.addEventListener(
            'click',
            function () {
                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }

                window.location.href =
                    '/admin/orders';
            }
        );

        var title = document.createElement('div');

        title.className =
            'pmd-order-edit-dashboard2-title-v10';

        title.textContent = 'Bestellung';

        left.appendChild(back);
        left.appendChild(title);

        var actions = document.createElement('div');

        actions.className =
            'pmd-order-edit-dashboard2-actions-v10';

        collectHeaderControls(oldHeader)
            .forEach(function (node) {
                node.classList.add(
                    'pmd-order-edit-dashboard2-control-v10'
                );

                actions.appendChild(node);
            });

        header.appendChild(left);
        header.appendChild(actions);

        return header;
    }

    function install() {
        if (
            document.documentElement.classList.contains(
                'pmd-order-edit-dashboard2-shell-v10'
            ) &&
            document.getElementById(HEADER_ID)
        ) {
            return;
        }

        var workspace = findWorkspace();

        if (!workspace) {
            return;
        }

        var oldHeader = nativeHeader();
        var header = buildHeader(oldHeader);

        document.documentElement.classList.add(
            'pmd-order-edit-dashboard2-shell-v10'
        );

        /*
         * Insert immediately before the Order Edit
         * workspace, not inside its legacy cards.
         */
        var insertionParent =
            workspace.parentElement;

        if (
            insertionParent &&
            !header.isConnected
        ) {
            insertionParent.insertBefore(
                header,
                workspace
            );
        }

        if (oldHeader) {
            oldHeader.classList.add(
                'pmd-order-edit-native-header-hidden-v10'
            );
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            install,
            { once: true }
        );
    } else {
        install();
    }

    /*
     * Finite retries only.
     * No MutationObserver.
     * No interval.
     */
    window.setTimeout(install, 120);
    window.setTimeout(install, 450);

    window.addEventListener(
        'load',
        install,
        { once: true }
    );

    window.PMDOrderEditV10 = {
        run: install
    };
})();
/* PMD_ORDER_EDIT_V11_1_CONFIRMED_STRUCTURE */
(function () {
    'use strict';

    var path = String(window.location.pathname || '')
        .replace(/\/+$/, '');

    if (!/^\/admin\/orders\/edit\/\d+$/.test(path)) {
        return;
    }

    if (window.PMDOrderEditConfirmedStructureV11_1) {
        return;
    }

    function boot() {
        var fakeV10 = document.getElementById(
            'pmd-order-edit-dashboard2-header-v10'
        );

        /*
         * Remove only our previously injected duplicate header.
         * Native/global PMD header remains authoritative.
         */
        if (fakeV10) {
            fakeV10.remove();
        }

        /*
         * Remove only the secondary Bearbeiten/Edit subtitle.
         */
        var titleWrap =
            document.querySelector('.pmd-header-title-wrap');

        if (titleWrap) {
            Array.prototype.forEach.call(
                titleWrap.children,
                function (child) {
                    var text = String(
                        child.textContent || ''
                    )
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

                    if (
                        text === 'bearbeiten' ||
                        text === 'edit'
                    ) {
                        child.style.setProperty(
                            'display',
                            'none',
                            'important'
                        );
                    }
                }
            );
        }

        document.documentElement.classList.add(
            'pmd-order-edit-v11-confirmed'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            { once: true }
        );
    } else {
        boot();
    }

    function bg(selector) {
        var el = document.querySelector(selector);

        return el
            ? getComputedStyle(el).backgroundColor
            : null;
    }

    function rect(selector) {
        var el = document.querySelector(selector);

        if (!el) {
            return null;
        }

        var r = el.getBoundingClientRect();

        return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height)
        };
    }

    window.PMDOrderEditConfirmedStructureV11_1 = {
        version:
            'PMD_ORDER_EDIT_V11_1_CONFIRMED_STRUCTURE',

        audit: function () {
            var ribbon =
                document.querySelector('.order-info-header');

            var tabs =
                document.querySelector('.pmd-oe-tabs');

            var order =
                document.querySelector('.pmd-oe-items');

            var nav =
                document.querySelector(
                    'nav.navbar.navbar-top'
                );

            return {
                backgrounds: {
                    html:
                        getComputedStyle(
                            document.documentElement
                        ).backgroundColor,

                    body:
                        getComputedStyle(
                            document.body
                        ).backgroundColor,

                    pageWrapper:
                        bg('.page-wrapper'),

                    pageContent:
                        bg('.page-content'),

                    rowFluid:
                        bg('.page-content > .row-fluid'),

                    formWidget:
                        bg('.form-widget')
                },

                header: {
                    nativeNavbarVisible:
                        !!nav &&
                        getComputedStyle(nav).display !==
                            'none',

                    fakeV10Exists:
                        !!document.getElementById(
                            'pmd-order-edit-dashboard2-header-v10'
                        )
                },

                geometry: {
                    ribbon:
                        rect('.order-info-header'),

                    tabs:
                        rect('.pmd-oe-tabs'),

                    order:
                        rect('.pmd-oe-items'),

                    payment:
                        rect('.pmd-oe-summary')
                },

                gaps: {
                    ribbonToTabs:
                        ribbon && tabs
                            ? Math.round(
                                  tabs
                                      .getBoundingClientRect()
                                      .top -
                                  ribbon
                                      .getBoundingClientRect()
                                      .bottom
                              )
                            : null,

                    tabsToOrder:
                        tabs && order
                            ? Math.round(
                                  order
                                      .getBoundingClientRect()
                                      .top -
                                  tabs
                                      .getBoundingClientRect()
                                      .bottom
                              )
                            : null
                }
            };
        }
    };

    console.info(
        '[PMD Order Edit V11.1] confirmed structure active'
    );
})();

/* PMD_ORDER_EDIT_V12_HEADER_RIBBON_PHOTOS */
(function () {
    'use strict';

    var path = String(
        window.location.pathname || ''
    ).replace(/\/+$/, '');

    if (!/^\/admin\/orders\/edit\/\d+$/.test(path)) {
        return;
    }

    if (window.PMDOrderEditV12) {
        return;
    }

    function removeFakeHeaders() {
        [
            '#pmd-order-edit-dashboard2-header-v10',
            '.pmd-order-edit-dashboard2-header-v10'
        ].forEach(function (selector) {
            document.querySelectorAll(selector)
                .forEach(function (node) {
                    node.remove();
                });
        });
    }

    function cleanNativeHeader() {
        var nav = document.querySelector(
            'nav.navbar.navbar-top'
        );

        if (!nav) {
            return;
        }

        /*
         * Do NOT replace the global header.
         * Only remove legacy Order Edit subtitle fragments.
         */
        nav.querySelectorAll('*').forEach(function (el) {
            if (el.children.length > 0) {
                return;
            }

            var text = String(
                el.textContent || ''
            )
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            if (
                text === 'bearbeiten' ||
                text === 'edit'
            ) {
                el.style.display = 'none';
            }
        });

        nav.classList.add(
            'pmd-order-edit-native-header-v12'
        );
    }

    function cleanPaymentHeading() {
        var rail = document.querySelector(
            '.pmd-oe-summary'
        );

        if (!rail) {
            return;
        }

        var headings = Array.from(
            rail.querySelectorAll(
                'h1,h2,h3,h4,h5,h6,.card-title,.widget-title,strong'
            )
        ).filter(function (el) {
            return /rechnung\s*&\s*zahlung/i.test(
                String(el.textContent || '').trim()
            );
        });

        if (headings.length > 1) {
            headings.slice(1).forEach(function (el) {
                el.style.display = 'none';
            });
        }
    }

    function boot() {
        removeFakeHeaders();
        cleanNativeHeader();
        cleanPaymentHeading();

        document.documentElement.classList.add(
            'pmd-order-edit-v12'
        );
    }

    /*
     * finite boot only
     */
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            { once: true }
        );
    } else {
        boot();
    }

    setTimeout(boot, 180);
    setTimeout(boot, 650);

    window.PMDOrderEditV12 = {
        version:
            'PMD_ORDER_EDIT_V12_HEADER_RIBBON_PHOTOS',

        audit: function () {
            var ribbon =
                document.querySelector(
                    '.order-info-header'
                );

            var wrapper =
                document.querySelector(
                    '.page-wrapper'
                );

            var navbar =
                document.querySelector(
                    'nav.navbar.navbar-top'
                );

            return {
                wrapperBackground:
                    wrapper
                        ? getComputedStyle(wrapper)
                            .backgroundColor
                        : null,

                ribbon:
                    ribbon
                        ? {
                            width:
                                Math.round(
                                    ribbon
                                        .getBoundingClientRect()
                                        .width
                                ),

                            height:
                                Math.round(
                                    ribbon
                                        .getBoundingClientRect()
                                        .height
                                )
                        }
                        : null,

                nativeHeader:
                    !!navbar,

                fakeHeader:
                    !!document.querySelector(
                        '#pmd-order-edit-dashboard2-header-v10'
                    ),

                photos:
                    document.querySelectorAll(
                        '.pmd-order-item-photo-v12'
                    ).length
            };
        }
    };

    console.info(
        '[PMD Order Edit V12] active',
        window.PMDOrderEditV12.audit()
    );
})();
/* PMD_ORDER_EDIT_V13_1_OUTER_FRAME_CONFIRMED */

(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');

    if (!/^\/admin\/orders\/edit\/\d+$/.test(path)) {
        return;
    }

    function applyConfirmedStructure() {
        var body = document.body;
        var page = document.querySelector('.page-content');

        var row =
            (page && page.querySelector('.row-fluid')) ||
            document.querySelector('.row-fluid');

        var tabs = document.querySelector('.pmd-oe-tabs');
        var order = document.querySelector('.pmd-oe-items');
        var payment = document.querySelector('.pmd-oe-summary');

        if (!tabs) {
            return;
        }

        var parent = tabs;

        for (
            var depth = 0;
            parent && depth < 6;
            depth += 1, parent = parent.parentElement
        ) {
            if (
                parent === body ||
                parent === page ||
                parent === row ||
                parent === order ||
                parent === payment
            ) {
                continue;
            }

            var style = window.getComputedStyle(parent);
            var box = parent.getBoundingClientRect();

            var shellColor =
                style.backgroundColor === 'rgb(255, 255, 255)' ||
                style.backgroundColor === 'rgb(250, 249, 244)';

            var isLegacyShell =
                box.width > 900 &&
                box.height > 400 &&
                shellColor;

            if (!isLegacyShell) {
                continue;
            }

            parent.style.setProperty(
                'background',
                'transparent',
                'important'
            );

            parent.style.setProperty(
                'background-color',
                'transparent',
                'important'
            );

            parent.style.setProperty(
                'border',
                '0',
                'important'
            );

            parent.style.setProperty(
                'border-radius',
                '0',
                'important'
            );

            parent.style.setProperty(
                'box-shadow',
                'none',
                'important'
            );

            parent.style.setProperty(
                'outline',
                '0',
                'important'
            );
        }

        window.PMDOrderEditOuterFrameV13_1 = {
            version: '13.1',
            installed: true
        };

        console.info(
            '[PMD Order Edit V13.1] confirmed structure active'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            applyConfirmedStructure,
            { once: true }
        );
    } else {
        applyConfirmedStructure();
    }
})();

