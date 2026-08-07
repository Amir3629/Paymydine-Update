/*
 * PMD_ORDER_EDIT_V2
 * Finite-run DOM normalization for Admin Order Edit.
 * No recurring DOM watcher, polling timer, or layout enforcement loop.
 */
(function () {
    'use strict';

    if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) {
        return;
    }

    var ROOT_CLASS = 'pmd-order-edit-v2';
    var installed = false;

    document.documentElement.classList.add(ROOT_CLASS);

    function text(node) {
        return String((node && node.textContent) || '')
            .replace(/\s+/g, ' ')
            .trim();
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
            status: '<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2"></circle>',
            user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
            userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path>',
            note: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
            receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-3 2-3-2-3 2-3-2-3 2Z"></path><path d="M16 8h-6M16 12h-6M13 16h-3"></path>',
            mail: '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-10 6L2 7"></path>',
            clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
            plus: '<path d="M12 5v14M5 12h14"></path>',
            minus: '<path d="M5 12h14"></path>'
        };

        return '<span class="pmd-oe-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' +
            (paths[name] || paths.status) +
            '</svg></span>';
    }

    function replaceIcon(node, name) {
        if (!node || node.getAttribute('data-pmd-order-edit-v2-icon') === name) {
            return;
        }

        node.innerHTML = svg(name);
        node.setAttribute('data-pmd-order-edit-v2-icon', name);
    }

    function normalizeLayout() {
        [
            '.order-edit-pos-layout',
            '.order-edit-pos-layout .pos-bill-column',
            '.order-edit-pos-layout .pos-info-column',
            '.order-edit-pos-layout .order-bill-card',
            '.order-edit-pos-layout .pos-combined-info-card',
            '.order-edit-pos-layout .order-bill-card > .card-body',
            '.order-edit-pos-layout .pos-combined-info-card > .card-body'
        ].forEach(function (selector) {
            document.querySelectorAll(selector).forEach(function (node) {
                node.removeAttribute('style');
            });
        });

        var combinedBody = document.querySelector('.pos-combined-info-card > .card-body');
        if (combinedBody) {
            Array.prototype.forEach.call(combinedBody.children, function (section, index) {
                if (!section.classList.contains('pmd-order-section')) {
                    section.classList.add('pmd-order-section');
                }

                var title = text(section.querySelector('.card-title, .customer-card-title'));
                if (/invoice|rechnung|payment|zahlung/i.test(title) || index === 0) {
                    section.classList.add('pmd-order-section-invoice');
                } else if (/customer|kunde/i.test(title) || index === 1) {
                    section.classList.add('pmd-order-section-customer');
                } else if (/location|standort/i.test(title) || index === 2) {
                    section.classList.add('pmd-order-section-location');
                }

                section.removeAttribute('style');
            });
        }
    }

    function normalizeHeader() {
        document.querySelectorAll('.order-info-item.table-number .order-info-value').forEach(function (node) {
            if (/^(N\/A|--)?$/i.test(text(node))) {
                node.textContent = '—';
            }
        });

        document.querySelectorAll('.header-status-clickable').forEach(function (node) {
            replaceIcon(node, 'status');
        });

        document.querySelectorAll('.header-assignee-clickable').forEach(function (node) {
            var title = node.getAttribute('title') || '';
            replaceIcon(node, title && !/--$/.test(title) ? 'user' : 'userPlus');
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
            if (button.getAttribute('data-pmd-order-edit-v2-normalized') === '1') {
                return;
            }

            button.innerHTML = svg('plus') + '<span>Add item</span>';
            button.setAttribute('data-pmd-order-edit-v2-normalized', '1');
        });
    }

    function normalizePaymentSummary() {
        document.querySelectorAll('.order-details-table tr').forEach(function (row) {
            var firstCell = row.querySelector('td:first-child');
            var label = text(firstCell);

            if (!/^(items|payments?|zahlungen?)$/i.test(label)) {
                return;
            }

            row.classList.add('pmd-payment-history-row');
            if (firstCell) {
                firstCell.textContent = 'Payments';
            }

            var wrapper = row.querySelector('td:last-child > div');
            if (!wrapper) return;

            Array.prototype.forEach.call(wrapper.children, function (card) {
                card.classList.add('pmd-payment-transaction');
                card.removeAttribute('style');

                var head = card.firstElementChild;
                if (head) {
                    head.classList.add('pmd-payment-transaction-head');
                    head.removeAttribute('style');
                }

                card.querySelectorAll('ul').forEach(function (list) {
                    list.setAttribute('aria-hidden', 'true');
                    list.removeAttribute('style');
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
            var valueText = text(value);

            if (!valueText || /^N\/A$/i.test(valueText)) {
                field.style.setProperty('display', 'none', 'important');
            }
        });

        document.querySelectorAll('.pos-comment-card p, .pos-comment-card .card-text').forEach(function (paragraph) {
            var cleaned = cleanMachineComment(paragraph.textContent);
            var card = paragraph.closest('.pos-comment-card');

            if (!cleaned) {
                if (card) card.style.setProperty('display', 'none', 'important');
                return;
            }

            if (paragraph.textContent !== cleaned) {
                paragraph.textContent = cleaned;
            }
        });
    }

    function removeLiteralBladeTokens() {
        if (!document.body) return;

        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var nodes = [];

        while (walker.nextNode()) {
            if (/^\s*@(styles|scripts)\s*$/.test(walker.currentNode.nodeValue || '')) {
                nodes.push(walker.currentNode);
            }
        }

        nodes.forEach(function (node) {
            node.nodeValue = '';
        });
    }

    /*
     * PMD_ORDER_EDIT_NATIVE_TABS_V4
     *
     * Bootstrap assets on this legacy route are incomplete. This page therefore
     * owns its tab activation directly and does not depend on Bootstrap's plugin.
     */
    function installNativeTabs() {
        var heading = document.querySelector('.tab-heading');
        var content = document.querySelector('.tab-content');

        if (!heading || !content) return;

        var links = Array.prototype.slice.call(
            heading.querySelectorAll('a.nav-link[href^="#"]')
        );

        var panes = Array.prototype.slice.call(
            content.querySelectorAll('.tab-pane[id]')
        );

        if (!links.length || !panes.length) return;

        function paneFor(link) {
            var href = String(link.getAttribute('href') || '');
            if (!href || href.charAt(0) !== '#') return null;

            try {
                return document.getElementById(decodeURIComponent(href.slice(1)));
            } catch (error) {
                return document.getElementById(href.slice(1));
            }
        }

        function hasUsefulContent(pane) {
            if (!pane) return false;

            var clone = pane.cloneNode(true);
            clone.querySelectorAll(
                '.pmd-order-edit-empty-state, script, style, template'
            ).forEach(function (node) {
                node.remove();
            });

            return Boolean(
                String(clone.textContent || '').replace(/\s+/g, ' ').trim()
                || clone.querySelector(
                    'table, form, input, select, textarea, button, .card, .list-group, [data-record-id]'
                )
            );
        }

        function renderEmptyState(pane, link) {
            if (!pane || hasUsefulContent(pane)) return;
            if (pane.querySelector('.pmd-order-edit-empty-state')) return;

            var label = text(link) || 'This section';
            var state = document.createElement('div');
            state.className = 'pmd-order-edit-empty-state';
            state.innerHTML =
                svg('clock') +
                '<div>' +
                    '<strong>No ' + label.toLowerCase() + ' yet</strong>' +
                    '<span>New activity will appear here automatically.</span>' +
                '</div>';

            pane.appendChild(state);
        }

        function activate(link, updateHash) {
            var pane = paneFor(link);
            if (!pane) return;

            links.forEach(function (candidate) {
                var active = candidate === link;
                candidate.classList.toggle('active', active);
                candidate.setAttribute('aria-selected', active ? 'true' : 'false');
                candidate.setAttribute('tabindex', active ? '0' : '-1');
            });

            panes.forEach(function (candidate) {
                var active = candidate === pane;
                candidate.classList.toggle('active', active);
                candidate.classList.toggle('show', active);
                candidate.hidden = !active;
                candidate.setAttribute('aria-hidden', active ? 'false' : 'true');
            });

            if (updateHash && window.history && window.history.replaceState) {
                window.history.replaceState(
                    null,
                    '',
                    window.location.pathname + window.location.search + link.getAttribute('href')
                );
            }

            window.requestAnimationFrame(function () {
                renderEmptyState(pane, link);
            });
        }

        links.forEach(function (link) {
            if (link.getAttribute('data-pmd-native-tab-v4') === '1') return;

            link.setAttribute('data-pmd-native-tab-v4', '1');
            link.setAttribute('role', 'tab');

            link.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                activate(link, true);
            }, true);

            link.addEventListener('keydown', function (event) {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    return;
                }

                event.preventDefault();

                var current = links.indexOf(link);
                var next = current;

                if (event.key === 'ArrowLeft') next = (current - 1 + links.length) % links.length;
                if (event.key === 'ArrowRight') next = (current + 1) % links.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = links.length - 1;

                links[next].focus();
                activate(links[next], true);
            });
        });

        var hashLink = links.find(function (link) {
            return link.getAttribute('href') === window.location.hash;
        });

        var initial =
            hashLink
            || links.find(function (link) { return link.classList.contains('active'); })
            || links[0];

        activate(initial, false);
    }

    function apply() {
        document.documentElement.classList.add(ROOT_CLASS);
        normalizeLayout();
        normalizeHeader();
        normalizeItemControls();
        normalizePaymentSummary();
        normalizeCustomerAndComments();
        removeLiteralBladeTokens();
        installNativeTabs();
        installed = true;
    }

    function boot() {
        window.requestAnimationFrame(apply);
        window.setTimeout(apply, 120);
        window.setTimeout(apply, 420);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.addEventListener('load', apply, { once: true });

    window.PMDOrderEditV2 = {
        run: apply,
        cleanMachineComment: cleanMachineComment,
        get installed() { return installed; }
    };
})();
