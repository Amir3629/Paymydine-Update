/* PMD_COUPON_STABLE_R24
 * One visible smart-add authority for /admin/coupons.
 * Boots synchronously when the Coupon DOM already exists so refresh does not
 * show the old pseudo-card first. No subtree observer and no layout polling.
 */
(function () {
    'use strict';

    var observer = null;
    var observedRoot = null;
    var filterResetBound = false;

    function isCouponPage() {
        return String(window.location.pathname || '').replace(/\/+$/, '') === '/admin/coupons';
    }

    function platformText(key, fallback) {
        var runtime = window.PMDPlatformMessages;
        if (runtime && typeof runtime.t === 'function') {
            return runtime.t(key, {}, fallback);
        }
        return fallback;
    }

    function localeCopy() {
        return {
            title: platformText('coupons.smart_add.title', 'Add new coupon / card'),
            help: platformText('coupons.smart_add.help', 'Create a coupon, gift card or voucher.')
        };
    }

    function cleanHeader(root) {
        if (!root) return;

        var create = root.querySelector('#pmd-r2-clean-header [data-pmd-coupon-create]');
        if (create) {
            create.hidden = true;
            create.setAttribute('aria-hidden', 'true');
            create.setAttribute('tabindex', '-1');
            create.style.setProperty('display', 'none', 'important');
        }

        root.querySelectorAll(
            '#pmd-r2-clean-header [data-pmd-main-header-notification-gap-r67], ' +
            '#pmd-r2-clean-header [data-pmd-main-header-notification-divider-r67], ' +
            '#pmd-r2-clean-header [data-pmd-main-header-notification-divider-r66]'
        ).forEach(function (node) {
            node.remove();
        });

        document.querySelectorAll(
            'body.pmd-coupon-manager-page #notif-root [data-pmd-main-header-notification-divider-r66]'
        ).forEach(function (node) {
            node.remove();
        });
    }

    function openExistingCreate(root) {
        var trigger = root && root.querySelector('[data-pmd-coupon-create]');
        if (!trigger || trigger.disabled) return;
        trigger.click();
    }

    function buildCard(root) {
        var copy = localeCopy();
        var card = document.createElement('div');

        card.className = 'pmd-coupon-smart-add-card pmd-smart-add-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-disabled', 'false');
        card.setAttribute('aria-label', copy.title);
        card.setAttribute('data-pmd-coupon-smart-add-r24', '');
        card.setAttribute('data-pmd-smart-action', 'coupon');

        var plus = document.createElement('span');
        plus.className = 'pmd-coupon-smart-add-card__plus pmd-smart-add-card__plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';

        var body = document.createElement('span');
        body.className = 'pmd-coupon-smart-add-card__copy pmd-smart-add-card__copy';

        var title = document.createElement('strong');
        title.textContent = copy.title;

        var help = document.createElement('small');
        help.textContent = copy.help;

        body.appendChild(title);
        body.appendChild(help);
        card.appendChild(plus);
        card.appendChild(body);

        card.addEventListener('click', function () {
            openExistingCreate(root);
        }, false);

        card.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openExistingCreate(root);
        }, false);

        return card;
    }

    function installCard(root) {
        if (!root || !document.documentElement.contains(root)) return false;

        cleanHeader(root);

        var grid = root.querySelector('[data-pmd-coupon-grid]');
        if (!grid) return false;

        var oldR23 = grid.querySelector('[data-pmd-coupon-smart-add-r23]');
        if (oldR23) oldR23.remove();

        var card = grid.querySelector('[data-pmd-coupon-smart-add-r24]');
        if (!card) {
            card = buildCard(root);
            grid.insertBefore(card, grid.firstChild);
        } else if (card !== grid.firstElementChild) {
            grid.insertBefore(card, grid.firstChild);
        }

        grid.setAttribute('data-pmd-coupon-smart-ready-r24', '1');
        return true;
    }

    function bindFilterReset(root) {
        if (filterResetBound || !root) return;
        filterResetBound = true;

        root.addEventListener('click', function (event) {
            var button = event.target.closest('[data-pmd-type-filter]');
            if (!button || !root.contains(button)) return;

            var type = button.getAttribute('data-pmd-type-filter');
            if (['coupon', 'gift_card', 'voucher'].indexOf(type) === -1) return;
            if (!button.classList.contains('is-active')) return;

            var all = root.querySelector('[data-pmd-type-filter="all"]');
            if (!all) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            all.click();
        }, true);
    }

    function observeRefreshZone(root) {
        if (!root || (observer && observedRoot === root)) return;

        if (observer) observer.disconnect();
        observedRoot = root;

        observer = new MutationObserver(function () {
            window.requestAnimationFrame(function () {
                installCard(observedRoot);
            });
        });

        /* Coupon V11 replaces the refresh-zone direct child after save/status
         * actions. Watching only root childList is enough; no subtree observer. */
        observer.observe(root, { childList: true });
    }

    function boot() {
        if (!isCouponPage()) return false;

        var root = document.querySelector('[data-pmd-coupon-manager]');
        if (!root) return false;

        installCard(root);
        bindFilterReset(root);
        observeRefreshZone(root);

        window.PMDCouponStableR24 = {
            version: '24.1.0-platform-i18n',
            install: function () { return installCard(root); }
        };

        return true;
    }

    /* Do not wait for DOMContentLoaded if the Coupon view is already parsed. */
    if (!boot() && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    }

    document.addEventListener('pageContentLoaded', boot, false);
})();
