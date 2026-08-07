/* PMD_ORDER_EDIT_V6 — finite, route-scoped, no observers or polling. */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) return;

    var ROOT = 'pmd-order-edit-v6';
    document.documentElement.classList.add(ROOT);

    function compactText(node) {
        return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
    }

    function icon(name) {
        var map = {
            status: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>',
            user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
            userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
            note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
            receipt: '<path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
            mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
            plus: '<path d="M12 5v14M5 12h14"/>',
            minus: '<path d="M5 12h14"/>'
        };
        return '<span class="pmd-oe-icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + (map[name] || map.status) + '</svg></span>';
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
        document.querySelectorAll('.header-status-clickable').forEach(function (node) { replaceIcon(node, 'status'); });
        document.querySelectorAll('.header-assignee-clickable').forEach(function (node) { replaceIcon(node, 'userPlus'); });
        document.querySelectorAll('.note-icon-btn').forEach(function (node) { replaceIcon(node, 'note'); });
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
        document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
        apply();
    }
    window.addEventListener('load', apply, { once: true });
    window.PMDOrderEditV6 = { run: apply, cleanComment: cleanComment };
})();
