/*
 * PMD_ORDER_EDIT_V5
 * Stable, finite-run normalization for /admin/orders/edit/{id}.
 * No MutationObserver, polling interval, or recurring layout enforcement.
 */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) return;

    var ROOT_CLASS = 'pmd-order-edit-v5';
    var installed = false;

    document.documentElement.classList.add(ROOT_CLASS);

    function text(node) {
        return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
    }

    function cleanMachineComment(value) {
        return String(value || '')
            .split('|')
            .map(function (part) { return part.trim(); })
            .filter(function (part) {
                if (!part || /^Table Draft Basket$/i.test(part)) return false;
                if (/^(Table ID|Table)\s*:/i.test(part)) return false;
                if (/^\[(table_draft_id|submitted_by|guest_session|guest_session_id):/i.test(part)) return false;
                return true;
            })
            .join(' · ');
    }

    function svg(name) {
        var paths = {
            status: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="2.5"></circle>',
            user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
            userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path>',
            note: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
            receipt: '<path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z"></path><path d="M9 9h6M9 13h6M9 17h4"></path>',
            mail: '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-10 6L2 7"></path>',
            plus: '<path d="M12 5v14M5 12h14"></path>',
            minus: '<path d="M5 12h14"></path>'
        };

        return '<span class="pmd-oe-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' +
            (paths[name] || paths.status) + '</svg></span>';
    }

    function replaceIcon(node, name) {
        if (!node || node.getAttribute('data-pmd-oe-icon') === name) return;
        node.innerHTML = svg(name);
        node.setAttribute('data-pmd-oe-icon', name);
    }

    function normalizeHeader() {
        document.querySelectorAll('.order-info-item.table-number .order-info-value').forEach(function (node) {
            if (/^(N\/A|--)?$/i.test(text(node))) node.textContent = '—';
        });

        document.querySelectorAll('.header-status-clickable').forEach(function (node) {
            replaceIcon(node, 'status');
        });
        document.querySelectorAll('.header-assignee-clickable').forEach(function (node) {
            replaceIcon(node, /--$/.test(node.getAttribute('title') || '') ? 'userPlus' : 'user');
        });
        document.querySelectorAll('.note-icon-btn').forEach(function (node) {
            replaceIcon(node, 'note');
        });
        document.querySelectorAll('.invoice-icon-btn').forEach(function (node) {
            replaceIcon(node, 'receipt');
        });
        document.querySelectorAll('.send-invoice-icon-btn').forEach(function (node) {
            replaceIcon(node, 'mail');
        });
    }

    function normalizeItemControls() {
        document.querySelectorAll('.qty-btn.qty-minus').forEach(function (node) {
            replaceIcon(node, 'minus');
        });
        document.querySelectorAll('.qty-btn.qty-plus').forEach(function (node) {
            replaceIcon(node, 'plus');
        });
        document.querySelectorAll('#btn-add-item, .btn-add-item').forEach(function (button) {
            if (button.getAttribute('data-pmd-oe-add') === '1') return;
            button.innerHTML = svg('plus') + '<span>Add item</span>';
            button.setAttribute('data-pmd-oe-add', '1');
        });
    }

    function normalizeMoneySigns() {
        document.querySelectorAll('.order-bill-table tr, .order-details-table tr').forEach(function (row) {
            var cells = row.querySelectorAll('th, td');
            if (cells.length < 2) return;
            var label = text(cells[0]);
            if (!/coupon|discount|rabatt|gutschein/i.test(label)) return;
            var valueCell = cells[cells.length - 1];
            var raw = text(valueCell);
            if (/^--+/.test(raw)) valueCell.textContent = raw.replace(/^--+/, '-');
        });
    }

    function normalizePaymentSummary() {
        document.querySelectorAll('.order-details-table tr').forEach(function (row) {
            var firstCell = row.querySelector('td:first-child, th:first-child');
            if (!firstCell || !/^(items|payments?|zahlungen?)$/i.test(text(firstCell))) return;

            row.classList.add('pmd-payment-history-row');
            firstCell.textContent = 'Payments';

            var valueCell = row.querySelector('td:last-child');
            if (!valueCell) return;
            var wrapper = valueCell.firstElementChild || valueCell;

            Array.prototype.forEach.call(wrapper.children, function (card) {
                card.classList.add('pmd-payment-transaction');
                card.removeAttribute('style');

                var head = card.firstElementChild;
                if (head) {
                    head.classList.add('pmd-payment-transaction-head');
                    head.removeAttribute('style');
                }

                card.querySelectorAll('ul').forEach(function (list) {
                    list.hidden = true;
                    list.setAttribute('aria-hidden', 'true');
                });

                Array.prototype.forEach.call(card.children, function (child) {
                    if (/payment adjustment|tip\/coupon/i.test(text(child))) {
                        child.classList.add('pmd-payment-adjustment');
                        child.removeAttribute('style');
                    }
                });
            });
        });
    }

    function normalizeCustomerAndComments() {
        document.querySelectorAll('.customer-info.editable-field').forEach(function (field) {
            var value = field.querySelector('.editable-value');
            if (!text(value) || /^N\/A$/i.test(text(value))) field.hidden = true;
        });

        document.querySelectorAll('.pos-comment-card p, .pos-comment-card .card-text').forEach(function (paragraph) {
            var cleaned = cleanMachineComment(paragraph.textContent);
            var card = paragraph.closest('.pos-comment-card');
            if (!cleaned) {
                if (card) card.hidden = true;
                return;
            }
            paragraph.textContent = cleaned;
        });
    }

    function removeLiteralBladeTokens() {
        if (!document.body) return;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) {
            if (/^\s*@(styles|scripts)\s*$/.test(walker.currentNode.nodeValue || '')) nodes.push(walker.currentNode);
        }
        nodes.forEach(function (node) { node.nodeValue = ''; });
    }

    function apply() {
        document.documentElement.classList.add(ROOT_CLASS);
        normalizeHeader();
        normalizeItemControls();
        normalizeMoneySigns();
        normalizePaymentSummary();
        normalizeCustomerAndComments();
        removeLiteralBladeTokens();
        installed = true;
    }

    function boot() {
        window.requestAnimationFrame(apply);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
    window.addEventListener('load', apply, { once: true });

    window.PMDOrderEditV5 = {
        run: apply,
        cleanMachineComment: cleanMachineComment,
        get installed() { return installed; }
    };
})();
